const clone = value => JSON.parse(JSON.stringify(value));
const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const fileType = { html: 'HTML', ppt: '演示文稿', sheet: '电子表格', doc: '文档', pdf: 'PDF 预览' };
const toolTitles = { terminal: '终端', browser: '浏览器', directory: '工作目录', conversation: '侧边会话' };
const toolIcons = { terminal: 'terminal', browser: 'globe', directory: 'folder', conversation: 'message-circle' };
const projects = () => [
  { id: 'p1', name: '星桥 · 工作台改版', owner: '林沐', status: '进行中', progress: 72, due: '10 月 28 日', note: '主要页面已完成，等待两轮可用性验证。', tasks: ['完成主要页面交互联调', '开展合成用户任务测试', '汇总下一版优化清单'] },
  { id: 'p2', name: '海帆 · 内容协作', owner: '陈语', status: '待确认', progress: 48, due: '10 月 30 日', note: '内容分类已完成，需要确认默认协作范围。', tasks: ['确认内容分类和命名', '核对协作范围', '准备演示资料'] },
  { id: 'p3', name: '青岚 · 知识整理', owner: '周一', status: '已完成', progress: 100, due: '10 月 21 日', note: '已完成示例知识归档，可进入复查。', tasks: ['归档示例资料', '补充目录索引', '完成一次内容复查'] }
];

function normalise(task) {
  task.files ||= [];
  task.annotations ||= [];
  task.changes ||= [];
  task.versions ||= [];
  task.viewer ||= { open: false, active: '', tabs: [], max: false };
  task.viewer.tabs ||= [];
  for (const file of task.files) {
    file.version ||= 1;
    file.view ||= {};
    for (const [key, value] of Object.entries({ page: 0, sheet: 0, zoom: 100, filter: '全部', cell: 'B2', annotate: false })) if (file.view[key] === undefined) file.view[key] = value;
    file.view.zoom = Math.max(70, Math.min(160, Number(file.view.zoom) || 100));
  }
  return task;
}

export function initTaskFiles(task, kind = 'dashboard') {
  normalise(task);
  if (task.files.length) return task.files;
  const make = (id, name, type, content) => ({ id: `${task.id}-${id}`, name, type, version: 1, content, view: { page: 0, sheet: 0, zoom: 100, filter: '全部', cell: 'B2', annotate: false } });
  if (kind === 'office') {
    task.files = [
      make('slides', '项目进展汇报', 'ppt', { slides: [
        { eyebrow: 'PROJECT REVIEW · 01', title: '让协作，向前一步', subtitle: '星桥 / 海帆 / 青岚 · 项目进展汇报', body: '用清晰的目标、可见的进度和及时的反馈，让每一步工作更从容。', metric: '3 个项目', note: '2026.10 · 合成数据演示' },
        { eyebrow: 'PROGRESS · 02', title: '把重要的进展放在一起', subtitle: '星桥进入验证，海帆等待确认，青岚完成归档', body: '星桥：主要页面完成，开始可用性验证。\n海帆：内容分类完成，待确认协作范围。\n青岚：知识归档完成，进入内容复查。', metric: '73% 平均进度', note: '所有项目与进度均为演示数据' },
        { eyebrow: 'NEXT STEP · 03', title: '下一步，专注真正的交付', subtitle: '明确责任人，让每个事项都有下文', body: '完成星桥交互联调。\n确认海帆协作范围。\n复查青岚归档内容。', metric: '3 项下一步', note: '建议在每周例会前更新一次进度' }
      ] }),
      make('sheet', '项目进度台账', 'sheet', { sheets: [
        { name: '项目进度', rows: [['项目', '负责人', '进度', '状态', '计划完成'], ['星桥', '林沐', '72%', '进行中', '2026-10-28'], ['海帆', '陈语', '48%', '待确认', '2026-10-30'], ['青岚', '周一', '100%', '已完成', '2026-10-21']] },
        { name: '待办事项', rows: [['事项', '项目', '负责人', '优先级', '状态'], ['主要页面联调', '星桥', '林沐', '高', '进行中'], ['确认协作范围', '海帆', '陈语', '高', '待确认'], ['内容复查', '青岚', '周一', '中', '待开始']] }
      ] }),
      make('doc', '项目周报', 'doc', { title: '本周项目进展', subtitle: '一份清晰、可继续编辑的工作记录', pages: [
        { heading: '01 · 本周概览', paragraphs: ['本周围绕星桥、海帆、青岚三个示例项目推进工作。星桥进入交互验证阶段，海帆等待协作范围确认，青岚已完成知识归档。', '星桥：主要页面已完成，当前重点是验证核心路径是否顺畅。负责人林沐将在下次检查前收集问题清单。', '海帆：内容分类已完成，负责人陈语需要确认默认协作范围，随后准备演示资料。'] },
        { heading: '02 · 后续安排', paragraphs: ['青岚：负责人周一完成了示例资料归档、目录索引与首轮复查，下一步核对资料版本。', '下周优先完成星桥页面联调，确认海帆协作范围，复查青岚归档内容。每个事项都应保留明确的责任人与下次检查时间。', '说明：本文件中的项目、人员和进度均为合成演示数据，不代表任何真实业务状态。'] }
      ] }),
      make('pdf', '项目摘要排版预览', 'pdf', { title: '项目进展摘要', subtitle: '合成演示 · 固定版式预览', pages: [
        { heading: '项目全景', paragraphs: ['星桥 · 工作台改版 — 72% · 进行中', '海帆 · 内容协作 — 48% · 待确认', '青岚 · 知识整理 — 100% · 已完成', '三项工作分别处在验证、确认与复查阶段。建议在下一次例会中集中处理需要协作方决定的事项。'] },
        { heading: '行动清单', paragraphs: ['林沐：完成主要页面联调，整理可用性验证结果。', '陈语：确认协作范围，准备内容演示。', '周一：核对知识归档版本，复查目录索引。', '此处展示的是 PDF 风格的前端排版预览。下载提供 Markdown 原文，不包含真实 PDF 二进制文件。'] }
      ] })
    ];
  } else {
    task.files = [make('dashboard', '项目协作看板.html', 'html', { title: '工作有序，进展可见', subtitle: '把正在推进的事，放在同一张看板里。', owner: '小悠工作空间', projects: projects() })];
  }
  return task.files;
}

