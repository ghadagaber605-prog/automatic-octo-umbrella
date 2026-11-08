#!/usr/bin/env bash
# Builds "Visiting the Dentist" (3D animated story video) from scratch.
# Needs: python3, ffmpeg, node + playwright (with Chromium). Network: github.com, npm, PyPI.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${WORK:-$HERE/.work}"; mkdir -p "$WORK/models" "$WORK/stage"
# 1) offline voices (Kokoro TTS)
pip install -q kokoro-onnx soundfile
[ -f "$WORK/models/kokoro-v1.0.onnx" ] || curl -sSL -o "$WORK/models/kokoro-v1.0.onnx" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
[ -f "$WORK/models/voices-v1.0.bin" ]  || curl -sSL -o "$WORK/models/voices-v1.0.bin"  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
python3 "$HERE/make_audio.py" "$WORK/models/kokoro-v1.0.onnx" "$WORK/models/voices-v1.0.bin" "$WORK/build"
# 2) web scene deps
( cd "$WORK" && [ -d node_modules/three ] || npm i --no-save three@0.169.0 @fontsource/fredoka@5.0.0 )
ln -sf "$HERE/web/index.html" "$HERE/web/scene.js" "$WORK/node_modules" "$WORK/build/timeline.json" "$WORK/stage/"
# 3) render frames (3 parallel workers) and mux
mkdir -p "$WORK/frames"
for w in 0 1 2; do node "$HERE/render.js" "$WORK/stage" "$WORK/frames" --worker $w/3 & done; wait
ffmpeg -y -framerate 24 -i "$WORK/frames/f_%05d.jpg" -i "$WORK/build/soundtrack.wav" \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart \
  "$HERE/visiting-the-dentist.mp4"
echo "done: $HERE/visiting-the-dentist.mp4"
