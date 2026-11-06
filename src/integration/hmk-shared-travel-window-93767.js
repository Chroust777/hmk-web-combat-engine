/**
 * HMK v93.767 – pure draft coordinator for a GM-confirmed travel time window.
 * No dice, changes to character state, persistent journal writes or time shifts.
 * A clock transition must be performed by the existing authoritative executor.
 * Geographic position is deliberately absent.
 */
export const TRAVEL_WINDOW_FORMAT_93767='hmk-shared-travel-window-draft-v1';
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const minute=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
const duration=n=>Number.isSafeInteger(n)&&n>=1&&n<=10080;
const validId=(id)=>typeof id==='string'&&id.trim().length>0&&id.length<=128;
const distinct=(list)=>new Set(list).size===list.length;
const uniqueIds=(list,label)=>{
 assert(Array.isArray(list)&&list.every(validId)&&distinct(list),label+': chybějící nebo duplicitní ID.');
 return [...list];
};
export function openSharedTravelWindow93767({campaignId,windowId,startMinute,requestedMinutes,maxAllowedMinutes,limitMinute=null}={}){
 assert(validId(campaignId)&&validId(windowId),'Časové okno musí patřit konkrétní kampani.');
 assert(minute(startMinute)&&duration(requestedMinutes),'Zadejte plánovaný interval 1–10 080 minut.');
 assert(Number.isSafeInteger(maxAllowedMinutes)&&maxAllowedMinutes>=0&&maxAllowedMinutes<=10080,'Chybí autoritativní zdravotní hranice kalendáře.');
 assert(maxAllowedMinutes>0,'Nyní je splatná povinná procedura; další čas nesmí plynout.');
 const minutes=Math.min(requestedMinutes,maxAllowedMinutes);
 assert(startMinute+minutes<=1e9,'Interval přesahuje podporovaný kalendář.');
 if(limitMinute!==null)assert(minute(limitMinute)&&limitMinute>=startMinute+minutes,'Neplatný nejbližší termín.');
 return {format:TRAVEL_WINDOW_FORMAT_93767,campaignId,windowId,startMinute,requestedMinutes,
  minutes,maxAllowedMinutes,endMinute:startMinute+minutes,shortened:requestedMinutes>minutes,limitMinute,groups:[]};
}
export function addSharedTravelGroup93767(window,{groupId,name,memberIds,animalIds=[]}={}){
 validateSharedTravelWindow93767(window);
 assert(validId(groupId)&&!window.groups.some(g=>g.groupId===groupId),'Skupina již existuje nebo nemá ID.');
 const members=uniqueIds(memberIds,'Postavy');const animals=uniqueIds(animalIds,'Zvířata');
 assert(members.length>0,'Vyberte alespoň jednu postavu.');
 assert(distinct([...members,...animals]),'Stejný účastník je zároveň postava i zvíře.');
 const occupied=new Set(window.groups.flatMap(g=>[...g.memberIds,...g.animalIds]));
 assert([...members,...animals].every(id=>!occupied.has(id)),'Postava nebo zvíře již patří jiné souběžné skupině.');
 const group={groupId,name:String(name||'').trim().slice(0,90)||'Skupina '+(window.groups.length+1),memberIds:members,animalIds:animals,activities:[]};
 return {...window,groups:[...window.groups,group]};
}
export function addSharedTravelActivity93767(window,{groupId,activityId,kind,minutes,vehicleKey=null}={}){
 validateSharedTravelWindow93767(window);
 const i=window.groups.findIndex(g=>g.groupId===groupId);
 assert(i>=0,'Skupina neexistuje.');
 assert(validId(activityId)&&!window.groups.some(g=>g.activities.some(a=>a.activityId===activityId)),'Neplatná nebo duplicitní činnost.');
 assert(['travel','rest','sleep','winded','forage','tracking','watch','other'].includes(kind),'Neznámá činnost.');
 assert(duration(minutes),'Zadejte skutečnou délku činnosti v minutách.');
 assert(vehicleKey===null||validId(vehicleKey),'Neplatný vůz.');
 const group=window.groups[i],offsetMinutes=group.activities.reduce((sum,a)=>sum+a.minutes,0);
 assert(offsetMinutes+minutes<=window.minutes,'Činnost by přesáhla společné časové okno.');
 if(vehicleKey){
  const absoluteStart=window.startMinute+offsetMinutes,absoluteEnd=absoluteStart+minutes;
  for(const g of window.groups)for(const a of g.activities)if(a.vehicleKey===vehicleKey&&
   absoluteStart<a.endMinute&&a.startMinute<absoluteEnd)
   throw Error('Stejný vůz nelze používat při dvou překrývajících se činnostech.');
 }
 const activity={activityId,kind,minutes,offsetMinutes,startMinute:window.startMinute+offsetMinutes,
  endMinute:window.startMinute+offsetMinutes+minutes,vehicleKey,status:'unresolved'};
 const nextGroups=[...window.groups];nextGroups[i]={...group,activities:[...group.activities,activity]};
 return {...window,groups:nextGroups};
}
export function setSharedTravelActivityProof93767(window,{activityId,proofId,sourceStartMinute,sourceEndMinute,participantIds,animalIds=[]}={}){
 validateSharedTravelWindow93767(window);
 assert(validId(proofId),'Chybí vlastní potvrzený doklad činnosti.');
 const all=window.groups.flatMap(g=>g.activities);
 assert(!all.some(a=>a.proofId===proofId),'Tentýž doklad již patří jiné činnosti.');
 let found=false;
 const groups=window.groups.map(g=>({...g,activities:g.activities.map(a=>{
  if(a.activityId!==activityId)return a;
  found=true;
  assert(a.status==='unresolved'&&!a.proofId,'Jednou přiřazený doklad nesmí být přepsán bez nového GM postupu.');
  assert(a.startMinute===sourceStartMinute&&a.endMinute===sourceEndMinute,
   'Doklad má jiné časové hranice než činnost.');
  assert(JSON.stringify([...g.memberIds].sort())===JSON.stringify(uniqueIds(participantIds,'Účastníci').sort()),
   'Doklad neodpovídá účastníkům skupiny.');
  assert(JSON.stringify([...g.animalIds].sort())===JSON.stringify(uniqueIds(animalIds,'Zvířata').sort()),
   'Doklad neodpovídá zvířatům skupiny.');
  return {...a,status:'verified',proofId};
 })}));
 assert(found,'Činnost pro doložení neexistuje.');
 return {...window,groups};
}
export function sharedTravelWindowBudget93767(window,groupId){
 validateSharedTravelWindow93767(window);
 const g=window.groups.find(x=>x.groupId===groupId);assert(g,'Neznámá skupina.');
 const usedMinutes=g.activities.reduce((sum,a)=>sum+a.minutes,0);
 return {usedMinutes,remainingMinutes:window.minutes-usedMinutes,nextMinute:window.startMinute+usedMinutes};
}
export function validateSharedTravelWindow93767(window,{requireProofs=false}={}){
 assert(window?.format===TRAVEL_WINDOW_FORMAT_93767,'Neplatný formát společného okna.');
 assert(validId(window.windowId)&&validId(window.campaignId),'Neplatná identita kampaně nebo okna.');
 assert(minute(window.startMinute)&&duration(window.minutes)&&duration(window.requestedMinutes)&&
  Number.isSafeInteger(window.maxAllowedMinutes)&&window.maxAllowedMinutes>=1&&window.maxAllowedMinutes<=10080&&
  window.minutes===Math.min(window.requestedMinutes,window.maxAllowedMinutes)&&
  window.endMinute===window.startMinute+window.minutes&&
  window.shortened===(window.minutes<window.requestedMinutes)&&
  (window.limitMinute===null||minute(window.limitMinute)&&window.limitMinute>=window.endMinute),
  'Časové hranice okna nejsou konzistentní.');
 assert(Array.isArray(window.groups)&&window.groups.every(g=>g&&validId(g.groupId)&&Array.isArray(g.activities)),
  'Neplatný seznam skupin.');
 const groupIds=[],assigned=[],activityIds=[],proofIds=[];
 for(const g of window.groups){
  groupIds.push(g.groupId);
  assert(Array.isArray(g.memberIds)&&g.memberIds.length>0,'Prázdná skupina není povolena.');
  assigned.push(...uniqueIds(g.memberIds,'Postavy'),...uniqueIds(g.animalIds,'Zvířata'));
  let offset=0;
  for(const a of g.activities){
   activityIds.push(a.activityId);
   assert(validId(a.activityId)&&duration(a.minutes)&&a.offsetMinutes===offset&&
    a.startMinute===window.startMinute+offset&&a.endMinute===a.startMinute+a.minutes&&
    a.endMinute<=window.endMinute,'Časová návaznost činnosti neodpovídá intervalu.');
   assert(['travel','rest','sleep','winded','forage','tracking','watch','other'].includes(a.kind),'Neznámá činnost.');
   assert(['unresolved','verified'].includes(a.status),'Neznámý stav činnosti.');
   if(a.status==='verified'){assert(validId(a.proofId),'Chybí doklad vyhodnocené činnosti.');proofIds.push(a.proofId);}
   if(requireProofs)assert(a.status==='verified','Všechny zvolené činnosti musí mít nezávislý doklad.');
   offset+=a.minutes;
  }
 }
 assert(distinct(groupIds)&&distinct(assigned)&&distinct(activityIds)&&distinct(proofIds),
  'Duplicitní skupiny, účastníci, činnosti nebo doklady.');
 const a=window.groups.flatMap(g=>g.activities.filter(a=>a.vehicleKey));
 for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)
  assert(a[i].vehicleKey!==a[j].vehicleKey||a[i].startMinute>=a[j].endMinute||a[j].startMinute>=a[i].endMinute,
   'Vůz byl přiřazen dvěma překrývajícím se činnostem.');
 return true;
}
export function finalizeSharedTravelWindow93767(window,{gmConfirmed=false,clockEventId}={}){
 validateSharedTravelWindow93767(window,{requireProofs:true});
 assert(gmConfirmed===true&&validId(clockEventId),'Chybí výslovné potvrzení GM a jediný doklad kalendáře.');
 assert(window.groups.length>0&&window.groups.some(g=>g.activities.length>0),'Časové okno nemá žádnou dokončenou činnost.');
 const episodeIds=window.groups.flatMap(g=>g.activities.map(a=>a.proofId));
 return {...window,format:'hmk-shared-travel-window-confirmed-v1',clockEventId,
  episodeIds,gmConfirmed:true,sourceFormat:TRAVEL_WINDOW_FORMAT_93767};
}

