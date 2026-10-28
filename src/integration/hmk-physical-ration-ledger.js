/** HMK v1.2 p.120/186. Campaign-scoped physical ration evidence. The shared
 * character inventory is a catalogue-backed BASELINE, not a safe mutable
 * campaign stock balance when a character belongs to several timelines.
 * Opening a physical lot requires an explicit GM freshness/availability
 * attestation. Consumption is an immutable overlay, never an implicit
 * mutation of another campaign's inventory. */
import {provenCarriedRations} from './hmk-inventory-provisions.js';
export const PHYSICAL_RATION_STOCK='hmk-physical-ration-stock-v1';
export const PHYSICAL_RATION_USE='hmk-physical-ration-use-v1';
export const PHYSICAL_RATION_TRANSFER='hmk-physical-ration-transfer-v1';
export const PHYSICAL_RATION_LOSS='hmk-physical-ration-loss-v1';
const DAY=1440;
const fail=message=>{throw Error(message)};
const check=(value,message)=>{if(!value)fail(message)};
const isMinute=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
const isHalf=n=>Number.isSafeInteger(n*2)&&n>=0.5&&n<=999999;
const duration=(id)=>id==='hmk:gear:hmk-p120-026'?30*DAY:id==='hmk:gear:hmk-p120-027'?10*DAY:null;
/** Physical lot identity follows an immutable custody receipt. No campaign
 * changes a shared inventory baseline; incoming food is a projected carried
 * stack and takes the source lot's ORIGINAL expiry (never a new freshness date). */
export function rationStockBalances(journal=[],campaignId,actorId,minute=1e9){
 const lots=[],map=new Map();
 for(const row of journal){
  if(row.calendarCampaignId!==campaignId||row.campaignMinute>minute)continue;
  const s=row.calendarInventoryRationStock,t=row.calendarInventoryRationTransfer,u=row.calendarInventoryRationUse,l=row.calendarInventoryRationLoss;
  if(s&&row.characterId===actorId){
   const lot={sourceId:row.id,itemId:s.itemId,actorId,sourceItemId:s.sourceItemId,name:s.name,
    quantity:s.quantity,remaining:s.quantity,minute:s.minute,expiresAt:s.expiresAt};
   lots.push(lot);map.set(row.id,lot);
  }
  if(t&&t.recipientId===actorId){
   const lot={sourceId:row.id,itemId:t.receivedItemId,actorId,sourceItemId:t.sourceItemId,
    name:t.name,quantity:t.quantity,remaining:t.quantity,minute:t.minute,expiresAt:t.expiresAt};
   lots.push(lot);map.set(row.id,lot);
  }
  if(u&&row.characterId===actorId&&map.has(u.sourceId)){
   const lot=map.get(u.sourceId);lot.remaining=Math.round((lot.remaining-u.quantity)*2)/2;
  }
  if(t&&t.donorId===actorId&&map.has(t.sourceId)){
   const lot=map.get(t.sourceId);lot.remaining=Math.round((lot.remaining-t.quantity)*2)/2;
  }
  if(l&&row.characterId===actorId&&map.has(l.sourceId)){
   const lot=map.get(l.sourceId);lot.remaining=Math.round((lot.remaining-l.quantity)*2)/2;
  }
 }
 return lots;
}
/** A new inventory stack (unique inventory ID) may be attested once per
 * campaign. To replenish, add a NEW stack and attest that stack. Existing
 * lots cannot be silently refilled by reactivating the daily policy. */
