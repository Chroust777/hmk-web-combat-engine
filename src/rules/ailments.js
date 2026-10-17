import { SL, successLevel } from './tests.js';
import { SHOCK_STATE } from './shock.js';

// HMK pp.183-186: combat-relevant physical ailment contracts.
export function ailmentOutcome(healingRate){
  if(!Number.isInteger(healingRate)) throw new TypeError('Healing Rate must be an integer');
  if(healingRate>=6) return {healingRate,defeated:true,weaknessFatigue:0,shockState:SHOCK_STATE.NONE,dead:false};
  if(healingRate===5) return {healingRate,defeated:false,weaknessFatigue:5,shockState:SHOCK_STATE.NONE,dead:false};
  if(healingRate===4) return {healingRate,defeated:false,weaknessFatigue:10,shockState:SHOCK_STATE.NONE,dead:false};
  if(healingRate===3) return {healingRate,defeated:false,weaknessFatigue:0,shockState:SHOCK_STATE.STN,dead:false};
  if(healingRate===2) return {healingRate,defeated:false,weaknessFatigue:0,shockState:SHOCK_STATE.INC,dead:false};
  if(healingRate===1) return {healingRate,defeated:false,weaknessFatigue:0,shockState:SHOCK_STATE.UNC,dead:false};
  return {healingRate,defeated:false,weaknessFatigue:0,shockState:SHOCK_STATE.KIA,dead:true};
}

export function ailmentCourse({healingRate,sl,arcaneRecovery=false}={}){
  // p.183 Arcane Recovery: an immediate Course Roll caused by an arcane
  // source applies only successful results; F/CF have no effect.
  if(arcaneRecovery&&(sl===SL.CF||sl===SL.F)) return {...ailmentOutcome(healingRate),delta:0,arcaneFailureIgnored:true};
  const delta=sl===SL.CF?-2:sl===SL.F?-1:sl===SL.S?1:sl===SL.CS?2:null;
  if(delta===null) throw new RangeError('Course SL must be CF/F/S/CS');
  const nextHR=healingRate+delta;
  return {...ailmentOutcome(nextHR),delta};
}

export function asphyxiaCapacity({endurance,willSV=0,swimmingML=null}={}){
  if(!Number.isFinite(endurance)||endurance<0) throw new RangeError('END must be non-negative');
  const swimmingBase=Number.isFinite(swimmingML)?swimmingML/2:null;
  const baseRounds=swimmingBase!==null&&swimmingBase>endurance?swimmingBase:endurance;
  return {baseRounds,maximumRounds:baseRounds+willSV};
}

export function asphyxiaAfterRelease({maximumRounds,roundsHeld,unconscious=false,enduranceTestSL=null}={}){
  const windednessFatigue=roundsHeld>maximumRounds/2?5:0;
  if(!unconscious) return {windednessFatigue,shockRerollSL:null,shockRerollModifier:null};
  if(enduranceTestSL===null) throw new Error('END test SL required after asphyxia unconsciousness');
  return {windednessFatigue,shockRerollSL:enduranceTestSL,shockRerollModifier:0};
}

export function asphyxiaDeathCountdown({endurance,d10}={}){
  if(!Number.isFinite(endurance)||!Number.isInteger(d10)||d10<1||d10>10) throw new RangeError('END and d10 required');
  return endurance/2+d10;
}

export function strangleholdStart({grabWon,suboption,location}={}){
  const active=!!grabWon&&String(suboption).toLowerCase()==='hold'&&String(location).toLowerCase()==='head';
  return {active,shockIndex:active?7:null,firstShockAfterFullRounds:active?1:null};
}

export function strangleholdRound({active,fullRoundsMaintained}={}){
  return {shockRollRequired:!!active&&fullRoundsMaintained>=1,shockIndex:active?7:null};
}

export function strangleholdUnconsciousRecovery({releasedImmediately,d6Rolls}={}){
  if(!releasedImmediately) return {recoveryRounds:null};
  if(!Array.isArray(d6Rolls)||d6Rolls.length!==3||d6Rolls.some(x=>!Number.isInteger(x)||x<1||x>6)) throw new RangeError('3d6 required');
  return {recoveryRounds:d6Rolls.reduce((a,b)=>a+b,0)};
}

