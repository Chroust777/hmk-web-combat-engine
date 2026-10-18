/** HMK Kèthîra pp.203–204. Durable six-round Hyper Burst, deliberately
 * fail-closed for unverified bonuses. Bounded second Melee and verified
 * Direct Missile/Thrown attacks run through existing Attack/Injury journeys, followed by physical
 * END in one checkpoint. Doom Flame spellstart may open a 2-round commitment;
 * generic Incant, Volley/Charging Throw, complex Missile and Melee remain blocked.
 * A bonus END check is compulsory even when fatigue prevents a bonus action.
 * No rolls are ever generated. Both source and END results use full-document
 * compare-and-swap, not individual writes per character.
 */
import {validateEncounterSequence,finishEncounterTurn,currentEncounterActor,dueEncounterEvents,duePelahnHyperBurstBonus,beginPelahnBonusConcentration} from './encounter-turn-sequence.js';
import {prepareDoomFlameSource,submitDoomFlameDie} from './hmk-guided-doom-flame.js';
import {validateCombatState,combatFatigueTotals,applyConfirmedFatigue,dueInjuryMorale} from './persistent-combat-state.js';
import {previewPelahnHyperBurstTurn} from './hmk-pelahn-hyperburst-proof.js';
import {createLiveGuidedMelee,createLiveGuidedMissile} from './hmk-guided-live-attack-inputs.js';
import {requireLoadedMissile,consumeLoadedMissile,verifiedMissileAimBonus} from './hmk-guided-missile-preparation.js';
import {guidedAttackRequirement,chooseGuidedAttack,submitGuidedAttackDie,advanceGuidedAttack,completeGuidedAttack} from './hmk-guided-attack-journey.js';
import {applyConfirmedInjuryMorale,unresolvedInjuryMishaps} from './persistent-combat-state.js';
import {projectGuidedSpatialPath} from './hmk-guided-spatial-actions.js';
import {verifiedPrintedThrownItem} from './hmk-printed-thrown-weapon-modes.js';
import {requirePelahnBonusIncantSpell} from './hmk-pelahn-incant-registry.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
import {stageTrustedMoralePsycheSources} from './hmk-morale-psyche-bridge.js';
import {composeVerifiedPelahnTotalRelease} from './hmk-pelahn-total-release-core.js';
import {listPelahnBurstSources} from './hmk-pelahn-burst-registry.js';
import {baseMove} from '../rules/movement.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {projectInjuredMovement} from './live-injury-impairment.js';
const cp=structuredClone,js=JSON.stringify;
const check=(v,m)=>{if(!v)throw Error(m)};
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const xy=x=>x&&Number.isFinite(x.x)&&Number.isFinite(x.y);
export function awaitingPelahnBonus(sequence){
 const seq=validateEncounterSequence(sequence);
 const due=duePelahnHyperBurstBonus(seq);
 if(!due)return null;
 const b=listPelahnBurstSources(seq).find(x=>x.id===due.sourceEventId);
 check(!!b,'Hyper Burst: splatná bonusová akce nemá uložený zdroj');
 const pos=seq.spatialUnits?.find(x=>x.id===due.actorId);
 check(xy(pos),'Hyper Burst: po běžné akci chybí skutečná poloha aktéra');
 return {format:'hmk-pelahn-live-bonus-due-v1',sourceEventId:b.id,actorId:due.actorId,
  round:seq.round,regularAction:due.regularAction,position:{x:pos.x,y:pos.y}};
}
function selectedBonusSource(sequence){
 const due=awaitingPelahnBonus(sequence);
 check(due,'Raw Pèleáhn: bonusový aktér nemá jednoznačný splatný zdroj');
 const source=listPelahnBurstSources(sequence).find(b=>b.id===due.sourceEventId);
 check(source,'Raw Pèleáhn: původ bonusové akce chybí');
 return source;
}
function moveOf(document,c,seq){
 const a=c.hmk?.attributes||{},folk=String(c.hmk?.folk??'').trim().toLowerCase();
 check(int(a.agl,1,40)&&int(a.str,1,40),'Hyper Burst vyžaduje skutečnou AGL/STR pro výpočet Move');
 const size=['kuzhai','kûzhai'].includes(folk)?'kuzhai':['human','human-sized','human sized','human folk'].includes(folk)?'human-sized':null;
 check(size,'Hyper Burst: nelze odhadnout Move zvířete nebo neznámého Folk');
 const b=baseMove({agility:a.agl,strength:a.str,folk:size});
 const load=resolveCombatantLoad({character:c,inventory:document.inventory});
 check(load.encReady,'Hyper Burst: neověřená Encumbrance: '+load.issues.join('; '));
 const inj=projectInjuredMovement({state:c.hmk.combatState,round:seq.round,timelineId:seq.timelineId});
 check(inj.ready&&!inj.blocked,'Hyper Burst: neověřený Move při zranění');
 // HMK p.160 distinguishes innate Move (p.56) from Effective Move:
 // Effective Move = Move - ENC - Fatigue - impairment. Hyper Burst p.204
 // explicitly tests Fatigue against Move, NOT Effective Move; comparing
 // against the latter would count Fatigue twice and suppress valid bonuses.
 check(Number.isFinite(load.modifiedENC)&&Number.isFinite(inj.impairment),
  'Hyper Burst: nedoložené podklady pro Effective Move');
 return b.move;
}
function effectiveMoveOf(document,c,seq){
 const base=moveOf(document,c,seq);
 const load=resolveCombatantLoad({character:c,inventory:document.inventory});
 const injury=projectInjuredMovement({state:c.hmk.combatState,round:seq.round,timelineId:seq.timelineId});
 check(load.encReady&&injury.ready&&!injury.blocked&&Number.isSafeInteger(load.modifiedENC),
  'Hyper Burst Move vyžaduje autoritativní ENC a Injury impairment');
 return Math.max(0,base-load.modifiedENC-combatFatigueTotals(c.hmk.combatState).total-injury.impairment);
}

