// Labels describe the selected space resource; local edits take precedence.
export function assetPresentation(asset) {
  const expert = asset.type === 'expert';
  const knowledge = asset.type === 'knowledge';
  const sourceId = asset.sourceId || asset.id;
  const defaults = sourceId === 'general'
    ? ['出差回来，报销需要准备哪些材料？', '帮我查一下公司的请假流程']
    : sourceId === 'office'
      ? ['把我的项目进展整理成一份汇报 PPT', '帮我整理这份表格并总结重点']
      : knowledge ? ['根据这份知识库，总结重点和适用场景。'] : [];
  const examples = typeof asset.example === 'string' && asset.example.trim()
    ? [asset.example.trim()] : defaults;
  return {
    title: asset.name || (expert ? '空间助理' : knowledge ? '空间知识库' : '空间插件'),
    description: asset.description || (expert ? '告诉助理你遇到的问题。' : knowledge ? '引用到个人任务，结合资料提问。' : '添加到任务后，小悠会按需要使用这个插件。'),
    examples,
    action: expert ? '开始对话' : knowledge ? '引用到任务' : '添加到新任务'
  };
}
