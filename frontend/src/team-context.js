import {teamTaskOptions,teamTaskAccess,authorizeTeamTask,getTeam} from './team-model.js';
import {composer,appendTeamExample} from './chat.js';
import {uid} from './core.js';
import {assetPresentation} from './team-presentation.js';

const draftKey=(state,teamId,type,resourceId)=>`${state.teamSpace.userId}:${teamId}:${type}:${resourceId}`;
export function normalizeTeamRoute(state,route) {
  if(route==='projects'||route.startsWith('project/'))return 'teams';
  const [kind,legacyId,type,assetId]=route.split('/');
  if(kind==='team-task'){
    const mapped=state.teamSpace?.legacyResourceMap?.[`${legacyId}:${type}:${assetId}`];
    if(mapped){
      const oldKey=draftKey(state,legacyId,type,assetId);
      const retained=state.teamDrafts?.[oldKey];
      return `team-task/${mapped.teamId}/${type}/${mapped.resourceId}${retained?'/'+encodeURIComponent(oldKey):''}`;
    }
  }
  return route;
}
function makeDraft(ctx,options,key){return {...ctx.state.composer,...options,teamDraftKey:key,isTeamDraft:true,draft:'',status:'draft',annotations:[]};}
function applyTeamConfiguration(draft,options) {
  if(JSON.stringify(draft.teamAssetSnapshot)===JSON.stringify(options.teamAssetSnapshot)&&JSON.stringify(draft.teamOrigin)===JSON.stringify(options.teamOrigin))return;
  const personal=(draft.context||[]).filter(ref=>ref.type!=='team-asset'&&ref.type!=='team-expert-knowledge'&&!ref.boundToTeamExpert);
  // A plugin/library draft may also have a personally selected expert. Updating
  // the space attachment must not clear that independent choice.
  const expert=options.teamOrigin?.assetType==='expert'?options.expert:draft.expert;
  Object.assign(draft,options,{expert,context:[...options.context,...personal]});
}
function refreshTeamDraft(ctx,draft) {
  if(!draft?.isTeamDraft||!draft.teamOrigin||draft.detachedTeamResource||draft.detachedTeamTool)return;
  const origin=draft.teamOrigin;
  const result=teamTaskOptions(ctx.state,origin.teamId,origin.assetType,origin.resourceId,{allowUnconnected:true});
  if(result.error){draft.teamDraftError=result.error;return result;}
  delete draft.teamDraftError;
  applyTeamConfiguration(draft,result.options);
  return result;
}
export function getTeamComposer(ctx) {
  const [route,teamId,type,resourceId,legacyDraft]=ctx.ui.route.split('/');
  if(route!=='team-task'||!teamId||!resourceId)return null;
  ctx.state.teamDrafts ||= {};
  let key=draftKey(ctx.state,teamId,type,resourceId);
  if(legacyDraft){
    let legacyKey='';try{legacyKey=decodeURIComponent(legacyDraft);}catch{}
    const retained=ctx.state.teamDrafts[legacyKey];
    if(legacyKey.startsWith(ctx.state.teamSpace.userId+':')&&retained?.teamOrigin?.teamId===teamId&&retained.teamOrigin.resourceId===resourceId&&retained.teamOrigin.assetType===type){key=legacyKey;retained.teamDraftKey=key;}
  }
  if(ctx.state.teamDrafts[key]){
    const draft=ctx.state.teamDrafts[key];
    draft.isTeamDraft=true;
    if(ctx.ui.teamPendingSend?.task!==draft)refreshTeamDraft(ctx,draft);
    return draft;
  }
  const result=teamTaskOptions(ctx.state,teamId,type,resourceId,{allowUnconnected:true});
  if(result.error)return null;
  return ctx.state.teamDrafts[key]=makeDraft(ctx,result.options,key);
}
export function openTeamTask(ctx,teamId,type,resourceId,prompt='') {
  const result=teamTaskOptions(ctx.state,teamId,type,resourceId,{allowUnconnected:true});
  if(result.error){ctx.toast(result.error);return false;}
  ctx.state.teamDrafts ||= {};
  const key=draftKey(ctx.state,teamId,type,resourceId);
  let draft=ctx.state.teamDrafts[key];
  if(!draft)draft=ctx.state.teamDrafts[key]=makeDraft(ctx,result.options,key);
  else {
    draft.isTeamDraft=true;
    applyTeamConfiguration(draft,result.options);
    draft.detachedTeamResource=false;draft.detachedTeamTool=false;delete draft.teamDraftError;
  }
  if(prompt&&!draft.draft.trim())draft.draft=prompt;
  else if(prompt&&draft.draft.trim()!==prompt.trim())ctx.toast('已保留上次未发送的内容，可继续修改后发送');
  ctx.save();ctx.go(`team-task/${teamId}/${type}/${resourceId}`,()=>document.querySelector('#task-prompt')?.focus());
  return true;
}
export function resetTeamDraft(state,draft) {if(draft?.teamDraftKey)delete state.teamDrafts[draft.teamDraftKey];}

