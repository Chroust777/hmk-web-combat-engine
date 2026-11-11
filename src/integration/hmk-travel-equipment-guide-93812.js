/** v93.812 — read-only, live checklist of actual HMK p.122 transport gear.
 * Never creates a proof, guesses a roll, or silently considers a catalog item
 * a mounted item: only inventory/stable immutable receipts count as ownership.
 */
import {verifiedLivestock} from './hmk-livestock-562.js';
import {stableHubProjection} from './hmk-stable-hub-574.js';
import {availableTransportVehicles93756} from './hmk-travel-vehicle-93756.js';
import {VEHICLES_TACK_P122, BEASTS_P122} from '../rules/conveyance-printed-p122.js';
const tack=name=>VEHICLES_TACK_P122.find(x=>x.name===name);
const getAnimal=(data,cid,id)=>verifiedLivestock(data,cid).find(a=>a.id===id)||null;
const isCartHorse=a=>a?.spec?.breed==='palfrey'&&/cart horse/i.test(a.spec.name);
const isOx=a=>a?.spec?.breed==='bovine';
const canPull=a=>isCartHorse(a)||isOx(a);
// v93.837: only a mount qualified under HMK p.122 can be selected as the
// current rider's animal. Other, independently selected pack/draft animals
// may accompany the group without becoming riding candidates.
const rideBreeds=new Set(['palfrey','courser','charger','destrier','pony','camel']);
export const isRidingAnimal93837=a=>!!a&&rideBreeds.has(a.spec?.breed);
/** Never reinterpret an explicit mount ID or silently switch to another one.
 * The empty choice is the documented auto-selection of the first ELIGIBLE
 * animal among checked Stable IDs, not the first animal of any species.
 */
export function resolveTravelMount93837(animals,selectedIds=[],requestedId=''){
 const selected=[...new Set(selectedIds)].map(id=>(animals||[]).find(a=>a.id===id)).filter(Boolean);
 if(requestedId){
  const chosen=selected.find(a=>a.id===requestedId);
  if(!chosen)return {animal:null,reason:'Vybrané jízdní zvíře není zaškrtnuté v seznamu „Zvířata na cestě“. Zaškrtněte je, nebo zvolte automatický výběr.'};
  if(!isRidingAnimal93837(chosen))return {animal:null,reason:chosen.name+' ('+chosen.spec.name+') není jízdní kůň ani velbloud.'};
  return {animal:chosen,reason:null};
 }
 const animal=selected.find(isRidingAnimal93837)||null;
 return {animal,reason:animal?null:selected.length?
  'Vybraná zvířata nejsou jezdecká. Vůl (Bovine/Oxen) používá Harness, ox pro tah; pro jízdu vyberte skutečného koně nebo velblouda a doložte uzdu, deku a sedlo.':
  'Zaškrtněte alespoň jednoho skutečného koně nebo velblouda v seznamu Stáje.'};
}

const loose=(data,animal,gear)=>animal&&(data.inventory||[]).find(i=>
 i.characterId===animal.ownerId&&i.sourceItemId==='hmk:stable-gear:'+gear.id&&
 i.snapshot?.properties?.stableTackId===gear.id&&
 i.snapshot?.properties?.weightLb===gear.weightLb&&i.quantity===1&&
 ['carried','none'].includes(i.slot));
const good=(id,title,detail)=>({id,title,detail,status:'ok'});
const bad=(id,title,detail,action=null)=>({id,title,detail,status:'missing',action});
const info=(id,title,detail)=>({id,title,detail,status:'info'});
/** Only one of saddle riding/war is required for a mount; a pack harness
 * does not replace a dedicated draft horse/ox harness. */
