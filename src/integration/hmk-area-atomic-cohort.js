/** HârnMaster: Roleplaying in the World of Kèthîra pp.165–169.
 * G04 integration boundary, deliberately NOT an Area source resolver.
 * An Area attack may persist only when a separately resolved, durable
 * source event already exists in this Initiative. No preview, arbitrary
 * Impact input, or manually inserted target list grants write authority.
 * All target changes are built first and saved in ONE snapshot CAS.
 */
import {validateEncounterSequence} from './encounter-turn-sequence.js';
import {validateCombatState,dueInjuryMorale} from './persistent-combat-state.js';
import {previewAreaCohort,assertAreaCohortUnchanged} from './hmk-area-cohort-preview.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
const check=(v,m)=>{if(!v)throw Error(m)};
const clone=structuredClone;
const same=JSON.stringify;
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;

/** Only a SOURCE PRODUCER (not a generic UI form) may append this event.
 * The present release has no source producer; consequently this module
 * cannot make an unsupported Area attack writable on its own. */
export function prepareSourceBoundAreaCohort({sequence,sourceEventId,characters,states,inventory,rollsByTarget,method='weighted'}={}){
 const seq=validateEncounterSequence(sequence);
 check(typeof sourceEventId==='string'&&sourceEventId.length>0,'Chybí autoritativní Area source event');
 const matches=seq.log.filter(x=>x.type==='area-source-resolved'&&x.eventId===sourceEventId&&x.timelineId===seq.timelineId&&x.round===seq.round);
 check(matches.length===1,'Area zdroj nebyl dokončen právě jednou v této Initiative');
 const src=matches[0];
 check(src.producer==='hmk-guided-verified-area-source-v1'&&src.completed===true&&src.result==='success',
  'Pouhý ruční Impact nebo neověřený zdroj Area neopravňuje k zápisu');
 check(typeof src.actorId==='string'&&seq.order.includes(src.actorId)&&
  typeof src.originHitToken==='string'&&src.originHitToken&&
  seq.confirmedHits?.[src.originHitToken]?.actorId===src.actorId&&
  seq.confirmedHits[src.originHitToken]?.round===src.round&&
  seq.confirmedHits[src.originHitToken]?.actionKind==='area'&&
  seq.confirmedHits[src.originHitToken]?.sourceEventId===src.eventId,
  'Area zdroj neodkazuje na skutečný potvrzený zásah');
 check(['fire','frost'].includes(src.aspect)&&integer(src.strikeImpact,0,999)&&
  Array.isArray(src.targetIds)&&src.targetIds.length>=1&&src.targetIds.length<=100&&
  src.targetIds.every(id=>typeof id==='string'&&seq.order.includes(id))&&
  new Set(src.targetIds).size===src.targetIds.length,
  'Area zdroj nemá doložené úplné cíle a Impact');
 check(src.geometryVerified===true&&src.targetsVerified===true&&src.diceVerified===true&&
  typeof src.geometryWitness==='string'&&src.geometryWitness.length>0,
  'Zdroj nemá ověřenou geometrii a útočné hody');
 check(!seq.log.some(e=>e.type==='area-cohort-committed'&&e.sourceEventId===sourceEventId),
  'Area zdroj byl již spotřebován');
 const snap=Object.fromEntries(src.targetIds.map(id=>{
  check(Object.prototype.hasOwnProperty.call(states??{},id),`Chybí stav cíle ${id}`);
  return [id,clone(states[id])];
 }));
 const preview=previewAreaCohort({id:sourceEventId,timelineId:seq.timelineId,round:seq.round,
  aspect:src.aspect,strikeImpact:src.strikeImpact,targetIds:src.targetIds,characters,states,
  inventory,rollsByTarget,sequence:seq,method});
 const characterWitnesses=Object.fromEntries(src.targetIds.map(id=>{
  const match=characters.filter(x=>x.id===id);
  check(match.length===1,`Neznámá postava ${id}`);
  return [id,same(match[0])];
 }));
 return {format:'hmk-area-source-bound-stage-v1',sourceEventId,timelineId:seq.timelineId,round:seq.round,
  sequenceWitness:same(seq),characterWitnesses,preview,rollsByTarget:clone(rollsByTarget),method,originalStates:snap,
  source:same(src),readyForDirectWrite:false};
}
/** Resolve all IMMEDIATELY due mandatory consequences before saving.
 * HMK p162: a serious/grievous Injury Morale check is NOT due while the
 * sufferer remains in Shock. Preserve that outstanding duty atomically as
 * moralePending, for the existing mandatory resolver after Shock recovery. */
