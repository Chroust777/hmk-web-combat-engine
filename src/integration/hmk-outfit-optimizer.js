/** v93.520 — HMK pp.117–119, owner-bound outfit selection.
 * This never invents AV, rigid flags, new items, or a separate wardrobe store.
 * Global optimality is asserted only after a complete search, or when the
 * entire set of independently positive, verified articles fits legally.
 */
import {resolveOwnedArmourArticle} from './live-combat-armour.js';
import {evaluateOrderedArmour} from './armour-layer-evaluation.js';
import {arrangeStartingArmour} from './hmk-starting-armour-layout.js';

const ASPECTS=['b','e','p','f'];
const MAX_STATES=24000;
const fail=reason=>({ready:false,reason,optimal:false});
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
 return {owned,candidates:verified};
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
 if(!preview?.ready||!preview.optimal||!['armour','clothing'].includes(preview.mode))throw Error('Neověřený návrh oblečení');
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
