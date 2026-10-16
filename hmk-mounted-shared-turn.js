/** HârnMaster: Roleplaying in the World of Kèthîra p.172.
 * Shared IR movement transaction for a rider and mount. Both advance under
 * ONE Initiative checkpoint and BOTH positions change in the same snapshot.
 * Ride-by / rider attack remains deliberately blocked unless a fully verified
 * hit journey becomes part of this same atomic transaction (not yet available).
 * No die is generated here. Verified straight movement may earn the printed
 * Rider Impact bonus on this shared Move even without an attack (p.172).
 */
import {validateEncounterSequence,currentEncounterActor,finishEncounterTurn,startEncounterTurn} from './encounter-turn-sequence.js';
import {projectGuidedSpatialPath} from './hmk-guided-spatial-actions.js';
import {deriveVerifiedMountedOverrun} from './hmk-mounted-size-overrun.js';
import {validateCombatState,applyConfirmedFatigue} from './persistent-combat-state.js';
import {applyConfirmedMountedCharge} from './hmk-combat-aftereffects.js';
import {controlEML,mountTurnDistance,riderImpactEffect} from '../rules/mounted.js';
import {successLevel,SL} from '../rules/tests.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
import {prepareMountedFallInjuryJoin} from './hmk-mounted-fall-injury-join.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
const assert=(v,m)=>{if(!v)throw Error(m)};
const same=JSON.stringify;
const cp=structuredClone;
const num=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const DIST_EPS=1e-6;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const turnAngle=(a,b)=>Math.abs(Math.atan2(Math.sin(b-a),Math.cos(b-a)))*180/Math.PI;
const rates=['stop','half','full','double'];
function liveML(c,name){const xs=c?.hmk?.skills?.filter(x=>String(x.name||'').trim().toLowerCase()===name);
 assert(xs?.length===1&&num(xs[0].ml,0,200),'Chybí aktuální jednoznačná '+name+' ML');return xs[0].ml;}
function previousMountRate(seq,mountId){
 // The animal may have acted through either shared Move OR Ride-by on the
 // preceding round. Treat the two as one chronological movement history.
 const last=[...seq.log].reverse().find(e=>
  (e.type==='mounted-shared-move'||e.type==='mounted-ride-by')&&e.mountId===mountId);
 if(!last)return 'stop';
 if(last.type==='mounted-shared-move'){
  const movement=(seq.spatialEvents??[]).find(e=>e.id===last.eventId&&
   e.actorId===mountId&&e.round===last.round&&e.sharedMounted===true&&
   e.riderId===last.riderId&&e.projection?.moveRate===last.moveRate);
  assert(rates.includes(last.moveRate)&&last.round===seq.round-1&&movement,
   'Předchozí společná rychlost nemá shodnou trvalou prostorovou událost předchozího kola');
  return last.moveRate;
 }
 const movement=(seq.spatialEvents??[]).find(e=>e.id===last.eventId&&
  e.actorId===mountId&&e.round===last.round);
 assert(movement&&rates.includes(movement.projection?.moveRate),
  'Historický Ride-by nemá doloženou rychlost z trvalé prostorové události');
 return movement.projection.moveRate;
}

/** Both riders are current Initiative participants; the mount must have its
 * own ACTUAL upcoming turn on the rider's exact IR. No hidden extra turn. */
