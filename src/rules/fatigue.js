/** HMK pp176-177 physical fatigue. Values are points and normally accrue in 5s. */
export function personalFatigue(encumbrance=0){
 if(!Number.isFinite(encumbrance)) throw new TypeError('Encumbrance required');
 return encumbrance+5;
}
export function totalFatigue({windedness=0,weariness=0,weakness=0}={}){
 for(const x of [windedness,weariness,weakness]) if(!Number.isFinite(x)||x<0) throw new RangeError('Non-negative fatigue required');
 return windedness+weariness+weakness;
}
/** Fatigue is a global Success-Test penalty except where the PDF explicitly exempts it. */
export function fatigueTestPenalty({fatigue=0,testKind='success',activeSoulInSpiritWorld=false}={}){
 if(!Number.isFinite(fatigue)||fatigue<0) throw new RangeError('Non-negative fatigue required');
 if(testKind==='endurance-secondary-roll'||testKind==='secondary-modifier'||testKind==='secondary-roll') return 0;
 if(testKind==='spirit'&&activeSoulInSpiritWorld) return 0;
 return -fatigue;
}
export function fatigueAccrual({amount,enduranceSRApplicable=false,enduranceSRSuccess=false}={}){
 if(!Number.isFinite(amount)||amount<0) throw new RangeError('Non-negative fatigue amount required');
 return Math.max(0,amount-(enduranceSRApplicable&&enduranceSRSuccess?5:0));
}
export function windednessRecovery({current,restMinutes,restUsedThisHour=false}={}){
 if(restUsedThisHour||restMinutes<10) return {remaining:current,recovered:0,consumesHourlyRest:false};
 const recovered=Math.min(5,current);return {remaining:current-recovered,recovered,consumesHourlyRest:true};
}
export function wearinessRecovery({current,restHours=0,sleepHours=0,fourHourRestUsedToday=false,eightHourSleepUsedToday=false}={}){
 let recovered=0,usedRest=false,usedSleep=false;
 if(restHours>=4&&!fourHourRestUsedToday){recovered+=5;usedRest=true;}
 if(sleepHours>=8&&!eightHourSleepUsedToday){recovered+=15;usedSleep=true;}
 recovered=Math.min(current,recovered);
 return {remaining:current-recovered,recovered,consumesDailyFourHourRest:usedRest,consumesDailyEightHourSleep:usedSleep};
}
export function weaknessRecovery(){return {automatic:false,rule:'reduce only as causal condition improves'};}
