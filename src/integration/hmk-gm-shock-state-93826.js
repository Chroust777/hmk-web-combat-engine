/** Persistent GM-only Shock status: a documented non-dice administrative state.
 * No wound, roll, invented cause, or other medical source is manufactured.
 * One healthState remains authoritative across all chapters.
 */
import {validateCombatState} from './persistent-combat-state.js';
import {initializeConcurrentShock} from './hmk-concurrent-shock-projection.js';
const states=new Set(['NONE','STN','INC','UNC','KIA']);
const need=(x,m)=>{if(!x)throw Error(m)};
/** A posture is NOT a Shock State. A recovered actor may remain on the ground
 * after Shock Reroll (HMK 169, 171). Only a documented GM statement that the
 * actor is physically standing, outside Initiative, may clear that position.
 * Pre-existing wounds, involuntary paralysis and Coma are never silently erased.
 */
function requireGMStandingPossible(state,minute){
 need(state.shock==='NONE'&&!state.coma?.active&&!state.extendedShock,
  'Postava v aktivním Shock / Coma / Extended Shock nemůže být GM označena jako stojící');
 need(!(state.ailmentSequelae||[]).some(x=>x.active&&x.condition==='paralysis'&&x.affectedLimb==='complete'),
  'Úplná trvalá paralýza: polohu prone nelze vymazat změnou Shock');
 need(!(state.asphyxiaComaPending?.active===true),
  'Nedořešená Asphyxia / Coma brání potvrzení samostatného vstání');
 if(state.herbalParalysis){
  need(minute!==null&&minute>=state.herbalParalysis.endMinute,
   'Aktivní nebo časově nedoložená paralýza: nelze označit postavu jako stojící');
 }
 need(!(state.wounds||[]).some(w=>!w.healed&&w.severity==='G'),
  'Aktivní Grievous Injury vyžaduje nejprve posoudit možnost vstání');
}
/** Display-only eligibility: the application may suggest standing, but cannot
 * silently make the GM's choice or imply a completed Move action. */
export function gmStandingEligibility(state,minute=null){
 try{requireGMStandingPossible({...state,shock:'NONE',coma:null,extendedShock:null},minute);return {allowed:true,reason:null};}
 catch(err){return {allowed:false,reason:err.message};}
}
export function prepareGMShockStateChange({state,eventId,shock,reason,minute,gmConfirmed=false,standingConfirmed=false}={}){
 need(state&&gmConfirmed===true,'Změnu stavu musí výslovně potvrdit GM');
 validateCombatState(state);
 need(states.has(shock),'Neznámý stav Shock');
 need(typeof eventId==='string'&&eventId.startsWith('gm-shock:')&&eventId.length>=12&&
   !state.events.some(x=>x.id===eventId),'Zdravotní událost musí mít unikátní ID');
 need(typeof reason==='string'&&reason.trim().length>=10&&reason.length<=500,'GM musí uvést důvod (10–500 znaků)');
 need(minute===null||(Number.isSafeInteger(minute)&&minute>=0),'GM změna nemá ověřený čas Kalendáře');
 const reanchor=state.shock===shock&&minute!==null&&state.shockFollowup?.domain==='gm-health'&&
   state.shockFollowup.originMinute===null;
 const correctingOnlyProne=state.shock==='NONE'&&shock==='NONE'&&
  state.posture?.prone===true&&standingConfirmed===true;
 need(state.shock!==shock||reanchor||correctingOnlyProne,
  'Cílový stav musí být jiný než současný (nebo GM potvrzuje opravu prone / doložení času)');
 const s=structuredClone(state),from=s.shock,round=Math.max(1,s.lastRound);
 const cancelled={shockFollowup:!!s.shockFollowup,extendedShock:!!s.extendedShock,
   coma:!!s.coma?.active};
 s.shockFollowup=null;s.extendedShock=null;s.coma=null;
 // This is a distinct GM adjudication. Individual ailment courses, BP, wounds,
 // fatigue and their original proofs remain intact for the next actual roll.
 s.shock=shock;s.shockOriginRound=round;s.shockOriginWoundId=null;
 if(s.concurrentShockProjection){
  initializeConcurrentShock(s);
  s.concurrentShockProjection.baseShock=shock;
  s.concurrentShockProjection.projectedShock=shock;
 }
 if(shock==='KIA'){
  s.bloodShockPending=false;
  for(const w of s.wounds)w.nextAdvanceRound=null;
 }else{
  // A prior death may have removed bleeding deadlines. Require the GM to
  // resolve those wounds first rather than inventing an old lost interval.
  need(!s.wounds.some(w=>!w.healed&&w.bleeding&&w.nextAdvanceRound===null),
   'Změna KIA na živý stav vyžaduje nejprve dořešit krvácení a jeho termíny');
  if(['INC','UNC'].includes(shock))s.posture.prone=true;
  if(shock==='NONE'&&standingConfirmed&&s.posture?.prone){
   requireGMStandingPossible(s,minute);
   s.posture.prone=false;
  }
  if(['STN','INC','UNC'].includes(shock))s.shockFollowup={kind:shock,
   originRound:round,dueRound:round+(shock==='UNC'?120:1),
   phase:shock==='UNC'?'after-ten-minutes':'end-next-turn',timelineId:null,
   domain:'gm-health',sourceId:eventId,originMinute:minute};
 }
 s.events.push({id:eventId,type:'gm-health-shock-set',round,details:{from,to:shock,
  reason:reason.trim(),originMinute:minute,originDomain:'gm-health',gmConfirmed:true,
  actualRoll:null,woundId:null,cancelled,sourcePage:169,
  postureBefore:state.posture?.prone===true,postureAfter:s.posture?.prone===true,
  standingConfirmed:standingConfirmed===true&&shock==='NONE',
  postureRulePage:171}});
 s.lastRound=round;
 validateCombatState(s);
 return {state:s,cancelled,postureCleared:state.posture?.prone===true&&s.posture?.prone===false};
}
