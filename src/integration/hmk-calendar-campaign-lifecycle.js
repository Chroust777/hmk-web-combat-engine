/** Campaign-calendar lifecycle and surviving character-time evidence.
 * Deleting the calendar removes its GM plans and presentation clock, NEVER
 * confirmed character evidence. Time translation requires a proven shared
 * Tuzyn Reckoning date, or an explicit GM declaration of the SAME day axis.
 */
const DAY=1440, LIMIT=1000000000;
const integer=n=>Number.isSafeInteger(n);
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const daySerial=o=>(o.year-1)*360+(o.month-1)*30+o.day-1;
const axisOrigin=o=>daySerial(o)-o.anchorDay+1;
function translatedMinute(oldMinute,oldOrigin,newOrigin,identicalAxis){
 if(!integer(oldMinute)||Math.abs(oldMinute)>LIMIT)return null;
 if(oldOrigin&&newOrigin){
  const result=oldMinute+(axisOrigin(oldOrigin)-axisOrigin(newOrigin))*DAY;
  return integer(result)&&Math.abs(result)<=LIMIT?result:null;
 }
 return identicalAxis?oldMinute:null;
}
export function calendarMemberIds(clock,people){
 const all=people.filter(c=>c&&typeof c.id==='string');
 return clock&&Array.isArray(clock.characterIds)?all.filter(c=>clock.characterIds.includes(c.id)):all;
}
export function makeCalendarEvidenceArchive(clock,people,journal,id,inventory=[]){
 assert(clock&&typeof id==='string'&&id,'Chybí kalendář nebo identifikátor časového archivu');
 const ids=new Set([...calendarMemberIds(clock,people).map(c=>c.id),...(clock.anchors||[]).map(a=>a.characterId)]);
 // Only the durable evidence is retained; GM plans, clock controls and
 // presentation events really ARE deleted.
 const sourceCampaignId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 // Calendar deletion may remove its actor snapshot. Preserve only the medical
 // course identity and event chain needed to verify append-only HR proofs;
 // no new medical outcome is generated, and nothing is restored into gameplay.
 // Water-fill proofs outlive a deleted campaign; keep only their source
 // Waterskin inventory backings, not another mutable inventory or water pool.
 const skinIds=new Set((journal||[]).filter(j=>j.calendarCampaignId===sourceCampaignId&&
  ids.has(j.characterId)&&j.calendarInventoryWaterFill)
  .map(j=>j.calendarInventoryWaterFill.itemId));
 const waterInventoryBackings=(inventory||[]).filter(i=>skinIds.has(i.id)&&ids.has(i.characterId))
  .map(i=>structuredClone(i));
 assert(waterInventoryBackings.length===skinIds.size,
  'Nelze odstranit kalendář: chybí inventární původ některé doložené nádoby na vodu');
 // Preserve the original ration backing when deleting a campaign, even
 // after its remaining food has been consumed or transferred.
 const rationIds=new Set((journal||[]).filter(j=>j.calendarCampaignId===sourceCampaignId&&
  ids.has(j.characterId)&&j.calendarInventoryRationStock)
  .map(j=>j.calendarInventoryRationStock.itemId));
 const rationInventoryBackings=(inventory||[]).filter(i=>rationIds.has(i.id)&&ids.has(i.characterId))
  .map(i=>structuredClone(i));
 assert(rationInventoryBackings.length===rationIds.size,
  'Nelze odstranit kalendář: chybí původní inventární příděly');
 const medicalBranches=people.filter(c=>ids.has(c.id)).flatMap(c=>{
  const state=c.hmk?.combatState;
  const episodes=(state?.malnutritionEpisodes??[]).filter(e=>e.campaignId===sourceCampaignId);
  if(!episodes.length)return [];
  const sourceIds=new Set(episodes.map(e=>e.id));
  const events=(state.events??[]).filter(e=>sourceIds.has(e.id)||
   (e.type?.startsWith('malnutrition-')&&sourceIds.has(e.details?.episodeId)));
  return [{actorId:c.id,state:{malnutritionEpisodes:structuredClone(episodes),events:structuredClone(events)}}];
 });
 return {format:'hmk-calendar-character-time-evidence-v1',id,sourceCampaignId,medicalBranches,waterInventoryBackings,rationInventoryBackings,
  trOrigin:clock.trOrigin?structuredClone(clock.trOrigin):null,
  characterIds:[...ids],
  anchors:structuredClone((clock.anchors||[]).filter(a=>ids.has(a.characterId))),
  journalTimes:(journal||[]).flatMap(j=>{
   if(!ids.has(j.characterId))return [];
   const proven=clock.strictJournalEvidence?clock.journalMinuteEvidence?.find(e=>e.id===j.id)?.minute
      ??(j.calendarCampaignId===clock.campaignId?j.campaignMinute:null):j.campaignMinute;
   return integer(proven)&&proven>=0&&proven<=LIMIT?[{id:j.id,characterId:j.characterId,minute:proven}]:[];
  })};
}
export function validateCalendarEvidenceArchives(archives){
 assert(Array.isArray(archives)&&archives.length<=100,'Neplatná archivovaná časová evidence');
 const ids=new Set();
 for(const a of archives){
  assert(a&&a.format==='hmk-calendar-character-time-evidence-v1'&&typeof a.id==='string'&&a.id&&
   !ids.has(a.id)&&Array.isArray(a.characterIds)&&Array.isArray(a.anchors)&&
   Array.isArray(a.journalTimes)&&a.anchors.length<=30000&&a.journalTimes.length<=400000,
   'Poškozený archiv časových důkazů');ids.add(a.id);
  assert(a.characterIds.every(x=>typeof x==='string'&&x.length>0)&&new Set(a.characterIds).size===a.characterIds.length,
   'Neplatný výběr postav v archivu');
  if(a.sourceCampaignId!==undefined||a.medicalBranches!==undefined){
   assert(typeof a.sourceCampaignId==='string'&&a.sourceCampaignId&&Array.isArray(a.medicalBranches)&&
    a.medicalBranches.length<=a.characterIds.length,'Neplatný archiv medicínských důkazů');
   const included=new Set();
   for(const b of a.medicalBranches){
    assert(b&&a.characterIds.includes(b.actorId)&&!included.has(b.actorId)&&
     Array.isArray(b.state?.malnutritionEpisodes)&&Array.isArray(b.state?.events)&&
     b.state.malnutritionEpisodes.every(e=>e.campaignId===a.sourceCampaignId),
     'Poškozená archivní zdravotní větev');
    included.add(b.actorId);
   }
  }
  if(a.rationInventoryBackings!==undefined){
   assert(Array.isArray(a.rationInventoryBackings)&&a.rationInventoryBackings.length<=40000,
    'Poškozený archiv inventárních zásob potravy');
   const seenRations=new Set();
   for(const item of a.rationInventoryBackings){
    assert(item&&typeof item.id==='string'&&item.id&&!seenRations.has(item.id)&&
     typeof item.characterId==='string'&&a.characterIds.includes(item.characterId)&&
     item.snapshot&&typeof item.snapshot==='object',
     'Poškozený původ přídělů v archivu kampaně');
    seenRations.add(item.id);
   }
  }
  if(a.waterInventoryBackings!==undefined){
   assert(Array.isArray(a.waterInventoryBackings)&&a.waterInventoryBackings.length<=40000,
    'Poškozený archiv inventárních důkazů o vodě');
   const sources=new Set();
   for(const item of a.waterInventoryBackings){
    assert(item&&typeof item.id==='string'&&item.id&&!sources.has(item.id)&&
     typeof item.characterId==='string'&&a.characterIds.includes(item.characterId)&&
     item.snapshot&&typeof item.snapshot==='object',
     'Poškozený inventární původ vody v archivu kampaně');
    sources.add(item.id);
   }
  }
  if(a.trOrigin)assert(integer(a.trOrigin.anchorDay)&&integer(a.trOrigin.year)&&integer(a.trOrigin.month)&&integer(a.trOrigin.day)&&a.trOrigin.month>=1&&a.trOrigin.month<=12&&a.trOrigin.day>=1&&a.trOrigin.day<=30,'Neplatný původ TR');
  for(const p of a.anchors)assert(p&&a.characterIds.includes(p.characterId)&&typeof p.kind==='string'&&
   integer(p.minute)&&Math.abs(p.minute)<=LIMIT,'Poškozený čas vzniku případu');
  for(const j of a.journalTimes)assert(j&&typeof j.id==='string'&&a.characterIds.includes(j.characterId)&&integer(j.minute)&&j.minute>=0&&j.minute<=LIMIT,'Poškozený čas historického hodu');
 }
 return true;
}
/** Keeps append-only evidence across calendar deletion; does not touch actors. */
export function removeCalendarSafely(database,id){
 assert(database?.campaignClock,'Kalendář už neexistuje');
 const archive=makeCalendarEvidenceArchive(database.campaignClock,database.characters,database.journal,id,database.inventory);
 const next=structuredClone(database);next.calendarEvidenceArchives??=[];
 next.calendarEvidenceArchives.push(archive);
 validateCalendarEvidenceArchives(next.calendarEvidenceArchives);
 delete next.campaignClock;
 return next;
}
/** Restores factual timestamps only when an epoch transformation is justified.
 * Existing journal entries are never rewritten. The translated minutes are
 * stored as projections on the new clock and only used for its agenda.
 */
