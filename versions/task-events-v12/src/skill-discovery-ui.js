import {esc as E,icon} from './core.js?v=20261026-12.0';
import {agentThread,addAgentMessage,focusAgentTask} from './agent-conversations.js?v=20261026-12.0';
import {DISCOVERY_SKILLS,discoverySkill,initSkillDiscovery,installedSkill,installDiscoverySkill,dismissSkillOffer,recordSkillDetail,distillationCandidate,distillationSpec,saveDistilledSkill} from './skill-discovery-model.js?v=20261026-12.0';

const heat=s=>s.calls?`共调用 ${s.calls.toLocaleString('zh-CN')} 次`:'本周新上架';
const B=(label,action,attrs='',kind='')=>`<button type="button" class="sr-button ${kind}" data-action="skillrec:${action}" ${attrs}>${label}</button>`;
const symbol=s=>`<span class="sr-symbol ${s.tone}">${icon(s.icon,18)}</span>`;
const attrs=(agentId='personal',taskId='',moment='entry')=>`data-agent="${E(agentId)}" data-task="${E(taskId)}" data-moment="${moment}"`;

export function renderSkillEntry(c,{agentId='personal',compact=false}={}){
  const items=DISCOVERY_SKILLS.filter(s=>!installedSkill(c.state,s.id)).slice(0,3);if(!items.length)return '';
  return `<section class="sr-entry ${compact?'compact':''}" aria-label="推荐工作方法"><header><h3>试试这些工作方法</h3><button data-action="app:go" data-route="skills">全部技能 ${icon('chevron',11)}</button></header><div class="sr-entry-grid">${items.map(s=>`<button class="sr-entry-card" data-action="skillrec:detail" data-id="${s.id}" ${attrs(agentId)}>${symbol(s)}<span><strong>${E(s.name)}</strong><small>${heat(s)}</small></span>${icon('chevron',12)}</button>`).join('')}</div><small class="sr-sample-note">调用量为示例数据</small></section>`;
}

export function renderConversationSkillOffer(c,a,t){
  if(!t||agentThread(c.state,a.id).activeTaskId!==t.id||!['plan','running','paused','blocked'].includes(t.office.phase))return '';
  const offer=initSkillDiscovery(c.state).offers[t.id],s=offer&&discoverySkill(offer.skillId);
  if(!s||offer.status!=='pending'||installedSkill(c.state,s.id))return '';
  const detail=attrs(a.id,t.id,'in_conversation')+` data-id="${s.id}"`;
  if(offer.tier==='medium')return `<div class="sr-ambient" data-skill-offer="${t.id}">${icon('bolt',13)}${B('可用的工作方法：'+E(s.name),'detail',detail,'ambient')}</div>`;
  return `<aside class="sr-offer" aria-label="Skill 建议" data-skill-offer="${t.id}">${symbol(s)}<div class="sr-offer-copy"><div>${B(E(s.name),'detail',detail,'name')}<small>${heat(s)}</small></div><p>${E(offer.reason)}</p></div>${B('使用','use',detail,'use')}<button class="sr-dismiss" data-action="skillrec:dismiss" data-task="${t.id}" aria-label="忽略这次 Skill 建议" title="暂不需要">${icon('close',12)}</button></aside>`;
}

export function renderSkillDistillation(c,a,t){
  if(agentThread(c.state,a.id).activeTaskId!==t?.id)return '';const candidate=distillationCandidate(c.state,t);if(!candidate)return '';
  const saved=candidate.savedId&&c.state.catalog.skills.find(s=>s.id===candidate.savedId);
  if(saved)return `<div class="sr-saved-draft">${icon('checkCircle',14)}已保存为 Skill 草稿 ${B(E(saved.name),'draft-detail',`data-id="${saved.id}"`,'name')}<small>仅自己可见 · 待审核</small></div>`;
  return `<aside class="sr-distill" aria-label="保存工作方法"><span class="sr-symbol violet">${icon('bolt',18)}</span><div><strong>这套流程已完成 ${candidate.count} 次</strong><p>把确认过的口径、步骤和检查方法留给下次。</p></div>${B('保存为 Skill','distill',`data-task="${t.id}"`,'use')}</aside>`;
}

export function renderSkillLibrarySuggestions(c){
  const q=(c.ui.catalog?.queries?.skills||'').toLowerCase(),pool=DISCOVERY_SKILLS.filter(s=>!installedSkill(c.state,s.id)&&(s.name+s.description).toLowerCase().includes(q)),drafts=c.state.catalog.skills.filter(s=>s.reviewStatus==='pending'&&(s.name+s.description).toLowerCase().includes(q));
  return `${pool.length?`<section class="sr-library"><header><h3>猜你需要</h3><small>企业技能 · 调用量为示例</small></header><div>${pool.map(s=>`<article class="sr-library-row">${symbol(s)}<div>${B(E(s.name),'detail',`data-id="${s.id}" ${attrs('personal','','library')}`,'name')}<p>${E(s.description)}</p></div><small>${heat(s)}</small>${B('使用','use',`data-id="${s.id}" ${attrs('personal','','library')}`,'use')}</article>`).join('')}</div></section>`:''}${drafts.length?`<section class="sr-drafts"><header><h3>我创建的草稿</h3><small>审核通过后才进入团队推荐</small></header>${drafts.map(s=>`<button class="sr-draft-row" data-action="skillrec:draft-detail" data-id="${s.id}">${icon('file',17)}<span>${E(s.name)}</span><small>仅自己可见 · 待审核</small>${icon('chevron',12)}</button>`).join('')}</section>`:''}`;
}

