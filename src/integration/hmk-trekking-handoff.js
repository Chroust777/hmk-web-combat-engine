/** HMK v1.2 pp.148-149: authoritative, source-bound travel follow-ups.
 * The travel roll is evidence; it is NOT itself a successful medical test.
 * No character, campaign or event can be inferred from an unrelated journal row.
 */

const validMinute=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
const test=(p,msg)=>{if(!p)throw Error(msg)};
export const TREK_TEST_SKILLS=Object.freeze({weather:['Endurance','Survival'],direction:['Awareness'],survival:['Survival'],drover:['Riding','Animalcraft']});
/** HMK p.145: each advantage consumes one Orienteering star, up to five.
 * The COMPLETE budget cannot be inferred without situational SV modifiers
 * (familiarity, foraging, night lighting, party size, drover test, etc.).
 * This function deliberately tests ONLY the rules-imposed hard maximum.
 */
export function trekkingModeHardLimit(modes={}){
 const progress=modes.progress,bearing=modes.bearing;
 test(Number.isSafeInteger(progress)&&progress>=0&&Number.isSafeInteger(bearing)&&bearing>=0,
  'Chybí doložené počty režimů Progress/Bearing');
 const selected=progress+bearing;
 test(selected<=5,'Orienteering dovoluje nejvýše pět Advantage Modes (HMK str. 145)');
 return {selected,max:5,requiresAdjustedSurvivalSV:true};
}
export function trekkingSkillLinkForNewProof({pending,source,actorId,campaignId,minute,proof}={}){
 if(!pending||!source?.calendarTrekProof||source.id!==pending.sourceId||
    (pending.hazard==='drover'?source.calendarTrekProof.orienteeringContext?.droverId:source.characterId)!==actorId||source.calendarCampaignId!==campaignId||
    !validMinute(minute)||minute<source.campaignMinute||
    !['weather','survival','direction','drover'].includes(pending.hazard))return null;
 const skills=TREK_TEST_SKILLS[pending.hazard];
 const used=proof?.skills?.[0]||proof?.skill;
 if(pending.hazard==='weather'&&!source.calendarTrekProof.weatherWatch?.requiresWeatherHazardRoll)return null;
 if(pending.hazard==='drover'&&(source.calendarTrekProof.conveyance==='foot'||
   used!==(source.calendarTrekProof.conveyance==='mount'?'Riding':'Animalcraft')))return null;
 if(pending.hazard==='direction'&&!['misdirection'].includes(source.calendarTrekProof.hazards?.direction))return null;
 if(!skills.includes(used)||!['secondary-mastery-test','secondary-mastery-value-test',
   'success-value-test','success-value-specific','assistance-success-test'].includes(proof?.type))return null;
 const result=proof?.a||proof?.result;
 if(!['CF','F','S','CS'].includes(result?.level))return null;
 return {format:'hmk-trek-linked-skill-v1',sourceId:source.id,hazard:pending.hazard,
   sourceMinute:source.campaignMinute,campaignId,actorId,skill:used};
}
export function hasFinishedLinkedTrekHazard(source,hazard,journal){
 const relevant=journal.filter(j=>j?.calendarTrekSkillSource?.format==='hmk-trek-linked-skill-v1'&&
  j.calendarTrekSkillSource.sourceId===source.id&&j.calendarTrekSkillSource.hazard===hazard&&
  j.characterId===(hazard==='drover'?source.calendarTrekProof.orienteeringContext?.droverId:source.characterId)&&j.calendarCampaignId===source.calendarCampaignId&&
  validMinute(j.campaignMinute)&&j.campaignMinute>=source.campaignMinute);
 if(hazard==='drover')return relevant.length>0;
 if(hazard==='survival'){
  // No CF -> no Survival Hazard under HMK p.148; no extra die is generated.
  if(relevant.some(j=>(j.skillTestProof?.a||j.skillTestProof?.result)?.level!=='CF'))return true;
  return relevant.some(j=>{
   if((j.skillTestProof?.a||j.skillTestProof?.result)?.level!=='CF')return false;
   const follow=journal.find(x=>x.skillTestProof?.type==='critical-followup'&&
     x.skillTestProof.originId===j.id&&x.skillTestProof.activity==='trek-survival-hazard'&&
     x.characterId===source.characterId&&x.calendarCampaignId===source.calendarCampaignId);
   return !!follow&&journal.some(x=>x.skillTestProof?.type==='skill-physical-consequence'&&
    x.skillTestProof.sourceId===follow.id&&x.skillTestProof.nonInjuryHazard!==true&&
    x.skillTestProof.actorId===x.characterId&&x.calendarCampaignId===source.calendarCampaignId&&
    validMinute(x.campaignMinute)&&x.campaignMinute>=source.campaignMinute);
  });
 }
 if(hazard==='weather')return relevant.some(j=>journal.some(x=>x.skillTestProof?.type==='skill-weather-onset'&&
  x.skillTestProof.sourceId===j.id&&x.characterId===source.characterId&&
  x.calendarCampaignId===source.calendarCampaignId&&validMinute(x.campaignMinute)&&x.campaignMinute>=source.campaignMinute));
 return false;
}
export function validateTrekLinkedEvidence(journal=[]){
 const byId=new Map(journal.map(x=>[x.id,x]));
 const seen=new Set();
 for(const entry of journal){
  const p=entry?.calendarTrekSkillSource;if(!p)continue;
  test(p.format==='hmk-trek-linked-skill-v1'&&['weather','direction','survival','drover'].includes(p.hazard),
   'Neplatná vazba testu na Trekking');
  const src=byId.get(p.sourceId),valid=trekkingSkillLinkForNewProof({
   pending:{sourceId:p.sourceId,hazard:p.hazard},source:src,actorId:entry.characterId,
   campaignId:entry.calendarCampaignId,minute:entry.campaignMinute,proof:entry.skillTestProof});
  test(valid&&JSON.stringify(valid)===JSON.stringify(p),'Neplatný nebo cizí pravidlový důkaz Trekking');
  const key=[entry.calendarCampaignId,entry.characterId,p.sourceId,p.hazard].join('|');
  test(!seen.has(key),'Duplicitní původní test cestovního následku');seen.add(key);
 }
 return true;
}
