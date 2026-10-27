import assert from 'node:assert/strict';
import {initialState} from '../frontend/src/core.js';
import {initTaskFiles} from '../frontend/src/viewer.js';
import {initSecretary,changeSecretaryItem,checkSecretary} from '../frontend/src/secretary-state.js';
import {collectDiaryDay,collectDiaryDates,diaryDate,shiftDiaryDate,renderDiary,handleDiary,submitDiary} from '../frontend/src/personal-diary.js';

let checks=0;
function check(name,fn){fn();checks++;console.log('✓ '+name);}
const today=diaryDate(), yesterday=shiftDiaryDate(today,-1), tomorrow=shiftDiaryDate(today,1);
const at=(date,hour=12)=>new Date(date+'T'+String(hour).padStart(2,'0')+':00:00').getTime();
const state=initialState();
for(const task of state.tasks){task.createdAt=at(yesterday);task.messages.forEach(m=>m.time=at(yesterday));initTaskFiles(task,task.kind);}
initSecretary(state,at(yesterday,10));
const c={state,ui:{route:'personal/diary'},save(){this.saved=JSON.stringify(this.state);},render(){this.rendered=true;},go(route){this.route=route;},toast(text){this.notice=text;},modal(title,body,opts){this.dialog={title,body,opts};},closeModal(){this.dialog=null;}};
const action=(name,data={})=>handleDiary('diary:'+name,{dataset:data},c);
const OriginalFormData=globalThis.FormData;
globalThis.FormData=class{constructor(values){this.values=values;}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]();}};