export function contagionTest({contagionIndex,endurance,roll}={}){
  const eml=contagionIndex*endurance;
  const sl=successLevel(roll,eml,{clamp:false});
  return {eml,sl,contracted:sl===SL.CF||sl===SL.F,onsetMultiplier:sl===SL.CF?0.5:1,nextExposureIndexBonus:sl===SL.CS?1:0};
}

export function ailmentConditionEffect(condition,{completeParalysis=false}={}){
  switch(String(condition).toLowerCase()){
    case 'amnesia': return {reaPenalty:-40,loreRecallPenalty:-40,identityLoss:'gm-severe-case'};
    case 'blindness': return {dexPenalty:-40,aglPenalty:-40,dexAglSkillPenalty:-40,mayBeImpossible:true,stumbleIfFasterThanHalfMove:true};
    case 'deafness': return {perPenaltyForHearing:'automatic-cf',awarenessHearing:'automatic-cf'};
    case 'muteness': return {speakingAllowed:false,cantSpellcastingAllowed:false};
    case 'paralysis': return completeParalysis
      ? {affectedLimbUsable:false,moveAllowed:false,prone:true,helpless:true}
      : {affectedLimbUsable:false,moveAllowed:true,prone:false,helpless:false};
    default: return null;
  }
}

export function sleepDeprivationAccrual({enduranceSRSuccess=false}={}){
  return {periodHours:24,wearinessFatigue:enduranceSRSuccess?10:15};
}
export function sleepDeprivationPsyche({sleepDeprivationFatigue}={}){
  if(!Number.isFinite(sleepDeprivationFatigue)||sleepDeprivationFatigue<0) throw new RangeError('sleep-deprivation fatigue required');
  const psycheLevels=Math.floor(sleepDeprivationFatigue/30);
  return {psycheLevels,indefiniteWeaknessFatigue:psycheLevels*5};
}

export function exposureAdvance({healingRate,sl,arcaneRecovery=false}={}){
  if(arcaneRecovery&&(sl===SL.CF||sl===SL.F)) return {...ailmentOutcome(healingRate),delta:0,skipNext:false,arcaneFailureIgnored:true};
  let delta;
  let skipNext=false;
  if(sl===SL.CF) delta=-2;
  else if(sl===SL.F) delta=-1;
  else if(sl===SL.S) delta=0;
  else if(sl===SL.CS){ delta=0; skipNext=true; }
  else throw new RangeError('Exposure Advance SL must be CF/F/S/CS');
  return {...ailmentOutcome(healingRate+delta),delta,skipNext};
}
export function exposureHealing({healingRate,sl,arcaneRecovery=false}={}){
  if(arcaneRecovery&&(sl===SL.CF||sl===SL.F)) return {...ailmentOutcome(healingRate),delta:0,skipNext:false,arcaneFailureIgnored:true};
  let delta=0,skipNext=false;
  if(sl===SL.CF) skipNext=true;
  else if(sl===SL.F) delta=0;
  else if(sl===SL.S) delta=1;
  else if(sl===SL.CS) delta=2;
  else throw new RangeError('Exposure Healing SL must be CF/F/S/CS');
  return {...ailmentOutcome(healingRate+delta),delta,skipNext};
}
export function heatExposureRecoveryPeriod({coolWater=false}={}){ return {minutes:coolWater?5:15,treatment:'compress',emlMultiplier:5}; }
export function coldExposureRecoveryPeriod(){ return {minutes:120,treatment:'warming',emlMultiplier:5}; }
export function malnutritionSchedule({kind,halfRations=false,completeRest=false}={}){
  let days;
  if(kind==='starvation') days=halfRations?6:3;
  else if(kind==='thirst') days=halfRations?2:1;
  else throw new RangeError('kind must be starvation or thirst');
  if(completeRest) days*=2;
  return {advanceEveryDays:days,healingEveryDays:1};
}
