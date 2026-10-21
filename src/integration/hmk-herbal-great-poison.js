/** HMK v1.2 pp.75, 186: Great *ingested* Poison onset after (15-SV) real
 * encounter rounds. Ingestion reserves the unique physical dose. There is
 * NO toxin until the exact round; we then invoke the ORIGINAL Poison Course
 * at elapsed minute 0 and its existing onset, atomically.
 * Weapon paste is NOT silently considered ingested or administered.
 */
import {preparePoisonStart,preparePoisonOnset} from './hmk-poison-course.js';
const need=(ok,msg)=>{if(!ok)throw Error('Great Poison: '+msg)};
const integer=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
export const GREAT_POISON_FORMAT='hmk-herbal-great-poison-onset-v1';
export function pendingGreatPoisons(journal=[],campaignId='',timelineId=''){
 const done=new Set(journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarHerbGreatPoisonOnset)
  .map(j=>j.calendarHerbGreatPoisonOnset.applicationId));
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarHerbPotionAdminister?.herbType==='poison'&&
  j.calendarHerbPotionAdminister.potency===3&&j.calendarHerbPotionAdminister.poisonGreatTracked===true&&
  j.calendarHerbPotionAdminister.method==='ingested'&&
  (!timelineId||j.calendarHerbPotionAdminister.combatAnchor?.timelineId===timelineId)&&!done.has(j.id))
  .map(j=>({applicationId:j.id,targetId:j.calendarHerbPotionAdminister.targetId,
   timelineId:j.calendarHerbPotionAdminister.combatAnchor.timelineId,
   originRound:j.calendarHerbPotionAdminister.combatAnchor.round,
   dueRound:j.calendarHerbPotionAdminister.combatAnchor.round+15-j.calendarHerbPotionAdminister.sv,
   originMinute:j.campaignMinute,source:j}));
}
export function requireGreatPoisonRoundMayAdvance({journal,campaignId,timelineId,currentRound,nextRound}={}){
 need(integer(currentRound,1,9999)&&integer(nextRound,currentRound+1,9999),'neplatné bojové kolo');
 const p=pendingGreatPoisons(journal,campaignId,timelineId).find(t=>nextRound>t.dueRound);
 need(!p,'nelze přeskočit povinný nástup HR4 v kole '+p?.dueRound);return true;
}
export function requireGreatPoisonGMTimeMayAdvance({journal,campaignId,beforeMinute,afterMinute}={}){
 if(afterMinute<=beforeMinute)return true;
 const p=pendingGreatPoisons(journal,campaignId).find(t=>t.originMinute<afterMinute);
 need(!p,'před posunem minut GM vyhodnoťte Great Poison v bojovém kole '+p?.dueRound);return true;
}
export function prepareGreatPoisonOnset({journal=[],campaignId,applicationId,minute,round,timelineId,
 actor,state,periodMinutes,symptomD10s,gmConfirmed=false}={}){
 need(gmConfirmed===true&&actor?.id&&typeof timelineId==='string'&&timelineId.length>=3&&
  integer(minute,0,1e9)&&integer(round,1,9999),'chybí GM, pacient nebo doložená bojová osa');
 const pending=pendingGreatPoisons(journal,campaignId,timelineId).find(p=>p.applicationId===applicationId);
 need(pending&&pending.targetId===actor.id,'neexistuje nevyhodnocené požití pro tuto postavu/kampaň/boj');
 need(round===pending.dueRound,'nástup vyžaduje přesně bojové kolo '+pending.dueRound);
 need(minute>=pending.originMinute&&minute<=pending.originMinute+1,
  'neodpovídá skutečná kalendářní minuta bojovým kolům');
 const p=pending.source.calendarHerbPotionAdminister;
 need(integer(p.sv,1,14)&&p.potency===3,'neplatná potence/SV; 15 − SV musí být kladné');
 need(integer(periodMinutes,10,60)&&Array.isArray(symptomD10s)&&symptomD10s.length===4&&
  symptomD10s.every(n=>integer(n,1,10)),'GM musí doložit Course period 10–60 a čtyři symptom d10');
 const sourceId='herb:'+applicationId;
 const start=preparePoisonStart({actor,state,round,sourceId,transmission:'digested',onsetMinutes:0,
  periodMinutes,initialHR:4,symptomD10s,standardLethal:true,
  herbalSource:{applicationId,potency:3,sv:p.sv,onsetRounds:15-p.sv,originRound:pending.originRound,timelineId},
  actualExposureConfirmed:true,gmConfirmed:true});
 const onset=preparePoisonOnset({actor,state:start.state,round,sourceId,elapsedMinutes:0,gmConfirmed:true});
 const proof={format:GREAT_POISON_FORMAT,campaignId,applicationId,originMinute:pending.originMinute,
  minute,targetId:actor.id,timelineId,originRound:pending.originRound,dueRound:pending.dueRound,
  potency:3,sv:p.sv,initialHR:4,onsetRounds:15-p.sv,sourceId,
  periodMinutes,symptomD10s:[...symptomD10s],gmConfirmed:true,sourcePage:75};
 return {state:onset.state,course:onset.course,proof,startReport:start.report,onsetReport:onset.report};
}
export function validateGreatPoisonJournal(journal=[]){
 const prior=[],seen=new Set();
 for(const j of journal){
  if(j.calendarHerbGreatPoisonOnset){
   const p=j.calendarHerbGreatPoisonOnset;
   need(!seen.has(p.applicationId)&&j.calendarCampaignId===p.campaignId&&
    j.characterId===p.targetId&&j.campaignMinute===p.minute,'duplicitní či cizí zdravotní původ');
   const a=prior.find(q=>q.id===p.applicationId&&q.calendarCampaignId===p.campaignId)?.calendarHerbPotionAdminister;
   need(a&&a.poisonGreatTracked===true&&a.method==='ingested'&&a.targetId===p.targetId&&
    a.combatAnchor?.timelineId===p.timelineId,'chybí původní doložené požití');
   const expect={format:GREAT_POISON_FORMAT,campaignId:p.campaignId,applicationId:p.applicationId,
    originMinute:a.minute,minute:p.minute,targetId:a.targetId,timelineId:a.combatAnchor.timelineId,
    originRound:a.combatAnchor.round,dueRound:a.combatAnchor.round+15-a.sv,
    potency:3,sv:a.sv,initialHR:4,onsetRounds:15-a.sv,sourceId:'herb:'+p.applicationId,
    periodMinutes:p.periodMinutes,symptomD10s:p.symptomD10s,gmConfirmed:true,sourcePage:75};
   need(integer(a.sv,1,14)&&p.dueRound<=9999&&p.minute>=a.minute&&p.minute<=a.minute+1&&
    integer(p.periodMinutes,10,60)&&Array.isArray(p.symptomD10s)&&p.symptomD10s.length===4&&
    p.symptomD10s.every(d=>integer(d,1,10))&&JSON.stringify(p)===JSON.stringify(expect),
    'pozměněný SV, symptom, bojové kolo či čas');
   const proof=j.skillTestProof,course=proof?.course;
   need(proof?.type==='poison-onset'&&proof.actorId===p.targetId&&
    proof.sourceId===p.sourceId&&course?.id==='poison:'+p.sourceId&&
    course.status==='active'&&course.elapsedMinutes===0&&course.initialHR===4&&
    course.onsetMinutes===0&&course.periodMinutes===p.periodMinutes&&
    JSON.stringify(course.symptomD10s)===JSON.stringify(p.symptomD10s)&&
    JSON.stringify(course.herbalSource)==JSON.stringify({applicationId:p.applicationId,potency:3,
     sv:p.sv,onsetRounds:p.onsetRounds,originRound:p.originRound,timelineId:p.timelineId}),
    'zdravotní stav neodpovídá podání');
   seen.add(p.applicationId);
  }
  prior.push(j);
 }
 return true;
}
export function assertGreatPoisonAppendOnly(before=[],after=[]){
 const map=new Map(after.map(j=>[j.id,j]));
 for(const j of before)if(j.calendarHerbGreatPoisonOnset)
  need(map.has(j.id)&&JSON.stringify(map.get(j.id))===JSON.stringify(j),'historický nástup nelze měnit');
 return true;
}
/** Printed p.75 gate only; NO weapon paste exposure is created without
 * binding a real edge/point, non-Glancing injuring strike to a dose. */
export function checkedPasteInjury({impactAspect,glancing,injuringStrike,gmConfirmed}={}){
 need(gmConfirmed===true&&['edge','point'].includes(impactAspect)&&glancing===false&&injuringStrike===true,
  'pasta na zbrani působí pouze skutečným ne-Glancing zraňujícím edge/point zásahem');
 return {valid:true,resistanceModifier:+20,sourcePage:75};
}
