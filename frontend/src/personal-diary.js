import {esc, icon} from './core.js';

// A read-only projection of local task evidence. Diary edits never modify a task.
const MIN_DATE = '1970-01-01';
const labels = {html:'交互看板', ppt:'演示文稿', sheet:'电子表格', doc:'文档', pdf:'阅读版'};
const list = value => Array.isArray(value) ? value : [];
const timestamp = value => value === undefined || value === null || value === '' ? NaN : new Date(value).getTime();
export function diaryDate(value = Date.now()) {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
}
function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [y,m,d] = value.split('-').map(Number), date = new Date(y,m-1,d,12);
  return diaryDate(date) === value ? date : null;
}
export function shiftDiaryDate(value, step) {
  const date = parseDate(value); if (!date) return '';
  date.setDate(date.getDate()+step); return diaryDate(date);
}
function validDate(value, today = diaryDate()) { return !!parseDate(value) && value >= MIN_DATE && value <= today; }
const onDay = (value,date) => diaryDate(timestamp(value)) === date;
const clock = value => new Date(value).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
const short = (value,max=88) => String(value || '').replace(/\s+/g,' ').slice(0,max);
const quoted = value => `「${short(value,40)}」`;
const button = (label,action,attrs='',klass='') => `<button type="button" class="diary-btn ${klass}" data-action="diary:${action}" ${attrs}>${label}</button>`;
function initDiary(state) {
  state.personalDiary ||= {version:1,selectedDate:diaryDate(),days:{},favorites:[]};
  const diary = state.personalDiary; diary.days ||= {}; diary.favorites ||= [];
  if (!validDate(diary.selectedDate)) diary.selectedDate = diaryDate();
  return diary;
}
function taskTimes(task) {
  return [task.createdAt, ...list(task.messages).map(m=>m.time), ...list(task.changes).map(x=>x.at), ...list(task.versions).map(x=>x.at), ...list(task.files).flatMap(f=>[f.createdAt,f.updatedAt])].map(timestamp).filter(Number.isFinite);
}
function fileBirth(task,file) {
  if (Number.isFinite(timestamp(file.createdAt))) return timestamp(file.createdAt);
  if (file.secretaryVersion) {
    const imported=list(task.messages).find(m=>m.role==='assistant' && m.text?.includes(`已带入 v${file.secretaryVersion} 私有草稿`));
    if (Number.isFinite(timestamp(imported?.time))) return timestamp(imported.time);
  }
  // Legacy files have no birth timestamp. Use the first local delivery receipt,
  // not the most recent message (which would re-date every old file on every chat).
  const firstReply = list(task.messages).find(m=>m.role==='assistant' && Number.isFinite(timestamp(m.time)));
  return timestamp(firstReply?.time ?? task.createdAt);
}
function fileAtDay(task,file,date) {
  const nextDay = parseDate(shiftDiaryDate(date,1)); nextDay.setHours(0,0,0,0);
  // Viewer versions are snapshots saved immediately BEFORE a change.
  const future = list(task.versions).filter(v=>v.fileId===file.id && timestamp(v.at)>=nextDay.getTime()).sort((a,b)=>timestamp(a.at)-timestamp(b.at))[0];
  return future ? {content:future.content,version:future.version,historical:true} : {content:file.content,version:file.version||1,historical:false};
}
function secretaryVersions(item) {
  const revisions = list(item.history).filter(h=>/交付 v\d|准备 v\d|生成新版本/.test(h.text || ''));
  return list(item.versions).map((version,index)=>({
    ...version,
    at: timestamp(version.at ?? (index===0 ? item.createdAt : revisions[index-1]?.at))
  })).filter(v=>Number.isFinite(v.at));
}
function evidenceMoment(source,at,title,detail) { return {id:`${source.key}:${at}:${title}`,at,title,detail,sourceKey:source.key,sourceTitle:source.title}; }

