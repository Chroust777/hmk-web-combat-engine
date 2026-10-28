/** HMK 1.2 pp. 65, 122, 141, 145, 354–357.
 * Stable-only, append-only event ledger. Purchased tack and cargo are physical
 * stable property, NEVER copies of a character's carried inventory.
 * GM attestation is required where HMK provides no feeding/resale price table.
 */
import {VEHICLES_TACK_P122} from '../rules/conveyance-printed-p122.js';
import {mountLoadENC,mountPersonalFatigue} from '../rules/gear-load.js';
import {strengthEncumbranceModifier} from '../rules/encumbrance.js';
export const STABLE_HUB_FORMAT_574='hmk-stable-hub-574';
const types=new Set(['sale','release','tack-add','tack-remove','vehicle-add','vehicle-remove','cargo-add','cargo-remove','care']);
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
 const events=stableHubEvents(data,campaignId,animalId);const tack=new Map(),vehicles=new Map(),cargo=new Map(),care=[];let exit=null;
 for(const j of events){const x=j.stableHub574;
  if(x.type==='sale'||x.type==='release'){exit={type:x.type,priceD:x.priceD??0,minute:j.campaignMinute,id:j.id,reason:x.reason};continue;}
  if(x.type==='tack-add')tack.set(x.entryId,{...x,proofId:j.id});
  if(x.type==='tack-remove')tack.delete(x.entryId);
  if(x.type==='vehicle-add')vehicles.set(x.entryId,{...x,proofId:j.id});
  if(x.type==='vehicle-remove')vehicles.delete(x.entryId);
  if(x.type==='cargo-add')cargo.set(x.entryId,{...x,proofId:j.id});
  if(x.type==='cargo-remove')cargo.delete(x.entryId);
  if(x.type==='care')care.push({id:j.id,minute:j.campaignMinute,...x});
 }
 const tackRows=[...tack.values()],vehicleRows=[...vehicles.values()],cargoRows=[...cargo.values()];
 const tackLb=tackRows.reduce((n,e)=>n+e.weightLb,0),cargoLb=cargoRows.reduce((n,e)=>n+e.weightLb,0);
 const gearNames=tackRows.map(t=>VEHICLES_TACK_P122.find(i=>i.id===t.itemId)?.name||'');
 const isPack=gearNames.includes('Pack harness');
 const bags=gearNames.filter(n=>n==='Saddle bags, 15 lb').length;
 return {events,tack:tackRows,vehicles:vehicleRows,cargo:cargoRows,care,exit,tackLb,cargoLb,
   capacityType:isPack?'pack':bags?'saddle-bags':'none',packHarness:isPack,bags};
}
export function stableCargoCapacity(projection,spec){
 if(projection.packHarness){if(!spec?.breed)return null;const weight=spec?.bodyWeightLb;return Number.isFinite(weight)&&weight>0?Math.floor(weight*0.2):null;}
 if(projection.bags)return projection.bags*15;
 return 0;
}
export function stableBurden(data,campaignId,animal){
 const p=stableHubProjection(data,campaignId,animal.id),spec=animal.spec,minimumLb=p.tackLb+p.cargoLb;
 const capacity=stableCargoCapacity(p,spec);
 const usesAnimalLoad=!!(spec.str&&spec.breed),loadKind=spec.breed==='camel'?'camel':spec.breed==='elephant'?'elephant':spec.breed==='bovine'?'bovine':'horse';
 const base=usesAnimalLoad?mountLoadENC(minimumLb,{kind:loadKind}):null;
 const adjusted=base===null?null:Math.max(0,base+strengthEncumbranceModifier(spec.str)+(spec.breed==='mule'?-20:0));
 return {...p,minimumLb,capacity,baseENC:base,adjustedENC:adjusted,
  pf:adjusted===null?null:mountPersonalFatigue(adjusted),requiresAdditionalRiderWeight:true,
  cargoOverflow:capacity!==null&&p.cargoLb>capacity};
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
  const state=snapshots.get(x.animalId)||{exit:false,tack:new Map(),vehicles:new Map(),cargo:new Map(),lastMinute:animal.minute};
  requireValid(j.campaignMinute>=state.lastMinute&&!state.exit,'zápis po prodeji nebo zpětně v čase');state.lastMinute=j.campaignMinute;
  if(x.type==='sale'||x.type==='release'){
   requireValid(x.type!=='sale'||nonnegative(x.priceD),'neplatná prodejní cena');
   requireValid(narrative(x.reason),'prodej/opouštění vyžaduje podklad GM');
   requireValid(x.type!=='release'||x.priceD===0,'opuštění nesmí přidávat peníze');
   requireValid(!state.tack.size&&!state.vehicles.size&&!state.cargo.size,'před vyřazením zvířete se musí vyložit náklad a oddělit výstroj/vozidla');
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
   requireValid(state.vehicles.has(x.entryId)&&narrative(x.reason),'vyřazeno neexistující vozidlo');state.vehicles.delete(x.entryId);
  }else if(x.type==='cargo-add'){
   requireValid(isId(x.entryId)&&!entryIds.has(x.entryId)&&typeof x.name==='string'&&x.name.length>=2&&x.name.length<=90&&
    nonnegative(x.weightLb)&&x.weightLb>0&&narrative(x.reason),'neúplný doklad nákladu');
   entryIds.add(x.entryId);state.cargo.set(x.entryId,x);
  }else if(x.type==='cargo-remove'){
   requireValid(state.cargo.has(x.entryId)&&narrative(x.reason),'vyložení neexistujícího nákladu');state.cargo.delete(x.entryId);
  }else if(x.type==='care'){
   requireValid(['food','water','grooming','shelter','veterinary','other'].includes(x.kind)&&narrative(x.reason)&&
    (x.kind==='food'||x.kind==='water'?Number.isFinite(x.amount)&&x.amount>0&&x.amount<=100000&&x.unit==='lb':x.amount===null&&x.unit===null),
    'péče musí mít doložený úkon, skutečné množství (jídlo/voda v lb) a zdroj');
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
  if(!hasPack)requireValid([...state.cargo.values()].reduce((sum,c)=>sum+c.weightLb,0)<=cap,'náklad bez dostatečné kapacity postroje či sedlových brašen');
  if(typeof offerForId==='function'){
   const spec=offerForId(animal.beastId),totalCargo=[...state.cargo.values()].reduce((n,c)=>n+c.weightLb,0);
   if(hasPack){const cap=spec?.breed&&Number.isFinite(spec?.bodyWeightLb)?Math.floor(spec.bodyWeightLb*.2):null;
    requireValid(cap!==null&&totalCargo<=cap,'náklad překračuje 20 % doložené váhy s pack harness');}
  }
  snapshots.set(x.animalId,state);
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
