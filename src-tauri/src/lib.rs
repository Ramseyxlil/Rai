mod providers;
mod screen;

use providers::ProviderCfg;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, LogicalSize, Manager, WebviewWindow, WindowEvent,
};
use tauri_plugin_global_shortcut::{Modifiers, ShortcutState};

// ------------------------- settings -------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub active: String,
    pub claude: ProviderCfg,
    pub openai: ProviderCfg,
    pub foundry: ProviderCfg,
    pub start_invisible: bool,
    pub screen_by_default: bool,
    pub opacity: u32,
    pub mode: String,
    pub custom_prompt: String,
    pub launch_on_startup: bool,
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
            launch_on_startup: false,
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

fn win(app: &AppHandle, label: &str) -> Option<WebviewWindow> { app.get_webview_window(label) }
fn assistant(app: &AppHandle) -> Option<WebviewWindow> { win(app, "assistant") }
fn home(app: &AppHandle) -> Option<WebviewWindow> { win(app, "home") }

fn show_home(app: &AppHandle) { if let Some(w) = home(app) { let _ = w.show(); let _ = w.unminimize(); let _ = w.set_focus(); } }

fn launch_assistant_inner(app: &AppHandle) {
    if let Some(w) = assistant(app) {
        let inv = load_settings().start_invisible;
        let _ = apply_affinity(&w, inv);
        app.state::<AppState>().invisible.store(inv, Ordering::Relaxed);
        let _ = w.show();
        let _ = w.set_focus();
        let _ = app.emit("invisible-changed", inv);
    }
}

fn toggle_assistant(app: &AppHandle) {
    if let Some(w) = assistant(app) {
        if w.is_visible().unwrap_or(false) { let _ = w.hide(); }
        else { launch_assistant_inner(app); }
    }
}

fn toggle_invisible(app: &AppHandle) {
    let state = app.state::<AppState>();
    let next = !state.invisible.load(Ordering::Relaxed);
    if let Some(w) = assistant(app) {
        if apply_affinity(&w, next).is_ok() {
            state.invisible.store(next, Ordering::Relaxed);
            let _ = app.emit("invisible-changed", next);
        }
    }
}

// ------------------------- commands -------------------------

#[tauri::command] fn get_settings() -> Settings { load_settings() }
#[tauri::command] fn save_settings(settings: Settings) -> Result<(), String> { write_settings(&settings) }

#[tauri::command] fn launch_assistant(app: AppHandle) { launch_assistant_inner(&app); }
#[tauri::command] fn open_home(app: AppHandle) { show_home(&app); }
#[tauri::command] fn close_home(app: AppHandle) { if let Some(w) = home(&app) { let _ = w.hide(); } }
#[tauri::command] fn hide_assistant(app: AppHandle) { if let Some(w) = assistant(&app) { let _ = w.hide(); } }
#[tauri::command] fn quit_app(app: AppHandle) { app.exit(0); }

#[tauri::command]
fn set_invisible(app: AppHandle, on: bool) -> Result<(), String> {
    if let Some(w) = assistant(&app) {
        apply_affinity(&w, on)?;
        app.state::<AppState>().invisible.store(on, Ordering::Relaxed);
        let _ = app.emit("invisible-changed", on);
    }
    Ok(())
}
#[tauri::command] fn get_invisible(app: AppHandle) -> bool { app.state::<AppState>().invisible.load(Ordering::Relaxed) }

#[tauri::command]
fn set_window_size(app: AppHandle, label: String, width: f64, height: f64) -> Result<(), String> {
    if let Some(w) = win(&app, &label) {
        w.set_size(LogicalSize::new(width, height)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn ask(
    app: AppHandle,
    prompt: String,
    use_screen: bool,
    system: Option<String>,
) -> Result<String, String> {
    let s = load_settings();
    let image: Option<String> = if use_screen {
        let prev = app.state::<AppState>().invisible.load(Ordering::Relaxed);
        if let Some(w) = assistant(&app) {
            let _ = apply_affinity(&w, true);
            std::thread::sleep(Duration::from_millis(45));
            let shot = screen::capture_screen_png_b64();
            let _ = apply_affinity(&w, prev);
            Some(shot?)
        } else {
            Some(screen::capture_screen_png_b64()?)
        }
    } else { None };

    let system = system.unwrap_or_else(|| "You are Rai, a calm, concise on-screen assistant. Answer directly and briefly. When a screenshot is provided, read it carefully and ground your answer in exactly what is on screen.".to_string());
    let img = image.as_deref();
    match s.active.as_str() {
        "openai" => providers::call_openai(&s.openai, &system, &prompt, img).await,
        "foundry" => providers::call_foundry(&s.foundry, &system, &prompt, img).await,
        _ => providers::call_anthropic(&s.claude, &system, &prompt, img).await,
    }
}

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

#[tauri::command]
async fn check_update(app: AppHandle) -> Result<String, String> {
    use tauri_plugin_updater::UpdaterExt;
    let updater = app.updater().map_err(|e| format!("Updater not configured: {e}"))?;
    match updater.check().await {
        Ok(Some(update)) => {
            update.download_and_install(|_c, _t| {}, || {}).await.map_err(|e| format!("Update failed: {e}"))?;
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
            if shortcut.matches(m, Code::Space) { toggle_assistant(app); }
            else if shortcut.matches(m, Code::KeyH) { toggle_invisible(app); }
        })
        .build();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| { show_home(app); }))
        .plugin(shortcuts)
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState { invisible: AtomicBool::new(false) })
        .invoke_handler(tauri::generate_handler![
            get_settings, save_settings,
            launch_assistant, open_home, close_home, hide_assistant, quit_app,
            set_invisible, get_invisible, set_window_size,
            ask, get_history, save_history, check_update
        ])
        // Closing Home or Assistant hides them instead of destroying — Quit fully exits.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let label = window.label().to_string();
                if label == "home" || label == "assistant" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();

            let m_home = MenuItem::with_id(app, "home", "Open Home", true, None::<&str>)?;
            let m_launch = MenuItem::with_id(app, "launch", "Launch Rai (assistant)", true, None::<&str>)?;
            let m_invis = MenuItem::with_id(app, "invis", "Toggle invisibility", true, None::<&str>)?;
            let m_quit = MenuItem::with_id(app, "quit", "Quit Rai", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&m_home, &m_launch, &m_invis, &m_quit])?;

            let mut builder = TrayIconBuilder::new()
                .tooltip("Rai — click for Home")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "home" => show_home(app),
                    "launch" => launch_assistant_inner(app),
                    "invis" => toggle_invisible(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left, button_state: MouseButtonState::Up, ..
                    } = event { show_home(tray.app_handle()); }
                });
            if let Some(icon) = app.default_window_icon() { builder = builder.icon(icon.clone()); }
            builder.build(app)?;

            // On launch: show Home. Assistant starts hidden until launched.
            show_home(&handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Rai");
}
