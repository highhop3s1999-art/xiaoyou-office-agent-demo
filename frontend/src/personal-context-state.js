// Read scope is independent of app connection, capability enablement and write permission.
export const contextDefinitions=[
 {id:'meetings',name:'飞书会议',app:'calendar',icon:'file',purpose:'用会议记录还原结论、行动项和未决问题，为周报与会前准备提供依据。',scopeLabel:'只读取这些项目的会议记录',choices:[['selected-projects','已选择项目的会议'],['attended','我参与且有权访问的会议']],sample:'合成会议记录：项目评审决定先验证一个场景；需补充验收依据，并明确负责人。'},
 {id:'calendar',name:'飞书日历',app:'calendar',icon:'calendar',purpose:'知道近期有哪些会议、何时开始和需要准备什么，不默认读取全部共享日历。',scopeLabel:'选择日历范围',choices:[['mine','我的工作日历'],['selected-projects','已选择项目的会议日程']],sample:'合成日程：明天 10:00 项目评审，目标是确认试点范围和下一步安排。'},
 {id:'chat',name:'飞书聊天',app:'feishu',icon:'chat',purpose:'识别私聊与 @我的工作请求，承接任务；同一事项的追问与补充持续关联。',scopeLabel:'选择需要留意的消息',choices:[['private','发给我的私聊'],['mentions','群里 @我的消息'],['selected-groups','我明确选择的群']],sample:'合成消息：请帮忙核对汇报中的统计周期，并在例会前准备一页结论。'},
 {id:'artnova',name:'Artnova 数据',app:'artnova',icon:'chart',purpose:'为数据分析、指标核对和汇报提供用户选定的报表与指标，不扩大到整个数据平台。',scopeLabel:'选择报表与指标范围',choices:[['report-list','我选定的报表'],['metric-list','我选定的指标']],sample:'合成数据结构：报表名称、指标定义、统计周期、筛选条件、更新时间。示例不含真实业务数字。'},
 {id:'todo',name:'飞书待办',app:'feishu',icon:'checkCircle',purpose:'汇集需要我负责的工作，与小悠任务保持关联；读取不代表可以回写完成状态。',scopeLabel:'选择待办范围',choices:[['assigned','分配给我的待办'],['created','我创建的待办']],sample:'合成待办：补充试点验收记录；状态待处理。生成草稿不会改变这条飞书待办。'},
 {id:'mail',name:'邮件',app:'mail',icon:'mail',purpose:'从选定文件夹提取工作请求与资料，准备摘要或回复草稿，不自动发送邮件。',scopeLabel:'选择邮件文件夹',choices:[['inbox','收件箱'],['work','指定工作文件夹']],sample:'合成邮件：项目材料已更新，请确认评审前还缺哪些资料。附件仅展示占位说明。'},
 {id:'local',name:'本地 Agent 对话与产物',app:null,icon:'folder',purpose:'复用你在小悠中已经交办的任务和成果，让日记、周报和后续任务知道已有进展。',scopeLabel:'选择当前浏览器中的内容',choices:[['tasks','任务与对话'],['artifacts','已生成的产物']],sample:'仅当前浏览器已有的小悠任务与产物，不扫描磁盘、不读取其他 Agent 应用。'}
];
export function initPersonalContext(state){
 state.personalContext||={version:1,promptPresented:false,guideDecision:null,sources:{}};
 for(const d of contextDefinitions)state.personalContext.sources[d.id]||={enabled:d.id==='local',authorized:d.id==='local',scope:d.id==='local'?['tasks','artifacts']:[],selection:'',configured:d.id==='local',status:'idle',lastDemoReadAt:null,revision:0};
 return state.personalContext;
}
export function requiredContext(id,sources=[]){
 if(id==='secretary')return ['chat'];
 if(id==='weekly')return [...(sources.includes('meetings')?['meetings']:[]),...(sources.includes('chats')?['chat']:[]),...(sources.includes('tasks')?['local']:[])];
 if(id==='meeting')return ['calendar'];
 if(id==='practices')return sources.includes('tasks')?['local']:[];
 return [];
}
export function contextReadable(state,id){if(!state.personalContext)return true;const s=state.personalContext.sources[id];return !!(s?.enabled&&s.authorized&&s.scope.length&&s.status!=='error');}
export function contextCoverage(state,id,sources){
 if(!state.personalContext)return [];
 const selected=sources||state.personalHub?.capabilities?.[id]?.sources||[];
 const inputs=id==='meeting'?[...requiredContext(id,selected),...(selected.includes('meetings')?['meetings']:[])]:requiredContext(id,selected);
 return inputs.filter(key=>!contextReadable(state,key));
}
export function missingContextFor(state,id,sources){
 if(!state.personalContext)return [];
 const selected=sources||state.personalHub?.capabilities?.[id]?.sources||[],required=requiredContext(id,selected),missing=required.filter(key=>!contextReadable(state,key));
 if(id==='weekly')return missing.length===required.length?missing:[];
 if(id==='practices'&&selected.some(key=>['role','skills'].includes(key)))return [];
 return missing;
}
export function availableCapabilityInputs(state,id,sources=[]){
 const inputMap={tasks:'local',chats:'chat',meetings:id==='meeting'?'meetings':'meetings'};
 return sources.filter(key=>!inputMap[key]||contextReadable(state,inputMap[key]));
}
export function pauseCapabilitiesForContext(state,source){
 const hub=state.personalHub,paused=[];if(!hub)return paused;
 if(state.secretary?.enabled&&source==='chat'&&missingContextFor(state,'secretary').length){state.secretary.enabled=false;paused.push('secretary');}
 for(const [id,c] of Object.entries(hub.capabilities||{})){
  if(!requiredContext(id,c.sources).includes(source)||!missingContextFor(state,id).length)continue;
  const plan=state.workspace?.schedules?.find(s=>s.id===c.scheduleId);
  if(c.enabled||plan?.enabled){c.enabled=false;if(plan)plan.enabled=false;paused.push(id);}
 }
 return paused;
}
export function saveContextScope(state,id,value){
 const pc=initPersonalContext(state),source=pc.sources[id],definition=contextDefinitions.find(d=>d.id===id);if(!source||!definition)return {ok:false,message:'来源不存在'};
 const scope=[...new Set(value.scope||[])].filter(key=>definition.choices.some(([valid])=>valid===key));
 if(!scope.length)return {ok:false,message:'请至少选择一个最小有用范围'};
 const selection=String(value.selection||'').trim().slice(0,500);
 if((scope.some(x=>['selected-groups','selected-projects','report-list','metric-list','work'].includes(x)))&&!selection)return {ok:false,message:'请写明选定的群、项目、报表、指标或文件夹'};
 const tokens=text=>String(text||'').split(/[,，、;；\n]+/).map(v=>v.trim()).filter(Boolean);
 const narrowed=scope.every(key=>source.scope.includes(key))&&tokens(selection).every(value=>tokens(source.selection).includes(value));
 const changed=JSON.stringify(source.scope)!==JSON.stringify(scope)||source.selection!==selection;
 if(changed&&!narrowed&&source.enabled){source.enabled=false;source.authorized=definition.id==='local';pauseCapabilitiesForContext(state,id);}
 source.scope=scope;source.selection=selection;source.configured=true;
 // Scope edits do not silently reactivate reading or grant connection permissions.
 return {ok:true,message:'读取范围已保存，尚未因此开启新的读取权限'};
}
export function setContextReading(state,id,enabled){
 const pc=initPersonalContext(state),source=pc.sources[id];if(!source)return {ok:false,message:'来源不存在'};
 if(enabled&&(!source.scope.length||!source.configured))return {ok:false,reason:'scope',message:'请先选择读取范围'};
 if(enabled&&!source.authorized)return {ok:false,reason:'authorization',message:'该来源尚未演示授权；应用连接不会自动开启读取'};
 source.enabled=enabled;const paused=enabled?[]:pauseCapabilitiesForContext(state,id);
 if(enabled&&source.status==='error')source.status='idle';
 return {ok:true,paused,message:enabled?'已开启所选范围的演示读取；能力需单独启用':'已停止读取，已有资料、产物和长期记忆继续保留'};
}
export function authorizeContextDemo(state,id){
 const pc=initPersonalContext(state),source=pc.sources[id],d=contextDefinitions.find(x=>x.id===id);if(!source||!source.configured||!source.scope.length)return {ok:false,message:'请先保存读取范围'};
 source.authorized=true;source.enabled=true;source.status='idle';
 if(d.app&&state.personalHub){state.personalHub.connections[d.app]=true;state.personalHub.disconnectedSources=(state.personalHub.disconnectedSources||[]).filter(x=>x!==d.app);}
 pc.guideDecision='configured';return {ok:true,message:'已演示授权并开启所选范围；未读取真实数据，也未授予写入权限'};
}
export function simulateContextRead(state,id,fail=false,now=Date.now()){
 const pc=initPersonalContext(state),source=pc.sources[id];if(!source?.enabled||!source.authorized||!source.scope.length)return {ok:false,message:'请先选择范围并开启此来源的演示读取'};
 if(state.personalHub?.paused)return {ok:false,message:'个人助理已暂停，请先恢复再模拟更新'};
 if(fail){source.status='error';pauseCapabilitiesForContext(state,id);return {ok:false,simulated:true,message:'演示读取失败：权限已失效或来源暂不可用。受影响能力已暂停，历史成果保留'};}
 source.status='ready';source.lastDemoReadAt=now;source.revision++;return {ok:true,message:'模拟更新已完成；这是演示读取时间，并非真实同步时间'};
}
export function disconnectContextApp(state,app){
 if(!state.personalContext)return;
 for(const d of contextDefinitions.filter(x=>x.app===app)){const s=state.personalContext.sources[d.id];if(!s)continue;s.enabled=false;s.authorized=false;s.status='unauthorized';pauseCapabilitiesForContext(state,d.id);}
}

export function secretaryReadScope(state){
 const config=state.secretary?.config||{},chat=state.personalContext?.sources?.chat;
 if(!state.personalContext)return {private:!!config.private,mentions:!!config.mention};
 if(!contextReadable(state,'chat'))return {private:false,mentions:false};
 return {private:!!config.private&&chat.scope.includes('private'),mentions:!!config.mention&&chat.scope.includes('mentions')};
}
