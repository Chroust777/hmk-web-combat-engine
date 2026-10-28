/** HMK v1.2 pp.120–121,186. Exact printed empty vessels are inventory;
 * their contents are GM-attested, campaign-scoped immutable water evidence.
 * Waterskin 2 quart = 0.5 gallon, Jug 1 gallon = 1 gallon. 5 lb per
 * half-gallon of water is the original water-ledger weight convention.
 * Water can be consumed as two separately audited 0.5-gallon uses from a jug.
 * No water without a witnessed source, no separate clock changes.
 */
export const WATER_FILL='hmk-physical-water-fill-v1';
export const WATER_USE='hmk-physical-water-use-v1';
export const WATER_TRANSFER='hmk-water-transfer-v1';
export const WATER_LOSS='hmk-water-loss-v1';
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
  const t=row.calendarInventoryWaterTransfer;
  if(t&&map.has(t.donorFillId))map.get(t.donorFillId).remaining=Math.round((map.get(t.donorFillId).remaining-t.quantity)*2)/2;
  const l=row.calendarInventoryWaterLoss;
  if(l&&map.has(l.fillId))map.get(l.fillId).remaining=Math.round((map.get(l.fillId).remaining-l.quantity)*2)/2;
 }
 return result;
}
export function filledWaterForItem(journal=[],campaignId,actorId,itemId,minute=1e9){
 return waterskinBalances(journal,campaignId,actorId,minute).filter(x=>x.itemId===itemId).reduce((n,x)=>n+x.remaining,0);
}
export function createPotableWaterFill({inventory=[],journal=[],campaignId,actorId,itemId,minute,gmConfirmed=false,waterSource='',foragingSupplyUseId=null,waterTransferId=null}={}){
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
  ...(foragingSupplyUseId?{foragingSupplyUseId}:{}),...(waterTransferId?{waterTransferId}:{})};
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

/** A witnessed pour of already owned WATER CONTENTS (not a transfer of
 * either container). The source bottle remains the donor's property. The
 * receiver needs an actual empty and carried vessel of sufficient capacity.
 * Both receipts are committed atomically and time stays GM-controlled. */
