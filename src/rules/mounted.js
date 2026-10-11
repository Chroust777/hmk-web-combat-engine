import { indexOf, secondaryModifier } from './tests.js';

export function controlEML({ridingML,mountInitiativeML}){
  return ridingML + secondaryModifier(mountInitiativeML);
}

export function mountedPenalty(ridingML){
  return Math.min(0,secondaryModifier(ridingML));
}

export function mountingResolution({moving=false,agitated=false,controlSucceeded=true}={}){
  const needsControl=moving||agitated;
  return {action:'move',movementCostFt:10,needsControl,fallFt:(needsControl&&!controlSucceeded&&moving)?6:0};
}

export function mountedTurnControl({controlSucceeded,retestSucceeded=null}={}){
  if(controlSucceeded) return {controlled:true,controlAction:'free',riderActionAvailable:true};
  if(retestSucceeded===null) return {controlled:false,controlAction:'failed-free',mayRetestAsGrope:true,riderActionAvailable:true};
  return {controlled:!!retestSucceeded,controlAction:'grope',mayRetestAsGrope:false,riderActionAvailable:false};
}

export function mountTurnDistance({declaredDistanceFt,controlIndex}){
  if(!Number.isFinite(declaredDistanceFt)||declaredDistanceFt<0) throw new RangeError('declared distance must be >= 0');
  if(!Number.isFinite(controlIndex)||controlIndex<=0) return null;
  return Math.round(declaredDistanceFt/controlIndex);
}

export function minimumMovementResult({declaredDistanceFt,movedDistanceFt}){
  return {automaticFailedStumble:movedDistanceFt<declaredDistanceFt};
}

export function riderImpactBonus({mountRiderImpact=0,straightDistanceFt=0}){
  if(straightDistanceFt>=100) return mountRiderImpact;
  if(straightDistanceFt>=50) return mountRiderImpact/2;
  return 0;
}

export function mountedAimReach({riderAttacking=false,targetUnmountedHuman=false,aimZN=1,unmountedCounterstrikeAtRider=false,reachPenalty=1}={}){
  if(!Number.isFinite(reachPenalty)||reachPenalty<0) throw new RangeError('mounted Reach penalty must be >= 0');
  if(riderAttacking&&targetUnmountedHuman&&aimZN!==1) return -reachPenalty;
  if(unmountedCounterstrikeAtRider&&aimZN===1) return -reachPenalty;
  return 0;
}

export function riderDefenceModifier(defence){
  if(defence==='dodge') return -20;
  if(defence==='block'||defence==='counterstrike') return -10;
  return 0;
}

export function mountTargetDefenceOptions({controlled=false,riderDefendsMount=false}={}){
  const options=[{actor:'mount',defence:'dodge',modifier:0}];
  if(controlled) options.push({actor:'mount',defence:'counterstrike',modifier:0});
  if(riderDefendsMount){
    options.push({actor:'rider',defence:'block',modifier:-20});
    options.push({actor:'rider',defence:'counterstrike',modifier:-20});
  }
  return options;
}

export function unmountedDefencesAgainstRiderAndMount({firstDefence}){
  if(!['block','counterstrike','dodge'].includes(firstDefence)) throw new RangeError('invalid defence');
  return firstDefence==='dodge'
    ? {first:'dodge',other:['block','counterstrike']}
    : {first:firstDefence,other:['dodge']};
}

export function mountedOutnumberedAllies(){ return 2; }
export function riderEncumbranceModifier(){ return -15; }

export function freePressStrength({riderSTR,mountSTR,mountControlled=false,useMount=false}){
  return useMount&&mountControlled ? mountSTR : riderSTR;
}

export function chaseMelee({caughtOrMaintained=false,moveRate=null,defence='dodge',gmConditionsNotIdeal=false}={}){
  const eligible=caughtOrMaintained&&(moveRate==='full'||moveRate==='double');
  return {
    eligible,
    attackModifier:eligible?-20:0,
    defenceModifier:eligible&&defence!=='dodge'?-20:0,
    gmMayRequireStumble:eligible&&gmConditionsNotIdeal,
    stumbleParties:eligible&&gmConditionsNotIdeal?['pursuer','pursued']:[]
  };
}

/** Rider Impact earned from straight mount movement persists for the
 * remainder of the earning turn and the ensuing round (HMK p.172). */
export function riderImpactEffect({mountRiderImpact=0,straightDistanceFt=0,earnedRound}={}){
  if(!Number.isInteger(earnedRound)||earnedRound<1) throw new RangeError('earnedRound must be a positive integer');
  const bonus=riderImpactBonus({mountRiderImpact,straightDistanceFt});
  return {bonus,earnedRound,activeThroughRound:bonus?earnedRound+1:earnedRound};
}
export function riderImpactAtRound(effect,round){
  if(!effect||!Number.isInteger(round)||round<1) return 0;
  return round>=effect.earnedRound&&round<=effect.activeThroughRound ? effect.bonus : 0;
}

/** Tracks the special p.172 defence restriction when an unmounted defender
 * faces attacks from both rider and mount on their shared turn. */
export function mountedPairDefence({previousDefence=null,defence}={}){
  if(!['block','counterstrike','dodge'].includes(defence)) throw new RangeError('invalid defence');
  if(previousDefence===null) return {allowed:true,defence,nextRequired:defence==='dodge'?'block-or-counterstrike':'dodge'};
  if(!['block','counterstrike','dodge'].includes(previousDefence)) throw new RangeError('invalid previous defence');
  const allowed=previousDefence==='dodge' ? (defence==='block'||defence==='counterstrike') : defence==='dodge';
  return {allowed,defence,previousDefence,required:previousDefence==='dodge'?'block-or-counterstrike':'dodge'};
}

/** Bestiary p.355 consequences after a mount has failed its Stumble Roll. */
export function mountStumbleTrauma({stumbleSL,impactD10,legInjurySeverity=null}={}){
  if(stumbleSL!=='F'&&stumbleSL!=='CF') return {failed:false};
  if(!Number.isInteger(impactD10)||impactD10<1||impactD10>10) return {failed:true,pending:{type:'mount-stumble-impact',die:'d10'}};
  const strikeImpact=impactD10+(stumbleSL==='CF'?5:0);
  const hrPenalty=legInjurySeverity==null?null:({M:-1,S:-2,G:-3}[legInjurySeverity]??null);
  if(legInjurySeverity!=null&&hrPenalty==null) throw new RangeError('leg injury severity must be M, S, or G');
  return {failed:true,aspect:'blunt',strikeImpact,location:'random',zoneDie:'mount-body-table',legTreatmentHRModifier:hrPenalty};
}

/** Rider thrown from a mount: d10-2b, +5 at Full/Double Move (p.355). */
export function thrownRiderTrauma({impactD10,moveRate='stop'}={}){
  if(!Number.isInteger(impactD10)||impactD10<1||impactD10>10) return {pending:{type:'thrown-rider-impact',die:'d10'}};
  const speedBonus=(moveRate==='full'||moveRate==='double')?5:0;
  return {aspect:'blunt',strikeImpact:impactD10-2+speedBonus,locationCount:1,zoneDie:'d10',fallingRoutine:true};
}
