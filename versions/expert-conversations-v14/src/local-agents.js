import {esc as E,icon,uid} from './core.js?v=20261026-14.0';

export const LOCAL_AGENTS=[
  {id:'claude-code',name:'Claude Code',description:'Anthropic 命令行助手',tone:'clay'},
  {id:'codex',name:'Codex',description:'OpenAI 命令行助手',tone:'ink'}
];
export function initLocalAgents(state){return state.localAgents||=( {version:1,connections:{}} );}
const spec=id=>LOCAL_AGENTS.find(a=>a.id===id);
const connection=(state,id)=>initLocalAgents(state).connections[id];
export function connectLocalAgents(state,ids){
  const registry=initLocalAgents(state),added=[];
  for(const id of new Set(ids)){if(!spec(id)||registry.connections[id]?.connected)continue;const entry=registry.connections[id]||={id,draft:'',messages:[]};entry.connected=true;entry.connectedAt=Date.now();registry.connections[id]=entry;added.push(id);}
  return added;
}
export function disconnectLocalAgent(state,id){const entry=connection(state,id);if(!entry?.connected)return false;entry.connected=false;return true;}
const mark=(a,size='')=>`<span class="la-mark ${a.tone} ${size}" aria-hidden="true">${a.id==='claude-code'?'C':icon('terminal',18)}</span>`;
const btn=(label,action,attrs='',kind='')=>`<button type="button" class="la-button ${kind}" data-action="local:${action}" ${attrs}>${label}</button>`;

export const connectedLocalAgents=state=>LOCAL_AGENTS.filter(a=>connection(state,a.id)?.connected);
export function renderLocalAgentPins(c,{ids=null}={}){return connectedLocalAgents(c.state).filter(a=>!ids||ids.includes(a.id)).map(a=>`<button class="la-pin la-unified-pin ${c.ui.route==='local-agent/'+a.id?'active':''}" data-action="local:open" data-id="${a.id}" aria-label="${a.name}" title="本机 Agent · ${a.name}">${mark(a,'small')}<span>${a.name}</span><small>本机</small></button>`).join('');}
export function renderLocalExpertCards(c){
  const q=(c.ui.expertQuery||'').toLowerCase(),filter=c.ui.expertFilter||'全部';
  return connectedLocalAgents(c.state).filter(a=>(a.name+' 本机 Agent').toLowerCase().includes(q)&&['全部','本机'].includes(filter)).map(a=>`<article class="ex-card la-expert-card"><button class="ex-card-main" data-action="local:open" data-id="${a.id}">${mark(a)}<span><strong>${a.name}</strong><small>这台电脑 · 演示连接</small><p>在小悠中继续它的会话与工作。</p></span></button><div class="ex-card-foot"><span>本机 Agent</span>${btn('进入工作区','open',`data-id="${a.id}"`)}</div></article>`).join('');
}

function connectionDialog(c){
  c.modal('接入本机 Agent',`<form class="la-connect" data-form="local:connect"><p class="la-dialog-intro">在小悠中，集中查看和继续本机 Agent 的工作。</p><div class="la-device-line"><span>${icon('monitor',15)}这台电脑</span>${btn(icon('refresh',14)+'重新扫描','rescan','','subtle')}</div><div class="la-agent-list">${LOCAL_AGENTS.map(a=>{const connected=connection(c.state,a.id)?.connected;return `<div class="la-agent-option ${connected?'connected':''}">${connected?`<div class="la-agent-main">${mark(a)}<span><strong>${a.name}</strong><small>${a.description}</small></span></div><span class="la-connected">已接入</span>${btn('断开','disconnect',`data-id="${a.id}"`,'subtle')}`:`<label class="la-agent-choice">${mark(a)}<span><strong>${a.name}</strong><small>${a.description}</small></span><input type="checkbox" name="agents" value="${a.id}" data-live="local:selection" aria-label="接入${a.name}"></label>`}</div>`;}).join('')}</div><div class="la-dialog-footer"><small>示例检测结果 · 本地模拟接入</small><div><button type="button" class="la-button" data-action="app:close-modal">取消</button>${LOCAL_AGENTS.every(a=>connection(c.state,a.id)?.connected)?'<button type="button" class="la-button primary" data-action="app:close-modal">完成</button>':'<button type="submit" class="la-button primary" data-local-connect-submit disabled>接入</button>'}</div></div></form>`,{wide:false});
}