check('local midnight belongs to the local calendar date',()=>assert.equal(diaryDate(new Date('2026-03-01T00:05:00')), '2026-03-01'));
check('previous day crosses leap-year month boundary',()=>assert.equal(shiftDiaryDate('2024-03-01',-1),'2024-02-29'));
check('previous day crosses year boundary',()=>assert.equal(shiftDiaryDate('2026-01-01',-1),'2025-12-31'));
check('invalid dates are rejected, never normalised into another month',()=>assert.equal(shiftDiaryDate('2026-02-30',1),''));
check('aggregation is read-only',()=>{const before=JSON.stringify(state);collectDiaryDay(state,yesterday);assert.equal(JSON.stringify(state),before);});
check('same-day samples aggregate six unique work items and nine real local files',()=>{const day=collectDiaryDay(state,yesterday);assert.equal(day.activities.length,6);assert.equal(day.artifacts.length,9);});
check('sample data never invents a user accomplishment',()=>assert.equal(collectDiaryDay(state,yesterday).moments.length,0));
check('empty date has neither activities nor artifacts',()=>{const day=collectDiaryDay(state,'2000-01-01');assert.equal(day.activities.length+day.artifacts.length,0);});
check('saved initial date defaults to today',()=>{renderDiary(c);assert.equal(state.personalDiary.selectedDate,today);});
check('future navigation cannot advance beyond today',()=>{action('next');assert.equal(state.personalDiary.selectedDate,today);});
check('submitted invalid date is rejected',()=>{submitDiary('diary:date',{date:'2026-02-30'},c);assert.equal(state.personalDiary.selectedDate,today);});
check('submitted future date is rejected',()=>{submitDiary('diary:date',{date:tomorrow},c);assert.equal(state.personalDiary.selectedDate,today);});
check('previous-day navigation persists its date',()=>{action('previous');assert.equal(state.personalDiary.selectedDate,yesterday);assert.equal(JSON.parse(c.saved).personalDiary.selectedDate,yesterday);});
check('all available artifact types have complete preview bodies',()=>{for(const file of collectDiaryDay(state,yesterday).artifacts){assert.equal(action('artifact',{key:file.key,date:yesterday}),true);assert.ok(c.dialog.body.includes('diary-preview'));if(file.type==='ppt')assert.match(c.dialog.body,/第 3 页/);if(file.type==='sheet')assert.match(c.dialog.body,/待办事项/);if(file.type==='html')assert.match(c.dialog.body,/青岚/);if(file.kind==='secretary')assert.ok(c.dialog.body.includes(file.content.pages.at(-1).paragraphs.at(-1)));}});
check('viewing secretary evidence or artifact never creates a task',()=>{const count=state.tasks.length;action('evidence',{key:'secretary:sec-data',date:yesterday});assert.match(c.dialog.body,/原消息/);assert.equal(state.tasks.length,count);});
check('workspace opens the exact original file without duplicating work',()=>{const task=state.tasks[1],file=task.files[2],count=state.tasks.length;action('workspace',{task:task.id,file:file.id});assert.equal(c.route,'chat/'+task.id);assert.equal(task.viewer.active,file.id);assert.equal(task.viewer.open,true);assert.equal(state.tasks.length,count);});
check('favorites persist to a serializable private state',()=>{action('favorite',{key:'secretary:sec-data',date:yesterday});assert.equal(JSON.parse(c.saved).personalDiary.favorites.length,1);});
check('favorite toggle removes the same item without duplicates',()=>{action('favorite',{key:'secretary:sec-data',date:yesterday});assert.equal(state.personalDiary.favorites.length,0);});
check('editing diary survives reload and retains wording verbatim',()=>{submitDiary('diary:edit',{date:yesterday,text:'今天，我先把口径想清楚。\n一小步也算数。'},c);const reload={...c,state:JSON.parse(c.saved)};assert.match(renderDiary(reload),/今天，我先把口径想清楚。<br>一小步也算数。/);});
check('user note survives reload and is labeled as user-written',()=>{submitDiary('diary:note',{date:yesterday,text:'第一次把预期说清楚，很开心。'},c);const html=renderDiary({...c,state:JSON.parse(c.saved)});assert.match(html,/第一次把预期说清楚，很开心。/);assert.match(html,/由你记录/);});
check('diary edits cannot inject HTML',()=>{submitDiary('diary:edit',{date:yesterday,text:'<script>alert(1)</script>'},c);assert.ok(!renderDiary(c).includes('<script>'));assert.match(renderDiary(c),/&lt;script&gt;/);});
check('clearing custom text restores the factual summary',()=>{submitDiary('diary:edit',{date:yesterday,text:''},c);assert.equal(state.personalDiary.days[yesterday].text,undefined);assert.match(renderDiary(c),/一起照看了 6 件事/);});
check('empty day can hold a personal note without creating tasks',()=>{submitDiary('diary:note',{date:'2000-01-01',text:'纯粹属于我的一天。'},c);submitDiary('diary:date',{date:'2000-01-01'},c);const html=renderDiary(c);assert.match(html,/纯粹属于我的一天。/);assert.match(html,/没有一起工作的记录/);});

