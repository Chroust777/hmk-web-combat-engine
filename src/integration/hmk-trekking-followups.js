/** Evidence-only Trekking hazards → calendar obligations. HMK v1.2 pp.148–150.
 * A weather/route/encounter roll is a trigger, NOT an inferred injury.
 */
const whole=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
const KINDS=Object.freeze({
 weather:{kind:'trek-weather-hazard',route:'hazards',label:'Weather Hazard – dokončit původní Cold/Heat proceduru'},
 direction:{kind:'trek-direction-hazard',route:'skills',label:'Direction Hazard – vyhodnotit skutečné bloudění a jeho následky'},
 encounter:{kind:'trek-encounter',route:'combat',label:'Random Encounter – vyhodnotit Encounter Tables a následnou situaci'},
 survival:{kind:'trek-survival',route:'skills',label:'Survival Hazard – vyhodnotit CF a případný Accident'}
});
export function trekkingOutstandingCases(characters=[],journal=[]){
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
    (j.skillTestProof||j.combatProof||j.specialOutcomeProof));
   if(result)resolutions.add([entry.calendarCampaignId,entry.characterId,proof.sourceId,proof.hazard].join('|'));
  }
 }
 const cases=[];
 for(const entry of journal){
  const p=entry?.calendarTrekProof;
  if(!p||p.format!=='hmk-trekking-watch-evidence-v1'||!entry.id||!names.has(entry.characterId)||
   !entry.calendarCampaignId||!whole(entry.campaignMinute)||entry.campaignMinute!==p.campaignMinute)continue;
  const triggers=[];
  if(p.weatherWatch?.requiresWeatherHazardRoll)triggers.push('weather');
  if(p.hazards?.direction)triggers.push('direction');
  if(p.hazards?.survival)triggers.push('survival');
  if(p.encounter?.encounter)triggers.push('encounter');
  for(const hazard of triggers){
   const k=[entry.calendarCampaignId,entry.characterId,entry.id,hazard].join('|');
   if(resolutions.has(k))continue;
   const spec=KINDS[hazard];
   cases.push({id:'trek:'+encodeURIComponent(entry.id)+':'+hazard,
    characterId:entry.characterId,name:names.get(entry.characterId),sourceId:entry.id,
    kind:spec.kind,description:spec.label,minute:entry.campaignMinute,route:spec.route,
    hazard,sourcePage:hazard==='encounter'?150:hazard==='weather'?144:148});
  }
 }
 return cases;
}
