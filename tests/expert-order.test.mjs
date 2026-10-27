import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,newTask} from '../frontend/src/core.js';
import {initCatalog} from '../frontend/src/catalog.js';
import {initWorkspace} from '../frontend/src/workspace.js';
import {initOffice,seedOfficeTask} from '../frontend/src/office-model.js';
import {agentThread,syncAgentThreads,focusAgentTask,selectedAgentTask,addAgentMessage} from '../frontend/src/agent-conversations.js';
import {renderAgentPins,sendConversation,handleConversation,inputConversation} from '../frontend/src/conversation-ui.js';
function setup(){
  const state=initialState();initCatalog(state);initWorkspace(state);initOffice(state);syncAgentThreads(state);
  return {state,ui:{route:'agent/bi'},currentTask(){return selectedAgentTask(this.state,this.ui.route.slice(6));},save(){syncAgentThreads(this.state);},render(){},go(route){this.ui.route=route;},toast(){},startTask(prompt,options){const task=seedOfficeTask(newTask(prompt,options),'review',options);this.state.tasks.push(task);syncAgentThreads(this.state);focusAgentTask(this.state,task);return task.id;}};
}
const order=(c,limit=3)=>[...renderAgentPins(c,{limit,showPrimary:false}).matchAll(/data-expert-id="([^"]+)"/g)].map(m=>m[1]);
test('opening experts, new conversations and drafts preserve sidebar order',()=>{
  const c=setup(),initial=order(c);
  for(const id of [...initial].reverse()){
    handleConversation('cv:open-expert',{dataset:{agent:id}},c);
    assert.deepEqual(order(c),initial);
    handleConversation('cv:new-topic',{dataset:{agent:id}},c);
    inputConversation({dataset:{live:'cv:draft',agent:id,conversation:agentThread(c.state,id).id},value:'还没发送的内容'},c);
    assert.deepEqual(order(c),initial);
  }
});
test('only successful user sends promote the expert, and order survives reload',()=>{
  const c=setup(),initial=order(c),last=initial.at(-1),second=initial[1];
  sendConversation(c,last,'你好');
  const firstExpected=[last,...initial.filter(id=>id!==last)];
  assert.deepEqual(order(c),firstExpected);
  c.ui.route='agent/'+initial[0];assert.deepEqual(order(c),firstExpected);
  addAgentMessage(c.state,initial[0],'assistant','后台工作已完成');syncAgentThreads(c.state);
  assert.deepEqual(order(c),firstExpected);
  sendConversation(c,second,'你好');
  const expected=[second,...firstExpected.filter(id=>id!==second)];
  assert.deepEqual(order(c),expected);
  assert.deepEqual(order(c,Infinity),expected);
  const restored=setup();restored.state=JSON.parse(JSON.stringify(c.state));syncAgentThreads(restored.state);
  assert.deepEqual(order(restored),expected);
});
test('empty input, failed task creation and failed persistence do not promote an expert',()=>{
  const c=setup(),initial=order(c),id=initial.at(-1);
  sendConversation(c,id,'   ');assert.deepEqual(order(c),initial);
  const start=c.startTask;c.startTask=()=>null;
  sendConversation(c,id,'分析本周经营');assert.deepEqual(order(c),initial);
  c.startTask=start;
  c.save=()=>false;sendConversation(c,id,'你好');assert.deepEqual(order(c),initial);
});
test('successfully submitting a new expert task promotes its host only',()=>{
  const c=setup(),initial=order(c),id=initial.at(-1);
  sendConversation(c,id,'分析本周经营');
  assert.ok(selectedAgentTask(c.state,id));
  assert.deepEqual(order(c),[id,...initial.filter(value=>value!==id)]);
  const before=order(c);syncAgentThreads(c.state);assert.deepEqual(order(c),before);
});
