#!/usr/bin/env python3
"""Package the current simple named-export modules into one offline HTML file.

No runtime dependency or build package is required. Fail on unsupported module
syntax or dependency cycles instead of silently producing a broken artifact.
"""
import base64
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / '程小悠.html'
IMPORT = re.compile(r'^import\s*\{([^}]+)\}\s*from\s*[\'"]([^\'"]+)[\'"];?\s*$', re.M)
EXPORT = re.compile(r'^export\s+(const|let|(?:async\s+)?function|class)\s+([A-Za-z_$][\w$]*)', re.M)


def data_uri(path):
    mime = {'.png': 'image/png', '.svg': 'image/svg+xml'}[path.suffix]
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def build():
    assets = {'./' + str(path.relative_to(ROOT)): data_uri(path) for path in (ROOT / 'assets').iterdir() if path.suffix in {'.png', '.svg'}}

    def embed_assets(text):
        for name, uri in assets.items():
            text = text.replace(name, uri)
        return text

    modules, dependencies = {}, {}

    def load(name):
        if name in modules:
            return
        source = (ROOT / 'src' / name).read_text()
        modules[name] = ''
        dependencies[name] = []

        def replace_import(match):
            names, target = match.groups()
            if not target.startswith('./'):
                raise ValueError('Unsupported external dependency: ' + target)
            target = target[2:].split('?')[0]
            dependencies[name].append(target)
            load(target)
            fields = []
            for item in names.split(','):
                parts = re.split(r'\s+as\s+', item.strip())
                if not all(re.fullmatch(r'[A-Za-z_$][\w$]*', part) for part in parts):
                    raise ValueError('Unsupported import: ' + item)
                fields.append(':'.join(parts))
            return 'const {' + ','.join(fields) + '} = require(' + json.dumps(target) + ');'

        source = IMPORT.sub(replace_import, source)
        names = [match.group(2) for match in EXPORT.finditer(source)]
        def replace_export_list(match):
            fields = [x.strip() for x in match.group(1).split(',') if x.strip()]
            if not all(re.fullmatch(r'[A-Za-z_$][\w$]*', x) for x in fields):
                raise ValueError('Unsupported export list in ' + name)
            names.extend(fields)
            return ''
        source = re.sub(r'^export\s*\{([^}]+)\};?\s*$', replace_export_list, source, flags=re.M)
        source = EXPORT.sub(lambda match: match.group(1) + ' ' + match.group(2), source)
        if re.search(r'^\s*(?:import|export)\b', source, re.M):
            raise ValueError('Unsupported module syntax in ' + name)
        modules[name] = embed_assets(source) + '\nObject.assign(exports, {' + ','.join(names) + '});'

    load('app.js')
    load('site-public.js')

    def check_cycles(name, chain=()):
        if name in chain:
            raise ValueError('Module cycle: ' + ' -> '.join((*chain, name)))
        for dependency in dependencies[name]:
            check_cycles(dependency, (*chain, name))

    check_cycles('app.js')
    check_cycles('site-public.js')
    public = (ROOT / 'site.html').read_text()
    public_style = re.search(r'<style>(.*?)</style>', public, re.S).group(1)
    public_body = re.search(r'<body>(.*?)<script\b', public, re.S).group(1)
    public_body = embed_assets(public_body.replace('./index.html#sites', '#sites'))
    module_table = ',\n'.join(json.dumps(name) + ':function(exports,require){\n' + source + '\n}' for name, source in modules.items())
    script = '''(()=>{
'use strict';
globalThis.__CHENGXIAOYOU_SINGLE_FILE__=true;
const modules={MODULES};
const cache=Object.create(null);
function require(name){
 if(cache[name])return cache[name];
 if(!modules[name])throw new Error('Missing bundled module: '+name);
 const exports=cache[name]={};modules[name](exports,require);return exports;
}
if(location.hash.startsWith('#published/')){
 document.querySelector('#app-styles').textContent=PUBLIC_STYLE;
 document.body.innerHTML=PUBLIC_BODY;
 window.addEventListener('hashchange',()=>location.reload());
 require('site-public.js');
}else{
 window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#published/'))location.reload();});
 require('app.js');
}
})();'''.replace('MODULES', module_table).replace('PUBLIC_STYLE', json.dumps(public_style, ensure_ascii=False)).replace('PUBLIC_BODY', json.dumps(public_body, ensure_ascii=False))
    # Escape HTML script terminators inside JS strings, including artifact templates.
    script = re.sub(r'</script', r'<\/script', script, flags=re.I)
    html = (ROOT / 'index.html').read_text()
    styles = []

    def collect_styles(match):
        styles.append((ROOT / match.group(1).split('?')[0]).read_text())
        return ''

    html = re.sub(r'<link rel="stylesheet" href="([^\"]+)">', collect_styles, html)
    html = html.replace('</head>', '<style id="app-styles">\n' + '\n'.join(styles) + '\n</style></head>')
    html = embed_assets(html)
    html = re.sub(r'<script type="module" src="[^\"]+"></script>', lambda _: '<script>\n' + script + '\n</script>', html)
    OUTPUT.write_text(html)
    print(f'Built {OUTPUT.name}: {OUTPUT.stat().st_size:,} bytes, {len(modules)} modules, {len(styles)} stylesheets; no external assets.')


if __name__ == '__main__':
    build()
