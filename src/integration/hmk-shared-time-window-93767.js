/** v93.767 – one GM-confirmed calendar window, independent disjoint activities.
 * This is a coordination/validation layer, not a dice engine or a clock writer.
 * No position, locality or distance between parties is inferred or stored.
 */
export const SHARED_WINDOW_FORMAT_93767='hmk-gm-shared-time-window-v1';
const requireTrue=(condition,message)=>{if(!condition)throw Error(message);};
const validMinute=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
const unique=xs=>new Set(xs).size===xs.length;
const ids=(xs,label)=>{requireTrue(Array.isArray(xs)&&xs.every(x=>typeof x==='string'&&x.length),label+': neplatné ID');requireTrue(unique(xs),label+': duplicitní ID');return xs;};
export function startSharedTimeWindow93767({campaignId,startMinute,minutes,windowId}={}){
 requireTrue(typeof campaignId==='string'&&!!campaignId,'Chybí identita kampaně.');
 requireTrue(typeof windowId==='string'&&!!windowId,'Chybí identita časového okna.');
 requireTrue(validMinute(startMinute)&&Number.isSafeInteger(minutes)&&minutes>=1&&minutes<=10080&&startMinute+minutes<=1e9,
  'Společné časové okno potřebuje skutečný interval 1–10 080 minut.');
 return {format:SHARED_WINDOW_FORMAT_93767,windowId,campaignId,startMinute,endMinute:startMinute+minutes,minutes,groups:[]};
}
export function addSharedTimeGroup93767(window,group){
 requireTrue(window?.format===SHARED_WINDOW_FORMAT_93767,'Neplatné společné okno.');
 const {groupId,memberIds,animalIds=[],stableAnimalIds=[],vehicleKey=null,kind,startMinute,minutes}=group||{};
 requireTrue(typeof groupId==='string'&&!!groupId,'Chybí identita skupiny.');
 requireTrue(Number.isSafeInteger(startMinute)&&Number.isSafeInteger(minutes)&&minutes>=1&&
  startMinute>=window.startMinute&&startMinute+minutes<=window.endMinute,
  'Činnost musí být uvnitř společného časového okna.');
 requireTrue(typeof kind==='string'&&!!kind,'Neplatná činnost skupiny.');
 requireTrue(ids(memberIds,'Členové').length>0,'Skupina potřebuje alespoň jednoho účastníka.');
 ids(animalIds,'Zvířecí účastníci');ids(stableAnimalIds,'Tažná zvířata');
 const participants=[...memberIds,...animalIds,...stableAnimalIds];
 requireTrue(unique(participants),'Jedna bytost nesmí být ve skupině uvedena dvakrát.');
 requireTrue(vehicleKey===null||typeof vehicleKey==='string'&&!!vehicleKey,'Neplatná identita vozidla.');
 const same=window.groups.filter(g=>g.groupId===groupId),last=same.at(-1);
 if(last){
  const sameIds=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
  requireTrue(sameIds(last.memberIds,memberIds)&&sameIds(last.animalIds,animalIds)&&sameIds(last.stableAnimalIds,stableAnimalIds),
   'Pokračování stejné skupiny musí zachovat její účastníky.');
  requireTrue(startMinute===last.startMinute+last.minutes,
   'Další činnost skupiny musí začít přesně po předchozí činnosti.');
 }else requireTrue(startMinute===window.startMinute,'Nová skupina začíná na začátku společného okna.');
 for(const old of window.groups){
  const overlaps=startMinute<old.startMinute+old.minutes&&old.startMinute<startMinute+minutes;
  if(!overlaps||old.groupId===groupId)continue;
  requireTrue(!participants.some(id=>[...old.memberIds,...old.animalIds,...old.stableAnimalIds].includes(id)),
   'Jedna postava nebo zvíře nesmí vykonávat dvě souběžné činnosti.');
  requireTrue(!(vehicleKey&&old.vehicleKey===vehicleKey),
   'Jedno vozidlo nesmí být současně použito dvěma skupinami.');
 }
 return {...window,groups:[...window.groups,{groupId,kind,memberIds:[...memberIds],animalIds:[...animalIds],stableAnimalIds:[...stableAnimalIds],vehicleKey,startMinute,minutes}]};
}
export function confirmSharedTimeWindow93767(window,{episodeIds,clockEventId,gmConfirmed=false}={}){
 requireTrue(gmConfirmed===true,'Časové okno musí výslovně potvrdit GM.');
 requireTrue(window?.format===SHARED_WINDOW_FORMAT_93767&&window.groups?.length>0,'Nejsou připraveny žádné činnosti.');
 ids(episodeIds,'Epizody');requireTrue(episodeIds.length===window.groups.length,'Každá skupina musí mít právě jeden doklad epizody.');
 requireTrue(typeof clockEventId==='string'&&!!clockEventId,'Chybí jednoznačný doklad kalendáře.');
 return {...window,groupIds:window.groups.map(g=>g.groupId),episodeIds:[...episodeIds],clockEventId,
  gmConfirmed:true,groupCount:window.groups.length};
}
/** Validates only new explicitly scoped simultaneous receipts; legacy consecutive
 * episodes remain governed by their original time-episode validator.
 */