const data=state.secretary.items.find(x=>x.id==='sec-data');
check('real local decisions create evidence-based moments',()=>{changeSecretaryItem(state.secretary,data.id,'decide',{choice:'natural',note:'保留范围'},at(today,9));const day=collectDiaryDay(state,today);assert.equal(day.moments.length,1);assert.match(day.moments[0].detail,/确认了统计口径/);});
check('historical secretary content remains the original v1',()=>{const artifact=collectDiaryDay(state,yesterday).artifacts.find(x=>x.sourceId===data.id);assert.equal(artifact.version,1);assert.match(artifact.content.pages[0].paragraphs[0],/两份材料/);});
check('today secretary artifact reflects v2 with full new paragraphs',()=>{const artifact=collectDiaryDay(state,today).artifacts.find(x=>x.sourceId===data.id);assert.equal(artifact.version,2);assert.match(artifact.content.pages.at(-1).paragraphs[0],/保留范围/);});
check('supply revisions without explicit vN in the log retain the right date',()=>{changeSecretaryItem(state.secretary,'sec-progress','supply','',at(today,10));assert.equal(collectDiaryDay(state,today).artifacts.find(x=>x.sourceId==='sec-progress').version,2);});
check('simulated review completion stays in the same item and produces v2',()=>{state.secretary.enabled=true;checkSecretary(state.secretary,at(today,11));assert.equal(collectDiaryDay(state,today).artifacts.find(x=>x.sourceId==='sec-review').version,2);});
const task=state.tasks[0], file=task.files[0], original=JSON.parse(JSON.stringify(file.content));
check('past task artifact uses before-change snapshot',()=>{task.versions.push({fileId:file.id,version:1,content:original,at:new Date(at(today,8)).toISOString()});task.changes.push({fileId:file.id,fileName:file.name,before:original.title,after:'更新后的标题',at:new Date(at(today,8)).toISOString()});file.content.title='更新后的标题';file.version=2;const item=collectDiaryDay(state,yesterday).artifacts.find(x=>x.fileId===file.id);assert.equal(item.version,1);assert.equal(item.content.title,original.title);});
check('today edit has the changed content and specific contribution evidence',()=>{const day=collectDiaryDay(state,today);assert.equal(day.artifacts.find(x=>x.fileId===file.id).content.title,'更新后的标题');assert.ok(day.moments.some(m=>m.detail.includes('更新后的标题')));});
check('a later chat does not re-date all old files as new products',()=>{state.tasks[1].messages.push({role:'user',text:'再看一下',time:at(today,13)});assert.equal(collectDiaryDay(state,today).artifacts.filter(x=>x.sourceId===state.tasks[1].id).length,0);});
check('missing artifact is handled gracefully',()=>{action('artifact',{key:'gone',date:today});assert.match(c.notice,/已不在本地/);});
check('saved record remains readable when original task is removed',()=>{action('favorite',{key:'task:'+task.id,date:today});state.tasks=state.tasks.filter(x=>x.id!==task.id);action('saved-evidence',{key:'task:'+task.id,date:today});assert.match(c.dialog.body,/来源已从本地移除/);});
check('unrelated actions pass to the next module',()=>{assert.equal(handleDiary('sec:detail',{dataset:{}},c),false);assert.equal(submitDiary('sec:assign',{},c),false);});

check('index defaults to dated rows, without full diary sections',()=>{const html=renderDiary({...c,ui:{route:'personal/diary'}});assert.match(html,/<h1>日记<\/h1>/);assert.match(html,/diary-day-card/);assert.ok(!html.includes('diary-prose'));assert.ok(!html.includes('值得记住的你'));assert.ok(!html.includes('diary-timeline'));});
check('index derives dates only from existing records and handwritten entries',()=>{const empty={tasks:[],secretary:{items:[]},personalDiary:{days:{'2001-02-03':{note:'留下了一个想法。'},'2001-02-04':{text:''}},favorites:[]}};assert.deepEqual(collectDiaryDates(empty),['2001-02-03']);});
check('index has one row per recorded day, regardless of task count',()=>{const local={...c,ui:{route:'personal/diary'}};const html=renderDiary(local);assert.equal((html.match(/class="diary-day-card"/g)||[]).length,collectDiaryDates(c.state).length);});
check('opening a day shows its full content without creating a modal',()=>{c.dialog=null;action('open-day',{date:yesterday});assert.equal(c.ui.diaryView,'detail');assert.equal(c.dialog,null);assert.match(renderDiary(c),/返回日记/);assert.match(renderDiary(c),/diary-prose/);});
check('back from detail retains the selected month',()=>{c.ui.diaryMonth=yesterday.slice(0,7);action('back-list');assert.equal(c.ui.diaryView,'list');assert.equal(c.ui.diaryMonth,yesterday.slice(0,7));assert.ok(!renderDiary(c).includes('diary-prose'));});
check('month filtering changes rows without editing any diary record',()=>{const before=JSON.stringify(c.state);submitDiary('diary:month',{month:'2000-01'},c);const html=renderDiary(c);assert.match(html,/data-date="2000-01-01"/);assert.ok(!html.includes('data-date="'+today+'"'));assert.equal(JSON.stringify(c.state),before);});
check('empty index has one short empty message and a writing action',()=>{const html=renderDiary({...c,state:{tasks:[],secretary:{items:[]}},ui:{}});assert.match(html,/这里还没有日记/);assert.match(html,/diary:write/);assert.ok(!html.includes('diary-day-card'));});
check('writing from index opens a form without inventing a diary entry',()=>{const local={...c,state:{tasks:[],secretary:{items:[]}},ui:{}};renderDiary(local);handleDiary('diary:write',{dataset:{}},local);assert.equal(local.ui.diaryView,'detail');assert.match(local.dialog.body,/diary:edit/);assert.deepEqual(collectDiaryDates(local.state),[]);});
check('closing artifact preview returns to the chosen day and preserves its note',()=>{const artifact=collectDiaryDay(c.state,yesterday).artifacts[0];action('artifact',{date:yesterday,key:artifact.key});assert.match(c.dialog.body,/返回当天日记/);action('close-preview',{date:yesterday});assert.equal(c.dialog,null);assert.equal(c.ui.diaryView,'detail');assert.match(renderDiary(c),/第一次把预期说清楚/);});

