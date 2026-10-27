import {initSites,getSite,updateSiteDraft,publishSite,softDeleteSite,restoreSite,siteUrl,renderSiteHtml,embeddedSiteHtml} from './site-model.js';

const E=(c,v)=>c.esc(String(v??''));
const clone=v=>structuredClone(v);
const taskFor=(c,id)=>c.state.tasks.find(t=>t.id===id);
const visibleSites=c=>(c.state.workspace.sites||[]).filter(s=>s.status!=='deleted'&&!s.deletedAt);
const isPublished=s=>s?.status==='published';
const pageFor=s=>s.page||s;
function button(c,label,action,{id='',task='',kind='',icon='',attrs=''}={}){return `<button type="button" class="btn ${kind}" data-action="site:${action}" ${id?`data-id="${E(c,id)}"`:''} ${task?`data-task="${E(c,task)}"`:''} ${attrs}>${icon?c.icon(icon,16):''}${E(c,label)}</button>`;}
function openLink(c,s,label='打开',kind=''){return `<a class="btn ${kind}" href="${E(c,siteUrl(s.id))}" target="_blank" rel="noopener noreferrer">${c.icon('external',15)}${label}</a>`;}
function timeLabel(value){if(!value)return '尚未发布';const date=new Date(value);return Number.isNaN(date.getTime())?'尚未发布':date.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}
function fileCount(s){return Array.isArray(s.files)?s.files.length:Number(s.files)||1;}
function preview(c,page,title){return `<iframe class="site-preview-frame" title="${E(c,title)}" sandbox="" referrerpolicy="no-referrer" srcdoc="${E(c,embeddedSiteHtml(renderSiteHtml(page)))}"></iframe>`;}
function blank(c,title,description,action=''){return `<div class="empty-state site-empty">${c.icon('globe',30)}<h2>${E(c,title)}</h2><p>${E(c,description)}</p>${action}</div>`;}
function siteRow(c,s){const published=isPublished(s),sections=pageFor(s).sections||[];return `<article class="site-list-row"><div class="site-row-symbol">${c.icon('globe',23)}</div><div class="site-row-main"><div class="site-row-title"><h2>${E(c,s.name)}</h2><span class="badge ${published?'blue':''}">${published?'已发布 · v'+s.version:'未发布'}</span></div><p class="site-row-description">${E(c,s.description||s.title||'未填写站点简介')}</p><div class="site-row-meta"><span>${published?'更新于 '+E(c,timeLabel(s.updatedAt)):'旧站点资料'}</span><span>${published?fileCount(s)+' 个文件':'待生成网页'}</span><span>${published?'当前浏览器可访问':'继续编辑后可发布'}</span>${published&&sections.length?`<span>${sections.length} 个内容分区</span>`:''}</div></div><div class="site-row-actions">${published?openLink(c,s)+button(c,'复制链接','copy',{id:s.id,icon:'copy'}):button(c,'继续编辑','edit',{id:s.id,icon:'edit'})}${button(c,'','more',{id:s.id,kind:'ghost site-more-button',icon:'more',attrs:`aria-label="${E(c,'更多操作：'+s.name)}" title="更多操作"`})}</div></article>`;}

