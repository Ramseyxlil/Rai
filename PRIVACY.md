# Privacy

Rai is built to be private by design.

- **No server.** Rai has no backend of its own. There is nothing for us to see.
- **No telemetry.** Rai collects no analytics and phones home to nothing except
  GitHub, and only to check for updates.
- **Your keys, your calls.** Requests go straight from your machine to the AI
  provider you choose (Claude, OpenAI, or Microsoft Foundry) using your own key.
- **Local only.** Settings and history are stored on your device at `%APPDATA%\Rai`.
- **Screen and audio.** A screenshot is only captured when you turn "Screen" on for
  a question, and it is sent only to your chosen provider, never stored. Voice is
  transcribed on-device (vosk-browser); audio never leaves your machine.

You can delete everything by clearing history in the app and deleting the
`%APPDATA%\Rai` folder.
