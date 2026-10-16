import {classifySpellMisfire} from './hmk-spell-misfire-effects.js';
import {listPelahnBurstSources,pelahnSourcesForActor} from './hmk-pelahn-burst-registry.js';
/** HMK World of Kèthîra pp.158–162, 169, 176–179.
 * GM-controlled turn sequence. No dice rolls, time gaps, or unknown character
 * attributes are inferred. Event gates inspect the authoritative persistent
 * character state after each confirmed transition.
 */
import {validateCombatState,dueInjuryMorale,unresolvedInjuryMishaps} from './persistent-combat-state.js';
import {successLevel,SL} from '../rules/tests.js';
import {validateSpatialBarriers} from './hmk-guided-spatial-barriers.js';
import {projectGuidedSpatialPath,isPermanentlyBlind} from './hmk-guided-spatial-actions.js';
import {completeParalysis,requireParalysisAction} from './hmk-paralysis-sequela.js';

const ACTIONS=new Set(['attack','charge','evade','grope','incant','move','pass','ready','other','incapacitated','concentrate-start','concentrate-hold','concentrate-abandon']);
const MAX_ROUND=9999;
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
function fail(message){throw new Error(message)}
function requireValid(condition,message){if(!condition)fail(message)}
function clone(value){return structuredClone(value)}

export function orderHMKInitiative(roster,{astralscape=false}={}){
 requireValid(Array.isArray(roster)&&roster.length>0&&roster.length<=100,'Střetnutí vyžaduje 1–100 účastníků');
 const ids=new Set();
 const normalized=roster.map(x=>{
  requireValid(x&&typeof x.id==='string'&&x.id&&!ids.has(x.id),'Duplicitní nebo neplatné ID účastníka');ids.add(x.id);
  const isPC=x.isPC===true;
  const source=x.spiritWorld===true||x.initiativeML===null?'spirit':'initiative';
  const ml=source==='spirit'?x.spiritML:x.initiativeML;
  requireValid(int(ml,0,200),'Initiative Rank vyžaduje skutečné Initiative ML nebo Spirit ML (HMK str.159)');
  const awareness=x.awarenessEML;
  requireValid(int(awareness,0,200),'Shodu IR rozhoduje potvrzené Awareness EML');
  requireValid(['aware','confused','unaware'].includes(x.alertness??'aware'),'Neplatný výchozí stav Alertness');
  const empathy=astralscape?x.empathyEML:null;
  if(astralscape)requireValid(int(empathy,0,200),'Astralscape vyžaduje Empathy EML pro shody');
  requireValid(x.tieOrder===null||x.tieOrder===undefined||int(x.tieOrder,0,999),'GM pořadí shody musí být celé číslo 0–999');
  return {id:x.id,name:String(x.name||x.id),isPC,rank:ml,baseInitiativeML:x.baseInitiativeML??x.initiativeML,source,awarenessEML:awareness,empathyEML:empathy,
   tieOrder:x.tieOrder??null,alertness:x.alertness||'aware'};
 });
 normalized.sort((a,b)=>b.rank-a.rank||(astralscape?b.empathyEML-a.empathyEML:b.awarenessEML-a.awarenessEML)
   ||(a.isPC===b.isPC?0:a.isPC?-1:1)||(a.tieOrder??0)-(b.tieOrder??0));
 for(let i=1;i<normalized.length;i++){
  const a=normalized[i-1],b=normalized[i];
  if(a.rank===b.rank&&(astralscape?a.empathyEML===b.empathyEML:a.awarenessEML===b.awarenessEML)
   &&a.isPC===b.isPC){
   requireValid(a.tieOrder!==null&&b.tieOrder!==null&&a.tieOrder!==b.tieOrder,
    `Nevyřešená shoda Initiative Rank mezi ${a.name} a ${b.name}: zadejte GM/PC pořadí (HMK str.159)`);
  }
 }
 return normalized;
}
export function validateEncounterSequence(input){
 const s=clone(input);
 requireValid(s&&s.format==='hmk-initiative-sequence-v1'&&int(s.round,1,MAX_ROUND),'Neplatná časová osa Initiative');
 requireValid(Array.isArray(s.roster)&&s.roster.length>0&&s.roster.length<=100,'Chybí účastníci');
 requireValid(Array.isArray(s.order)&&s.order.length===s.roster.length,'Nesouhlasí pořadí účastníků');
 const ids=s.roster.map(x=>x.id),idset=new Set(ids);
 requireValid(idset.size===ids.length&&new Set(s.order).size===s.order.length&&s.order.every(id=>idset.has(id)),'Pořadí obsahuje neznámé postavy');
 requireValid(int(s.cursor,0,s.order.length)&&typeof s.active==='boolean','Neplatný ukazatel tahu');
 requireValid(Array.isArray(s.log)&&s.log.length<=30000,'Neplatná historie tahů');
 listPelahnBurstSources(s);
 requireValid(s.readied&&typeof s.readied==='object'&&!Array.isArray(s.readied),'Neplatný seznam připravených akcí');
 requireValid(s.interruptActiveId===undefined||s.interruptActiveId===null||s.order.includes(s.interruptActiveId),'Neplatný přerušující aktér');
 requireValid(s.confirmedHits===undefined||s.confirmedHits&&typeof s.confirmedHits==='object'&&!Array.isArray(s.confirmedHits),'Neplatný registr potvrzených zásahů');
 requireValid(s.commitments===undefined||s.commitments&&typeof s.commitments==='object'&&!Array.isArray(s.commitments),'Neplatná vícekolová akce');
 requireValid(s.pendingEndTurnAction===undefined||s.pendingEndTurnAction===null||
  (typeof s.pendingEndTurnAction==='object'&&!Array.isArray(s.pendingEndTurnAction)&&
   s.pendingEndTurnAction.actorId===s.order[s.cursor]&&s.pendingEndTurnAction.round===s.round&&
   s.active===true&&s.interruptActiveId===null&&
   (['STN','INC'].includes(s.entryShock)||['afraid','catatonic'].includes(s.entryFear)||s.entryAlertness==='confused'||
    ['routed','withdrawing'].includes(s.entryMorale))&&
   ACTIONS.has(s.pendingEndTurnAction.action)&&
   (s.pendingEndTurnAction.surrenderEventId===undefined||typeof s.pendingEndTurnAction.surrenderEventId==='string')&&
   (s.pendingEndTurnAction.pendingEffects===undefined||
    Array.isArray(s.pendingEndTurnAction.pendingEffects)&&
    s.pendingEndTurnAction.pendingEffects.length>=1&&
    new Set(s.pendingEndTurnAction.pendingEffects).size===s.pendingEndTurnAction.pendingEffects.length&&
    s.pendingEndTurnAction.pendingEffects.every(v=>
     ['shock-end-turn','rally-end-turn-reaction','confused-end-turn-reaction','fear-end-turn-reaction'].includes(v)))&&
   (s.pendingEndTurnAction.movementImpossibleConfirmed===undefined||
    s.pendingEndTurnAction.movementImpossibleConfirmed===true)&&
   s.log.some(e=>['turn-action-resolved-before-shock-reroll','turn-action-resolved-before-confused-reaction',
     'turn-action-resolved-before-rally-reaction','turn-action-resolved-before-fear-reaction'].includes(e.type)&&
    e.round===s.round&&
    e.actorId===s.pendingEndTurnAction.actorId&&e.action===s.pendingEndTurnAction.action)),
  'Neplatná nebo zastaralá odložená akce před Shock Reroll');
 requireValid(s.reactions===undefined||s.reactions&&typeof s.reactions==='object'&&!Array.isArray(s.reactions),'Neplatné Reaction Rolls');
 // HMK p.161: an aware archer who elects the initial loaded-crossbow
 // shot acts BEFORE the regular IR order, but receives only ONE turn in the
 // round. Every priority entry is anchored to a real pre-combat Load event.
 if(s.initialCrossbowPriority!==undefined&&s.initialCrossbowPriority!==null){
  const q=s.initialCrossbowPriority;
  requireValid(s.round===1&&Array.isArray(q)&&q.length>0&&q.length<=s.roster.length,
   'Počáteční přednostní výstřely mohou proběhnout pouze v prvním kole');
  const seen=new Set(),standard=s.roster.map(r=>r.id);
  requireValid(q.every((entry,i)=>{
   if(!entry||seen.has(entry.actorId)||!idset.has(entry.actorId)||
    typeof entry.weaponId!=='string'||!entry.weaponId||
    typeof entry.loadEventId!=='string'||!entry.loadEventId)return false;
   seen.add(entry.actorId);
   const row=s.roster.find(r=>r.id===entry.actorId),mark=s.missileReadiness?.[entry.weaponId];
   const proof=s.log.some(e=>e.type==='missile-load-complete'&&e.preCombat===true&&
    e.gmConfirmed===true&&e.actorId===entry.actorId&&e.weaponId===entry.weaponId&&
    e.eventId===entry.loadEventId);
   const registered=s.log.some(e=>e.type==='precombat-crossbow-priority-configured'&&
    e.round===1&&e.gmConfirmed===true&&Array.isArray(e.shooters)&&
    e.shooters.some(z=>z.actorId===entry.actorId&&z.weaponId===entry.weaponId&&
     z.loadEventId===entry.loadEventId));
   return registered&&proof&&mark?.actorId===entry.actorId&&
    (mark.loaded?.loadEventId===entry.loadEventId ||
     // After shooting, the prepared bolt is spent but the opening action
     // and its provenance remain in the immutable timeline.
     s.log.some(e=>e.type==='hit-confirmed'&&e.actorId===entry.actorId&&
      e.round===1&&s.confirmedHits?.[e.token]));
  }), 'Přednostní výstřel nemá doloženou aware postavu, nabitou kuši nebo počáteční Load');
  const qIds=q.map(e=>e.actorId);
  requireValid(qIds.every((id,i)=>i===0||standard.indexOf(qIds[i-1])<standard.indexOf(id)),
   'Přednostní střelci musí zachovat vzájemné pořadí IR');
  requireValid(s.order.every((id,i)=>id===qIds.concat(standard.filter(x=>!seen.has(x)))[i]),
   'Pořadí úvodního výstřelu neodpovídá řazení před běžným IR');
 }
 requireValid(s.freeActionTurn===undefined||s.freeActionTurn===null||
  (typeof s.freeActionTurn==='object'&&!Array.isArray(s.freeActionTurn)&&
   typeof s.freeActionTurn.token==='string'&&typeof s.freeActionTurn.kind==='string'),
  'Neplatná evidence jedné volné akce');
 // An armed projectile is a durable, verifiable battle fact, not a form
 // checkbox. The corresponding completed Load must exist in this timeline.
 if(s.missileReadiness!==undefined){
  requireValid(s.missileReadiness&&typeof s.missileReadiness==='object'&&
   !Array.isArray(s.missileReadiness),'Neplatná evidence připravenosti střelných zbraní');
  for(const [weaponId,mark] of Object.entries(s.missileReadiness)){
   requireValid(weaponId.length>0&&mark?.weaponId===weaponId&&idset.has(mark.actorId)&&
    typeof mark.weaponWitness==='string'&&typeof mark.spanned==='boolean',
    'Neplatný uložený stav natažení či nabití zbraně');
   if(mark.loaded!==null&&mark.loaded!==undefined){
    const loaded=mark.loaded;
    requireValid(typeof loaded.ammoId==='string'&&loaded.ammoId.length>0&&
     ['arrow','bolt','stone'].includes(loaded.ammoType)&&
     typeof loaded.loadEventId==='string'&&loaded.loadEventId.length>0&&
     int(loaded.completedRound,1,s.round)&&loaded.itemSnapshot&&
     s.log.some(e=>e.type==='missile-load-complete'&&e.actorId===mark.actorId&&
      e.weaponId===weaponId&&e.ammoId===loaded.ammoId&&e.eventId===loaded.loadEventId),
     'Nabité střelivo nemá ověřenou dokončenou Load událost této Initiative');
   }
  }
 }
 if(s.missileAim!==undefined){
  requireValid(s.missileAim&&typeof s.missileAim==='object'&&!Array.isArray(s.missileAim),
   'Neplatný registr Aim');
  for(const [weaponId,aim] of Object.entries(s.missileAim))if(aim!==null){
   requireValid(aim?.weaponId===weaponId&&idset.has(aim.actorId)&&
    typeof aim.weaponWitness==='string'&&typeof aim.eventId==='string'&&
    int(aim.startedRound,1,s.round)&&int(aim.completedRound,2,s.round)&&
    aim.completedRound===aim.startedRound+1&&
    s.log.some(e=>e.type==='missile-aim-complete'&&e.eventId===aim.eventId&&
      e.actorId===aim.actorId&&e.weaponId===weaponId&&e.round===aim.completedRound),
    'Aim nemá doloženou dokončenou předchozí koncentraci');
  }
 }
 if(s.spatialBarriers!==undefined)validateSpatialBarriers(s.spatialBarriers);
 requireValid(s.interactionObjects===undefined||Array.isArray(s.interactionObjects)&&
  s.interactionObjects.every(x=>x&&typeof x.id==='string'&&x.id.length>0&&x.id.length<=120&&
   ['door','trunk'].includes(x.kind)&&typeof x.open==='boolean')&&
  new Set(s.interactionObjects.map(x=>x.id)).size===s.interactionObjects.length,
  'Neplatná evidence skutečných dveří a truhel');
 if(s.spatialBarriers?.length)requireValid(s.spatialBarriers.filter(b=>b.kind==='door').every(b=>
  s.interactionObjects?.filter(o=>o.id===b.id&&o.kind==='door').length===1),
  'Geometrie dveří vyžaduje stejné ID a stav v evidenci objektů');
 requireValid(s.entryAlertness===undefined||s.entryAlertness===null||['aware','confused','unaware'].includes(s.entryAlertness),'Neplatná Alertness při zahájení tahu');
 requireValid(s.entryShock===undefined||s.entryShock===null||['NONE','STN','INC','UNC','KIA'].includes(s.entryShock),'Neplatný původní Shock na začátku tahu');
 requireValid(s.entryMorale===undefined||s.entryMorale===null||typeof s.entryMorale==='string','Neplatná původní Morale na začátku tahu');
 requireValid(s.entryFear===undefined||s.entryFear===null||['steady','brave','afraid','terrified','catatonic'].includes(s.entryFear),'Neplatný původní Fear');
 requireValid(s.entryForcedPass===undefined||typeof s.entryForcedPass==='boolean','Neplatný původní Mishap Pass');
 requireValid(s.entryGrabHoldTarget===undefined||typeof s.entryGrabHoldTarget==='boolean','Neplatný důkaz Grab Hold při začátku tahu');
 requireValid(typeof s.timelineId==='string'&&s.timelineId.length>0,'Chybí ID časové osy');
 return s;
}
export function createEncounterSequence({roster,round=1,timelineId,astralscape=false}={}){
 requireValid(int(round,1,MAX_ROUND),'První kolo musí být celé číslo 1–9999');
 requireValid(typeof timelineId==='string'&&timelineId.length>0&&timelineId.length<=100,'Chybí ID střetnutí');
 const sorted=orderHMKInitiative(roster,{astralscape});
 return validateEncounterSequence({format:'hmk-initiative-sequence-v1',round,timelineId,astralscape,
  roster:sorted,order:sorted.map(x=>x.id),cursor:0,active:false,entryAlertness:null,interruptActiveId:null,reactions:{},readied:{},commitments:{},confirmedHits:{},freeActionTurn:null,log:[]});
}
function persistentState(states,id){
 const s=states[id];requireValid(!!s,`Účastník ${id} nemá doložený trvalý bojový stav`);validateCombatState(s);return s;
}

