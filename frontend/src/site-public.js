import {embeddedSiteHtml} from './site-model.js';
// This page only reads publication snapshots. It never saves application state.
const STORAGE_KEY='chengxiaoyou.replica.v1';
const id=globalThis.__CHENGXIAOYOU_SINGLE_FILE__?decodeURIComponent(location.hash.slice('#published/'.length)):new URL(location.href).searchParams.get('id');
const frame=document.querySelector('#site-frame');
let rendered='';
function showEmpty(title,description){
 frame.hidden=true;frame.removeAttribute('srcdoc');rendered='';
 document.querySelector('#site-empty').hidden=false;
 document.querySelector('#empty-title').textContent=title;
 document.querySelector('#empty-description').textContent=description;
 document.querySelector('#site-name').textContent='站点';
 document.querySelector('#site-scope').textContent='本地发布 · 仅当前浏览器可读取';
 document.title='站点 · 小悠';
}
function renderPublishedSite(){
 let state;
 try{state=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{showEmpty('暂时无法读取站点','无法访问当前浏览器中的内容。请返回小悠检查站点是否已发布。');return;}
 const savedSites=state?.workspace?.sites;
 const site=Array.isArray(savedSites)?savedSites.find(s=>s?.id===id):null;
 if(!site){showEmpty('当前浏览器没有这个站点','这个链接读取本机当前浏览器中的发布内容。请使用发布时的浏览器和站点地址打开，或返回站点列表。');return;}
 if(site.status==='deleted'||site.deletedAt){showEmpty('这个站点已删除','发布内容当前不可访问。恢复站点后，可以继续使用这个链接。');return;}
 if(site.status!=='published'||!site.html){showEmpty('这个站点尚未发布','请返回会话，确认网页内容后点击“发布站点”。');return;}
 document.querySelector('#site-name').textContent=site.name;
 document.querySelector('#site-scope').textContent=`本地发布 · 第 ${site.version} 版 · 仅当前浏览器可读取`;
 document.title=`${site.title||site.name} · 小悠`;
 document.querySelector('#site-empty').hidden=true;frame.hidden=false;
 const signature=`${site.id}:${site.version}:${site.updatedAt}`;
 if(signature!==rendered){frame.srcdoc=embeddedSiteHtml(site.html);rendered=signature;}
}
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===null)renderPublishedSite();});
window.addEventListener('focus',renderPublishedSite);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderPublishedSite();});
renderPublishedSite();
