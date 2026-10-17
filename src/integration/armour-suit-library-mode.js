/** Read-only library classification. Published presets are not inventory objects.
 * A modified suit always loses the narrow app-level layer exception.
 */
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
import {printedSuitLayerPolicy} from './armour-printed-suit-policy.js';
export function classifySuitLibraryEntry({name,articles,modified=false}={}){
 const suit=PRINTED_ARMOUR_SUITS_P113_116.find(s=>s.name===name);
 if(!suit)return {recognized:false,mode:'custom-outfit',exception:false,reason:'Not an exact HMK printed suit'};
 const effectiveArticles=articles===undefined?suit.articles:articles;
 const policy=printedSuitLayerPolicy({name,articles:effectiveArticles,modified});
 return {recognized:true,name:suit.name,page:suit.page,printedEnc:suit.enc,printedWeightLb:suit.weightLb,
  mode:policy.exempt?'published-preset-app-policy':'standard-layer-validation',exception:policy.exempt,
  modified:modified||!Array.isArray(effectiveArticles)||effectiveArticles.length!==suit.articles.length||effectiveArticles.some((a,i)=>a!==suit.articles[i]),
  referenceOnly:true,combatReady:false,bulkPenalty:policy.exempt?null:undefined,
  reason:policy.exempt?'Exact unchanged HMK printed preset: app-level layer exception, not a published rules waiver':policy.reason};
}
export function suitLibraryModes(){return PRINTED_ARMOUR_SUITS_P113_116.map(s=>classifySuitLibraryEntry({name:s.name}));}