/** HMK p.182: these known, persisted conditions AUTOMATICALLY terminate
 * concentration. They are not optional GM judgements and must not be
 * treated as a mere penalty to the subsequent action.
 * Fear not stored in the current combat-state model cannot be fabricated.
 */
export function concentrationInterruptionReason(state){
 validateCombatState(state);
 if(state.shock!=='NONE')return `shock-${state.shock}`;
 if(state.coma?.active)return 'coma';
 // HMK p.162 forces withdrawing/routed combatants to retreat or flee.
 // Such compulsory actions cannot coexist with a p.160 ongoing task; p.182
 // likewise forbids concentration under fear and catatonia.
 if(['withdrawing','routed','catatonic'].includes(state.morale?.state))return `morale-${state.morale.state}`;
 if((state.wounds||[]).some(w=>w.healed!==true&&w.severity==='G'&&
  ['sk','skull'].includes(String(w.location).trim().toLowerCase())))return 'grievous-skull';
 if((state.wounds||[]).some(w=>w.healed!==true&&w.healing?.grimWound===true))return 'grim-wound';
 return null;
}

/** G03: A recovered Shock State must not retroactively restore an interrupted
 * 1+ round task.  The event index is witnessed when the action starts, so a
 * later physical Shock/Morale transition is recognized even if its current
 * condition is NONE again before the actor's next IR.  Never infer a roll.
 * Older saves without an event witness are checked conservatively by round.
 */
export function concentrationInterruptionHistory(state,commitment){
 validateCombatState(state);
 if(!commitment||commitment.status!=='in-progress')return null;
 const all=state.events||[];
 const index=commitment.startEventIndex;
 if(index!==undefined&&(!int(index,0,5000)||index>all.length))
  return 'invalid-concentration-event-witness';
 const recent=index===undefined?all.filter(e=>int(e.round,1,MAX_ROUND)&&e.round>=commitment.startRound):all.slice(index);
 for(const e of recent){
  const d=e.details||{};
  if(e.type==='confirmed-hit'&&['STN','INC','UNC','KIA'].includes(d.shock))return 'historical-shock-hit';
  if(e.type==='shock-recovery'&&['STN','INC','UNC','KIA'].includes(d.before))return 'historical-shock-recovery';
  if(['blood-loss-advance','blood-stoppage'].includes(e.type)&&['STN','INC','UNC','KIA'].includes(d.shock))return 'historical-blood-shock';
  // Morale can arise from injury, special incidents, group cohesion and
  // reactions.  A later successful Rally must not resurrect concentration.
  if(['injury-morale','morale-reaction','special-morale-resolution',
    'group-cohesion-assessment'].includes(e.type)&&
    [d.state,d.after,d.before,d.finalState,d.resultState].some(value=>
     ['withdrawing','routed','catatonic','afraid','terrified'].includes(value)))
   return 'historical-morale-interruption';
  if(e.type==='confirmed-hit'&&String(d.injury||'').startsWith('G')&&
    ['sk','skull'].includes(String(d.location||'').trim().toLowerCase()))return 'historical-grievous-skull';
 }
 return null;
}

/** HMK p.160: a character performing a 1+ round task must Ignore attacks
 * until the character abandons that task. Refuse Block/Counterstrike BEFORE
 * accepting physical dice; an explicit abandoned commitment is a separate
 * persistent Initiative transition, not a silent side effect of a choice.
 * This guard is also run immediately before the final atomic attack commit.
 */
export function requireConcentrationCompatibleDefence(sequence,{defenderId,defence}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(typeof defenderId==='string'&&s.order.includes(defenderId),'Neplatný obránce v Initiative');
 requireValid(['ignore','block','counterstrike','dodge'].includes(defence),'Neznámá obrana');
 const task=s.commitments?.[defenderId];
 requireValid(!task||task.status!=='in-progress'||defence==='ignore',
  'HMK str.160: obránce provádí 1+ round koncentraci a musí Ignore. Pro Block/Counterstrike/Dodge musí nejprve výslovně opustit a trvale zapsat přerušení činnosti.');
 return true;
}

