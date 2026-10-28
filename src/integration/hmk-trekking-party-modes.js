/** HMK Kèthîra pp.145–146: deterministic disadvantages of a trekking party.
 * Facts are snapshotted at watch preparation; later changes to actor state
 * must not silently rewrite that historical watch. No GM-entered 'fatigue'
 * or invented unknown load. Non-folk conveyance ENC still needs GM evidence.
 */
import {hmkHumanLocationSymbols} from './injury-special-hmk.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {combatFatigueTotals} from './persistent-combat-state.js';
import {trekRegisteredAnimalHealth,validateTrekAnimalHealthProof,assertTrekAnimalCanMove} from './hmk-trekking-animal-health.js';
import {animalTrekLoad,validateAnimalTrekLoadProof} from './hmk-trekking-animal-load.js';
const check=(v,msg)=>{if(!v)throw Error(msg);};
const int=n=>Number.isSafeInteger(n)&&n>=0;
const serious=w=>!w.healed&&['S','G'].includes(w.severity);
export function trekPartyModes({memberIds,guideId,characters=[],inventory=[],conveyance='foot',loadedByGM=false,allowCertifiedWeatherAccrual=false,drovingAnimals=[]}={}){
 check(Array.isArray(memberIds)&&memberIds.length&&memberIds.length===new Set(memberIds).size&&memberIds.every(x=>typeof x==='string'&&x),
  'Vyberte jedinečné účastníky hlídky.');
 check(memberIds.includes(guideId),'Průvodce musí být součástí skupiny.');
 check(['foot','mount','cart','wagon'].includes(conveyance),'Nepodporovaný způsob cesty.');
 // Animal ENC is never inferred from a folk inventory. Only explicitly
 // identified, measured droving animals can cancel Loaded in exchange for fatigue.
 check(Array.isArray(drovingAnimals),'Naložená zvířata musí být doložena jednotlivě.');
 const animalIds=new Set();
 const animals=drovingAnimals.map(a=>{
  check(a&&typeof a.id==='string'&&a.id.trim().length>0&&!animalIds.has(a.id)&&
   typeof a.droverId==='string'&&memberIds.includes(a.droverId),
   'Každé naložené zvíře potřebuje jedinečné jméno, doložené ENC a honáka ve skupině.');
  animalIds.add(a.id);
  check(!memberIds.includes(a.id),'Zvíře nesmí být zároveň vedeno jako pěší člen skupiny: '+a.id);
  const actor=characters.find(c=>c.id===a.id);
  const load=animalTrekLoad({animal:a,actor});
  const health=actor&&!actor.hmk?.livestockBreed?trekRegisteredAnimalHealth(actor):null;
  assertTrekAnimalCanMove(health);
  return {id:a.id,enc:load.enc,droverId:a.droverId,loaded:load.enc>=20,
   ...(load.encCalculation?{encCalculation:load.encCalculation}:{}),...(health?{health}:{})};
 });
 const members=memberIds.map(id=>{
  const actor=characters.find(c=>c.id===id);
  check(actor?.hmk?.combatState,'Postava není připravena: '+id);
  const fatigue=combatFatigueTotals(actor.hmk.combatState).total;
  const wounds=actor.hmk.combatState.wounds.filter(serious).map(w=>{
   const anatomy=hmkHumanLocationSymbols(w.location);
   check(anatomy,actor.name+': neznámá lokace závažné rány ('+w.location+'); nelze spolehlivě odvodit Injured Mode.');
   return {id:w.id,location:w.location,severity:w.severity,zone:anatomy.zone};
  });
  const injury=wounds.some(w=>['head','torso','legs'].includes(w.zone));
  const immobile=wounds.some(w=>w.severity==='G'&&['head','torso','legs'].includes(w.zone));
  const load=conveyance==='foot'?resolveCombatantLoad({character:actor,inventory}):null;
  // An incomplete inventory is UNKNOWN, not an automatically unloaded character.
  const enc=load?.encReady===true?load.modifiedENC:null;
  const minimum=load?.knownMinimumENC??null;
  const loaded=conveyance==='foot'&&(enc!==null?enc>=10:minimum!==null&&minimum>=10);
  return {id,name:actor.name,fatigue,injured:injury,immobile,seriousWounds:wounds,
   modifiedENC:enc,minimumENC:enc===null?minimum:null,loaded,loadUnresolved:conveyance==='foot'&&enc===null&&!loaded};
 });
 const tooTired=members.find(x=>x.fatigue>=40);
 // Only the ORIGINAL at-departure fatigue may disqualify a watch. A post-watch
 // weather outcome can cross 40 after the party already travelled. The caller
 // may suppress this check ONLY while verifying a saved party snapshot, which
 // must then prove every subsequent fatigue increment against Weather evidence.
 check(allowCertifiedWeatherAccrual||!tooTired||['cart','wagon'].includes(conveyance),
  tooTired?.name+': Fatigue ≥ 40 – nelze se samostatně přesouvat; vyžaduje převoz (HMK 145).');
 const immobile=members.find(x=>x.immobile);
 check(!immobile||['cart','wagon'].includes(conveyance),
  immobile?.name+': Grievous zranění hlavy, trupu nebo nohy vyžaduje převoz (HMK 145).');
 const unresolved=members.filter(x=>x.loadUnresolved);
 check(conveyance!=='foot'||!unresolved.length||loadedByGM===true,
  'Zatížení nelze bezpečně vypočítat ('+unresolved.map(x=>x.name).join(', ')+'). Doplňte STR/váhy inventáře nebo potvrďte Loaded Mode (konzervativní varianta).');
 check(!(loadedByGM===true&&!unresolved.length&&!members.some(x=>x.loaded)&&!animals.some(x=>x.loaded)&&!['mount','cart','wagon'].includes(conveyance)),
  'Všechny hodnoty ENC jsou doložené pod hranicí Loaded; ruční Loaded Mode nelze přidat bez pravidlového důvodu.');
 // Registered animals contribute their LIVE, separately recorded fatigue and injuries
 // to group Slow Modes. No trekking fatigue is generated for animals (HMK 150).
 const wearied=members.some(x=>x.fatigue>=20)||animals.some(a=>a.health?.fatigue>=20);
 const injured=members.some(x=>x.injured)||animals.some(a=>a.health?.injured);
 const loaded=members.some(x=>x.loaded)||animals.some(x=>x.loaded)||loadedByGM===true;
 // HMK p.122: oxen pulling a cart/wagon add ONE inherent Slow Mode.
 // Not assumed from an unidentified animal with only a legacy final ENC.
 const bovineSlow=['cart','wagon'].includes(conveyance)&&animals.some(a=>
  (a.encCalculation?.breed??a.health?.breed)==='bovine');
 const forcedSlow=Number(wearied)+Number(injured)+Number(bovineSlow);
 return {format:'hmk-trek-party-modes-v1',memberIds:[...memberIds].sort(),guideId,conveyance,animals,
  members,wearied,injured,loaded,bovineSlow,forcedSlow,manualLoaded:loadedByGM===true,
  loadUnresolved:unresolved.map(x=>x.id),sourcePages:[112,145,146,150,167,176,355]};
}
/** Verifies internal consistency of immutable party snapshots without comparing
 * later actor wounds, encumbrance or fatigue against an old time. */
