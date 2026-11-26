/** HMK v1.2 pp.149,184–185: explicit Trekking weather exposure.
 * A new weather condition is not an instant injury. Frostbite / Sunburn
 * location-specific injury is a separate mandatory GM-confirmed procedure.
 * This reducer NEVER fabricates anatomy, dice, exposure periods or treatment.
 */
import {applyComaCourse,applyExtendedShockCourse,validateCombatState} from './persistent-combat-state.js?v=94.128';
import {initializeConcurrentShock,projectConcurrentShock} from './hmk-concurrent-shock-projection.js';
import {healingBase} from '../rules/healing.js';
import {ailmentOutcome,exposureAdvance,exposureHealing} from '../rules/ailments.js';
import {successLevel,SL} from '../rules/tests.js';
import {alchemyArcaneCasterDossier} from './hmk-alchemy-arcane-casting-readiness.js?v=94.131';
import {applyConfirmedBloodLossHealing,applyConfirmedInjuryHealing} from './hmk-healing-persistence.js?v=94.133';
const need=(ok,msg)=>{if(!ok)throw Error(msg)};
const int=(x,lo=0,hi=999999)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const cold={dry:{hr:5,period:240},damp:{hr:4,period:240},coolWater:{hr:4,period:120},coldWater:{hr:3,period:60},freezingWater:{hr:2,period:30}};
const slText=['CF','F','S','CS'];
const nextId=(sourceId,kind,seq='')=>`skill-weather:${sourceId}:${kind}${seq}`;
const prepared=(state,round,sourceId,id,gmConfirmed)=>{
 need(gmConfirmed===true&&state&&typeof sourceId==='string'&&sourceId&&int(round,1,9999),'Chybí potvrzení GM, původ testu nebo časový krok');
 validateCombatState(state);need(round>=state.lastRound,'Nelze zapsat do dřívějšího kola');
 need(!state.events.some(e=>e.id===id),'Tento zdroj již byl jednou použit');
 need(state.shock!=='KIA','Po smrti nelze vytvořit další expozici');
 return structuredClone(state);
};
function applyStatus(s,h,newHR){
 initializeConcurrentShock(s);
 const oldWeak=h.weaknessApplied??0;
 const x=ailmentOutcome(newHR),newWeak=x.weaknessFatigue;
 need(s.fatigue.otherWeakness>=oldWeak,'Předchozí slabost z expozice není v Combat State doložena');
 s.fatigue.otherWeakness+=newWeak-oldWeak;
 let added='NONE';
 if(x.shockState&&x.shockState!=='none'){
   const convert={stunned:'STN',incapacitated:'INC',unconscious:'UNC',killed:'KIA'};
   added=convert[x.shockState]??String(x.shockState).toUpperCase();
   need(['STN','INC','UNC','KIA'].includes(added),'Neznámý Outcome stavu nemoci');
 }
 h.hr=newHR;h.weaknessApplied=newWeak;h.shockApplied=added;
 projectConcurrentShock(s);
 return x;
}
export function prepareTrekkingWeatherTest({state,sourceId,round=1,kind,originalSL,coldCondition='dry',
 weatherHazardConfirmed=false,gmConfirmed=false,fatigueAccountedExternally=false}={}){
 const id=nextId(sourceId,kind),s=prepared(state,round,sourceId,id,gmConfirmed);
 need(['cold','heat'].includes(kind)&&slText.includes(originalSL),'Nepodložená meteorologická zkouška');
 need(weatherHazardConfirmed===true,'GM musí potvrdit předcházející Weather Hazard z Trekking str.149');
 s.environmentalHazards??=[];
 // Independent exposure sources are separate evidenced courses. An existing
 // active Cold/Heat episode does NOT veto a new proven exposure. For HR4/5
 // this is additive weakness with no new Shock; impaired Shock outcomes still
 // use the protective state conflict checks in applyStatus, never overwrite.

 let hr=null,periodMinutes=null,addedWeariness=0,skinPending=null;
 if(kind==='cold'){
  need(Object.hasOwn(cold,coldCondition),'Neznámé skutečné podmínky chladu');
  if(['coolWater','coldWater','freezingWater'].includes(coldCondition))
   need(s.events.some(e=>e.id==='skill-cold-shock:'+sourceId&&e.type==='skill-cold-water-shock'&&e.details?.report?.condition===coldCondition),
    'Ponoření do studené vody nejprve vyžaduje potvrzený Cold Shock 3d6 a Endurance.');
  if(['F','CF'].includes(originalSL)){hr=cold[coldCondition].hr;periodMinutes=cold[coldCondition].period;
   if(originalSL==='CF')skinPending='frostbite';}
  else if(originalSL==='S')addedWeariness=5;
 }else{
  if(originalSL==='CF'){hr=4;skinPending='sunburn';periodMinutes=240;}
  if(originalSL==='F'){hr=5;periodMinutes=240;}
  if(originalSL==='S')addedWeariness=10;
  if(originalSL==='CS')addedWeariness=5;
 }
 const hazard=hr===null?null:{id,sourceId,kind,hr,initialHR:hr,periodMinutes,
  active:true,skinPending,weaknessApplied:0,shockApplied:'NONE',lastElapsedMinutes:0,
  sequence:0,treatmentStarted:false};
 if(hazard)s.environmentalHazards.push(hazard);
 const outcome=hazard?applyStatus(s,hazard,hr):null;
 if(fatigueAccountedExternally)addedWeariness=0;
 s.fatigue.weariness+=addedWeariness;
 s.events.push({id,type:'skill-trekking-weather-hazard',round,
  details:{sourceId,kind,originalSL,coldCondition,hr,periodMinutes,skinPending,
   addedWeariness,gmConfirmed:true,rulePages:[149,185]}});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report:{kind,originalSL,hr,periodMinutes,skinPending,
  addedWeariness,outcome,requiresSkinInjury:skinPending!==null}};
}
/** GM begins Warming / Compress at a real minute, without fabricating a die roll.
 * This cancels the remaining Advance interval and restarts the calendar
 * at the healing interval measured from the actual treatment start.
 */
