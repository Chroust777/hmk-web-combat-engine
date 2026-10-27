/** v93.522: atomic multi-item inventory custody, no parallel storage.
 * Existing chest/disposition receipts remain the only authoritative evidence.
 * Every selected item is validated before returning a changed database.
 */
import {moveInventoryChest} from './hmk-inventory-chest.js';
import {recordInventoryDisposition} from './hmk-inventory-disposition.js';
import {previewOptimalOutfit,applyOptimalOutfit} from './hmk-outfit-optimizer.js';
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const own=(db,owner,id)=>db.inventory.find(x=>x.id===id&&x.characterId===owner);
const validIds=ids=>Array.isArray(ids)&&ids.length>0&&ids.length<=300&&ids.every(x=>typeof x==='string'&&x.length>0)&&new Set(ids).size===ids.length;
const current=(db,owner)=>db.characters.some(x=>x.id===owner);
const key=clock=>clock?.campaignId||`legacy:${clock?.events?.[0]?.id||''}`;
const sample=(ids,fn)=>ids.map(fn);
export function applyInventoryBatch(db,{ownerId,itemIds,action,location='',reason='',recipientId=null,confirmed=false,idFactory,createdAt}={}){
 check(db&&Array.isArray(db.inventory)&&Array.isArray(db.journal)&&Array.isArray(db.characters)&&current(db,ownerId),'Hromadná operace vyžaduje existujícího vlastníka a inventář.');
 check(validIds(itemIds),'Vyberte alespoň jeden jedinečný předmět (nejvýše 300).');
 check(['store','retrieve','loss','transfer'].includes(action),'Neznámá hromadná inventární operace.');
 check(confirmed===true,'GM musí potvrdit fyzickou dostupnost a skutečnou událost.');
 check(typeof idFactory==='function'&&typeof createdAt==='string'&&createdAt,'Chybí zdroj jedinečných ID a auditní čas.');
 const originals=itemIds.map(id=>own(db,ownerId,id));
 check(originals.every(x=>x&&Number.isSafeInteger(x.quantity)&&x.quantity>0),'Výběr obsahuje chybějící předmět nebo neplatné množství.');
 check(!db.combatRuntime?.sequence?.active,'Hromadné přesuny během aktivního boje nejsou povoleny.');
 if(action==='store')check(originals.every(x=>x.slot!=='chest'),'Uložení dovoluje pouze předměty mimo truhlu.');
 if(action==='retrieve')check(originals.every(x=>x.slot==='chest'),'Vyzvednutí dovoluje pouze předměty v truhle.');
 if(action==='loss'||action==='transfer')check(typeof reason==='string'&&reason.trim().length>=2,'Ztráta nebo předání vyžaduje skutečný důvod.');
 if(action==='transfer')check(typeof recipientId==='string'&&recipientId!==ownerId,'Vyberte jiného příjemce.');
 const needsLocation=action==='store'||action==='retrieve'||originals.some(x=>x.slot==='chest');
 if(needsLocation)check(typeof location==='string'&&location.trim().length>0&&location.trim().length<=160,'Zadejte skutečné místo truhly.');
 if(action==='retrieve'||(action!=='store'&&originals.some(x=>x.slot==='chest')))
  check(originals.filter(x=>x.slot==='chest').every(x=>x.chestLocation===location.trim()),'Vybrané předměty musí být skutečně na potvrzeném stejném místě truhly.');
 let next=db;
 for(const id of itemIds){
  let item=own(next,ownerId,id);
  check(item,'Předmět se změnil během hromadné operace.');
  if(action==='store'||action==='retrieve'||item.slot==='chest'){
   next=moveInventoryChest(next,{actorId:ownerId,itemId:id,quantity:item.quantity,newItemId:idFactory(),eventId:idFactory(),campaignId:next.campaignClock?key(next.campaignClock):null,minute:next.campaignClock?.minute??null,location:location.trim(),accessConfirmed:true,createdAt});
   item=own(next,ownerId,id);
  }
  if(action==='loss'||action==='transfer'){
   next=recordInventoryDisposition(next,{kind:action==='loss'?'loss':'transfer',actorId:ownerId,itemId:id,recipientId:action==='transfer'?recipientId:null,quantity:item.quantity,eventId:idFactory(),newItemId:idFactory(),reason,confirmedByGM:true,createdAt,campaignId:key(next.campaignClock),minute:next.campaignClock?.minute});
  }
 }
 return next;
}
/** v93.528. The chest is an additional source, not a replacement for the
 * equipment already worn/carried by this character. Simulate making exactly
 * one attested chest location available, then prove an optimal outfit over all
 * three eligible sources without mutating campaign data.
 */
