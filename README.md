<div align="center">

<img src="src-tauri/icons/128x128.png" width="88" alt="Rai" />

# Rai

### The free, open, invisible AI assistant that sees your screen.

Rai floats a calm glass panel over anything you're doing. Ask it, let it read your
screen, or talk to it. It stays hidden from Zoom, Teams, and screen recorders.
Bring your own AI key. No subscription, no account, nothing sent to our servers.

**Rai is what Cluely charges up to $75/month for, given away free and open source.**

<br/>

[![Download](https://img.shields.io/badge/Download%20for%20Windows-6FBF9C?style=for-the-badge&logo=windows&logoColor=06120D)](https://github.com/Ramseyxlil/Rai/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-8B928A?style=for-the-badge)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/Ramseyxlil/Rai/build.yml?style=for-the-badge&label=build)](https://github.com/Ramseyxlil/Rai/actions)

</div>

---

## Why Rai

Cluely built a great idea and then locked it behind a paywall: real invisibility
costs $75/month, there's no bring-your-own-key, and your screen and audio flow
through their servers (they were breached once, exposing 83,000 users). Rai takes
the same idea and makes it free, private, and yours.

|                              | **Rai** | Cluely      |
| ---------------------------- | :-----: | :---------: |
| Invisible to screen share    | Free    | $75/mo tier |
| Bring your own API key       | Yes     | No          |
| Sees your screen (vision)    | Yes     | Limited     |
| Voice, free & offline        | Yes     | No          |
| Runs on your machine only    | Yes     | No          |
| Open source                  | Yes     | No          |
| Price                        | Free    | up to $75/mo|

## Features

- **Sees your screen.** Sends a screenshot to a vision model, so it understands
  code, designs, and UI, not just text.
- **Invisible.** Uses the official Windows capture-exclusion API to hide from Zoom,
  Teams, Meet, and OBS. It even excludes itself from its own screenshots.
- **Bring your own key.** Claude, OpenAI, or Microsoft Foundry. Calls go straight
  from your machine to your provider.
- **Free offline voice.** Talk to Rai. Speech runs on-device with vosk-browser. No
  key, no cost.
- **Modes.** General, Interview, Meeting, Sales, Coding, Study, Writing, or your own
  custom prompt, each with tailored quick actions.
- **Yours to shape.** Resize, reposition, adjust opacity, switch models, keep local
  history. Opens from the tray, a relaunch, or a shortcut.
- **Auto-updates** itself from GitHub releases.

## Install

Download the latest installer from **[Releases](https://github.com/Ramseyxlil/Rai/releases/latest)**
and run it. Windows may show "Windows protected your PC" (Rai isn't code-signed
yet), click **More info > Run anyway**.

On first run, open Settings, paste an API key for Claude, OpenAI, or Microsoft
Foundry, pick it as active, and you're ready.

## Shortcuts

| Action              | Shortcut             |
| ------------------- | -------------------- |
| Summon / hide       | `Ctrl + Shift + Space` |
| Toggle invisibility | `Ctrl + Shift + H`   |
| Open from tray      | click the droplet    |

## Build from source

Rai is a [Tauri v2](https://tauri.app) app. Rust backend, static HTML/CSS/JS
frontend (no Node build step).

**Prerequisites:** [Rust](https://rustup.rs), Microsoft C++ Build Tools ("Desktop
development with C++" workload), WebView2 (preinstalled on Windows 11), and the
Tauri CLI: `cargo install tauri-cli --version "^2"`.

```bash
git clone https://github.com/Ramseyxlil/Rai.git
cd Rai
cargo tauri dev      # run locally
cargo tauri build    # build the installer
```

See **[docs/BUILD.md](docs/BUILD.md)** for details and **[docs/RELEASING.md](docs/RELEASING.md)**
to cut a release with auto-updates.

## How it works

```
You ─▶ Rai overlay ─▶ (optional screenshot / voice) ─▶ your AI provider (your key)
                                                              │
        answer, shown only on your screen  ◀─────────────────┘
```

Everything happens on your machine. Rai has no backend. Screenshots and audio are
never stored or sent anywhere except the AI provider you chose, using your own key.

## Roadmap

- Live call transcription (both sides, streaming) with the free on-device engine
- Code signing via SignPath Foundation (free for open source)
- macOS support

## Contributing

Issues and pull requests are welcome. See **[CONTRIBUTING.md](CONTRIBUTING.md)**.

## Privacy

Rai stores your settings and history locally on your device only. It has no server,
no analytics, and no telemetry. See **[PRIVACY.md](PRIVACY.md)**.

## Support the project

Rai is built by one person, [Abdulrafiu Izuafa](mailto:abdulrafiu@izusoft.tech).
Help, collaborations, or donations are always welcome:

- abdulrafiu@izusoft.tech
- abdulrafiu@azurelearnai.org

If Rai helps you, a star on the repo genuinely helps others find it.

## License

[MIT](LICENSE) © Abdulrafiu Izuafa
