/** HMK v1.2 p.188: triggered Impulse/Disorder expression and suppression.
 * A physical Will d100 is required only when the character tries to suppress
 * expression. A CF requires an additional physical d6, for d6 x 10 minutes
 * AFTER the GM-observed trigger ends. Other expression lasts ~10 minutes.
 * This module never invents a roll, advances time, or writes except through
 * the existing verified full-document CAS checkpoint.
 */
import {SL,successLevel} from '../rules/tests.js';
import {psycheSuppressionRequired,psycheExpressionDuration} from '../rules/mental-trauma.js';
import {validateCombatState,combatFatigueTotals} from './persistent-combat-state.js';
import {validateEncounterSequence} from './encounter-turn-sequence.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
const cp=structuredClone,js=JSON.stringify;
const check=(x,m)=>{if(!x)throw Error(m)};
const whole=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const slNames=['CF','F','S','CS'];
function checked(document,characterId,trait){
 const people=document?.characters?.filter(c=>c?.id===characterId)??[];
 check(people.length===1,'Psyche Expression: chybí jednoznačná postava');
 const person=people[0],arc=person.hmk?.arcane;
 const state=validateCombatState(person.hmk?.combatState);
 const seq=validateEncounterSequence(document?.combatRuntime?.sequence);
 check(arc&&!arc.pendingPsycheTraitChoice,'Psyche Expression: nejprve povinná volba traitu');
 const hits=(arc.psycheTraumas??[]).filter(t=>t?.trait===trait&&
  (t.recovered!==true||t.permanent===true));
 check(hits.length===1,'Psyche Expression: chybí právě jeden aktivní nebo permanentní trait');
 const t=hits[0];
 check(['impulse','disorder'].includes(t.intensity)&&t.manifested===true&&
  t.manifestationPending===false&&whole(t.psycheLevels,t.recovered===true?0:1,99999)&&
  typeof t.permanent==='boolean'&&(t.recovered!==true||t.permanent===true&&t.psycheLevels===0),
  'Psyche Expression: chybí projevený Impulse/Disorder');
 check(Array.isArray(t.sourceEventIds)&&t.sourceEventIds.length>0&&
  new Set(t.sourceEventIds).size===t.sourceEventIds.length&&
  t.sourceEventIds.every(id=>document.journal?.some(j=>j.characterId===characterId&&
   j.combatProof?.actionKind==='spell-psyche-trait-choice'&&
   j.combatProof.sourceEventId===id&&j.combatProof.trait===trait)),
  'Psyche Expression: chybí původní fyzický důkaz získání traitu');
 check((t.recovered===true||state.morale.psycheStress>=t.psycheLevels&&
  state.fatigue.otherWeakness>=t.psycheLevels*5),
  'Psyche Expression: neodpovídající PSY a již vzniklá Weakness');
 check(document.journal?.some(j=>j.characterId===characterId&&
  j.combatProof?.actionKind==='psyche-trait-manifestation'&&
  j.combatProof.trait===trait&&t.sourceEventIds.some(id=>j.combatProof.causedBy?.includes(id))),
  'Psyche Expression: chybí uložený nástup traitu');
 check(!seq.pendingEndTurnAction&&!seq.interruptActiveId,
  'Psyche Expression: není možné přeskočit nevyřešený fyzický test nebo přerušení');
 check(whole(person.hmk?.attributes?.wil,1,40),
  'Psyche Expression: chybí skutečný Will');
 check(t.psycheExpressionActive===undefined||t.psycheExpressionActive===null||
  (t.psycheExpressionActive.status==='expressing'&&
   typeof t.psycheExpressionActive.sourceEventId==='string'&&
   whole(t.psycheExpressionActive.minutesAfterTrigger,10,60)),
  'Psyche Expression: poškozený nebo podvržený předchozí projev');
 return {person,arc,state,t,seq};
}
export function availableSpellPsycheExpressions(document){
 return (document?.characters??[]).flatMap(c=>(c.hmk?.arcane?.psycheTraumas??[]).flatMap(t=>{
  try{const x=checked(document,c.id,t.trait);return [{characterId:c.id,name:c.name||c.id,
   trait:t.trait,intensity:x.t.intensity,permanent:x.t.permanent,
   expressing:!!x.t.psycheExpressionActive,minutesAfterTrigger:x.t.psycheExpressionActive?.minutesAfterTrigger??null}]}catch{return []}
 }));
}
function shared({document,characterId,trait,eventId,gmConfirmed,storage,key,baseline}){
 check(gmConfirmed===true&&typeof eventId==='string'&&eventId.length>=3&&eventId.length<=140,
  'Psyche Expression: výslovné rozhodnutí GM a jedinečný ID důkazu jsou nutné');
 const x=checked(document,characterId,trait);
 check(!x.state.events.some(e=>e.id===eventId)&&
  !document.journal?.some(j=>j.id==='psyche-expression:'+eventId||j.id==='psyche-expression-end:'+eventId),
  'Psyche Expression: duplicitní událost');
 return x;
}
/** One completed physical transcript, committed atomically. `mode=voluntary`
 * expresses a trait without any Will test. `mode=suppress` tests Will,
 * including all currently recorded fatigue (unlike Recovery, p.189).
 */
