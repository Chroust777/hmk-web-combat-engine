export function sortTurnOrder(combatants){ return [...combatants].sort((a,b)=>(b.initiativeRank??-Infinity)-(a.initiativeRank??-Infinity)); }
export function dueEvents(state,{timing=null}={}){
  return state.events.filter(e=>e.dueRound===state.round && (e.dueIR==null||e.dueIR===state.activeIR) && (e.timing==null || e.timing===timing));
}
export function advanceRound(state){ return {...state,round:state.round+1,activeIR:null}; }

export const MELEE_POST_PHASE={INJURY:'injury',MISHAPS:'mishaps',FREE_PRESS:'free-press',ACTION_TA:'action-ta',COMPLETE:'complete'};
export function createMeleePostResolution({hasStrike=false,hasMishaps=false,freePressEligible=false,actionTAAvailable=false}={}){
  const phases=[]; if(hasStrike) phases.push(MELEE_POST_PHASE.INJURY); if(hasMishaps) phases.push(MELEE_POST_PHASE.MISHAPS); if(freePressEligible) phases.push(MELEE_POST_PHASE.FREE_PRESS); if(actionTAAvailable) phases.push(MELEE_POST_PHASE.ACTION_TA); phases.push(MELEE_POST_PHASE.COMPLETE);
  return {phases,index:0,current:phases[0]};
}
export function completeMeleePostPhase(flow,phase,{resolutionComplete=true}={}){
  if(flow.current!==phase) throw new Error(`Cannot resolve ${phase} while ${flow.current} is pending`);
  if(!resolutionComplete) throw new Error(`Cannot complete ${phase} while its resolution is pending`);
  flow.index++; flow.current=flow.phases[flow.index]??MELEE_POST_PHASE.COMPLETE; return flow.current;
}
export function canOfferActionTA(flow){return flow.current===MELEE_POST_PHASE.ACTION_TA;}

export const ROUNDS_PER_MINUTE=12;
export function scheduleMinutes({currentRound,currentIR,minutes,type,combatantId,data={}}={}){
  return {type,dueRound:currentRound+minutes*ROUNDS_PER_MINUTE,dueIR:currentIR??null,combatantId,data};
}
export function scheduleEndNextTurn({currentRound,currentIR,type,combatantId,data={}}={}){
  return {type,dueRound:currentRound+1,dueIR:currentIR??null,combatantId,data,timing:'end-turn'};
}

export function beginActionCommitment({kind='1-turn',rounds=0,startRound,startIR}={}){
  const concreteRound=/^(\d+)-round$/.exec(String(kind));
  if(!['free','1-turn','1+-round'].includes(kind)&&!concreteRound) throw new RangeError('Unknown action time');
  const parsedRounds=concreteRound?Number(concreteRound[1]):rounds;
  const concentration=kind==='1+-round'||!!concreteRound;
  return {kind,rounds:parsedRounds,startRound,startIR,concentration,ignoreDefence:concentration,noEngagementZone:concentration,abandoned:false};
}
export function abandonCommitmentForDefence(commitment){
  if(!commitment?.concentration) return {...commitment,abandoned:false};
  return {...commitment,abandoned:true,concentration:false,ignoreDefence:false,noEngagementZone:false};
}
export function defenceDuringCommitment(commitment,{aware=true}={}){
  if(!commitment?.concentration||commitment.abandoned) return {forcedIgnore:false,mayAbandon:false};
  return {forcedIgnore:true,mayAbandon:aware};
}
export function effectiveMove({move,encumbrance=0,fatigue=0,impairment=0,immobile=false}={}){
  if(immobile) return {feet:0,prone:false,immobile:true};
  const feet=move-encumbrance-fatigue-impairment;
  return {feet:feet<5?0:feet,prone:feet<5,immobile:feet<5};
}
export function movementAllowance({effectiveMoveFeet,rate='full',difficultSources=0}={}){
  const mult=rate==='double'?2:rate==='half'?0.5:1;
  let raw=effectiveMoveFeet*mult;
  for(let i=0;i<difficultSources;i++) raw/=2;
  return Math.max(0,Math.floor(raw/5)*5);
}
export function doubleMovePolicy({generallyStraight=true}={}){return {stumbleRequired:!generallyStraight,fatigueAccruesThisRound:true};}

