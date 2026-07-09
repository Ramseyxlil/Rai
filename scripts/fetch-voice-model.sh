#!/usr/bin/env bash
# Downloads the small English Vosk model into ui/vendor/ so voice works offline.
set -e
OUT="ui/vendor/model.tar.gz"
[ -f "$OUT" ] && { echo "model already present"; exit 0; }
mkdir -p ui/vendor
URLS=(
  "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz"
  "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.tar.gz"
)
for u in "${URLS[@]}"; do
  echo "trying $u"
  if curl -fSL --max-time 300 -o "$OUT" "$u"; then echo "downloaded model"; exit 0; fi
done
echo "WARNING: could not download voice model; Rai will fall back to downloading it at first use."
exit 0
