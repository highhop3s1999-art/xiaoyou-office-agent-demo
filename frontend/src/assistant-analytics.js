// Synthetic creator analytics. Never derived from personal conversation content.
const PEOPLE=['林晓','陈默','周宁','李悦','许言','苏晴','王晨','赵一','沈然','陆可','方圆','吴桐'];
const TEAMS=['产品团队','运营团队','研发团队'];
export function assistantAnalytics(days=30){
  days=days===7?7:30;
  const end=Date.UTC(2026,9,27),dayMs=86400000;
  const rows=[];
  for(let d=0;d<60;d++)for(let u=0;u<PEOPLE.length;u++){
    if((d+u*3)%5===0||(d<30&&u>8))continue;
    const calls=2+(d*7+u*11)%9+(d>=30?2:0);
    rows.push({date:new Date(end-(59-d)*dayMs).toISOString().slice(0,10),user:PEOPLE[u],team:TEAMS[u%3],calls,failed:(d+u)%13===0?1:0});
  }
  const start=new Date(end-(days-1)*dayMs).toISOString().slice(0,10),previousStart=new Date(end-(days*2-1)*dayMs).toISOString().slice(0,10);
  const selected=rows.filter(r=>r.date>=start),previous=rows.filter(r=>r.date>=previousStart&&r.date<start);
  const summarize=rs=>({users:new Set(rs.map(r=>r.user)).size,calls:rs.reduce((s,r)=>s+r.calls,0),failed:rs.reduce((s,r)=>s+r.failed,0)});
  const totals=summarize(selected),prev=summarize(previous);
  const trend=Array.from({length:days},(_,i)=>{const date=new Date(end-(days-1-i)*dayMs).toISOString().slice(0,10);return {date,...summarize(selected.filter(r=>r.date===date))}});
  const users=PEOPLE.map(user=>{const rs=selected.filter(r=>r.user===user);return {name:user,team:rs[0]?.team,...summarize(rs),last:rs.at(-1)?.date}}).filter(r=>r.calls).sort((a,b)=>b.calls-a.calls);
  const teams=TEAMS.map(name=>({name,...summarize(selected.filter(r=>r.team===name))}));
  return {days,start,end:'2026-10-27',...totals,previous:prev,trend,users,teams,activeUsers:users.length};
}
function trendChart(data,metric){
  const values=data.trend.map(r=>r[metric]),max=Math.ceil(Math.max(...values)/4)*4||4;
  const width=760,left=34,right=12,top=16,bottom=166;
  const point=(v,i)=>[left+i*(width-left-right)/(values.length-1),bottom-v/max*(bottom-top)];
  const points=values.map(point),path=points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const label=metric==='calls'?'调用次数':'使用人数';
  return `<svg class="aa-chart" viewBox="0 0 760 202" role="img" aria-label="${data.days}天每日${label}趋势"><title>每日${label}趋势</title>${[0,1,2,3,4].map(i=>{const y=bottom-i*(bottom-top)/4;return `<line x1="${left}" x2="748" y1="${y}" y2="${y}" stroke="#ededed"/><text x="24" y="${y+4}" text-anchor="end">${max*i/4}</text>`}).join('')}<path d="${path} L748,166 L34,166 Z" fill="#f3f1f8"/><path d="${path}" fill="none" stroke="#8b7bae" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${points.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="3" fill="#8b7bae"><title>${data.trend[i].date} · ${label} ${values[i]}</title></circle>`).join('')}${[0,Math.floor((values.length-1)/3),Math.floor((values.length-1)*2/3),values.length-1].map(i=>`<text x="${point(0,i)[0]}" y="192" text-anchor="${i===0?'start':i===values.length-1?'end':'middle'}">${data.trend[i].date.slice(5).replace('-','/')}</text>`).join('')}</svg>`;
}
export function renderAssistantAnalytics(ctx,x,{days=30,metric='calls'}={}){
 const d=assistantAnalytics(days),e=ctx.esc,number=n=>n.toLocaleString('en-US'),success=((d.calls-d.failed)/d.calls*100).toFixed(1);
 const control=(action,value,label,selected)=>`<button type="button" data-action="cat:${action}" data-id="${e(x.publishId)}" data-value="${value}" aria-pressed="${selected}" class="${selected?'active':''}">${label}</button>`;
 const change=(now,before)=>now===before?`与前${d.days}天持平`:`较前${d.days}天 ${now>before?'↑':'↓'} ${Math.abs((now-before)/before*100).toFixed(1)}%`;
 return `<section class="assistant-dashboard"><div class="assistant-dashboard-heading"><span class="cat-expert-avatar cat-tone-violet">${ctx.icon(x.icon||'expert',24)}</span><div><h2>${e(x.name)} <span class="aa-sample">示例数据</span></h2><p>了解其他人如何使用你的助理</p></div></div><div class="aa-toolbar"><span>${d.start.replaceAll('-','/')} — ${d.end.replaceAll('-','/')}</span><div class="aa-segment" aria-label="统计周期">${[7,30].map(n=>control('dashboard-range',n,`近${n}天`,d.days===n)).join('')}</div></div><div class="assistant-metrics">${[['使用人数',d.activeUsers,'周期内去重，不含创建者',change(d.activeUsers,d.previous.users)],['调用次数',number(d.calls),'用户每次提交请求计为一次',change(d.calls,d.previous.calls)],['人均调用',(d.calls/d.activeUsers).toFixed(1),'调用次数 ÷ 使用人数','了解助理的使用深度'],['调用成功率',success+'%','成功完成的调用占比',`${number(d.failed)} 次调用未成功`]].map(([label,value,note,delta])=>`<div><span title="${note}">${label}</span><strong>${value}</strong><small>${delta}</small></div>`).join('')}</div><section class="aa-panel"><div class="aa-panel-head"><div><h3>使用趋势</h3><p>按天查看使用变化</p></div><div class="aa-segment">${control('dashboard-metric','calls','调用次数',metric==='calls')}${control('dashboard-metric','users','使用人数',metric==='users')}</div></div>${trendChart(d,metric)}</section><div class="aa-bottom"><section class="aa-panel"><div class="aa-panel-head"><div><h3>团队分布</h3><p>按调用次数统计</p></div></div><div class="aa-team-list">${d.teams.sort((a,b)=>b.calls-a.calls).map(t=>`<div><div><strong>${t.name}</strong><span>${number(t.calls)} 次 · ${(t.calls/d.calls*100).toFixed(1)}%</span></div><div class="aa-bar"><i style="width:${t.calls/d.calls*100}%"></i></div><small>${t.users} 位使用者</small></div>`).join('')}</div></section><section class="aa-panel"><div class="aa-panel-head"><div><h3>活跃使用者</h3><p>按调用次数排序 · 前 5 位</p></div></div><table class="aa-users"><thead><tr><th>使用者</th><th>调用次数</th><th>最近使用</th></tr></thead><tbody>${d.users.slice(0,5).map(u=>`<tr><td><strong>${u.name}</strong><small>${u.team}</small></td><td>${number(u.calls)}</td><td>${u.last.slice(5).replace('-','/')}</td></tr>`).join('')}</tbody></table></section></div><details class="aa-definitions"><summary>统计口径与数据说明</summary><p>使用人数按账号去重，不含创建者本人。调用次数按用户提交的请求统计，包含失败调用，不将一次请求中的工具调用重复计数。成功率为成功调用数除以全部调用数。日使用人数不可相加作为周期使用人数。</p><p>当前展示固定截至 2026/10/27 的虚构示例，人物、团队和使用数据均为演示内容；切换周期会同步更新全部指标。尚未接入线上埋点，不读取个人对话内容。</p></details></section>`;
}
