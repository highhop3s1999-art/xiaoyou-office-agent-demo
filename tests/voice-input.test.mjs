import test from 'node:test';
import assert from 'node:assert/strict';
import {handleVoice,keyVoice,refreshVoiceUI} from '../frontend/src/voice-input.js';

function setup(){
 const panel={innerHTML:'',remove(){}},form={dataset:{identity:'thread1'},classList:{add(){},remove(){}},querySelector(){return panel;}};
 const input={id:'cv-message',dataset:{agent:'personal',conversation:'thread1'},value:'原有草稿',closest(){return form;},dispatchEvent(){this.persisted=this.value;},focus(){},setSelectionRange(){}};
 let engine;class Recognition{constructor(){engine=this;}start(){this.started=true;}stop(){this.stopped=true;}abort(){this.aborted=true;}}
 globalThis.document={getElementById(){return input;},querySelectorAll(selector){return selector==='.voice-panel'?[panel]:[form];}};
 globalThis.SpeechRecognition=Recognition;
 const c={ui:{route:'agent/personal'},state:{settings:{voice:{language:'普通话'}}},toast(){},modal(title){this.modalTitle=title;}};
 return {c,input,panel,engine:()=>engine,dispose(){handleVoice('voice:cancel',{},c);delete globalThis.document;delete globalThis.SpeechRecognition;}};
}
test('dictation stop waits for final recognition; confirmation only fills draft',()=>{const x=setup();try{handleVoice('voice:start',{dataset:{input:'cv-message'}},x.c);const r=x.engine();assert.equal(r.started,true);assert.equal(r.lang,'zh-CN');let prevented=false;keyVoice({key:'Enter',preventDefault(){prevented=true;}},x.c);assert.ok(prevented);assert.ok(r.stopped);handleVoice('voice:finish',{},x.c);assert.equal(x.input.value,'原有草稿');r.onresult({results:[Object.assign([{transcript:'补充下一步计划'}],{isFinal:true})]});r.onend();handleVoice('voice:finish',{},x.c);assert.equal(x.input.value,'原有草稿 补充下一步计划');assert.equal(x.input.persisted,x.input.value);assert.ok(r.aborted);}finally{x.dispose();}});
test('cancel discards speech and stops capture while retaining original draft',()=>{const x=setup();try{handleVoice('voice:start',{dataset:{}},x.c);const r=x.engine();r.onresult({results:[Object.assign([{transcript:'不采纳'}],{isFinal:true})]});keyVoice({key:'Escape',preventDefault(){}},x.c);assert.ok(r.aborted);assert.equal(x.input.value,'原有草稿');r.onend();handleVoice('voice:finish',{},x.c);assert.equal(x.input.persisted,undefined);}finally{x.dispose();}});
test('navigation or conflicting draft aborts capture and late results cannot leak',()=>{for(const conflict of ['navigation','draft']){const x=setup();try{handleVoice('voice:start',{dataset:{}},x.c);const r=x.engine();if(conflict==='navigation')x.c.ui.route='agent/bi';else x.input.value='用户改写的草稿';refreshVoiceUI(x.c);assert.ok(r.aborted);r.onresult({results:[Object.assign([{transcript:'旧结果'}],{isFinal:true})]});r.onend();handleVoice('voice:finish',{},x.c);assert.equal(x.input.persisted,undefined);assert.ok(!x.input.value.includes('旧结果'));}finally{x.dispose();}}});
test('permission error is explicit and never changes the draft',()=>{const x=setup();try{handleVoice('voice:start',{dataset:{}},x.c);x.engine().onerror({error:'not-allowed'});assert.match(x.panel.innerHTML,/未获得麦克风权限/);handleVoice('voice:finish',{},x.c);assert.equal(x.input.value,'原有草稿');}finally{x.dispose();}});
test('unsupported browser explains limitation and retains input',()=>{const x=setup();try{delete globalThis.SpeechRecognition;handleVoice('voice:start',{dataset:{}},x.c);assert.equal(x.c.modalTitle,'语音输入');assert.equal(x.input.value,'原有草稿');}finally{x.dispose();}});
