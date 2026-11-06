/** Stable -> canonical animal Health State registration, v93.759.
 * A purchase is NOT proof of health. This is a separate, GM-confirmed,
 * zero-time veterinary baseline of an actually examined owned animal.
 * No dice, wounds, fatigue, or existing trauma history are fabricated.
 */
import {verifiedLivestock} from './hmk-livestock-562.js';
import {initialCombatState} from './persistent-combat-state.js';
import {trekRegisteredAnimalHealth} from './hmk-trekking-animal-health.js';
const demand=(x,s)=>{if(!x)throw Error('Stáj · zdravotní registrace: '+s)};
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
export const STABLE_HEALTH_REGISTRATION_FORMAT_93759='hmk-stable-health-registration-93759-v1';
export function prepareStableAnimalHealthRegistration93759({data,campaignId,minute,animalId,
 gmConfirmed=false,examinedHealthy=false,examNote='',proofId}={}){
 demand(data&&id(campaignId)&&Number.isSafeInteger(minute)&&minute>=0&&
  data.campaignClock?.minute===minute,'neaktuální nebo nedoložený kalendář kampaně.');
 demand(id(animalId)&&id(proofId),'chybí přesná identita zvířete nebo dokladu.');
 demand(gmConfirmed===true&&examinedHealthy===true,
  'GM musí výslovně potvrdit osobní ověření zdraví, únavy, zranění, Shock, Coma a povinných termínů.');
 const note=String(examNote||'').trim();
 demand(note.length>=8&&note.length<=500,'uveďte konkrétní podklad zdravotního ověření (8–500 znaků).');
 const animal=verifiedLivestock(data,campaignId).find(x=>x.id===animalId);
 demand(animal&&animal.spec.breed&&['bovine','camel','donkey','pony','mule','palfrey','courser','charger','destrier'].includes(animal.spec.breed),
  'zvíře není aktivně vlastněné nebo nemá doložený druhový profil HMK 355.');
 demand(!(data.characters||[]).some(x=>x.id===animalId),
  'existující zdravotní aktér se stejným ID již existuje; jeho stav se nesmí přepsat.');
 demand(!(data.journal||[]).some(j=>j.animalHealthRegistration93759?.animalId===animalId||j.id===proofId),
  'duplicitní nebo opakovaná zdravotní registrace.');
 // Existing bestiary encounters have their OWN permanent wound/shock journal.
 // Never silently replace a historical injury or treatment with a healthy state.
 const encounters=(data.journal||[]).filter(j=>j.bestiaryEncounter?.ownerAnimalId===animalId&&
   j.bestiaryEncounter?.campaignId===campaignId).map(j=>j.bestiaryEncounter.id);
 demand(!(data.journal||[]).some(j=>j.bestiaryTrauma?.campaignId===campaignId&&
   encounters.includes(j.bestiaryTrauma?.targetId)),
  'existují starší zdravotní doklady v Bestiáři; před registrací je nutné je pravidlově sjednotit.');
 const a=animal.spec,attrs={};
 for(const k of ['str','end','agl','per','aur','wil','rea','cre']){
  demand(Number.isFinite(a[k])&&a[k]>0,'chybí doložený atribut '+k+' (HMK 355).');attrs[k]=a[k];
 }
 const actor={id:animalId,name:animal.name,kind:'NPC',hmk:{
  verifiedMountedBreed:a.breed,livestockBreed:a.breed,livestockOwnerId:animal.ownerId,
  livestockSourceId:animal.beastId,livestockBodyWeightLb:a.bodyWeightLb,
  attributes:attrs,healthState:initialCombatState()}};
 // Validate same canonical state shape used in travel, including oxen/camels.
 trekRegisteredAnimalHealth(actor);
 const proof={format:STABLE_HEALTH_REGISTRATION_FORMAT_93759,animalId,
  ownerId:animal.ownerId,beastId:animal.beastId,breed:a.breed,campaignId,
  minute,gmConfirmed:true,examinedHealthy:true,examNote:note};
 return {actor,proof};
}