const esc = (ctx, value) => ctx.esc(String(value ?? ''));
const symbol = (ctx, name, size = 16) => ctx.icon ? ctx.icon(name, size) : '';
const button = (ctx, action, label, attrs = '', klass = '') => `<button type="button" class="viewer-btn ${klass}" data-action="viewer:${action}" ${attrs}>${label}</button>`;
function tasks(ctx) { return Array.isArray(ctx.state.tasks) ? ctx.state.tasks : Object.values(ctx.state.tasks || {}); }
function taskFrom(el, ctx) {
  const all = tasks(ctx);
  const id = el?.dataset?.task || el?.dataset?.taskId || el?.closest?.('[data-task-id]')?.dataset?.taskId;
  if (id) return all.find(t => t.id === id);

  // Copied conversations retain file IDs, so resolve the conversation before its file.
  const current = ctx.currentTask?.();
  const route = ctx.ui?.route || '';
  const routeId = route.startsWith('chat/') ? route.slice(5) : '';
  const currentId = current?.id || routeId || ctx.ui?.taskId;
  const scopedTask = currentId && all.find(t => t.id === currentId);
  if (scopedTask) return scopedTask;

  const fileId = el?.dataset?.file || el?.dataset?.id;
  const matches = fileId ? all.filter(t => t.files?.some(f => f.id === fileId)) : [];
  return matches.length === 1 ? matches[0] : undefined;
}
function fileFrom(task, id = '') { return task.files.find(f => f.id === (id || task.viewer.active)); }
function commit(ctx) { ctx.save(); ctx.render(); }
function pathParts(path) { return String(path).split('.').filter(p => p !== '' && !['__proto__', 'prototype', 'constructor'].includes(p)); }
function getValue(object, path) { return pathParts(path).reduce((value, key) => value?.[key], object); }
function setValue(object, path, value) { const keys = pathParts(path); const last = keys.pop(); const target = keys.reduce((value, key) => value?.[key], object); if (!target || last === undefined || !(last in target)) return false; target[last] = value; return true; }
function editableTarget(file, path) {
  if (file.type === 'html') return /^(title|subtitle|owner|projects\.\d+\.(name|owner|note))$/.test(path);
  if (file.type === 'ppt') return /^slides\.\d+\.(eyebrow|title|subtitle|body|metric|note)$/.test(path);
  return false;
}
function textElement(ctx, file, path, tag = 'span', klass = '') {
  const value = getValue(file.content, path);
  const pending = file._annotations?.some(a => a.target === path);
  const attributes = file.view.annotate ? `data-action="viewer:select-element" data-file="${esc(ctx, file.id)}" data-target="${esc(ctx, path)}" role="button" tabindex="0" aria-label="批注：${esc(ctx, String(value).slice(0, 40))}"` : '';
  return `<${tag} class="${klass}${file.view.annotate ? ' viewer-selectable' : ''}${pending ? ' viewer-has-note' : ''}" ${attributes}>${esc(ctx, value).replaceAll('\n', '<br>')}</${tag}>`;
}

function renderDashboard(ctx, file) {
  const records=file.content.projects;const entity=file.content.title.includes('订单')?'复核记录':'项目';const average=records.length?Math.round(records.reduce((n,p)=>n+Number(p.progress||0),0)/records.length):0;

  const shown = file.content.projects.filter(p => file.view.filter === '全部' || p.status === file.view.filter);
  return `<div class="viewer-dashboard">
    <div class="viewer-dashboard-brand"><span class="viewer-ocean-dot"></span>${textElement(ctx, file, 'owner')}<span class="viewer-demo-chip">合成示例</span></div>
    <div class="viewer-dashboard-heading">${textElement(ctx, file, 'title', 'h2')}${textElement(ctx, file, 'subtitle', 'p')}</div>
    <div class="viewer-metrics"><div><span>全部${entity}</span><strong>${String(records.length).padStart(2,'0')}<em> 个</em></strong></div><div><span>进行中</span><strong>${String(records.filter(p=>p.status==='进行中').length).padStart(2,'0')}<em> 个</em></strong></div><div><span>平均进度</span><strong>${average}<em> %</em></strong></div></div>
    <div class="viewer-dashboard-subhead"><h3>${entity==='项目'?'项目进展':'异常复核'}</h3><div class="viewer-filters">${['全部', '进行中', '待确认', '已完成'].map(s => button(ctx, 'filter', esc(ctx, s), `data-value="${s}"`, file.view.filter === s ? 'is-active' : '')).join('')}</div></div>
    <div class="viewer-project-grid">${shown.map(p => {
      const index = file.content.projects.findIndex(x => x.id === p.id);
      return `<article class="viewer-project-card"><div class="viewer-project-top"><span class="viewer-project-symbol">${['✦', '≋', '❋'][index]}</span><span class="viewer-status ${p.status === '已完成' ? 'is-done' : p.status === '待确认' ? 'is-waiting' : ''}">${esc(ctx, p.status)}</span></div>${textElement(ctx, file, `projects.${index}.name`, 'h4')}${textElement(ctx, file, `projects.${index}.note`, 'p', 'viewer-project-note')}<div class="viewer-progress-label"><span>完成进度</span><b>${p.progress}%</b></div><div class="viewer-progress-track"><i style="width:${Number(p.progress)}%"></i></div><div class="viewer-project-footer"><span class="viewer-mini-avatar">${esc(ctx, p.owner.slice(0, 1))}</span>${textElement(ctx, file, `projects.${index}.owner`)}<span class="viewer-project-date">${esc(ctx, p.due)}</span>${button(ctx, 'project-detail', '查看', `data-project="${p.id}"`)}</div></article>`;
    }).join('')}</div><div class="viewer-dashboard-foot">小悠 · 每一步，都有下文。<span>示例数据可交互</span></div></div>`;
}

