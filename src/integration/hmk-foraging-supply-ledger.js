/** HMK p.147 food-days/water-days and p.74 herb doses. A transparent, append-only
 * supply ACCOUNT, not manufactured food equipment or a fabricated concoction.
 * Consume an actually witnessed yield once; never debit across campaigns.
 * Crafting must be performed by its original Herbalism/Alchemy executor.
 */
const requireIt=(value,message)=>{if(!value)throw Error(message)};
const units=['foodDays','waterDays','herbDoses'];
export const FORAGING_SUPPLY_USE_FORMAT='hmk-foraging-supply-use-v1';
function lotsFromProof(row){
 const p=row.calendarTrekWildernessProof;if(!p)return [];
 return p.results.flatMap((r,i)=>units.filter(unit=>r[unit]>0).map(unit=>({
  key:row.id+':'+i+':'+unit,sourceId:row.id,resultIndex:i,
  campaignId:row.calendarCampaignId,minute:row.campaignMinute,
  unit,herbName:unit==='herbDoses'?r.herbName:null,quantity:r[unit]
 })));
}
export function supplyLots(journal=[],campaignId){
 return journal.filter(j=>j.calendarCampaignId===campaignId).flatMap(lotsFromProof);
}
export function supplyBalances(journal=[],campaignId){
 const gross={foodDays:0,waterDays:0,herbDoses:0,herbs:{}};
 const available={foodDays:0,waterDays:0,herbDoses:0,herbs:{}};
 const lots=supplyLots(journal,campaignId);
 const left=new Map(lots.map(l=>[l.key,l.quantity]));
 for(const l of lots){gross[l.unit]+=l.quantity;if(l.herbName)gross.herbs[l.herbName]=(gross.herbs[l.herbName]||0)+l.quantity}
 for(const row of journal){const p=row.calendarForagingSupplyUse;if(!p||row.calendarCampaignId!==campaignId)continue;
  const key=p.sourceId+':'+p.resultIndex+':'+p.unit;
  left.set(key,Math.round(((left.get(key)??0)-p.quantity)*2)/2);
 }
 for(const l of lots){const n=left.get(l.key);available[l.unit]+=n;if(l.herbName)available.herbs[l.herbName]=(available.herbs[l.herbName]||0)+n}
 return {gross,available,lots:lots.map(l=>({...l,remaining:left.get(l.key)}))};
}
export function availableSupplyLots(journal=[],campaignId){return supplyBalances(journal,campaignId).lots.filter(x=>x.remaining>0)};
export function createSupplyUse({journal=[],campaignId,minute,sourceId,resultIndex,unit,quantity,
 actorId,disposition,purpose='',containerFillId=null}={}){
 requireIt(typeof campaignId==='string'&&campaignId&&Number.isSafeInteger(minute)&&minute>=0,
  'Zásoby vyžadují konkrétní kampaň a doloženou aktuální minutu');
 requireIt(typeof sourceId==='string'&&sourceId&&Number.isSafeInteger(resultIndex)&&resultIndex>=0&&
  units.includes(unit)&&Number.isFinite(quantity)&&quantity>=0.5&&quantity<=999999&&
  Number.isSafeInteger(quantity*(unit==='herbDoses'?1:2)),
  'Neplatný zdroj nebo množství zásob');
 requireIt(typeof actorId==='string'&&actorId.length>0,'Vyberte postavu, která zásobu používá');
 requireIt(unit==='herbDoses'?disposition==='ingredient-reserved':
  unit==='waterDays'?['consumed','stored-in-container'].includes(disposition):disposition==='consumed',
  'Byliny lze rezervovat; voda může být spotřebována nebo doloženě naplněna do nádoby');
 requireIt(disposition!=='stored-in-container'||([0.5,1].includes(quantity)&&unit==='waterDays'&&typeof containerFillId==='string'&&containerFillId.length>0),
  'Převod vody do nádoby vyžaduje jedinečný důkaz naplnění a 0,5 nebo 1 galon');
 requireIt(typeof purpose==='string'&&purpose.length<=120&&(disposition!=='ingredient-reserved'||purpose.trim()),
  'Rezervace bylin potřebuje označení zamýšlené Concoction (nenahrazuje její výrobu)');
 const origin=journal.find(j=>j.id===sourceId);
 requireIt(origin?.calendarTrekWildernessProof&&origin.calendarCampaignId===campaignId&&
  origin.campaignMinute<=minute,'Zdroj není doložen v této kampani a minulosti');
 const result=origin.calendarTrekWildernessProof.results[resultIndex];
 requireIt(result&&result[unit]>0,'Původní Foraging neobsahuje tuto zásobu');
 const available=availableSupplyLots(journal,campaignId).find(l=>
  l.sourceId===sourceId&&l.resultIndex===resultIndex&&l.unit===unit);
 requireIt(available?.remaining>=quantity,'Zásoba byla již vydána nebo nestačí');
 return {format:FORAGING_SUPPLY_USE_FORMAT,sourceId,resultIndex,unit,quantity,actorId,
  disposition,purpose:disposition==='ingredient-reserved'?purpose.trim():'',
  herbName:unit==='herbDoses'?result.herbName:null,sourceMinute:origin.campaignMinute,
  minute,sourcePages:unit==='herbDoses'?[74,147]:[147,186],
  ...(disposition==='stored-in-container'?{containerFillId}:{})};
}
export function validateSupplyJournal(journal=[]){
 // Replay STRICTLY in insertion order: receipts must exist before debits and
 // all debits must be attributable to an older journal source.
 const prior=[];
 for(const row of journal){
  const p=row.calendarForagingSupplyUse;
  if(p){
   const expected=createSupplyUse({journal:prior,campaignId:row.calendarCampaignId,
    minute:row.campaignMinute,sourceId:p.sourceId,resultIndex:p.resultIndex,
    unit:p.unit,quantity:p.quantity,actorId:p.actorId,disposition:p.disposition,purpose:p.purpose,
    containerFillId:p.containerFillId});
   if(p.nutritionDayId!==undefined){
    requireIt(typeof p.nutritionDayId==='string'&&p.nutritionDayId.length>0,
     'Neplatná vazba automatického denního přídělu');
    expected.nutritionDayId=p.nutritionDayId;
   }
   requireIt(row.characterId===p.actorId&&JSON.stringify(p)===JSON.stringify(expected),
    'Nepodložený, cizí nebo pozměněný výdej zásob');
  }
  prior.push(row);
 }
 return true;
}

