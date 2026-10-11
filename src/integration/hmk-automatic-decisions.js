/**
 * HMK World of Kèthîra, printed p.172 (Free Press Roll).
 * Deterministic rules decisions. All dice come from the caller; never invent
 * circumstances or replace unknown information with a false/zero default.
 * The witness comes from the verified Attack/Defence gate, NOT a GM checkbox.
 */
import {normalFreePressEligible,heldSlotInGrabZone} from '../rules/melee.js';
import {SL} from '../rules/tests.js';
import {applyConfirmedHMKManeuver,applyConfirmedGrabRetest,applyConfirmedGrabTakeTransfer} from './hmk-maneuver-persistence.js';

const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const ensure=(condition,message)=>{if(!condition)throw new Error(message)};
const freeze=value=>Object.freeze(value);

/** Produce an evidence-backed, immutable eligibility result (not an action yet). */
export function decideFreePress({gate,attackerId,defenderId,round,timelineId,sourceSignature,
 actualPressAttack=false,meleeProofKey=null}={}){
 ensure(gate?.ok===true,'Chybí úspěšně vyhodnocený Melee Attack/Defence');
 ensure(typeof attackerId==='string'&&attackerId.length>0&&typeof defenderId==='string'&&defenderId.length>0&&attackerId!==defenderId,'Neplatní bojovníci');
 ensure(integer(round,1,9999)&&typeof timelineId==='string'&&timelineId.length>0,'Neplatná časová osa');
 ensure(typeof sourceSignature==='string'&&sourceSignature.length>0,'Chybí podpis aktuálního bojového stavu');
 ensure(['attacker','defender',null].includes(gate.winner),'Neznámý vítěz Melee');
 ensure(integer(gate.attackerSL,SL.CF,SL.CS)&&
  (gate.defence==='ignore'||integer(gate.defenderSL,SL.CF,SL.CS)),'Neplatné skutečné Success Levels');
 let reason='no-melee-victory',eligible=false;
 const winner=gate.winner;
 if(gate.defence==='ignore')reason='ignore-no-opposed-melee';
 else if(!winner)reason='no-winner';
 else if(actualPressAttack)reason='actual-press-attack';
 else if(winner==='defender'&&gate.defence==='dodge')reason='dodge-defender';
 else if(gate.usedTiebreak)reason='tiebreak-winner';
 else {
  const winnerSL=winner==='attacker'?gate.attackerSL:gate.defenderSL;
  const loserSL=winner==='attacker'?gate.defenderSL:gate.attackerSL;
  eligible=normalFreePressEligible({meleeSL:winnerSL,opponentSL:loserSL,
   usedTiebreak:gate.usedTiebreak,actualPressAttack,dodgeDefender:winner==='defender'&&gate.defence==='dodge'});
  reason=eligible?'eligible':'no-higher-success-level';
 }
 const ownerId=winner==='attacker'?attackerId:winner==='defender'?defenderId:null;
 const targetId=winner==='attacker'?defenderId:winner==='defender'?attackerId:null;
 return freeze({format:'hmk-free-press-evidence-v1',source:'HMK World of Kèthîra p.172',
  eligible,reason,ownerId,targetId,attackerId,defenderId,round,timelineId,
  sourceSignature,meleeProofKey,defence:gate.defence,attackerSL:gate.attackerSL,defenderSL:gate.defenderSL,
  winner,usedTiebreak:gate.usedTiebreak,actualPressAttack});
}

/** Accept the saved proof only if the same two characters are in the same state/turn. */
export function validateFreePressDecision({decision,round,timelineId,sourceSignature,
 attackerId,defenderId,alreadyUsed=false,aftermathResolved=false}={}){
 ensure(decision?.format==='hmk-free-press-evidence-v1','Chybí prokázané vítězství Melee');
 ensure(decision.eligible===true,'Původní Melee nesplňuje podmínky Free Press');
 ensure(!alreadyUsed,'Free Press z tohoto Melee již byl vyčerpán');
 ensure(decision.round===round&&decision.timelineId===timelineId,'Free Press patří do jiného kola či střetnutí');
 ensure(decision.sourceSignature===sourceSignature,'Stav, atributy nebo výbava se od Melee změnily');
 ensure(decision.attackerId===attackerId&&decision.defenderId===defenderId,'Změněni účastníci původního Melee');
 ensure(aftermathResolved===true,'Nejdřív zapište Injury a vyřešte okamžité Mishaps (HMK p.172)');
 return freeze({allowed:true,ownerId:decision.ownerId,targetId:decision.targetId});
}

