/** Read-only anatomical diagnostic for printed suits, HMK pp.116-118.
 * Does not infer donning order or certify Bulk/combat legality. */
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
import {PRINTED_ARMOUR_ARTICLES_P118} from '../rules/armour-articles-printed.js';
import {reconcileSuitArticles} from './armour-suit-article-crosswalk.js';
import {BODY_ZONES,zoneLocations,articleCoversZoneLocation} from './armour-layer-zone-map.js';
export function auditSuitAnatomicalStacks({suits=PRINTED_ARMOUR_SUITS_P113_116,articles=PRINTED_ARMOUR_ARTICLES_P118}={}){
 const links=reconcileSuitArticles({suits,articles});
 const byId=new Map(articles.map(a=>[a.id,a]));
 const results=suits.map(suit=>{
  const linksForSuit=links.entries.filter(e=>e.suit===suit.name);
  const matched=linksForSuit.filter(e=>e.status==='matched').map(e=>byId.get(e.articleId));
  const zones={};
  for(const zone of BODY_ZONES){
   const locations={};
   for(const loc of zoneLocations(matched,zone)){
    const stack=matched.filter(a=>articleCoversZoneLocation(a,zone,loc));
    locations[loc]={count:stack.length,articles:stack.map(a=>`${a.material} ${a.name}`),exceedsFive:stack.length>5,multipleDQ:stack.filter(a=>['padded','quilted'].includes(a.material)).length>1};
   }
   zones[zone]={articleCount:matched.filter(a=>a.bodyZones.includes(zone)).length,maxSimultaneousLayers:Math.max(0,...Object.values(locations).map(v=>v.count)),locations};
  }
  return {name:suit.name,page:suit.page,matched:matched.length,total:linksForSuit.length,zones,excessLocations:Object.entries(zones).flatMap(([zone,z])=>Object.entries(z.locations).filter(([,v])=>v.exceedsFive).map(([loc])=>`${zone}/${loc}`)),multipleDQLocations:Object.entries(zones).flatMap(([zone,z])=>Object.entries(z.locations).filter(([,v])=>v.multipleDQ).map(([loc])=>`${zone}/${loc}`)),verifiedOrder:false,combatReady:false};
 });
 return {results,allMatched:results.every(r=>r.matched===r.total),allCombatReady:false};
}
