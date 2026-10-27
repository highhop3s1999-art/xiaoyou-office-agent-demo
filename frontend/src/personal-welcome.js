import {esc,icon} from './core.js';
import {createDraftTask} from './personal-draft.js';
import {contextDefinitions,contextReadable} from './personal-context-state.js';

const B=(label,action,cls='',id='',extra='')=>`<button type="button" class="sec-btn ${cls}" data-action="welcome:${action}" ${id?`data-id="${id}"`:''} ${extra}>${label}</button>`;
export const welcomeScenarios=[
 {id:'secretary',icon:'chat',title:'消息太多，怕漏掉事',benefit:'把找你的工作接住，带回来一份可以直接改的草稿。',received:'同事发来消息：“明天例会需要项目进展，能帮忙整理一下吗？”',action:'从示例项目记录里整理已完成的事、当前阻塞和待确认点。',delivered:'一份例会材料草稿，附上可修改的回复。',decision:'你只需确认哪些内容可以对外说，再决定是否回复。',sourceIds:['chat'],sourcePurpose:'先选哪些私聊或 @你的消息值得留意。小悠只在你选定的范围里承接工作。',artifact:'例会材料与回复草稿',pages:[
  {heading:'例会进展 · 合成示例',paragraphs:['已完成：整理了本周用户反馈，归纳出账号登录、资料填写和进度查询三类常见问题。依据：示例反馈清单。','推进中：操作说明初稿已整理好，正在补充常见问题的处理步骤和截图。依据：示例操作说明。','下一步：确认每类问题的跟进人，补齐截图和处理时限，在例会上确定哪些内容可以发布。']},
  {heading:'留给你确认的两件事',paragraphs:['操作说明是先发内部试用，还是补齐所有截图后再发？建议先请两位同事试读，看看步骤是否好理解。','三类问题分别由谁跟进？反馈清单里还缺负责人，建议在例会上确认。']},
  {heading:'可修改的回复',paragraphs:['“例会材料初稿已经整理好了，包含本周用户反馈、操作说明进展，以及两项需要讨论的问题。我会再确认跟进人和缺失截图，再给你最终版本。”','你可以先改这段回复的语气，再决定什么时候发给同事。']}
 ]},
 {id:'weekly',icon:'file',title:'周五又要写周报',benefit:'先把一周的线索整理成稿，把时间留给重点和判断。',received:'本周留下了几条项目记录、一份评审意见和两个未解决的问题。',action:'按已完成、推进中、阻塞和下周安排归拢，保留依据与待补充项。',delivered:'一份有重点、能继续修改的周报草稿。',decision:'你来补充最重要的判断，决定向谁分享。',sourceIds:['local'],sourcePurpose:'可以先用你在小悠中的工作记录整理周报。以后再按需要补充会议或聊天，不必一次选齐。',artifact:'本周工作回顾草稿',pages:[
  {heading:'本周成果 · 合成示例',paragraphs:['已整理本周用户反馈，将重复问题归为三类，并补上问题描述和目前进展。依据：示例反馈清单。','已完成操作说明初稿，补充了账号登录和资料填写的处理步骤。依据：示例操作说明。','已把需要跨团队确认的事项单独列出，方便下一次例会集中讨论。依据：示例例会议题。']},
  {heading:'推进中与阻塞',paragraphs:['推进中：补充操作说明里的截图，并请同事核对处理步骤。','待确认：三类常见问题的跟进人和预计处理时间。','缺失材料：进度查询的页面截图和最新处理规则，需要相关同事补充。']},
  {heading:'下周安排与待你补充',paragraphs:['下周先补齐负责人和缺失材料，更新操作说明，再带到项目例会讨论发布安排。','留给你确认：下周优先解决哪类用户问题？你可以把最重要的一项放到周报开头。','分享前，补上你认为值得让团队知道的进展或风险；草稿里的重点和顺序都可以改。']}
 ]},
 {id:'meeting',icon:'calendar',title:'开会前，总在找资料',benefit:'带着一页简报进入讨论，知道进展在哪、哪些事需要拍板。',received:'日历里有一场“项目例会”，议题是确认常见问题的跟进安排。',action:'把示例会议目标、项目进展和遗留问题排到一页里，缺的资料明确列出来。',delivered:'一份会前简报和三条值得讨论的问题。',decision:'你确认会议重点，补充需要带进讨论的判断。',sourceIds:['calendar'],sourcePurpose:'先选择要关注的日程，让小悠知道哪场会议需要准备。会议原文和项目材料可以之后再补。',artifact:'项目例会会前简报',pages:[
  {heading:'这次会议要解决什么 · 合成示例',paragraphs:['会议：项目例会。目标：确认三类常见问题由谁跟进，以及操作说明什么时候更新。','当前进展：用户反馈已经归类，操作说明有了初稿；进度查询的截图和处理规则还没补齐。依据：示例反馈清单与操作说明。','建议顺序：先过一遍问题清单，再确认负责人和时间，最后决定操作说明的发布安排。']},
  {heading:'建议讨论的三个问题',paragraphs:['哪类问题最需要先解决？建议结合影响人数和处理难度，先定一个共同优先级。','每个问题由谁跟进、什么时候回复？把负责人和下次更新时间直接写进清单。','操作说明是否先给内部同事试读？确认内容无误后，再决定何时对外发布。']},
  {heading:'会前还需要补齐',paragraphs:['尚缺：进度查询的截图、最新处理规则，以及每类问题的跟进人。','留给你：确认本次例会的重点。若有更紧迫的事，可以调整议题顺序。','会后可以沿用这份清单，补上每项决定和下一步，减少再次整理。']}
 ]}
];