export function createFreshRationStocks({inventory=[],journal=[],campaignId,actorId,minute,freshConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&isMinute(minute),'Neplatná kampaň, postava nebo čas zásob');
 const already=new Set(rationStockBalances(journal,campaignId,actorId).map(l=>l.itemId));
 const newLots=provenCarriedRations(inventory,actorId).filter(l=>!already.has(l.itemId));
 if(!newLots.length)return [];
 check(freshConfirmed===true,'GM musí potvrdit dnešní čerstvost a dostupnost skutečných přídělů');
 return newLots.map(l=>{
  const ttl=duration(l.sourceItemId);
  check(ttl!==null&&Number.isSafeInteger(l.foodDays)&&l.foodDays>0,'Nepodložená dávka v inventáři');
  return {format:PHYSICAL_RATION_STOCK,campaignId,actorId,itemId:l.itemId,
   sourceItemId:l.sourceItemId,name:l.name,quantity:l.foodDays,unitWeightLb:3,
   minute,expiresAt:minute+ttl,sourcePages:[120,186],freshnessAttestedByGM:true};
 });
}
export function availableRationLots(journal=[],campaignId,actorId,minute){
 return rationStockBalances(journal,campaignId,actorId,minute).filter(l=>l.remaining>=0.5&&l.minute<=minute&&l.expiresAt>=minute)
  .sort((a,b)=>a.expiresAt-b.expiresAt||a.minute-b.minute||a.sourceId.localeCompare(b.sourceId));
}
export function createPhysicalRationUse({journal=[],campaignId,actorId,minute,sourceId,quantity}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&isMinute(minute)&&
  typeof sourceId==='string'&&sourceId&&isHalf(quantity), 'Neplatný fyzický výdej přídělů');
 const source=journal.find(row=>row.id===sourceId&&(row.calendarInventoryRationStock||row.calendarInventoryRationTransfer));
 check(source&&source.calendarCampaignId===campaignId&&source.campaignMinute<=minute&&
  (source.calendarInventoryRationStock?source.characterId===actorId&&source.calendarInventoryRationStock.expiresAt>=minute:
   source.calendarInventoryRationTransfer.recipientId===actorId&&source.calendarInventoryRationTransfer.expiresAt>=minute),
  'Příděl není doložen, patří jiné kampani nebo překročil doloženou trvanlivost');
 const lot=availableRationLots(journal,campaignId,actorId,minute).find(x=>x.sourceId===sourceId);
 check(lot&&lot.remaining>=quantity,'Fyzické potravinové dávky nestačí nebo již byly vydány');
 return {format:PHYSICAL_RATION_USE,campaignId,actorId,minute,sourceId,itemId:lot.itemId,
  quantity,unit:'foodDays',sourcePages:[120,186]};
}
/** An actual witnessed hand-off of stock, NOT eating. A transfer cannot
 * extend freshness, duplicate rations, or advance campaign time. */
export function recordPhysicalRationHandoff(database,{donorId,recipientId,sourceId,quantity,
 eventId,receivedItemId,campaignId,minute,reason='',confirmedByGM=false,createdAt=''}={}){
 check(database&&Array.isArray(database.journal)&&Array.isArray(database.characters)&&
  Array.isArray(database.inventory)&&database.campaignClock,'Chybí otevřený inventář a kalendář');
 check((database.campaignClock.campaignId||`legacy:${database.campaignClock.events?.[0]?.id||''}`)===campaignId&&
  database.campaignClock.minute===minute&&isMinute(minute),'Předání přídělů vyžaduje aktuální čas GM');
 const members=database.campaignClock.characterIds??database.characters.map(c=>c.id);
 check(typeof donorId==='string'&&typeof recipientId==='string'&&donorId!==recipientId&&
  members.includes(donorId)&&members.includes(recipientId)&&
  database.characters.some(c=>c.id===donorId)&&database.characters.some(c=>c.id===recipientId),
  'Příděly lze předat pouze jinému účastníkovi stejné kampaně');
 check(!database.combatRuntime?.sequence?.active,'Během aktivního boje je nutná příslušná Combat akce');
 check(confirmedByGM===true&&typeof reason==='string'&&reason.trim().length>=2&&reason.trim().length<=160,
  'GM musí potvrdit skutečné předání a jeho okolnosti');
 check(isHalf(quantity)&&typeof eventId==='string'&&eventId&&typeof receivedItemId==='string'&&
  receivedItemId&&receivedItemId!==eventId&&typeof createdAt==='string'&&createdAt&&
  !database.journal.some(j=>j.id===eventId||j.id===receivedItemId)&&
  !database.inventory.some(i=>i.id===receivedItemId)&&
  !database.journal.some(j=>j.calendarInventoryRationTransfer?.receivedItemId===receivedItemId),
  'Neplatné množství nebo duplicitní identifikátor potravinového balíku');
 const origin=availableRationLots(database.journal,campaignId,donorId,minute).find(l=>l.sourceId===sourceId);
 check(origin&&origin.remaining>=quantity,'Zdrojový příděl není volný, už byl spotřebován nebo expiroval');
 const proof={format:PHYSICAL_RATION_TRANSFER,campaignId,minute,donorId,recipientId,sourceId,
  sourceItemId:origin.sourceItemId,sourceInventoryItemId:origin.itemId,receivedItemId,
  name:origin.name,quantity,expiresAt:origin.expiresAt,unit:'foodDays',
  confirmedByGM:true,reason:reason.trim(),sourcePages:[120,186]};
 const next=structuredClone(database);
 next.journal.push({id:eventId,characterId:donorId,calendarCampaignId:campaignId,campaignMinute:minute,createdAt,
  title:'HMK · fyzické příděly předány',body:`${quantity} food-days · ${donorId} → ${recipientId}; ${reason.trim()}; čas GM beze změny`,
  calendarInventoryRationTransfer:proof});
 validatePhysicalRationJournal(next.journal,next.inventory);
 return next;
}
/** Witnessed spoilage, theft or discarding of EXISTING edible stock. This
 * changes physical custody only (never eating or a health roll). The baseline
 * inventory and original source receipts stay immutable across campaigns. */
