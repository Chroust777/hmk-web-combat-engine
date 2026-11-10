/** v93.816: immutable passenger mass and exceptional mounted-person evidence.
 * Stable and inventory are authoritative.  A second person on a horse is NOT
 * a second Stable rider, and no Combat action/state is created here.
 */
import {stableBurden,stableHubProjection} from './hmk-stable-hub-574.js';
import {verifiedLivestock} from './hmk-livestock-562.js';
import {mountLoadENC} from '../rules/gear-load.js';
import {strengthEncumbranceModifier} from '../rules/encumbrance.js';
import {VEHICLES_TACK_P122} from '../rules/conveyance-printed-p122.js';
const fail=s=>{throw Error('Přeprava: '+s)};
const ok=(v,s)=>{if(!v)fail(s)};
const round=n=>Math.round(n*1000)/1000;
const safe=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1000000;
export const TRANSPORT_MASS_FORMAT_93816='hmk-person-passenger-mass-93816';
export const MOUNT_PASSENGER_FORMAT_93816='hmk-gm-secured-mount-passenger-93816';
/** The caller MUST use the existing Stable verified Appearance + projected
 * inventory weight routine (stableRiderWeight584), not a guessed attribute.
 * Every party member, including a transported patient, is counted once.
 */
export function certifiedTransportMass93816({memberIds,transportedMemberIds=[],readWeight,additionalLb=0}={}){
 ok(Array.isArray(memberIds)&&memberIds.length>0&&memberIds.every(id=>typeof id==='string'&&id)&&new Set(memberIds).size===memberIds.length,'neplatná sestava cestujících.');
 ok(Array.isArray(transportedMemberIds)&&new Set(transportedMemberIds).size===transportedMemberIds.length&&transportedMemberIds.every(id=>memberIds.includes(id)),'duplicitní nebo cizí pacient.');
 ok(safe(additionalLb),'dodatečný neevidovaný náklad musí být skutečná nezáporná hmotnost (lb).');
 const people=memberIds.map(id=>{
  const w=readWeight(id);
  ok(w&&w.ready===true&&safe(w.bodyLb)&&w.bodyLb>0&&safe(w.gearLb)&&safe(w.totalLb)&&w.totalLb>0&&
     round(w.bodyLb+w.gearLb)===w.totalLb&&Array.isArray(w.items),
     'postava '+id+': '+(w?.reason||'tělesná hmotnost nebo inventář nejsou doložené.'));
  ok(w.items.every(i=>typeof i.inventoryId==='string'&&i.inventoryId&&safe(i.quantity)&&i.quantity>0&&
    safe(i.unitWeightLb)&&safe(i.contentsLb)),'neúplná hmotnost inventáře: '+id);
  ok(round(w.items.reduce((s,i)=>s+i.quantity*i.unitWeightLb+i.contentsLb,0))===w.gearLb,'inventář neodpovídá doložené hmotnosti: '+id);
  return {id,bodyLb:w.bodyLb,gearLb:w.gearLb,totalLb:w.totalLb,items:w.items.map(i=>({...i}))};
 });
 const patientLoadLb=Object.fromEntries(people.filter(p=>transportedMemberIds.includes(p.id)).map(p=>[p.id,p.totalLb]));
 const otherPersonLb=round(people.filter(p=>!transportedMemberIds.includes(p.id)).reduce((s,p)=>s+p.totalLb,0));
 const otherLoadLb=round(otherPersonLb+additionalLb);
 return {format:TRANSPORT_MASS_FORMAT_93816,people,patientLoadLb,otherPersonLb,additionalLb,otherLoadLb,
  totalPeopleLb:round(people.reduce((s,p)=>s+p.totalLb,0)),sourcePages:[122,145]};
}
export function validateTransportMassEvidence93816(p,memberIds,patientIds,actualPatientLoad,actualOtherLoad){
 ok(p?.format===TRANSPORT_MASS_FORMAT_93816&&Array.isArray(p.people)&&Array.isArray(memberIds)&&Array.isArray(patientIds), 'historické hmotnosti chybí.');
 const derived=certifiedTransportMass93816({memberIds,transportedMemberIds:patientIds,additionalLb:p.additionalLb,
   readWeight:id=>{const row=p.people.find(x=>x.id===id);return row?{ready:true,...row}:null;}});
 const sortedWeightEntries=m=>Object.entries(m||{}).sort(([a],[b])=>a.localeCompare(b));
 ok(JSON.stringify(p)===JSON.stringify(derived)&&
   JSON.stringify(sortedWeightEntries(actualPatientLoad))===JSON.stringify(sortedWeightEntries(derived.patientLoadLb))&&
   actualOtherLoad===derived.otherLoadLb,'hmotnost cestujících nebo nákladu neodpovídá dokladu.');
 return true;
}
/** v93.822: the group selects the handler's position for THIS travel episode.
 * Stable rider history is not an extra passenger and must not be double counted.
 * This is a calculation/transport configuration, not a Combat action.
 */
