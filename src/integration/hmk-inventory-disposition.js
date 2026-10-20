/** Keeper's Ledger: witnessed physical transfer / loss of owned gear.
 * Inventory is campaign-branched; the proof is an immutable receipt, NOT an
 * HMK dice rule or a separate inventory. Only the GM advances campaign time.
 */
import {validateHandInventory} from './hmk-hand-equipment.js';
export const INVENTORY_DISPOSITION='hmk-inventory-disposition-v1';
const check=(value,message)=>{if(!value)throw Error(message)};
const positive=x=>Number.isSafeInteger(x)&&x>=1&&x<=999999;
const validMinute=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
const memberIds=database=>database.campaignClock?.characterIds??database.characters.map(x=>x.id);
const campaignKey=clock=>clock?.campaignId||`legacy:${clock?.events?.[0]?.id||''}`;
function protectedItem(database,id){
 return (database.journal||[]).some(row=>row.calendarInventoryRationStock?.itemId===id||
  row.calendarInventoryWaterFill?.itemId===id);
}
export function recordInventoryDisposition(database,{kind,actorId,itemId,recipientId=null,quantity,
 eventId,newItemId=null,reason='',confirmedByGM=false,createdAt='',campaignId,minute}={}){
 check(database&&Array.isArray(database.inventory)&&Array.isArray(database.characters)&&Array.isArray(database.journal),
  'Inventární operace vyžaduje úplnou databázi');
 check(['transfer','loss'].includes(kind),'Neplatný typ inventární operace');
 check(database.campaignClock&&campaignId===campaignKey(database.campaignClock)&&minute===database.campaignClock.minute&&validMinute(minute),
  'Inventární operace vyžaduje právě otevřenou kampaň a její aktuální čas GM');
 check(confirmedByGM===true,'GM musí potvrdit skutečné předání nebo ztrátu předmětu');
 check(typeof reason==='string'&&reason.trim().length>=2&&reason.trim().length<=240,
  'Uveďte doložené okolnosti skutečného předání nebo ztráty');
 check(typeof createdAt==='string'&&createdAt.length>0&&typeof eventId==='string'&&eventId.length>0,
  'Chybí auditní čas nebo jedinečné ID události');
 check(typeof actorId==='string'&&actorId&&typeof itemId==='string'&&itemId&&
  database.characters.some(x=>x.id===actorId)&&memberIds(database).includes(actorId),
  'Předmět musí patřit účastníkovi právě otevřené kampaně');
 check(!database.combatRuntime?.sequence?.active,'Předání či ztrátu během aktivního boje řešte pravidlovou Combat akcí');
 const item=database.inventory.find(x=>x.id===itemId&&x.characterId===actorId);
 check(item&&item.snapshot,'Předmět už není v inventáři původního vlastníka');
 check(item.slot!=='chest','Předmět je uložen v Truhlici: nejprve jej doloženě vyzvedněte');
 check(!protectedItem(database,itemId),'Předmět je vázán na fyzické příděly či vodu; převod vyžaduje vypořádání zdravotního a zásobovacího účtu');
 check(positive(quantity)&&positive(item.quantity)&&quantity<=item.quantity,'Neplatný počet předávaných či ztracených kusů');
 if(kind==='transfer'){
  check(typeof recipientId==='string'&&recipientId&&recipientId!==actorId&&
   database.characters.some(x=>x.id===recipientId)&&memberIds(database).includes(recipientId),
   'Předání vyžaduje jinou existující postavu ve stejné otevřené kampani');
 }else check(recipientId===null,'Ztráta nemůže mít příjemce');
 const whole=quantity===item.quantity;
 check(whole||['none','carried'].includes(item.slot??'none'),
  'Část vybaveného předmětu nelze oddělit; nejprve jej řádně odložte');
 check(!database.journal.some(x=>x.id===eventId)&&!database.inventory.some(x=>x.id===eventId),
  'Auditní ID operace je již použité');
 if(kind==='transfer'&&!whole){
  check(typeof newItemId==='string'&&newItemId&&newItemId!==itemId&&newItemId!==eventId&&
   !database.inventory.some(x=>x.id===newItemId)&&!database.journal.some(x=>x.id===newItemId),
   'Předání části zásoby vyžaduje nové jedinečné ID inventárního balíku');
 }
 const next=structuredClone(database),origin=structuredClone(item),target=next.inventory.find(x=>x.id===itemId);
 let resultItemId=null;
 if(whole){
  if(kind==='loss')next.inventory=next.inventory.filter(x=>x.id!==itemId);
  else{
   target.characterId=recipientId;target.slot='carried';target.gearStowage='normal';
   if(target.snapshot.category==='armor'){
    target.layerOrder=null;target.layerSlot=null;target.bulkExceptionZones=[];
   }
   resultItemId=itemId;
  }
 }else{
  target.quantity-=quantity;
  if(kind==='transfer'){
   const moved={...structuredClone(item),id:newItemId,characterId:recipientId,quantity,slot:'carried',gearStowage:'normal'};
   delete moved.chestLocation;
   next.inventory.push(moved);resultItemId=newItemId;
  }
 }
 validateHandInventory(next.inventory,actorId);
 if(kind==='transfer')validateHandInventory(next.inventory,recipientId);
 const proof={format:INVENTORY_DISPOSITION,kind,campaignId,minute,actorId,
  sourceItemId:itemId,recipientId,quantity,sourceQuantityBefore:item.quantity,
  sourceQuantityAfter:whole?0:item.quantity-quantity,resultItemId,
  originalSlot:item.slot??'none',itemName:item.snapshot.name,sourceCatalogId:item.sourceItemId??null,sourceSnapshot:origin,
  split:!whole,reason:reason.trim(),confirmedByGM:true};
 next.journal.push({id:eventId,characterId:actorId,calendarCampaignId:campaignId,campaignMinute:minute,createdAt,
  title:kind==='transfer'?'Inventář · doložené předání':'Inventář · doložená ztráta',
  body:`${quantity} × ${item.snapshot.name} · ${reason.trim()} · ${kind==='transfer'?`příjemce ${recipientId}`:'ztráta/vyřazení'}; čas GM beze změny`,
  calendarInventoryDisposition:proof});
 return next;
}
export function validateInventoryDispositionJournal(journal=[]){
 const seen=new Set();
 for(const row of journal){
  const p=row.calendarInventoryDisposition;if(!p)continue;
  check(!seen.has(row.id)&&p.format===INVENTORY_DISPOSITION&&['transfer','loss'].includes(p.kind)&&
   p.campaignId===row.calendarCampaignId&&p.minute===row.campaignMinute&&validMinute(p.minute)&&
   p.actorId===row.characterId&&typeof p.sourceItemId==='string'&&p.sourceItemId&&
   positive(p.quantity)&&positive(p.sourceQuantityBefore)&&p.quantity<=p.sourceQuantityBefore&&
   p.sourceQuantityAfter===p.sourceQuantityBefore-p.quantity&&p.split===(p.sourceQuantityAfter>0)&&
   typeof p.itemName==='string'&&p.itemName&&p.sourceSnapshot?.id===p.sourceItemId&&
   p.sourceSnapshot?.characterId===p.actorId&&p.sourceSnapshot?.quantity===p.sourceQuantityBefore&&
   (p.sourceSnapshot?.slot??'none')===p.originalSlot&&p.sourceSnapshot?.snapshot?.name===p.itemName&&
   (p.sourceSnapshot?.sourceItemId??null)===p.sourceCatalogId&&
   (p.sourceCatalogId===null||typeof p.sourceCatalogId==='string')&&
   ['none','carried','worn','main_hand','off_hand'].includes(p.originalSlot)&&
   (!p.split||['none','carried'].includes(p.originalSlot))&&
   ((p.kind==='transfer'&&typeof p.recipientId==='string'&&p.recipientId&&p.recipientId!==p.actorId&&
     typeof p.resultItemId==='string'&&p.resultItemId&&
     (p.split?p.resultItemId!==p.sourceItemId:p.resultItemId===p.sourceItemId))||
    (p.kind==='loss'&&p.recipientId===null&&p.resultItemId===null))&&
   typeof p.reason==='string'&&p.reason.length>=2&&p.reason.length<=240&&p.confirmedByGM===true&&
   typeof row.createdAt==='string'&&row.createdAt&&typeof row.body==='string',
   'Poškozený důkaz předání či ztráty inventáře');
  seen.add(row.id);
 }
 return true;
}
export function assertInventoryDispositionAppendOnly(before=[],after=[]){
 const byId=new Map(after.map(x=>[x.id,x]));
 for(const row of before)if(row.calendarInventoryDisposition)
  check(byId.has(row.id)&&JSON.stringify(byId.get(row.id))===JSON.stringify(row),
   'Historický důkaz předání či ztráty předmětu se nesmí přepsat ani odstranit');
 return true;
}
