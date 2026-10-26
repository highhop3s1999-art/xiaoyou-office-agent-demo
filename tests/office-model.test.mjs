import assert from 'node:assert/strict';
import {newTask,initialState} from '../frontend/src/core.js';
import {SCENARIOS,initOffice,seedOfficeTask,startRun,advance,pause,recover,repair,decide,execute,updateStep,reorder,addStep,removeStep,saveTemplate,syncArtifacts,report,createApproval} from '../frontend/src/office-model.js';
let checks=0;const ok=(condition,label)=>{assert.ok(condition,label);checks++;};
const make=key=>seedOfficeTask(newTask(SCENARIOS[key].prompt),key);
function ready(t){startRun(t);for(let i=0;i<12;i++){if(t.office.phase==='ready')return;if(t.office.phase==='review')repair(t);if(t.office.phase==='blocked')recover(t);advance(t);}throw Error('Did not reach reviewable delivery');}
for(const key of Object.keys(SCENARIOS)){
  const t=make(key);ok(t.office.phase==='plan',key+' starts at a plan');ok(t.office.approval===null,'no implicit approval');
  ready(t);ok(t.office.quality==='passed','quality checked');ok(t.office.selfCheck.passed,'lead checked');ok(t.office.steps.filter(s=>s.id!=='deliver').every(s=>s.status==='complete'),'all prerequisites completed');
  const a=t.office.approval;ok(!execute(t,a.id),'cannot execute without approval');ok(!decide(t,'approve','another-task'),'wrong approval rejected');ok(decide(t,'approve',a.id),'approve exact operation');ok(!decide(t,'approve',a.id),'duplicate approval rejected');ok(execute(t,a.id),'execute one operation');ok(!execute(t,a.id),'duplicate execution rejected');ok(t.office.receipts.length===1,'one receipt');ok(t.office.phase==='complete','complete only after delivery');
}
{
  const t=make('review');startRun(t);advance(t);advance(t);advance(t);ok(t.office.phase==='review','independent check detects seeded error');ok(!t.office.selfCheck,'lead does not pass failing result');ok(!t.office.approval,'failed result has no approval');ok(t.files.length===3,'failure keeps artifacts');
  repair(t);advance(t);advance(t);const old=t.office.approval;decide(t,'approve',old.id);const f=report(t);f.version++;f.content.pages[0].paragraphs[0]+=' 增加核对建议。';syncArtifacts(t);ok(old.status==='invalid','content change invalidates approval');ok(!execute(t,old.id),'old approval cannot write new version');ok(t.office.phase==='review','changed result needs checking');repair(t);advance(t);advance(t);ok(t.office.approval.id!==old.id,'new approval ID after recheck');ok(t.office.approval.versions.some(v=>v.id===f.id&&v.version===f.version),'binds exact new version');
  decide(t,'reject',t.office.approval.id);ok(t.office.phase==='rejected','rejection stops delivery');ok(!execute(t,t.office.approval.id),'rejection does not retry');ok(t.office.receipts.length===0,'rejection has no receipt');
}
{
  const t=make('reconcile');t.office.failureArmed=true;startRun(t);advance(t);ok(t.office.phase==='blocked','connector failure blocks dependency');ok(t.files.length===1,'research survives connector failure');const artifact=t.files[0],version=artifact.version;ok(recover(t),'connection can recover');advance(t);ok(t.files[0]===artifact&&artifact.version===version,'recovery does not redo successful research');ok(t.office.steps.find(s=>s.id==='data').status==='complete','only failed step resumes');pause(t);const count=t.office.events.length;ok(!advance(t),'paused task cannot advance');ok(t.office.events.length===count,'pause has no hidden progress');
}
{
  const t=make('proposal');const version=t.office.planVersion;const cyclic=updateStep(t,'research',{deps:['write']});ok(!!cyclic.error,'cycle rejected');ok(t.office.planVersion===version,'invalid edit keeps prior plan');const badOrder=reorder(t,'write','research');ok(!!badOrder.error,'cannot reorder before prerequisite');ok(reorder(t,'data','research').ok,'independent nodes can reorder');ok(t.office.planVersion===version+1,'valid reorder versioned');ok(updateStep(t,'write',{role:'产品方案专家 · 企业自建',output:'方案＋异常路径'}).ok,'enterprise role can replace writer');ok(t.office.planHistory.length===2,'history of edits retained');ready(t);const a=t.office.approval;decide(t,'approve',a.id);updateStep(t,'write',{output:'新交付物'});ok(a.status==='invalid','plan edit invalidates approval');ok(!execute(t,a.id),'plan edit prevents stale delivery');ok(t.office.steps.find(s=>s.id==='research').status==='complete','unaffected source step retained');
}
{
  const t=make('review');ready(t);const data=t.files.find(f=>f.type==='sheet');data.content.sheets[0].rows.find(r=>r[0]==='含税收入')[1]='130000';data.version++;syncArtifacts(t);repair(t);advance(t);advance(t);ok(report(t).content.pages[0].paragraphs[0].includes('18.2%'),'recheck derives metric from edited data');ok(t.office.quality==='passed','recomputed report passes');
  const state=initialState();initOffice(state);const tpl=saveTemplate(state,t,'周复盘','team');ok(tpl.status.startsWith('候选'),'team template starts as candidate');ok(!('files' in tpl)&&!('approval' in tpl)&&!('receipts' in tpl)&&!('memorySnapshot' in tpl),'template excludes results and approvals');ok(tpl.params.includes('资料来源'),'template parameterizes inputs');const previous=JSON.stringify(tpl.steps);updateStep(t,'write',{output:'改动原任务'});ok(JSON.stringify(tpl.steps)===previous,'template snapshots do not mutate with source');
}
{
  const a=make('review'),b=make('reconcile');ready(a);const approval=a.office.approval;decide(a,'approve',approval.id);ok(!execute(b,approval.id),'task isolation blocks another task approval');approval.expires=Date.now()-1;ok(!execute(a,approval.id),'expired approval blocked');ok(a.office.receipts.length===0,'expiration no side effect');
  const state=initialState();initOffice(state);ok(!saveTemplate(state,b,'not ready','personal'),'unverified task not saved as recommended template');
}
{
  const t=make('proposal');const added=addStep(t,{title:'风险复核',role:'研究员 · 内置',output:'风险清单',after:'write'});ok(added.ok,'optional specialist can be added');ok(t.office.steps.length===7,'new step in graph');ok(t.office.steps.find(s=>s.id==='check').deps.includes(added.id),'acceptance waits for optional output');ready(t);ok(t.files.some(f=>f.name==='风险清单'),'added specialist produces a real artifact');const approval=t.office.approval;decide(t,'approve',approval.id);ok(removeStep(t,added.id).ok,'optional step removable');ok(approval.status==='invalid','removal invalidates old approval');ok(!t.office.steps.some(s=>s.deps.includes(added.id)),'removal repairs graph dependencies');ok(!removeStep(t,'check').ok,'mandatory independent check retained');
  const builder=make('builder');ok(builder.office.steps.length===7,'builder plans a dedicated panel role');ok(builder.office.steps.find(s=>s.id==='check').deps.includes('panel'),'panel checked before delivery');
}
console.log(`${checks} product-state assertions passed: four scenarios, version binding, rejection, idempotency, recovery, dependency validation, rubric recomputation, template boundaries and task isolation.`);