export function validateSharedTimeWindowJournal93767(journal=[],clock=null){
 const windows=new Map(), episodes=new Map();
 for(const row of journal){
  if(row.calendarTimeWindow){
   const w=row.calendarTimeWindow;requireTrue(w.format===SHARED_WINDOW_FORMAT_93767&&w.gmConfirmed===true&&w.groupCount>=1,
    'Neplatný doklad společného časového okna.');
   const key=row.calendarCampaignId+':'+w.windowId;
   requireTrue(!windows.has(key),'Společné časové okno bylo potvrzeno dvakrát.');windows.set(key,{row,w});
  }
  if(row.calendarTimeEpisode?.sharedWindowId){
   const e=row.calendarTimeEpisode,k=row.calendarCampaignId+':'+e.sharedWindowId;
   (episodes.get(k)||episodes.set(k,[]).get(k)).push(row);
  }
 }
 for(const [key,{row,w}] of windows){
  const list=episodes.get(key)||[];
  requireTrue(w.campaignId===row.calendarCampaignId&&row.campaignMinute===w.startMinute,
   'Neplatná kampaň nebo čas společného okna.');
  requireTrue(list.length===w.groupCount&&w.episodeIds.length===list.length&&unique(w.episodeIds)&&
   w.episodeIds.every(id=>list.some(x=>x.id===id)),
   'Některá připravená činnost chybí nebo byla zapsána dvakrát.');
  let rebuilt=startSharedTimeWindow93767(w);
  if(clock&&clock.campaignId===w.campaignId){
   const matches=clock.events?.filter(event=>event.id===w.clockEventId&&event.type==='advance'&&event.minute===w.endMinute)||[];
   requireTrue(matches.length===1,'Společné okno nemá jediný odpovídající posun kalendáře.');
  }
  for(const episodeId of w.episodeIds){
   const ep=list.find(x=>x.id===episodeId),e=ep.calendarTimeEpisode;
   rebuilt=addSharedTimeGroup93767(rebuilt,{groupId:e.sharedGroupId||episodeId,kind:e.kind,
    memberIds:e.memberIds,animalIds:(e.animals||[]).map(x=>x.id),stableAnimalIds:e.settings?.stableAnimalIds||e.transportProof?.vehicle?.teamIds||[],
    vehicleKey:e.transportProof?.vehicle?.vehicleKey||null,startMinute:e.startMinute,minutes:e.minutes});
   requireTrue(e.endMinute<=w.endMinute&&e.sharedWindowId===w.windowId,
    'Činnost přesahuje společné časové okno.');
  }
  requireTrue(JSON.stringify(rebuilt.groups)===JSON.stringify(w.groups)&&
   JSON.stringify(rebuilt.groups.map(g=>g.groupId))===JSON.stringify(w.groupIds),
   'Skupiny v historickém okně neodpovídají skutečným dokladům.');
 }
 for(const k of episodes.keys())requireTrue(windows.has(k),'Chybí autoritativní doklad společného okna.');
 return true;
}

/** v93.768 DEV: complete overlap audit for confirmed legacy or shared episodes.
 * All overlaps are checked (not just consecutive sorted rows). In a single
 * documented shared window, two *different* parties may overlap; two actions
 * of one actor cannot overlap. Sequential actions may meet at exact minutes.
 * This checks time and membership only. Geography is deliberately absent.
 */
export function assertSharedEpisodeOverlaps93768(episodes=[]){
 const requireCondition=(condition,message)=>{if(!condition)throw Error(message);};
 requireCondition(Array.isArray(episodes),'Chybí časové doklady epizod.');
 const byCampaign=new Map();
 for(const e of episodes){
  requireCondition(e&&typeof e.campaignId==='string'&&e.campaignId&&
   Number.isSafeInteger(e.startMinute)&&Number.isSafeInteger(e.endMinute)&&
   e.startMinute>=0&&e.endMinute>e.startMinute&&
   Array.isArray(e.memberIds)&&Array.isArray(e.animalIds),
   'Neplatné časové hranice nebo účastníci epizody.');
  const key=e.campaignId;
  if(!byCampaign.has(key))byCampaign.set(key,[]);
  byCampaign.get(key).push(e);
 }
 for(const entries of byCampaign.values()){
  entries.sort((a,b)=>a.startMinute-b.startMinute);
  for(let i=1;i<entries.length;i++){
   const current=entries[i];
   for(let j=i-1;j>=0;j--){
    const earlier=entries[j];
    if(current.startMinute>=earlier.endMinute)continue;
    requireCondition(current.sharedWindowId&&earlier.sharedWindowId&&
     current.sharedWindowId===earlier.sharedWindowId,
     'Herní epizody se nesmějí časově překrývat bez jednoho doloženého společného okna.');
    const involved=new Set([...earlier.memberIds,...earlier.animalIds]);
    requireCondition(![...current.memberIds,...current.animalIds].some(id=>involved.has(id)),
     'Stejný účastník nesmí mít dvě překrývající se činnosti.');
   }
  }
 }
 return true;
}
