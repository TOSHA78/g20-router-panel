#!/bin/sh
# Transpile panel.src.js to Safari 11 and inline it into shell.html.
set -e
cd "$(dirname "$0")"
npx -y esbuild@0.24.2 panel.src.js --bundle --format=iife --target=safari11 --outfile=/tmp/panel.build.js --log-level=warning
npx -y acorn@8 --ecma2017 --silent /tmp/panel.build.js
python3 - <<'PY'
from pathlib import Path
shell = Path("shell.html").read_text()
js = Path("/tmp/panel.build.js").read_text()
marker = "/*__PANEL_SRC__*/"
if marker not in shell:
    raise SystemExit("shell.html is missing the panel marker")
js = js.replace("</", "<\\/")
out = shell.replace(marker, js)
if "192.168." in out or "192.168." in js:
    raise SystemExit("built page still contains a hardcoded LAN prefix")
Path("index.html").write_text(out)
Path("p.html").write_text(out)
print("built", len(out))
PY
