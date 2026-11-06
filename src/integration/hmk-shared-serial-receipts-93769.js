/**
 * v93.769 DEVELOPMENT - serializable, replayable verified activity changes.
 * Does not roll dice, advance time, or save. A host performs one GM-confirmed
 * CAS commit after reconstructing every receipt against the authoritative base.
 */
export const SERIAL_ACTIVITY_FORMAT_93769='hmk-shared-activity-delta-v1';
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const isId=x=>typeof x==='string'&&!!x&&x.length<=256;
const own=(xs,label)=>{check(Array.isArray(xs)&&xs.every(x=>x&&isId(x.id)),label+': chybí identita');check(new Set(xs.map(x=>x.id)).size===xs.length,label+': duplicitní identita');return new Map(xs.map(x=>[x.id,x]));};
function collectionDelta(oldItems,newItems,label){
 const before=own(oldItems,label),after=own(newItems,label),updates=[];
 for(const [id,old] of before){const value=after.get(id);if(!same(old,value))updates.push({id,before:structuredClone(old),after:value===undefined?null:structuredClone(value)});}
 for(const [id,value] of after)if(!before.has(id))updates.push({id,before:null,after:structuredClone(value)});
 return updates;
}
function deltaJournal(before,after){
 const old=own(before,'Deník před'),next=own(after,'Deník po');
 for(const [id,row] of old)check(same(next.get(id),row),'Připravená činnost nesmí přepisovat historické doklady.');
 return [...next].filter(([id])=>!old.has(id)).map(([,row])=>structuredClone(row));
}
export function captureSharedActivityDelta93769(before,after,{activityId,groupId,startMinute,endMinute}={}){
 check(isId(activityId)&&isId(groupId)&&Number.isSafeInteger(startMinute)&&Number.isSafeInteger(endMinute)&&endMinute>startMinute,'Neplatné ID nebo čas činnosti.');
 check(before&&after&&same(before.campaignClock,after.campaignClock),'Dílčí činnost nesmí posunout kalendář.');
 const allowed=new Set(['characters','inventory','journal']);
 for(const field of new Set([...Object.keys(before),...Object.keys(after)]))
  if(!allowed.has(field))check(same(before[field],after[field]),'Nečekaný vedlejší účinek při přípravě: '+field);
 const patch={format:SERIAL_ACTIVITY_FORMAT_93769,activityId,groupId,startMinute,endMinute,
  characters:collectionDelta(before.characters||[],after.characters||[],'Postavy'),
  inventory:collectionDelta(before.inventory||[],after.inventory||[],'Inventář'),
  journal:deltaJournal(before.journal||[],after.journal||[])};
 check(patch.journal.some(x=>x.calendarTimeEpisode?.startMinute===startMinute&&x.calendarTimeEpisode?.endMinute===endMinute),
  'Příprava nevytvořila vlastní pravidlový doklad činnosti.');
 return patch;
}
export function replaySharedActivityDelta93769(copy,patch){
 check(copy&&patch?.format===SERIAL_ACTIVITY_FORMAT_93769&&isId(patch.activityId)&&isId(patch.groupId),
  'Neplatný serializovaný doklad činnosti.');
 check(Number.isSafeInteger(patch.startMinute)&&Number.isSafeInteger(patch.endMinute)&&patch.endMinute>patch.startMinute,
  'Neplatná časová kotva činnosti.');
 for(const label of ['characters','inventory']){
  const changes=patch[label];check(Array.isArray(changes),'Chybí změny '+label);
  const target=copy[label];check(Array.isArray(target),'Chybí cílová evidence '+label);
  for(const item of changes){
   check(isId(item.id)&&(item.before===null||item.before?.id===item.id)&&(item.after===null||item.after?.id===item.id),
    'Neplatná identita změny '+label);
   const at=target.findIndex(x=>x.id===item.id),present=at===-1?null:target[at];
   check(same(present,item.before),'Zastaralý výchozí stav '+label+': '+item.id);
   if(item.after===null){if(at>=0)target.splice(at,1);}else if(at>=0)target[at]=structuredClone(item.after);
   else target.push(structuredClone(item.after));
  }
 }
 check(Array.isArray(patch.journal),'Chybí doklady činnosti.');
 const existing=new Set((copy.journal||[]).map(x=>x.id));
 for(const row of patch.journal){
  check(isId(row?.id)&&!existing.has(row.id),'Duplicitní pravidlový doklad při obnovení.');
  copy.journal.push(structuredClone(row));existing.add(row.id);
 }
 const ownProof=patch.journal.filter(x=>x.calendarTimeEpisode?.startMinute===patch.startMinute&&x.calendarTimeEpisode?.endMinute===patch.endMinute);
 check(ownProof.length===1,'Každá činnost potřebuje přesně jeden doklad epizody.');
 return copy;
}
export function verifySharedActivityQueue93769(base,queue,{validateCopy=null}={}){
 check(Array.isArray(queue)&&queue.length>0,'Prázdná fronta společného intervalu.');
 const draft=structuredClone(base);const ids=new Set();
 for(const entry of queue){
  check(isId(entry?.sourceId)&&!ids.has(entry.sourceId)&&entry.patch?.activityId===entry.sourceId,
   'Duplicitní nebo chybějící doklad činnosti.');
  ids.add(entry.sourceId);replaySharedActivityDelta93769(draft,entry.patch);
 }
 if(validateCopy)validateCopy(draft);
 return draft;
}
