/* Personal assistant entry and migration. Task execution remains in the conversation modules. */
export function collectMemorySnapshot(state){
 return (state.settings?.memory?.items||[]).filter(m=>m.scope==='global').map(m=>({id:m.id,title:m.title,text:m.text,scope:m.scope,projectId:m.projectId||'',source:m.source||'',version:m.version||1}));
}
export function initPersonal(state){
 state.personal||={};const p=state.personal;
 p.messages||=[];p.draft??='';p.attachmentDrafts||=[];
 // Preserve user conversation, attachments and settings; retire obsolete recommendation state.
 for(const key of ['follows','suggestions','suppressedKeys','quietUntil','demoCounter','sequence','enabled'])delete p[key];
 p.version=2;return p;
}
function avatar(){return '<span class="per-avatar" aria-hidden="true"><img class="xiaoyou-mascot" src="./assets/xiaoyou.png" alt=""></span>';}
export function hasPersonalUnread(state){return (state.personal?.messages||[]).some(m=>m.kind==='event'&&m.unread===true);}
export function markPersonalRead(state){let changed=false;for(const m of state.personal?.messages||[]){if(m.kind==='event'&&m.unread===true){m.unread=false;changed=true;}}return changed;}
export function renderPersonalDock(c){const unread=hasPersonalUnread(c.state),active=c.ui.route==='personal'||c.ui.route.startsWith('personal/');return `<button class="nav-item personal-nav ${active?'active':''}" data-action="per:open" aria-label="小悠${unread?'，有新的工作结果未读':''}" title="${unread?'小悠有新的工作结果，点击查看':'小悠'}" ${active?'aria-current="page"':''}>${c.icon('sparkles',20)}<span>小悠</span>${unread?'<i class="personal-unread-dot" aria-hidden="true"></i>':''}</button>`;}
export function renderPersonalHome(c){return `<div class="per-home per-home-invite">${avatar()}<span>和小悠聊工作、看进展，留下你的偏好与日记。</span><button class="btn small" data-action="per:open">打开个人助理 ${c.icon('arrow',14)}</button></div>`;}
export function handlePersonal(action,el,c){if(action!=='per:open')return false;c.go('personal');return true;}

// Retired personal task page: old bookmarks return to the personal conversation.
export function normalizePersonalRoute(route){return /^personal\/tasks(?:\/|$)/.test(route)?'personal':route;}
