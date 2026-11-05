/** HMK v1.2 pp.147,186. Real collected food carried by an individual.
 * A successful Foraging result proves FOOD-DAYS only, not the physical mass,
 * type, portability or shelf-life. Only a GM-confirmed mass and description
 * permits converting a portion of the communal lot into carried gear.
 * Receipts overlay the live inventory for ENC and can never duplicate stock.
 */
import {availableSupplyLots,createSupplyUse} from './hmk-foraging-supply-ledger.js';
export const FORAGING_CARRY='hmk-foraging-carry-v1';
export const FORAGING_CARRY_EAT='hmk-foraging-carry-eat-v1';
const check=(v,m)=>{if(!v)throw Error(m)};
const half=n=>Number.isSafeInteger(n*2)&&n>=0.5&&n<=99999;
const minute=n=>Number.isSafeInteger(n)&&n>=0;
const weight=n=>Number.isFinite(n)&&n>=0.01&&n<=20000;
const cleanName=s=>typeof s==='string'?s.trim():'';
export function foragedCarriedFood(journal=[],campaignId,atMinute=1e9){
 const lots=[],byId=new Map();
 for(const row of journal){if(row.calendarCampaignId!==campaignId||row.campaignMinute>atMinute)continue;
  const p=row.calendarForagingCarry;
  if(p){const lot={...p,sourceJournalId:row.id,remaining:p.quantity};lots.push(lot);byId.set(row.id,lot);}
  const e=row.calendarForagingCarryEat;
  if(e){const lot=byId.get(e.carryId);if(lot)lot.remaining=Math.round((lot.remaining-e.quantity)*2)/2;}
 }
 return lots;
}
export function createForagingCarry({journal=[],campaignId,minute:at,actorId,sourceId,resultIndex,
 quantity,itemName,totalWeightLb,itemId}={}){
 check(typeof campaignId==='string'&&campaignId&&minute(at)&&typeof actorId==='string'&&actorId,
  'Chybí příjemce, kampaň nebo čas doloženého nálezu.');
 check(Number.isSafeInteger(resultIndex)&&resultIndex>=0&&half(quantity)&&typeof sourceId==='string'&&sourceId,
  'Doložte skutečný nález a převáděné množství potravy.');
 const name=cleanName(itemName);
 check(name.length>=2&&name.length<=100&&weight(totalWeightLb),
  'GM musí určit skutečnou potravu (např. bobule či ryby) a celkovou hmotnost v librách.');
 check(typeof itemId==='string'&&itemId.length>=5&&itemId.length<=120&&
  !journal.some(x=>x.calendarForagingCarry?.itemId===itemId||x.id===itemId),
  'Nové nesené zásoby vyžadují jedinečný identifikátor.');
 const available=availableSupplyLots(journal,campaignId).find(l=>
  l.sourceId===sourceId&&l.resultIndex===resultIndex&&l.unit==='foodDays'&&l.minute<=at);
 check(available&&available.remaining>=quantity,'Zvolený nález už byl vydán nebo nestačí.');
 const supplyUse=createSupplyUse({journal,campaignId,minute:at,sourceId,resultIndex,unit:'foodDays',
  quantity,actorId,disposition:'packed-in-inventory'});
 const carry={format:FORAGING_CARRY,campaignId,minute:at,actorId,sourceId,resultIndex,quantity,
  itemId,itemName:name,totalWeightLb,sourcePages:[147,186],confirmedByGM:true};
 return {supplyUse,carry};
}
export function createForagingCarryEat({journal=[],campaignId,minute:at,actorId,carryId,quantity,nutritionDayId=null}={}){
 check(typeof campaignId==='string'&&campaignId&&minute(at)&&typeof actorId==='string'&&actorId&&
  typeof carryId==='string'&&carryId&&half(quantity),'Neplatná osobní spotřeba skutečně nesené potravy.');
 if(nutritionDayId!==null)check(typeof nutritionDayId==='string'&&nutritionDayId.length>0,
  'Neplatný účetní identifikátor spotřeby v nutričním dni.');
 const lot=foragedCarriedFood(journal,campaignId,at).find(x=>x.sourceJournalId===carryId&&x.actorId===actorId);
 check(lot&&lot.remaining>=quantity,'Potrava není doložena u této postavy nebo již byla snědena.');
 return {format:FORAGING_CARRY_EAT,campaignId,minute:at,actorId,carryId,quantity,
  itemId:lot.itemId,sourcePages:[147,186],confirmedByGM:true,
  ...(nutritionDayId!==null?{nutritionDayId}: {})};
}
/** An immutable read-only gear overlay, like campaign ration and water receipts. */
export function projectForagedFoodInventory(inventory=[],journal=[],campaignId,atMinute=1e9){
 if(!campaignId)return inventory;
 const out=[...inventory];
 for(const lot of foragedCarriedFood(journal,campaignId,atMinute)){
  if(lot.remaining<=0)continue;
  out.push({id:lot.itemId,characterId:lot.actorId,sourceItemId:'hmk:foraging:'+lot.itemName,
   snapshot:{id:'hmk:foraging:'+lot.itemName,name:'Nalezená potrava · '+lot.itemName,
    category:'other',properties:{weightLb:lot.totalWeightLb/lot.quantity}},
   quantity:lot.remaining,slot:'carried',gearStowage:'normal',_foragingCarryReceipt:lot.sourceJournalId});
 }
 return out;
}
export function validateForagingCarriedJournal(journal=[]){
 const prior=[],ids=new Set();
 for(const row of journal){
  const p=row.calendarForagingCarry,e=row.calendarForagingCarryEat,s=row.calendarForagingSupplyUse;
  if(s?.disposition==='packed-in-inventory')check(!!p,
   'Výdej nalezené potravy do inventáře musí mít odpovídající fyzický doklad.');
  if(p){
   const expected=createForagingCarry({journal:prior,campaignId:row.calendarCampaignId,
    minute:row.campaignMinute,actorId:row.characterId,sourceId:p.sourceId,
    resultIndex:p.resultIndex,quantity:p.quantity,itemName:p.itemName,
    totalWeightLb:p.totalWeightLb,itemId:p.itemId});
   check(JSON.stringify(expected.carry)===JSON.stringify(p)&&
    JSON.stringify(expected.supplyUse)===JSON.stringify(s)&&!ids.has(p.itemId),
    'Nesená potrava nesouhlasí s nálezem, skutečnou hmotností nebo příjemcem.');
   ids.add(p.itemId);
  }
  if(e){const expected=createForagingCarryEat({journal:prior,campaignId:row.calendarCampaignId,
   minute:row.campaignMinute,actorId:row.characterId,carryId:e.carryId,quantity:e.quantity,
    nutritionDayId:e.nutritionDayId??null});
   check(JSON.stringify(expected)===JSON.stringify(e),'Neplatná spotřeba nesené potravy.');}
  prior.push(row);
 }
 return true;
}