export function recordPhysicalWaterTransfer(database,{donorId,recipientId,donorFillId,
 recipientItemId,transferId,fillId,campaignId,minute,gmConfirmed=false,
 reason='',createdAt=''}={}){
 check(database&&Array.isArray(database.inventory)&&Array.isArray(database.journal)&&
  Array.isArray(database.characters),'Chybí inventární účet vody');
 check(database.campaignClock&&(database.campaignClock.campaignId||`legacy:${database.campaignClock.events?.[0]?.id||''}`)===campaignId&&
  database.campaignClock.minute===minute&&isMinute(minute),'Převod vody vyžaduje skutečný čas otevřené kampaně GM');
 const members=database.campaignClock.characterIds??database.characters.map(c=>c.id);
 check(typeof donorId==='string'&&typeof recipientId==='string'&&donorId!==recipientId&&
  members.includes(donorId)&&members.includes(recipientId)&&
  database.characters.some(c=>c.id===donorId)&&database.characters.some(c=>c.id===recipientId),
  'Převod vody vyžaduje dvě různé postavy stejné kampaně');
 check(!database.combatRuntime?.sequence?.active,'V aktivním boji musí být převod řešen pravidlovou akcí');
 check(gmConfirmed===true&&typeof reason==='string'&&reason.trim().length>=2&&reason.trim().length<=120,
  'GM musí potvrdit skutečný přístup, pitnou vodu a okolnosti předání');
 check(typeof createdAt==='string'&&createdAt&&typeof transferId==='string'&&transferId&&
  typeof fillId==='string'&&fillId&&fillId!==transferId&&
  !database.journal.some(j=>j.id===transferId||j.id===fillId),
  'Převod potřebuje jedinečné auditní identifikátory');
 const source=database.journal.find(j=>j.id===donorFillId&&j.calendarInventoryWaterFill);
 check(source&&source.characterId===donorId&&source.calendarCampaignId===campaignId&&source.campaignMinute<=minute,
  'Původní naplnění vody není doloženo u předávající postavy');
 const donorItem=database.inventory.find(i=>i.id===source.calendarInventoryWaterFill.itemId&&i.characterId===donorId);
 const recipientItem=database.inventory.find(i=>i.id===recipientItemId&&i.characterId===recipientId);
 const volume=waterContainerCapacity(recipientItem);
 check(waterContainerCapacity(donorItem)!==null&&donorItem.slot==='carried',
  'Předávající musí skutečně nést původní nádobu');
 check(volume!==null&&recipientItem.slot==='carried',
  'Příjemce potřebuje vlastní prázdnou nesenou nádobu s doloženou kapacitou');
 check(filledWaterForItem(database.journal,campaignId,recipientId,recipientItemId,minute)===0,
  'Příjemcova nádoba není prázdná');
 const balance=availablePhysicalWater(database.journal,campaignId,donorId,minute).find(x=>x.fillId===donorFillId);
 check(balance&&balance.remaining>=volume,'V konkrétním zdrojovém naplnění není dostatek nepoužité vody');
 const receipt={format:WATER_TRANSFER,campaignId,minute,donorId,recipientId,donorFillId,
  donorItemId:donorItem.id,recipientItemId,quantity:volume,targetFillId:fillId,
  confirmedByGM:true,reason:reason.trim()};
 const staged=[...database.journal,{id:transferId,characterId:donorId,calendarCampaignId:campaignId,
  campaignMinute:minute,createdAt,title:'Voda · předání do nádoby',
  body:`${volume} gal · ${donorId} → ${recipientId}; zdroj ${donorFillId}; čas beze změny`,
  calendarInventoryWaterTransfer:receipt}];
 const fill=createPotableWaterFill({inventory:database.inventory,journal:staged,campaignId,actorId:recipientId,
  itemId:recipientItemId,minute,gmConfirmed:true,waterSource:`Předání od ${donorId}: ${reason.trim()}`,
  waterTransferId:transferId});
 const next=structuredClone(database);
 next.journal.push(staged.at(-1),{id:fillId,characterId:recipientId,calendarCampaignId:campaignId,
  campaignMinute:minute,createdAt,title:'Voda · převzetí do nádoby',
  body:`${volume} gal · ${recipientId}; doložený převod ${transferId}; čas beze změny`,
  calendarInventoryWaterFill:fill});
 validatePhysicalWaterJournal(next.journal,next.inventory,next);
 return next;
}
/** Witnessed spill, loss or disposal of potable contents. This is NOT
 * drinking or automatically a source of Thirst; future daily supplies are
 * evaluated by the existing GM-time nutrition system. */