function save(document,out,{storage,key,baseline}={}){
 stageTrustedMoralePsycheSources(document,out);
 const serialized=js(out),r=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...r,document:r.ok?out:null,serialized:r.ok?serialized:null};
}
/** Authoritative SOURCE producer: reconstruct all GM-entered d100/d6 from
 * original declared spell and current documentary witness. Spirit CF
 * records a terminal physical body and a Shade without astral actions. */
export function persistPelahnTotalReleaseSource({stage,document,storage,key,baseline}={}){
 check(stage?.format==='hmk-doom-flame-stage-v1'&&stage.phase==='total-release-hyperburst-pending'&&
  stage.misfireD100===100&&js(document)===stage.documentWitness,
  'Doom Flame Total Release potřebuje všechny fyzické hody');
 const seq=validateEncounterSequence(document.combatRuntime?.sequence);
 check(js(seq)===stage.sequenceWitness,'Doom Flame: změněná Initiative');
 // The shared authoritative composer determines whether any prior Burst is
 // still active. An EXPIRED Burst is history, not a competing active source.
 let witness=prepareDoomFlameSource({id:stage.id,sequence:seq,document,
  casterId:stage.casterId,center:stage.center,seedFire:stage.seedFire,
  conditionsConfirmed:true,gmConfirmed:true});
 for(const d of [stage.castingRoll,100,stage.totalReleaseSpiritRoll,...stage.totalReleaseSpiritLossDice])
  witness=submitDoomFlameDie(witness,d);
 check(js(witness)===js(stage),'Doom Flame: podvržené fyzické hody a Spirit důkaz');
 const out=composeVerifiedPelahnTotalRelease({document,stage,spell:'Doom Flame',
  complexity:6,castingFatigue:20});
 return save(document,out,{storage,key,baseline});
}
/** Shared verification for one completed regular turn followed by physical
 * END. The real second Melee Attack is authorized only by its private
 * replay-verified caller, never by a user-supplied `extraAction` flag. */
/** Pure authoritative one-document END transition, shared by Pass and the
 * completed second Melee journey. This function NEVER writes storage and
 * therefore cannot leave a strike committed without its compulsory END.
 * The caller must persist its whole returned document with one verified CAS.
 */
function composePelahnBonusEnd({document,ENDD100,extraAction='pass',gmConfirmed=false}={}){
 check(gmConfirmed===true,'GM musí potvrdit fyzický END hod a dokončenou bonusovou akci');
 const seq=validateEncounterSequence(document?.combatRuntime?.sequence),due=awaitingPelahnBonus(seq);
 check(due&&int(ENDD100,1,100),'Není splatná bonusová akce a fyzický END d100');
 const c=document.characters.find(c=>c.id===due.actorId);
 check(c?.hmk?.combatState,'Chybí skutečný stav aktéra');
 const s=c.hmk.combatState;validateCombatState(s);
 check(!['attack','incant'].includes(extraAction)||!['afraid','terrified','catatonic'].includes(s.fear?.state),
  'Fear: nepovolená druhá Attack/Incant; fyzický END zůstává povinný');
 check(dueEncounterEvents(seq,Object.fromEntries(document.characters.map(c=>[c.id,c.hmk?.combatState]))).length===0,
  'Hyper Burst nelze dokončit před splatným Injury/Mishap/Morale');
 const fatigue=combatFatigueTotals(s).total,move=moveOf(document,c,seq),end=c.hmk.attributes?.end;
 check(int(end,1,40),'Povinný END test potřebuje skutečný atribut END');
 const permitted=fatigue<move;
 if(extraAction==='auto')extraAction=permitted?'pass':null;
 check(permitted?['pass','attack','incant'].includes(extraAction):extraAction===null,
  'Neprokázaná bonusová akce; bez oprávnění Fatigue < Move musí být akce prázdná');
 check(!['attack','incant'].includes(extraAction)||due.regularAction!=='concentrate-start',
  'Probíhající delší Incant/koncentraci nelze bez odpovídajícího přerušení změnit na Attack');
 const evidence=previewPelahnHyperBurstTurn({burst:selectedBonusSource(seq),round:seq.round,actorId:c.id,
  actorPosition:due.position,afterRegularAction:true,regularAction:due.regularAction,
  extraAction,incantUsed:due.regularAction==='incant',fatigueBefore:fatigue,move,END:end,ENDD100,gmConfirmed:true});
 const out=cp(document),next=cp(seq);
 next.log.push({type:'pelahn-bonus-resolved',sourceEventId:selectedBonusSource(seq).id,
  actorId:due.actorId,round:seq.round,regularAction:due.regularAction,
  extraAction,ENDD100,ENDSL:evidence.ENDSL,wearinessAdded:evidence.wearinessAdded,
  gmEnteredDice:true});
 out.combatRuntime.sequence=validateEncounterSequence(next);
 const actual=out.characters.find(c=>c.id===due.actorId);
 if(evidence.wearinessAdded>0){
  actual.hmk.combatState=applyConfirmedFatigue({state:actual.hmk.combatState,
   round:seq.round,eventId:`${selectedBonusSource(seq).id}:end:${seq.round}:${due.actorId}`,
   kind:'weariness',delta:evidence.wearinessAdded}).state;
 }
 const entry=`pelahn:${selectedBonusSource(seq).id}:${seq.round}:${due.actorId}`;
 check(!out.journal.some(j=>j.id===entry),'Duplicitní END zápis');
 out.journal.push({id:entry,characterId:due.actorId,createdAt:new Date().toISOString(),
  title:`Pèleáhn Hyper Burst · kolo ${seq.round}`,
  body:`Bonus ${extraAction??'žádný'}, fyzický END ${ENDD100}, ${evidence.ENDSL}, Weariness +${evidence.wearinessAdded}`,
  combatProof:{...cp(evidence),sourceEventId:due.sourceEventId}});
 return {document:out,evidence};
}
/** An extra Pass plus END are a SINGLE verified document checkpoint. */
export function persistPelahnExtraPass({document,storage,key,baseline,ENDD100,extraAction='pass',gmConfirmed=false}={}){
 const result=composePelahnBonusEnd({document,ENDD100,extraAction,gmConfirmed});
 check(result.evidence.extraAction===null||result.evidence.extraAction==='pass',
  'Melee nelze potvrdit jako Pass bez fyzického útoku');
 return save(document,result.document,{storage,key,baseline});
}


