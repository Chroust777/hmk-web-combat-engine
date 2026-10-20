/** HMK v1.2 p.120/186. Campaign-scoped physical ration evidence. The shared
 * character inventory is a catalogue-backed BASELINE, not a safe mutable
 * campaign stock balance when a character belongs to several timelines.
 * Opening a physical lot requires an explicit GM freshness/availability
 * attestation. Consumption is an immutable overlay, never an implicit
 * mutation of another campaign's inventory. */
import {provenCarriedRations} from './hmk-inventory-provisions.js';
export const PHYSICAL_RATION_STOCK='hmk-physical-ration-stock-v1';
export const PHYSICAL_RATION_USE='hmk-physical-ration-use-v1';
const DAY=1440;
const fail=message=>{throw Error(message)};
const check=(value,message)=>{if(!value)fail(message)};
const isMinute=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
const isHalf=n=>Number.isSafeInteger(n*2)&&n>=0.5&&n<=999999;
const duration=(id)=>id==='hmk:gear:hmk-p120-026'?30*DAY:id==='hmk:gear:hmk-p120-027'?10*DAY:null;
export function rationStockBalances(journal=[],campaignId,actorId,minute=1e9){
 const lots=[];
 for(const row of journal){
  if(row.calendarCampaignId!==campaignId||row.characterId!==actorId)continue;
  const s=row.calendarInventoryRationStock;
  if(s&&row.campaignMinute<=minute)lots.push({sourceId:row.id,itemId:s.itemId,actorId,sourceItemId:s.sourceItemId,
   name:s.name,quantity:s.quantity,remaining:s.quantity,minute:s.minute,expiresAt:s.expiresAt});
 }
 const map=new Map(lots.map(l=>[l.sourceId,l]));
 for(const row of journal){
  if(row.calendarCampaignId!==campaignId||row.characterId!==actorId||row.campaignMinute>minute)continue;
  const use=row.calendarInventoryRationUse;if(use&&map.has(use.sourceId))map.get(use.sourceId).remaining=Math.round((map.get(use.sourceId).remaining-use.quantity)*2)/2;
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
 const source=journal.find(row=>row.id===sourceId&&row.calendarInventoryRationStock);
 check(source&&source.characterId===actorId&&source.calendarCampaignId===campaignId&&
  source.campaignMinute<=minute&&source.calendarInventoryRationStock.expiresAt>=minute,'Příděl není doložen, patří jiné kampani nebo překročil doloženou trvanlivost');
 const lot=availableRationLots(journal,campaignId,actorId,minute).find(x=>x.sourceId===sourceId);
 check(lot&&lot.remaining>=quantity,'Fyzické potravinové dávky nestačí nebo již byly vydány');
 return {format:PHYSICAL_RATION_USE,campaignId,actorId,minute,sourceId,itemId:lot.itemId,
  quantity,unit:'foodDays',sourcePages:[120,186]};
}
/** Replay preserves origin, chronology, uniqueness, ration units and no
 * cross-campaign borrowing. Legacy journal entries remain untouched. */
export function validatePhysicalRationJournal(journal=[],inventory=null){
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
   if(inventory!==null){
    const backing=provenCarriedRations(inventory,s.actorId).find(x=>x.itemId===s.itemId);
    check(backing&&backing.sourceItemId===s.sourceItemId&&backing.name===s.name&&backing.foodDays===s.quantity,
     'Doložený inventární balík již neodpovídá původnímu zdroji, vlastníkovi ani počtu kusů');
   }
   usedInventoryIds.add(key);
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
 const quantities=new Map();
 for(const row of journal){
  if(row.calendarCampaignId!==campaignId)continue;
  const stock=row.calendarInventoryRationStock;
  if(stock)quantities.set(stock.itemId,stock.quantity);
  const used=row.calendarInventoryRationUse;
  if(used&&quantities.has(used.itemId))quantities.set(used.itemId,Math.round((quantities.get(used.itemId)-used.quantity)*2)/2);
 }
 return inventory.flatMap(item=>{
  const quantity=quantities.get(item.id);
  if(quantity===undefined)return [item];
  return quantity>0?[{...item,quantity}]:[];
 });
}
/** Stock-bound inventory IDs stay unchanged in the shared BASELINE. Otherwise
 * an edit, transfer, deletion or restack would make evidence untraceable. */
export function assertPhysicalRationBacking(before,after){
 const ids=new Set((after.journal||[]).filter(x=>x.calendarInventoryRationStock).map(x=>x.calendarInventoryRationStock.itemId));
 const prev=new Map((before.inventory||[]).map(x=>[x.id,x]));
 const next=new Map((after.inventory||[]).map(x=>[x.id,x]));
 for(const id of ids){
  const a=prev.get(id),b=next.get(id);
  if(a&&JSON.stringify(a)!==JSON.stringify(b))fail('Doloženou zásobu nelze upravit, odebrat ani převést mimo kampaňový účet. Nové příděly přidejte jako samostatný inventární stack.');
 }
 return true;
}
export function assertPhysicalRationAppendOnly(previous=[],next=[]){
 const byId=new Map(next.map(x=>[x.id,x]));
 for(const row of previous)if(row.calendarInventoryRationStock||row.calendarInventoryRationUse)
  check(byId.has(row.id)&&JSON.stringify(byId.get(row.id))===JSON.stringify(row),'Historické fyzické příděly nelze přepsat ani smazat');
 return true;
}
