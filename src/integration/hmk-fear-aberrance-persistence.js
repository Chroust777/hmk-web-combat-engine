/** HMK v1.2 printed p.187: Fear/Aberrance, distinct from Morale p.162.
 * A GM enters EVERY physical die. Entire combat/initiative/trait debt/journal
 * is staged, then saved once with the existing verified full-record CAS writer.
 * This module never writes to a second storage key. */
import {successLevel,SL} from '../rules/tests.js';
import {fearResult,FEAR} from '../rules/fear.js';
import {validateCombatState} from './persistent-combat-state.js';
import {validateEncounterSequence,finalizeStagedEncounterTurn} from './encounter-turn-sequence.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
const valid=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const check=(x,m)=>{if(!x)throw Error('Fear/Aberrance: '+m)};
const copy=x=>structuredClone(x);
const str=x=>JSON.stringify(x);
const label={0:'CF',1:'F',2:'S',3:'CS'};
function witness(document,characterId){
 const actors=document?.characters?.filter(c=>c.id===characterId)||[];
 check(actors.length===1&&actors[0]?.hmk?.combatState,'neexistuje jednoznačná postava s bojovým stavem');
 const actor=actors[0],seq=validateEncounterSequence(document.combatRuntime?.sequence);
 check(seq.order.includes(characterId)&&Array.isArray(document.journal),'postava není v aktuální Initiative');
 validateCombatState(actor.hmk.combatState);
 const wil=actor.hmk?.attributes?.wil;
 check(valid(wil,1,40),'chybí ověřený atribut Will');
 return {actor,seq,wil};
}
function sourceABE(document,{sourceId,sourceKind,aberrance,sourceDescription,gmConfirmedSource}){
 check(typeof sourceId==='string'&&sourceId.length>=1&&sourceId.length<=140,'chybí identita zdroje');
 check(valid(aberrance,0,200),'chybí konkrétní doložená Aberrance (včetně 0)');
 check(gmConfirmedSource===true,'GM musí potvrdit vnímání a Aberrance zdroje');
 if(sourceKind==='character'){
  const source=document.characters.filter(x=>x.id===sourceId);
  check(source.length===1,'zdroj není jednoznačná živá postava');
  const fromSource=source[0].hmk?.attributes?.aberrance??source[0].hmk?.attributes?.abe;
  check(valid(fromSource,0,200)&&fromSource===aberrance,
   'Aberrance musí souhlasit se skutečně uloženou hodnotou zdrojové bytosti');
 }else{
  check(sourceKind==='gm-event'&&typeof sourceDescription==='string'&&
   sourceDescription.trim().length>=10&&sourceDescription.length<=500,
   'neznámý zdroj musí mít konkrétní GM popis události');
 }
 return aberrance;
}
export function projectFearExposure({document,characterId,sourceId,sourceKind,sourceDescription='',
 aberrance,d100,gmConfirmed=false,gmConfirmedSource=false,eventId}={}){
 check(gmConfirmed===true&&valid(d100,1,100)&&typeof eventId==='string'&&
  eventId.length>=3&&eventId.length<=140,'fyzický Will d100, ID a souhlas GM jsou povinné');
 const {actor,seq,wil}=witness(document,characterId),state=actor.hmk.combatState;
 check(!['INC','UNC','KIA'].includes(state.shock)&&state.morale?.state!=='catatonic',
  'postava nyní nemůže vědomě vnímat nový zdroj');
 check(!state.fear||['steady','brave'].includes(state.fear.state),
  'další současný zdroj Fear vyžaduje zvláštní společné vyhodnocení');
 check(!state.events.some(e=>e.id===eventId)&&!document.journal.some(j=>j.id==='fear:'+eventId)&&
  !seq.log.some(e=>e.eventId===eventId),'opakovaná událost');
 const abe=sourceABE(document,{sourceId,sourceKind,aberrance,sourceDescription,gmConfirmedSource});
 const known=state.events.some(e=>e.type==='hmk-fear-exposure'&&
  e.details?.sourceId===sourceId&&e.details?.timelineId===seq.timelineId);
 check(!known,'postava již tento zdroj překonala; nový zdroj musí mít nové skutečné ID');
 const base=wil*5,eml=base-abe*5+(state.fear?.state===FEAR.BRAVE?20:0),sl=successLevel(d100,eml);
 const result=fearResult({sl,roll:d100,aberrance:abe});
 const earned=result.psycheStress;
 check(!earned||(!actor.hmk.arcane?.pendingPsycheTraitChoice&&
  !(actor.hmk.arcane?.psycheTraumas??[]).some(t=>t.manifestationPending===true)),
  'před dalším Fear Stresem dokončete již čekající volbu/nástup Psyche Traitu');
 const out=copy(document),person=out.characters.find(c=>c.id===characterId),s=person.hmk.combatState;
 const details={source:'HMK v1.2 p.187',sourceId,sourceKind,
  sourceDescription:sourceKind==='gm-event'?sourceDescription.trim():null,
  timelineId:seq.timelineId,characterId,willAttribute:wil,willEML:base,
  aberrance:abe,finalEML:eml,physicalD100:d100,successLevel:label[sl],resultState:result.state,
  psycheStress:earned,gmConfirmed:true,gmConfirmedSource:true};
 s.fear={state:result.state,sourceId,sourceKind,sourceEventId:eventId,
  sourceABE:abe,timelineId:seq.timelineId,createdRound:seq.round,
  lastReactionRound:null,
  ...(result.state===FEAR.BRAVE?{braveExpiresAtRound:seq.round+60}:{}),
  ...(result.state===FEAR.AFRAID?{safeRecoveryMinutes:1}:{}),
  ...(result.state===FEAR.TERRIFIED?{safeRecoveryMinutes:10}:{})};
 s.morale.psycheStress+=earned;
 if(earned){person.hmk.arcane??={};person.hmk.arcane.pendingPsycheTraitChoice={sourceEventId:eventId,levels:earned};}
 s.events.push({id:eventId,type:'hmk-fear-exposure',round:seq.round,details});
 s.lastRound=Math.max(s.lastRound,seq.round);
 out.combatRuntime.sequence.log.push({type:'fear-exposure',eventId,actorId:characterId,
  round:seq.round,sourceId,resultState:result.state});
 out.journal.push({id:'fear:'+eventId,characterId,createdAt:new Date().toISOString(),
  title:'Fear / Aberrance · '+label[sl],body:`GM Will d100 ${d100}, Fear ${result.state}, PSY +${earned}`,
  combatProof:{actionKind:'fear-exposure',sourceEventId:eventId,...copy(details),
   physicalDice:[{faces:100,value:d100,source:'GM-entered-physical-die'}]}});
 validateCombatState(s);validateEncounterSequence(out.combatRuntime.sequence);
 return {document:out,details};
}
/** A single final CAS, no implicit auto-roll and no partial fear/psyche write. */
export function persistFearExposure(args={}){
 const {document,storage,key,baseline}=args;
 const projected=projectFearExposure(args),serialized=str(projected.document);
 const r=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...r,document:r.ok?projected.document:null,serialized:r.ok?serialized:null,
  result:r.ok?projected.details:null};
}
/** p.187: frightened states may fade without a new die, but only after the GM
 * confirms the specified safety, LOS and elapsed minutes. Catatonic has NO
 * such bypass: it needs its physically rolled end-of-next-turn Will test. */
