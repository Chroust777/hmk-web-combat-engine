/** Read-only, fail-closed diagnostics for every printed suit. Never equips articles. */
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
import {PRINTED_ARMOUR_ARTICLES_P118} from '../rules/armour-articles-printed.js';
import {reconcileSuitArticles} from './armour-suit-article-crosswalk.js';
import {validateArmourLayers} from '../rules/armour-layer-validator.js';
export function auditPrintedSuitLayers({suits=PRINTED_ARMOUR_SUITS_P113_116,articles=PRINTED_ARMOUR_ARTICLES_P118}={}){
 const crosswalk=reconcileSuitArticles({suits,articles});
 const byId=new Map(articles.map(a=>[a.id,a]));
 const results=suits.map(suit=>{
  const parts=crosswalk.entries.filter(e=>e.suit===suit.name);
  const issues=parts.filter(e=>e.status!=='matched').map(e=>`${e.label}: ${e.status}`);
  const items=parts.filter(e=>e.status==='matched').map((e,i)=>({...byId.get(e.articleId),id:`${suit.name}::${i}::${e.articleId}`}));
  const layer=validateArmourLayers(items);
  return {name:suit.name,page:suit.page,articleCount:parts.length,matched:items.length,issues:[...issues,...layer.errors],warnings:layer.warnings,plausible:layer.errors.length===0&&layer.warnings.length===0,verifiedOrder:false,combatReady:false,printedEnc:suit.enc,printedWeightLb:suit.weightLb};
 });
 return {suitCount:results.length,allMatched:results.every(r=>r.matched===r.articleCount),allCombatReady:false,results};
}
