/**
 * HMK World of Kèthîra p.158–162: project legally selectable actions from
 * the SAME transition guard used when the action is committed. No separate,
 * divergent table of handcrafted permissions and no GM validity checkbox.
 *
 * This is a read-only projector for the future one-screen encounter wizard.
 * It does not advance time or mutate the current initiative sequence.
 */
import {validateEncounterSequence,finishEncounterTurn,dueEncounterEvents,dueEndTurnEvents} from './encounter-turn-sequence.js';
const PLAYER_ACTIONS=['attack','charge','evade','grope','incant','move','pass','ready','concentrate-start','concentrate-hold','concentrate-abandon'];

export function guidedTurnChoices(sequence,states){
 const s=validateEncounterSequence(sequence);
 if(!s.active||s.cursor>=s.order.length)return {kind:'not-in-turn',actorId:null,choices:[]};
 const actorId=s.interruptActiveId||s.order[s.cursor];
 if(s.interruptActiveId)return {kind:'readied-interruption',actorId,choices:[],note:'Přerušující akce již byla deklarována a musí se vyhodnotit'};
 if(s.pendingEndTurnAction)return {kind:'mandatory-end-turn-event',actorId,choices:[],events:dueEndTurnEvents(s,states),
  note:'Akce již proběhla; po fyzickém Shock Reroll se tah automaticky uzavře'};
 const immediate=dueEncounterEvents(s,states);
 if(immediate.length)return {kind:'mandatory-event',actorId,choices:[],events:immediate};
 const ending=dueEndTurnEvents(s,states).filter(e=>
  !(e.type==='shock-end-turn'&&['STN','INC'].includes(s.entryShock)&&!s.pendingEndTurnAction)&&
  !(e.type==='rally-end-turn-reaction'&&['routed','withdrawing'].includes(s.entryMorale)&&
   !s.pendingEndTurnAction));
 // Pass after a previous-turn Mishap has no physical roll or additional player
 // choice. Expose the sole legal Pass, to be consumed atomically with turn end.
 // Other end-turn obligations (Shock, Catatonic) must still be resolved first.
 if(ending.length){
  if(ending.every(x=>x.type==='mishap-pass-end-turn'))
   return {kind:'player-choice',actorId,choices:['pass'],mandatoryPass:true,events:ending};
  return {kind:'mandatory-end-turn-event',actorId,choices:[],events:ending};
 }
 const choices=[];
 for(const action of [...PLAYER_ACTIONS,'incapacitated']){
  try{
   // A declared Attack/Charge may be selected BEFORE the physical dice.
   // The actual finish guard correctly REQUIRES a confirmed strike outcome;
   // supplying a non-persistent, synthetic proof in this read-only projector
   // avoids hiding every Attack/Charge from the initial choice list.
   // The proof must NEVER be written to the real sequence or a journal.
   const trial=validateEncounterSequence(s);
   if(action==='attack'||action==='charge'){
    const token=`${trial.timelineId}:${trial.round}:${trial.cursor}:${trial.interruptActiveId||'main'}`;
    // A real outcome already recorded for this token means no second attack.
    if(trial.confirmedHits?.[token])continue;
    trial.confirmedHits??={};trial.confirmedHits[token]={round:trial.round,actorId};
   }
   // Project only: if the GM later selects exceptional Pass under failed Morale,
   // the real resolver must still request an explicit movement-impossible witness.
   finishEncounterTurn(trial,states,{action,gmConfirmed:true,durationRounds:1,readiedAction:'attack',movementImpossibleConfirmed:true,threatenedConfirmed:false});
   choices.push(action);
  }catch(err){
   // Geometry is supplied *after* choosing Move. This sentinel occurs only
   // after all preceding turn, mandatory-event and concentration gates pass.
   if(action==='move'&&String(err?.message).includes('povinný Move vyžaduje přepočítanou prostorovou trasu (zatím nedoložena)'))
    choices.push(action);
  }
 }
 return {kind:'player-choice',actorId,choices};
}