export function startTrekkingWeatherExposureTreatment({state,sourceId,round=1,
 elapsedMinutes,removedFromHazard=false,treatmentConfirmed=false,coolWater=false,gmConfirmed=false}={}){
 const s=structuredClone(state);validateCombatState(s);
 need(gmConfirmed===true&&int(round,1,9999)&&round>=s.lastRound&&int(elapsedMinutes,0,10000000),
  'Chybí doložený okamžik zahájení léčby a potvrzení GM');
 const h=s.environmentalHazards?.find(x=>x.active&&x.sourceId===sourceId);
 need(h,'Zadaná trvající expozice neexistuje');
 need(s.shock!=='KIA','Zemřelá postava nemůže zahájit léčbu');
 need(!h.treatmentStarted,'Warming/Compress již bylo zahájeno');
 need(removedFromHazard===true&&treatmentConfirmed===true,
  'Před léčbou musí GM potvrdit vyjmutí z expozice a Warming/Compress');
 // CS on Advance or CF on Healing skips a *future* course by moving
 // lastElapsedMinutes ahead of the actual roll; that virtual skip is NOT
 // physical elapsed time and cannot prevent an earlier Warming/Compress.
 const lastConfirmed=s.events.filter(e=>e.type==='skill-weather-course'&&
  e.details?.sourceId===sourceId).at(-1)?.details?.elapsedMinutes;
 const lastActual=h.lastActualElapsedMinutes??lastConfirmed??h.lastElapsedMinutes;
 need(elapsedMinutes>=lastActual,
  'Léčbu nelze časově vrátit před poslední skutečně potvrzený Course');
 const intervalMinutes=h.kind==='cold'?120:coolWater?5:15;
 need(h.kind==='cold'||h.kind==='heat','Neznámý druh expozice');
 need(h.kind==='heat'||!coolWater,'Chlazení vodou nelze použít jako Cold Warming');
 const id=nextId(sourceId,h.kind,':treatment-start');
 need(!s.events.some(e=>e.id===id),'Stejnou léčbu nelze zahájit dvakrát');
 h.treatmentStarted=true;
 h.healingIntervalMinutes=intervalMinutes;
 h.lastElapsedMinutes=elapsedMinutes;
 h.treatmentStartElapsedMinutes=elapsedMinutes;
 s.events.push({id,type:'skill-weather-treatment-start',round,
  details:{sourceId,kind:h.kind,elapsedMinutes,intervalMinutes,removedFromHazard:true,
   treatmentConfirmed:true,coolWater:!!coolWater,gmConfirmed:true,rulePage:185}});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report:{sourceId,kind:h.kind,elapsedMinutes,intervalMinutes,
  treatment:h.kind==='cold'?'Warming':'Compress',coolWater:!!coolWater,hr:h.hr}};
}
export function advanceTrekkingWeatherExposure({state,actor,sourceId,round=1,
 method='advance',elapsedMinutes,roll,gmConfirmed=false,
 removedFromHazard=false,treatmentConfirmed=false,coolWater=false}={}){
 const s=structuredClone(state);validateCombatState(s);
 need(actor?.id&&gmConfirmed===true&&['advance','healing'].includes(method)&&
  int(elapsedMinutes,1,10000000)&&int(roll,1,100)&&int(round,1,9999)&&round>=s.lastRound,
  'Chybí fyzický d100, doložený čas nebo potvrzení GM');
 const h=s.environmentalHazards?.find(x=>x.sourceId===sourceId&&x.active);
 need(h,'Není dostupná aktivní expozice tohoto původního testu');
 need(method===(h.treatmentStarted?'healing':'advance'),
  'Změna režimu vyžaduje samostatně potvrzený začátek Warming/Compress');
 const dueMinutes=method==='advance'?h.periodMinutes:h.healingIntervalMinutes;
 need(int(dueMinutes,1,10000)&&elapsedMinutes===h.lastElapsedMinutes+dueMinutes,
  'Course/Healing Roll musí odpovídat přesně splatnému termínu');
 if(method==='healing'){
  need(removedFromHazard===true&&treatmentConfirmed===true,
   'Léčení vyžaduje vyjmutí z expozice a potvrzené Warming/Compress');
  need(h.kind==='heat'?coolWater===(dueMinutes===5):!coolWater,
   'Režim Compress/Warming musí odpovídat dříve potvrzenému intervalu');
 }
 const idx=h.sequence+1,id=nextId(sourceId,h.kind,':period:'+idx);
 need(!s.events.some(e=>e.id===id),'Opakovaný zápis Course/Healing není dovolen');
 const attrs=actor.hmk?.attributes??{},end=attrs.end,will=attrs.wil;
 need(int(end,1,200)&&int(will,1,200),'Pro Exposure Course/Healing musí být doloženo END a WIL');
 const hb=healingBase({endurance:end,will}),eml=hb*(method==='advance'?h.hr:5),sl=successLevel(roll,eml);
 const outcome=method==='advance'?exposureAdvance({healingRate:h.hr,sl}):exposureHealing({healingRate:h.hr,sl});
 h.lastElapsedMinutes=elapsedMinutes;h.lastActualElapsedMinutes=elapsedMinutes;h.sequence=idx;
 applyStatus(s,h,outcome.healingRate);
 if(outcome.defeated){h.active=false;}
 if(outcome.skipNext){h.lastElapsedMinutes+=dueMinutes;}
 s.events.push({id,type:'skill-weather-course',round,details:{sourceId,kind:h.kind,
  method,elapsedMinutes,roll,healingIntervalMinutes:method==='healing'?dueMinutes:null,hb,eml,sl:slText[sl],fromHR:h.hr-outcome.delta,
  toHR:h.hr,skipNext:!!outcome.skipNext,gmConfirmed:true,rulePage:185}});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report:{method,kind:h.kind,hb,eml,sl:slText[sl],
  hr:h.hr,weakness:h.weaknessApplied,shock:s.shock,defeated:!!outcome.defeated,skinPending:h.skinPending}};
}
export function knowsExposureBalm(caster){
 if(!caster?.id)return false;
 const legacySpells=caster.hmk?.arcane?.knownSpells;
 if(Array.isArray(legacySpells)&&legacySpells.includes('Balm'))return true;
 const starting=caster.hmk?.startingPvarSpells;
 const proof=caster.hmk?.creation?.values?.startingPvarSpellsProof;
 if(!starting||!proof)return false;
 try{
  if(JSON.stringify(starting)!==JSON.stringify(proof))return false;
  const dossier=alchemyArcaneCasterDossier(caster);
  return dossier.verified&&dossier.known.includes('Fývria::Balm');
 }catch{
  return false;
 }
}

