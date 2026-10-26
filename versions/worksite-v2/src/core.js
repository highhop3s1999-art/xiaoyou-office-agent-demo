export const STORAGE_KEY = 'xiaoyou.worksite-v2-comparison.v1';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uid = (prefix='item') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const paths = {
  plus:'M12 5v14M5 12h14',minus:'M5 12h14',close:'m6 6 12 12M18 6 6 18',check:'m5 12 4 4L19 6',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',up:'m6 15 6-6 6 6',
  search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',new:'m15 5 4 4M13 7l6-6 4 4-6 6-7 3 3-7M20 14v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6',
  chat:'M21 11a9 9 0 0 1-9 9H4l-3 2 1-6a9 9 0 1 1 19-5Z',folder:'M3 5h6l2 3h10v12H3V5Z',folderOpen:'M3 20V5h6l2 3h10v4M3 20l3-8h17l-3 8H3Z',
  plugin:'M8 3v5H3v5h5v8h5v-5h8v-5h-5V3H8Z',puzzle:'M8 3v5H3v5h5v8h5v-5h8v-5h-5V3H8Z',expert:'m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-5v5l4 2',calendar:'M4 5h16v16H4V5Zm0 5h16M8 2v6m8-6v6',remote:'M7 2h10v20H7V2Zm4 17h2',more:'M4 12h.01M12 12h.01M20 12h.01',
  settings:'m10 2 4 0 1 3 3 1 3 2-1 3 1 3-3 2-3 1-1 3h-4l-1-3-3-1-3-2 1-3-1-3 3-2 3-1 1-3Zm6 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  sparkles:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z',bolt:'m13 2-9 12h7l-1 8 10-13h-7l1-7Z',
  globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z',browser:'M3 4h18v16H3V4Zm0 5h18M6 6h.1m3 0h.1',
  code:'m8 5-7 7 7 7m8-14 7 7-7 7m-3-15-2 16',terminal:'m5 7 5 5-5 5m8 0h6M2 3h20v18H2V3Z',file:'M5 2h9l5 5v15H5V2Zm9 0v6h5M8 13h8M8 17h8',
  book:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3V4Zm9 2v16',database:'M20 5c0 4-16 4-16 0s16-4 16 0Zm-16 0v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0',
  upload:'M12 16V2m-5 5 5-5 5 5M3 14v7h18v-7',download:'M12 2v14m-5-5 5 5 5-5M3 16v5h18v-5',arrow:'M4 12h16m-6-6 6 6-6 6',back:'M20 12H4m6-6-6 6 6 6',send:'M12 20V4m-7 7 7-7 7 7',
  mic:'M9 3h6v11H9V3Zm-3 8v2a6 6 0 0 0 12 0v-2M12 19v3m-4 0h8',shield:'m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z',lock:'M5 10h14v12H5V10Zm3 0V6a4 4 0 0 1 8 0v4',
  pause:'M8 4v16M16 4v16',play:'m6 3 15 9-15 9V3Z',stop:'M5 5h14v14H5V5Z',refresh:'M20 8A8 8 0 1 0 20 16M20 3v6h-6',copy:'M9 9h12v12H9V9ZM3 15V3h12',
  edit:'m15 3 6 6-12 12H3v-6L15 3Zm-2 2 6 6',trash:'M3 6h18M9 6V3h6v3M6 6l1 16h10l1-16M10 10v7m4-7v7',link:'m9 14 6-6M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 0 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
  external:'M14 3h7v7m0-7L10 14M11 3H3v18h18v-8',image:'M3 3h18v18H3V3Zm0 15 6-7 4 5 3-3 5 5M15 7h.01',chart:'M4 3v18h18M8 17V11m5 6V7m5 10V4',
  panel:'M3 3h18v18H3V3Zm12 0v18',sidebar:'M3 3h18v18H3V3Zm5 0v18',maximize:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',minimize:'M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5',
  sun:'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',moon:'M21 13A9 9 0 1 1 11 2a7 7 0 0 0 10 11Z',
  user:'M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-4a8 8 0 0 1 16 0v4',memory:'M9 3a3 3 0 0 0-5 3 4 4 0 0 0-2 7 4 4 0 0 0 3 7c0 3 7 3 7 0V6c0-5 7-5 7 0 4 4 0 0 1 2 7 4 4 0 0 1-3 7c0 3-6 3-6 0',
  info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-1v6m0-10h.01',help:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 8a3 3 0 1 1 5 3l-2 2m0 4h.01',bell:'M5 16V9a7 7 0 0 1 14 0v7l2 3H3l2-3Zm5 6h4',
  monitor:'M2 3h20v14H2V3Zm10 14v5m-5 0h10',cpu:'M6 6h12v12H6V6Zm3-4v4m6-4v4m-6 12v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4',mail:'M3 4h18v16H3V4Zm0 0 9 8 9-8',
  pin:'m8 3 8 0-1 7 4 4H5l4-4-1-7Zm4 11v8',target:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-5 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',list:'M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1',
  sliders:'M4 3v7m0 4v7M12 3v12m0 4v2M20 3v3m0 4v11M1 10h6m2 5h6m2-9h6',cloud:'M6 19a5 5 0 1 1 0-10 7 7 0 0 1 13-3 7 7 0 0 1 2 13H6Z',checkCircle:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-14 0 3 3 7-7',
  alert:'m12 2 11 19H1L12 2Zm0 6v6m0 3h.01',paperclip:'m8 14 8-8a3 3 0 0 1 4 4L9 21a5 5 0 0 1-7-7L14 2',history:'M3 8V3m0 5h5M3 8a9 9 0 1 1-1 7m10-9v6l4 2',eye:'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Zm15 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
};
export function icon(name,size=18) { const aliases={chevronDown:'down',chevronRight:'chevron',arrowLeft:'back',arrowRight:'arrow',x:'close',zap:'bolt',message:'chat',brain:'memory',package:'plugin',pencil:'edit',trash2:'trash',fileText:'file',checkcircle:'checkCircle',layout:'panel',grid:'expert','chevron-down':'down','chevron-right':'chevron','arrow-up-right':'external','arrow-left':'back','arrow-right':'arrow','file-text':'file','message-square':'chat',plug:'plugin',layers:'expert',activity:'chart',video:'monitor','refresh-cw':'refresh','check-circle':'checkCircle'};return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[aliases[name]||name]||paths.file}"/></svg>`; }
export function newTask(prompt,options={}) {
 const id=uid('task');return {id,title:prompt.replace(/\s+/g,' ').slice(0,24)||'新任务',prompt,messages:[{role:'user',text:prompt,time:Date.now()}],status:'running',progress:0,startedAt:Date.now(),createdAt:Date.now(),elapsed:0,kind:/PPT|汇报|演示文稿|办公文件|Excel|表格|PDF|Word/i.test(prompt)?'office':'dashboard',project:options.project||'',expert:options.expert||'',model:options.model||'Claude Opus 5.5',effort:options.effort||'High',permission:options.permission||'请求批准',mode:options.mode||'普通模式',origin:options.origin||(options.scheduleDraft?'schedule-draft':'manual'),scheduleDraft:options.scheduleDraft||null,context:options.context||[],draft:'',annotations:[],files:[],viewer:{open:false,active:'',tabs:[],max:false},changes:[],versions:[]};
}
export function initialState() {
 const a=newTask('制作三个项目的进展看板，支持筛选与详情',{project:'design'});Object.assign(a,{id:'sample-dashboard',origin:'sample',title:'三个项目的进展看板',status:'complete',progress:4,elapsed:14,kind:'dashboard'});a.messages.push({role:'assistant',text:'项目看板已经准备好了。三个项目的状态、风险和下一步都放在同一页，你可以在右侧筛选查看，也可以选中标题直接提出修改。',time:Date.now()});
 const b=newTask('生成季度项目复盘汇报，包含 PPT、数据表和文档',{project:'research'});Object.assign(b,{id:'sample-office',origin:'sample',title:'季度项目复盘汇报',status:'complete',progress:4,elapsed:18,kind:'office'});b.messages.push({role:'assistant',text:'汇报材料已整理为四份文件。打开演示文稿可以逐页浏览，选中文字后添加修改意见；表格中的项目明细和汇总可以切换查看。',time:Date.now()});
 return {version:1,tasks:[a,b],projects:[{id:'design',name:'产品设计',description:'产品方案、交互研究与原型',color:'blue'},{id:'research',name:'项目研究',description:'项目数据与复盘材料',color:'orange'}],homeDraft:'',homeContext:[],composer:{model:'Claude Opus 5.5',effort:'High',permission:'请求批准',mode:'普通模式',project:'',expert:''}};
}
export function loadState() {try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved?.version===1&&Array.isArray(saved.tasks)&&Array.isArray(saved.projects))return saved;}catch{}return initialState();}
export function saveState(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
export function download(filename,content,mime='text/plain;charset=utf-8'){const blob=new Blob([content],{type:mime});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
