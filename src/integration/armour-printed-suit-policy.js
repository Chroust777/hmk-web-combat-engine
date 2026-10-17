/** App-level exception, NOT a waiver stated by HMK: preserve three exact
 * printed p.116 presets without requiring the custom-outfit layer validator.
 * The exception cannot be inherited by edited suits or article collections.
 */
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
const NAMES=Object.freeze(['Mail Hauberk','Kûrbúl & Mail','Plate & Mail']);
export const PRINTED_SUIT_LAYER_EXCEPTIONS=Object.freeze(NAMES.map(name=>{
 const s=PRINTED_ARMOUR_SUITS_P113_116.find(x=>x.name===name);
 if(!s||s.page!==116)throw new Error('Missing HMK printed preset: '+name);
 return Object.freeze({name,page:116,articles:Object.freeze([...s.articles]),enc:s.enc,weightLb:s.weightLb,reason:'Exact published HMK p.116 preset; app policy, not an explicit HMK rules waiver'});
}));
/** Only exact, unmodified named presets qualify. Never accept name alone
 * when an article list is supplied: modifications use normal layer checks. */
export function printedSuitLayerPolicy({name,articles,modified=false}={}){
 const preset=PRINTED_SUIT_LAYER_EXCEPTIONS.find(x=>x.name===name);
 if(!preset)return Object.freeze({exempt:false,mode:'standard-layer-validation',reason:'Not one of the three published presets'});
 if(modified||!Array.isArray(articles)||articles.length!==preset.articles.length||articles.some((a,i)=>a!==preset.articles[i]))
  return Object.freeze({exempt:false,mode:'standard-layer-validation',reason:'Not an exact unmodified printed preset'});
 return Object.freeze({exempt:true,mode:'published-preset-app-policy',sourcePage:116,printedEnc:preset.enc,printedWeightLb:preset.weightLb,bulkPenalty:null,reason:preset.reason});
}
