/** v93.756: actual stable-register vehicle and hauling evidence for transporting
 * incapacitated people. This is a receipt, not a second inventory or animal
 * health state. HMK 1.2 p.122 & 145; locations and undocumented masses require GM.
 */
import {verifiedLivestock} from './hmk-livestock-562.js';
import {stableHubProjection,stableBurden} from './hmk-stable-hub-574.js';
import {stableHauling575} from './hmk-stable-operations-575.js';
import {STABLE_VEHICLES_P122} from './hmk-stable-hub-574.js';
const insist=(yes,message)=>{if(!yes)throw Error('Převoz – vozidlo: '+message);};
const lb=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000;
const goodId=x=>typeof x==='string'&&x.length>0&&x.length<200;
export const TRANSPORT_VEHICLE_FORMAT_93756='hmk-confirmed-passenger-vehicle-93756';
export function availableTransportVehicles93756(data,campaignId){
 const all=verifiedLivestock(data,campaignId),rows=[];
 for(const animal of all){
  const stable=stableHubProjection(data,campaignId,animal.id);
  for(const v of stable.vehicles){
   const catalog=STABLE_VEHICLES_P122.find(x=>x.id===v.itemId);
   if(!catalog||!['Cart, 2-wheel','Wagon, 4-wheel'].includes(catalog.name))continue;
   rows.push({key:animal.id+'::'+v.entryId,ownerAnimalId:animal.id,entryId:v.entryId,
    vehicleProofId:v.proofId,itemId:v.itemId,name:catalog.name,
    conveyance:catalog.name==='Cart, 2-wheel'?'cart':'wagon'});
  }
 }
 return rows;
}
/** Patient weights are actual GM-entered *body plus carried equipment*.
 * OtherLb covers driver, other occupants and all remaining onboard material,
 * excluding the vehicle ledger cargo and patient weights. No zero-weight guide.
 */
export function transportVehicleReceipt93756({data,campaignId,minute,conveyance,
 vehicleKey,teamIds=[],stableAnimalIds=[],transportedMemberIds=[],patientLoadLb={},otherLoadLb,
 gmCoLocated=false}={}){
 insist(goodId(campaignId)&&lb(minute),'neplatná identita kampaně nebo čas.');
 insist(['cart','wagon'].includes(conveyance),'cestování musí použít káru nebo vůz.');
 insist(gmCoLocated===true,'GM musí potvrdit dostupnost vozu, postrojů a osob na stejném místě.');
 insist(Array.isArray(transportedMemberIds)&&transportedMemberIds.length>=1&&
  new Set(transportedMemberIds).size===transportedMemberIds.length,'neplatní přepravovaní pacienti.');
 insist(Array.isArray(teamIds)&&new Set(teamIds).size===teamIds.length&&teamIds.length>=1&&
  teamIds.every(id=>stableAnimalIds.includes(id)), 'tažná zvířata musí být ve stejné cestovní epizodě.');
 const car=availableTransportVehicles93756(data,campaignId).find(x=>x.key===vehicleKey);
 insist(car&&car.conveyance===conveyance,'vozidlo neexistuje v aktuální Stáji nebo neodpovídá dopravě.');
 insist(teamIds.includes(car.ownerAnimalId),'vozidlo musí být skutečně připojené k jednomu z vybraných tažných zvířat.');
 const all=verifiedLivestock(data,campaignId),team=teamIds.map(id=>all.find(a=>a.id===id));
 insist(team.every(Boolean),'některé tažné zvíře nemá platný vlastnický doklad.');
 const haul=stableHauling575({vehicleName:car.name,team});
 insist(haul.required===team.length&&lb(haul.capacityLb), 'chybí pravidlově doložená tažná skupina pro zvolený vůz.');
 for(const animal of team){
  const gear=stableHubProjection(data,campaignId,animal.id);
  const harness=animal.spec.breed==='bovine'?'hmk-p122-tack-06':'hmk-p122-tack-05';
  insist(gear.tack.some(t=>t.itemId===harness),animal.name+': chybí skutečný tažný postroj.');
  const burden=stableBurden(data,campaignId,animal);
  insist(Number.isSafeInteger(burden.adjustedENC)&&!burden.cargoOverflow,animal.name+': přetížené nebo neúplné ENC.');
 }
 const vehicleState=stableHubProjection(data,campaignId,car.ownerAnimalId);
 const cargoLb=vehicleState.vehicleCargo.filter(c=>c.vehicleId===car.entryId).reduce((s,c)=>s+c.weightLb,0);
 insist(lb(cargoLb),'neplatná hmotnost nákladu ve vozidle.');
 insist(lb(otherLoadLb)&&otherLoadLb>0,'doložte kladnou hmotnost průvodce a ostatního vybavení v librách.');
 const keys=Object.keys(patientLoadLb);
 insist(keys.length===transportedMemberIds.length&&keys.every(id=>transportedMemberIds.includes(id))&&
  transportedMemberIds.every(id=>lb(patientLoadLb[id])&&patientLoadLb[id]>0),
  'každý pacient potřebuje doloženou celkovou hmotnost těla a výstroje (lb).');
 const passengerLb=transportedMemberIds.reduce((s,id)=>s+patientLoadLb[id],0);
 const totalLb=cargoLb+otherLoadLb+passengerLb;
 insist(totalLb<=haul.capacityLb,'hmotnost '+totalLb+' lb překračuje doloženou nosnost '+haul.capacityLb+' lb.');
 return {format:TRANSPORT_VEHICLE_FORMAT_93756,campaignId,minute,conveyance,
  vehicleKey:car.key,ownerAnimalId:car.ownerAnimalId,vehicleId:car.entryId,
  vehicleItemId:car.itemId,vehicleProofId:car.vehicleProofId,vehicleName:car.name,
  teamIds:[...teamIds].sort(),capacityLb:haul.capacityLb,cargoLb,
  patientLoadLb:Object.fromEntries(Object.entries(patientLoadLb).sort(([a],[b])=>a.localeCompare(b))),
  otherLoadLb,passengerLb,totalLb,gmCoLocated:true,sourcePages:[122,145]};
}
/** Replay at each historical departure. Previously confirmed watches are not
 * retroactively changed, only v93.756 receipts have this new proof shape. */
export function validateTransportVehicleHistory93756(data){
 const journal=data?.journal||[];
 for(let i=0;i<journal.length;i++){
  const row=journal[i],ep=row.calendarTimeEpisode,p=ep?.transportProof?.vehicle;
  if(!p)continue;
  insist(p.format===TRANSPORT_VEHICLE_FORMAT_93756&&
   row.calendarCampaignId===p.campaignId&&row.campaignMinute===p.minute&&
   ep.startMinute===p.minute&&ep.conveyance===p.conveyance,
   'historický doklad vozidla nesouhlasí s epizodou.');
  const earlier={...data,journal:journal.slice(0,i)};
  const expected=transportVehicleReceipt93756({data:earlier,campaignId:p.campaignId,minute:p.minute,
   conveyance:ep.conveyance,vehicleKey:p.vehicleKey,teamIds:p.teamIds,
   stableAnimalIds:ep.settings?.stableAnimalIds||[],transportedMemberIds:ep.transportedMemberIds||[],
   patientLoadLb:p.patientLoadLb,otherLoadLb:p.otherLoadLb,gmCoLocated:p.gmCoLocated});
  insist(JSON.stringify(p)===JSON.stringify(expected),'původní vozidlo, posádka nebo hmotnost byly změněny.');
 }
 return true;
}
