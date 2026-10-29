/** HMK 1.2 pp. 65, 122, 141, 145, 354–357.
 * Stable-only, append-only event ledger. Purchased tack and cargo are physical
 * stable property, NEVER copies of a character's carried inventory.
 * GM attestation is required where HMK provides no feeding/resale price table.
 */
import {VEHICLES_TACK_P122} from '../rules/conveyance-printed-p122.js';
import {mountLoadENC,mountPersonalFatigue} from '../rules/gear-load.js';
import {strengthEncumbranceModifier} from '../rules/encumbrance.js';
import {filledWaterForItem} from './hmk-physical-water-ledger.js';
import {rationStockBalances} from './hmk-physical-ration-ledger.js';
export const STABLE_HUB_FORMAT_574='hmk-stable-hub-574';
const types=new Set(['sale','release','tack-add','tack-remove','vehicle-add','vehicle-remove','cargo-add','cargo-remove','inventory-load','inventory-unload','inventory-gear-attach','inventory-gear-detach','vehicle-cargo-add','vehicle-cargo-remove','training-activate','care','rider-mount','rider-dismount']);
export const STABLE_VEHICLES_P122=Object.freeze(VEHICLES_TACK_P122.filter(x=>['Cart, 2-wheel','Sled','Wagon, 4-wheel'].includes(x.name)));
const isId=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const nonnegative=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000;
const narrative=x=>typeof x==='string'&&x.length>=3&&x.length<=240;
const fail=message=>{throw Error('Stáj: '+message)};
const requireValid=(condition,message)=>{if(!condition)fail(message)};
export function stableHubEvents(data,campaignId,animalId){
 return (data?.journal||[]).filter(j=>j.stableHub574?.format===STABLE_HUB_FORMAT_574&&j.calendarCampaignId===campaignId&&j.stableHub574.animalId===animalId);
}
export function stableHubProjection(data,campaignId,animalId){
 const events=stableHubEvents(data,campaignId,animalId);const tack=new Map(),vehicles=new Map(),cargo=new Map(),inventoryItems=new Map(),vehicleCargo=new Map(),care=[];let exit=null,rider=null;
 for(const j of events){const x=j.stableHub574;
  if(x.type==='sale'||x.type==='release'){exit={type:x.type,priceD:x.priceD??0,minute:j.campaignMinute,id:j.id,reason:x.reason};continue;}
  if(x.type==='tack-add'||x.type==='inventory-gear-attach'&&x.role==='tack')tack.set(x.entryId,{...x,proofId:j.id});
  if(x.type==='tack-remove'||x.type==='inventory-gear-detach'&&x.role==='tack')tack.delete(x.entryId);
  if(x.type==='vehicle-add'||x.type==='inventory-gear-attach'&&x.role==='vehicle')vehicles.set(x.entryId,{...x,proofId:j.id});
  if(x.type==='vehicle-remove'||x.type==='inventory-gear-detach'&&x.role==='vehicle')vehicles.delete(x.entryId);
  if(x.type==='cargo-add')cargo.set(x.entryId,{...x,proofId:j.id});
  if(x.type==='cargo-remove')cargo.delete(x.entryId);
  if(x.type==='inventory-load')inventoryItems.set(x.inventoryId,{...x,proofId:j.id});
  if(x.type==='inventory-unload')inventoryItems.delete(x.inventoryId);
  if(x.type==='vehicle-cargo-add')vehicleCargo.set(x.entryId,{...x,proofId:j.id});
  if(x.type==='vehicle-cargo-remove')vehicleCargo.delete(x.entryId);
  if(x.type==='care')care.push({id:j.id,minute:j.campaignMinute,...x});
  if(x.type==='rider-mount')rider={characterId:x.riderId,weightLb:x.riderWeightLb,minute:j.campaignMinute,proofId:j.id};
  if(x.type==='rider-dismount')rider=null;
 }
 const tackRows=[...tack.values()],vehicleRows=[...vehicles.values()],cargoRows=[...cargo.values()],inventoryRows=[...inventoryItems.values()],vehicleCargoRows=[...vehicleCargo.values()];
 const tackLb=tackRows.reduce((n,e)=>n+e.weightLb,0),cargoLb=cargoRows.reduce((n,e)=>n+e.weightLb,0)+inventoryRows.reduce((n,e)=>n+e.weightLb,0);
 const gearNames=tackRows.map(t=>VEHICLES_TACK_P122.find(i=>i.id===t.itemId)?.name||'');
 const isPack=gearNames.includes('Pack harness');
 const bags=gearNames.filter(n=>n==='Saddle bags, 15 lb').length;
 return {events,tack:tackRows,vehicles:vehicleRows,cargo:cargoRows,inventoryItems:inventoryRows,vehicleCargo:vehicleCargoRows,care,exit,rider,tackLb,cargoLb,
   capacityType:isPack?'pack':bags?'saddle-bags':'none',packHarness:isPack,bags};
}
export function stableCargoCapacity(projection,spec){
 if(projection.packHarness){if(!spec?.breed)return null;const weight=spec?.bodyWeightLb;return Number.isFinite(weight)&&weight>0?Math.floor(weight*0.2):null;}
 if(projection.bags)return projection.bags*15;
 return 0;
}
export function stableBurden(data,campaignId,animal){
 const p=stableHubProjection(data,campaignId,animal.id),spec=animal.spec;
 // A loaded container weighs more when full; a ration stack physically loses
 // weight as the ORIGINAL consumable lot is spent. Both are journal overlays.
 const now=data.campaignClock?.minute??1e9;
 const stocks=rationStockBalances(data.journal,campaignId,animal.ownerId,now);
 const moved=p.inventoryItems.map(entry=>{
  const actual=(data.inventory||[]).find(i=>i.id===entry.inventoryId);
  if(!actual)return {...entry,currentWeightLb:entry.weightLb};
  const lots=stocks.filter(q=>q.itemId===entry.inventoryId);
  const base=lots.length?lots.reduce((s,q)=>s+q.remaining*3,0):entry.weightLb;
  const added=filledWaterForItem(data.journal,campaignId,animal.ownerId,entry.inventoryId,now)*10;
  return {...entry,currentWeightLb:Math.max(0,base)+added};
 });
 const cargoLb=p.cargoLb+moved.reduce((sum,e)=>sum+e.currentWeightLb-e.weightLb,0);
 const gearAndCargoLb=p.tackLb+cargoLb;
 const riderWeightLb=p.rider?.weightLb??0;
 const minimumLb=gearAndCargoLb+riderWeightLb;
 const capacity=stableCargoCapacity(p,spec);
 const usesAnimalLoad=!!(spec.str&&spec.breed),loadKind=spec.breed==='camel'?'camel':spec.breed==='elephant'?'elephant':spec.breed==='bovine'?'bovine':'horse';
 const base=usesAnimalLoad?mountLoadENC(minimumLb,{kind:loadKind}):null;
 const adjusted=base===null?null:Math.max(0,base+strengthEncumbranceModifier(spec.str)+(spec.breed==='mule'?-20:0));
 return {...p,inventoryItems:moved,cargoLb,gearAndCargoLb,riderWeightLb,minimumLb,capacity,baseENC:base,adjustedENC:adjusted,
  pf:adjusted===null?null:mountPersonalFatigue(adjusted),requiresAdditionalRiderWeight:!p.rider,
  cargoOverflow:capacity!==null&&cargoLb>capacity};
}
export function validateStableHub(data,offerForId=null){
 const animals=new Map();
 for(const owner of data?.characters||[])for(const a of owner.hmk?.livestock||[])animals.set(a.id,{...a,holder:owner.id});
 const touched=new Set(),entryIds=new Set(),transactionIds=new Set();const snapshots=new Map();
 for(const j of data?.journal||[]){const x=j.stableHub574;if(x===undefined)continue;
  requireValid(x&&typeof x==='object'&&x.format===STABLE_HUB_FORMAT_574&&types.has(x.type),'neznámý doklad správy zvířete');
  requireValid(isId(j.id)&&!touched.has(j.id),'duplicitní ID stájového dokladu');touched.add(j.id);
  const animal=animals.get(x.animalId);
  requireValid(animal&&j.calendarCampaignId===animal.campaignId&&j.characterId===animal.ownerId&&x.ownerId===animal.ownerId&&
   Number.isSafeInteger(j.campaignMinute)&&j.campaignMinute>=animal.minute&&j.campaignMinute>=0,'nesoulad identity, kampaně nebo času');
  const state=snapshots.get(x.animalId)||{exit:false,tack:new Map(),vehicles:new Map(),cargo:new Map(),inventory:new Map(),gear:new Map(),vehicleCargo:new Map(),rider:null,lastMinute:animal.minute};
  requireValid(j.campaignMinute>=state.lastMinute&&!state.exit,'zápis po prodeji nebo zpětně v čase');state.lastMinute=j.campaignMinute;
  if(x.type==='sale'||x.type==='release'){
   requireValid(x.type!=='sale'||nonnegative(x.priceD),'neplatná prodejní cena');
   requireValid(narrative(x.reason),'prodej/opouštění vyžaduje podklad GM');
   requireValid(x.type!=='release'||x.priceD===0,'opuštění nesmí přidávat peníze');
   requireValid(!state.tack.size&&!state.vehicles.size&&!state.cargo.size&&!state.inventory.size&&!state.gear.size&&!state.vehicleCargo.size&&!state.rider,'před vyřazením zvířete se musí vyložit náklad a oddělit výstroj/vozidla');
   state.exit=true;
  }else if(x.type==='tack-add'){
   const item=VEHICLES_TACK_P122.find(t=>t.id===x.itemId),factor=x.elephantMultiplier===5?5:1;
   requireValid(item&&isId(x.entryId)&&!entryIds.has(x.entryId)&&nonnegative(x.weightLb)&&x.weightLb===item.weightLb*factor&&
    x.priceD===item.priceD*factor&&['buy','gift'].includes(x.mode)&&!!x.reason&&narrative(x.reason)&&
    (factor===1||animal.beastId==='hmk-p122-beast-07'),'nesprávný předmět, hmotnost či cena postroje');
   entryIds.add(x.entryId);state.tack.set(x.entryId,x);
  }else if(x.type==='tack-remove'){
   requireValid(state.tack.has(x.entryId)&&narrative(x.reason),'odstraněn neexistující postroj');state.tack.delete(x.entryId);
  }else if(x.type==='vehicle-add'){
   const item=STABLE_VEHICLES_P122.find(t=>t.id===x.itemId);
   requireValid(item&&isId(x.entryId)&&!entryIds.has(x.entryId)&&x.weightLb===item.weightLb&&x.priceD===item.priceD&&
    ['buy','gift'].includes(x.mode)&&narrative(x.reason),'neplatný doklad vozidla');
   entryIds.add(x.entryId);state.vehicles.set(x.entryId,x);
  }else if(x.type==='vehicle-remove'){
   requireValid(state.vehicles.has(x.entryId)&&narrative(x.reason)&&![...state.vehicleCargo.values()].some(c=>c.vehicleId===x.entryId),'vozidlo má naložený náklad nebo neexistuje');state.vehicles.delete(x.entryId);
  }else if(x.type==='cargo-add'){
   requireValid(isId(x.entryId)&&!entryIds.has(x.entryId)&&typeof x.name==='string'&&x.name.length>=2&&x.name.length<=90&&
    nonnegative(x.weightLb)&&x.weightLb>0&&narrative(x.reason),'neúplný doklad nákladu');
   entryIds.add(x.entryId);state.cargo.set(x.entryId,x);
  }else if(x.type==='cargo-remove'){
   requireValid(state.cargo.has(x.entryId)&&narrative(x.reason),'vyložení neexistujícího nákladu');state.cargo.delete(x.entryId);
  }else if(x.type==='inventory-gear-attach'){
   const gear=VEHICLES_TACK_P122.find(t=>t.id===x.itemId),item=(data.inventory||[]).find(i=>i.id===x.inventoryId);
   const role=['Cart, 2-wheel','Sled','Wagon, 4-wheel'].includes(gear?.name)?'vehicle':'tack';
   const isStillAttached=item?.slot==='stable'&&item.stableAnimalId===x.animalId;
   requireValid(gear&&gear.name!=='Wheel'&&x.role===role&&isId(x.entryId)&&!entryIds.has(x.entryId)&&isId(x.inventoryId)&&
    x.weightLb===gear.weightLb&&x.name===gear.name&&x.quantity===1&&narrative(x.reason)&&
    (!item||item.characterId===animal.ownerId)&&(!isStillAttached||
     item.sourceItemId==='hmk:stable-gear:'+gear.id&&item.snapshot?.properties?.stableTackId===gear.id&&item.snapshot?.properties?.weightLb===gear.weightLb&&item.quantity===1)&&
    !state.inventory.has(x.inventoryId)&&!state.gear.has(x.inventoryId)&&
    ![...snapshots.entries()].some(([otherId,z])=>animals.get(otherId)?.campaignId===animal.campaignId&&
      (z.inventory.has(x.inventoryId)||z.gear.has(x.inventoryId))),
    'výstroj z knihovny nemá jedinou původní inventární identitu nebo již byla použita');
   entryIds.add(x.entryId);state.gear.set(x.inventoryId,x);
   if(role==='vehicle')state.vehicles.set(x.entryId,x);else state.tack.set(x.entryId,x);
  }else if(x.type==='inventory-gear-detach'){
   const prior=state.gear.get(x.inventoryId);
   requireValid(prior&&prior.entryId===x.entryId&&prior.role===x.role&&narrative(x.reason),
     'nelze sejmout výstroj, která na zvířeti nebyla');
   if(prior.role==='vehicle'){
    requireValid(![...state.vehicleCargo.values()].some(q=>q.vehicleId===prior.entryId),'ve voze zůstal náklad');
    state.vehicles.delete(prior.entryId);
   }else state.tack.delete(prior.entryId);
   state.gear.delete(x.inventoryId);
  }else if(x.type==='inventory-load'){
   const item=(data.inventory||[]).find(i=>i.id===x.inventoryId);
   // After a witnessed unload, future legitimate inventory edits may change
   // the item. The original transfer proof remains immutable and auditable.
   const currentLocation=item?.slot==='stable'&&item.stableAnimalId===x.animalId;
   requireValid((!item||item.characterId===animal.ownerId)&&(!currentLocation||
    item.snapshot?.name===x.name&&item.quantity===x.quantity&&item.snapshot?.properties?.weightLb*x.quantity===x.weightLb)&&
    Number.isFinite(x.weightLb)&&x.weightLb>0&&Number.isSafeInteger(x.quantity)&&x.quantity>0&&isId(x.inventoryId)&&typeof x.name==='string'&&x.name.length>=1&&x.name.length<=160&&narrative(x.reason)&&isId(x.entryId)&&!entryIds.has(x.entryId)&&
    ![...snapshots.entries()].some(([otherId,s])=>animals.get(otherId)?.campaignId===animal.campaignId&&(s.inventory.has(x.inventoryId)||s.gear.has(x.inventoryId)))&&!state.inventory.has(x.inventoryId)&&!state.gear.has(x.inventoryId),
    'inventární náklad nemá doloženou identitu, váhu nebo je již naložen');
   entryIds.add(x.entryId);state.inventory.set(x.inventoryId,x);
  }else if(x.type==='inventory-unload'){
   requireValid(state.inventory.has(x.inventoryId)&&narrative(x.reason),'inventární předmět nebyl naložen');
   state.inventory.delete(x.inventoryId);
  }else if(x.type==='vehicle-cargo-add'){
   requireValid(state.vehicles.has(x.vehicleId)&&isId(x.entryId)&&!entryIds.has(x.entryId)&&
    typeof x.name==='string'&&x.name.length>=2&&x.name.length<=90&&nonnegative(x.weightLb)&&x.weightLb>0&&
    narrative(x.reason),'vozidlo nemá doložený fyzický náklad');
   entryIds.add(x.entryId);state.vehicleCargo.set(x.entryId,x);
  }else if(x.type==='vehicle-cargo-remove'){
   requireValid(state.vehicleCargo.has(x.entryId)&&narrative(x.reason),'náklad není ve vozidle');state.vehicleCargo.delete(x.entryId);
  }else if(x.type==='rider-mount'){
   // A rider is a real campaign character, and their full weight must be
   // recorded once; this is NOT a pack-harness cargo-capacity test.
   const person=(data.characters||[]).find(c=>c.id===x.riderId&&!c.archived);
   // Snapshot body-weight evidence, so later changes to Appearance do not
   // invalidate a valid historic mounting event.
   const documented=x.riderBodyLb??null;
   requireValid((documented===null||Number.isSafeInteger(documented)&&documented>0)&&person&&animal.ownerId===x.ownerId&&animal.campaignId===j.calendarCampaignId&&
    !state.rider&&isId(x.riderId)&&Number.isSafeInteger(x.riderWeightLb)&&x.riderWeightLb>0&&x.riderWeightLb<=1000000&&
    (documented===null||x.riderWeightLb>=documented)&&narrative(x.reason)&&
    ![...snapshots.entries()].some(([otherId,other])=>otherId!==x.animalId&&animals.get(otherId)?.campaignId===animal.campaignId&&other.rider?.characterId===x.riderId),
    'jezdec nemá platný záznam, váhu nebo již sedí na jiném zvířeti');
   state.rider={characterId:x.riderId,weightLb:x.riderWeightLb};
  }else if(x.type==='rider-dismount'){
   requireValid(state.rider&&state.rider.characterId===x.riderId&&narrative(x.reason),'sesedá jiný nebo neexistující jezdec');
   state.rider=null;
  }else if(x.type==='training-activate'){
   const training=(data.journal||[]).find(t=>t.id===x.trainingProofId&&t.calendarCampaignId===animal.campaignId&&t.livestockTraining?.animalId===animal.id);
   const p=training?.skillTestProof;
   requireValid(training&&training.campaignMinute<=j.campaignMinute&&p?.type==='animal-training'&&p.periodConfirmed===true&&
    Number.isSafeInteger(x.startMinute)&&x.startMinute>=animal.minute&&Number.isSafeInteger(x.endMinute)&&
    x.endMinute<=j.campaignMinute&&x.endMinute-x.startMinute>=p.months*30*1440&&
    p.finalBoosts>=0&&p.finalBoosts<=animal.maxMB&&narrative(x.reason)&&
    ![...(data.journal||[]).slice(0,(data.journal||[]).indexOf(j))].some(old=>old.stableHub574?.type==='training-activate'&&old.stableHub574.animalId===animal.id&&old.stableHub574.trainingProofId===x.trainingProofId),
    'výcvik nemá splněný kalendářní interval, správného tvora nebo limit MB');
  }else if(x.type==='care'){
   requireValid(['food','water','grooming','shelter','veterinary','other'].includes(x.kind)&&narrative(x.reason)&&
    (x.kind==='food'||x.kind==='water'?Number.isFinite(x.amount)&&x.amount>0&&x.amount<=100000&&x.unit==='lb':x.amount===null&&x.unit===null),
    'péče musí mít doložený úkon, skutečné množství (jídlo/voda v lb) a zdroj');
   if(x.sourceKind){
    requireValid(['ration','water','external'].includes(x.sourceKind),'neznámý zdroj péče');
    if(x.sourceKind==='ration'||x.sourceKind==='water'){
     const use=x.sourceKind==='ration'?j.calendarInventoryRationUse:j.calendarInventoryWaterUse;
     requireValid(use&&x.sourceId===(use.sourceId??use.fillId)&&
      x.amount===(x.sourceKind==='ration'?use.quantity*3:use.quantity*10)&&
      use.actorId===animal.ownerId,'výdej krmiva/vody nebyl odečten z originálního skladu');
    }else requireValid(!j.calendarInventoryRationUse&&!j.calendarInventoryWaterUse,'externí péče nesmí odečíst sklad');
   }
  }
  if(x.type==='sale'||x.type==='tack-add'||x.type==='vehicle-add'){
   const cost=x.type==='sale'?x.priceD:x.mode==='buy'?-x.priceD:0;
   requireValid(isId(x.transactionId)&&!transactionIds.has(x.transactionId),'chybí jedinečná finanční identita');transactionIds.add(x.transactionId);
   const owner=data.characters.find(c=>c.id===animal.ownerId);
   const adj=(owner?.hmk?.campaignCashAccounts?.[animal.campaignId]?.adjustments||[]).filter(a=>a.id===x.transactionId);
   requireValid(cost===0?adj.length===0:adj.length===1&&adj[0].deltaPence===cost&&adj[0].campaignMinute===j.campaignMinute,
    'stájový finanční zápis se neshoduje s peněžní knihou');
  }
  if(x.type==='release')requireValid(!x.transactionId,'opuštění nesmí mít finanční transakci');
  // Reject cargo that is not actually stowed in a pack harness or saddlebags.
  const tackItems=[...state.tack.values()].map(t=>VEHICLES_TACK_P122.find(item=>item.id===t.itemId)?.name||'');
  const hasPack=tackItems.includes('Pack harness'),bagCount=tackItems.filter(n=>n==='Saddle bags, 15 lb').length;
  const cap=hasPack?null:bagCount*15; // pack-body-weight cap checked against the species at commit/projection.
  if(!hasPack)requireValid(([...state.cargo.values()].reduce((sum,c)=>sum+c.weightLb,0)+[...state.inventory.values()].reduce((sum,c)=>sum+c.weightLb,0))<=cap,'náklad bez dostatečné kapacity postroje či sedlových brašen');
  if(typeof offerForId==='function'){
   const spec=offerForId(animal.beastId),totalCargo=[...state.cargo.values(),...state.inventory.values()].reduce((n,c)=>n+c.weightLb,0);
   if(hasPack){const cap=spec?.breed&&Number.isFinite(spec?.bodyWeightLb)?Math.floor(spec.bodyWeightLb*.2):null;
    requireValid(cap!==null&&totalCargo<=cap,'náklad překračuje 20 % doložené váhy s pack harness');}
  }
  snapshots.set(x.animalId,state);
 }
 // Entire live inventory is projected from the immutable transfers. Manual
 // editing, selling or slot-changing a loaded object cannot bypass its proof.
 const loaded=new Map(),activeCampaign=data?.campaignClock?.campaignId??null;
 for(const [animalId,state] of snapshots)if(!activeCampaign||animals.get(animalId)?.campaignId===activeCampaign)for(const [id,proof] of [...state.inventory,...state.gear]){
  requireValid(!loaded.has(id),'inventární předmět je současně na více zvířatech');loaded.set(id,animalId);
 }
 for(const id of loaded.keys())requireValid((data.inventory||[]).some(i=>i.id===id),'naložený inventární předmět byl smazán');
 for(const item of data?.inventory||[]){const animalId=loaded.get(item.id);
  requireValid(animalId?(item.slot==='stable'&&item.stableAnimalId===animalId):
   (item.slot!=='stable'&&item.stableAnimalId===undefined),'umístění inventáře se neshoduje s dokladem stáje');
 }
 // Reweigh full waterskins and consumed original ration lots at the current
 // campaign minute. A nominal empty-vessel weight cannot bypass load limits.
 if(typeof offerForId==='function')for(const [animalId] of snapshots){
  const a=animals.get(animalId);
  if(!a||activeCampaign&&a.campaignId!==activeCampaign)continue;
  const spec=offerForId(a.beastId);
  if(spec){const b=stableBurden(data,a.campaignId,{...a,spec});
   requireValid(!b.cargoOverflow,'aktuální náklad včetně skutečně naplněné vody překračuje nosnost');}
 }
 // A provision carried in a pack is not available for PERSONAL consumption.
 // Only an animal-care issue explicitly backed by the original lot may use it.
 const custody=new Map(),rationSource=new Map(),waterSource=new Map();
 for(const row of data?.journal||[]){const x=row.stableHub574;
  if(x?.type==='inventory-load'||x?.type==='inventory-gear-attach')custody.set(row.calendarCampaignId+'|'+x.inventoryId,x.animalId);
  if(x?.type==='inventory-unload'||x?.type==='inventory-gear-detach')custody.delete(row.calendarCampaignId+'|'+x.inventoryId);
  if(row.calendarInventoryRationStock)rationSource.set(row.id,row.calendarInventoryRationStock.itemId);
  if(row.calendarInventoryRationTransfer)rationSource.set(row.id,row.calendarInventoryRationTransfer.receivedItemId);
  if(row.calendarInventoryWaterFill)waterSource.set(row.id,row.calendarInventoryWaterFill.itemId);
  for(const [proof,source] of [[row.calendarInventoryRationUse,rationSource],[row.calendarInventoryWaterUse,waterSource]]){
   if(!proof)continue;
   const holder=custody.get(row.calendarCampaignId+'|'+source.get(proof.sourceId??proof.fillId));
   requireValid(!holder||x?.type==='care'&&x.animalId===holder&&x.sourceId===(proof.sourceId??proof.fillId),
    'jídlo či voda uložené na zvířeti byly vydány mimo jeho péči');
  }
 }
 return true;
}
export function assertStableHubAppendOnly(before,after){
 const getEvents=d=>(d?.journal||[]).filter(j=>Object.hasOwn(j,'stableHub574'));
 const old=getEvents(before),next=getEvents(after);
 const current=new Map(next.map(j=>[j.id,j]));
 requireValid(next.length>=old.length,'starší doklady byly odstraněny');
 for(const j of old)requireValid(current.has(j.id)&&JSON.stringify(current.get(j.id))===JSON.stringify(j),'stájový doklad byl pozměněn');
 return true;
}
