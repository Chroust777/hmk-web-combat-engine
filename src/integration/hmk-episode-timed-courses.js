/**
 * Resolve a pre-existing timed HMK course on a CLONED campaign at its real
 * due minute. Never advances the live GM clock, guesses dice, or substitutes a
 * tick for the original rules executor. Form field requirements are declared
 * by the same step that invokes the original executor.
 */
import {healingBase} from '../rules/healing.js';
import {campaignCalendarAgenda,getCampaignAnchor,getCampaignEpisodeAnchor} from './hmk-campaign-calendar.js';
import {preparePoisonOnset,preparePoisonCourse} from './hmk-poison-course.js';
import {prepareDiseaseProfile,prepareDiseaseOnset,prepareDiseaseCourse} from './hmk-disease-course.js';
import {applyConfirmedInjuryHealing,applyConfirmedInfectionCourse,applyConfirmedBloodLossHealing,applyConfirmedGrimWoundShock} from './hmk-healing-persistence.js';
import {applyExtendedShockCourse,applyComaCourse} from './persistent-combat-state.js';
import {campaignKey} from './hmk-calendar-multi-campaign.js';
import {advanceTrekkingWeatherExposure} from './hmk-weather-hazard-aftermath.js';
import {verifiedHumanLocationShock} from './hmk-weather-trauma-completion.js';
import {prepareSleeplessDay} from './hmk-sleep-deprivation.js';
const TYPES=new Set(['poison','disease','healing','infection','blood-loss','grim','extended-shock','coma','weather-course','sleep-deprivation']);
const field=(name,label,max=100)=>({name,label,min:1,max});
const d100=[field('roll','Skutečný d100')];
// GM facts and established rule modifiers are NOT physical dice.
const fact=(name,label,min,max)=>({name,label,min,max,type:'number'});
const proof=(name,label)=>({name,label,type:'text',minLength:6,maxLength:500});
const choice=(name,label)=>({name,label,type:'choice',options:[{value:'yes',label:'Ano'},{value:'no',label:'Ne'}]});
const isValid=(v,f)=>f.type==='choice'?f.options.some(o=>o.value===v):
 f.type==='text'?typeof v==='string'&&v.trim().length>=f.minLength&&v.trim().length<=f.maxLength:
 Number.isSafeInteger(Number(v))&&String(v??'').trim()!==''&&Number(v)>=f.min&&Number(v)<=f.max;
