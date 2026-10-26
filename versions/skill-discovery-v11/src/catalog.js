import {renderSkillLibrarySuggestions} from './skill-discovery-ui.js?v=20261026-11.0';
const PLUGINS = [
  ['browser','操作浏览器','浏览器与电脑','让小悠打开网页、查找资料和填写表单。支持内置浏览器和浏览器扩展。','globe',true,false],
  ['computer','操作电脑','浏览器与电脑','查看屏幕并操作本机应用。需要单独开启和系统权限。','monitor',false,false],
  ['image','图片生成','图片与视频','生成与修改图片，支持参考图和透明背景。','image',true,false],
  ['video','视频生成','图片与视频','从脚本和参考素材出发，制作分镜与短视频。','video',true,false],
  ['office','办公','办公协作','处理 Word、PPT、Excel 和 PDF，在任务里预览并继续修改。','file',true,false],
  ['lark','飞书','办公协作','连接云文档、知识库、消息、日历、任务与多维表格。','link',true,true],
  ['email','携程邮箱','办公协作','检索邮件与附件、准备草稿，在发送前核对收件人与内容。','mail',true,true],
  ['hosting','网页托管','办公协作','将生成的静态网页整理为可管理的站点成果。','globe',true,false],
  ['report','网页报告','办公协作','用图表、卡片和交互页面呈现研究与分析结果。','chart',true,false],
  ['idata','iData 数据工具','携程研发','根据业务问题检索数据资产、理解字段与准备查询。','database',true,true],
  ['idev','iDev 研发协作','携程研发','整理代码评审、任务与研发动态，形成可追溯的工作记录。','code',false,true],
  ['git','Git 工具','开发工具','查看代码差异、分支与提交，协助完成项目开发。','code',true,false]
].map(([id,name,category,description,icon,enabled,requiresAuth])=>({id,name,category,description,icon,enabled,requiresAuth,auth:'unconnected',installed:true,custom:false}));
const SKILLS = [
  ['weekly','项目周报','把项目进展、风险和下一步整理成简明周报。','全局','## 目标\n从用户提供的项目资料生成周报。\n\n## 执行方法\n1. 核对本周变化及来源。\n2. 按进展、风险、下一步组织。\n3. 缺失信息保留为待确认，不补写事实。'],
  ['slides','演示文稿','先确定叙事结构，再制作可以继续修改的演示文稿。','全局','## 制作演示文稿\n明确读者和核心结论，先列出页面结构。每页只表达一个主判断，保留可核对的数据来源。'],
  ['animejs','animejs','为页面设计轻量、连贯的动效与交互反馈。','全局','## Anime.js\n在需要时使用动画表达状态变化。尊重减少动态效果偏好，保证键盘操作不受影响。'],
  ['research','产品走查','记录真实产品流程、界面细节和观察边界。','全局','## 产品走查\n围绕真实任务打开产品。区分入口可见、已执行、结果已核验；保留步骤与截图。'],
  ['project-notes','项目资料整理','根据项目文件建立清晰的目录和阅读顺序。','项目：产品设计','## 项目资料\n先理解当前目录与已有结构，再按主题整理索引。保存原始材料，分析另行标注。'],
  ['data-check','数据核对','核对指标定义、时间范围及计算口径。','全局','## 数据核对\n检查数据来源、时间范围、单位和异常值。把事实、解释和建议分开。']
].map(([id,name,description,scope,content])=>({id,name,description,scope,content,enabled:true,custom:id!=='slides'}));
const EXPERTS = [
  ['artnova','ArtNova 数据洞察专家','数据与研究','检索业务报表与指标定义，围绕已授权数据组织分析。','chart','分析本周项目指标的变化，并列出需要进一步核对的口径。'],
  ['data-dev','数据开发专家','数据与研究','协助梳理数据需求、查询逻辑与验证步骤。','database','帮我把这个数据需求拆成查询步骤和验收项。'],
  ['data-govern','数据治理专家','数据与研究','从资产、质量和成本出发整理治理问题与处理计划。','database','检查这份数据资产清单，整理质量风险和优先级。'],
  ['data-ops','数据运维专家','数据与研究','梳理数据链路和故障线索，形成可检查的排查步骤。','activity','根据这份任务日志，整理异常的排查顺序。'],
  ['tracking','伏羲埋点专家','数据与研究','围绕页面与业务流程梳理埋点方案和验证清单。','target','为新的功能页面列出需要的埋点和验证方式。'],
  ['lumino','Lumino 告警分析专家','研发工程','结合告警、变更与调用线索组织问题分析。','activity','帮我整理这些告警之间可能的关系及待核实信息。'],
  ['argus','Argus 智能排障专家','研发工程','将业务现象整理为逐步验证的排查路径。','code','围绕这个异常，给出先后有序的排查计划。'],
  ['iquality','iQuality 质量专家','研发工程','查看问题反馈、整理分类与建议，准备后续处理方案。','shield','整理这批反馈的共同问题、优先级与建议处理人。'],
  ['general','携程通识专家','效率与管理','帮助查找制度、流程与办事入口，并标明资料来源。','book','帮我查找这件事需要的流程、材料和办理入口。']
].map(([id,name,category,description,icon,example])=>({id,name,category,description,icon,example,custom:false,requiresAuth:id!=='general',auth:'unconnected',instructions:`你是${name}。围绕用户提供的材料与获准的工具处理任务。缺少证据时明确指出，不虚构查询或执行结果。`,plugins:id==='general'?['lark']:['idata'],skills:[],knowledge:id==='general'?'携程通识知识库':'业务知识库（示例）'}));

