/** HMK v1.2 pp.150,176: animal rest extension.
 * The book explicitly describes four-hour rest / eight-hour sleep recovery
 * for characters; extending these amounts to trekking animals is a labelled
 * GM-approved analogy, NOT a newly asserted printed species-specific rule.
 * There is no animal END roll or separate animal health database.
 */
import {trekRegisteredAnimalHealth,validateTrekAnimalHealthProof} from './hmk-trekking-animal-health.js';
import {expeditionRestRecovery} from './hmk-calendar-expedition.js';
const requireFact=(v,m)=>{if(!v)throw Error(m);};
const FORMAT='hmk-animal-rest-analogy-v1';
export function eligibleRestingAnimals({characters=[],journal=[],clock}={}){
 if(!clock)return [];
 // The authoritative campaign actor branch owns health updates. A Trekking
 // mention alone cannot authorise mutations to an actor outside the active
 // campaign (multi-campaign isolation and Cloud Sync protection).
 const roster=new Set(clock.characterIds??[]);
 return characters.filter(c=>c?.hmk?.verifiedMountedBreed&&roster.has(c.id));
}
/** A GM must confirm the actual conditions, especially eight hours of sleep. */
export function planAnimalRest({actor,kind,minute,gmConfirmed,claims={}}={}){
 requireFact(kind==='rest'||kind==='sleep','Zvíře může obnovit Weariness jen doloženým 4h odpočinkem nebo 8h spánkem.');
 requireFact(gmConfirmed===true,'GM musí potvrdit skutečný klid a podmínky odpočinku zvířete (u spánku skutečných 8 hodin).');
 const health=trekRegisteredAnimalHealth(actor);
 const state=actor.hmk.combatState;
 requireFact(health.shock==='NONE'&&!health.comaActive&&!health.extendedShockActive,
  'Shock, Coma nebo Extended Shock vyžadují vlastní zdravotní proceduru před obyčejným odpočinkem zvířete.');
 requireFact(!state.environmentalHazards?.some(h=>h.active)&&state.sleepDeprivation?.status!=='awake',
  'Během aktivní Exposure / Sleep Deprivation nelze předpokládat běžný nerušený odpočinek zvířete.');
 const recovery=expeditionRestRecovery({minute,kind,current:state.fatigue.weariness,claims});
 return {...recovery,animalRestPolicy:{format:FORMAT,animalId:actor.id,breed:health.breed,kind,
  confirmedByGM:true,healthAtStart:health,wearinessAtStart:state.fatigue.weariness,
  interpretation:'GM-approved animal analogy: HMK 150/176 character rest rates, not species-specific printed animal recovery',
  sourcePages:[150,176,354,355]}};
}
export function validateAnimalRestPlan(plan,actorId){
 const p=plan?.animalRestPolicy;
 requireFact(p&&p.format===FORMAT&&p.animalId===actorId&&p.confirmedByGM===true&&
  p.kind===plan.kind&&['rest','sleep'].includes(p.kind)&&
  p.healthAtStart?.breed===p.breed&&p.healthAtStart?.actorId===actorId&&
  Number.isSafeInteger(p.wearinessAtStart)&&p.wearinessAtStart>=0&&
  p.interpretation==='GM-approved animal analogy: HMK 150/176 character rest rates, not species-specific printed animal recovery'&&
  JSON.stringify(p.sourcePages)==='[150,176,354,355]'&&
  plan.durationMinutes===(p.kind==='rest'?240:480),
  'Poškozený doklad naplánovaného zvířecího odpočinku.');
 validateTrekAnimalHealthProof(p.healthAtStart,actorId);
 return true;
}
/** Reject stale health after an intervening event; never silently heal an
 * animal whose rest was interrupted by combat, travel or exposure. */
export function assertAnimalRestStillValid(plan,actor){
 validateAnimalRestPlan(plan,actor?.id);
 const current=trekRegisteredAnimalHealth(actor);
 requireFact(JSON.stringify(current)===JSON.stringify(plan.animalRestPolicy.healthAtStart)&&
  actor.hmk.combatState.fatigue.weariness===plan.animalRestPolicy.wearinessAtStart,
  'Zdraví / únava zvířete se během odpočinku změnily. GM musí vyznačit přerušení v reálném čase události.');
 requireFact(!actor.hmk.combatState.environmentalHazards?.some(x=>x.active),
  'Aktivní Weather Hazard zvířete vyžaduje rozhodnutí GM před dokončením odpočinku.');
 return true;
}
