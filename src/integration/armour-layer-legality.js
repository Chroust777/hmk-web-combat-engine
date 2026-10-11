import { ARMOUR_LAYER_COLUMNS } from '../rules/armour-layer-reference.js';
import {BODY_ZONES,validateLayerZoneMap,articleCoversZone,zoneLocations,articleCoversZoneLocation} from './armour-layer-zone-map.js';

// HMK p.117: a material order is not an inventory order. The caller must
// explicitly supply an inner-to-outer order for each overlapping location.
const CODE={cloth:'C',leather:'L',padded:'D',quilted:'Q',gambeson:'G',kurbul:'K',scale:'S',mail:'M',plate:'P'};
const LAST_OVER=new Set(['cloak','mantle','vest','surcoat','coat','robe','cuisse','cuisses']);
const layerSlots=['underFar','underNear','base','overNear','overFar'];
const tokens=t=>t==='•'?[]:t.replace(/[\[\] ]/g,'').toUpperCase().split('');
const byCode=new Map(ARMOUR_LAYER_COLUMNS.map(x=>[x.code,x]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function permitted(slot,material,article,zone){
 if(!tokens(slot).includes(material))return false;
 if(slot==='[kp]' && !['arms','legs'].includes(zone))return false;
 if(article?.isLastOver && !LAST_OVER.has(norm(article.name).split(',')[0].trim()))return false;
 return true;
}
function candidateFits(row,ordered,zone){
 // Select one prominent base article, place every other article in a unique
 // printed column; physical inner-to-outer order must agree with column order.
 const bases=[];
 for(let b=0;b<ordered.length;b++){
  if(row.code!==ordered[b].code)continue;
  const slots=layerSlots.filter(s=>s!=='base');
  const search=(i,used,chosen)=>{
   if(i===ordered.length){bases.push(chosen);return;}
   if(i===b){search(i+1,used,[...chosen,{id:ordered[i].id,slot:'base'}]);return;}
   for(const s of slots){const idx=layerSlots.indexOf(s);
    if(used.has(s)|| (i<b&&idx>=2) || (i>b&&idx<=2))continue;
    const token=row[s];
    if(!permitted(token,ordered[i].code,ordered[i],zone))continue;
    if(s==='overFar'&&!LAST_OVER.has(norm(ordered[i].name).split(',')[0].trim()))continue;
    if(token==='[kp]'&&!['arms','legs'].includes(zone))continue;
    const prev=chosen.filter(c=>c.slot!=='base');
    if(prev.length && layerSlots.indexOf(prev[prev.length-1].slot)>=idx)continue;
    search(i+1,new Set([...used,s]),[...chosen,{id:ordered[i].id,slot:s}]);
   }
  };
  search(0,new Set(),[]);
 }
 return bases;
}
/** Read-only, strict p.117 validator for an explicitly ordered outfit.
 * Input articles: {id,name,material,coveredLocations,layerOrder}.
 * layerOrder is an integer inner-to-outer ordinal; absence is unresolved.
 * No bulk exception is silently granted.
 */
export function checkArmourLayering(articles=[]){
 const issues=[],locations=[],zones=[];
 if(!Array.isArray(articles))return {format:'hmk-layer-legality-v2',authoritative:false,status:'violation',issues:[{kind:'invalid',reason:'Outfit must be an array'}],zones:[],locations:[],notes:[]};
 if(articles.some(a=>!a||typeof a!=='object'||Array.isArray(a)))return {format:'hmk-layer-legality-v2',authoritative:false,status:'violation',issues:[{kind:'invalid',reason:'Each article must be an object'}],zones:[],locations:[],notes:[]};
 const prepared=articles.map(a=>({...a,code:CODE[norm(a?.material)],coveredLocations:a?.coveredLocations??[]}));
 const ids=prepared.map(a=>a.id);
 if(new Set(ids).size!==ids.length)issues.push({kind:'invalid',reason:'Duplicate article identifiers'});
 for(const a of prepared){
  if(typeof a.id!=='string'||!a.id.trim())issues.push({kind:'invalid',reason:'Missing or invalid article identifier'});
  if(!a.code)issues.push({kind:'invalid',article:a.id,reason:'Unknown material'});
  const zoneError=validateLayerZoneMap(a);
  if(zoneError)issues.push({kind:'invalid',article:a.id,reason:zoneError});
 }
 if(issues.some(i=>i.kind==='invalid'))return {format:'hmk-layer-legality-v2',authoritative:false,status:'violation',issues,zones:[],locations:[],notes:['Invalid layer-zone map: no legality determination']};
 for(const zone of BODY_ZONES){
  const locs=zoneLocations(prepared,zone);
  const relevant=prepared.filter(a=>Array.isArray(a.coveredLocations)&&articleCoversZone(a,zone));
  const zoneIssues=[];
  // HMK p.117: the five-layer cap applies to the entire Body Zone,
  // including articles that do not overlap at any single location.
  if(relevant.length>5)zoneIssues.push({kind:'violation',reason:'More than five articles in Body Zone',ids:relevant.map(a=>a.id)});
  const dq=prepared.filter(a=>['D','Q'].includes(a.code) && articleCoversZone(a,zone));
  // HMK p.117: zone-level D/Q limit, even when locations are disjoint.
  if(dq.length>1)zoneIssues.push({kind:'violation',reason:'More than one D/Q article in Body Zone',ids:dq.map(a=>a.id)});
  const matchSets=[];
  for(const loc of locs){
   const covering=relevant.filter(a=>Array.isArray(a.coveredLocations)&&articleCoversZoneLocation(a,zone,loc));
   if(!covering.length)continue;
   if(covering.length>5)zoneIssues.push({kind:'violation',reason:'More than five layers at location',location:loc});
   const ordered=covering.slice().sort((a,b)=>a.layerOrder-b.layerOrder);
   if(covering.some(a=>!Number.isInteger(a.layerOrder))||new Set(covering.map(a=>a.layerOrder)).size!==covering.length){
    zoneIssues.push({kind:'unresolved',reason:'Missing or duplicated inner-to-outer layer order',location:loc});
    locations.push({zone,location:loc,status:'unresolved',articleIds:covering.map(a=>a.id)});continue;
   }
   if(covering.some(a=>!a.code))continue;
   const matches=ARMOUR_LAYER_COLUMNS.flatMap(row=>candidateFits(row,ordered,zone).map(slots=>({base:row.code,slots})));
   const status=matches.length?'compatible':'violation';
   if(!matches.length)zoneIssues.push({kind:'violation',reason:'No permitted p.117 material-column combination',location:loc});
   if(matches.length)matchSets.push({location:loc,matches});
   locations.push({zone,location:loc,status,articleIds:ordered.map(a=>a.id),matches});
  }
  // HMK p.117 Obris: each anatomical location has its own base and
  // material-column assignment. No cross-location slot intersection.
  // Zone-wide layer and D/Q caps above remain independent constraints.
  zones.push({zone,articleIds:relevant.map(a=>a.id),issues:zoneIssues});issues.push(...zoneIssues.map(x=>({...x,zone})));
 }
 return {format:'hmk-layer-legality-v2',authoritative:false,status:issues.some(i=>i.kind==='invalid'||i.kind==='violation')?'violation':issues.length?'unresolved':'compatible',issues,zones,locations,
  notes:['No implicit layer ordering or automatic Bulk exception','A compatible result checks material columns, not all suit ENC, per-location anatomy exceptions or optional rules','Bulk exception: one C or D violating article per affected Body Zone may incur -5 per zone; requires explicit GM selection','Last over-column D/Q article adds 5 ENC; not applied without a verified column assignment']};
}
