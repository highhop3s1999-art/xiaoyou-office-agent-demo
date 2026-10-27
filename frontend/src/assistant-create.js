// Local prototype defaults; a production implementation can replace this with model generation.
export function assistantFromDescription(input,existing=[]){
 const brief=String(input||'').trim();
 if(!brief)throw new Error('先描述一下，你希望助理帮你做什么。');
 if(brief.length>2000)throw new Error('描述请控制在 2000 字以内。');
 const presets=[
  [/周报|日报|工作汇报/,'工作汇报助理','效率与管理','file'],
  [/会议|纪要/,'会议助理','效率与管理','book'],
  [/数据|经营|报表|指标/,'数据分析助理','数据与研究','chart'],
  [/调研|研究|竞品/,'研究助理','数据与研究','book'],
  [/代码|开发|编程|测试/,'研发助理','研发工程','code'],
  [/文案|写作|文稿|文章/,'写作助理','效率与管理','file'],
  [/产品|设计|需求/,'产品设计助理','效率与管理','folder']
 ];
 const preset=presets.find(([pattern])=>pattern.test(brief));
 const explicit=brief.match(/(?:名字叫|命名为|叫做|叫)[「“"『]?([^\s，。！？；、」”"』]{1,24})/);
 const stem=brief.split(/[，。！？；\n]/)[0].replace(/^(?:请)?(?:帮我|为我|给我|我想要|我需要|创建一个|做一个|一个)/,'').trim();
 const base=explicit?.[1]||preset?.[1]||(stem.length>0&&stem.length<=12?stem.replace(/助理$/,'')+'助理':'自定义助理');
 const names=new Set(existing.map(x=>x.name.toLowerCase()));let name=base,n=2;
 while(names.has(name.toLowerCase()))name=`${base} ${n++}`;
 return {name,version:'v1.0',publisher:'我',category:preset?.[2]||'效率与管理',icon:preset?.[3]||'sparkles',description:brief.slice(0,500),instructions:brief,creationBrief:brief,example:'我想请你帮我处理一件事，先一起确认目标和需要的资料。',knowledge:'',plugins:[],skills:[],mcps:[],requiresAuth:false,auth:'unconnected',custom:true};
}
export function assistantCreateForm(ctx){
 return `<form class="assistant-create-form" data-form="cat:expert-quick"><div class="assistant-create-intro"><span class="cat-expert-avatar cat-tone-violet">${ctx.icon('expert',24)}</span><div><h3>你希望助理帮你做什么？</h3><p>用自己的话描述，剩下的交给小悠。</p></div></div><label class="assistant-create-input"><span class="sr-only">描述助理的工作</span><textarea name="brief" rows="5" maxlength="2000" required placeholder="例如：帮我把每周的工作记录整理成周报，先写结论，再列进展、风险和下周计划。"></textarea></label><p class="assistant-create-hint">创建后可修改名称，按需要添加技能、知识库和工具。</p><div class="form-actions"><button type="button" class="btn ghost" data-action="app:close-modal">取消</button><button type="submit" class="btn primary">创建助理</button></div></form>`;
}
