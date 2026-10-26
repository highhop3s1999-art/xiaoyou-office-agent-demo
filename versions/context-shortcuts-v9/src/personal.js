/* Personal assistance is derived only from local demo state. No remote reading, model calls or notifications. */
import {uid,newTask} from './core.js?v=20261026-9.0';
import {initTaskFiles} from './viewer.js?v=20261026-9.0';
const clone=x=>JSON.parse(JSON.stringify(x));
const digest=x=>{let h=2166136261;for(const c of String(x))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(36)};
const terminal=new Set(['acted','dismissed','expired']);
const types={resume:'接着推进',change:'关注有了变化',routine:'发现可复用的习惯',memory:'再了解你一点'};
const categories=[['weekly','周报',/周报|每周进展|本周进展/],['report','项目汇报',/复盘|汇报|演示文稿|PPT/i],['data','数据整理',/Excel|表格|数据整理|数据分析/i]];
const versionMap=t=>Object.fromEntries((t.files||[]).map(f=>[f.id,f.version||1]));
const taskBy=(s,id)=>s.tasks?.find(t=>t.id===id);
const projectName=(s,id)=>s.projects?.find(p=>p.id===id)?.name||'个人工作';
function eligibleTask(t){return !['sample','schedule','duplicate','personal'].includes(t.origin)&&!t.personalNote&&!String(t.id).startsWith('sample-')&&!t.scheduleDraft&&!t.scheduleId&&!t.duplicateOf&&!t.copiedFrom&&!t.isDuplicate&&!t.scheduleRun&&!/副本|复制/.test(t.title||'')&&!/定时任务.*试运行/.test(t.prompt||'')}
function category(t){return categories.find(x=>x[2].test(t.prompt||t.title||''))}
function memoryText(text){const m=String(text||'').match(/(?:请(?:你)?(?:帮我)?)?(?:记住[：:,，\s]*|以后(?:请|都|要|希望)?[：:,，\s]*)([^\n]{3,300})/);return m?.[1]?.trim()||''}
function safeMemory(text){return !/(密码|密钥|token|api\s*key|secret|验证码|银行卡)/i.test(text)}
function validMemory(m,project){return m.scope==='global'||(m.scope==='project'&&m.projectId&&m.projectId===project)}
export function collectMemorySnapshot(state,projectId=''){
 if(!state.settings?.memory?.enabled)return [];
 return (state.settings.memory.items||[]).filter(m=>validMemory(m,projectId)).map(m=>({id:m.id,title:m.title,text:m.text,scope:m.scope,projectId:m.projectId||'',source:m.source||'',version:m.version||1}));
}
export function initPersonal(state){
 state.personal ||= {};const p=state.personal;
 for(const [k,v] of Object.entries({version:1,enabled:true,quietUntil:0,follows:[],suggestions:[],suppressedKeys:[],messages:[],draft:'',demoCounter:0}))if(p[k]===undefined)p[k]=clone(v);
 return p;
}
function addSuggestion(p,candidate,now){
 if(candidate.type==='resume'&&candidate.hiddenOnTask)return;
 if(p.suppressedKeys.includes(candidate.suppressionKey)||p.suggestions.some(s=>s.key===candidate.key&&s.state!=='expired'))return;
 p.sequence=(p.sequence||0)+1;p.suggestions.unshift({...candidate,id:`nudge-${digest(candidate.key)}-${p.sequence}`,state:'open',createdAt:now,snoozedUntil:0,hiddenOnTask:!!candidate.hiddenOnTask});
}
function candidateEvents(state,route){
 const p=state.personal,out=[];
 for(const t of state.tasks||[]){
  if(t.id.startsWith('sample-')&&!p.follows.some(f=>f.taskId===t.id))continue;
  const annotations=t.annotations||[],draft=String(t.draft||'').trim();
  if((t.status==='paused'||annotations.length||draft)&&t.status!=='running'){
   const fingerprint=digest(JSON.stringify([t.status,annotations.map(a=>[a.id,a.before,a.after]),draft]));
   out.push({type:'resume',key:`resume:${t.id}:${fingerprint}`,suppressionKey:`resume:${t.id}`,taskId:t.id,sourceIds:[t.id],title:annotations.length?`《${t.title}》还有 ${annotations.length} 条修改意见`:`《${t.title}》可以接着做`,text:annotations.length?'修改意见还在草稿里，成果尚未改变。我把原位置留好了。':t.status==='paused'?'这件任务停在中途。已经提交的内容和成果都还在，可以从这里接着推进。':'你留下了一段还没发送的补充。我把草稿留好了，要继续完善吗？',reason:annotations.length?`当前任务有 ${annotations.length} 条未发送批注。`:t.status==='paused'?'当前任务状态为“已暂停”。':'当前任务有未发送文字草稿。',prepared:annotations.length?annotations.map(a=>`${a.before||'选中元素'} → ${a.after||a.comment||'待修改'}`).slice(0,3):[draft||'原任务、已有成果和执行进度已保留。'],demo:!!t.personalDemo,hiddenOnTask:route===`chat/${t.id}`});
  }
  if(state.settings?.memory?.enabled){
   (t.messages||[]).forEach((m,index)=>{if(m.role!=='user')return;const text=memoryText(m.text);if(!text||!safeMemory(text))return;
    if((state.settings.memory.items||[]).some(x=>x.text===text&&validMemory(x,t.project)))return;
    out.push({type:'memory',key:`memory:${t.id}:${index}:${t.project||'global'}:${digest(m.text)}`,suppressionKey:`memory:${digest(text)}`,taskId:t.id,messageIndex:index,sourceIds:[t.id],title:'这条偏好，要帮你记下来吗？',text:`你刚才提到“${text}”。希望以后都这样，还是只用于当前项目？`,memoryText:text,reason:`来自《${t.title}》中你第 ${index+1} 条消息的原话。`,prepared:[m.text],projectId:t.project||'',demo:!!t.personalDemo});
   });
  }
 }
 for(const f of p.follows){const t=taskBy(state,f.taskId);if(!t||f.paused)continue;
  const changed=(t.files||[]).filter(file=>(file.version||1)>(f.versions[file.id]||0));if(!changed.length)continue;
  const versions=Object.fromEntries(changed.map(file=>[file.id,file.version||1]));
  const changes=(t.changes||[]).filter(c=>changed.some(file=>file.id===c.fileId)&&((c.toVersion||0)>(f.versions[c.fileId]||0)||c.undone&&(c.undoneVersion||0)>(f.versions[c.fileId]||0)));
  const prepared=changes.map(c=>c.undone?`已撤回：${c.after} → ${c.before}`:`${c.before} → ${c.after}`).slice(-5);
  if(!prepared.length)prepared.push(...changed.map(file=>`${file.name}：v${f.versions[file.id]||0} → v${file.version||1}`));
  out.push({type:'change',key:`change:${t.id}:${f.revision||0}:${digest(JSON.stringify(versions))}`,suppressionKey:`change:${t.id}`,taskId:t.id,fileId:changed[0].id,sourceIds:[t.id],versions,title:`你关注的《${t.title}》更新了`,text:`${changed.length} 份成果有了新版本。我整理了变化，方便你接着判断。`,reason:`你明确关注了这件任务；版本从关注时的记录发生变化。`,prepared,demo:!!t.personalDemo});
 }
 const groups=new Map();for(const t of state.tasks||[]){if(!eligibleTask(t))continue;const c=category(t);if(!c)continue;const key=`${t.personalDemo?'demo:':'real:'}${t.project||'global'}:${c[0]}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(t)}
 for(const [group,ts] of groups){if(ts.length<2)continue;const [kind,label]=category(ts[0]);const sourceIds=ts.map(t=>t.id);
  out.push({type:'routine',key:`routine:${group}`,suppressionKey:`routine:${group}`,taskId:ts[0].id,sourceIds,projectId:ts[0].project||'',category:kind,title:`这项${label}工作，可以提前替你准备`,text:`在“${projectName(state,ts[0].project)}”中，你发起了 ${ts.length} 次${label}任务。要不要先看看一个固定安排？`,reason:`依据下方 ${ts.length} 条本地会话的任务标题和明确关键词匹配；这是一条待你确认的建议。`,prepared:ts.slice(0,4).map(t=>t.title),demo:!!ts[0].personalDemo});
 }
 return out;
}
export function reconcilePersonal(state,{now=Date.now(),route='home'}={}){
 const p=initPersonal(state),before=JSON.stringify(p);
 p.follows=p.follows.filter(f=>taskBy(state,f.taskId));
 const candidates=candidateEvents(state,route),keys=new Set(candidates.map(c=>c.key));
 for(const s of p.suggestions){
  if(terminal.has(s.state))continue;
  // Rebuild source groups every time: scope, task type and current membership all determine validity.
  const valid=keys.has(s.key);
  if(!valid){s.state='expired';s.resolvedAt=now;continue;}
  const candidate=candidates.find(c=>c.key===s.key);if(candidate)Object.assign(s,candidate,{hiddenOnTask:!!candidate.hiddenOnTask});
  if(s.state==='snoozed'&&s.snoozedUntil<=now){s.state='open';s.snoozedUntil=0;}
 }
 if(p.enabled&&p.quietUntil<=now)for(const candidate of candidates)addSuggestion(p,candidate,now);
 return JSON.stringify(p)!==before;
}
function visible(p){return p.enabled&&p.quietUntil<=Date.now()?p.suggestions.filter(s=>s.state==='open'&&!s.hiddenOnTask):[]}
const esc=(c,v)=>c.esc(String(v??''));
const B=(c,label,action,id='',extra='')=>`<button type="button" class="per-button" data-action="per:${action}"${id?` data-id="${esc(c,id)}"`:''} ${extra}>${label}</button>`;
function avatar(){return '<span class="per-avatar" aria-hidden="true">🐬</span>'}
export function renderPersonalDock(c){const p=initPersonal(c.state),n=visible(p).length;return `<button class="per-dock ${c.ui.personalOpen?'is-open':''}" data-action="per:open" aria-expanded="${!!c.ui.personalOpen}" aria-label="打开小悠主动协助">${avatar()}<span><strong>小悠</strong><small>${!p.enabled?'主动协助已暂停':n?`${n} 件事值得看看`:'有事一起想，进展一起跟'}</small></span>${n?`<b class="per-count">${n}</b>`:c.icon('chevron',15)}</button>`}
export function renderPersonalHome(c){const p=initPersonal(c.state),s=visible(p)[0];if(!s)return `<div class="per-home per-home-invite">${avatar()}<span>${p.enabled?'我会帮你接住未完的事。也可以告诉我，什么值得持续关注。':'主动协助已暂停，已交办的任务继续运行。'}</span>${B(c,p.enabled?'认识小悠':'管理','open')}</div>`;return `<div class="per-home">${avatar()}<span><small>${s.demo?'合成体验 · ':''}${types[s.type]}</small><strong>${esc(c,s.title)}</strong></span>${B(c,'一起看看','open',s.id)}</div>`}
function sourceList(c,s){return (s.sourceIds||[]).map(id=>{const t=taskBy(c.state,id);return t?B(c,`${c.icon('chat',14)} ${esc(c,t.title)}`,'source',id):''}).join('')}
function card(c,s){const p=c.state.personal;return `<article class="per-card ${s.type}" data-per-suggestion="${esc(c,s.id)}"><div class="per-card-kicker"><span>${s.demo?'合成体验 · ':''}${types[s.type]}</span><span>${new Date(s.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</span></div><h3>${esc(c,s.title)}</h3><p>${esc(c,s.text)}</p>${s.prepared?.length?`<div class="per-prepared"><strong>${s.type==='memory'?'你说过':s.type==='routine'?'相关任务':'已经整理好'}</strong>${s.prepared.map(t=>`<p>${esc(c,t)}</p>`).join('')}</div>`:''}<div class="per-card-actions">${s.type==='resume'?B(c,'回到原任务','source',s.taskId):s.type==='change'?B(c,'查看变化','changes',s.id)+B(c,'确认看过','ack',s.id):s.type==='routine'?B(c,'先看安排','routine',s.id):B(c,'所有工作','memory-global',s.id)+(s.projectId?B(c,'仅这个项目','memory-project',s.id):'')+B(c,'只改这次','dismiss',s.id)}</div><details class="per-reason"><summary>为什么想到这件事</summary><p>${esc(c,s.reason)}</p><div class="per-source-list">${sourceList(c,s)}</div></details><div class="per-card-foot">${B(c,'稍后 1 小时','snooze',s.id)}${s.type==='memory'?'':B(c,'这次不用','dismiss',s.id)}${B(c,'不再推荐这类','suppress',s.id)}</div></article>`}
function followCard(c,f){const t=taskBy(c.state,f.taskId);if(!t)return '';return `<div class="per-follow"><div><strong>${esc(c,t.title)}</strong><span>${t.personalDemo?'合成体验 · ':''}${f.paused?'关注已暂停':'关注本地成果版本'}</span></div>${B(c,f.paused?'恢复':'暂停','follow-toggle',f.taskId)}${B(c,'移除','unfollow',f.taskId)}</div>`}
function welcome(c){return `<div class="per-welcome">${avatar()}<h3>从“帮我做”，到“一起推进”</h3><p>我可以接回你没做完的事，关注成果变化，也会问清楚哪些习惯值得记住。</p><p>先在任一任务菜单选择“交给小悠跟进”，或者体验下面四种主动发现。</p>${B(c,'体验主动发现','demo-menu')}</div>`}
export function renderPersonalPanel(c){if(!c.ui.personalOpen)return '';const p=initPersonal(c.state),items=visible(p),snoozed=p.suggestions.filter(s=>s.state==='snoozed'),tab=c.ui.personalTab||'today';return `<aside class="per-panel" aria-label="小悠主动协助"><header class="per-panel-header">${avatar()}<div><strong>小悠在这里</strong><span>${p.enabled?'关注你交办的事，也记得你的偏好':'主动协助已暂停'}</span></div>${B(c,c.icon('close',19),'close','','aria-label="关闭小悠侧栏"')}</header><div class="per-tabs">${[['today','一起推进'],['following','正在关注'],['history','已处理']].map(([id,label])=>`<button data-action="per:tab" data-id="${id}" class="${tab===id?'active':''}">${label}</button>`).join('')}</div><div class="per-panel-scroll">${!p.enabled?`<div class="per-paused"><strong>主动协助已暂停</strong><p>已有任务照常推进。恢复后，按当前状态重新检查值得提醒的事。</p>${B(c,'恢复主动协助','toggle')}</div>`:''}${tab==='following'?`<div class="per-section-intro"><h3>关注有边界，变化有依据</h3><p>只跟踪你主动选中的本地任务和成果，不访问飞书、邮箱或日历。</p></div>${p.follows.length?p.follows.map(f=>followCard(c,f)).join(''):'<p class="per-empty">还没有持续关注的任务。</p>'}${B(c,'选择一件任务','choose-follow')}`:tab==='history'?`<div class="per-section-intro"><h3>你的决定，我会记得</h3><p>同一条建议处理后不会再出现。已解决的事项也会自动收起。</p></div>${p.suggestions.filter(s=>terminal.has(s.state)).slice(0,15).map(s=>`<article class="per-history"><strong>${esc(c,s.title)}</strong><span>${{acted:'已处理',dismissed:'已略过',expired:'原事项已变化或解决'}[s.state]}</span>${s.outcome?`<p>${esc(c,s.outcome)}</p>`:''}${s.actionTaskId&&taskBy(c.state,s.actionTaskId)?B(c,'查看后续','source',s.actionTaskId):''}</article>`).join('')||'<p class="per-empty">还没有已处理事项。</p>'}${p.suppressedKeys.length?B(c,`恢复 ${p.suppressedKeys.length} 类已关闭建议`,'restore-suppressed'):''}`:items.length?items.slice(0,6).map(s=>card(c,s)).join(''):welcome(c)}${tab==='today'&&snoozed.length?`<details class="per-snoozed"><summary>稍后再聊 · ${snoozed.length} 件事</summary>${snoozed.map(s=>`<div><strong>${esc(c,s.title)}</strong><p>${new Date(s.snoozedUntil).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 后在应用内重新出现</p>${B(c,'现在看看','unsnooze',s.id)}</div>`).join('')}</details>`:''}${tab==='today'&&p.messages.length?`<div class="per-dialogue">${p.messages.slice(-8).map(m=>`<div class="per-message ${m.role}">${esc(c,m.text)}</div>`).join('')}</div>`:''}</div><footer class="per-panel-footer"><form data-form="per:message"><label class="per-composer"><textarea data-live="per:draft" name="message" rows="2" maxlength="500" placeholder="例如：记住，汇报先给结论" aria-label="和小悠说句话">${esc(c,p.draft)}</textarea><button type="submit" aria-label="发送给小悠">${c.icon('send',18)}</button></label></form><div class="per-footer-meta"><span>本地规则演示 · 非模型对话</span>${B(c,p.enabled?'暂停主动协助':'恢复主动协助','toggle')}</div><div class="per-footer-links">${B(c,'体验主动发现','demo-menu')}${B(c,'管理记忆','memories')}</div></footer></aside>`}
function commit(c){reconcilePersonal(c.state,{route:c.ui.route});c.save();c.render()}
function suggest(c,id){return c.state.personal.suggestions.find(s=>s.id===id)}
function activeSuggestion(c,id){reconcilePersonal(c.state,{route:c.ui.route});const s=suggest(c,id);if(!s||terminal.has(s.state)){c.toast('这件事已处理或状态有了变化');commit(c);return null;}return s}
function mark(s,outcome,actionTaskId){s.state='acted';s.resolvedAt=Date.now();s.outcome=outcome;if(actionTaskId)s.actionTaskId=actionTaskId}
function ensureOpen(c){if(c.ui.route==='home'){c.ui.sidebarOpen=false;c.ui.landingMenu=false;c.ui.landingCompose=false;}c.ui.personalOpen=true;c.ui.personalTab='today'}
function resolveCurrentProject(c){const id=c.currentTask()?.project||(c.ui.route.startsWith('project/')?c.ui.route.slice(8):c.ui.route==='home'?c.state.composer?.project:'');return c.state.projects.some(p=>p.id===id)?id:''}
function follow(c,id){const p=c.state.personal,t=taskBy(c.state,id);if(!t){c.toast('原任务已不存在');return;}const old=p.follows.find(f=>f.taskId===id);if(old){if(old.paused)old.revision=(old.revision||0)+1;old.paused=false;}else p.follows.push({taskId:id,versions:versionMap(t),createdAt:Date.now(),paused:false});ensureOpen(c);c.ui.personalTab='following';c.toast('小悠会关注这件任务的本地成果变化');commit(c)}
function showMemory(c,s,scope){c.modal('确认小悠记住的内容',`<form data-form="per:memory"><input type="hidden" name="id" value="${esc(c,s.id)}"><input type="hidden" name="scope" value="${scope}"><label class="field">以后怎样与你协作<textarea name="text" required maxlength="1000" rows="4">${esc(c,s.memoryText)}</textarea></label><p class="per-modal-note">适用范围：${scope==='project'?esc(c,projectName(c.state,s.projectId)):'所有工作'}。保存后，新任务可查看实际采用的记忆。</p><p class="per-modal-note">来源：${esc(c,taskBy(c.state,s.taskId)?.title||'小悠对话')}</p><div class="form-actions"><button type="button" class="btn" data-action="app:close-modal">取消</button><button class="btn primary">确认记住</button></div></form>`)}
function routineDraft(c,s){const t=taskBy(c.state,s.taskId),d=new Date(Date.now()+86400000);return {name:`${projectName(c.state,s.projectId)} · ${categories.find(x=>x[0]===s.category)?.[1]||'工作准备'}`,prompt:t?.prompt||'根据已提供资料整理工作进展，保留来源与待确认项。',type:'periodic',frequency:s.category==='weekly'?'weekly':'daily',weekday:'5',monthDay:'1',time:'17:00',onceDate:new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16),permission:'approve',model:t?.model||c.state.composer?.model||'Claude Opus 5.5',notify:'always',context:'continue',enabled:true,history:[],parseNote:'小悠根据本地任务提出的安排草稿。时间与频率为建议，请核对并确认保存；当前原型不会在后台运行。'}}
function demoMenu(c){c.modal('体验小悠如何主动发现',`<div class="per-demo-intro"><p>以下操作会创建明确标记的合成任务。随后由同一套状态规则识别变化，不预置“你过去做过”的假历史。</p></div><div class="per-demo-grid">${[['resume','接住中断的任务','创建一件暂停任务，带一条未提交批注。'],['change','关注成果变化','建立关注，再产生一次本地版本更新。'],['routine','发现重复工作','创建两件清楚标记的合成周报任务。'],['memory','记住明确偏好','加入一句“记住，汇报先给结论”的示例原话。']].map(([id,title,desc])=>`<button data-action="per:demo" data-id="${id}"><strong>${title}</strong><span>${desc}</span></button>`).join('')}</div>`)}
function demoTask(c,prompt,kind='office'){const t=newTask(prompt,{project:c.state.projects[0]?.id||''});t.personalDemo=true;t.origin='demo';t.title='[体验] '+prompt;t.status='complete';t.progress=4;initTaskFiles(t,kind);c.state.tasks.unshift(t);return t}
function runDemo(c,kind){const p=c.state.personal;p.demoCounter++;p.enabled=true;p.quietUntil=0;c.closeModal();ensureOpen(c);const n=p.demoCounter;
 if(kind==='resume'){const t=demoTask(c,`待确认的复盘材料 ${n}`);const f=t.files[0];t.status='paused';t.progress=2;t.annotations.push({id:uid('annotation'),fileId:f.id,fileName:f.name,target:'slides.0.title',before:f.content.slides[0].title,after:'让每一项进展，都有清楚的下一步',comment:'调整为更具体的汇报标题',sourceVersion:f.version,status:'draft'});}
 else if(kind==='change'){const t=demoTask(c,`持续关注的项目汇报 ${n}`);p.follows.push({taskId:t.id,versions:versionMap(t),createdAt:Date.now(),paused:false});const f=t.files[0],before=f.content.slides[1].title;f.content.slides[1].title='本周进展与下一步行动';f.version++;t.changes.push({id:uid('change'),fileId:f.id,fileName:f.name,target:'slides.1.title',before,after:f.content.slides[1].title,fromVersion:1,toVersion:2,at:new Date().toISOString(),undone:false});}
 else if(kind==='routine'){demoTask(c,`周报整理演示 ${n} · 第一份`);demoTask(c,`周报整理演示 ${n} · 第二份`);const group=`routine:demo:${c.state.projects[0]?.id||'global'}:weekly`;p.suppressedKeys=p.suppressedKeys.filter(k=>k!==group);p.suggestions=p.suggestions.filter(s=>s.suppressionKey!==group);}
 else {const t=demoTask(c,`工作偏好演示 ${n}`);t.messages.push({role:'user',text:'记住，汇报先给结论，再列依据和待确认事项。',time:Date.now()});}
 commit(c);c.toast('已创建合成体验，建议来自刚刚发生的本地状态变化');
}
export function handlePersonal(action,el,c){if(!action.startsWith('per:'))return false;const p=initPersonal(c.state),a=action.slice(4),id=el?.dataset?.id;
 if(a==='open'){ensureOpen(c);c.render();}
 else if(a==='close'){c.ui.personalOpen=false;c.render();}
 else if(a==='tab'){c.ui.personalTab=id;c.render();}
 else if(a==='toggle'){p.enabled=!p.enabled;commit(c);}
 else if(a==='follow')follow(c,id);
 else if(a==='follow-toggle'){const f=p.follows.find(x=>x.taskId===id);if(f){f.paused=!f.paused;if(!f.paused)f.revision=(f.revision||0)+1;commit(c);}}
 else if(a==='unfollow'){p.follows=p.follows.filter(x=>x.taskId!==id);commit(c);}
 else if(a==='choose-follow')c.modal('选择一件小悠持续关注的事',`<div class="per-task-picker">${c.state.tasks.map(t=>B(c,esc(c,t.title),'pick-follow',t.id)).join('')}</div><p class="per-modal-note">只关注任务内成果版本，不读取外部消息或磁盘文件。</p>`);
 else if(a==='pick-follow'){c.closeModal();follow(c,id);}
 else if(a==='source'){if(taskBy(c.state,id)){c.ui.personalOpen=false;c.go('chat/'+id);}else c.toast('原任务已不存在');}
 else if(a==='changes'){const s=activeSuggestion(c,id);if(s){const t=taskBy(c.state,s.taskId),f=t?.files.find(x=>x.id===s.fileId);if(f){t.viewer.open=true;t.viewer.active=f.id;if(!t.viewer.tabs.includes(f.id))t.viewer.tabs.push(f.id);const changes=(t.changes||[]).filter(x=>x.fileId===f.id);const last=changes[changes.length-1];if(f.type==='ppt'&&last?.target){const m=last.target.match(/^slides\.(\d+)/);if(m)f.view.page=+m[1];}c.ui.personalOpen=false;c.save();c.go('chat/'+t.id,()=>c.modal('关注成果的变化',`<div class="per-prepared"><strong>${esc(c,f.name)} · v${f.version}</strong>${s.prepared.map(text=>`<p>${esc(c,text)}</p>`).join('')}</div><div class="form-actions">${B(c,'确认看过','ack',s.id)}<button class="btn" data-action="app:close-modal">继续查看成果</button></div>`));}}}
 else if(a==='ack'){const s=activeSuggestion(c,id);if(s){const f=p.follows.find(x=>x.taskId===s.taskId),t=taskBy(c.state,s.taskId);if(f&&t)f.versions=versionMap(t);mark(s,'已确认这次成果变化');c.closeModal();commit(c);}}
 else if(a==='snooze'){const s=activeSuggestion(c,id);if(s){s.state='snoozed';s.snoozedUntil=Date.now()+3600000;commit(c);}}
 else if(a==='unsnooze'){const s=activeSuggestion(c,id);if(s){s.state='open';s.snoozedUntil=0;commit(c);}}
 else if(a==='dismiss'||a==='suppress'){const s=activeSuggestion(c,id);if(s){s.state='dismissed';s.resolvedAt=Date.now();s.outcome=a==='suppress'?'不再推荐同一工作范围的这类建议':s.type==='memory'?'仅用于当前任务，没有写入长期记忆':'这次不用';if(a==='suppress'&&!p.suppressedKeys.includes(s.suppressionKey))p.suppressedKeys.push(s.suppressionKey);commit(c);}}
 else if(a==='restore-suppressed'){p.suppressedKeys=[];for(const s of p.suggestions)if(s.state==='dismissed'&&s.outcome==='不再推荐同一工作范围的这类建议'){s.key+=':restored:'+Date.now();s.state='expired';}commit(c);}
 else if(a==='memory-global'||a==='memory-project'){const s=activeSuggestion(c,id);if(s){if(a==='memory-project'&&!c.state.projects.some(p=>p.id===s.projectId)){c.toast('原项目已不存在，请选择所有工作或只用于这次');return true;}showMemory(c,s,a==='memory-project'?'project':'global');}}
 else if(a==='routine'){const s=activeSuggestion(c,id);if(s){const d=routineDraft(c,s);const taskId=c.startTask(`为这项重复工作准备安排草稿：${d.name}\n${d.prompt}`,{project:s.projectId,scheduleDraft:d});mark(s,'已生成待确认安排，尚未保存定时计划',taskId);c.ui.personalOpen=false;commit(c);}}
 else if(a==='memories'){c.ui.personalOpen=false;c.go('settings/memory');}
 else if(a==='demo-menu')demoMenu(c);
 else if(a==='demo')runDemo(c,id);
 else return false;
 return true;
}
export function submitPersonal(name,form,c){if(!name.startsWith('per:'))return false;const p=initPersonal(c.state),v=Object.fromEntries(new FormData(form));
 if(name==='per:memory'){const s=activeSuggestion(c,v.id);const text=String(v.text||'').trim();if(!s)return true;if(!text){c.toast('先写下希望小悠记住的内容');return true;}if(!safeMemory(text)){c.toast('这条内容可能含敏感凭据，请只保存工作偏好');return true;}if(!c.state.settings.memory.enabled){c.toast('记忆已关闭，请先在设置中开启');return true;}if(v.scope==='project'&&(!s.projectId||!c.state.projects.some(p=>p.id===s.projectId))){c.toast('原项目不存在，请选择全局范围');return true;}
  const item={id:uid('memory'),title:text.slice(0,40),text,scope:v.scope==='project'?'project':'global',projectId:v.scope==='project'?s.projectId:'',source:`你在《${taskBy(c.state,s.taskId)?.title||'小悠对话'}》中确认保存${s.demo?' · 合成体验':''}`,sourceTaskId:s.taskId,sourceMessageIndex:s.messageIndex,version:1,createdAt:Date.now()};c.state.settings.memory.items.push(item);mark(s,`已保存为${item.scope==='project'?'项目':'全局'}记忆；新任务可查看采用记录`);c.closeModal();commit(c);c.toast('记住了。你可以在设置中修改或删除');return true;
 }
 if(name==='per:message'){const text=String(v.message||'').trim();if(!text)return true;p.draft='';p.messages.push({role:'user',text,time:Date.now()});let reply='';
  if(/^(暂停|先别|不要打扰|暂停主动协助)/.test(text)){p.enabled=false;reply='主动协助已暂停，已经交办的任务会继续。你可以随时恢复。';}
  else if(/^(恢复|继续主动|开启主动)/.test(text)){p.enabled=true;reply='已恢复主动协助。我会根据当前任务状态重新检查值得提醒的事。';}
  else if(/(关注|盯着)/.test(text)){const t=c.currentTask()||c.state.tasks.find(t=>text.includes(t.title));if(t){follow(c,t.id);reply=`已关注《${t.title}》。成果有新版本时，我会把变化整理给你看。`;}else{reply='你可以在“正在关注”中选一件任务。关注范围只包含该任务的本地成果。';c.ui.personalTab='following';}}
  else if(memoryText(text)&&safeMemory(text)&&!c.state.settings.memory.enabled){reply='记忆当前已关闭，因此没有生成记忆候选，也没有保存这条偏好。你可以先在设置中开启记忆。';}
  else if(memoryText(text)&&safeMemory(text)){const t={id:uid('personal-note'),title:'与小悠的工作约定',prompt:text,createdAt:Date.now(),status:'complete',progress:4,elapsed:0,kind:'dashboard',project:resolveCurrentProject(c),messages:[{role:'user',text,time:Date.now()}],files:[],annotations:[],changes:[],versions:[],viewer:{open:false,active:'',tabs:[],max:false},draft:'',model:c.state.composer?.model||'自动',permission:'请求批准',mode:'普通模式',context:[],personalNote:true,origin:'personal'};c.state.tasks.unshift(t);reply='我整理成了一条待确认的偏好。请在上方选择作用范围，确认后才会写入记忆。';}
  else if(/(稍后|一小时后)/.test(text)){const s=visible(p)[0];if(s){s.state='snoozed';s.snoozedUntil=Date.now()+3600000;reply='已把第一件待办暂缓 1 小时。到时在打开的应用内重新显示。';}else reply='现在没有待暂缓的主动建议。';}
  else if(/(记忆|了解我|记得什么)/.test(text)){const ms=collectMemorySnapshot(c.state,resolveCurrentProject(c));reply=ms.length?'当前可用于这项工作的偏好：'+ms.map(x=>x.title).join('；')+'。你可以到设置中修改或删除。':'当前没有可用于这项工作的记忆。可以说“记住，……”并确认保存。';}
  else reply='这个原型能响应“记住，……”“关注当前任务”“稍后提醒”“暂停主动协助”。复杂工作请交给主对话；这里不会假装调用模型回答。';
  p.messages.push({role:'assistant',text:reply,time:Date.now()});commit(c);return true;
 }
 return false;
}
export function inputPersonal(el,c){if(el.dataset.live!=='per:draft')return false;initPersonal(c.state).draft=el.value;c.save();return true}
