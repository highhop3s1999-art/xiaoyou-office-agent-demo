import {esc as E,icon} from './core.js';

export function todoStore(state){return state.feishuTodos||=( {mode:'disconnected',items:[],links:{},syncedAt:null} );}
export function normalizeTodos(payload){
 const rows=Array.isArray(payload)?payload:payload?.data?.items||payload?.data?.tasks||payload?.items||payload?.tasks;
 if(!Array.isArray(rows))throw Error('请选择含 items 或 tasks 数组的飞书待办 JSON 文件');
 const seen=new Set();return rows.map(r=>{
  const id=String(r.guid||r.id||'').trim(),title=String(r.summary||r.title||'').trim();
  if(!id||!title||seen.has(id))throw Error('待办缺少唯一 ID、标题，或存在重复记录');seen.add(id);
  const raw=r.due?.timestamp||r.dueAt||null,n=Number(raw),dueAt=raw?(Number.isFinite(n)?(n<1e11?n*1000:n):Date.parse(raw)):null;
  return {id,title,description:String(r.description||''),dueAt:Number.isFinite(dueAt)?dueAt:null,completed:r.completed===true||Number(r.completed_at)>0,source:'飞书待办'};
 });
}
export function replaceTodos(state,payload,mode){const items=normalizeTodos(payload),s=todoStore(state);s.items=items;s.mode=mode;s.syncedAt=Date.now();return s;}
const demo=[{id:'sample-review',title:'完成酒店体验改版评审材料',description:'整理用户反馈与改版方案，列出需要评审的关键问题和待确认事项。',dueAt:Date.now()+86400000},{id:'sample-weekly',title:'整理本周经营复盘',description:'汇总本周经营变化，检查数据口径，整理异常原因与后续行动。',dueAt:Date.now()+172800000},{id:'sample-meeting',title:'同步项目周会纪要',description:'汇总会议结论，明确负责人、截止时间与依赖。',completed:true}];
const button=(label,action,attrs='',kind='')=>`<button type="button" class="tm-button ${kind}" data-action="ft:${action}" ${attrs}>${label}</button>`;
function key(s,id){return `${s.mode==='demo'?'demo':'feishu'}:${id}`;}
function linked(c,item){const s=todoStore(c.state);return c.state.tasks.find(t=>t.id===s.links[key(s,item.id)]);}
export function renderFeishuTodos(c){
 const s=todoStore(c.state),filter=c.ui.ftFilter||'pending',q=(c.ui.tmQuery||'').toLowerCase(),items=s.items.filter(i=>(i.title+' '+i.description).toLowerCase().includes(q)&&(filter==='all'||filter==='completed'&&i.completed||filter==='pending'&&!i.completed||filter==='delegated'&&linked(c,i)));
 return `<section class="ft-page"><div class="ft-toolbar"><div><strong>我的飞书待办</strong><span class="ft-source">${({disconnected:'未连接',demo:'示例数据',imported:'导入快照',connected:'已连接'})[s.mode]}</span>${s.syncedAt?`<small>${s.mode==='connected'?'同步':'载入'}于 ${new Date(s.syncedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</small>`:''}</div><div>${s.mode==='connected'?button(icon('refresh',15)+'同步','sync',c.ui.ftLoading?'disabled':''):''}${button(icon('link',15)+(s.mode==='disconnected'?'连接飞书':'数据来源'),'connect')}</div></div>${s.mode==='disconnected'?`<div class="ft-empty"><span class="ft-empty-icon">${icon('checkCircle',28)}</span><h2>让待办成为工作的起点</h2><p>查看分配给你的飞书待办，确认目标后交给小悠。<br>小悠生成的任务会保留待办来源，方便回来继续跟进。</p><div>${button('连接飞书','connect','','primary')}${button('查看示例','demo')}</div></div>`:`<div class="ft-filters">${[['pending','未完成'],['delegated','已交给小悠'],['completed','已完成'],['all','全部']].map(([id,label])=>button(label,'filter',`data-id="${id}" aria-pressed="${filter===id}"`,filter===id?'selected':'')).join('')}</div><div class="ft-list">${items.map(i=>{const t=linked(c,i);return `<article class="ft-row"><span class="ft-status-icon">${icon(i.completed?'checkCircle':'clock',20)}</span><button class="ft-title" data-action="ft:detail" data-id="${E(i.id)}"><strong>${E(i.title)}</strong><small>${i.dueAt?new Date(i.dueAt).toLocaleDateString('zh-CN')+' 截止':'未设置截止时间'} · ${i.completed?'已完成':t?'已交给小悠':'待处理'}</small></button>${button(t?'查看任务':i.completed?'查看详情':'交给小悠',t?'open':'detail',`data-id="${E(i.id)}"`,t?'':'secondary')}</article>`;}).join('')||'<div class="tm-empty">没有符合条件的待办</div>'}</div><p class="ft-note">${icon('info',14)}${s.mode==='demo'?'当前展示示例待办。':s.mode==='imported'?'当前是导入快照，不会自动同步飞书变更。':''}交给小悠后先确认任务计划；不会自动将飞书待办标为完成。</p>`}</section>`;
}
function connect(c){c.modal('连接飞书待办',`<div class="ft-connect"><p>连接后可读取分配给你的待办，选择一项交给小悠处理。</p><p class="muted">此单文件 HTML 尚未接入飞书授权服务。可以先查看示例，或导入飞书待办 JSON 快照体验完整流程。</p><div class="ft-connect-actions">${button('尝试同步已接入的服务','sync','','primary')}${button('查看示例','demo')}<label class="tm-button">${icon('upload',15)}导入待办 JSON<input type="file" accept=".json,application/json" data-live="ft:import" hidden></label></div><small>仅保存到当前浏览器；导入和查看待办不会发送消息或更改飞书数据。</small></div>`);}
function detail(c,i){const s=todoStore(c.state),t=linked(c,i);c.modal('飞书待办',`<form data-form="ft:delegate"><input type="hidden" name="id" value="${E(i.id)}"><input type="hidden" name="source" value="${E(s.mode)}"><h3>${E(i.title)}</h3><p class="ft-detail-description">${E(i.description||'暂无补充说明')}</p><p class="muted">${i.completed?'已完成':'未完成'}${i.dueAt?' · 截止 '+new Date(i.dueAt).toLocaleDateString('zh-CN'):''}${s.mode==='demo'?' · 示例数据':''}</p>${!t&&!i.completed?'<label class="ft-instruction">希望小悠怎么帮你？<textarea name="instruction" rows="3" placeholder="例如：先核对资料，整理成可评审的初稿，并列出需要我补充的信息。"></textarea></label>':''}<div class="ft-detail-actions">${t?button('查看已有任务','open',`data-id="${E(i.id)}"`,'primary'):i.completed?'<span class="muted">这项待办已完成</span>':'<button class="tm-button primary" type="submit">交给小悠</button>'}</div></form>`);}
export function delegateTodo(c,id,instruction='',source){
 const s=todoStore(c.state),i=s.items.find(i=>i.id===id);if(!i||i.completed||source&&source!==s.mode)return null;
 const existing=linked(c,i);if(existing)return existing.id;
 const prompt=`帮我处理这项飞书待办：${i.title}。\n${i.description}${instruction.trim()?'\n我的要求：'+instruction.trim():''}\n先梳理目标、所需资料与执行计划，缺少的信息请明确列出。`;
 const taskId=c.startTask(prompt,{agentId:'personal',context:[{name:'飞书待办 · '+i.title,type:'text',text:i.description}],officeScenario:'research'});
 if(!taskId)return null;const t=c.state.tasks.find(t=>t.id===taskId);if(!t)return null;
 t.title=i.title;t.feishuTodoOrigin={...structuredClone(i),mode:s.mode,snapshotAt:s.syncedAt};s.links[key(s,id)]=taskId;c.save();return taskId;
}
export function handleFeishuTodos(action,el,c){
 if(!action.startsWith('ft:'))return false;const a=action.slice(3),s=todoStore(c.state),i=s.items.find(i=>i.id===el.dataset.id);
 if(a==='connect')connect(c);
 else if(a==='demo'){c.ui.ftRequest=(c.ui.ftRequest||0)+1;c.ui.ftLoading=false;replaceTodos(c.state,demo,'demo');c.ui.ftFilter='pending';c.save();c.closeModal();c.render();}
 else if(a==='filter'){c.ui.ftFilter=el.dataset.id;c.render();}
 else if(a==='detail'&&i)detail(c,i);
 else if(a==='open'&&i){const t=linked(c,i);if(t){c.closeModal();c.go('chat/'+t.id);}else detail(c,i);}
 else if(a==='sync'){
  const service=globalThis.xiaoyouIntegrations?.feishuTasks;
  if(!service?.list){c.toast('尚未接入飞书服务，可先导入快照或查看示例');return true;}
  if(c.ui.ftLoading)return true;c.ui.ftLoading=true;const request=c.ui.ftRequest=(c.ui.ftRequest||0)+1;c.render();
  Promise.resolve().then(()=>service.list({assignedTo:'me'})).then(data=>{if(c.ui.ftRequest!==request)return;replaceTodos(c.state,data,'connected');c.save();c.closeModal();c.toast('飞书待办已同步');}).catch(()=>{if(c.ui.ftRequest===request)c.toast('同步失败，已保留上一次的待办');}).finally(()=>{if(c.ui.ftRequest===request){c.ui.ftLoading=false;c.render();}});
 }
 return true;
}
export function submitFeishuTodos(name,form,c){if(name!=='ft:delegate')return false;const v=Object.fromEntries(new FormData(form)),id=delegateTodo(c,v.id,v.instruction||'',v.source);if(!id){c.toast('待办状态已变化，请重新打开');return true;}c.closeModal();c.go('chat/'+id);return true;}
export function inputFeishuTodos(el,c){if(el.dataset.live!=='ft:import')return false;const file=el.files?.[0];if(!file)return true;if(file.size>2e6){c.toast('请选择小于 2 MB 的 JSON 文件');return true;}const request=c.ui.ftRequest=(c.ui.ftRequest||0)+1;c.ui.ftLoading=false;file.text().then(text=>{if(c.ui.ftRequest!==request)return;replaceTodos(c.state,JSON.parse(text),'imported');c.ui.ftFilter='pending';c.save();c.closeModal();c.render();c.toast('待办快照已导入');}).catch(e=>{if(c.ui.ftRequest===request)c.toast(e instanceof SyntaxError?'JSON 格式不正确':e.message);});return true;}
