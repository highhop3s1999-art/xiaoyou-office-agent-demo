import {disconnectContextApp,missingContextFor} from './personal-context-state.js';
// First-use sample mode is allowed. An explicit disconnect revokes dependent demo runs.
export function disconnectedSourcesFor(state,id,sources){
 const disconnected=state.personalHub?.disconnectedSources||[];
 const selected=sources||state.personalHub?.capabilities?.[id]?.sources||[];
 if(state.personalContext&&!missingContextFor(state,id,selected).length)return [];
 const dependencies=id==='secretary'?['feishu']:id==='weekly'?[...(selected.includes('chats')?['feishu']:[]),...(selected.includes('meetings')?['calendar']:[])]:id==='meeting'&&selected.includes('meetings')?['calendar']:[];
 return dependencies.filter(x=>disconnected.includes(x));
}
export const connectionNames={feishu:'飞书',calendar:'日历与会议'};
export function disconnectDemoSource(state,source){
 disconnectContextApp(state,source);
 const hub=state.personalHub;hub.disconnectedSources||=[];
 if(!hub.disconnectedSources.includes(source))hub.disconnectedSources.push(source);
 const paused=[];
 if(state.secretary?.enabled&&disconnectedSourcesFor(state,'secretary').length){state.secretary.enabled=false;paused.push('secretary');}
 for(const [id,cap] of Object.entries(hub.capabilities)){
  const schedule=state.workspace?.schedules?.find(s=>s.id===cap.scheduleId);
  if(!(schedule?schedule.enabled:cap.enabled)||!disconnectedSourcesFor(state,id).length)continue;
  cap.enabled=false;paused.push(id);if(schedule)schedule.enabled=false;
 }
 return paused;
}
