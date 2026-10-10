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
 const immediate=dueEncounterEvents(s,states);
 if(immediate.length)return {kind:'mandatory-event',actorId,choices:[],events:immediate};
 const ending=dueEndTurnEvents(s,states);
 if(ending.length)return {kind:'mandatory-end-turn-event',actorId,choices:[],events:ending};
 const choices=[];
 for(const action of [...PLAYER_ACTIONS,'incapacitated']){
  try{
   // A dry-run uses the authoritative scheduler and is never persisted.
   finishEncounterTurn(s,states,{action,gmConfirmed:true,durationRounds:1,readiedAction:'attack'});
   choices.push(action);
  }catch{/* Only actions the scheduler accepts may be offered to the player. */}
 }
 return {kind:'player-choice',actorId,choices};
}
