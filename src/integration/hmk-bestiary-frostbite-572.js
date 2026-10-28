/** HMK 1.2 p.185: Frostbite in freezing air. Evidence-first calculation for
 * ONE VERIFIED animal location. Other exposed locations require their own
 * adjudication; the result is not extrapolated to an entire creature.
 * No dice are rolled here, and unverified weather cannot be inferred.
 */
const fail=(msg)=>{throw Error(msg)};
const whole=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export function frostbitePeriod572(windD20){
 if(!whole(windD20,1,20))fail('Vítr Frostbite: skutečný d20 (1–20).');
 return windD20<=3?120:windD20<=17?60:30;
}
export function frostbiteDuration572(durationD20){
 if(!whole(durationD20,1,20))fail('Frostbite: skutečný d20 délky expozice (1–20).');
 return durationD20<=12?60:durationD20<=17?120:durationD20<=19?180:240;
}
/** GM confirms actual site AV including any worn protection. A creature's
 * printed innate F AV cannot silently vanish. p.185: AV0 every period,
 * AV1–3 every second period, AV4+ not exposed to frostbite damage. */
export function resolveBeastFrostbite572({windD20,durationD20,locationAV,innateAV,freezingAirConfirmed=false,siteExposedConfirmed=false}={}){
 if(freezingAirConfirmed!==true||siteExposedConfirmed!==true)fail('Frostbite vyžaduje potvrzený mrazivý vzduch a exponovanou konkrétní lokaci (HMK 185).');
 if(!whole(locationAV,0,100)||!whole(innateAV,-100,100)||locationAV<Math.max(0,innateAV))
  fail('AV lokality nesmí být nižší než doložená přirozená ochrana tvora proti Frost.');
 const periodMinutes=frostbitePeriod572(windD20),durationMinutes=frostbiteDuration572(durationD20);
 const injuryLevel=locationAV===0?Math.floor(durationMinutes/periodMinutes):
   locationAV<=3?Math.floor(durationMinutes/(2*periodMinutes)):0;
 if(injuryLevel>5)fail('Frostbite přesahuje IL5: tento výsledek vyžaduje samostatné rozhodnutí GM.');
 return {format:'hmk-animal-frostbite-572-v1',windD20,durationD20,locationAV,innateAV,
  freezingAirConfirmed:true,siteExposedConfirmed:true,periodMinutes,durationMinutes,injuryLevel,
  sourcePage:185};
}
