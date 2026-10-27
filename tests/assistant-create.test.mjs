import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantFromDescription,assistantCreateForm} from '../frontend/src/assistant-create.js';
import {initialState,esc,icon} from '../frontend/src/core.js';
import {initCatalog,handleCatalog,submitCatalog} from '../frontend/src/catalog.js';
import {initOffice} from '../frontend/src/office-model.js';
import {savedExperts,initExpertLibrary} from '../frontend/src/expert-library.js';

test('one sentence creates defaults, keeps intent, and binds no resources or permissions',()=>{
 const brief='帮我把每周工作整理成周报，先写结论，再列风险。';
 const a=assistantFromDescription(brief);
 assert.equal(a.name,'工作汇报助理');assert.equal(a.instructions,brief);assert.equal(a.creationBrief,brief);
 assert.deepEqual([a.plugins,a.skills,a.mcps],[[],[],[]]);assert.equal(a.requiresAuth,false);
 assert.equal(assistantFromDescription(brief,[a]).name,'工作汇报助理 2');
 assert.equal(assistantFromDescription('名字叫「文稿管家」，帮我检查文章').name,'文稿管家');
 assert.throws(()=>assistantFromDescription('   '));assert.throws(()=>assistantFromDescription('a'.repeat(2001)));
 const long='总结资料。'.repeat(180);assert.equal(assistantFromDescription(long).instructions,long);
 assert.equal(assistantFromDescription(long).description.length,500);
 const html=assistantCreateForm({icon});assert.equal((html.match(/<textarea/g)||[]).length,1);assert.doesNotMatch(html,/<select|type="checkbox"|name="name"/);
});

test('create goes straight to saved assistant without tasks or pinning, later configuration preserves definition',()=>{
 const state=initialState();initCatalog(state);initOffice(state);
 const c={state,ui:{route:'experts'},esc,icon,save(){this.saved=true},render(){},closeModal(){this.dialog=null},go(route){this.ui.route=route},toast(t){this.message=t},modal(title,body){this.dialog={title,body}}};
 handleCatalog('cat:new-expert',{dataset:{}},c);assert.match(c.dialog.body,/cat:expert-quick/);assert.doesNotMatch(c.dialog.body,/角色定义|开场提示词|引用技能/);
 const Native=globalThis.FormData;
 globalThis.FormData=class{constructor(form){this.entries=form.entries}*[Symbol.iterator](){yield* this.entries}getAll(name){return this.entries.filter(([k])=>k===name).map(([,v])=>v)}};
 try{
 const count=state.tasks.length;
 submitCatalog('cat:expert-quick',{dataset:{},entries:[['brief','帮我整理会议纪要和后续行动']]},c);
 const a=savedExperts(state).find(x=>x.name==='会议助理');assert.ok(a);assert.equal(c.ui.route,'agent/'+a.id);assert.equal(a.pinned,false);assert.equal(state.tasks.length,count);assert.ok(c.saved);
 handleCatalog('cat:edit-expert',{dataset:{id:a.catalogId}},c);assert.match(c.dialog.body,/引用 MCP/);assert.match(c.dialog.body,/整理会议纪要/);
 const skill=state.catalog.skills[0].id,mcp=state.catalog.mcps[0].id;
 submitCatalog('cat:expert',{dataset:{id:a.catalogId},entries:[['name','会议纪要助理'],['description','整理会议信息'],['instructions',a.instructions],['example',a.example],['category',a.category],['skills',skill],['mcps',mcp]]},c);
 initExpertLibrary(state);assert.deepEqual(a.skills,[skill]);assert.deepEqual(a.mcps,[mcp]);assert.equal(a.name,'会议纪要助理');assert.equal(state.catalog.experts.find(x=>x.id===a.catalogId).creationBrief,'帮我整理会议纪要和后续行动');
 }finally{globalThis.FormData=Native}
});
