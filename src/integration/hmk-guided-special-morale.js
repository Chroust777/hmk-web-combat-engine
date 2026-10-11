/** HMK Roleplaying in the World of Kèthîra, printed p.162.
 * Special Morale is NOT a fixed list of automatically detected events. The
 * referee supplies a concrete incident, who became aware of it, and any
 * necessary discretionary ruling. Each affected combatant rolls Initiative
 * separately. Pure proposals; caller commits all character states and the
 * initiative log in one existing combat transaction.
 */
import {validateEncounterSequence} from './encounter-turn-sequence.js';
import {validateCombatState,combatFatigueTotals} from './persistent-combat-state.js';
import {hmkMoraleTransition} from './injury-special-hmk.js';
const good=(v,m)=>{if(!v)throw Error(m)};
const whole=(v,min=0,max=9999)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const cp=v=>structuredClone(v);
export const SPECIAL_MORALE_KINDS={
 'leader-vanquished':'Velitel byl vyřazen',
 'greatly-outnumbered':'Výrazná početní převaha protivníka',
 'disarmed-against-armed':'Beze zbraně proti ozbrojeným nepřátelům',
 'battlefield-event':'Významná událost v bitvě',
 'other-gm-ruling':'Jiný konkrétní GM spouštěč'
};
function participantMap(sequence,participants){
 const seq=validateEncounterSequence(sequence);
 good(Array.isArray(participants)&&participants.length===seq.order.length,'Special Morale: chybí úplný roster');
 const map=new Map();
 for(const p of participants){
  good(p?.character?.id&&seq.order.includes(p.character.id)&&!map.has(p.character.id),'Special Morale: cizí či duplicitní účastník');
  validateCombatState(p.state);map.set(p.character.id,p);
 }
 return {seq,map};
}
const awarenessAllowed=s=>s.shock!=='KIA'&&!['INC','UNC'].includes(s.shock)&&s.morale?.state!=='catatonic';
function incidentKey(timelineId,kind,incidentRef){return JSON.stringify([timelineId,kind,incidentRef.trim()]);}
function oneInitiativeML(character){
 const list=(character?.hmk?.skills??[]).filter(x=>String(x.name??x.key??'').trim().toLowerCase()==='initiative');
 good(list.length===1&&whole(list[0].ml,0,200),'Special Morale: chybí jednoznačný Initiative ML');
 return list[0].ml;
}
/** Declare one observed incident, not its success level. Repeated independent
 * incidents are permitted but the same incident cannot be declared twice.
 * The confirmed observer list is explicit; missing awareness is NOT yes. */