const CAT_LABELS = ['全部','已安装','浏览器与电脑','图片与视频','办公协作','携程研发','开发工具'];
const EXP_LABELS = ['全部','数据与研究','研发工程','效率与管理'];
const ROUTES = ['plugins','skills','mcp','experts'];
const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;

export function initCatalog(state) {
  state.catalog ||= {};
  const c=state.catalog;
  if (!Array.isArray(c.plugins)) c.plugins=structuredClone(PLUGINS);
  if (!Array.isArray(c.skills)) c.skills=structuredClone(SKILLS);
  if (!Array.isArray(c.experts)) c.experts=structuredClone(EXPERTS);
  if (!Array.isArray(c.mcps)) c.mcps=[
    {id:'email-mcp',name:'email',type:'local',command:'email-mcp',args:'--stdio',url:'',timeout:30,description:'携程邮箱插件提供的工具连接。',status:'unconnected',tools:8},
    {id:'figma-mcp',name:'Figma',type:'remote',url:'https://mcp.figma.com/mcp',command:'',args:'',timeout:30,description:'设计资源与文件上下文。',status:'auth-required',tools:0}
  ];
}

function setup(ctx) {
  initCatalog(ctx.state);
  ctx.ui.catalog ||= {queries:{},filters:{},scope:'全部'};
  const u=ctx.ui.catalog;
  u.queries ||= {};u.filters ||= {};
  return [ctx.state.catalog,u];
}
function icon(ctx,name,size=20) {return ctx.icon(name,size);}
function btn(ctx,action,label,{id='',cls='',glyph=''}={}) {return `<button type="button" class="btn ${cls}" data-action="cat:${action}"${id?` data-id="${ctx.esc(id)}"`:''}>${glyph?icon(ctx,glyph,16):''}${ctx.esc(label)}</button>`;}
function switcher(ctx,kind,item) {return `<button type="button" class="toggle ${item.enabled?'on':''}" role="switch" aria-checked="${!!item.enabled}" aria-label="${ctx.esc(item.enabled?'停用':'启用')}${ctx.esc(item.name)}" data-action="cat:toggle" data-kind="${kind}" data-id="${ctx.esc(item.id)}"><span></span></button>`;}
function empty(ctx,text) {return `<div class="empty-state cat-empty">${icon(ctx,'search',32)}<h3>没有找到匹配内容</h3><p class="muted">${ctx.esc(text)}</p>${btn(ctx,'clear','清空筛选',{cls:'ghost'})}</div>`;}
function authBadge(ctx,item) {return item.requiresAuth?`<span class="cat-auth ${item.auth==='demo-authorized'?'is-ready':''}">${item.auth==='demo-authorized'?'演示已授权':'未授权'}</span>`:'';}
function tabs(ctx,route) {return `<div class="tabs cat-top-tabs">${[['plugins','插件'],['skills','技能'],['mcp','MCP']].map(([r,label])=>`<button class="tab ${route===r?'active':''}" data-action="cat:navigate" data-id="${r}">${label}</button>`).join('')}</div>`;}
function filter(ctx,values,current) {return `<div class="cat-filters" aria-label="分类筛选">${values.map(x=>`<button class="cat-filter ${x===current?'active':''}" data-action="cat:filter" data-id="${ctx.esc(x)}" aria-pressed="${x===current}">${ctx.esc(x)}</button>`).join('')}</div>`;}
function search(ctx,route,u) {return `<label class="cat-search">${icon(ctx,'search',18)}<input class="search-input" type="search" data-live="cat:search" data-route="${route}" value="${ctx.esc(u.queries[route]||'')}" placeholder="${route==='experts'?'搜索专家…':'搜索名称或描述…'}" aria-label="搜索${route==='experts'?'专家':'能力'}"></label>`;}
function matches(item,q) {return `${item.name} ${item.description||''}`.toLowerCase().includes(q.trim().toLowerCase());}
function scopeLabel(s) {return s||'全局';}