export function recoverCalendarEvidence(clock,archives=[],selectedIds=[],{identicalDayAxis=false,idFactory}={}){
 assert(clock&&typeof idFactory==='function','Chybí časová osa pro převod evidence');
 validateCalendarEvidenceArchives(archives);
 const next=structuredClone(clock),chosen=new Set(selectedIds);
 next.characterIds=[...chosen];next.journalMinuteEvidence??=[];
 const anchorKeys=new Set(next.anchors.map(a=>`${a.kind}|${a.characterId}|${a.woundId??''}|${a.episodeId??a.combatEventId??''}`));
 const journalIds=new Set(next.journalMinuteEvidence.map(j=>j.id));
 let recovered=0,unmapped=0;
 for(const archive of [...archives].reverse()){
  const map=(minute)=>translatedMinute(minute,archive.trOrigin,next.trOrigin,identicalDayAxis);
  for(const a of archive.anchors){if(!chosen.has(a.characterId))continue;
   const minute=map(a.minute);
   if(minute===null){unmapped++;continue;}
   const key=`${a.kind}|${a.characterId}|${a.woundId??''}|${a.episodeId??a.combatEventId??''}`;
   if(anchorKeys.has(key))continue;anchorKeys.add(key);
   next.anchors.push({...a,minute,recoveredFrom:archive.id});
   next.events.push({id:idFactory(),type:'anchor',minute:next.minute,
    reason:`Obnovený doložený počátek ${a.kind} postavy ${a.characterId} z časového archivu ${archive.id}`});
   recovered++;
  }
  for(const j of archive.journalTimes){if(!chosen.has(j.characterId)||journalIds.has(j.id))continue;
   const minute=map(j.minute);if(minute===null){unmapped++;continue;}
   next.journalMinuteEvidence.push({id:j.id,minute,characterId:j.characterId});journalIds.add(j.id);
  }
 }
 // Historical journal entries without a provable epoch may not schedule a new
 // campaign test. New journal entries use their native current-calendar minute.
 if(clock.campaignId||clock.strictJournalEvidence)next.strictJournalEvidence=true;
 return {clock:next,recovered,unmapped,journalCount:next.journalMinuteEvidence.length};
}
/** Used only when reading the calendar agenda, not to modify saved history. */
export function projectedCalendarJournal(clock,journal=[]){
 if(!clock?.strictJournalEvidence)return journal;
 const evidence=new Map((clock.journalMinuteEvidence??[]).map(x=>[x.id,x.minute]));
 return journal.map(j=>{
  const m=evidence.get(j.id);
  return Number.isSafeInteger(m)?{...j,campaignMinute:m}:
   j.calendarCampaignId&&j.calendarCampaignId===clock.campaignId?j:{...j,campaignMinute:null};
 });
}
export function assertCalendarEvidenceAppendOnly(before,after){
 const old=before?.calendarEvidenceArchives??[],current=after?.calendarEvidenceArchives??[];
 validateCalendarEvidenceArchives(current);
 assert(current.length>=old.length&&old.every((e,i)=>JSON.stringify(e)===JSON.stringify(current[i])),
  'Historické časové důkazy postav nelze změnit ani odstranit');
 return true;
}