function verifiedBalmCasting({actor,caster,minute,originMinute,spellML,castingEML,castingD100,recoveryD100,range,understanding},minimumSI){
 need(knowsExposureBalm(caster),'Sesilatel musí mít doložené známé kouzlo Balm.');
 need(int(minute,0,1e9)&&int(originMinute,0,minute),'Seslání vyžaduje skutečnou minutu od vzniku traumatu.');
 need(int(spellML,Math.max(1,minimumSI*10),200)&&int(castingEML,-400,400)&&int(castingD100,1,100)&&
  int(recoveryD100,1,100),'Doložte Spell ML alespoň '+Math.max(1,minimumSI*10)+', Casting EML a oba skutečné d100.');
 const spellIndex=Math.floor(spellML/10);
 need(range==='touch'||range==='ten-feet-los'&&spellIndex>=9,'Balm vyžaduje dotyk nebo při SI 9+ dosah nejvýše 10 stop v LOS.');
 need(typeof understanding==='string'&&understanding.trim().length>=5&&understanding.trim().length<=240,
  'Doložte, jak sesilatel porozuměl tomuto traumatu.');
 const castingSL=successLevel(castingD100,castingEML);
 need(castingSL===SL.S||castingSL===SL.CS,'Okamžitý hod vyžaduje úspěšný Spellfire Balm.');
 return {actorId:actor.id,casterId:caster.id,minute,originMinute,spell:'Balm',spellML,spellIndex,castingEML,
  castingD100,castingSL:slText[castingSL],range,understanding:understanding.trim(),recoveryD100,
  bonus:castingSL===SL.CS?10:0};
}
function verifiedBalmHealingBase(actor){
 const {end,wil}=actor.hmk?.attributes??{};
 need(int(end,1,200)&&int(wil,1,200),'Pro tento Arcane Recovery hod musí být doloženo END a WIL.');
 return healingBase({endurance:end,will:wil});
}
export function resolveBalmExposureRecovery(input={}){
 const {state,sourceId,round=1,gmConfirmed=false,recoveryD100}=input;
 const id='arcane-balm-exposure:'+sourceId;
 const s=prepared(state,round,sourceId,id,gmConfirmed);
 const hazard=s.environmentalHazards?.find(h=>h.active&&h.sourceId===sourceId);
 need(input.actor?.id&&hazard,'Balm vyžaduje konkrétní aktivní expozici.');
 need(!hazard.skinPending,'Nejprve vyhodnoťte případný Frostbite nebo Sunburn z téže expozice.');
 const casting=verifiedBalmCasting(input,7),{bonus}=casting,hb=verifiedBalmHealingBase(input.actor),fromHR=hazard.hr;
 const eml=hb*5+bonus,sl=successLevel(recoveryD100,eml);
 const outcome=exposureHealing({healingRate:fromHR,sl,arcaneRecovery:true});
 if(outcome.delta)applyStatus(s,hazard,outcome.healingRate);
 if(outcome.defeated)hazard.active=false;
 const report={eventId:id,sourceId,...casting,hb,eml,sl:slText[sl],fromHR,toHR:hazard.hr,
  failureIgnored:outcome.arcaneFailureIgnored===true,defeated:!!outcome.defeated,sourcePages:[183,185,213,214]};
 s.events.push({id,type:'arcane-balm-exposure',round,details:report});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report};
}

