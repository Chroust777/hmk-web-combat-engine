export function clenchAttempt({biteSucceeded=false,animalSTR,targetSTR,animalD6,targetD6}={}){
  if(!biteSucceeded) return {eligible:false};
  if([animalSTR,targetSTR,animalD6,targetD6].some(x=>!Number.isFinite(x))) return {eligible:true,pending:'opposed-d6+STR'};
  const animal=animalD6+animalSTR,target=targetD6+targetSTR;
  return {eligible:true,animal,target,success:animal>target,tie:animal===target};
}
export function clenchedBite(){return {attackModifier:20,sameLocationOnSuccess:true,resistBreakSTRBonus:2};}
export function constrictShock({zone,grabMaintained=false,targetUNC=false,shockFailed=false}={}){
  if(!grabMaintained) return {required:false};
  const shk=zone==='head'?7:6;
  return {required:true,shockIndex:shk,cardiacDeath:!!(targetUNC&&shockFailed)};
}
export function constrictEscape({armsPinned=false}={}){return {grabBreakAllowed:!armsPinned};}
export function diveImpact({successfulTalon=false,flyingCharge=false,impactBonus=5}={}){return successfulTalon&&flyingCharge?impactBonus:0;}
export function goreImpact({successfulTusk=false,charge=false,impactBonus=4}={}){return successfulTusk&&charge?impactBonus:0;}
export function trample({targetProne=false,movementAction=null,alreadyTrampled=false}={}){
  const allowedAction=['charge','move','barge'].includes(movementAction);
  return {eligible:targetProne&&allowedAction&&!alreadyTrampled,weapon:'kick',ignoreLowAim:true,countsAsAction:false,chargeMayStillUseAttack:movementAction==='charge'};
}

/** Bestiary Poison trait delegates its virulence/course to the p.186
 * Poison & Toxin ailment routine. Species data supplies HR and period. */
export function creaturePoisonAilment({transmitted=false,healingRate,coursePeriodMinutes}={}){
  if(!transmitted) return {active:false};
  if(!Number.isInteger(healingRate)||healingRate<1||healingRate>5) throw new RangeError('Poison HR must be 1..5');
  if(!Number.isFinite(coursePeriodMinutes)||coursePeriodMinutes<=0) throw new RangeError('Poison course period required');
  return {active:true,kind:'poison',transmission:'vector',healingRate,coursePeriodMinutes,courseResolver:'ailmentCourse',outcomeResolver:'ailmentOutcome'};
}

/** Persistent Clench/Constrict relation state (Bestiary p.354).
 * The engine never invents the clenched location or TA choice; callers supply them.
 */
export function createClenchState({attackerId,targetId,location,success=false}={}){
  if(!success) return null;
  if(!attackerId||!targetId||!location) throw new Error('Successful Clench requires attacker, target and exact location');
  return {kind:'clench',attackerId,targetId,location,active:true,constricting:false,armsPinned:false,targetRenderedUNC:false};
}
export function beginConstrict({clenchState,grabHoldWon=false,pinArmsTA=false,zone}={}){
  if(!clenchState?.active) return {active:false,reason:'no-active-clench'};
  if(!grabHoldWon) return {active:false,clenchState};
  if(zone!=='head'&&zone!=='torso') throw new RangeError('Constrict zone must be head or torso');
  return {active:true,state:{...clenchState,constricting:true,zone,armsPinned:!!pinArmsTA}};
}
/** Resolve one maintained constriction Shock on the snake's turn.
 * targetWasUNC is the state BEFORE this roll: reaching UNC on this roll does not
 * itself cause cardiac death; the next failed Shock Roll does.
 */
export function constrictTurnTransition({state,grabMaintained=false,targetWasUNC=false,shockFailed=false,resultingShockState=null}={}){
  if(!state?.active||!state.constricting||!grabMaintained) return {active:false,state:state?{...state,active:false,constricting:false,armsPinned:false}:state,shockRequired:false,cardiacDeath:false};
  const shockIndex=state.zone==='head'?7:6;
  const cardiacDeath=!!(targetWasUNC&&shockFailed);
  return {active:!cardiacDeath,state:{...state,targetRenderedUNC:targetWasUNC||resultingShockState==='unconscious'},shockRequired:true,shockIndex,cardiacDeath};
}
export function releaseClench(state){return state?{...state,active:false,constricting:false,armsPinned:false}:state;}

import { effectiveImpact as injuryEffectiveImpact, resolveInjurySequence } from './injury.js';