export function renderCatalog(ctx) {
  const route=ctx.ui.route;if(!ROUTES.includes(route))return '';
  const [c,u]=setup(ctx),e=ctx.esc,q=u.queries[route]||'',current=u.filters[route]||'全部';
  const descriptions={plugins:'将工具与方法组合起来，在对话中直接使用。',skills:'为小悠提供处理特定任务的方法，也可以输入 / 指定使用。',mcp:'连接工具服务，查看每个连接的配置与状态。',experts:'把插件、技能和知识组合起来，专门处理一个领域的工作。'};
  const header=`<div class="page-head cat-page-head"><div>${route==='experts'?'<div class="eyebrow">EXPERTS</div><h1>专家</h1>':tabs(ctx,route)}</div><div class="cat-head-actions">${route==='mcp'?btn(ctx,'new-mcp','添加 MCP',{cls:'primary',glyph:'plus'}):`${btn(ctx,'market',route==='plugins'?'插件市场':route==='skills'?'技能市场':'专家市场',{glyph:'grid'})}${btn(ctx,`new-${route==='plugins'?'plugin':route==='skills'?'skill':'expert'}`,route==='experts'?'创建专家':'创建',{cls:'primary',glyph:'plus'})}`}</div></div><div class="cat-intro"><p class="muted">${descriptions[route]}</p><div class="cat-search-row">${search(ctx,route,u)}<button class="icon-btn" title="刷新本地列表" aria-label="刷新本地列表" data-action="cat:refresh">${icon(ctx,'refresh',18)}</button></div></div>`;
  let content='';
  if(route==='plugins') {
    const values=[...CAT_LABELS,...new Set(c.plugins.map(p=>p.category).filter(x=>!CAT_LABELS.includes(x)))];
    const items=c.plugins.filter(x=>matches(x,q)&&(current==='全部'||current==='已安装'&&x.installed||x.category===current));
    content=filter(ctx,values,current)+(items.length?[...new Set(items.map(x=>x.category))].map(category=>`<section class="cat-section"><h2 class="section-title">${e(category)} <span class="cat-count">${items.filter(x=>x.category===category).length}</span></h2><div class="cat-card-grid">${items.filter(x=>x.category===category).map(p=>`<article class="card cat-plugin-card"><button class="cat-card-main" data-action="cat:plugin-detail" data-id="${e(p.id)}"><span class="cat-app-icon cat-tone-${p.id==='lark'?'teal':p.id==='email'?'blue':p.id==='image'?'orange':'blue'}">${icon(ctx,p.icon,25)}</span><span class="cat-card-copy"><span class="cat-card-title">${e(p.name)} ${authBadge(ctx,p)}</span><span class="cat-description">${e(p.description)}</span></span></button>${switcher(ctx,'plugins',p)}</article>`).join('')}</div></section>`).join(''):empty(ctx,'换一个关键词，或查看其他分类。'));
  } else if(route==='skills') {
    const scopes=['全部','全局',...new Set(c.skills.map(x=>scopeLabel(x.scope)).filter(x=>x!=='全局'))];
    const items=c.skills.filter(x=>x.reviewStatus!=='pending'&&matches(x,q)&&((u.scope||'全部')==='全部'||scopeLabel(x.scope)===u.scope));
    content=renderSkillLibrarySuggestions(ctx)+`<div class="cat-section-bar"><h2 class="section-title">已安装的技能 <span class="cat-count">${c.skills.filter(s=>s.reviewStatus!=='pending').length}</span></h2><label class="cat-scope">作用范围<select data-live="cat:scope" aria-label="技能作用范围">${scopes.map(x=>`<option ${x===(u.scope||'全部')?'selected':''}>${e(x)}</option>`).join('')}</select></label></div>`+(items.length?`<div class="cat-skill-list">${items.map(s=>`<article class="cat-skill-row"><button class="cat-card-main" data-action="cat:skill-detail" data-id="${e(s.id)}"><span class="cat-app-icon cat-tone-violet">${icon(ctx,'layers',23)}</span><span class="cat-card-copy"><span class="cat-card-title">${e(s.name)} <span class="badge">${s.source==='企业技能市场 · 示例'?'企业技能':s.custom?'自定义':'内置'}</span></span><span class="cat-description">${e(s.description)}</span><span class="cat-scope-caption">${e(scopeLabel(s.scope))}</span></span></button><div class="cat-row-actions">${btn(ctx,'skill-menu','更多',{id:s.id,cls:'small ghost'})}${switcher(ctx,'skills',s)}</div></article>`).join('')}</div>`:empty(ctx,'尝试搜索其他名称或切换作用范围。'));
  } else if(route==='mcp') {
    const items=c.mcps.filter(x=>matches(x,q));
    content=`<div class="notice cat-notice">${icon(ctx,'info',17)}<span>连接状态为本地交互示例。此原型不会运行命令或连接外部服务。</span></div>`+(items.length?`<div class="cat-mcp-list">${items.map(m=>`<article class="card cat-mcp-card"><span class="cat-app-icon cat-tone-teal">${icon(ctx,'plug',23)}</span><div class="cat-card-copy"><h2 class="cat-card-title">${e(m.name)} <span class="badge">${m.type==='local'?'本地命令':'远程'}</span></h2><p class="cat-description">${e(m.description||m.command||m.url)}</p><span class="cat-status"><i class="${m.status==='demo-connected'?'ready':''}"></i>${m.status==='demo-connected'?'演示连接已就绪':m.status==='auth-required'?'需要授权':'未连接'}${m.tools?` · ${m.tools} 个示例工具`:''}</span></div><div class="cat-row-actions">${btn(ctx,'edit-mcp','配置',{id:m.id,cls:'small ghost'})}${btn(ctx,'connect-mcp',m.status==='demo-connected'?'断开演示连接':'连接',{id:m.id,cls:'small'})}</div></article>`).join('')}</div>`:empty(ctx,'可以添加一个 MCP 配置，或清空搜索。'));
  } else {
    const values=[...EXP_LABELS,...new Set(c.experts.map(x=>x.category).filter(x=>!EXP_LABELS.includes(x)))];
    const items=c.experts.filter(x=>matches(x,q)&&(current==='全部'||x.category===current));
    content=filter(ctx,values,current)+(items.length?[...new Set(items.map(x=>x.category))].map(category=>`<section class="cat-section"><h2 class="section-title">${e(category)} <span class="cat-count">${items.filter(x=>x.category===category).length}</span></h2><div class="cat-card-grid">${items.filter(x=>x.category===category).map(x=>`<article class="card cat-expert-card"><button class="cat-card-main" data-action="cat:expert-detail" data-id="${e(x.id)}"><span class="cat-expert-avatar cat-tone-${category==='研发工程'?'violet':category==='效率与管理'?'orange':'blue'}">${icon(ctx,x.icon||'sparkles',26)}</span><span class="cat-card-copy"><span class="cat-card-title">${e(x.name)}</span><span class="cat-description">${e(x.description)}</span><span class="cat-scope-caption">${x.custom?'我的专家':'内置专家'}${x.requiresAuth?' · 需要业务账号授权':''}</span></span></button>${btn(ctx,'summon','召唤',{id:x.id,cls:'small'})}</article>`).join('')}</div></section>`).join(''):empty(ctx,'试试“数据”“质量”或其他业务关键词。'));
  }
  return `<div class="cat-page">${header}${content}</div>`;
}

