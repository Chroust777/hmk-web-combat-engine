/** HMK printed p.117: verify a player-supplied, inner-to-outer article order.
 * The five columns describe relative positions around one base article.
 * This checker is deliberately strict: it never guesses donning order.
 */
import {ARMOUR_LAYER_COLUMNS} from './armour-layer-reference.js';
import {articleCoversZone,articleCoversZoneLocation,zoneLocations,validateLayerZoneMap} from '../integration/armour-layer-zone-map.js';
const CODE={cloth:'C',leather:'L',padded:'D',quilted:'Q',gambeson:'G',kurbul:'K',scale:'S',mail:'M',plate:'P'};
const FAR=new Set(['cloak','mantle','vest','surcoat','coat','robe','cuisse','cuisses']);
const ZONES=['head','arms','torso','legs'];
const SLOTS=['underFar','underNear','base','overNear','overFar'];
function allowed(token,a,zone,slot){
 const code=CODE[a.material];
 if(slot==='overFar'&&!FAR.has(a.name.toLowerCase().trim()))return false;
 if(token==='•')return false;
 if(token==='[kp]')return ['arms','legs'].includes(zone)&&['K','P'].includes(code);
 return token.includes(code);
}
function checkStack(stack,zone){
 if(stack.length>5)return false;
 if(stack.filter(a=>['D','Q'].includes(CODE[a.material])).length>1)return false;
 if(stack.length<2)return true;
 // Assign all articles to distinct ordered columns of one reference row.
 for(let baseIndex=0;baseIndex<stack.length;baseIndex++){
  const row=ARMOUR_LAYER_COLUMNS.find(r=>r.code===CODE[stack[baseIndex].material]);
  if(!row)continue;
  const rec=(index,previousSlot)=>{
   if(index===stack.length)return true;
   const slots=index===baseIndex?['base']:SLOTS.filter(s=>s!=='base');
   return slots.some(slot=>{
    const pos=SLOTS.indexOf(slot);
    return pos>previousSlot && (slot==='base'||allowed(row[slot],stack[index],zone,slot)) && rec(index+1,pos);
   });
  };
  if(rec(0,-1))return true;
 }
 return false;
}
export function verifyOrderedArmourLayers(articles){
 if(!Array.isArray(articles))throw new TypeError('Expected inner-to-outer article array');
 const errors=[],warnings=[],zones={};
 const ids=new Set();
 for(const a of articles){
  if(!a||typeof a.id!=='string'||ids.has(a.id)||!CODE[a.material]||typeof a.name!=='string'||validateLayerZoneMap(a))errors.push(`Invalid or repeated article ${a?.id??'unknown'}`);
  else ids.add(a.id);
 }
 if(errors.length)return {valid:false,errors,warnings,zones,verifiedOrder:false,combatReady:false};
 for(const zone of ZONES){
  const group=articles.filter(a=>articleCoversZone(a,zone));
  if(!group.length)continue;
  // The printed rule is checked at each covered location: disjoint pieces
  // in one Body Zone are not simultaneous layers (p.117-118).
  const locations={};
  for(const loc of zoneLocations(group,zone)){
   const stack=group.filter(a=>articleCoversZoneLocation(a,zone,loc));
   const legal=checkStack(stack,zone);
   locations[loc]={legal,articleIds:stack.map(a=>a.id)};
   if(!legal)errors.push(`${zone}/${loc}: supplied inner-to-outer order cannot match p.117 table`);
  }
  zones[zone]={locations,articleCount:group.length};
 }
 return {valid:errors.length===0,errors,warnings,zones,verifiedOrder:errors.length===0,combatReady:false};
}
