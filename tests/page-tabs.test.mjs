import test from 'node:test';
import assert from 'node:assert/strict';
import {visitPageTab,closePageTab,renderPageTabs} from '../frontend/src/page-tabs.js';
test('opening and revisiting pages preserves order and groups subpages',()=>{
 let tabs=visitPageTab([],'home');tabs=visitPageTab(tabs,'plugins');tabs=visitPageTab(tabs,'teams');
 assert.deepEqual(visitPageTab(tabs,'plugins'),tabs);
 assert.deepEqual(visitPageTab(tabs,'skills'),['home','skills','teams']);
 assert.deepEqual(visitPageTab(['team/product/resources'],'team/product/members'),['team/product/members']);
});
test('closing tabs chooses a neighbor and never mutates page data',()=>{
 const tabs=['home','teams','chat/a'];
 assert.deepEqual(closePageTab(tabs,'teams','teams'),{tabs:['home','chat/a'],route:'chat/a'});
 assert.deepEqual(closePageTab(tabs,'chat/a','chat/a'),{tabs:['home','teams'],route:'teams'});
 assert.deepEqual(closePageTab(tabs,'teams','home'),{tabs:['home','chat/a'],route:'home'});
 assert.deepEqual(closePageTab(['home'],'home','home'),{tabs:[],route:'home'});
 assert.equal(tabs.length,3);
});
test('labels reflect task titles and are safely escaped; only current tab selected',()=>{
 const html=renderPageTabs({tasks:[{id:'a',title:'<report>'}]},['home','chat/a'],'chat/a');
 assert.ok(html.includes('&lt;report&gt;'));assert.ok(!html.includes('<report>'));
 assert.equal((html.match(/aria-selected="true"/g)||[]).length,1);
 assert.ok(html.includes('关闭标签：&lt;report&gt;'));
});