export function recordPhysicalRationLoss(database,{actorId,sourceId,quantity,eventId,
 campaignId,minute,reason='',confirmedByGM=false,createdAt=''}={}){
 check(database&&Array.isArray(database.journal)&&Array.isArray(database.inventory)&&
  Array.isArray(database.characters)&&database.campaignClock,'Chybí inventář a kalendář');
 check((database.campaignClock.campaignId||`legacy:${database.campaignClock.events?.[0]?.id||''}`)===campaignId&&
  database.campaignClock.minute===minute&&isMinute(minute),'Odpis vyžaduje aktuální čas GM');
 check(database.characters.some(c=>c.id===actorId)&&
  (database.campaignClock.characterIds??database.characters.map(c=>c.id)).includes(actorId),
  'Postava nepatří do aktuální kampaně');
 check(!database.combatRuntime?.sequence?.active,'Během Initiative řešte ztrátu pravidlovou Combat akcí');
 check(confirmedByGM===true&&typeof reason==='string'&&reason.trim().length>=2&&reason.trim().length<=160,
  'GM musí potvrdit konkrétní ztrátu a okolnosti');
 check(isHalf(quantity)&&typeof eventId==='string'&&eventId&&typeof createdAt==='string'&&createdAt&&
  !database.journal.some(j=>j.id===eventId),'Neplatný objem či duplicitní auditní záznam');
 const lot=rationStockBalances(database.journal,campaignId,actorId,minute).find(x=>x.sourceId===sourceId);
 check(lot&&lot.minute<=minute&&lot.remaining>=quantity,'Doložené příděly nestačí nebo již byly vydány');
 const proof={format:PHYSICAL_RATION_LOSS,campaignId,actorId,minute,sourceId,itemId:lot.itemId,
  quantity,unit:'foodDays',reason:reason.trim(),confirmedByGM:true};
 const next=structuredClone(database);
 next.journal.push({id:eventId,characterId:actorId,calendarCampaignId:campaignId,campaignMinute:minute,
  createdAt,title:'Inventář · odpis fyzických přídělů',
  body:`${quantity} food-days · ${lot.name} · ${reason.trim()}; není spotřeba, čas GM beze změny`,
  calendarInventoryRationLoss:proof});
 validatePhysicalRationJournal(next.journal,next.inventory,next);
 return next;
}
/** Replay preserves origin, chronology, uniqueness, ration units and no
 * cross-campaign borrowing. Legacy journal entries remain untouched. */