/** Mandatory current-round events, independent of turn order or inferred IR. */
export function dueEncounterEvents(sequence,states){
 const s=validateEncounterSequence(sequence),due=[];
 for(const id of s.order){
  const ps=persistentState(states,id);
  if(ps.shock==='KIA')continue;
  // HMK p.162: if a previously registered ally becomes objectively
  // vanquished, require the observer's explicit awareness assessment before
  // another action. Unknown social relations/awareness are never inferred.
  const cohort=ps.morale?.cohesion;
  if(cohort&&!['INC','UNC','KIA'].includes(ps.shock)&&ps.morale?.state!=='catatonic'){
   requireValid(cohort.timelineId===s.timelineId,'Group Cohesion roster patří do jiné časové osy');
   const assessed=new Set(cohort.assessedVanquishedIds);
   const casualties=cohort.allyIds.filter(other=>{
    const q=persistentState(states,other);
    return !assessed.has(other)&&(['INC','UNC','KIA'].includes(q.shock)||
      ['routed','withdrawing','catatonic'].includes(q.morale?.state)||q.morale?.gmVanquished?.active===true||q.morale?.surrender?.active===true);
   });
   if(casualties.length)due.push({characterId:id,type:'group-cohesion-assessment',dueRound:s.round,casualtyIds:casualties});
  }

  // Every separately observed Special event induces its own immediate
  // Initiative Morale test. One event may affect several characters.
  if(!['INC','UNC'].includes(ps.shock)&&ps.morale?.state!=='catatonic'){
   for(const t of ps.morale?.specialPending??[]){
    requireValid(t.timelineId===s.timelineId,'Special Morale patří do jiné časové osy');
    due.push({characterId:id,type:'special-morale',dueRound:t.round,triggerId:t.id});
   }
  }
  for(const w of ps.wounds||[]){
   if(w.bleeding&&int(w.nextAdvanceRound,1,MAX_ROUND)&&w.nextAdvanceRound<=s.round){
    due.push({characterId:id,type:'blood-loss',woundId:w.id,dueRound:w.nextAdvanceRound});
   }
  }
  // HMK pp.162,170: injury mishaps resolve immediately. A serious/grievous
  // wound's Morale Roll becomes mandatory after all associated Shock ends.
  for(const m of unresolvedInjuryMishaps(ps))due.push({characterId:id,type:'injury-mishap',mishapId:m.id,dueRound:s.round});
  for(const m of dueInjuryMorale(ps))due.push({characterId:id,type:'injury-morale',woundId:m.woundId,dueRound:s.round});
  if(ps.fear?.state==='brave'&&ps.fear.timelineId===s.timelineId&&
   int(ps.fear.braveExpiresAtRound,1,MAX_ROUND)&&ps.fear.braveExpiresAtRound<=s.round)
   due.push({characterId:id,type:'fear-brave-expiry',dueRound:ps.fear.braveExpiresAtRound});
  if(ps.morale?.state==='brave'&&ps.morale.braveTimelineId===s.timelineId
   &&int(ps.morale.braveSince,1,MAX_ROUND)&&ps.morale.braveSince+60<=s.round){
   due.push({characterId:id,type:'brave-expiry',dueRound:ps.morale.braveSince+60});
  }
  const q=ps.shockFollowup;
  if(q&&q.kind==='UNC'&&q.phase==='after-ten-minutes'&&q.timelineId===s.timelineId&&q.dueRound<=s.round){
   due.push({characterId:id,type:'unc-shock-reroll',dueRound:q.dueRound});
  }
  if(q&&q.phase==='after-all-bleeding-stopped')due.push({characterId:id,type:'blood-shock-reroll',dueRound:q.dueRound});
 }
 // Same-character priorities must agree with guidedMandatoryEvents(): an
 // immediate Injury Mishap precedes a timed Blood Loss, followed by Shock
 // and post-Shock Morale. Keep the scheduler's initiative order across
 // distinct participants; never let the two resolvers demand different first
 // events (which would deadlock the unified guide).
 const priority={'injury-mishap':0,'group-cohesion-assessment':0.5,'special-morale':0.6,'blood-loss':1,'unc-shock-reroll':2,
  'blood-shock-reroll':2,'fear-brave-expiry':2.5,'brave-expiry':2.5,'injury-morale':3};
 const orderIndex=new Map(s.order.map((id,i)=>[id,i]));
 due.sort((a,b)=>(orderIndex.get(a.characterId)-orderIndex.get(b.characterId))||
  ((priority[a.type]??99)-(priority[b.type]??99))||(a.dueRound-b.dueRound));
 return due;
}
export function dueEndTurnEvents(sequence,states){
 const s=validateEncounterSequence(sequence);
 if(!s.active||s.cursor>=s.order.length)return [];
 const id=s.order[s.cursor],p=persistentState(states,id),q=p.shockFollowup,due=[];
 if(q&&['STN','INC'].includes(q.kind)&&q.phase==='end-next-turn'&&q.timelineId===s.timelineId&&q.dueRound<=s.round){
  due.push({characterId:id,type:'shock-end-turn',dueRound:q.dueRound});
 }
 // A Mishap suffered DURING the current turn enforces Pass on the NEXT turn.
 // Only a Pass obligation already present when this turn began can be consumed now.
 // A helpless fighter cannot spend this turn Pass. Keep the obligation
 // recorded for the first later turn on which an actual Pass is possible.
 if(!['INC','UNC','KIA'].includes(s.entryShock)&&s.entryMorale!=='catatonic'&&
   p.shock!=='KIA'&&s.entryForcedPass&&p.posture?.passNextTurn)
  due.push({characterId:id,type:'mishap-pass-end-turn',dueRound:s.round});
 if(!['INC','UNC','KIA'].includes(p.shock)&&['routed','withdrawing'].includes(p.morale?.state)&&p.morale?.rallyPending?.required===true&&
   p.morale.rallyPending.timelineId===s.timelineId&&p.morale.rallyPending.lastReactionRound!==s.round)
  due.push({characterId:id,type:'rally-end-turn-reaction',dueRound:s.round});
 // HMK p.187: afraid tests Will after each affected turn. A CF0
 // catatonic victim first tests at the end of the NEXT turn (not at
 // perception). The source event was placed in the same Initiative log.
 if(['afraid','catatonic'].includes(p.fear?.state)&&p.fear.timelineId===s.timelineId&&
    p.fear.lastReactionRound!==s.round){
  const perceived=s.log.findIndex(e=>e.type==='fear-exposure'&&
    e.eventId===p.fear.sourceEventId&&e.actorId===id);
  const laterStart=perceived>=0&&s.log.slice(perceived+1).some(e=>
    e.type==='turn-start'&&e.actorId===id);
  if(laterStart)due.push({characterId:id,type:'fear-end-turn-reaction',dueRound:s.round});
 }
 if(p.shock!=='KIA'&&p.morale?.state==='catatonic'&&
   !(p.morale.lastReactionRound===s.round&&p.morale.lastReactionTimelineId===s.timelineId)){
  due.push({characterId:id,type:'catatonic-end-turn-reaction',dueRound:s.round});
 }
 return due;
}
/** HMK p.161: select only actually aware and initially loaded crossbow
 * shooters. Selected shooters lead the FIRST round in descending IR, while
 * each still occurs exactly once in the order. No extra initiative turn.
 * The GM may decline priority for any eligible shooter before play starts.
 */
export function configureInitialCrossbowPriority(sequence,{shooters=[],gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true,'GM musí potvrdit volbu úvodního výstřelu');
 requireValid(s.round===1&&!s.active&&s.cursor===0&&!s.interruptActiveId&&
  !s.initialCrossbowPriority&&!s.log.some(e=>e.type==='turn-start'),
  'Po prvním IR už nelze dodatečně měnit přednostní střelbu');
 requireValid(Array.isArray(shooters)&&shooters.length<=s.order.length,
  'Neplatná množina přednostních střelců');
 const seen=new Set(),byActor=new Map();
 for(const entry of shooters){
  requireValid(entry&&typeof entry.actorId==='string'&&typeof entry.weaponId==='string'&&
   !seen.has(entry.actorId)&&s.order.includes(entry.actorId),
   'Neplatný nebo duplicitní střelec při počátečním výstřelu');
  seen.add(entry.actorId);
  const row=s.roster.find(r=>r.id===entry.actorId),mark=s.missileReadiness?.[entry.weaponId];
  requireValid(row?.alertness==='aware',
   'HMK str.161: přednostní výstřel vyžaduje Aware střelce');
  const loadEventId=mark?.loaded?.loadEventId;
  requireValid(mark?.actorId===entry.actorId&&mark.spanned===true&&
   mark.loaded?.ammoType==='bolt'&&typeof loadEventId==='string'&&
   s.log.some(e=>e.type==='missile-load-complete'&&e.preCombat===true&&
    e.gmConfirmed===true&&e.actorId===entry.actorId&&e.weaponId===entry.weaponId&&
    e.eventId===loadEventId),
   'Přednostní výstřel vyžaduje skutečně před bojem nabitou kuši');
  byActor.set(entry.actorId,{actorId:entry.actorId,weaponId:entry.weaponId,loadEventId});
 }
 if(!byActor.size)return s;
 const chosen=s.order.filter(id=>byActor.has(id));
 s.order=[...chosen,...s.order.filter(id=>!byActor.has(id))];
 s.initialCrossbowPriority=chosen.map(id=>byActor.get(id));
 s.log.push({type:'precombat-crossbow-priority-configured',round:1,
  shooters:s.initialCrossbowPriority.map(x=>({...x})),gmConfirmed:true});
 return validateEncounterSequence(s);
}
/** Enforce the selected weapon AND attack type at the beginning of the
 * existing full Missile guide and again before its atomic final commit. */
export function requireInitialCrossbowShot(sequence,{actorId,weaponId,attackKind}={}){
 const s=validateEncounterSequence(sequence),queue=s.initialCrossbowPriority||[];
 if(s.round!==1||s.cursor>=queue.length)return true;
 const current=queue[s.cursor];
 requireValid(s.active&&s.order[s.cursor]===actorId&&current.actorId===actorId,
  'Přednostní střelba musí dodržet potvrzené pořadí IR');
 requireValid(attackKind==='missile'&&weaponId===current.weaponId,
  'HMK str.161: úvodní přednostní akcí je pouze Shoot z potvrzené nabité kuše');
 return true;
}
/** A priority slot is only for an actually possible opening shot.
 * When injury, morale or alertness makes it impossible before the shot,
 * relinquish that OPTION before starting the next actor's IR.  This cannot
 * grant any extra turn or erase one already completed.
 */
function relinquishInitialCrossbowPriority(sequence,{actorId,reason}={}){
 const s=validateEncounterSequence(sequence),q=s.initialCrossbowPriority||[];
 requireValid(s.round===1&&!s.active&&!s.interruptActiveId&&!s.pendingEndTurnAction&&
  s.cursor<q.length&&q[s.cursor]?.actorId===actorId,
  'Jen dosud neprovedený úvodní výstřel aktuálního střelce lze odebrat');
 requireValid(typeof reason==='string'&&reason.length>0&&reason.length<160,
  'Chybí skutečný důvod opuštění přednostního výstřelu');
 const remaining=q.filter((_,i)=>i!==s.cursor),keptIds=new Set(remaining.map(e=>e.actorId));
 const normal=s.roster.map(r=>r.id).filter(id=>!keptIds.has(id));
 s.order=[...remaining.map(e=>e.actorId),...normal];
 s.initialCrossbowPriority=remaining.length?remaining:null;
 s.log.push({round:1,type:'precombat-crossbow-priority-relinquished',
  actorId,reason,automaticRule:true});
 return validateEncounterSequence(s);
}
/** HMK p.204: the completed regular IR has an outstanding bonus action and
 * obligatory END roll. This gate reads only persisted sequence evidence; it
 * does not invent an action, END result, or substitute sessionStorage state.
 * The source and resolution event must match the same six-round burst. */
export function duePelahnHyperBurstBonus(sequence){
 const s=validateEncounterSequence(sequence);
 if(s.active||s.pendingEndTurnAction||s.interruptActiveId||s.cursor<1)return null;
 const actorId=s.order[s.cursor-1];
 // Once transformed into Shade the actor has no physical body: an older
 // overlapping source must not re-award a physical bonus or END roll.
 if(s.log.some(e=>e.type==='pelahn-total-release-shade'&&e.actorId===actorId))return null;
 const last=[...s.log].reverse().find(x=>x.type==='turn-complete'&&
  x.actorId===actorId&&x.round===s.round);
 if(!last)return null;
 const sourceOptions=pelahnSourcesForActor(s,actorId).filter(b=>{
  if(actorId===b.casterId&&s.log.some(e=>e.type==='pelahn-total-release-shade'&&
   e.eventId===b.id&&e.actorId===actorId))return false;
  const origin=s.log.findIndex(x=>x.type==='pelahn-total-release-source'&&x.eventId===b.id);
  return origin>=0&&s.log.indexOf(last)>origin;
 });
 if(sourceOptions.length>1)throw Error('Raw Pèleáhn: postava je v překryvu více zdrojů; HMK str.204 neurčuje skládání bonusů a END — vyžaduje rozhodnutí GM');
 const b=sourceOptions[0];
 if(!b||s.log.some(x=>x.type==='pelahn-bonus-resolved'&&x.sourceEventId===b.id&&
   x.round===s.round&&x.actorId===actorId))return null;
 return {sourceEventId:b.id,actorId,round:s.round,regularAction:last.action};
}
export function startEncounterTurn(sequence,states){
 const s=validateEncounterSequence(sequence);
 requireValid(!duePelahnHyperBurstBonus(s),'Hyper Burst: nejprve musí proběhnout druhá akce a fyzický END d100 před dalším IR');
 requireValid(!s.pendingEndTurnAction,'Před dalším tahem je nutné uzavřít Shock Reroll a původní akci');
 requireValid(!s.active&&!s.interruptActiveId&&s.cursor<s.order.length,'Tah již běží nebo kolo skončilo');
 const events=dueEncounterEvents(s,states);
 requireValid(events.length===0,'Před dalším tahem musí GM vyřešit splatné události: '+events.map(e=>`${e.type} ${e.characterId}${e.woundId?' / '+e.woundId:''}`).join(', '));
 const id=s.order[s.cursor],p=persistentState(states,id);
 // An initial loaded crossbow shot is optional only while physically
 // possible. If an earlier priority shot incapacitates or routs this
 // combatant, restore their regular IR instead of deadlocking the guide.
 if(s.round===1&&s.cursor<(s.initialCrossbowPriority?.length||0)){
  const row=s.roster.find(r=>r.id===id);
  const disqualified=['INC','UNC','KIA'].includes(p.shock)||p.coma?.active||
   ['routed','withdrawing','catatonic'].includes(p.morale?.state)||
   p.posture?.passNextTurn||p.morale?.surrender?.active===true||row?.alertness!=='aware';
  if(disqualified){
   const shifted=relinquishInitialCrossbowPriority(s,{actorId:id,
    reason:'pre-turn incapacity / morale / alertness / mandatory pass'});
   return startEncounterTurn(shifted,states);
  }
 }
 const ongoing=s.commitments?.[id];
 if(ongoing?.status==='in-progress'){
  const interruption=concentrationInterruptionReason(p)||concentrationInterruptionHistory(p,ongoing);
  if(interruption){
   ongoing.status='interrupted';ongoing.reason=interruption;
   s.log.push({round:s.round,type:'concentration-interrupted',actorId:id,reason:interruption});
  }else if(ongoing.completionRound<=s.round)
   fail('Vícekolová akce na tomto IR skončí právě teď: GM musí potvrdit nepřerušené soustředění nebo akci opustit');
 }
 s.active=true;s.entryAlertness=s.roster.find(x=>x.id===id)?.alertness||'aware';
 s.entryShock=p.shock;s.entryMorale=p.morale?.state??'steady';s.entryFear=p.fear?.state??'steady';s.entryForcedPass=!!p.posture?.passNextTurn;
 // Snapshot at TURN START: a Counterstrike Grab Hold earned later in this
 // very attack obliges Pass on the NEXT turn, never retroactively.
 s.entryGrabHoldTarget=p.grabHold?.active===true&&p.grabHold.targetId===id;
 s.log.push({round:s.round,type:'turn-start',actorId:id,shock:p.shock,alertness:s.entryAlertness,
  ...(p.morale?.surrender?.active===true?{surrenderEventId:p.morale.surrender.sourceEventId}:{})});
 return s;
}
/** HMK p.161: exactly one free action, BEFORE the main 1-turn action.
 * A free-action claim is an authoritative Initiative event, never a GM
 * checkbox. The same turn token works across save/restore and old saves. */