function footer(ctx,label='保存',extra='') {return `<div class="form-actions">${extra}<span class="cat-actions-spacer"></span><button type="button" class="btn ghost" data-action="app:close-modal">取消</button><button class="btn primary" type="submit">${label}</button></div>`;}
function field(ctx,label,name,value='',{type='text',placeholder='',required=false,area=false,rows=3,max=0}={}) {const e=ctx.esc;return `<label class="field"><span>${e(label)}${required?'<span class="cat-required">*</span>':''}</span>${area?`<textarea name="${name}" rows="${rows}" ${required?'required':''} ${max?`maxlength="${max}"`:''} placeholder="${e(placeholder)}">${e(value)}</textarea>`:`<input name="${name}" type="${type}" value="${e(value)}" ${required?'required':''} ${max?`maxlength="${max}"`:''} placeholder="${e(placeholder)}">`}</label>`;}
function selectField(ctx,label,name,values,current,live='') {return `<label class="field"><span>${ctx.esc(label)}</span><select name="${name}" ${live?`data-live="${live}"`:''}>${values.map(v=>{const [value,label]=Array.isArray(v)?v:[v,v];return `<option value="${ctx.esc(value)}" ${value===current?'selected':''}>${ctx.esc(label)}</option>`;}).join('')}</select></label>`;}
function detailKV(ctx,rows) {return `<dl class="detail-list cat-detail-list">${rows.map(([a,b])=>`<div><dt>${ctx.esc(a)}</dt><dd>${ctx.esc(b)}</dd></div>`).join('')}</dl>`;}
function markdown(ctx,text) {return text.split('\n').map(line=>line.startsWith('## ')?`<h3>${ctx.esc(line.slice(3))}</h3>`:line.trim()?`<p>${ctx.esc(line)}</p>`:'<div class="cat-md-gap"></div>').join('');}