function detail(c,id,source={}){
  const s=discoverySkill(id);if(!s)return;recordSkillDetail(c.state,id,source.moment||'entry');c.save();
  c.modal('工作方法',`<div class="sr-detail"><header>${symbol(s)}<div><h3>${E(s.name)}</h3><p>${E(s.publisher)} · 示例技能 · v1</p></div></header><div class="sr-detail-meta"><span>${heat(s)}</span><small>示例数据</small><span>${installedSkill(c.state,id)?'已添加':'未添加'}</span></div><p class="sr-detail-description">${E(s.description)}</p><section class="sr-effect"><div><strong>效果示例</strong><small>合成样例</small></div><p>输入：${E(s.inputs)}</p><article><h4>${E(s.output)}</h4>${s.example.map(p=>`<p>${E(p)}</p>`).join('')}</article></section><details class="sr-method"><summary>查看工作方法与边界</summary><p>${E(s.method).replaceAll('\n','<br>')}</p><small>访问飞书和业务资料遵循当前权限，发送与写回仍需按次确认。</small></details><footer><span>由你确认添加，后续按需使用</span>${B(installedSkill(c.state,id)?'在对话中使用':'使用','use',`data-id="${id}" ${attrs(source.agent||'personal',source.task||'',source.moment||'entry')}`,'primary')}</footer></div>`);
}

function distillForm(c,t){
  if(!distillationCandidate(c.state,t))return c.toast('同类工作完成至少三次后，可以沉淀方法');
  const values=distillationSpec(t);c.modal('保存为 Skill 草稿',`<form class="sr-distill-form" data-form="skillrec:distill"><input type="hidden" name="task" value="${t.id}"><p>从已完成工作中提取口径、步骤和交付检查，你可以先修改。</p><label class="field">名称<input name="name" required maxlength="60" value="${E(values.name)}"></label><label class="field">简介<input name="description" required value="${E(values.description)}"></label><label class="field">工作方法<textarea name="content" rows="8" required>${E(values.content)}</textarea></label><div class="sr-draft-boundary">${icon('lock',15)}仅自己可见，待审核；不会自动发布或进入团队推荐。</div><div class="form-actions"><button type="button" class="btn" data-action="app:close-modal">取消</button><button class="btn primary">保存草稿</button></div></form>`,{wide:true});
}

function use(c,id,data){
  const result=installDiscoverySkill(c.state,id,{moment:data.moment||'entry',taskId:data.task||null});if(result.error)return c.toast(result.error);
  result.skill.enabled=true;const a=data.agent||'personal',thread=agentThread(c.state,a),t=data.task&&c.state.tasks.find(t=>t.id===data.task&&t.office?.agentId===a);
  const refs=t?(t.context||=[]):(thread.context||=[]);
  if(!refs.some(r=>r.type==='skill'&&r.id===id))refs.push({type:'skill',id,name:result.skill.name,text:result.skill.content,source:result.skill.source,version:result.skill.version,snapshotAt:Date.now()});
  if(t){focusAgentTask(c.state,t);t.office.skillApplications||=[];if(!t.office.skillApplications.some(x=>x.id===id))t.office.skillApplications.push({id,name:result.skill.name,version:result.skill.version,at:Date.now()});addAgentMessage(c.state,a,'assistant',`已添加「${result.skill.name}」，这次工作会采用其中的方法；资料权限和敏感操作的确认规则继续沿用当前约定。`,{taskId:t.id,kind:'skill',key:'skill-use:'+t.id+':'+id});}
  else{thread.activeTaskId=null;thread.newTopic=true;const prompt=discoverySkill(id).prompt;if(!thread.draft?.includes(prompt))thread.draft=(thread.draft?thread.draft+'\n\n':'')+prompt;}
  c.ui.cvPanelMode='summary';c.ui.cvScrollBottom=true;c.save();if(c.ui.modal)c.closeModal();c.go(t?'chat/'+t.id:'agent/'+a);c.toast(result.already?'已选用这项工作方法':'已添加 Skill，并带入当前对话');
}

export function handleSkillDiscovery(action,el,c){
  if(!action.startsWith('skillrec:'))return false;const a=action.slice(9),id=el.dataset.id;
  if(a==='detail')detail(c,id,el.dataset);
  else if(a==='use')use(c,id,el.dataset);
  else if(a==='dismiss'){dismissSkillOffer(c.state,el.dataset.task);c.save();c.render();}
  else if(a==='distill')distillForm(c,c.state.tasks.find(t=>t.id===el.dataset.task));
  else if(a==='draft-detail'){const s=c.state.catalog.skills.find(s=>s.id===id&&s.reviewStatus==='pending');if(s)c.modal('Skill 草稿',`<div class="sr-draft-detail"><h3>${E(s.name)}</h3><p>${E(s.description)}</p><div class="sr-draft-boundary">${icon('lock',15)}仅自己可见 · 待审核</div><pre>${E(s.content)}</pre><p>来自 ${s.sourceTaskIds.length} 次已完成的工作，尚未进入团队候选池。</p><div class="form-actions"><button class="btn" data-action="app:close-modal">关闭</button></div></div>`,{wide:true});}
  return true;
}
export function submitSkillDiscovery(name,form,c){
  if(name!=='skillrec:distill')return false;const v=Object.fromEntries(new FormData(form)),t=c.state.tasks.find(t=>t.id===v.task),result=saveDistilledSkill(c.state,t,v);
  if(result.error){c.toast(result.error);return true;}c.save();c.closeModal();c.toast(result.already?'这套方法已保存为草稿':'已保存 Skill 草稿 · 仅自己可见，待审核');return true;
}