export function validatePhysicalRationJournal(journal=[],inventory=null,database=null){
 const prior=[],usedInventoryIds=new Set();
 for(const row of journal){
  const s=row.calendarInventoryRationStock;
  if(s){
   const key=s.campaignId+'\u0000'+s.actorId+'\u0000'+s.itemId;
   check(s.format===PHYSICAL_RATION_STOCK&&s.campaignId===row.calendarCampaignId&&s.actorId===row.characterId&&
    isMinute(s.minute)&&s.minute===row.campaignMinute&&typeof s.itemId==='string'&&s.itemId&&
    duration(s.sourceItemId)!==null&&s.name===(s.sourceItemId.endsWith('026')?'Rations, iron':'Rations, standard')&&
    Number.isSafeInteger(s.quantity)&&s.quantity>0&&s.quantity<=999999&&s.unitWeightLb===3&&
    s.expiresAt===s.minute+duration(s.sourceItemId)&&s.freshnessAttestedByGM===true&&
    JSON.stringify(s.sourcePages)==='[120,186]'&&!usedInventoryIds.has(key),
    'Poškozený, duplicitní nebo nedoložený počáteční stav fyzických přídělů');
   if(inventory!==null||database!==null){
    const active=database?.campaignClock?.campaignId===s.campaignId||
     (database?.campaignClock&&!database.campaignClock.campaignId&&
      s.campaignId===`legacy:${database.campaignClock.events?.[0]?.id||''}`);
    const archive=database?.calendarEvidenceArchives?.find(a=>a.sourceCampaignId===s.campaignId);
    const source=database?(active?database.inventory:
      database.campaignActorBranches?.[s.campaignId]?.[s.actorId]?.inventory??archive?.rationInventoryBackings):inventory;
    // Stable custody is a location change, not deletion of the original physical stock.
    // validateStableHub separately proves every 'stable' slot has a matching receipt.
    const backing=provenCarriedRations((source??[]).map(i=>i.slot==='stable'?{...i,slot:'carried'}:i),s.actorId).find(x=>x.itemId===s.itemId);
    check(backing&&backing.sourceItemId===s.sourceItemId&&backing.name===s.name&&backing.foodDays===s.quantity,
     'Doložený inventární balík již neodpovídá původnímu zdroji, vlastníkovi ani počtu kusů');
   }
   usedInventoryIds.add(key);
  }
  const t=row.calendarInventoryRationTransfer;
  if(t){
   const lot=availableRationLots(prior,t.campaignId,t.donorId,t.minute).find(l=>l.sourceId===t.sourceId);
   check(t.format===PHYSICAL_RATION_TRANSFER&&t.campaignId===row.calendarCampaignId&&
    t.minute===row.campaignMinute&&isMinute(t.minute)&&row.characterId===t.donorId&&
    typeof t.recipientId==='string'&&t.recipientId&&t.recipientId!==t.donorId&&
    typeof t.receivedItemId==='string'&&t.receivedItemId&&
    typeof t.sourceId==='string'&&t.sourceId&&t.receivedItemId!==t.sourceInventoryItemId&&
    isHalf(t.quantity)&&lot&&lot.remaining>=t.quantity&&
    t.sourceItemId===lot.sourceItemId&&t.sourceInventoryItemId===lot.itemId&&
    t.name===lot.name&&t.expiresAt===lot.expiresAt&&t.expiresAt>=t.minute&&
    t.unit==='foodDays'&&t.confirmedByGM===true&&
    typeof t.reason==='string'&&t.reason.length>=2&&t.reason.length<=160&&
    JSON.stringify(t.sourcePages)==='[120,186]'&&
    typeof row.createdAt==='string'&&row.createdAt&&
    !prior.some(x=>x.calendarInventoryRationTransfer?.receivedItemId===t.receivedItemId||x.id===row.id),
    'Neplatný či duplicitní důkaz předání potravin');
  }
  const l=row.calendarInventoryRationLoss;
  if(l){
   const lot=rationStockBalances(prior,l.campaignId,l.actorId,l.minute).find(x=>x.sourceId===l.sourceId);
   check(l.format===PHYSICAL_RATION_LOSS&&l.campaignId===row.calendarCampaignId&&
    l.actorId===row.characterId&&l.minute===row.campaignMinute&&isMinute(l.minute)&&
    isHalf(l.quantity)&&lot&&lot.remaining>=l.quantity&&lot.itemId===l.itemId&&
    l.unit==='foodDays'&&l.confirmedByGM===true&&
    typeof l.reason==='string'&&l.reason.length>=2&&l.reason.length<=160&&
    typeof row.createdAt==='string'&&row.createdAt,
    'Poškozený nebo nedoložený odpis fyzických přídělů');
  }
  const u=row.calendarInventoryRationUse;
  if(u){
   const expected=createPhysicalRationUse({journal:prior,campaignId:row.calendarCampaignId,
    actorId:row.characterId,minute:row.campaignMinute,sourceId:u.sourceId,quantity:u.quantity});
   if(u.nutritionDayId!==undefined){check(typeof u.nutritionDayId==='string'&&u.nutritionDayId,'Chybí denní vazba výdeje přídělů');expected.nutritionDayId=u.nutritionDayId;}
   check(JSON.stringify(u)===JSON.stringify(expected),'Pozměněný fyzický výdej potravy');
  }
  prior.push(row);
 }
 return true;
}
/** Read-only inventory per campaign. The global baseline remains unchanged. */
export function projectCampaignRationInventory(inventory=[],journal=[],campaignId){
 if(!campaignId)return inventory;
 const quantities=new Map(),received=[];
 for(const row of journal){
  if(row.calendarCampaignId!==campaignId)continue;
  const stock=row.calendarInventoryRationStock,t=row.calendarInventoryRationTransfer,u=row.calendarInventoryRationUse,l=row.calendarInventoryRationLoss;
  if(stock)quantities.set(stock.itemId,stock.quantity);
  if(t){
   if(quantities.has(t.sourceInventoryItemId))quantities.set(t.sourceInventoryItemId,
    Math.round((quantities.get(t.sourceInventoryItemId)-t.quantity)*2)/2);
   quantities.set(t.receivedItemId,t.quantity);received.push(t);
  }
  if(u&&quantities.has(u.itemId))quantities.set(u.itemId,
   Math.round((quantities.get(u.itemId)-u.quantity)*2)/2);
  if(l&&quantities.has(l.itemId))quantities.set(l.itemId,
   Math.round((quantities.get(l.itemId)-l.quantity)*2)/2);
 }
 const owned=inventory.flatMap(item=>{
  const quantity=quantities.get(item.id);
  if(quantity===undefined)return [item];
  return quantity>0?[{...item,quantity}]:[];
 });
 // A projected custody item is READ ONLY, not an editable second inventory.
 // It is carried for ENC, can be consumed and re-transferred by its receipt ID.
 for(const t of received){
  const q=quantities.get(t.receivedItemId);if(q<=0)continue;
  owned.push({id:t.receivedItemId,characterId:t.recipientId,sourceItemId:t.sourceItemId,
   snapshot:{id:t.sourceItemId,name:t.name,category:'other',properties:{weightLb:3}},
   slot:'carried',quantity:q,gearStowage:'normal',_campaignRationReceipt:true});
 }
 return owned;
}
/** Stock-bound inventory IDs stay unchanged in the shared BASELINE. Otherwise
 * an edit, transfer, deletion or restack would make evidence untraceable. */

