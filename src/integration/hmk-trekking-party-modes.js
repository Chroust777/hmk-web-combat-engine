/** HMK Kèthîra pp.145–146: deterministic disadvantages of a trekking party.
 * Facts are snapshotted at watch preparation; later changes to actor state
 * must not silently rewrite that historical watch. No GM-entered 'fatigue'
 * or invented unknown load. Non-folk conveyance ENC still needs GM evidence.
 */
import {hmkHumanLocationSymbols} from './injury-special-hmk.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {combatFatigueTotals} from './persistent-combat-state.js';
const check=(v,msg)=>{if(!v)throw Error(msg);};
const int=n=>Number.isSafeInteger(n)&&n>=0;
const serious=w=>!w.healed&&['S','G'].includes(w.severity);
export function trekPartyModes({memberIds,guideId,characters=[],inventory=[],conveyance='foot',loadedByGM=false,allowCertifiedWeatherAccrual=false}={}){
 check(Array.isArray(memberIds)&&memberIds.length&&memberIds.length===new Set(memberIds).size&&memberIds.every(x=>typeof x==='string'&&x),
  'Vyberte jedinečné účastníky hlídky.');
 check(memberIds.includes(guideId),'Průvodce musí být součástí skupiny.');
 check(['foot','mount','cart','wagon'].includes(conveyance),'Nepodporovaný způsob cesty.');
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
 check(!(conveyance==='foot'&&loadedByGM===true&&!unresolved.length&&!members.some(x=>x.loaded)),
  'Všechny hodnoty ENC jsou doložené pod hranicí Loaded; ruční Loaded Mode nelze přidat bez pravidlového důvodu.');
 const wearied=members.some(x=>x.fatigue>=20),injured=members.some(x=>x.injured);
 const loaded=conveyance==='foot'?(members.some(x=>x.loaded)||loadedByGM===true):loadedByGM===true;
 const forcedSlow=Number(wearied)+Number(injured);
 return {format:'hmk-trek-party-modes-v1',memberIds:[...memberIds].sort(),guideId,conveyance,
  members,wearied,injured,loaded,forcedSlow,manualLoaded:loadedByGM===true,
  loadUnresolved:unresolved.map(x=>x.id),sourcePages:[112,145,146,167]};
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
 check(p.wearied===p.members.some(m=>m.fatigue>=20)&&p.injured===p.members.some(m=>m.injured)&&
  p.forcedSlow===Number(p.wearied)+Number(p.injured)&&
  p.members.every(m=>m.injured===m.seriousWounds.some(w=>['head','torso','legs'].includes(w.zone))&&
   m.immobile===m.seriousWounds.some(w=>w.severity==='G'&&['head','torso','legs'].includes(w.zone))&&
   m.loaded===(p.conveyance==='foot'&&(m.modifiedENC!==null?m.modifiedENC>=10:m.minimumENC!==null&&m.minimumENC>=10))&&
   m.loadUnresolved===(p.conveyance==='foot'&&m.modifiedENC===null&&!m.loaded))&&
  typeof p.manualLoaded==='boolean'&&p.loaded===(p.manualLoaded||p.members.some(m=>m.loaded))&&
  !(p.conveyance!=='foot'&&p.members.some(m=>m.loaded))&&
  !(p.conveyance==='foot'&&p.manualLoaded&&!p.loadUnresolved.length&&!p.members.some(m=>m.loaded))&&
  !(p.members.some(m=>m.immobile||m.fatigue>=40)&&!['cart','wagon'].includes(p.conveyance))&&
  JSON.stringify(p.loadUnresolved)===JSON.stringify(p.members.filter(m=>m.loadUnresolved).map(m=>m.id)),
  'Změněné doložené postihy skupiny.');
 return true;
}