export function collectDiaryDay(state,date) {
  if (!parseDate(date)) return {date,activities:[],artifacts:[],moments:[],text:''};
  const activities=[], artifacts=[], moments=[], secretary=list(state.secretary?.items);
  const today=diaryDate(), cutoff=parseDate(shiftDiaryDate(date,1)); cutoff.setHours(0,0,0,0);
  for (const item of secretary) {
    const history=list(item.history).filter(h=>onDay(h.at,date));
    if (!history.length && !onDay(item.createdAt,date)) continue;
    const key=`secretary:${item.id}`, at=Math.max(...history.map(h=>timestamp(h.at)),timestamp(item.createdAt)||0);
    const last=history[history.length-1], createdOnly=history.every(h=>/载入合成案例/.test(h.text||''));
    const summary=createdOnly ? short(item.versions?.[0]?.pages?.[0]?.paragraphs?.[0] || item.source,120) : short(last?.text || '这件事有一条本地记录',120);
    const activity={key,kind:'secretary',id:item.id,title:item.title,at,summary,source:'秘书合成示例',history,seed:createdOnly};
    activities.push(activity);
    const versions=secretaryVersions(item).filter(v=>v.at<cutoff.getTime());
    const version=versions.sort((a,b)=>b.at-a.at || b.version-a.version)[0];
    if (version?.pages?.length) artifacts.push({key:`${key}:v${version.version}`,sourceKey:key,kind:'secretary',sourceId:item.id,name:item.artifact,type:'doc',version:version.version,content:{title:item.artifact,pages:version.pages},at:version.at,sourceTitle:item.title,historical:version.version!==item.version,provenance:onDay(version.at,date)?'当日草稿':'当日涉及 · 此前草稿'});
    for (const h of history) {
      if (/用户决定：等待/.test(h.text||'')) moments.push(evidenceMoment(activity,h.at,'你给结论留了核验的余地',`在${quoted(item.title)}里，你选择先等统一口径资料，再继续。`));
      else if (/按用户决定准备/.test(h.text||'')) moments.push(evidenceMoment(activity,h.at,'你把一个待定问题往前推了一步',`在${quoted(item.title)}里，你确认了统计口径，小悠据此更新了草稿。`));
      else if (/已采用为私有成果/.test(h.text||'')) moments.push(evidenceMoment(activity,h.at,'你选定了一份可以继续用的成果',`你采用了${quoted(item.artifact)}，这份选择已保留在事项记录里。`));
    }
  }
  for (const task of list(state.tasks)) {
    const times=taskTimes(task).filter(t=>onDay(t,date));
    if (!times.length) continue;
    // A workspace opened from a secretary item is the same work, not a new task.
    const linked=task.secretaryItemId && secretary.find(x=>x.id===task.secretaryItemId);
    const sourceKey=linked?`secretary:${linked.id}`:`task:${task.id}`;
    const messages=list(task.messages).filter(m=>onDay(m.time,date));
    const reply=[...messages].reverse().find(m=>m.role==='assistant');
    const edits=list(task.changes).filter(x=>onDay(x.at,date)&&!x.undone);
    const summary=edits.length?`在成果里留下了 ${edits.length} 处具体修改。`:reply?short(reply.text,120):`你把${quoted(task.title)}交给了小悠；这一天尚未留下交付回复。`;
    let activity=activities.find(x=>x.key===sourceKey);
    if (!activity) {
      activity={key:sourceKey,kind:linked?'secretary':'task',id:linked?.id||task.id,title:linked?.title||task.title,at:Math.max(...times),summary,source:task.origin==='personal-welcome'?'新人引导合成示例':task.origin==='sample'?'任务合成示例':'本地任务记录',history:[],seed:['sample','personal-welcome'].includes(task.origin)};
      activities.push(activity);
    }
    activity.taskId=task.id;
    for (const file of list(task.files)) {
      const birth=fileBirth(task,file);
      const touched=onDay(birth,date)||onDay(file.updatedAt,date)||list(task.changes).some(x=>x.fileId===file.id&&onDay(x.at,date))||list(task.versions).some(x=>x.fileId===file.id&&onDay(x.at,date));
      if (!touched || birth>=cutoff.getTime() || !file.content) continue;
      const snapshot=fileAtDay(task,file,date);
      const key=`task:${task.id}:file:${file.id}`;
      // Imported secretary vN is the same artifact. Actual workspace edits remain distinct.
      const duplicate=linked && file.secretaryVersion && snapshot.version===1 && artifacts.some(a=>a.sourceId===linked.id&&a.version===file.secretaryVersion);
      if (!duplicate) artifacts.push({key,sourceKey,kind:'task',sourceId:task.id,fileId:file.id,name:file.name,type:file.type,...snapshot,at:birth,sourceTitle:activity.title,provenance:onDay(birth,date)?'当日交付':'当日更新'});
    }
    if (edits.length) {
      const change=edits[edits.length-1];
      moments.push(evidenceMoment(activity,change.at,'你把改进落到了具体内容上',`在${quoted(change.fileName||task.title)}里，把“${short(change.before,32)}”改成了“${short(change.after,32)}”。`));
    }
    const actualRequests=messages.filter(m=>m.role==='user'&&task.origin!=='sample'&&task.origin!=='duplicate'&&task.origin!=='personal-welcome'&&!linked);
    if (!edits.length && actualRequests.length) {
      const request=actualRequests[actualRequests.length-1];
      moments.push(evidenceMoment(activity,request.time,'一个想法，被你说成了具体的请求',`你留下了这句交办：“${short(request.text,90)}”`));
    }
  }
  activities.sort((a,b)=>b.at-a.at); artifacts.sort((a,b)=>b.at-a.at); moments.sort((a,b)=>timestamp(b.at)-timestamp(a.at));
  const names=activities.slice(0,2).map(x=>quoted(x.title)).join('、');
  let text=activities.length ? `${date===today?'今天':'这一天'}的本地记录里，我们一起照看了 ${activities.length} 件事：${names}${activities.length>2?'等':''}。${artifacts.length?`留下了 ${artifacts.length} 份可以回看的成果。`:'工作过程已经留下记录，还没有可查看的文件成果。'}` : '';
  if (moments.length) text+=`\n\n${moments[0].detail}`;
  else if (activities.some(x=>x.seed)) text+='\n\n这里保留了演示事项与草稿；你亲自作出的判断和修改，会在发生后再被记下来。';
  return {date,activities,artifacts,moments,text};
}

