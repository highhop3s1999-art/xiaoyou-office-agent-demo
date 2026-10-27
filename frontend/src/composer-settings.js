import {esc,icon} from './core.js';

// Shared left-hand controls for the home and conversation composers.
export function renderComposerSettings(state,task=null){
 const environment=task?.office?.environment||task?.environment||state.office?.environment||'local',label=environment==='cloud'?'云端环境':'本地电脑';
 return `<div class="composer-settings"><button type="button" class="composer-add" data-action="chat:context-menu" aria-label="添加资料与能力" title="添加资料与能力">${icon('plus',21)}</button><i class="composer-settings-divider" aria-hidden="true"></i><button type="button" class="composer-setting" data-action="cv:environment" aria-label="${label}" title="切换执行环境">${icon('monitor',17)}<span>${label}</span>${icon('chevron',11)}</button><button type="button" class="composer-setting" data-action="cv:permission" aria-label="按需确认" title="按需确认">${icon('shield',17)}<span>按需确认</span>${icon('chevron',10)}</button></div>`;
}

// Resolve legacy mode labels to the user's selected model, without replacing explicit choices.
export function composerModel(state,config){
 const concrete=value=>typeof value==='string'&&value.trim()&&value!=='智能模式';
 return concrete(config?.model)?config.model:concrete(state.composer?.model)?state.composer.model:'Claude Opus 5.5';
}
export function normalizeComposerModels(state){
 state.composer||={};state.composer.model=composerModel(state,state.composer);
 for(const config of [...(state.tasks||[]),...(state.workspace?.schedules||[])])config.model=composerModel(state,config);
}
export function renderComposerModel(state,config=state.composer,className='model-button'){
 return `<button type="button" class="${className}" data-action="chat:model-menu" title="选择模型"><span>${esc(composerModel(state,config))}</span><span class="effort"> · ${esc(config?.effort||state.composer?.effort||'High')}</span>${icon('down',12)}</button>`;
}
