/**
 * Deterministic building block for a future one-screen HMK combat guide.
 * HMK World of Kèthîra, Melee Attack / Defence, printed p.166.
 *
 * The caller validates permission to act against the turn scheduler and
 * supplies permitted defences from the live combat state. No implicit choice,
 * GM judgement, computer die roll, or injury/TA assumption is made here.
 */
import {DEFENCE} from '../rules/melee.js';
import {resolveMeleeAttackGate} from './melee-attack-gate.js';
import {createManualDiceQueue,recordManualDie,nextManualDie,completedManualDice} from './hmk-manual-dice-queue.js';
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const check=(v,msg)=>{if(!v)throw new Error(msg)};
const validId=v=>typeof v==='string'&&v.length>0&&v.length<161;

export function createGuidedMeleeSequence({id,timelineId,round,attackerId,defenderId,
 attackerEML,defenderEML,allowedDefences,sourceSignature}={}){
 check(validId(id)&&validId(timelineId)&&validId(sourceSignature),'Chybí ověřená bojová událost a podpis stavu');
 check(int(round,1,9999)&&validId(attackerId)&&validId(defenderId)&&attackerId!==defenderId,'Neplatní účastníci/kolo');
 check(int(attackerEML,0,100)&&int(defenderEML,0,100),'Chybí doložené EML účastníků');
 check(Array.isArray(allowedDefences)&&allowedDefences.length>0&&allowedDefences.every(x=>Object.values(DEFENCE).includes(x))
  &&new Set(allowedDefences).size===allowedDefences.length,'Chybí skutečně povolené volby obrany');
 return {format:'hmk-guided-melee-v1',id,timelineId,round,attackerId,defenderId,attackerEML,defenderEML,
  allowedDefences:[...allowedDefences],sourceSignature,phase:'choose-defence',defence:null,queue:null,
  witnessedRolls:[],gate:null};
}

export function guidedMeleeRequirement(session){
 assertSession(session);
 if(session.phase==='choose-defence')return {kind:'choice',id:'defence',actorId:session.defenderId,choices:[...session.allowedDefences]};
 if(session.phase==='rolling')return {kind:'die',actorId:nextManualDie(session.queue)?.id?.startsWith('defender')?session.defenderId:session.attackerId,
  ...nextManualDie(session.queue)};
 return {kind:'resolved',result:session.gate};
}

export function chooseGuidedMeleeDefence(session,defence){
 assertSession(session);
 check(session.phase==='choose-defence'&&session.allowedDefences.includes(defence),'Obrana není povolená nebo už byla zvolena');
 const requests=[{id:'attackerRoll',faces:100,label:'Melee Attack d100'}];
 if(defence!==DEFENCE.IGNORE)requests.push({id:'defenderRoll',faces:100,label:`Melee ${defence} d100`});
 const queue=createManualDiceQueue({id:session.id+':melee-d100',source:'HMK World of Kèthîra p.166 Melee',
  round:session.round,actorId:session.attackerId,requests});
 return {...session,defence,phase:'rolling',queue};
}

export function submitGuidedMeleeDie(session,value){
 assertSession(session);check(session.phase==='rolling','Žádný skutečný hod nebyl vyžádán');
 const request=nextManualDie(session.queue);
 check(request,'Hod již byl vyhodnocen');
 const queue=recordManualDie(session.queue,{requestId:request.id,value});
 const next={...session,queue};
 if(queue.status!=='complete')return next;
 const {values,proof}=completedManualDice(queue);
 next.witnessedRolls=[...next.witnessedRolls,...proof.rolls];
 if(request.faces===100){
  const gate=resolveMeleeAttackGate({defence:next.defence,attackerEML:next.attackerEML,defenderEML:next.defenderEML,
   attackerRoll:values.attackerRoll,defenderRoll:next.defence===DEFENCE.IGNORE?null:values.defenderRoll});
  if(gate.reason==='final-d10-tiebreak-required'){
   // The p.166 equal-test fallback, only when the rules resolver explicitly requests it.
   const q=createManualDiceQueue({id:next.id+':final-d10',source:'HMK World of Kèthîra p.166 final Melee tie-break',
    round:next.round,actorId:next.attackerId,requests:[
     {id:'attackerFinalD10',faces:10,label:'Attacker final tie-break d10'},
     {id:'defenderFinalD10',faces:10,label:'Defender final tie-break d10'}]});
   return {...next,queue:q};
  }
  check(gate.ok,`Původní Melee nelze vyhodnotit: ${gate.reason}`);
  return {...next,gate,phase:'resolved'};
 }
 // Repeated exact d10 ties remain unresolved: the system requests fresh physical
 // d10 rolls instead of silently selecting a winner.
 const firstQueue=session.witnessedRolls.filter(x=>['attackerRoll','defenderRoll'].includes(x.id));
 const a=firstQueue.find(x=>x.id==='attackerRoll')?.value;
 const d=firstQueue.find(x=>x.id==='defenderRoll')?.value;
 check(int(a,1,100)&&int(d,1,100),'Chybí původní doložené výsledky Melee d100');
 const gate=resolveMeleeAttackGate({defence:next.defence,attackerEML:next.attackerEML,defenderEML:next.defenderEML,
  attackerRoll:a,defenderRoll:d,finalD10Attacker:values.attackerFinalD10,finalD10Defender:values.defenderFinalD10});
 if(gate.reason==='final-d10-tiebreak-required'){
  // This does not select a winner: a new physical d10 pair is required.
  return {...next,queue:createManualDiceQueue({id:next.id+':final-d10-repeat-'+next.witnessedRolls.length,
   source:'HMK World of Kèthîra p.166 repeat final tie-break',round:next.round,actorId:next.attackerId,requests:[
    {id:'attackerFinalD10',faces:10,label:'Attacker repeat final d10'},
    {id:'defenderFinalD10',faces:10,label:'Defender repeat final d10'}]})};
 }
 check(gate.ok,`Melee tie-break nelze vyhodnotit: ${gate.reason}`);
 return {...next,gate,phase:'resolved'};
}

export function guidedMeleeResult(session){
 assertSession(session);
 check(session.phase==='resolved'&&session.gate?.ok,'Melee není dokončeno; nelze zapisovat výsledek');
 return {source:'HMK World of Kèthîra p.166',id:session.id,timelineId:session.timelineId,round:session.round,
  attackerId:session.attackerId,defenderId:session.defenderId,sourceSignature:session.sourceSignature,
  defence:session.defence,gate:{...session.gate},physicalDice:[...session.witnessedRolls]};
}

function assertSession(session){
 check(session?.format==='hmk-guided-melee-v1'&&['choose-defence','rolling','resolved'].includes(session.phase),
 'Neplatný průběh HMK Melee');
}