/** HMK pp.161, 167-170, 204. Begin a REAL second, on-IR Melee action.
 * The declaration binds to the already-completed regular action and the
 * current full-document snapshot. The only physical rolls are entered in
 * the existing guided Melee/Hit state machine, not by this adapter.
 * This conservative first route supports only the adapter's verified
 * primary Melee mode and a same-square/adjacent standing target.
 */
export function preparePelahnBonusMelee({id,document,targetId,attackerWeaponId,defenderWeaponId,
 attackerSkillId,defenderSkillId,attackerUsedArms='right',defenderUsedArms='right',
 sourceSignature,gmConfirmed=false}={}){
 check(gmConfirmed===true&&typeof id==='string'&&id&&id.length<=150&&
  typeof sourceSignature==='string'&&sourceSignature,'Bonus Melee vyžaduje doložený začátek GM');
 const seq=validateEncounterSequence(document?.combatRuntime?.sequence),due=awaitingPelahnBonus(seq);
 check(due&&targetId!==due.actorId&&seq.order.includes(targetId),
  'Bonusový Melee nemá aktuálního aktéra nebo skutečný cíl z Initiative');
 const actor=document.characters.find(c=>c.id===due.actorId),target=document.characters.find(c=>c.id===targetId);
 check(actor&&target&&actor.hmk?.combatState&&target.hmk?.combatState,
  'Bonusový Melee vyžaduje skutečný stav obou stran');
 validateCombatState(actor.hmk.combatState);validateCombatState(target.hmk.combatState);
 check(!['afraid','terrified','catatonic'].includes(actor.hmk.combatState.fear?.state),
  'Fear nedovoluje druhý Melee Attack');
 check(combatFatigueTotals(actor.hmk.combatState).total<moveOf(document,actor,seq),
  'Fatigue >= Move: žádný druhý Attack (fyzický END je přesto povinný)');
 check(dueEncounterEvents(seq,Object.fromEntries(document.characters.map(c=>[c.id,c.hmk?.combatState]))).length===0,
  'Nejprve je nutné vyřešit povinné Shock/Morale/Mishap');
 const ap=seq.spatialUnits?.find(x=>x.id===actor.id),tp=seq.spatialUnits?.find(x=>x.id===target.id);
 check(xy(ap)&&xy(tp)&&Math.hypot(ap.x-tp.x,ap.y-tp.y)<=5+1e-7,
  'Bonusové Melee je v této ověřené větvi omezeno na vzdálenost do 5 ft');
 check(actor.hmk.combatState.shock==='NONE'&&!actor.hmk.combatState.posture?.passNextTurn&&
  !actor.hmk.combatState.pendingManeuver&&!unresolvedInjuryMishaps(actor.hmk.combatState).length,
  'Závažný stav aktéra nedovoluje další Melee bez samostatné povinné mechaniky');
 const input={targetId,attackerWeaponId,defenderWeaponId,attackerSkillId,defenderSkillId,
  attackerUsedArms,defenderUsedArms};
 const {session}=createLiveGuidedMelee({id:id+':attack',timelineId:seq.timelineId,round:seq.round,
  attacker:actor,defender:target,inventory:document.inventory,direction:'front',opponents:1,
  aimZN:1,sourceSignature,...input});
 return {format:'hmk-pelahn-bonus-melee-stage-v1',id,actorId:actor.id,targetId,
  sourceEventId:selectedBonusSource(seq).id,round:seq.round,sourceSignature,
  documentWitness:js(document),sequenceWitness:js(seq),inputs:cp(input),attack:session};
}
/** Replay the exact confirmed choices/physical dice against the original
 * guided journey. A mutable sessionStorage draft is NEVER commit authority. */
export function replayPelahnBonusMelee(stage,transcript){
 check(stage?.format==='hmk-pelahn-bonus-melee-stage-v1'&&Array.isArray(transcript)&&
  transcript.length>0&&transcript.length<=140,'Chybí fyzický bonusový Melee průchod');
 let session=stage.attack;
 for(const ev of transcript){
  const req=guidedAttackRequirement(session);
  check(req.kind===ev?.kind&&req.id===ev.id,'Přeházený nebo podvržený Melee krok');
  if(req.kind==='choice')session=chooseGuidedAttack(session,ev.value);
  else if(req.kind==='die'){
   check(int(ev.value,1,req.faces),'Nesprávný fyzický hod d'+req.faces);
   session=submitGuidedAttackDie(session,ev.value);
  }else if(req.kind==='automatic'){
   const next=advanceGuidedAttack(session);
   check(js(next)!==js(session),'Automatický Melee krok nepostupuje');session=next;
  }else throw Error('Melee vyžaduje další nezpracovanou povinnou mechaniku');
 }
 check(guidedAttackRequirement(session).kind==='complete','Bonus Melee není kompletně vyhodnocen');
 return session;
}
/** The actual strike, its injury, optional immediate Injury Morale and the
 * compulsory physical END test are serialized into ONE atomic checkpoint.
 * No ordinary Initiative turn is scheduled twice and the next IR cannot
 * start until this single confirmed completion event is durable.
 */
