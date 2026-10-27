// Site content and publication state. Callers own persistence and user feedback.
const clone = value => value == null ? value : structuredClone(value);
const text = value => String(value ?? '').trim();
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId = () => `site-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
const list = value => Array.isArray(value) ? value : [];
const sites = state => list(state.workspace?.sites);
const pageFields = page => ({name:text(page?.name),title:text(page?.title),description:text(page?.description),sections:list(page?.sections).map(s=>({heading:text(s?.heading),body:text(s?.body)})),accent:text(page?.accent)||'#287fe8'});

function checkedPage(value) {
 const page=pageFields(value);
 if(!page.name||page.name.length>80)return {error:'站点名称需为 1–80 个字符。'};
 if(!page.title||page.title.length>120)return {error:'页面标题需为 1–120 个字符。'};
 if(page.description.length>500)return {error:'站点简介不能超过 500 个字符。'};
 if(!page.sections.length||page.sections.length>20)return {error:'请保留 1–20 个有正文的内容段落。'};
 if(page.sections.some(s=>!s.heading||s.heading.length>120||!s.body||s.body.length>8000))return {error:'每个段落需要标题和正文；标题最多 120 字，正文最多 8000 字。'};
 if(!/^#[\da-f]{6}$/i.test(page.accent))return {error:'请选择有效的主题颜色。'};
 return {page};
}

export function initSites(state) {
 state.workspace??={};state.workspace.sites=list(state.workspace.sites);
 for(const site of state.workspace.sites){
  if(!site||typeof site!=='object')continue;
  site.id ||= makeId();
  if(site.status==='deleted'||site.deletedAt){site.status='deleted';continue;}
  const valid=checkedPage(site.page);
  if(site.status==='published'&&site.version>0&&!valid.error&&text(site.html))continue;
  // Earlier prototypes had cards but no hosted content. Preserve them as drafts.
  site.status='draft';site.legacy=true;site.version=0;
 }
 return state.workspace.sites;
}

export function getSite(state,id) {return sites(state).find(s=>s?.id===id&&s.status!=='deleted'&&!s.deletedAt)||null;}

function legacyPage(site) {
 const page=buildSiteDraft(`制作一个关于${site.title||site.name||'我的站点'}的网页。${site.description||''}`);
 page.name=text(site.name||page.name).slice(0,80);page.title=text(site.title||page.title).slice(0,120);page.description=text(site.description||page.description).slice(0,500);page.html=renderSiteHtml(page);
 return page;
}

export function makeSiteRequest(state,id='') {
 if(!id)return {siteId:'',baseVersion:0,basePage:null,name:''};
 const site=getSite(state,id);
 if(!site)return {error:'这个站点已删除或不存在，请返回站点列表。'};
 return {siteId:site.id,baseVersion:site.status==='published'?site.version:0,basePage:clone(site.status==='published'?site.page:legacyPage(site)),name:site.name||site.title||'我的站点'};
}

export function renderSiteHtml(value) {
 const p=pageFields(value),accent=/^#[\da-f]{6}$/i.test(p.accent)?p.accent:'#287fe8';
 return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${escapeHtml(p.title)}</title><style>:root{color-scheme:light;--accent:${accent}}*{box-sizing:border-box}body{margin:0;background:#f6f9fd;color:#26364e;font:16px/1.8 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}.page{max-width:1060px;margin:auto;padding:64px 28px 72px}.eyebrow{color:var(--accent);font-size:13px;font-weight:600;letter-spacing:.08em}h1{font-size:clamp(30px,5vw,48px);line-height:1.35;margin:15px 0 18px;overflow-wrap:anywhere}.lead{max-width:820px;margin:0;color:#6d7e96;white-space:pre-wrap;overflow-wrap:anywhere}nav{display:flex;gap:10px;flex-wrap:wrap;margin:30px 0 36px}nav a{padding:7px 15px;border:1px solid #dce6f2;border-radius:24px;color:#466283;background:#fff;text-decoration:none;font-size:14px}nav a:hover{color:var(--accent);border-color:var(--accent)}section{border:1px solid #e0e8f2;border-radius:20px;background:white;padding:28px 32px;margin:18px 0;scroll-margin-top:20px}h2{font-size:22px;line-height:1.5;margin:0 0 14px;color:#2c405d}section p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:36px;color:#8b9ab0;font-size:13px}@media(max-width:600px){.page{padding:34px 18px}section{padding:22px}nav{margin:24px 0}h2{font-size:20px}}</style></head><body><main class="page"><div class="eyebrow">${escapeHtml(p.name)}</div><h1>${escapeHtml(p.title)}</h1><p class="lead">${escapeHtml(p.description)}</p><nav aria-label="页面内容">${p.sections.map((s,i)=>`<a href="#section-${i+1}">${escapeHtml(s.heading)}</a>`).join('')}</nav>${p.sections.map((s,i)=>`<section id="section-${i+1}"><h2>${escapeHtml(s.heading)}</h2><p>${escapeHtml(s.body)}</p></section>`).join('')}<footer>由小悠整理</footer></main></body></html>`;
}