export const episodeTimedCourseKey=e=>['course',e.kind,e.characterId,e.woundId||e.episodeId||e.sourceId||e.id,e.minute].join('|');
export function episodeTimedCourseAgenda(database,endMinute){
 const agenda=campaignCalendarAgenda(database.campaignClock,database.characters,database.journal);
 return agenda.all.filter(e=>TYPES.has(e.kind)&&Number.isSafeInteger(e.minute)&&e.minute<=endMinute)
  .sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
}
export function episodeTimedCourseFields(event){
 switch(event.kind){
 case 'poison':return event.description?.includes('Onset')?[]:[...d100,fact('physicianSV','Doložený Physician SV (0–30)',0,30)];
 case 'disease':
  if(event.description?.includes('Profile'))return [field('onsetD6','Nástup d6',6),field('virulenceD20','Virulence d20',20),...Array.from({length:4},(_,i)=>field('symptom'+(i+1),'Symptom '+(i+1)+' · d10',10))];
  return event.description?.includes('Onset')?[]:[...d100,fact('physicianSV','Doložený Physician SV (0–30)',0,30)];
 case 'sleep-deprivation':return [field('enduranceD10','Endurance SR d10',10)];
 case 'grim':return [...d100,fact('locationShock','Skutečný Location Shock z lokace rány (0–10)',0,10),
  fact('shockML','Ověřený Shock EML pro tento test (0–200)',0,200)];
 case 'infection':return [...d100,fact('physicianSV','Physician SV z existujícího testu (−20 až +30)',-20,30)];
 case 'extended-shock':return [...d100,fact('physicianStars','Nejvyšší doložený Physician SV · hvězdy (0–10)',0,10),
  fact('arcaneBonus','Doložený Arcane Recovery bonus (0–100)',0,100)];
 case 'coma':return [...d100,choice('shelter','Restful Shelter – skutečně chráněné prostředí?'),
  fact('arcaneBonus','Doložený Arcane Recovery bonus (0–100)',0,100)];
 default:return d100;
 }
}
function actorAttributes(c){const a=c?.hmk?.attributes||{};const end=Number(a.end),wil=Number(a.wil);
 if(!Number.isSafeInteger(end)||!Number.isSafeInteger(wil)||end<1||wil<1)throw Error('Chybí původní END/WIL pro '+(c?.name||'postavu'));
 return {end,wil};
}
/** A single deterministically identified due event. No stale imported proof may satisfy it. */
export function episodeTimedCourseStep(database,event,{rolls={},idFactory,stamp}={}){
 const key=episodeTimedCourseKey(event),actor=database.characters.find(c=>c.id===event.characterId);
 if(!actor)throw Error('Chybí postava pro zdravotní termín '+key);
 const state=actor.hmk?.combatState;
 if(!state)throw Error('Postava nemá trvalý HMK Combat State');
 let fields=episodeTimedCourseFields(event);const supplied=rolls[key];
 const values=(supplied&&typeof supplied==='object'&&!Array.isArray(supplied))?supplied:{roll:supplied};
 // A nonzero medical modifier needs an explicit GM provenance, and is never
 // inferred or silently converted to zero. The proof is saved in the receipt.
 if(fields.some(f=>f.name==='physicianSV')&&isValid(values.physicianSV,{min:-20,max:30})&&Number(values.physicianSV)!==0)
  fields=[...fields,proof('physicianEvidence','Původ potvrzeného Physician SV (GM, min. 6 znaků)')];
 if(fields.some(f=>f.name==='physicianStars')&&isValid(values.physicianStars,{min:0,max:10})&&Number(values.physicianStars)>0)
  fields=[...fields,proof('physicianEvidence','Původ potvrzených Physician hvězd (GM, min. 6 znaků)')];
 if(fields.some(f=>f.name==='arcaneBonus')&&isValid(values.arcaneBonus,{min:0,max:100})&&Number(values.arcaneBonus)>0)
  fields=[...fields,proof('arcaneEvidence','Původ potvrzeného Arcane bonusu (GM, min. 6 znaků)')];
 const required=fields.filter(f=>!isValid(values[f.name],f));
 if(required.length)return {key,event,fields,values,requirement:{key,kind:event.kind,characterId:event.characterId,dueMinute:event.minute,reason:event.description,fields,values}};
 const input=Object.fromEntries(fields.map(f=>[f.name,f.type==='choice'||f.type==='text'?String(values[f.name]).trim():Number(values[f.name])]));
 const {end,wil}=actorAttributes(actor),round=Math.max(1,state.lastRound),eventId=idFactory();
 const sourceId=event.sourceId||String(event.episodeId||'').replace(/^(poison|disease):/,'');
 const elapsedMinutes=event.elapsedMinutes;
 const daySinceInjury=(event.minute-event.anchorMinute)/1440;
 let outcome;
 switch(event.kind){
 case 'poison':outcome=fields.length?preparePoisonCourse({actor,state,sourceId,round,elapsedMinutes,courseD100:input.roll,
    physicianSV:input.physicianSV,physicianConfirmed:input.physicianSV===0||!!input.physicianEvidence,
    herbalContext:database.campaignClock?{journal:database.journal,campaignId:campaignKey(database.campaignClock),
     minute:event.minute,poisonOriginMinute:getCampaignEpisodeAnchor(database.campaignClock,'poison',actor.id,event.episodeId)?.minute}:null,
    gmConfirmed:true}):
   preparePoisonOnset({actor,state,sourceId,round,elapsedMinutes,gmConfirmed:true});break;
 case 'disease':
  if(event.description?.includes('Profile'))outcome=prepareDiseaseProfile({actor,state,sourceId,round,onsetD6:input.onsetD6,virulenceD20:input.virulenceD20,symptomD10s:[1,2,3,4].map(i=>input['symptom'+i]),gmConfirmed:true});
  else if(!fields.length)outcome=prepareDiseaseOnset({actor,state,sourceId,round,elapsedMinutes,gmConfirmed:true});
  else outcome=prepareDiseaseCourse({actor,state,sourceId,round,elapsedMinutes,courseD100:input.roll,physicianSV:input.physicianSV,physicianConfirmed:input.physicianSV===0||!!input.physicianEvidence,gmConfirmed:true});break;
 case 'healing':outcome=applyConfirmedInjuryHealing({state,round,eventId,woundId:event.woundId,daySinceInjury,
   endurance:end,will:wil,roll:input.roll,
   herbalContext:{journal:database.journal,campaignId:campaignKey(database.campaignClock),minute:event.minute,
    targetId:actor.id,woundOnsetMinute:getCampaignAnchor(database.campaignClock,'wound',actor.id,event.woundId)?.minute},
   gmConfirmed:true});break;
 case 'infection':{
   const otherWoundDays={};
   for(const w of state.wounds||[]){
    if(w.id===event.woundId||w.healed||!w.healing?.treated||w.healing.noMundaneHealing)continue;
    const anchor=getCampaignAnchor(database.campaignClock,'wound',actor.id,w.id);
    if(anchor&&anchor.minute<=event.minute)otherWoundDays[w.id]=Math.floor((event.minute-anchor.minute)/1440);
   }
   outcome=applyConfirmedInfectionCourse({state,round,eventId,woundId:event.woundId,daySinceInjury,
    endurance:end,will:wil,roll:input.roll,physicianSV:input.physicianSV,otherWoundDays,
    herbalContext:{journal:database.journal,campaignId:campaignKey(database.campaignClock),minute:event.minute,
     targetId:actor.id,woundOnsetMinute:getCampaignAnchor(database.campaignClock,'wound',actor.id,event.woundId)?.minute},
    gmConfirmed:true});break;}
 case 'weather-course': {const exposure=state.environmentalHazards?.find(h=>h.sourceId===sourceId&&h.active);
   if(!exposure)throw Error('Chybí původní aktivní Exposure');
   outcome=advanceTrekkingWeatherExposure({state,actor,sourceId,round,method:event.method,elapsedMinutes:event.elapsedMinutes,roll:input.roll,
    removedFromHazard:exposure.treatmentStarted,treatmentConfirmed:exposure.treatmentStarted,
    coolWater:exposure.healingIntervalMinutes===5,gmConfirmed:true});break;}
 case 'sleep-deprivation':outcome=prepareSleeplessDay({actor,state,episodeId:event.sourceId,hoursAwake:event.hoursAwake,
   enduranceD10:input.enduranceD10,round,gmConfirmed:true});break;
 case 'blood-loss':outcome=applyConfirmedBloodLossHealing({state,round,eventId,daySinceBloodLoss:(event.minute-event.anchorMinute)/1440,endurance:end,roll:input.roll,gmConfirmed:true});break;
 case 'grim':{
   const wound=state.wounds?.find(w=>w.id===event.woundId);
   if(wound&&(wound.bodyKind==null||wound.bodyKind==='human')){
    const printed=verifiedHumanLocationShock(wound.location);
    if(printed!==null&&input.locationShock!==printed){
     const reason='Grim Wound: Location Shock musí odpovídat skutečné lokaci '+wound.location+' ('+printed+'), nelze ho losovat.';
     return {key,event,fields,values,requirement:{key,kind:event.kind,characterId:event.characterId,
      dueMinute:event.minute,reason,fields,values}};
    }
   }
   outcome=applyConfirmedGrimWoundShock({state,round,eventId,woundId:event.woundId,daySinceInjury,locationShock:input.locationShock,shockML:input.shockML,roll:input.roll,gmConfirmed:true});break;}
 case 'extended-shock':outcome=applyExtendedShockCourse({state,round,eventId,healingBase:healingBase({endurance:end,will:wil}),
   roll:input.roll,physicianStars:input.physicianStars,arcaneBonus:input.arcaneBonus,
   elapsedHoursSinceOnset:(event.minute-event.anchorMinute)/60,gmConfirmed:true});break;
 case 'coma':{
   const interval=field('nextPeriodD10','Nový skutečný d10 pouze při pokračujícím Coma',10);
   const suppliedPeriod=isValid(values.nextPeriodD10,interval)?Number(values.nextPeriodD10):undefined;
   try{outcome=applyComaCourse({state,round,eventId,healingBase:healingBase({endurance:end,will:wil}),
    roll:input.roll,periodD10:suppliedPeriod,daysElapsed:state.coma.nextCourseDays,
    restfulShelter:input.shelter==='yes',arcaneBonus:input.arcaneBonus,gmConfirmed:true});}
   catch(error){
    if(error.message!=='Pokračující Coma vyžaduje nový skutečný d10 pro další interval')throw error;
    const pendingFields=[...fields,interval];
    return {key,event,fields:pendingFields,values,requirement:{key,kind:event.kind,characterId:event.characterId,
     dueMinute:event.minute,reason:'Coma pokračuje: po skutečném Course d100 je potřeba nový d10 pro další interval.',
     fields:pendingFields,values}};
   }
   if(outcome.state.coma?.active){input.nextPeriodD10=suppliedPeriod;fields=[...fields,interval];}
   break;}
 default:throw Error('Nepodporovaná časovaná procedura '+event.kind);
 }
 const prior=state.shock;actor.hmk.combatState=outcome.state;
 const doc={id:idFactory(),calendarCampaignId:campaignKey(database.campaignClock),characterId:actor.id,
  campaignMinute:event.minute,createdAt:stamp(),title:'HMK · časovaný '+event.kind+' uvnitř Cestování',
  body:event.description+' · '+fields.map(f=>f.label+': '+input[f.name]).join(', ')+' · původní pravidlový výpočet',
  calendarEpisodeTimedMedical:{format:'hmk-episode-timed-medical-v1',type:event.kind,key,sourceId:event.id,dueMinute:event.minute,inputs:input,report:outcome.report||outcome.result||null}};
 database.journal.push(doc);
 return {key,event,fields,values:input,receipt:doc,change:{key,actorId:actor.id,dueMinute:event.minute,
  kind:event.kind,roll:input.roll??null,description:event.description,shockBefore:prior,shockAfter:outcome.state.shock,report:outcome.report||outcome.result||null},
  incapacitation:!['INC','UNC','KIA'].includes(prior)&&['INC','UNC','KIA'].includes(outcome.state.shock)?{actorId:actor.id,minute:event.minute,shock:outcome.state.shock,cause:event.kind,sourceKey:key}:null};
}
