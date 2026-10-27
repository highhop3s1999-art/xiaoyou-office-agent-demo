import test from 'node:test';
import assert from 'node:assert/strict';
import {composerModel,normalizeComposerModels,renderComposerModel} from '../frontend/src/composer-settings.js';
import {handleChat} from '../frontend/src/chat.js';
test('legacy task models inherit the selected model while explicit task and schedule choices survive',()=>{
 const state={composer:{model:'Gemini'},tasks:[{model:'智能模式'},{model:'GPT'},{}],workspace:{schedules:[{model:'智能模式'},{model:'Claude Sonnet'}]}};
 normalizeComposerModels(state);
 assert.deepEqual(state.tasks.map(t=>t.model),['Gemini','GPT','Gemini']);
 assert.deepEqual(state.workspace.schedules.map(s=>s.model),['Gemini','Claude Sonnet']);
 assert.equal(composerModel({composer:{model:'智能模式'}}),'Claude Opus 5.5');
});
test('model selection updates the active task and remains selected after reload',()=>{
 const state={composer:{model:'Claude Opus 5.5'},tasks:[{model:'智能模式'}]};
 const c={state,currentTask:()=>state.tasks[0],save(){},render(){}};
 handleChat('chat:set-model',{dataset:{value:'GPT'}},c);
 const restored=JSON.parse(JSON.stringify(state));normalizeComposerModels(restored);
 assert.equal(restored.tasks[0].model,'GPT');assert.equal(restored.composer.model,'Claude Opus 5.5');
 assert.match(renderComposerModel(restored,restored.tasks[0],'d-model-choice'),/>GPT</);
 assert.doesNotMatch(renderComposerModel(restored,restored.tasks[0]),/智能模式/);
 c.currentTask=()=>null;handleChat('chat:set-model',{dataset:{value:'Gemini'}},c);
 assert.equal(state.composer.model,'Gemini');assert.equal(state.tasks[0].model,'GPT');
});
