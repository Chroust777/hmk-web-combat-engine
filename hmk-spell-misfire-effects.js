/** Shared HMK v1.2 p.203 Spell Misfire table and p.189-190 aftermath.
 * Pure classification; GM supplies the d100. This is not a spell-effect
 * resolver and it never writes storage or invents dice.
 */
const check=(v,msg)=>{if(!v)throw Error(msg)};
const whole=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
export function classifySpellMisfire(d100,cl){
 check(whole(d100,1,100)&&whole(cl,1,20),'HMK Misfire vyžaduje fyzický d100 a ověřený spell CL');
 let kind,extraFatigue=0,psycheStress=0,auralShock=0;
 if(d100<=15){kind='minor';extraFatigue=5*cl;}
 else if(d100<=25){kind='serious';extraFatigue=5*cl+10;}
 else if(d100<=30){kind='grievous';extraFatigue=5*cl+20;}
 else if(d100<=50){kind='distortion';psycheStress=1;}
 else if(d100<=60){kind='confusion';psycheStress=2;}
 else if(d100<=80){kind='minor-principle-leak';auralShock=1;}
 else if(d100<=90){kind='serious-principle-leak';auralShock=3;}
 else if(d100<=99){kind='grievous-principle-leak';auralShock=5;}
 else kind='total-release';
 return Object.freeze({kind,extraFatigue,psycheStress,auralShock,
  crucial:d100%5===0,totalRelease:d100===100,
  category:d100<=30?'form-failure':d100===100?'total-release':'mental-trauma'});
}
/** Mutates only the already-cloned combat state; a storage commit is external. */
export function applyMisfireCombatTrauma(state,misfire){
 if(misfire.psycheStress){
  check(whole(state?.morale?.psycheStress,0,99999),'Psyche Stress není v autoritativním Combat State');
  state.morale.psycheStress+=misfire.psycheStress;
 }
 if(misfire.auralShock){
  check(whole(state?.fatigue?.otherWeakness,0,99999),'Aural Shock nemá autoritativní Fatigue State');
  state.fatigue.otherWeakness+=5*misfire.auralShock;
 }
}
/** Mutates only the already-cloned mage's arcane state. */
export function applyMisfireArcaneTrauma(arc,misfire,eventId){
 check(arc&&typeof eventId==='string'&&eventId.length>0,'Chybí autoritativní Arcane a ID');
 if(misfire.auralShock){
  const prior=arc.auralShockLevels??0;
  check(whole(prior,0,99)&&prior+misfire.auralShock<=99,'Aural Shock nemá ověřený limit');
  arc.auralShockLevels=prior+misfire.auralShock;
 }
 if(misfire.psycheStress){
  check(!arc.activeMisfireWarp&&!arc.pendingPsycheTraitChoice,
   'Již existuje nedokončená Psyche warpage / volba traumatu');
  arc.activeMisfireWarp={kind:misfire.kind,sourceEventId:eventId,
   psycheStress:misfire.psycheStress,until:'complete-psyche-stress-recovery',
   auraFailureExtraCriticalDigits:[3,5,8,0],
   reasonFailureExtraCriticalDigits:misfire.kind==='confusion'?[3,5,8,0]:[]};
  arc.pendingPsycheTraitChoice={sourceEventId:eventId,levels:misfire.psycheStress};
 }
}