export function registerSpecialMorale({sequence,participants,observerIds,kind,incidentRef,description,
 facts={},eventId,gmConfirmed=false}={}){
 const {seq,map}=participantMap(sequence,participants);
 good(gmConfirmed===true,'Special Morale: nutné potvrdit skutečnou událost a vědomí účastníků');
 good(Object.hasOwn(SPECIAL_MORALE_KINDS,kind),'Special Morale: neznámý druh spouštěče');
 good(typeof incidentRef==='string'&&incidentRef.trim().length>=2&&incidentRef.trim().length<=120,
  'Special Morale: potřebuje identifikátor konkrétní události, ne nový náhodný identifikátor každého hodu');
 good(typeof description==='string'&&description.trim().length>=5&&description.trim().length<=500,
  'Special Morale: je nutný konkrétní popis GM situace');
 good(typeof eventId==='string'&&eventId.length>0,'Special Morale: chybí ID zápisu');
 good(Array.isArray(observerIds)&&observerIds.length>0&&new Set(observerIds).size===observerIds.length&&
  observerIds.every(id=>typeof id==='string'&&map.has(id)),'Special Morale: neplatní pozorovatelé');
 good(facts&&typeof facts==='object'&&!Array.isArray(facts),'Special Morale: fakta musí být výslovně doložená');
 if(kind==='leader-vanquished'){
  good(typeof facts.leaderId==='string'&&map.has(facts.leaderId),'Special Morale: určete skutečného vyřazeného velitele');
  const leader=map.get(facts.leaderId).state;
  const mechanical=['INC','UNC','KIA'].includes(leader.shock)||['catatonic','routed','withdrawing'].includes(leader.morale?.state);
  good(mechanical||(facts.gmFunctionalVanquished===true&&typeof facts.gmRuling==='string'&&facts.gmRuling.trim().length>=5),
   'Special Morale: vyřazení velitele musí být doložené stavem nebo výslovným GM posouzením');
 }
 if(kind==='greatly-outnumbered'){
  good(whole(facts.armedEnemies,1,1000)&&whole(facts.alliesAbleToFight,0,1000)&&facts.gmGreatlyOutnumbered===true,
   'Special Morale: určete skutečné počty a doložte GM posouzení výrazné přesily');
 }
 if(kind==='disarmed-against-armed')good(facts.disarmed===true&&facts.armedOpposition===true,
  'Special Morale: potvrďte ztrátu zbraně a ozbrojené protivníky');
 const key=incidentKey(seq.timelineId,kind,incidentRef),states={};
 for(const id of observerIds){
  const p=map.get(id);good(awarenessAllowed(p.state),'Special Morale: bezvládný či nevnímající účastník nemohl potvrdit povšimnutí');
  oneInitiativeML(p.character);
  good(!(p.state.morale.specialPending??[]).some(t=>t.incidentKey===key)&&
   !p.state.events.some(e=>e.details?.specialIncidentKey===key),
   'Special Morale: tento konkrétní spouštěč již byl zapsán');
  const s=cp(p.state);s.morale.specialPending??=[];
  good(s.morale.specialPending.length<100,'Special Morale: nevyřešených spouštěčů je příliš mnoho');
  s.morale.specialPending.push({id:`${eventId}:${id}`,sourceEventId:eventId,incidentKey:key,kind,
   description:description.trim(),incidentRef:incidentRef.trim(),facts:cp(facts),timelineId:seq.timelineId,round:seq.round});
  s.lastRound=Math.max(s.lastRound,seq.round);validateCombatState(s);states[id]=s;
 }
 const next=cp(seq);next.log.push({round:seq.round,type:'special-morale-declared',eventId,observerIds:cp(observerIds),kind,incidentKey:key});
 return {states,sequence:next,incidentKey:key,affectedIds:cp(observerIds),kind,description:description.trim()};
}
export function dueSpecialMorale(state,timelineId){
 validateCombatState(state);
 const pending=state.morale?.specialPending??[];
 if(!pending.length)return null;
 const first=pending[0];
 good(first.timelineId===timelineId,'Special Morale: událost patří do jiné časové osy');
 return first;
}
/** Exactly one physical Initiative d100 per currently due trigger. Multiple
 * special triggers remain queued for successive mandatory tests. */
export function resolveSpecialMorale({sequence,character,state,roll,aberrance,eventId}={}){
 const seq=validateEncounterSequence(sequence);validateCombatState(state);
 const id=character?.id;
 good(seq.order.includes(id)&&typeof eventId==='string'&&eventId&&!state.events.some(e=>e.id===eventId),
  'Special Morale: neplatná postava, událost či duplicitní zápis');
 good(whole(roll,1,100)&&whole(aberrance,0,200),'Special Morale: skutečný d100 a doložená Aberrance (i nula) jsou povinné');
 good(awarenessAllowed(state),'Special Morale: postava nyní není schopna vnímat spouštěč');
 const incident=dueSpecialMorale(state,seq.timelineId);
 good(incident,'Special Morale: není splatný žádný doložený spouštěč');
 const ml=oneInitiativeML(character),fatigue=combatFatigueTotals(state).total;
 const r=hmkMoraleTransition({initiativeML:ml,fatigue,aberrance,brave:state.morale.state==='brave',
  roll,current:state.morale.state});
 const result=cp(state);result.morale.specialPending.shift();result.morale.state=r.state;
 result.morale.psycheStress+=r.result.psycheStress;
 if(r.result.state==='brave'&&r.state==='brave'){
  result.morale.braveSince=seq.round;result.morale.braveTimelineId=seq.timelineId;
 }
 result.lastRound=Math.max(result.lastRound,seq.round);
 result.events.push({id:eventId,type:'special-morale-resolution',round:seq.round,details:{
  source:'HMK p.162',sourceEventId:incident.sourceEventId,specialIncidentKey:incident.incidentKey,
  triggerKind:incident.kind,reason:incident.description,incidentRef:incident.incidentRef,
  facts:cp(incident.facts),initiativeML:ml,fatigue,aberrance,rawEML:r.rawEML,sl:r.slName,
  resultState:r.result.state,finalState:r.state,psycheStress:r.result.psycheStress,
  physicalDice:{format:'hmk-manual-dice-proof-v1',source:'HMK p.162 Special Morale',
   rolls:[{id:'specialMoraleD100',faces:100,value:roll,actorId:id,source:'GM-entered-physical-die'}]}}});
 validateCombatState(result);
 const next=cp(seq);next.log.push({round:seq.round,type:'special-morale-resolution',actorId:id,eventId,
  sourceEventId:incident.sourceEventId,incidentKey:incident.incidentKey});
 return {state:result,sequence:next,event:result.events.at(-1),result:r};
}