// srcdoc inherits the outer page's base URL. Keep section links inside the
// embedded document rather than navigating the frame back to the workbench.
export function embeddedSiteHtml(html) {
 return String(html||'').replace(/href="#(section-\d+)"/g,'href="about:srcdoc#$1"');
}

function namedValue(prompt,labels) {
 const quote='[「“"《]([^」”"》]+)[」”"》]';
 const pattern=new RegExp(`(?:${labels})(?:\\s*(?:修改|更改|设置|改|替换))?\\s*(?:为|成|叫|是|[:：])\\s*${quote}`,'i');
 const match=prompt.match(pattern);if(match)return text(match[1]);
 return text(prompt.match(new RegExp(`(?:${labels})(?:\\s*(?:修改|更改|设置|改|替换))?\\s*(?:为|成|叫|是|[:：])\\s*([^，。；\\n]+)`,'i'))?.[1]);
}

function freshPage(prompt) {
 const clean=prompt.replace(/https?:\/\/\S+/g,'').replace(/(?:使用|通过)网页托管[^。\n]*[。\n]?/g,'').trim();
 const explicitTitle=namedValue(clean,'页面标题|标题|站点标题');
 const quoted=clean.match(/(?:关于|主题为|主题是)[「“"《]?([^」”"》。，\n]{2,50})/);
 let topic=text(quoted?.[1]||clean.split(/[。\n]/)[0]).replace(/^(?:请|帮我|为我|小悠|\u7a0b\u5c0f\u60a0|创建|制作|生成|搭建|做|一个|一份|关于|基于|的)+/g,'').replace(/(?:的网站|的网页|的站点|网站|网页|站点)(?:[，,].*)?$/,'').trim();
 topic=(explicitTitle||topic||'我的新站点').slice(0,80);
 const name=(namedValue(clean,'站点名称|站点名|名称')||topic).slice(0,80);
 const title=(explicitTitle||topic).slice(0,120);
 const description=(namedValue(clean,'简介|描述')||`围绕「${topic}」整理的页面，可在会话中继续修改内容。`).slice(0,500);
 const wantsExample=/示例|示范|演示内容/.test(clean);
 const weeklyBody=heading=>{
  if(/数据|指标|数字/.test(heading))return wantsExample?'以下数据仅为示例，发布前请替换为真实数据。\n已完成事项：6 项（示例）。\n进行中事项：3 项（示例）。\n待确认事项：1 项（示例）。':'请补充本期关键指标、统计时间和数据来源。尚未提供的数字不填为实际结果。';
  if(/下周|下一步|计划|安排/.test(heading))return wantsExample?'以下安排仅为示例。\n周一：确认本周重点与负责人。\n周三：完成方案评审，记录待解决问题。\n周五：检查交付结果，整理下一期计划。':'请补充下阶段的具体行动、负责人和完成时间。';
  return wantsExample?'以下进展仅为示例。\n已完成：整理用户反馈，确认优先处理的问题。\n进行中：完善页面方案与交互说明。\n待协调：确认下一阶段的排期和资源。':'请补充本期已完成事项、正在推进的工作和待协调问题。';
 };
 let sections;
 if(/活动|沙龙|报名|分享会/.test(clean))sections=[{heading:'活动介绍',body:`本页围绕「${topic}」介绍活动安排。\n活动内容：${clean.slice(0,1800)}\n具体日期、地点和报名方式待补充。`},{heading:'参与方式',body:'请先了解活动主题，再确认时间与参与方式。报名信息完善后，可在这里补充具体步骤和联系人。'}];
 else if(/周报|周进展|本周|下周/.test(clean))sections=['本周进展','关键数据','下周计划'].map(heading=>({heading,body:weeklyBody(heading)}));
 else if(/进展|项目|看板/.test(clean))sections=[{heading:'本期重点',body:`主题：${topic}\n本期需要呈现：${clean.slice(0,1800)}\n请补充真实进展、负责人和截止时间。`},{heading:'进展与下一步',body:'已完成事项：待补充。\n正在推进：待补充。\n下一步行动和需要协助的问题：待补充。'}];
 else if(/旅行|旅游|行程|攻略|出游/.test(clean))sections=[{heading:'行程概览',body:`本次计划：${topic}\n已知需求：${clean.slice(0,1800)}\n出发日期、目的地和预算可继续补充。`},{heading:'出发前准备',body:'确认交通与住宿安排，并核对目的地开放时间。\n把证件、预订信息与随身物品整理在这里。'}];
 else if(/产品|服务|介绍|官网/.test(clean))sections=[{heading:'了解我们',body:`页面主题：${topic}\n需要介绍的内容：${clean.slice(0,1800)}\n请补充经过确认的产品说明与服务信息。`},{heading:'进一步了解',body:'在这里补充适用人群、使用步骤和联系入口。尚未提供的信息不会编造为已经上线的功能。'}];
 else sections=[{heading:topic.slice(0,120),body:`${clean.slice(0,3000)||'请补充你想展示的内容。'}\n\n这是根据当前需求整理的初稿，细节可继续在会话中修改。`},{heading:'补充信息',body:'在这里补充背景、安排或联系信息。也可以告诉小悠新增一个段落，并写明标题和正文。'}];
 const inclusion=clean.match(/(?:包含|包括|分为)(?:以下)?(?:内容|板块|分区|章节)?[：:]?\s*([^。；\n]+)/)?.[1];
 const headings=(inclusion||'').replace(/[「」“”"《》]/g,'').split(/[、，,]|以及|和|及/).map(text).filter(Boolean);
 if(headings.length>1&&headings.length<=8&&headings.every(h=>h.length<=24&&!/支持|需要|可以|要求/.test(h))){
  const existing=new Map(sections.map(section=>[section.heading,section]));
  sections=headings.map(heading=>existing.get(heading)||{heading,body:/周报|周进展|本周|下周/.test(clean)?weeklyBody(heading):`围绕「${heading}」整理${topic}的相关内容。\n${wantsExample?'示例说明：在这里补充该部分的背景、具体信息与下一步安排。请在发布前核实和替换示例内容。':'具体内容待补充，可在“编辑内容”中填写。'}`});
 }
 const page={name,title,description,sections,accent:'#287fe8'};
 return {...page,html:renderSiteHtml(page),note:'已按主题生成可编辑初稿；未提供的事实以待补充内容呈现。'};
}

export function buildSiteDraft(prompt,base=null) {
 const request=text(prompt);
 if(!base)return freshPage(request);
 const page=pageFields(base),changes=[];
 const title=namedValue(request,'页面标题|站点标题|标题');if(title){page.title=title.slice(0,120);changes.push('页面标题');}
 const name=namedValue(request,'站点名称|站点名|名称');if(name){page.name=name.slice(0,80);changes.push('站点名称');}
 const description=namedValue(request,'简介|描述');if(description){page.description=description.slice(0,500);changes.push('简介');}
 const colors={蓝色:'#287fe8',绿色:'#258b69',紫色:'#7760c7',橙色:'#d77b29',红色:'#c95464'};
 const color=request.match(/(?:主题色|颜色|配色)(?:改成|改为|设为|设置为|[:：])?\s*(#[\da-f]{6}|蓝色|绿色|紫色|橙色|红色)/i)?.[1];
 if(color){page.accent=colors[color]||color;changes.push('主题颜色');}
 const add=request.match(/(?:新增|增加|添加)(?:一个|一段|一节|一块|一项)?\s*(?:段落|章节|板块|内容)?\s*[「“"《]([^」”"》]+)[」”"》]\s*(?:[，,：:]?\s*(?:正文|内容)(?:为|是|[:：])?\s*)?[：:]?\s*([\s\S]+)/);
 if(add){const body=add[2].replace(/^[「“"]|[」”"]\s*[。.]?$/g,'').trim();if(body){page.sections.push({heading:text(add[1]).slice(0,120),body:body.slice(0,8000)});changes.push('新增段落');}}
 const edit=request.match(/(?:修改|更新|将|把)\s*(?:段落|章节|板块)?\s*[「“"《]([^」”"》]+)[」”"》]\s*(?:的)?(?:正文|内容|段落)?\s*(?:改为|改成|修改为|更新为|替换为|为|[:：])\s*([\s\S]+)/);
 if(edit){const section=page.sections.find(s=>s.heading===text(edit[1]));if(section){section.body=text(edit[2]).replace(/^[「“"]|[」”"]\s*[。.]?$/g,'').slice(0,8000);changes.push('段落内容');}}
 const remove=request.match(/(?:删除|移除)\s*(?:段落|章节|板块)?\s*[「“"《]([^」”"》]+)[」”"》]/);
 if(remove&&page.sections.length>1){const filtered=page.sections.filter(s=>s.heading!==text(remove[1]));if(filtered.length!==page.sections.length){page.sections=filtered;changes.push('删除段落');}}
 const note=changes.length?`已更新${[...new Set(changes)].join('、')}。`:'这条修改尚未自动应用，原页面内容已保留。请使用“标题改成「…」”“新增段落「标题」：正文”或打开“编辑内容”直接编辑。';
 return {...page,html:renderSiteHtml(page),note,unapplied:!changes.length};
}

export function completeSiteTask(state,task) {
 if(!task?.siteRequest)return {error:'当前任务没有建站需求。'};
 const request=task.siteRequest,id=task.siteDraft?.siteId||request.siteId;
 if(id&&!getSite(state,id))return {error:'该站点已删除，不能通过旧会话重新发布。'};
 const messages=list(task.messages).filter(m=>m.role==='user');
 const prompt=text(messages.at(-1)?.text||task.prompt);
 if(!prompt)return {error:'请先描述需要创建或修改的页面。'};
 const signature=JSON.stringify([messages.length,prompt]);
 if(task.siteGeneratedMessage===signature&&task.siteDraft)return {draft:task.siteDraft,note:task.siteDraft.note};
 const base=task.siteDraft||request.basePage;
 const generated=buildSiteDraft(prompt,base),checked=checkedPage(generated);
 if(checked.error)return checked;
 const draft={...generated,siteId:id||'',baseVersion:task.siteDraft?.baseVersion??request.baseVersion??0,revision:(task.siteDraft?.revision||0)+1};
 task.siteDraft=draft;task.siteGeneratedMessage=signature;
 return {draft,note:generated.note};
}

export function updateSiteDraft(state,taskId,values) {
 const task=list(state.tasks).find(t=>t.id===taskId);
 if(!task?.siteDraft)return {error:'当前任务尚未生成网页。'};
 if(task.status!=='complete')return {error:'请等待当前任务完成后调整内容。'};
 const id=task.siteDraft.siteId||task.siteRequest?.siteId;
 if(id&&!getSite(state,id))return {error:'该站点已删除，请先恢复站点。'};
 const checked=checkedPage({...task.siteDraft,...values});if(checked.error)return checked;
 task.siteDraft={...task.siteDraft,...checked.page,html:renderSiteHtml(checked.page),revision:task.siteDraft.revision+1,note:'内容已保存到草稿，发布后才会更新站点。',unapplied:false};
 return {draft:task.siteDraft};
}

export function publishSite(state,taskId,options={}) {
 const task=list(state.tasks).find(t=>t.id===taskId);
 if(!task||task.status!=='complete')return {error:'请等待网页生成完成后再发布。'};
 if(!task.siteRequest||!task.siteDraft)return {error:'当前任务没有可发布的网页草稿。'};
 const draft=task.siteDraft,checked=checkedPage(draft);if(checked.error)return checked;
 if(draft.unapplied)return {error:'这条修改尚未应用，请换一种具体描述，或通过“编辑内容”保存修改后再发布。'};
 if(!text(draft.html)||draft.html!==renderSiteHtml(checked.page))return {error:'网页内容无效，请重新生成或保存内容后发布。'};
 const id=draft.siteId||task.siteRequest.siteId;
 const existing=id?sites(state).find(s=>s?.id===id):null;
 if(id&&(!existing||existing.status==='deleted'||existing.deletedAt))return {error:'该站点已删除，旧草稿不能将其重新发布。'};
 if(existing&&task.sitePublishedRevision===draft.revision&&existing.taskId===task.id&&existing.version===draft.baseVersion)return {site:existing,unchanged:true};
 const currentVersion=existing?.status==='published'?existing.version:0;
 if(currentVersion!==draft.baseVersion||(options.baseVersion!=null&&options.baseVersion!==currentVersion))return {error:'站点已有更新版本。请从站点列表重新点击“编辑”，基于最新内容继续修改。'};
 const now=Date.now(),page=clone(checked.page),site={...(existing||{}),id:existing?.id||makeId(),name:page.name,title:page.title,description:page.description,page,html:draft.html,version:currentVersion+1,publishedAt:existing?.publishedAt||now,updatedAt:now,taskId:task.id,files:[{name:'index.html'}],status:'published',legacy:false};
 delete site.deletedAt;delete site.previousStatus;
 state.workspace??={};state.workspace.sites=sites(state);
 if(existing)Object.assign(existing,site);else state.workspace.sites.push(site);
 draft.siteId=site.id;draft.baseVersion=site.version;task.sitePublishedRevision=draft.revision;
 task.siteRequest={...task.siteRequest,siteId:site.id,baseVersion:site.version,basePage:clone(page),name:site.name};
 return {site:existing||site};
}

export function softDeleteSite(state,id) {
 const site=getSite(state,id);if(!site)return {error:'该站点已删除或不存在。'};
 site.previousStatus=site.status;site.status='deleted';site.deletedAt=Date.now();return {site};
}

export function restoreSite(state,id) {
 const site=sites(state).find(s=>s?.id===id&&s.status==='deleted');if(!site)return {error:'没有可恢复的站点。'};
 site.status=site.previousStatus==='published'?'published':'draft';delete site.deletedAt;delete site.previousStatus;return {site};
}

export function siteUrl(id,baseHref=globalThis.location?.href||'http://localhost/') {
 if(globalThis.__CHENGXIAOYOU_SINGLE_FILE__){const url=new URL(baseHref);url.search='';url.hash='published/'+encodeURIComponent(String(id));return url.href;}
 const url=new URL('./site.html',baseHref);url.searchParams.set('id',String(id));return url.href;
}