export function renderSites(c){
  initSites(c.state);
  const query=String(c.ui.siteQuery||'').trim().toLowerCase(),all=visibleSites(c),shown=all.filter(s=>[s.name,s.title,s.description,...(pageFor(s).sections||[]).flatMap(section=>[section.heading,section.body])].join(' ').toLowerCase().includes(query));
  const published=shown.filter(isPublished),drafts=shown.filter(s=>!isPublished(s));
  const group=(title,items)=>items.length?`<div class="site-group-heading"><h2>${title}</h2><span>${items.length}</span></div><div class="site-list">${items.map(s=>siteRow(c,s)).join('')}</div>`:'';
  return `<section class="work-page site-page"><div class="page-head"><div><h1>站点</h1><p>把想法变成网页，发布后随时打开，也可以回到会话继续修改。</p></div><div class="work-head-actions">${button(c,'使用说明','help',{kind:'ghost',icon:'book'})}${button(c,'刷新','refresh',{kind:'ghost',icon:'refresh'})}${button(c,'在会话中试用','use',{kind:'primary',icon:'plus'})}</div></div><div class="site-list-toolbar"><div class="site-search">${c.icon('search',17)}<input class="search-input" aria-label="搜索站点" data-live="site:search" value="${E(c,c.ui.siteQuery||'')}" placeholder="搜索站点名称或内容">${query?button(c,'','clear-search',{kind:'ghost small',icon:'close',attrs:'aria-label="清空站点搜索"'}):''}</div><span class="site-list-total">${all.filter(isPublished).length} 个已发布站点</span></div>${c.ui.siteUndo?`<div class="site-undo" role="status"><span>已删除「${E(c,c.ui.siteUndo.name)}」</span>${button(c,'撤销','undo',{id:c.ui.siteUndo.id,kind:'ghost small'})}<button class="icon-btn" data-action="site:dismiss-undo" aria-label="关闭删除提示">${c.icon('close',15)}</button></div>`:''}${shown.length?group('已发布',published)+group('未发布资料',drafts):query?blank(c,'没有找到相关站点','换一个关键词，或者清空搜索查看全部站点。',button(c,'清空搜索','clear-search')):blank(c,'从一个想法开始','告诉小悠你想做什么网页。先预览和调整，再发布到站点列表。',button(c,'创建第一个站点','create',{kind:'primary',icon:'plus'}))}<p class="site-scope-note">${c.icon('info',14)}<span>发布后的链接仅在保存站点的当前浏览器中可访问，换设备或浏览器无法打开。</span></p></section>`;
}

export function renderSiteTaskCard(c,t){
  const draft=t.siteDraft;if(!draft)return '';
  const site=getSite(c.state,draft.siteId||t.siteRequest?.siteId),published=isPublished(site),sameVersion=published&&t.sitePublishedRevision===draft.revision&&site.taskId===t.id&&site.version===draft.baseVersion,ready=t.status==='complete';
  return `<section class="site-task-card" aria-label="站点草稿"><div class="site-task-card-head"><span class="site-row-symbol">${c.icon('globe',22)}</span><div><h3>${E(c,draft.name||draft.title)}</h3><p>${sameVersion?'当前草稿已发布为 v'+E(c,site.version):published?'有未发布的修改 · 当前站点 v'+E(c,site.version):'网页草稿已准备好'}</p></div><span class="badge ${sameVersion?'blue':''}">${sameVersion?'已发布':'待发布'}</span></div><p class="site-task-description">${E(c,draft.description)}</p><div class="site-task-summary"><span>${(draft.sections||[]).length} 个内容分区</span><span>index.html</span></div><div class="site-task-actions">${button(c,'预览草稿','preview-draft',{task:t.id,icon:'panel'})}${button(c,'编辑内容','edit-draft',{task:t.id,kind:'ghost',icon:'edit',attrs:ready?'':'disabled'})}${!sameVersion?button(c,published?'更新发布':'发布站点','publish',{task:t.id,kind:'primary',icon:'external',attrs:ready?'':'disabled'}):openLink(c,site,'打开站点','primary')}${sameVersion?button(c,'复制链接','copy',{id:site.id,kind:'ghost',icon:'copy'}):''}</div>${published?`<p class="site-task-footnote">${sameVersion?'链接保持不变，后续修改可更新到同一个站点。':'正在编辑草稿，已发布页面保持原版本。'}</p>`:''}</section>`;
}

