/** Keeper's Ledger / Arsenal & Gear – Truhlice (chest at an attested location).
 * A storage LOCATION, not a second ownership ledger and NOT an HMK rule.
 * The existing inventory and campaign actor branches remain authoritative.
 * No change to campaign clock; each move requires witnessed physical access.
 */
import {validateHandInventory} from './hmk-hand-equipment.js';
export const CHEST_TRANSFER='hmk-chest-transfer-v1';
const check=(ok,message)=>{if(!ok)throw Error(message)};
const validCount=n=>Number.isSafeInteger(n)&&n>=1&&n<=999999;
export const isChestItem=item=>item?.slot==='chest';
export const chestRows=(inventory=[],actorId)=>inventory.filter(i=>i.characterId===actorId&&isChestItem(i));
export function moveInventoryChest(database,{actorId,itemId,quantity,newItemId,eventId,campaignId=null,minute=null,
  location='',accessConfirmed=false,createdAt=''}={}){
 check(database&&Array.isArray(database.inventory)&&Array.isArray(database.characters),'Chybí inventář');
 check(typeof actorId==='string'&&actorId&&typeof itemId==='string'&&itemId&&
  typeof eventId==='string'&&eventId&&typeof newItemId==='string'&&newItemId&&eventId!==newItemId,
  'Truhlice vyžaduje jedinečné ID postavy, předmětu a operace');
 check(accessConfirmed===true,'GM musí potvrdit skutečný přístup k místu uložení');
 check(database.characters.some(c=>c.id===actorId),'Postava neexistuje');
 const from=database.inventory.find(x=>x.id===itemId&&x.characterId===actorId);
 check(from&&from.snapshot,'Předmět nepatří postavě');
 check(validCount(quantity)&&quantity<=from.quantity,'Počet ukládaných či vyzvedávaných kusů překračuje vlastnictví');
 check(typeof location==='string'&&location.trim().length>=1&&location.trim().length<=160,
  'Zadejte doložené místo Truhlice, např. domov nebo úkryt');
 check(typeof createdAt==='string'&&createdAt.length>0,'Chybí auditní čas záznamu');
 check(!database.inventory.some(x=>x.id===newItemId||x.id===eventId)&&!(database.journal||[]).some(x=>x.id===eventId||x.id===newItemId),
  'Opakované auditní ID');
 const clock=database.campaignClock;
 check((clock?campaignId===clock.campaignId||campaignId===`legacy:${clock.events?.[0]?.id||''}`:campaignId===null)&&
  (clock?minute===clock.minute:minute===null),'Truhlice patří výhradně aktuálnímu času a kampani');
 if(clock)check((clock.characterIds??database.characters.map(c=>c.id)).includes(actorId),'Postava není účastníkem vybrané kampaně');
 check(!(database.combatRuntime?.sequence?.active===true&&database.combatRuntime?.participants?.includes(actorId)),'Během aktivního boje nelze předměty ukládat mimo Combat');
 const withdrawing=isChestItem(from);
 const dest=withdrawing?'carried':'chest';
 check(withdrawing||['none','carried','worn','main_hand','off_hand'].includes(from.slot??'none'), 'Neplatný původ předmětu');
 if(withdrawing)check(from.chestLocation===location.trim(),'Vyzvednutí vyžaduje skutečné místo uložení');
 // Captured physical ration lots cannot be restacked, returned, relocated or
 // duplicated: their source inventory IDs are immutable across campaigns.
 check(!(database.journal||[]).some(j=>j.calendarInventoryWaterFill?.itemId===itemId),
  'Doložená nádoba na vodu je vázána na auditní účet; její přesun vyžaduje budoucí podporu převodu tekutiny');
 check(!(database.journal||[]).some(j=>j.calendarInventoryRationStock?.itemId===itemId),
  'Doložené fyzické příděly jsou vázané na kampaňový účet; nejprve musí být bezpečně vypořádány');
 const whole=quantity===from.quantity;
 if(!whole)check(['none','carried','chest'].includes(from.slot??'none'),
  'Částečně lze přesouvat jen nepřipravené předměty');
 const next=structuredClone(database);
 const source=next.inventory.find(x=>x.id===itemId);
 const moved=whole?source:{...structuredClone(source),id:newItemId,quantity};
 if(!whole)source.quantity-=quantity;
 moved.slot=dest;
 moved.gearStowage='normal';
 if(dest==='chest')moved.chestLocation=location.trim();
 else delete moved.chestLocation;
 if(moved.snapshot.category==='armor'){
  moved.layerOrder=null;moved.layerSlot=null;moved.bulkExceptionZones=[];
 }
 if(!whole)next.inventory.push(moved);
 validateHandInventory(next.inventory,actorId);
 const proof={format:CHEST_TRANSFER,actorId,campaignId,minute,sourceItemId:itemId,
  movedItemId:moved.id,quantity,fromSlot:from.slot??'none',toSlot:dest,
  place:location.trim(),split:!whole,sourceQuantityBefore:from.quantity,
  sourceQuantityAfter:whole?quantity:source.quantity,accessConfirmedByGM:true};
 next.journal??=[];
 next.journal.push({id:eventId,characterId:actorId,title:withdrawing?'Truhlice · vyzvednutí':'Truhlice · uložení',
  body:`${quantity} × ${from.snapshot.name} · ${location.trim()} · ${withdrawing?'do nesené výbavy':'mimo nesenou výbavu'}; bez posunu času`,
  createdAt,...(clock?{calendarCampaignId:campaignId,campaignMinute:minute}:{}),calendarChestTransfer:proof});
 return next;
}
export function validateChestTransferJournal(journal=[]){
 const seen=new Set();
 for(const row of journal){const p=row.calendarChestTransfer;if(!p)continue;
  check(p.format===CHEST_TRANSFER&&typeof row.id==='string'&&row.id&&!seen.has(row.id)&&
   p.actorId===row.characterId&&p.campaignId===(row.calendarCampaignId??null)&&
   p.minute===(row.campaignMinute??null)&&
   typeof p.sourceItemId==='string'&&p.sourceItemId&&typeof p.movedItemId==='string'&&p.movedItemId&&
   validCount(p.quantity)&&validCount(p.sourceQuantityBefore)&&
   Number.isSafeInteger(p.sourceQuantityAfter)&&p.sourceQuantityAfter>=0&&
   ['none','carried','worn','main_hand','off_hand','chest'].includes(p.fromSlot)&&
   (p.fromSlot==='chest'?p.toSlot==='carried':p.toSlot==='chest')&&
   typeof p.place==='string'&&p.place.length>0&&p.place.length<=160&&
   p.accessConfirmedByGM===true&&typeof p.split==='boolean'&&
   (p.split?(p.sourceItemId!==p.movedItemId&&p.sourceQuantityAfter===p.sourceQuantityBefore-p.quantity&&p.sourceQuantityAfter>=1&&['none','carried','chest'].includes(p.fromSlot)):
    (p.sourceItemId===p.movedItemId&&p.sourceQuantityAfter===p.quantity&&p.sourceQuantityBefore===p.quantity))&&
   typeof row.body==='string'&&typeof row.createdAt==='string'&&row.createdAt,
   'Poškozený auditní záznam Truhlice');
  seen.add(row.id);
 }
 return true;
}
export function assertChestTransferAppendOnly(before=[],after=[]){
 const next=new Map(after.filter(j=>j.calendarChestTransfer).map(j=>[j.id,j]));
 for(const row of before)if(row.calendarChestTransfer){
  check(next.has(row.id)&&JSON.stringify(row)===JSON.stringify(next.get(row.id)),
   'Historii uložení a vyzvednutí z Truhlice nelze přepsat ani smazat');
 }
 return true;
}
