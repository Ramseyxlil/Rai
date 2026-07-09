# Configuration

All settings live in the app (gear icon) and are stored locally at
`%APPDATA%\Rai\settings.json`. History is at `%APPDATA%\Rai\history.json`.

## Providers (bring your own key)

- **Claude** — Anthropic API key + model (e.g. `claude-sonnet-4-6`).
- **OpenAI** — OpenAI API key + model (e.g. `gpt-4o`).
- **Microsoft Foundry** — endpoint, deployment name, and key. Rai calls
  `{endpoint}/openai/v1/chat/completions` with your deployment as the model. Use a
  vision-capable deployment so screen reading works.

## Modes

General, Interview, Meeting, Sales, Coding, Study, Writing, and Custom. Each sets a
system prompt and quick actions. Custom uses the prompt you set in Settings.

## Behaviour

- **Start hidden from capture** — invisible to screen share on launch.
- **See screen on every question** — attach a screenshot to each ask.
- **Panel opacity**, **window size**, and **position** are all adjustable.

## Voice

Free and offline via vosk-browser. The English model downloads once from a CDN on
first use, then runs on-device. No key required.

## Updates

Rai checks GitHub on launch and installs new signed releases automatically.
