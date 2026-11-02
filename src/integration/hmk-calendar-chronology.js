/** Calendar coordination, NOT a second HMK health executor (v93.674).
 * Keep original event IDs/minutes; one displayed time may contain several
 * independent obligations. Re-read the authoritative agenda after EACH
 * confirmed result. Never create synthetic +1-minute events.
 */
const MAX_EPISODE_MINUTES=10080;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export function mandatoryCalendarWindow({minute,agenda,gmAgenda=[],maxMinutes=MAX_EPISODE_MINUTES}={}){
 if(!integer(minute)||!integer(maxMinutes)||maxMinutes<1||maxMinutes>MAX_EPISODE_MINUTES)
  throw Error('Neplatný čas nebo limit cestovní epizody.');
 const candidates=[];
 for(const item of agenda?.all||[]){
  if(!integer(item.minute))continue;
  if(item.status==='preparation'||item.informational===true||item.requiresAction===false)continue;
  candidates.push({...item,at:item.minute,origin:'rule'});
 }
 for(const item of gmAgenda){
  if(item.requiresAction!==true||item.resolution||!integer(item.dueMinute))continue;
  candidates.push({...item,at:item.dueMinute,origin:'gm',kind:item.kind||'gm'});
 }
 candidates.sort((a,b)=>a.at-b.at||String(a.characterId||'').localeCompare(String(b.characterId||''))||String(a.id).localeCompare(String(b.id)));
 const first=candidates.find(x=>x.at<=minute+maxMinutes)||null;
 const maxAllowed=first?Math.max(0,Math.min(maxMinutes,first.at-minute)):maxMinutes;
 const atBoundary=first?candidates.filter(x=>x.at===first.at):[];
 return {minute,maxAllowed,limitMinute:minute+maxAllowed,first,atBoundary,
  unknown:[...(agenda?.unknown||[])],informationalExcluded:true};
}
/** Group by REAL minute and character ID, not anatomical name or event title. */
export function groupConcurrentObligations(events=[]){
 const groups=new Map();
 for(const item of events){
  if(!integer(item.minute)||!item.characterId)continue;
  const key=JSON.stringify([item.minute,item.characterId]);
  if(!groups.has(key))groups.set(key,{minute:item.minute,characterId:item.characterId,items:[]});
  groups.get(key).items.push(item);
 }
 return [...groups.values()].sort((a,b)=>a.minute-b.minute||a.characterId.localeCompare(b.characterId));
}
