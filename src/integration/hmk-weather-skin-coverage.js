/** HMK v1.2 pp.117–118, 133, 185. UI proposal only; no medical mutation.
 * AV and worn article coverage are evidence. Whether an item was physically
 * removed/shifted is a situational fact left to the GM's exception controls.
 */
import {resolveLiveCombatArmour,resolveOwnedArmourArticle} from './live-combat-armour.js';

const isValid = value => Number.isSafeInteger(value) && value >= 0;
const sides = new Set(['left','right']);
const directional = marker => ['front-only','rear-only','side-only','partial'].includes(marker);
export function weatherSkinCoverageProposal({inventory,characterId,kind,locations}={}) {
 if (!Array.isArray(inventory)||!characterId||!['frostbite','sunburn'].includes(kind)||!Array.isArray(locations))
  throw Error('Weather skin proposal requires character, inventory, kind and locations');
 const worn=inventory.filter(x=>x.characterId===characterId&&x.slot==='worn');
 const verified=[];let invalid=null;
 for(const item of worn){
  const r=resolveOwnedArmourArticle(item);
  if(!r.ready){invalid=`${item.snapshot?.name||item.id}: ${r.reason}`;break;}
  verified.push({item,source:r.article});
 }
 const result=[];
 const cache=new Map();
 for(const site of locations){
  const loc=site.location,side=site.side||null;
  if(typeof loc!=='string'||side!==null&&!sides.has(side))throw Error('Invalid weather site');
  const covering=verified.filter(a=>a.source.coveredLocations.includes(loc));
  const ambiguousCover=covering.some(a=>directional(a.source.coverageMarkers?.[loc]));
  let reason=null,armourAV=null,selected=false,status='unverified';
  if(invalid){reason=invalid;}
  else if(kind==='sunburn'){
   // Clothing coverage, not F-AV, is the relevant clue for exposed skin.
   // For unusual partial/directonal coverage, do not certify an unknown fact.
   if(ambiguousCover)reason='Směrové krytí oděvu (např. plášť): jeho skutečné postavení vůči slunci zná jen GM';
   else {selected=covering.length===0;status=selected?'exposed':'covered';}
  } else {
   if(ambiguousCover)reason='Směrová ochrana oděvu (např. plášť): skutečné zakrytí před mrazem musí doložit GM';
   if(!cache.has(loc))cache.set(loc,resolveLiveCombatArmour({
    inventory,targetId:characterId,location:loc,aspect:'f',direction:'front',mode:'auto',rigidStatus:'unknown'
   }));
   const r=cache.get(loc);
   if(!r.ready||!isValid(r.armourValue))reason=r.reason||'Není doloženo F AV lokace';
   else if(!reason){
    armourAV=r.armourValue;
    selected=armourAV<4;
    status=armourAV>=4?'protected':armourAV>=1?'partially-exposed':'unprotected';
   }
  }
  result.push({location:loc,side,av:armourAV,status,selected,reason,covering:covering.map(x=>x.item.snapshot.name)});
 }
 return {kind,sites:result,selected:result.filter(x=>x.selected).length,
  covered:result.filter(x=>x.status==='covered'||x.status==='protected').length,
  unverified:result.filter(x=>x.status==='unverified').length};
}

const tones=new Map([['very light','very-light'],['light','light'],['medium','medium'],['dark','dark'],['very dark','very-dark']]);
export function weatherSkinComplexion(character){
 const value=String(character?.hmk?.complexion||character?.hmk?.creation?.values?.complexion||'').trim().toLowerCase();
 return tones.get(value)||null;
}
