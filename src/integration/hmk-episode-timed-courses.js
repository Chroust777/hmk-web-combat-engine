/**
 * Resolve a pre-existing timed HMK course on a CLONED campaign at its real
 * due minute. Never advances the live GM clock, guesses dice, or substitutes a
 * tick for the original rules executor. Form field requirements are declared
 * by the same step that invokes the original executor.
 */
import {healingBase} from '../rules/healing.js';
import {campaignCalendarAgenda,getCampaignAnchor} from './hmk-campaign-calendar.js';
import {preparePoisonOnset,preparePoisonCourse} from './hmk-poison-course.js';
import {prepareDiseaseProfile,prepareDiseaseOnset,prepareDiseaseCourse} from './hmk-disease-course.js';
import {applyConfirmedInjuryHealing,applyConfirmedInfectionCourse,applyConfirmedBloodLossHealing,applyConfirmedGrimWoundShock} from './hmk-healing-persistence.js';
import {applyExtendedShockCourse,applyComaCourse} from './persistent-combat-state.js';
import {campaignKey} from './hmk-calendar-multi-campaign.js';
import {advanceTrekkingWeatherExposure} from './hmk-weather-hazard-aftermath.js';
import {prepareSleeplessDay} from './hmk-sleep-deprivation.js';
const TYPES=new Set(['poison','disease','healing','infection','blood-loss','grim','extended-shock','coma','weather-course','sleep-deprivation']);
const field=(name,label,max=100)=>({name,label,min:1,max});
const d100=[field('roll','Skutečný d100')];
const isValid=(v,f)=>Number.isSafeInteger(Number(v))&&String(v??'').trim()!==''&&Number(v)>=f.min&&Number(v)<=f.max;
export const episodeTimedCourseKey=e=>['course',e.kind,e.characterId,e.woundId||e.episodeId||e.sourceId||e.id,e.minute].join('|');
export function episodeTimedCourseAgenda(database,endMinute){
 const agenda=campaignCalendarAgenda(database.campaignClock,database.characters,database.journal);
 return agenda.all.filter(e=>TYPES.has(e.kind)&&Number.isSafeInteger(e.minute)&&e.minute<=endMinute)
  .sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
}
export function episodeTimedCourseFields(event){
 switch(event.kind){
 case 'poison':return event.description?.includes('Onset')?[]:d100;
 case 'disease':
  if(event.description?.includes('Profile'))return [field('onsetD6','Nástup d6',6),field('virulenceD20','Virulence d20',20),...Array.from({length:4},(_,i)=>field('symptom'+(i+1),'Symptom '+(i+1)+' · d10',10))];
  return event.description?.includes('Onset')?[]:d100;
 case 'sleep-deprivation':return [field('enduranceD10','Endurance SR d10',10)];
 case 'grim':return [...d100,{name:'locationShock',label:'Location Shock (0–10)',min:0,max:10},{name:'shockML',label:'Shock EML (0–200)',min:0,max:200}];
 case 'coma':return [...d100,field('nextPeriodD10','Další Coma interval d10 (pouze při pokračování)',10),{name:'shelter',label:'Restful Shelter (1=ano, 0=ne)',min:0,max:1}];
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
 const fields=episodeTimedCourseFields(event),supplied=rolls[key];
 const values=(supplied&&typeof supplied==='object'&&!Array.isArray(supplied))?supplied:{roll:supplied};
 const required=fields.filter(f=>!isValid(values[f.name],f));
 if(required.length)return {key,event,fields,values,requirement:{key,kind:event.kind,characterId:event.characterId,dueMinute:event.minute,reason:event.description,fields,values}};
 const input=Object.fromEntries(fields.map(f=>[f.name,Number(values[f.name])]));
 const {end,wil}=actorAttributes(actor),round=Math.max(1,state.lastRound),eventId=idFactory();
 const sourceId=event.sourceId||String(event.episodeId||'').replace(/^(poison|disease):/,'');
 const elapsedMinutes=event.elapsedMinutes;
 const daySinceInjury=(event.minute-event.anchorMinute)/1440;
 let outcome;
 switch(event.kind){
 case 'poison':outcome=fields.length?preparePoisonCourse({actor,state,sourceId,round,elapsedMinutes,courseD100:input.roll,gmConfirmed:true}):
   preparePoisonOnset({actor,state,sourceId,round,elapsedMinutes,gmConfirmed:true});break;
 case 'disease':
  if(event.description?.includes('Profile'))outcome=prepareDiseaseProfile({actor,state,sourceId,round,onsetD6:input.onsetD6,virulenceD20:input.virulenceD20,symptomD10s:[1,2,3,4].map(i=>input['symptom'+i]),gmConfirmed:true});
  else if(!fields.length)outcome=prepareDiseaseOnset({actor,state,sourceId,round,elapsedMinutes,gmConfirmed:true});
  else outcome=prepareDiseaseCourse({actor,state,sourceId,round,elapsedMinutes,courseD100:input.roll,gmConfirmed:true});break;
 case 'healing':outcome=applyConfirmedInjuryHealing({state,round,eventId,woundId:event.woundId,daySinceInjury,endurance:end,will:wil,roll:input.roll,gmConfirmed:true});break;
 case 'infection':{
   const otherWoundDays={};
   for(const w of state.wounds||[]){
    if(w.id===event.woundId||w.healed||!w.healing?.treated||w.healing.noMundaneHealing)continue;
    const anchor=getCampaignAnchor(database.campaignClock,'wound',actor.id,w.id);
    if(anchor&&anchor.minute<=event.minute)otherWoundDays[w.id]=Math.floor((event.minute-anchor.minute)/1440);
   }
   outcome=applyConfirmedInfectionCourse({state,round,eventId,woundId:event.woundId,daySinceInjury,
    endurance:end,will:wil,roll:input.roll,otherWoundDays,gmConfirmed:true});break;}
 case 'weather-course': {const exposure=state.environmentalHazards?.find(h=>h.sourceId===sourceId&&h.active);
   if(!exposure)throw Error('Chybí původní aktivní Exposure');
   outcome=advanceTrekkingWeatherExposure({state,actor,sourceId,round,method:event.method,elapsedMinutes:event.elapsedMinutes,roll:input.roll,
    removedFromHazard:exposure.treatmentStarted,treatmentConfirmed:exposure.treatmentStarted,
    coolWater:exposure.healingIntervalMinutes===5,gmConfirmed:true});break;}
 case 'sleep-deprivation':outcome=prepareSleeplessDay({actor,state,episodeId:event.sourceId,hoursAwake:event.hoursAwake,
   enduranceD10:input.enduranceD10,round,gmConfirmed:true});break;
 case 'blood-loss':outcome=applyConfirmedBloodLossHealing({state,round,eventId,daySinceBloodLoss:(event.minute-event.anchorMinute)/1440,endurance:end,roll:input.roll,gmConfirmed:true});break;
 case 'grim':outcome=applyConfirmedGrimWoundShock({state,round,eventId,woundId:event.woundId,daySinceInjury,locationShock:input.locationShock,shockML:input.shockML,roll:input.roll,gmConfirmed:true});break;
 case 'extended-shock':outcome=applyExtendedShockCourse({state,round,eventId,healingBase:healingBase({endurance:end,will:wil}),roll:input.roll,elapsedHoursSinceOnset:(event.minute-event.anchorMinute)/60,gmConfirmed:true});break;
 case 'coma':outcome=applyComaCourse({state,round,eventId,healingBase:healingBase({endurance:end,will:wil}),roll:input.roll,periodD10:input.nextPeriodD10,daysElapsed:state.coma.nextCourseDays,restfulShelter:input.shelter===1,gmConfirmed:true});break;
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
