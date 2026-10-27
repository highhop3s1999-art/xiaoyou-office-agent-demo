// Local, deterministic demonstration. No network, timer or external writes.
export const statusLabels={decision:'需要你决定',ready:'成果已备好',working:'办理中',waiting:'等待资料',done:'已完成',ignored:'已忽略'};
export const categoryLabels={data:'数据口径核对',material:'汇报材料准备',review:'方案预审',progress:'项目进展整理'};
const copy=x=>JSON.parse(JSON.stringify(x));
const stamp=()=>Date.now();
const seeds=[
 {id:'sec-data',category:'data',status:'decision',title:'季度汇报的两份数据，口径需要统一',sender:'数据协作同事',channel:'私聊',time:'14:10',due:'今天 17:00 前',sourceId:'demo-message-data-01',source:'这是本季度的业务数据表，麻烦看看汇报能否使用。转化率按自然月统计，另一份复盘材料是滚动 30 天。',done:'已对照两份材料，标出统计周期差异，备好一版可使用的汇报表述。',next:'本次汇报采用哪一个统计周期？',artifact:'数据口径核对与汇报建议',summary:'建议统一采用已完成核验的自然月口径；滚动周期只作附录说明。',pages:[{heading:'结论与建议',paragraphs:['两份材料的分母与统计周期不同，不能将变化直接解释为业务增长。建议主汇报采用自然月口径，并同时写明样本范围。','待你决定：采用自然月口径，还是等待同事补齐滚动周期的可比数据。']},{heading:'口径对照',paragraphs:['材料 A｜自然月｜全量有效样本｜已完成核对，可以引用。','材料 B｜滚动 30 天｜剔除部分渠道｜周期尚未结束，不宜与 A 并列比较。','来源：本演示的《季度数据表》《项目复盘初稿》，未读取真实企业资料。']},{heading:'可直接采用的表述',paragraphs:['本季度按完整自然月统计，展示业务结构与日均变化。跨周期数据暂不作趋势结论，待统一统计范围后补充。']}]},
 {id:'sec-material',category:'material',status:'ready',title:'例会要用的项目材料，已经备好了',sender:'项目协作同事',channel:'私聊',time:'13:42',due:'明天例会前',sourceId:'demo-message-material-01',source:'明天例会需要一页项目进展，麻烦给我主要成果、下一步和一张可以放进 PPT 的团队照片。',done:'已整理一页汇报提纲和回复草稿；照片没有在授权资料中找到，已在草稿中说明。',next:'查看材料，决定是否采用这份私有草稿。',artifact:'例会材料与回复草稿',summary:'核心进展、下一步、待补照片已经整理成可直接接着改的一页材料。',pages:[{heading:'一页汇报提纲',paragraphs:['阶段成果：核心流程进入内部体验；本周聚焦任务承接、成果查看和异常提示三个环节。','下一步：收集试用反馈，优先处理影响交付的中断点，再补齐配置入口。','需要协作：确认体验范围与评审时间，补充可公开使用的团队照片。']},{heading:'给协作同事的回复草稿',paragraphs:['项目进展的一页提纲已备好，包含主要成果、下一步与待协作事项。团队照片暂时没有在当前资料中找到，我确认可用照片后再补。','这是一份私有草稿。未向任何人发送，采用后仍可编辑。']}]},
 {id:'sec-review',category:'review',status:'working',title:'社区共建方案，先帮你做一轮预审',sender:'社区项目组',channel:'群里 @我',time:'13:20',due:'本周内',sourceId:'demo-message-review-01',source:'@我 社区共建方案初稿已更新，请帮忙看一下，尤其是首批试点范围和验收方式。',done:'已提取方案目标和试点范围；正在演示核对目标、行动与验收是否对应。',next:'下一次模拟检查会交付完整预审意见。',artifact:'社区共建方案预审',summary:'建议先跑通一个可复用的案例闭环，再扩大覆盖。',pages:[{heading:'预审中间结果',paragraphs:['当前目标是形成可复用实践，但初稿主要统计分享篇数。需补充“实践采用—问题解决—复用反馈”的链路。','已发现的待核对项：试点是否有明确负责人，案例复用后如何记录效果，未达到预期时如何复盘。']}]},
 {id:'sec-progress',category:'progress',status:'waiting',title:'能力地图更新，缺一份验收记录',sender:'能力地图共建群',channel:'群里 @我',time:'11:05',due:'周四下班前',sourceId:'demo-message-progress-01',source:'@我 请补充负责项目的最新进展和版本记录，周四前完成。本次需要同时确认是否可以从试点进入正式使用。',done:'已起草项目更新和版本记录；缺少正式验收证据，保留“试点中”状态。',next:'补充验收记录后，继续整理状态变更建议。',artifact:'能力地图更新草稿',summary:'已有进展可以先更新，项目状态保持试点中，等待验收资料。',pages:[{heading:'已可更新的内容',paragraphs:['本周进展：完成核心流程试用，问题记录与改进计划已整理。','版本记录：补充交付查看、消息承接和上下文来源说明。']},{heading:'尚缺一项依据',paragraphs:['缺少正式验收记录，不能据此将“试点中”改为“正式使用”。','待补材料应包含验收范围、结论、负责人和日期。资料到达后续办原任务，不重新创建一件。']}]}
];
export function initSecretary(state,now=stamp()){
 if(!state.secretary)state.secretary={version:1,onboarded:false,enabled:false,config:{private:true,mention:true,projects:[],interval:10,start:'10:00',end:'19:50',days:'weekdays',prepare:true},profile:{role:'产品与项目协作',priority:'把需要我拍板的事和已完成的成果交回来',style:'先结论，再依据；保留资料来源'},items:seeds.map((s,i)=>({...copy(s),version:1,snoozedUntil:0,createdAt:now-i*60000,updatedAt:now-i*60000,history:[{at:now-i*60000,text:'载入合成案例，供体验任务承接与交付'}],versions:[{version:1,pages:copy(s.pages)}]})),seenEvents:[],mutedCategories:[],lastCheck:null,lastResult:'尚未执行模拟检查',checks:0};
 return state.secretary;
}
function log(item,text,now){item.updatedAt=now;item.history.push({at:now,text});}
function revision(item,text,now){item.version++;item.versions.push({version:item.version,pages:copy(item.pages)});log(item,text,now);}
export function configureSecretary(s,config,now=stamp()){
 if(!config.private&&!config.mention)return {ok:false,message:'请至少选择私聊或 @我的消息。'};
 if(config.start>=config.end)return {ok:false,message:'结束时间需要晚于开始时间。'};
 s.config={...s.config,...config};s.onboarded=true;s.enabled=true;
 return {ok:true,message:'演示委托已保存，可以模拟检查一次。'};
}
export function isVisible(item,now=stamp()){return !['done','ignored'].includes(item.status)&&!(item.snoozedUntil>now);}
export function checkSecretary(s,now=stamp(),allowedChannels=null){
 if(!s.enabled)return {ok:false,message:'工作秘书已暂停，请先恢复。'};
 s.lastCheck=now;s.checks++;
 // Events are stable identities. Rechecking does not generate another item or revision.
 const review=s.items.find(x=>x.id==='sec-review');
 const event='demo-review-ready-v1';
 if(s.config.mention&&(!allowedChannels||allowedChannels.mentions)&&!s.mutedCategories.includes('review')&&!s.seenEvents.includes(event)&&review.status==='working'){
  review.status='ready';review.done='已完成目标、试点范围和验收标准的预审，整理出三条修改建议与一份回复草稿。';review.next='查看预审意见，采用或带到任务工作区继续修改。';
  review.pages=[{heading:'建议先收敛为一个试点',paragraphs:['首批只选择一个有明确负责人、能观察到使用结果的业务场景。先确认问题与目标，再决定需要多少篇分享。','验收至少包含：案例是否被实际采用、是否减少了原来的操作、其他团队能否复用。']},{heading:'三条可执行的修改',paragraphs:['1. 把“完成分享”改为“完成实践—收集复用反馈”，并安排回访。','2. 首批试点增加负责人、截止时间和必要资料，不扩大到所有团队。','3. 每周保留失败案例与阻塞原因，用来调整下一周的推进方式。']},{heading:'回复草稿',paragraphs:['我建议先选一个明确场景跑通闭环，再扩大试点。初稿可以补上负责人、实践采用结果和复用反馈三项验收依据。详细修改意见已经整理，可一起确认。','合成示例；未实际审阅外部文档，也未发送消息。']}];
  revision(review,'模拟检查：原事项预审完成，交付 v2；未新建重复任务',now);s.seenEvents.push(event);s.lastResult='1 件事有新成果 · 社区方案预审已备好';return {ok:true,changed:1,message:s.lastResult};
 }
 s.lastResult=allowedChannels&&!allowedChannels.private&&!allowedChannels.mentions?'当前所选范围没有可演示的新消息':'没有新的可承接事项 · 已合并重复消息';return {ok:true,changed:0,message:s.lastResult};
}
export function changeSecretaryItem(s,id,action,value='',now=stamp()){
 const item=s.items.find(x=>x.id===id);if(!item)return {ok:false,message:'这件事已不存在。'};
 if(action==='restore'){if(!['done','ignored'].includes(item.status))return {ok:false,message:'这件事仍在推进中。'};item.status=item.previousStatus||'ready';item.snoozedUntil=0;log(item,'用户重新打开此事',now);return {ok:true};}
 if(['done','ignored'].includes(item.status))return {ok:false,message:'这件事已结束，请先重新打开。'};
 if(action==='snooze'){item.snoozedUntil=now+3600000;log(item,'稍后 1 小时：暂时从待处理列表收起',now);}
 else if(action==='unsnooze'){item.snoozedUntil=0;log(item,'用户现在查看此事',now);}
 else if(action==='ignore'){item.previousStatus=item.status;item.status='ignored';log(item,'仅忽略这件事，其他同类事项照常处理',now);}
 else if(action==='mute'){if(!s.mutedCategories.includes(item.category))s.mutedCategories.push(item.category);for(const it of s.items.filter(x=>x.category===item.category&&!['done','ignored'].includes(x.status))){it.previousStatus=it.status;it.status='ignored';log(it,'不再自动承接这类事项；可在委托设置恢复',now);}}
 else if(action==='decide'){
  if(item.status!=='decision')return {ok:false,message:'当前事项不再需要这项决定。'};
  if(value.choice==='wait'){item.status='waiting';item.next='等待补齐可比周期数据，已有口径对照继续保留。';log(item,'用户决定：等待统一口径资料'+(value.note?'；补充：'+value.note:''),now);}
  else {item.status='ready';item.summary='已按你的决定统一为自然月口径，汇报表述和回复草稿均已更新。';item.done='已依据你的决定生成 v'+(item.version+1)+'，保留统计范围与暂不引用的项目。';item.next='查看更新后的草稿，确认是否采用。';item.pages[0].paragraphs=['采用自然月口径；滚动 30 天数据仅在附录列出，不作并列增长比较。','判断依据：自然月数据已核验，滚动周期数据缺少统一范围。'];item.pages.push({heading:'你的决定已合入',paragraphs:[value.note||'按已核验的自然月口径继续。','回复草稿：本次汇报先采用完整自然月数据。滚动周期暂不放在趋势比较中，待范围统一后补充。']});revision(item,'按用户决定准备 v'+(item.version+1)+' 私有草稿，尚未发送',now);}
 }
 else if(action==='supply'){
  if(item.status!=='waiting')return {ok:false,message:'当前没有等待这份资料。'};
  item.status='ready';item.done='演示补充资料已合入，完成更新草稿；状态变更仍由你审核。';item.next='查看补充后的材料，确认是否采用。';item.pages.push({heading:'演示补充资料与续办结果',paragraphs:[item.category==='data'?'补充的可比周期说明已整理。推荐仍以统一范围作为比较前提，不将未核验数字写入结论。':'合成验收记录：首批试点通过核心流程检查，仍需确认使用范围与业务负责人。建议描述为“试点验收完成，准备扩大范围”。','原事项继续推进，没有重复创建任务，也没有修改外部文档。']});revision(item,'收到模拟补充资料，继续原任务并生成新版本',now);
 }
 else if(action==='adopt'||action==='send'){
  if(item.status!=='ready')return {ok:false,message:'先完成所需决定或补齐资料，再采用成果。'};
  item.previousStatus='ready';item.status='done';item.snoozedUntil=0;item.receipt=action==='send'?'模拟发送已确认；未发送任何真实消息':'已采用为私有成果；未发送或改动共享内容';log(item,item.receipt,now);
 }else return {ok:false,message:'未知操作'};
 return {ok:true};
}
