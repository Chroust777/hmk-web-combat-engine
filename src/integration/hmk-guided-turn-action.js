/**
 * HârnMaster: Roleplaying in the World of Kèthîra, pp.158–162.
 * Guided NON-strike actions with no artificial rolls or GM legality checkbox.
 * The character/player chooses a legal action.  The authoritative initiative
 * scheduler, not this adapter, makes the decision and records its time cost.
 *
 * Travel distance, threatening zones and spell durations cannot be inferred
 * from the current character model, so Move/Evade/Charge/Incant are NOT
 * claimed supported by this adapter. They need independent world-state data.
 */
import {guidedTurnChoices} from './hmk-guided-turn-choices.js';
import {finishEncounterTurn,validateEncounterSequence,currentEncounterActor} from './encounter-turn-sequence.js';
const assert=(ok,message)=>{if(!ok)throw Error(message)};
const clone=structuredClone;
const stamp=x=>JSON.stringify(x);
const safe=['pass','ready','concentrate-start','concentrate-hold','concentrate-abandon','incapacitated'];
export function createGuidedTurnAction({id,sequence,states}={}){
 assert(typeof id==='string'&&id,'Chybí jednoznačné ID hráčské volby');
 const s=validateEncounterSequence(sequence);
 assert(states&&typeof states==='object','Chybí stav účastníků');
 const choices=guidedTurnChoices(s,states);
 assert(choices.kind==='player-choice','Tento tah ještě nemá povolenou hráčskou volbu');
 const offered=choices.choices.filter(x=>safe.includes(x));
 assert(offered.length,'Žádnou z těchto akcí nelze právě bezpečně vykonat');
 return {format:'hmk-guided-turn-action-v1',id,actorId:currentEncounterActor(s),round:s.round,
  timelineId:s.timelineId,sequenceWitness:stamp(s),statesWitness:stamp(states),
  choices:offered,phase:'choose-action',action:null,readiedAction:null,durationRounds:null};
}
export function guidedTurnRequirement(s){
 assert(s?.format==='hmk-guided-turn-action-v1','Neplatná posloupnost hráčské akce');
 if(s.phase==='choose-action')return {kind:'choice',id:'turn-action',choices:s.choices.map(x=>({value:x,label:({pass:'Pass',ready:'Ready (Attack / Grope / Move)',
  'concentrate-start':'Začít vícekolovou akci','concentrate-hold':'Pokračovat v soustředění',
  'concentrate-abandon':'Opustit soustředění',incapacitated:'Bez akce – neschopný účastník'})[x]}))};
 if(s.phase==='choose-ready')return {kind:'choice',id:'ready-action',choices:[
  {value:'attack',label:'Připravit Attack'},{value:'grope',label:'Připravit Grope'},{value:'move',label:'Připravit Move (nejvýše half)'}]};
 if(s.phase==='duration')return {kind:'input',id:'durationRounds',label:'Počet celých kol soustředění (1–9999)',min:1,max:9999};
 return {kind:'complete',id:'turn-choice-ready'};
}
export function chooseGuidedTurnAction(s,value){
 const req=guidedTurnRequirement(s);
 assert(req.kind==='choice'&&req.choices.some(x=>x.value===value),'Tato akce není podle aktuálního HMK tahu povolena');
 if(s.phase==='choose-action')return {...s,action:value,phase:value==='ready'?'choose-ready':value==='concentrate-start'?'duration':'ready'};
 return {...s,readiedAction:value,phase:'ready'};
}
export function enterGuidedTurnDuration(s,value){
 assert(s?.phase==='duration','Délka se zadává jen při začátku soustředění');
 const str=String(value??'');assert(/^\d+$/.test(str),'Délka musí být celé číslo kol');
 const n=Number(str);assert(Number.isSafeInteger(n)&&n>=1&&n<=9999,'Neplatný počet kol');
 return {...s,durationRounds:n,phase:'ready'};
}
export function completeGuidedTurnAction({session,sequence,states}={}){
 const s=session;assert(s?.format==='hmk-guided-turn-action-v1'&&s.phase==='ready','Volba není dokončená');
 assert(stamp(validateEncounterSequence(sequence))===s.sequenceWitness&&stamp(states)===s.statesWitness,
  'Stav střetnutí se během volby změnil; rozhodnutí musí být opakováno');
 assert(s.actorId===currentEncounterActor(sequence),'Jedná jiná postava');
 const decision=guidedTurnChoices(sequence,states);
 assert(decision.kind==='player-choice'&&decision.choices.includes(s.action),'Akce již není povolena');
 const next=finishEncounterTurn(sequence,states,{action:s.action,
  readiedAction:s.readiedAction,durationRounds:s.durationRounds,gmConfirmed:true});
 const last=next.log.at(-1);assert(last.type==='turn-complete'&&last.actorId===s.actorId,'Nezapsané ukončení tahu');
 return {sequence:next,actorId:s.actorId,round:s.round,action:s.action,
  readiedAction:s.readiedAction,durationRounds:s.durationRounds,
  proof:{format:'hmk-guided-player-choice-v1',id:s.id,source:'HMK World of Kèthîra pp.158–162',
   timelineId:s.timelineId,round:s.round,actorId:s.actorId,decision:s.action,
   readiedAction:s.readiedAction,durationRounds:s.durationRounds,physicalDice:[]}};
}
