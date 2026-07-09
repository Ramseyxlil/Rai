mod providers;
mod screen;

use providers::ProviderCfg;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, LogicalSize, Manager, WebviewWindow,
};
use tauri_plugin_global_shortcut::{Modifiers, ShortcutState};

// ------------------------- settings -------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub active: String, // "claude" | "openai" | "foundry"
    pub claude: ProviderCfg,
    pub openai: ProviderCfg,
    pub foundry: ProviderCfg,
    pub start_invisible: bool,
    pub screen_by_default: bool,
    pub opacity: u32,      // 60..=100
    pub mode: String,      // active mode id
    pub custom_prompt: String,
    pub width: u32,
    pub height: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            active: "claude".into(),
            claude: ProviderCfg { model: "claude-sonnet-4-6".into(), ..Default::default() },
            openai: ProviderCfg { model: "gpt-4o".into(), ..Default::default() },
            foundry: ProviderCfg { api_version: "2024-10-21".into(), ..Default::default() },
            start_invisible: true,
            screen_by_default: false,
            opacity: 92,
            mode: "general".into(),
            custom_prompt: String::new(),
            width: 460,
            height: 600,
        }
    }
}

fn config_dir() -> std::path::PathBuf {
    let mut p = dirs::config_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    p.push("Rai");
    let _ = std::fs::create_dir_all(&p);
    p
}
fn settings_path() -> std::path::PathBuf { let mut p = config_dir(); p.push("settings.json"); p }
fn history_path() -> std::path::PathBuf { let mut p = config_dir(); p.push("history.json"); p }

fn load_settings() -> Settings {
    match std::fs::read_to_string(settings_path()) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => Settings::default(),
    }
}
fn write_settings(s: &Settings) -> Result<(), String> {
    let data = serde_json::to_string_pretty(s).map_err(|e| e.to_string())?;
    std::fs::write(settings_path(), data).map_err(|e| e.to_string())
}

// ------------------------- runtime state -------------------------

struct AppState { invisible: AtomicBool }

// ------------------------- capture exclusion -------------------------

#[cfg(windows)]
fn apply_affinity(window: &WebviewWindow, on: bool) -> Result<(), String> {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE, WDA_NONE,
    };
    let handle = window.window_handle().map_err(|e| e.to_string())?;
    if let RawWindowHandle::Win32(h) = handle.as_raw() {
        let hwnd = HWND(h.hwnd.get() as *mut core::ffi::c_void);
        let affinity = if on { WDA_EXCLUDEFROMCAPTURE } else { WDA_NONE };
        unsafe { SetWindowDisplayAffinity(hwnd, affinity).map_err(|e| e.to_string())?; }
    }
    Ok(())
}
#[cfg(not(windows))]
fn apply_affinity(_window: &WebviewWindow, _on: bool) -> Result<(), String> { Ok(()) }

// ------------------------- helpers -------------------------

fn main_window(app: &AppHandle) -> Option<WebviewWindow> { app.get_webview_window("main") }
fn show_and_focus(app: &AppHandle) {
    if let Some(w) = main_window(app) { let _ = w.show(); let _ = w.set_focus(); }
}
fn toggle_window(app: &AppHandle) {
    if let Some(w) = main_window(app) {
        if w.is_visible().unwrap_or(false) { let _ = w.hide(); }
        else { let _ = w.show(); let _ = w.set_focus(); }
    }
}
fn toggle_invisible(app: &AppHandle) {
    let state = app.state::<AppState>();
    let next = !state.invisible.load(Ordering::Relaxed);
    if let Some(w) = main_window(app) {
        if apply_affinity(&w, next).is_ok() {
            state.invisible.store(next, Ordering::Relaxed);
            let _ = app.emit("invisible-changed", next);
        }
    }
}

// ------------------------- commands -------------------------

#[tauri::command] fn get_settings() -> Settings { load_settings() }
#[tauri::command] fn save_settings(settings: Settings) -> Result<(), String> { write_settings(&settings) }

#[tauri::command]
fn set_invisible(window: WebviewWindow, app: AppHandle, on: bool) -> Result<(), String> {
    apply_affinity(&window, on)?;
    app.state::<AppState>().invisible.store(on, Ordering::Relaxed);
    let _ = app.emit("invisible-changed", on);
    Ok(())
}
#[tauri::command] fn get_invisible(app: AppHandle) -> bool { app.state::<AppState>().invisible.load(Ordering::Relaxed) }
#[tauri::command] fn hide_window(window: WebviewWindow) { let _ = window.hide(); }
#[tauri::command] fn center_window(window: WebviewWindow) { let _ = window.center(); }
#[tauri::command] fn quit_app(app: AppHandle) { app.exit(0); }

