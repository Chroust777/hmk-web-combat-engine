/** HMK v1.2 pp.120–121,186. Exact printed empty vessels are inventory;
 * their contents are GM-attested, campaign-scoped immutable water evidence.
 * Waterskin 2 quart = 0.5 gallon, Jug 1 gallon = 1 gallon. 5 lb per
 * half-gallon of water is the original water-ledger weight convention.
 * Water can be consumed as two separately audited 0.5-gallon uses from a jug.
 * No water without a witnessed source, no separate clock changes.
 */
export const WATER_FILL='hmk-physical-water-fill-v1';
export const WATER_USE='hmk-physical-water-use-v1';
export const WATER_ITEM='hmk:gear:hmk-p120-040';
export const WATER_JUG_ITEM='hmk:gear:hmk-p121-043';
const VESSELS=Object.freeze({
 [WATER_ITEM]:Object.freeze({name:'Waterskin, 2 quart',emptyLb:2,capacity:0.5,page:120}),
 [WATER_JUG_ITEM]:Object.freeze({name:'Jug, 1 gallon',emptyLb:5,capacity:1,page:121})
});
/** Exactly identified single-item inventory stacks; no guessed capacities. */
export function waterContainerCapacity(item){
 const v=VESSELS[item?.sourceItemId];
 return v&&item.snapshot?.id===item.sourceItemId&&item.snapshot?.name===v.name&&
  item.snapshot?.category==='other'&&item.snapshot?.properties?.weightLb===v.emptyLb&&
  item.quantity===1?v.capacity:null;
}
const fail=m=>{throw Error(m)};
const check=(v,m)=>{if(!v)fail(m)};
const isMinute=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
export function waterskinBalances(journal=[],campaignId,actorId,minute=1e9){
 const result=[],map=new Map();
 for(const row of journal){if(row.calendarCampaignId!==campaignId||row.characterId!==actorId||row.campaignMinute>minute)continue;
  const f=row.calendarInventoryWaterFill;
  if(f){const rec={fillId:row.id,itemId:f.itemId,remaining:f.quantity,quantity:f.quantity,minute:f.minute};result.push(rec);map.set(row.id,rec);}
  const u=row.calendarInventoryWaterUse;
  if(u&&map.has(u.fillId))map.get(u.fillId).remaining=Math.round((map.get(u.fillId).remaining-u.quantity)*2)/2;
 }
 return result;
}
export function filledWaterForItem(journal=[],campaignId,actorId,itemId,minute=1e9){
 return waterskinBalances(journal,campaignId,actorId,minute).filter(x=>x.itemId===itemId).reduce((n,x)=>n+x.remaining,0);
}
export function createPotableWaterFill({inventory=[],journal=[],campaignId,actorId,itemId,minute,gmConfirmed=false,waterSource='',foragingSupplyUseId=null}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
  typeof itemId==='string'&&itemId&&isMinute(minute),'Voda vyžaduje postavu, kampaň a skutečný čas');
 const item=inventory.find(x=>x.id===itemId&&x.characterId===actorId);
 const capacity=waterContainerCapacity(item);
 check(capacity!==null&&item.slot==='carried','Naplnit lze jen přesně doložený a nesený Waterskin 2 quart nebo Jug 1 gallon (1 ks; HMK 120–121)');
 check(gmConfirmed===true,'GM musí doložit skutečnou pitnou vodu, naplnění a dostupnost nádoby');
 check(typeof waterSource==='string'&&waterSource.trim().length>=2&&waterSource.trim().length<=160,
  'Uveďte skutečný zdroj pitné vody (např. studna ve vsi)');
 check(filledWaterForItem(journal,campaignId,actorId,itemId,minute)===0,'Nádoba už obsahuje doloženou vodu – nejprve ji spotřebujte');
 return {format:WATER_FILL,campaignId,actorId,itemId,minute,quantity:capacity,unit:'waterDays',weightLb:capacity*10,
  potableAndFilledConfirmedByGM:true,waterSource:waterSource.trim(),sourcePages:[120,121,186],
  ...(foragingSupplyUseId?{foragingSupplyUseId}:{})};
}
export function availablePhysicalWater(journal=[],campaignId,actorId,minute){
 return waterskinBalances(journal,campaignId,actorId,minute).filter(x=>x.remaining>=0.5&&x.minute<=minute)
  .sort((a,b)=>a.minute-b.minute||a.fillId.localeCompare(b.fillId));
}
export function createPhysicalWaterUse({journal=[],campaignId,actorId,minute,fillId,quantity=0.5}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&isMinute(minute)&&
  typeof fillId==='string'&&fillId&&quantity===0.5,'Výdej vody musí být přesně půl galonu z doložené nádoby');
 const f=journal.find(x=>x.id===fillId&&x.calendarInventoryWaterFill);
 check(f&&f.characterId===actorId&&f.calendarCampaignId===campaignId&&f.campaignMinute<=minute,
  'Voda nepatří této postavě a kampani, nebo ještě nebyla doložena');
 const balance=availablePhysicalWater(journal,campaignId,actorId,minute).find(x=>x.fillId===fillId);
 check(balance&&balance.remaining>=quantity,'Voda v nádobě nestačí nebo již byla vydána');
 return {format:WATER_USE,campaignId,actorId,minute,fillId,itemId:balance.itemId,quantity,unit:'waterDays',sourcePages:[120,121,186]};
}
export function validatePhysicalWaterJournal(journal=[],inventory=null,database=null){
 const prior=[];
 for(const row of journal){const f=row.calendarInventoryWaterFill,u=row.calendarInventoryWaterUse;
  if(f){check(f.format===WATER_FILL&&f.campaignId===row.calendarCampaignId&&f.actorId===row.characterId&&
   f.minute===row.campaignMinute&&isMinute(f.minute)&&[0.5,1].includes(f.quantity)&&f.weightLb===f.quantity*10&&
   f.unit==='waterDays'&&f.potableAndFilledConfirmedByGM===true&&
   typeof f.waterSource==='string'&&f.waterSource.length>=2&&f.waterSource.length<=160&&
   JSON.stringify(f.sourcePages)==='[120,121,186]'&&typeof f.itemId==='string'&&f.itemId&&
   (f.foragingSupplyUseId===undefined||(typeof f.foragingSupplyUseId==='string'&&f.foragingSupplyUseId.length>0))&&
   filledWaterForItem(prior,f.campaignId,f.actorId,f.itemId,f.minute)===0,
   'Poškozené nebo duplicitní naplnění nádoby na vodu');
   if(inventory!==null||database!==null){
    const live=database?.campaignClock?.campaignId===f.campaignId||
     (database?.campaignClock&&!database.campaignClock.campaignId&&f.campaignId===`legacy:${database.campaignClock.events?.[0]?.id||''}`);
    const archive=database?.calendarEvidenceArchives?.find(a=>a.sourceCampaignId===f.campaignId);
    const source=database?(live?database.inventory:
      database.campaignActorBranches?.[f.campaignId]?.[f.actorId]?.inventory??archive?.waterInventoryBackings):inventory;
    check(Array.isArray(source)&&waterContainerCapacity(source.find(x=>x.id===f.itemId&&x.characterId===f.actorId))===f.quantity,
    'Doložená nádoba nebo její objem nebyly nalezeny ve své původní časové větvi');
   }
  }
  if(u){const expected=createPhysicalWaterUse({journal:prior,campaignId:row.calendarCampaignId,
   actorId:row.characterId,minute:row.campaignMinute,fillId:u.fillId,quantity:u.quantity});
   if(u.nutritionDayId!==undefined){check(typeof u.nutritionDayId==='string'&&u.nutritionDayId,'Chybí denní vazba vody');expected.nutritionDayId=u.nutritionDayId;}
   check(JSON.stringify(expected)===JSON.stringify(u),'Pozměněný výdej fyzické vody');
  }
  prior.push(row);
 }
 return true;
}
export function projectCampaignWaterInventory(inventory=[],journal=[],campaignId){
 if(!campaignId)return inventory;
 return inventory.map(item=>{
  const volume=filledWaterForItem(journal,campaignId,item.characterId,item.id);
  return volume>0?{...item,waterContentsLb:volume*10}:item;
 });
}
export function assertWaterBacking(before,after,campaignId=null){
 const locked=new Set((after.journal||[]).filter(j=>j.calendarInventoryWaterFill&&(campaignId===null||j.calendarCampaignId===campaignId)).map(j=>j.calendarInventoryWaterFill.itemId));
 const old=new Map((before.inventory||[]).map(i=>[i.id,i])),now=new Map((after.inventory||[]).map(i=>[i.id,i]));
 for(const id of locked)if(old.has(id))check(now.has(id)&&JSON.stringify(old.get(id))===JSON.stringify(now.get(id)),
  'Doloženou nádobu s vodou nelze přepsat nebo odebrat z inventáře mimo auditní proces');
 return true;
}
export function assertWaterAppendOnly(before=[],after=[]){
 const now=new Map(after.map(j=>[j.id,j]));
 for(const row of before)if(row.calendarInventoryWaterFill||row.calendarInventoryWaterUse)
  check(now.has(row.id)&&JSON.stringify(now.get(row.id))===JSON.stringify(row),
   'Doložená naplnění a spotřeba vody se nesmějí změnit ani smazat');
 return true;
}
