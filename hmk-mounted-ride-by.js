/** HMK p172: shared-IR ride-by Melee with one movement+injury checkpoint.
 * Conservatively supports an unthreatened path, single mounted rider strike,
 * no unresolved Mishap / optional Press / TA, and an up-front verified Control.
 * Other outcomes FAIL CLOSED rather than inventing mounted combat rules.
 */
import {createLiveGuidedMelee} from './hmk-guided-live-attack-inputs.js';
import {completeGuidedAttack,guidedAttackRequirement,chooseGuidedAttack,submitGuidedAttackDie,advanceGuidedAttack} from './hmk-guided-attack-journey.js';
import {prepareMountedSharedMove} from './hmk-mounted-shared-turn.js';
import {mountedPenalty,riderImpactAtRound} from '../rules/mounted.js';
import {applyConfirmedMountedCharge} from './hmk-combat-aftereffects.js';
import {validateEncounterSequence,recordScheduledHitCommit,finishEncounterTurn,startEncounterTurn,currentEncounterActor} from './encounter-turn-sequence.js';
import {dueInjuryMorale,applyConfirmedInjuryMorale,validateCombatState} from './persistent-combat-state.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
import {stageTrustedMoralePsycheSources} from './hmk-morale-psyche-bridge.js';
const check=(x,m)=>{if(!x)throw Error(m)};const js=JSON.stringify,cp=structuredClone;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function segmentDistance(q,a,b){const vx=b.x-a.x,vy=b.y-a.y,len=vx*vx+vy*vy;
 const t=len>0?Math.max(0,Math.min(1,((q.x-a.x)*vx+(q.y-a.y)*vy)/len)):0;
 return dist(q,{x:a.x+t*vx,y:a.y+t*vy});}
function liveStates(doc){return Object.fromEntries(doc.characters.map(c=>[c.id,c.hmk?.combatState]));}
/** Prepare both the real movement and the real Melee session before any die. */
export function prepareMountedRideBy({id,document,riderId,mountId,targetId,battlefield,path,
 declaredDistanceFt,previousRate,newRate,controlEventId,
 attackerWeaponId,defenderWeaponId,attackerSkillId,defenderSkillId,
 attackerUsedArms='right',defenderUsedArms='right',attackerFoes=1,defenderFoes=1,
 aimZN=1,direction='front',opponents=1,sourceSignature,gmConfirmed=false}={}){
 const seq=validateEncounterSequence(document?.combatRuntime?.sequence);
 const characters=document.characters,states=liveStates(document);
 const rider=characters.find(c=>c.id===riderId),mount=characters.find(c=>c.id===mountId),target=characters.find(c=>c.id===targetId);
 check(rider&&mount&&target&&new Set([riderId,mountId,targetId]).size===3&&aimZN===1,
  'Ride-by: doložte skutečného jezdce, mounta a jiného protivníka, bez nezajištěného Reach aim');
 const stage=prepareMountedSharedMove({id,sequence:seq,states,rider,mount,battlefield,path,declaredDistanceFt,
  previousRate,newRate,effectiveMountMove:mount.hmk.verifiedMountedMove,
  mountRiderImpact:mount.hmk.verifiedRiderImpact,controlEventId,gmConfirmed});
 const targetUnit=battlefield.units.find(u=>u.id===targetId);
 check(targetUnit&&targetUnit.foe===true&&stage.projection.actualPath.slice(1).some((p,i)=>
  segmentDistance(targetUnit,stage.projection.actualPath[i],p)<=Math.max(5,battlefield.units.find(x=>x.id===riderId).reachFt)+1e-7),
  'Ride-by nemá dosažitelný cíl podél skutečné trasy');
 check(typeof sourceSignature==='string'&&sourceSignature.length>=1,'Chybí podpis fyzické bojové posloupnosti');
 const built=createLiveGuidedMelee({id:id+':melee',timelineId:seq.timelineId,round:seq.round,
  attacker:rider,defender:target,inventory:document.inventory,sourceSignature,
  attackerWeaponId,defenderWeaponId,attackerSkillId,defenderSkillId,
  attackerUsedArms,defenderUsedArms,direction,opponents,attackerFoes,defenderFoes,aimZN});
 const melee=built.session.meleeSession;
 const penalty=mountedPenalty(rider.hmk.skills.find(x=>String(x.name).toLowerCase()==='riding').ml);
 const modified=Math.max(0,Math.min(100,melee.attackerEML+penalty));
 const weapon=built.session.weaponByActor[riderId];
 check(weapon&&Number.isSafeInteger(weapon.otherModifier??0),'Neznámý Strike Impact modifier');
 // HMK p.172: a bonus already earned by a previous shared move remains
 // active through the next round even when THIS Ride-by path is shorter.
 // The new route's independently earned impact takes priority when present.
 const prior=states[riderId]?.mountedRiderImpact;
 const priorBonus=riderImpactAtRound(prior,seq.round);
 const impact=stage.impactPreview.bonus||priorBonus;
 const effectiveImpact=stage.impactPreview.bonus>0?stage.impactPreview:
  priorBonus>0?cp(prior):stage.impactPreview;
 built.session.meleeSession={...melee,attackerEML:modified};
 built.session.weaponByActor[riderId]={...weapon,otherModifier:(weapon.otherModifier??0)+impact};
 const proof={id,format:'hmk-mounted-ride-by-stage-v1',riderId,mountId,targetId,
  movement:stage,impactAward:cp(effectiveImpact),mountedPenalty:penalty,
  sourceSignature,attack:built.session,sequenceWitness:js(seq),documentWitness:js(document),
  attackInputWitness:js({attackerWeaponId,defenderWeaponId,attackerSkillId,defenderSkillId,
   attackerUsedArms,defenderUsedArms,attackerFoes,defenderFoes,aimZN,direction,opponents})};
 return proof;
}
/** Reproduce the entire physical Melee journey from the untouched live stage.
 * A forged attackSession object, independently of valid-looking dice, is never
 * accepted as final commit authority. */