const shortDrafts={
 secretary:[['例会进展','已归拢本周用户反馈，操作说明已有初稿；还需补充进度查询截图和处理规则。来源：示例反馈清单、操作说明。'],['需要你决定','请确认三类问题的跟进人，以及操作说明先内部试读还是补齐后发布。'],['回复草稿','“例会材料初稿已备好。跟进人和缺失截图还需确认，确定后我再补进最终版。”']],
 weekly:[['本周完成','已整理用户反馈与常见问题，完成操作说明初稿。来源：示例反馈清单、操作说明。'],['阻塞与缺失','三类问题的负责人和处理时间待定；进度查询截图与最新处理规则尚缺。'],['下周与待你确认','先补齐材料和跟进人，再到例会讨论发布。请你决定哪类用户问题优先解决。']],
 meeting:[['会议目标','确认常见问题的跟进安排与操作说明更新时间。当前已有反馈分类和说明初稿。来源：示例例会议题、反馈清单。'],['会上需要拍板','确认问题优先级、各项负责人和回复时间；决定操作说明是否先内部试读。'],['会前缺失','还缺进度查询截图与最新处理规则。请你确认本次重点，必要时调整议题顺序。']]
};

export function initPersonalWelcome(state){
 if(!state.personalWelcome){const legacy=state.personalContext?.promptPresented;state.personalWelcome={version:1,step:1,scenario:null,invitationSeen:!!legacy,dismissed:!!legacy,visited:false,exampleTasks:{},triedAt:null,sourceJourney:null};}
 return state.personalWelcome;
}
function scenarioFor(w){return welcomeScenarios.find(s=>s.id===w.scenario);}
function linkedTask(state,w){return state.tasks.find(t=>t.id===w.exampleTasks[w.scenario]&&t.personalWelcomeScenario===w.scenario);}
function commit(c){c.save();c.render();}
export function renderWelcomeInvitation(c){
 const w=initPersonalWelcome(c.state);if(c.ui.route==='personal/welcome'||c.ui.route==='personal/context')return '';
 if(!w.invitationSeen){w.invitationSeen=true;c.ui.welcomeInviteOpen=true;if(c.state.personalContext)c.state.personalContext.promptPresented=true;c.save();}
 if(c.ui.welcomeInviteOpen&&!w.dismissed&&!w.visited)return `<section class="context-welcome welcome-invitation"><img src="./assets/xiaoyou.png" alt=""><div><strong>嗨，我是小悠。工作里，有些事可以一起分担。</strong><p>先看看我能帮上什么，再挑一件小事试试。</p></div><div>${B('认识一下小悠','open','primary')}${B('稍后再说','skip-invite','quiet')}</div></section>`;
 if(!w.triedAt)return `<div class="context-gentle welcome-gentle">${icon('sparkles',15)}${w.visited?'想继续刚才的小尝试？进度给你留着。':'不用急着设置，先挑一件小事试试也可以。'}${B(w.visited?'继续认识小悠':'认识一下小悠','open','quiet')}</div>`;
 return '';
}
function steps(w){return `<ol class="welcome-steps" aria-label="认识小悠的进度">${['认识小悠','选件小事','试着交给我'].map((name,i)=>`<li class="${w.step===i+1?'current':w.step>i+1?'passed':''}" ${w.step===i+1?'aria-current="step"':''}><span>${w.step>i+1?icon('check',12):i+1}</span>${name}</li>`).join('')}</ol>`;}
function illustration(){return `<div class="welcome-story"><small>一件小事 · 合成示例</small><p>同事要例会材料 ${icon('arrow',14)} 小悠先整理成稿 ${icon('arrow',14)} 你查看，再决定</p></div>`;}
function sourceStatus(c,s){const enabled=s.sourceIds.filter(id=>contextReadable(c.state,id));return `<p class="welcome-source-status">${enabled.length?'当前可用的演示资料：'+enabled.map(id=>contextDefinitions.find(d=>d.id===id)?.name||id).join('、')+'。可进入能力设置，决定怎样协助。':'还没有为这件事选择可用的资料，可以先用示例试试。'}${enabled.length?' 当前未接入真实服务；示例仍使用合成材料。':''}${enabled.length?B('设置这项协助','adjust','quiet'):''}</p>`;}
function draftBody(task){const f=task.files.find(f=>f.id===task.viewer.active)||task.files[0];return `<article class="welcome-draft-body"><header><span>合成示例 · ${f.version>1?'简短版':'初稿'}</span><small>v${f.version}</small></header>${f.content.pages.map(p=>`<section><h3>${esc(p.heading)}</h3>${p.paragraphs.map(x=>`<p>${esc(x)}</p>`).join('')}</section>`).join('')}</article>`;}

