// Sidebar recency changes only at an explicit, successful message submission.
// Thread updatedAt also changes on drafts and background sync, so it is not a ranking signal.
export function sortExpertEntries(state,entries){
  const order=state.office?.expertMessageOrder||[];
  const rank=id=>{const index=order.indexOf(id);return index<0?Infinity:index;};
  return entries.sort((a,b)=>rank(a.id)-rank(b.id));
}
export function saveExpertMessageOrder(c,id){
  const office=c.state.office;
  if(!office)return c.save();
  const previous=office.expertMessageOrder;
  office.expertMessageOrder=[id,...(previous||[]).filter(value=>value!==id)];
  const result=c.save();
  if(result===false){if(previous)office.expertMessageOrder=previous;else delete office.expertMessageOrder;}
  return result;
}
