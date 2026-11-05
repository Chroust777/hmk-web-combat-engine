/** HMK v1.2 printed pp.120, 133, 149: Cold Hazard gear provenance.
 * One actually used gear source (best eligible), one shelter, and FS.
 * Inventory identity is authoritative. No roll or inventory mutation.
 * A worn armour cloak has an extra Cold AV bonus on top of its F aspect.
 */
import {equipmentUnusable} from './hmk-equipment-serviceability.js';
import {EXPEDITION_EFFECTS_P120} from '../rules/expedition-effects.js';
import {EXPEDITION_EQUIPMENT_P120} from '../rules/possessions-printed.js';
import {PRINTED_ARMOUR_ARTICLES_P118} from '../rules/armour-articles-printed.js';
// One authoritative table: printed Expedition gear with the Cold AV corrected
// from the definitive Cold Hazard table (HMK p.149).
const pairs=EXPEDITION_EFFECTS_P120.filter(r=>Number.isSafeInteger(r.coldAV)).map(r=>[
 r.item.toLowerCase(),{av:r.coldAV,kind:r.kind==='shelter'?'shelter':r.item.startsWith('Cloak')?'cloak':'gear'}]);
const listed=Object.fromEntries(pairs);
const GEAR=Object.freeze({...listed,
 'cloth cloak':listed['cloak (cloth)'],
 'padded cloak':listed['cloak (padded)']
});
const name=x=>String(x?.snapshot?.name??x?.name??'').trim().toLowerCase();
// v93.742: a GM-owned item must NOT inherit a printed Cold AV solely
// because its editable name matches a printed item. Check the immutable
// printed ID and relevant printed characteristics, also after JSON restore.
const printedOther=new Map(EXPEDITION_EQUIPMENT_P120.map(x=>[`hmk:gear:${x.id}`,x]));
const printedCloaks=new Map(PRINTED_ARMOUR_ARTICLES_P118.filter(x=>x.name==='Cloak').map(x=>[`hmk:armour:p118:verified:${x.id}`,x]));
function attestedPrinted(item){
 const x=item?.snapshot??item;
 if(!x||x.builtin!==true||typeof x.id!=='string'||(item?.snapshot&&item.sourceItemId!=null&&item.sourceItemId!==x.id))return false;
 if(x.category==='other'){
  const row=printedOther.get(x.id);
  return !!row&&row.name===x.name&&x.properties?.weightLb===row.weightLb;
 }
 if(x.category==='armor'){
  const row=printedCloaks.get(x.id);
  return !!row&&x.name.toLowerCase()===(row.material+' cloak')&&
   x.properties?.material===row.material&&x.properties?.weightLb===row.weightLb&&
   x.properties?.coverageVerified===true;
 }
 return false;
}
export function coldCatalogRule(item){
 const n=name(item),cat=item?.snapshot?.category??item?.category;
 if((cat!=='armor'&&cat!=='other')||!attestedPrinted(item))return null;
 const printed=GEAR[n];
 if(printed)return {...printed,reference:'HMK p.149'};
 if(cat==='armor'){
  const material=String(item?.snapshot?.properties?.material??item?.properties?.material??'').toLowerCase();
  if(material==='cloth')return {...GEAR['cloth cloak'],reference:'HMK pp.120,149'};
  if(material==='padded')return {...GEAR['padded cloak'],reference:'HMK pp.120,149'};
 }
 return null;
}
const accessible=x=>x&&Number.isInteger(x.quantity)&&x.quantity>0&&!['chest','stable'].includes(x.slot)&&
 x.destroyed!==true&&!equipmentUnusable(x);
const byActor=(inventory,actorId)=>Array.isArray(inventory)?inventory.filter(x=>x?.characterId===actorId&&accessible(x)):[];
export function coldInventoryChoices(inventory,actorId){
 const rows=byActor(inventory,actorId);
 const choices=rows.map(x=>({item:x,rule:coldCatalogRule(x)})).filter(x=>x.rule);
 const automatic=choices.filter(x=>x.rule.kind==='cloak'&&(
  x.item.snapshot?.category==='armor'&&x.item.slot==='worn'||
  x.item.snapshot?.category==='other'&&x.item.coldWorn===true));
 return {automatic,gear:choices.filter(x=>x.rule.kind!=='shelter'),shelters:choices.filter(x=>x.rule.kind==='shelter')};
}
export function resolveColdHazardEquipment({inventory,actorId,gearId='',shelterId='',usedConfirmed=false,fireFS=0,fireConfirmed=false}={}){
 if(!Number.isSafeInteger(fireFS)||fireFS<0||fireFS>20)throw Error('Neplatná síla ohně FS');
 if(fireFS>0&&fireConfirmed!==true)throw Error('Oheň vyžaduje potvrzení GM, že skutečně hoří.');
 const c=coldInventoryChoices(inventory,actorId);
 const auto=c.automatic.reduce((best,x)=>!best||x.rule.av>best.rule.av?x:best,null);
 let chosen=null;
 if(gearId){chosen=c.gear.find(x=>x.item.id===gearId);if(!chosen)throw Error('Vybraná ochrana není v dostupném inventáři postavy.');
  if(!(chosen.item.snapshot?.category==='armor'&&chosen.item.slot==='worn')&&!chosen.item.coldWorn&&usedConfirmed!==true)
   throw Error('GM musí potvrdit skutečné použití neseného vybavení.');}
 const main=[auto,chosen].filter(Boolean).reduce((best,x)=>!best||x.rule.av>best.rule.av?x:best,null);
 let shelterAV=0,shelterSource=null;
 if(shelterId==='cave'){
  if(usedConfirmed!==true)throw Error('GM musí potvrdit použití mělké jeskyně.');
  shelterAV=3;shelterSource='Shallow cave · GM';
 }else if(shelterId){
  const shelter=c.shelters.find(x=>x.item.id===shelterId);
  if(!shelter)throw Error('Vybraný stan není v dostupném inventáři postavy.');
  if(usedConfirmed!==true)throw Error('GM musí potvrdit skutečně postavený stan.');
  shelterAV=shelter.rule.av;shelterSource=shelter.item.id;
 }
 return {
  gearAV:main?.rule.av??0,shelterAV,fireFS,
  gearSourceId:main?.item.id??null,shelterSourceId:shelterSource,
  gearName:main?.item.snapshot?.name??null,
  automaticCloak:!!(main&&main===auto),
  inventoryWitness:JSON.stringify([main?.item??null,shelterId&&shelterId!=='cave'?c.shelters.find(x=>x.item.id===shelterId)?.item??null:null]),
  explanation:`zbroj + ochrana ${main?.rule.av??0} / úkryt ${shelterAV} / oheň ${fireFS}`
 };
}
export function clothingColdText(item){
 const r=coldCatalogRule(item);
 return r?`Cold Hazard AV +${r.av} (${r.kind==='cloak'?'pouze při oblečení':r.kind==='shelter'?'při skutečně postaveném stanu':'při skutečném použití'}; HMK 149)`:
 item?.category==='armor'?`Ochrana F na krytých místech se započte do Area AV celé oblečené sestavy (HMK 133, 149).`:'';
}
