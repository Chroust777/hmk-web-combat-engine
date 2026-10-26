/** GM-authorized full character deletion; NOT a rule action.
 * Removes the profile and its historical backing in one checkpoint. Ordinary
 * inventory edits must still retain every append-only water/medical proof.
 * This module contains no storage, cloud, or alternate character database. */
const isIdKey=key=>/^(?:characterId|actorId|targetId|targetActorId|ownerId|donorId|recipientId|sourceActorId|casterId|subjectId|patientId|healerId|helperId|victimId|attackerId|defenderId|assailantId|sourceId|sourceEventId|originId|linkedEventId|eventId|fillId|donorFillId|waterTransferId|targetFillId|transferId|sourceTestId|sourceUseId|applicationId|itemId|inventoryId|recipientItemId|donorItemId)$/i.test(key);
const isIdList=key=>/^(?:characterIds|actorIds|participantIds|participants|targets|actors|memberIds|eventIds|journalIds|sourceIds|inventoryIds)$/i.test(key);
function mentions(value,linked){
 if(!value||typeof value!=='object')return false;
 if(Array.isArray(value))return value.some(x=>mentions(x,linked));
 return Object.entries(value).some(([key,v])=>{
  if(isIdKey(key)&&typeof v==='string'&&linked.has(v))return true;
  if(isIdList(key)&&Array.isArray(v)&&v.some(id=>typeof id==='string'&&linked.has(id)))return true;
  return v&&typeof v==='object'&&mentions(v,linked);
 });
}
/** Pure deterministic transformation, usable in isolated regression tests. */
export function removeCharacterWithEvidence(database,id){
 if(!database||typeof id!=='string'||!id||![...(database.characters??[]),...(database.trash??[])].some(c=>c.id===id))throw Error('Postava pro smazání neexistuje');
 const out=structuredClone(database);
 const inventoryIds=new Set((out.inventory||[]).filter(item=>item.characterId===id).map(item=>item.id));
 // Drop person-owned proofs and their transitive dependent receipts, including
 // cross-character water transfers. Otherwise transferred water could become
 // unsupported or a dangling reference to a deleted fill or inventory item.
 const doomed=new Set([id,...inventoryIds]);
 const rows=out.journal||[];
 let changed=true;
 while(changed){changed=false;
  for(const row of rows){
   if(doomed.has(row.id))continue;
   if(row.characterId===id||mentions(row,doomed)){doomed.add(row.id);changed=true;}
  }
 }
 out.journal=rows.filter(row=>!doomed.has(row.id));
 out.inventory=(out.inventory||[]).filter(item=>item.characterId!==id);
 out.characters=out.characters.filter(c=>c.id!==id);
 out.trash=(out.trash||[]).filter(c=>c.id!==id);
 // Old campaign calendars retain actor-specific evidence after a calendar is
 // closed. A full GM deletion removes that actor there too; otherwise a new
 // calendar could resurrect their archived medical/calendar/inventory proofs.
 if(Array.isArray(out.calendarEvidenceArchives)){
  out.calendarEvidenceArchives=out.calendarEvidenceArchives.map(archive=>{
   const a=structuredClone(archive);
   if(Array.isArray(a.characterIds))a.characterIds=a.characterIds.filter(actorId=>actorId!==id);
   if(Array.isArray(a.anchors))a.anchors=a.anchors.filter(row=>row.characterId!==id&&!mentions(row,doomed));
   if(Array.isArray(a.journalTimes))a.journalTimes=a.journalTimes.filter(row=>row.characterId!==id&&!doomed.has(row.id));
   if(Array.isArray(a.medicalBranches))a.medicalBranches=a.medicalBranches.filter(row=>row.actorId!==id);
   if(Array.isArray(a.waterInventoryBackings))a.waterInventoryBackings=a.waterInventoryBackings.filter(row=>row.characterId!==id&&!doomed.has(row.id));
   if(Array.isArray(a.rationInventoryBackings))a.rationInventoryBackings=a.rationInventoryBackings.filter(row=>row.characterId!==id&&!doomed.has(row.id));
   return a;
  }).filter(a=>!Array.isArray(a.characterIds)||a.characterIds.length>0);
 }
 for(const branches of Object.values(out.campaignActorBranches??{}))delete branches[id];
 for(const clock of [out.campaignClock,...(out.campaignClocks||[])]){
  if(!clock)continue;
  if(Array.isArray(clock.characterIds))clock.characterIds=clock.characterIds.filter(actorId=>actorId!==id);
  if(Array.isArray(clock.anchors))clock.anchors=clock.anchors.filter(a=>a.characterId!==id&&!mentions(a,doomed));
  if(Array.isArray(clock.journalMinuteEvidence))clock.journalMinuteEvidence=clock.journalMinuteEvidence.filter(a=>a.characterId!==id&&!doomed.has(a.id));
  if(Array.isArray(clock.plans)){
   const removedPlans=new Set(clock.plans.filter(p=>p.characterId===id||mentions(p,doomed)).map(p=>p.id));
   clock.plans=clock.plans.filter(p=>!removedPlans.has(p.id));
   if(Array.isArray(clock.planResolutions))clock.planResolutions=clock.planResolutions.filter(p=>!removedPlans.has(p.planId)&&!mentions(p,doomed));
  }
  if(Array.isArray(clock.events))clock.events=clock.events.filter(e=>
   !mentions(e,doomed)&&!doomed.has(e.id)&&
   !(typeof e.id==='string'&&e.id.startsWith('character-deleted:'+id+':')));
  // No synthetic memorial record: the GM requested a full deletion, including
  // its subsequent scheduled activity. Unrelated timeline records survive.

 }
 // An active initiative checkpoint cannot refer to an absent combatant.
 if(out.combatRuntime?.participants?.includes(id)||out.combatRuntime?.sequence?.order?.includes(id))out.combatRuntime=null;
 return out;
}
/** An explicit whole-person purge must not touch unrelated authoritative rows.
 * Matching the pure transform detects accidental edits and validates pruning. */
export function assertOnlyCharacterWasDeleted(before,after,id){
 const expected=removeCharacterWithEvidence(before,id);
 if(JSON.stringify(after)!==JSON.stringify(expected))throw Error('Smazání postavy změnilo nesouvisející data');
 if(after.characters.some(c=>c.id===id)||after.trash?.some(c=>c.id===id)||after.inventory.some(item=>item.characterId===id)||after.journal.some(row=>row.characterId===id))
  throw Error('Smazaná postava zůstala v autoritativní evidenci');
 return true;
}
