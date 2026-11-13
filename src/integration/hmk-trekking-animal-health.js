/** HMK v1.2 pp.145,150,167,176,354-355.
 * Only live registered, breed-verified animals have a health snapshot.
 * Trekking gives explicit Fatigue to travellers/drovers, NOT a separate
 * mechanically specified hourly animal Trekking Fatigue; do not invent it.
 * Combat State is the sole state authority, this is an immutable travel proof.
 */
import {combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {hmkAnimalLocationSymbols} from './injury-special-hmk.js';
import {animalHealthProjection567} from './hmk-bestiary-trauma-567.js';
const requireFact=(v,m)=>{if(!v)throw Error(m);};
const int=v=>Number.isSafeInteger(v)&&v>=0;
const breeds=new Set(['bovine','camel','donkey','pony','mule','palfrey','courser','charger','destrier','guard','hunter','ratter','elephant','hawk']);
// The p.355 tail (tl) is coded in the existing injury anatomy as the hind
// body region, but p.145's incapacitating 'leg' must NOT include a tail.
const travelWound=w=>String(w.location).trim().toLowerCase()!=='tl'&&
 ['head','torso','legs'].includes(w.zone);
/** Captures facts for a verified animal, without copying its Combat State. */
export function trekRegisteredAnimalHealth(actor){
 requireFact(actor?.id&&typeof actor.id==='string'&&breeds.has(actor.hmk?.verifiedMountedBreed),
  'Zvíře musí mít vlastní ověřenou identitu a plemeno ze záznamu Combat State (HMK 355).');
 const state=actor.hmk?.healthState;
 requireFact(state,'Zvíře '+actor.id+': chybí jeho autoritativní Combat State.');
 validateCombatState(state);
 const seriousWounds=state.wounds.filter(w=>!w.healed&&['S','G'].includes(w.severity)).map(w=>{
  const loc=hmkAnimalLocationSymbols(w.location);
  requireFact(loc,'Zvíře '+actor.id+': zranění má neznámou zvířecí lokaci '+w.location+' (HMK 355).');
  return {id:w.id,location:w.location,severity:w.severity,zone:loc.zone};
 });
 const fatigue=combatFatigueTotals(state).total;
 const injured=seriousWounds.some(travelWound);
 const immobile=seriousWounds.some(w=>w.severity==='G'&&travelWound(w));
 const shock=state.shock;
 const comaActive=state.coma?.active===true;
 const extendedShockActive=!!state.extendedShock;
 return {format:'hmk-trek-animal-health-v1',actorId:actor.id,breed:actor.hmk.verifiedMountedBreed,
  fatigue,shock,comaActive,extendedShockActive,injured,immobile,seriousWounds};
}
/** Historical snapshot validator. No comparison to later mutable live health. */
export function validateTrekAnimalHealthProof(health,id){
 requireFact(health&&health.format==='hmk-trek-animal-health-v1'&&health.actorId===id&&
  breeds.has(health.breed)&&int(health.fatigue)&&['NONE','STN','INC','UNC','KIA'].includes(health.shock)&&
  typeof health.comaActive==='boolean'&&typeof health.extendedShockActive==='boolean'&&
  typeof health.injured==='boolean'&&typeof health.immobile==='boolean'&&
  Array.isArray(health.seriousWounds)&&health.seriousWounds.every(w=>
   typeof w.id==='string'&&w.id&&['S','G'].includes(w.severity)&&
   hmkAnimalLocationSymbols(w.location)?.zone===w.zone)&&
  health.injured===health.seriousWounds.some(travelWound)&&
  health.immobile===health.seriousWounds.some(w=>w.severity==='G'&&travelWound(w)),
  'Neplatný nebo pozměněný zdravotní doklad zvířete.');
 return true;
}
/** Non-walking animal is a movement dependency, never an assumed wagon passenger. */
export function assertTrekAnimalCanMove(health){
 if(!health)return; // Unregistered animal: historical free-text evidence, NO invented state.
 requireFact(health.shock==='NONE',
  'Zvíře '+health.actorId+': aktivní Shock '+health.shock+' – nejprve vyhodnoťte zdravotní stav.');
 requireFact(!health.comaActive&&!health.extendedShockActive,
  'Zvíře '+health.actorId+': aktivní Coma nebo Extended Shock vyžaduje vyřešení zdravotního stavu.');
 requireFact(!health.immobile,
  'Zvíře '+health.actorId+': Grievous zranění hlavy, trupu či nohy – nemůže táhnout ani nést náklad (HMK 145).');
 requireFact(health.fatigue<40,
  'Zvíře '+health.actorId+': Fatigue ≥ 40 – nemůže pokračovat vlastní silou (HMK 145).');
}

/** v93.815 – Strict read-only boundary between the stable travel roster and
 * veterinary health. Ownership/load comes exclusively from the Stable;
 * the canonical health record contributes ONLY mobility-relevant facts.
 * No Combat actor is enrolled in a travel group, no state is created or
 * written here, and a partially linked profile may never hide a known wound.
 * Existing legacy veterinary profiles retain their separately proven IDs.
 */
export function resolveTrekAnimalReadiness93815({stableAnimals=[],legacyAnimals=[],registeredProfiles=[],activeProfileIds=[]}={}){
 requireFact(Array.isArray(stableAnimals)&&Array.isArray(legacyAnimals)&&
  Array.isArray(registeredProfiles)&&Array.isArray(activeProfileIds),
  'Pochod: neplatná evidence zvířat a jejich zdravotních profilů.');
 const active=new Set(activeProfileIds),profiles=new Map();
 for(const actor of registeredProfiles){
  if(!actor?.id)continue;
  requireFact(!profiles.has(actor.id),'Zdravotní evidence obsahuje duplicitní ID zvířete '+actor.id+'.');
  profiles.set(actor.id,actor);
 }
 const ids=new Set(),snapshots=[];
 function select(id){
  requireFact(typeof id==='string'&&id.length>0&&!ids.has(id),
   'Pochod: stejné zvíře je vybráno dvakrát. Zvolte jedno ID ve Stáji.');
  ids.add(id);
 }
 for(const stable of stableAnimals){
  select(stable?.id);
  const actor=profiles.get(stable.id);
  if(!actor)continue; // Legacy purchases may await a conflict-safe auto-enrollment.
  requireFact(actor.hmk?.verifiedMountedBreed===(stable.breed||stable.bestiaryId),
   'Stáj · '+(stable.name||stable.id)+': zdravotní profil stejného ID má jiné nebo nedoložené plemeno. Opravte propojení identity, nikoliv výsledek Pochodu.');
  requireFact(active.has(stable.id)&&actor.hmk?.healthState,
   'Stáj · '+(stable.name||stable.id)+': existující zdravotní profil není aktivní a úplný v tomto kalendáři. Před cestou jej pravidlově sjednoťte; nesmí se ignorovat skutečné zranění.');
  const snapshot=trekRegisteredAnimalHealth(actor);
  assertTrekAnimalCanMove(snapshot);
  snapshots.push(snapshot);
 }
 for(const actor of legacyAnimals){
  select(actor?.id);
  requireFact(profiles.has(actor.id)&&active.has(actor.id)&&actor.hmk?.healthState,
   'Historický zdravotní profil zvířete musí být aktivní a ověřený v kampani.');
  const snapshot=trekRegisteredAnimalHealth(actor);
  assertTrekAnimalCanMove(snapshot);
  snapshots.push(snapshot);
 }
 return snapshots;
}

/** Bestiary encounters have a SECOND historical trauma projection. Never
 * silently present a healthy Stable/Combat snapshot when an active wound or
 * Shock for that SAME physically owned animal survives in that older stream.
 * This conservative boundary is read-only: it does not infer a conversion of
 * Bestiary IL into a new Combat wound or erase original injury history.
 * Once every Bestiary medical consequence is resolved, travel may proceed.
 */
export function assertNoActiveBestiaryTravelConflict93815({journal=[],campaignId,animalIds=[]}={}){
 requireFact(Array.isArray(journal)&&Array.isArray(animalIds)&&typeof campaignId==='string',
  'Pochod: chybí zdravotní návaznost na Bestiář.');
 for(const animalId of new Set(animalIds)){
  const visits=journal.filter(j=>j.bestiaryEncounter?.action==='create'&&
   j.bestiaryEncounter?.campaignId===campaignId&&j.bestiaryEncounter?.ownerAnimalId===animalId);
  if(!visits.length)continue;
  const encounters=new Set(visits.map(j=>j.bestiaryEncounter.id));
  const medical=journal.filter(j=>j.bestiaryTrauma?.campaignId===campaignId&&
   encounters.has(j.bestiaryTrauma.targetId));
  if(!medical.length)continue;
  // Unknown historic formats cannot be projected as healthy.  The old
  // encounter projection groups wounds by both animal ID and its owner ID;
  // ownership transfers must not hide previous unresolved medical facts.
  requireFact(medical.every(j=>j.bestiaryTrauma?.format==='hmk-bestiary-trauma-567-v1'),
   'Stáj · '+animalId+': Bestiář obsahuje starší neověřený zdravotní formát. Před Pochodem musí GM sjednotit historii.');
  const ownershipGroups=new Map();
  for(const visit of visits){
   const owner=visit.bestiaryEncounter.ownerId??'';
   if(!ownershipGroups.has(owner))ownershipGroups.set(owner,[]);
   ownershipGroups.get(owner).push(visit.bestiaryEncounter.id);
  }
  // Do not mutate either Bestiary or Combat history to make a trip pass.
  for(const ids of ownershipGroups.values()){
   let projected;
   try{projected=animalHealthProjection567(journal,campaignId,ids.at(-1));}
   catch(err){throw Error('Stáj · '+animalId+': zdravotní historie Bestiáře není jednoznačná: '+err.message);}
   const active=projected.shock!=='none'||projected.wounds.some(w=>!w.healed||w.permanentImpairment>0)||
    !!projected.extendedShock?.active||!!projected.coma?.active||projected.bloodLoss?.bp>0||
    !!projected.permanentLosses?.length||projected.comaWeariness>0;
   if(active)throw Error('Stáj · '+animalId+': Bestiář eviduje aktivní zdravotní následek téhož zvířete mimo jeho základní zdravotní profil. Pochod nesmí předpokládat zdravé zvíře ani přepisovat Combat State. Otevřete zdravotní historii zvířete v Bestiáři a dokončete skutečné léčení a následné testy; neuzavřené či trvalé následky vyžadují sjednocení GM.');
  }
 }
 return true;
}
