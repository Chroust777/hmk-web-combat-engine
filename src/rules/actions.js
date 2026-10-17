export const ACTION={ATTACK:'attack',CHARGE:'charge',EVADE:'evade',GROPE:'grope',INCANT:'incant',MOVE:'move',PASS:'pass'};

export function chargeEligibility({threatenedAtTurnStart=false}={}){return !threatenedAtTurnStart;}
export function chargeAttackChoice({threatenedAfterMovement=false,targetEngaged=false}={}){
  return {mayThrownAttack:!threatenedAfterMovement,mayMeleeAttack:!!targetEngaged,movement:'half',time:'1-turn'};
}
export function bargeEligibility({threatenedAfterMeleeAttack=false}={}){
  return {eligible:!threatenedAfterMeleeAttack,movement:'half',difficultMovement:true,stopAtThreateningEZ:true};
}
export function evadeAction({stunned=false,distanceFt=0,halfMoveFt=0,effectiveDodgeIndex=0}={}){
  const max=Math.max(0,halfMoveFt);
  const legal=!stunned&&distanceFt>=10&&distanceFt<=max;
  return {legal,minMoveFt:10,maxMoveFt:max,stopAtThreateningEZ:true,missilePenalty:legal?-(Math.max(0,effectiveDodgeIndex)*5):null,mayMeleeStrike:false,time:'1-turn'};
}
export function moveAction({effectiveMove=0,rate='full'}={}){
  const multiplier=rate==='double'?2:rate==='half'?0.5:1;
  const distance=rate==='half'?Math.floor((effectiveMove*0.5)/5)*5:effectiveMove*multiplier;
  return {maxDistanceFt:distance,stopAtThreateningEZ:true,time:'1-turn',stumbleIfDoubleNotStraight:rate==='double'};
}
export function freeActionAllowance({alreadyUsedFree=false,mainActionTime='1-turn',mainActionStarted=false,isMovementAction=false}={}){
  if(mainActionStarted) return {allowed:false,reason:'free-actions-before-main-action-only'};
  if(mainActionTime!=='1-turn') return {allowed:false,reason:'not-with-one-round-or-longer'};
  if(alreadyUsedFree) return {allowed:false,reason:'second-free-action-costs-main-action'};
  return {allowed:true};
}
export function fiveFootFreeMove({mainAction=null}={}){
  return {allowed:!['charge','evade','move'].includes(mainAction),distanceFt:5,allowedWithinEZ:true};
}
export function readyActionEligibility({action,time='1-turn'}={}){
  const allowed=time==='1-turn'&&['attack','grope','move'].includes(action);
  return {allowed,maxMove:action==='move'&&allowed?'half':null};
}
export function resolveReadiedAction({oldIR,triggerIR}={}){
  if(!Number.isFinite(triggerIR)) throw new TypeError('Trigger IR required');
  return {interrupts:true,newIR:triggerIR,previousIR:oldIR};
}

/** p161 persistent lifecycle for a readied 1-turn Attack/Grope/Move. */
export function createReadiedAction({action,startRound,startIR}={}){
  const eligibility=readyActionEligibility({action,time:'1-turn'});
  if(!eligibility.allowed) throw new RangeError('Action cannot be readied');
  return {status:'readied',action,startRound,startIR,maxMove:eligibility.maxMove};
}
export function triggerReadiedAction(readied,{round,triggerIR}={}){
  if(readied?.status!=='readied') return {...readied,triggered:false};
  if(round!==readied.startRound) return {...readied,status:'expired',triggered:false};
  if(!Number.isFinite(triggerIR)||triggerIR>readied.startIR) return {...readied,triggered:false,reason:'not-later-ir'};
  return {...readied,status:'resolved',triggered:true,interrupts:true,newIR:triggerIR,previousIR:readied.startIR};
}
export function expireReadiedAction(readied,{round}={}){
  if(readied?.status==='readied'&&round>readied.startRound) return {...readied,status:'expired'};
  return {...readied};
}