export function persistSpellPsycheExpression({document,characterId,trait,eventId,
 triggerDescription,mode,d100=null,d6=null,gmConfirmed=false,
 gmConfirmedNoOtherModifiers=false,storage,key,baseline}={}){
 const {person,state,t,seq}=shared({document,characterId,trait,eventId,gmConfirmed,storage,key,baseline});
 check(!['INC','UNC','KIA'].includes(state.shock)&&!state.coma?.active&&state.morale?.state!=='catatonic',
  'Psyche Expression: bezvědomá nebo bezvládná postava nemůže volit potlačení či dobrovolný projev');
 check(!t.psycheExpressionActive,'Psyche Expression: před dalším spouštěčem uzavřete dosud trvající projev');
 check(typeof triggerDescription==='string'&&triggerDescription.trim().length>=5&&
  triggerDescription.trim().length<=500,'Psyche Expression: GM musí uvést skutečný spouštěč');
 check(['voluntary','suppress'].includes(mode),'Psyche Expression: potvrďte dobrovolné projevení nebo fyzický Will test');
 if(mode==='suppress')check(gmConfirmedNoOtherModifiers===true,'Psyche Expression: GM musí potvrdit, že vedle evidované Fatigue nejsou žádné nevyřešené modifikátory Will');
 let rawEML=null,sl=null,suppressed=false,minutesAfterTrigger=10;
 if(mode==='voluntary'){
  check(d100===null&&d6===null,'Psyche Expression: při dobrovolném projevu žádný hod nevzniká');
 }else{
  check(whole(d100,1,100),'Psyche Expression: skutečný fyzický Will d100 je povinný');
  rawEML=person.hmk.attributes.wil*5-combatFatigueTotals(state).total;
  sl=successLevel(d100,rawEML);
  suppressed=sl>=psycheSuppressionRequired(t.intensity);
  const duration=psycheExpressionDuration({intensity:t.intensity,suppressionSL:sl,d6});
  check(!duration.pending,'Psyche Expression: Will CF vyžaduje ještě skutečný fyzický d6');
  if(sl!==SL.CF)check(d6===null,'Psyche Expression: bez Will CF nesmí vzniknout hod d6');
  minutesAfterTrigger=duration.minutesAfterTrigger;
 }
 const next=cp(document),c=next.characters.find(x=>x.id===characterId),case0=c.hmk.arcane.psycheTraumas.find(x=>x.trait===trait&&
  (x.recovered!==true||x.permanent===true));
 const details={trait,intensity:t.intensity,permanent:t.permanent,trigger:triggerDescription.trim(),
  mode,physicalWillD100:d100,willRawEML:rawEML,willSL:sl===null?null:slNames[sl],
  physicalDurationD6:d6,suppressed,expressing:!suppressed,
  minutesAfterTrigger:suppressed?0:minutesAfterTrigger,gmConfirmed:true,
  sourceTraitEventIds:cp(t.sourceEventIds)};
 if(!suppressed)case0.psycheExpressionActive={status:'expressing',sourceEventId:eventId,
  minutesAfterTrigger,trigger:details.trigger,round:seq.round,timelineId:seq.timelineId};
 c.hmk.combatState.events.push({id:eventId,type:'hmk-psyche-expression',round:seq.round,details:cp(details)});
 c.hmk.combatState.lastRound=Math.max(c.hmk.combatState.lastRound,seq.round);
 validateCombatState(c.hmk.combatState);
 const physicalDice=mode==='suppress'?[{faces:100,value:d100,source:'GM-entered-physical-die'},
  ...(sl===SL.CF?[{faces:6,value:d6,source:'GM-entered-physical-die'}]:[])]:[];
 next.journal.push({id:'psyche-expression:'+eventId,characterId,createdAt:new Date().toISOString(),
  title:`HMK Psyche · ${trait} · ${suppressed?'potlačeno':'projev'}`,
  body:`Spouštěč: ${details.trigger}. ${mode==='voluntary'?'Dobrovolný projev.':`Will ${d100} proti EML ${rawEML} (${details.willSL}).`} ${suppressed?'Potlačeno.':`Trvá po dobu spouštěče a cca ${minutesAfterTrigger} minut po jeho konci.`}`,
  combatProof:{actionKind:'psyche-expression',sourceEventId:eventId,...cp(details),physicalDice}});
 const serialized=js(next),r=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...r,document:r.ok?next:null,serialized:r.ok?serialized:null};
}
/** Closing an expression never guesses elapsed time. The GM confirms the
 * actual trigger has ended and the whole required interval has passed. */