export function persistFearSafeRecovery({document,characterId,eventId,elapsedMinutes,
 safeFromSource=false,outOfLOS=false,gmConfirmed=false,storage,key,baseline}={}){
 check(gmConfirmed===true&&typeof eventId==='string'&&eventId.length>=3&&
  valid(elapsedMinutes,0,999999),'GM musí doložit čas a nové ID');
 const {actor,seq}=witness(document,characterId),s=actor.hmk.combatState,old=s.fear;
 check(old&&old.timelineId===seq.timelineId,'není aktivní doložený Fear tohoto střetnutí');
 check(!s.events.some(e=>e.id===eventId)&&!document.journal.some(j=>j.id==='fear:'+eventId),
  'duplicitní zotavení');
 const needed=old.state===FEAR.AFRAID?1:old.state===FEAR.TERRIFIED?10:
  old.state===FEAR.BRAVE?5:null;
 check(needed!==null,'Catatonic/Steady nelze ukončit pouhým potvrzením bezpečí');
 check(elapsedMinutes>=needed&&(old.state===FEAR.BRAVE||safeFromSource===true)&&
  (old.state!==FEAR.AFRAID||outOfLOS===true),
  'neuplynula pravidlová doba / chybí bezpečí či ztráta LOS');
 // A live Initiative turn, commitment or due event cannot be skipped by
 // asserting minutes of elapsed time. No fictitious calendar progress.
 check(!seq.active&&!seq.pendingEndTurnAction&&!seq.interruptActiveId&&
  !Object.values(seq.commitments??{}).some(t=>t?.status==='in-progress'),
  'časový postup nelze potvrdit uprostřed tahu nebo koncentrace');
 const out=copy(document),p=out.characters.find(x=>x.id===characterId),state=p.hmk.combatState;
 state.fear={...old,state:FEAR.STEADY,lastSafeRecoveryEventId:eventId};
 const details={sourceEventId:old.sourceEventId,sourceId:old.sourceId,
  beforeState:old.state,afterState:FEAR.STEADY,elapsedMinutes,safeFromSource:!!safeFromSource,
  outOfLOS:!!outOfLOS,gmConfirmed:true,timelineId:seq.timelineId};
 state.events.push({id:eventId,type:'hmk-fear-safe-recovery',round:seq.round,details});
 state.lastRound=Math.max(state.lastRound,seq.round);
 out.combatRuntime.sequence.log.push({type:'fear-safe-recovery',actorId:characterId,round:seq.round,eventId,sourceEventId:old.sourceEventId,afterState:'steady'});
 out.journal.push({id:'fear:'+eventId,characterId,createdAt:new Date().toISOString(),
  title:'Fear – GM potvrdil bezpečné zotavení',body:`${old.state} → steady po ${elapsedMinutes} min.`,
  combatProof:{actionKind:'fear-safe-recovery',...details,originalFearEventId:old.sourceEventId,sourceEventId:eventId}});
 validateCombatState(state);
 const serialized=str(out),r=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...r,document:r.ok?out:null,serialized:r.ok?serialized:null};
}
/** p.187: physically witnessed Will at end of the affected turn. It can
 * resolve ONLY a previously staged, executed action; the caller then closes
 * that action through finalizeStagedEncounterTurn in the SAME checkpoint. */
