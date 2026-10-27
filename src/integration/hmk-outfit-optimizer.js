/** v93.520 — HMK pp.117–119, owner-bound outfit selection.
 * This never invents AV, rigid flags, new items, or a separate wardrobe store.
 * Global optimality is asserted only after a complete search, or when the
 * entire set of independently positive, verified articles fits legally.
 */
import {resolveOwnedArmourArticle} from './live-combat-armour.js';
import {evaluateOrderedArmour,locallyPossibleArmourArticles} from './armour-layer-evaluation.js';
import {arrangeStartingArmour} from './hmk-starting-armour-layout.js';
import {findExactArmourOrder} from './hmk-exact-layer-order-524.js';
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
import {printedSuitAV} from '../rules/armour-all-suits-fixed.js';
import {printedSuitRigid} from '../rules/armour-suit-rigid-printed.js';
import {HMK_BODY_LOCATIONS} from './armour-coverage-readiness.js';

const ASPECTS=['b','e','p','f'];
const fail=reason=>({ready:false,reason,optimal:false});
const normalizePrintedName=name=>String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
 .replace(/^great helm$/,'plate great helm');
/** HMK pp. 113 and 118: clothing is not a database category. Printed
 * 'Clothing' and 'Heavy Clothing' consist of C garments, ordinary leather
 * headgear/footwear, and a padded SHIRT. Defensive mail, plate, leather
 * gauntlets and padded armour coats must not be selected as street clothes.
 * A printed-suit provenance alone does not change a garment's physical type.
 */
export const isCloth=x=>{
 const m=String(x?.snapshot?.properties?.material||'').toLowerCase();
 const n=String(x?.snapshot?.name||'').toLowerCase();
 if(m==='c'||m==='cloth')return true;
 if(m==='l'||m==='leather')return /\b(cap|hood|hat|shoes|boots|vest|tunic|breeches|trousers|shirt)\b/.test(n);
 if(m==='d'||m==='padded')return /\bshirt\b/.test(n);
 return false;
};
const available=x=>['carried','worn'].includes(x.slot) && x.snapshot?.category==='armor' && !x.destroyed;
const itemScore=(item,article)=>{
 let av=0;const rigidLocations=[];
 for(const loc of article.coveredLocations){
  const marker=article.coverageMarkers?.[loc];
  for(const a of ASPECTS){
   const value=item.snapshot.properties.locationProtection?.[loc]?.[a];
   const damage=item.acidAVDamageByLocation?.[loc]??0;
   if(!Number.isSafeInteger(value)||value<0||!Number.isSafeInteger(damage)||damage<0)throw Error('Neověřené AV nebo poškození kyselinou');
   av+=Math.max(0,value-Math.min(value,damage));
  }
  if(marker==='rigid'||(article.rigid&&['front-only','rear-only'].includes(marker)))rigidLocations.push(loc);
 }
 return {av,rigidLocations};
};
const compare=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
function candidatesFor(inventory,ownerId,mode,allowedIds=null){
 if(!Array.isArray(inventory)||!ownerId||!['armour','clothing'].includes(mode))throw Error('Neplatné podklady šatníku');
 const owned=inventory.filter(x=>x?.characterId===ownerId);
 const candidates=owned.filter(x=>available(x)&&(mode==='armour'||isCloth(x))&&(!allowedIds||allowedIds.has(x.id)));
 const verified=[];
 for(const x of candidates){
  // Preserve unaltered purchased source snapshots; a carried candidate must
  // pass the stronger source weight audit before it may become worn.
  if(x.quantity!==1)throw Error(`${x.snapshot?.name||'Předmět'}: více kusů v jednom inventárním záznamu. Nejprve je rozdělte na samostatné kusy.`);
  const probe={...x,slot:'carried'};
  const check=resolveOwnedArmourArticle(probe,{allowCarried:true});
  if(!check.ready)throw Error(`${x.snapshot?.name||'Předmět'}: ${check.reason}`);
  verified.push({item:x,article:check.article,quality:itemScore(x,check.article)});
 }
 // Two copies of the same clothing article are not automatically layered on
 // top of one another. The printed rules permit different layers, but do not
 // prescribe automatically wearing duplicate trousers/shirts. A GM may still
 // select that exceptional outfit manually. Choose the healthier copy first.
 const grouped=new Map();
 for(const row of verified){
  // Distinct acquisitions of the SAME verified garment still occupy the same
  // anatomical role; the automatic outfit may select at most one copy.
  const key=String(row.article.material||'').toLowerCase()+'|'+normalizePrintedName(row.article.name||row.item.snapshot?.name);
  const prior=grouped.get(key);
  const better=!prior||compare([row.quality.av,row.quality.rigidLocations.length,Number(row.item.slot==='worn')],[prior.quality.av,prior.quality.rigidLocations.length,Number(prior.item.slot==='worn')])>0;
  if(better)grouped.set(key,row);
 }
 return {owned,candidates:[...grouped.values()]};
}
/** An exact published suit is a complete, separately verified HMK preset,
 * not an arbitrary p.117 composite. In particular the 17-part Plate & Mail
 * cannot be rejected solely because an exponential custom-layer solver caps its
 * search. Never turn a PARTIAL bought suit into a complete printed suit.
 */
