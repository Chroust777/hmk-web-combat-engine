/** HMK World of Kèthîra p.166: Evade lowers Missile EML throughout
 * the action's round and one following round, unless the evader is stunned.
 * The modifier is derived ONLY from a committed spatial Evade event.
 */
import {validateEncounterSequence} from './encounter-turn-sequence.js';
const validIndex=v=>Number.isSafeInteger(v)&&v>=0&&v<=20;
export function liveSpatialEvade(sequence,{targetId,targetState}={}){
 const seq=validateEncounterSequence(sequence);
 if(typeof targetId!=='string'||!seq.order.includes(targetId))throw Error('Neplatný skutečný cíl Evade');
 if(!targetState||typeof targetState.shock!=='string')throw Error('Chybí trvalý Shock stav cíle Evade');
 const evidence=(seq.spatialEvents??[]).filter(e=>e.actorId===targetId&&e.projection?.action==='evade'&&
  e.round<=seq.round&&e.round>=seq.round-1).at(-1);
 if(!evidence||targetState.shock==='STN'||['INC','UNC','KIA'].includes(targetState.shock))
  return {active:false,index:null,sourceEventId:null};
 const penalty=evidence.projection.evadingMissilePenalty;
 if(!Number.isSafeInteger(penalty)||penalty>0||penalty%5!==0||!validIndex(-penalty/5))
  throw Error('Doložená Evade událost nemá platný Effective Dodge Index');
 return {active:true,index:-penalty/5,sourceEventId:evidence.id,source:'HMK p.166, committed Evade'};
}
