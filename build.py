import json
from pathlib import Path

root = Path(__file__).resolve().parent
source = (root / 'template.html').read_text(encoding='utf-8')
replacements = {
    '__VUE__': (root / 'vendor/vue.global.prod.js').read_text(encoding='utf-8'),
    '__D3__': (root / 'vendor/d3.min.js').read_text(encoding='utf-8'),
    '__DATA__': json.dumps(json.loads((root / 'data.json').read_text(encoding='utf-8')), ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c'),
    '__APP__': (root / 'app.js').read_text(encoding='utf-8'),
}
for marker, value in replacements.items():
    source = source.replace(marker, value)
(root / 'index.html').write_text(source, encoding='utf-8')
print('index.html rebuilt')
