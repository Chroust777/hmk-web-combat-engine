/** v93.523: witnessed sale of actual owned physical items. One atomic
 * immutable inventory mutation + original campaign cash adjustment ledger.
 * Catalog prices are reference only; actual proceeds must be confirmed by GM.
 * No parallel money/inventory ledger is created.
 */
import {applyInventoryBatch} from './hmk-inventory-batch-522.js';
import {coinBalance,recordCampaignCoinAdjustment} from './hmk-library-economy.js';
const check=(x,m)=>{if(!x)throw Error(m);};
export function applyInventorySale(db,{ownerId,itemIds,location='',buyer='',proceedsPence,confirmed=false,idFactory,createdAt}={}){
 check(confirmed===true,'GM musí potvrdit uskutečněný prodej a skutečný příjem hotovosti.');
 check(db?.campaignClock&&Array.isArray(db?.characters)&&db.characters.some(c=>c.id===ownerId),
  'Prodej je možný jen v aktivní kampani existující postavy.');
 check(Array.isArray(itemIds)&&itemIds.length>0&&itemIds.length<=300&&new Set(itemIds).size===itemIds.length,
  'Prodej vyžaduje jedinečná ID označených předmětů.');
 check(Number.isSafeInteger(proceedsPence)&&proceedsPence>0&&proceedsPence<=999999999,
  'Zadejte skutečnou celkovou prodejní cenu v celých denárech (větší než 0).');
 check(typeof buyer==='string'&&buyer.trim().length>=2&&buyer.trim().length<=90,
  'Uveďte skutečného kupujícího nebo tržiště.');
 const actor=db.characters.find(c=>c.id===ownerId),key=db.campaignClock.campaignId||`legacy:${db.campaignClock.events?.[0]?.id||''}`;
 const cash=coinBalance(actor,key);check(cash.ok,'Před prodejem nelze ověřit hotovost: '+cash.reason);
 check(Number.isSafeInteger(cash.balance+proceedsPence),'Připsaná částka by způsobila neplatný zůstatek.');
 const originals=itemIds.map(id=>db.inventory.find(x=>x.id===id&&x.characterId===ownerId));
 check(originals.every(Boolean),'Některý předmět již postava nevlastní.');
 const reason=`Prodej ${itemIds.length} záznamů kupujícímu ${buyer.trim()}`;
 // Immutable batch: chest objects are first retrieved from the confirmed
 // location, then disposed through the existing validated physical journal.
 const changed=applyInventoryBatch(db,{ownerId,itemIds,action:'loss',location,reason,
  confirmed,idFactory,createdAt});
 const from= db.journal.length;
 for(const j of changed.journal.slice(from))if(j.calendarInventoryDisposition?.kind==='loss'){
  j.title='Inventář · doložený prodej';
  j.body=`${j.calendarInventoryDisposition.quantity} × ${j.calendarInventoryDisposition.itemName} · ${reason}; hotovost z prodeje celého výběru +${proceedsPence} d; čas GM beze změny`;
 }
 const live=changed.characters.find(c=>c.id===ownerId);
 recordCampaignCoinAdjustment(live,{campaignId:key,minute:changed.campaignClock.minute,id:idFactory(),at:createdAt,
  deltaPence:proceedsPence,reason:`${reason}; ${proceedsPence} d`});
 const after=coinBalance(live,key);
 check(after.ok&&after.balance===cash.balance+proceedsPence,'Prodej musí připsat přesně domluvenou částku do původní hotovosti.');
 return changed;
}
