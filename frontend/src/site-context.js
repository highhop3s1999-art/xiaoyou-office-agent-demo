import {composer} from './chat.js';
import {getSite,makeSiteRequest,siteUrl} from './site-model.js';

export const SITE_EXAMPLE='帮我做一个可以分享的单页网站，主题是「团队周报」，包含本周进展、关键数据和下周计划。先用示例内容生成草稿，预览确认后发布。';

export function prepareSiteTask(ctx,id='') {
 const key=id||'new';ctx.state.siteComposers||={};
 const request=makeSiteRequest(ctx.state,id);if(request.error){ctx.toast(request.error);return request;}
 if(ctx.state.siteComposers[key]){const existing=ctx.state.siteComposers[key];if(id&&existing.siteRequest?.baseVersion!==request.baseVersion){existing.siteRequest=request;ctx.save();}return existing;}
 const site=id?getSite(ctx.state,id):null;
 const draft={...ctx.state.composer,project:'',mode:'普通模式',expert:'',context:[],isSiteDraft:true,siteDraftKey:key,siteRequest:request,
  draft:id?`编辑站点「${site?.name||request.name}」${site?.status==='published'?'：'+siteUrl(id,typeof location==='undefined'?'http://localhost/':location.href):''}。\n修改要求：`:SITE_EXAMPLE};
 ctx.state.siteComposers[key]=draft;ctx.save();return draft;
}
export function getSiteComposer(ctx) {
 if(!ctx.ui.route.startsWith('site-task/'))return null;
 const key=ctx.ui.route.slice('site-task/'.length);if(!key)return null;
 const draft=ctx.state.siteComposers?.[key]||prepareSiteTask(ctx,key==='new'?'':key);
 return draft?.error?null:draft;
}
export function resetSiteComposer(state,draft){if(draft?.siteDraftKey)delete state.siteComposers?.[draft.siteDraftKey];}
export function validateSiteTask(state,task){
 const id=task?.siteRequest?.siteId;
 if(id&&!getSite(state,id))return '这个站点已删除或不在当前浏览器中。输入已保留，请返回站点列表确认。';
 return '';
}
export function renderSiteTask(ctx){
 const draft=getSiteComposer(ctx);if(!draft)return `<section class="empty-state"><h2>这个站点暂不可编辑</h2><p>它可能已删除，或不在当前浏览器中。</p><button class="btn" data-action="app:go" data-route="sites">返回站点</button></section>`;
 const site=draft.siteRequest.siteId?getSite(ctx.state,draft.siteRequest.siteId):null;
 const issue=validateSiteTask(ctx.state,draft);
 return `<main class="home-page site-compose-page"><header class="conversation-header"><div class="conversation-title"><h2>${draft.siteRequest.siteId?'修改站点':'创建站点'}</h2></div><button class="btn ghost small" data-action="app:go" data-route="sites">${ctx.icon('back',15)}返回站点</button></header><div class="site-compose-center"><div class="site-compose-icon">${ctx.icon('globe',30)}</div><h1>${site?'继续完善「'+ctx.esc(site.name)+'」':'想用一个网页呈现什么？'}</h1><p class="muted">${site?'告诉小悠要改哪里。生成的修改会先保留为草稿，确认发布后才更新原链接。':'告诉小悠网页的主题、内容和风格。先生成草稿，预览满意后再发布。'}</p>${site?.status==='published'?`<div class="site-source-pill">${ctx.icon('link',15)}${ctx.esc(site.name)}<span>已发布 v${site.version}</span></div>`:''}${issue?`<p class="site-error" role="alert">${ctx.esc(issue)}</p>`:''}${composer(ctx,draft)}<p class="site-scope-note">站点发布在当前浏览器中，可通过本地链接打开。内容可在发布前编辑。</p></div></main>`;
}
