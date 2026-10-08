/** HMK printed p.118 conditional article ENC and p.113–116 suit ENC reconciliation.
 * 'a': wearing three or more marked arm articles produces ENC 5 once.
 * 'p': Perception penalty, NOT encumbrance; magnitude not encoded here.
 * Worn suit ENC excludes ordinary carried gear and any GM-added outer layer.
 */
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
import {PRINTED_ARMOUR_ARTICLES_P118} from '../rules/armour-articles-printed.js';
import {reconcileSuitArticles} from './armour-suit-article-crosswalk.js';
export function auditSuitEnc({suits=PRINTED_ARMOUR_SUITS_P113_116,articles=PRINTED_ARMOUR_ARTICLES_P118}={}){
 const crosswalk=reconcileSuitArticles({suits,articles});
 const byId=new Map(articles.map(a=>[a.id,a]));
 const results=suits.map(suit=>{
  const matches=crosswalk.entries.filter(e=>e.suit===suit.name);
  const unmatched=matches.filter(e=>e.status!=='matched');
  const items=matches.filter(e=>e.status==='matched').map(e=>byId.get(e.articleId));
  const invalid=items.filter(a=>!(Number.isSafeInteger(a.enc)&&a.enc>=0)&&a.enc!=='a'&&a.enc!=='p');
  const baseEnc=items.filter(a=>Number.isSafeInteger(a.enc)).reduce((sum,a)=>sum+a.enc,0);
  const conditionalArmCount=items.filter(a=>a.enc==='a').length;
  const conditionalArmEnc=conditionalArmCount>=3?5:0;
  const computedEnc=baseEnc+conditionalArmEnc;
  const exact=unmatched.length===0&&invalid.length===0&&computedEnc===suit.enc;
  const preciseWeightLb=items.reduce((sum,a)=>sum+a.weightLb,0);
  return {name:suit.name,parts:matches.length,matched:items.length,unmatched:unmatched.map(x=>x.label),invalidEnc:invalid.map(x=>x.id),
   baseEnc,conditionalArmCount,conditionalArmEnc,computedEnc,printedEnc:suit.enc,encMatches:exact,
   preciseArticleWeightLb:Math.round(preciseWeightLb*10)/10,printedEstimatedSuitWeightLb:suit.weightLb,
   weightIsEstimate:true,perceptionArticles:items.filter(a=>a.enc==='p').map(a=>a.id),
   computedPerceptionPenalty:items.filter(a=>a.enc==='p').reduce((sum,a)=>sum+(a.perceptionPenalty??0),0),
   printedPerceptionPenalty:suit.per,
   perceptionPenaltyResolved:items.every(a=>a.enc!=='p'||[5,10].includes(a.perceptionPenalty)),
   perceptionMatches:items.every(a=>a.enc!=='p'||[5,10].includes(a.perceptionPenalty))&&items.filter(a=>a.enc==='p').reduce((sum,a)=>sum+(a.perceptionPenalty??0),0)===suit.per};
 });
 return {count:results.length,allEncMatched:results.every(x=>x.encMatches),allPerceptionMatched:results.every(x=>x.perceptionMatches),allMatched:results.every(x=>!x.unmatched.length),results};
}