/** Apply the p.106 Press opposed d6+STR once, without accepting a GM claim of victory.
 *  The decision is validated before calling the existing persistence transition.
 */
export function applyAutomaticFreePress({decision,round,timelineId,sourceSignature,
 attackerId,defenderId,alreadyUsed=false,aftermathResolved=false,
 state,eventId,ownerSTR,targetSTR,ownerD6,targetD6}={}){
 const permission=validateFreePressDecision({decision,round,timelineId,sourceSignature,
  attackerId,defenderId,alreadyUsed,aftermathResolved});
 ensure(integer(ownerSTR,1,40)&&integer(targetSTR,1,40),'Chybí skutečné STR některé postavy');
 ensure(integer(ownerD6,1,6)&&integer(targetD6,1,6),'Dva skutečné hody d6 musí být v rozsahu 1–6');
 ensure(!decision.meleeProofKey||!state?.events?.some(x=>x.details?.ruleProof?.meleeProofKey===decision.meleeProofKey),'Tento původní Melee již vytvořil automatický následný manévr');
 const result=applyConfirmedHMKManeuver({state,round,eventId,kind:'press',
  attackerId:permission.ownerId,targetId:permission.targetId,
  attackerSTR:ownerSTR,targetSTR,attackerD6:ownerD6,targetD6:targetD6,
  impactTA:0,confirmedMeleeVictory:true,gmConfirmed:true});
 const proof=freeze({from:decision.source,round,ownerId:permission.ownerId,
  targetId:permission.targetId,attackerSL:decision.attackerSL,defenderSL:decision.defenderSL,
  ownerD6,targetD6,meleeProofKey:decision.meleeProofKey,
  mode:'automatic-source-validated-free-press'});
 result.state.events.at(-1).details.ruleProof=proof;
 return {...result,proof};
}

const SPECIAL_KINDS=new Set(['press','trip','grab']);
/** HMK p106: a declared Grab/Press/Trip, Strike or Counterstrike, may proceed
 * to its ONE opposed d6+STR roll only when that exact declarer wins Melee.
 * This is separate from the optional p172 Free Press route.
 */