function renderSlides(ctx, file) {
  const index = Math.max(0, Math.min(file.view.page, file.content.slides.length - 1));
  file.view.page = index;
  const count = file.content.slides.length;
  return `<div class="viewer-slides"><nav class="viewer-slide-thumbs" aria-label="演示文稿页面">${file.content.slides.map((s, i) => button(ctx, 'page', `<span class="viewer-thumb-art"><small>${esc(ctx, s.eyebrow)}</small><b>${esc(ctx, s.title)}</b><i></i></span><span class="viewer-thumb-number">${i + 1}</span>`, `data-page="${i}" aria-label="转到第 ${i + 1} 页：${esc(ctx, s.title)}" aria-current="${i === index ? 'page' : 'false'}"`, i === index ? 'is-active' : '')).join('')}</nav><div class="viewer-slide-stage"><div class="viewer-slide-canvas" style="width:${file.view.zoom}%;min-width:${file.view.zoom}%"><article class="viewer-slide viewer-slide-${index}" aria-label="第 ${index + 1} 页，共 ${count} 页"><div class="viewer-slide-decoration"></div>${textElement(ctx, file, `slides.${index}.eyebrow`, 'div', 'viewer-slide-eyebrow')}${textElement(ctx, file, `slides.${index}.title`, 'h2')}${textElement(ctx, file, `slides.${index}.subtitle`, 'p', 'viewer-slide-subtitle')}<div class="viewer-slide-body">${textElement(ctx, file, `slides.${index}.body`, 'p')}${textElement(ctx, file, `slides.${index}.metric`, 'strong', 'viewer-slide-metric')}</div><footer>${textElement(ctx, file, `slides.${index}.note`)}<span>${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}</span></footer></article></div></div></div>`;
}

function renderSlidesControls(ctx, task, file) {
  const index = file.view.page, count = file.content.slides.length;
  return `<div class="viewer-slides-controls" role="group" aria-label="演示文稿工具栏"><div class="viewer-slides-select">${button(ctx, 'annotate', `${symbol(ctx, 'mouse-pointer-2')}选择元素`, `aria-label="选择元素批注" aria-pressed="${file.view.annotate}"`, file.view.annotate ? 'is-active' : '')}</div><div class="viewer-slides-pagination">${button(ctx, 'page', '‹', `data-page="${index - 1}" aria-label="上一页" ${index === 0 ? 'disabled' : ''}`, 'viewer-icon-button')}<form data-form="viewer:page-jump" data-identity="${esc(ctx, file.id)}:${index}" data-task="${esc(ctx, task.id)}"><input type="hidden" name="file" value="${esc(ctx, file.id)}"><input type="number" name="page" min="1" max="${count}" value="${index + 1}" aria-label="页码，回车跳转" inputmode="numeric"><span>/ ${count}</span></form>${button(ctx, 'page', '›', `data-page="${index + 1}" aria-label="下一页" ${index + 1 === count ? 'disabled' : ''}`, 'viewer-icon-button')}</div><span class="viewer-control-divider"></span><div class="viewer-slides-zoom">${button(ctx, 'zoom', '−', `data-step="-10" aria-label="缩小幻灯片" ${file.view.zoom <= 70 ? 'disabled' : ''}`, 'viewer-icon-button')}${button(ctx, 'zoom-reset', `${file.view.zoom}%`, 'aria-label="适应窗口，重设缩放为 100%" title="适应窗口"', 'viewer-zoom-value')}${button(ctx, 'zoom', '+', `data-step="10" aria-label="放大幻灯片" ${file.view.zoom >= 160 ? 'disabled' : ''}`, 'viewer-icon-button')}</div>${button(ctx, 'download', `${symbol(ctx, 'download')}<span>HTML</span>`, 'aria-label="下载 HTML 幻灯片" title="下载可独立打开的 HTML 幻灯片"', 'viewer-slides-download')}</div>`;
}

