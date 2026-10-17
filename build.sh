#!/bin/sh
# build p.html/index.html: transpile panel.src.js to Safari 11 and inline into template
set -e; cd "$(dirname "$0")"
npx -y esbuild@0.24 panel.src.js --target=safari11 --outfile=/tmp/panel.build.js --log-level=warning
npx -y acorn@8 --ecma2017 --silent /tmp/panel.build.js
python3 -c "
import re
t=open('p.html').read(); b=open('/tmp/panel.build.js').read()
out=re.sub(r'<script>.*?</script>', lambda m: '<script>'+b+'</script>', t, count=1, flags=re.S)
open('p.html','w').write(out); open('index.html','w').write(out); print('built', len(out))"
