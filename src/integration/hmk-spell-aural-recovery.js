/** HMK Kethira v1.2, p.190: aural shock recovery after one verified game day.
 * A single physical GM Will d100, no fatigue or impairment penalty.
 * CF adds PSY1 with a mandatory separate trait choice; S/CS reduce Aural Shock
 * by 1/2 and its own weakness by 5/10. Does not elapse time automatically.
 * Never directly writes storage: uses the shared full-document CAS checkpoint.
 * Supports verified spell-origin or witnessed Shaman Trance CF Aural Shock.
 * Undated or uncommitted sources remain fail-closed.
 */
import {successLevel,SL} from '../rules/tests.js';
import {auralShockRecovery} from '../rules/mental-trauma.js';
import {validateCombatState} from './persistent-combat-state.js';
import {validateEncounterSequence} from './encounter-turn-sequence.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
const cp=structuredClone,js=JSON.stringify;
const check=(x,m)=>{if(!x)throw Error(m)};
const whole=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const resultName={0:'CF',1:'F',2:'S',3:'CS'};
function validateCandidate(document,characterId){
 const person=document?.characters?.find(c=>c.id===characterId);
 check(person&&document.characters.filter(c=>c.id===characterId).length===1,
  'Aural Recovery: postava není jednoznačně doložena');
 const shamanOrigin=person.hmk?.combatState?.events?.some(e=>e.type==='hmk-shaman-talisman-aural'&&whole(e.details?.auralShock,1,6));
 // Shamanic bestowals take place outside combat; unlike spell-origin recovery,
 // an explicit active encounter is not a prerequisite for one-game-day recovery.
 const seq=document?.combatRuntime?.sequence?validateEncounterSequence(document.combatRuntime.sequence):
  {active:false,round:Math.max(1,person.hmk.combatState?.lastRound||1),pendingEndTurnAction:null,interruptActiveId:null};
 check(seq.active!==true&&!seq.pendingEndTurnAction&&!seq.interruptActiveId,
  'Aural Recovery: nedokončené Initiative, povinnosti nebo přerušení');
 const state=validateCombatState(person.hmk?.combatState),arc=person.hmk?.arcane;
 check(state.shock!=='KIA','Aural Recovery: zemřelá postava nemůže provádět Will Roll');
 check(arc&&whole(arc.auralShockLevels,1,99)&&
  whole(state.fatigue.otherWeakness,5*arc.auralShockLevels,99999),
  'Aural Recovery: neplatné úrovně či současná Aural Weakness');
 check(!arc.pendingPsycheTraitChoice&&!arc.activeMisfireWarp&&
  !arc.astralState&&!arc.spiritState&&!arc.possessed,
  'Aural Recovery: nevyřešené mentální povinnosti / spirit-astral souběh');
 // We only resolve cases with a committed spell-origin causal event.
 check(state.events.some(e=>['hmk-spell-misfire','hmk-spell-total-release','hmk-shaman-talisman-aural','hmk-astral-transcendence-aural','hmk-alchemy-dissolution-aural','hmk-alchemy-physic-aural','hmk-alchemy-erudition-aural','hmk-alchemy-profusion-aural'].includes(e.type)&&
  whole(e.details?.auralShock,1,6)),
  'Aural Recovery: není doložen původ Aural Shock ze Spellfire ani Shaman Trance CF');
 const wil=person.hmk?.attributes?.wil;
 check(whole(wil,1,40),'Aural Recovery: chybí skutečný Will attribute');
 const earlier=state.events.filter(e=>e.type==='hmk-aural-shock-recovery');
 const previous=arc.auralRecoveryLastDay??null;
 check((previous===null&&earlier.length===0)||
  (whole(previous,1,999999)&&earlier.length>0&&
   earlier.at(-1)?.details?.gameDay===previous),
  'Aural Recovery: nesoulad historické denní evidence');
 return {person,seq,state,arc,willEML:wil*5,previous};
}
/** Eligible actors are displayed as suggestions; the exported commit revalidates all. */
export function availableSpellAuralRecoveries(document){
 return (document?.characters??[]).flatMap(c=>{
  try{const p=validateCandidate(document,c.id);return [{characterId:c.id,name:c.name||c.id,
   levels:p.arc.auralShockLevels,willEML:p.willEML,lastGameDay:p.previous}]}catch{return []}
 });
}
export function persistSpellAuralRecovery({document,characterId,eventId,gameDay,
 d100,diceOrigin='manual',gmConfirmed=false,gmConfirmedDayElapsed=false,storage,key,baseline}={}){
 check(gmConfirmed===true&&gmConfirmedDayElapsed===true&&whole(gameDay,1,999999)&&
  whole(d100,1,100)&&typeof eventId==='string'&&eventId.length>=3&&eventId.length<=140,
  'Aural Recovery vyžaduje fyzický d100, den a dvě výslovná potvrzení GM');
 check(['manual','software'].includes(diceOrigin),'Neplatný původ hodu');
 const {seq,state,arc,willEML,previous}=validateCandidate(document,characterId);
 check(previous===null||gameDay>previous,
  'Aural Recovery: pouze jeden fyzický Will test za herní den');
 check(!state.events.some(e=>e.id===eventId)&&
  !(document.journal??[]).some(j=>j.id==='aural-recovery:'+eventId),
  'Aural Recovery: pokus opakovat stejný důkaz');
 const sl=successLevel(d100,willEML),outcome=auralShockRecovery({levels:arc.auralShockLevels,sl});
 const delta=arc.auralShockLevels-outcome.levels;
 check(delta>=0&&delta<=2&&state.fatigue.otherWeakness>=delta*5,
  'Aural Recovery: neověřitelná změna Aural Weakness');
 check(state.morale?.psycheStress+outcome.psycheStressGained<=99999,
  'Aural Recovery: překročen limit PSY');
 const next=cp(document),caster=next.characters.find(c=>c.id===characterId);
 const a=caster.hmk.arcane,s=caster.hmk.combatState;
 a.auralShockLevels=outcome.levels;
 a.auralRecoveryLastDay=gameDay;
 s.fatigue.otherWeakness-=delta*5;
 if(outcome.psycheStressGained){
  s.morale.psycheStress+=outcome.psycheStressGained;
  a.pendingPsycheTraitChoice={sourceEventId:eventId,levels:outcome.psycheStressGained};
 }
 const details={source:'verified-spell-shaman-or-astral-origin-aural-shock',gameDay,willAttribute:willEML/5,
  willEML,physicalD100:d100,successLevel:resultName[sl],before:arc.auralShockLevels,
  after:outcome.levels,auralWeaknessRemoved:delta*5,
  psycheStressGained:outcome.psycheStressGained,psycheTraitChoicePending:!!outcome.psycheStressGained,
  gmConfirmedDayElapsed:true};
 s.events.push({id:eventId,round:seq.round,type:'hmk-aural-shock-recovery',details:cp(details)});
 s.lastRound=Math.max(s.lastRound,seq.round);
 validateCombatState(s);
 next.journal.push({id:'aural-recovery:'+eventId,characterId,createdAt:new Date().toISOString(),campaignMinute:document.campaignClock?.minute??null,
  title:`HMK Aural Shock Recovery · den ${gameDay}`,body:`Will d100 (${diceOrigin}) ${d100}: ${resultName[sl]}; Aural ${details.before} → ${outcome.levels}, Aural Weakness -${delta*5}${outcome.psycheStressGained?'; PSY +1 a povinná volba traitu':''}.`,
  combatProof:{actionKind:'aural-shock-recovery',sourceEventId:eventId,
   ...cp(details),physicalDice:[{faces:100,value:d100,source:diceOrigin==='software'?'cryptographic-software-die':'GM-entered-physical-die'}]}});
 const serialized=js(next);
 const verified=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...verified,document:verified.ok?next:null,serialized:verified.ok?serialized:null};
}