export function replayMountedRideByAttack(stage,transcript){
 check(stage?.format==='hmk-mounted-ride-by-stage-v1'&&Array.isArray(transcript)&&transcript.length>0&&transcript.length<=140,
  'Ride-by: chybí doložená posloupnost fyzických hodů a deklarací');
 let s=stage.attack;
 for(const entry of transcript){
  const req=guidedAttackRequirement(s);
  check(entry?.kind===req.kind&&entry.id===req.id,
   'Ride-by: chybějící, přeházený nebo podvržený krok Melee');
  if(req.kind==='choice')s=chooseGuidedAttack(s,entry.value);
  else if(req.kind==='die'){
   check(Number.isSafeInteger(entry.value)&&entry.value>=1&&entry.value<=req.faces,
    'Ride-by: skutečný fyzický hod nesouhlasí s požadovanou kostkou');
   s=submitGuidedAttackDie(s,entry.value);
  }else if(req.kind==='automatic'){
   const next=advanceGuidedAttack(s);
   check(js(next)!==js(s),'Ride-by: automatický krok nepostupuje');s=next;
  }else throw Error('Ride-by: tento typ kroku má samostatný povinný průvodce');
 }
 check(guidedAttackRequirement(s).kind==='complete','Ride-by: neúplné fyzické Melee hody');
 return s;
}
/** Attack is the result of REAL guided physical dice; no unadjudicated
 * compulsory effect may be skipped just because the mount also moved. */
