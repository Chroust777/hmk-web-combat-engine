/** v93.773: one actor, one action spanning the entire GM episode.
 * No rolls, health mutations, weather creation or calendar writes here.
 * Old v93.772 multi-row drafts are validated through their original planner.
 */
export function planFixedEpisode93773(window, rows=[], weatherIds=[]){
 const scheduled=[], errors=[], used={};
 if(!window||!Number.isSafeInteger(window.minutes)||window.minutes<1)return {scheduled,errors:[{id:'',message:'Neplatný společný interval.'}],used};
 if(!Array.isArray(rows)||!Array.isArray(weatherIds))return {scheduled,errors:[{id:'',message:'Neplatné činnosti či počasí.'}],used};
 const ids=new Set(),actors=new Set(),allowed=new Set(weatherIds);
 for(const row of rows){
  const id=row?.id||'';
  if(!id||typeof id!=='string'||ids.has(id)){errors.push({id,message:'Duplicitní nebo chybějící řádek.'});continue;}
  ids.add(id);
  if(row.episodeRowV!==3){errors.push({id,message:'Činnost nepatří do pevné epizody v93.773.'});continue;}
  if(typeof row.actorId!=='string'||!row.actorId){errors.push({id,message:'Vyberte postavu.'});continue;}
  if(actors.has(row.actorId)){errors.push({id,message:'Každá postava smí mít v jednom intervalu právě jednu činnost.'});continue;}
  actors.add(row.actorId);
  if(!Number.isSafeInteger(row.minutes)||row.minutes!==window.minutes){errors.push({id,message:'Činnost musí trvat přesně celý společný interval ('+window.minutes+' min).'});continue;}
  if(typeof row.kind!=='string'||!row.kind){errors.push({id,message:'Vyberte činnost.'});continue;}
  if(!allowed.has(row.weatherId)){errors.push({id,message:'Vyberte existující potvrzené globální počasí.'});continue;}
  if(row.groupId!==id||row.followsGroup||JSON.stringify(row.memberIds)!==JSON.stringify([row.actorId])){
   errors.push({id,message:'Činnost má neplatnou identitu účastníka nebo časové skupiny.'});continue;
  }
  used[row.actorId]=window.minutes;
  scheduled.push({id,groupId:id,kind:row.kind,actorId:row.actorId,weatherId:row.weatherId,memberIds:[row.actorId],
   startMinute:window.startMinute,endMinute:window.endMinute,minutes:window.minutes});
 }
 return {scheduled,errors,used};
}
export function fixedAccidentMinute93773({startMinute,endMinute,minutes,hazards=[]}={}){
 if(!Number.isSafeInteger(startMinute)||!Number.isSafeInteger(endMinute)||!Number.isSafeInteger(minutes)||
    endMinute!==startMinute+minutes||minutes<1)throw Error('Neplatný časový rozsah nehody.');
 for(const h of hazards){
  if(h?.hazard==='accident'&&h.externalMedicalPending){
   if(h.hazardAtMinute!==minutes)throw Error('Nehoda musí být evidována na konci společné epizody.');
  }
 }
 return endMinute;
}