export function persistPelahnExtraMelee({stage,attackSession,transcript,document,
 injuryMoraleRolls={},ENDD100,gmConfirmed=false,storage,key,baseline}={}){
 check(gmConfirmed===true&&stage?.format==='hmk-pelahn-bonus-melee-stage-v1'&&
  js(document)===stage.documentWitness,'Uložený bonusový Melee není aktuální');
 const seq=validateEncounterSequence(document.combatRuntime?.sequence);
 check(js(seq)===stage.sequenceWitness&&awaitingPelahnBonus(seq)?.actorId===stage.actorId,
  'Zastaralá nebo neexistující druhá akce Hyper Burstu');
 const verified=preparePelahnBonusMelee({id:stage.id,document,sourceSignature:stage.sourceSignature,
  gmConfirmed:true,...stage.inputs});
 check(js(verified)===js(stage),'Bonusový Melee má změněný zdroj, zbraně nebo živý stav');
 check(js(replayPelahnBonusMelee(verified,transcript))===js(attackSession),
  'Podvržený výsledek fyzických hodů nebo obrany Melee');
 check(attackSession.phase==='hit'&&attackSession.hitSession&&
  attackSession.finalAttack?.attackerMishap==null&&
  attackSession.finalAttack?.defenderMishap==null&&
  !attackSession.finalAttack?.counterStrike&&!attackSession.finalAttack?.weaponDamageCheck&&
  !attackSession.weaponDamageSession,
  'Bonus Melee s Mishap/Counterstrike/Weapon Damage vyžaduje jiný povinný průchod');
 const target=document.characters.find(c=>c.id===stage.targetId);
 const resolved=completeGuidedAttack({session:attackSession,currentState:target.hmk.combatState,
  sourceSignature:stage.sourceSignature,currentInventory:document.inventory});
 const out=cp(document),victim=out.characters.find(c=>c.id===stage.targetId);
 if(resolved.strike){
  victim.hmk.combatState=cp(resolved.state);
  check(Array.isArray(victim.hmk.injuries),'Chybí trvalá anatomická evidence zranění cíle');
  for(const wound of resolved.state.wounds){
   const copies=victim.hmk.injuries.filter(x=>x.id===wound.id);
   check(copies.length<=1&&(copies.length===0||copies[0].combatRecord===true),
    'Bonus Melee: kolize ID rány s neautoritativní anatomickou evidencí');
   if(copies.length)Object.assign(copies[0],cp(wound),{combatRecord:true});
   else victim.hmk.injuries.push({...cp(wound),combatRecord:true});
  }
 }
 const due=dueInjuryMorale(victim.hmk.combatState);
 check(due.length===Object.keys(injuryMoraleRolls).length&&
  Object.keys(injuryMoraleRolls).every(id=>due.some(w=>w.woundId===id)),
  'Bonus Melee: doložte každou bezprostřední Injury Morale');
 if(due.length){
  const initiative=target.hmk.skills.filter(s=>String(s.name).toLowerCase()==='initiative');
  check(initiative.length===1&&int(initiative[0].ml,0,200),'Chybí skutečná Initiative ML cíle');
  for(const w of due){
   const ev=injuryMoraleRolls[w.woundId];
   check(ev&&int(ev.roll,1,100)&&int(ev.aberrance,0,200),'Morale vyžaduje fyzický d100 a známou Aberrance');
   victim.hmk.combatState=applyConfirmedInjuryMorale({state:victim.hmk.combatState,
    round:seq.round,eventId:`${stage.id}:morale:${w.woundId}`,woundId:w.woundId,
    initiativeML:initiative[0].ml,roll:ev.roll,aberrance:ev.aberrance,
    timelineId:seq.timelineId,gmConfirmed:true}).state;
  }
 }
 check(!dueInjuryMorale(victim.hmk.combatState).length&&
  !unresolvedInjuryMishaps(victim.hmk.combatState).length,
  'Neuzavřené Injury Morale / Mishap nelze obejít bonusovým END');
 const sequence=cp(seq);
 sequence.log.push({type:'pelahn-bonus-melee-hit',sourceEventId:selectedBonusSource(seq).id,
  eventId:stage.id,linkedAttack:attackSession.id,actorId:stage.actorId,targetId:stage.targetId,
  round:seq.round,injury:resolved.strike,physicalDice:cp(attackSession.hitSession.physicalDice),
  gmEnteredDice:true});
 out.combatRuntime.sequence=validateEncounterSequence(sequence);
 const finished=composePelahnBonusEnd({document:out,ENDD100,extraAction:'attack',gmConfirmed:true});
 const log=finished.document.combatRuntime.sequence.log.at(-1);
 check(log.type==='pelahn-bonus-resolved'&&log.extraAction==='attack',
  'Melee musí bezprostředně předcházet fyzickému END');
 log.linkedAttack=attackSession.id;log.attackEventId=stage.id;
 check(!finished.document.journal.some(j=>j.id==='pelahn-melee:'+stage.id),'Duplicitní Melee');
 finished.document.journal.push({id:'pelahn-melee:'+stage.id,characterId:stage.actorId,
  createdAt:new Date().toISOString(),title:'Pèleáhn Hyper Burst · druhý Melee Attack',
  body:`Fyzický Melee a povinný END d100=${ENDD100} v kole ${seq.round}; jediná transakce`,
  combatProof:{actionKind:'pelahn-bonus-melee',sourceEventId:selectedBonusSource(seq).id,
   linkedAttack:attackSession.id,physicalDice:cp(attackSession.hitSession.physicalDice),
   END:cp(finished.evidence),transcript:cp(transcript)}});
 return save(document,finished.document,{storage,key,baseline});
}

/** HMK pp.163-170,204. Second physical Missile shot through the existing
 * Missile/Hit journey and the same verified one-document checkpoint as Melee.
 * Restricted to a genuinely prepared bow/crossbow/sling, a stationary directly
 * designated human target, and explicitly confirmed calm and clear conditions.
 * Thrown/displaced/Volley/Mishap/Morale unresolved combinations are refused,
 * never silently approximated. The prepared projectile is consumed EXACTLY ONCE
 * in the same checkpoint as the wound and mandatory END.
 */
