/** HMK Kethira v1.2 p.189 (and p.188): physical d6-day Psyche Stress
 * Recovery scheduling, followed by physical Will d100 after the interval.
 * Strictly a follow-up to documented, manifested spell/aural psyche trauma.
 * Never rolls dice, advances the game clock or writes outside the existing
 * full-document, verified combat checkpoint.
 */
import {successLevel,SL} from '../rules/tests.js';
import {psycheRecoverySchedule,psycheStressRecovery} from '../rules/mental-trauma.js';
import {validateCombatState} from './persistent-combat-state.js';
import {validateEncounterSequence} from './encounter-turn-sequence.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
const cp=structuredClone,js=JSON.stringify;
const check=(v,m)=>{if(!v)throw Error(m)};
const whole=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const intensity=['trait','impulse','disorder'];
const slNames=['CF','F','S','CS'];
function checkEvidence(document,person,trait){
 const a=person.hmk?.arcane,s=validateCombatState(person.hmk?.combatState);
 check(a&&!a.pendingPsycheTraitChoice,'Psyche Recovery: nejprve dokončete výběr Psyche Traitu');
 check(Array.isArray(a.psycheTraumas)&&a.psycheTraumas.filter(t=>t?.trait===trait&&t.recovered!==true).length===1,
  'Psyche Recovery: chybí jediná aktivní doložená instance stejného traitu');
 const t=a.psycheTraumas.find(t=>t.trait===trait&&t.recovered!==true);
 check(!t.psycheExpressionActive,'Psyche Recovery: nejprve dokončete právě probíhající projev Impulse/Disorder');
 check(whole(t.psycheLevels,1,99999)&&intensity.includes(t.intensity)&&
  typeof t.permanent==='boolean'&&t.manifested===true&&t.manifestationPending===false&&
  Array.isArray(t.sourceEventIds)&&t.sourceEventIds.length>0&&
  new Set(t.sourceEventIds).size===t.sourceEventIds.length,
  'Psyche Recovery: trauma není projevené nebo má neplatný stav');
 check(t.sourceEventIds.every(id=>typeof id==='string'&&id.length>0&&
  document.journal?.some(j=>j.combatProof?.actionKind==='spell-psyche-trait-choice'&&
   j.combatProof?.sourceEventId===id&&j.characterId===person.id&&j.combatProof?.trait===trait)),
  'Psyche Recovery: nedoložené zdrojové volby Traitu');
 check(document.journal?.some(j=>j.characterId===person.id&&
  j.combatProof?.actionKind==='psyche-trait-manifestation'&&
  j.combatProof.trait===trait&&
  t.sourceEventIds.some(id=>j.combatProof.causedBy?.includes(id))),
  'Psyche Recovery: chybí autoritativní potvrzení desetiminutového nástupu');
 const activeCases=a.psycheTraumas.filter(z=>z?.recovered!==true);
 check(activeCases.every(z=>whole(z.psycheLevels,1,99999)&&
  z.manifested===true&&z.manifestationPending===false),
  'Psyche Recovery: nejdříve dokončete všechny neprojevené stresy');
 const totalPsy=activeCases.reduce((n,z)=>n+z.psycheLevels,0);
 check(whole(s.morale.psycheStress,totalPsy,99999)&&
  whole(s.fatigue.otherWeakness,totalPsy*5,99999),
  'Psyche Recovery: neodpovídající globální PSY / Weakness');
 const seq=validateEncounterSequence(document?.combatRuntime?.sequence);
 check(!seq.active&&!seq.pendingEndTurnAction&&!seq.interruptActiveId&&
  (seq.cursor===0||seq.cursor===seq.order.length)&&
  !Object.values(seq.commitments??{}).some(q=>q?.status==='in-progress'),
  'Psyche Recovery: nelze přeskočit živý Initiative, koncentraci ani povinnosti');
 const wil=person.hmk?.attributes?.wil;
 check(whole(wil,1,40),'Psyche Recovery: chybí ověřený Will attribute');
 check(typeof t.recoverySchedulePending==='boolean',
  'Psyche Recovery: chybí původní pending interval');
 const plan=t.psycheRecoveryPlan??null;
 const last=t.psycheRecoveryLastRollDay??null;
 check(last===null||whole(last,1,999999),'Psyche Recovery: poškozený poslední den');
 if(t.recoverySchedulePending){
  check(plan===null,'Psyche Recovery: nelze plánovat další interval přes nevyřízený d6');
 }else{
  check(plan&&whole(plan.intervalD6,1,6)&&whole(plan.startGameDay,1,999999)&&
   whole(plan.dueGameDay,1,999999)&&plan.dueGameDay===plan.startGameDay+plan.intervalD6&&
   typeof plan.scheduleEventId==='string'&&plan.scheduleEventId.length>0,
   'Psyche Recovery: chybí doložený naplánovaný d6 interval');
  check(s.events.some(e=>e.type==='hmk-psyche-recovery-schedule'&&e.id===plan.scheduleEventId&&
    e.details?.characterId===person.id&&e.details?.trait===trait&&
    e.details?.dueGameDay===plan.dueGameDay&&e.details?.physicalD6===plan.intervalD6)&&
   document.journal?.some(j=>j.characterId===person.id&&
    j.combatProof?.actionKind==='psyche-recovery-schedule'&&
    j.combatProof?.sourceEventId===plan.scheduleEventId&&
    j.combatProof?.dueGameDay===plan.dueGameDay),
   'Psyche Recovery: neodpovídá fyzický d6 a uložený důkaz');
  check(last===null||plan.startGameDay===last,'Psyche Recovery: nesouvislý interval po posledním Will testu');
 }
 return {a,s,t,seq,willEML:wil*5,last,plan};
}
function candidate(document,characterId,trait){
 const people=document?.characters?.filter(c=>c?.id===characterId)??[];
 check(people.length===1,'Psyche Recovery: chybí jednoznačná postava');
 return {person:people[0],...checkEvidence(document,people[0],trait)};
}
export function availableSpellPsycheRecoveries(document){
 return (document?.characters??[]).flatMap(c=>(c.hmk?.arcane?.psycheTraumas??[]).flatMap(t=>{
  if(t.recovered===true)return [];
  try{const x=candidate(document,c.id,t.trait);return [{characterId:c.id,name:c.name||c.id,
   trait:t.trait,levels:t.psycheLevels,intensity:t.intensity,permanent:t.permanent,
   schedulePending:t.recoverySchedulePending,plan:x.plan,lastGameDay:x.last,willEML:x.willEML}]}catch{return []}
 }));
}
function ensureWriteArgs({gmConfirmed,eventId,document,characterId,trait}){
 check(gmConfirmed===true&&typeof eventId==='string'&&eventId.length>=3&&eventId.length<=140&&
  typeof characterId==='string'&&typeof trait==='string'&&document&&Array.isArray(document.journal),
  'Psyche Recovery: fyzický doklad, ID a souhlas GM jsou povinné');
}
function checkedEvent(s,document,eventId){
 check(!s.events.some(e=>e.id===eventId)&&!document.journal.some(e=>
  ['psyche-recovery-schedule:'+eventId,'psyche-recovery-roll:'+eventId].includes(e.id)),
  'Psyche Recovery: opakovaný důkaz');
}
/** GM enters a physical d6, the beginning game-day witness and confirms it.
 * This alone never heals PSY and never marks a Will test as completed. */