export function prepareMountedSharedMove({id,sequence,states,rider,mount,battlefield,path,declaredDistanceFt,
 previousRate='stop',newRate='half',effectiveMountMove,mountRiderImpact,
 controlEventId,doubleMoveProof=null,fallProof=null,inventory=null,overrunRequested=false,participants=null,gmConfirmed=false}={}){
 assert(gmConfirmed===true,'GM musí potvrdit jízdní akci a skutečnou trasu');
 const seq=validateEncounterSequence(sequence);
 assert(seq.active===true&&!seq.pendingEndTurnAction&&!seq.interruptActiveId&&
  typeof id==='string'&&id.length>0&&id.length<=150&&
  currentEncounterActor(seq)===rider?.id&&mount?.id&&rider.id!==mount.id,
  'Jezdec musí právě jednat na vlastním Initiative Rank');
 assert(seq.order[seq.cursor+1]===mount.id&&seq.roster.find(x=>x.id===rider.id)?.rank===
  seq.roster.find(x=>x.id===mount.id)?.rank,
  'Jezdec a zvíře musejí mít dva bezprostředně navazující tahy na stejném IR');
 assert(!seq.log.some(e=>e.type==='mounted-shared-move'&&e.eventId===id)&&
  !seq.spatialEvents?.some(e=>e.id===id),
  'Duplicitní společná jízda');
 assert(previousRate===previousMountRate(seq,mount.id),
  'HMK p172: změna rychlosti musí vycházet ze skutečné předchozí rychlosti mounta');
 const rs=states?.[rider.id],ms=states?.[mount.id];validateCombatState(rs);validateCombatState(ms);
 assert(rs.shock==='NONE'&&ms.shock==='NONE'&&
  !rs.morale?.surrender?.active&&!ms.morale?.surrender?.active&&
  rs.morale?.state!=='routed'&&ms.morale?.state!=='routed',
  'Neschopný nebo kapitulující jezdec či zvíře nemůže zahájit řízený společný tah');
 assert(rs.mountControl?.round===seq.round&&rs.mountControl?.controlled===true,
  'V tomto kole musí předcházet úspěšný skutečný Mounted Control');
 assert(seq.freeActionTurn?.kind==='mounted-control'&&
  seq.log.some(e=>e.type==='free-action'&&e.kind==='mounted-control'&&
   e.actorId===rider.id&&e.round===seq.round&&e.token===seq.freeActionTurn.token),
  'Mounted Control musí být potvrzen také jako jediná skutečná volná akce na aktuálním IR');
 const eml=controlEML({ridingML:liveML(rider,'riding'),mountInitiativeML:liveML(mount,'initiative')});
 const control=rs.events.filter(e=>e.id===controlEventId&&e.type==='hmk-mounted-control'&&e.round===seq.round);
 assert(control.length===1&&control[0].details?.mountId===mount.id&&
  control[0].details?.eml===eml&&control[0].details?.result?.controlled===true,
  'Mounted Control není propojen s živým jezdcem a tímto zvířetem');
 assert(control[0].details?.physicalDice?.rolls?.length>=1&&
  control[0].details.physicalDice.rolls.every(d=>d.faces===100&&num(d.value,1,100)&&d.source==='GM-entered-physical-die'),
  'Control nemá skutečné fyzicky zadané hody GM');
 // Mount Move and Rider Impact are facts of the mounted creature's live
 // profile, never free numeric fields that could invent a stronger animal.
 assert(num(effectiveMountMove,0,100000)&&mount?.hmk?.verifiedMountedMove===effectiveMountMove&&
  num(mountRiderImpact,0,1000)&&mount?.hmk?.verifiedRiderImpact===mountRiderImpact,
  'Chybí shodný ověřený profil Move / Rider Impact skutečného zvířete');
 assert(rates.includes(previousRate)&&rates.includes(newRate)&&
  Math.abs(rates.indexOf(newRate)-rates.indexOf(previousRate))<=1&&['half','full','double'].includes(newRate),
  'Rychlost se může změnit nejvýše o jeden stupeň');
 assert(num(declaredDistanceFt,1,100000),'Chybí předem deklarovaná vzdálenost');
 assert(battlefield?.units?.length===seq.order.length&&
  seq.order.every(who=>battlefield.units.filter(u=>u.id===who).length===1)&&
  seq.spatialUnits?.length===seq.order.length,
  'Chybí kompletní autoritativní mapa obou účastníků');
 for(const id of seq.order){const old=seq.spatialUnits.find(x=>x.id===id),live=battlefield.units.find(x=>x.id===id);
  assert(old&&live&&dist(old,live)<DIST_EPS,'Mapa nesouhlasí s trvale uloženou polohou');}
 const riderStart=battlefield.units.find(u=>u.id===rider.id),mountStart=battlefield.units.find(u=>u.id===mount.id);
 assert(dist(riderStart,mountStart)<DIST_EPS,'Jezdec a mount musí být na stejném místě již před jízdou');
 const overrunProof=overrunRequested?deriveVerifiedMountedOverrun({mountId:mount.id,
  participants,states,battlefield,path}):null;
 const projection=projectGuidedSpatialPath({actorId:mount.id,battlefield,path,action:'move',moveRate:newRate,
  effectiveMove:effectiveMountMove,difficultSources:0,stunned:false,overrunProof});
 assert(Math.abs(projection.requestedFt-declaredDistanceFt)<DIST_EPS&&
  Math.abs(projection.actualFt-declaredDistanceFt)<DIST_EPS&&!projection.stoppedByEZ,
  'Zvíře nesplnilo deklarovanou vzdálenost / bylo zastaveno v Engagement Zone; nutný Stumble/Overrun');
 const ci=Math.floor(eml/10);
 assert(ci>0,'Control Index nedovoluje vypočítat interval zatáčení');
 const turnGap=mountTurnDistance({declaredDistanceFt,controlIndex:ci});
 let since=0,straight=0,longest=0,lastHeading=null,bendsCount=0;
 for(let k=1;k<projection.actualPath.length;k++){
  const a=projection.actualPath[k-1],b=projection.actualPath[k],length=dist(a,b);
  if(length<DIST_EPS)continue;
  const heading=norm(a,b);
  if(lastHeading!==null){const angle=turnAngle(lastHeading,heading);
   if(angle>DIST_EPS){bendsCount++;assert(angle<=45+DIST_EPS&&since+DIST_EPS>=turnGap,
    'Mounted Turn překračuje 45° nebo nemá potřebnou vzdálenost');
    since=0;straight=0;}
  }
  since+=length;straight+=length;longest=Math.max(longest,straight);lastHeading=heading;
 }
 // HMK p160: each round of DOUBLE Move accrues the animal's Personal Fatigue,
 // reduced by five only on its physical END Secondary Roll success. A bend
 // requires the live Stumble test; its failed outcome joins both Injury Sequences.
 let verifiedDouble=null,falling=null,stumbleStop=null;
 if(newRate==='double'){
  // A curved sprint induces a physical Stumble AGL test (HMK pp160–161).
  // Success keeps the pair moving. Failure resolves mount d10+0b (+5
  // on CF), random location and the thrown rider Falling Routine (p354)
  // through one authoritative joint Injury and Initiative checkpoint.
  let stumble=null;
  if(projection.requiresStumble){
   assert(bendsCount===1,
    'Trasa obsahuje více zatáček: pro každou je nutný samostatný Stumble; jediný hod by neověřil celý Double Move');
   const agl=mount?.hmk?.attributes?.agl;
   const clean=states[mount.id];
   const impairment=projectLiveInjuries({state:clean,round:seq.round,test:'agility',timelineId:seq.timelineId});
   assert(num(agl,1,40)&&clean.shock==='NONE'&&!clean.posture?.prone&&
    impairment.ready&&!impairment.unusable&&!impairment.stunned,
    'Stumble AGL: neschopný mount nebo nedoložený skutečný Animal Impairment');
   const fatigue=clean.fatigue.windedness+clean.fatigue.weariness+
     clean.fatigue.otherWeakness+clean.bloodLoss.weaknessFatigue;
   const eml=Math.max(0,agl*5-fatigue+impairment.modifier);
   assert(num(doubleMoveProof?.stumbleD100,1,100)&&doubleMoveProof.stumbleEML===eml,
    'Zatáčející Double Move vyžaduje fyzický Stumble d100 a ověřenou AGL EML');
   const sl=successLevel(doubleMoveProof.stumbleD100,eml);
   if(sl<SL.S){
    assert(fallProof?.gmConfirmed===true&&inventory&&Array.isArray(inventory),
     'Neúspěšný Stumble vyžaduje KOMPLETNÍ obě Injury Sequence a živý inventář');
    // No presumed end-of-route movement: GM must identify the very bend at
    // which the mount stumbles. Only an actual witnessed route vertex may stop.
    const stop=fallProof.mountFallPosition;
    const bends=projection.actualPath.slice(1,-1).map((point,i)=>{
     const before=projection.actualPath[i],after=projection.actualPath[i+2];
     const ab={x:point.x-before.x,y:point.y-before.y},bc={x:after.x-point.x,y:after.y-point.y};
     return {point,turn:Math.abs(ab.x*bc.y-ab.y*bc.x)>DIST_EPS,index:i+1};
    }).filter(x=>x.turn);
    assert(stop&&Number.isFinite(stop.x)&&Number.isFinite(stop.y)&&
     bends.some(x=>dist(stop,x.point)<DIST_EPS),
     'Poloha Stumble musí být ověřený bod skutečného obratu, nikoliv konec celé trasy');
    const bend=bends.find(x=>dist(stop,x.point)<DIST_EPS);
    stumbleStop={point:cp(bend.point),index:bend.index,
     actualFt:projection.actualPath.slice(1,bend.index+1).reduce((n,pt,j)=>
      n+dist(pt,projection.actualPath[j]),0)};
    const slText=sl===SL.CF?'CF':'F';
    falling=prepareMountedFallInjuryJoin({id,round:seq.round,timelineId:seq.timelineId,
     mount,rider,states,inventory,stumbleD100:doubleMoveProof.stumbleD100,
     stumbleEML:eml,stumbleSL:slText,moveRate:newRate,proof:fallProof,gmConfirmed:true});
    assert(falling.mountState.posture.prone===true,'Pád mounta není ukončen prone');
   }else assert(fallProof===null,'Úspěšný Stumble nesmí mít výsledek dvou zranění');
   stumble={roll:doubleMoveProof.stumbleD100,eml,sl:sl===SL.CS?'CS':sl===SL.S?'S':sl===SL.CF?'CF':'F',
    physicalDie:{faces:100,value:doubleMoveProof.stumbleD100,source:'GM-entered-physical-die'}};
  }else {assert(doubleMoveProof?.stumbleD100==null&&doubleMoveProof?.stumbleEML==null,
   'Stumble d100 nelze připojit k přímému sprintu');assert(fallProof===null,'Pád patří jen neúspěšnému Stumble při zatáčení');}
  const end=mount?.hmk?.attributes?.end, pf=mount?.hmk?.verifiedMountedPersonalFatigue;
  assert(num(end,1,40)&&num(pf,5,999)&&
   doubleMoveProof&&num(doubleMoveProof.enduranceD10,1,10)&&
   doubleMoveProof.personalFatigue===pf&&doubleMoveProof.enduranceTN===end,
   'Double Move potřebuje GM fyzické END d10 a ověřené END/PF živého zvířete');
  verifiedDouble={enduranceD10:doubleMoveProof.enduranceD10,enduranceTN:end,
   personalFatigue:pf,fatigueAdded:Math.max(0,pf-(doubleMoveProof.enduranceD10<=end?5:0)),
   stumble,physicalDice:[{faces:10,value:doubleMoveProof.enduranceD10,source:'GM-entered-physical-die'},
    ...(stumble?[stumble.physicalDie]:[])]};
 }else {assert(doubleMoveProof===null,'END SR nepatří k pohybu half/full');
  assert(fallProof===null,'Pád mounta vyžaduje Double Move Stumble');}
 const impact=riderImpactEffect({mountRiderImpact,straightDistanceFt:falling?0:longest,earnedRound:seq.round});
 return {format:'hmk-mounted-shared-move-stage-v1',id,round:seq.round,timelineId:seq.timelineId,
  riderId:rider.id,mountId:mount.id,controlEventId,projection,previousRate,newRate,
  declaredDistanceFt,straightDistanceFt:longest,impactPreview:impact,doubleMoveProof:verifiedDouble,
  overrunRequested,overrunProof,falling,fallProof:falling?cp(fallProof):null,stumbleStop,
  inventoryWitness:falling?same(inventory):null,
  sequenceWitness:same(seq),statesWitness:same(states),battlefieldWitness:same(battlefield),
  riderWitness:same(rider),mountWitness:same(mount),
  readyForImpactAward:impact.bonus>0,readyForRideByAttack:false};
}
/** A shared Move where the rider does not also Attack. Rider Attack/Ride-by
 * requires a separate combined hit journey and is intentionally rejected;
 * completing only a Move must never fabricate a successful strike. */
