/** HMK v1.2 p.75, p.61, p.184: Paralytic -> END attribute test.
 * No invented clock/dice. One established, campaign-bound dose and result.
 * A failed check causes complete paralysis for 60 campaign minutes.
 */
import {successLevel,SL} from '../rules/tests.js';
import {initialCombatState,validateCombatState,combatFatigueTotals} from './persistent-combat-state.js';
const need=(q,m)=>{if(!q)throw Error('Paralytic: '+m)};
const integer=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
export const PARALYTIC_ENDURANCE_FORMAT='hmk-paralytic-endurance-v1';
const administered=(journal,camp)=>journal.filter(j=>j.calendarCampaignId===camp&&j.calendarHerbPotionAdminister?.herbType==='paralytic');
const resolvedIds=(journal,camp)=>new Set(journal.filter(j=>j.calendarCampaignId===camp&&j.calendarHerbParalyticEndurance).map(j=>j.calendarHerbParalyticEndurance.applicationId));
export function pendingParalyticChecks(journal=[],campaignId=''){
 const done=resolvedIds(journal,campaignId);
 return administered(journal,campaignId).filter(j=>j.calendarHerbPotionAdminister.paralyticTracked===true&&!done.has(j.id)).map(j=>{
  const p=j.calendarHerbPotionAdminister;
  const a=p.combatAnchor;
  return {applicationId:j.id,targetId:p.targetId,source:j,
   dueMinute:p.potency===1?j.campaignMinute+10:p.potency===2?j.campaignMinute+1:j.campaignMinute,
   dueRound:p.potency===3?(a?.round??null)+1:null,
   timelineId:p.potency===3?a?.timelineId??null:null,potency:p.potency};
 });
}
export function requireParalyticRoundMayAdvance({journal,campaignId,timelineId,currentRound,nextRound=currentRound+1}={}){
 need(integer(currentRound,1,9999)&&integer(nextRound,currentRound+1,9999),'neplatná kolo');
 const overdue=pendingParalyticChecks(journal,campaignId).find(t=>t.potency===3&&t.timelineId===timelineId&&nextRound>t.dueRound);
 need(!overdue,'nelze přeskočit splatný Paralytic END test v kole '+overdue?.dueRound);
 return true;
}
export function requireParalyticGMTimeMayAdvance({journal,campaignId,beforeMinute,afterMinute}={}){
 if(afterMinute<=beforeMinute)return true;
 const overdue=pendingParalyticChecks(journal,campaignId).find(t=>t.potency===3?t.dueMinute<afterMinute:t.dueMinute<afterMinute);
 need(!overdue,'nelze přeskočit povinný Paralytic END test '+overdue?.applicationId);
 return true;
}
function context({journal,campaignId,applicationId,targetId,minute,round,timelineId}={}){
 need(Array.isArray(journal)&&typeof campaignId==='string'&&campaignId&&typeof applicationId==='string'&&applicationId&&
  typeof targetId==='string'&&targetId&&integer(minute,0,1000000000),'nedoložená kampaň, příjemce nebo čas');
 const source=journal.find(j=>j.id===applicationId&&j.calendarCampaignId===campaignId&&j.calendarHerbPotionAdminister?.herbType==='paralytic');
 need(source&&source.campaignMinute<=minute,'chybí původní podání');
 const p=source.calendarHerbPotionAdminister;
 need(p.paralyticTracked===true,'staré podání bez přesného časového důkazu nesmí být zpětně vyhodnoceno automaticky');
 need(p.targetId===targetId,'příjemce neodpovídá původnímu podání');
 need(!resolvedIds(journal,campaignId).has(applicationId),'toto podání už má END výsledek');
 let dueRound=null;
 if(p.potency===3){
  const a=p.combatAnchor;
  need(a?.confirmedByGM===true&&integer(a.round,1,9998)&&typeof a.timelineId==='string'&&a.timelineId&&
   a.campaignMinute===source.campaignMinute,'Great vyžaduje původní ověřenou bojovou osu');
  dueRound=a.round+1;
  need(timelineId===a.timelineId&&round===dueRound&&minute>=source.campaignMinute&&minute<=source.campaignMinute+1,
   'Great END test patří přesně do následujícího bojového kola stejné osy');
 }else{
  const due=source.campaignMinute+(p.potency===1?10:1);
  need(minute===due&&round===null&&timelineId===null,'END test je splatný přesně v minutě '+due);
 }
 return {source,p,dueRound};
}
function calculate({endurance,fatiguePenalty,bonus,d100}={}){
 need(integer(endurance,1,50)&&integer(fatiguePenalty,0,99999)&&integer(bonus,1,800)&&integer(d100,1,100),
  'vyžaduje doložené Endurance, Fatigue, postih a d100');
 const baseML=endurance*5,rawEML=baseML-fatiguePenalty-bonus,eml=Math.max(5,Math.min(95,rawEML));
 const sl=Object.keys(SL).find(k=>SL[k]===successLevel(d100,rawEML));
 return {endurance,baseML,fatiguePenalty,penalty:bonus,rawEML,eml,d100,sl,paralyzed:sl==='CF'||sl==='F'};
}
export function activeHerbalParalysis(state,minute){
 if(!state?.herbalParalysis||!integer(minute,0,1000000000))return false;
 return minute>=state.herbalParalysis.onsetMinute&&minute<state.herbalParalysis.endMinute;
}
export function applyConfirmedParalyticEndurance({journal=[],campaignId,applicationId,targetId,minute,
 round=null,timelineId=null,state=null,endurance,d100,eventId,gmConfirmed=false}={}){
 need(gmConfirmed===true&&typeof eventId==='string'&&eventId.length>=3,'vyžaduje potvrzení GM a unikátní událost');
 const {p,dueRound}=context({journal,campaignId,applicationId,targetId,minute,round,timelineId});
 const s=structuredClone(state??initialCombatState());validateCombatState(s);
 need(!s.events.some(e=>e.id===eventId)&&s.shock!=='KIA','postava zemřela nebo událost již existuje');
 need(!activeHerbalParalysis(s,minute),'příjemce je již dočasně paralysován – další účinek musí posoudit GM');
 // When a previous episode has expired, its immutable event remains but active flag is historical.
 if(round!==null)need(round>=s.lastRound,'nelze zpětně vložit bojové kolo');
 const fatiguePenalty=combatFatigueTotals(s).total;
 const calc=calculate({endurance,fatiguePenalty,bonus:p.bonus,d100});
 const proof={format:PARALYTIC_ENDURANCE_FORMAT,campaignId,minute,applicationId,targetId,
  round,timelineId,dueRound,...calc,untilMinute:calc.paralyzed?minute+60:null,gmConfirmed:true,sourcePage:75};
 s.events.push({id:eventId,type:'herb-paralytic-endurance',round:round??Math.max(1,s.lastRound),details:structuredClone(proof)});
 s.lastRound=Math.max(s.lastRound,round??1);
 if(calc.paralyzed){s.herbalParalysis={applicationId,campaignId,onsetMinute:minute,endMinute:minute+60,resultEventId:eventId};s.posture.prone=true;}
 validateCombatState(s);return {state:s,proof};
}
export function validateParalyticEnduranceJournal(journal=[]){
 const prior=[];
 for(const j of journal){
  if(j.calendarHerbParalyticEndurance){
   const p=j.calendarHerbParalyticEndurance;
   need(j.calendarCampaignId===p.campaignId&&j.campaignMinute===p.minute&&j.characterId===p.targetId&&p.gmConfirmed===true,
    'nesoulad historického důkazu');
   const {p:source,dueRound}=context({journal:prior,campaignId:p.campaignId,applicationId:p.applicationId,
    targetId:p.targetId,minute:p.minute,round:p.round,timelineId:p.timelineId});
   const expected={format:PARALYTIC_ENDURANCE_FORMAT,campaignId:p.campaignId,minute:p.minute,applicationId:p.applicationId,
    targetId:p.targetId,round:p.round,timelineId:p.timelineId,dueRound,
    ...calculate({endurance:p.endurance,fatiguePenalty:p.fatiguePenalty,bonus:source.bonus,d100:p.d100}),
    untilMinute:p.paralyzed?p.minute+60:null,gmConfirmed:true,sourcePage:75};
   need(JSON.stringify(p)===JSON.stringify(expected),'historický END výsledek neodpovídá d100 a pravidlům');
  }
  prior.push(j);
 }
 return true;
}
export function assertParalyticEnduranceAppendOnly(before=[],after=[]){
 const m=new Map(after.map(j=>[j.id,j]));
 for(const j of before)if(j.calendarHerbParalyticEndurance)
  need(m.has(j.id)&&JSON.stringify(m.get(j.id))===JSON.stringify(j),'historický Paralytic END nelze změnit');
 return true;
}