export function persistSpellPsycheRecoverySchedule({document,characterId,trait,eventId,
 periodStartDay,d6,gmConfirmed=false,gmConfirmedStartDay=false,storage,key,baseline}={}){
 ensureWriteArgs({gmConfirmed,eventId,document,characterId,trait});
 check(gmConfirmedStartDay===true&&whole(periodStartDay,1,999999)&&whole(d6,1,6),
  'Psyche Recovery: fyzický d6 a potvrzený počáteční herní den jsou povinné');
 const {s,t,seq,last}=candidate(document,characterId,trait);
 check(t.recoverySchedulePending===true,'Psyche Recovery: d6 již byl naplánován');
 check(last===null||last===periodStartDay,
  'Psyche Recovery: další interval začíná dnem předchozího fyzického Will testu');
 psycheRecoverySchedule(d6);
 check(periodStartDay+d6<=999999,'Psyche Recovery: interval překračuje evidovaný herní kalendář');
 checkedEvent(s,document,eventId);
 const dueGameDay=periodStartDay+d6,next=cp(document),person=next.characters.find(c=>c.id===characterId);
 const item=person.hmk.arcane.psycheTraumas.find(z=>z.trait===trait&&z.recovered!==true);
 item.psycheRecoveryPlan={intervalD6:d6,startGameDay:periodStartDay,dueGameDay,scheduleEventId:eventId};
 item.recoverySchedulePending=false;
 const d={characterId,trait,sourceEventIds:cp(t.sourceEventIds),
  physicalD6:d6,startGameDay:periodStartDay,dueGameDay,gmConfirmedStartDay:true};
 person.hmk.combatState.events.push({id:eventId,round:seq.round,
  type:'hmk-psyche-recovery-schedule',details:cp(d)});
 person.hmk.combatState.lastRound=Math.max(seq.round,s.lastRound);
 validateCombatState(person.hmk.combatState);
 next.journal.push({id:'psyche-recovery-schedule:'+eventId,characterId,createdAt:new Date().toISOString(),
  title:`HMK Psyche Recovery · ${trait} · d6=${d6}`,
  body:`GM fyzicky hodil d6 ${d6}. Interval dne ${periodStartDay} → ${dueGameDay}. PSY zatím beze změny.`,
  combatProof:{actionKind:'psyche-recovery-schedule',sourceEventId:eventId,...cp(d),
   physicalDice:[{faces:6,value:d6,source:'GM-entered-physical-die'}]}});
 const serialized=js(next),r=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...r,document:r.ok?next:null,serialized:r.ok?serialized:null};
}
/** Physical GM Will d100 after the due d6-day period. The next d6 must be
 * separately physically rolled and committed after any unresolved PSY. */