function printedSuitSelection(owned,allowedIds=null){
 const viable=owned.filter(x=>available(x)&&x.quantity===1&&(!allowedIds||allowedIds.has(x.id)));
 const groups=new Map();
 // Group by actual library purchase receipt, not the user-visible costume name.
 for(const x of viable){
  const t=x.acquisition?.transactionId, name=x.printedSuitName;
  if(typeof t!=='string'||!t||typeof name!=='string')continue;
  const key=name+'|'+t;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(x);
 }
 const out=[];
 for(const [key,group] of groups){
  const suit=PRINTED_ARMOUR_SUITS_P113_116.find(s=>key.startsWith(s.name+'|'));
  if(!suit||group.length!==suit.articles.length)continue;
  const remaining=[...group],selected=[];let okay=true;
  for(const printed of suit.articles){
   const name=normalizePrintedName(printed);
   const i=remaining.findIndex(x=>normalizePrintedName(x.snapshot?.name)===name);
   if(i<0){okay=false;break;}
   const x=remaining.splice(i,1)[0];
   const verified=resolveOwnedArmourArticle({...x,slot:'carried'},{allowCarried:true});
   if(!verified.ready){okay=false;break;}
   selected.push({item:x,article:verified.article,quality:itemScore(x,verified.article)});
  }
  if(okay&&remaining.length===0)out.push({suit,selected});
 }
 return out;
}
function printedSuitPreview(owned,{suit,selected}){
 const keep=new Set(selected.map(c=>c.item.id));
 const worn=owned.filter(x=>x.slot==='worn'&&x.snapshot?.category==='armor');
 let totalAV=0;const rigids=new Set();
 for(const location of HMK_BODY_LOCATIONS){
  for(const aspect of ASPECTS){
   const protection=printedSuitAV(suit.name,location,aspect);
   if(!protection.ok)return fail('Chybí ověřená tištěná ochrana kompletu '+suit.name);
   if(protection.covered){
    // Same physical Acid reduction already used by live combat protection.
    // Do not advertise the undamaged printed AV as the best outcome when
    // purchased articles acquired damage since their receipt.
    const reduction=selected.reduce((sum,{item})=>{
     const d=item.acidAVDamageByLocation?.[location]??0;
     const own=item.snapshot.properties.locationProtection?.[location]?.[aspect]??0;
     return sum+Math.min(d,own);
    },0);
    totalAV+=Math.max(0,protection.av-Math.min(protection.av,reduction));
   }
   const marker=printedSuitRigid(suit.name,location,aspect);
   if(!marker.ok)return fail('Chybí ověřená tuhost kompletu '+suit.name);
   if(marker.rigid)rigids.add(location);
  }
 }
 return {ready:true,optimal:false,authoritativePreset:true,mode:'armour',printedSuit:suit.name,
  proof:'Přesný kompletní tištěný set HMK s. '+suit.page+' z jediné nákupní transakce. Ověřeno všech '+selected.length+' originálních součástí. Tištěné AV/rigidita a ENC mají vlastní autoritu; toto není tvrzení o globálním optimu při dalších volných článcích.',
  placements:selected.map(c=>({id:c.item.id,layerOrder:null,layerSlot:null,bulkExceptionZones:[]})),
  unequipIds:worn.filter(x=>!keep.has(x.id)).map(x=>x.id),equipIds:selected.filter(c=>c.item.slot!=='worn').map(c=>c.item.id),
  names:selected.map(c=>c.item.snapshot.name),removedNames:worn.filter(x=>!keep.has(x.id)).map(x=>x.snapshot.name),
  totalAV,rigidLocations:rigids.size,bulkPenalty:0,extraEnc:null,armourENC:suit.enc,sourcePages:[suit.page,117,118]};
}
function setup(ordered){
 const pieces=ordered.map((c,i)=>({...c.item,slot:'worn',layerOrder:i,layerSlot:null,bulkExceptionZones:[]}));
 const articles=ordered.map((c,i)=>({...c.article,id:c.item.id,layerOrder:i}));
 const check=evaluateOrderedArmour(articles);
 if(check.status!=='compatible'||!Number.isInteger(check.extraEnc)||!Number.isInteger(check.bulkPenalty))return null;
 return {pieces,check};
}
function score(ordered,check){
 const total=ordered.reduce((s,c)=>s+c.quality.av,0);
 const rigid=new Set(ordered.flatMap(c=>c.quality.rigidLocations)).size;
 const weight=ordered.reduce((s,c)=>s+c.article.weightLb,0);
 return [total,rigid,check.bulkPenalty,-check.extraEnc,-Math.round(weight*10),-ordered.length];
}
function buildPreview(owned,selected,mode,proof){
 const worn=owned.filter(x=>x.slot==='worn'&&x.snapshot?.category==='armor');
 const keep=new Set(selected.map(x=>x.item.id));
 const removing=worn.filter(x=>!keep.has(x.id));
 const adding=selected.filter(x=>x.item.slot!=='worn');
 const arranged=setup(selected);
 if(!arranged)return fail('Finální kombinace neprošla pravidlovou kontrolou HMK.');
 return {ready:true,optimal:true,mode,proof,placements:arranged.pieces.map(p=>({id:p.id,layerOrder:p.layerOrder,layerSlot:p.layerSlot,bulkExceptionZones:p.bulkExceptionZones})),
  unequipIds:removing.map(x=>x.id),equipIds:adding.map(x=>x.item.id),
  names:selected.map(x=>x.item.snapshot.name),removedNames:removing.map(x=>x.snapshot.name),
  totalAV:score(selected,arranged.check)[0],rigidLocations:score(selected,arranged.check)[1],
  bulkPenalty:arranged.check.bulkPenalty,extraEnc:arranged.check.extraEnc,sourcePages:[117,118,119]};
}
/** Exhaustive branch-and-bound outfit solver.
 * Branches over each distinct article type (include/exclude) and every legal
 * relative ordering of each included article. A branch is pruned ONLY if its
 * optimistic AV/rigidity bound cannot beat a fully validated incumbent, or
 * its already selected articles violate a monotone anatomical layer cap.
 * There is NO arbitrary number-of-items or search-state shortcut. Search is
 * exponential in the worst case; an answer is never called optimal without
 * completing all unpruned branches. Overlapping locations retain all orders.
 */