function beginTask(c,id=''){
  const result=c.prepareSiteTask?.(id);
  if(result===false||result?.error){if(result?.error)c.toast(result.error);return;}
  c.closeModal();c.go('site-task/'+(id||'new'));
}
function showHelp(c){c.modal('如何使用站点',`<ol class="site-help-steps"><li><strong>描述你要做的网页</strong><p>点击「在会话中试用」，修改输入框里的需求，再发送给小悠。</p></li><li><strong>预览并调整内容</strong><p>网页生成后，打开草稿预览。可以直接编辑标题、简介和内容分区，也可以在会话里继续提出修改。</p></li><li><strong>确认发布</strong><p>检查页面后点击「发布站点」。发布成功后，站点会出现在列表中，可以打开或复制链接。</p></li><li><strong>继续修改同一个站点</strong><p>站点的「更多 → 编辑」会打开带有该站点地址的会话输入框。修改不会立即影响已发布页面，确认「更新发布」后才替换当前版本。</p></li></ol><p class="site-scope-note">${c.icon('info',14)}<span>本版本在当前浏览器保存页面和发布记录。尚未接入模型生成和远程托管，链接不能用于跨设备分享。</span></p><div class="site-modal-actions">${button(c,'在会话中试用','use',{kind:'primary'})}</div>`,{wide:true});}
function showPreview(c,t){if(!t?.siteDraft){c.toast('这段会话还没有网页草稿');return;}c.modal('预览草稿 · '+(t.siteDraft.name||'站点'),`<p class="site-preview-intro">这是尚未发布的草稿。确认内容后，再发布或更新站点。</p>${preview(c,t.siteDraft,'站点草稿预览')}<div class="site-modal-actions">${button(c,'编辑内容','edit-draft',{task:t.id,icon:'edit'})}${button(c,isPublished(getSite(c.state,t.siteDraft.siteId))?'更新发布':'发布站点','publish',{task:t.id,kind:'primary'})}</div>`,{wide:true});}
function showPublish(c,t){
  if(t&&t.status!=='complete'){c.toast('请等待当前任务完成后再发布');return;}
  if(!t?.siteDraft){c.toast('请先生成网页草稿');return;}
  const site=getSite(c.state,t.siteDraft.siteId||t.siteRequest?.siteId),updating=isPublished(site);
  c.ui.sitePublishReview={taskId:t.id,revision:t.siteDraft.revision,html:t.siteDraft.html};
  c.modal(updating?'确认更新站点':'确认发布站点',`<div class="site-publish-summary"><strong>${E(c,t.siteDraft.name)}</strong><span class="badge blue">${updating?'v'+site.version+' → v'+(site.version+1):'首次发布 · v1'}</span></div><p class="site-preview-intro">${updating?'确认后替换已发布的页面，站点链接保持不变。':'确认后保存页面，并生成固定链接。'}</p>${preview(c,t.siteDraft,'待发布站点预览')}<div class="site-publish-scope"><span>访问范围</span><strong>当前浏览器</strong><small>链接仅在这台电脑保存站点的浏览器中可用。</small></div><div class="site-modal-actions"><button type="button" class="btn ghost" data-action="app:close-modal">继续检查</button>${button(c,updating?'确认更新发布':'确认发布','confirm-publish',{task:t.id,kind:'primary'})}</div>`,{wide:true});
}
function showPublished(c,s){c.modal('站点已发布',`<div class="site-publish-success">${c.icon('checkCircle',27)}<div><h3>${E(c,s.name)}</h3><p>v${s.version} · ${E(c,timeLabel(s.updatedAt))} · ${fileCount(s)} 个文件</p></div></div><label class="field">站点链接<input id="site-published-link" readonly value="${E(c,siteUrl(s.id))}" aria-label="已发布站点链接"></label><p class="site-scope-note">仅在保存站点的当前浏览器中可访问。</p><div class="site-modal-actions">${button(c,'继续修改','edit',{id:s.id,kind:'ghost',icon:'edit'})}${button(c,'复制链接','copy',{id:s.id,icon:'copy'})}${openLink(c,s,'打开站点','primary')}</div>`,{wide:true});}
function restoreObject(object,saved){for(const key of Object.keys(object))delete object[key];Object.assign(object,saved);}
function transaction(c,fn,task=null){
  if(c.refreshSites?.()===false)return {error:'refresh-failed'};
  if(task&&taskFor(c,task.id)!==task){c.toast('对话已在其他页面更新，请重新打开草稿检查后再操作');return {error:'task-refreshed'};}
  const sites=clone(c.state.workspace.sites),savedTask=task?clone(task):null;
  try{const result=fn();if(result?.error){c.state.workspace.sites=sites;if(task)restoreObject(task,savedTask);c.toast(result.error);return result;}if(c.save()===false){c.state.workspace.sites=sites;if(task)restoreObject(task,savedTask);c.toast(c.ui.saveError||'保存失败，内容已保留，请检查浏览器存储空间后重试');return {error:'save-failed'};}return result;}catch(error){c.state.workspace.sites=sites;if(task)restoreObject(task,savedTask);c.toast('这一步未保存，内容已保留，请重试');return {error:String(error)};}
}
function readEditor(form){const data=new FormData(form);return {name:String(data.get('name')||''),title:String(data.get('title')||''),description:String(data.get('description')||''),accent:String(data.get('accent')||'#267ee7'),sections:[...form.querySelectorAll('[data-site-section]')].map(row=>({heading:row.querySelector('[data-section-heading]').value,body:row.querySelector('[data-section-body]').value}))};}
function showEditor(c,t,values){
  if(!t?.siteDraft){c.toast('请先生成网页草稿');return;}
  if(t.status!=='complete'){c.toast('请等待当前任务完成后再编辑内容');return;}
  const draft=values||clone(t.siteDraft);c.ui.siteEditorTask=t.id;c.ui.siteEditorDraft=draft;
  const fields=(draft.sections||[]).map((s,i)=>`<fieldset class="site-content-section" data-site-section><legend>内容分区 ${i+1}</legend><div class="site-section-heading"><label class="field"><span>分区标题</span><input data-section-heading aria-label="分区 ${i+1} 标题" value="${E(c,s.heading)}" maxlength="120" required></label>${button(c,'删除分区','remove-section',{task:t.id,kind:'ghost small danger-text',icon:'trash',attrs:`data-index="${i}" ${(draft.sections||[]).length<=1?'disabled':''}`})}</div><label class="field"><span>分区正文</span><textarea data-section-body aria-label="分区 ${i+1} 正文" rows="5" maxlength="8000" required>${E(c,s.body)}</textarea></label></fieldset>`).join('');
  c.modal('编辑网页内容',`<form class="site-editor-form" data-form="site:content" data-task="${E(c,t.id)}"><p class="site-preview-intro">先保存到草稿。发布后，站点页面才会更新。</p><div class="form-grid"><label class="field"><span>站点名称</span><input name="name" maxlength="80" required value="${E(c,draft.name)}"></label><label class="field"><span>页面标题</span><input name="title" maxlength="120" required value="${E(c,draft.title)}"></label></div><label class="field"><span>页面简介</span><textarea name="description" maxlength="500" rows="3">${E(c,draft.description)}</textarea></label><label class="field site-color-field"><span>强调色</span><input name="accent" type="color" value="${/^#[\da-f]{6}$/i.test(draft.accent)?draft.accent:'#267ee7'}"></label><div class="site-sections">${fields}</div>${button(c,'添加内容分区','add-section',{task:t.id,icon:'plus',attrs:(draft.sections||[]).length>=20?'disabled':''})}<div class="site-modal-actions"><button type="button" class="btn ghost" data-action="app:close-modal">取消</button><button type="submit" class="btn primary">保存草稿</button></div></form>`,{wide:true});
}
function copyFallback(c,s){c.modal('复制站点链接',`<p>浏览器未允许自动复制。可以选中下面的链接，按 ⌘C 或 Ctrl+C 复制。</p><label class="field">站点链接<input id="site-copy-link" aria-label="站点链接" readonly value="${E(c,siteUrl(s.id))}"></label><p class="site-scope-note">链接仅在保存站点的当前浏览器中可访问。</p><div class="site-modal-actions">${button(c,'选中链接','select-link')}${openLink(c,s,'打开站点','primary')}</div>`);}

