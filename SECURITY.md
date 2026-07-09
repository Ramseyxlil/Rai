# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security vulnerabilities.

Instead, email **abdulrafiu@izusoft.tech** with details and steps to reproduce.
You'll get a response as soon as possible, and credit if you'd like it once a fix
ships.

## Scope notes

- Rai stores API keys and settings locally on the user's device. It has no server.
- Rai never transmits screen, audio, or history anywhere except the AI provider the
  user configures, using the user's own key.
- Update packages are signed; the public key is in `src-tauri/tauri.conf.json`.