export function planTravelEquipment93812(data,cid,v){
 const mode=v.conveyance,checks=[];
 if(!['cart','wagon','mount'].includes(mode))return {checks,gear:[],mode};
 const all=verifiedLivestock(data,cid),byId=new Map(all.map(a=>[a.id,a]));
 const selected=[...new Set(v.stableAnimalIds||[])].map(id=>byId.get(id)).filter(Boolean);
 const team=[...new Set(v.transportTeamIds||[])].map(id=>byId.get(id)).filter(Boolean);
 const required=mode==='cart'?1:mode==='wagon'?2:1;
 const pullers=selected.filter(canPull);
 const invalid=team.filter(a=>!canPull(a));
 const riding=mode==='mount'?resolveTravelMount93837(all,v.stableAnimalIds||[],v.travelRideAnimalId||''):null;
 let operative=mode==='mount'?(riding.animal?[riding.animal]:[]):team.length?team:pullers;
 const listGear=[];
 const addGear=(animal,names,description)=>{
  const p=stableHubProjection(data,cid,animal.id);
  const existing=new Set(p.tack.map(x=>x.itemId));
  const already=names.map(tack).filter(Boolean);
  if(already.some(g=>existing.has(g.id))){checks.push(good('gear:'+animal.id+':'+names[0],animal.name+' · '+names.join(' nebo '),'Nasazeno ve Stáji. '+description));return;}
  const hasOwned=already.map(g=>({gear:g,inventory:loose(data,animal,g)})).find(x=>x.inventory);
  const gear=hasOwned?.gear||already[0];if(!gear)return;
  const inv=hasOwned?.inventory||null;
  const action={animalId:animal.id,gearId:gear.id,mode:inv?'attach':'buy',...(inv?{inventoryId:inv.id}:{})};
  listGear.push({...action,gearName:gear.name,animalName:animal.name,ownerId:animal.ownerId,priceD:gear.priceD});
  checks.push(bad('gear:'+animal.id+':'+gear.id,animal.name+' · '+names.join(' nebo '),
   `${gear.priceD}d · ${gear.weightLb} lb · ${description} · ${inv?'Kus už je v inventáři vlastníka; znovu neplatit.':'Chybí na zvířeti; lze koupit a přímo nasadit.'}`,action));
 };
 if(mode==='mount'){
  checks.push(riding.animal?good('animals','Jízdní zvíře vybráno',riding.animal.name+' · '+riding.animal.spec.name):
   bad('animals','Vybrat vhodné jízdní zvíře',riding.reason));
  for(const a of selected.filter(a=>a.id!==riding.animal?.id)){
   checks.push(info('companion:'+a.id,a.name+' · doprovází skupinu',
    isRidingAnimal93837(a)?'Toto zvíře není vybráno pro aktuálního jezdce.':'Není jezdeckým zvířetem; může cestovat se skupinou jako tažné nebo nákladní zvíře. Jízda na jiném doloženém koni není blokována.'));
  }
  for(const a of operative){
   addGear(a,['Bit & bridle'],'Povinná uzda pro jízdní zvíře (HMK 122)');
   addGear(a,['Blanket, horse'],'Povinná podložka/deka (HMK 122)');
   addGear(a,['Saddle, riding','Saddle, war'],'Povinné sedlo, stačí jeden z uvedených typů (HMK 122)');
   checks.push(info('rider:'+a.id,a.name+' · jezdec se vybírá v Pochodu',
    'Jezdce a jeho aktuální hmotnost počítá Pochod; Stáj má pouze výstroj a náklad. Žádné samostatné nasedání se nevyžaduje.'));
  }
 }else{
  checks.push(pullers.length>=required?good('animals','Dostupná tažná zvířata',pullers.map(a=>a.name).join(', ')):
   bad('animals','Chybí vhodná tažná zvířata',`${mode==='cart'?'Kára: 1':'Vůz: 2'} × Palfrey, cart horse (180d/ks), nebo vůl (96d/ks). Jiné druhy HMK pro tuto kapacitu neuvádí.`));
  const chosen=team.length===required&&team.every(canPull)&&team.every(a=>a.spec.breed===team[0].spec.breed);
  checks.push(chosen?good('team','Tažná skupina vybrána',team.map(a=>a.name).join(' + ')):
   bad('team','Vybrat správné spřežení',`Zaškrtněte přesně ${required} ${required===1?'zvíře':'zvířata stejného druhu'} v „Tažné zvíře“ a současně v „Zvířata vybraná ze Stáje“.${invalid.length?' Nevhodná volba: '+invalid.map(a=>a.name).join(', '):''}`));
  for(const a of operative){
   if(!canPull(a)){checks.push(bad('type:'+a.id,a.name+' · nevhodný tah',`Káru nebo vůz může v tomto modelu táhnout vůl nebo Palfrey, cart horse. Typ: ${a.spec.name}.`));continue;}
   addGear(a,[isOx(a)?'Harness, ox':'Harness, horse'],'Povinný tažný postroj (HMK 122); nestačí Pack harness ani sedlo');
  }
  const vehicles=availableTransportVehicles93756(data,cid).filter(x=>x.conveyance===mode);
  const current=vehicles.find(x=>x.key===v.transportVehicleKey);
  const requiredVehicle=tack(mode==='cart'?'Cart, 2-wheel':'Wagon, 4-wheel');
  const knownInventory=operative.map(animal=>({animal,inv:loose(data,animal,requiredVehicle)})).find(x=>x.inv);
  const vehicleAction=vehicles.length?null:knownInventory?
   {mode:'attach',animalId:knownInventory.animal.id,gearId:requiredVehicle.id,inventoryId:knownInventory.inv.id}:
   operative[0]?{mode:'vehicle-buy',animalId:operative[0].id,gearId:requiredVehicle.id}:null;
  checks.push(current?good('vehicle','Vozidlo vybráno',current.name+' · doloženo ve Stáji'):
   bad('vehicle','Vybrat skutečné vozidlo ve Stáji',vehicles.length?
    `Vozidlo existuje (${vehicles.map(x=>x.name).join(', ')}), vyberte jej v rozbalovacím seznamu.`:
    knownInventory?`${requiredVehicle.name} (${requiredVehicle.priceD}d) je už v inventáři majitele ${knownInventory.animal.name}; lze jej nyní přímo zařadit bez další platby.`:
    `${mode==='cart'?'Kára 84d':'Vůz 220d'} chybí ve Stáji. Pokud už je v inventáři, použijte „Zařadit vlastněný vůz“. Jinak lze pořídit přímo zde.`,
    vehicleAction));
  if(current&&team.length&&!team.some(a=>a.id===current.ownerAnimalId))checks.push(bad('vehicle-team','Vozidlo není u tažného zvířete','Vyberte tažné zvíře, na němž je tento konkrétní vůz ve Stáji.'));
  checks.push(v.transportMassReady===true?good('weight','Hmotnost posádky automaticky doložena',v.transportOtherLb+' lb ostatní cestující a nezapsaný náklad; pacienti se započtou zvlášť'):
   bad('weight','Doložit tělesnou hmotnost a inventář','Aplikace počítá hmotnost cestujících automaticky z Character Creation → Appearance a skutečného Inventáře. Chybějící údaje opravte v kartě postavy.'));
  checks.push(v.transportCoLocated?good('gm','GM potvrdil sestavu','Poloha, postroje, cestující a váhy potvrzeny.'):
   bad('gm','Potvrdit společné použití (GM)','Zaškrtněte potvrzení použití konkrétního vozidla, spřežení a skutečného nákladu.'));
 }
 return {checks,gear:listGear,mode,required};
}
