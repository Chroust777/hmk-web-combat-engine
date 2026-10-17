/** HMK v1.2 pp. 161–162,169–170,178–179: chronological bridge into
 * the ONE authoritative guided Combat mandatory resolver.
 * Read-only: never rolls, never writes a wound, never advances a clock.
 */
import {guidedMandatoryEvents} from './hmk-guided-mandatory.js';
import {validateCombatState} from './persistent-combat-state.js';

const TYPE_TO_RUNNER=Object.freeze({
 'injury-mishap':'injury-mishap', 'blood-loss':'blood-loss',
 'injury-morale':'injury-morale', 'unc-shock-reroll':'shock-recovery',
 'blood-shock-reroll':'shock-recovery', 'shock-end-turn':'shock-recovery',
 'shock-recovery':'shock-recovery'
});
const has=(v)=>typeof v==='string'&&v.length>0;
const okRound=(v)=>Number.isSafeInteger(v)&&v>=1&&v<=9999;

/** firstDue is produced by the live encounter scheduler (not a Skill Test).
 * Its actor and end-of-turn requirement are binding. The Combat engine is
 * the only owner of execution. Unknown due events cannot be skipped.
 */
export function verifyMandatoryHandoff({state,characterId,round,actorId=null,turnEnded=false,
 timelineId=null,elapsedMinutesSinceOriginal=null,firstDue=null,expected=null}={}){
 validateCombatState(state);
 if(!has(characterId)||!okRound(round)||typeof turnEnded!=='boolean')throw Error('Mandatory handoff: neplatný účastník, kolo nebo fáze tahu');
 if(!firstDue)return {ready:false,reason:'V aktuálním střetnutí není potvrzena splatná povinná událost',status:'not-due'};
 if(!firstDue.supported)return {ready:false,reason:'Dřívější povinná událost musí být dokončena ve své původní Combat proceduře',status:'unsupported',firstDue};
 if(firstDue.characterId!==characterId||firstDue.turnEnded!==turnEnded)return {ready:false,reason:'Událost jiného aktéra nebo jiné fáze tahu má přednost',status:'wrong-order',firstDue};
 const mapped=TYPE_TO_RUNNER[firstDue.type];
 if(!mapped)return {ready:false,reason:'Tento druh povinného následku používá jiný autoritativní Combat resolver',status:'different-resolver',firstDue};
 const events=guidedMandatoryEvents({state,characterId,round,actorId,turnEnded,timelineId,elapsedMinutesSinceOriginal});
 const event=events[0];
 if(!event||event.kind!==mapped)return {ready:false,reason:'Iniciativa a autoritativní stav postavy nesouhlasí ve splatnosti nebo pořadí',status:'scheduler-conflict',firstDue,actual:event??null};
 if(firstDue.mishapId&&firstDue.mishapId!==event.id||firstDue.woundId&&firstDue.woundId!==event.id)
  return {ready:false,reason:'Splatná rána nebo Mishap neodpovídá očekávanému zdroji',status:'source-conflict',firstDue,actual:event};
 if(expected&&(expected.id!==event.id||expected.kind!==event.kind||expected.round!==round||expected.timelineId!==timelineId))
  return {ready:false,reason:'Formulář patří ke staré události, kolu nebo časové ose; obnovte Combat',status:'stale',firstDue,actual:event};
 return {ready:true,status:'ready',event,characterId,round,timelineId,turnEnded,firstDue};
}
/** Seal the form to a due event at render time; stale forms must not commit. */
export function mandatoryFormWitness(bridge){
 if(!bridge?.ready)throw Error('Nelze vydat potvrzení pro nesplatný následek');
 return {id:bridge.event.id,kind:bridge.event.kind,round:bridge.round,timelineId:bridge.timelineId};
}