export function handleSites(action,el,c){
  if(!action.startsWith('site:'))return false;
  initSites(c.state);const a=action.slice(5),id=el.dataset.id,task=taskFor(c,el.dataset.task);
  switch(a){
    case 'create':case 'use':beginTask(c);break;
    case 'edit':if(getSite(c.state,id))beginTask(c,id);else c.toast('该站点已删除或不存在');break;
    case 'help':showHelp(c);break;
    case 'refresh':if(c.refreshSites?.()===false)break;c.render();c.toast('站点列表已刷新');break;
    case 'clear-search':c.ui.siteQuery='';c.render();break;
    case 'more':{const s=getSite(c.state,id);if(!s){c.toast('该站点已删除或不存在');break;}c.popover(el,`<button data-action="site:edit" data-id="${E(c,id)}">${c.icon('edit',16)}编辑</button><button class="danger-text" data-action="site:delete" data-id="${E(c,id)}">${c.icon('trash',16)}删除站点</button>`,170);break;}
    case 'copy':{const s=getSite(c.state,id);if(!isPublished(s)){c.toast('请先发布站点，再复制链接');break;}try{const promise=navigator.clipboard?.writeText(siteUrl(id));if(!promise){copyFallback(c,s);break;}Promise.resolve(promise).then(()=>c.toast('已复制站点链接')).catch(()=>copyFallback(c,s));}catch{copyFallback(c,s);}break;}
    case 'select-link':{const input=document.getElementById('site-copy-link');input?.focus();input?.select();break;}
    case 'preview-draft':showPreview(c,task);break;
    case 'edit-draft':showEditor(c,task);break;
    case 'add-section':case 'remove-section':{const form=document.querySelector('form[data-form="site:content"]');if(!form||!task)break;const values=readEditor(form);if(a==='add-section'&&values.sections.length<20)values.sections.push({heading:'',body:''});else if(a==='remove-section'&&values.sections.length>1)values.sections.splice(Number(el.dataset.index),1);showEditor(c,task,values);break;}
    case 'publish':showPublish(c,task);break;
    case 'confirm-publish':{if(!task?.siteDraft){c.toast('请先生成网页草稿');break;}const review=c.ui.sitePublishReview;if(!review||review.taskId!==task.id||review.revision!==task.siteDraft.revision||review.html!==task.siteDraft.html){c.toast('草稿有新修改，请重新预览后确认');showPublish(c,task);break;}const result=transaction(c,()=>publishSite(c.state,task.id),task);if(result?.error&&result.error.includes('更新版本')){const id=task.siteDraft.siteId||task.siteRequest?.siteId;c.modal('站点已有更新版本',`<p>这份草稿仍然保留。为避免覆盖已发布的新内容，请基于最新版本继续修改。</p><div class="site-modal-actions"><button class="btn ghost" data-action="app:close-modal">保留当前草稿</button>${button(c,'基于最新版继续修改','edit',{id,kind:'primary'})}</div>`);}if(!result?.error&&result?.site){delete c.ui.sitePublishReview;c.ui.siteQuery='';showPublished(c,result.site);}break;}
    case 'delete':{const s=getSite(c.state,id);if(!s){c.toast('该站点已删除或不存在');break;}c.modal('删除站点？',`<p>删除「${E(c,s.name)}」后，${isPublished(s)?'站点链接将无法访问。':'它将从列表移除。'}原会话和草稿会保留，可以在列表中撤销本次删除。</p><div class="site-modal-actions"><button class="btn ghost" data-action="app:close-modal">取消</button>${button(c,'删除站点','confirm-delete',{id,kind:'danger'})}</div>`);break;}
    case 'confirm-delete':{const result=transaction(c,()=>softDeleteSite(c.state,id));if(!result?.error&&result?.site){c.ui.siteUndo={id,name:result.site.name};c.closeModal();c.render();}break;}
    case 'undo':{const result=transaction(c,()=>restoreSite(c.state,id));if(!result?.error){delete c.ui.siteUndo;c.ui.siteQuery='';c.render();c.toast('站点已恢复');}break;}
    case 'dismiss-undo':delete c.ui.siteUndo;c.render();break;
    default:return false;
  }
  return true;
}

export function submitSites(name,form,c){
  if(name!=='site:content')return false;
  const task=taskFor(c,form.dataset.task);if(!task){c.toast('会话不存在，草稿尚未保存');return true;}
  const values=readEditor(form),result=transaction(c,()=>updateSiteDraft(c.state,task.id,values),task);
  if(!result?.error){delete c.ui.siteEditorDraft;delete c.ui.siteEditorTask;delete c.ui.sitePublishReview;c.closeModal();c.render();c.toast('已保存草稿，预览确认后可发布');}
  return true;
}
export function inputSites(el,c){if(el.dataset.live!=='site:search')return false;c.ui.siteQuery=el.value;c.render();return true;}