/** Bestiary same-location secondary Fire trauma (e.g. V'hir Flame).
 * This is a separate injury from the successful weapon strike. Weapon Impact TA
 * never modifies the Fire impact. Normal Compound rules themselves ensure Fire/
 * Frost compound only with Fire/Frost injuries, never with the weapon injury.
 */
export function resolveSameLocationFireFollowup({
  weaponAttackSucceeded=false,location,fireStrikeImpact,fireArmourValue=0,
  existingInjuries=[],compoundD10=null,shockSL=null,currentShockState
}={}){
  if(!weaponAttackSucceeded) return {triggered:false,injury:null};
  if(!location) throw new Error('Secondary Fire trauma requires the weapon strike location');
  if(!Number.isFinite(fireStrikeImpact)||!Number.isFinite(fireArmourValue)) throw new Error('Fire strike impact and Fire AV required');
  const effectiveImpact=injuryEffectiveImpact({strikeImpact:fireStrikeImpact,armourValue:fireArmourValue});
  const injury=resolveInjurySequence({location,effectiveImpact,aspect:'fire',existingInjuries,compoundD10,shockSL,currentShockState,projectile:false});
  return {triggered:true,location,effectiveImpact,injury};
}

/** Dragon Breath readiness/action contract (Bestiary p.388). Age-specific
 * range/impact data are supplied by the creature definition, not hard-coded.
 */
export function dragonBreathReadiness({sl}={}){
  if(sl===undefined||sl===null) return {ready:false,pending:{type:'breath-test'}};
  if(sl===0) return {ready:false,idleRounds:2,impactBonus:0};
  if(sl===1) return {ready:false,idleRounds:1,impactBonus:0};
  if(sl===2) return {ready:true,idleRounds:0,impactBonus:0,mustDischargeNowOrRetest:true};
  if(sl===3) return {ready:true,idleRounds:0,impactBonus:5,mustDischargeNowOrRetest:true};
  throw new RangeError('Breath SL must be CF/F/S/CS');
}
export function dragonBreathAction({ready=false,onOwnIR=true,fromActionTA=false,flying=false,movement='none'}={}){
  if(!ready) return {allowed:false,reason:'breath-not-ready'};
  if(!onOwnIR) return {allowed:false,reason:'own-ir-only'};
  if(fromActionTA) return {allowed:false,reason:'no-action-ta'};
  if(flying) return {allowed:true,time:'1-turn',maxMove:'full'};
  if(movement==='charge'||movement==='half') return {allowed:true,time:'1-turn',maxMove:'half'};
  if(movement==='full'||movement==='double') return {allowed:false,reason:'grounded-half-move-maximum'};
  return {allowed:true,time:'1-turn',maxMove:'half'};
}
export function dragonBreathImpact({distanceFeet,d4,bandModifiers=[],criticalBonus=0,targetOverlap=1}={}){
  if(!Number.isFinite(distanceFeet)||distanceFeet<=0||!Number.isInteger(d4)||d4<1||d4>4) throw new RangeError('Positive distance and d4 1..4 required');
  const band=Math.ceil(distanceFeet/20)-1;
  if(band<0||band>=bandModifiers.length) return {inRange:false,affected:false,band:null,widthFeet:null,strikeImpact:null};
  const widthFeet=(band+1)*5;
  const affected=Number(targetOverlap)>=0.5;
  return {inRange:true,affected,band:band+1,widthFeet,strikeImpact:affected?d4+bandModifiers[band]+criticalBonus:null};
}

/** V'hir contact-fire trigger. Exact random location remains an explicit roll/input. */
export function vhirFireContact({kind,successful=false,zone=null,location=null}={}){
  if(!successful) return {triggered:false};
  if(kind==='weapon-flame'){
    if(!location) throw new Error('Weapon Flame requires the weapon strike location');
    return {triggered:true,locationMode:'same-location',location};
  }
  if(kind==='unarmed-victory'){
    if(!zone) throw new Error('Unarmed Vhir contact requires the body zone used in the test');
    return {triggered:true,locationMode:'random-in-zone',zone,pending:{type:'location-roll',zone}};
  }
  if(kind==='blood-contact'){
    if(location) return {triggered:true,locationMode:'contact-location',location};
    return {triggered:true,locationMode:'contact-location',pending:{type:'contact-location'}};
  }
  throw new RangeError('Unknown Vhir fire-contact kind');
}
