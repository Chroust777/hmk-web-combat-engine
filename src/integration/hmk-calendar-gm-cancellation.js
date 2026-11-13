/** HMK project decision v93.857: GM can cancel a calendar obligation and its
 * generated descendants.  Immutable real dice/history are NEVER deleted.
 * Authority is an append-only clock event, not a presentation-only hide.
 */
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=350;
const knownLinks=(row)=>{
 const p=row?.skillTestProof||{},x=row?.calendarTimeEpisode||{};
 return [p.sourceId,p.originId,p.originalId,p.parentId,row?.calendarTrekSkillSource?.sourceId,
  row?.calendarTrekResolutionProof?.sourceId,row?.calendarTrekTrackingProof?.sourceId,
  row?.calendarTrekWildernessProof?.sourceId,row?.calendarTrekWeatherRoll?.sourceId,
  row?.calendarTrekProof?.sourceId,row?.calendarExpeditionProof?.trekSourceId,
  row?.calendarActivityProof?.plan?.trekSourceId,x.orientation?.skillId,
  row?.calendarTrekEncounterProof?.sourceId,row?.calendarTrekHazardProof?.sourceId,
  row?.calendarHerbPotionComplete?.startId,row?.calendarAlchemyFinish?.startId,
  row?.calendarHerbParalyticEndurance?.applicationId].filter(validId);
};
/** The directed graph only follows VERIFIED, explicitly named origin links.
 * Never connect records merely because they involve the same actor or minute.
 */
export function gmCancellationSourceClosure(root,journal=[]){
 if(!validId(root))return new Set();
 const ids=new Set([root]),rows=journal.filter(x=>validId(x?.id));
 let changed=true;
 for(let round=0;changed&&round<=rows.length;round++){
  changed=false;
  for(const r of rows){
   // Only descend from a verified origin to a dependent proof.  DO NOT walk
   // from child to parent and thus accidentally cancel unrelated siblings.
   if(ids.has(r.id)||!knownLinks(r).some(x=>ids.has(x)))continue;
   ids.add(r.id);changed=true;
  }
 }
 return ids;
}
export function gmCalendarUnknownId(e){
 if(validId(e?.id))return e.id;
 return ['unknown',e?.characterId||'',e?.kind||'',e?.sourceId||e?.woundId||''].map(encodeURIComponent).join(':').slice(0,350);
}
export function gmCancellationPendingJournal(clock,journal=[]){
 const changes=(clock?.events||[]).filter(e=>e.type==='gm-cancel'&&e.rootSourceId);
 if(!changes.length)return journal;
 const removed=new Set();
 for(const c of changes)for(const id of gmCancellationSourceClosure(c.rootSourceId,journal))removed.add(id);
 return journal.filter(row=>!removed.has(row?.id));
}

export function gmCalendarCancellationMatches(clock,event,journal=[]){
 if(!clock||!event)return false;
 for(const x of clock.events||[]){
  if(x.type!=='gm-cancel')continue;
  if(x.targetId===gmCalendarUnknownId(event))return true;
  if(!x.rootSourceId)continue;
  const ids=gmCancellationSourceClosure(x.rootSourceId,journal);
  if([event.sourceId,event.originId,event.episodeId,event.woundId,event.startId,
    event.sourceEventId].some(s=>validId(s)&&ids.has(s)))return true;
  // Historical calendar entries use their original journal ID as sourceId.
  if(typeof event.id==='string'&&event.id.startsWith('history:')&&
    ids.has(event.id.slice('history:'.length)))return true;
 }
 return false;
}
export function cancelGMCalendarObligation(clock,{event,eventId,reason,gmConfirmed,journal=[]}={}){
 if(gmConfirmed!==true)throw Error('GM musí výslovně potvrdit zrušení.');
 if(!validId(eventId)||(clock.events||[]).some(e=>e.id===eventId))throw Error('Neplatné ID zrušení.');
 if(!event||!validId(gmCalendarUnknownId(event)))throw Error('Zrušená událost nemá jednoznačnou identitu.');
 if(typeof reason!=='string'||reason.trim().length<3||reason.length>350)throw Error('GM uvede důvod zrušení (3–350 znaků).');
 if(gmCalendarCancellationMatches(clock,event,journal))throw Error('Tato událost již byla GM zrušena.');
 const root=event.originId||event.sourceId||event.episodeId||event.woundId||event.startId||'';
 const next=structuredClone(clock);
 next.events.push({id:eventId,type:'gm-cancel',minute:clock.minute,
  reason:'GM zrušil kalendářovou událost: '+reason.trim(),
  targetId:gmCalendarUnknownId(event),targetKind:String(event.kind||event.origin||'calendar-event').slice(0,350),targetCharacterId:event.characterId||'',
  targetDueMinute:event.minute??event.dueMinute??clock.minute,rootSourceId:validId(root)?root:'',
  title:String(event.title||event.description||event.kind).slice(0,160),gmConfirmed:true});
 return next;
}