export function finalizeMountedSharedMove({stage,sequence,states,rider,mount,battlefield,participants=null}={}){
 assert(stage?.format==='hmk-mounted-shared-move-stage-v1'&&
  same(sequence)===stage.sequenceWitness&&same(states)===stage.statesWitness&&
  same(battlefield)===stage.battlefieldWitness&&same(rider)===stage.riderWitness&&same(mount)===stage.mountWitness,
  'Boj, stavy, zvíře nebo pozice se během fyzického vyhodnocení změnily');
 const fresh=prepareMountedSharedMove({id:stage.id,sequence,states,rider,mount,battlefield,
  path:stage.projection.requestedPath,declaredDistanceFt:stage.declaredDistanceFt,
  previousRate:stage.previousRate,newRate:stage.newRate,
  effectiveMountMove:stage.projection.effectiveMove,
  mountRiderImpact:mount.hmk.verifiedRiderImpact,controlEventId:stage.controlEventId,
  overrunRequested:stage.overrunRequested,participants,
  fallProof:stage.fallProof,inventory:stage.falling?JSON.parse(stage.inventoryWitness):null,
  doubleMoveProof:stage.doubleMoveProof?{enduranceD10:stage.doubleMoveProof.enduranceD10,enduranceTN:stage.doubleMoveProof.enduranceTN,personalFatigue:stage.doubleMoveProof.personalFatigue,
   ...(stage.doubleMoveProof.stumble?{stumbleD100:stage.doubleMoveProof.stumble.roll,stumbleEML:stage.doubleMoveProof.stumble.eml}:{})}:null,gmConfirmed:true});
 assert(same(fresh)===same(stage),'Montovaná trasa již neodpovídá pravidlům');
 // The charge is a consequence of the ridden Move itself, not the existence
 // of a Melee attack. Record it against the rider in the SAME checkpoint,
 // before the rider and mount complete their shared IR (HMK p.172).
 const changedStates={...states};
 if(stage.doubleMoveProof){
  changedStates[stage.mountId]=applyConfirmedFatigue({state:states[stage.mountId],round:stage.round,
   eventId:stage.id+':double-move-fatigue',kind:'windedness',delta:stage.doubleMoveProof.fatigueAdded}).state;
 }
 if(stage.impactPreview.bonus>0){
  const charge=applyConfirmedMountedCharge({state:states[rider.id],round:stage.round,
   eventId:stage.id+':rider-impact',mountRiderImpact:mount.hmk.verifiedRiderImpact,
   straightDistanceFt:stage.straightDistanceFt,gmConfirmed:true});
  assert(same(charge.result)===same(stage.impactPreview),'Nesouhlasí ověřený Rider Impact');
  changedStates[rider.id]=charge.state;
 }
 const turnStates=stage.falling?{...changedStates}:changedStates;
 let next=finishEncounterTurn(sequence,turnStates,{action:'other',gmConfirmed:true});
 next=startEncounterTurn(next,turnStates);
 assert(currentEncounterActor(next)===mount.id,'Mount nejedná na společném Initiative Rank');
 next=finishEncounterTurn(next,turnStates,{action:'move',gmConfirmed:true});
 if(stage.falling){
  // Both already-spent IR slots were checked using the pre-injury state;
  // install both authoritative hit reductions only now. The next start
  // will see pending Shock/Morale/Mishaps, never skip their mandatory dice.
  // The mount's confirmed double-move fatigue was reduced via the existing
  // applyConfirmedFatigue BEFORE either falling victim is installed.  Carry
  // that one original reduction/event across even if the fall kills the mount;
  // applying a second fatigue transition to KIA would incorrectly fail.
  const fallenMount=cp(stage.falling.mountState);
  if(stage.doubleMoveProof){
   const fatigueReduction=changedStates[stage.mountId];
   const fatigueEvent=fatigueReduction.events.find(e=>e.id===stage.id+':double-move-fatigue');
   assert(fatigueEvent&&!fallenMount.events.some(e=>e.id===fatigueEvent.id),
    'Chybí jediná autoritativní Fatigue událost přes pád');
   fallenMount.fatigue=cp(fatigueReduction.fatigue);
   fallenMount.events.push(cp(fatigueEvent));
  }
  changedStates[stage.mountId]=fallenMount;
  changedStates[stage.riderId]=cp(stage.falling.riderState);
 }
 const spatial=stage.stumbleStop?{...cp(stage.projection),
  actualPath:cp(stage.projection.actualPath.slice(0,stage.stumbleStop.index+1)),
  actualFt:stage.stumbleStop.actualFt,finalPosition:cp(stage.stumbleStop.point),
  stoppedByMountedFall:true}:cp(stage.projection);
 const event={id:stage.id,round:stage.round,actorId:mount.id,riderId:rider.id,
  timelineId:stage.timelineId,projection:spatial,sharedMounted:true,
  controlEventId:stage.controlEventId,fallProof:stage.falling?cp(stage.falling.proof):null};
 next.spatialEvents??=[];next.spatialEvents.push(event);
 const last=next.log.findLast(x=>x.type==='turn-complete'&&x.actorId===mount.id&&x.round===stage.round);
 assert(last&&!last.spatialEventId,'Neplatný nebo duplicitní mount Move');
 last.spatialEventId=stage.id;
 next.log.push({type:'spatial-action',actorId:mount.id,round:stage.round,eventId:stage.id,
  action:'move',actualFt:spatial.actualFt});
 next.log.push({type:'mounted-shared-move',eventId:stage.id,round:stage.round,
  riderId:rider.id,mountId:mount.id,controlEventId:stage.controlEventId,
  moveRate:stage.newRate,previousRate:stage.previousRate,
  impactCandidate:cp(stage.impactPreview),impactAwarded:stage.impactPreview.bonus>0,
  overrunProof:cp(stage.overrunProof),rideByAttackConfirmed:false,
  stumbled:!!stage.falling,fallingProof:stage.falling?cp(stage.falling.proof):null});
 next.spatialUnits=next.spatialUnits.map(u=>u.id===rider.id?
  {...u,...(stage.falling?stage.falling.riderLandingPosition:stage.projection.finalPosition)}:
  u.id===mount.id?{...u,...spatial.finalPosition}:u);
 return {format:'hmk-mounted-shared-move-plan-v1',sequence:validateEncounterSequence(next),
  battlefield:{...cp(battlefield),units:battlefield.units.map(u=>u.id===rider.id?
   {...u,...(stage.falling?stage.falling.riderLandingPosition:spatial.finalPosition)}:
   u.id===mount.id?{...u,...spatial.finalPosition}:u)},
  riderId:rider.id,mountId:mount.id,sourceEventId:stage.id,
  riderImpactAwarded:stage.impactPreview.bonus>0,riderImpact:cp(stage.impactPreview),
  riderState:cp(changedStates[rider.id]),mountState:stage.doubleMoveProof?cp(changedStates[mount.id]):null,
  falling:!!stage.falling,attackConfirmed:false};
}

