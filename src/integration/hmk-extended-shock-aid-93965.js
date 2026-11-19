import {successValueTier} from './hmk-skill-test-engine.js';

/** HMK p.179. Physician aid belongs to one patient and one Extended Shock episode. */
export function extendedShockAidEpisode(state,anchor){
 if(!state?.extendedShock)return null;
 const onset=anchor?.combatEventId||state.events?.findLast(e=>
  e.type==='shock-recovery'&&Number.isSafeInteger(e.details?.extendedShockHR))?.id||anchor?.eventId;
 return typeof onset==='string'&&onset?onset:null;
}

export function extendedShockAids(journal,campaignId,patientId,episodeId){
 if(!episodeId)return [];
 return journal.filter(row=>{
  const aid=row.skillTestProof?.extendedShockAid93965;
  return row.calendarCampaignId===campaignId&&aid?.patientId===patientId&&aid.episodeId===episodeId;
 });
}

export function bestExtendedShockAid(aids){
 return aids.reduce((best,row)=>!best||row.skillTestProof.a.svTier.stars>best.skillTestProof.a.svTier.stars?row:best,null);
}

export function validateExtendedShockAidJournal(journal){
 const attempts=new Set();
 for(const row of journal){
  const proof=row.skillTestProof, aid=proof?.extendedShockAid93965;
  if(!aid)continue;
  const key=JSON.stringify([row.calendarCampaignId,aid.patientId,aid.episodeId,proof.actorId]);
  if([row.calendarCampaignId,aid.patientId,aid.episodeId,aid.woundId,proof.actorId].some(id=>typeof id!=='string'||!id)||
   proof.actorId!==row.characterId||aid.patientId===proof.actorId||proof.skills?.[0]!=='Physician'||
   proof.type!=='secondary-mastery-value-test'||!Number.isSafeInteger(proof.a?.sv)||
   !Number.isInteger(proof.a?.roll)||proof.a.roll<1||proof.a.roll>100||
   proof.a?.svTier?.stars!==successValueTier(proof.a.sv).stars||attempts.has(key))
   throw Error('Pomoc při Extended Shock má neplatný nebo duplicitní doklad Physician SV.');
  attempts.add(key);
 }
}