function freeActionToken(s){return `${s.timelineId}:${s.round}:${s.cursor}:${s.order[s.cursor]}`;}
export function encounterFreeActionAvailable(sequence,actorId,states=null){
 const s=validateEncounterSequence(sequence);
 if(states?.[actorId]?.morale?.surrender?.active===true||surrenderOpenInSequence(s,actorId))return false;
 if(!s.active||s.interruptActiveId||s.pendingEndTurnAction||currentEncounterActor(s)!==actorId||
  s.commitments?.[actorId]?.status==='in-progress')return false;
 const token=freeActionToken(s);
 if(s.freeActionTurn?.token===token)return false;
 // Older saved timelines did not have a free-action field: never allow a
 // second Rally or Mounted Control merely because that field is absent.
 if(s.log.some(e=>e.round===s.round&&e.actorId===actorId&&
  (e.type==='free-action'||e.type==='rally'||e.type==='mounted-control-free')&&
  (e.token===token||e.token===`${s.timelineId}:${s.round}:${s.cursor}:${actorId}`)))return false;
 return s.log.at(-1)?.type==='turn-start'&&s.log.at(-1)?.actorId===actorId&&
  s.log.at(-1)?.round===s.round;
}
export function recordEncounterFreeAction(sequence,{actorId,kind,states=null}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(['rally','mounted-control','draw-weapon','ready-pocket-item','five-foot-step','open-unlocked-object','command-allies','intimidate-foe','free-missile-load'].includes(kind),'Nepodporovaná volná akce HMK');
 requireValid(encounterFreeActionAvailable(s,actorId,states),
  'Volná akce musí být jediná a provedená před hlavní akcí na vlastním IR');
 const token=freeActionToken(s);
 s.freeActionTurn={token,kind};
 s.log.push({round:s.round,type:'free-action',actorId,kind,token});
 return s;
}
/** Shared pure authoritative concentration placement. Both normal turn and
 * documented post-regular-action Hyper Burst call this very same scheduling
 * implementation; no independent commitment calculation or persistence path.
 */
function placeEncounterConcentration(s,{actorId,durationRounds,eventCount}){
 const row=s.roster.find(x=>x.id===actorId);
 requireValid(!!row&&int(durationRounds,1,9999)&&s.round+durationRounds<=MAX_ROUND&&
  int(eventCount,0,1000000),'Koncentrace vyžaduje živého aktéra a doložené trvání');
 s.commitments??={};
 requireValid(!s.commitments[actorId]||['completed','abandoned'].includes(s.commitments[actorId].status),
  'Vícekolová koncentrace již právě probíhá');
 s.commitments[actorId]={startRound:s.round,startIR:row.rank,completionRound:s.round+durationRounds,
  durationRounds,startEventIndex:eventCount,status:'in-progress'};
 s.log.push({round:s.round,type:'concentration-start',actorId,completionRound:s.round+durationRounds});
 return s;
}
/** Placement-only continuation after completed regular IR. Explicitly does
 * not grant a new ordinary turn. Obligations, END, and one document commit
 * remain the caller's responsibility.
 */
