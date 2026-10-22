/** HMK v1.2 pp.269–270 — Profusion alters FAILED imbibing rolls only.
 * Pure rule table, no extra dice, independent clocks, or new inventory.
 * Exemptions: Quiescence, Physic, Poison and all Applied elixirs.
 */
import {successLevel,SL} from '../rules/tests.js';
export const PROFUSION_UNITS=Object.freeze([
 Object.freeze([5,0]),Object.freeze([3,5,8,0]),
 Object.freeze([2,3,5,7,8,0]),Object.freeze([2,3,4,5,7,8,9,0])
]);
export const PROFUSION_EXEMPT=new Set(['Quiescence','Physic','Poison']);
export function contributesProfusion(name,use='Imbibed',duration='Temporary',stillUnderEffect=true){
 if(use!=='Imbibed'||PROFUSION_EXEMPT.has(name))return false;
 return duration==='Temporary'||(duration==='Instantaneous'&&stillUnderEffect);
}
export function classifyProfusionImbibing(d100,ml,otherActive=0){
 if(!Number.isSafeInteger(d100)||d100<1||d100>100||!Number.isSafeInteger(ml)||ml<1||ml>1000||
  !Number.isSafeInteger(otherActive)||otherActive<0)throw Error('Profusion: d100, ML nebo počet aktivních elixírů je neplatný');
 const original=successLevel(d100,ml),unit=d100%10;
 const crucial=otherActive>=4||PROFUSION_UNITS[Math.min(otherActive,3)].includes(unit);
 const adjusted=original===SL.F&&crucial?SL.CF:original;
 return {original:['CF','F','S','CS'][original],adjusted:['CF','F','S','CS'][adjusted],
  profusionCF:original===SL.F&&adjusted===SL.CF,otherActive,unit,
  cfUnits:otherActive>=4?'all failures':[...PROFUSION_UNITS[otherActive]]};
}
