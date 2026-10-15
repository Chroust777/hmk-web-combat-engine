/** HMK v1.2 pp.117–118: conservative, source-verified starter armour placement.
 * This pure helper changes only unsaved generator proposals. A piece which
 * cannot be verified or legally combined is retained as carried gear.
 * A single global layerSlot often cannot express the same coat/vest being a
 * different relative layer in distinct locations; the audited evaluator then
 * uses each location's material rules and the explicit physical layerOrder.
 */
import {resolveOwnedArmourArticle} from './live-combat-armour.js';
import {evaluateOrderedArmour} from './armour-layer-evaluation.js';

const COLUMN_SLOTS=['base','underNear','overNear','underFar','overFar'];
function evaluatedWornOrder(worn){
 const articles=[];
 const slotByArticleId={};
 const ids=new Set();
 for(const item of worn){
  const result=resolveOwnedArmourArticle(item);
  if(!result.ready || ids.has(result.article?.id))return null;
  ids.add(result.article.id);
  articles.push({...result.article,layerOrder:item.layerOrder});
  if(item.layerSlot)slotByArticleId[result.article.id]=item.layerSlot;
 }
 const outcome=evaluateOrderedArmour(articles,{slotByArticleId});
 return outcome.status==='compatible' && Number.isSafeInteger(outcome.bulkPenalty) && Number.isSafeInteger(outcome.extraEnc)?outcome:null;
}
function validateWornOrder(worn){
 return evaluatedWornOrder(worn)!==null;
}

/** Pick explicit columns only when they are independently verifiable for all
 * locations of each article. Null means location-dependent / inferred by
 * p.117 evaluation, not an unknown physical layering order.
 */
function chooseSlots(worn){
 // Exceptional C/D items are legal because of their explicit p.117 Bulk
 // exception, NOT because they occupy a normal material column. Do not invent
 // a normal explicit slot for them in persisted character inventory.
 const exceptions=new Set(evaluatedWornOrder(worn)?.zoneReports.filter(z=>z.bulkArticleId).map(z=>z.bulkArticleId)??[]);
 const ranked=worn.map(item=>{
  const result=resolveOwnedArmourArticle(item);
  if(result.ready&&exceptions.has(result.article.id))return [];
  const possible=[];
  for(const slot of COLUMN_SLOTS){
   item.layerSlot=slot;
   if(validateWornOrder(worn))possible.push(slot);
  }
  item.layerSlot=null;
  return possible;
 });
 // First attempt maximal explicit columns. Falling back to null keeps valid
 // multi-zone garments legal without inventing per-location slot data.
 function search(i){
  if(i===worn.length)return validateWornOrder(worn);
  const resolved=resolveOwnedArmourArticle(worn[i]);
  if(resolved.ready&&exceptions.has(resolved.article.id)){
   worn[i].layerSlot=null;return search(i+1);
  }
  for(const value of [...ranked[i],null]){
   worn[i].layerSlot=value;
   if(search(i+1))return true;
  }
  worn[i].layerSlot=null;
  return false;
 }
 if(!search(0))worn.forEach(x=>x.layerSlot=null);
}

/** In-place arrangement of newly proposed kit items; no persistent writes. */
export function arrangeStartingArmour(items){
 if(!Array.isArray(items))throw TypeError('Starting kit must be an array');
 const armour=items.filter(x=>x.snapshot?.category==='armor' && x.slot==='worn');
 const accepted=[];
 for(const candidate of armour){
  // Only a validated catalogue article may be donned automatically.
  const checked=resolveOwnedArmourArticle(candidate);
  if(!checked.ready){
   candidate.slot='carried';candidate.layerOrder=null;candidate.layerSlot=null;
   candidate.bulkExceptionZones=[];candidate.condition+=' · Nenasaženo: neověřená zbrojní položka';
   continue;
  }
  // Insert at every physical inner-to-outer position. Prefer a fully legal
  // order without Bulk, but permit automatically verified C/D exceptions.
  let placement=null,bestPenalty=-Infinity;
  const previous=[...accepted];
  for(let insertion=previous.length;insertion>=0;insertion--){
   const attempt=[...previous.slice(0,insertion),candidate,...previous.slice(insertion)];
   for(let j=0;j<attempt.length;j++){attempt[j].layerOrder=j;attempt[j].layerSlot=null;}
   const report=evaluatedWornOrder(attempt);
   if(report&&report.bulkPenalty>bestPenalty){placement=attempt;bestPenalty=report.bulkPenalty;
    if(bestPenalty===0)break;}
  }
  if(!placement){
   candidate.slot='carried';candidate.layerOrder=null;candidate.layerSlot=null;
   candidate.bulkExceptionZones=[];candidate.condition+=' · Nenasaženo: nepřípustné vrstvení HMK';
   for(let j=0;j<accepted.length;j++)accepted[j].layerOrder=j;
  }else{accepted.splice(0,accepted.length,...placement);}
 }
 // Keep the physical inner-to-outer order authoritative; assign only safe
 // whole-article columns, because one article may cross several Body Zones.
 if(accepted.length)chooseSlots(accepted);
 if(!validateWornOrder(accepted))throw Error('Nepodařilo se ověřit počáteční zbrojní vrstvy');
 const result=evaluatedWornOrder(accepted);
 return {wornArmourCount:accepted.length,carriedArmourCount:armour.length-accepted.length,
  startingBulkPenalty:result?.bulkPenalty??0,automaticBulkZones:result?.zoneReports.filter(z=>z.bulkArticleId).map(z=>z.zone)??[]};
}
