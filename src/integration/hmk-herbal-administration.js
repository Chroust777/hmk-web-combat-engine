/** HMK v1.2 p.75: evidence-backed application of completed herbal potions.
 * This is a campaign journal, NOT a second healing/combat resolution engine.
 * Deferred checks and rolls remain pending until resolved by their authority.
 * Never advances calendar time, never assumes an unspecified container weight.
 */
import {EXOTIC_POTIONS} from './hmk-herbal-concoctions.js';
const need=(x,m)=>{if(!x)throw Error(m);};
const safeMinute=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
export const HERB_ADMIN_FORMAT='hmk-herb-potion-application-v1';
const METHODS=Object.freeze({
 antivenin:['ingested'],aphrodisiac:['ingested'],aromatic:['perfume'],
 coagulant:['poultice'],curative:['poultice'],emetic:['ingested'],
 hallucinogenic:['ingested','smoked'],narcotic:['ingested'],
 paralytic:['ingested'],poison:['ingested'],soporific:['ingested'],stimulant:['ingested']
});
const PER_STAGE=Object.freeze({aphrodisiac:240,aromatic:240,coagulant:10,narcotic:240,stimulant:60});
export function herbPotionStageBonus(sv,potency){need(Number.isSafeInteger(sv)&&sv>0&&Number.isSafeInteger(potency)&&potency>=1&&potency<=3,'Neplatná síla lektvaru');return sv*[0,1,2,4][potency];}
/** At minute t, only longevity effects with a *printed* interval stage down.
 * Others have rule-bound follow-ups; returning an open effect is NOT proof
 * that any external roll or healing calculation has taken place. */
