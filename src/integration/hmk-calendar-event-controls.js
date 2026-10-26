/** Calendar presentation receipts. They never resolve, cancel or alter a rule,
 * game clock, fatigue, medical obligation or the original immutable evidence.
 * Actual GM plans and active activities use their respective authoritative
 * cancellation mechanisms instead.
 */
export const CALENDAR_UI_PROOF='hmk-calendar-ui-receipt-v1';
const valid=x=>typeof x==='string'&&x.length>0&&x.length<=240;
export function calendarUIReceipts(journal=[],campaignId=''){
 const seen=new Map();
 for(const entry of journal){
  const p=entry.calendarUIReceipt;
  if(p?.format!==CALENDAR_UI_PROOF||p.campaignId!==campaignId)continue;
  if(!valid(p.eventId)||!['acknowledge','hide'].includes(p.action))continue;
  seen.set(p.eventId,p.action);
 }
 return seen;
}
export function makeCalendarUIReceipt({journal=[],campaignId,eventId,action,minute}={}){
 if(!valid(campaignId)||!valid(eventId)||!['acknowledge','hide'].includes(action)||
 !Number.isSafeInteger(minute)||minute<0)throw Error('Neplatné označení události v kalendáři.');
 const prior=calendarUIReceipts(journal,campaignId).get(eventId);
 if(prior===action)throw Error('Událost už má zvolený stav zobrazení.');
 return {format:CALENDAR_UI_PROOF,campaignId,eventId,action,minute};
}
/** A real test remains mandatory; the GM cannot replace its result with a UI tick. */
export function calendarEventControlKind(event){
 if(event?.origin==='gm')return event.resolution?'historical':'gm';
 if((event?.origin==='hml'&&event.status!=='resolved'&&event.status!=='cancelled')||(event?.origin==='activity'&&event.status==='due'))return 'rules';
 if(event?.origin==='activity'&&['active','future'].includes(event.status)){
  if(event.kind==='nutrition-conditions')return 'nutrition';
  if(['winded','rest','sleep','travel'].includes(event.kind))return 'activity';
 }
 return 'informational';
}
/** True when a task falls inside another interval for the *same* actor.
 * Campaign-wide GM intervals can overlap any actor's action. An event at the
 * end boundary is no longer inside the interval. */
export function calendarEventOverlaps(events=[],target){
 if(!target)return [];
 const at=target.dueMinute??target.minute;
 if(!Number.isSafeInteger(at))return [];
 return events.filter(x=>x.id!==target.id&&Number.isSafeInteger(x.minute)&&
 Number.isSafeInteger(x.endMinute)&&x.endMinute>x.minute&&
 x.minute<=at&&at<x.endMinute&&
 (!x.characterId||!target.characterId||x.characterId===target.characterId));
}