export function preparePelahnBonusMissile({id,document,targetId,weaponId,skillId,
 attackerUsedArms='both',sourceSignature,targetMovement='still',windforce=0,crosswind=false,
 movingShooter=false,crossbowBasis=null,conditionsConfirmed=false,gmConfirmed=false}={}){
 check(gmConfirmed===true&&conditionsConfirmed===true&&typeof id==='string'&&id&&id.length<=150&&
  typeof sourceSignature==='string'&&sourceSignature,'Bonus Missile potřebuje konkrétní potvrzení GM');
 const seq=validateEncounterSequence(document?.combatRuntime?.sequence),due=awaitingPelahnBonus(seq);
 check(due&&seq.order.includes(targetId)&&targetId!==due.actorId,
  'Druhá Missile nemá živého aktéra nebo skutečný cíl');
 check(!['concentrate-start','concentrate-hold','ready'].includes(due.regularAction),
  'Rozpracovaná koncentrace/Readied nedovoluje bez ověřené mechaniky další Missile');
 const actor=document.characters?.find(c=>c.id===due.actorId),target=document.characters?.find(c=>c.id===targetId);
 check(actor?.hmk?.combatState&&target?.hmk?.combatState,'Chybí aktuální stav střelce nebo cíle');
 validateCombatState(actor.hmk.combatState);validateCombatState(target.hmk.combatState);
 check(!['afraid','terrified','catatonic'].includes(actor.hmk.combatState.fear?.state),
  'Fear nedovoluje druhý Missile/Thrown Attack');
 check(combatFatigueTotals(actor.hmk.combatState).total<moveOf(document,actor,seq),
  'Fatigue >= Move: další Missile nepovolena, END zůstává povinný');
 check(dueEncounterEvents(seq,Object.fromEntries(document.characters.map(c=>[c.id,c.hmk?.combatState]))).length===0,
  'Nejprve je nutné vyřešit povinné Shock/Morale/Mishap');
 check(actor.hmk.combatState.shock==='NONE'&&!actor.hmk.combatState.coma?.active&&
  !actor.hmk.combatState.posture?.passNextTurn&&!actor.hmk.combatState.pendingManeuver&&
  !(actor.hmk.combatState.mishaps??[]).some(x=>!x.resolved),
  'Aktér má povinný stav bránící další střelbě');
 const actualItems=document.inventory?.filter(i=>i.id===weaponId&&i.characterId===actor.id)??[];
 check(actualItems.length===1,'Zbraň nemá jednoznačnou vlastnickou evidenci');
 const actualItem=actualItems[0];
 const type=actualItem.snapshot?.properties?.missileType??
  actualItem.snapshot?.properties?.verifiedModes?.[0]?.missileType;
 check(['bow','crossbow','sling','thrown'].includes(type),
  'Druhá Missile podporuje jen skutečně doložený Missile/Thrown mode');
 check(type!=='crossbow'||['ml','sb3'].includes(crossbowBasis),
  'Kuše potřebuje výslovnou volbu ML nebo Archery SB × 3');
 check(['still','moving'].includes(targetMovement)&&int(windforce,0,4)&&
  typeof crosswind==='boolean'&&typeof movingShooter==='boolean',
  'Pohyblivý, Evading nebo větrný stav vyžaduje skutečný ověřený profil; Evading zatím není doložen');
 const thrown=type==='thrown';
 if(thrown)check(actualItem.quantity===1&&!actualItem.destroyed&&
  ['main_hand','off_hand'].includes(actualItem.slot)&&verifiedPrintedThrownItem(actualItem),
  'Vrh vyžaduje jedinou drženou skutečnou zbraň s ověřeným HMK printed Throwing Mode');
 const loaded=thrown?null:requireLoadedMissile({sequence:seq,inventory:document.inventory,actorId:actor.id,weaponId});
 const a=seq.spatialUnits?.find(x=>x.id===actor.id),t=seq.spatialUnits?.find(x=>x.id===target.id);
 check(xy(a)&&xy(t),'Chybí skutečné pozice střelce a cíle');
 const distance=Math.hypot(a.x-t.x,a.y-t.y);
 check(distance>0&&Number.isSafeInteger(distance),'Nepřesně určená vzdálenost střely v ft');
 const inputs={targetId,weaponId,skillId,attackerUsedArms,conditionsConfirmed,
  targetMovement,windforce,crosswind,movingShooter,crossbowBasis};
 const {session}=createLiveGuidedMissile({id:id+':attack',timelineId:seq.timelineId,round:seq.round,
  attacker:actor,defender:target,weaponId,skillId,inventory:document.inventory,sourceSignature,
  direction:'front',opponents:1,aimZN:1,distance,targetMovement,potentialTargets:[],
  targetCount:0,nearbyTargetCount:0,windforce,crosswind,movingShooter,
  attackerUsedArms,crossbowBasis:type==='crossbow'?crossbowBasis:null,
  loadedProjectile:loaded?.loaded??null,
  aimBonus:verifiedMissileAimBonus({sequence:seq,inventory:document.inventory,actorId:actor.id,weaponId})});
 check(session.kind==='missile'&&session.missile?.forcedCF!==true&&
  session.missile?.chargingThrow!==true,'Další automatické Missile Mishaps nejsou uzavřeny');
 return {format:'hmk-pelahn-bonus-missile-stage-v1',id,actorId:actor.id,targetId,
  sourceEventId:selectedBonusSource(seq).id,round:seq.round,sourceSignature,documentWitness:js(document),
  sequenceWitness:js(seq),inputs:cp(inputs),loadedWitness:js(loaded),attack:session};
}
export function replayPelahnBonusMissile(stage,transcript){
 check(stage?.format==='hmk-pelahn-bonus-missile-stage-v1'&&Array.isArray(transcript)&&
  transcript.length>0&&transcript.length<=170,'Chybí kompletní fyzický Missile transcript');
 let s=stage.attack;
 for(const ev of transcript){
  const req=guidedAttackRequirement(s);
  check(req.id===ev?.id&&req.kind===ev.kind,'Změněný nebo podvržený Missile krok');
  if(req.kind==='die'){check(int(ev.value,1,req.faces),'Chybná kostka Missile');s=submitGuidedAttackDie(s,ev.value);}
  else if(req.kind==='choice')s=chooseGuidedAttack(s,ev.value);
  else if(req.kind==='automatic'){
   const next=advanceGuidedAttack(s);check(js(next)!==js(s),'Neukončený automatický Missile krok');s=next;
  }else throw Error('Missile: další povinný fakt nebo mechanika není plně doložena');
 }
 check(guidedAttackRequirement(s).kind==='complete','Druhá Missile ještě není kompletní');
 return s;
}
export function persistPelahnExtraMissile({stage,attackSession,transcript,document,ENDD100,
 injuryMoraleRolls={},gmConfirmed=false,storage,key,baseline}={}){
 check(gmConfirmed===true&&stage?.format==='hmk-pelahn-bonus-missile-stage-v1'&&
  js(document)===stage.documentWitness,'Zastaralý nebo změněný bonus Missile');
 const seq=validateEncounterSequence(document.combatRuntime?.sequence);
 check(js(seq)===stage.sequenceWitness&&awaitingPelahnBonus(seq)?.actorId===stage.actorId,
  'Není splatná původní druhá Missile');
 const verified=preparePelahnBonusMissile({id:stage.id,document,sourceSignature:stage.sourceSignature,
  gmConfirmed:true,...stage.inputs});
 check(js(verified)===js(stage),'Zdrojový stav, zbraň, střela nebo časování se změnily');
 check(js(replayPelahnBonusMissile(verified,transcript))===js(attackSession),
  'Neodpovídá znovu odehraný fyzický Missile průchod');
 check(attackSession.kind==='missile'&&attackSession.phase==='hit'&&attackSession.hitSession&&
  attackSession.finalAttack?.attackType==='direct'&&
  attackSession.finalAttack?.actualTargetId===stage.targetId&&
  !attackSession.finalAttack?.forcedCF&&
  !attackSession.finalAttack?.deviation&&
  !attackSession.finalAttack?.chosenTargetIndex&&
  !attackSession.finalAttack?.mishaps?.length&&
  !attackSession.finalAttack?.forcedMishaps?.length,
  'Volley, jiný skutečný cíl či povinné Missile Mishaps vyžadují plný samostatný průchod');
 const target=document.characters.find(c=>c.id===stage.targetId);
 const resolved=completeGuidedAttack({session:attackSession,currentState:target.hmk.combatState,
  sourceSignature:stage.sourceSignature,currentInventory:document.inventory});
 const out=cp(document),victim=out.characters.find(c=>c.id===stage.targetId);
 if(resolved.strike){
  victim.hmk.combatState=cp(resolved.state);
  check(Array.isArray(victim.hmk.injuries),'Chybí trvalá anatomická evidence zranění');
  for(const wound of resolved.state.wounds){
   const copies=victim.hmk.injuries.filter(x=>x.id===wound.id);
   check(copies.length<=1&&(copies.length===0||copies[0].combatRecord===true),
    'Kolize zranění Missile s neautoritativní evidencí');
   if(copies.length)Object.assign(copies[0],cp(wound),{combatRecord:true});
   else victim.hmk.injuries.push({...cp(wound),combatRecord:true});
  }
 }
 const due=dueInjuryMorale(victim.hmk.combatState);
 check(due.length===Object.keys(injuryMoraleRolls).length&&
  Object.keys(injuryMoraleRolls).every(id=>due.some(w=>w.woundId===id)),
  'Missile: chybí okamžitá Injury Morale');
 if(due.length){
  const initiative=target.hmk.skills.filter(s=>String(s.name).toLowerCase()==='initiative');
  check(initiative.length===1&&int(initiative[0].ml,0,200),'Cíl nemá doloženou Initiative ML');
  for(const w of due){const ev=injuryMoraleRolls[w.woundId];
   check(ev&&int(ev.roll,1,100)&&int(ev.aberrance,0,200),'Chybí fyzický hod Morale');
   victim.hmk.combatState=applyConfirmedInjuryMorale({state:victim.hmk.combatState,
    round:seq.round,eventId:`${stage.id}:morale:${w.woundId}`,woundId:w.woundId,
    initiativeML:initiative[0].ml,roll:ev.roll,aberrance:ev.aberrance,
    timelineId:seq.timelineId,gmConfirmed:true}).state;
  }
 }
 check(!dueInjuryMorale(victim.hmk.combatState).length&&
  !unresolvedInjuryMishaps(victim.hmk.combatState).length,'Nedokončený Injury/Mishap');
 const usedWeapon=document.inventory.find(i=>i.id===stage.inputs.weaponId&&i.characterId===stage.actorId);
 const isThrow=usedWeapon.snapshot.properties.missileType==='thrown';
 const consumed=isThrow?null:consumeLoadedMissile({sequence:seq,inventory:document.inventory,
  actorId:stage.actorId,weaponId:stage.inputs.weaponId});
 const fired=isThrow?cp(seq):consumed.sequence;
 if(isThrow){
  const items=out.inventory.filter(i=>i.id===stage.inputs.weaponId&&i.characterId===stage.actorId);
  check(items.length===1&&items[0].quantity===1&&['main_hand','off_hand'].includes(items[0].slot)&&
   verifiedPrintedThrownItem(items[0]),'Vrženou zbraň nelze dodatečně najít v ruce');
  items[0].slot='none';
  fired.log.push({type:'pelahn-bonus-thrown-discharge',sourceEventId:selectedBonusSource(seq).id,
   round:seq.round,actorId:stage.actorId,weaponId:items[0].id,
   eventId:stage.id+':discharge',oldSlot:usedWeapon.slot,newSlot:'none',
   targetId:stage.targetId,gmConfirmed:true});
 }
 fired.log.push({type:'pelahn-bonus-missile-hit',sourceEventId:selectedBonusSource(seq).id,
  eventId:stage.id,linkedAttack:attackSession.id,actorId:stage.actorId,targetId:stage.targetId,
  round:seq.round,injury:resolved.strike,physicalDice:cp(attackSession.hitSession.physicalDice),gmEnteredDice:true});
 out.combatRuntime.sequence=validateEncounterSequence(fired);
 const finished=composePelahnBonusEnd({document:out,ENDD100,extraAction:'attack',gmConfirmed:true});
 const last=finished.document.combatRuntime.sequence.log.at(-1);
 check(last.type==='pelahn-bonus-resolved'&&last.extraAction==='attack',
  'Missile a END musí vytvořit souvislý atomický důkaz');
 last.linkedAttack=attackSession.id;last.missileEventId=stage.id;
 check(!finished.document.journal.some(j=>j.id==='pelahn-missile:'+stage.id),'Duplicitní druhá Missile');
 finished.document.journal.push({id:'pelahn-missile:'+stage.id,characterId:stage.actorId,
  createdAt:new Date().toISOString(),title:'Pèleáhn Hyper Burst · druhý Missile Attack',
  body:`Fyzický ${isThrow?'Thrown':'Missile'}, ${isThrow?'odebrání vržené zbraně z ruky':'spotřeba připravené střely'} a fyzický END d100=${ENDD100}; jediný commit`,
  combatProof:{actionKind:'pelahn-bonus-missile',sourceEventId:selectedBonusSource(seq).id,
   linkedAttack:attackSession.id,ammoLoadEventId:consumed?.spent.loadEventId??null,
   thrownItemId:isThrow?stage.inputs.weaponId:null,
   physicalDice:cp(attackSession.hitSession.physicalDice),transcript:cp(transcript),END:cp(finished.evidence)}});
 return save(document,finished.document,{storage,key,baseline});
}

