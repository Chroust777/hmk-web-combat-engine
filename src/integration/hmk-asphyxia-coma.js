/** HMK v1.2 pp.169,179,183: the Endurance CF causes Extended
 * Shock HR4 and Coma, but drowning/smoke has no causal Location Shock
 * and Injury Level for the printed initial Coma HR formula. Preserve the
 * unresolved required datum, not a fabricated successful resolution.
 */
import {validateCombatState} from './persistent-combat-state.js';
const assert=(x,m)=>{if(!x)throw Error(m)};
const integer=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
export function markPendingAsphyxiaComa(state,{sourceEventId,sourceKind,round,enduranceD100,enduranceEML}={}){
 assert(state&&typeof sourceEventId==='string'&&sourceEventId.length>0&&
 ['swimming','smoke'].includes(sourceKind)&&integer(round,1,9999)&&
 integer(enduranceD100,1,100)&&integer(enduranceEML,-10000,10000),
 'Asphyxia CF: chybí skutečný doložený původ, EML nebo fyzický hod');
 assert(!state.asphyxiaComaPending&&!state.coma?.active&&state.shock==='NONE'&&
 !state.extendedShock&&!state.shockFollowup,
 'Asphyxia CF nesmí přepsat již existující Shock nebo Coma');
 state.shock='UNC';state.shockOriginRound=round;state.posture.prone=true;
 state.shockFollowup=null;state.extendedShock={originState:'UNC',hr:4,elapsedHours:0};
 state.asphyxiaComaPending={active:true,sourceKind,sourceEventId,originRound:round,
  enduranceD100,enduranceEML,reason:'HMK-179-INITIAL-COMA-HR-NOT-DEFINED-FOR-ASPHYXIA'};
 return state;
}
/** This is deliberately an explicit *GM ruling*, not a claim that HMK
 * prescribes an arbitrary Coma HR. The game can proceed only by approval. */
export function resolvePendingAsphyxiaComa({state,round,eventId,initialComaHR,firstCourseD10,
 rulingExplanation,gmConfirmed=false}={}){
 assert(state&&integer(round,1,9999)&&typeof eventId==='string'&&eventId.length>0,
  'Chybí aktuální stav, herní kolo nebo ID potvrzeného rozhodnutí');
 validateCombatState(state);const s=structuredClone(state),pending=s.asphyxiaComaPending;
 assert(pending?.active===true,'Není zaznamenané žádné čekající Asphyxia CF / Coma');
 assert(round>=s.lastRound&&!s.events.some(e=>e.id===eventId),
  'Nelze změnit minulé kolo ani dvakrát použít stejné rozhodnutí');
 assert(gmConfirmed===true&&integer(initialComaHR,1,20)&&integer(firstCourseD10,1,10)&&
 typeof rulingExplanation==='string'&&rulingExplanation.trim().length>=12&&rulingExplanation.trim().length<=1000,
  'GM musí uvést skutečné počáteční Coma HR (1–20), hod d10 (1–10) a zdůvodnit vlastní rozhodnutí');
 assert(s.events.some(e=>e.id===pending.sourceEventId&&
 (e.type==='mundane-smoke-asphyxia-complete'||e.type==='skill-swimming-consequence')),
  'Chybí autoritativní původní Asphyxia CF událost');
 s.coma={active:true,hr:initialComaHR,elapsedDays:0,nextCourseDays:firstCourseD10};
 s.asphyxiaComaPending=null;s.lastRound=round;
 const proof={sourceEventId:pending.sourceEventId,sourceKind:pending.sourceKind,
  actualEnduranceD100:pending.enduranceD100,actualEnduranceEML:pending.enduranceEML,
  extendedShockHR:4,initialComaHR,firstCourseD10,rulingExplanation:rulingExplanation.trim(),
  status:'GM-RULING-NOT-DEFINED-BY-PRINTED-HMK-INITIAL-HR-FORMULA',
  sourcePages:[169,179,183]};
 s.events.push({id:eventId,type:'asphyxia-coma-gm-adjudication',round,details:proof});
 validateCombatState(s);return {state:s,report:proof};
}