export function validateTrekPartySnapshot(p){
 check(p?.format==='hmk-trek-party-modes-v1'&&Array.isArray(p.memberIds)&&Array.isArray(p.members)&&
  p.memberIds.length===p.members.length&&p.memberIds.length>0&&p.memberIds.includes(p.guideId)&&
  p.memberIds.every((id,i)=>typeof id==='string'&&id&&(i===0||p.memberIds[i-1]<id))&&
  new Set(p.members.map(m=>m.id)).size===p.members.length&&p.members.every(m=>p.memberIds.includes(m.id)&&int(m.fatigue)&&
  typeof m.injured==='boolean'&&typeof m.immobile==='boolean'&&typeof m.loaded==='boolean'&&
  (m.modifiedENC===null||int(m.modifiedENC))&&(m.minimumENC===null||int(m.minimumENC))&&typeof m.loadUnresolved==='boolean'&&
  Array.isArray(m.seriousWounds)&&m.seriousWounds.every(w=>typeof w.id==='string'&&w.id&&
   ['S','G'].includes(w.severity)&&hmkHumanLocationSymbols(w.location)?.zone===w.zone)),
 'Nekonzistentní doklad členství a stavu cestovní skupiny.');
 const animals=p.animals??[]; // Legacy v93.511 watches have no animal records.
 check(Array.isArray(animals)&&new Set(animals.map(a=>a.id)).size===animals.length&&
  animals.every(a=>a&&typeof a.id==='string'&&a.id&&int(a.enc)&&
   typeof a.droverId==='string'&&p.memberIds.includes(a.droverId)&&!p.memberIds.includes(a.id)&&
   a.loaded===(a.enc>=20)&&
   (a.encCalculation===undefined||validateAnimalTrekLoadProof(a.encCalculation,a.enc,a.health?.breed??a.encCalculation.breed))&&
   (a.health===undefined||validateTrekAnimalHealthProof(a.health,a.id))&&
   (!a.health||(a.health.fatigue<40&&!a.health.immobile&&!a.health.comaActive&&
    !a.health.extendedShockActive&&a.health.shock==='NONE'))),
  'Naložení jednotlivých zvířat neodpovídá doloženému ENC.');
 check(p.wearied===(p.members.some(m=>m.fatigue>=20)||animals.some(a=>a.health?.fatigue>=20))&&
  p.injured===(p.members.some(m=>m.injured)||animals.some(a=>a.health?.injured))&&
  // Missing bovineSlow belongs to pre-v93.562 immutable snapshots: preserve
  // their recorded travel evidence without silently retroactive penalties.
  (p.bovineSlow===undefined||(typeof p.bovineSlow==='boolean'&&p.bovineSlow===
    (['cart','wagon'].includes(p.conveyance)&&animals.some(a=>(a.encCalculation?.breed??a.health?.breed)==='bovine'))))&&
  p.forcedSlow===Number(p.wearied)+Number(p.injured)+Number(p.bovineSlow===true)&&
  p.members.every(m=>m.injured===m.seriousWounds.some(w=>['head','torso','legs'].includes(w.zone))&&
   m.immobile===m.seriousWounds.some(w=>w.severity==='G'&&['head','torso','legs'].includes(w.zone))&&
   m.loaded===(p.conveyance==='foot'&&(m.modifiedENC!==null?m.modifiedENC>=10:m.minimumENC!==null&&m.minimumENC>=10))&&
   m.loadUnresolved===(p.conveyance==='foot'&&m.modifiedENC===null&&!m.loaded))&&
  typeof p.manualLoaded==='boolean'&&p.loaded===(p.manualLoaded||p.members.some(m=>m.loaded)||animals.some(a=>a.loaded))&&
  !(p.conveyance!=='foot'&&p.members.some(m=>m.loaded))&&
  !(p.conveyance==='foot'&&p.manualLoaded&&!p.loadUnresolved.length&&!p.members.some(m=>m.loaded)&&!animals.some(a=>a.loaded))&&
  !(p.members.some(m=>m.immobile||m.fatigue>=40)&&!['cart','wagon'].includes(p.conveyance))&&
  JSON.stringify(p.loadUnresolved)===JSON.stringify(p.members.filter(m=>m.loadUnresolved).map(m=>m.id)),
  'Změněné doložené postihy skupiny.');
 return true;
}
