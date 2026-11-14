/** v93.879: a living, immobile Stable animal is a PHYSICAL cargo entry,
 * not a second traveller, an invented player character or free-text freight.
 * Its weight comes solely from p.122/355 species and its own Stable gear.
 */
import {verifiedLivestock} from './hmk-livestock-562.js';
import {stableBurden,stableHubProjection} from './hmk-stable-hub-574.js';
import {trekRegisteredAnimalHealth} from './hmk-trekking-animal-health.js';
const need=(ok,msg)=>{if(!ok)throw Error('Přeprava zvířete: '+msg)};
export function carriedStableAnimal93879(data,campaignId,animalId,{requireImmobile=true,checkCustody=true}={}){
 const animal=verifiedLivestock(data,campaignId).find(a=>a.id===animalId);
 need(animal&&Number.isSafeInteger(animal.spec?.bodyWeightLb)&&animal.spec.bodyWeightLb>0,
  'chybí vlastněné zvíře a doložená tělesná hmotnost.');
 const actor=(data.characters||[]).find(a=>a.id===animalId&&a.hmk?.verifiedMountedBreed===animal.spec.breed&&a.hmk?.healthState);
 need(actor&&(data.campaignClock?.characterIds||[]).includes(animalId),
  'konkrétní zvíře nemá aktivní autoritativní zdravotní profil stejného ID.');
 const health=trekRegisteredAnimalHealth(actor);
 need(health.shock!=='KIA','mrtvé zvíře není živým nepohyblivým pacientem.');
 need(!requireImmobile||health.immobile||health.shock!=='NONE'||health.comaActive||health.extendedShockActive||health.fatigue>=40,
  'zvíře podle aktuálního zdravotního stavu není nepohyblivé.');
 if(checkCustody)for(const carrier of verifiedLivestock(data,campaignId)){
  need(!stableHubProjection(data,campaignId,carrier.id).vehicleCargo.some(c=>c.carriedAnimalId===animalId),
   'toto zvíře už je fyzicky naložené v jiném vozidle; nejprve jej vyložte.');
 }
 const load=stableBurden(data,campaignId,animal);
 need(Number.isSafeInteger(load.gearAndCargoLb)&&load.gearAndCargoLb>=0&&!load.cargoOverflow,
  'nelze doložit úplnou váhu výstroje a nákladu převáženého zvířete.');
 const weightLb=animal.spec.bodyWeightLb+load.gearAndCargoLb;
 need(Number.isSafeInteger(weightLb)&&weightLb>0&&weightLb<=1000000,'vypočtená váha je neplatná.');
 return {animal,actor,health,weightLb,bodyWeightLb:animal.spec.bodyWeightLb,gearAndCargoLb:load.gearAndCargoLb};
}
export function loadedStableAnimalIds93879(data,campaignId){
 return verifiedLivestock(data,campaignId).flatMap(carrier=>stableHubProjection(data,campaignId,carrier.id).vehicleCargo
  .filter(e=>e.carriedAnimalId).map(e=>e.carriedAnimalId));
}