export function previewChestOutfit(db,{ownerId,location,mode}={}){
 check(current(db,ownerId)&&['armour','clothing'].includes(mode),'Neplatná postava nebo režim oblékání.');
 check(typeof location==='string'&&location.length>0,'Vyberte skutečné místo truhly.');
 const chest=db.inventory.filter(x=>x.characterId===ownerId&&x.slot==='chest'&&x.chestLocation===location);
 check(chest.length,'Na daném místě není žádné vybavení této postavy.');
 const chestIds=new Set(chest.map(x=>x.id));
 const inventory=db.inventory.map(x=>chestIds.has(x.id)?{...x,slot:'carried'}:x);
 // No allowedIds restriction: already worn and carried articles are legitimate
 // ingredients of the same globally optimised legal outfit.
 const preview=previewOptimalOutfit(inventory,ownerId,mode);
 if(!preview.ready)return {ready:false,reason:preview.reason};
 const chosen=new Set(preview.placements.map(p=>p.id));
 const retrieved=chest.filter(x=>chosen.has(x.id));
 return {ready:true,mode,location,preview,ids:retrieved.map(x=>x.id),
  names:retrieved.map(x=>x.snapshot.name),virtual:inventory};
}
/** Perform the *same* proved selection without recomputing a different
 * optimisation universe after the physical withdrawals.
 *
 * The old code compared JSON.stringify of the two independent solver reports,
 * although one report saw every chest item and the other only withdrawn items.
 * Counts, provenance, search certificates and candidates could therefore
 * change with no rule violation, aborting a valid 17-piece Plate & Mail suit.
 *
 * We first validate and apply the original proved outfit in the read-only
 * virtual inventory, then atomically move only the selected chest pieces via
 * the existing custody ledger, finally project the already proved worn/removed
 * states onto these very same persistent item IDs. The unselected chest stays
 * untouched, including its true location. A failed movement throws before
 * any caller persists the result.
 */
export function applyChestOutfit(db,{ownerId,location,mode,confirmed=false,idFactory,createdAt}={}){
 check(confirmed===true,'GM musí potvrdit skutečný přístup do truhly a převlečení.');
 const plan=previewChestOutfit(db,{ownerId,location,mode});
 check(plan.ready,plan.reason||'Nedoložená sestava');
 // Revalidates all catalogue articles, physical layer constraints and the
 // exact solver result against the original virtual (non-mutated) inventory.
 const wornPlan=applyOptimalOutfit(plan.virtual,ownerId,plan.preview);
 const desired=new Map(wornPlan.filter(x=>x.characterId===ownerId&&x.snapshot?.category==='armor')
  .map(x=>[x.id,x]));
 const selectedChest=new Set(plan.ids);
 const staged=selectedChest.size?applyInventoryBatch(db,{
  ownerId,itemIds:plan.ids,action:'retrieve',location,confirmed,idFactory,createdAt
 }):db;
 check(selectedChest.size===plan.ids.length,'Duplicitní výběr z truhly');
 for(const id of selectedChest){
  const row=staged.inventory.find(x=>x.id===id&&x.characterId===ownerId);
  check(row&&row.slot==='carried'&&row.quantity===1&&desired.get(id)?.slot==='worn',
   'Vyzvednutá součást nemá původní vlastnictví, počet nebo ověřený výběr.');
 }
 const finalInventory=staged.inventory.map(item=>{
  if(item.characterId!==ownerId||item.snapshot?.category!=='armor'||item.slot==='chest')return item;
  const target=desired.get(item.id);
  check(target,'Zvolený článek už není v původním inventáři.');
  // Never modify money, journal, ownership, provenance or non-armour items.
  // A weapon occupying a hand is deliberately not part of a clothing change.
  if(!['carried','worn'].includes(item.slot))return item;
  check(['carried','worn'].includes(target.slot),'Nesoulad cílového umístění zbroje.');
  return {...item,slot:target.slot,gearStowage:target.gearStowage,
   layerOrder:target.layerOrder,layerSlot:target.layerSlot,
   bulkExceptionZones:structuredClone(target.bulkExceptionZones??[])};
 });
 for(const {id} of plan.preview.placements){
  check(finalInventory.some(x=>x.id===id&&x.characterId===ownerId&&x.slot==='worn'),
   'Některý vybraný článek nebyl správně oblečen.');
 }
 const changed=selectedChest.size>0||JSON.stringify(finalInventory)!==JSON.stringify(db.inventory);
 return {...staged,inventory:finalInventory,plan,changed};
}
