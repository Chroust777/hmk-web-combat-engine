import { SL } from './tests.js';
export const MORALE={CATATONIC:'catatonic',ROUTED:'routed',WITHDRAWING:'withdrawing',STEADY:'steady',BRAVE:'brave'};
export function moraleEML({initiativeML,aberrance=0,brave=false}={}){return initiativeML-(5*aberrance)+(brave?20:0);}
export function moraleResult({sl,roll}={}){
 if(sl===SL.CF){const cf0=roll%10===0;return cf0?{state:MORALE.CATATONIC,psycheStress:2,unaware:true,reaction:'end-every-turn'}:{state:MORALE.ROUTED,psycheStress:1,reaction:'5-minutes-after-safe'};}
 if(sl===SL.F)return {state:MORALE.WITHDRAWING,psycheStress:0,reaction:'1-minute-after-unthreatened'};
 if(sl===SL.S)return {state:MORALE.STEADY,psycheStress:0};
 if(sl===SL.CS)return {state:MORALE.BRAVE,psycheStress:0,bonus:20,durationMinutes:5};
 throw new RangeError('Morale SL required');
}
const SEVERITY={[MORALE.STEADY]:0,[MORALE.BRAVE]:0,[MORALE.WITHDRAWING]:1,[MORALE.ROUTED]:2,[MORALE.CATATONIC]:3};
export function combineMoraleState(current,incoming){return (SEVERITY[incoming]??0)>(SEVERITY[current]??0)?incoming:current;}
export function moraleActionPolicy(state,{fleePossible=true,threatened=false}={}){
 if(state===MORALE.CATATONIC)return {action:'none',mayDefend:false,mayMove:false};
 if(state===MORALE.ROUTED)return fleePossible?{action:'move',rate:'full',direction:'flee'}:{action:'pass',surrender:threatened};
 if(state===MORALE.WITHDRAWING)return fleePossible?{action:'move',minimumRate:'half',direction:'retreat'}:{action:'pass'};
 return {action:'any'};
}
export function rallyResult(sl){
 if(sl===SL.CF)return {lockoutMinutes:5}; if(sl===SL.F)return {lockoutMinutes:1};
 if(sl===SL.S)return {reactionAtEndNextTurn:true}; if(sl===SL.CS)return {steadyImmediately:true}; throw new RangeError('Rally SL required');
}
export function actionFatigueAccrual({personalFatigue,enduranceSR=false}={}){return Math.max(0,personalFatigue-(enduranceSR?5:0));}
export function actionFatiguePolicy({doubleMove=false,intenseFight=false,personalFatigue=0}={}){
 if(doubleMove)return {intervalRounds:1,splitAtRound:null};
 if(intenseFight)return {intervalRounds:12,splitAtRound:personalFatigue>=10?6:null};
 return {intervalMinutes:5,intervalRounds:60,splitAtRound:null};
}

export const VANQUISHED_STATES=new Set(['catatonic','withdrawing','surrendered','incapacitated','terrified','unconscious','routed','killed']);
export function vanquishedStatus({state=null,preventsMovementOrAggression=false,gmFunctionalIncapacitation=false,disarmedAgainstArmedFoes=false}={}){
 if(VANQUISHED_STATES.has(state)) return {vanquished:true,reason:state,gmDecision:false};
 if(preventsMovementOrAggression) return {vanquished:true,reason:'trauma/effect-prevents-movement-or-aggression',gmDecision:false};
 if(gmFunctionalIncapacitation) return {vanquished:true,reason:'gm-functional-incapacitation',gmDecision:true};
 if(disarmedAgainstArmedFoes) return {vanquished:null,reason:'disarmed-against-armed-foes',gmDecision:true};
 return {vanquished:false,reason:null,gmDecision:false};
}
/** Group cohesion is checked against allies remaining since the previous cohesion threshold.
 * When at least half of that cohort is newly vanquished, a new immediate Morale trigger occurs. */
export function groupCohesionTrigger({remainingAlliesAtLastThreshold,newlyVanquished}={}){
 if(!Number.isInteger(remainingAlliesAtLastThreshold)||remainingAlliesAtLastThreshold<0||!Number.isInteger(newlyVanquished)||newlyVanquished<0) throw new RangeError('Non-negative integer ally counts required');
 const threshold=Math.ceil(remainingAlliesAtLastThreshold/2);
 const triggered=remainingAlliesAtLastThreshold>0&&newlyVanquished>=threshold;
 return {triggered,threshold,nextRemaining:triggered?Math.max(0,remainingAlliesAtLastThreshold-newlyVanquished):remainingAlliesAtLastThreshold};
}
export function moraleTriggers({injurySeverity=null,recoveredFromShock=true,groupCohesion=false,special=[]}={}){
 const triggers=[];
 if((injurySeverity==='S'||injurySeverity==='G')&&recoveredFromShock) triggers.push('impairment');
 if(groupCohesion) triggers.push('group-cohesion');
 for(const x of special) triggers.push({type:'special',reason:x,gmDefined:true});
 return triggers;
}

/** Release per-injury Morale debts once the associated injury Shock State has ended. */
export function moraleDebtsAfterShockRecovery({injuries=[],currentShockState='none'}={}){
  if(currentShockState!=='none') return [];
  return injuries.filter(i=>i?.meta?.morale?.required && i.meta.morale.timing==='after-recovering-from-stunned')
    .map(i=>({injuryId:i.id,severity:i.severity}));
}
