/** v93.575: pure, provenance-aware animal anatomy, training, vehicle/travel.
 * No separate animal health, cargo or food sources are created here.
 */
import {animalAnatomyTable566} from './hmk-bestiary-anatomy-566.js';
import {bestiaryProfile,livestockMatcher} from './hmk-bestiary-563.js';
import {livestockOffer} from './hmk-livestock-562.js';
import {VEHICLES_TACK_P122} from '../rules/conveyance-printed-p122.js';
import {stableHubProjection} from './hmk-stable-hub-574.js';
const demand=(yes,why)=>{if(!yes)throw Error('Stáj 93.575: '+why);};
const maxBoost=(n)=>n<=39?10:n<=44?9:n<=49?8:n<=59?7:n<=69?6:n<=79?5:n<=99?4:3;
export function boostedAnimalML575(ml,boosts){
 if(!Number.isFinite(ml)||!Number.isSafeInteger(boosts)||boosts<0||boosts>20)return ml;
 let value=ml;for(let i=0;i<boosts;i++)value+=maxBoost(value);return value;
}
export function stableTraining575(data,campaignId,animal){
 const training=(data?.journal||[]).filter(j=>j.calendarCampaignId===campaignId&&j.livestockTraining?.animalId===animal.id);
 const applied=(data?.journal||[]).filter(j=>j.calendarCampaignId===campaignId&&j.stableHub574?.type==='training-activate'&&j.stableHub574.animalId===animal.id);
 const final=applied.at(-1),source=training.find(j=>j.id===final?.stableHub574?.trainingProofId);
 return {training,applied,boosts:source?.skillTestProof?.finalBoosts??0,sourceId:source?.id??null,
  controlSecondaryPenalty:source?.skillTestProof?.controlSecondaryPenalty??0};
}
export function effectiveStableBeast575(data,campaignId,actor){
 if(!actor?.ownerAnimalId)return actor;
 const animal=(data.characters||[]).flatMap(c=>c.hmk?.livestock||[]).find(a=>a.id===actor.ownerAnimalId);
 if(!animal)return actor;
 const t=stableTraining575(data,campaignId,animal);
 if(!t.boosts||!actor.profile)return actor;
 const p=structuredClone(actor.profile);
 for(const k of ['initiative'])if(Number.isFinite(p.skills?.[k]))p.skills[k]=boostedAnimalML575(p.skills[k],t.boosts);
 for(const k of ['shock','dodge','press'])if(Number.isFinite(p.combat?.[k]))p.combat[k]=boostedAnimalML575(p.combat[k],t.boosts);
 for(const w of p.weapons||[])for(const k of ['attack','defence'])if(Number.isFinite(w[k]))w[k]=boostedAnimalML575(w[k],t.boosts);
 return {...actor,profile:p,stableTraining575:{sourceId:t.sourceId,boosts:t.boosts}};
}
export function stableAnimalZones575(data,campaignId,animal,health=null){
 const profile=bestiaryProfile(livestockMatcher(animal.beastId));
 const table=animalAnatomyTable566(profile?.combat?.bodyTable);
 if(!table)return {table:null,rows:[],profile};
 const wounds=health?.wounds||[];
 const grouped=new Map();
 for(const r of table.rows){const loc=r.id,entry=grouped.get(loc)||{id:loc,name:r.name,shock:r.shock,segments:[],wounds:[]};
  entry.segments.push({znMin:r.znMin,znMax:r.znMax,lnMin:r.lnMin,lnMax:r.lnMax});grouped.set(loc,entry);
 }
 for(const w of wounds){const entry=grouped.get(w.location);if(entry)entry.wounds.push({id:w.id,level:w.level,aspect:w.aspect,
  healed:!!w.healed,bleeding:!!w.bleeding,infected:!!w.infected,amputation:!!w.amputation,
  due:w.nextDueMinute,grimDue:w.grimDueMinute,minute:w.minute});}
 return {table:table.id,sourcePage:table.sourcePage,maxZN:table.maxZN,rows:[...grouped.values()],profile};
}
/** Physical hauling capacity applies only to a documented draught team.
 * Snow sled: one/two CART horses, 2,000/3,000 lb; use Cart rate on snow.
 */
