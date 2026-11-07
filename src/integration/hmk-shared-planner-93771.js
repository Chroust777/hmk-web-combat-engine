/** v93.771: purely tentative time-card scheduling, using the SAME validated
 * shared-window overlap engine. No dice, persistent history or GM clock writes.
 */
import {startSharedTimeWindow93767,addSharedTimeGroup93767} from './hmk-shared-time-window-93767.js';
export function sharedDailyWindowLimit93771(minute){
 if(!Number.isSafeInteger(minute)||minute<0)throw Error('Neplatná minuta kampaně.');
 // Half-open [start,end): if end === 00:00 all occupied minutes belong to
 // the previous day (last minute 23:59); next action needs the new day's dice.
 return 1440-(minute%1440);
}
export function planSharedWindow93771(window,plans=[]){
 const scheduled=[],errors=[];
 if(!window)return {scheduled,errors};
 if(!Array.isArray(plans))return {scheduled,errors:[{id:'',message:'Neplatný plán skupin.'}]};
 let current=startSharedTimeWindow93767(window);
 const seenIds=new Set();
 for(const p of plans){
  try{
   if(!p||typeof p.id!=='string'||!p.id||seenIds.has(p.id))throw Error('Neplatná nebo duplicitní identita činnosti.');
   seenIds.add(p.id);
   if(!Number.isSafeInteger(p.minutes)||p.minutes<1)throw Error('Zadejte kladný počet celých minut.');
   if(!Array.isArray(p.memberIds)||new Set(p.memberIds).size!==p.memberIds.length)throw Error('Duplicitní účastníci.');
   if(p.followsGroup&&!plans.slice(0,plans.indexOf(p)).some(x=>x.groupId===p.followsGroup))throw Error('Návaznost míří na neexistující předchozí skupinu.');
   if(p.groupId!==(p.followsGroup||p.id))throw Error('Neplatná vazba skupiny.');
   const last=current.groups.filter(g=>g.groupId===p.groupId).at(-1);
   const start=last?last.startMinute+last.minutes:window.startMinute;
   const end=start+p.minutes;
   if(end>window.endMinute)throw Error('Zbývá pouze '+Math.max(0,window.endMinute-start)+' minut. Zkraťte činnost před jakýmkoliv hodem.');
   if(p.memberIds.length){
    current=addSharedTimeGroup93767(current,{groupId:p.groupId,kind:p.kind,memberIds:p.memberIds,startMinute:start,minutes:p.minutes});
   }
   scheduled.push({id:p.id,groupId:p.groupId,startMinute:start,endMinute:end,minutes:p.minutes});
  }catch(e){errors.push({id:p?.id||'',message:e?.message||String(e)});}
 }
 return {scheduled,errors};
}
