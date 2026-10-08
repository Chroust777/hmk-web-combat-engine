/** Conservative HMK p.117 layer diagnostics. An unordered inventory is never certified. */
import {ARMOUR_LAYER_COLUMNS} from './armour-layer-reference.js';
const CODE={cloth:'C',leather:'L',padded:'D',quilted:'Q',gambeson:'G',kurbul:'K',scale:'S',mail:'M',plate:'P'};
const FAR_NAMES=new Set(['cloak','mantle','vest','surcoat','coat','robe','cuisse','cuisses']);
const ZONES=['head','arms','torso','legs'];
const LOCATIONS=new Set(['sk','fa','nk','sh','ua','el','fo','ha','tx','ab','pv','th','kn','ca','ft']);
function options(token,article,zone){
 if(token==='•')return false;
 if(token==='[kp]')return ['arms','legs'].includes(zone)&&['K','P'].includes(CODE[article.material]);
 return token.includes(CODE[article.material]);
}
function plausibleArrangement(group,zone){
 return group.some((base,baseIndex)=>{
  const row=ARMOUR_LAYER_COLUMNS.find(r=>r.code===CODE[base.material]);
  const others=group.filter((_,i)=>i!==baseIndex);
  const slots=['underFar','underNear','overNear','overFar'];
  const search=(remaining,available)=>remaining.length===0||available.some(slot=>remaining.some((a,i)=>
   options(row[slot],a,zone)&&(slot!=='overFar'||(typeof a.name==='string'&&FAR_NAMES.has(a.name.toLowerCase().trim())))&&
   search(remaining.filter((_,j)=>j!==i),available.filter(s=>s!==slot))));
  return search(others,slots);
 });
}
export function validateArmourLayers(articles){
 const errors=[],warnings=[],zoneResults={};
 if(!Array.isArray(articles))return {valid:false,errors:['Input must be an array'],warnings,zoneResults,combatReady:false};
 const seenIds=new Set();
 for(const a of articles){
  if(typeof a?.id!=='string'||!a.id.trim())errors.push(`Missing armour article ID`);
  else if(seenIds.has(a.id.trim()))errors.push(`Duplicate armour article ID ${a.id}`);
  else seenIds.add(a.id.trim());
  if(typeof a?.name!=='string'||!a.name.trim())errors.push(`Invalid armour article name ${a?.id??'unknown'}`);
  if(Array.isArray(a?.coveredLocations)&&new Set(a.coveredLocations).size!==a.coveredLocations.length)errors.push(`Duplicate anatomical location in ${a?.id??'unknown'}`);
  if(Array.isArray(a?.bodyZones)&&new Set(a.bodyZones).size!==a.bodyZones.length)errors.push(`Duplicate body zone in ${a?.id??'unknown'}`);
  if(!CODE[a?.material]||!Array.isArray(a?.bodyZones)||!Array.isArray(a?.coveredLocations)||!a.coveredLocations.length||!a.bodyZones.length||a.bodyZones.some(z=>!ZONES.includes(z))||a.coveredLocations.some(l=>!LOCATIONS.has(l)))errors.push(`Invalid armour article ${a?.id??'unknown'}`);
 }
 if(errors.length)return {valid:false,errors,warnings,zoneResults,combatReady:false};
 for(const zone of ZONES){
  const group=articles.filter(a=>a.bodyZones.includes(zone));
  if(!group.length)continue;
  // The p.117 restriction applies separately to body zone AND location. Articles
  // on distinct locations must not be forced into the same five layer stack.
  const locations=[...new Set(group.flatMap(a=>a.coveredLocations))];
  const locationResults={};
  for(const location of locations){
   const stack=group.filter(a=>a.coveredLocations.includes(location));
   if(stack.length>5)errors.push(`${zone}/${location}: exceeds five layers`);
   if(stack.filter(a=>['D','Q'].includes(CODE[a.material])).length>1)warnings.push(`${zone}/${location}: multiple padded/quilted articles; review required`);
   const plausible=plausibleArrangement(stack,zone);
   if(!plausible)warnings.push(`${zone}/${location}: no plausible table-column arrangement; review Bulk exception or prohibited articles`);
   locationResults[location]={articleCount:stack.length,plausible,verifiedOrder:false};
  }
  zoneResults[zone]={articleCount:group.length,plausible:Object.values(locationResults).every(r=>r.plausible),verifiedOrder:false,locations:locationResults};
 }
 return {valid:errors.length===0&&warnings.length===0,errors,warnings,zoneResults,combatReady:false};
}
