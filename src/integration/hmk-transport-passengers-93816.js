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
/** Explicit GM exception: one secured immobile passenger with a different,
 * active controlling rider. HMK p.122 says rider(s) count to mount ENC, but
 * does NOT certify safety; the GM must confirm how the patient is secured.
 * No invented mount capacity: check actual resulting ENC and MOVE. */
export function securedMountedPassenger93816({data,campaignId,minute,mountId,patientId,
   memberIds,selectedStableIds,mass,gmConfirmed=false}={}){
 ok(gmConfirmed===true,'GM musí potvrdit skutečné zajištění pacienta na koni a schopnost jezdce jej vést.');
 ok(typeof mountId==='string'&&mountId&&typeof patientId==='string'&&patientId&&
    memberIds?.includes(patientId)&&selectedStableIds?.includes(mountId),'vyberte skutečného koně a pacienta z této cestovní skupiny.');
 ok(mass?.format===TRANSPORT_MASS_FORMAT_93816&&mass.people?.length===memberIds.length&&
    mass.patientLoadLb[patientId]>0&&Object.keys(mass.patientLoadLb).length===1,'na jednom koni lze zde doložit jednoho zabezpečeného pacienta. Pro další použijte vozidlo.');
 const animal=verifiedLivestock(data,campaignId).find(a=>a.id===mountId);
 ok(animal&&['palfrey','courser','charger','destrier','pony'].includes(animal.spec.breed),'pacienta lze přepravovat jen na skutečném vhodném koni ze Stáje.');
 const p=stableHubProjection(data,campaignId,mountId),rider=p.rider;
 ok(rider?.characterId&&memberIds.includes(rider.characterId)&&rider.characterId!==patientId,
   'kůň potřebuje samostatného aktivního jezdce, doloženého ve Stáji; pacient není řidič.');
 const certifiedRider=mass.people.find(w=>w.id===rider.characterId);
 ok(certifiedRider&&Math.abs(certifiedRider.totalLb-rider.weightLb)<.001,
   'hmotnost jezdce se od nasednutí změnila; aktualizujte jezdecký záznam ve Stáji (sesednout / nasednout).');
 const names=p.tack.map(t=>VEHICLES_TACK_P122.find(g=>g.id===t.itemId)?.name);
 ok(names.includes('Bit & bridle')&&names.includes('Blanket, horse')&&
    (names.includes('Saddle, riding')||names.includes('Saddle, war')),
    'kůň nemá doloženou uzdu, deku a jezdecké sedlo.');
 const b=stableBurden(data,campaignId,animal);
 ok(!b.exit&&!b.cargoOverflow&&safe(b.minimumLb),'zvíře nemá doložené zatížení nebo je přetížené.');
 const totalLb=round(b.minimumLb+mass.patientLoadLb[patientId]);
 const enc=Math.max(0,mountLoadENC(totalLb,{kind:'horse'})+strengthEncumbranceModifier(animal.spec.str));
 ok(Number.isSafeInteger(enc)&&Number.isFinite(animal.spec.move)&&animal.spec.move-enc>=5,
    'kůň s jezdcem a pacientem nemá dostatečný zbývající Move; použijte káru/vůz.');
 return {format:MOUNT_PASSENGER_FORMAT_93816,campaignId,minute,mountId,patientId,riderId:rider.characterId,
   animalName:animal.name,stableRiderProofId:rider.proofId,minimumLb:b.minimumLb,patientLb:mass.patientLoadLb[patientId],
   totalLb,enc,moveAfterLoad:animal.spec.move-enc,gmConfirmed:true,sourcePages:[122,145]};
}
