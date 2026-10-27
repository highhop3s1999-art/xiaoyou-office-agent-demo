// Catch migration/build omissions before delivery. Layout is additionally checked in the browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../frontend/'+path,import.meta.url),'utf8');
const html=read('程小悠.html');
const css=html.match(/<style[^>]*id="app-styles"[^>]*>([\s\S]*?)<\/style>/)?.[1];
const hooks=new Set(['tc-main-scroll','cv-task-anchor','cv-all-experts']);
const modules=['conversation-ui','skill-discovery-ui','child-process-ui','task-center-ui','local-agents','experts-ui','context-shortcuts','office-ui'];
for(const module of modules)test(`${module}: component styles survive standalone packaging`,()=>{
  assert.ok(css,'standalone must embed application styles');
  const classes=new Set();
  for(const [,value] of read('src/'+module+'.js').matchAll(/class="([^"\n]+)"/g)){
    for(const name of value.match(/\b(?:sr|ex|cv|of|la|tc|cp|cs|tm|context)-[\w-]+/g)||[])if(!hooks.has(name))classes.add(name);
  }
  assert.ok(classes.size>0);
  const selectors=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[2].trim()).map(m=>m[1]).join('\n');
  for(const name of classes)assert.match(selectors,new RegExp('\\.'+name+'(?![\\w-])'),`${name} is rendered but has no packaged style rule`);
});
