/** Safe boundary for future character-sheet consumers of HMK armour layers.
 * This does NOT equip armour, compute suit ENC, or connect to Combat.
 * Only a fully compatible evaluator result can expose numerical modifiers.
 */
import {evaluateOrderedArmour} from './armour-layer-evaluation.js';

const validNumber = n => typeof n === 'number' && Number.isFinite(n);

/** Reject invalid/unresolved/malformed results; never coerce null to zero. */
export function gateArmourLayerResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result))
    return Object.freeze({ready:false,status:'invalid',extraEnc:null,bulkPenalty:null,reason:'Missing or malformed evaluation'});
  if (result.status !== 'compatible')
    return Object.freeze({ready:false,status:['invalid','violation','unresolved'].includes(result.status)?result.status:'invalid',extraEnc:null,bulkPenalty:null,reason:'Armour layer evaluation is not compatible'});
  if (!validNumber(result.extraEnc) || !validNumber(result.bulkPenalty) ||
      result.extraEnc < 0 || result.extraEnc % 5 !== 0 ||
      result.bulkPenalty > 0 || result.bulkPenalty % 5 !== 0 ||
      result.errors?.length || result.unresolved?.length)
    return Object.freeze({ready:false,status:'invalid',extraEnc:null,bulkPenalty:null,reason:'Malformed compatible evaluation'});
  return Object.freeze({ready:true,status:'compatible',extraEnc:result.extraEnc,bulkPenalty:result.bulkPenalty,reason:null});
}

/** Explicit opt-in evaluation boundary; safe to call before future integration. */
export function evaluateArmourForConsumer(articles, options={}) {
  return gateArmourLayerResult(evaluateOrderedArmour(articles,options));
}
