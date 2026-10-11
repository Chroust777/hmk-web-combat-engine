import { SL } from './tests.js';
import { SHOCK_STATE } from './shock.js';
export function courseHRDelta(sl){ if(sl===SL.CF)return -2;if(sl===SL.F)return -1;if(sl===SL.S)return 1;if(sl===SL.CS)return 2;throw new RangeError('Course SL'); }
export function extendedShockEML({healingBase,hr,fatigue=0,physicianBonus=0}={}){return healingBase*hr-fatigue+physicianBonus;}
export function physicianExtendedShockBonus(stars){return Math.max(0,stars)*5;}
export function resolveExtendedShockCourse({state,hr,sl}={}){
 const nextHR=hr+courseHRDelta(sl);
 if(nextHR<=0)return {hr:nextHR,active:false,state:SHOCK_STATE.KIA,dead:true};
 if(nextHR>=6)return {hr:nextHR,active:false,state:SHOCK_STATE.NONE,dead:false};
 return {hr:nextHR,active:true,state,dead:false};
}
export function comaInitialHR({locationShock,injuryLevel}={}){return 12-locationShock-injuryLevel;}
export function comaEML({healingBase,initialHR,weaknessFatigue=0,restfulSheltered=true,arcaneBonus=0}={}){return healingBase*initialHR-weaknessFatigue+(restfulSheltered?0:-20)+arcaneBonus;}
export function resolveComaCourse({currentHR,sl}={}){
 const nextHR=currentHR+courseHRDelta(sl);
 if(nextHR<=0)return {hr:nextHR,active:false,dead:true,recovered:false};
 if(nextHR>=6)return {hr:nextHR,active:false,dead:false,recovered:true};
 return {hr:nextHR,active:true,dead:false,recovered:false};
}
export function comaRecoveryWeariness(days){ return Math.floor(days/5)*5; }

export const RECOVERY_ROUNDS_PER_HOUR=12*60;
export const RECOVERY_ROUNDS_PER_DAY=RECOVERY_ROUNDS_PER_HOUR*24;
export function scheduleExtendedShockCourse({currentRound,combatantId}={}){
 return {type:'extended-shock-course',dueRound:currentRound+4*RECOVERY_ROUNDS_PER_HOUR,dueIR:null,combatantId,data:{}};
}
export function scheduleComaCourse({currentRound,combatantId,d10Days}={}){
 if(!Number.isInteger(d10Days)||d10Days<1||d10Days>10) throw new RangeError('Coma course requires d10Days 1..10');
 return {type:'coma-course',dueRound:currentRound+d10Days*RECOVERY_ROUNDS_PER_DAY,dueIR:null,combatantId,data:{periodDays:d10Days}};
}
/** Coordinate the two independent p179 branches. A coma survives the end of
 * Extended Shock; ending Extended Shock therefore cannot by itself make a
 * comatose patient conscious.
 */
export function extendedShockTransition({state,hr,sl,comaActive=false,currentRound,combatantId}={}){
 const course=resolveExtendedShockCourse({state,hr,sl});
 const events=course.active?[scheduleExtendedShockCourse({currentRound,combatantId})]:[];
 const effectiveState=course.dead?SHOCK_STATE.KIA:(comaActive?SHOCK_STATE.UNC:course.state);
 return {...course,effectiveState,comaActive:!!comaActive,events};
}
export function comaTransition({currentHR,sl,currentRound,combatantId,nextD10Days=null,comaDaysElapsed=0}={}){
 const course=resolveComaCourse({currentHR,sl});
 if(course.dead) return {...course,state:SHOCK_STATE.KIA,events:[],wearinessFatigue:0};
 if(course.recovered) return {...course,state:SHOCK_STATE.NONE,events:[],wearinessFatigue:comaRecoveryWeariness(comaDaysElapsed)};
 if(!Number.isInteger(nextD10Days)) return {...course,state:SHOCK_STATE.UNC,pending:{type:'coma-course-period-d10'},events:[]};
 return {...course,state:SHOCK_STATE.UNC,pending:null,events:[scheduleComaCourse({currentRound,combatantId,d10Days:nextD10Days})]};
}
