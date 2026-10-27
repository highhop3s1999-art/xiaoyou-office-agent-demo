import {esc} from './core.js';

// Local prototype heuristic. A production implementation can replace this pure
// function with a model result keyed to the completed turn, without changing send.
export function nextMessageSuggestion(owner,task=null){
 const messages=owner?.messages||[],last=messages.at(-1);
 const userIndex=messages.findLastIndex(m=>m.role==='user');
 if(userIndex<0||!last||last.role!=='assistant'||last.kind==='welcome'||messages.length<=userIndex+1)return '';
 if(task?.status==='running'||task?.office?.phase==='running'||last.streaming||last.pending)return '';
 const user=String(messages[userIndex].text||''),reply=String(last.text||''),phase=task?.office?.phase;
 let suggestion;
 if(last.kind==='retrieval-pending'||/尚未.*(?:执行|提交)|未连接真实|等待.*接入/.test(reply))suggestion='先帮我明确需要补充哪些资料，按必需信息和可选信息分开列出，说明每项资料用来回答什么问题。暂时没有权限或无法获取的内容，请标为待补充，不要推测。';
 else if(/^(你好|您好|嗨|hello|hi)[！!。\s]*$/i.test(user))suggestion='你能帮我做哪些工作？请结合日常办公，举几个从接到任务到交付结果的具体例子，说明我需要提供什么信息、你能完成哪些步骤，以及哪些环节需要我确认。';
 else if(phase==='blocked')suggestion='这次卡在哪里，需要我补充什么？请保留已经完成的部分，列出阻塞原因、可行的解决办法和最小补充信息，说明恢复后会从哪一步继续。';
 else if(phase==='review'||phase==='ready'||phase==='approved')suggestion='帮我检查这份结果还有哪些遗漏和风险，重点核对结论是否有依据、数据口径是否一致，以及关键要求是否覆盖。把需要修改的地方按优先级列出，并给出具体建议。';
 else if(phase==='paused')suggestion='总结一下当前进展和接下来的步骤，分别列出已完成的工作、仍待处理的问题和需要我决定的事项。保留关键依据，并建议下一步优先推进哪一项。';
 else if(phase==='plan')suggestion='先帮我梳理这份计划的重点和需要补充的信息，明确每一步的输入、预期产出和完成标准。把依赖我确认或提供资料的地方单独列出，再推荐一个最小可执行的起点。';
 else if(/会议|纪要/.test(user))suggestion='把待办事项、负责人和截止时间整理成表格，同时保留对应的会议结论与依赖关系。没有明确负责人或时间的事项标为待确认，最后列出需要优先跟进的问题。';
 else if(/代码|编程|报错|bug|调试/i.test(user))suggestion='检查一下边界情况，并补充验证方法。重点看空数据、异常输入、权限不足和重复操作时的行为，按影响程度列出问题，给出能够复现和验证修复的具体步骤。';
 else if(/对比|竞品|选型/.test(user))suggestion='结合这些差异，给出推荐方案和取舍理由，说明各方案适合的使用场景、主要限制和实施成本。把已确认的事实与仍需验证的判断分开，最后给出可执行的下一步建议。';
 else if(/数据|分析|复盘/.test(user))suggestion='把关键发现整理成结论和下一步行动，每条结论附上对应依据，区分已经证实的问题与可能的原因。按优先级列出建议行动，以及验证效果时需要关注的数据。';
 else if(/方案|需求|产品|设计/.test(user))suggestion='把方案拆成具体步骤，并标出优先级。说明每一步解决的用户问题、预期交付物和验收标准，补充异常情况与依赖项，并区分首版必须实现和可以后续迭代的内容。';
 else if(/总结|整理|报告|文档/.test(user))suggestion='再精简一下，突出最重要的结论，让第一次阅读的人也能快速理解背景、判断和下一步行动。保留支持结论的关键事实，将尚未确认的信息单独列出，整理成适合直接同步给团队的版本。';
 else if(/能.*(?:做|帮)|可以.*(?:做|帮)/.test(user))suggestion='帮我整理一份今天的工作计划，先明确有哪些待办、截止时间和依赖事项，再按重要性和紧急程度排序。信息不够的地方先列问题，给出可以直接开始的第一步。';
 else suggestion='可以结合一个具体例子展开说说吗？请从实际工作场景出发，说明需要哪些输入、每一步如何处理、最终产出是什么，并提醒我容易遗漏的细节和需要自己确认的地方。';
 // Do not keep recommending the sentence the user has just used.
 return suggestion===user.trim()?'还有哪些容易遗漏的细节？':suggestion;
}
export function suggestionKey(owner,task){const last=owner?.messages?.at(-1);return JSON.stringify([owner?.id,last?.id,last?.text,owner?.messages?.length,task?.status,task?.office?.phase]);}
export function renderFollowupField(textarea,owner,task=null){
 const suggestion=nextMessageSuggestion(owner,task);if(!suggestion)return textarea;
 const field=textarea.replace(/placeholder="[^"]*"/,`placeholder="${esc(suggestion)}" data-next-suggestion="${esc(suggestion)}" data-next-key="${esc(suggestionKey(owner,task))}"`);
 return `<div class="followup-field">${field}<button type="button" class="followup-accept" data-action="followup:accept" aria-label="采纳下一句建议" title="填入建议后可编辑，不会自动发送"><kbd>Tab</kbd><span>采纳建议</span></button></div>`;
}
function currentOwner(input,c){
 if(input.dataset.live==='cv:draft'){
  const thread=c.state.office?.threads?.[input.dataset.conversation];
  if(!thread||thread.agentId!==input.dataset.agent||(c.state.office.activeConversations?.[thread.agentId]||thread.agentId)!==thread.id)return [];
  return [thread,c.state.tasks.find(t=>t.id===thread.activeTaskId)];
 }
 if(input.dataset.live==='local:draft')return [c.state.localAgents?.connections?.[input.dataset.agent]];
 if(input.dataset.live==='chat:draft'){const task=c.currentTask();return [task,task];}
 return [];
}
export function acceptFollowup(input,c){
 if(!input||input.isConnected===false||input.value||c.ui.modal)return false;
 const [owner,task]=currentOwner(input,c),suggestion=nextMessageSuggestion(owner,task);
 if(!suggestion||owner?.draft||suggestion!==input.dataset.nextSuggestion||suggestionKey(owner,task)!==input.dataset.nextKey)return false;
 input.value=suggestion;
 // Reuse the ordinary input path: persist a draft, update send affordance, and
 // preserve selected retrieval scopes. Never call send or reorder assistants.
 input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();input.setSelectionRange(suggestion.length,suggestion.length);return true;
}
export function handleFollowup(action,el,c){if(action!=='followup:accept')return false;acceptFollowup(el.closest('.followup-field')?.querySelector('textarea'),c);return true;}
export function keyFollowup(e,c){if(e.key!=='Tab'||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||!e.target.dataset?.nextSuggestion)return false;if(!acceptFollowup(e.target,c))return false;e.preventDefault();return true;}