export function recordPhysicalWaterLoss(database,{actorId,fillId,quantity,eventId,
 campaignId,minute,reason='',confirmedByGM=false,createdAt=''}={}){
 check(database&&Array.isArray(database.journal)&&Array.isArray(database.inventory)&&
  Array.isArray(database.characters)&&database.campaignClock,'Chybí inventář vody a kalendář');
 check((database.campaignClock.campaignId||`legacy:${database.campaignClock.events?.[0]?.id||''}`)===campaignId&&
  database.campaignClock.minute===minute&&isMinute(minute),'Odpis vody vyžaduje aktuální čas GM');
 check(database.characters.some(c=>c.id===actorId)&&
  (database.campaignClock.characterIds??database.characters.map(c=>c.id)).includes(actorId),
  'Postava nepatří do aktuální kampaně');
 check(!database.combatRuntime?.sequence?.active,'Ztrátu během Initiative řešte pravidlovou Combat akcí');
 check(confirmedByGM===true&&typeof reason==='string'&&reason.trim().length>=2&&reason.trim().length<=160,
  'GM musí potvrdit skutečnou ztrátu a její okolnosti');
 check([0.5,1].includes(quantity)&&typeof eventId==='string'&&eventId&&
  typeof createdAt==='string'&&createdAt&&!database.journal.some(j=>j.id===eventId),
  'Neplatný objem nebo duplicitní auditní ID');
 const fill=database.journal.find(j=>j.id===fillId&&j.calendarInventoryWaterFill&&
  j.characterId===actorId&&j.calendarCampaignId===campaignId&&j.campaignMinute<=minute);
 const balance=waterskinBalances(database.journal,campaignId,actorId,minute).find(x=>x.fillId===fillId);
 check(fill&&balance&&balance.remaining>=quantity,'Voda v původní nádobě již není dostupná');
 const item=database.inventory.find(i=>i.id===balance.itemId&&i.characterId===actorId);
 check(waterContainerCapacity(item)!==null&&item.slot==='carried',
  'Nádoba s vodou musí být skutečně nesená v otevřené kampani');
 const proof={format:WATER_LOSS,campaignId,actorId,minute,fillId,itemId:balance.itemId,
  quantity,unit:'waterDays',reason:reason.trim(),confirmedByGM:true};
 const next=structuredClone(database);
 next.journal.push({id:eventId,characterId:actorId,calendarCampaignId:campaignId,campaignMinute:minute,
  createdAt,title:'Inventář · odpis doložené vody',
  body:`${quantity} gal · ${item.snapshot.name} · ${reason.trim()}; nevypito, čas GM beze změny`,
  calendarInventoryWaterLoss:proof});
 validatePhysicalWaterJournal(next.journal,next.inventory,next);
 return next;
}
export function validatePhysicalWaterJournal(journal=[],inventory=null,database=null){
 const transfers=new Map(),fillsFromTransfer=new Set();
 const prior=[];
 for(const row of journal){const f=row.calendarInventoryWaterFill,u=row.calendarInventoryWaterUse,t=row.calendarInventoryWaterTransfer,l=row.calendarInventoryWaterLoss;
  if(t){
   check(t.format===WATER_TRANSFER&&row.characterId===t.donorId&&row.calendarCampaignId===t.campaignId&&
    row.campaignMinute===t.minute&&isMinute(t.minute)&&typeof row.createdAt==='string'&&row.createdAt&&
    typeof t.donorId==='string'&&t.donorId&&typeof t.recipientId==='string'&&t.recipientId&&
    t.recipientId!==t.donorId&&typeof t.donorFillId==='string'&&t.donorFillId&&
    typeof t.donorItemId==='string'&&t.donorItemId&&typeof t.recipientItemId==='string'&&t.recipientItemId&&
    typeof t.targetFillId==='string'&&t.targetFillId&&[0.5,1].includes(t.quantity)&&
    t.confirmedByGM===true&&typeof t.reason==='string'&&t.reason.length>=2&&t.reason.length<=160&&
    !transfers.has(row.id),'Poškozené nebo opakované předání vody');
   const source=prior.find(x=>x.id===t.donorFillId)?.calendarInventoryWaterFill;
   check(source&&source.campaignId===t.campaignId&&source.actorId===t.donorId&&
    source.itemId===t.donorItemId&&source.minute<=t.minute&&
    waterskinBalances(prior,t.campaignId,t.donorId,t.minute).some(x=>x.fillId===t.donorFillId&&x.remaining>=t.quantity),
    'Předaná voda nemá původní nepoužitý objem u dárce');
   transfers.set(row.id,t);
  }
  if(f){check(f.format===WATER_FILL&&f.campaignId===row.calendarCampaignId&&f.actorId===row.characterId&&
   f.minute===row.campaignMinute&&isMinute(f.minute)&&[0.5,1].includes(f.quantity)&&f.weightLb===f.quantity*10&&
   f.unit==='waterDays'&&f.potableAndFilledConfirmedByGM===true&&
   typeof f.waterSource==='string'&&f.waterSource.length>=2&&f.waterSource.length<=160&&
   JSON.stringify(f.sourcePages)==='[120,121,186]'&&typeof f.itemId==='string'&&f.itemId&&
   (f.foragingSupplyUseId===undefined||(typeof f.foragingSupplyUseId==='string'&&f.foragingSupplyUseId.length>0))&&
   (f.waterTransferId===undefined||(typeof f.waterTransferId==='string'&&f.waterTransferId.length>0))&&
   filledWaterForItem(prior,f.campaignId,f.actorId,f.itemId,f.minute)===0,
   'Poškozené nebo duplicitní naplnění nádoby na vodu');
   if(f.waterTransferId!==undefined){
    const transfer=transfers.get(f.waterTransferId);
    check(transfer&&transfer.targetFillId===row.id&&transfer.campaignId===f.campaignId&&
     transfer.recipientId===f.actorId&&transfer.recipientItemId===f.itemId&&transfer.minute===f.minute&&
     transfer.quantity===f.quantity&&f.waterSource.startsWith(`Předání od ${transfer.donorId}: `)&&
     !fillsFromTransfer.has(f.waterTransferId),'Nedoložené nebo duplicitní převzetí vody');
    fillsFromTransfer.add(f.waterTransferId);
   }
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
  if(l){
   const origin=prior.find(x=>x.id===l.fillId)?.calendarInventoryWaterFill;
   const balance=waterskinBalances(prior,l.campaignId,l.actorId,l.minute).find(x=>x.fillId===l.fillId);
   check(l.format===WATER_LOSS&&l.campaignId===row.calendarCampaignId&&
    l.actorId===row.characterId&&l.minute===row.campaignMinute&&isMinute(l.minute)&&
    [0.5,1].includes(l.quantity)&&origin&&origin.actorId===l.actorId&&
    origin.itemId===l.itemId&&balance&&balance.remaining>=l.quantity&&
    l.unit==='waterDays'&&l.confirmedByGM===true&&
    typeof l.reason==='string'&&l.reason.length>=2&&l.reason.length<=160&&
    typeof row.createdAt==='string'&&row.createdAt,
    'Poškozený nebo nedoložený odpis vody');
  }
  prior.push(row);
 }
 for(const id of transfers.keys())check(fillsFromTransfer.has(id),'Osiřelý převod vody bez příjemcovy nádoby');
 return true;
}
export function projectCampaignWaterInventory(inventory=[],journal=[],campaignId){
 if(!campaignId)return inventory;
 return inventory.map(item=>{
  const volume=filledWaterForItem(journal,campaignId,item.characterId,item.id);
  return volume>0?{...item,waterContentsLb:volume*10}:item;
 });
}

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

export function assertWaterBacking(before,after,campaignId=null){
 const locked=new Set((after.journal||[]).filter(j=>j.calendarInventoryWaterFill&&(campaignId===null||j.calendarCampaignId===campaignId)).map(j=>j.calendarInventoryWaterFill.itemId));
 const old=new Map((before.inventory||[]).map(i=>[i.id,i])),now=new Map((after.inventory||[]).map(i=>[i.id,i]));
 for(const id of locked)if(old.has(id))check(now.has(id)&&(JSON.stringify(old.get(id))===JSON.stringify(now.get(id))||isApprovedStableRelocation575(before,after,id,old.get(id),now.get(id))),
  'Doloženou nádobu s vodou nelze přepsat nebo odebrat z inventáře mimo auditní proces');
 return true;
}
export function assertWaterAppendOnly(before=[],after=[]){
 const now=new Map(after.map(j=>[j.id,j]));
 for(const row of before)if(row.calendarInventoryWaterFill||row.calendarInventoryWaterUse||row.calendarInventoryWaterTransfer||row.calendarInventoryWaterLoss)
  check(now.has(row.id)&&JSON.stringify(now.get(row.id))===JSON.stringify(row),
   'Doložená naplnění a spotřeba vody se nesmějí změnit ani smazat');
 return true;
}
