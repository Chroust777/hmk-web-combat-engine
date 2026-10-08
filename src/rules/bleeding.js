import { SL } from './tests.js';
import { SHOCK_STATE, applyShockState } from './shock.js';
export function bloodLossPoints(sl){if(sl===SL.CF)return 3;if(sl===SL.F)return 2;if(sl===SL.S)return 1;if(sl===SL.CS)return 0;throw new RangeError('Blood loss SL');}
export function bloodLossState(bp){if(bp>=4)return SHOCK_STATE.KIA;if(bp===3)return SHOCK_STATE.UNC;if(bp===2)return SHOCK_STATE.INC;if(bp===1)return SHOCK_STATE.STN;return SHOCK_STATE.NONE;}
export function applyBloodLoss({currentBP=0,sl,currentShockState=SHOCK_STATE.NONE}={}){
 const gained=bloodLossPoints(sl),bp=currentBP+gained,incoming=bloodLossState(bp);
 return {gainedBP:gained,bp,weaknessFatigue:bp*5,bloodLossState:incoming,shockState:applyShockState(currentShockState,incoming),dead:bp>=4};
}
export function bleedingAdvancePolicy({isFolk=true}={}){return {periodMinutes:5,test:isFolk?'strength':'fixed-ml',fixedML:isFolk?null:50,excludeFatigue:true,excludeImpairment:true};}
export function bloodStoppageResult(sl){
 if(sl===SL.CF)return {stopped:false,advanceRoll:true,nextStaunchBonus:0};
 if(sl===SL.F)return {stopped:false,advanceRoll:true,nextStaunchBonus:10};
 if(sl===SL.S)return {stopped:true,advanceRoll:true,nextStaunchBonus:0};
 if(sl===SL.CS)return {stopped:true,advanceRoll:false,nextStaunchBonus:0};
 throw new RangeError('Blood stoppage SL');
}
export function afterAllBleedingStopped(bloodState){
 if(bloodState===SHOCK_STATE.STN)return {state:SHOCK_STATE.NONE,shockReroll:false};
 if(bloodState===SHOCK_STATE.INC||bloodState===SHOCK_STATE.UNC)return {state:bloodState,shockReroll:true};
 return {state:bloodState,shockReroll:false};
}
export const BLOOD_LOSS_PERIOD_ROUNDS=60; // 5 minutes at 5 seconds per combat round.
export function scheduleBleederAdvance({currentRound,currentIR,combatantId,injuryId}={}){
 return {type:'blood-loss-advance',dueRound:currentRound+BLOOD_LOSS_PERIOD_ROUNDS,dueIR:currentIR??null,combatantId,data:{injuryId}};
}
export function rescheduleBleederAdvance(event){
 if(event?.type!=='blood-loss-advance') throw new Error('Blood-loss event required');
 return {...event,dueRound:event.dueRound+BLOOD_LOSS_PERIOD_ROUNDS};
}
export function scheduleActiveBleeders({currentRound,currentIR,combatantId,injuries=[]}={}){
 return injuries.filter(x=>x.bleeding===true||x.bleeding===1).map(x=>scheduleBleederAdvance({currentRound,currentIR,combatantId,injuryId:x.id}));
}
/** Treating multiple bleeders at once: -10 Staunch EML per treated bleeder beyond the first. */
export function multipleBleederStaunchModifier(treatedBleeders=1){
 if(!Number.isInteger(treatedBleeders)||treatedBleeders<1) throw new RangeError('treatedBleeders must be >= 1');
 return treatedBleeders===1?0:-10*(treatedBleeders-1);
}

/** Resolve one Blood Stoppage attempt together with the bleeder's periodic
 * Advance slot, preventing the same five-minute period from being advanced twice.
 * The caller still supplies the actual Blood Loss Advance SL when advanceRoll=true.
 */
export function bloodStoppageTransition({sl,event,currentRound,currentIR,combatantId,injuryId}={}){
 if(event?.type!=='blood-loss-advance'||event?.data?.injuryId!==injuryId) throw new Error('Matching blood-loss event required');
 const result=bloodStoppageResult(sl);
 const nextEvent=!result.stopped
   ? scheduleBleederAdvance({currentRound,currentIR,combatantId,injuryId})
   : null;
 return {result,consumeEvent:true,advanceRollRequired:result.advanceRoll,bleedingContinues:!result.stopped,nextEvent};
}

/** Persistent Blood Loss state transition. BP and anaemic weakness are absolute
 * values, not deltas: callers must replace the prior blood-loss condition with
 * this result rather than add weakness again on every five-minute Advance. */
export function bloodLossAdvanceTransition({bloodLoss={bp:0,weaknessFatigue:0},sl,currentShockState=SHOCK_STATE.NONE}={}){
 const currentBP=bloodLoss?.bp??0;
 const resolved=applyBloodLoss({currentBP,sl,currentShockState});
 return {
   bloodLoss:{bp:resolved.bp,weaknessFatigue:resolved.weaknessFatigue},
   gainedBP:resolved.gainedBP,
   shockState:resolved.shockState,
   dead:resolved.dead
 };
}
