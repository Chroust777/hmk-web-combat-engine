/** HMK printed p.117, strict read-only ordered layer evaluator.
 * A selected Bulk exception is a GM decision, not an implicit permission.
 * This module never equips items, alters character storage or certifies suit totals.
 */
import {ARMOUR_LAYER_COLUMNS} from '../rules/armour-layer-reference.js';
import {BODY_ZONES,validateLayerZoneMap,articleCoversZone,zoneLocations,articleCoversZoneLocation} from './armour-layer-zone-map.js';
const MATERIAL={cloth:'C',leather:'L',padded:'D',quilted:'Q',gambeson:'G',kurbul:'K',scale:'S',mail:'M',plate:'P'};
const SLOTS=['underFar','underNear','base','overNear','overFar'];
const LAST=new Set(['cloak','mantle','vest','surcoat','coat','robe','cuisse','cuisses']);
const code=x=>MATERIAL[String(x||'').toLowerCase()];
const normalizeName=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().split(',')[0];
function tokenAllows(token,material,zone){
 if(token==='•')return false;
 if(token==='[kp]')return (zone==='arms'||zone==='legs')&&(material==='K'||material==='P');
 return token.includes(material);
}
function matchesFor(stack,zone){
 if(stack.length===0)return [[]];
 const results=[];
 for(const row of ARMOUR_LAYER_COLUMNS){
  for(let base=0;base<stack.length;base++){
   if(stack[base].code!==row.code)continue;
   const search=(i,lastSlot,used,assign)=>{
    if(i===stack.length){results.push(assign);return;}
    const article=stack[i];
    for(let slot=0;slot<5;slot++){
     if(slot<=lastSlot||used.has(slot)||(i===base)!==(slot===2))continue;
     if(!tokenAllows(row[SLOTS[slot]],article.code,zone))continue;
     if(slot===4&&!LAST.has(normalizeName(article.name)))continue;
     search(i+1,slot,new Set([...used,slot]),[...assign,{id:article.id,slot:SLOTS[slot],extraEnc:slot===4&&['D','Q'].includes(article.code)?5:0}]);
    }
   };
   search(0,-1,new Set(),[]);
  }
 }
 return results;
}
/** @param {Array} articles Explicit {id,name,material,coveredLocations,bodyZones?,layerOrder}.
 * @param {object} options bulkExceptionByZone: {head:id,arms:id,torso:id,legs:id}; opt-in only.
 */