export function decideDeclaredManeuver({gate,attackerId,defenderId,round,timelineId,
 sourceSignature,attackerTechnique='strike',defenderCounterTechnique='strike',meleeProofKey=null,
 attackerCharge=false,defenderCharge=false,attackerOneHanded=false,defenderOneHanded=false,attackerOffHanded=false,defenderOffHanded=false}={}){
 ensure(gate?.ok===true,'Před manévrem musí existovat skutečný Melee výsledek');
 ensure(typeof attackerId==='string'&&attackerId&&typeof defenderId==='string'&&defenderId&&attackerId!==defenderId,'Neplatní účastníci manévru');
 ensure(integer(round,1,9999)&&typeof timelineId==='string'&&timelineId&&typeof sourceSignature==='string'&&sourceSignature,'Chybí čas a zdrojový stav');
 ensure(['strike',...SPECIAL_KINDS].includes(attackerTechnique),'Neznámý deklarovaný útok');
 ensure(['strike',...SPECIAL_KINDS].includes(defenderCounterTechnique),'Neznámý deklarovaný Counterstrike');
 // HMK p106 explicitly requires an opposed Melee victory, not an unopposed Ignore result.
 ensure([attackerCharge,defenderCharge,attackerOneHanded,defenderOneHanded,attackerOffHanded,defenderOffHanded].every(x=>typeof x==='boolean'),'Neplatné předem deklarované modifikátory manévru');
 const attackerWon=gate.defence!=='ignore'&&gate.winner==='attacker'&&gate.attackerStrike;
 const defenderWon=gate.winner==='defender'&&gate.counterStrike;
 const winner=gate.winner;
 const kind=attackerWon?attackerTechnique:defenderWon?defenderCounterTechnique:'strike';
 const charge=attackerWon?attackerCharge:defenderWon?defenderCharge:false;
 const oneHanded=attackerWon?attackerOneHanded:defenderWon?defenderOneHanded:false;
 const offHanded=attackerWon?attackerOffHanded:defenderWon?defenderOffHanded:false;
 const ownerId=attackerWon?attackerId:defenderWon?defenderId:null;
 const targetId=attackerWon?defenderId:defenderWon?attackerId:null;
 return freeze({format:'hmk-declared-maneuver-evidence-v1',source:'HMK World of Kèthîra p.106',
  eligible:SPECIAL_KINDS.has(kind),kind,ownerId,targetId,
  reason:SPECIAL_KINDS.has(kind)?'opposed-melee-victory':winner?'declared-strike-not-maneuver':'no-melee-winner',
  attackerId,defenderId,attackerTechnique,defenderCounterTechnique,round,timelineId,sourceSignature,meleeProofKey,charge,oneHanded,offHanded,
  impactTA:gate.impactTA,attackerSL:gate.attackerSL,defenderSL:gate.defenderSL,
  meleeMishapPending:!!(gate.attackerMishap||gate.defenderMishap)});
}
export function applyAutomaticDeclaredManeuver({decision,round,timelineId,sourceSignature,
 attackerId,defenderId,alreadyUsed=false,aftermathResolved=false,state,eventId,
 ownerSTR,targetSTR,ownerD6,targetD6,grabAction='hold',zone=null}={}){
 ensure(decision?.format==='hmk-declared-maneuver-evidence-v1'&&decision.eligible,'Není prokázané vítězství deklarovaného manévru');
 ensure(decision.round===round&&decision.timelineId===timelineId&&decision.sourceSignature===sourceSignature,'Neaktuální manévr nebo změna bojového stavu');
 ensure(decision.attackerId===attackerId&&decision.defenderId===defenderId,'Změněni účastníci původního Melee');
 ensure(!alreadyUsed&&aftermathResolved&&!decision.meleeMishapPending,'Nejprve musí být uzavřen původní Melee a všechny povinné Mishaps');
 ensure(integer(ownerSTR,1,40)&&integer(targetSTR,1,40)&&integer(ownerD6,1,6)&&integer(targetD6,1,6),'Chybí skutečné STR nebo dva hody d6');
 ensure(integer(decision.impactTA,0,3),'Neplatný počet získaných Impact TA');
 ensure(!decision.meleeProofKey||!state?.events?.some(x=>x.details?.ruleProof?.meleeProofKey===decision.meleeProofKey),'Tento původní Melee již vytvořil automatický následný manévr');
 if(decision.kind==='grab')ensure(['hold','take'].includes(grabAction)&&typeof zone==='string'&&zone.trim().length>0,'Hráč musí vybrat Hold/Take a konkrétní zónu Grab');
 const result=applyConfirmedHMKManeuver({state,round,eventId,kind:decision.kind,attackerId:decision.ownerId,targetId:decision.targetId,
  attackerSTR:ownerSTR,targetSTR,attackerD6:ownerD6,targetD6,impactTA:decision.impactTA,
  charge:decision.charge,oneHanded:decision.oneHanded,offHanded:decision.offHanded,grabAction,zone,
  confirmedMeleeVictory:true,gmConfirmed:true});
 const proof=freeze({source:decision.source,ownerId:decision.ownerId,targetId:decision.targetId,
  kind:decision.kind,round,impactTA:decision.impactTA,ownerD6,targetD6,meleeProofKey:decision.meleeProofKey,
  charge:decision.charge,oneHanded:decision.oneHanded,offHanded:decision.offHanded,
  mode:'declared-source-validated-opposed-maneuver'});
 result.state.events.at(-1).details.ruleProof=proof;
 return {...result,proof};
}

/** HMK p106 Trip margin 10+: one automatic Grab without a second opposed d6.
 * The choice Take/Hold/decline is the tripper's, not a calculation or GM ruling.
 */