export function beginPelahnBonusConcentration(sequence,states,{actorId,durationRounds,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true&&s.active===false&&s.interruptActiveId===null&&
  !s.pendingEndTurnAction&&s.cursor>0&&s.order[s.cursor-1]===actorId,
  'Hyper Burst Incant vyžaduje právě dokončenou běžnou akci');
 requireValid(duePelahnHyperBurstBonus(s)?.actorId===actorId,
  'Přímé volání nesmí zahájit bonusový Incant bez skutečného zdroje Hyper Burstu');
 const last=[...s.log].reverse().find(e=>e.type==='turn-complete'&&e.round===s.round&&e.actorId===actorId);
 requireValid(last&&!['incant','concentrate-start','concentrate-hold','concentrate-abandon'].includes(last.action),
  'Incant smí být jen jednou v tahu');
 requireValid(!s.commitments?.[actorId]||['completed','abandoned'].includes(s.commitments[actorId].status),
  'Nelze začít další Incant při probíhající koncentraci');
 const p=persistentState(states,actorId),row=s.roster.find(x=>x.id===actorId);
 requireValid(p.shock==='NONE'&&!p.coma?.active&&!p.posture?.passNextTurn&&
  !p.pendingManeuver&&!p.mishaps?.some(x=>!x.resolved)&&
  ['steady','brave'].includes(p.morale?.state??'steady')&&row?.alertness==='aware'&&
  !concentrationInterruptionReason(p),'Aktuální bojový stav brání Incant spellstart');
 requireValid(!dueEncounterEvents(s,states).length,'Nejdřív splatný Shock/Morale/Mishap');
 placeEncounterConcentration(s,{actorId,durationRounds,eventCount:p.events.length});
 s.log.push({type:'pelahn-bonus-incant-spellstart',round:s.round,actorId,
  durationRounds,source:'shared-concentration-scheduler',gmConfirmed:true});
 return validateEncounterSequence(s);
}
export function finishEncounterTurn(sequence,states,{action='pass',durationRounds=null,readiedAction=null,movementImpossibleConfirmed=false,threatenedConfirmed=null,movementProof=null,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(s.active&&s.cursor<s.order.length&&!s.interruptActiveId,'Nelze ukončit tah, který nezačal, nebo právě probíhá přerušující akce');
 requireValid(!s.pendingEndTurnAction,'Akce již byla vykonána; nelze ji opakovat před vyhodnocením Shock Reroll');
 requireValid(gmConfirmed===true,'GM musí potvrdit skutečné dokončení tahu');
 requireValid(ACTIONS.has(action),'Neznámá kategorie bojové akce');
 // HMK p.161: a five-foot FREE step never precedes Move, Evade or Charge movement.
 // Check centrally, including callers that bypass the guided menu.
 if(s.freeActionTurn?.token===freeActionToken(s))
  requireValid(action!=='concentrate-start',
   'Volnou akci nelze kombinovat se zahájením 1+ round soustředění (HMK str.161)');
 if(s.freeActionTurn?.token===freeActionToken(s)&&s.freeActionTurn.kind==='five-foot-step')
  requireValid(!['move','evade','charge'].includes(action),
   'Pětistopý volný krok nelze kombinovat s pohybem Move, Evade ani Charge (HMK str.161)');
 const pending=dueEndTurnEvents(s,states);
 const id=s.order[s.cursor],p=persistentState(states,id);
 // HMK p184: a blind combatant moving faster than Half Move must take
 // a real Stumble test. Guard the authoritative turn boundary, not only UI.
 if(action==='move'&&isPermanentlyBlind(p)&&movementProof?.projection?.moveRate===undefined)
  requireValid(false,'HMK str.184: u slepé postavy je nutné doložit rychlost pohybu a případný Stumble');
 if(action==='move'&&isPermanentlyBlind(p)&&['full','double'].includes(movementProof?.projection?.moveRate)){
  const pr=movementProof.projection,ev=movementProof.stumbleEvidence;
  const causes=pr.stumbleCauses??[pr.stumbleCause];
  const rolls=ev?.rolls??(ev?.roll===undefined?[]:[{cause:'blindness',roll:ev.roll,eml:ev.eml,technique:ev.technique,usedArms:ev.usedArms}]);
  requireValid(pr.blindnessStumble===true&&Array.isArray(causes)&&causes[0]==='blindness'&&
   causes.length>=1&&causes.length<=2&&new Set(causes).size===causes.length&&
   causes.every(x=>['blindness','double-bend'].includes(x))&&Array.isArray(rolls)&&
   rolls.length>=1&&rolls.length<=causes.length&&rolls.every((r,i)=>
    r?.cause===causes[i]&&int(r.roll,1,100)&&int(r.eml,-500,500)&&
    ['agility','acrobatics'].includes(r.technique)&&Array.isArray(r.usedArms)),
   'HMK str.160,184: slepý při Full/Double Move musí mít samostatný skutečný Stumble d100 pro každou dosaženou příčinu');
  const failing=rolls.findIndex(r=>successLevel(r.roll,r.eml)<SL.S);
  requireValid(rolls.length===(failing>=0?failing+1:causes.length),
   'Neúplné Stumble: po úspěchu vyžaduje zatáčka druhý nezávislý hod, po pádu už další hod nepatří');
  const failed=failing>=0,failedDie=failed?rolls[failing]:null;
  requireValid(failed?ev.stop!==null&&p.posture.prone===true&&
   p.events.some(e=>e.id===movementProof.eventId+':stumble'&&e.type==='movement-stumble-fall'&&
    e.details?.roll===failedDie.roll&&e.details?.eml===failedDie.eml&&e.details?.cause===failedDie.cause):
   ev.stop===null,
   'HMK str.161: Stumble neodpovídá skutečnému pádu a doložené poloze');
 }


 // G04 safety: a finished Pèleáhn bonus spellstart is NOT itself spellfire.
 // Neither the older free-turn form nor a direct finishEncounterTurn call may
 // consume the later Incant without a recorded physical casting resolution.
 // The existing Doom Flame resolver remains the only production source of
 // complete spellfire; unknown spells cannot masquerade as its result.
 const bonusStart=[...s.log].reverse().find(e=>e.type==='pelahn-bonus-incant-spellstart'&&
  e.actorId===id&&e.round<s.round);
 const commitment=s.commitments?.[id];
 if(bonusStart&&commitment?.status==='completed'&&commitment.completedRound===s.round&&
  commitment.startRound===bonusStart.round&&commitment.durationRounds===bonusStart.durationRounds){
  requireValid(action==='incant','HMK str.200–202: dokončený bonusový Incant vyžaduje Spellfire (nebo samostatně doložený Abort)');
  const knownResolution=s.log.some(e=>{
   if(e.actorId!==id||e.round!==s.round||e.spell!==(bonusStart.spell??'Doom Flame')||
    !['area-source-resolved','area-casting-failed','spell-misfire-form-failure',
      'spell-misfire-mental-trauma','spell-pyre-resolved','spell-pyre-casting-failed',
      'spell-pyre-misfire-form-failure','spell-pyre-misfire-mental-trauma',
      'spell-pyre-total-release'].includes(e.type)||
    !Array.isArray(e.physicalDice)||typeof e.eventId!=='string')return false;
   const roll=e.physicalDice.find(d=>d.faces===100&&int(d.value,1,100)&&
    d.source==='GM-entered-physical-die');
   if(!roll)return false;
   if(e.type==='spell-pyre-total-release'){
    // A synthetic log is insufficient: all physical GM dice, persisted
    // consequences and the causal CL III Hyper Burst must agree.
    if((bonusStart.spell??'Doom Flame')!=='Pyre'||
     e.spellstartRound!==bonusStart.round||!int(e.castingEML,1,100)||
     e.castingSL!=='CF'||e.effect!==false||e.castingFatigue!==15||
     e.misfireKind!=='total-release'||e.crucial!==true||
     e.misfirePsycheStress!==3||
     successLevel(roll.value,e.castingEML)!==SL.CF)return false;
    const [cast,mis,spirit,...dice]=e.physicalDice;
    if(e.physicalDice.length<3||cast.value!==roll.value||mis.faces!==100||mis.value!==100||
     spirit.faces!==100||!int(spirit.value,1,100)||
     e.physicalDice.some(d=>d.source!=='GM-entered-physical-die'))return false;
    const shock={CF:0,F:6,S:4,CS:2}[e.totalReleaseSpiritSL];
    if(shock===undefined||e.misfireAuralShock!==shock||dice.length!==shock||
     !dice.every(d=>d.faces===6&&int(d.value,1,6))||
     dice.reduce((n,d)=>n+d.value,0)!==e.totalReleaseSpiritMLLoss)return false;
    if(!listPelahnBurstSources(s).some(b=>b.id===e.eventId&&b.spell==='Pyre'&&
     b.complexity===3&&b.durationRounds===3&&
     b.startRound===s.round&&b.endRound===s.round+2))return false;
    if(e.totalReleaseSpiritSL==='CF'&&
     !s.log.some(x=>x.type==='pelahn-total-release-shade'&&x.eventId===e.eventId&&x.actorId===id&&
      x.spiritD100===spirit.value))return false;
    const source=s.log.find(x=>x.type==='pelahn-total-release-source'&&
     x.eventId===e.eventId&&x.spell==='Pyre'&&x.complexity===3&&
     JSON.stringify(x.physicalDice)===JSON.stringify(e.physicalDice));
    return Boolean(source)&&p.events.some(x=>x.id===e.eventId+':total-release'&&
     x.type==='hmk-spell-total-release'&&x.details?.spell==='Pyre'&&
     x.details?.castingD100===cast.value&&x.details?.spiritD100===spirit.value&&
     x.details?.spiritMLLoss===e.totalReleaseSpiritMLLoss&&
     x.details?.auralShock===shock&&x.details?.psycheStress===3);
   }
   if(e.type.startsWith('spell-pyre-')){
    if((bonusStart.spell??'Doom Flame')!=='Pyre'||e.spellstartRound!==bonusStart.round||
     !int(e.castingEML,1,100)||!int(e.castingFatigue,0,9999))return false;
    const actualSL=successLevel(roll.value,e.castingEML);
    const label=actualSL===SL.CF?'CF':actualSL===SL.F?'F':actualSL===SL.CS?'CS':'S';
    if(e.castingSL!==label||e.effect!==(label==='S'||label==='CS'))return false;
    const misfire=e.physicalDice[1];
    if(label==='CF'&&(!misfire||misfire.faces!==100||!int(misfire.value,1,99)||
     misfire.source!=='GM-entered-physical-die'))return false;
    if(label!=='CF'&&misfire)return false;
    const mis=label==='CF'?classifySpellMisfire(misfire.value,3):null;
    const fatigue=label==='CS'?5:label==='CF'?15+mis.extraFatigue:10;
    if(label==='CF'&&(mis.totalRelease||e.crucial!==mis.crucial||
     e.misfireKind!==mis.kind||e.misfirePsycheStress!==mis.psycheStress||
     e.misfireAuralShock!==mis.auralShock))return false;
    if(e.castingFatigue!==fatigue||e.type!== (label==='CF'?
      (mis.category==='form-failure'?'spell-pyre-misfire-form-failure':'spell-pyre-misfire-mental-trauma'):
      label==='F'?'spell-pyre-casting-failed':'spell-pyre-resolved'))return false;
    return p.events.some(x=>x.id===e.eventId+':casting-fatigue'&&
     x.type==='hmk-casting-fatigue'&&x.details?.spell==='Pyre'&&
     x.details?.outcome===label&&x.details?.castingRoll===roll.value&&
     x.details?.fatigue===fatigue&&x.details?.misfireD100===(misfire?.value??null));
   }
   if(e.type==='area-source-resolved'){
    return s.log.some(x=>x.type==='hit-confirmed'&&x.actorId===id&&x.round===s.round)&&
     Object.values(s.confirmedHits??{}).some(h=>h?.actionKind==='area'&&
      h.sourceEventId===e.eventId)&&
     p.events.some(x=>x.type==='hmk-casting-fatigue'&&
      x.id===e.eventId+':casting-fatigue'&&x.details?.spell==='Doom Flame'&&
      x.details?.castingRoll===roll.value);
   }
   if(e.type==='area-casting-failed')return p.events.some(x=>
    x.id===e.eventId+':failed-casting'&&x.type==='hmk-casting-fatigue'&&
    x.details?.outcome==='F'&&x.details?.castingRoll===roll.value);
   return p.events.some(x=>x.id===e.eventId+':spell-misfire'&&
    x.type==='hmk-spell-misfire'&&x.details?.castingRoll===roll.value&&
    x.details?.castingSL==='CF');
  });
  requireValid(knownResolution,
   'HMK str.202: před ukončením Incant musí proběhnout autoritativní fyzický Casting Roll a úplná Spellfire/Misfire Sequence');
 }

 // HMK p.227: proactive Doom Flame Evade is physically resolved NOW, but
 // consumes the evader's NEXT scheduled IR action. Repeating the movement or
 // selecting an unrelated action on that next IR is forbidden.
 const unpaidAreaEvades=s.log.filter(e=>e.type==='proactive-area-evade'&&e.actorId===id&&
  e.dueRound===s.round&&!s.log.some(x=>x.type==='proactive-area-evade-paid'&&x.eventId===e.eventId));
 requireValid(unpaidAreaEvades.length<=1,'Duplicitní závazek proaktivní Area Evade');
 const prepaidEvade=unpaidAreaEvades[0]??null;
 if(prepaidEvade)requireValid(action==='evade'||(['INC','UNC','KIA'].includes(p.shock)&&action==='incapacitated'),
  'HMK p227: proactive Evade spotřebovala tento Initiative Rank, nelze vykonat další akci');
 // An initial priority slot belongs to the nominated crossbow shot only.
 // A combatant disabled by an earlier priority shot may have an incapable
 // turn; a pre-existing compulsory Pass still takes precedence.
 if(s.round===1&&s.cursor<(s.initialCrossbowPriority?.length||0)){
  const incapable=['INC','UNC','KIA'].includes(s.entryShock)||
   s.entryAlertness==='unaware'||s.entryMorale==='catatonic';
  requireValid(action==='attack'||(incapable&&action==='incapacitated')||
   (s.entryForcedPass===true&&action==='pass'),
   'HMK str.161: před řádným IR lze vykonat pouze deklarovaný úvodní výstřel kuše');
 }
 const helpless=completeParalysis(p)||['INC','UNC','KIA'].includes(p.shock)||p.coma?.active||p.morale?.state==='catatonic'||
  p.fear?.state==='catatonic'||s.entryFear==='catatonic';
 if(!helpless&&['afraid','terrified'].includes(p.fear?.state))
  requireValid(['pass','move'].includes(action),
   'HMK p.187 Fear/Aberrance: povoleno pouze Pass nebo pohyb od zdroje');
 if((p.morale?.surrender?.active===true||surrenderOpenInSequence(s,id))&&!helpless)
  requireValid(action==='pass','Vzdávající se postava nesmí bez doloženého ukončení kapitulace zahájit bojovou akci');
 const startedConfused=s.entryAlertness==='confused';
 // A participant who BEGAN their turn incapacitated cannot Pass and thus
 // cannot take an additional Confused Reaction; their Shock reroll comes
 // after the helpless turn. Confusion remains for any later capable turn.
 const confusedReactionPending=startedConfused&&!helpless&&
  !['INC','UNC','KIA'].includes(s.entryShock)&&
  !(s.reactions?.[id]?.round===s.round&&s.reactions[id].phase==='end-turn');
 // HMK p.159: a Confused combatant MUST Pass, then makes their physical
 // Initiative Reaction at END OF TURN. It is not legal to roll before Pass.
 if(confusedReactionPending)requireValid(action==='pass',
  'Confused musí nejprve vykonat Pass, až poté provede Reaction na konci tahu');
 // HMK p.169: STN reroll is at the END of the NEXT turn, not BEFORE
 // that character's action. Stage the fully adjudicated action once, then
 // request the physical Shock roll. Do not advance Initiative prematurely.
 const delayedShock=pending.some(e=>e.type==='shock-end-turn')&&['STN','INC'].includes(s.entryShock);
 const delayedFear=pending.some(e=>e.type==='fear-end-turn-reaction');
 const delayedRally=pending.some(e=>e.type==='rally-end-turn-reaction')&&
  ['routed','withdrawing'].includes(s.entryMorale);
 requireValid(!pending.length||((delayedShock||delayedRally||delayedFear)&&
  pending.every(e=>e.type==='shock-end-turn'||e.type==='rally-end-turn-reaction'||e.type==='fear-end-turn-reaction')),
  'Nelze ukončit tah: povinný Shock / Mishap Pass / Catatonic Reaction na konci tahu ještě nebyl vyhodnocen');
 if(action==='evade'&&!prepaidEvade)requireValid(s.entryShock!=='STN'&&p.shock!=='STN','Stunned postava nesmí vybrat Evade (HMK str.161)');
 if(action==='incapacitated')requireValid(helpless||['INC','UNC','KIA'].includes(s.entryShock)||s.entryMorale==='catatonic'||s.entryAlertness==='unaware',
  'Schopná, Aware postava nemůže deklarovat technický stav Incapacitated jako akci');
 // A counterstrike or other simultaneously resolved consequence may INC/UNC
 // the attacker AFTER their proven strike. That cannot erase an already
 // performed Attack, but it forbids taking any new action afterwards.
 const completedAttack=['attack','charge'].includes(action)&&
  !!s.confirmedHits?.[currentAttackToken(s)]&&
  !['INC','UNC','KIA'].includes(s.entryShock)&&s.entryMorale!=='catatonic';
 if(helpless&&!completedAttack)requireValid(action==='incapacitated','Bezvládná či mrtvá postava nemůže vykonat akci');
 if(['INC','UNC','KIA'].includes(s.entryShock)||s.entryMorale==='catatonic')
  requireValid(action==='incapacitated','Postava začala tah bezvládná či Catatonic; zotavení na konci tahu nedovoluje zpětně vykonat akci');
 if(['attack','charge'].includes(action))requireValid(!!s.confirmedHits?.[currentAttackToken(s)],
  'Attack/Charge se smí dokončit až po jediném ověřeném výsledku útoku v aktuálním tahu');
 if(s.entryForcedPass&&!helpless&&!['INC','UNC','KIA'].includes(s.entryShock)&&s.entryMorale!=='catatonic')requireValid(action==='pass','Mishap přikazuje v tomto tahu Pass, i když je následný efekt na konci tahu vyřešen');
 if(!helpless&&['afraid','terrified'].includes(p.fear?.state)){
  requireValid(['pass','move'].includes(action),
   'HMK p.187: Afraid/Terrified nesmí útočit, sesílat ani jinak jednat; pouze Pass nebo pohyb od zdroje');
  if(action==='pass'&&p.fear.state==='terrified'&&!s.entryForcedPass)
   requireValid(movementImpossibleConfirmed===true,
    'HMK p.187: Terrified musí prchat plným Move; Pass jen pokud útěk není možný');
  if(action==='move'){
   const proof=movementProof?.projection,world=movementProof?.battlefield;
   const sourceId=p.fear.sourceId;
   const source=world?.units?.find(u=>u.id===sourceId),
    actor=world?.units?.find(u=>u.id===id),last=proof?.actualPath?.at(-1);
   requireValid(Array.isArray(s.spatialUnits)&&s.spatialUnits.length===s.order.length&&
    s.order.every(who=>{
     const old=s.spatialUnits.find(u=>u.id===who),present=world?.units?.find(u=>u.id===who);
     return old&&present&&Math.hypot(old.x-present.x,old.y-present.y)<1e-7;
    }),
    'Fear Move musí vycházet ze skutečných uložených prostorových pozic');
   requireValid(p.fear.sourceKind==='character'&&source&&actor&&last&&
    proof.format==='hmk-guided-spatial-projection-v1'&&proof.actorId===id&&proof.action==='move'&&
    (p.fear.state!=='terrified'||proof.moveRate==='full')&&
    Math.hypot(last.x-source.x,last.y-source.y)>Math.hypot(actor.x-source.x,actor.y-source.y)+1e-7,
    'HMK p.187: skutečný Move musí být doložená trasa od zdroje Fear (Terrified: full Move)');
   const recalculated=projectGuidedSpatialPath({actorId:id,battlefield:world,
    path:proof.requestedPath,action:'move',moveRate:proof.moveRate,
    effectiveMove:proof.effectiveMove,difficultSources:proof.difficultSources,
    stunned:proof.terrainFactor/(2**proof.difficultSources)>1,
    moralePurpose:null,retreatConfirmed:false,blindness:isPermanentlyBlind(p)});
   requireValid(JSON.stringify(recalculated)===JSON.stringify(proof),
    'Fear Move nemá autoritativně přepočtený prostorový důkaz');
  }
 }
 if(!helpless&&p.grabHold?.active&&p.grabHold.targetId===id&&
   (s.entryGrabHoldTarget===true||
    // Legacy in-progress saves lack a turn-start witness; a *completed*
    // current attack cannot be rewritten as a newly mandatory Pass.
    (s.entryGrabHoldTarget===undefined&&!s.confirmedHits?.[currentAttackToken(s)])))
  requireValid(action==='pass','HMK str.106: cíl Grab Hold musí Pass na svém následujícím tahu (bránit se smí)');
 // HMK p.162: Routed flees at full Move; Withdrawing retreats at least
 // a half Move. Pass is an EXCEPTION only if movement is impossible.
 // The guide may offer the option for GM review, but a mere Pass selection
 // cannot certify that factual condition. A separate mandatory Pass from
 // Mishap or Confused is governed by its own rule and needs no such claim.
 const forcedPass=!!s.entryForcedPass||s.entryAlertness==='confused';
 if(!helpless&&s.entryMorale!=='catatonic'&&['routed','withdrawing'].includes(p.morale?.state)){
  requireValid(['move','pass'].includes(action),
   'Morale: Routed/Withdrawing musí utíkat nebo ustupovat; nelze jednat jinak (HMK str.162)');
  if(action==='pass'&&!forcedPass&&!p.morale?.surrender?.active)requireValid(movementImpossibleConfirmed===true,
   'HMK str.162: Pass při Routed/Withdrawing je dovolen pouze když útěk či ústup není možný; GM musí výjimku výslovně potvrdit');
  if(action==='pass'&&p.morale?.state==='routed'&&!p.morale?.surrender?.active){
   requireValid(typeof threatenedConfirmed==='boolean',
    'HMK str.162: GM musí doložit, zda je Routed postava při nemožnosti útěku ohrožena');
   if(threatenedConfirmed===true&&movementImpossibleConfirmed===true)requireValid(p.morale.surrender?.active===true,
    'HMK str.162: ohrožená Routed postava musí před potvrzením Pass trvale zaznamenat kapitulaci');
  }
 }
 for(const [otherId,otherState] of Object.entries(states)){
  const hold=otherState?.grabHold;
  if(otherId!==id&&!helpless&&otherState.shock!=='KIA'&&hold?.active&&hold.grabberId===id&&hold.createdRound<s.round)
   fail(`HMK str.106: před dokončením tahu musí ${id} opakovat Grab Hold d6+STR proti ${otherId}`);
 }
 const row=s.roster.find(x=>x.id===id);
 if(!helpless&&s.entryAlertness==='confused')requireValid(action==='pass','Confused musí Pass; Reaction na konci tahu umožní akci až v dalším tahu');
 if(!helpless&&s.entryAlertness==='unaware')requireValid(action==='incapacitated','Unaware nesmí jednat, dokud není upozorněna na nebezpečí (HMK str.158)');
 const running=s.commitments?.[id];
 if(running?.status==='in-progress'){
  const interruption=concentrationInterruptionReason(p)||concentrationInterruptionHistory(p,running);
  requireValid(!interruption,'HMK str.182: koncentrace již byla přerušena ('+interruption+'); nelze pokračovat ani potvrdit dokončení');
  requireValid(['concentrate-hold','concentrate-abandon'].includes(action)||(helpless&&action==='incapacitated'),
   'Vícekolová akce vyžaduje pokračování koncentrace nebo výslovné opuštění');
  if(action==='concentrate-abandon'||(helpless&&action==='incapacitated')){
   running.status='abandoned';running.reason=helpless?'incapacitated':'GM-abandoned';
   s.log.push({round:s.round,type:'concentration-abandoned',actorId:id});
  }
 }else if(action==='concentrate-start'){
  requireValid(!concentrationInterruptionReason(p),
   'HMK str.182: Shock, Grim Wound nebo Grievous Skull přerušuje koncentraci');
  requireValid(!helpless&&row.alertness==='aware','Vícekolovou akci může začít pouze schopný a Aware účastník');
  requireValid(int(durationRounds,1,9999)&&s.round+durationRounds<=MAX_ROUND,'Požadována potvrzená délka 1+ round akce');
  placeEncounterConcentration(s,{actorId:id,durationRounds,eventCount:p.events.length});
 }else if(['concentrate-hold','concentrate-abandon'].includes(action))fail('Tato akce není v koncentraci');
 if(action==='ready'){
  requireValid(!s.readied[id],'Postava už má otevřenou připravenou akci');
  requireValid(['attack','grope','move'].includes(readiedAction),'Připravit lze pouze 1-turn Attack, Grope či Move (HMK str.161)');
  s.readied[id]={fromRound:s.round,originalRank:row.rank,kind:readiedAction,resolved:false};
 }
 // HMK p.162: category 'move' cannot stand in for a completed, correctly
 // calculated flight. Re-run the same pure spatial projection at this final
 // boundary. A manually constructed result without a source battlefield is
 // NOT a valid movement proof, even if it claims 'full' and 'confirmed'.
 if(!helpless&&['routed','withdrawing'].includes(p.morale?.state)&&action==='move'){
  requireValid(movementProof!==null,
   'HMK str.162: povinný Move vyžaduje přepočítanou prostorovou trasu (zatím nedoložena)');
  const w=movementProof,proof=w?.projection,world=w?.battlefield;
  requireValid(typeof w?.eventId==='string'&&w.eventId.length>0&&w.eventId.length<=180&&
   proof?.format==='hmk-guided-spatial-projection-v1'&&proof.actorId===id&&proof.action==='move'&&
   proof.moralePurpose===p.morale.state&&proof.retreatConfirmed===true&&
   (p.morale.state!=='routed'||proof.moveRate==='full')&&
   world&&Array.isArray(world.units)&&world.units.length===s.order.length&&
   s.order.every(who=>world.units.filter(u=>u.id===who).length===1),
   'HMK str.162: neplatný či nepodložený doklad full Move útěku / ústupu');
  if(s.spatialUnits?.length)requireValid(s.spatialUnits.length===s.order.length&&
   s.order.every(who=>{
    const old=s.spatialUnits.find(u=>u.id===who),now=world.units.find(u=>u.id===who);
    return old&&now&&Math.hypot(old.x-now.x,old.y-now.y)<1e-7;
   }), 'HMK str.162: prostorový doklad nesouhlasí se současnými pozicemi');
  if(s.spatialBarriers!==undefined)requireValid(JSON.stringify(world.barriers??[])===
   JSON.stringify(s.spatialBarriers.map(b=>b.kind==='wall'?{...b,open:false}:{...b,
    open:s.interactionObjects.find(o=>o.id===b.id)?.open})),
   'HMK str.162: skutečné překážky se od dokladu pohybu změnily');
  const recalculated=projectGuidedSpatialPath({actorId:id,battlefield:world,
   path:proof.requestedPath,action:'move',moveRate:proof.moveRate,
   effectiveMove:proof.effectiveMove,difficultSources:proof.difficultSources,
   stunned:proof.terrainFactor/(2**proof.difficultSources)>1,
   dodgeIndex:null,chargeAttack:null,chargeTargetId:null,
   moralePurpose:p.morale.state,retreatConfirmed:true,blindness:isPermanentlyBlind(p)});
  requireValid(JSON.stringify(recalculated)===JSON.stringify(proof),
   'HMK str.162: doložený Move neodpovídá znovu přepočtené trase a Engagement Zone');
  requireValid(!s.spatialEvents?.some(e=>e.id===w.eventId)&&
   !s.log.some(e=>e.spatialEventId===w.eventId),
   'Duplicitní prostorový důkaz povinného Morale pohybu');
 }
 if(prepaidEvade)s.log.push({type:'proactive-area-evade-paid',round:s.round,actorId:id,
  eventId:prepaidEvade.eventId,sourceEventId:prepaidEvade.sourceEventId,
  action:action==='incapacitated'?'incapacitated':'evade',movementAlreadyCompleted:true});
 if(delayedShock||delayedRally||delayedFear||confusedReactionPending){
  const pendingEffects=[...(delayedShock?['shock-end-turn']:[]),
   ...(delayedRally?['rally-end-turn-reaction']:[]),
   ...(delayedFear?['fear-end-turn-reaction']:[]),
   ...(confusedReactionPending?['confused-end-turn-reaction']:[])];
  s.pendingEndTurnAction={round:s.round,actorId:id,action,pendingEffects,
   ...(movementProof&&action==='move'?{spatialEventId:movementProof.eventId,moralePurpose:movementProof.projection.moralePurpose}:{}),
   ...(action==='pass'&&p.morale?.surrender?.active?{surrenderEventId:p.morale.surrender.sourceEventId}:{}),
   ...(action==='pass'&&['routed','withdrawing'].includes(p.morale?.state)&&!forcedPass?{movementImpossibleConfirmed:true}: {})};
  s.log.push({round:s.round,type:delayedShock?'turn-action-resolved-before-shock-reroll':
   delayedRally?'turn-action-resolved-before-rally-reaction':
   delayedFear?'turn-action-resolved-before-fear-reaction':
   'turn-action-resolved-before-confused-reaction',actorId:id,action});
  return s;
 }
 s.log.push({round:s.round,type:'turn-complete',actorId:id,action,
  ...(movementProof&&action==='move'?{spatialEventId:movementProof.eventId,moralePurpose:movementProof.projection.moralePurpose}:{}),
  ...(action==='pass'&&p.morale?.surrender?.active?{surrenderEventId:p.morale.surrender.sourceEventId}:{}),
  ...(action==='pass'&&['routed','withdrawing'].includes(p.morale?.state)&&!forcedPass?{movementImpossibleConfirmed:true}: {})});s.active=false;s.entryAlertness=null;s.entryShock=null;s.entryMorale=null;s.entryFear=null;s.entryForcedPass=false;s.entryGrabHoldTarget=undefined;s.freeActionTurn=null;s.cursor++;
 return s;
}
/** HMK p.169: after the physically entered end-of-next-turn STN reroll,
 * finalize the ONE already-resolved action without asking the GM to repeat it.
 * This function is deterministic, idempotence-guarded and storage-agnostic;
 * caller must save the post-roll character state and sequence atomically.
 */
export function finalizeStagedEncounterTurn(sequence,states){
 const s=validateEncounterSequence(sequence),p=s.pendingEndTurnAction;
 requireValid(s.active&&!s.interruptActiveId&&p&&p.round===s.round&&p.actorId===s.order[s.cursor],
  'Žádná doložená vykonaná akce čekající na Shock Reroll');
 requireValid(dueEncounterEvents(s,states).length===0&&!dueEndTurnEvents(s,states).length,
  'Před dokončením již provedené akce je nutné vyřešit všechny splatné následky');
 requireValid(s.entryAlertness!=='confused'||['INC','UNC','KIA'].includes(s.entryShock)||
  (s.reactions?.[p.actorId]?.round===s.round&&s.reactions[p.actorId].phase==='end-turn'),
  'Confused Reaction musí být po Pass vyhodnocena skutečným d100');
 // G04-005: the action was physically completed BEFORE its compulsory
 // end-of-turn Shock/Confused/Rally reaction. Preserve the actual spatial
 // evidence when closing the staged turn; do not silently sever its link.
 // Older snapshots may lack pendingEffects. Recover the type from their
 // immutable staged-action marker, rather than falsely labelling every
 // Rally/Confused reaction as a Shock reroll.
 const marker=[...s.log].reverse().find(e=>e.actorId===p.actorId&&e.round===s.round&&
  ['turn-action-resolved-before-shock-reroll','turn-action-resolved-before-rally-reaction',
   'turn-action-resolved-before-confused-reaction','turn-action-resolved-before-fear-reaction'].includes(e.type));
 const effects=p.pendingEffects??(marker?[{
  'turn-action-resolved-before-shock-reroll':'shock-end-turn',
  'turn-action-resolved-before-rally-reaction':'rally-end-turn-reaction',
  'turn-action-resolved-before-confused-reaction':'confused-end-turn-reaction',
  'turn-action-resolved-before-fear-reaction':'fear-end-turn-reaction'}[marker.type]]:[]);
 requireValid(effects.length>0,'Odložená akce nemá pravidlový důvod povinného konce tahu');
 if(p.spatialEventId){
  requireValid(typeof p.spatialEventId==='string'&&p.spatialEventId.length>0&&
   s.spatialEvents?.some(e=>e.id===p.spatialEventId&&e.actorId===p.actorId&&e.round===s.round),
   'Odložený Move nemá doloženou skutečnou prostorovou událost');
 }
 s.log.push({round:s.round,type:'turn-complete',actorId:p.actorId,action:p.action,
  ...(p.spatialEventId?{spatialEventId:p.spatialEventId,moralePurpose:p.moralePurpose}:{}),
  ...(p.movementImpossibleConfirmed?{movementImpossibleConfirmed:true}: {}),
  ...(p.surrenderEventId?{surrenderEventId:p.surrenderEventId}:{}),
  endTurnResolvedEffects:[...effects],
  ...(effects.includes('shock-end-turn')?{afterEndTurnShock:true}:{}),
  ...(effects.includes('rally-end-turn-reaction')?{afterEndTurnRally:true}:{}),
  ...(effects.includes('fear-end-turn-reaction')?{afterEndTurnFear:true}:{}),
  ...(effects.includes('confused-end-turn-reaction')?{afterEndTurnConfused:true}:{})});
 s.pendingEndTurnAction=null;s.active=false;s.entryAlertness=null;
 s.entryShock=null;s.entryMorale=null;s.entryFear=null;s.entryForcedPass=false;s.entryGrabHoldTarget=undefined;s.freeActionTurn=null;s.cursor++;
 return validateEncounterSequence(s);
}
/** Readied 1-turn actions resolve later, may interrupt another turn;
 * next-round IR is the confirmed interrupt IR. Does not grant another turn. */
export function resolveReadiedEncounterAction(sequence,{actorId,interruptIR,states=null,moveHalfConfirmed=false,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true,'Přerušení připravenou akcí musí potvrdit GM');
 // G04-006: a prepared action has not yet occurred. New compulsory
 // Morale, shock, surrender, or Mishap conditions take precedence at trigger
 // time. Requiring live state also blocks alternate callers that omit it.
 const actorState=persistentState(states??{},actorId);
 requireNoFearAttack(s,actorId,states);
 requireValid(!['INC','UNC','KIA'].includes(actorState.shock)&&!actorState.coma?.active&&
  !['routed','withdrawing','catatonic'].includes(actorState.morale?.state)&&
  !['afraid','terrified','catatonic'].includes(actorState.fear?.state)&&
  actorState.morale?.surrender?.active!==true&&!actorState.posture?.passNextTurn,
  'Readied již nelze vyvolat: po přípravě vznikl povinný Shock/Morale/Mishap stav');
 const r=s.readied[actorId];
 requireValid(!surrenderOpenInSequence(s,actorId),'Kapitulace znemožňuje vyvolání dříve připravené akce');
 requireValid(r&&!r.resolved&&r.fromRound===s.round,'Není otevřená připravená akce z tohoto kola');
 requireValid(!s.interruptActiveId,'Jiná připravená akce už právě přerušuje tah');
 requireValid(!s.pendingEndTurnAction,'Po skutečně dokončené akci se nejprve musí vyhodnotit Shock Reroll');
 requireValid(int(interruptIR,0,200),'Je nutné potvrzené IR, při kterém se akce vyvolala');
 // Readied Move distance is checked from the actual route at resolution time.
 // A GM checkbox cannot substitute for a verified half-Move projection.
 if(s.active){const interrupted=s.roster.find(x=>x.id===s.order[s.cursor]);requireValid(interruptIR===interrupted.rank,'Přerušení během cizího tahu nastává na skutečném Initiative Rank tohoto tahu');}
 else {
  const before=s.cursor>0?s.roster.find(x=>x.id===s.order[s.cursor-1])?.rank:200;
  const after=s.cursor<s.order.length?s.roster.find(x=>x.id===s.order[s.cursor])?.rank:0;
  requireValid(interruptIR<=before&&interruptIR>=after,'Připravenou akci nelze vyvolat na minulém ani budoucím IR; GM musí potvrdit aktuální pořadí');
 }
 // A readied action cannot travel backward in initiative time.
 requireValid(interruptIR<=r.originalRank,'Připravená akce se smí vykonat až na pozdějším IR');
 r.triggered=true;r.interruptIR=interruptIR;s.interruptActiveId=actorId;
 s.log.push({round:s.round,type:'readied-triggered',actorId,interruptIR});return s;
}
export function nextEncounterRound(sequence,states){
 const s=validateEncounterSequence(sequence);
 requireValid(!duePelahnHyperBurstBonus(s),'Hyper Burst: nevyřešená druhá akce a fyzický END d100 blokují další kolo');
 requireValid(!s.active&&!s.interruptActiveId&&s.cursor===s.order.length,'Nové kolo lze zahájit jen po skončení všech tahů a přerušení');
 requireValid(!s.pendingEndTurnAction,'Odložená akce čeká na povinný Shock Reroll');
 requireValid(s.round<MAX_ROUND,'Překročen maximální počet kol');
 requireValid(dueEncounterEvents(s,states).length===0,'Nelze přeskočit nevyřešené splatné události');
 requireValid(!Object.entries(s.readied).some(([,r])=>!r.resolved),'Nevyřízená připravená akce: GM ji musí nejprve vyhodnotit nebo zrušit');
 for(const [id,r] of Object.entries(s.readied)){
  if(r.resolved){const original=s.roster.find(x=>x.id===id);original.rank=r.interruptIR;original.source='readied-action';}
 }
 s.readied={};s.reactions={};s.initialCrossbowPriority=null;s.round++;s.cursor=0;s.active=false;s.entryAlertness=null;s.entryShock=null;s.entryMorale=null;s.entryFear=null;s.entryForcedPass=false;s.entryGrabHoldTarget=undefined;s.freeActionTurn=null;s.interruptActiveId=null;
 // Rank changes due to Readied Action affect the next round. Tie resolution
 // remains explicit; no arbitrary id-order fallback.
 const ordered=orderHMKInitiative(s.roster.map(x=>({...x,initiativeML:x.rank,spiritWorld:false})),{astralscape:s.astralscape});
 s.roster=ordered;s.order=ordered.map(x=>x.id);
 s.log.push({round:s.round,type:'round-start'});return s;
}
export function cancelReadiedEncounterAction(sequence,{actorId,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);requireValid(gmConfirmed,'GM musí potvrdit nevyužitou připravenou akci');
 requireValid(s.readied[actorId]&&!s.readied[actorId].resolved,'Není nevyužitá připravená akce');
 requireValid(!s.readied[actorId].triggered&&s.interruptActiveId!==actorId,
  'Již vyvolané přerušení nelze zrušit; musí být pravidlově vyhodnoceno');
 delete s.readied[actorId];s.log.push({round:s.round,type:'readied-cancelled',actorId});return s;
}
function currentAttackToken(s){
 requireValid(!!currentEncounterActor(s),'Zásah nemá aktivního jednajícího účastníka');
 return `${s.timelineId}:${s.round}:${s.cursor}:${s.interruptActiveId||'main'}`;
}
// No write path may rely on optional caller-supplied state alone: a surrender
// must remain visible in the immutable Initiative chronology after JSON reload.
// The durable character state remains authoritative if provided.
function surrenderOpenInSequence(s,actorId){
 for(let i=s.log.length-1;i>=0;i--){
  const e=s.log[i];if(e.actorId!==actorId)continue;
  if(e.type==='morale-surrender-released')return false;
  if(e.surrenderEventId)return true;
 }
 return false;
}
/** Independent p.187 Fear cannot be erased by omitting optional caller
 * state from a direct Attack/Readied invocation. The irreversible Initiative
 * log is authoritative for the current feared action restriction. */
function activeFearFromTimeline(sequence,actorId){
 for(let i=sequence.log.length-1;i>=0;i--){
  const e=sequence.log[i];if(e.actorId!==actorId)continue;
  if(e.type==='fear-safe-recovery')return 'steady';
  if(e.type==='fear-end-turn-reaction')return e.afterState;
  if(e.type==='fear-exposure')return e.resultState;
 }
 return null;
}
function requireNoFearAttack(s,actorId,states){
 const f=states?.[actorId]?.fear?.state??activeFearFromTimeline(s,actorId);
 requireValid(!['afraid','terrified','catatonic'].includes(f),
  'HMK p.187: Fear/Aberrance zakazuje Attack, Counterstrike a Readied Attack');
}
export function assertScheduledHitCanCommit(sequence,actorId,states=null){
 const s=validateEncounterSequence(sequence);
 requireNoFearAttack(s,actorId,states);
 requireValid(states?.[actorId]?.morale?.surrender?.active!==true&&!surrenderOpenInSequence(s,actorId),
  'Vzdávající se postava nemůže útočit');
 if(s.interruptActiveId===actorId){
  const current=persistentState(states??{},actorId);
  requireValid(!['INC','UNC','KIA'].includes(current.shock)&&!current.coma?.active&&
   !['routed','withdrawing','catatonic'].includes(current.morale?.state)&&
   !current.posture?.passNextTurn,
   'Nově vzniklý Shock, Morale nebo Mishap přerušil dosud nevykonaný Readied Attack');
 }
 requireValid(currentEncounterActor(s)===actorId,'Zásah je mimo aktivní tah útočníka');
 requireValid(!s.pendingEndTurnAction,'Druhý útok po již dokončené akci a před Shock Reroll je zakázán');
 // HMK p.160: the actor may not launch an Attack while a 1+ round action
 // still has an in-progress commitment. The player must abandon that task
 // as a separate confirmed Initiative event BEFORE any dice are requested.
 // Checking only at finishEncounterTurn() would waste real physical dice.
 requireValid(s.commitments?.[actorId]?.status!=='in-progress',
  'HMK str.160: během 1+ round koncentrace nelze zahájit Attack; nejprve trvale potvrďte opuštění činnosti');
 requireValid(!s.confirmedHits?.[currentAttackToken(s)],'Tento účastník již potvrdil zásah v aktuální Attack akci; další samostatný zásah vyžaduje nový tah');
}
export function recordScheduledHitCommit(sequence,{actorId,states=null,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true,'Zápis do seznamu útoků vyžaduje skutečné potvrzení GM');
 assertScheduledHitCanCommit(s,actorId,states);
 s.confirmedHits??={};s.confirmedHits[currentAttackToken(s)]={round:s.round,actorId};
 s.log.push({round:s.round,type:'hit-confirmed',actorId,token:currentAttackToken(s)});
 return s;
}
export function setEncounterTieOrder(sequence,{actorId,tieOrder,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true,'Pořadí shody musí potvrdit GM či hráči');
 requireValid(int(tieOrder,0,999),'Pořadí shody musí být 0–999');
 const row=s.roster.find(r=>r.id===actorId);requireValid(!!row,'Účastník nenalezen');
 row.tieOrder=tieOrder;s.log.push({round:s.round,type:'initiative-tie-decision',actorId,tieOrder});return s;
}
export function currentEncounterActor(sequence){const s=validateEncounterSequence(sequence);return s.interruptActiveId|| (s.active?s.order[s.cursor]:null);}
export function completeReadiedEncounterAction(sequence,{gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);requireValid(gmConfirmed,'GM musí potvrdit skutečné dokončení přerušující akce');
 const id=s.interruptActiveId;requireValid(!surrenderOpenInSequence(s,id),'Vzdávající se postava nesmí dokončit připravenou akci');
 requireValid(!!id&&s.readied[id]?.triggered&&!s.readied[id]?.resolved,'Není otevřené přerušení připravenou akcí');
 // An Attack interrupted at a later IR must be adjudicated and committed
 // through the hit guide first; GM cannot simply click 'finished'. The
 // confirmed token is produced ONLY by the guided combat resolution.
 if(s.readied[id].kind==='attack')requireValid(!!s.confirmedHits?.[currentAttackToken(s)],
  'Připravený Attack nelze uzavřít bez skutečně vyhodnoceného a zapsaného útoku');
 else {
  const proof=s.readied[id].resolution;
  requireValid(proof&&proof.actorId===id&&proof.kind===s.readied[id].kind&&
   proof.timelineId===s.timelineId&&proof.round===s.round&&
   typeof proof.eventId==='string'&&proof.eventId.length>0,
   'Readied Move/Grope nelze dokončit bez ověřené a doložené akce');
  const events=proof.kind==='move'?s.spatialEvents:s.readiedGropeEvents;
  requireValid(Array.isArray(events)&&events.some(e=>e.id===proof.eventId&&e.actorId===id&&e.round===s.round),
   'Chybí skutečný výsledek přerušující akce v Initiative');
 }
 s.readied[id].resolved=true;s.interruptActiveId=null;
 s.log.push({round:s.round,type:'readied-complete',actorId:id,interruptIR:s.readied[id].interruptIR});return s;
}
/** HMK p.160: concentration completes immediately BEFORE the actor's IR
 * on round R+N; it does NOT consume that new turn. The GM supplies evidence
 * of uninterrupted concentration, never automatically assumed from a clock. */
export function confirmConcentrationCompletion(sequence,states,{actorId,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence),c=s.commitments?.[actorId];
 requireValid(gmConfirmed===true,'GM musí potvrdit nepřerušenou koncentraci po všechna kola');
 requireValid(!s.active&&s.order[s.cursor]===actorId,'Dokončení nastává bezprostředně před vlastním IR');
 requireValid(!s.interruptActiveId&&!s.pendingEndTurnAction&&!dueEncounterEvents(s,states).length,
  'Koncentraci nelze dokončit přes probíhající přerušení či povinné následky');
 requireValid(c?.status==='in-progress'&&c.completionRound===s.round,'Vícekolová akce není ve správném kole a IR');
 const p=persistentState(states,actorId);
 requireValid(!concentrationInterruptionReason(p)&&!concentrationInterruptionHistory(p,c),
  'HMK str.182: koncentraci přerušil aktuální nebo již zotavený Shock, Grievous Skull, Grim Wound či Morale; nelze ji dokončit');
 c.status='completed';c.completedRound=s.round;
 s.log.push({round:s.round,type:'concentration-complete',actorId,startRound:c.startRound,durationRounds:c.durationRounds});
 return s;
}
export function abandonEncounterConcentration(sequence,{actorId,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence),c=s.commitments?.[actorId];
 requireValid(gmConfirmed===true,'GM musí potvrdit opuštění koncentrace');
 requireValid(c?.status==='in-progress','Žádná nedokončená koncentrace');
 c.status='abandoned';c.reason='GM-abandoned';
 s.log.push({round:s.round,type:'concentration-abandoned',actorId});return s;
}
export function ongoingEncounterConcentration(sequence,actorId){
 const s=validateEncounterSequence(sequence);return s.commitments?.[actorId]?.status==='in-progress'?s.commitments[actorId]:null;
}
export function assertScheduledMeleeActor(sequence,attackerId,states=null){
 if(!sequence)return;
 const s=validateEncounterSequence(sequence);
 requireNoFearAttack(s,attackerId,states);
 requireValid(states?.[attackerId]?.morale?.surrender?.active!==true&&!surrenderOpenInSequence(s,attackerId),
  'Vzdávající se postava nemůže zahájit Melee útok');
 if(s.interruptActiveId===attackerId){
  const current=persistentState(states??{},attackerId);
  requireValid(!['INC','UNC','KIA'].includes(current.shock)&&!current.coma?.active&&
   !['routed','withdrawing','catatonic'].includes(current.morale?.state)&&
   !current.posture?.passNextTurn,
   'Readied Melee nelze zahájit po novém povinném Shock, Morale nebo Mishap');
 }
 requireValid(currentEncounterActor(s)===attackerId,'Melee Attack lze nyní vyhodnotit jen pro právě jednající postavu v Initiative pořadí');
 requireValid(!s.pendingEndTurnAction,'Melee Attack nelze zahájit po již vykonané akci před Shock Reroll');
 if(s.interruptActiveId)requireValid(s.readied[s.interruptActiveId]?.kind==='attack','Melee Attack nelze vyhodnotit pro připravenou akci Grope či Move');
}

/** p.159: Initiative Reaction for Confused is mandatory at end of turn.
 * An Unaware foe may react immediately after a separately GM-confirmed alert.
 * Initiative EML is original Initiative ML minus confirmed Fatigue; never IR
 * modified by a readied action. Outcome depends on the actual d100.
 */
export function confirmAlertnessReaction(sequence,states,{actorId,roll,immediateAlert=false,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true,'GM musí potvrdit skutečný Reaction Roll');
 const row=s.roster.find(x=>x.id===actorId);
 requireValid(!!row,'Reaction patří neznámé postavě');
 if(immediateAlert)requireValid(row.alertness==='unaware','Immediate alert lze použít jen pro Unaware');
 else requireValid(s.active&&s.order[s.cursor]===actorId&&s.entryAlertness==='confused'&&
  s.pendingEndTurnAction?.actorId===actorId&&s.pendingEndTurnAction?.action==='pass',
  'Confused Reaction patří až PO vykonaném Pass na konci tahu (HMK str.159)');
 const key=actorId;
 requireValid(!(s.reactions?.[key]?.round===s.round&&s.reactions[key].phase===(immediateAlert?'immediate':'end-turn')),
  'Reaction už byl v tomto okamžiku vyhodnocen');
 const p=persistentState(states,actorId);
 requireValid(int(roll,1,100),'Reaction potřebuje skutečný d100');
 const fat=p.fatigue??{};
 const total=Number(fat.windedness??0)+Number(fat.weariness??0)+Number(fat.otherWeakness??0)+Number(p.bloodLoss?.weaknessFatigue??0);
 requireValid(int(total,0,999),'Fatigue pro Reaction není potvrzená');
 requireValid(int(row.baseInitiativeML,0,200),'Reaction vyžaduje skutečné Initiative ML a ne jen posunutý IR');
 const rawEML=row.baseInitiativeML-total;
 const sl=successLevel(roll,rawEML);
 const success=sl===SL.S||sl===SL.CS;
 row.alertness=success?'aware':immediateAlert?'confused':row.alertness;
 s.reactions??={};s.reactions[key]={round:s.round,phase:immediateAlert?'immediate':'end-turn',roll,rawEML,sl,after:row.alertness};
 s.log.push({round:s.round,type:'alertness-reaction',actorId,phase:s.reactions[key].phase,roll,rawEML,sl,after:row.alertness});
 return s;
}