function cellParts(address) { const match = /^([A-Z])([1-9]\d*)$/.exec(address || 'B2'); return match ? [Number(match[2]) - 1, match[1].charCodeAt(0) - 65] : [1, 1]; }
function renderSheet(ctx, task, file) {
  const sheet = file.content.sheets[file.view.sheet] || file.content.sheets[0];
  const [row, col] = cellParts(file.view.cell);
  const value = sheet.rows[row]?.[col] ?? '';
  const rowCount = Math.max(sheet.rows.length + 4, 12);
  return `<div class="viewer-spreadsheet"><form class="viewer-formula" data-form="viewer:cell" data-identity="${esc(ctx, file.id)}:${file.view.sheet}:${file.view.cell}" data-task="${esc(ctx, task.id)}"><input type="hidden" name="file" value="${esc(ctx, file.id)}"><strong>${esc(ctx, file.view.cell)}</strong><span>ƒx</span><input name="value" value="${esc(ctx, value)}" aria-label="单元格值" autocomplete="off"><button type="submit" class="viewer-btn">保存单元格</button></form><div class="viewer-sheet-scroll"><table class="viewer-sheet"><thead><tr><th></th>${['A','B','C','D','E'].map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: rowCount }, (_, r) => `<tr><th>${r + 1}</th>${Array.from({ length: 5 }, (_, c) => { const address = String.fromCharCode(65 + c) + (r + 1); return `<td class="${address === file.view.cell ? 'is-selected' : ''} ${r === 0 ? 'viewer-sheet-header' : ''}"><button type="button" data-action="viewer:cell-select" data-cell="${address}">${esc(ctx, sheet.rows[r]?.[c] ?? '')}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table></div><div class="viewer-sheet-tabs">${file.content.sheets.map((s, i) => button(ctx, 'sheet', esc(ctx, s.name), `data-sheet="${i}"`, file.view.sheet === i ? 'is-active' : '')).join('')}<span>单元格可编辑 · 不执行公式</span></div></div>`;
}
function renderDocument(ctx, file) {
  const page = Math.min(file.view.page, file.content.pages.length - 1); file.view.page = page;
  const item = file.content.pages[page];
  return `<div class="viewer-document-stage"><div class="viewer-document-toolbar">${button(ctx, 'page', '上一页', `data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}`)}<span>${page + 1} / ${file.content.pages.length}</span>${button(ctx, 'page', '下一页', `data-page="${page + 1}" ${page + 1 === file.content.pages.length ? 'disabled' : ''}`)}<i></i>${button(ctx, 'zoom', '−', 'data-step="-10" aria-label="缩小"')}<span>${file.view.zoom}%</span>${button(ctx, 'zoom', '+', 'data-step="10" aria-label="放大"')}</div><div class="viewer-document-scroll"><article class="viewer-document-page ${file.type === 'pdf' ? 'viewer-pdf-page' : ''}" style="font-size:${file.view.zoom / 100}em"><div class="viewer-doc-brand">小悠 / WORKSPACE</div><h1>${esc(ctx, file.content.title)}</h1><p class="viewer-doc-subtitle">${esc(ctx, file.content.subtitle)}</p><h2>${esc(ctx, item.heading)}</h2>${item.paragraphs.map(p => `<p>${esc(ctx, p)}</p>`).join('')}<footer><span>合成演示资料</span><span>${page + 1}</span></footer></article></div></div>`;
}
function renderTool(ctx, task, key) {
  if (key === 'directory') return `<div class="viewer-tool-content"><div class="viewer-tool-label">工作目录 · 本地交互演示</div><h3>本次任务的成果</h3><p>点击文件可在新标签中继续查看。</p><div class="viewer-directory">${task.files.map(f => button(ctx, 'open', `${symbol(ctx, 'file-text')}<span>${esc(ctx, f.name)}</span><small>${fileType[f.type]} · v${f.version}</small>`, `data-id="${esc(ctx, f.id)}"`)).join('')}</div></div>`;
  if (key === 'terminal') return `<div class="viewer-terminal"><div class="viewer-tool-label">终端 · 只读执行示例</div><p><span>小悠 / task</span> $ prepare-preview</p><p class="viewer-terminal-dim">读取合成项目数据…</p><p class="viewer-terminal-dim">生成 ${task.files.length} 个可交互预览…</p><p class="viewer-terminal-success">✓ 预览就绪</p><p>这里展示任务过程的界面示例，不连接系统终端，不执行命令。</p><span class="viewer-terminal-cursor"></span></div>`;
  if (key === 'browser') return `<div class="viewer-browser-example"><div class="viewer-browser-address">${symbol(ctx, 'lock')} preview.chengxiaoyou.local / project <span>示例页面</span></div><div class="viewer-tool-content"><div class="viewer-browser-orbit">↗</div><h2>在任务旁边，查看网页</h2><p>真实产品可在这里保留浏览过程与网页上下文。当前演示展示本次任务的 HTML 成果，不会自动打开外部网站。</p>${task.files.some(f => f.type === 'html') ? button(ctx, 'open', '查看项目看板', `data-id="${esc(ctx, task.files.find(f => f.type === 'html').id)}"`, 'viewer-primary') : button(ctx, 'add-tool', '打开工作目录', 'data-tool="directory"', 'viewer-primary')}</div></div>`;
  return `<div class="viewer-side-chat"><div class="viewer-tool-label">侧边会话 · 合成回复演示</div><div class="viewer-side-chat-history"><p class="viewer-side-answer">可以围绕当前成果再聊两句。这里的内容与主任务分开保留。</p>${(task.viewer.sideMessages || []).map(m => `<p class="${m.role === 'user' ? 'viewer-side-question' : 'viewer-side-answer'}">${esc(ctx, m.text)}</p>`).join('')}</div><form data-form="viewer:side-chat" data-task="${esc(ctx, task.id)}"><textarea name="message" rows="3" placeholder="例如：帮我概括这份成果" required></textarea><button type="submit" class="viewer-btn viewer-primary">发送示例消息</button></form></div>`;
}

export function renderViewer(ctx, task) {
  normalise(task);
  if (!task.viewer.open) return '';
  task.viewer.tabs = task.viewer.tabs.filter(id => id.startsWith('tool:') || task.files.some(f => f.id === id));
  if (!task.viewer.tabs.length && task.files.length) task.viewer.tabs.push(task.files[0].id);
  if (!task.viewer.tabs.includes(task.viewer.active)) task.viewer.active = task.viewer.tabs[0] || '';
  const file = fileFrom(task);
  if (file) file._annotations = task.annotations.filter(a => a.fileId === file.id);
  const activeTool = task.viewer.active.startsWith('tool:') ? task.viewer.active.split(':')[1] : '';
  const canAnnotate = file && ['html', 'ppt'].includes(file.type);
  const isSlides = file?.type === 'ppt';
  const count = task.annotations.length;
  const activeCount = file ? task.annotations.filter(a => a.fileId === file.id).length : 0;
  const content = file ? ({ html: () => renderDashboard(ctx, file), ppt: () => renderSlides(ctx, file), sheet: () => renderSheet(ctx, task, file), doc: () => renderDocument(ctx, file), pdf: () => renderDocument(ctx, file) }[file.type]?.() || '') : renderTool(ctx, task, activeTool || 'directory');
  if (file) delete file._annotations;
  const storedWidth = Number(task.viewer.width);
  const widthStyle = Number.isFinite(storedWidth) && storedWidth >= 360 ? `style="--viewer-width:${Math.min(storedWidth, 1200)}px"` : '';
  const exportName = file?.type === 'sheet' ? 'CSV' : ['html','ppt'].includes(file?.type) ? 'HTML' : 'Markdown';
  return `<aside class="viewer-panel ${task.viewer.max ? 'viewer-maximized' : ''}" ${widthStyle} data-task-id="${esc(ctx, task.id)}" aria-label="成果查看器">
    <div class="viewer-resize-handle" role="separator" tabindex="0" aria-label="调整对话与成果宽度；左右方向键调整，回车恢复默认" aria-orientation="vertical" aria-valuemin="360" aria-valuemax="1200" aria-valuenow="${Number.isFinite(storedWidth) ? Math.round(storedWidth) : 588}" data-viewer-resize data-task-id="${esc(ctx, task.id)}" title="拖动调整宽度 · 双击恢复默认"><i></i></div>
    <header class="viewer-topbar"><div class="viewer-file-tabs" role="tablist">${task.viewer.tabs.map(id => { const f = fileFrom(task, id); const tool = id.split(':')[1]; const title = f ? f.name : toolTitles[tool] || '工具'; return `<div class="viewer-file-tab ${id === task.viewer.active ? 'is-active' : ''}"><button type="button" role="tab" aria-selected="${id === task.viewer.active}" data-action="viewer:tab" data-id="${esc(ctx, id)}" title="${esc(ctx, title)}">${symbol(ctx, f ? 'file-text' : toolIcons[tool])}<span>${esc(ctx, title)}</span></button><button type="button" class="viewer-tab-close" data-action="viewer:close-tab" data-id="${esc(ctx, id)}" aria-label="关闭 ${esc(ctx, title)}">×</button></div>`; }).join('')}</div><div class="viewer-head-actions">${button(ctx, 'plus', '+', 'aria-label="添加查看器标签"', 'viewer-icon-button')}${button(ctx, 'maximize', task.viewer.max ? '↙' : '↗', `aria-label="${task.viewer.max ? '退出最大化' : '最大化查看器'}"`, 'viewer-icon-button')}${button(ctx, 'close', '×', 'aria-label="关闭查看器"', 'viewer-icon-button')}</div>${task.viewer.plus ? `<div class="viewer-plus-menu"><strong>打开到查看器</strong>${task.files.filter(f => !task.viewer.tabs.includes(f.id)).map(f => button(ctx, 'open', `${symbol(ctx, 'file-text')}${esc(ctx, f.name)}`, `data-id="${esc(ctx, f.id)}"`)).join('')}${Object.entries(toolTitles).map(([key, title]) => button(ctx, 'add-tool', `${symbol(ctx, toolIcons[key])}${title}`, `data-tool="${key}"`)).join('')}</div>` : ''}</header>
    <div class="viewer-toolbar"><div class="viewer-toolbar-label"><span class="viewer-type-pill">${file ? fileType[file.type] : '工具示例'}</span>${file ? `<span>v${file.version}</span>` : ''}</div><div class="viewer-toolbar-actions">${canAnnotate && !isSlides ? button(ctx, 'annotate', `${symbol(ctx, 'message-square')}元素批注`, `aria-pressed="${file.view.annotate}"`, file.view.annotate ? 'is-active' : '') : ''}${count ? button(ctx, 'annotations', `待发送 ${count}`, '', 'viewer-note-count') : ''}${task.changes.length ? button(ctx, 'changes', '修改记录') : ''}${file && !isSlides ? button(ctx, 'download', `${symbol(ctx, 'download')}下载 ${exportName}`) : ''}</div></div>
    ${canAnnotate && file.view.annotate ? `<div class="viewer-annotation-hint"><span class="viewer-hint-dot"></span>点击虚线内的文字添加批注。保存到草稿后，回到对话发送以应用修改。${button(ctx, 'annotate', '退出')}</div>` : ''}
    <div class="viewer-content ${file ? `viewer-type-${file.type}` : 'viewer-type-tool'}">${content}</div>
    ${isSlides ? renderSlidesControls(ctx, task, file) : ''}
    <footer class="viewer-bottom"><span>${file ? (file.type === 'pdf' ? 'PDF 排版为前端预览 · 下载为 Markdown 原文' : file.type === 'ppt' ? '演示文稿预览 · 下载为可离线打开的 HTML' : file.type === 'sheet' ? '下载当前工作表 CSV · 不执行公式' : '交互演示 · 数据仅保存在本机') : '交互演示 · 未连接真实运行环境'}</span>${canAnnotate ? `<span>${activeCount} 条批注</span>` : ''}</footer></aside>`;
}

function annotationModal(ctx, task, file, target, annotation = null) {
  if (!editableTarget(file, target) || typeof getValue(file.content, target) !== 'string') return;
  const before = getValue(file.content, target);
  const body = `<form data-form="viewer:annotation" data-task="${esc(ctx, task.id)}"><input type="hidden" name="task" value="${esc(ctx, task.id)}"><input type="hidden" name="file" value="${esc(ctx, file.id)}"><input type="hidden" name="target" value="${esc(ctx, target)}"><input type="hidden" name="version" value="${file.version}"><input type="hidden" name="before" value="${esc(ctx, before)}"><input type="hidden" name="annotation" value="${esc(ctx, annotation?.id || '')}"><p class="viewer-modal-context">${esc(ctx, file.name)} · 来源版本 v${file.version}</p><div class="viewer-original-text">${esc(ctx, before).replaceAll('\n', '<br>')}</div><label class="field">批注说明<textarea name="comment" rows="2" placeholder="例如：标题再清晰一些">${esc(ctx, annotation?.comment || '')}</textarea></label><label class="field">修改后文字<textarea name="after" rows="4" required placeholder="填入希望替换成的文字">${esc(ctx, annotation?.after ?? before)}</textarea></label><p class="muted">只加入当前任务的批注草稿。回到对话发送后，才会应用到这个元素。</p><div class="form-actions"><button type="button" class="btn ghost" data-action="app:close-modal">取消</button><button type="submit" class="btn primary">加入批注草稿</button></div></form>`;
  ctx.modal(annotation?.status === 'conflict' ? '重新确认冲突批注' : '批注这个元素', body);
}
function annotationsModal(ctx, task) {
  ctx.modal('待发送的元素批注', `<div class="viewer-annotation-list">${task.annotations.length ? task.annotations.map(a => `<article class="viewer-annotation-item"><div><strong>${esc(ctx, a.fileName)}</strong><span>v${a.sourceVersion}${a.status === 'conflict' ? ' · 版本冲突' : ' · 待发送'}</span></div><p class="viewer-original-text">${esc(ctx, a.before)}</p><p class="viewer-replacement-text">${esc(ctx, a.after)}</p>${a.comment ? `<p>${esc(ctx, a.comment)}</p>` : ''}<div>${button(ctx, 'annotation-edit', a.status === 'conflict' ? '按最新版本重审' : '编辑', `data-task="${esc(ctx, task.id)}" data-id="${esc(ctx, a.id)}"`)}${button(ctx, 'annotation-remove', '移除', `data-task="${esc(ctx, task.id)}" data-id="${esc(ctx, a.id)}"`)}</div></article>`).join('') : '<p class="muted">还没有批注。打开元素批注后，点击需要修改的文字。</p>'}</div><p class="muted">批注随当前任务发送，暂未修改成果；有冲突时不会覆盖新版本。</p>`, { wide: true });
}
function changesModal(ctx, task) {
  ctx.modal('成果修改记录', `<div class="viewer-changes">${[...task.changes].reverse().map(c => `<article class="viewer-change"><div><strong>${esc(ctx, c.fileName)}</strong><span>v${c.fromVersion} → v${c.toVersion}${c.undone ? ' · 已撤销' : ''}</span></div><label>修改前</label><p class="viewer-original-text">${esc(ctx, c.before)}</p><label>修改后</label><p class="viewer-replacement-text">${esc(ctx, c.after)}</p>${c.comment ? `<p>${esc(ctx, c.comment)}</p>` : ''}${!c.undone ? button(ctx, 'undo', '撤销这一次修改', `data-task="${esc(ctx, task.id)}" data-id="${esc(ctx, c.id)}"`) : ''}</article>`).join('')}</div><p class="muted">撤销只影响对应元素。若它又被修改过，会保留新内容并提醒重新检查。</p>`, { wide: true });
}

export function applyAnnotations(task) {
  normalise(task);
  const applied = [];
  const used = new Set();
  for (const file of task.files) {
    const pending = task.annotations.filter(a => a.fileId === file.id);
    const version = file.version;
    let snapshot = null;
    const targets = new Set();
    for (const a of pending) {
      if (a.sourceVersion !== version || !editableTarget(file, a.target) || getValue(file.content, a.target) !== a.before || targets.has(a.target)) {
        a.status = 'conflict';
        a.conflictReason = '成果版本或目标文字已改变，请按最新版本重新确认。';
        continue;
      }
      if (typeof a.after !== 'string' || !a.after.trim()) { a.status = 'conflict'; a.conflictReason = '修改后文字不能为空。'; continue; }
      if (!snapshot) snapshot = clone(file.content);
      const before = getValue(file.content, a.target);
      if (!setValue(file.content, a.target, a.after)) { a.status = 'conflict'; continue; }
      targets.add(a.target);
      const change = { id: uid('change'), fileId: file.id, fileName: file.name, target: a.target, before, after: a.after, comment: a.comment || '', fromVersion: version, toVersion: version + 1, at: new Date().toISOString(), undone: false, annotationId: a.id };
      task.changes.push(change); applied.push(change); used.add(a.id);
    }
    if (snapshot) {
      task.versions.push({ id: uid('version'), fileId: file.id, version, content: snapshot, at: new Date().toISOString() });
      file.version = version + 1;
    }
  }
  for (const a of task.annotations) if (!task.files.some(f => f.id === a.fileId)) { a.status = 'conflict'; a.conflictReason = '来源文件已不可用。'; }
  task.annotations = task.annotations.filter(a => !used.has(a.id));
  return applied;
}

export function downloadFile(ctx, file) {
  file = clone(file); file.view ||= {sheet:0}; file.view.sheet ||= 0;
  const safeName = file.name.replace(/\.(html|pptx|xlsx|docx|pdf|csv|md)$/i, '');
  const e = value => esc(ctx, value);
  if (file.type === 'sheet') {
    const sheet = file.content.sheets[file.view.sheet];
    const csv = sheet.rows.map(row => row.map(v => { const text = String(v ?? ''); const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text; return `"${guarded.replaceAll('"', '""')}"`; }).join(',')).join('\r\n');
    ctx.download(`${safeName}-${sheet.name}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
  } else if (file.type === 'html') {
    const body = `<header><small>${e(file.content.owner)}</small><h1>${e(file.content.title)}</h1><p>${e(file.content.subtitle)}</p></header><main>${file.content.projects.map(p => `<article><span>${e(p.status)}</span><h2>${e(p.name)}</h2><p>${e(p.note)}</p><progress max="100" value="${Number(p.progress)}"></progress><footer>${e(p.owner)} · ${e(p.due)} · ${p.progress}%</footer></article>`).join('')}</main>`;
    ctx.download(`${safeName}.html`, standaloneHTML(file.content.title, body), 'text/html;charset=utf-8');
  } else if (file.type === 'ppt') {
    const body = file.content.slides.map((s, i) => `<section class="slide"><small>${e(s.eyebrow)}</small><h1>${e(s.title)}</h1><h2>${e(s.subtitle)}</h2><p>${e(s.body).replaceAll('\n', '<br>')}</p><strong>${e(s.metric)}</strong><footer>${e(s.note)} · ${i + 1}/${file.content.slides.length}</footer></section>`).join('');
    ctx.download(`${safeName}-幻灯片.html`, standaloneHTML(file.name, body), 'text/html;charset=utf-8');
  } else {
    const content = `# ${file.content.title}\n\n${file.content.subtitle}\n\n${file.content.pages.map(p => `## ${p.heading}\n\n${p.paragraphs.join('\n\n')}`).join('\n\n---\n\n')}\n\n---\n合成演示数据。导出格式：Markdown。\n`;
    ctx.download(`${safeName}.md`, content, 'text/markdown;charset=utf-8');
  }
}
function standaloneHTML(title, body) {
  const safeTitle = String(title).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>*{box-sizing:border-box}body{margin:0;padding:40px;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#172d3d;background:#f0f5f8}header{max-width:1100px;margin:0 auto 32px}h1{font-size:38px;letter-spacing:-1px}p{line-height:1.8;color:#536a7a}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;max-width:1100px;margin:auto}article{background:#fff;border-radius:20px;padding:26px;border:1px solid #e1eaf0}article span{font-size:12px;color:#0783c4}progress{width:100%;height:10px;accent-color:#119ed0}footer{margin-top:24px;font-size:12px;color:#73838f}.slide{background:#fff;max-width:1100px;min-height:560px;margin:0 auto 36px;border-radius:26px;padding:56px;position:relative;border-top:8px solid #0c96d7}.slide h1{font-size:44px}.slide strong{display:block;color:#078bc4;font-size:28px;margin-top:32px}small{letter-spacing:2px;color:#078bc4}@media(max-width:600px){body{padding:16px}.slide{padding:26px}.slide h1{font-size:30px}}@media print{body{background:#fff;padding:0}.slide{break-after:page;border:0;margin:0;min-height:95vh}}</style><body>${body}<footer style="text-align:center">小悠 · 合成演示数据 · 离线成果导出</footer></body></html>`;
}

export function handleViewer(action, el, ctx) {
  if (!action.startsWith('viewer:')) return false;
  const task = taskFrom(el, ctx);
  if (!task) { ctx.toast('当前任务不可用，请重新打开成果'); return true; }
  normalise(task);
  const file = fileFrom(task, el.dataset.file || '');
  const name = action.slice(7);
  if (name === 'open' || name === 'open-max') {
    if (!task.files.some(f => f.id === el.dataset.id)) return true;
    task.viewer.open = true; task.viewer.active = el.dataset.id; task.viewer.plus = false; if (name === 'open-max') task.viewer.max = true;
    if (!task.viewer.tabs.includes(el.dataset.id)) task.viewer.tabs.push(el.dataset.id);
  } else if (name === 'tab') { task.viewer.active = el.dataset.id; task.viewer.plus = false; }
  else if (name === 'close') { task.viewer.open = false; task.viewer.max = false; task.viewer.plus = false; }
  else if (name === 'maximize') task.viewer.max = !task.viewer.max;
  else if (name === 'plus') task.viewer.plus = !task.viewer.plus;
  else if (name === 'close-tab') {
    const position = task.viewer.tabs.indexOf(el.dataset.id);
    task.viewer.tabs = task.viewer.tabs.filter(id => id !== el.dataset.id);
    if (task.viewer.active === el.dataset.id) task.viewer.active = task.viewer.tabs[Math.max(0, position - 1)] || '';
    if (!task.viewer.tabs.length) { task.viewer.open = false; task.viewer.max = false; }
  } else if (name === 'add-tool') {
    if (!toolTitles[el.dataset.tool]) return true;
    const id = `tool:${el.dataset.tool}`; task.viewer.active = id; task.viewer.plus = false;
    if (!task.viewer.tabs.includes(id)) task.viewer.tabs.push(id);
  } else if (name === 'annotate' && file) file.view.annotate = !file.view.annotate;
  else if (name === 'filter' && file?.type === 'html') file.view.filter = ['全部', '进行中', '待确认', '已完成'].includes(el.dataset.value) ? el.dataset.value : '全部';
  else if (name === 'project-detail' && file?.type === 'html') {
    const p = file.content.projects.find(item => item.id === el.dataset.project);
    if (p) ctx.modal(p.name, `<p class="viewer-modal-context">${esc(ctx, p.status)} · ${p.progress}% · ${esc(ctx, p.owner)} · ${esc(ctx, p.due)}</p><p>${esc(ctx, p.note)}</p><h3>下一步事项</h3><ul class="viewer-detail-tasks">${p.tasks.map(t => `<li>${esc(ctx, t)}</li>`).join('')}</ul><p class="muted">合成项目数据，仅用于展示详情交互。</p>`);
    return true;
  } else if (name === 'page' && file) {
    const count = file.type === 'ppt' ? file.content.slides.length : file.content.pages?.length || 1;
    file.view.page = Math.max(0, Math.min(count - 1, Number(el.dataset.page) || 0));
  } else if (name === 'zoom' && file) file.view.zoom = Math.max(70, Math.min(160, file.view.zoom + (Number(el.dataset.step) || 0)));
  else if (name === 'zoom-reset' && file) file.view.zoom = 100;
  else if (name === 'sheet' && file?.type === 'sheet') {
    file.view.cells ||= {}; file.view.cells[file.view.sheet] = file.view.cell;
    file.view.sheet = Math.max(0, Math.min(file.content.sheets.length - 1, Number(el.dataset.sheet)));
    file.view.cell = file.view.cells[file.view.sheet] || 'B2';
  } else if (name === 'cell-select' && file?.type === 'sheet') file.view.cell = el.dataset.cell;
  else if (name === 'select-element' && file?.view.annotate) { annotationModal(ctx, task, file, el.dataset.target); return true; }
  else if (name === 'annotation-edit') {
    const a = task.annotations.find(a => a.id === el.dataset.id); const f = a && fileFrom(task, a.fileId);
    if (a && f) annotationModal(ctx, task, f, a.target, a); return true;
  } else if (name === 'annotation-remove') {
    task.annotations = task.annotations.filter(a => a.id !== el.dataset.id); commit(ctx); annotationsModal(ctx, task); return true;
  } else if (name === 'annotations') { annotationsModal(ctx, task); return true; }
  else if (name === 'changes') { changesModal(ctx, task); return true; }
  else if (name === 'undo') {
    const c = task.changes.find(c => c.id === el.dataset.id); const f = c && fileFrom(task, c.fileId);
    if (!c || !f || c.undone) return true;
    if (getValue(f.content, c.target) !== c.after) { ctx.toast('这段内容后来又有修改，已保留最新内容。请先检查修改记录。'); return true; }
    task.versions.push({ id: uid('version'), fileId: f.id, version: f.version, content: clone(f.content), at: new Date().toISOString() });
    if (setValue(f.content, c.target, c.before)) { f.version += 1; c.undone = true; c.undoneVersion = f.version; c.undoneAt = new Date().toISOString(); }
    commit(ctx); changesModal(ctx, task); ctx.toast('已撤销对应元素的这次修改'); return true;
  } else if (name === 'download' && file) { downloadFile(ctx, file); ctx.toast('已生成与实际内容一致的下载文件'); return true; }
  else return true;
  commit(ctx); return true;
}

export function submitViewer(name, form, ctx) {
  if (!name.startsWith('viewer:')) return false;
  const task = taskFrom(form, ctx);
  if (!task) { ctx.toast('当前任务不可用'); return true; }
  normalise(task);
  const data = new FormData(form);
  const file = fileFrom(task, String(data.get('file') || ''));
  if (name === 'viewer:page-jump' && file) {
    const count = file.type === 'ppt' ? file.content.slides.length : file.content.pages?.length || 1;
    const value = Number(data.get('page'));
    if (!Number.isInteger(value) || value < 1 || value > count) { ctx.toast(`请输入 1 到 ${count} 之间的页码`); return true; }
    file.view.page = value - 1; commit(ctx);
  } else if (name === 'viewer:annotation') {
    if (!file) return true;
    const target = String(data.get('target') || ''), after = String(data.get('after') || ''), before = String(data.get('before') || '');
    if (!editableTarget(file, target) || !after.trim()) { ctx.toast('请填写修改后文字'); return true; }
    if (after === before) { ctx.toast('修改后文字与原文相同，请先调整文字'); return true; }
    const sourceVersion = Number(data.get('version'));
    if (sourceVersion !== file.version || getValue(file.content, target) !== before) { ctx.toast('成果已经更新，请重新选择该元素后批注'); return true; }
    const id = String(data.get('annotation') || '');
    const existing = task.annotations.find(a => a.id === id) || task.annotations.find(a => a.fileId === file.id && a.target === target);
    const annotation = { id: existing?.id || uid('annotation'), fileId: file.id, fileName: file.name, target, before, after, comment: String(data.get('comment') || '').trim(), sourceVersion, status: 'draft', createdAt: new Date().toISOString() };
    if (existing) task.annotations.splice(task.annotations.indexOf(existing), 1, annotation); else task.annotations.push(annotation);
    ctx.closeModal(); commit(ctx); ctx.toast('已加入当前任务的批注草稿，发送后才会修改成果');
  } else if (name === 'viewer:cell' && file?.type === 'sheet') {
    const [row, col] = cellParts(file.view.cell); const sheet = file.content.sheets[file.view.sheet];
    while (sheet.rows.length <= row) sheet.rows.push(['', '', '', '', '']);
    const before = String(sheet.rows[row][col] ?? ''), after = String(data.get('value') || '');
    if (before === after) { ctx.toast('单元格内容未变化'); return true; }
    const version = file.version;
    task.versions.push({ id: uid('version'), fileId: file.id, version, content: clone(file.content), at: new Date().toISOString() });
    sheet.rows[row][col] = after; file.version += 1;
    task.changes.push({ id: uid('change'), fileId: file.id, fileName: file.name, target: `sheets.${file.view.sheet}.rows.${row}.${col}`, before, after, comment: `手动编辑 ${sheet.name} · ${file.view.cell}`, fromVersion: version, toVersion: file.version, at: new Date().toISOString(), undone: false });
    commit(ctx); ctx.toast('已保存单元格内容');
  } else if (name === 'viewer:side-chat') {
    const message = String(data.get('message') || '').trim(); if (!message) return true;
    task.viewer.sideMessages ||= []; task.viewer.sideMessages.push({ role: 'user', text: message });
    task.viewer.sideMessages.push({ role: 'assistant', text: `示例回复：本次任务「${task.title}」共有 ${task.files.length} 份成果，已记录 ${task.changes.filter(c => !c.undone).length} 次有效修改。你可以切换标签查看内容；精确修改 HTML 或演示文稿文字时，请使用“元素批注”。此回复是本地合成示例。` });
    form.elements.message.value='';commit(ctx);
  }
  return true;
}

// This listener operates on the existing panel while dragging so forms and drafts stay mounted.
let viewerInteractionsInstalled = false;
export function initViewerInteractions(ctx) {
  if (viewerInteractionsInstalled || typeof document === 'undefined') return;
  viewerInteractionsInstalled = true;
  let drag = null;
  const enabled = panel => panel && !panel.classList.contains('viewer-maximized') && window.innerWidth > 850;
  const constrained = (panel, width) => Math.max(300, Math.min(Math.max(300, (panel.parentElement?.clientWidth || window.innerWidth) - 340), 1200, width));
  const adjust = (panel, handle, width) => {
    const value = Math.round(constrained(panel, width));
    panel.style.setProperty('--viewer-width', `${value}px`);
    handle.setAttribute('aria-valuenow', String(value));
    handle.setAttribute('aria-valuemax', String(Math.round(constrained(panel, 1200))));
    return value;
  };
  const finish = cancel => {
    if (!drag) return;
    const current = drag; drag = null;
    document.body.classList.remove('viewer-is-resizing');
    if (cancel) {
      if (current.previousWidth) current.panel.style.setProperty('--viewer-width', `${current.previousWidth}px`);
      else current.panel.style.removeProperty('--viewer-width');
      return;
    }
    current.task.viewer.width = current.width;
    ctx.save();
  };
  document.addEventListener('pointerdown', event => {
    const handle = event.target.closest?.('[data-viewer-resize]');
    const panel = handle?.closest('.viewer-panel');
    if (!handle || !enabled(panel) || event.button !== 0) return;
    const task = taskFrom(handle, ctx); if (!task) return;
    event.preventDefault();
    handle.focus({ preventScroll: true });
    handle.setPointerCapture?.(event.pointerId);
    drag = { handle, panel, task, startX: event.clientX, startWidth: panel.getBoundingClientRect().width, previousWidth: task.viewer.width, width: panel.getBoundingClientRect().width };
    document.body.classList.add('viewer-is-resizing');
  });
  document.addEventListener('pointermove', event => {
    if (!drag) return;
    if (!drag.panel.isConnected) { finish(true); return; }
    drag.width = adjust(drag.panel, drag.handle, drag.startWidth + drag.startX - event.clientX);
  });
  document.addEventListener('pointerup', () => finish(false));
  document.addEventListener('pointercancel', () => finish(true));
  window.addEventListener('blur', () => finish(true));
  document.addEventListener('dblclick', event => {
    const handle = event.target.closest?.('[data-viewer-resize]'), panel = handle?.closest('.viewer-panel');
    if (!handle || !enabled(panel)) return;
    const task = taskFrom(handle, ctx); if (!task) return;
    delete task.viewer.width; panel.style.removeProperty('--viewer-width'); ctx.save();
    handle.setAttribute('aria-valuenow', String(Math.round(panel.getBoundingClientRect().width)));
  });
  document.addEventListener('keydown', event => {
    const handle = event.target.closest?.('[data-viewer-resize]'), panel = handle?.closest('.viewer-panel');
    if (!handle || !enabled(panel) || !['ArrowLeft', 'ArrowRight', 'Enter', 'Home'].includes(event.key)) return;
    const task = taskFrom(handle, ctx); if (!task) return;
    event.preventDefault();
    if (event.key === 'Enter' || event.key === 'Home') {
      delete task.viewer.width; panel.style.removeProperty('--viewer-width');
      handle.setAttribute('aria-valuenow', String(Math.round(panel.getBoundingClientRect().width)));
    } else task.viewer.width = adjust(panel, handle, panel.getBoundingClientRect().width + (event.key === 'ArrowLeft' ? 24 : -24));
    ctx.save();
  });
}
