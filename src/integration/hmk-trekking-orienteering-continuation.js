/** HMK 1.2 pp.145–150. An interrupted watch is still the SAME 4-hour watch.
 * The GM can reuse an already certified Survival SV only if all facts used
 * for that orientation calculation are unchanged. The evidence is a reference,
 * not a new roll or a second linked Skill Test. Weather alone is not an SV
 * modifier; a change to the night/snow/familiarity/context IS.
 */
import {adjustedOrienteeringSV} from './hmk-trekking-orienteering.js';

export const TREK_ORIENTATION_REUSE_FORMAT='hmk-trek-orientation-continuation-v1';
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const requireFact=(yes,msg)=>{if(!yes)throw Error(msg);};
const canonicalIds=p=>(p?.partyModes?.memberIds??[]).slice().sort();
const movementParty=p=>p?({
 memberIds:canonicalIds(p),guideId:p.guideId,conveyance:p.conveyance,
 forcedSlow:p.forcedSlow,loaded:p.loaded,manualLoaded:p.manualLoaded,
 loadUnresolved:p.loadUnresolved,
 members:p.members?.map(m=>({id:m.id,injured:m.injured,immobile:m.immobile,loaded:m.loaded,modifiedENC:m.modifiedENC})),
 animals:p.animals?.map(a=>({id:a.id,enc:a.enc,droverId:a.droverId,loaded:a.loaded,
  injury:a.health?.injured,wearied:a.health?.fatigue>=20}))
}):null;
export function trekOrientationWitness(source,journal=[],seen=new Set()){
 if(!source?.calendarTrekProof||seen.has(source.id))return null;
 seen.add(source.id);
 const p=source.calendarTrekProof;
 if(p.orienteeringReuse){
  const earlier=journal.find(x=>x.id===p.orienteeringReuse.sourceId);
  const witness=trekOrientationWitness(earlier,journal,seen);
  return witness&&witness.survival.id===p.orienteeringReuse.skillId&&
   (witness.drover?.id??null)===(p.orienteeringReuse.droverId??null)?witness:null;
 }
 const survival=journal.find(j=>j.calendarCampaignId===source.calendarCampaignId&&
  j.characterId===source.characterId&&j.calendarTrekSkillSource?.sourceId===source.id&&
  j.calendarTrekSkillSource.hazard==='survival');
 const droverId=p.orienteeringContext?.droverId;
 const drover=droverId?journal.find(j=>j.calendarCampaignId===source.calendarCampaignId&&
  j.characterId===droverId&&j.calendarTrekSkillSource?.sourceId===source.id&&
  j.calendarTrekSkillSource.hazard==='drover'):null;
 const result=survival?.skillTestProof?.a??survival?.skillTestProof?.result;
 if(!Number.isSafeInteger(result?.sv)||!['CF','F','S','CS'].includes(result.level)||
  !['secondary-mastery-value-test','success-value-specific'].includes(survival?.skillTestProof?.type)||
  (droverId&&!drover))return null;
 return {survival,drover};
}
export function eligibleTrekOrientationReuse({earlier,current,journal=[]}={}){
 const old=earlier?.calendarTrekProof,p=current?.calendarTrekProof;
 if(!old||!p||!earlier.id||!current.id||
  earlier.calendarCampaignId!==current.calendarCampaignId||
  earlier.characterId!==current.characterId||
  earlier.campaignMinute>=current.campaignMinute||
  Math.floor(earlier.campaignMinute/240)!==Math.floor(current.campaignMinute/240)||
  old.area!==p.area||old.terrain!==p.terrain||old.landscape!==p.landscape||
  old.season!==p.season||old.climate!==p.climate||old.alpine!==p.alpine||old.aridDesert!==p.aridDesert||
  old.conveyance!==p.conveyance||old.night!==p.night||
  !eq(canonicalIds(old),canonicalIds(p))||!eq(old.orienteeringContext,p.orienteeringContext))return null;
 const witness=trekOrientationWitness(earlier,journal);
 if(!witness)return null;
 const result=witness.survival.skillTestProof.a??witness.survival.skillTestProof.result;
 const droverResult=witness.drover?.skillTestProof?.a??witness.drover?.skillTestProof?.result??null;
 let adjustment;
 try{
  adjustment=adjustedOrienteeringSV({baseSV:result.sv,context:p.orienteeringContext,droverResult});
 }catch{return null;}
 return {format:TREK_ORIENTATION_REUSE_FORMAT,sourceId:earlier.id,skillId:witness.survival.id,
  droverId:witness.drover?.id??null,sourceMinute:earlier.campaignMinute,adjustedSV:adjustment.adjustedSV};
}
export function validatedTrekOrientationReuse(source,journal=[]){
 const ref=source?.calendarTrekProof?.orienteeringReuse;
 if(!ref)return null;
 requireFact(ref.format===TREK_ORIENTATION_REUSE_FORMAT,'Neplatná vazba pokračujícího Orienteering.');
 const earlier=journal.find(j=>j.id===ref.sourceId);
 const expected=eligibleTrekOrientationReuse({earlier,current:source,journal});
 requireFact(expected&&eq(ref,expected),'Pokračující Orienteering není podložen stejnou hlídkou, průvodcem a situačními podmínkami.');
 return trekOrientationWitness(earlier,journal);
}
/** Exactly unchanged movement conditions allow the prior Progress/Direction
 * results to carry forward as old witnesses. A changed weather Slow/party
 * burden/mode objective needs a NEW derived movement calculation instead. */
export function mayReuseTrekMovement({earlier,current}={}){
 const a=earlier?.calendarTrekProof,b=current?.calendarTrekProof;
 return !!a&&!!b&&!!b.orienteeringReuse&&
  a.terrain===b.terrain&&a.landscape===b.landscape&&a.conveyance===b.conveyance&&
  a.night===b.night&&a.weatherWatch?.continuous===b.weatherWatch?.continuous&&
  eq(movementParty(a.partyModes),movementParty(b.partyModes))&&
  a.modes?.manualSlow===b.modes?.manualSlow&&
  a.modes?.autoPriority===b.modes?.autoPriority&&
  a.modes?.loaded===b.modes?.loaded&&
  a.modes?.doubleTime===b.modes?.doubleTime&&
  a.modes?.trackingForcedBearingSourceId===b.modes?.trackingForcedBearingSourceId;
}