export function renderPersonalWelcome(c){
 const w=initPersonalWelcome(c.state),s=scenarioFor(w),task=s?linkedTask(c.state,w):null;
 const content=w.step===1?`<div class="welcome-intro"><div class="welcome-copy"><span class="welcome-eyebrow">一起，把工作过得从容一点</span><h1>嗨，我是小悠。<br>你的工作，可以有人一起分担。</h1><p>你忙着推进重要的事时，我可以帮你留意找你的消息、准备材料，把整理好的结果带回来。</p><p>不用一次学会所有功能，我们先试一件小事。</p>${B('看看能帮我什么 '+icon('arrow',16),'next','primary')}</div><div class="welcome-visual"><img src="./assets/xiaoyou.png" alt="小悠海豚">${illustration()}</div></div>`:w.step===2?`<header class="welcome-heading"><span class="welcome-eyebrow">从你最想省心的地方开始</span><h1>最近，哪件事最想有人搭把手？</h1><p>选一个眼前的烦恼。以后可以再换，不用一次决定所有事。</p></header><div class="welcome-choices" role="radiogroup" aria-label="选择想先交给小悠的一件事">${welcomeScenarios.map(x=>`<button type="button" role="radio" aria-checked="${w.scenario===x.id}" class="welcome-choice ${w.scenario===x.id?'selected':''}" data-action="welcome:select" data-id="${x.id}"><span class="welcome-choice-top">${icon(x.icon,21)}<i>${w.scenario===x.id?icon('check',13):''}</i></span><strong>${x.title}</strong><span>${x.benefit}</span></button>`).join('')}</div>${s?`<p class="welcome-selection-result" aria-live="polite">${icon('file',17)}先带回来：${s.delivered}</p>`:'<div class="welcome-select-hint">选中一件事，就能知道小悠会带回来什么。</div>'}<footer class="welcome-actions">${B('上一步','back','quiet')}${B('就从这件事开始 '+icon('arrow',16),'next','primary','',!s?'disabled':'')}</footer>`:s?`<header class="welcome-heading"><span class="welcome-eyebrow">${esc(s.title)}</span><h1>${task?'草稿已准备好。':'先试一件小事，'}${task?'':'<br>看看合不合你的习惯。'}</h1><p>${task?'打开看看，哪里不合适都可以继续改。':'用一份示例感受完整过程，也可以选择你希望小悠关注的工作资料。'}</p></header>${task?`<section class="welcome-result" aria-live="polite"><div class="welcome-result-label">${icon('checkCircle',18)}第一份示例草稿已放进任务工作区</div><h2>${esc(s.artifact)}</h2><p>${s.delivered}</p>${draftBody(task)}<small>本地演示 · 私有草稿 · 本次示例没有开启自动协助</small><footer>${B('打开完整工作区 '+icon('arrow',16),'view','primary')}${B(task.welcomeShortened?'已改为简短版':'再简短一点','shorten','','',task.welcomeShortened?'disabled':'')}${B('调整小悠','adjust','quiet')}</footer></section>`:`<section class="welcome-try"><div class="welcome-try-icon">${icon('file',27)}</div><div><span>先用示例，放心试试</span><h2>${s.artifact}</h2><p>${s.delivered} 你会得到一份可打开、修改和下载的本地草稿。</p></div>${B('用示例试一次 '+icon('arrow',16),'try','primary')}</section>`}<section class="welcome-own"><div><strong>也想让小悠了解你的工作？</strong><p>${s.sourcePurpose}</p></div>${B('选择我的工作资料','sources')}</section>${sourceStatus(c,s)}<p class="welcome-boundary">示例不会读取真实资料或开启后台任务。之后是否启用协助，由你决定。</p><footer class="welcome-actions">${B('换一件小事','back','quiet')}${task?B('先回到我的工作','finish','quiet'):B('资料以后再选','skip','quiet')}</footer>`:'';
 return `<section class="personal-welcome"><div class="welcome-topline">${steps(w)}</div>${content}</section>`;
}
export function createWelcomeExample(c){
 const w=initPersonalWelcome(c.state),s=scenarioFor(w);if(!s)return {ok:false,message:'先选一件想试试的小事。'};
 let task=linkedTask(c.state,w);if(task)return {ok:true,task,reused:true};
 task=createDraftTask(c,s.artifact+' · 认识小悠',JSON.parse(JSON.stringify(s.pages)),'personal-welcome',{personalWelcomeScenario:s.id});
 task.prompt=s.received+' 请根据合成示例准备'+s.artifact+'。';task.messages[0].text=task.prompt;
 task.messages.at(-1).text='草稿已准备好。'+s.delivered+' 你可以打开右侧材料、修改内容或下载。这是合成示例，没有读取个人资料、发送消息或开启自动协助。';
 w.exampleTasks[s.id]=task.id;w.triedAt=Date.now();w.step=3;w.dismissed=true;return {ok:true,task,reused:false};
}
export function handlePersonalWelcome(action,el,c){
 if(!action.startsWith('welcome:'))return false;const a=action.slice(8),w=initPersonalWelcome(c.state),s=scenarioFor(w);c.ui.welcomeInviteOpen=false;
 if(a==='open'||a==='restart'){w.visited=true;w.dismissed=false;if(a==='restart')w.step=1;w.sourceJourney=null;c.save();c.go('personal/welcome');}
 else if(a==='skip-invite'){w.dismissed=true;if(c.state.personalContext)c.state.personalContext.guideDecision='deferred';commit(c);}
 else if(a==='skip'||a==='finish'){w.dismissed=true;w.sourceJourney=null;c.save();c.go('personal/capabilities');}
 else if(a==='next'){if(w.step===2&&!s){c.toast('选一件你想先试试的小事。');return true;}w.step=Math.min(3,w.step+1);w.visited=true;commit(c);}
 else if(a==='back'){w.step=Math.max(1,w.step-1);commit(c);}
 else if(a==='select'){if(!welcomeScenarios.some(x=>x.id===el.dataset.id))return true;w.scenario=el.dataset.id;commit(c);}
 else if(a==='try'){const result=createWelcomeExample(c);if(result.ok)commit(c);else c.toast(result.message);}
 else if(a==='shorten'){const task=linkedTask(c.state,w);if(!task||task.welcomeShortened)return true;const version=Math.max(...task.files.map(f=>f.version||1))+1;const pages=shortDrafts[s.id].map(([heading,text])=>({heading,paragraphs:[text]}));const file={id:task.id+'-welcome-short',name:s.artifact+' · 简短版',type:'doc',version,content:{title:s.artifact+' · 简短版',subtitle:'个人助理 · 固定示例修订 · 未调用模型',pages},view:{page:0,zoom:100}};task.files.push(file);task.viewer.active=file.id;task.viewer.tabs.push(file.id);task.welcomeShortened=true;task.messages.push({role:'user',text:'把这份示例再简短一点。',time:Date.now()},{role:'assistant',text:`已按固定示例保留进展、待确认点与缺失材料，整理成简短版，生成 v${version}。初稿保留，可以随时比较；本次没有调用模型。`,time:Date.now()});commit(c);}
 else if(a==='view'){const task=linkedTask(c.state,w);if(task){task.viewer.open=true;c.save();c.go('chat/'+task.id);}else{c.toast('原示例任务已删除，可以重新试一次。');c.render();}}
 else if(a==='sources'){if(!s)return true;w.sourceJourney={scenario:s.id,sourceIds:[...s.sourceIds],purpose:s.sourcePurpose};c.ui.contextNeeded=[];c.ui.contextFocus=s.sourceIds[0];c.ui.contextReturnCapability=null;c.save();c.go('personal/context');}
 else if(a==='return'){w.sourceJourney=null;c.save();c.go('personal/welcome');}
 else if(a==='all-sources'){w.sourceJourney=null;commit(c);}
 else if(a==='adjust'){if(!s)return true;w.sourceJourney=null;c.save();c.go('personal/capabilities',()=>c.handlePersonalHub?.('hub:configure',{dataset:{id:s.id}},c));}
 else return false;return true;
}
