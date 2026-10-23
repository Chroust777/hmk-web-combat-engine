/** HMK v1.2 pp.269–270 — Profusion alters FAILED imbibing rolls only.
 * Pure rule table, no extra dice, independent clocks, or new inventory.
 * Exemptions: Quiescence, Physic, Poison and all Applied elixirs.
 */
import {successLevel,SL} from '../rules/tests.js';
import {STARTING_ELIXIR_NAMES} from './hmk-creation-starting-elixirs.js';
export const PROFUSION_UNITS=Object.freeze([
 Object.freeze([5,0]),Object.freeze([3,5,8,0]),
 Object.freeze([2,3,5,7,8,0]),Object.freeze([2,3,4,5,7,8,9,0])
]);
export const PROFUSION_EXEMPT=new Set(['Quiescence','Physic','Poison']);
// Each entry is transcribed from HMK v1.2 pp.271–274.  This is *classification*,
// not permission to ingest an elixir without its independently implemented effect.
// Applied elixirs occupy the printed 35-entry catalogue but never contribute.
const APPLIED_NAMES=new Set(['Acid','Eruption','Fumebomb','Mending','Object Aegis','Weakness']);
const INSTANT_IMBIBED_NAMES=new Set(['Dreamwalk','Healing','Mindsalve','Physic','Poison','Sustenance','Wakefulness']);
export const CANONICAL_PROFUSION_PROFILE=Object.freeze(Object.fromEntries(
 STARTING_ELIXIR_NAMES.map(name=>[name,Object.freeze({name,
  use:APPLIED_NAMES.has(name)?'Applied':'Imbibed',
  duration:APPLIED_NAMES.has(name)||INSTANT_IMBIBED_NAMES.has(name)?'Instantaneous':'Temporary',
  exempt:APPLIED_NAMES.has(name)||['Quiescence','Physic','Poison'].includes(name),
 })])));
export function canonicalProfusionProfile(name){
 const result=Object.hasOwn(CANONICAL_PROFUSION_PROFILE,name)?CANONICAL_PROFUSION_PROFILE[name]:null;
 if(!result)throw Error('Profusion: elixír není kanonickým katalogovým záznamem');
 return result;
}

export function contributesProfusion(name,use='Imbibed',duration=null,stillUnderEffect=true){
 const printed=Object.hasOwn(CANONICAL_PROFUSION_PROFILE,name)?CANONICAL_PROFUSION_PROFILE[name]:null;
 // Prevent contradictory caller metadata from making an Applied dose count.
 // Unverified invented recipes have no implicit duration or activation.
 if(printed){
  if(printed.exempt||printed.use!==use||duration!==null&&duration!==printed.duration)return false;
  return printed.duration==='Temporary'||printed.duration==='Instantaneous'&&stillUnderEffect===true;
 }
 return duration!==null&&use==='Imbibed'&&!PROFUSION_EXEMPT.has(name)&&
  (duration==='Temporary'||duration==='Instantaneous'&&stillUnderEffect===true);
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