export function resolveTripAutomaticGrab({state,round,eventId,grabberId,targetId,
 choice,zone=null}={}){
 ensure(state&&typeof state==='object'&&state.shock!=='KIA','Cíl je mrtvý nebo není známý');
 const pending=state.pendingAutomaticGrab;
 ensure(pending&&pending.grabberId===grabberId&&pending.targetId===targetId,'Chybí doložený Trip s rozdílem 10+');
 ensure(round===pending.createdRound&&integer(round,1,9999),'Volba Trip Grab musí následovat okamžitě v témže kole');
 ensure(typeof eventId==='string'&&eventId&&!state.events.some(x=>x.id===eventId),'Neplatná nebo duplicitní událost');
 ensure(['hold','take','decline'].includes(choice),'Hráč musí vybrat Hold, Take nebo odmítnutí');
 if(choice!=='decline')ensure(typeof zone==='string'&&zone.trim().length>0,'U Hold/Take je povinná skutečně zasažená zóna');
 const next=structuredClone(state);
 next.pendingAutomaticGrab=null;
 if(choice==='hold')next.grabHold={active:true,grabberId,targetId,zone,createdRound:round};
 if(choice==='take')next.pendingGrabTake={fromActorId:targetId,toActorId:grabberId,zone,sourceId:pending.sourceId};
 next.events.push({id:eventId,type:'hmk-trip-automatic-grab-choice',round,details:{
  choice,zone,grabberId,targetId,sourceId:pending.sourceId,opposedRollRequired:false,
  source:'HMK World of Kèthîra p.106, Trip margin 10+'}});
 next.lastRound=round;
 return {state:next,choice,held:choice==='hold',takePending:choice==='take'};
}

/** HMK p106: re-test a continuing Hold at the grabber's *next turn*.
 * Rule verification is based on persistent hold origin + the live initiative
 * actor, actual character STR and unbiased d6 provided by the runner.
 */
export function applyAutomaticGrabHoldRetest({state,round,eventId,grabberId,targetId,actorId,
 ownerSTR,targetSTR,ownerD6,targetD6}={}){
 ensure(state?.grabHold?.active===true&&state.grabHold.grabberId===grabberId&&state.grabHold.targetId===targetId,
  'Není aktivní doložené Grab Hold');
 ensure(actorId===grabberId,'Hold lze opakovat pouze na tahu držícího');
 ensure(integer(round,1,9999)&&round===state.grabHold.createdRound+1,'Hold se opakuje přesně na následujícím tahu držícího');
 ensure(integer(ownerSTR,1,40)&&integer(targetSTR,1,40)&&integer(ownerD6,1,6)&&integer(targetD6,1,6),
  'Chybí skutečné STR nebo dva d6');
 const result=applyConfirmedGrabRetest({state,round,eventId,attackerId:grabberId,
  attackerSTR:ownerSTR,targetSTR,attackerD6:ownerD6,targetD6,impactTA:0,
  gmConfirmed:true});
 const proof=freeze({source:'HMK World of Kèthîra p.106',grabberId,targetId,round,
  ownerD6,targetD6,mode:'automatic-hold-retest-actor-validated'});
 result.state.events.at(-1).details.ruleProof=proof;
 return {...result,proof};
}

/** HMK p106 Grab Take: actual held object is a player's selection, but the
 * physical inventory move is deterministic and needs no GM attestation.
 * Inventory changes are applied atomically by the caller along with state.
 */
export function applyAutomaticGrabTake({state,inventory,round,eventId,grabberId,targetId,itemId,targetHandedness}={}){
 ensure(state?.pendingGrabTake?.toActorId===grabberId&&state.pendingGrabTake?.fromActorId===targetId,
  'Neexistuje potvrzené Grab Take mezi zadanými postavami');
 ensure(integer(round,1,9999),'Neplatné kolo');
 ensure(Array.isArray(inventory),'Chybí aktuální inventář');
 const obj=inventory.find(x=>x.id===itemId&&x.characterId===targetId&&['main_hand','off_hand'].includes(x.slot));
 ensure(obj?.quantity===1,'Lze převzít pouze skutečně držený jednotlivý předmět');
 ensure(obj.slot===heldSlotInGrabZone(state.pendingGrabTake.zone,targetHandedness),
  'Grab Take: zasažená anatomická ruka musí odpovídat skutečnému slotu a doložené Handedness');
 const result=applyConfirmedGrabTakeTransfer({state,inventory,round,eventId,attackerId:grabberId,
  targetId,itemId,targetHandedness,gmConfirmed:true});
 const proof=freeze({source:'HMK World of Kèthîra p.106',grabberId,targetId,round,
  itemId,mode:'automatic-verified-held-inventory-transfer'});
 result.state.events.at(-1).details.ruleProof=proof;
 return {...result,proof};
}