check('automatic list summary adds other actual items without repeating the title',()=>{const sample={tasks:['周报 · 认识小悠','会议材料','核对数据'].map((title,i)=>({id:'summary-'+i,title,createdAt:at(today),messages:[],files:[]})),personalDiary:{version:1,selectedDate:today,days:{},favorites:[]}};const before=JSON.stringify(sample);const html=renderDiary({...c,state:sample,ui:{}});assert.match(html,/还有「会议材料」、「核对数据」。/);const summary=html.match(/class="diary-day-summary">([^<]*)<\/span>/)[1];assert.ok(!summary.includes('周报'));assert.ok(!html.includes(' · 认识小悠'));assert.ok(!html.includes('今天的本地记录里'));assert.equal(JSON.stringify(sample),before);});
check('handwritten list summary is capped at 70 characters without shortening stored text',()=>{const text='甲'.repeat(70)+'这里必须保留在正文';const sample={tasks:[],personalDiary:{version:1,selectedDate:today,days:{[today]:{text}},favorites:[]}};const html=renderDiary({...c,state:sample,ui:{}});const summary=html.match(/class="diary-day-summary">([^<]*)<\/span>/)[1];assert.equal(summary,'甲'.repeat(70));assert.equal(sample.personalDiary.days[today].text,text);});

check('single-item day omits automatic summary when there is no independent information',()=>{const sample={tasks:[{id:'only-item',title:'核对数据',createdAt:at(today),messages:[],files:[]}],personalDiary:{version:1,selectedDate:today,days:{},favorites:[]}};const html=renderDiary({...c,state:sample,ui:{}});assert.match(html,/核对数据/);assert.ok(!html.includes('diary-day-summary'));});
check('detail keeps diary and editing visible while supporting records default to collapsed',()=>{const local={...c,ui:{diaryView:'detail'},state:JSON.parse(JSON.stringify(state))};local.state.personalDiary.selectedDate=yesterday;const html=renderDiary(local);assert.match(html,/<p class="diary-prose">/);assert.match(html,/data-action="diary:edit"/);assert.match(html,/data-action="diary:note"/);for(const name of ['artifacts','extras']){const tag=html.match(new RegExp('<details class="diary-disclosure diary-'+name+'-disclosure"[^>]*>'))[0];assert.ok(!tag.includes('open'));}assert.ok(html.indexOf('diary-prose')<html.indexOf('<details'));assert.ok(!html.includes('diary-aside'));});
check('returning from a preview preserves expanded records but opening a new day collapses them',()=>{const local={...c,ui:{diaryView:'detail',diaryArtifactsOpen:true,diaryExtrasOpen:true},state:JSON.parse(JSON.stringify(state))};handleDiary('diary:close-preview',{dataset:{date:yesterday}},local);assert.match(renderDiary(local),/<details class="diary-disclosure diary-artifacts-disclosure" open>/);handleDiary('diary:open-day',{dataset:{date:yesterday}},local);assert.equal(local.ui.diaryArtifactsOpen,false);assert.equal(local.ui.diaryExtrasOpen,false);});

globalThis.FormData=OriginalFormData;
console.log(`\n${checks} diary checks passed.`);
