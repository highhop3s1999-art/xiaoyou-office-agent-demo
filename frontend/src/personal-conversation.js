import {splitPersonalReply,startPersonalDelivery,finishPersonalDelivery} from './personal-reply-pacing.js';
import {esc,icon,uid} from './core.js';
import {createDraftTask} from './personal-draft.js';
import {contextReadable,secretaryReadScope} from './personal-context-state.js';
import {changeSecretaryItem,statusLabels} from './secretary-state.js';
import {importPersonalFiles,getPersonalFile,deletePersonalFile,formatAttachmentSize,PERSONAL_ATTACHMENT_LIMITS} from './personal-attachments.js';

const B=(label,action,id='',cls='',extra='')=>`<button type="button" class="sec-btn ${cls}" data-action="talk:${action}" ${id?`data-id="${esc(id)}"`:''} ${extra}>${label}</button>`;
const copy=x=>JSON.parse(JSON.stringify(x));
const taskVersion=t=>`${t.status}:${(t.files||[]).map(f=>f.id+'v'+(f.version||1)).join('|')}`;
const taskRef=t=>({kind:'task',id:t.id,title:t.title});
const itemRef=it=>({kind:'secretary',id:it.id,title:it.title});
const refKey=ref=>ref?ref.kind+':'+ref.id:'';
const sourceKey=(ref,version)=>refKey(ref)+':'+version;
function allVersions(state){const out={};for(const it of state.secretary?.items||[])out['secretary:'+it.id]=String(it.version);for(const t of state.tasks||[])out['task:'+t.id]=taskVersion(t);return out;}
export function initConversation(state){
 state.personal||={};const p=state.personal;p.messages||=[];p.draft??='';p.attachmentDrafts||=[];
 if(!state.personalConversation){
  const legacy=Array.isArray(p.chat)?p.chat:Array.isArray(p.chat?.messages)?p.chat.messages:[];
  const identity=m=>[m.role,m.text??m.content,m.time??m.timestamp].join('|');const known=new Set(p.messages.map(identity));
  for(const m of legacy){if(!known.has(identity(m))){p.messages.push({role:m.role==='user'?'user':'assistant',text:String(m.text??m.content??''),time:m.time??m.timestamp??Date.now(),...(m.taskId?{reference:{kind:'task',id:m.taskId}}:{})});known.add(identity(m));}}
  if(!p.draft&&typeof p.chat?.draft==='string')p.draft=p.chat.draft;
  state.personalConversation={version:1,reference:null,observed:allVersions(state),seen:[],delegations:{},snoozes:{},demoCursor:0};
 }
 for(const m of p.messages){m.id||=uid('talk');m.time||=Date.now();m.text??=String(m.content??'');}
 return state.personalConversation;
}
export function resolveConversationRef(state,ref){if(!ref)return null;return ref.kind==='secretary'?(state.secretary?.items||[]).find(x=>x.id===ref.id)||null:ref.kind==='task'?(state.tasks||[]).find(x=>x.id===ref.id)||null:null;}
function append(state,text,extra={}){const m={id:uid('talk'),role:'assistant',text,time:Date.now(),...extra};state.personal.messages.push(m);return m;}
function eventMessage(state,ref,version,manual=false){
 const v=initConversation(state),object=resolveConversationRef(state,ref),key=sourceKey(ref,version);if(!object||v.seen.includes(key))return null;
 const secretary=ref.kind==='secretary',text=secretary?(object.status==='decision'?`这件事已经整理到需要你做选择的地方了。${object.next}`:`我把可以先准备的部分整理好了。${object.done}`):object.status==='paused'?`《${object.title}》停在了这里，已有内容还在。你可以看看进展，或接着告诉我怎么做。`:`《${object.title}》有了可查看的成果。可以先看看，再一起改到合适。`;
 const m=append(state,text,{kind:'event',unread:secretary?object.status==='ready':object.status==='complete',reference:{...ref,title:object.title},eventKey:key,sourceVersion:version,sourceLabel:secretary?'工作秘书 · 合成事项':object.personalCapability?'能力试运行 · 本地演示':'已有本地任务',demo:secretary||!!object.personalCapability||!!object.personalDemo||object.origin==='personal-welcome',manualPreview:manual});
 v.seen.push(key);v.observed[refKey(ref)]=version;return m;
}
export function reconcileConversation(state,now=Date.now()){
 const v=initConversation(state),versions=allVersions(state),paused=!!state.personalHub?.paused,scope=secretaryReadScope(state);let changed=false;
 for(const it of state.secretary?.items||[]){const ref=itemRef(it),key=refKey(ref),version=String(it.version),newVersion=v.observed[key]!==version;
  if(newVersion&&!paused&&state.secretary.enabled&&['ready','decision'].includes(it.status)&&!(it.snoozedUntil>now)&&!(v.snoozes[key]>now)&&!state.secretary.mutedCategories.includes(it.category)&&(it.channel==='私聊'?scope.private:scope.mentions)){changed=!!eventMessage(state,ref,version)||changed;}
 }
 for(const t of state.tasks||[]){const ref=taskRef(t),key=refKey(ref),version=taskVersion(t),eligible=!['sample','duplicate','personal-welcome'].includes(t.origin)&&!t.personalNote&&!t.personalDemo&&['complete','paused'].includes(t.status);
  if(eligible&&v.observed[key]!==version&&!paused&&contextReadable(state,'local')&&!(v.snoozes[key]>now))changed=!!eventMessage(state,ref,version)||changed;
 }
 // Observe even while paused or outside readable scope. Resuming does not invent catch-up work.
 v.observed=versions;return changed;
}
function referenceCard(c,m){const object=resolveConversationRef(c.state,m.reference),ref=m.reference,key=refKey(ref),deferred=initConversation(c.state).snoozes[key]>Date.now();
 if(!object)return `<div class="talk-source missing"><span>${esc(ref.title||'关联事项')}</span><p>原事项已移除。这段对话会保留，你可以取消引用或换一件事。</p></div>`;
 if(!['event','receipt'].includes(m.kind))return `<div class="talk-message-links">${B('查看这件事 '+icon('arrow',13),'open',m.id,'quiet')}</div>`;
 const secretary=ref.kind==='secretary',files=secretary?null:object.files||[],label=secretary?statusLabels[object.status]:object.personalConversationStatus==='waiting_input'?'准备提纲已备好 · 等你补充资料':object.status==='complete'?'本地成果已备好':object.status==='paused'?'任务已暂停':'办理中';
 return `<article class="talk-source ${deferred?'deferred':''}"><div class="talk-source-meta"><span>${esc(m.sourceLabel||(secretary?'工作秘书 · 合成事项':'关联任务'))}</span><small>${esc(label)}</small></div><h3>${esc(object.title)}</h3>${deferred?`<p>稍后处理 · ${new Date(initConversation(c.state).snoozes[key]).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 后在打开页面时恢复展示</p>`:`<p>${esc(secretary?object.artifact:files.map(f=>f.name).slice(-2).join('、')||'原任务与交办要求已保留')}</p>`}<footer>${B(deferred?'现在看看':secretary?'查看事项与成果':'查看任务与成果',deferred?'now':'open',m.id,'primary')}${B('聊这件事','quote',m.id)}${!deferred?B('稍后处理','later',m.id,'quiet'):''}</footer></article>`;
}
function message(c,m){
 const assistant=m.role!=='user',parts=assistant?splitPersonalReply(m.text):[],shown=c.ui.talkDelivery?.shown[m.id],complete=shown===undefined||shown>=Math.max(1,parts.length);
 if(assistant&&shown===0)return '';
 const content=assistant?`<div class="talk-bubbles">${parts.slice(0,shown??parts.length).map(text=>`<div class="talk-text talk-bubble">${esc(text).replace(/\n/g,'<br>')}</div>`).join('')}</div>`:m.text?`<div class="talk-text">${esc(m.text).replace(/\n/g,'<br>')}</div>`:'';
 return `<article class="talk-message ${assistant?'assistant':'user'}" data-talk-id="${esc(m.id)}"><div class="talk-message-meta"><span>${assistant?'小悠':'我'}${m.demo?' · 合成示例':''}${m.manualPreview?' · 由你点击体验':''}</span><time>${new Date(m.time).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></div>${m.reference&&!assistant?`<div class="talk-inline-reference">${icon('link',13)}${esc(m.reference.title||'引用的事项')}</div>`:''}${content}${complete?`${attachmentChips(m.attachments)}${m.reference&&assistant?referenceCard(c,m):''}${m.actions?`<div class="talk-message-links">${m.actions.map(a=>B(a.label,a.action,a.id||'','quiet')).join('')}</div>`:''}`:''}</article>`;
}
function conversationMessages(c){const p=c.state.personal;return `${!p.messages.length?'<div class="talk-welcome"><h1>嗨，想聊点什么？</h1></div>':p.messages.map(m=>message(c,m)).join('')}${c.ui.talkDelivery?'<div class="talk-typing" role="status" aria-label="小悠正在输入"><span aria-hidden="true"><i></i><i></i><i></i></span><small>小悠正在输入</small></div>':''}`;}
function paceReplies(c,messages){
 if(typeof document==='undefined')return;
 startPersonalDelivery(c,messages,()=>{
  const scroll=document.querySelector('.talk-scroll'),stack=scroll?.querySelector('.talk-stack');if(!stack)return;
  const follow=scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight<70,top=scroll.scrollTop;
  stack.innerHTML=conversationMessages(c);
  scroll.scrollTop=follow?scroll.scrollHeight:top;
 });
}
function attachmentChips(files=[],draft=false){return files.length?`<div class="talk-attachments ${draft?'draft':''}">${files.map(f=>`<div class="talk-file-chip"><button type="button" data-action="talk:file-preview" data-id="${esc(f.id)}" title="预览 ${esc(f.name)}">${icon(f.mime?.startsWith('image/')?'image':'file',16)}<span><strong>${esc(f.name)}</strong><small>${formatAttachmentSize(f.size)}</small></span></button>${draft?B(icon('close',12),'file-remove',f.id,'quiet',`aria-label="移除附件 ${esc(f.name)}"`):''}</div>`).join('')}</div>`:'';}
export function renderConversation(c){const v=initConversation(c.state),p=c.state.personal,ref=v.reference,resolved=resolveConversationRef(c.state,ref);return `<section class="personal-conversation" aria-label="我和小悠的长期对话"><div class="talk-scroll" tabindex="0" aria-label="对话记录"><div class="talk-stack">${conversationMessages(c)}</div></div><footer class="talk-compose-wrap"><form class="talk-composer" data-form="talk:message" data-identity="${c.ui.talkFormRevision||0}">${ref?`<div class="talk-reference"><span>${icon('link',14)}${esc(resolved?.title||ref.title||'原事项已移除')}${!resolved?' · 已移除':''}</span>${B(icon('close',14),'unquote','','quiet','aria-label="取消事项引用"')}</div>`:''}${attachmentChips(p.attachmentDrafts,true)}<div class="talk-input-row"><button type="button" class="talk-attach" data-action="talk:attach" aria-label="添加附件" title="添加附件" ${c.ui.talkAttaching?'disabled':''}>${icon('plus',20)}</button><textarea id="personal-talk-input" data-live="talk:draft" name="message" rows="1" maxlength="4000" placeholder="和小悠聊聊…" aria-label="和小悠聊天" style="height:${Math.min(120,Math.max(26,p.draft.split('\n').length*26))}px">${esc(p.draft)}</textarea><button type="submit" class="talk-send" aria-label="发送给小悠" ${c.ui.talkAttaching?'disabled':''}>${icon('send',17)}</button></div></form><div class="talk-compose-caption">${c.ui.talkAttaching?'正在添加附件…':'本地演示'}</div></footer></section>`;}

export async function addConversationFiles(c,files,options={}){
 initConversation(c.state);if(c.ui.talkAttaching)return;
 const room=PERSONAL_ATTACHMENT_LIMITS.count-c.state.personal.attachmentDrafts.length;
 if(room<=0){c.toast('每条消息最多添加 5 个附件');return;}
 const selected=Array.from(files||[]);if(!selected.length)return;
 c.ui.talkAttaching=true;c.render();
 try{const result=await importPersonalFiles(selected.slice(0,room),options);c.state.personal.attachmentDrafts.push(...result.attachments);c.save();
  const errors=result.errors.map(e=>`${e.name}：${e.message}`);if(selected.length>room)errors.push('每条消息最多 5 个附件，其余文件未添加');
  if(errors.length)c.toast(errors.join('；'));else if(result.attachments.length)c.toast(`已添加 ${result.attachments.length} 个附件，保存在本浏览器`);
 }catch{c.toast('附件未能保存，请重试');}
 finally{c.ui.talkAttaching=false;c.render();c.focusTalk?.();}
}
function findAttachment(c,id){return c.state.personal.attachmentDrafts.find(f=>f.id===id)||c.state.personal.messages.flatMap(m=>m.attachments||[]).find(f=>f.id===id);}
async function previewAttachment(c,id){const f=findAttachment(c,id);if(!f)return;
 try{const blob=await getPersonalFile(id);if(c.ui.talkAttachmentURL){URL.revokeObjectURL(c.ui.talkAttachmentURL);c.ui.talkAttachmentURL=null;}
  let content=f.textPreview!==undefined?`<pre class="talk-file-preview-text">${esc(f.textPreview)}</pre><small>文本预览最多显示 30,000 字符</small>`:'<p>附件已保存在本浏览器，下载后即可查看。</p>';
  if(blob&&f.mime?.startsWith('image/')){c.ui.talkAttachmentURL=URL.createObjectURL(blob);content=`<img class="talk-file-preview-image" src="${esc(c.ui.talkAttachmentURL)}" alt="${esc(f.name)}">`;}
  if(!blob)content='<p>这份附件的原文件已不在浏览器中，请重新添加。</p>';
  c.modal(f.name,`<div class="talk-file-preview"><p class="talk-file-meta">本地附件 · ${formatAttachmentSize(f.size)}</p>${content}<div class="form-actions">${blob?B(icon('download',15)+' 下载附件','file-download',id):''}</div></div>`,{wide:!!blob&&f.mime?.startsWith('image/')});
 }catch{c.toast('暂时无法读取附件，请重试');}
}
async function downloadAttachment(c,id){const f=findAttachment(c,id);if(!f)return;try{const blob=await getPersonalFile(id);if(!blob){c.toast('原附件已不可用，请重新添加');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{c.toast('下载未完成，请重试');}}

function markCurrentSeen(state,ref){const v=initConversation(state),o=resolveConversationRef(state,ref);if(!o)return;const version=ref.kind==='secretary'?String(o.version):taskVersion(o),key=sourceKey(ref,version);if(!v.seen.includes(key))v.seen.push(key);v.observed[refKey(ref)]=version;}
function reviseReference(state,ref,text){
 const object=resolveConversationRef(state,ref);if(!object)return '原事项已移除，没有修改任何内容。你可以取消引用，或换一件事。';
 const secretary=ref.kind==='secretary',file=secretary?null:[...(object.files||[])].reverse().find(f=>f.type==='doc'&&Array.isArray(f.content?.pages)),pages=secretary?object.pages:file?.content.pages;if(!pages)return '这件任务还没有可以直接改的文档。可以先打开原任务，补充材料或具体要求。';
 const shorten=/简短|精简|压缩|短一点|短点/.test(text),match=text.match(/第([一二三123])(?:点|部分).*?(?:改成|改为|换成)[：:\s]*(.+)/),ordinal=match?({'一':0,'二':1,'三':2,'1':0,'2':1,'3':2}[match[1]]):null;
 if(!shorten&&!match)return `我们还在聊《${object.title}》。想把哪一点改成什么？可以直接说“第二点改成……”；我会沿用这件事，不另建任务。`;
 const editKey=shorten?'shorten':text.trim(),current=secretary?String(object.version):file.id+':'+file.version;if(object.conversationEdit?.key===editKey&&object.conversationEdit.version===current)return '这个修改已经在最新版本里了，可以直接查看；没有重复生成版本。';
 const next=copy(pages);if(shorten){for(const p of next){const important=p.paragraphs.filter(x=>/待|缺|确认|决定|阻塞|负责人/.test(x));p.paragraphs=[...new Set([p.paragraphs[0],...important])].filter(Boolean);}}else {if(!next[ordinal])return '草稿里没有对应的部分。可以先打开成果，看看要改哪一段。';next[ordinal].paragraphs=[match[2].trim()];}
 if(JSON.stringify(next)===JSON.stringify(pages)){object.conversationEdit={key:editKey,version:current};return '这份草稿已经保留了必要重点和待确认项，再压缩会丢信息。你也可以直接指定某一点要怎么改。';}
 if(secretary){object.version++;object.pages=next;object.versions.push({version:object.version,pages:copy(next)});object.updatedAt=Date.now();object.history.push({at:object.updatedAt,text:'在我和小悠中按明确要求修订私有草稿 · 本地规则演示'});object.conversationEdit={key:editKey,version:String(object.version)};}
 else {const version=(file.version||1)+1,newFile={...copy(file),id:uid('talk-file'),version,updatedAt:Date.now(),name:file.name.replace(/ · 对话修订 v\d+$/,'')+' · 对话修订 v'+version,content:{...copy(file.content),pages:next}};object.files.push(newFile);object.viewer={...object.viewer,active:newFile.id,open:true,tabs:[...new Set([...(object.viewer?.tabs||[]),newFile.id])]};object.conversationEdit={key:editKey,version:newFile.id+':'+newFile.version};object.messages.push({role:'assistant',text:'长期对话中的修订已合入新版本；旧稿保留。',time:Date.now()});}
 return shorten?'已把这份草稿收短，保留待确认点和缺失材料。旧稿还在。这次是本地规则演示，没有调用模型。':'已按你给的文字更新对应部分，沿用原事项并保留旧稿。这次是本地规则演示。';
}
function attachToWork(state,ref,attachments){const object=resolveConversationRef(state,ref);if(!object||!attachments.length)return 0;const add=target=>{target.context||=[];let count=0;for(const f of attachments)if(!target.context.some(r=>r.id===f.id)){target.context.push({...f,type:'file',text:f.textPreview||'本地附件；当前格式未解析正文。',source:'用户选择 · 本浏览器，未上传',status:f.textPreview!==undefined?'文本预览已读取':'原文件已保存',snapshotAt:Date.now()});count++;}return count;};const count=add(object);if(ref.kind==='secretary'){const task=state.tasks.find(t=>t.id===object.workspaceTaskId);if(task)add(task);if(count)object.history.push({at:Date.now(),text:`用户在对话中补充 ${count} 份附件；尚未重新生成草稿`});}return count;}
export function sendConversation(c,raw){const text=String(raw||'').trim(),state=c.state,v=initConversation(state);if(c.ui.talkAttaching){c.toast('附件还在添加，请稍等一下');return false;}const attachments=copy(state.personal.attachmentDrafts);if(!text&&!attachments.length)return false;finishPersonalDelivery(c.ui);const request=text.replace(/^(?:另外|换件事|新任务)[，,：:\s]*/,'');if(request!==text)v.reference=null;const ref=v.reference?copy(v.reference):null;state.personal.messages.push({id:uid('talk'),role:'user',text,time:Date.now(),...(attachments.length?{attachments}:{}),...(ref?{reference:ref}:{})});state.personal.draft='';state.personal.attachmentDrafts=[];
 const linked=attachToWork(state,ref,attachments);
 const reply=(t,extra={})=>append(state,t,extra);
 if(!text){reply(linked?`已把 ${linked} 份附件补到《${ref.title}》的资料里。原任务和草稿保留，尚未重新生成内容。`:ref?'附件保存在这段对话里；原事项已移除，没有创建替代任务。':'附件已经放在这段对话里。希望我帮你整理、修改，还是提炼重点？当前演示可以预览附件，尚未接入模型处理。',linked?{reference:ref}:{});}
 else if(/^暂停(?:自动工作|主动协助|助理)?[。！!]?$/u.test(text)){state.personalHub.paused=true;reply('自动工作已暂停。我们仍可以聊天；如果你明确交办一件事，我也可以接下来。已有成果会保留。');}
 else if(/^恢复(?:自动工作|主动协助|助理)?[。！!]?$/u.test(text)){state.personalHub.paused=false;reply('已恢复自动工作。后续只会按你已开启的能力和资料范围处理。');}
 else if(ref){const object=resolveConversationRef(state,ref);if(!object)reply('原事项已移除，我没有创建替代任务。这段对话会保留，你可以取消引用或换一件事。');
  else if(linked){reply(`已把 ${linked} 份附件补到这件事的资料里，也保留了你的说明。当前演示未调用模型，原草稿未重新生成。`,{reference:ref});}
  else if(/简短|精简|压缩|短一点|短点|第[一二三123](?:点|部分).*改/.test(text)){reply(reviseReference(state,ref,text),{reference:ref});markCurrentSeen(state,ref);}
  else if(/就按这个|采用.*草稿|按.*建议.*来/.test(text)&&ref.kind==='secretary'){const result=object.status==='decision'?changeSecretaryItem(state.secretary,object.id,'decide',{choice:'natural',note:'在长期对话中确认采用当前建议'}):object.status==='ready'?changeSecretaryItem(state.secretary,object.id,'adopt'):null;reply(result?.ok?'已按当前建议继续，记录在原事项里。没有对外发送或修改共享内容。':'这件事还需要补充资料或已经处理过了；原事项和草稿都保留着。',{reference:ref});markCurrentSeen(state,ref);}
  else if(/进展|怎么样|到哪|查看|现在|完成/.test(text)){reply(ref.kind==='secretary'?`${object.done}\n下一步：${object.next}`:`《${object.title}》${object.personalConversationStatus==='waiting_input'?'已经备好准备提纲，仍需要你补充实际资料':object.status==='complete'?'已有本地成果':object.status==='paused'?'目前暂停，已有内容保留':'还在办理'}。${object.files?.length?'现有 '+object.files.length+' 份文件可以查看。':''}`,{reference:ref});}
  else reply(`我们继续聊《${object.title}》。${/就按这个/.test(text)?'已保留你的选择，现有资料不足的部分仍待补充。':'你可以补充要改的内容；这个演示支持“看看进展”“再短一点”或“第二点改成……”。'}`,{reference:ref});
 }
 else if(/(?:今天|最近).*(?:留意|进展|成果|工作)|已有任务/.test(text)){const tasks=state.tasks.filter(t=>t.origin!=='sample'&&!t.personalNote).slice(0,3);if(tasks.length){reply('这里有几件已经在小悠中的工作。选一件“聊这件事”，我们就沿着它继续。');for(const t of tasks)reply(t.personalConversationStatus==='waiting_input'?'准备提纲已留好，还需要补充实际资料。':`《${t.title}》的记录与成果在这里。`,{reference:taskRef(t)});}else reply('目前还没有新的本地工作需要回报。可以先交办一件具体的事。');}
 else if(/^(?:请)?(?:帮我|替我|请你|交给你|给我)(?:.*)(?:整理|起草|准备|写|做|生成)/.test(request)&&/周报|例会|会议|提纲|计划|清单|说明|总结|草稿|材料/.test(text)){
  const normalized=text.replace(/\s+/g,' ')+(attachments.length?'|files:'+attachments.map(f=>f.id).join(','):''),prior=state.tasks.find(t=>t.id===v.delegations[normalized]);let t=prior;
  if(!t){const label=/周报/.test(text)?'周报':/例会|会议/.test(text)?'例会材料':/计划/.test(text)?'工作计划':'工作材料';t=createDraftTask(c,label+' · 起草准备',[{heading:'这次交办',paragraphs:[text]},{heading:'准备提纲',paragraphs:['先列已完成的工作与依据，再列推进中事项、阻塞和下一步。','把需要本人决定的问题单独列出来，避免混在进展里。']},{heading:'需要补充的材料',paragraphs:['请在这件任务中补充实际工作记录、接收对象与希望完成的时间。','当前仅准备了提纲，没有用合成内容代替你的真实工作。']}],'personal-conversation',{personalConversationStatus:'waiting_input'});t.status='paused';t.progress=0;t.prompt=text;t.messages[0].text=text;t.messages.at(-1).text='已保存你的交办要求，准备提纲可查看。请补充实际材料后继续；当前未调用模型。';v.delegations[normalized]=t.id;}
  attachToWork(state,taskRef(t),attachments);
  v.reference=taskRef(t);reply(prior?'这件事已经有原任务，我把它接回来了，可以继续补充。':'接下来了。我先保存了要求和准备提纲，实际内容还需要你补充资料。后续就在这件事里继续。',{kind:'receipt',reference:taskRef(t)});markCurrentSeen(state,taskRef(t));
 }
 else if(/帮我|替我|请你|给我/.test(text)){reply('这件事超出了当前演示能直接处理的范围，我没有替你建立无关任务。可以给出具体材料与要交付的结果，或在普通任务工作区继续。',{actions:[{label:'打开普通任务工作区',action:'manual'}]});}
 else if(/你好|嗨|在吗|hello/i.test(text)){reply('我在。想先聊聊手头的事，还是接着改一份草稿？');}
 else if(/记住|记忆|偏好/.test(text)){reply('这句话留在我们的对话里了。长期偏好仍由你在记忆设置中确认，可以随时修改或删除。',{actions:[{label:'看看我的记忆',action:'memory'}]});}
 else reply('可以接着说，你现在最想理清的是什么？这个演示还没接入模型；已有草稿和具体交办可以继续处理。');
 return true;
}
export function handleConversation(action,el,c){if(!action.startsWith('talk:'))return false;const a=action.slice(5),v=initConversation(c.state),m=c.state.personal.messages.find(m=>m.id===el.dataset.id);
 if(a==='attach'){const input=document.createElement('input');input.type='file';input.multiple=true;input.onchange=()=>{void addConversationFiles(c,input.files);};input.click();}
 else if(a==='file-preview'){void previewAttachment(c,el.dataset.id);}
 else if(a==='file-download'){void downloadAttachment(c,el.dataset.id);}
 else if(a==='file-remove'){const id=el.dataset.id;c.state.personal.attachmentDrafts=c.state.personal.attachmentDrafts.filter(f=>f.id!==id);c.save();c.render();void deletePersonalFile(id).catch(()=>{});}
 else if(a==='more'){c.popover?.(el,`<div class="popover-label">个人助理</div>${B(c.state.personalHub.paused?'恢复自动工作':'暂停自动工作','pause')}${B('体验一条合成主动消息','demo')}<button type="button" class="sec-btn" data-action="welcome:restart">认识小悠</button><button type="button" class="sec-btn" data-action="hub:about">演示范围</button>`,240);}
 else if(a==='quote'){if(!m?.reference||!resolveConversationRef(c.state,m.reference)){c.toast('原事项已移除，可以换一件事');return true;}v.reference=copy(m.reference);c.save();c.render();c.focusTalk?.();}
 else if(a==='unquote'){v.reference=null;c.save();c.render();c.focusTalk?.();}
 else if(a==='open'){if(!m?.reference||!resolveConversationRef(c.state,m.reference)){c.toast('原事项已移除，对话记录仍保留');return true;}if(m.reference.kind==='secretary')c.handleSecretary?.('sec:detail',{dataset:{id:m.reference.id}},c);else c.go('chat/'+m.reference.id);}
 else if(a==='later'||a==='now'){if(!m?.reference)return true;v.snoozes[refKey(m.reference)]=a==='later'?Date.now()+3600000:0;c.save();c.render();}
 else if(a==='demo'){const items=(c.state.secretary?.items||[]).filter(it=>['decision','ready'].includes(it.status));const it=items.find(it=>!v.seen.includes(sourceKey(itemRef(it),String(it.version))));if(it){const message=eventMessage(c.state,itemRef(it),String(it.version),true);if(message)paceReplies(c,[message]);c.save();c.ui.talkScrollBottom=true;c.render();}else c.toast('当前合成事项已经展示过，后续版本变化会沿用原事项');}
 else if(a==='pause'){c.state.personalHub.paused=!c.state.personalHub.paused;c.save();c.render();}
 else if(a==='suggest'){const text=['今天有什么需要我留意？','帮我准备一份例会提纲','我想先聊聊工作安排'][Number(el.dataset.id)];if(text){c.state.personal.draft=text;c.ui.talkFormRevision=(c.ui.talkFormRevision||0)+1;c.save();c.render();c.focusTalk?.();}}
 else if(a==='manual')c.go('home');else if(a==='memory')c.go('settings/memory');else return false;return true;
}
export function submitConversation(name,form,c){if(name!=='talk:message')return false;const field=form.elements?.namedItem('message'),text=field?.value??new FormData(form).get('message'),before=c.state.personal?.messages?.length||0;if(sendConversation(c,text)){paceReplies(c,c.state.personal.messages.slice(before).filter(m=>m.role==='assistant'));if(field)field.value='';c.ui.talkFormRevision=(c.ui.talkFormRevision||0)+1;c.ui.talkScrollBottom=true;c.save();c.render();c.focusTalk?.();}return true;}
export function inputConversation(el,c){if(el.dataset.live!=='talk:draft')return false;initConversation(c.state);c.state.personal.draft=el.value;if(el.style){el.style.height='26px';el.style.height=Math.min(120,Math.max(26,el.scrollHeight||26))+'px';}c.save();return true;}
export function conversationEnter(event){return event.key==='Enter'&&!event.isComposing&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey;}
