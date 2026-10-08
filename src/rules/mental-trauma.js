import { SL } from './tests.js';

const INTENSITY=['trait','impulse','disorder'];
export function psycheStressState({psycheLevels,intensity='trait',permanent=false,manifested=false}={}){
  return {psycheLevels,intensity,permanent,manifested,weaknessFatigue:manifested?psycheLevels*5:0,manifestDelayMinutes:manifested?0:10};
}
export function addSamePsycheTrait({currentLevels=0,currentIntensity='trait',newLevels=0}={}){
  const i=Math.min(2,Math.max(0,INTENSITY.indexOf(currentIntensity))+1);
  return {psycheLevels:currentLevels+newLevels,intensity:INTENSITY[i]};
}
export function psycheSuppressionRequired(intensity){
  if(intensity==='impulse') return SL.S;
  if(intensity==='disorder') return SL.CS;
  return null;
}
export function psycheStressRecovery({psycheLevels,intensity='trait',permanent=false,sl}={}){
  let next=psycheLevels, nextPermanent=permanent, nextIntensity=intensity;
  if(sl===SL.CF){
    if(!nextPermanent) nextPermanent=true;
    else nextIntensity=INTENSITY[Math.min(2,INTENSITY.indexOf(nextIntensity)+1)];
  } else if(sl===SL.S) next=Math.max(0,next-1);
  else if(sl===SL.CS) next=Math.max(0,next-2);
  else if(sl!==SL.F) throw new RangeError('Psyche recovery SL must be CF/F/S/CS');
  return {psycheLevels:next,intensity:nextIntensity,permanent:nextPermanent,weaknessFatigue:next*5,recovered:next===0};
}
export function psycheRecoverySchedule(d6){
  if(!Number.isInteger(d6)||d6<1||d6>6) throw new RangeError('d6 required');
  return {days:d6,fatiguePenaltyApplies:false};
}

export function auralShockState(levels){
  const n=Math.max(0,levels);
  return {levels:n,weaknessFatigue:n*5,auraTestsAllowed:n===0,forcedAuraTestResult:n>0?'automatic-cf':null,newAttunementsAllowed:n===0,existingAttunementsUsable:n===0};
}
export function auralShockRecovery({levels,sl}={}){
  let next=levels,psycheStressGained=0;
  if(sl===SL.CF) psycheStressGained=1;
  else if(sl===SL.F){}
  else if(sl===SL.S) next=Math.max(0,levels-1);
  else if(sl===SL.CS) next=Math.max(0,levels-2);
  else throw new RangeError('Aural Shock recovery SL must be CF/F/S/CS');
  return {...auralShockState(next),psycheStressGained,recoveryPeriodDays:1,fatiguePenaltyApplies:false,impairmentPenaltyApplies:false};
}
export function spiritDissolution({auralShockLevels,isSpirit=false}={}){
  if(isSpirit) return {dissolved:true,durationDays:auralShockLevels,actionsAllowed:false,physicalIncarnationDestroyed:true,trueFormConcealed:true};
  return {dissolved:auralShockLevels>0,durationDays:null,actionsAllowed:true,physicalIncarnationDestroyed:false,trueFormConcealed:auralShockLevels>0};
}

/** Bridge a Fear/Aberrance result into tracked Psyche Stress without choosing
 * a psyche trait for the player/GM. Trait selection remains an explicit choice. */
export function psycheStressFromFearResult(fearResult,{trait=null}={}){
  const levels=Math.max(0,Number(fearResult?.psycheStress)||0);
  if(levels===0) return {created:false,psycheLevels:0};
  if(!trait) return {created:false,pending:{type:'psyche-trait-choice',psycheLevels:levels},manifestDelayMinutes:10};
  return {created:true,trait,...psycheStressState({psycheLevels:levels,intensity:'trait',permanent:false,manifested:false})};
}

/** p189 expression duration after the causal trigger ends. Trait expression is
 * about 10 minutes; a CF while suppressing an Impulse/Disorder extends it by d6x10. */
export function psycheExpressionDuration({intensity='trait',suppressionSL=null,d6=null}={}){
  const cfExtended=(intensity==='impulse'||intensity==='disorder')&&suppressionSL===SL.CF;
  if(cfExtended){
    if(!Number.isInteger(d6)||d6<1||d6>6) return {pending:{type:'d6-expression-duration'},minutesAfterTrigger:null};
    return {pending:null,minutesAfterTrigger:d6*10,criticalFailureExtension:true};
  }
  return {pending:null,minutesAfterTrigger:10,criticalFailureExtension:false};
}

/** p190 dissolution contract distinguishes embodied beings, astrals with a
 * natural body, and bodyless spirits. */
export function auralShockDissolution({auralShockLevels=0,isSpirit=false,isAstral=false}={}){
  const levels=Math.max(0,auralShockLevels);
  if(levels===0) return {dissolved:false,trueFormConcealed:false};
  if(isSpirit) return {dissolved:true,durationDays:levels,actionsAllowed:false,physicalIncarnationDestroyed:true,trueFormConcealed:true,reembody:null};
  if(isAstral) return {dissolved:true,duration:'until-aural-shock-recovery',actionsAllowed:false,physicalIncarnationDestroyed:false,trueFormConcealed:true,reembody:{immediate:true,result:SL.CF}};
  return {dissolved:true,duration:'until-aural-shock-recovery',actionsAllowed:true,physicalIncarnationDestroyed:false,trueFormConcealed:true,reembody:null};
}

/** p190 Possession Recovery. Awakening hands control to the Spirit Conflict
 * resolver rather than inventing its result here. */
export function possessionRecovery({sl}={}){
  if(sl===SL.CF) return {possessed:true,mute:true,psycheStressGained:2,awakened:false,pending:null,recoveryPeriod:'d6-days'};
  if(sl===SL.F) return {possessed:true,mute:true,psycheStressGained:1,awakened:false,pending:null,recoveryPeriod:'d6-days'};
  if(sl===SL.S) return {possessed:true,mute:true,psycheStressGained:0,awakened:true,pending:{type:'spirit-conflict',bonus:0},recoveryPeriod:null};
  if(sl===SL.CS) return {possessed:true,mute:true,psycheStressGained:0,awakened:true,pending:{type:'spirit-conflict',bonus:20},recoveryPeriod:null};
  throw new RangeError('Possession recovery SL must be CF/F/S/CS');
}
