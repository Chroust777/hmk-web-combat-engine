import { SL } from './tests.js';
import { resolveInjurySequence } from './injury.js';

export function areaEffectiveImpact(strikeImpact, areaAV){ return strikeImpact-areaAV; }
export function evadeAreaShock({shockIndex,dodgeSL}){
  const reduction=dodgeSL===SL.CS?2:dodgeSL===SL.S?1:0;
  return {shockIndex:Math.max(0,shockIndex-reduction),prone:true};
}
export function areaEvadeShockModifier(dodgeSL){ return dodgeSL===SL.CS?-2:dodgeSL===SL.S?-1:0; }

/** Area Fire/Frost skips Injury step 1, uses Area AV, Location Shock 6,
 * and applies a prior Evade Dodge success directly to resulting SHK index. */
export function resolveAreaHit({strikeImpact,areaAV=0,aspect='fire',evadeDodgeSL=null,existingInjuries=[],compoundD10=null,shockSL=null,currentShockState}={}){
  const eff=areaEffectiveImpact(strikeImpact,areaAV);
  const location={id:'area',location:'area',zone:'area',area:true,locationShock:6,bleedingClass:0,triangleModifier:null};
  const shockIndexModifier=evadeDodgeSL==null?0:areaEvadeShockModifier(evadeDodgeSL);
  const injury=resolveInjurySequence({location,effectiveImpact:eff,aspect,existingInjuries,compoundD10,shockSL,currentShockState,shockIndexModifier});
  return {strikeImpact,areaAV,effectiveImpact:eff,evade:{used:evadeDodgeSL!=null,dodgeSL:evadeDodgeSL,shockIndexModifier,prone:evadeDodgeSL!=null},injury};
}
