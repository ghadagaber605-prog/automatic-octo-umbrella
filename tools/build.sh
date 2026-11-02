#!/usr/bin/env bash
# Two-pass build: render once to locate headings, then rebuild with TOC page numbers.
set -euo pipefail
cd "$(dirname "$0")"
OUT="../سجل-الزيارات-الصفية.docx"
TMP=$(mktemp -d)
rm -f toc-pages.json
node make-docx.js
cp "$OUT" "$TMP/out.docx"
soffice --headless --convert-to pdf --outdir "$TMP" "$TMP/out.docx" >/dev/null 2>&1
DUMP_TOC="$TMP/ids.json" node make-docx.js
python3 toc_pages.py "$TMP/out.pdf" "$TMP/ids.json" toc-pages.json
node make-docx.js
echo "built $OUT"
