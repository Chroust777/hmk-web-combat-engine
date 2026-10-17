/** HMK v1.2 pp.117–118. Necessary, order-independent layering feasibility.
 * This never claims that an unknown physical order is legal; it proves when
 * NO ordering could be legal, or whether exactly one C/D Bulk exception
 * can make some arrangement possible. This avoids GM guesses and false Bulk.
 */
import {ARMOUR_LAYER_COLUMNS} from '../rules/armour-layer-reference.js';
import {BODY_ZONES,articleCoversZone,articleCoversZoneLocation,zoneLocations} from './armour-layer-zone-map.js';
const MATERIAL={cloth:'C',leather:'L',padded:'D',quilted:'Q',gambeson:'G',kurbul:'K',scale:'S',mail:'M',plate:'P'};
const COLUMN=['underFar','underNear','base','overNear','overFar'];
const OUTER=new Set(['cloak','mantle','vest','surcoat','coat','robe','cuisse','cuisses']);
const material=x=>MATERIAL[String(x||'').toLowerCase()]||null;
function allowed(token,code,zone){
 if(token==='•'||!code)return false;
 if(token==='[kp]')return (zone==='arms'||zone==='legs')&&(code==='K'||code==='P');
 return token.includes(code);
}
function lastOuterEligible(a){
 const short=String(a.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(',')[0].trim();
 // HMK permits these ARTICLE types, not every similarly worded name.
 return OUTER.has(short)||[...OUTER].some(s=>short.endsWith(' '+s));
}
function possibleColumns(stack,zone){
 if(!stack.length)return true;
 if(stack.length>5)return false;
 for(const row of ARMOUR_LAYER_COLUMNS){
  const base=stack.find(a=>a.code===row.code);
  if(!base)continue;
  const others=stack.filter(a=>a.id!==base.id);
  function assign(i,used){
   if(i===others.length)return true;
   const a=others[i];
   for(let col of [0,1,3,4]){
    if(used.has(col)||!allowed(row[COLUMN[col]],a.code,zone))continue;
    if(col===4&&!lastOuterEligible(a))continue;
    if(assign(i+1,new Set([...used,col])))return true;
   }
   return false;
  }
  if(assign(0,new Set()))return true;
 }
 return false;
}
function orderedColumns(stack,zone){
 if(!stack.length)return true;
 for(const row of ARMOUR_LAYER_COLUMNS){
  for(let base=0;base<stack.length;base++){
   if(stack[base].code!==row.code)continue;
   function place(i,last){
    if(i===stack.length)return true;
    const a=stack[i];
    for(let col=0;col<5;col++){
     if(col<=last||(i===base)!==(col===2)||!allowed(row[COLUMN[col]],a.code,zone))continue;
     if(col===4&&!lastOuterEligible(a))continue;
     if(place(i+1,col))return true;
    }
    return false;
   }
   if(place(0,-1))return true;
  }
 }
 return false;
}
function everyPhysicalOrderWorks(articles,zone){
 if(articles.length>5||articles.filter(a=>a.code==='D'||a.code==='Q').length>1)return false;
 const locs=zoneLocations(articles,zone);
 function enumerate(prefix,rest){
  if(!rest.length)return locs.every(loc=>orderedColumns(prefix.filter(a=>articleCoversZoneLocation(a,zone,loc)),zone));
  for(let i=0;i<rest.length;i++)if(!enumerate([...prefix,rest[i]],[...rest.slice(0,i),...rest.slice(i+1)]))return false;
  return true;
 }
 return enumerate([],articles);
}
function possibleZone(arr,zone){
 if(arr.length>5||arr.filter(a=>a.code==='D'||a.code==='Q').length>1)return false;
 return zoneLocations(arr,zone).every(loc=>possibleColumns(arr.filter(a=>articleCoversZoneLocation(a,zone,loc)),zone));
}
export function assessArmourFeasibility(articles=[]){
 const zones={};
 for(const zone of BODY_ZONES){
  const covered=articles.filter(a=>articleCoversZone(a,zone));
  const valid=covered.length===0||possibleZone(covered,zone);
  let exceptions=[];
  if(!valid&&covered.length<=6){
   for(const a of covered){
    if(a.code!=='C'&&a.code!=='D')continue;
    if(possibleZone(covered.filter(x=>x.id!==a.id),zone))exceptions.push(a.id);
   }
  }
  const status=valid?'can-arrange':exceptions.length?'bulk-exception-possible':'forbidden';
  const orderInvariant=valid&&everyPhysicalOrderWorks(covered,zone);
  const locations={};
  for(const loc of zoneLocations(covered,zone)){
   const stack=covered.filter(a=>articleCoversZoneLocation(a,zone,loc));
   const localPossible=possibleColumns(stack,zone);
   const localExtraAllowed=exceptions.some(id=>stack.some(a=>a.id===id)&&possibleColumns(stack.filter(a=>a.id!==id),zone));
   locations[loc]={count:stack.length,materialPossible:localPossible,bulkCandidatePossible:localExtraAllowed,
    prohibited:stack.length>5&&!localExtraAllowed||!localPossible&&!localExtraAllowed,
    articleNames:stack.map(a=>a.name),articleIds:stack.map(a=>a.id)};
  }
  zones[zone]={status,articleIds:covered.map(a=>a.id),articleNames:covered.map(a=>a.name),
   count:covered.length,bulkCandidateIds:exceptions,orderInvariant,locations};
 }
 return {zones,status:Object.values(zones).some(z=>z.status==='forbidden')?'forbidden':
  Object.values(zones).some(z=>z.status==='bulk-exception-possible')?'exception-possible':'can-arrange',
  note:'Pouze průkaz možnosti podle materiálů; není dokladem skutečného fyzického pořadí.'};
}
export function prepareArmourForFeasibility(pairs=[]){
 return pairs.map(({item,article})=>({id:item.id,name:article.name,code:material(article.material),
  coveredLocations:article.coveredLocations,layerZoneByLocation:article.layerZoneByLocation}));
}