/** Time-bound HMK effects which expire by comparing their already persisted
 * `until` with the campaign clock. They need NO new die and therefore NEVER
 * block clock advancement or rewrite the character state.
 * Source: existing special-outcome/talisman rule executors (HMK pp.300,316–317).
 */
export function passiveHMKCalendarMilestones(clock,characters=[]){
 if(!clock)return [];
 const events=[];const at=(c,kind,sourceId,until,title)=>{
  if(!integer(until)||until<0||until>LIMIT)return;
  const id=`passive:${kind}:${encodeURIComponent(c.id)}:${encodeURIComponent(String(sourceId||until))}`;
  if(events.some(x=>x.id===id))return;
  events.push({id,kind,characterId:c.id,name:c.name,sourceId,description:title,
   title:`${c.name} · ${title}`,minute:until,dueMinute:until,
   status:until<=clock.minute?'resolved':'future',origin:'passive',
   note:'Časový účinek se vypíná podle původního pravidlového stavu; není potřeba kostka ani potvrzení GM.'});
 };
 for(const c of calendarMemberIds(clock,characters)){
  const e=c.hmk?.liveEffects;if(!e)continue;
  if(e.festival?.until!=null)at(c,'festival-expiry',e.festival.sourceId,e.festival.until,'Konec Renewed Faith (360 dní) · HMK 316');
  if(e.blessing?.until!=null)at(c,'blessing-expiry',e.blessing.sourceId,e.blessing.until,'Konec Doctrine Blessing (30 dní) · HMK 317');
  for(const r of e.rites||[])if(r.until!=null)at(c,'rite-expiry',r.sourceId,r.until,'Konec Shamanic Rite (30 dní) · HMK 300');
  for(const t of e.talismans||[]){
   // End-of-period Spirit SR is a mandatory roll, not a passive event.
   if(integer(t.missingSince))at(c,'talisman-lost',`${t.sourceId}-lost`,t.missingSince+DAY,'Talisman mimo držení po 24 hodinách · HMK 302');
  }
  for(const t of e.talismanLockouts||[])if(t.until!=null)
   at(c,'talisman-lockout',t.sourceId,t.until,'Konec 30denního zákazu Talisman Bestowal · HMK 302');
 }
 return events.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
}