function exactCustomOutfit(owned,candidates,mode,presetIncumbent=null){
 const items=[...candidates].sort((a,b)=>b.quality.av-a.quality.av||
   b.quality.rigidLocations.length-a.quality.rigidLocations.length||a.item.id.localeCompare(b.item.id));
 const n=items.length;
 const zones=['head','arms','torso','legs'];
 const remainingAV=new Array(n+1).fill(0);
 const remainingRigidByZone=Object.fromEntries(zones.map(z=>[z,new Array(n+1).fill(0)]));
 for(let i=n-1;i>=0;i--){
  remainingAV[i]=remainingAV[i+1]+items[i].quality.av;
  for(const zone of zones){
   const bonus=(items[i].article.bodyZones||[]).includes(zone)&&items[i].quality.rigidLocations.length?1:0;
   remainingRigidByZone[zone][i]=remainingRigidByZone[zone][i+1]+bonus;
  }
 }
 let best=presetIncumbent;
 let bestRank=presetIncumbent?[best.totalAV,best.rigidLocations,best.bulkPenalty??0,
   -(best.extraEnc??0),-Math.round((best.armourWeightLb??0)*10),-best.names.length]:null;
 let branches=0,orderedChecks=0;
 const zoneCount=Object.fromEntries(zones.map(z=>[z,0]));
 const selected=[];
 const rigidCovered=new Set();
 const orderCache=new Map();
 function rigidUpper(i){
  let total=rigidCovered.size;
  for(const zone of zones)total+=Math.min(6-zoneCount[zone],remainingRigidByZone[zone][i]);
  return total;
 }
 function optimisticRank(i,sum){
  let avUpper=sum+remainingAV[i];
  for(const zone of zones){
   const free=6-zoneCount[zone];
   const inside=[],outside=[];
   for(let k=i;k<n;k++){
    const c=items[k];
    (c.article.bodyZones?.includes(zone)?inside:outside).push(c.quality.av);
   }
   inside.sort((a,b)=>b-a);
   const relaxed=sum+outside.reduce((a,b)=>a+b,0)+inside.slice(0,free).reduce((a,b)=>a+b,0);
   avUpper=Math.min(avUpper,relaxed);
  }
  return [avUpper,rigidUpper(i),0,0,0,0];
 }
 function validOrder(subset){
  const key=subset.map(c=>c.item.id).sort().join('|');
  if(orderCache.has(key))return orderCache.get(key);
  const found=findExactArmourOrder(subset);orderedChecks++;
  const result=found?{list:found.ordered,rank:score(found.ordered,found.check)}:null;
  orderCache.set(key,result);
  return result;
 }
 function enumerate(i,sum){
  branches++;
  if(bestRank&&compare(optimisticRank(i,sum),bestRank)<=0)return;
  if(i===n){
   if(!selected.length)return;
   const local=validOrder(selected);
   if(local&&(!bestRank||compare(local.rank,bestRank)>0)){
    const preview=buildPreview(owned,local.list,mode,'Úplný důkaz optimality: všechny zlepšující podmnožiny článků a jejich pravidlově přípustná pořadí byly prohledány.');
    if(preview.ready){best=preview;bestRank=local.rank;}
   }
   return;
  }
  const candidate=items[i];
  const itemRigidAdds=[];
  const okZone=(candidate.article.bodyZones||[]).every(z=>zoneCount[z]<6);
  if(okZone){
   selected.push(candidate);
   for(const z of candidate.article.bodyZones||[])zoneCount[z]++;
   for(const loc of candidate.quality.rigidLocations){
    if(!rigidCovered.has(loc)){rigidCovered.add(loc);itemRigidAdds.push(loc);}
   }
   enumerate(i+1,sum+candidate.quality.av);
   for(const z of candidate.article.bodyZones||[])zoneCount[z]--;
   for(const loc of itemRigidAdds)rigidCovered.delete(loc);
   selected.pop();
  }
  enumerate(i+1,sum);
 }
 enumerate(0,0);
 if(!best)return fail('Z dostupných článků nevznikla ověřená přípustná sestava.');
 return {...best,optimal:true,proof:(best.proof||'')+
  ' Matematické vyhledávání dokončeno: '+branches+' větví výběru a '+orderedChecks+' kontrol vrstev; bez umělého limitu položek.',
  examinedBranches:branches};
}
export function previewOptimalOutfit(inventory,ownerId,mode='armour',allowedIds=null){
 let source;
 try{source=candidatesFor(inventory,ownerId,mode,allowedIds);}catch(e){return fail(e.message);}
 const {owned,candidates}=source;
 // Printed-set dominance can often be proved WITHOUT traversing millions of
 // equivalent physical article orders: every article's AV is nonnegative, and
 // any outfit's protection cannot exceed the sum of all available articles.
 // If the complete printed suit already attains that upper bound and every
 // article contributes positive AV, dropping anything necessarily loses AV.
 // This is a mathematical certificate, not a heuristic preference.
 if(!candidates.length)return fail(mode==='clothing'?'Žádný ověřený běžný oděv z katalogu HMK není dostupný.':'Žádné dostupné ověřené články zbroje.');
 let incumbent=null;
 if(mode==='armour'){
  // Exact HMK printed outfits remain valid even when the generic p.117
  // evaluator does not model the publication-specific placement of 17 pieces.
  const presets=printedSuitSelection(owned,allowedIds).map(p=>printedSuitPreview(owned,p)).filter(p=>p.ready);
  presets.sort((a,b)=>b.totalAV-a.totalAV||b.rigidLocations-a.rigidLocations||
   a.printedSuit.localeCompare(b.printedSuit));
  incumbent=presets[0]??null;
  if(incumbent){
   const p=PRINTED_ARMOUR_SUITS_P113_116.find(x=>x.name===incumbent.printedSuit);
   incumbent.armourWeightLb=p?.weightLb??0;
  }
 }
 if(incumbent){
  const sum=candidates.reduce((v,c)=>v+c.quality.av,0);
  if(candidates.every(c=>c.quality.av>0)&&sum<=incumbent.totalAV){
   return {...incumbent,optimal:true,proof:incumbent.proof+
    ' Globální optimalita prokázána horní mezí součtu AV všech dostupných článků ('+sum+'); žádný jiný výběr nemůže dosáhnout vyšší primární ochrany.',examinedBranches:0};
  }
 }
 return exactCustomOutfit(owned,candidates,mode,incumbent);
}
/** Atomic, immutable inventory patch. Re-run read-only optimization on current
 * inventory and verify the exact old preview before writing to avoid stale UI.
 * Chest, other owners, weapons, food and journal never change here.
 */