export function herbPotionEffectAt(application,minute){
 need(application?.format===HERB_ADMIN_FORMAT&&safeMinute(minute)&&minute>=application.minute,'Chybí doklad podání či platný čas');
 const period=PER_STAGE[application.herbType];
 if(!period)return {stage:application.potency,bonus:application.bonus,status:'requires-original-rule',until:null};
 const stagesElapsed=Math.floor((minute-application.minute)/period),stage=Math.max(0,application.potency-stagesElapsed);
 return {stage,bonus:stage?herbPotionStageBonus(application.sv,stage):0,status:stage?'active':'expired',
  until:stage?application.minute+(stagesElapsed+1)*period:null};
}
export function herbPotionRuleConsequence({type,potency,sv,minute}={}){
 need(EXOTIC_POTIONS.includes(type)&&Number.isSafeInteger(potency)&&potency>=1&&potency<=3&&Number.isSafeInteger(sv)&&sv>0&&safeMinute(minute),'Nedoložený druh, potence či Herblore SV');
 const bonus=herbPotionStageBonus(sv,potency);
 const schedule=PER_STAGE[type]?{longevityMinutesPerStage:PER_STAGE[type],lastStageEndsAt:minute+potency*PER_STAGE[type]}:null;
 const nextCheck={
  antivenin:{kind:'poison-course-modifier',onset:potency===1?{unit:'minutes',count:10}:potency===2?{unit:'minutes',count:1}:{unit:'rounds',count:1},appliesUntil:'poison-course-resolved'},
  aphrodisiac:{kind:'charm-seduction-resistance-penalty',value:bonus},
  aromatic:{kind:'charm-bonus',value:bonus},
  coagulant:{kind:'injury-bleeding-roll-bonus',value:bonus},
  curative:{kind:'single-injury-healing-and-infection-roll-bonus',value:bonus,appliesUntil:'injury-recovery-complete'},
  emetic:{kind:'shock-roll-required',onset:{unit:'rounds',count:'d6-roll-required'},shockIndex:7,rollPenalty:bonus},
  hallucinogenic:{kind:'lucid-dream-check',onset:{unit:'minutes',count:10},duringTrance:{veilAfterMinutes:15-sv,transcendenceBonus:bonus}},
  narcotic:{kind:'shock-roll-bonus-and-movement-penalty',shockBonus:bonus,movementPenalty:bonus/2},
  paralytic:{kind:'endurance-test-required',testPenalty:bonus,onset:potency===1?{unit:'minutes',count:10}:potency===2?{unit:'minutes',count:1}:{unit:'rounds',count:1},paralysisDurationMinutes:60},
  poison:{kind:'poison-course-required',initialHR:potency===2?3:4,onset:{unit:potency===1?'hours':potency===2?'minutes':'rounds',count:15-sv}},
  soporific:{kind:'endurance-success-value-required',effects:['weariness','incapacitation','unconsciousness'].slice(0,potency)},
  stimulant:{kind:'initiative-and-awareness-bonus',value:bonus}
 }[type];
 return {bonus,schedule,rule:nextCheck,sourcePage:75,externalRollResolved:false};
}
export function createHerbPotionAdministration({journal=[],campaignId,minute,actorId,completeId,targetId,method,woundId='',gmConfirmed=false,memberIds=[]}={}){
 need(gmConfirmed===true,'Podání musí potvrdit GM');
 need(typeof campaignId==='string'&&campaignId&&safeMinute(minute)&&typeof actorId==='string'&&actorId&&typeof targetId==='string'&&targetId,'Chybí kampaň, čas či postava');
 need(Array.isArray(memberIds)&&memberIds.includes(actorId)&&memberIds.includes(targetId),'Podávající i příjemce musí být členem stejné kampaně');
 const completeRow=journal.find(j=>j.id===completeId&&j.calendarCampaignId===campaignId&&j.calendarHerbPotionComplete);
 need(completeRow&&completeRow.characterId===actorId&&completeRow.calendarHerbPotionComplete.actorId===actorId,'Lektvar nepatří doloženému výrobci v této kampani');
 const potion=completeRow.calendarHerbPotionComplete;
 need(completeRow.campaignMinute<=minute,'Lektvar ještě nebyl vyroben');
 need(potion.usable===true&&safeMinute(potion.expiryMinute)&&minute<potion.expiryMinute,'Lektvar je neúčinný nebo prošlý');
 need(!journal.some(j=>j.calendarCampaignId===campaignId&&j.calendarHerbPotionAdminister?.completeId===completeId),'Tento lektvar již byl podán');
 need(EXOTIC_POTIONS.includes(potion.herbType)&&METHODS[potion.herbType]?.includes(method),'Nepovolená metoda podání pro tištěný druh lektvaru');
 const woundNeeded=potion.herbType==='curative'||potion.herbType==='coagulant';
 need(woundNeeded?(typeof woundId==='string'&&woundId.length>0):woundId==='','Poultice musí cílit na jednu doloženou ránu, ostatní lektvary ne');
 const consequence=herbPotionRuleConsequence({type:potion.herbType,potency:potion.potency,sv:potion.sv,minute});
 return {format:HERB_ADMIN_FORMAT,campaignId,minute,actorId,completeId,targetId,method,woundId,
  herbType:potion.herbType,potency:potion.potency,sv:potion.sv,bonus:consequence.bonus,
  schedule:consequence.schedule,rule:consequence.rule,sourcePage:75,
  applicationStatus:'APPLIED_NO_AUTOMATIC_HEALTH_ROLL',gmConfirmed:true};
}
export function validateHerbAdministrationJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  if(row.calendarHerbPotionAdminister){
   const p=row.calendarHerbPotionAdminister;
   need(row.calendarCampaignId===p.campaignId&&row.campaignMinute===p.minute&&row.characterId===p.actorId,'Nesoulad původu podání');
   const source=prior.find(x=>x.id===p.completeId)?.calendarHerbPotionComplete;
   need(source,'Ztracený původ vyrobeného lektvaru');
   // The original journal confirms membership at creation; reconstruct that
   // witness using the persisted participant identities without guessing.
   const x=createHerbPotionAdministration({journal:prior,campaignId:p.campaignId,minute:p.minute,
    actorId:p.actorId,completeId:p.completeId,targetId:p.targetId,method:p.method,woundId:p.woundId,
    gmConfirmed:p.gmConfirmed,memberIds:[p.actorId,p.targetId]});
   need(JSON.stringify(x)===JSON.stringify(p),'Podání neodpovídá původnímu doloženému lektvaru');
  }
  prior.push(row);
 }
 return true;
}
export function assertHerbAdministrationAppendOnly(before=[],after=[]){
 const map=new Map(after.map(x=>[x.id,x]));
 for(const row of before)if(row.calendarHerbPotionAdminister)
  need(map.has(row.id)&&JSON.stringify(map.get(row.id))===JSON.stringify(row),'Historický důkaz podání nelze změnit či smazat');
 return true;
}
export function availableHerbalPotions(journal,campaignId,minute){
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarHerbPotionComplete&&j.campaignMinute<=minute&&
  j.calendarHerbPotionComplete.usable&&minute<j.calendarHerbPotionComplete.expiryMinute&&
  !journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarHerbPotionAdminister?.completeId===j.id));
}
