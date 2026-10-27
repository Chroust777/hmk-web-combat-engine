/** HMK v1.2 pp.145,150,167,176,354-355.
 * Only live registered, breed-verified animals have a health snapshot.
 * Trekking gives explicit Fatigue to travellers/drovers, NOT a separate
 * mechanically specified hourly animal Trekking Fatigue; do not invent it.
 * Combat State is the sole state authority, this is an immutable travel proof.
 */
import {combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {hmkAnimalLocationSymbols} from './injury-special-hmk.js';
const requireFact=(v,m)=>{if(!v)throw Error(m);};
const int=v=>Number.isSafeInteger(v)&&v>=0;
const breeds=new Set(['donkey','pony','mule','palfrey','courser','charger','destrier']);
// The p.355 tail (tl) is coded in the existing injury anatomy as the hind
// body region, but p.145's incapacitating 'leg' must NOT include a tail.
const travelWound=w=>String(w.location).trim().toLowerCase()!=='tl'&&
 ['head','torso','legs'].includes(w.zone);
/** Captures facts for a verified animal, without copying its Combat State. */
export function trekRegisteredAnimalHealth(actor){
 requireFact(actor?.id&&typeof actor.id==='string'&&breeds.has(actor.hmk?.verifiedMountedBreed),
  'Zvíře musí mít vlastní ověřenou identitu a plemeno ze záznamu Combat State (HMK 355).');
 const state=actor.hmk?.combatState;
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