export function persistSpellPsycheExpressionEnd({document,characterId,trait,eventId,
 elapsedMinutes,gmConfirmed=false,gmConfirmedTriggerEnded=false,
 storage,key,baseline}={}){
 const {t,seq}=shared({document,characterId,trait,eventId,gmConfirmed,storage,key,baseline});
 const active=t.psycheExpressionActive;
 check(active?.status==='expressing'&&gmConfirmedTriggerEnded===true&&
  whole(elapsedMinutes,10,100000)&&elapsedMinutes>=active.minutesAfterTrigger,
  'Psyche Expression: nejprve potvrďte skončení spouštěče a uplynutí celé doby projevu');
 check(document.journal?.some(j=>j.characterId===characterId&&
  j.combatProof?.actionKind==='psyche-expression'&&
  j.combatProof?.sourceEventId===active.sourceEventId&&j.combatProof.expressing===true&&
  j.combatProof.minutesAfterTrigger===active.minutesAfterTrigger),
  'Psyche Expression: chybí ověřený příčinný projev');
 const next=cp(document),c=next.characters.find(x=>x.id===characterId),case0=c.hmk.arcane.psycheTraumas.find(x=>x.trait===trait&&
  (x.recovered!==true||x.permanent===true));
 case0.psycheExpressionActive=null;
 const details={trait,sourceEventId:active.sourceEventId,minutesAfterTrigger:active.minutesAfterTrigger,
  elapsedMinutes,gmConfirmedTriggerEnded:true,sourceTraitEventIds:cp(t.sourceEventIds)};
 c.hmk.combatState.events.push({id:eventId,type:'hmk-psyche-expression-end',round:seq.round,details:cp(details)});
 c.hmk.combatState.lastRound=Math.max(c.hmk.combatState.lastRound,seq.round);
 validateCombatState(c.hmk.combatState);
 next.journal.push({id:'psyche-expression-end:'+eventId,characterId,createdAt:new Date().toISOString(),
  title:`HMK Psyche · konec projevu ${trait}`,
  body:`GM potvrdil konec spouštěče a dalších ${elapsedMinutes} minut (minimum ${active.minutesAfterTrigger}).`,
  combatProof:{actionKind:'psyche-expression-end',sourceEventId:eventId,...cp(details)}});
 const serialized=js(next),r=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...r,document:r.ok?next:null,serialized:r.ok?serialized:null};
}