/**
 * Isolated atomic DRY-RUN executor. Does not mutate/persist `snapshot`.
 * A host must CAS-save the returned validated copy as ONE transaction; this
 * function is intentionally not wired to the older single-episode commit.
 * Every source proof comes from the legacy native HMK rule executor; this
 * coordinator itself cannot perform a roll, health procedure or initiative.
 */
export function stageSharedTravelAtomicCopy93767({window,snapshot,gmConfirmed=false,
 proofDocuments,applyActivity,advanceCalendar,validateCopy}={}){
 validateSharedTravelWindow93767(window,{requireProofs:true});
 assert(gmConfirmed===true,'Jedno finální potvrzení GM je povinné.');
 assert(snapshot&&typeof snapshot==='object'&&snapshot.campaignClock,
  'Chybí autoritativní počáteční stav kampaně.');
 assert(snapshot.campaignClock.minute===window.startMinute,
  'Mezitím se změnil herní čas; výsledky se musí znovu ověřit.');
 assert(typeof applyActivity==='function'&&typeof advanceCalendar==='function'&&typeof validateCopy==='function',
  'Chybí autoritativní pravidloví vykonavatelé.');
 assert(Array.isArray(proofDocuments),'Chybí přímé potvrzené doklady činností.');
 const expected=window.groups.flatMap(group=>group.activities.map(activity=>({activity,group})));
 assert(proofDocuments.length===expected.length&&new Set(proofDocuments.map(p=>p.proofId)).size===proofDocuments.length,
  'Každá činnost potřebuje právě jeden vlastní doklad.');
 const byId=new Map(proofDocuments.map(p=>[p.proofId,p]));
 for(const {activity,group} of expected){
  const proof=byId.get(activity.proofId);
  assert(proof?.startMinute===activity.startMinute&&proof.endMinute===activity.endMinute&&
   proof.kind===activity.kind&&
   Array.isArray(proof.memberIds)&&JSON.stringify([...proof.memberIds].sort())===JSON.stringify([...group.memberIds].sort())&&
   JSON.stringify([...uniqueIds(proof.animalIds||[],'Zvířata')].sort())===JSON.stringify([...group.animalIds].sort()),
   'Doklad činnosti je zastaralý nebo patří jiné skupině.');
 }
 const copy=structuredClone(snapshot);
 const beforeMinute=copy.campaignClock.minute;
 for(const {activity,group} of expected){
  applyActivity(copy,byId.get(activity.proofId),group,activity);
  assert(copy.campaignClock.minute===beforeMinute,
   'Dílčí činnost nesmí posunout kalendář.');
 }
 // Execute precisely ONCE after all independent activity proofs were applied.
 advanceCalendar(copy,{startMinute:beforeMinute,endMinute:window.endMinute,
  deltaMinutes:window.minutes,windowId:window.windowId});
 assert(copy.campaignClock.minute===window.endMinute,
  'Kalendář se musí posunout přesně jednou o společný interval.');
 validateCopy(copy);
 return copy;
}