function pluginDetail(ctx,p) {
  const e=ctx.esc;
  ctx.modal(p.name,`<div class="cat-detail-hero"><span class="cat-app-icon cat-tone-blue">${icon(ctx,p.icon,28)}</span><div><span class="badge blue">${e(p.category)}</span><p class="muted">${e(p.description)}</p></div></div>${detailKV(ctx,[['启用状态',p.enabled?'已启用（本地演示设置）':'已停用'],['账号授权',p.requiresAuth?(p.auth==='demo-authorized'?'演示已授权 · 未连接真实账号':'未授权'):'此示例无需账号授权'],['来源',p.custom?'自定义插件':'内置示例']])}<div class="notice">启用决定是否在任务中选用；授权决定是否能访问账号数据。两者分别管理，当前不会请求真实权限。</div><div class="cat-detail-actions">${btn(ctx,'toggle',p.enabled?'停用插件':'启用插件',{id:p.id,cls:'ghost'})}${p.requiresAuth?btn(ctx,'auth-plugin',p.auth==='demo-authorized'?'查看演示授权':'配置账号授权',{id:p.id,cls:'primary'}):''}${p.custom?btn(ctx,'edit-plugin','编辑插件',{id:p.id}):''}</div>`,{drawer:true});
}
function pluginForm(ctx,p={}) {
  ctx.modal(p.id?'编辑插件':'创建插件',`<form data-form="cat:plugin" data-id="${ctx.esc(p.id||'')}">${field(ctx,'名称','name',p.name,{required:true,max:50})}${field(ctx,'简介','description',p.description,{required:true,area:true,max:500})}${selectField(ctx,'分类','category',CAT_LABELS.slice(2),p.category||'办公协作')}<label class="cat-check"><input type="checkbox" name="requiresAuth" ${p.requiresAuth?'checked':''}>需要账号授权</label><p class="muted cat-small">创建的是本地插件说明与状态，不安装或执行真实工具。</p>${footer(ctx,p.id?'保存修改':'创建插件')}</form>`,{drawer:true});
}
function skillDetail(ctx,s) {
  const e=ctx.esc;
  ctx.modal(s.name,`<div class="cat-detail-top"><span class="badge blue">${e(scopeLabel(s.scope))}</span><span class="badge">${s.source==='企业技能市场 · 示例'?'企业技能':s.custom?'自定义':'内置'}</span><span class="badge ${s.enabled?'blue':'orange'}">${s.enabled?'已启用':'已停用'}</span>${btn(ctx,'edit-skill','编辑',{id:s.id,cls:'small'})}</div><p class="muted">${e(s.description)}</p>${!s.enabled?'<div class="notice">这个技能已停用。你仍可以查看、编辑和导出；在任务中使用前需要启用。</div>':''}<div class="cat-markdown">${markdown(ctx,s.content)}</div><div class="cat-detail-actions">${btn(ctx,s.enabled?'use-skill':'enable-use-skill',s.enabled?'在新任务中使用':'启用并在新任务中使用',{id:s.id,cls:'primary'})}${btn(ctx,'export-skill','导出技能',{id:s.id})}</div>`,{wide:true});
}
function skillForm(ctx,s={}) {
  const [c]=setup(ctx),scopes=['全局',...new Set(c.skills.map(x=>x.scope).filter(x=>x&&x!=='全局'))];
  if(!scopes.includes('项目：产品设计'))scopes.push('项目：产品设计');
  ctx.modal(s.id?'编辑技能':'创建技能',`<form data-form="cat:skill" data-id="${ctx.esc(s.id||'')}"><div class="form-grid">${field(ctx,'技能名称','name',s.name,{required:true,max:60})}${selectField(ctx,'作用范围','scope',scopes,s.scope||'全局')}</div>${field(ctx,'简介','description',s.description,{required:true,area:true,max:500})}${field(ctx,'技能正文','content',s.content,{required:true,area:true,rows:12,placeholder:'说明什么时候使用、执行步骤，以及需要核对的结果。'})}<p class="muted cat-small">保存后用于本地原型展示，不会修改真实技能文件。</p>${footer(ctx,s.id?'保存修改':'创建技能')}</form>`,{wide:true});
}
function skillMenu(ctx,s) {
  ctx.modal(s.name,`<div class="cat-action-list">${[['edit-skill','编辑技能','修改简介和使用方法'],['ai-edit-skill','在对话中编辑','把当前方法带入新任务'],['check-skill','检查更新','查看这个本地示例的状态'],['export-skill','分享 / 导出技能','下载 Markdown，不发布到外部'],['delete-skill','删除技能','从本地演示列表中移除']].map(([a,t,d])=>`<button class="cat-action-item ${a==='delete-skill'?'is-danger':''}" data-action="cat:${a}" data-id="${ctx.esc(s.id)}"><strong>${ctx.esc(t)}</strong><span>${ctx.esc(d)}</span>${icon(ctx,'chevron-right',18)}</button>`).join('')}</div>`);
}
function mcpForm(ctx,m={},mode='form',draft=null) {
  const d=draft||m,e=ctx.esc,json=d.json||JSON.stringify({name:d.name||'',type:d.type||'local',command:d.command||'',args:d.args?d.args.split(/\s+/):[],url:d.url||'',timeout:d.timeout||30},null,2);
  ctx.modal(m.id?'配置 MCP':'添加 MCP',`<form data-form="cat:mcp" data-id="${e(m.id||'')}" data-mode="${mode}"><div class="tabs cat-form-tabs"><button type="button" class="tab ${mode==='form'?'active':''}" data-action="cat:mcp-mode" data-id="form">表单</button><button type="button" class="tab ${mode==='json'?'active':''}" data-action="cat:mcp-mode" data-id="json">JSON</button></div>${mode==='json'?`${field(ctx,'MCP 配置 JSON','json',json,{required:true,area:true,rows:14})}<p class="muted cat-small">支持单项配置，或仅含一个服务的 mcpServers 配置。保存只登记配置，不执行命令。</p>`:`${field(ctx,'名称','name',d.name,{required:true,max:60})}<div class="form-grid">${selectField(ctx,'连接类型','type',[['local','本地命令（stdio）'],['remote','远程服务（HTTP）']],d.type||'local','cat:mcp-type')}${field(ctx,'连接超时（秒）','timeout',d.timeout||30,{type:'number',required:true})}</div><div data-mcp-local ${d.type==='remote'?'hidden':''}>${field(ctx,'命令','command',d.command,{placeholder:'例如 npx / uvx / 可执行文件路径'})}${field(ctx,'参数','args',d.args,{placeholder:'多个参数用空格分隔'})}</div><div data-mcp-remote ${d.type==='remote'?'':'hidden'}>${field(ctx,'服务地址','url',d.url,{placeholder:'https://example.com/mcp'})}</div>${field(ctx,'说明','description',d.description,{area:true})}`}<div class="notice cat-small">连接检查为前端状态演示，不会启动本地进程或访问网络。</div>${footer(ctx,m.id?'保存配置':'添加 MCP',m.id?btn(ctx,'delete-mcp','删除',{id:m.id,cls:'danger ghost'}):'')}</form>`,{drawer:true});
}
function expertDetail(ctx,x) {
  const [c]=setup(ctx),e=ctx.esc;
  ctx.modal(x.name,`<div class="cat-detail-hero"><span class="cat-expert-avatar cat-tone-blue">${icon(ctx,x.icon||'sparkles',30)}</span><div><span class="badge blue">${e(x.category)}</span><span class="badge">${x.custom?'自定义':'内置'}</span><p class="muted">${e(x.description)}</p></div></div>${x.requiresAuth?`<section class="cat-auth-box"><div><h3>账号授权</h3><p class="muted">以获准的身份访问工具与业务数据。</p><span class="badge ${x.auth==='demo-authorized'?'blue':'orange'}">${x.auth==='demo-authorized'?'演示已授权':'未授权'}</span></div>${btn(ctx,'auth-expert','配置授权',{id:x.id})}</section>`:''}<section class="cat-detail-section"><h3>开场提示词</h3><button class="cat-example" data-action="cat:expert-example" data-id="${e(x.id)}">${icon(ctx,'message',18)}<span>${e(x.example)}</span>${icon(ctx,'arrow-up-right',16)}</button></section><section class="cat-detail-section"><h3>角色定义</h3><p class="cat-preserve">${e(x.instructions)}</p></section>${detailKV(ctx,[['插件',(x.plugins||[]).map(id=>c.plugins.find(p=>p.id===id)?.name||id).join('、')||'按任务选用'],['技能',(x.skills||[]).map(id=>c.skills.find(p=>p.id===id)?.name||id).join('、')||'按任务选用'],['知识库',x.knowledge||'未指定']])}<div class="cat-detail-actions">${btn(ctx,'summon','召唤专家',{id:x.id,cls:'primary'})}${btn(ctx,'edit-expert','编辑配置',{id:x.id})}${x.custom?btn(ctx,'delete-expert','删除',{id:x.id,cls:'danger ghost'}):''}</div>`,{drawer:true});
}
function expertForm(ctx,x={}) {
  const [c]=setup(ctx),e=ctx.esc;
  ctx.modal(x.id?'编辑专家':'创建专家',`<form data-form="cat:expert" data-id="${e(x.id||'')}"><div class="form-grid">${field(ctx,'名称','name',x.name,{required:true,max:60})}${selectField(ctx,'领域','category',EXP_LABELS.slice(1),x.category||'效率与管理')}</div>${field(ctx,'简介','description',x.description,{area:true,required:true,max:500})}${field(ctx,'角色定义','instructions',x.instructions,{area:true,required:true,rows:5})}${field(ctx,'开场提示词','example',x.example,{area:true,required:true,rows:2})}${field(ctx,'知识库说明','knowledge',x.knowledge,{placeholder:'例如：携程通识知识库'})}<fieldset class="cat-resource-field"><legend>引用插件</legend>${c.plugins.map(p=>`<label class="cat-check"><input type="checkbox" name="plugins" value="${e(p.id)}" ${(x.plugins||[]).includes(p.id)?'checked':''}>${e(p.name)}</label>`).join('')}</fieldset><fieldset class="cat-resource-field"><legend>引用技能</legend>${c.skills.map(s=>`<label class="cat-check"><input type="checkbox" name="skills" value="${e(s.id)}" ${(x.skills||[]).includes(s.id)?'checked':''}>${e(s.name)}</label>`).join('')}</fieldset><label class="cat-check"><input type="checkbox" name="requiresAuth" ${x.requiresAuth?'checked':''}>需要业务账号授权</label><p class="muted cat-small">本地保存专家定义。实际业务工具与数据访问尚未接入。</p>${footer(ctx,x.id?'保存修改':'创建专家')}</form>`,{wide:true});
}

