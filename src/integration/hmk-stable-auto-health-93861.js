/** v93.861: acquiring a verified catalogue animal creates its canonical
 * baseline health actor in the SAME transaction as ownership. No medical
 * examination, die, wound, healing or time advancement is invented.  Legacy
 * owned animals without a medical actor are enrolled conservatively only if
 * their prior bestiary medical stream contains no trauma.  Existing actors,
 * wounds and immutable purchase proofs must never be rewritten.
 */
import {livestockOffer} from './hmk-livestock-562.js';
import {bestiaryForLivestock} from './hmk-bestiary-563.js';
import {animalAnatomyTable566} from './hmk-bestiary-anatomy-566.js';
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
const need=(b,s)=>{if(!b)throw Error('Stáj · automatický zdravotní profil: '+s);};
export const STABLE_AUTO_HEALTH_FORMAT_93861='hmk-stable-auto-health-93861-v1';
export function animalBaselineFromStable93861({data,record,campaignId,minute,proofId,legacy=false}={}){
 need(record&&typeof record.id==='string'&&record.id&&typeof record.name==='string'&&record.name&&
   record.campaignId===campaignId&&record.ownerId&&Number.isSafeInteger(record.minute)&&
   Number.isSafeInteger(minute)&&minute>=record.minute&&typeof proofId==='string'&&proofId,'neplatné vlastnictví, čas nebo identita.');
 need(!data.characters.some(c=>c.id===record.id),'zdravotní aktér se stejným ID již existuje.');
 need(!data.journal.some(j=>j.livestockHealthAuto93861?.animalId===record.id||j.id===proofId),'duplicitní zdravotní doklad.');
 const offer=livestockOffer(record.beastId),profile=bestiaryForLivestock(offer);
 need(offer&&profile&&animalAnatomyTable566(profile.combat?.bodyTable)&&
  ['str','end','agl','per','aur','wil','rea','cre'].every(k=>Number.isSafeInteger(profile.attributes?.[k])&&profile.attributes[k]>=1),
  'chybí úplná pravidlová anatomie nebo atributy z Bestiáře.');
 // A historical Bestiary trauma cannot be silently made healthy by creating
 // an empty Combat State. The original medical records must be reconciled.
 const visits=new Set(data.journal.filter(j=>j.bestiaryEncounter?.campaignId===campaignId&&
  j.bestiaryEncounter?.ownerAnimalId===record.id&&j.bestiaryEncounter.action==='create')
  .map(j=>j.bestiaryEncounter.id));
 need(!data.journal.some(j=>j.bestiaryTrauma?.campaignId===campaignId&&visits.has(j.bestiaryTrauma.targetId)),
  'existují starší zvířecí zdravotní následky Bestiáře; nelze je přepsat zdravým výchozím stavem.');
 const breed=offer.breed||profile.id;
 const actor={id:record.id,name:record.name,kind:'NPC',hmk:{
  verifiedMountedBreed:breed,livestockBreed:breed,livestockOwnerId:record.ownerId,
  livestockSourceId:record.beastId,livestockBodyWeightLb:offer.bodyWeightLb,
  stableHealthAuto93861:true,
  attributes:Object.fromEntries(['str','end','agl','per','aur','wil','rea','cre'].map(k=>[k,profile.attributes[k]])),
  healthState:initialCombatState()}};
 validateCombatState(actor.hmk.healthState);
 const proof={format:STABLE_AUTO_HEALTH_FORMAT_93861,animalId:record.id,
  ownerId:record.ownerId,beastId:record.beastId,campaignId,acquisitionMinute:record.minute,
  minute,breed,bodyTable:profile.combat.bodyTable,legacy:Boolean(legacy),
  transactionId:record.transactionId,source:'verified-p122-p355-p357-catalogue-baseline',
  noDice:true,noMedicalHistoryReset:true};
 return {actor,proof};
}
export function missingStableHealth93861(data,campaignId){
 if(!campaignId)return [];
 const actors=new Set(data.characters.map(c=>c.id)),missing=[];
 for(const owner of data.characters){if(owner.hmk?.verifiedMountedBreed)continue;
  for(const record of owner.hmk?.livestock||[]){
   if(record.campaignId===campaignId&&!actors.has(record.id)&&
    data.journal.some(j=>j.livestockAcquisition?.animalId===record.id)&&
    !data.journal.some(j=>j.stableHub574?.type==='sale'&&j.stableHub574?.animalId===record.id))
    missing.push(record);
  }
 }
 return missing;
}
export function validateStableAutoHealth93861(data){
 const records=new Map(),proofs=new Map();
 for(const owner of data.characters)for(const r of owner.hmk?.livestock||[])records.set(r.id,r);
 for(const row of data.journal){const p=row.livestockHealthAuto93861;if(!p)continue;
  need(p.format===STABLE_AUTO_HEALTH_FORMAT_93861&&!proofs.has(p.animalId)&&
   row.calendarCampaignId===p.campaignId&&row.campaignMinute===p.minute&&
   row.characterId===p.animalId,'pozměněný nebo duplicitní zdravotní doklad.');
  const r=records.get(p.animalId),sp=livestockOffer(p.beastId),profile=bestiaryForLivestock(sp);
  need(r&&r.ownerId===p.ownerId&&r.beastId===p.beastId&&r.campaignId===p.campaignId&&
   r.transactionId===p.transactionId&&r.minute===p.acquisitionMinute&&p.minute>=p.acquisitionMinute&&
   profile&&profile.combat.bodyTable===p.bodyTable&&p.breed===(sp.breed||profile.id)&&
   p.noDice===true&&p.noMedicalHistoryReset===true&&typeof p.legacy==='boolean',
   'zdravotní doklad nesouhlasí se Stájí a pravidlovým druhem.');
  proofs.set(p.animalId,p);
 }
 for(const c of data.characters){if(!c.hmk?.stableHealthAuto93861)continue;
  const p=proofs.get(c.id),r=records.get(c.id);
  need(p&&r&&c.name===r.name&&c.hmk.verifiedMountedBreed===p.breed&&
    c.hmk.livestockOwnerId===r.ownerId&&c.hmk.livestockSourceId===r.beastId&&
    !!c.hmk.healthState,'kanonický profil chybí nebo má jinou identitu.');
  validateCombatState(c.hmk.healthState);
 }
 for(const [id] of proofs)need(data.characters.some(c=>c.id===id&&c.hmk?.stableHealthAuto93861),
  'zdravotní profil z dokladu byl odstraněn.');
 return true;
}