export function securedMountedPassenger93816({data,campaignId,minute,mountId,patientId,
   memberIds,selectedStableIds,mass,handlerId=null,handlerPosition='mounted',gmConfirmed=true}={}){
 ok(typeof mountId==='string'&&mountId&&typeof patientId==='string'&&patientId&&
    memberIds?.includes(patientId)&&selectedStableIds?.includes(mountId),'vyberte skutečného koně a pacienta z této skupiny.');
 ok(mass?.format===TRANSPORT_MASS_FORMAT_93816&&mass.people?.length===memberIds.length&&
    mass.patientLoadLb[patientId]>0&&Object.keys(mass.patientLoadLb).length===1,
    'zvolte jednoho pacienta na tomto koni; pro více pacientů použijte další zvíře nebo vozidlo.');
 const animal=verifiedLivestock(data,campaignId).find(a=>a.id===mountId);
 ok(animal&&['palfrey','courser','charger','destrier','pony'].includes(animal.spec.breed),'vyberte koně ze Stáje.');
 ok(['mounted','leading'].includes(handlerPosition),'vyberte zda průvodce jede, nebo vede koně pěšky.');
 const chosenHandler=handlerId||memberIds.find(id=>id!==patientId);
 ok(chosenHandler&&chosenHandler!==patientId&&memberIds.includes(chosenHandler),
    'vyberte schopného průvodce ze stejné skupiny, který koně povede.');
 const handler=mass.people.find(w=>w.id===chosenHandler);
 ok(handler&&handler.totalLb>0,'chybí hmotnost průvodce.');
 const p=stableHubProjection(data,campaignId,mountId);
 const names=p.tack.map(t=>VEHICLES_TACK_P122.find(g=>g.id===t.itemId)?.name);
 ok(names.includes('Bit & bridle')&&(names.includes('Saddle, riding')||names.includes('Saddle, war')),
   'pro pacienta na koni doplňte uzdu a sedlo ve Stáji (koupit / zdarma).');
 const b=stableBurden(data,campaignId,animal);
 ok(!b.exit&&safe(b.gearAndCargoLb),'zvíře není dostupné nebo jeho náklad nelze vypočítat.');
 // Crucially NOT b.minimumLb: that includes a possibly stale Stable rider.
 // Every actual occupant is counted exactly once for this travel episode.
 const handlerOnHorse=handlerPosition==='mounted';
 const handlerLb=handlerOnHorse?handler.totalLb:0;
 const totalLb=round(b.gearAndCargoLb+mass.patientLoadLb[patientId]+handlerLb);
 const enc=Math.max(0,mountLoadENC(totalLb,{kind:'horse'})+strengthEncumbranceModifier(animal.spec.str));
 ok(Number.isSafeInteger(enc)&&Number.isFinite(animal.spec.move),'hmotnost nebo Move koně nejsou k dispozici.');
 return {format:MOUNT_PASSENGER_FORMAT_93816,campaignId,minute,mountId,patientId,
  riderId:handlerOnHorse?chosenHandler:null,handlerId:chosenHandler,handlerPosition,
  animalName:animal.name,stableRiderProofId:null,minimumLb:b.gearAndCargoLb,
  patientLb:mass.patientLoadLb[patientId],handlerLb,totalLb,enc,
  moveAfterLoad:animal.spec.move-enc,gmConfirmed:true,sourcePages:[122,145]};
}
