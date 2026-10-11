/** HMK printed p.117 Bulk exception. Input order is inner-to-outer.
 * One Cloth/Padded article violating restrictions may be tolerated per Body Zone.
 * A tolerated article costs -5 for each affected zone, independent of STR/ENC.
 * Conservative: ambiguous non-violating order is never inferred.
 */
import {verifyOrderedArmourLayers} from './armour-layer-order.js';
import {articleCoversZone} from '../integration/armour-layer-zone-map.js';
const ZONES=['head','arms','torso','legs'];
export function evaluateArmourBulk(articles){
 if(!Array.isArray(articles))throw new TypeError('Expected ordered armour articles');
 const baseline=verifyOrderedArmourLayers(articles);
 if(baseline.valid)return {valid:true,bulkPenalty:0,bulkByZone:{},bulkArticleByZone:{},errors:[],verifiedOrder:true,combatReady:false};
 // Invalid input, duplicates or unknown material cannot be cured by a Bulk exception.
 if(baseline.errors.some(e=>e.startsWith('Invalid or repeated article')))return {valid:false,bulkPenalty:0,bulkByZone:{},bulkArticleByZone:{},errors:baseline.errors,verifiedOrder:false,combatReady:false};
 const bulkByZone={},bulkArticleByZone={},errors=[];
 for(const zone of ZONES){
  const zoneArticles=articles.filter(a=>articleCoversZone(a,zone));
  if(!zoneArticles.length)continue;
  const strict=verifyOrderedArmourLayers(zoneArticles);
  if(strict.valid)continue;
  const candidates=zoneArticles.filter(a=>a.material==='cloth'||a.material==='padded').filter(a=>{
   const without=zoneArticles.filter(b=>b!==a);
   return verifyOrderedArmourLayers(without).valid;
  });
  if(candidates.length===0){errors.push(`${zone}: no legal single Cloth/Padded Bulk exception`);continue;}
  // More than one possible offender means we cannot attribute the penalty reliably.
  if(candidates.length>1){errors.push(`${zone}: ambiguous Bulk offender (${candidates.map(a=>a.id).join(', ')})`);continue;}
  bulkByZone[zone]=-5;
  bulkArticleByZone[zone]=candidates[0].id;
 }
 return {valid:errors.length===0,bulkPenalty:Object.values(bulkByZone).reduce((a,b)=>a+b,0),bulkByZone,bulkArticleByZone,errors,verifiedOrder:errors.length===0,combatReady:false};
}
