# Contributing to Rai

Thanks for wanting to help. Rai is a small, focused project and contributions of
all sizes are welcome.

## Ways to contribute

- Report a bug or request a feature via [Issues](https://github.com/Ramseyxlil/Rai/issues).
- Improve docs.
- Submit a pull request.

## Development setup

Rai is a Tauri v2 app. See [docs/BUILD.md](docs/BUILD.md) for full setup.

```bash
git clone https://github.com/Ramseyxlil/Rai.git
cd Rai
cargo tauri dev
```

The frontend is plain HTML/CSS/JS in `ui/` (no build step). The backend is Rust in
`src-tauri/src/`.

## Pull requests

1. Fork the repo and create a branch: `git checkout -b feature/your-thing`.
2. Keep changes focused and small where possible.
3. Make sure `cargo tauri dev` runs and the app works.
4. Open a PR describing what changed and why.

## Code style

- Rust: keep it idiomatic; run `cargo fmt` before committing.
- JS/CSS: match the existing style in `ui/`.
- Be kind in reviews and issues. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Project layout

```
ui/            static frontend (index.html, styles.css, main.js)
src-tauri/     Rust backend (lib.rs, providers.rs, screen.rs), config, icons
docs/          build, release, and configuration guides
```