function actionAttrs(key,date) { return `data-key="${esc(key)}" data-date="${esc(date)}"`; }
function isFavorite(diary,key,date) { return diary.favorites.some(x=>x.sourceKey===key&&x.date===date); }
function renderArtifactCard(item,date) {
  return `<button class="diary-artifact" type="button" data-action="diary:artifact" ${actionAttrs(item.key,date)}><span class="diary-file-icon">${icon(item.type==='sheet'?'chart':item.type==='ppt'?'panel':item.type==='html'?'code':'file',20)}</span><span class="diary-artifact-copy"><strong>${esc(item.name)}</strong><small>${labels[item.type]||'成果'} · v${item.version} · ${item.provenance}</small><span>${esc(item.sourceTitle)}</span></span>${icon('chevron',16)}</button>`;
}
export function collectDiaryDates(state) {
  const dates=new Set();
  const add=value=>{const date=diaryDate(timestamp(value));if(validDate(date))dates.add(date);};
  for(const task of list(state.tasks))taskTimes(task).forEach(add);
  for(const item of list(state.secretary?.items)){add(item.createdAt);list(item.history).forEach(h=>add(h.at));}
  for(const [date,entry] of Object.entries(state.personalDiary?.days||{}))if(validDate(date)&&(entry.text?.trim()||entry.note?.trim()))dates.add(date);
  for(const item of list(state.personalDiary?.favorites))if(validDate(item.date))dates.add(item.date);
  return [...dates].sort((a,b)=>b.localeCompare(a));
}
function diaryListRow(c,date) {
  const day=collectDiaryDay(c.state,date),entry=c.state.personalDiary.days[date]||{},d=parseDate(date);
  const personalText=entry.text?.trim()||entry.note?.trim()||'',saved=c.state.personalDiary.favorites.find(item=>item.date===date);
  const displayTitle=value=>String(value||'').replace(/\s*·\s*认识小悠$/,'');
  const title=short(personalText.split('\n')[0]||displayTitle(day.activities[0]?.title||saved?.title)||'我的一天',32);
  const others=day.activities.slice(1).filter(item=>displayTitle(item.title)!==displayTitle(day.activities[0]?.title));
  const names=others.slice(0,2).map(item=>`「${short(displayTitle(item.title),22)}」`), remaining=Math.max(0,others.length-2);
  const summary=personalText?short(personalText,70):names.length?`还有${names.join('、')}${remaining?`等 ${others.length} 件事`:''}。`:'';
  const sample=day.activities.some(x=>x.seed||x.kind==='secretary')||day.artifacts.length>0;
  return `<button type="button" class="diary-day-card" data-action="diary:open-day" data-date="${date}" aria-label="打开 ${date} 的日记：${esc(title)}"><span class="diary-day-badge"><small>${d.getMonth()+1} 月</small><strong>${String(d.getDate()).padStart(2,'0')}</strong><span>${d.toLocaleDateString('zh-CN',{weekday:'short'})}</span></span><span class="diary-day-copy"><span class="diary-day-title">${esc(title)}${sample?'<small class="diary-sample">示例</small>':''}</span>${summary?`<span class="diary-day-summary">${esc(summary)}</span>`:''}<span class="diary-day-meta">${day.artifacts.length?`${day.artifacts.length} 份成果`:'个人记录'}</span></span><span class="diary-day-arrow">${icon('chevron',18)}</span></button>`;
}
export function renderDiary(c) {
  const diary=initDiary(c.state);
  if(c.ui.diaryView==='detail')return renderDiaryDetail(c);
  const dates=collectDiaryDates(c.state),months=[...new Set(dates.map(date=>date.slice(0,7)))];
  const filter=c.ui.diaryMonth||'all';
  if(filter!=='all'&&!months.includes(filter))months.push(filter);
  months.sort((a,b)=>b.localeCompare(a));
  const shown=dates.filter(date=>filter==='all'||date.startsWith(filter));
  return `<section class="diary-page diary-list-page" aria-label="日记"><header class="diary-list-head"><h1>日记</h1><div class="diary-list-controls"><form data-form="diary:month" data-identity="${esc(filter)}"><label class="sr-only" for="diary-month">日记月份</label><select id="diary-month" name="month"><option value="all" ${filter==='all'?'selected':''}>全部月份</option>${months.map(month=>`<option value="${month}" ${month===filter?'selected':''}>${Number(month.slice(0,4))} 年 ${Number(month.slice(5))} 月</option>`).join('')}</select><button class="diary-btn diary-quiet" type="submit">筛选</button></form>${button(icon('plus',16)+' 写日记','write','','diary-primary')}</div></header><div class="diary-day-list">${shown.length?shown.map(date=>diaryListRow(c,date)).join(''):`<div class="diary-list-empty"><p>这里还没有日记，留几句今天的事吧。</p>${button(icon('edit',16)+' 写日记','write','','diary-primary')}</div>`}</div></section>`;
}
function renderDiaryDetail(c) {
  const diary=initDiary(c.state), date=diary.selectedDate, day=collectDiaryDay(c.state,date), entry=diary.days[date]||{}, saved=diary.favorites.filter(x=>x.date===date), d=parseDate(date), today=diaryDate();
  const hasText=!!entry.text?.trim(), displayText=hasText?entry.text:day.text;
  const activities=day.activities.map(item=>`<article class="diary-activity"><span class="diary-timeline-dot"></span><div class="diary-activity-top"><span>${clock(item.at)} · ${item.source}</span>${button(icon('pin',14)+(isFavorite(diary,item.key,date)?' 已珍藏':' 珍藏'),'favorite',`${actionAttrs(item.key,date)} aria-pressed="${isFavorite(diary,item.key,date)}"`,isFavorite(diary,item.key,date)?'diary-saved':'diary-quiet')}</div><button class="diary-activity-title" type="button" data-action="diary:evidence" ${actionAttrs(item.key,date)}>${esc(item.title)} ${icon('external',13)}</button><p>${esc(item.summary)}</p></article>`).join('');
  return `<section class="diary-page diary-detail-page" aria-label="每日日记"><header class="diary-head"><div>${button(icon('back',15)+' 返回日记','back-list','','diary-quiet diary-back')}<h1>${d.getMonth()+1} 月 ${d.getDate()} 日 <small>${d.toLocaleDateString('zh-CN',{weekday:'long'})}</small></h1></div><div class="diary-date-controls">${button(icon('back',17),'previous','aria-label="前一天" '+(date===MIN_DATE?'disabled':''),'diary-icon-button')}<form data-form="diary:date" data-identity="${date}"><label class="sr-only" for="diary-date">选择日记日期</label><input id="diary-date" name="date" type="date" min="${MIN_DATE}" max="${today}" value="${date}" required><button type="submit" class="diary-btn diary-date-submit">查看</button></form>${button(icon('arrow',17),'next',`aria-label="后一天" ${date===today?'disabled':''}`,'diary-icon-button')}${date!==today?button('今天','today','','diary-quiet'):''}</div></header>
  <div class="diary-detail-content"><article class="diary-paper"><div class="diary-note-heading"><div><strong>${hasText?'我的日记':'小悠整理'} ${day.activities.length?'<small class="diary-sample">示例</small>':''}</strong></div>${button(icon('edit',14)+(displayText?' 编辑':' 写几句'),'edit',`data-date="${date}"`,'diary-quiet')}${button(icon('plus',14)+' 补记','note',`data-date="${date}"`,'diary-quiet')}</div>${displayText?`<p class="diary-prose">${esc(displayText).replaceAll('\n','<br>')}</p>`:`<div class="diary-empty diary-empty-paper"><h3>这一天，还没有一起工作的记录。</h3></div>`}${entry.note?`<div class="diary-inline-note"><span>由你记录</span><p class="diary-user-note">${esc(entry.note).replaceAll('\n','<br>')}</p></div>`:''}</article>
  <details class="diary-disclosure diary-artifacts-disclosure" ${c.ui.diaryArtifactsOpen?'open':''}><summary><span>${icon('folder',17)} 成果集合</span><span>${day.artifacts.length} 份 ${icon('chevron',15)}</span></summary><div class="diary-disclosure-body">${day.artifacts.length?`<div class="diary-artifacts">${day.artifacts.map(item=>renderArtifactCard(item,date)).join('')}</div>`:'<p class="diary-gentle">这一天还没有文件成果。</p>'}</div></details>
  ${day.activities.length||saved.length||day.moments.length?`<details class="diary-disclosure diary-extras-disclosure" ${c.ui.diaryExtrasOpen?'open':''}><summary><span>${icon('history',17)} 活动与珍藏</span><span>${day.activities.length} 件事 ${icon('chevron',15)}</span></summary><div class="diary-disclosure-body">${day.activities.length?`<div class="diary-timeline">${activities}</div>`:''}${day.moments.length?`<section class="diary-extra-section"><h2>值得记住</h2>${day.moments.slice(0,3).map(moment=>`<article class="diary-moment"><h3>${esc(moment.title)}</h3><p>${esc(moment.detail)}</p>${button('查看来源 '+icon('chevron',13),'evidence',actionAttrs(moment.sourceKey,date),'diary-quiet')}</article>`).join('')}</section>`:''}${saved.length?`<section class="diary-extra-section"><h2>珍藏</h2>${saved.map(item=>`<div class="diary-keepsake"><button type="button" class="diary-keepsake-title" data-action="diary:saved-evidence" ${actionAttrs(item.sourceKey,date)}>${esc(item.title)}</button>${button(icon('close',13),'favorite',`${actionAttrs(item.sourceKey,date)} aria-label="取消珍藏 ${esc(item.title)}"`,'diary-quiet diary-icon-button')}</div>`).join('')}</section>`:''}</div></details>`:''}</div></section>`;
}
function artifactContent(item) {
  const content=item.content;
  if (typeof content==='string') return `<pre>${esc(content)}</pre>`;
  if (!content || typeof content!=='object') return '<p>这份成果没有可预览的正文。</p>';
  let body='';
  if (content.title) body+=`<h2>${esc(content.title)}</h2>`;
  if (content.subtitle) body+=`<p class="diary-preview-subtitle">${esc(content.subtitle)}</p>`;
  if (Array.isArray(content.pages)) body+=content.pages.map(p=>`<section><h3>${esc(p.heading)}</h3>${list(p.paragraphs).map(t=>`<p>${esc(t)}</p>`).join('')}</section>`).join('');
  if (Array.isArray(content.slides)) body+=content.slides.map((slide,index)=>`<section class="diary-slide"><small>第 ${index+1} 页 · ${esc(slide.eyebrow||'')}</small><h3>${esc(slide.title)}</h3>${[slide.subtitle,slide.body,slide.metric,slide.note].filter(Boolean).map(t=>`<p>${esc(t).replaceAll('\n','<br>')}</p>`).join('')}</section>`).join('');
  if (Array.isArray(content.sheets)) body+=content.sheets.map(sheet=>`<section><h3>${esc(sheet.name)}</h3><div class="diary-table-scroll"><table>${list(sheet.rows).map((row,i)=>`<tr>${list(row).map(cell=>`<${i?'td':'th'}>${esc(cell)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</table></div></section>`).join('');
  if (Array.isArray(content.projects)) body+=content.projects.map(project=>`<section><h3>${esc(project.name)}</h3><p>${esc(project.owner)} · ${esc(project.status)} · ${esc(project.progress)}% · ${esc(project.due)}</p><p>${esc(project.note)}</p><ul>${list(project.tasks).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section>`).join('');
  return body||`<pre>${esc(JSON.stringify(content,null,2))}</pre>`;
}
function showArtifact(c,item,date) {
  const task=item.kind==='task'?c.state.tasks.find(x=>x.id===item.sourceId):c.state.tasks.find(x=>x.secretaryItemId===item.sourceId);
  c.modal(item.name,`<article class="diary-preview"><div class="diary-preview-meta">${esc(date)} · ${labels[item.type]||'成果'} · v${item.version} · ${item.historical?'历史版本':'本地版本'} · 合成演示</div>${artifactContent(item)}</article><div class="diary-modal-actions">${button('返回当天日记','close-preview',`data-date="${date}"`)}${button('查看来源事项','evidence',actionAttrs(item.sourceKey,date))}${task?button('去原任务继续 '+icon('arrow',15),'workspace',`data-task="${esc(task.id)}" ${item.fileId?`data-file="${esc(item.fileId)}"`:''}`,'diary-primary'):''}</div>${task&&item.historical?'<p class="diary-modal-hint">原任务工作区会打开最新内容；上方保留的是所选日期的版本。</p>':''}`,{wide:true});
}
function showEvidence(c,item,date) {
  if (item.kind==='task') { c.go('chat/'+item.id); return; }
  const original=c.state.secretary?.items?.find(x=>x.id===item.id);
  if (!original) { c.toast('来源事项已不在本地，日记与个人补记仍保留。'); return; }
  const day=collectDiaryDay(c.state,date), artifact=day.artifacts.find(x=>x.sourceKey===item.key);
  const task=c.state.tasks.find(x=>x.secretaryItemId===original.id);
  c.modal('这件事的记录',`<div class="diary-evidence"><span class="diary-preview-meta">${esc(date)} · 秘书合成示例</span><h2>${esc(original.title)}</h2><h3>当时的原消息</h3><blockquote>${esc(original.source)}</blockquote><small>${esc(original.sender)} · ${esc(original.channel)} · ${esc(original.sourceId)}</small><h3>这一天的处理记录</h3>${item.history.length?item.history.map(h=>`<p><time>${clock(h.at)}</time> ${esc(h.text)}</p>`).join(''):'<p>在原任务中有操作记录，可以继续查看。</p>'}</div><div class="diary-modal-actions">${button('返回当天日记','close-preview',`data-date="${date}"`)}${artifact?button('查看完整成果','artifact',actionAttrs(artifact.key,date),'diary-primary'):''}${task?button('查看原任务','workspace',`data-task="${esc(task.id)}"`):''}</div>`,{wide:true});
}
function editEntry(c,date,kind) {
  const diary=initDiary(c.state), entry=diary.days[date]||{}, day=collectDiaryDay(c.state,date), note=kind==='note';
  const text=note?(entry.note||''):(entry.text??day.text);
  c.modal(note?'留一句自己的话':'编辑这一天的日记',`<form class="diary-edit-form" data-form="diary:${kind}" data-identity="${date}"><input type="hidden" name="date" value="${date}"><p>${esc(date)} · ${note?'只有你知道的细节，也值得留下。':'保存后保留你的表述，事项和成果继续按记录更新。清空正文并保存，可恢复自动整理。'}</p><label for="diary-entry-text">${note?'我的补记':'日记正文'}</label><textarea id="diary-entry-text" name="text" rows="${note?5:9}" maxlength="5000" placeholder="写几句，留给以后的自己…">${esc(text)}</textarea><div class="diary-modal-actions"><button type="button" class="diary-btn" data-action="app:close-modal">取消</button><button type="submit" class="diary-btn diary-primary">保存${note?'补记':'日记'}</button></div></form>`);
}
function restoreDiaryScroll(top=0){if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{const page=document.querySelector('.page-scroll');if(page)page.scrollTop=top;});}
export function handleDiary(action,el,c) {
  if (!action.startsWith('diary:')) return false;
  const diary=initDiary(c.state), a=action.slice(6), date=el.dataset.date||diary.selectedDate;
  if(typeof document!=='undefined'){for(const [selector,key] of [['.diary-artifacts-disclosure','diaryArtifactsOpen'],['.diary-extras-disclosure','diaryExtrasOpen']]){const panel=document.querySelector(selector);if(panel)c.ui[key]=panel.open;}}
  if(a==='back-list'){c.ui.diaryView='list';c.render();restoreDiaryScroll(c.ui.diaryListScroll||0);return true;}
  if(a==='write'){diary.selectedDate=diaryDate();c.ui.diaryView='detail';editEntry(c,diary.selectedDate,'edit');return true;}
  if(a==='open-day'||a==='close-preview'){
    if(!validDate(date)){c.toast('请选择有效日期。');return true;}
    if(a==='open-day'&&typeof document!=='undefined')c.ui.diaryListScroll=document.querySelector('.page-scroll')?.scrollTop||0;
    if(a==='open-day'){c.ui.diaryArtifactsOpen=false;c.ui.diaryExtrasOpen=false;}
    diary.selectedDate=date;c.ui.diaryView='detail';c.save();if(a==='close-preview')c.closeModal();c.render();if(a==='open-day')restoreDiaryScroll();return true;
  }
  if (['previous','next','today'].includes(a)) {
    const next=a==='today'?diaryDate():shiftDiaryDate(diary.selectedDate,a==='previous'?-1:1);
    if (validDate(next)) { diary.selectedDate=next; c.save(); c.render(); } return true;
  }
  if (!validDate(date)) { c.toast('请选择有效日期，最晚可以查看今天。'); return true; }
  if (a==='edit'||a==='note') { editEntry(c,date,a); return true; }
  const day=collectDiaryDay(c.state,date), key=el.dataset.key;
  if (a==='workspace') {
    const task=c.state.tasks.find(x=>x.id===el.dataset.task);
    if (!task) { c.toast('原任务已不在本地，无法继续打开。'); return true; }
    const file=task.files?.find(x=>x.id===el.dataset.file);
    if (file) { task.viewer ||= {tabs:[]}; task.viewer.tabs ||= []; task.viewer.open=true; task.viewer.active=file.id; if (!task.viewer.tabs.includes(file.id)) task.viewer.tabs.push(file.id); c.save(); }
     c.go('chat/'+task.id); return true;
  }
  if (a==='artifact') {
    const item=day.artifacts.find(x=>x.key===key); if (item) showArtifact(c,item,date); else c.toast('这份成果已不在本地，无法打开正文。'); return true;
  }
  if (a==='favorite') {
    const index=diary.favorites.findIndex(x=>x.sourceKey===key&&x.date===date);
    if (index>=0) diary.favorites.splice(index,1);
    else { const item=day.activities.find(x=>x.key===key); if (!item) { c.toast('这件事的来源已不存在。'); return true; } diary.favorites.push({sourceKey:key,date,title:item.title,summary:item.summary,savedAt:Date.now()}); }
    c.save(); c.render(); c.toast(index>=0?'已取消珍藏':'这件事，替你记住了。'); return true;
  }
  if (a==='evidence'||a==='saved-evidence') {
    const item=day.activities.find(x=>x.key===key);
    if (item) showEvidence(c,item,date);
    else { const saved=diary.favorites.find(x=>x.sourceKey===key&&x.date===date); if (saved) c.modal('已珍藏的记录',`<div class="diary-evidence"><h2>${esc(saved.title)}</h2><p>${esc(saved.summary)}</p><small>来源已从本地移除；这里是珍藏时保留的摘要。</small></div>`); else c.toast('没有找到这一天的来源记录。'); }
    return true;
  }
  return false;
}
export function submitDiary(name,form,c) {
  if (!name.startsWith('diary:')) return false;
  const values=Object.fromEntries(new FormData(form)), diary=initDiary(c.state);
  if(name==='diary:month'){
    const month=String(values.month||'all');
    if(month!=='all'&&(!/^\d{4}-\d{2}$/.test(month)||!parseDate(month+'-01'))){c.toast('请选择有效月份。');return true;}
    c.ui.diaryMonth=month;c.ui.diaryView='list';c.render();return true;
  }
  if (!validDate(values.date)) { c.toast('请选择有效日期，最晚可以查看今天。'); return true; }
  if (name==='diary:date') { diary.selectedDate=values.date; c.ui.diaryView='detail'; c.save(); c.render(); return true; }
  if (!['diary:edit','diary:note'].includes(name)) return false;
  diary.selectedDate=values.date;c.ui.diaryView='detail';
  const entry=diary.days[values.date] ||= {}, field=name==='diary:note'?'note':'text';
  entry[field]=String(values.text||'').trim().slice(0,5000); entry.updatedAt=Date.now();
  const restored=field==='text'&&!entry.text; if (restored) delete entry.text;
  c.save(); c.closeModal(); c.render(); c.toast(restored?'已恢复按记录整理的日记':field==='note'?'你的补记已保存':'这一天的日记已保存'); return true;
}