function authorization(ctx,kind,item) {
  const isMcp=kind==='mcps';
  ctx.modal(isMcp?'连接说明':'账号授权说明',`<div class="cat-auth-explain"><span class="cat-app-icon cat-tone-blue">${icon(ctx,'shield',28)}</span><h3>${ctx.esc(item.name)}</h3><p>当前是交互原型，没有真实的身份认证、外部连接或数据访问。</p><p class="muted">可以切换演示状态，预览完成${isMcp?'连接':'授权'}后的界面。真实产品需要经过相应的账号与权限流程。</p></div><div class="form-actions"><button class="btn ghost" data-action="app:close-modal">取消</button><button class="btn primary" data-action="cat:demo-authorize" data-kind="${kind}" data-id="${ctx.esc(item.id)}">${isMcp?'设为演示连接就绪':'设为演示已授权'}</button>${!isMcp&&item.auth==='demo-authorized'?`<button class="btn ghost" data-action="cat:revoke-auth" data-kind="${kind}" data-id="${ctx.esc(item.id)}">清除演示授权</button>`:''}</div>`);
}
function confirmDelete(ctx,kind,item) {ctx.modal('删除本地示例',`<p>从当前原型中删除「${ctx.esc(item.name)}」？这不会修改真实产品或本地技能文件。</p><div class="form-actions"><button class="btn ghost" data-action="app:close-modal">取消</button><button class="btn danger" data-action="cat:confirm-delete" data-kind="${kind}" data-id="${ctx.esc(item.id)}">确认删除</button></div>`);}
function market(ctx) {
  const route=ctx.ui.route,kind=route==='plugins'?'plugins':route==='skills'?'skills':'experts';
  const samples={plugins:[{id:'market-whiteboard',name:'白板与流程图',category:'办公协作',description:'把流程与结构整理为可讨论的图示。',icon:'layers',requiresAuth:false}],skills:[{id:'market-review',name:'会议行动项整理',description:'从会议材料提取决定、负责人和下一步。',scope:'全局',content:'## 会议行动项\n先区分讨论与决定，再提取负责人和截止时间；未明确的信息标为待确认。'}],experts:[{id:'market-writing',name:'文稿编辑专家',category:'效率与管理',description:'梳理结构、去除重复，让工作文稿清晰易读。',icon:'file',example:'帮我检查这份文稿的结构与表达。',instructions:'保留事实和条件，明确读者的阅读任务；修改表达，不新增事实。',plugins:['office'],skills:['weekly'],requiresAuth:false}]};
  const [c]=setup(ctx);ctx.ui.catalog.marketItems=samples[kind];ctx.ui.catalog.marketKind=kind;
  ctx.modal(`${kind==='plugins'?'插件':kind==='skills'?'技能':'专家'}市场`, `<p class="muted">这里展示可安装的本地示例，不访问真实市场。</p>${samples[kind].map(x=>`<article class="card cat-market-card"><span class="cat-app-icon cat-tone-blue">${icon(ctx,x.icon||'layers',24)}</span><div><h3>${ctx.esc(x.name)}</h3><p class="muted">${ctx.esc(x.description)}</p></div>${c[kind].some(y=>y.id===x.id)?'<span class="badge blue">已添加</span>':btn(ctx,'market-install','添加到演示',{id:x.id,cls:'small primary'})}</article>`).join('')}`,{wide:true});
}