/** Trauma-aware due-event view. Active infection suspends ordinary Injury
 * Healing Rolls; Infection Course and all other due events remain visible.
 * Suspended rolls are not consumed here and can be explicitly rescheduled
 * when infection is defeated by the healing lifecycle.
 */
export function dueTraumaEvents(state,{timing=null,infectionActive=false}={}){
 const due=dueEvents(state,{timing});
 if(!infectionActive) return {due,suspended:[]};
 const suspended=due.filter(e=>e.type==='injury-healing-roll');
 return {due:due.filter(e=>e.type!=='injury-healing-roll'),suspended};
}

/** p160 Action Time lifecycle for 1+ round actions.
 * A commitment that starts on IR X of round R for N rounds completes
 * immediately before IR X of round R+N. Until then concentration is required.
 */
export function actionCommitmentLifecycle({kind='1-turn',rounds=0,startRound,startIR}={}){
  const c=beginActionCommitment({kind,rounds,startRound,startIR});
  if(!c.concentration) return {...c,status:'completed',completionRound:startRound,completionIR:startIR};
  const concreteRound=/^(\d+)-round$/.exec(String(kind));
  const duration=concreteRound?Number(concreteRound[1]):rounds;
  if(!Number.isInteger(duration)||duration<1) throw new RangeError('Concentrating action requires at least one round');
  return {...c,rounds:duration,status:'in-progress',completionRound:startRound+duration,completionIR:startIR};
}
export function actionCommitmentAt(commitment,{round,ir}={}){
  if(!commitment) return {status:'none',completesNow:false};
  if(['abandoned','interrupted','completed'].includes(commitment.status)) return {status:commitment.status,completesNow:false};
  const completesNow=round===commitment.completionRound&&ir===commitment.completionIR;
  return {status:completesNow?'completed':'in-progress',completesNow};
}
export function interruptActionCommitment(commitment,{concentrationAllowed=true,reason='concentration-lost'}={}){
  if(!commitment?.concentration||commitment.abandoned||commitment.status==='completed') return {...commitment};
  if(concentrationAllowed) return {...commitment};
  return {...commitment,status:'interrupted',concentration:false,ignoreDefence:false,noEngagementZone:false,interruptionReason:reason};
}
export function abandonActionCommitment(commitment,{reason='defence'}={}){
  if(!commitment?.concentration||commitment.status==='completed') return {...commitment};
  return {...commitment,status:'abandoned',abandoned:true,concentration:false,ignoreDefence:false,noEngagementZone:false,abandonReason:reason};
}

/** Builds the mandatory p166+ post-resolution phase order from an actual Melee outcome.
 * Free Press eligibility is supplied by the rule resolver because Mighty Strike/size routes
 * can add it independently; Action TA exists only when the outcome awarded usable stars.
 */
export function meleePostResolutionFromOutcome({outcome,freePressEligible=false,taAllocation=null}={}){
  if(!outcome) throw new TypeError('Melee outcome required');
  const hasMishaps=!!outcome.attackerMishap||!!outcome.defenderMishap;
  if((outcome.extraTA??0)>0 && !taAllocation) throw new Error('Tactical Advantage allocation required before post-resolution');
  const actionTAAvailable=(taAllocation?.action??0)>0;
  const flow=createMeleePostResolution({hasStrike:!!outcome.strike,hasMishaps,freePressEligible:!!freePressEligible,actionTAAvailable});
  flow.mishaps=[...(outcome.attackerMishap?[{owner:'attacker',type:outcome.attackerMishap}]:[]),...(outcome.defenderMishap?[{owner:'defender',type:outcome.defenderMishap}]:[])];
  flow.taAllocation=taAllocation?{...taAllocation,choices:[...(taAllocation.choices??[])]}:null;
  return flow;
}
