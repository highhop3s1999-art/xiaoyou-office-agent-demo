import {esc,icon} from './core.js';

// Dictation is transient and never submits a prompt or stores audio.
let active=null;
export function renderVoiceButton(inputId){return `<button type="button" class="voice-trigger" data-action="voice:start" data-input="${inputId}" aria-label="语音输入" title="语音输入">${icon('mic',18)}</button>`;}
export function dictationText(original,transcript){return transcript.trim()?original+(original&&!/\s$/.test(original)?' ':'')+transcript.trim():original;}
function signature(input,c){return [c.ui.route,input.id,input.dataset.agent||'',input.dataset.conversation||'',input.closest('form')?.dataset.identity||''].join('|');}
function source(s,c){const input=document.getElementById(s.inputId);return input&&signature(input,c)===s.identity&&input.value===s.original&&!c.ui.modal?input:null;}
function stopSession(){const s=active;if(!s)return;active=null;clearInterval(s.timer);try{s.recognition?.abort();}catch{}document.querySelectorAll('.voice-panel').forEach(p=>p.remove());document.querySelectorAll('.voice-capturing').forEach(p=>p.classList.remove('voice-capturing'));}
export function refreshVoiceUI(c){
 const s=active;if(!s)return;const input=source(s,c);if(!input){stopSession();return;}
 const form=input.closest('.cv-composer,.composer-box,.la-compose');if(!form){stopSession();return;}
 form.classList.add('voice-capturing');let panel=form.querySelector('.voice-panel');if(!panel){panel=document.createElement('div');panel.className='voice-panel';form.append(panel);}
 const text=(s.final+s.interim).trim(),elapsed=Math.floor((Date.now()-s.started)/1000),duration=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`;
 panel.innerHTML=`<div class="voice-caption"><span>${s.error?'识别未完成':s.stopping?'正在转写':s.listening?'正在聆听':'确认识别结果'}</span><time>${duration}</time></div><div class="voice-transcript" role="status">${esc(s.error||text||(s.listening?'请说出你想交给小悠的工作…':'没有识别到语音，可以重新录入。'))}</div><div class="voice-controls"><button type="button" data-action="voice:cancel" class="voice-control" aria-label="取消语音输入" title="取消">${icon('close',19)}</button><div class="voice-wave ${s.listening?'listening':''}" aria-hidden="true">${Array.from({length:17},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>${!s.listening?'<button type="button" class="voice-retry" data-action="voice:retry">重新录入</button>':''}<button type="button" data-action="voice:finish" class="voice-control voice-confirm" aria-label="${s.listening?'结束录音':'将文字填入输入框'}" title="${s.listening?'结束录音':'填入输入框，不会发送'}" ${s.stopping||!s.listening&&!text?'disabled':''}>${icon('check',19)}</button></div>`;
}
function start(input,c){
 if(!input||c.ui.modal)return;stopSession();
 const Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
 if(!Recognition){c.modal('语音输入',`<div class="voice-unavailable">${icon('mic',30)}<h3>当前浏览器暂不支持语音识别</h3><p>请在支持语音识别的 Chrome 中打开此 HTML，或使用系统听写。已有草稿会保留。</p><p class="muted">语音会先转成文字填入输入框，由你确认后发送。</p></div>`);return;}
 const recognition=new Recognition(),s={inputId:input.id,identity:signature(input,c),original:input.value,recognition,final:'',interim:'',started:Date.now(),listening:true,error:''};active=s;
 recognition.lang=['en','英语'].includes(c.state.settings?.voice?.language)?'en-US':'zh-CN';recognition.continuous=true;recognition.interimResults=true;
 recognition.onresult=e=>{if(active!==s)return;s.final='';s.interim='';for(let i=0;i<e.results.length;i++){if(e.results[i].isFinal)s.final+=e.results[i][0].transcript;else s.interim+=e.results[i][0].transcript;}refreshVoiceUI(c);};
 recognition.onerror=e=>{if(active!==s)return;s.listening=false;s.stopping=false;s.error=({'not-allowed':'未获得麦克风权限，请在浏览器中允许访问后重试。','audio-capture':'未检测到可用麦克风，请检查设备。','network':'语音识别服务连接失败，请检查网络后重试。','no-speech':'没有识别到语音，请靠近麦克风后重试。','service-not-allowed':'浏览器未允许使用语音识别服务。'})[e.error]||'语音识别中断，已有草稿保留。';clearInterval(s.timer);refreshVoiceUI(c);};
 recognition.onend=()=>{if(active!==s)return;s.listening=false;s.stopping=false;clearInterval(s.timer);if(s.commitRequested&&!s.error&&(s.final+s.interim).trim())handleVoice('voice:finish',{},c);else refreshVoiceUI(c);};
 s.timer=setInterval(()=>{if(active!==s)return;if(Date.now()-s.started>=120000&&s.listening){s.listening=false;s.stopping=true;recognition.stop();}refreshVoiceUI(c);},1000);
 try{recognition.start();refreshVoiceUI(c);}catch{stopSession();c.toast('无法启动语音输入，请检查麦克风权限');}
}
export function handleVoice(action,el,c){
 if(action!=='chat:voice'&&!action.startsWith('voice:'))return false;
 if(action==='voice:start'||action==='chat:voice'){const input=document.getElementById(el.dataset.input||'cv-message')||document.getElementById('task-prompt')||document.getElementById('local-agent-message');start(input,c);return true;}
 const s=active;if(!s)return true;
 if(action==='voice:cancel'){const input=source(s,c);stopSession();input?.focus();}
 else if(action==='voice:retry'){const input=source(s,c);stopSession();start(input,c);}
 else if(action==='voice:finish'){
  if(s.stopping)return true;if(s.listening){s.commitRequested=true;s.listening=false;s.stopping=true;try{s.recognition.stop();}catch{}refreshVoiceUI(c);return true;}
  const input=source(s,c),text=(s.final+s.interim).trim();if(!input){stopSession();return true;}if(!text)return true;
  const value=dictationText(s.original,text);stopSession();input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();input.setSelectionRange(value.length,value.length);
 }
 return true;
}
export function keyVoice(e,c){if(!active||e.isComposing)return false;if(e.key==='Escape'){e.preventDefault();handleVoice('voice:cancel',{},c);return true;}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleVoice('voice:finish',{},c);return true;}if(e.key==='Tab')return false;return false;}