export function resolveBalmTraumaCourse(input={}){
 const {state,actor,kind,sourceId,round=1,minute,originMinute,recoveryD100,physicianStars=0,restfulShelter,gmConfirmed=false}=input;
 need(kind==='extended-shock'||kind==='coma','Vyberte Extended Shock nebo Coma.');
 const id='arcane-balm-course:'+kind+':'+sourceId;
 const s=prepared(state,round,sourceId,id,gmConfirmed);
 const course=kind==='coma'?s.coma:s.extendedShock;
 need(actor?.id&&course?.sourceId===sourceId&&(kind!=='coma'||course.active),'Balm vyžaduje konkrétní aktivní Course.');
 const casting=verifiedBalmCasting(input,8),{bonus}=casting,hb=verifiedBalmHealingBase(actor);
 const args={state:s,round,eventId:id,healingBase:hb,roll:recoveryD100,arcaneBonus:bonus,arcaneFreeRoll:true,gmConfirmed};
 if(kind==='coma')need(typeof restfulShelter==='boolean','Doložte, zda je prostředí klidné a chráněné.');
 const result=kind==='coma'?applyComaCourse({...args,daysElapsed:Math.floor((minute-originMinute)/1440)-course.elapsedDays,restfulShelter}):
  applyExtendedShockCourse({...args,physicianStars});
 const details=result.state.events.at(-1).details;
 const report={eventId:id,sourceId,kind,...casting,hb,fromHR:course.hr,toHR:kind==='coma'?result.hr:result.nextHR,
  sl:details.sl,eml:details.rawEML,failureIgnored:details.failureIgnored,
  shock:result.state.shock,comaActive:result.state.coma?.active===true,sourcePages:[179,183,213,214]};
 details.arcaneRecovery=report;
 return {state:result.state,report};
}

