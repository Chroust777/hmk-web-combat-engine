/** Persistent GM-only Shock status: a documented non-dice administrative state.
 * No wound, roll, invented cause, or other medical source is manufactured.
 * One healthState remains authoritative across all chapters.
 */
import {validateCombatState} from './persistent-combat-state.js';
import {initializeConcurrentShock} from './hmk-concurrent-shock-projection.js';
const states=new Set(['NONE','STN','INC','UNC','KIA']);
const need=(x,m)=>{if(!x)throw Error(m)};
export function prepareGMShockStateChange({state,eventId,shock,reason,minute,gmConfirmed=false}={}){
 need(state&&gmConfirmed===true,'Změnu stavu musí výslovně potvrdit GM');
 validateCombatState(state);
 need(states.has(shock),'Neznámý stav Shock');
 need(typeof eventId==='string'&&eventId.startsWith('gm-shock:')&&eventId.length>=12&&
   !state.events.some(x=>x.id===eventId),'Zdravotní událost musí mít unikátní ID');
 need(typeof reason==='string'&&reason.trim().length>=10&&reason.length<=500,'GM musí uvést důvod (10–500 znaků)');
 need(minute===null||(Number.isSafeInteger(minute)&&minute>=0),'GM změna nemá ověřený čas Kalendáře');
 const reanchor=state.shock===shock&&minute!==null&&state.shockFollowup?.domain==='gm-health'&&
   state.shockFollowup.originMinute===null;
 need(state.shock!==shock||reanchor,'Cílový stav musí být jiný než současný (nebo vyžaduje nové doložení času)');
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
  if(['STN','INC','UNC'].includes(shock))s.shockFollowup={kind:shock,
   originRound:round,dueRound:round+(shock==='UNC'?120:1),
   phase:shock==='UNC'?'after-ten-minutes':'end-next-turn',timelineId:null,
   domain:'gm-health',sourceId:eventId,originMinute:minute};
 }
 s.events.push({id:eventId,type:'gm-health-shock-set',round,details:{from,to:shock,
  reason:reason.trim(),originMinute:minute,originDomain:'gm-health',gmConfirmed:true,
  actualRoll:null,woundId:null,cancelled,sourcePage:169}});
 s.lastRound=round;
 validateCombatState(s);
 return {state:s,cancelled};
}
