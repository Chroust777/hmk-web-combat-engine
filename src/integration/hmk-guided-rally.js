/** HMK World of Kèthîra, pp.62 and 162 – Rally is Command (Initiative).
 * The parenthetical Initiative is a REQUIRED secondary mastery modifier,
 * not an alternative primary skill and not a second die. No random rolls.
 * A result is proposed over all eligible allies and only persisted by the
 * caller's single atomic combat transaction. */
import {successLevel,SL} from '../rules/tests.js';
import {rallyResult} from '../rules/morale.js';
import {combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {validateEncounterSequence,currentEncounterActor,encounterFreeActionAvailable,recordEncounterFreeAction} from './encounter-turn-sequence.js';
const check=(v,msg)=>{if(!v)throw Error(msg)};
const whole=(v,a=0,b=200)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const copy=v=>structuredClone(v);
function oneML(person,name){
 const found=(person?.hmk?.skills??[]).filter(s=>String(s.name??s.key??'').trim().toLowerCase()===name);
 check(found.length===1&&whole(found[0].ml),`Rally potřebuje jedinou doloženou dovednost ${name} (${person?.name??'?'})`);
 return found[0].ml;
}
export function rallyInitiativeSecondaryModifier(initiativeML){
 check(whole(initiativeML,0,200),'Rally potřebuje Initiative ML pro Secondary Modifier');
 return (Math.floor(initiativeML/10)-5)*5; // printed p.62: index 0 -> -25, index 7 -> +10
}
function turnToken(seq,leaderId){return `${seq.timelineId}:${seq.round}:${seq.cursor}:${leaderId}`;}
export function guidedRallyReadiness({leader,participants,sequence,assessments}={}){
 const seq=validateEncounterSequence(sequence);
 check(seq.active&&!seq.interruptActiveId,'Rally lze použít jen na začátku vlastního aktivního tahu');
 const leaderId=currentEncounterActor(seq);
 check(leader?.id===leaderId,'Rally musí použít právě jednající velitel');
 const roster=new Set(seq.order);
 check(Array.isArray(participants)&&participants.length===roster.size&&
  participants.every(p=>roster.has(p.character?.id))&&new Set(participants.map(p=>p.character.id)).size===roster.size,
  'Rally vyžaduje skutečný úplný seznam účastníků střetnutí');
 for(const p of participants)validateCombatState(p.state);
 const commander=participants.find(p=>p.character.id===leader.id).state;
 check(commander.shock==='NONE'&&!commander.coma?.active&&
  ['steady','brave'].includes(commander.morale?.state??'steady'),
  'Rally nemůže vést bezvládný, mrtvý, prchající nebo ustupující velitel');
 check(encounterFreeActionAvailable(seq,leaderId),
  'Rally vyžaduje dosud nespotřebovanou volnou akci na začátku vlastního IR');
 check(seq.log.at(-1)?.type==='turn-start'&&seq.log.at(-1)?.actorId===leaderId&&
  seq.log.at(-1)?.round===seq.round,'Rally lze použít pouze bezprostředně na začátku vlastního tahu');
 const token=turnToken(seq,leaderId);
 check(!seq.log.some(e=>e.type==='rally'&&e.token===token),'Rally už v tomto tahu proběhl');
 const commandML=oneML(leader,'command'),initiativeML=oneML(leader,'initiative');
 const secondary=rallyInitiativeSecondaryModifier(initiativeML),fatigue=combatFatigueTotals(commander).total;
 const eligible=participants.filter(p=>p.character.id!==leader.id&&
  ['routed','withdrawing'].includes(p.state.morale?.state));
 check(Array.isArray(assessments)&&assessments.length===eligible.length&&
  new Set(assessments.map(a=>a.id)).size===assessments.length&&
  assessments.every(a=>eligible.some(p=>p.character.id===a.id)),
  'Rally vyžaduje doložené vyhodnocení každého Routed/Withdrawing účastníka');
 const matched=[];const awarenessDice=[];
 for(const a of assessments){
  check(typeof a.allied==='boolean','Rally: u každého účastníka musí být doloženo spojenectví');
  if(!a.allied)continue;
  check(typeof a.leaderAware==='boolean','Rally: velitel musí skutečně vědět o spojenci');
  if(!a.leaderAware)continue;
  check(typeof a.earshot==='boolean'&&typeof a.understands==='boolean',
   'Rally: je nutné doložit doslech i porozumění velitelovu příkazu');
  if(!a.earshot||!a.understands)continue;
  const p=eligible.find(x=>x.character.id===a.id);
  const lock=p.state.morale?.rallyLockout;
  if(lock){
   if(lock.timelineId===seq.timelineId){if(seq.round<lock.untilRound)continue;}
   else {
    check(whole(a.elapsedLockoutMinutes,lock.durationMinutes,100000),
     'Rally: zákaz reakce z předchozího střetnutí vyžaduje doložený uplynulý čas');
   }
  }
  check(typeof a.perceptionCertain==='boolean',
   'Rally: jistý doslech nebo pochybnost o vnímání musí být doložena');
  if(!a.perceptionCertain){
   check(whole(a.awarenessRoll,1,100),'Nejisté vnímání Rally vyžaduje skutečný Awareness d100');
   const awarenessML=oneML(p.character,'awareness');
   const eml=awarenessML-combatFatigueTotals(p.state).total;
   awarenessDice.push({id:'rallyAwareness:'+a.id,faces:100,value:a.awarenessRoll,
    actorId:a.id,eml,source:'GM-entered-physical-die'});
   if(successLevel(a.awarenessRoll,eml)<SL.S)continue;
  }
  matched.push(p.character.id);
 }
 check(matched.length>0,'Rally: není doložen žádný způsobilý spojenec v doslechu');
 return {leaderId,round:seq.round,timelineId:seq.timelineId,token,commandML,initiativeML,
  secondary,fatigue,rawEML:commandML+secondary-fatigue,matched,awarenessDice,
  assessed:copy(assessments),sequenceSignature:JSON.stringify(seq),
  statesSignature:JSON.stringify(participants.map(p=>[p.character.id,p.state]))};
}
export function resolveGuidedRally({context,roll,participants,sequence,eventId}={}){
 check(context?.leaderId&&context?.token&&whole(roll,1,100)&&typeof eventId==='string'&&eventId,
  'Rally vyžaduje připravenou posloupnost, ID a jediný fyzický Command d100');
 const seq=validateEncounterSequence(sequence);
 check(JSON.stringify(seq)===context.sequenceSignature,'Rally: Initiative byla během hodu změněna');
 check(JSON.stringify(participants.map(p=>[p.character.id,p.state]))===context.statesSignature,
  'Rally: stav některého účastníka se během hodu změnil');
 const sl=successLevel(roll,context.rawEML),outcome=rallyResult(sl);
 const name=Object.keys(SL).find(k=>SL[k]===sl);
 const resultingStates={};const effects=[];
 for(const id of context.matched){
  const p=participants.find(x=>x.character.id===id),state=copy(p.state);
  check(state&&!state.events.some(e=>e.id===eventId),'Rally: duplicitní událost');
  const morale=state.morale??{state:'steady',psycheStress:0,braveSince:null,braveTimelineId:null};
  const previous=morale.state;
  if(outcome.lockoutMinutes){
   morale.rallyLockout={timelineId:context.timelineId,originRound:context.round,
    durationMinutes:outcome.lockoutMinutes,untilRound:context.round+outcome.lockoutMinutes*12};
  }else if(outcome.reactionAtEndNextTurn){
   morale.rallyPending={sourceEventId:eventId,timelineId:context.timelineId,
    lastReactionRound:null,required:true};
  }else if(outcome.steadyImmediately){
   morale.state='steady';morale.rallyPending=null;morale.rallyLockout=null;
  }
  state.morale=morale;
  state.events.push({id:eventId,type:'rally-target',round:context.round,
   details:{leaderId:context.leaderId,previous,after:morale.state,sl:name,
    lockoutMinutes:outcome.lockoutMinutes??null,pending:!!outcome.reactionAtEndNextTurn}});
  state.lastRound=context.round;validateCombatState(state);
  resultingStates[id]=state;effects.push({targetId:id,previous,after:morale.state});
 }
 const next=recordEncounterFreeAction(seq,{actorId:context.leaderId,kind:'rally'});
 next.log.push({type:'rally',round:next.round,actorId:context.leaderId,token:context.token,
  eventId,sl:name,matched:copy(context.matched)});
 const dice=[...context.awarenessDice,{id:'rallyCommandD100',faces:100,value:roll,
  actorId:context.leaderId,eml:context.rawEML,source:'GM-entered-physical-die'}];
 return {sequence:validateEncounterSequence(next),states:resultingStates,sl:name,outcome,
  event:{id:eventId,type:'rally',round:context.round,
   details:{commander:context.leaderId,targets:effects,commandML:context.commandML,
    initiativeML:context.initiativeML,secondary:context.secondary,fatigue:context.fatigue,
    eml:context.rawEML,roll,sl:name,physicalDice:{format:'hmk-manual-dice-proof-v1',
    source:'HMK pp.62,162',rolls:dice},assessed:copy(context.assessed)}}};
}
/** A successful (S) Rally induces a physical Initiative Reaction at the end
 * of the ally's next and, if failed, each subsequent turn (HMK p.162).
 * The live scheduler calls this once per actual active turn. */
export function resolveGuidedRallyReaction({state,character,sequence,roll,eventId}={}){
 validateCombatState(state);const seq=validateEncounterSequence(sequence);
 const id=currentEncounterActor(seq),pending=state.morale?.rallyPending;
 check(seq.active&&!['INC','UNC','KIA'].includes(state.shock)&&id===character?.id&&pending?.required===true&&
  pending.timelineId===seq.timelineId,'Žádný splatný Rally Reaction na konci vlastního tahu');
 check(pending.lastReactionRound!==seq.round,'Rally Reaction byl v tomto tahu již vyhodnocen');
 check(whole(roll,1,100)&&typeof eventId==='string'&&eventId,'Rally Reaction vyžaduje skutečný Initiative d100');
 check(!state.events.some(x=>x.id===eventId),'Duplicitní Rally Reaction');
 const ml=oneML(character,'initiative'),fatigue=combatFatigueTotals(state).total;
 const rawEML=ml-fatigue,sl=successLevel(roll,rawEML),success=sl>=SL.S;
 const n=copy(state),before=n.morale.state;
 if(success){n.morale.state='steady';n.morale.rallyPending=null;}
 else n.morale.rallyPending.lastReactionRound=seq.round;
 n.events.push({id:eventId,type:'rally-reaction',round:seq.round,
  details:{before,after:n.morale.state,sourceEventId:pending.sourceEventId,
   initiativeML:ml,fatigue,eml:rawEML,roll,sl:Object.keys(SL).find(k=>SL[k]===sl),
   physicalDice:[{id:'rallyReactionD100',faces:100,value:roll,actorId:id,source:'GM-entered-physical-die'}]}});
 n.lastRound=seq.round;validateCombatState(n);
 return {state:n,event:n.events.at(-1),success};
}