export function resolveBalmBloodLossRecovery(input={}){
 const {state,actor,sourceId,round=1,minute,originMinute,recoveryD100,gmConfirmed=false}=input;
 const id='arcane-balm-blood-loss:'+sourceId;
 const s=prepared(state,round,sourceId,id,gmConfirmed);
 need(actor?.id&&s.bloodLoss.bp>0,'Balm vyžaduje aktivní Blood Loss.');
 const casting=verifiedBalmCasting(input,7);
 const result=applyConfirmedBloodLossHealing({state:s,round,eventId:id,daySinceBloodLoss:Math.floor((minute-originMinute)/1440),
  endurance:actor.hmk?.attributes?.end,roll:recoveryD100,arcaneFreeRoll:true,arcaneBonus:casting.bonus,gmConfirmed});
 const details=result.state.events.at(-1).details;
 const report={eventId:id,sourceId,kind:'blood-loss',...casting,bpBefore:result.bpBefore,bpAfter:result.bpAfter,
  eml:details.eml,sl:details.sl,failureIgnored:details.failureIgnored,
  nextHealingDay:result.nextHealingDay,sourcePages:[181,183,213,214]};
 details.arcaneRecovery=report;
 return {state:result.state,report};
}

export function resolveBalmInjuryRecovery(input={}){
 const {state,actor,sourceId:woundId,round=1,minute,originMinute,recoveryD100,herbalContext=null,gmConfirmed=false}=input;
 const casting=verifiedBalmCasting(input,0);
 const id='arcane-balm-injury:'+woundId;
 const s=prepared(state,round,woundId,id,gmConfirmed);
 const wound=s.wounds.find(w=>w.id===woundId&&!w.healed);
 need(actor?.id&&wound,'Balm vyžaduje konkrétní aktivní ránu.');
 const {end: endurance, wil: will}=actor.hmk?.attributes??{};
 verifiedBalmHealingBase(actor);
 const result=applyConfirmedInjuryHealing({state:s,round,eventId:id,woundId,
  daySinceInjury:Math.floor((minute-originMinute)/1440),endurance,will,roll:recoveryD100,
  herbalContext,arcaneFreeRoll:true,arcaneBonus:casting.bonus,gmConfirmed});
 const details=result.state.events.at(-1).details;
 const report={eventId:id,sourceId:woundId,kind:'injury',...casting,hr:details.hr,
  ilBefore:wound.level,ilAfter:result.result.injuryLevel,herbalBonus:details.herbalBonus,herbalSourceIds:details.herbalSourceIds,eml:details.rawEML,sl:details.sl,
  failureIgnored:details.failureIgnored,healed:result.healed,sourcePages:[180,181,213,214]};
 details.arcaneRecovery=report;
 return {state:result.state,report};
}