function isApprovedStableRelocation575(before,after,id,a,b){
 if(!a||!b)return false;
 const strip=v=>{const copy={...v};delete copy.slot;delete copy.stableAnimalId;return copy;};
 if(JSON.stringify(strip(a))!==JSON.stringify(strip(b)))return false;
 const prev=new Set((before.journal||[]).map(j=>j.id));
 const records=(after.journal||[]).filter(j=>!prev.has(j.id)&&j.stableHub574?.inventoryId===id&&
  ['inventory-load','inventory-unload'].includes(j.stableHub574.type));
 if(records.length!==1)return false;
 const x=records[0].stableHub574;
 if(x.type==='inventory-load'||x.type==='inventory-gear-attach')return (a.slot==='carried'||a.slot==='none')&&b.slot==='stable'&&
  a.stableAnimalId===undefined&&b.stableAnimalId===x.animalId&&b.characterId===x.ownerId;
 return a.slot==='stable'&&a.stableAnimalId===x.animalId&&b.slot==='carried'&&
  b.stableAnimalId===undefined&&b.characterId===x.ownerId;
}

export function assertPhysicalRationBacking(before,after){
 const active=after.campaignClock?.campaignId||
  (after.campaignClock?`legacy:${after.campaignClock.events?.[0]?.id||''}`:null);
 const ids=new Set((after.journal||[]).filter(x=>x.calendarInventoryRationStock&&(active===null||x.calendarCampaignId===active))
  .map(x=>x.calendarInventoryRationStock.itemId));
 const prev=new Map((before.inventory||[]).map(x=>[x.id,x]));
 const next=new Map((after.inventory||[]).map(x=>[x.id,x]));
 for(const id of ids){
  const a=prev.get(id),b=next.get(id);
  if(a&&JSON.stringify(a)!==JSON.stringify(b)&&!isApprovedStableRelocation575(before,after,id,a,b))fail('Doloženou zásobu nelze upravit, odebrat ani převést mimo kampaňový účet. Nové příděly přidejte jako samostatný inventární stack.');
 }
 return true;
}
export function assertPhysicalRationAppendOnly(previous=[],next=[]){
 const byId=new Map(next.map(x=>[x.id,x]));
 for(const row of previous)if(row.calendarInventoryRationStock||row.calendarInventoryRationUse||row.calendarInventoryRationTransfer||row.calendarInventoryRationLoss)
  check(byId.has(row.id)&&JSON.stringify(byId.get(row.id))===JSON.stringify(row),'Historické fyzické příděly nelze přepsat ani smazat');
 return true;
}