export function stableHauling575({vehicleName,team=[]}={}){
 const ox=team.length&&team.every(a=>a?.spec?.breed==='bovine');
 const horse=team.length&&team.every(a=>a?.spec?.breed==='palfrey'&&
   /cart horse/i.test(a.spec.name));
 if(vehicleName==='Sled')return {required:team.length>=1&&team.length<=2?team.length:null,
  capacityLb:horse?(team.length===1?2000:team.length===2?3000:null):null,conveyance:'cart',needsSnow:true};
 if(vehicleName==='Cart, 2-wheel')return {required:1,capacityLb:team.length===1?(ox?2500:horse?2000:null):null,conveyance:'cart'};
 if(vehicleName==='Wagon, 4-wheel')return {required:2,capacityLb:team.length===2?(ox?8000:horse?6400:null):null,conveyance:'wagon'};
 return {required:null,capacityLb:null,conveyance:null};
}
export function validateStableTravel575(data){
 const journal=data?.journal||[];
 for(let i=0;i<journal.length;i++){
  const row=journal[i],p=row.calendarTrekProof,v=p?.stableVehicle575;
  if(!v)continue;
  demand(v.format==='hmk-stable-vehicle-watch-575'&&['cart','wagon'].includes(p.conveyance)&&
   p.conveyance===v.conveyance&&v.minute===row.campaignMinute&&row.calendarCampaignId===v.campaignId,
   'doklad tažení se neshoduje s hlídkou');
  const earlier={...data,journal:journal.slice(0,i)};
  const keeper=data.characters.flatMap(c=>c.hmk?.livestock||[]).find(a=>a.id===v.ownerAnimalId);
  demand(keeper&&keeper.campaignId===v.campaignId,'nedoložené vlastnictví tažného zvířete');
  const animals=v.teamIds.map(id=>{
   const found=data.characters.flatMap(c=>c.hmk?.livestock||[]).find(a=>a.id===id&&a.campaignId===v.campaignId);
   return found?{...found,spec:livestockOffer(found.beastId)}:null;
  });
  demand(animals.every(Boolean)&&new Set(v.teamIds).size===v.teamIds.length,'neplatná tažná skupina');
  const house=stableHubProjection(earlier,v.campaignId,keeper.id),vehicle=house.vehicles.find(e=>e.entryId===v.vehicleId);
  demand(vehicle&&vehicle.proofId===v.vehicleProofId&&vehicle.itemId===v.vehicleItemId&&VEHICLES_TACK_P122.find(x=>x.id===vehicle.itemId)?.name===v.vehicleName,'tažené vozidlo nebylo doloženo');
  const haul=stableHauling575({vehicleName:v.vehicleName,team:animals});
  demand((v.vehicleName==='Sled'?v.snowCoveredConfirmedByGM===true:v.snowCoveredConfirmedByGM===undefined)&&
   haul.required===v.teamIds.length&&haul.capacityLb!==null&&v.vehicleCargoLb===house.vehicleCargo
   .filter(c=>c.vehicleId===v.vehicleId).reduce((sum,c)=>sum+c.weightLb,0)&&v.vehicleCargoLb<=haul.capacityLb,
   'hmotnost a kapacita taženého nákladu nesouhlasí');
  demand(v.teamIds.every(id=>p.partyModes.animals.some(a=>a.id===id)), 'tažná zvířata nejsou v téže hlídce');
  demand(v.teamIds.every(id=>{
   const a=animals.find(a=>a.id===id);const tack=stableHubProjection(earlier,v.campaignId,id).tack;
   return tack.some(t=>t.itemId===(a.spec.breed==='bovine'?'hmk-p122-tack-06':'hmk-p122-tack-05'));
  }),'tažná zvířata nemají doložené odpovídající postroje');
  demand(v.vehicleCargoLb>=0&&Number.isSafeInteger(v.vehicleCargoLb),'chybí skutečná tažená hmotnost');
 }
 return true;
}