export function handleCatalog(action,element,ctx) {
  if(!action.startsWith('cat:'))return false;
  const [c,u]=setup(ctx),id=element.dataset.id,kind=element.dataset.kind;
  const p=c.plugins.find(x=>x.id===id),s=c.skills.find(x=>x.id===id),m=c.mcps.find(x=>x.id===id),x=c.experts.find(x=>x.id===id);
  const persist=(msg,close=true)=>{ctx.save();if(close)ctx.closeModal();ctx.render();if(msg)ctx.toast(msg);};
  switch(action.slice(4)) {
    case 'navigate':ctx.go(id);break;
    case 'filter':u.filters[ctx.ui.route]=id;ctx.render();break;
    case 'clear':u.queries[ctx.ui.route]='';u.filters[ctx.ui.route]='全部';u.scope='全部';ctx.render();break;
    case 'refresh':ctx.render();ctx.toast('本地列表已刷新');break;
    case 'toggle':{const item=(kind?c[kind]:c.plugins)?.find(y=>y.id===id);if(item){item.enabled=!item.enabled;persist(`${item.name}已${item.enabled?'启用':'停用'}（演示）`,false);if(!kind)pluginDetail(ctx,item);}break;}
    case 'plugin-detail':if(p)pluginDetail(ctx,p);break;
    case 'new-plugin':pluginForm(ctx);break;
    case 'edit-plugin':if(p)pluginForm(ctx,p);break;
    case 'auth-plugin':if(p)authorization(ctx,'plugins',p);break;
    case 'new-skill':skillForm(ctx);break;
    case 'skill-detail':if(s)skillDetail(ctx,s);break;
    case 'skill-menu':if(s)skillMenu(ctx,s);break;
    case 'edit-skill':if(s)skillForm(ctx,s);break;
    case 'use-skill':if(s){if(!s.enabled){ctx.toast('这个技能已停用，请先启用后再使用');break;}ctx.closeModal();ctx.startTask(`请使用「${s.name}」技能，帮助我完成任务。\n\n技能方法：\n${s.content}`);}break;
    case 'enable-use-skill':if(s){s.enabled=true;ctx.save();ctx.closeModal();ctx.startTask(`请使用「${s.name}」技能，帮助我完成任务。\n\n技能方法：\n${s.content}`);}break;
    case 'ai-edit-skill':if(s){ctx.closeModal();ctx.startTask(`请帮我改进「${s.name}」技能，先给出修改建议。\n\n${s.content}`);}break;
    case 'check-skill':if(s)ctx.toast('这是本地示例，未连接远程更新源');break;
    case 'export-skill':if(s){ctx.download(`${s.name.replace(/[\\/:*?"<>|]/g,'-')}.md`,`# ${s.name}\n\n${s.description}\n\n${s.content}`,'text/markdown;charset=utf-8');ctx.toast('已导出技能 Markdown');}break;
    case 'delete-skill':if(s)confirmDelete(ctx,'skills',s);break;
    case 'new-mcp':mcpForm(ctx);break;
    case 'edit-mcp':if(m)mcpForm(ctx,m);break;
    case 'mcp-mode':{const form=element.closest('form'),d=Object.fromEntries(new FormData(form));const prev=c.mcps.find(y=>y.id===form.dataset.id)||{};if(id==='form'&&d.json){try{Object.assign(d,parseMcpJSON(d.json));}catch{ctx.toast('JSON 尚未完整，将保留原表单配置');}}mcpForm(ctx,prev,id,{...prev,...d});break;}
    case 'connect-mcp':if(m){if(m.status==='demo-connected'){m.status='unconnected';persist('已断开演示连接');}else authorization(ctx,'mcps',m);}break;
    case 'delete-mcp':if(m)confirmDelete(ctx,'mcps',m);break;
    case 'new-expert':expertForm(ctx);break;
    case 'edit-expert':if(x)expertForm(ctx,x);break;
    case 'expert-detail':if(x)expertDetail(ctx,x);break;
    case 'auth-expert':if(x)authorization(ctx,'experts',x);break;
    case 'summon':if(x){ctx.closeModal();ctx.startTask(`请作为「${x.name}」帮助我处理接下来的任务。`,{expert:x.name});}break;
    case 'expert-example':if(x){ctx.closeModal();ctx.startTask(x.example,{expert:x.name});}break;
    case 'delete-expert':if(x)confirmDelete(ctx,'experts',x);break;
    case 'demo-authorize':{const item=c[kind]?.find(y=>y.id===id);if(item){if(kind==='mcps')item.status='demo-connected';else item.auth='demo-authorized';persist('演示状态已更新，未连接真实账号');}break;}
    case 'revoke-auth':{const item=c[kind]?.find(y=>y.id===id);if(item){item.auth='unconnected';persist('已清除演示授权');}break;}
    case 'confirm-delete':if(['skills','mcps','experts'].includes(kind)){c[kind]=c[kind].filter(y=>y.id!==id);if(kind==='skills')c.experts.forEach(y=>y.skills=(y.skills||[]).filter(z=>z!==id));persist('已删除本地示例');}break;
    case 'market':market(ctx);break;
    case 'market-install':{const item=u.marketItems?.find(y=>y.id===id),k=u.marketKind;if(item&&c[k]&&!c[k].some(y=>y.id===id)){c[k].push({...structuredClone(item),custom:true,installed:true,enabled:true,auth:'unconnected'});ctx.save();ctx.render();market(ctx);ctx.toast('已添加到本地演示');}break;}
    default:return false;
  }
  return true;
}

