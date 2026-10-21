/** HMK v1.2 p.75/p.186. Ingested, freshly administered Mild/Strong Poison
 * joins the ONE original lethal poison course. The printed Great dose needs
 * round-accurate onset and weapon-paste requires an injuring edge/point strike:
 * neither is guessed by this minute-based bridge.
 */
import {preparePoisonStart} from './hmk-poison-course.js';
import {validateHerbAdministrationJournal} from './hmk-herbal-administration.js';
const need=(ok,msg)=>{if(!ok)throw Error('Herbal Poison: '+msg)};
const integer=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export const HERBAL_POISON_EXPOSURE_FORMAT='hmk-herbal-poison-exposure-v1';
export function herbalPoisonProfile({potency,sv}={}){
 need(integer(potency,1,3)&&integer(sv,1,100),'chybí doložená potence či Herblore SV');
 need(sv<15,'15 − SV není kladný interval: nástup musí individuálně rozhodnout GM');
 need(potency!==3,'Great Poison má nástup v bojových kolech, nelze jej převést na minuty');
 const onsetCount=15-sv,unit=potency===1?'hours':'minutes';
 return {initialHR:potency===1?4:3,onsetCount,onsetUnit:unit,
  onsetMinutes:onsetCount*(potency===1?60:1),sourcePage:75};
}
function application(journal,campaignId,applicationId,minute,targetId){
 need(Array.isArray(journal)&&typeof campaignId==='string'&&campaignId&&
  typeof applicationId==='string'&&applicationId.length>=3&&integer(minute,0,1e9)&&
  typeof targetId==='string'&&targetId,'nedoložená kampaň, čas, pacient či podání');
 const row=journal.find(j=>j.id===applicationId&&j.calendarCampaignId===campaignId&&j.calendarHerbPotionAdminister);
 const p=row?.calendarHerbPotionAdminister;
 need(p?.herbType==='poison'&&p.method==='ingested'&&p.targetId===targetId&&row.campaignMinute===minute,
  'nutné skutečné požití konkrétního Poison lektvaru v aktuální minutě');
 need(journal.some(j=>j.id===p.completeId&&j.calendarCampaignId===campaignId&&
  j.calendarHerbPotionComplete?.herbType==='poison'), 'ztracený důkaz výroby');
 need(!journal.some(j=>j.calendarCampaignId===campaignId&&j.calendarHerbPoisonExposure?.applicationId===applicationId),
  'toto podání už má založenou expozici');
 return p;
}
/** Caller supplies the verified target character and existing Combat State;
 * returns an atomic state+proof without mutating either input. No dice rolled. */
export function prepareHerbalPoisonExposure({journal=[],campaignId,applicationId,minute,actor,state,round,
 periodMinutes,symptomD10s,gmConfirmed=false,actualExposureConfirmed=false,
 standardLethalConfirmed=false}={}){
 need(gmConfirmed===true&&actualExposureConfirmed===true&&standardLethalConfirmed===true,
  'GM musí potvrdit skutečné požití a standardní HR0 lethal průběh');
 need(actor?.id,'chybí konkrétní pacient');
 const p=application(journal,campaignId,applicationId,minute,actor.id),printed=herbalPoisonProfile(p);
 need(integer(periodMinutes,10,60),'GM musí určit skutečný Course interval 10–60 minut dle HMK 186');
 need(Array.isArray(symptomD10s)&&symptomD10s.length===4&&symptomD10s.every(d=>integer(d,1,10)),
  'doložte čtyři skutečné symptom d10');
 const herbalSource={applicationId,potency:p.potency,sv:p.sv};
 const sourceId='herb:'+applicationId;
 const result=preparePoisonStart({actor,state,round,sourceId,transmission:'digested',
  onsetMinutes:printed.onsetMinutes,periodMinutes,initialHR:printed.initialHR,symptomD10s,
  standardLethal:true,herbalSource,actualExposureConfirmed:true,gmConfirmed:true});
 const proof={format:HERBAL_POISON_EXPOSURE_FORMAT,campaignId,minute,applicationId,targetId:actor.id,
  sourceId,transmission:'digested',potency:p.potency,sv:p.sv,initialHR:printed.initialHR,
  onsetUnit:printed.onsetUnit,onsetCount:printed.onsetCount,onsetMinutes:printed.onsetMinutes,
  periodMinutes,symptomD10s:[...symptomD10s],eventId:'poison:'+sourceId,standardLethal:true,gmConfirmed:true,
  sourcePages:[75,183,184,186]};
 return {...result,proof};
}
export function validateHerbalPoisonExposureJournal(journal=[]){
 const prior=[],exposures=new Set();
 for(const j of journal){
  if(j.calendarHerbPoisonExposure){
   const p=j.calendarHerbPoisonExposure;
   need(p?.format===HERBAL_POISON_EXPOSURE_FORMAT&&p.gmConfirmed===true&&p.standardLethal===true&&
    j.calendarCampaignId===p.campaignId&&j.campaignMinute===p.minute&&j.characterId===p.targetId,
    'poškozený historický doklad expozice');
   need(!exposures.has(p.applicationId),'dvojí expozice z jediného podání');
   const source=application(prior,p.campaignId,p.applicationId,p.minute,p.targetId),printed=herbalPoisonProfile(source);
   const expected={format:HERBAL_POISON_EXPOSURE_FORMAT,campaignId:p.campaignId,minute:p.minute,
    applicationId:p.applicationId,targetId:p.targetId,sourceId:'herb:'+p.applicationId,
    transmission:'digested',potency:source.potency,sv:source.sv,initialHR:printed.initialHR,
    onsetUnit:printed.onsetUnit,onsetCount:printed.onsetCount,onsetMinutes:printed.onsetMinutes,
    periodMinutes:p.periodMinutes,symptomD10s:p.symptomD10s,eventId:'poison:'+p.sourceId,
    standardLethal:true,gmConfirmed:true,sourcePages:[75,183,184,186]};
   need(integer(p.periodMinutes,10,60)&&Array.isArray(p.symptomD10s)&&p.symptomD10s.length===4&&
    p.symptomD10s.every(d=>integer(d,1,10))&&
    JSON.stringify(p)===JSON.stringify(expected),'pozměněný SV, HR, čas či čtyři d10 expozice');
   const course=j.skillTestProof?.course;
   need(j.skillTestProof?.type==='poison-start'&&j.skillTestProof.sourceId===p.sourceId&&
    j.skillTestProof.actorId===p.targetId&&course?.sourceId===p.sourceId&&
    course.initialHR===p.initialHR&&course.hr===p.initialHR&&course.status==='incubating'&&
    course.standardLethal===true&&course.sequence===0&&course.elapsedMinutes===0&&
    course.onsetMinutes===p.onsetMinutes&&
    course.periodMinutes===p.periodMinutes&&course.transmission==='digested'&&
    JSON.stringify(course.symptomD10s)===JSON.stringify(p.symptomD10s)&&
    JSON.stringify(course.herbalSource)==JSON.stringify({applicationId:p.applicationId,potency:p.potency,sv:p.sv}),
    'pozměněný zdravotní Poison Course oproti bylinnému původu');
   exposures.add(p.applicationId);
  }
  prior.push(j);
 }
 return true;
}
export function assertHerbalPoisonExposureAppendOnly(before=[],after=[]){
 const byId=new Map(after.map(j=>[j.id,j]));
 for(const j of before)if(j.calendarHerbPoisonExposure)
  need(byId.has(j.id)&&JSON.stringify(j)===JSON.stringify(byId.get(j.id)),'historickou expozici nelze změnit či smazat');
 return true;
}