export function persistSpellPsycheRecoveryRoll({document,characterId,trait,eventId,
 gameDay,d100,gmConfirmed=false,gmConfirmedIntervalElapsed=false,storage,key,baseline}={}){
 ensureWriteArgs({gmConfirmed,eventId,document,characterId,trait});
 check(gmConfirmedIntervalElapsed===true&&whole(gameDay,1,999999)&&whole(d100,1,100),
  'Psyche Recovery: potvrďte skutečně uplynulý d6 interval a fyzický Will d100');
 const {s,t,seq,plan,willEML}=candidate(document,characterId,trait);
 check(!t.recoverySchedulePending&&plan&&gameDay>=plan.dueGameDay,
  'Psyche Recovery: interval d6 dnů ještě neuplynul nebo nebyl fyzicky doložen');
 checkedEvent(s,document,eventId);
 const sl=successLevel(d100,willEML),outcome=psycheStressRecovery({
  psycheLevels:t.psycheLevels,intensity:t.intensity,permanent:t.permanent,sl});
 const removed=t.psycheLevels-outcome.psycheLevels;
 check(whole(removed,0,2)&&s.morale.psycheStress>=removed&&
  s.fatigue.otherWeakness>=removed*5,
  'Psyche Recovery: nekonzistentní ztráta PSY nebo příslušné Weakness');
 const next=cp(document),person=next.characters.find(c=>c.id===characterId),arc=person.hmk.arcane;
 const item=arc.psycheTraumas.find(z=>z.trait===trait&&z.recovered!==true),state=person.hmk.combatState;
 item.psycheLevels=outcome.psycheLevels;
 item.intensity=outcome.intensity;
 item.permanent=outcome.permanent;
 item.recovered=outcome.recovered;
 item.recoverySchedulePending=!outcome.recovered;
 item.psycheRecoveryLastRollDay=gameDay;
 item.psycheRecoveryPlan=null;
 // A permanent trait survives PSY0 without any associated weakness.
 // An indefinite trait is archived, but no longer active once recovered.
 if(outcome.recovered&&!outcome.permanent)item.inactive=true;
 state.morale.psycheStress-=removed;
 state.fatigue.otherWeakness-=removed*5;
 // Distortion/Confusion warping ceases only after its own PSY has recovered.
 if(outcome.recovered&&arc.activeMisfireWarp&&
  item.sourceEventIds.includes(arc.activeMisfireWarp.sourceEventId)&&
  !arc.psycheTraumas.some(z=>!z.recovered&&
   z.sourceEventIds?.includes(arc.activeMisfireWarp.sourceEventId))){
  arc.activeMisfireWarp=null;
 }
 const details={characterId,trait,sourceScheduleEventId:plan.scheduleEventId,
  sourceEventIds:cp(t.sourceEventIds),gameDay,dueGameDay:plan.dueGameDay,
  willAttribute:willEML/5,willEML,physicalD100:d100,successLevel:slNames[sl],
  beforePsyche:t.psycheLevels,afterPsyche:outcome.psycheLevels,
  weaknessRemoved:removed*5,beforeIntensity:t.intensity,afterIntensity:outcome.intensity,
  beforePermanent:t.permanent,afterPermanent:outcome.permanent,
  recovered:outcome.recovered,gmConfirmedIntervalElapsed:true};
 state.events.push({id:eventId,round:seq.round,type:'hmk-psyche-recovery-roll',details:cp(details)});
 state.lastRound=Math.max(seq.round,s.lastRound);
 validateCombatState(state);
 next.journal.push({id:'psyche-recovery-roll:'+eventId,characterId,createdAt:new Date().toISOString(),
  title:`HMK Psyche Recovery · ${trait} · ${slNames[sl]}`,
  body:`Will d100 ${d100} vs EML ${willEML}: ${slNames[sl]}; PSY ${t.psycheLevels} → ${outcome.psycheLevels}, Weakness −${removed*5}. ${outcome.permanent?'Permanentní trait trvá.':outcome.recovered?'Neurčitý trait zanikl.':'Další fyzický d6 interval je povinný.'}`,
  combatProof:{actionKind:'psyche-recovery-roll',sourceEventId:eventId,...cp(details),
   physicalDice:[{faces:100,value:d100,source:'GM-entered-physical-die'}]}});
 const serialized=js(next),r=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...r,document:r.ok?next:null,serialized:r.ok?serialized:null};
}
