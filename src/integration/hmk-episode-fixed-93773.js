/** v93.806: a fixed-period row denotes ONE action, with an independent
 * group of one or more travellers. Every participant is reserved once;
 * all participants of a travel group share ONE guide and Orienteering.
 * Historical v93.773 singleton rows (without groupNumber) remain valid.
 * Pure planner: no dice, inventory, calendar, or character mutations.
 */
export function planFixedEpisode93773(window, rows=[], weatherIds=[]){
 const scheduled=[], errors=[], used={};
 if(!window||!Number.isSafeInteger(window.minutes)||window.minutes<1)return {scheduled,errors:[{id:'',message:'Neplatný společný interval.'}],used};
 if(!Array.isArray(rows)||!Array.isArray(weatherIds))return {scheduled,errors:[{id:'',message:'Neplatné činnosti či počasí.'}],used};
 const ids=new Set(),actors=new Set(),groupNumbers=new Set(),allowed=new Set(weatherIds);
 for(const [index,row] of rows.entries()){
  const id=row?.id||'';
  if(!id||typeof id!=='string'||ids.has(id)){errors.push({id,message:'Duplicitní nebo chybějící řádek.'});continue;}
  ids.add(id);
  if(row.episodeRowV!==3){errors.push({id,message:'Činnost nepatří do pevné epizody.'});continue;}
  const members=row.memberIds;
  if(typeof row.actorId!=='string'||!row.actorId||!Array.isArray(members)||!members.length||
     members.some(m=>typeof m!=='string'||!m)||new Set(members).size!==members.length||
     !members.includes(row.actorId)){
   errors.push({id,message:'Vyberte členy skupiny a právě jednoho průvodce z jejích členů.'});continue;
  }
  if(row.kind!=='travel'&&members.length!==1){
   errors.push({id,message:'Vícečlenná skupina je možná jen při Pochodu; jiná činnost je individuální.'});continue;
  }
  if(members.some(m=>actors.has(m))){errors.push({id,message:'Postava již vykonává činnost v jiné skupině stejného intervalu.'});continue;}
  if(!Number.isSafeInteger(row.minutes)||row.minutes!==window.minutes){errors.push({id,message:'Činnost musí trvat přesně celý společný interval ('+window.minutes+' min).'});continue;}
  if(typeof row.kind!=='string'||!row.kind){errors.push({id,message:'Vyberte činnost.'});continue;}
  if(!allowed.has(row.weatherId)){errors.push({id,message:'Vyberte existující potvrzené globální počasí.'});continue;}
  const number=row.groupNumber===undefined?index+1:Number(row.groupNumber);
  if(!Number.isSafeInteger(number)||number<1||number>99||groupNumbers.has(number)){
   errors.push({id,message:'Každá současná skupina musí mít své jedinečné číslo.'});continue;
  }
  if(row.groupId!==id||row.followsGroup){errors.push({id,message:'Neplatná identita časové skupiny.'});continue;}
  groupNumbers.add(number);
  for(const member of members){actors.add(member);used[member]=window.minutes;}
  scheduled.push({id,groupId:id,groupNumber:number,kind:row.kind,actorId:row.actorId,guideId:row.actorId,
   weatherId:row.weatherId,memberIds:[...members],startMinute:window.startMinute,
   endMinute:window.endMinute,minutes:window.minutes});
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
