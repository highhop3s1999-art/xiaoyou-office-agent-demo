// Published experts are reusable definitions. Runtime roles belong to one task.
const SEEDS={
  bi:{publishId:'business-review',name:'经营分析 Agent',publisher:'经营分析团队',category:'数据分析',version:'v2.3',example:'分析示例酒店经营变化，核对口径并形成复盘建议。'},
  product:{publishId:'product-design',name:'产品设计 Agent',publisher:'产品体验团队',category:'产品与设计',version:'v1.4',example:'结合项目资料，梳理订单复核体验改进方案。'},
  research:{publishId:'deep-research',name:'深度研究 Agent',publisher:'知识协作团队',category:'研究与写作',version:'v1.2',example:'研究办公 Agent 的交互方式，整理有来源的结论。'}
};
export function initExpertLibrary(state){const o=state.office;if(!o)return;
  let primary=o.agents.find(a=>a.id==='personal');if(!primary){primary={id:'personal',name:'小悠',description:'理解目标，按需创建子 Agent，也能调用你保存的企业专家',icon:'sparkles',source:'主 Agent',version:'v1',pinned:true};o.agents.unshift(primary);}
  primary.kind='primary';primary.source='主 Agent';primary.saved=false;primary.pinned=true;
  for(const a of o.agents.filter(a=>a.id!=='personal')){const seed=SEEDS[a.id];
    if(!a.libraryMigrated){Object.assign(a,seed||{publishId:a.catalogId||a.id,publisher:a.publisher||'业务共建团队'});a.libraryMigrated=true;}
    a.kind='published';a.saved??=true;a.publisher||=a.catalogId==='artnova'?'数据分析平台团队':'业务共建团队';a.category||='业务专家';a.source='企业发布';
  }o.expertLibraryVersion=1;
}
export function savedExperts(state){return state.office.agents.filter(a=>a.kind==='published'&&a.saved);}
export function publishedExperts(state){initExpertLibrary(state);const result=state.office.agents.filter(a=>a.kind==='published').map(a=>({...a,id:a.publishId}));
  for(const x of state.catalog?.experts||[]){if(result.some(a=>a.publishId===x.id))continue;result.push({...x,id:x.id,publishId:x.id,catalogId:x.id,publisher:x.publisher||(x.id==='artnova'?'数据分析平台团队':x.category==='研发工程'?'研发效能团队':'业务共建团队'),version:x.version||'v1.0',kind:'published',source:'企业发布'});}return result;
}
export function publishedExpert(state,id){return publishedExperts(state).find(a=>a.publishId===id);}
export function saveExpert(state,id,origin='market'){const source=publishedExpert(state,id);if(!source)return {error:'分享的专家不在当前演示目录中，请使用示例链接。'};
  let a=state.office.agents.find(a=>a.kind==='published'&&a.publishId===id);const alreadySaved=!!a?.saved;
  if(!a){a={...source,id:'expert-'+id,pinned:false,saved:false,libraryMigrated:true};state.office.agents.push(a);}
  a.saved=true;a.savedFrom=origin;a.savedAt||=Date.now();return {expert:a,alreadySaved};
}
export function pinExpert(state,id,value){const a=state.office.agents.find(a=>a.id===id&&a.kind==='published'&&a.saved);if(!a)return false;a.pinned=value??!a.pinned;return true;}
export function expertSnapshots(state,ids=[]){return [...new Set(ids)].map(id=>savedExperts(state).find(a=>a.id===id)).filter(Boolean).map(a=>({id:a.id,publishId:a.publishId,name:a.name,version:a.version,publisher:a.publisher,icon:a.icon,description:a.description,category:a.category}));}
export function parseExpertShare(state,input){try{const url=new URL(input.trim());const id=url.protocol==='xiaoyou:'&&url.hostname==='expert'?decodeURIComponent(url.pathname.slice(1)):decodeURIComponent(url.hash.match(/^#expert-share\/([^?/#]+)/)?.[1]||'');return publishedExpert(state,id)||null;}catch{return null;}}
export function expertShareUrl(id,base='http://127.0.0.1:4314/frontend/'){return base.replace(/#.*$/,'')+'#expert-share/'+encodeURIComponent(id);}
export function consultationText(expert,text,task){const o=task?.office;
  if(/设计|产品/.test(expert.name))return `我会从使用目标、关键路径和异常处理三方面看这件事。${o?'结合当前任务，建议先保留“业务写回前人工确认”的决定，再补齐异常路径与验收标准。':'你可以给我目标用户、当前流程和已有决定，我会先梳理方案边界。'}`;
  if(/数据|经营|ArtNova/.test(expert.name))return `先核对时间范围、订单状态与金额口径。${o?`本次范围为「${o.scope}」，应将事实、变化原因和待核实项分开；相关来源以当前任务已绑定的资料为准。`:'请提供需要分析的指标、时间窗口和资料；我会先确认口径，再给出分析建议。'}`;
  return `我会围绕「${text.replace(/\s+/g,' ').slice(0,70)}」检查资料依据与待验证项。${o?'这次只使用当前会话明确提供的任务资料，结论返回给当前主持 Agent 汇总。':'你可以继续补充背景，这次讨论保留在当前会话中。'}`;
}
