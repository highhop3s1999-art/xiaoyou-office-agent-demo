import test from 'node:test';
import assert from 'node:assert/strict';
import {nextMessageSuggestion,suggestionKey,renderFollowupField,acceptFollowup,keyFollowup} from '../frontend/src/followup-suggestions.js';
const thread=(text='你好',reply='我是小悠，和你一起工作。')=>({id:'c1',agentId:'personal',draft:'',retrievalScopes:['chat'],messages:[{id:'u1',role:'user',text},{id:'a1',role:'assistant',text:reply}]});
function setup(){const owner=thread(),ctx={ui:{},state:{office:{threads:{c1:owner},activeConversations:{personal:'c1'}},tasks:[]}};const input={isConnected:true,value:'',dataset:{live:'cv:draft',agent:'personal',conversation:'c1',nextSuggestion:nextMessageSuggestion(owner),nextKey:suggestionKey(owner)},dispatchEvent(e){assert.equal(e.type,'input');owner.draft=this.value;},focus(){},setSelectionRange(){}};return {owner,ctx,input};}
test('only a completed assistant turn following user input gets a suggestion',()=>{
 assert.equal(nextMessageSuggestion(null),'');assert.equal(nextMessageSuggestion({messages:[{role:'assistant',text:'welcome'}]}),'');
 const t=thread();t.messages.pop();assert.equal(nextMessageSuggestion(t),'');
 t.messages.push({role:'assistant',kind:'welcome',text:'welcome'});assert.equal(nextMessageSuggestion(t),'');
 assert.ok(nextMessageSuggestion(thread()));
 for(const task of [{status:'running'},{office:{phase:'running'}}])assert.equal(nextMessageSuggestion(thread(),task),'');
 const streaming=thread();streaming.messages.at(-1).streaming=true;assert.equal(nextMessageSuggestion(streaming),'');
});
test('suggestions reflect the user topic and reply/task state without promising execution',()=>{
 assert.match(nextMessageSuggestion(thread()),/哪些工作/);
 assert.match(nextMessageSuggestion(thread('整理会议纪要')),/负责人/);
 assert.match(nextMessageSuggestion(thread('分析这些数据')),/关键发现/);
 assert.match(nextMessageSuggestion(thread('对比两款产品')),/取舍/);
 assert.match(nextMessageSuggestion(thread(),{office:{phase:'plan'}}),/哪些工作/);
 assert.match(nextMessageSuggestion(thread('继续'),{office:{phase:'blocked'}}),/卡在哪里/);
 const pending=thread('查找会议');pending.messages.at(-1).kind='retrieval-pending';assert.match(nextMessageSuggestion(pending),/补充哪些资料/);
 assert.notEqual(nextMessageSuggestion(thread('可以结合一个具体例子展开说说吗？')),'可以结合一个具体例子展开说说吗？');
});
test('rendered hint is a placeholder, never a textarea value or submit action',()=>{
 const html=renderFollowupField('<textarea placeholder="默认"></textarea>',thread());assert.match(html,/placeholder="你能帮我做哪些工作？[^"\n]{30,}"/);assert.match(html,/type="button"/);assert.match(html,/<\/textarea>/);assert.doesNotMatch(html,/>你能帮我做哪些工作？<\/textarea>/);
 assert.equal(renderFollowupField('<textarea placeholder="默认"></textarea>',null),'<textarea placeholder="默认"></textarea>');
});
test('accept only creates an editable draft, leaving messages and retrieval scopes intact',()=>{
 const {owner,ctx,input}=setup(),before=structuredClone(owner.messages);assert.equal(acceptFollowup(input,ctx),true);assert.equal(owner.draft,nextMessageSuggestion(owner));assert.deepEqual(owner.messages,before);assert.deepEqual(owner.retrievalScopes,['chat']);
});
test('drafts, stale turns, switched conversation, detached inputs and modal never accept',()=>{
 for(const mutate of [x=>x.input.value='我的草稿',x=>x.owner.draft='已有草稿',x=>x.owner.messages.push({id:'u2',role:'user',text:'新问题'}),x=>x.ctx.state.office.activeConversations.personal='c2',x=>x.input.isConnected=false,x=>x.ctx.ui.modal={}]){const x=setup();mutate(x);const before=x.input.value;assert.equal(acceptFollowup(x.input,x.ctx),false);assert.equal(x.input.value,before);}
});
test('only unmodified Tab accepts; Enter, composing and Shift+Tab retain their behavior',()=>{
 for(const props of [{key:'Enter'},{key:'Tab',shiftKey:true},{key:'Tab',isComposing:true},{key:'Tab',metaKey:true}]){const x=setup();assert.equal(keyFollowup({...props,target:x.input,preventDefault(){throw Error('should not intercept');}},x.ctx),false);assert.equal(x.owner.draft,'');}
 const x=setup();let prevented=false;assert.equal(keyFollowup({key:'Tab',target:x.input,preventDefault(){prevented=true;}},x.ctx),true);assert.ok(prevented);
});