/** The *original* live-effect calculators compare persisted from/until with
 * clock.minute. Re-basing those fields would invalidate their journal proofs.
 * Refuse an unsafe different epoch rather than silently granting an expired
 * spell or removing a still-live talisman. Exact-origin calendars are safe.
 */
export function assertCompatibleLiveEffectTimeAxis(clock,archives,people,selectedIds,{identicalDayAxis=false}={}){
 const chosen=new Set(selectedIds);
 for(const actor of people){
  if(!chosen.has(actor.id))continue;
  const e=actor.hmk?.liveEffects;if(!e)continue;
  const timed=[e.festival,e.blessing,...e.rites??[],...e.talismans??[],...e.talismanLockouts??[]]
   .filter(x=>x&&integer(x.from)&&integer(x.until));
  if(!timed.length)continue;
  const archive=[...archives].reverse().find(a=>a.characterIds.includes(actor.id));
  if(!archive)continue;
  const shifted=translatedMinute(0,archive.trOrigin,clock.trOrigin,identicalDayAxis);
  assert(shifted===0,`Postava ${actor.name} má časované magické účinky s původními auditními hodnotami. Nový kalendář musí používat STEJNOU osu dní a časové počátky (rozdílné datum TR by porušilo jejich pravidlovou platnost).`);
 }
 return true;
}
