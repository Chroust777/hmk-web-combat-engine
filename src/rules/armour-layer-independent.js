/** HMK p.117 independent restriction checks. A zone can require multiple
 * distinct base checks because pieces overlap at different anatomical sites.
 * Never treat an entire body zone as one five-column stack.
 */
import {verifyOrderedArmourLayers} from './armour-layer-order.js';
import {evaluateArmourBulk} from './armour-layer-bulk.js';
import {BODY_ZONES,zoneLocations,articleCoversZone,articleCoversZoneLocation} from '../integration/armour-layer-zone-map.js';

export function auditIndependentLayerChecks(articles){
 const strict=verifyOrderedArmourLayers(articles);
 const bulk=evaluateArmourBulk(articles);
 const zones={};
 for(const zone of BODY_ZONES){
  const members=articles.filter(a=>articleCoversZone(a,zone));
  if(!members.length)continue;
  const checks=zoneLocations(members,zone).map(location=>{
   const stack=members.filter(a=>articleCoversZoneLocation(a,zone,location));
   const result=verifyOrderedArmourLayers(stack);
   return {location,articleIds:stack.map(a=>a.id),strictLegal:result.valid,errors:result.errors};
  });
  zones[zone]={checks,strictLegal:checks.every(c=>c.strictLegal),bulkPenalty:bulk.bulkByZone[zone]??0,
   bulkArticleId:bulk.bulkArticleByZone[zone]??null};
 }
 return {strictLegal:strict.valid,bulkLegal:bulk.valid,bulkPenalty:bulk.bulkPenalty,
  zones,errors:bulk.errors,verifiedOrder:bulk.verifiedOrder,combatReady:false};
}
