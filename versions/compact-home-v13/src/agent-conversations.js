// Persistent Agent conversations reference tasks; tasks still own execution and approvals.
import {uid} from './core.js?v=20261026-13.1';
import {initExpertLibrary} from './expert-library.js?v=20261026-13.1';
const personal={id:'personal',name:'小悠',description:'一起想清楚目标，连接资料与专家，把工作推进到交付',icon:'sparkles',source:'个人智能体',version:'v1',pinned:true};
export function agentThread(state,id){state.office.threads||={};return state.office.threads[id]||= {agentId:id,messages:[],draft:'',activeTaskId:null,initialized:false};}
export function addAgentMessage(state,id,role,text,options={}){const thread=agentThread(state,id);if(options.key&&thread.messages.some(m=>m.key===options.key))return null;const m={id:uid('message'),role,text,at:Date.now(),...options};thread.messages.push(m);return m;}
export function focusAgentTask(state,task){const thread=agentThread(state,task.office.agentId);thread.activeTaskId=task.id;thread.newTopic=false;return thread;}
export function selectedAgentTask(state,id){const t=state.tasks.find(t=>t.id===agentThread(state,id).activeTaskId);return t?.office?.agentId===id?t:null;}
export function syncAgentThreads(state){const o=state.office;if(!o)return false;let changed=false;if(!o.agents.some(a=>a.id==='personal')){o.agents.unshift({...personal});changed=true;}initExpertLibrary(state);o.agents.find(a=>a.id==='personal').pinned=true;
  for(const a of o.agents){const thread=agentThread(state,a.id);if(!thread.messages.length){addAgentMessage(state,a.id,'assistant',a.id==='personal'?'我是小悠。你可以直接问我问题，也可以把一件工作交给我。计划、执行和成果会放在右侧，讨论一直留在这里。':`我是${a.name}。${a.description.replace(/[。.!！]+$/,'')}。你可以先问问题、补充背景，再一起推进工作。`,{key:'welcome:'+a.id,kind:'welcome',at:0});changed=true;}}
  for(const task of [...state.tasks].filter(t=>t.office).sort((a,b)=>a.createdAt-b.createdAt)){
    if(!o.agents.some(a=>a.id===task.office.agentId))task.office.agentId='personal';
    const id=task.office.agentId,thread=agentThread(state,id);
    const goal=addAgentMessage(state,id,'user',task.prompt,{key:`task:${task.id}:goal`,taskId:task.id,kind:'goal',at:task.createdAt});if(goal)changed=true;
    const introText='我会先核对目标和现有资料，再安排几个子任务分别处理，最后统一检查和汇总。你可以查看分工，也可以随时补充要求。外部操作会另行确认。',introKey=`task:${task.id}:intro`,introMessage=thread.messages.find(m=>m.key===introKey);if(introMessage){if(introMessage.text!==introText){introMessage.text=introText;changed=true;}}else if(addAgentMessage(state,id,'assistant',introText,{key:introKey,taskId:task.id,kind:'task',at:task.createdAt+1}))changed=true;
    for(const [index,m] of task.messages.entries()){if(index===0||m.role!=='user')continue;if(addAgentMessage(state,id,'user',m.text,{key:`task:${task.id}:message:${index}`,taskId:task.id,at:m.time||task.createdAt+index+2,author:m.text.startsWith('陈语')?'陈语 · 示例同事':undefined}))changed=true;}
    for(const e of task.office.events){if(e.conversationHandled||['goal','step','template'].includes(e.kind)||e.title==='生成小队计划'||e.title==='已退回局部修正')continue;let text=`${e.title}。${e.detail||''}`;
      if(e.kind==='run')text='我已按当前计划开始处理。进度和各角色的交付物会出现在右侧；你可以继续补充要求。';
      if(e.kind==='failure')text=`这里遇到了一个问题：${e.detail} 我保留了已完成的资料和成果，可以从失败步骤继续。`;
      if(e.kind==='delivery')text='本次交付已完成，成果与回执已保留。你可以继续修改，或交给同事接续。';
      if(e.title==='准备操作确认')text=`报告和核对表已准备好，可以在右侧预览。本次拟${task.office.delivery}到「${task.office.target}」，请核对内容后确认。`;
      if(e.title==='已批准本次操作')text=`已记录你对「${task.office.delivery}」的本次批准，适用对象和成果版本见右侧确认记录。`;
      if(e.title==='用户拒绝，操作已停止')text='这次操作已拒绝，相关交付已停止。已有资料与成果保留，调整后可以重新提交确认。';
      const key=`event:${task.id}:${e.id}`,existing=thread.messages.find(m=>m.key===key);if(existing){if(existing.text!==text){existing.text=text;changed=true;}}else if(addAgentMessage(state,id,'assistant',text,{key,taskId:task.id,kind:e.kind,eventTitle:e.title,at:e.at+2}))changed=true;
    }
    if(!thread.initialized)thread.activeTaskId=task.id;
  }
  for(const thread of Object.values(o.threads)){thread.initialized=true;thread.messages.sort((a,b)=>a.at-b.at);if(thread.activeTaskId&&!state.tasks.some(t=>t.id===thread.activeTaskId&&t.office?.agentId===thread.agentId)){thread.activeTaskId=null;changed=true;}}
  return changed;
}
export function classifyAgentMessage(text,task){const value=text.trim();if(/^(按计划执行|采用计划|开始执行|开始吧|执行计划|开始处理)[。！!\s]*$/.test(value)&&task)return 'start';if(/^(暂停|先暂停|停一下)[。！!\s]*$/.test(value)&&task)return 'pause';if(/^(继续|继续执行|恢复执行|恢复连接)[。！!\s]*$/.test(value)&&task)return 'resume';if(/^(同意|批准|确认写回|确认发布|发出去)[。！!\s]*$/.test(value)&&task)return 'approval';if(/你能|什么能力|怎么用|你好|能做什么/.test(value))return 'about';if(task&&/为什么|资料来源|数据来源|用的什么|什么口径|进度|到哪一步|用了.*记忆/.test(value))return 'question';if(task&&/补充|增加|调整|修改|改成|改为|先给|先说|请用|口径|记住|这份|这段/.test(value))return 'refine';if(/调研|研究|复盘|分析|核对|方案|整理|报告|搭建|制作|生成|助手/.test(value))return 'goal';return 'chat';}
