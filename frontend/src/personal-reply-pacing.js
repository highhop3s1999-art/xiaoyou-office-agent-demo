// Presentation-only pacing: the complete reply is saved before any animation starts.
const timers=new WeakMap();
export function splitPersonalReply(text){
 const source=String(text||'').trim();if(!source)return [];
 // Structured content stays intact, including code, tables and lists.
 if(/```|^\s*(?:[-*] |\d+[.)、] |\|)/m.test(source))return [source];
 const parts=[];let current='',depth=0;
 for(const char of source){
  current+=char;
  if('“「『《（'.includes(char))depth++;
  if('”」』》）'.includes(char))depth=Math.max(0,depth-1);
  if(!depth&&('。！？'.includes(char)||char==='\n'||('!?'.includes(char)&&! /https?:\/\/\S*$/.test(current)))){if(current.trim())parts.push(current.trim());current='';}
 }
 if(current.trim())parts.push(current.trim());
 return parts;
}
export function finishPersonalDelivery(ui){const timer=timers.get(ui);if(timer)timer.clear(timer.id);timers.delete(ui);delete ui.talkDelivery;}
export function startPersonalDelivery(c,messages,notify,clock={set:(fn,delay)=>setTimeout(fn,delay),clear:id=>clearTimeout(id)}){
 finishPersonalDelivery(c.ui);
 const units=messages.filter(m=>m.role!=='user').flatMap(m=>Array.from({length:Math.max(1,splitPersonalReply(m.text).length)},(_,i)=>({id:m.id,index:i+1})));
 if(!units.length)return;
 const owner=c.state.personal,delivery={shown:Object.fromEntries(messages.map(m=>[m.id,0]))};c.ui.talkDelivery=delivery;let cursor=0;
 const next=()=>{
  if(c.ui.talkDelivery!==delivery)return;
  if(c.state.personal!==owner){finishPersonalDelivery(c.ui);return;}
  const unit=units[cursor++];delivery.shown[unit.id]=unit.index;
  if(cursor===units.length){delete c.ui.talkDelivery;timers.delete(c.ui);}else queue(850);
  if(c.ui.route==='personal')notify();
 };
 const queue=delay=>{const id=clock.set(next,delay);timers.set(c.ui,{id,clear:clock.clear});};
 queue(550);
}
