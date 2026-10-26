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
 for(const branches of Object.values(out.campaignActorBranches??{}))delete branches[id];
 for(const clock of [out.campaignClock,...(out.campaignClocks||[])]){
  if(!clock)continue;
  const wasMember=Array.isArray(clock.characterIds)&&clock.characterIds.includes(id);
  if(Array.isArray(clock.characterIds))clock.characterIds=clock.characterIds.filter(actorId=>actorId!==id);
  if(Array.isArray(clock.anchors))clock.anchors=clock.anchors.filter(a=>a.characterId!==id);
  if(Array.isArray(clock.journalMinuteEvidence))clock.journalMinuteEvidence=clock.journalMinuteEvidence.filter(a=>a.characterId!==id);
  if(Array.isArray(clock.plans)){
   const removedPlans=new Set(clock.plans.filter(p=>p.characterId===id).map(p=>p.id));
   clock.plans=clock.plans.filter(p=>!removedPlans.has(p.id));
   if(Array.isArray(clock.planResolutions))clock.planResolutions=clock.planResolutions.filter(p=>!removedPlans.has(p.planId));
  }
  // A membership change is itself a GM calendar event. The time never moves.
  if(Array.isArray(clock.events)&&clock.events.length&&clock.events.some(e=>e.type==='init')&&wasMember){
   const eventId='character-deleted:'+id+':'+clock.events.length;
   if(!clock.events.some(e=>e.id===eventId))clock.events.push({id:eventId,type:'membership',minute:clock.minute,reason:'GM definitivně odstranil postavu '+id+' z kampaně'});
  }
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