// Returns true when sending was stopped for connection or access checks.
export function requestTeamAuthorization(ctx,task,resume) {
  if(!task?.teamOrigin)return false;
  refreshTeamDraft(ctx,task);
  const access=teamTaskAccess(ctx.state,task);
  if(access.available)return false;
  if(!access.missingPlugins.length){ctx.toast(access.reason);return true;}
  const token=uid('connection');
  ctx.ui.teamPendingSend={token,task,reviewedTask:structuredClone(task),resume,route:ctx.ui.route};
  const expert=task.teamAssetSnapshot?.type==='expert';
  ctx.modal('发送前，连接你的账号',`<div class="ts-send-auth"><p>${expert?ctx.esc(task.expert)+'需要通过以下工具读取你有权限访问的资料。':'你添加的工具需要连接个人账号后才能使用。'}</p><div class="ts-auth-list">${access.missingPlugins.map(p=>`<div>${ctx.icon(p.icon||'plugin',22)}<span><strong>${ctx.esc(p.name)}</strong><small>${ctx.esc(p.description||'使用个人账号中的资料')}</small></span></div>`).join('')}</div><p class="notice">输入已保留。连接仅用于你自己的任务，不会把账号或对话分享给团队。</p><p class="muted ts-auth-demo">当前为本地连接演示，不访问真实账号。</p><div class="form-actions"><button class="btn" data-action="team-task:cancel-connect" data-token="${token}">返回编辑</button><button class="btn primary" data-action="team-task:connect-send" data-token="${token}">演示连接并发送</button></div></div>`,{wide:true});
  return true;
}
export function handleTeamContext(action,el,ctx) {
  if(!action.startsWith('team-task:'))return false;
  const draft=getTeamComposer(ctx);
  if(action==='team-task:example'){
    if(draft){appendTeamExample(draft,el.dataset.prompt);ctx.save();ctx.render();document.querySelector('#task-prompt')?.focus();}
  }else if(action==='team-task:remove-tool'||action==='team-task:remove-resource'){
    if(['plugin','knowledge'].includes(draft?.teamOrigin?.assetType)){
      draft.context=(draft.context||[]).filter(r=>r.type!=='team-asset');draft.teamOrigin=null;draft.teamAssetSnapshot=null;draft.customInstructions='';draft.origin='manual';draft.detachedTeamResource=true;delete draft.teamDraftError;
      delete ctx.ui.teamPendingSend;ctx.ui.modal=null;ctx.save();ctx.render();ctx.toast('已移除，输入内容已保留');
    }
  }else if(action==='team-task:cancel-connect'){
    delete ctx.ui.teamPendingSend;ctx.closeModal();
  }else if(action==='team-task:connect-send'){
    const pending=ctx.ui.teamPendingSend;
    if(!pending||pending.token!==el.dataset.token||pending.route!==ctx.ui.route||!ctx.ui.modal)return true;
    // Consume before resuming so repeated clicks cannot create a second task.
    delete ctx.ui.teamPendingSend;
    // Authorize only the configuration the user just reviewed. A changed
    // plugin/library or invalid link requires a fresh send and fresh review.
    const reviewed=pending.reviewedTask||pending.task;
    const changed=JSON.stringify(pending.task.teamOrigin)!==JSON.stringify(reviewed.teamOrigin)||JSON.stringify(pending.task.teamAssetSnapshot)!==JSON.stringify(reviewed.teamAssetSnapshot);
    const result=changed?{error:'任务配置已更改，请核对后再次发送。'}:authorizeTeamTask(ctx.state,reviewed);
    if(result.error){refreshTeamDraft(ctx,pending.task);ctx.save();ctx.closeModal();ctx.toast(result.error+' 输入已保留。');return true;}
    ctx.save();ctx.closeModal();pending.resume?.();
  }else return false;
  return true;
}
export function renderTeamTask(ctx) {
  const draft=getTeamComposer(ctx);
  if(!draft)return `<main class="home-page"><div class="empty-state"><h2>这项服务暂时无法使用</h2><p>资源可能已被移除，或你已不在这个空间中。</p><button class="btn primary" data-action="app:go" data-route="teams">返回团队空间</button></div></main>`;
  const o=draft.teamOrigin,a=draft.teamAssetSnapshot,isExpert=a?.type==='expert',isKnowledge=a?.type==='knowledge',usage=a?assetPresentation(a):null,access=teamTaskAccess(ctx.state,draft);
  const team=o?getTeam(ctx.state,o.teamId):getTeam(ctx.state,ctx.ui.route.split('/')[1]);
  const examples=usage?.examples?.length?usage.examples:['帮我整理这份材料的重点和下一步待办。'];
  const tools=isExpert?(a.plugins||[]):a?.type==='plugin'?[a]:[],knowledgeBases=isExpert?(a.knowledgeBases||[]):[];
  return `<main class="home-page ts-task-page"><header class="conversation-header"><div class="conversation-title"><h2>新建个人任务</h2><span class="muted">仅你可见</span></div><button class="btn ghost small" data-action="app:go" data-route="team/${ctx.esc(team?.id||ctx.state.teamSpace.currentTeamId)}/resources">${ctx.icon('back',15)}返回团队空间</button></header><div class="home-center ts-task-center"><div class="ts-task-intro ${isExpert?'is-expert-task':'is-general-task'}">${isExpert?`<span class="ts-task-icon">${ctx.icon(a.icon||'expert',30)}</span><span class="ts-task-kicker">${ctx.esc(team?.name||'团队')}提供的助理</span><h1>${ctx.esc(a.name)}</h1><p>${ctx.esc(usage.description)}</p>`:`<img class="ts-task-mascot" src="./assets/xiaoyou.png" alt="小悠"><h1>这次想让小悠做什么？</h1><p>${a?isKnowledge?`已引用「${ctx.esc(a.name)}」。告诉小悠你想了解什么，引用内容仅用于这次个人任务。`:`${ctx.esc(usage.title)}插件已添加。描述你的要求，也可以上传要处理的文件。`:'描述你的任务，也可以用输入框里的 ＋ 添加资料。'}</p>`}</div>${!access.available&&!access.missingPlugins.length?`<p class="notice">${ctx.esc(access.reason)} 输入已保留，请返回团队空间选择其他服务。</p>`:''}${isExpert&&(tools.length||knowledgeBases.length)?`<div class="ts-task-tool-line"><span>已自动带上</span>${tools.map(p=>`<span>${ctx.icon('plugin',13)}${ctx.esc(p.name)}</span>`).join('')}${knowledgeBases.map(k=>`<span>${ctx.icon('book',13)}${ctx.esc(k.name)}</span>`).join('')}${access.missingPlugins.length?'<small>发送时连接个人账号</small>':''}</div>`:''}${composer(ctx,draft)}<div class="ts-task-examples"><span>不知道怎么开始？试试这样说</span>${examples.slice(0,3).map(prompt=>`<button class="ts-example" data-action="team-task:example" data-prompt="${ctx.esc(prompt)}">${ctx.esc(prompt)}${ctx.icon('arrow',15)}</button>`).join('')}</div><p class="ts-private-note">${ctx.icon('lock',13)}输入和成果仅你可见，不会共享到空间。</p></div></main>`;
}