export function finalizeSourceBoundAreaCohort({stage,sequence,characters,states,inventory}={}){
 check(stage?.format==='hmk-area-source-bound-stage-v1'&&stage.readyForDirectWrite===false,
  'Nesprávný Area transakční podklad');
 const seq=validateEncounterSequence(sequence);
 check(same(seq)===stage.sequenceWitness,'Initiative se od vyhodnocení Area změnila');
 check(same(seq.log.find(e=>e.type==='area-source-resolved'&&e.eventId===stage.sourceEventId))===stage.source,
  'Area původ se změnil');
 assertAreaCohortUnchanged(stage.preview,{states,inventory});
 for(const id of stage.preview.targetIds){
  const cs=characters?.filter(c=>c.id===id);
  check(cs?.length===1&&same(cs[0])===stage.characterWitnesses[id],
   `Postava nebo Shock ML ${id} se změnily mezi fyzickými hody`);
  const result=stage.preview.stagedStates[id];validateCombatState(result);
  check(dueInjuryMorale(result).length===0,
   `Area ${id}: splatný Injury Morale musí být vyhodnocen před další akcí`);
  check(!result.mishaps?.some(x=>!x.resolved),
   `Area ${id}: nevyřešený povinný Mishap brání zápisu`);
 }
 check(!seq.log.some(e=>e.type==='area-cohort-committed'&&e.sourceEventId===stage.sourceEventId),
  'Duplicitní Area commit');
 const next=clone(seq);
 next.log.push({type:'area-cohort-committed',timelineId:seq.timelineId,round:seq.round,
  sourceEventId:stage.sourceEventId,actorId:JSON.parse(stage.source).actorId,
  targetIds:[...stage.preview.targetIds],gmEnteredDice:true});
 return {sequence:validateEncounterSequence(next),states:Object.fromEntries(stage.preview.targetIds.map(id=>[id,clone(stage.preview.stagedStates[id])])),
  sourceEventId:stage.sourceEventId,targetIds:[...stage.preview.targetIds],
  results:clone(stage.preview.results),format:'hmk-area-atomic-plan-v1'};
}
/** Commit to a detached complete snapshot in one verified storage write.
 * This function does not assume an in-memory rollback is proof of a failed
 * storage write; a verified readback decides ambiguity. */
export function persistSourceBoundAreaPlan({stage,plan,storage,key,baseline,document}={}){
 check(plan?.format==='hmk-area-atomic-plan-v1'&&document&&Array.isArray(document.characters)&&
  Array.isArray(document.journal)&&document.combatRuntime?.sequence,
  'Chybí úplný produkční kontrolní bod a ověřený Area plán');
 check(same(document.combatRuntime.sequence)!==same(plan.sequence),
  'Duplicitní checkpoint bez změny Initiative');
 const pre=validateEncounterSequence(document.combatRuntime.sequence);
 // Never accept a caller-constructed plan or a forged preview as a write
 // capability. Reconstruct EVERY rule result from the authoritative document
 // and the GM-entered dice stored in the staged session.
 const liveStates=Object.fromEntries(document.characters.map(c=>[c.id,c.hmk?.combatState]));
 const freshStage=prepareSourceBoundAreaCohort({sequence:pre,sourceEventId:stage?.sourceEventId,
  characters:document.characters,states:liveStates,inventory:document.inventory,
  rollsByTarget:stage?.rollsByTarget,method:stage?.method});
 check(same(freshStage.preview)===same(stage.preview)&&
  same(freshStage.characterWitnesses)===same(stage.characterWitnesses)&&
  same(freshStage.source)===same(stage.source),
  'Area stage byl změněn po fyzických hodech');
 const freshPlan=finalizeSourceBoundAreaCohort({stage:freshStage,sequence:pre,
  characters:document.characters,states:liveStates,inventory:document.inventory});
 check(same(freshPlan)===same(plan),'Area plán nesouhlasí s autoritativně přepočteným výsledkem');
 check(pre.timelineId===plan.sequence.timelineId&&pre.round===plan.sequence.round&&
  !pre.log.some(e=>e.type==='area-cohort-committed'&&e.sourceEventId===plan.sourceEventId),
  'Zdroj již spotřebován nebo patří k jinému boji');
 check(document.characters.filter(c=>plan.targetIds.includes(c.id)).length===plan.targetIds.length,
  'Chybí příjemce Area zásahu');
 // No caller-supplied arbitrary mutation of already confirmed target events.
 const out=clone(document);
 for(const id of plan.targetIds){
  const c=out.characters.find(c=>c.id===id);const before=c.hmk?.combatState;
  check(before&&Array.isArray(c.hmk.injuries),'Postava nemá kompletní trvalý stav a seznam ran');
  validateCombatState(before);
  check(plan.states[id].events.length>=before.events.length,'Neplatná historie Area');
  // Existing wounds may have compounded. Reconcile the complete set by ID.
  c.hmk.combatState=clone(plan.states[id]);
  const oldIds=new Set(before.wounds.map(w=>w.id));
  for(const wound of plan.states[id].wounds){
   const exists=c.hmk.injuries.find(x=>x.id===wound.id&&x.combatRecord===true);
   if(exists){exists.location=wound.location;exists.severity=wound.severity;exists.bleeding=wound.bleeding;}
   else{
    check(!oldIds.has(wound.id),'Area výsledek nemá úplnou původní evidenci ran');
    c.hmk.injuries.push({...clone(wound),combatRecord:true});
   }
  }
 }
 out.combatRuntime.sequence=clone(plan.sequence);
 out.combatRuntime.clock={round:plan.sequence.round,actorId:plan.sequence.active?
  plan.sequence.order[plan.sequence.cursor]??'':''};
 for(const targetId of plan.targetIds){
  const journalId=`area:${plan.sourceEventId}:${targetId}`;
  check(!document.journal.some(j=>j.id===journalId),'Duplicitní Area journal ID');
  out.journal.push({id:journalId,characterId:targetId,
   title:`HMK Area · kolo ${plan.sequence.round}`,createdAt:new Date().toISOString(),
   body:`Area Fire/Frost: ${plan.targetIds.length} ověřených cílů, jeden společný zdroj`,
   combatProof:{actionKind:'area',sourceEventId:plan.sourceEventId,round:plan.sequence.round,
    timelineId:plan.sequence.timelineId,targetId,targetIds:[...plan.targetIds],result:clone(plan.results[targetId])}});
 }
 // This checkpoint uses a complete database snapshot, NOT one write per target.
 const serialized=same(out);
 const result=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...result,serialized:result.ok?serialized:null,document:result.ok?out:null};
}