function error(form,message) {let box=form.querySelector('.cat-form-error');if(!box){box=document.createElement('div');box.className='cat-form-error';box.setAttribute('role','alert');form.prepend(box);}box.textContent=message;box.scrollIntoView({block:'nearest'});return true;}
function parseMcpJSON(raw) {
  let d;try{d=JSON.parse(raw);}catch{throw new Error('JSON 格式有误，请检查引号、逗号和括号。');}
  if(!d||typeof d!=='object'||Array.isArray(d))throw new Error('配置必须是一个 JSON 对象。');
  if(d.mcpServers){const entries=Object.entries(d.mcpServers);if(entries.length!==1)throw new Error('请一次添加一个 MCP 服务。');const [name,config]=entries[0];if(!config||typeof config!=='object'||Array.isArray(config))throw new Error('服务配置必须是一个对象。');d={...config,name};}
  if(d.args!==undefined&&!Array.isArray(d.args)&&typeof d.args!=='string')throw new Error('args 需要是字符串或字符串数组。');
  if(Array.isArray(d.args)&&d.args.some(x=>typeof x!=='string'))throw new Error('args 数组里的每一项都需要是字符串。');
  return {name:typeof d.name==='string'?d.name:'',type:d.type==='remote'||d.url?'remote':'local',command:typeof d.command==='string'?d.command:'',args:Array.isArray(d.args)?d.args.join(' '):d.args||'',url:typeof d.url==='string'?d.url:'',timeout:d.timeout??30,description:typeof d.description==='string'?d.description:''};
}

export function submitCatalog(name,form,ctx) {
  if(!name.startsWith('cat:'))return false;
  const [c]=setup(ctx),d=Object.fromEntries(new FormData(form)),id=form.dataset.id||'',type=name.slice(4);
  if(!['plugin','skill','mcp','expert'].includes(type))return false;
  let values={...d};
  if(type==='mcp'&&form.dataset.mode==='json'){try{values=parseMcpJSON(d.json);}catch(ex){return error(form,ex.message);}}
  for(const key of ['name','description','content','instructions','example','command','url','args','knowledge'])if(typeof values[key]==='string')values[key]=values[key].trim();
  if(!values.name)return error(form,'请填写名称。');
  const collection={plugin:'plugins',skill:'skills',mcp:'mcps',expert:'experts'}[type];
  if(c[collection].some(x=>x.id!==id&&x.name.toLowerCase()===values.name.toLowerCase()))return error(form,'同名项目已存在，请使用不同名称。');
  const previous=c[collection].find(x=>x.id===id);
  let item;
  if(type==='plugin') {
    if(!values.description)return error(form,'请填写插件简介。');
    item={...previous,id:id||uid('plugin'),name:values.name,description:values.description,category:values.category,requiresAuth:!!d.requiresAuth,enabled:previous?.enabled??true,auth:previous?.auth||'unconnected',installed:true,custom:previous?.custom??true,icon:previous?.icon||'plug'};
  } else if(type==='skill') {
    if(!values.description||!values.content)return error(form,'请填写简介与技能正文。');
    item={...previous,id:id||uid('skill'),name:values.name,description:values.description,content:values.content,scope:values.scope||'全局',enabled:previous?.enabled??true,custom:true};
  } else if(type==='mcp') {
    const timeout=Number(values.timeout);
    if(!Number.isFinite(timeout)||timeout<1||timeout>600)return error(form,'连接超时需要在 1 到 600 秒之间。');
    if(values.type==='remote'){try{const url=new URL(values.url);if(!['https:','http:'].includes(url.protocol))throw new Error();}catch{return error(form,'请填写有效的 HTTP 或 HTTPS 服务地址。');}}
    else if(!values.command)return error(form,'请填写本地命令。');
    item={...previous,...values,id:id||uid('mcp'),timeout,status:'unconnected',tools:previous?.tools||0};
  } else {
    if(!values.description||!values.instructions||!values.example)return error(form,'请填写简介、角色定义与开场提示词。');
    const fd=new FormData(form);
    item={...previous,id:id||uid('expert'),name:values.name,category:values.category,description:values.description,instructions:values.instructions,example:values.example,knowledge:values.knowledge,plugins:fd.getAll('plugins').filter(x=>c.plugins.some(y=>y.id===x)),skills:fd.getAll('skills').filter(x=>c.skills.some(y=>y.id===x)),requiresAuth:!!d.requiresAuth,auth:previous?.auth||'unconnected',custom:previous?.custom??true,icon:previous?.icon||'sparkles'};
  }
  if(previous)c[collection][c[collection].indexOf(previous)]=item;else c[collection].push(item);
  ctx.save();ctx.closeModal();ctx.render();ctx.toast(id?'修改已保存在本地':'已创建本地示例');return true;
}

export function inputCatalog(element,ctx) {
  const live=element.dataset.live;if(!live?.startsWith('cat:'))return false;
  const [,u]=setup(ctx);
  if(live==='cat:search') {const route=element.dataset.route||ctx.ui.route,start=element.selectionStart,end=element.selectionEnd;u.queries[route]=element.value;ctx.render();const replacement=document.querySelector(`input[data-live="cat:search"][data-route="${route}"]`);if(replacement){replacement.focus();try{replacement.setSelectionRange(start,end);}catch{}}return true;}
  if(live==='cat:scope'){u.scope=element.value;ctx.render();return true;}
  if(live==='cat:mcp-type'){const form=element.closest('form');form.querySelector('[data-mcp-local]').hidden=element.value==='remote';form.querySelector('[data-mcp-remote]').hidden=element.value!=='remote';return true;}
  return false;
}