export function evaluateOrderedArmour(articles,{bulkExceptionByZone={},slotByArticleId={},slotByZoneLocation={}}={}){
 const errors=[],unresolved=[],zoneReports=[],locationReports=[];
 if(!Array.isArray(articles))return {status:'invalid',errors:['Articles must be an array'],unresolved,zoneReports,locationReports,bulkPenalty:0,extraEnc:0,combatReady:false};
 if(!bulkExceptionByZone||typeof bulkExceptionByZone!=='object'||Array.isArray(bulkExceptionByZone))errors.push('Invalid Bulk selection');
 if(!slotByArticleId||typeof slotByArticleId!=='object'||Array.isArray(slotByArticleId))errors.push('Invalid slot selection');
 if(!slotByZoneLocation||typeof slotByZoneLocation!=='object'||Array.isArray(slotByZoneLocation))errors.push('Invalid location slot selection');
 const seen=new Set();
 // Reject malformed external records before dereferencing fields or spreading values.
 if(articles.some(a=>!a||typeof a!=='object'||Array.isArray(a)))
  return {status:'invalid',errors:['Each article must be an object'],unresolved,zoneReports,locationReports,bulkPenalty:0,extraEnc:0,combatReady:false};
 const prepared=articles.map(a=>({...a,code:code(a.material)}));
 for(const a of prepared){
  if(typeof a.id!=='string'||!a.id.trim())errors.push('Missing ID');
  else if(seen.has(a.id.trim()))errors.push(`Duplicate ID ${a.id}`);
  else seen.add(a.id.trim());
  if(typeof a.name!=='string'||!a.name.trim()||!a.code)errors.push(`Invalid name/material ${a.id}`);
  const zoneError=validateLayerZoneMap(a);
  if(zoneError)errors.push(`${zoneError} ${a.id}`);
  if(!Number.isSafeInteger(a.layerOrder)||a.layerOrder<0)unresolved.push(`Missing physical order ${a.id}`);
 }
 if(bulkExceptionByZone&&typeof bulkExceptionByZone==='object'&&!Array.isArray(bulkExceptionByZone))for(const zone of Object.keys(bulkExceptionByZone)){
  if(!BODY_ZONES.includes(zone))errors.push(`Unknown Bulk zone ${zone}`);
 }
 if(slotByArticleId&&typeof slotByArticleId==='object'&&!Array.isArray(slotByArticleId))for(const [id,slot] of Object.entries(slotByArticleId)){
  if(!seen.has(id)||!SLOTS.includes(slot))errors.push(`Invalid slot assignment ${id}`);
 }
 if(slotByZoneLocation&&typeof slotByZoneLocation==='object'&&!Array.isArray(slotByZoneLocation))for(const [zone,locations] of Object.entries(slotByZoneLocation)){
  if(!BODY_ZONES.includes(zone)||!locations||typeof locations!=='object'||Array.isArray(locations)){errors.push(`Invalid location slot zone ${zone}`);continue;}
  for(const [loc,assignments] of Object.entries(locations)){
   if(!assignments||typeof assignments!=='object'||Array.isArray(assignments)){errors.push(`Invalid location slot map ${zone}/${loc}`);continue;}
   for(const [id,slot] of Object.entries(assignments)){
    const article=prepared.find(a=>a.id===id);
    if(!article||!SLOTS.includes(slot)||!articleCoversZoneLocation(article,zone,loc))errors.push(`Invalid location slot assignment ${zone}/${loc}/${id}`);
   }
  }
 }
 if(errors.length)return {status:'invalid',errors,unresolved,zoneReports,locationReports,bulkPenalty:0,extraEnc:0,combatReady:false};
 let bulkPenalty=0,extraEnc=0;
 const encPossibilities=new Map(); // per article: whether any location uses overFar
 for(const zone of BODY_ZONES){
  const locs=zoneLocations(prepared,zone);
  const zoneArticles=prepared.filter(a=>articleCoversZone(a,zone));
  const candidate=bulkExceptionByZone[zone];
  if(candidate!==undefined && (typeof candidate!=='string'||!zoneArticles.some(a=>a.id===candidate&&['C','D'].includes(a.code))))errors.push(`Invalid Bulk exception in ${zone}`);
  const excluded=zoneArticles.filter(a=>a.id===candidate);
  const standard=zoneArticles.filter(a=>a.id!==candidate);
  const dqViolation=zoneArticles.filter(a=>['D','Q'].includes(a.code)).length>1;
  let originalViolations=dqViolation;
  // Count distinct articles in the whole zone, not the largest local stack.
  // One nominated C/D Bulk article can be the sole over-limit exception.
  if(zoneArticles.length>5)originalViolations=true;
  let candidateInViolation=dqViolation&&excluded.some(a=>a.code==='D');
  if(zoneArticles.length>5 && excluded.length)candidateInViolation=true;
  for(const loc of locs){
   const full=zoneArticles.filter(a=>articleCoversZoneLocation(a,zone,loc));
   if(full.length>5){originalViolations=true;if(full.some(a=>a.id===candidate))candidateInViolation=true;}
   if(full.length&&full.every(a=>Number.isSafeInteger(a.layerOrder))&&new Set(full.map(a=>a.layerOrder)).size===full.length){
    if(!matchesFor([...full].sort((a,b)=>a.layerOrder-b.layerOrder),zone).length){
     originalViolations=true;
     if(full.some(a=>a.id===candidate))candidateInViolation=true;
    }
   }
  }
  const dq=standard.filter(a=>['D','Q'].includes(a.code));
  const zoneErrors=[];
  if(zoneArticles.length>5 && !(candidate && standard.length<=5))zoneErrors.push('More than five articles in Body Zone');
  if(standard.length>5)zoneErrors.push('More than five ordinary articles in Body Zone');
  if(dq.length>1)zoneErrors.push('More than one D/Q in Body Zone');
  for(const location of locs){
   const all=zoneArticles.filter(a=>articleCoversZoneLocation(a,zone,location));
   if(!all.length)continue;
   const normal=all.filter(a=>a.id!==candidate);
   if(all.length>5 && !(candidate&&normal.length<=5))zoneErrors.push(`${location}: exceeds five layers`);
   if(normal.length>5)zoneErrors.push(`${location}: exceeds five ordinary layers`);
   const orderValid=normal.every(a=>Number.isSafeInteger(a.layerOrder))&&new Set(normal.map(a=>a.layerOrder)).size===normal.length;
   if(!orderValid){unresolved.push(`${zone}/${location}: unresolved physical order`);locationReports.push({zone,location,status:'unresolved'});continue;}
   const ordered=[...normal].sort((a,b)=>a.layerOrder-b.layerOrder);
   const possible=matchesFor(ordered,zone);
   const localSlots=slotByZoneLocation?.[zone]?.[location]??{};
   const matches=possible.filter(m=>m.every(entry=>(slotByArticleId[entry.id]===undefined||slotByArticleId[entry.id]===entry.slot)&&(localSlots[entry.id]===undefined||localSlots[entry.id]===entry.slot)));
   if(!matches.length)zoneErrors.push(`${location}: forbidden material order or incompatible explicit slot`);
   else {
    // A D/Q article incurs +5 ENC once if used in overFar at ANY location.
    // Track all possible values without choosing an arbitrary local assignment.
    for(const article of ordered.filter(a=>['D','Q'].includes(a.code))){
     const possibilities=new Set(matches.map(m=>m.some(x=>x.id===article.id&&x.slot==='overFar')));
     const prior=encPossibilities.get(article.id)??new Set([false]);
     const combined=new Set();
     for(const was of prior)for(const now of possibilities)combined.add(was||now);
     encPossibilities.set(article.id,combined);
    }
   }
   locationReports.push({zone,location,status:matches.length?'compatible':'violation',matches:matches.length,articleIds:ordered.map(a=>a.id)});
  }
  // Each location is checked independently as in the Obris example p.117.
  // The +5 ENC applies once per article, not once per covered location.
  if(candidate!==undefined){
   // Exception may only be applied when the nominated C/D article actually violates
   // a printed restriction; a GM cannot arbitrarily declare a compliant piece bulky.
   if(zoneErrors.length)errors.push(`${zone}: selected Bulk exception does not repair remaining restrictions`);
   if(!originalViolations)errors.push(`${zone}: Bulk exception selected without a proven violation`);
   if(!candidateInViolation)errors.push(`${zone}: Bulk article is not involved in any proven violation`);
   const affected=locs.some(l=>excluded.some(a=>articleCoversZoneLocation(a,zone,l)));
   if(!affected)errors.push(`${zone}: Bulk article does not cover this zone`);
   if(affected)bulkPenalty-=5;
  } else errors.push(...zoneErrors.map(e=>`${zone}: ${e}`));
  zoneReports.push({zone,articleIds:zoneArticles.map(a=>a.id),bulkArticleId:candidate??null,issues:zoneErrors});
 }
 for(const [id,possibilities] of encPossibilities){
  if(possibilities.size>1)unresolved.push(`Ambiguous extra ENC for article ${id}; supply slotByZoneLocation`);
  else if(possibilities.has(true))extraEnc+=5;
 }
 return {status:errors.length?'violation':unresolved.length?'unresolved':'compatible',errors,unresolved,zoneReports,locationReports,bulkPenalty:errors.length?0:unresolved.length?null:bulkPenalty,extraEnc:errors.length?0:unresolved.length?null:extraEnc,combatReady:false,
  notes:['Reference-only: printed suit ENC and conditional article ENC must be checked separately','Bulk requires GM approval and one eligible violating C/D item per affected Body Zone']};
}
