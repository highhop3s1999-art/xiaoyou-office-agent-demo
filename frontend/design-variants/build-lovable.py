"""Create a presentation-only comparison copy. Never rebuild or overwrite the original."""
import hashlib
import json
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
source=ROOT/'程小悠.html'
output=ROOT/'程小悠-Lovable视觉版.html'
before=source.read_bytes()
html=before.decode()
css=(ROOT/'design-variants/lovable.css').read_text()
html=html.replace('data-ui="refined"','data-ui="refined" data-visual="lovable"',1)
html=html.replace('<title>小悠 · 让工作从容一点</title>','<title>小悠 · Lovable 视觉对比版</title>',1)
html=html.replace('</head>','<style id="lovable-visual-variant">\n'+css+'\n</style></head>',1)
output.write_text(html)
assert source.read_bytes()==before, 'Original must remain unchanged'
assert re.findall(r'<script\b[^>]*>(.*?)</script>',html,re.S)==re.findall(r'<script\b[^>]*>(.*?)</script>',before.decode(),re.S), 'Application scripts must remain byte-identical'
report={'original':source.name,'variant':output.name,'originalSha256':hashlib.sha256(before).hexdigest(),'originalUnchanged':True,'scriptsIdentical':True,'externalDependenciesAdded':False}
(ROOT/'design-variants/build-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
