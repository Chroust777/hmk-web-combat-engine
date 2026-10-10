import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
import {printedSuitAV} from '../rules/armour-all-suits-fixed.js';
import {printedSuitRigid} from '../rules/armour-suit-rigid-printed.js';

/** Exact, non-mutating match of a complete worn printed suit; no inferred layering. */
export function identifyWornPrintedSuit(inventory,characterId){
 if(!Array.isArray(inventory)||typeof characterId!=='string')return {ok:false,reason:'Invalid inventory/character'};
 const worn=inventory.filter(x=>x.characterId===characterId&&x.slot==='worn'&&x.snapshot?.category==='armor');
 if(worn.some(x=>x.quantity!==1||typeof x.snapshot.name!=='string'))return {ok:false,reason:'Invalid worn article quantity/name'};
 // Only a STANDARD, unmodified printed suit is covered by its ready-made
 // p.113–116 protection matrix. Once the actual owner specifies physical
 // layering or an article-level Bulk exception, item names alone are NOT proof
 // that the printed suit is worn in its standard configuration (p.117).
 if(worn.some(x=>x.layerOrder!==undefined&&x.layerOrder!==null ||
    x.layerSlot!==undefined&&x.layerSlot!==null&&x.layerSlot!=='' ||
    x.bulkExceptionZones!==undefined&&x.bulkExceptionZones!==null&&
      (!Array.isArray(x.bulkExceptionZones)||x.bulkExceptionZones.length>0)))
  return {ok:false,reason:'Explicit article layering/Bulk overrides the printed suit preset; validate the actual p117 layers'};
 const actual=worn.map(x=>x.snapshot.name).sort();
 const matches=PRINTED_ARMOUR_SUITS_P113_116.filter(s=>s.articles.length===actual.length&&s.articles.slice().sort().every((name,i)=>name===actual[i]));
 return matches.length===1?{ok:true,name:matches[0].name,source:'exact-worn-inventory',inventoryIds:worn.map(x=>x.id)}:{ok:false,reason:matches.length?'Ambiguous printed suit':'Worn articles do not exactly match a printed suit'};
}
export function resolvePrintedSuitProtection(name,location,aspect){
 const r=printedSuitAV(name,location,aspect);
 if(!r.ok)return r;
 // A printed dot means no armour at this location, not a failed lookup.
 const marker=printedSuitRigid(name,location,aspect);
 if(!marker.ok)return marker;
 return {ok:true,complete:true,av:{[aspect]:r.covered?r.av:0},covered:r.covered,rigid:r.covered?marker.rigid:false,rigidSource:'HMK printed boxed AV p.113–116',source:'printed-suit',suitName:name,location,aspect};
}

/** Rigid for injury/glancing is automatic for printed suits unless GM overrides. */
export function selectPrintedSuitRigidStatus(protection,gmStatus='unknown'){
 if(!['unknown','yes','no'].includes(gmStatus))return {ok:false,reason:'Invalid GM Rigid selection'};
 if(gmStatus!=='unknown')return {ok:true,status:gmStatus,source:'gm-override'};
 if(!protection?.ok||protection.source!=='printed-suit'||typeof protection.rigid!=='boolean')return {ok:false,reason:'Printed Rigid data unavailable'};
 return {ok:true,status:protection.rigid?'yes':'no',source:'printed-boxed-AV-p113-116'};
}