export function finalizeMountedRideBy({stage,attackSession,transcript,document,injuryMoraleRolls={}}={}){
 check(stage?.format==='hmk-mounted-ride-by-stage-v1'&&js(document)===stage.documentWitness,
  'Zastaralé nebo neúplné Ride-by');
 const seq=validateEncounterSequence(document.combatRuntime.sequence),states=liveStates(document);
 check(js(seq)===stage.sequenceWitness,'Pořadí nebo pozice byly během útoku změněny');
 // Do not trust a mutable draft's numeric bonus, weapon, geometry or IR.
 // Re-derive the complete declaration from the current persisted document.
 const m=stage.movement,decl=JSON.parse(stage.attackInputWitness);
 const verified=prepareMountedRideBy({id:stage.id,document,riderId:stage.riderId,
  mountId:stage.mountId,targetId:stage.targetId,battlefield:JSON.parse(m.battlefieldWitness),
  path:m.projection.requestedPath,declaredDistanceFt:m.declaredDistanceFt,
  previousRate:m.previousRate,newRate:m.newRate,controlEventId:m.controlEventId,
  sourceSignature:stage.sourceSignature,gmConfirmed:true,...decl});
 check(js(verified)===js(stage),'Podvržený Rider Impact, Reach, mapa, zbraň či Mounted Control');
 check(js(replayMountedRideByAttack(stage,transcript))===js(attackSession),
  'Ride-by: výsledek fyzického Melee neodpovídá replayi deklarací, voleb a hodů');
 const clean=stage.attack;
 check(attackSession?.id===clean.id&&attackSession.kind==='melee'&&
  attackSession.attackerId===stage.riderId&&attackSession.defenderId===stage.targetId&&
  js(attackSession.inventory)===js(clean.inventory)&&
  js(attackSession.weaponByActor)===js(clean.weaponByActor)&&
  js(attackSession.meleeSession?.attackerEML)===js(clean.meleeSession?.attackerEML)&&
  attackSession.sourceSignature===stage.sourceSignature,
  'Ride-by fyzický bojový průvodce neodpovídá živé deklaraci, výstroji nebo Mounted Impact');
 check(attackSession.phase==='hit'&&attackSession.hitSession&&
  attackSession.finalAttack?.attackerMishap==null&&attackSession.finalAttack?.defenderMishap==null&&
  !attackSession.finalAttack?.weaponDamageCheck&&
  !attackSession.finalAttack?.counterStrike,
  'Ride-by vyžaduje další Mishap, Weapon Damage, TA nebo Counterstrike průvodce; nelze jej přeskočit');
 const targetState=states[stage.targetId];
 const resolved=completeGuidedAttack({session:attackSession,currentState:targetState,
  sourceSignature:stage.sourceSignature,currentInventory:document.inventory});
 const nextStates={...states};if(resolved.strike)nextStates[stage.targetId]=resolved.state;
 const due=dueInjuryMorale(nextStates[stage.targetId]);
 check(due.length===Object.keys(injuryMoraleRolls).length&&
  Object.keys(injuryMoraleRolls).every(w=>due.some(x=>x.woundId===w)),
  'Ride-by: doložte každou právě splatnou Injury Morale samostatným fyzickým d100');
 const target=document.characters.find(c=>c.id===stage.targetId);
 const init=target.hmk.skills.filter(x=>String(x.name).trim().toLowerCase()==='initiative');
 check(init.length===1&&Number.isSafeInteger(init[0].ml),'Ride-by: chybí skutečná Initiative ML zasaženého');
 for(const d of due){
  const evidence=injuryMoraleRolls[d.woundId];
  check(evidence&&Number.isSafeInteger(evidence.roll)&&evidence.roll>=1&&evidence.roll<=100&&
   Number.isSafeInteger(evidence.aberrance)&&evidence.aberrance>=0&&evidence.aberrance<=200,
   'Ride-by Injury Morale: chybí fyzický d100 nebo doložená Aberrance');
  nextStates[stage.targetId]=applyConfirmedInjuryMorale({state:nextStates[stage.targetId],
   round:seq.round,eventId:`${stage.id}:morale:${d.woundId}`,woundId:d.woundId,
   initiativeML:init[0].ml,roll:evidence.roll,aberrance:evidence.aberrance,
   timelineId:seq.timelineId,gmConfirmed:true}).state;
 }
 // Physical route, Control and the attached Melee are all proven now.
 // Only THIS atomic route may award the p172 same-turn + next-round impact.
 const mount=document.characters.find(c=>c.id===stage.mountId);
 const priorImpact=nextStates[stage.riderId].mountedRiderImpact;
 const fromPrior=stage.movement.impactPreview.bonus===0&&
  riderImpactAtRound(priorImpact,seq.round)>0;
 if(fromPrior){
  check(js(priorImpact)===js(stage.impactAward),
   'Rider Impact z předchozího kola nebyl nezávisle ověřen');
 }else{
  const awarded=applyConfirmedMountedCharge({state:nextStates[stage.riderId],round:seq.round,
   eventId:stage.id+':rider-impact',mountRiderImpact:mount.hmk.verifiedRiderImpact,
   straightDistanceFt:stage.movement.straightDistanceFt,gmConfirmed:true});
  check(js(awarded.result)===js(stage.impactAward),'Trvalý Rider Impact nesouhlasí s ověřenou dráhou');
  nextStates[stage.riderId]=awarded.state;
 }
 for(const id of [stage.riderId,stage.mountId,stage.targetId]){
  const state=nextStates[id];validateCombatState(state);
  check(dueInjuryMorale(state).length===0&&!state.mishaps?.some(x=>!x.resolved),
   'Splatné povinné následky musí být dokončeny před společným zápisem');
 }
 let next=recordScheduledHitCommit(seq,{actorId:stage.riderId,states,gmConfirmed:true});
 next=finishEncounterTurn(next,nextStates,{action:'attack',gmConfirmed:true});
 check(!next.pendingEndTurnAction,'Nedokončené následky na konci jezdcova tahu');
 next=startEncounterTurn(next,nextStates);
 check(currentEncounterActor(next)===stage.mountId,'Mount musí jednat na následujícím shodném IR');
 next=finishEncounterTurn(next,nextStates,{action:'move',gmConfirmed:true});
 check(!next.pendingEndTurnAction,'Nedokončené následky tahu mounta');
 const mv=stage.movement;
 next.spatialUnits=next.spatialUnits.map(u=>[stage.riderId,stage.mountId].includes(u.id)?
  {...u,x:mv.projection.finalPosition.x,y:mv.projection.finalPosition.y}:u);
 next.spatialEvents??=[];next.spatialEvents.push({id:stage.id,actorId:stage.mountId,riderId:stage.riderId,
  round:mv.round,timelineId:mv.timelineId,projection:cp(mv.projection),linkedAttack:attackSession.id});
 next.log.push({type:'mounted-ride-by',eventId:stage.id,round:mv.round,actorId:stage.riderId,
  mountId:stage.mountId,targetId:stage.targetId,linkedAttack:attackSession.id,
  moveRate:mv.newRate,
  riderImpact:cp(stage.impactAward),mountedPenalty:stage.mountedPenalty,
  movementFeet:mv.projection.actualFt,attackStrike:resolved.strike,
  physicalDice:cp(attackSession.hitSession.physicalDice)});
 return {format:'hmk-mounted-ride-by-plan-v1',sequence:validateEncounterSequence(next),
  targetId:stage.targetId,targetState:resolved.strike?cp(nextStates[stage.targetId]):null,
  riderId:stage.riderId,riderState:cp(nextStates[stage.riderId]),
  riderImpact:cp(stage.impactAward),sourceEventId:stage.id,
  attackId:attackSession.id,physicalDice:cp(attackSession.hitSession.physicalDice),
  transcript:cp(transcript),
  injuryMoraleRolls:cp(injuryMoraleRolls)};
}
export function persistMountedRideBy({stage,attackSession,transcript,injuryMoraleRolls={},plan,document,storage,key,baseline}={}){
 check(stage?.format==='hmk-mounted-ride-by-stage-v1'&&plan?.format==='hmk-mounted-ride-by-plan-v1',
  'Neověřený Ride-by transakční plán');
 const fresh=finalizeMountedRideBy({stage,attackSession,transcript,document,injuryMoraleRolls});
 check(js(fresh)===js(plan),'Ride-by plán nesouhlasí s pravidlovým přepočtem');
 const out=cp(document);out.combatRuntime.sequence=cp(fresh.sequence);
 out.combatRuntime.clock={round:fresh.sequence.round,actorId:currentEncounterActor(fresh.sequence)||''};
 check(fresh.riderState?.mountedRiderImpact&&
  riderImpactAtRound(fresh.riderState.mountedRiderImpact,stage.movement.round)===stage.impactAward.bonus,
  'Chybí trvalá platnost bonusu pro jezdce');
 out.characters.find(c=>c.id===fresh.riderId).hmk.combatState=cp(fresh.riderState);
 if(fresh.targetState){
  const c=out.characters.find(c=>c.id===fresh.targetId),s=fresh.targetState;
  c.hmk.combatState=cp(s);
  for(const w of s.wounds){const prior=c.hmk.injuries.find(x=>x.id===w.id&&x.combatRecord);
   if(prior)Object.assign(prior,{level:w.level,severity:w.severity,location:w.location});
   else if(!c.hmk.injuries.some(x=>x.id===w.id))c.hmk.injuries.push({...cp(w),combatRecord:true});}
 }
 // Rider Impact has already been earned in the same CAS; its duration is
 // stored on the rider with an explicit source event and round bound.
 for(const id of [stage.riderId,stage.mountId,stage.targetId]){
  const jid=`mounted-ride-by:${stage.id}:${id}`;
  check(!out.journal.some(x=>x.id===jid),'Duplicitní Ride-by journal');
  out.journal.push({id:jid,characterId:id,createdAt:new Date().toISOString(),
   title:`HMK Ride-by Attack – kolo ${stage.movement.round}`,
   body:`Mounted shared Move + fyzický Melee průchod, Rider Impact ${stage.impactAward.bonus}`,
   combatProof:{actionKind:'mounted-ride-by',sourceEventId:stage.id,linkedAttack:fresh.attackId,
    timelineId:stage.movement.timelineId,round:stage.movement.round,actorId:stage.riderId,
    riderImpact:cp(stage.impactAward),movement:cp(stage.movement.projection),
    physicalDice:cp(fresh.physicalDice)}});
 }
 stageTrustedMoralePsycheSources(document,out);
 const serialized=js(out);const r=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...r,document:r.ok?out:null,serialized:r.ok?serialized:null};
}