/** Batch-ration allocation from proven Foraging lots. No inference of daily
 * nutrition, activity, heat or hunger. The GM explicitly chooses per-character
 * amounts; the system picks oldest available lots automatically and atomically.
 * A journal row per character/resource/lot preserves full provenance. */
export function allocateForagingRations({journal=[],campaignId,minute,actorIds=[],foodEach=0,waterEach=0}={}){
 requireIt(Array.isArray(actorIds)&&actorIds.length>=1&&actorIds.length<=10000&&
  actorIds.every(x=>typeof x==='string'&&x.length>0)&&new Set(actorIds).size===actorIds.length,
  'Vyberte jedinečné postavy pro společný výdej');
 requireIt([0,0.5,1].includes(foodEach)&&[0,0.5,1,2].includes(waterEach)&&
  foodEach+waterEach>0,'Zvolte doloženou dávku jídla a vody; rest/heat určete podle HMK 186');
 const temporary=[...journal],proofs=[];
 for(const actorId of actorIds)for(const [unit,demand] of [['foodDays',foodEach],['waterDays',waterEach]]){
  let remaining=demand;
  while(remaining>0){
   const lot=availableSupplyLots(temporary,campaignId).find(l=>l.unit===unit&&l.minute<=minute);
   requireIt(lot,'Nedostatek '+unit+' pro '+actorId+'. Nebyl vydán žádný díl skupinové dávky.');
   const quantity=Math.min(remaining,lot.remaining);
   const proof=createSupplyUse({journal:temporary,campaignId,minute,sourceId:lot.sourceId,
    resultIndex:lot.resultIndex,unit,quantity,actorId,disposition:'consumed'});
   proofs.push(proof);
   // Synthetic rows exist only in memory to enforce availability across
   // the entire batch; caller commits all real journal rows atomically.
   temporary.push({id:'__ration-batch-'+proofs.length,characterId:actorId,
    calendarCampaignId:campaignId,campaignMinute:minute,calendarForagingSupplyUse:proof});
   remaining=Math.round((remaining-quantity)*2)/2;
  }
 }
 return proofs;
}
/** Prevent ordinary notes editing/deletion from erasing supply debits or
 * witnessed Foraging receipts. Calendar reset/backup remains a separate
 * explicit evidence-preserving operation. */
export function assertSupplyJournalAppendOnly(previous=[],next=[]){
 const byId=new Map(next.map(row=>[row.id,row]));
 for(const row of previous){
  if(!row.calendarForagingSupplyUse&&!row.calendarTrekWildernessProof)continue;
  requireIt(byId.has(row.id)&&JSON.stringify(byId.get(row.id))===JSON.stringify(row),
   'Doložený nález nebo výdej zásob nelze změnit ani smazat přes běžný zápisník');
 }
 return true;
}