#[tauri::command]
fn set_size(window: WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    window.set_size(LogicalSize::new(width, height)).map_err(|e| e.to_string())
}

/// Ask the active provider. Optional screenshot (vision) and optional system prompt (mode).
#[tauri::command]
async fn ask(
    app: AppHandle,
    window: WebviewWindow,
    prompt: String,
    use_screen: bool,
    system: Option<String>,
) -> Result<String, String> {
    let s = load_settings();
    let image: Option<String> = if use_screen {
        let prev = app.state::<AppState>().invisible.load(Ordering::Relaxed);
        let _ = apply_affinity(&window, true);
        std::thread::sleep(Duration::from_millis(45));
        let shot = screen::capture_screen_png_b64();
        let _ = apply_affinity(&window, prev);
        Some(shot?)
    } else { None };

    let system = system.unwrap_or_else(|| "You are Rai, a calm, concise on-screen assistant. Answer directly and briefly. When a screenshot is provided, read it carefully and ground your answer in exactly what is on screen.".to_string());
    let img = image.as_deref();
    match s.active.as_str() {
        "openai" => providers::call_openai(&s.openai, &system, &prompt, img).await,
        "foundry" => providers::call_foundry(&s.foundry, &system, &prompt, img).await,
        _ => providers::call_anthropic(&s.claude, &system, &prompt, img).await,
    }
}

/// Voice: transcribe recorded audio (base64) via the OpenAI Whisper endpoint.
#[tauri::command]
async fn transcribe(audio_b64: String, mime: String) -> Result<String, String> {
    let s = load_settings();
    providers::transcribe_openai(&s.openai, &audio_b64, &mime).await
}

// history ------------------------------------------------------------
#[tauri::command]
fn get_history() -> serde_json::Value {
    match std::fs::read_to_string(history_path()) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_else(|_| serde_json::json!([])),
        Err(_) => serde_json::json!([]),
    }
}
#[tauri::command]
fn save_history(history: serde_json::Value) -> Result<(), String> {
    let data = serde_json::to_string_pretty(&history).map_err(|e| e.to_string())?;
    std::fs::write(history_path(), data).map_err(|e| e.to_string())
}

// auto-update --------------------------------------------------------
#[tauri::command]
async fn check_update(app: AppHandle) -> Result<String, String> {
    use tauri_plugin_updater::UpdaterExt;
    let updater = app.updater().map_err(|e| format!("Updater not configured: {e}"))?;
    match updater.check().await {
        Ok(Some(update)) => {
            update
                .download_and_install(|_chunk, _total| {}, || {})
                .await
                .map_err(|e| format!("Update failed: {e}"))?;
            Ok("updated".into())
        }
        Ok(None) => Ok("latest".into()),
        Err(e) => Err(format!("Update check failed: {e}")),
    }
}

// ------------------------- app entry -------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shortcuts = tauri_plugin_global_shortcut::Builder::new()
        .with_shortcuts(["ctrl+shift+space", "ctrl+shift+h"])
        .expect("valid shortcuts")
        .with_handler(|app, shortcut, event| {
            if event.state != ShortcutState::Pressed { return; }
            let m = Modifiers::CONTROL | Modifiers::SHIFT;
            use tauri_plugin_global_shortcut::Code;
            if shortcut.matches(m, Code::Space) { toggle_window(app); }
            else if shortcut.matches(m, Code::KeyH) { toggle_invisible(app); }
        })
        .build();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| { show_and_focus(app); }))
        .plugin(shortcuts)
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState { invisible: AtomicBool::new(false) })
        .invoke_handler(tauri::generate_handler![
            get_settings, save_settings, set_invisible, get_invisible,
            hide_window, center_window, quit_app, set_size,
            ask, transcribe, get_history, save_history, check_update
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            let show = MenuItem::with_id(app, "show", "Show Rai", true, None::<&str>)?;
            let invis = MenuItem::with_id(app, "invis", "Toggle invisibility", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Rai", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &invis, &quit])?;

            let mut builder = TrayIconBuilder::new()
                .tooltip("Rai — click to open")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_and_focus(app),
                    "invis" => toggle_invisible(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left, button_state: MouseButtonState::Up, ..
                    } = event { show_and_focus(tray.app_handle()); }
                });
            if let Some(icon) = app.default_window_icon() { builder = builder.icon(icon.clone()); }
            builder.build(app)?;

            let s = load_settings();
            if let Some(w) = main_window(&handle) {
                let _ = w.set_size(LogicalSize::new(s.width as f64, s.height as f64));
                if s.start_invisible {
                    let _ = apply_affinity(&w, true);
                    app.state::<AppState>().invisible.store(true, Ordering::Relaxed);
                }
                let _ = w.show();
                let _ = w.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Rai");
}
