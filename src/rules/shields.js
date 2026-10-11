import {SL} from './tests.js';
import {weaponDamageImpact, weaponDamageResult} from './weapon-damage.js';
/** Passive Deflect trait, p98. Trigger only after a Missile Attack has struck from front/shield side. */
export function passiveDeflect({missileStruck=false,fromFrontOrShieldSide=false,deflectTN=0,d10}={}){
  if(!missileStruck||!fromFrontOrShieldSide||deflectTN<=0) return {applicable:false,deflected:false};
  const deflected=d10<=deflectTN; return {applicable:true,deflected,weaponDamageCheck:deflected};
}
/** Shield Missile Block option, p133. Eligibility precedes its Melee defence roll. */
export function shieldMissileBlockEligibility({optionEnabled=false,missileSucceeded=false,aware=false,distance,pointBlankRange,threatenedInMelee=false,ignoringThreatsForRound=false,alreadyUsedThisRound=false}={}){
  if(!optionEnabled||!missileSucceeded||!aware||alreadyUsedThisRound) return false;
  if(!(distance>pointBlankRange/2)) return false;
  return !threatenedInMelee||ignoringThreatsForRound;
}
export function resolveShieldMissileBlock({sl,roll}={}){
  if(sl===SL.CS) return {targetStruck:false,missileDeflected:true,shieldStruck:false,mishap:null};
  if(sl===SL.S) return {targetStruck:false,missileDeflected:false,shieldStruck:true,weaponDamageCheck:true,mishap:null};
  if(sl===SL.CF) return {targetStruck:true,missileDeflected:false,shieldStruck:false,mishap:roll%10===0?'fumble':'stumble'};
  return {targetStruck:true,missileDeflected:false,shieldStruck:false,mishap:null};
}
export function shieldMissileBlockModifier(shieldMod=0){return -20+shieldMod;}
/** Shield Wall option, p133. Adjacency/non-shield-side geometry is supplied by map/UI. */
export function shieldWallBenefits({optionEnabled=false,hasShield=false,isBuckler=false,allyOnNonShieldSide=false,allyHasShield=false,inCloseWithAlly=false,prone=false,movedFeet=0,halfMoveFeet=0}={}){
  const active=optionEnabled&&hasShield&&!isBuckler&&allyOnNonShieldSide&&allyHasShield&&inCloseWithAlly&&!prone&&movedFeet<=halfMoveFeet;
  return {active,shieldModBonus:active?10:0,deflectBonus:active?2:0};
}
export function shieldWallMove({participantIRs=[]}={}){
  if(!participantIRs.length) return {allowed:false};
  return {allowed:true,difficult:true,maxRate:'half',moveAtIR:Math.min(...participantIRs)};
}

/** Complete passive Deflect contact: a successful deflection causes no injury
 * but immediately checks Weapon Damage against the shield (p.98 -> p.191).
 * The shield modifier is the core +5 target-is-shield adjustment. */
export function resolvePassiveDeflectContact({missileStruck=false,fromFrontOrShieldSide=false,deflectTN=0,d10,strikeImpact,shieldWQ}={}){
  const deflect=passiveDeflect({missileStruck,fromFrontOrShieldSide,deflectTN,d10});
  if(!deflect.deflected) return {...deflect,shieldDamage:null};
  if(!Number.isFinite(strikeImpact)||!Number.isFinite(shieldWQ)) return {...deflect,pending:{type:'shield-weapon-damage',requires:['strikeImpact','shieldWQ']},shieldDamage:null};
  const damageImpact=weaponDamageImpact({strikeImpact,targetIsShield:true});
  return {...deflect,damageImpact,shieldDamage:weaponDamageResult({impact:damageImpact,currentWQ:shieldWQ})};
}
