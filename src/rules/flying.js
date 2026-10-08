export function flyingRateAllowed(rate){return rate==='half'||rate==='full'||rate==='double';}
export function flyingStumbleFailure({currentRate,halfMoveFeet}={}){
 if(currentRate==='double')return {nextRate:'full',altitudeLossFt:0};
 if(currentRate==='full')return {nextRate:'half',altitudeLossFt:0};
 if(currentRate==='half')return {nextRate:'half',altitudeLossFt:halfMoveFeet};
 throw new RangeError('Flying rate must be half/full/double');
}
export function groundedFlyerMove({flyingMove,explicitWalkingMove=null}={}){return explicitWalkingMove??flyingMove/10;}
export function wingInjuryEffect({minor=0,serious=0,grievous=0}={}){
 return {impairsAllTestsAndMove:(minor+serious)>0,grounded:grievous>=1,falls:grievous>=2};
}
export function diveMovement(){return {rate:'double',impactBonusFromTrait:true};}
