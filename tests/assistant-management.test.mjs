import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,esc,icon} from '../frontend/src/core.js';
import {initOffice} from '../frontend/src/office-model.js';
import {handleExperts} from '../frontend/src/experts-ui.js';
import {pinExpert,savedExperts} from '../frontend/src/expert-library.js';
import {initCatalog,renderCatalog,handleCatalog} from '../frontend/src/catalog.js';
test('management separates installed and authored assistants, ignores retired filters, and preserves detail/edit actions',()=>{
 const state=initialState();initCatalog(state);initOffice(state);
 state.catalog.experts.push({id:'mine',name:'我的测试助理',description:'整理材料',custom:true},{id:'downloaded',name:'安装测试助理',description:'核对资料',custom:true,installed:true});
 const c={state,ui:{route:'expert-config',catalog:{queries:{experts:'不存在'},filters:{experts:'失效分类'}}},esc,icon,render(){},save(){},go(route){this.ui.route=route},toast(){},modal(title,body){this.dialog={title,body}}};
 let html=renderCatalog(c);
 assert.match(html,/安装测试助理/);assert.match(html,/ArtNova 数据洞察助理/);assert.doesNotMatch(html,/我的测试助理/);
 assert.doesNotMatch(html,/data-live="cat:search"|data-action="cat:market"|data-action="cat:new-expert"|data-action="cat:filter"/);
 const before=JSON.stringify(state.catalog.experts);
 assert.equal(handleCatalog('cat:manage-tab',{dataset:{id:'created'}},c),true);
 html=renderCatalog(c);assert.match(html,/我的测试助理/);assert.doesNotMatch(html,/安装测试助理|ArtNova 数据洞察助理/);assert.match(html,/data-action="cat:manage-dashboard" data-id="mine"/);
 assert.equal(JSON.stringify(state.catalog.experts),before);
 handleExperts('cat:expert-detail',{dataset:{id:'mine'}},c);assert.match(c.dialog.body,/data-action="cat:edit-expert"/);
 handleCatalog('cat:manage-dashboard',{dataset:{id:'mine'}},c);assert.match(c.dialog.body,/示例数据/);assert.match(c.dialog.body,/活跃使用者/);
 handleCatalog('cat:dashboard-range',{dataset:{id:'mine',value:'7'}},c);assert.match(c.dialog.body,/2026\/10\/21/);
 handleCatalog('cat:dashboard-metric',{dataset:{id:'mine',value:'users'}},c);assert.match(c.dialog.body,/7天每日使用人数趋势/);
 const tasksBefore=state.tasks.length;
 handleCatalog('cat:manage-pin',{dataset:{id:'mine'}},c);const mine=savedExperts(state).find(a=>a.publishId==='mine');assert.equal(mine.pinned,true);assert.match(renderCatalog(c),/取消固定/);assert.equal(state.tasks.length,tasksBefore);
 pinExpert(state,mine.id,false);assert.match(renderCatalog(c),/固定到左侧/);
 handleCatalog('cat:manage-chat',{dataset:{id:'mine'}},c);assert.equal(c.ui.route,'agent/'+mine.id);assert.equal(mine.pinned,false);assert.equal(state.tasks.length,tasksBefore);c.ui.route='expert-config';
 c.ui.catalog.expertManageTab='installed';assert.match(renderCatalog(c),/经营分析 Agent/);handleCatalog('cat:manage-pin',{dataset:{id:'artnova'}},c);const art=savedExperts(state).find(a=>a.publishId==='artnova');assert.equal(art.pinned,true);handleCatalog('cat:manage-pin',{dataset:{id:'artnova'}},c);assert.equal(art.pinned,false);
 c.ui.catalog.expertManageTab='created';
 state.catalog.experts=state.catalog.experts.filter(x=>x.id!=='mine');assert.match(renderCatalog(c),/还没有创建助理/);
 handleCatalog('cat:manage-tab',{dataset:{id:'installed'}},c);assert.match(renderCatalog(c),/安装测试助理/);
});

test('creator analytics aggregates a consistent synthetic period without personal state',async()=>{
 const {assistantAnalytics}=await import('../frontend/src/assistant-analytics.js');
 for(const days of [7,30]){
 const d=assistantAnalytics(days);
 assert.equal(d.trend.length,days);assert.equal(d.activeUsers,12);
 assert.equal(d.calls,d.trend.reduce((s,r)=>s+r.calls,0));
 assert.equal(d.calls,d.users.reduce((s,r)=>s+r.calls,0));
 assert.equal(d.calls,d.teams.reduce((s,r)=>s+r.calls,0));
 assert.equal(d.failed,d.trend.reduce((s,r)=>s+r.failed,0));
 assert.ok(d.failed>0&&d.failed<d.calls);
 assert.ok(d.trend.every(r=>r.users<=d.activeUsers));
 }
 assert.ok(assistantAnalytics(30).calls>assistantAnalytics(7).calls);
});
