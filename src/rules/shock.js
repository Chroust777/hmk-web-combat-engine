import { SL } from './tests.js';

export const SHOCK_STATE={NONE:'none',STN:'stunned',INC:'incapacitated',UNC:'unconscious',KIA:'killed'};
const RANK={none:0,stunned:1,incapacitated:2,unconscious:3,killed:4};

export function shockRollModifier(sl){
  if(sl===SL.CF) return 2; if(sl===SL.F) return 1; if(sl===SL.S) return 0; if(sl===SL.CS) return -1;
  throw new RangeError('Shock SL must be CF/F/S/CS');
}
export function shockStateFromIndex(shk){
  if(shk>=10) return SHOCK_STATE.KIA; if(shk===9) return SHOCK_STATE.UNC; if(shk===8) return SHOCK_STATE.INC; if(shk===7) return SHOCK_STATE.STN; return SHOCK_STATE.NONE;
}
export function calculateShockState({locationShock,injuryShock,shockSL}={}){
  const index=locationShock+injuryShock+shockRollModifier(shockSL);
  return {index,state:shockStateFromIndex(index)};
}
export function applyShockState(current=SHOCK_STATE.NONE,incoming=SHOCK_STATE.NONE){
  if(current===SHOCK_STATE.KIA||incoming===SHOCK_STATE.KIA) return SHOCK_STATE.KIA;
  if(current===SHOCK_STATE.STN&&incoming===SHOCK_STATE.STN) return SHOCK_STATE.INC;
  if(current===SHOCK_STATE.INC&&incoming===SHOCK_STATE.INC) return SHOCK_STATE.UNC;
  return RANK[incoming]>RANK[current]?incoming:current;
}
export function shockStateEffects(state){
  switch(state){
    case SHOCK_STATE.STN:return {aware:true,prone:false,independentActions:true,movement:'difficult-no-double',impairedSLPenalty:1,helpless:false,concentration:false};
    case SHOCK_STATE.INC:return {aware:false,prone:true,independentActions:false,movement:'assisted-difficult-half',impairedSLPenalty:0,helpless:false,concentration:false};
    case SHOCK_STATE.UNC:return {aware:false,prone:true,independentActions:false,movement:'none',impairedSLPenalty:0,helpless:true,concentration:false};
    case SHOCK_STATE.KIA:return {aware:false,prone:null,independentActions:false,movement:'none',impairedSLPenalty:0,helpless:false,concentration:false,dead:true};
    default:return {aware:true,prone:false,independentActions:true,movement:'normal',impairedSLPenalty:0,helpless:false,concentration:true};
  }
}
export function shockRecoverySchedule(state){
  if(state===SHOCK_STATE.STN) return {kind:'shock-test',timing:'end-next-turn',modifier:0,retry:'each-round'};
  if(state===SHOCK_STATE.INC) return {kind:'shock-reroll',timing:'end-next-turn',modifier:-20};
  if(state===SHOCK_STATE.UNC) return {kind:'shock-reroll',timing:'ten-minutes-after-original-shock-roll',modifier:-20};
  return null;
}
export function resolveStunnedRecovery(sl){ return sl>=SL.S?SHOCK_STATE.NONE:SHOCK_STATE.STN; }
export function resolveShockReroll({state,sl,locationShock=null,injuryLevel=null}={}){
  if(state!==SHOCK_STATE.INC&&state!==SHOCK_STATE.UNC) throw new Error('Shock Reroll applies only to INC/UNC');
  if(sl===SL.CS) return {state:SHOCK_STATE.NONE,extendedShock:null,coma:null};
  if(sl===SL.S) return {state:SHOCK_STATE.STN,extendedShock:null,coma:null,remainsProne:true};
  const hr=sl===SL.CF?4:5;
  const coma=state===SHOCK_STATE.UNC&&sl===SL.CF
    ? {active:true,initialHR:12-locationShock-injuryLevel,currentHR:12-locationShock-injuryLevel,period:'d10-days'}:null;
  return {state,extendedShock:{active:true,state,hr,periodHours:4},coma};
}
export function moraleRequirementAfterInjury({severity,shockState}={}){
  if(severity!=='S'&&severity!=='G') return {required:false,timing:null};
  if(shockState===SHOCK_STATE.STN||shockState===SHOCK_STATE.INC||shockState===SHOCK_STATE.UNC)
    return {required:true,timing:'after-recovering-from-stunned'};
  if(shockState===SHOCK_STATE.KIA) return {required:false,timing:null};
  return {required:true,timing:'immediate'};
}

/** Persistent transition for the recurring STN recovery test (p169).
 * A failed test leaves STN and schedules the same end-turn test next round.
 */
export function stunnedRecoveryTransition({sl,currentRound,currentIR,combatantId}={}){
  const state=resolveStunnedRecovery(sl);
  if(state===SHOCK_STATE.NONE) return {state,events:[]};
  return {state,events:[{type:'stunned-recovery',dueRound:currentRound+1,dueIR:currentIR??null,combatantId,data:{},timing:'end-turn'}]};
}
