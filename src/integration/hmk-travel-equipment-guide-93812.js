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
 let operative=mode==='mount'?selected:team.length?team:pullers;
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
  checks.push(selected.length?good('animals','Jízdní zvíře vybráno',selected.map(a=>a.name).join(', ')):
   bad('animals','Vybrat jízdní zvíře','Zaškrtněte vhodného koně či velblouda v seznamu Stáje.'));
  for(const a of operative){
   if(!['palfrey','courser','charger','destrier','pony','camel'].includes(a.spec.breed)){
    checks.push(bad('type:'+a.id,a.name+' · nevhodné jízdní zvíře','Zvolte koně nebo velblouda; jiné druhy nemají v tomto režimu ověřené jezdecké vybavení.'));continue;
   }
   addGear(a,['Bit & bridle'],'Povinná uzda pro jízdní zvíře (HMK 122)');
   addGear(a,['Blanket, horse'],'Povinná podložka/deka (HMK 122)');
   addGear(a,['Saddle, riding','Saddle, war'],'Povinné sedlo, stačí jeden z uvedených typů (HMK 122)');
   const rider=stableHubProjection(data,cid,a.id).rider;
   checks.push(rider?good('rider:'+a.id,a.name+' · jezdec určen','Jezdec '+rider.characterId+' je doložen v evidenci Stáje.'):
    info('rider:'+a.id,a.name+' · jezdec není přiřazen','Je-li postava na zvířeti, doložte nasednutí ve Stáji a skutečnou hmotnost jezdce.'));
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
  checks.push(Number(v.transportOtherLb)>0?good('weight','Hmotnost vozu vyplněna',v.transportOtherLb+' lb mimo již evidovaný náklad'):
   bad('weight','Doplnit skutečnou hmotnost','Vyplňte „Další hmotnost ve voze“ v librách, včetně průvodce a ostatních cestujících; nesčítejte evidovaný náklad dvakrát.'));
  checks.push(v.transportCoLocated?good('gm','GM potvrdil sestavu','Poloha, postroje, cestující a váhy potvrzeny.'):
   bad('gm','Potvrdit společné použití (GM)','Zaškrtněte potvrzení použití konkrétního vozidla, spřežení a skutečného nákladu.'));
 }
 return {checks,gear:listGear,mode,required};
}
