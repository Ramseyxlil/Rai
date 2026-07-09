# Building Rai

Rai is a [Tauri v2](https://tauri.app) app: a Rust backend with a static
HTML/CSS/JS frontend (no Node build step).

## Prerequisites (Windows)

1. **Rust** (stable): https://rustup.rs
2. **Microsoft C++ Build Tools** with the "Desktop development with C++" workload.
   This provides `link.exe`. If you see `linker link.exe not found`, install it:
   ```powershell
   winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```
   Open a **new** terminal afterwards so PATH updates.
3. **WebView2** runtime (preinstalled on Windows 11).
4. **Tauri CLI**:
   ```powershell
   cargo install tauri-cli --version "^2"
   ```

No Node.js is required.

## Run

```powershell
cargo tauri dev
```

## Build the installer

```powershell
cargo tauri build
```

Output: `src-tauri/target/release/bundle/nsis/Rai_<version>_x64-setup.exe`

> Note: because signed auto-update artifacts are enabled, a **local** installer
> build needs the update signing key set as environment variables
> (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`). For everyday
> development use `cargo tauri dev`, which never needs them. Releases are built and
> signed automatically in CI.

## Project layout

```
ui/                       static frontend
  index.html  styles.css  main.js
src-tauri/
  src/
    main.rs               entry
    lib.rs                window, invisibility, shortcuts, tray, commands, updater
    providers.rs          Claude / OpenAI / Foundry calls
    screen.rs             screen capture
  icons/                  app + tray icons
  capabilities/           Tauri v2 permissions
  tauri.conf.json  Cargo.toml  build.rs
.github/workflows/build.yml
```
