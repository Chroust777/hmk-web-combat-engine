/** HMK printed p.117, strict read-only ordered layer evaluator.
 * A selected Bulk exception is a GM decision, not an implicit permission.
 * This module never equips items, alters character storage or certifies suit totals.
 */
import {ARMOUR_LAYER_COLUMNS} from '../rules/armour-layer-reference.js';
const MATERIAL={cloth:'C',leather:'L',padded:'D',quilted:'Q',gambeson:'G',kurbul:'K',scale:'S',mail:'M',plate:'P'};
const ZONES={head:['sk','fa','nk'],arms:['sh','ua','el','fo','ha'],torso:['tx','ab','pv'],legs:['th','kn','ca','ft']};
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
function relevantZones(article){
 if(article.bodyZones)return article.bodyZones;
 return Object.entries(ZONES).filter(([,locs])=>article.coveredLocations.some(loc=>locs.includes(loc))).map(([zone])=>zone);
}
/** @param {Array} articles Explicit {id,name,material,coveredLocations,bodyZones?,layerOrder}.
 * @param {object} options bulkExceptionByZone: {head:id,arms:id,torso:id,legs:id}; opt-in only.
 */
export function evaluateOrderedArmour(articles,{bulkExceptionByZone={},slotByArticleId={}}={}){
 const errors=[],unresolved=[],zoneReports=[],locationReports=[];
 if(!Array.isArray(articles))return {status:'invalid',errors:['Articles must be an array'],unresolved,zoneReports,locationReports,bulkPenalty:0,extraEnc:0,combatReady:false};
 if(!bulkExceptionByZone||typeof bulkExceptionByZone!=='object'||Array.isArray(bulkExceptionByZone))errors.push('Invalid Bulk selection');
 if(!slotByArticleId||typeof slotByArticleId!=='object'||Array.isArray(slotByArticleId))errors.push('Invalid slot selection');
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
  if(!Array.isArray(a.coveredLocations)||!a.coveredLocations.length||new Set(a.coveredLocations).size!==a.coveredLocations.length||a.coveredLocations.some(l=>!Object.values(ZONES).some(z=>z.includes(l))))errors.push(`Invalid coverage ${a.id}`);
  if(a.bodyZones!==undefined&&(!Array.isArray(a.bodyZones)||!a.bodyZones.length||new Set(a.bodyZones).size!==a.bodyZones.length||a.bodyZones.some(z=>!Object.hasOwn(ZONES,z))))errors.push(`Invalid body zones ${a.id}`);
  if(!Number.isSafeInteger(a.layerOrder)||a.layerOrder<0)unresolved.push(`Missing physical order ${a.id}`);
 }
 if(bulkExceptionByZone&&typeof bulkExceptionByZone==='object'&&!Array.isArray(bulkExceptionByZone))for(const zone of Object.keys(bulkExceptionByZone)){
  if(!Object.hasOwn(ZONES,zone))errors.push(`Unknown Bulk zone ${zone}`);
 }
 if(slotByArticleId&&typeof slotByArticleId==='object'&&!Array.isArray(slotByArticleId))for(const [id,slot] of Object.entries(slotByArticleId)){
  if(!seen.has(id)||!SLOTS.includes(slot))errors.push(`Invalid slot assignment ${id}`);
 }
 if(errors.length)return {status:'invalid',errors,unresolved,zoneReports,locationReports,bulkPenalty:0,extraEnc:0,combatReady:false};
 let bulkPenalty=0,extraEnc=0;
 const extraEncIds=new Set();
 for(const [zone,locs] of Object.entries(ZONES)){
  const zoneArticles=prepared.filter(a=>relevantZones(a).includes(zone));
  const candidate=bulkExceptionByZone[zone];
  if(candidate!==undefined && (typeof candidate!=='string'||!zoneArticles.some(a=>a.id===candidate&&['C','D'].includes(a.code))))errors.push(`Invalid Bulk exception in ${zone}`);
  const excluded=zoneArticles.filter(a=>a.id===candidate);
  const standard=zoneArticles.filter(a=>a.id!==candidate);
  let originalViolations=zoneArticles.filter(a=>['D','Q'].includes(a.code)).length>1;
  for(const loc of locs){
   const full=prepared.filter(a=>a.coveredLocations.includes(loc));
   if(full.length>5)originalViolations=true;
   if(full.length&&full.every(a=>Number.isSafeInteger(a.layerOrder))&&new Set(full.map(a=>a.layerOrder)).size===full.length){
    if(!matchesFor([...full].sort((a,b)=>a.layerOrder-b.layerOrder),zone).length)originalViolations=true;
   }
  }
  const dq=standard.filter(a=>['D','Q'].includes(a.code));
  const zoneErrors=[];
  if(dq.length>1)zoneErrors.push('More than one D/Q in Body Zone');
  for(const location of locs){
   const all=prepared.filter(a=>a.coveredLocations.includes(location));
   if(!all.length)continue;
   const normal=all.filter(a=>a.id!==candidate);
   if(all.length>5 && !(candidate&&normal.length<=5))zoneErrors.push(`${location}: exceeds five layers`);
   if(normal.length>5)zoneErrors.push(`${location}: exceeds five ordinary layers`);
   const orderValid=normal.every(a=>Number.isSafeInteger(a.layerOrder))&&new Set(normal.map(a=>a.layerOrder)).size===normal.length;
   if(!orderValid){unresolved.push(`${zone}/${location}: unresolved physical order`);locationReports.push({zone,location,status:'unresolved'});continue;}
   const ordered=[...normal].sort((a,b)=>a.layerOrder-b.layerOrder);
   const possible=matchesFor(ordered,zone);
   const matches=possible.filter(m=>m.every(entry=>slotByArticleId[entry.id]===undefined||slotByArticleId[entry.id]===entry.slot));
   if(!matches.length)zoneErrors.push(`${location}: forbidden material order or incompatible explicit slot`);
   else {
    const minExtra=Math.min(...matches.map(m=>m.reduce((n,s)=>n+s.extraEnc,0)));
    const encSignatures=new Set(matches.map(m=>m.filter(s=>s.extraEnc).map(s=>s.id).sort().join('|')));
    if(encSignatures.size>1)unresolved.push(`${zone}/${location}: ambiguous ENC from last over column; supply slotByArticleId`);
    else for(const item of matches[0])if(item.extraEnc)extraEncIds.add(item.id);
   }
   locationReports.push({zone,location,status:matches.length?'compatible':'violation',matches:matches.length,articleIds:ordered.map(a=>a.id)});
  }
  if(candidate!==undefined){
   // Exception may only be applied when the nominated C/D article actually violates
   // a printed restriction; a GM cannot arbitrarily declare a compliant piece bulky.
   if(zoneErrors.length)errors.push(`${zone}: selected Bulk exception does not repair remaining restrictions`);
   if(!originalViolations)errors.push(`${zone}: Bulk exception selected without a proven violation`);
   const affected=locs.some(l=>excluded.some(a=>a.coveredLocations.includes(l)));
   if(!affected)errors.push(`${zone}: Bulk article does not cover this zone`);
   if(affected)bulkPenalty-=5;
  } else errors.push(...zoneErrors.map(e=>`${zone}: ${e}`));
  zoneReports.push({zone,articleIds:zoneArticles.map(a=>a.id),bulkArticleId:candidate??null,issues:zoneErrors});
 }
 for(const id of extraEncIds)extraEnc+=5;
 return {status:errors.length?'violation':unresolved.length?'unresolved':'compatible',errors,unresolved,zoneReports,locationReports,bulkPenalty,extraEnc,combatReady:false,
  notes:['Reference-only: printed suit ENC and conditional article ENC must be checked separately','Bulk requires GM approval and one eligible violating C/D item per affected Body Zone']};
}