export function renderLocalAgentWorkspace(c){
  if(!c.ui.route.startsWith('local-agent/'))return '';
  const a=spec(c.ui.route.slice(12)),entry=a&&connection(c.state,a.id);
  if(!a)return `<main class="la-workspace"><div class="la-workspace-empty"><h2>找不到这个 Agent</h2>${btn('接入本机 Agent','connect','','primary')}</div></main>`;
  if(!entry?.connected)return `<main class="la-workspace" data-screen-label="本机 Agent"><header class="la-workspace-head">${mark(a)}<h1>${a.name}</h1></header><div class="la-workspace-empty">${mark(a,'large')}<h2>连接 ${a.name}</h2><p>接入后，这里的会话与工作会保留在小悠中。</p>${btn('接入本机 Agent','connect','','primary')}</div></main>`;
  return `<main class="la-workspace" data-screen-label="本机 Agent 工作区"><header class="la-workspace-head">${mark(a)}<div><h1>${a.name}</h1><p>这台电脑 <span>·</span> 演示连接</p></div>${btn(icon('settings',17),'connect','aria-label="管理本机 Agent 连接" title="管理连接"','icon')}</header><div class="la-messages" aria-label="${a.name}的工作会话">${entry.messages.length?`<div class="la-message-stack">${entry.messages.map(m=>`<article class="la-message ${m.role}"><p>${E(m.text).replaceAll('\n','<br>')}</p></article>`).join('')}</div>`:`<div class="la-workspace-empty">${mark(a,'large')}<h2>与 ${a.name} 一起工作</h2><p>交办一件工作，或继续讨论一个想法。</p><small>会话将独立保存在这里</small></div>`}</div><div class="la-compose-wrap"><form class="la-compose" data-form="local:message" data-identity="${a.id}"><input type="hidden" name="agent" value="${a.id}"><textarea id="local-agent-message" name="message" rows="2" data-live="local:draft" data-agent="${a.id}" aria-label="和${a.name}对话" placeholder="交给 ${a.name} 一件工作…">${E(entry.draft||'')}</textarea><div><span>${icon('monitor',14)}这台电脑</span><button class="la-send" type="submit" aria-label="发送给${a.name}" ${entry.draft?.trim()?'':'disabled'}>${icon('send',17)}</button></div></form><small class="la-compose-note">本地交互演示 · 不会启动本机应用或执行命令</small></div></main>`;
}

export function handleLocalAgents(action,el,c){
  if(!action.startsWith('local:'))return false;
  const a=action.slice(6),id=el.dataset.id;
  if(a==='add-menu'){c.popover(el,`<button data-action="expert:tab" data-id="market">${icon('expert',16)}从专家市场添加</button><button data-action="expert:share-form">${icon('link',16)}从分享链接添加</button><div class="divider"></div><button data-action="local:connect">${icon('monitor',16)}接入本机 Agent</button>`,220);}
  else if(a==='connect')connectionDialog(c);
  else if(a==='open'&&spec(id)&&connection(c.state,id)?.connected)c.go('local-agent/'+id);
  else if(a==='rescan'){c.toast('示例扫描完成：发现 Claude Code 和 Codex');}
  else if(a==='disconnect'){if(disconnectLocalAgent(c.state,id)){c.save();connectionDialog(c);c.toast('已断开演示连接，会话保留');}}
  return true;
}
export function submitLocalAgents(name,form,c){
  if(name==='local:connect'){
    const ids=connectLocalAgents(c.state,new FormData(form).getAll('agents'));
    if(!ids.length){c.toast('请选择要接入的 Agent');return true;}
    c.save();c.closeModal();c.go('local-agent/'+ids[0]);c.toast(`已接入 ${ids.length} 个本机 Agent · 演示连接`);return true;
  }
  if(name==='local:message'){
    const values=Object.fromEntries(new FormData(form)),entry=connection(c.state,values.agent),a=spec(values.agent),text=String(values.message||'').trim();
    if(!entry?.connected||!a||!text)return true;
    entry.messages.push({id:uid('local-message'),role:'user',text,at:Date.now()},{id:uid('local-message'),role:'assistant',text:`已在 ${a.name} 的独立会话中记录这项工作。当前为本地演示，尚未向本机 Agent 提交执行。`,at:Date.now()+1});entry.draft='';
    c.save();c.render();const input=document.getElementById('local-agent-message');if(input)input.value='';document.querySelector('.la-messages')?.scrollTo({top:1e8});return true;
  }
  return false;
}
export function inputLocalAgents(el,c){
  if(el.dataset.live==='local:selection'){const form=el.closest('form'),count=form.querySelectorAll('input[name="agents"]:checked').length,button=form.querySelector('[data-local-connect-submit]');button.disabled=!count;button.textContent=count?`接入 ${count} 个 Agent`:'接入';return true;}
  if(el.dataset.live==='local:draft'){const entry=connection(c.state,el.dataset.agent);if(entry?.connected){entry.draft=el.value;c.save();const button=el.closest('form').querySelector('.la-send');button.disabled=!el.value.trim();}return true;}
  return false;
}
