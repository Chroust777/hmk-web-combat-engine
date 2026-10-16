/** HMK v1.2 pp.149,184–185: explicit Trekking weather exposure.
 * A new weather condition is not an instant injury. Frostbite / Sunburn
 * location-specific injury is a separate mandatory GM-confirmed procedure.
 * This reducer NEVER fabricates anatomy, dice, exposure periods or treatment.
 */
import {validateCombatState} from './persistent-combat-state.js';
import {healingBase} from '../rules/healing.js';
import {ailmentOutcome,exposureAdvance,exposureHealing} from '../rules/ailments.js';
import {successLevel,SL} from '../rules/tests.js';
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
 const oldWeak=h.weaknessApplied??0,previousShock=h.shockApplied??'NONE';
 const x=ailmentOutcome(newHR),newWeak=x.weaknessFatigue;
 need(s.fatigue.otherWeakness>=oldWeak,'Předchozí slabost z expozice není v Combat State doložena');
 s.fatigue.otherWeakness+=newWeak-oldWeak;
 if(previousShock!=='NONE')need(s.shock===previousShock,'Jiný Shock změnil stav; GM musí vyřešit souběh');
 else need(s.shock==='NONE'||newHR>3,'Jiný aktivní Shock nelze přepsat expozicí');
 if(previousShock!=='NONE')s.shock='NONE';
 let added='NONE';
 if(x.shockState&&x.shockState!=='none'){
   const convert={stunned:'STN',incapacitated:'INC',unconscious:'UNC',killed:'KIA'};
   added=convert[x.shockState]??String(x.shockState).toUpperCase();
   need(['STN','INC','UNC','KIA'].includes(added),'Neznámý Outcome stavu nemoci');
   s.shock=added;s.shockFollowup=null;s.extendedShock=null;s.coma=null;
   if(added==='UNC'||added==='INC')s.posture.prone=true;
   if(added==='KIA'){for(const w of s.wounds)w.nextAdvanceRound=null;}
 }
 h.hr=newHR;h.weaknessApplied=newWeak;h.shockApplied=added;
 return x;
}
export function prepareTrekkingWeatherTest({state,sourceId,round=1,kind,originalSL,coldCondition='dry',
 weatherHazardConfirmed=false,gmConfirmed=false}={}){
 const id=nextId(sourceId,kind),s=prepared(state,round,sourceId,id,gmConfirmed);
 need(['cold','heat'].includes(kind)&&slText.includes(originalSL),'Nepodložená meteorologická zkouška');
 need(weatherHazardConfirmed===true,'GM musí potvrdit předcházející Weather Hazard z Trekking str.149');
 s.environmentalHazards??=[];
 need(!s.environmentalHazards.some(x=>x.active),'Souběžná trvající expozice vyžaduje samostatné posouzení GM');
 let hr=null,periodMinutes=null,addedWeariness=0,skinPending=null;
 if(kind==='cold'){
  need(Object.hasOwn(cold,coldCondition),'Neznámé skutečné podmínky chladu');
  if(['coolWater','coldWater','freezingWater'].includes(coldCondition)&&['F','CF'].includes(originalSL))
   throw Error('Voda nejprve vyžaduje Cold Shock po fyzických 3d6 a Endurance; tuto samostatnou sekvenci nelze přeskočit');
  if(['F','CF'].includes(originalSL)){hr=cold[coldCondition].hr;periodMinutes=cold[coldCondition].period;
   if(originalSL==='CF')skinPending='frostbite';}
  else if(originalSL==='S')addedWeariness=5;
 }else{
  if(originalSL==='CF'){hr=4;skinPending='sunburn';periodMinutes=240;}
  if(originalSL==='F'){hr=5;periodMinutes=240;}
  if(originalSL==='S')addedWeariness=10;
  if(originalSL==='CS')addedWeariness=5;
 }
 need(hr===null||s.shock==='NONE','Nová expozice nesmí potichu přepsat existující Shock');
 const hazard=hr===null?null:{id,sourceId,kind,hr,initialHR:hr,periodMinutes,
  active:true,skinPending,weaknessApplied:0,shockApplied:'NONE',lastElapsedMinutes:0,
  sequence:0,treatmentStarted:false};
 const outcome=hazard?applyStatus(s,hazard,hr):null;
 if(hazard)s.environmentalHazards.push(hazard);
 s.fatigue.weariness+=addedWeariness;
 s.events.push({id,type:'skill-trekking-weather-hazard',round,
  details:{sourceId,kind,originalSL,coldCondition,hr,periodMinutes,skinPending,
   addedWeariness,gmConfirmed:true,rulePages:[149,185]}});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report:{kind,originalSL,hr,periodMinutes,skinPending,
  addedWeariness,outcome,requiresSkinInjury:skinPending!==null}};
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
 const dueMinutes=method==='advance'?h.periodMinutes:h.kind==='cold'?120:coolWater?5:15;
 need(elapsedMinutes>=h.lastElapsedMinutes+dueMinutes,
  'Další Course/Healing Roll dosud není splatný podle fyzicky potvrzeného času');
 if(method==='healing')need(removedFromHazard===true&&treatmentConfirmed===true,
  'Léčení vyžaduje vyjmutí z expozice a potvrzené Warming/Compress');
 else need(h.treatmentStarted===false,'Během aktivního léčení již nelze zapisovat další Exposure Advance');
 const idx=h.sequence+1,id=nextId(sourceId,h.kind,':period:'+idx);
 need(!s.events.some(e=>e.id===id),'Opakovaný zápis Course/Healing není dovolen');
 const attrs=actor.hmk?.attributes??{},end=attrs.end,will=attrs.wil;
 need(int(end,1,200)&&int(will,1,200),'Pro Exposure Course/Healing musí být doloženo END a WIL');
 const hb=healingBase({endurance:end,will}),eml=hb*(method==='advance'?h.hr:5),sl=successLevel(roll,eml);
 const outcome=method==='advance'?exposureAdvance({healingRate:h.hr,sl}):exposureHealing({healingRate:h.hr,sl});
 if(method==='healing')h.treatmentStarted=true;
 h.lastElapsedMinutes=elapsedMinutes;h.sequence=idx;
 applyStatus(s,h,outcome.healingRate);
 if(outcome.defeated){h.active=false;}
 if(outcome.skipNext){h.lastElapsedMinutes+=dueMinutes;}
 s.events.push({id,type:'skill-weather-course',round,details:{sourceId,kind:h.kind,
  method,elapsedMinutes,roll,hb,eml,sl:slText[sl],fromHR:h.hr-outcome.delta,
  toHR:h.hr,skipNext:!!outcome.skipNext,gmConfirmed:true,rulePage:185}});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report:{method,kind:h.kind,hb,eml,sl:slText[sl],
  hr:h.hr,weakness:h.weaknessApplied,shock:s.shock,defeated:!!outcome.defeated,skinPending:h.skinPending}};
}
