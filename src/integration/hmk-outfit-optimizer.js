/** v93.520 — HMK pp.117–119, owner-bound outfit selection.
 * This never invents AV, rigid flags, new items, or a separate wardrobe store.
 * Global optimality is asserted only after a complete search, or when the
 * entire set of independently positive, verified articles fits legally.
 */
import {resolveOwnedArmourArticle} from './live-combat-armour.js';
import {evaluateOrderedArmour} from './armour-layer-evaluation.js';
import {arrangeStartingArmour} from './hmk-starting-armour-layout.js';
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
import {printedSuitAV} from '../rules/armour-all-suits-fixed.js';
import {printedSuitRigid} from '../rules/armour-suit-rigid-printed.js';
import {HMK_BODY_LOCATIONS} from './armour-coverage-readiness.js';

const ASPECTS=['b','e','p','f'];
const MAX_STATES=24000;
const fail=reason=>({ready:false,reason,optimal:false});
const normalizePrintedName=name=>String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
 .replace(/^great helm$/,'plate great helm');
const isCloth=x=>{const material=String(x?.snapshot?.properties?.material||'').toLowerCase();const name=String(x?.snapshot?.name||'').toLowerCase();return material==='c'||material==='cloth'||(material==='leather'&&/\b(boots|shoes)\b/.test(name));};
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
function candidatesFor(inventory,ownerId,mode){
 if(!Array.isArray(inventory)||!ownerId||!['armour','clothing'].includes(mode))throw Error('Neplatné podklady šatníku');
 const owned=inventory.filter(x=>x?.characterId===ownerId);
 const candidates=owned.filter(x=>available(x)&&(mode==='armour'||isCloth(x)));
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
  const key=row.item.sourceItemId;
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
function printedSuitSelection(owned){
 const viable=owned.filter(x=>available(x)&&x.quantity===1);
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
 return [total,rigid,check.bulkPenalty,-check.extraEnc,-weight,-ordered.length];
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
export function previewOptimalOutfit(inventory,ownerId,mode='armour'){
 let source;
 try{source=candidatesFor(inventory,ownerId,mode);}catch(e){return fail(e.message);}
 const {owned,candidates}=source;
 if(!candidates.length)return fail(mode==='clothing'?'Žádný ověřený látkový článek HMK str. 118 není v neseném inventáři.':'Žádné dostupné ověřené články zbroje.');
 // The printed suit path is especially important for p.116's 17-part set.
 // Prefer the most protective exact purchased printed preset over attempting to
 // search 17! physical arrangements. It does not claim custom-outfit optimality.
 if(mode==='armour'){
  const presets=printedSuitSelection(owned).map(p=>printedSuitPreview(owned,p)).filter(p=>p.ready);
  if(presets.length){
   presets.sort((a,b)=>b.totalAV-a.totalAV||b.rigidLocations-a.rigidLocations||b.armourENC-a.armourENC||a.printedSuit.localeCompare(b.printedSuit));
   return presets[0];
  }
 }
 // Upper bound: with all positive, undamaged article AV and rigidity
 // contributions present, a completely wearable outfit is unbeatable.
 const fullCopies=candidates.map(c=>({...c.item,slot:'worn',layerOrder:null,layerSlot:null,bulkExceptionZones:[]}));
 try{
  const count=arrangeStartingArmour(fullCopies);
  if(count.carriedArmourCount===0 && candidates.every(c=>c.quality.av+c.quality.rigidLocations.length>0)){
   const chosen=fullCopies.sort((a,b)=>a.layerOrder-b.layerOrder).map(x=>candidates.find(c=>c.item.id===x.id));
   const result=buildPreview(owned,chosen,mode,'Všechny nezávisle přínosné ověřené články tvoří legální kombinaci; součet AV ani rigidních lokací už nemůže být vyšší.');
   if(result.ready)return result;
  }
 }catch{/* use exact solver or fail closed */}
 if(candidates.length>12)return fail('Nelze dokázat globálně nejlepší přípustné vrstvení pro více než 12 vzájemně konfliktních článků. Nechávám výbavu beze změny; upravte výběr ručně.');
 const memo=new Set(),queue=[[]];
 let best=null,bestRank=null,visited=0;
 for(let head=0;head<queue.length;head++){
  const current=queue[head];
  const evaluation=setup(current);
  if(evaluation){
   const rank=score(current,evaluation.check);
   if(current.length&&(!best||compare(rank,bestRank)>0||compare(rank,bestRank)===0&&current.map(c=>c.item.id).join('|')<best.map(c=>c.item.id).join('|'))){best=current;bestRank=rank;}
  }
  // Every legal ordered partial outfit is a candidate, including the empty set.
  for(const candidate of candidates){
   if(current.includes(candidate))continue;
   for(let pos=0;pos<=current.length;pos++){
    const next=[...current.slice(0,pos),candidate,...current.slice(pos)];
    const signature=next.map(x=>x.item.id).join('|');
    if(memo.has(signature))continue;
    memo.add(signature);
    if(++visited>MAX_STATES)return fail('Vyhledávání překročilo bezpečný limit kombinací. Nejlepší výsledek nelze prohlásit za zaručený, proto se nic neobléklo.');
    if(setup(next))queue.push(next);
   }
  }
 }
 if(!best)return fail('Z dostupných článků nevznikla ani jedna pravidlově přípustná kombinace.');
 return buildPreview(owned,best,mode,`Úplný průchod ${visited} kombinacemi, ověřeno pravidly vrstev HMK str. 117–119.`);
}
/** Atomic, immutable inventory patch. Re-run read-only optimization on current
 * inventory and verify the exact old preview before writing to avoid stale UI.
 * Chest, other owners, weapons, food and journal never change here.
 */
export function applyOptimalOutfit(inventory,ownerId,preview){
 if(!preview?.ready||!(preview.optimal||preview.authoritativePreset)||!['armour','clothing'].includes(preview.mode))throw Error('Neověřený návrh oblečení');
 const fresh=previewOptimalOutfit(inventory,ownerId,preview.mode);
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
export function previewUndressOutfit(inventory,ownerId){
 if(!Array.isArray(inventory)||!ownerId)throw Error('Neplatný inventář');
 return inventory.filter(x=>x.characterId===ownerId&&x.slot==='worn'&&x.snapshot?.category==='armor').map(x=>({id:x.id,name:x.snapshot.name}));
}
export function undressOutfit(inventory,ownerId){
 const worn=previewUndressOutfit(inventory,ownerId);const ids=new Set(worn.map(x=>x.id));
 return inventory.map(item=>ids.has(item.id)?{...item,slot:'carried',gearStowage:'normal',layerOrder:null,layerSlot:null,bulkExceptionZones:[]}:item);
}
