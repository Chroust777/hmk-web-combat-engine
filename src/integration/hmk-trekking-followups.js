import {encounterGMResolution} from './hmk-trekking-encounter-gm.js';
import {weatherRollEvidence} from './hmk-trekking-weather-roll.js';
import {effectiveTrekSource} from './hmk-trekking-correction.js';
import {hasFinishedLinkedTrekHazard} from './hmk-trekking-handoff.js';
import {adjustedTrekkingMovement} from './hmk-trekking-routine.js';
/** Evidence-only Trekking hazards → calendar obligations. HMK v1.2 pp.148–150.
 * A weather/route/encounter roll is a trigger, NOT an inferred injury.
 */
const whole=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
const KINDS=Object.freeze({
 weather:{kind:'trek-weather-hazard',route:'hazards',label:'Weather Hazard – nejprve ochrana AV a d6/d10 nebo d4/d6/d10, potom případný Endurance (Survival) · HMK 149'},
 direction:{kind:'trek-direction-hazard',route:'skills',label:'Direction Hazard – vyhodnotit skutečné bloudění a jeho následky'},
 encounter:{kind:'trek-encounter',route:'combat',label:'Random Encounter – vyhodnotit Encounter Tables a následnou situaci'},
 survival:{kind:'trek-survival',route:'skills',label:'Survival Hazard – vyhodnotit CF a případný Accident'},
 'survival-test':{kind:'trek-survival-test',route:'skills',label:'Orienteering / Survival Success Value – doložit povinný test (HMK 145,148)'},
 drover:{kind:'trek-drover-test',route:'skills',label:'Drover Test – Riding / Animalcraft (HMK 145)'}
});
export function trekkingOutstandingCases(characters=[],journal=[],campaignId=null){
 const names=new Map(characters.map(c=>[c.id,c.name]));
 const resolutions=new Set();
 for(const entry of journal){
  const proof=entry?.calendarTrekResolutionProof;
  if(proof?.format==='hmk-trek-followup-resolution-v1'&&typeof proof.sourceId==='string'&&
   typeof proof.hazard==='string'&&KINDS[proof.hazard]&&entry.characterId&&
   entry.calendarCampaignId&&whole(entry.campaignMinute)&&proof.authoritativeResultId){
   // A result must have been recorded by another rules executor, never by
   // clicking the calendar or by a free-text GM note.
   const result=journal.find(j=>j.id===proof.authoritativeResultId&&j.characterId===entry.characterId&&
    j.calendarCampaignId===entry.calendarCampaignId&&whole(j.campaignMinute)&&j.campaignMinute>=proof.sourceMinute&&
    (j.skillTestProof||j.combatProof||j.specialOutcomeProof)&&
    // A general skill/combat journal record of the same actor must NEVER
    // close an unrelated Trekking hazard: source identity must be explicit.
    (j.calendarTrekSkillSource?.sourceId===proof.sourceId&&
      j.calendarTrekSkillSource?.hazard===proof.hazard||
     j.skillTestProof?.sourceId===proof.sourceId||
     j.combatProof?.sourceId===proof.sourceId||
     j.specialOutcomeProof?.sourceId===proof.sourceId));
   if(result)resolutions.add([entry.calendarCampaignId,entry.characterId,proof.sourceId,proof.hazard].join('|'));
  }
 }
 const cases=[];
 for(const entry of journal){
  const p=entry?.calendarTrekProof?effectiveTrekSource(entry,journal).calendarTrekProof:null;
  if(!p||p.format!=='hmk-trekking-watch-evidence-v1'||!entry.id||!names.has(entry.characterId)||
   !entry.calendarCampaignId||(campaignId&&entry.calendarCampaignId!==campaignId)||
   !whole(entry.campaignMinute)||entry.campaignMinute!==p.campaignMinute)continue;
  const triggers=[];
  if(!journal.some(j=>j.calendarTrekSkillSource?.format==='hmk-trek-linked-skill-v1'&&
    j.calendarTrekSkillSource.sourceId===entry.id&&j.calendarTrekSkillSource.hazard==='survival'&&
    j.characterId===entry.characterId&&j.calendarCampaignId===entry.calendarCampaignId))triggers.push('survival-test');
  if(p.orienteeringContext&&(p.conveyance!=='foot'||p.orienteeringContext.animalsPresent))triggers.push('drover');
  if(p.weatherWatch?.requiresWeatherHazardRoll)triggers.push('weather');
  if(p.hazards?.direction&&!(p.hazards.direction==='lost-time'&&p.effectiveMovement&&
   JSON.stringify(p.effectiveMovement)===JSON.stringify(adjustedTrekkingMovement(p))))triggers.push('direction');
  if(p.hazards?.survival||journal.some(j=>j.calendarTrekSkillSource?.sourceId===entry.id&&
   j.calendarTrekSkillSource.hazard==='survival'&&
   (j.skillTestProof?.a||j.skillTestProof?.result)?.level==='CF'))triggers.push('survival');
  if(p.encounter?.encounter)triggers.push('encounter');
  for(const hazard of triggers){
   // HMK p.149: the weather hazard is assessed for every exposed member,
   // NOT only the guide who prepared the shared watch.
   const members=hazard==='weather'?
     (p.partyModes?.memberIds??[entry.characterId]):
     [hazard==='drover'?p.orienteeringContext?.droverId:entry.characterId];
   for(const subjectId of members){
    if(!names.has(subjectId))continue;
    // The hazard die can prove that no exposure occurred. In that case an
    // Endurance/Survival test is NOT required (HMK p.149).
    if(hazard==='weather'&&weatherRollEvidence(journal,entry.id,subjectId,entry.calendarCampaignId)?.calendarTrekWeatherRoll.exposed===false)continue;
    const k=[entry.calendarCampaignId,subjectId,entry.id,hazard].join('|');
    if(resolutions.has(k)||hasFinishedLinkedTrekHazard(entry,hazard,journal,subjectId)||hazard==='encounter'&&encounterGMResolution(journal,entry.id,entry.calendarCampaignId))continue;
    const spec=KINDS[hazard];
    cases.push({id:'trek:'+encodeURIComponent(entry.id)+':'+hazard+':'+encodeURIComponent(subjectId),
     characterId:subjectId,name:names.get(subjectId),sourceId:entry.id,
     kind:spec.kind,description:spec.label,minute:entry.campaignMinute,route:spec.route,
     hazard:hazard==='survival-test'?'survival':hazard,sourcePage:hazard==='encounter'?150:hazard==='weather'?149:hazard==='survival-test'||hazard==='drover'?145:148});
   }
  }
 }
 return cases;
}
