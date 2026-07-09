# Downloads the small English Vosk model into ui\vendor\ so voice works offline.
$out = "ui\vendor\model.tar.gz"
if (Test-Path $out) { Write-Host "model already present"; exit 0 }
New-Item -ItemType Directory -Force -Path "ui\vendor" | Out-Null
$urls = @(
  "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz",
  "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.tar.gz"
)
foreach ($u in $urls) {
  Write-Host "trying $u"
  try { Invoke-WebRequest -Uri $u -OutFile $out -TimeoutSec 300; Write-Host "downloaded model"; exit 0 } catch { Write-Host "failed: $u" }
}
Write-Host "WARNING: could not download voice model; Rai will fetch it at first use."
exit 0