/** HMK pp.161, 200–202, 204: limited second Incant option: the
 * confirmed spellstart of a KNOWN two-round Doom Flame. This schedules the
 * original concentration commitment; future spellfire remains in the
 * authoritative guided Doom Flame flow with physical casting dice. Generic
 * spells, invocations, alternate time, and second spellfire are NOT guessed.
 */
export function persistPelahnBonusIncantStart({document,spell,ENDD100,gmConfirmed=false,
 conditionsConfirmed=false,storage,key,baseline}={}){
 check(gmConfirmed===true&&conditionsConfirmed===true,
  'Spellstart musí potvrdit GM se známým Doom Flame a normálním gestem/cantem');
 const seq=validateEncounterSequence(document?.combatRuntime?.sequence),due=awaitingPelahnBonus(seq);
 check(due&&due.regularAction!=='incant'&&!String(due.regularAction).startsWith('concentrate-'),
  'Z téhož IR nelze vyvolat druhé Incant');
 const mage=document.characters.find(x=>x.id===due.actorId);
 check(mage?.hmk?.arcane?.primaryConvocation==='Pèleáhn','Chybí doložený Primary Pèleáhn');
 check(!['afraid','terrified','catatonic'].includes(mage.hmk.combatState?.fear?.state),
  'Fear nedovoluje druhý Incant');
 const descriptor=requirePelahnBonusIncantSpell(mage,spell);
 check(mage.hmk.arcane.verifiedGestureEncumbrance===0&&
  !mage.hmk.arcane.auralShockLevels&&!mage.hmk.arcane.activeMisfireWarp&&
  mage.hmk.combatState.wounds.length===0,
  'Nedoložené podmínky Doom Flame Incant / Aural Shock');
 const states=Object.fromEntries(document.characters.map(c=>[c.id,c.hmk?.combatState]));
 const prepared=beginPelahnBonusConcentration(seq,states,{actorId:mage.id,
  durationRounds:descriptor.castingTimeRounds,gmConfirmed:true});
 const started=prepared.log.at(-1);
 check(started?.type==='pelahn-bonus-incant-spellstart','Chybí spellstart připojený ke společnému plánovači');
 started.spell=descriptor.name;
 const out=cp(document);
 out.combatRuntime.sequence=prepared;
 const end=composePelahnBonusEnd({document:out,extraAction:'incant',ENDD100,gmConfirmed:true});
 const last=end.document.combatRuntime.sequence.log.at(-1);
 check(last.type==='pelahn-bonus-resolved'&&last.extraAction==='incant',
  'Spellstart a fyzický END musí být spojený checkpoint');
 last.spell=descriptor.name;last.concentrationCompletionRound=seq.round+descriptor.castingTimeRounds;
 end.document.journal.push({id:`pelahn-spellstart:${selectedBonusSource(seq).id}:${seq.round}:${mage.id}`,
  characterId:mage.id,createdAt:new Date().toISOString(),
  title:`Pèleáhn Hyper Burst · druhý Incant (${descriptor.name} spellstart)`,
  body:`Ověřené zahájení ${descriptor.castingTimeRounds}-round koncentrace; spellfire v kole ${seq.round+descriptor.castingTimeRounds}; fyzický END ${ENDD100}`,
  combatProof:{actionKind:'pelahn-bonus-incant-spellstart',sourceEventId:selectedBonusSource(seq).id,
   spell:descriptor.name,durationRounds:descriptor.castingTimeRounds,
   resolver:descriptor.spellfireResolver,printedPage:descriptor.printedPage,END:cp(end.evidence)}});
 return save(document,end.document,{storage,key,baseline});
}
/** Backwards-compatible invocation of the verified Doom Flame spellstart.
 * The general spellstart dispatcher above is the single authoritative route.
 */