export function persistFearEndTurnReaction({document,characterId,eventId,d100,gmConfirmed=false,
 storage,key,baseline}={}){
 check(gmConfirmed===true&&valid(d100,1,100)&&typeof eventId==='string'&&
  eventId.length>=3&&eventId.length<=140,'konec tahu vyžaduje GM fyzický Will d100');
 const {actor,seq,wil}=witness(document,characterId),s=actor.hmk.combatState;
 const f=s.fear;
 check(f&&['afraid','catatonic'].includes(f.state)&&f.timelineId===seq.timelineId&&
  f.lastReactionRound!==seq.round,'není splatný Fear Reaction');
 check(seq.active===true&&seq.order[seq.cursor]===characterId&&
  seq.pendingEndTurnAction?.actorId===characterId&&
  seq.pendingEndTurnAction.pendingEffects?.includes('fear-end-turn-reaction')&&
  seq.log.some(e=>e.type==='turn-action-resolved-before-fear-reaction'&&
   e.actorId===characterId&&e.round===seq.round),
  'Fear Will lze hodit až po skutečně vykonané akci a odloženém konci tahu');
 check(!s.events.some(e=>e.id===eventId)&&!document.journal.some(j=>j.id==='fear:'+eventId),
  'fyzický hod nelze potvrdit dvakrát');
 const eml=wil*5-5*f.sourceABE,sl=successLevel(d100,eml);
 const after=(sl===SL.S||sl===SL.CS)?
  (f.state===FEAR.CATATONIC?FEAR.TERRIFIED:FEAR.STEADY):f.state;
 const out=copy(document),person=out.characters.find(c=>c.id===characterId),state=person.hmk.combatState;
 state.fear={...f,state:after,lastReactionRound:seq.round};
 const details={sourceEventId:f.sourceEventId,sourceId:f.sourceId,timelineId:seq.timelineId,
  beforeState:f.state,afterState:after,willAttribute:wil,aberrance:f.sourceABE,
  finalEML:eml,physicalD100:d100,successLevel:label[sl],gmConfirmed:true};
 state.events.push({id:eventId,type:'hmk-fear-end-turn-reaction',round:seq.round,details});
 out.combatRuntime.sequence.log.push({type:'fear-end-turn-reaction',actorId:characterId,
  round:seq.round,eventId,sourceEventId:f.sourceEventId,physicalD100:d100,afterState:after});
 out.journal.push({id:'fear:'+eventId,characterId,createdAt:new Date().toISOString(),
  title:'Fear – fyzický Will po tahu',body:`Will d100 ${d100}: ${f.state} → ${after}`,
  combatProof:{actionKind:'fear-end-turn-reaction',...details,
   sourceEventId:eventId,originalFearEventId:f.sourceEventId,
   physicalDice:[{faces:100,value:d100,source:'GM-entered-physical-die'}]}});
 validateCombatState(state);
 const states=Object.fromEntries(out.characters.map(c=>[c.id,c.hmk?.combatState]));
 // End-of-turn closure belongs to the SAME transaction as the physical die.
 // If another end-turn obligation remains, the scheduler correctly refuses
 // closure; that other obligation will be collected by its own guided path.
 try {out.combatRuntime.sequence=finalizeStagedEncounterTurn(out.combatRuntime.sequence,states)}
 catch(error){
  const due=out.combatRuntime.sequence.pendingEndTurnAction?.pendingEffects??[];
  check(due.some(effect=>effect!=='fear-end-turn-reaction'),
   'nevyřešený konec tahu nelze potvrdit: '+error.message);
 }
 const serialized=str(out),r=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...r,document:r.ok?out:null,serialized:r.ok?serialized:null};
}
