import {esc,icon} from './core.js?v=20261026-12.0';
import {agentThread} from './agent-conversations.js?v=20261026-12.0';

const shortcuts=[
  {id:'chat',label:'搜索飞书聊天',icon:'message',prompt:'帮我搜索飞书中与【主题／项目】相关的聊天，整理关键讨论和已确认结论，并附来源。'},
  {id:'docs',label:'查找相关文档',icon:'book',prompt:'帮我查找与【主题／项目】相关的飞书文档，提取与当前问题有关的内容，并附来源。'},
  {id:'meetings',label:'查找会议总结',icon:'calendar',prompt:'帮我查找与【主题／项目】相关的飞书会议纪要，整理会议结论、待办和未决问题，并附来源。'}
];

export function renderContextShortcuts({target='home',agentId='',inputId=target==='agent'?'cv-message':'task-prompt'}={}){
  return `<div class="context-shortcuts" role="group" aria-label="飞书上下文快捷入口"><span class="context-shortcuts-label">飞书上下文</span><div class="context-shortcuts-items">${shortcuts.map(s=>`<button type="button" class="context-shortcut" data-action="context:insert" data-id="${s.id}" data-target="${target}" data-input="${inputId}" data-agent="${esc(agentId)}" title="添加提示词，编辑后发送">${icon(s.icon,14)}<span>${s.label}</span></button>`).join('')}</div></div>`;
}

export function handleContextShortcut(action,el,c){
  if(action!=='context:insert')return false;
  const shortcut=shortcuts.find(s=>s.id===el.dataset.id);
  if(!shortcut)return true;
  const target=el.dataset.target,owner=target==='agent'?agentThread(c.state,el.dataset.agent):target==='task'?c.currentTask():c.state;
  if(!owner)return true;
  const key=target==='home'?'homeDraft':'draft',before=String(owner[key]||'');
  const existing=before.indexOf(shortcut.prompt),start=existing>=0?existing:before.length+(before&&!before.endsWith('\n\n')?(before.endsWith('\n')?1:2):0);
  owner[key]=existing>=0?before:before+(before&&!before.endsWith('\n\n')?(before.endsWith('\n')?'\n':'\n\n'):'')+shortcut.prompt;
  c.ui.cvMentionAgent=null;c.ui.cvSkillAgent=null;
  c.save();c.render();
  const inputId=['cv-message','task-prompt','office-prompt'].includes(el.dataset.input)?el.dataset.input:target==='agent'?'cv-message':'task-prompt';
  const input=document.getElementById(inputId);
  if(input){input.value=owner[key];const placeholder=start+shortcut.prompt.indexOf('【');input.focus({preventScroll:true});input.setSelectionRange(placeholder,placeholder+'【主题／项目】'.length);}
  return true;
}
