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
// White/grey/black outlines all establish Rigid Armour (pp.111, 168).
// Grey and black additionally distinguish the OPTIONAL Metal Armour rule
// (p.133): scale/mail convert severe EDGE; plate converts EDGE and POINT.
// Track specific covered locations, not the presence of a generic rigid flag.
const metalKinds=new Set(['mail','scale','plate']);
const effectLocations=(article)=>{
 const rigid=new Set(),metalEdge=new Set(),metalPoint=new Set();
 for(const loc of article.coveredLocations||[]){
  const marker=article.coverageMarkers?.[loc];
  const active=marker==='rigid'||(article.rigid&&['front-only','rear-only'].includes(marker));
  if(!active)continue;
  rigid.add(loc);
  if(metalKinds.has(article.material))metalEdge.add(loc);
  if(article.material==='plate')metalPoint.add(loc);
 }
 return {rigidLocations:[...rigid],metalEdgeLocations:[...metalEdge],metalPointLocations:[...metalPoint]};
};
const itemScore=(item,article)=>{
 let av=0;
 for(const loc of article.coveredLocations){
  for(const a of ASPECTS){
   const value=item.snapshot.properties.locationProtection?.[loc]?.[a];
   const damage=item.acidAVDamageByLocation?.[loc]??0;
   if(!Number.isSafeInteger(value)||value<0||!Number.isSafeInteger(damage)||damage<0)throw Error('Neověřené AV nebo poškození kyselinou');
   av+=Math.max(0,value-Math.min(value,damage));
  }
 }
 return {av,...effectLocations(article)};
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
 const metalPoint=new Set(selected.flatMap(c=>c.quality.metalPointLocations));
 const metalEdge=new Set(selected.flatMap(c=>c.quality.metalEdgeLocations));
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
  totalAV,rigidLocations:rigids.size,metalPointLocations:metalPoint.size,metalEdgeLocations:metalEdge.size,
  bulkPenalty:0,extraEnc:null,armourENC:suit.enc,sourcePages:[111,suit.page,117,118,133,168]};
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
 const metalPoint=new Set(ordered.flatMap(c=>c.quality.metalPointLocations)).size;
 const metalEdge=new Set(ordered.flatMap(c=>c.quality.metalEdgeLocations)).size;
 const weight=ordered.reduce((s,c)=>s+c.article.weightLb,0);
 // Lexicographic policy: real protection first, rigid coverage second, then
 // the OPTIONAL p133 plate (black) / mail-scale (grey) protections. Bulk is
 // negative for penalties; maximizing it prefers zero to -5/-10, correctly.
 return [total,rigid,metalPoint,metalEdge,check.bulkPenalty,-check.extraEnc,-Math.round(weight*10),-ordered.length];
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
  metalPointLocations:score(selected,arranged.check)[2],metalEdgeLocations:score(selected,arranged.check)[3],
  bulkPenalty:arranged.check.bulkPenalty,extraEnc:arranged.check.extraEnc,sourcePages:[111,117,118,119,133,168]};
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
 const n=items.length,zones=['head','arms','torso','legs'];
 const remainingAV=new Array(n+1).fill(0);
 const suffixRigid=Array.from({length:n+1},()=>new Set());
 const suffixPoint=Array.from({length:n+1},()=>new Set());
 const suffixEdge=Array.from({length:n+1},()=>new Set());
 // Cache all four zone-specific top-six sums for every suffix. The old code
 // sorted every remaining suffix again at every branch, a major slowdown.
 const zoneUpper=Object.fromEntries(zones.map(z=>[z,new Array(n+1)]));
 for(const z of zones)zoneUpper[z][n]={outside:0,top:[],inside:[0,0,0,0,0,0,0]};
 for(let i=n-1;i>=0;i--){
  const c=items[i],q=c.quality;
  remainingAV[i]=remainingAV[i+1]+q.av;
  suffixRigid[i]=new Set([...suffixRigid[i+1],...q.rigidLocations]);
  suffixPoint[i]=new Set([...suffixPoint[i+1],...q.metalPointLocations]);
  suffixEdge[i]=new Set([...suffixEdge[i+1],...q.metalEdgeLocations]);
  for(const z of zones){
   const prior=zoneUpper[z][i+1];
   if(c.article.bodyZones?.includes(z)){
    const vals=[...prior.top,q.av].sort((a,b)=>b-a).slice(0,6);
    const pref=[0];for(let k=0;k<6;k++)pref.push(pref[k]+(vals[k]||0));
    zoneUpper[z][i]={outside:prior.outside,top:vals,inside:pref};
   }else zoneUpper[z][i]={outside:prior.outside+q.av,top:prior.top,inside:prior.inside};
  }
 }
 let best=presetIncumbent;
 let bestRank=presetIncumbent?[best.totalAV,best.rigidLocations,best.metalPointLocations??0,best.metalEdgeLocations??0,
   best.bulkPenalty??0,-(best.extraEnc??0),-Math.round((best.armourWeightLb??0)*10),-best.names.length]:null;
 let branches=0,orderedChecks=0;
 const zoneCount=Object.fromEntries(zones.map(z=>[z,0]));
 const selected=[],rigidCovered=new Set(),pointCovered=new Set(),edgeCovered=new Set();
 function unionCount(prefix,suffix){let value=prefix.size;for(const loc of suffix)if(!prefix.has(loc))value++;return value;}
 function optimisticRank(i,sum){
  let avUpper=sum+remainingAV[i];
  for(const z of zones){
   const state=zoneUpper[z][i],free=Math.max(0,6-zoneCount[z]);
   avUpper=Math.min(avUpper,sum+state.outside+state.inside[free]);
  }
  // CRITICAL: each armour article can give multiple rigid locations. A
  // 'one rigid location per remaining layer' bound UNDERCOUNTS and may prune
  // Mail Leggings (four rigid locations) before comparing it to Padded.
  // Set unions are provably admissible, even for overlapping articles.
  return [avUpper,unionCount(rigidCovered,suffixRigid[i]),
   unionCount(pointCovered,suffixPoint[i]),unionCount(edgeCovered,suffixEdge[i]),
   0,0,0,0];
 }
 function visit(i,sum){
  branches++;
  if(bestRank&&compare(optimisticRank(i,sum),bestRank)<0)return;
  if(i===n){
   if(!selected.length)return;
   const found=findExactArmourOrder(selected);orderedChecks++;
   if(!found)return;
   const rank=score(found.ordered,found.check);
   if(!bestRank||compare(rank,bestRank)>0){
    const candidate=buildPreview(owned,found.ordered,mode,
     'Všechny zlepšující legální kombinace prošly přesným prohledáním dle HMK 117–119.');
    if(candidate.ready){best=candidate;bestRank=rank;}
   }
   return;
  }
  const c=items[i];
  if((c.article.bodyZones||[]).every(z=>zoneCount[z]<6)){
   selected.push(c);
   for(const z of c.article.bodyZones||[])zoneCount[z]++;
   const inserts=[];
   for(const [set,locs] of [[rigidCovered,c.quality.rigidLocations],
    [pointCovered,c.quality.metalPointLocations],[edgeCovered,c.quality.metalEdgeLocations]]){
    const added=[];for(const loc of locs)if(!set.has(loc)){set.add(loc);added.push(loc);}inserts.push([set,added]);
   }
   visit(i+1,sum+c.quality.av);
   for(const [set,added] of inserts)for(const loc of added)set.delete(loc);
   for(const z of c.article.bodyZones||[])zoneCount[z]--;
   selected.pop();
  }
  visit(i+1,sum);
 }
 visit(0,0);
 if(!best)return fail('Z dostupných článků nevznikla ověřená přípustná sestava.');
 return {...best,optimal:true,proof:(best.proof||'')+
  ' Úplné matematické vyhledávání: '+branches+' větví, '+orderedChecks+' kontrol vrstev.',examinedBranches:branches};
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
   b.metalPointLocations-a.metalPointLocations||b.metalEdgeLocations-a.metalEdgeLocations||
   a.printedSuit.localeCompare(b.printedSuit));
  incumbent=presets[0]??null;
  if(incumbent){
   const p=PRINTED_ARMOUR_SUITS_P113_116.find(x=>x.name===incumbent.printedSuit);
   incumbent.armourWeightLb=p?.weightLb??0;
  }
 }
 if(incumbent){
  const sum=candidates.reduce((v,c)=>v+c.quality.av,0);
  if(candidates.every(c=>c.quality.av>0)&&sum<incumbent.totalAV){
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