export function applyOptimalOutfit(inventory,ownerId,preview,allowedIds=null){
 if(!preview?.ready||!(preview.optimal||preview.authoritativePreset||preview.verifiedAlternative)||!['armour','clothing'].includes(preview.mode))throw Error('Neověřený návrh oblečení');
 const fresh=previewOptimalOutfit(inventory,ownerId,preview.mode,allowedIds);
 if(!fresh.ready||JSON.stringify(fresh)!==JSON.stringify(preview))throw Error('Inventář se od výpočtu změnil; obnovte návrh.');
 const next=structuredClone(inventory),placement=new Map(preview.placements.map(p=>[p.id,p]));
 for(const x of next){
  if(x.characterId!==ownerId||x.slot==='chest')continue;
  if(placement.has(x.id)){
   if(!['worn','carried'].includes(x.slot)||x.snapshot?.category!=='armor'||x.quantity!==1)throw Error('Předmět nelze obléknout');
   Object.assign(x,{slot:'worn',gearStowage:'normal',layerOrder:placement.get(x.id).layerOrder,layerSlot:null,bulkExceptionZones:[]});
  }else if(x.slot==='worn'&&x.snapshot?.category==='armor'){
   Object.assign(x,{slot:'carried',gearStowage:'normal',layerOrder:null,layerSlot:null,bulkExceptionZones:[]});
  }
 }
 return next;
}
/** The suit's cloth foundation belongs to armour; ordinary cloth is separate.
 * Selecting one action must not undress the other category accidentally. */
function undressMatches(x,mode){
 if(x.slot!=='worn'||x.snapshot?.category!=='armor')return false;
 if(mode==='all')return true;
 const ordinaryCloth=isCloth(x)&&!x.printedSuitName;
 return mode==='clothing'?ordinaryCloth:!ordinaryCloth;
}
export function previewUndressOutfit(inventory,ownerId,mode='all'){
 if(!Array.isArray(inventory)||!ownerId||!['all','armour','clothing'].includes(mode))throw Error('Neplatný inventář / druh převlečení');
 return inventory.filter(x=>x.characterId===ownerId&&undressMatches(x,mode)).map(x=>({id:x.id,name:x.snapshot.name}));
}
export function undressOutfit(inventory,ownerId,mode='all'){
 const ids=new Set(previewUndressOutfit(inventory,ownerId,mode).map(x=>x.id));
 return inventory.map(item=>ids.has(item.id)?{...item,slot:'carried',gearStowage:'normal',layerOrder:null,layerSlot:null,bulkExceptionZones:[]}:item);
}