export function persistPelahnBonusDoomFlameStart(args={}){
 return persistPelahnBonusIncantStart({...args,spell:'Doom Flame'});
}

/** Execute a second physical MOVE after the actor's already completed regular
 * action. This is NOT a second ordinary Initiative turn: it is one durable
 * Hyper Burst spatial event and its required END test, committed together.
 * Only half/full Move without further Stumble, Charge or attack is supported;
 * a pending combat obligation must never be silently skipped.
 */
export function persistPelahnExtraMove({document,storage,key,baseline,battlefield,path,
 moveRate='half',difficultSources=0,ENDD100,gmConfirmed=false}={}){
 check(gmConfirmed===true,'Hyper Burst Move potřebuje přímé potvrzení GM');
 const seq=validateEncounterSequence(document?.combatRuntime?.sequence),due=awaitingPelahnBonus(seq);
 check(due&&int(ENDD100,1,100),'Není splatný bonusový Move a skutečný END d100');
 const c=document.characters.find(x=>x.id===due.actorId),s=c?.hmk?.combatState;
 check(s,'Chybí autoritativní stav aktéra');validateCombatState(s);
 check(!['afraid','terrified','catatonic'].includes(s.fear?.state),
  'Bonusový Move při Fear vyžaduje ověřený ústup od zdroje; nepodporovaný průchod je blokován');
 check(dueEncounterEvents(seq,Object.fromEntries(document.characters.map(x=>[x.id,x.hmk?.combatState]))).length===0,
  'Hyper Burst nesmí obejít splatné Injury/Mishap/Morale');
 const fatigue=combatFatigueTotals(s).total,base=moveOf(document,c,seq),END=c.hmk.attributes?.end;
 check(int(END,1,40)&&fatigue<base,'Fatigue >= Move: druhá akce není přípustná, ale END test zůstává povinný');
 check(s.shock==='NONE'&&!s.coma?.active&&s.posture?.passNextTurn!==true&&
  ['steady','brave'].includes(s.morale?.state??'steady')&&!s.pendingManeuver&&
  !(s.mishaps??[]).some(m=>!m.resolved),'Druhá akce Move: povinný stav postavy brání pohybu');
 check(['half','full'].includes(moveRate),'Bonusový Double Move vyžaduje samostatný END/Stumble průchod');
 check(battlefield&&Array.isArray(battlefield.units)&&battlefield.units.length===seq.order.length&&
  seq.order.every(id=>battlefield.units.filter(x=>x.id===id).length===1&&
   seq.spatialUnits?.some(y=>y.id===id&&xDist(y,battlefield.units.find(x=>x.id===id))<1e-7)),
  'Mapa nesouhlasí s trvalou Initiative');
 check(JSON.stringify(battlefield.barriers??[])===JSON.stringify(seq.spatialBarriers??[]),
  'Neověřené překážky během bonusového Move');
 const projection=projectGuidedSpatialPath({actorId:c.id,battlefield,path,action:'move',moveRate,
  difficultSources,effectiveMove:effectiveMoveOf(document,c,seq),stunned:false});
 check(!projection.requiresStumble&&!projection.stoppedByEZ&&
  Math.abs(projection.actualFt-projection.requestedFt)<1e-7,
  'Bonusový Move: trasa překročila Move limit nebo vyžaduje další Stumble / kontakt s nepřítelem');
 const evidence=previewPelahnHyperBurstTurn({burst:selectedBonusSource(seq),round:seq.round,
  actorId:c.id,actorPosition:due.position,afterRegularAction:true,regularAction:due.regularAction,
  extraAction:'move',fatigueBefore:fatigue,move:base,END,ENDD100,gmConfirmed:true});
 const out=cp(document),next=cp(seq);
 const eventId=`${selectedBonusSource(seq).id}:bonus-move:${seq.round}:${c.id}`;
 check(!next.spatialEvents?.some(x=>x.id===eventId)&&!out.journal.some(x=>x.id==='pelahn:'+eventId),
  'Duplicitní bonusový prostorový zápis');
 next.spatialUnits=next.spatialUnits.map(u=>u.id===c.id?{...u,x:projection.finalPosition.x,y:projection.finalPosition.y}:u);
 next.spatialEvents??=[];
 next.spatialEvents.push({id:eventId,round:seq.round,actorId:c.id,timelineId:seq.timelineId,
  projection:cp(projection),pelahnBonus:true,sourceEventId:selectedBonusSource(seq).id});
 next.log.push({type:'spatial-action',actorId:c.id,round:seq.round,eventId,action:'move',
  actualFt:projection.actualFt,hyperBurstBonus:true});
 next.log.push({type:'pelahn-bonus-resolved',sourceEventId:selectedBonusSource(seq).id,actorId:c.id,
  round:seq.round,regularAction:due.regularAction,extraAction:'move',spatialEventId:eventId,
  ENDD100,ENDSL:evidence.ENDSL,wearinessAdded:evidence.wearinessAdded,gmEnteredDice:true});
 out.combatRuntime.sequence=validateEncounterSequence(next);
 const actor=out.characters.find(x=>x.id===c.id);
 if(evidence.wearinessAdded)actor.hmk.combatState=applyConfirmedFatigue({state:actor.hmk.combatState,
  round:seq.round,eventId:`${selectedBonusSource(seq).id}:end:${seq.round}:${c.id}`,
  kind:'weariness',delta:evidence.wearinessAdded}).state;
 out.journal.push({id:'pelahn:'+eventId,characterId:c.id,createdAt:new Date().toISOString(),
  title:`Pèleáhn Hyper Burst Move · kolo ${seq.round}`,
  body:`Bonusový Move ${projection.actualFt} ft; END d100 ${ENDD100}; Weariness +${evidence.wearinessAdded}`,
  combatProof:{actionKind:'pelahn-bonus-move',sourceEventId:selectedBonusSource(seq).id,
   physicalDice:cp(evidence.physicalDice),projection:cp(projection),ENDSL:evidence.ENDSL,
   wearinessAdded:evidence.wearinessAdded}});
 return save(document,out,{storage,key,baseline});
}
function xDist(a,b){return b?Math.hypot(a.x-b.x,a.y-b.y):Infinity;}