/** Store joint positions, two turns and source proof in one readback-verified
 * document checkpoint. Never treat two consecutive independent Move saves as
 * equivalent to this single transaction. */
export function persistMountedSharedMove({stage,plan,document,storage,key,baseline}={}){
 assert(document?.combatRuntime?.sequence&&Array.isArray(document.characters)&&
  plan?.format==='hmk-mounted-shared-move-plan-v1',
  'Chybí úplný výchozí kontrolní bod a společný Mounted plán');
 const seq=validateEncounterSequence(document.combatRuntime.sequence);
 const rider=document.characters.find(c=>c.id===stage?.riderId);
 const mount=document.characters.find(c=>c.id===stage?.mountId);
 assert(rider&&mount,'Jezdec nebo zvíře již nejsou ve střetnutí');
 const states=Object.fromEntries(document.characters.filter(c=>seq.order.includes(c.id))
  .map(c=>[c.id,c.hmk?.combatState]));
 const battlefield=JSON.parse(stage.battlefieldWitness);
 if(stage.falling)assert(same(document.inventory)===stage.inventoryWitness,
  'Inventář obou zraněných účastníků se před atomickým commitem změnil');
 const liveStage=prepareMountedSharedMove({id:stage.id,sequence:seq,states,rider,mount,battlefield,
  overrunRequested:stage.overrunRequested,participants:document.characters,
  path:stage.projection.requestedPath,declaredDistanceFt:stage.declaredDistanceFt,
  previousRate:stage.previousRate,newRate:stage.newRate,
  effectiveMountMove:stage.projection.effectiveMove,mountRiderImpact:mount.hmk.verifiedRiderImpact,
  controlEventId:stage.controlEventId,fallProof:stage.fallProof,
  inventory:stage.falling?document.inventory:null,
  doubleMoveProof:stage.doubleMoveProof?{enduranceD10:stage.doubleMoveProof.enduranceD10,enduranceTN:stage.doubleMoveProof.enduranceTN,personalFatigue:stage.doubleMoveProof.personalFatigue,
   ...(stage.doubleMoveProof.stumble?{stumbleD100:stage.doubleMoveProof.stumble.roll,stumbleEML:stage.doubleMoveProof.stumble.eml}:{})}:null,gmConfirmed:true});
 assert(same(liveStage)===same(stage),'Montovaná fáze se od připraveného stavu změnila');
 const recomputed=finalizeMountedSharedMove({stage:liveStage,sequence:seq,states,rider,mount,battlefield,participants:document.characters});
 assert(same(recomputed)===same(plan),'Mounted plán neodpovídá přepočtené společné akci');
 assert(!document.journal.some(j=>j.id===`mounted:${stage.id}`)&&
  !seq.log.some(e=>e.type==='mounted-shared-move'&&e.eventId===stage.id),
  'Duplicitní Mounted zápis');
 const out=cp(document);
 out.combatRuntime.sequence=cp(plan.sequence);
 out.combatRuntime.clock={round:plan.sequence.round,actorId:currentEncounterActor(plan.sequence)||''};
 if(stage.doubleMoveProof){
  assert(plan.mountState&&plan.mountState.fatigue.windedness===
   states[stage.mountId].fatigue.windedness+stage.doubleMoveProof.fatigueAdded,
   'Mounted Double Move neuložil správnou PF/END únavu zvířete');
  out.characters.find(c=>c.id===stage.mountId).hmk.combatState=cp(plan.mountState);
 }
 if(stage.falling){
  assert(plan.falling&&plan.mountState&&plan.riderState,
   'Stumble F/CF musí uložit stav koně i jezdce ve STEJNÉM checkpointu');
  out.characters.find(c=>c.id===stage.mountId).hmk.combatState=cp(plan.mountState);
  out.characters.find(c=>c.id===stage.riderId).hmk.combatState=cp(plan.riderState);
 }
 if(plan.riderImpactAwarded){
  assert(plan.riderState?.mountedRiderImpact&&
   same(plan.riderState.mountedRiderImpact)===same(stage.impactPreview),
   'Povinný Rider Impact chybí v atomickém plánu');
  out.characters.find(c=>c.id===stage.riderId).hmk.combatState=cp(plan.riderState);
 }
 out.journal.push({id:`mounted:${stage.id}`,characterId:stage.riderId,
  createdAt:new Date().toISOString(),title:`HMK společný jízdní pohyb, kolo ${stage.round}`,
  body:`Jezdec a zvíře se přesunuli společně; Ride-by bez útoku, Rider Impact ${stage.impactPreview.bonus}.`,
  combatProof:{actionKind:'mounted-shared-move',timelineId:stage.timelineId,round:stage.round,
   sourceEventId:stage.id,riderId:stage.riderId,mountId:stage.mountId,
   projection:cp(stage.projection),controlEventId:stage.controlEventId,
   riderImpactAwarded:plan.riderImpactAwarded,riderImpact:cp(stage.impactPreview),
   doubleMoveProof:cp(stage.doubleMoveProof),overrunProof:cp(stage.overrunProof),
   falling:stage.falling?{proof:cp(stage.falling.proof),injuries:cp(stage.falling.injuries),
    stumbleStop:cp(stage.stumbleStop),mandatory:cp(stage.falling.mandatory)}:null,attackConfirmed:false}});
 const serialized=same(out);
 const result=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...result,serialized:result.ok?serialized:null,document:result.ok?out:null};
}
