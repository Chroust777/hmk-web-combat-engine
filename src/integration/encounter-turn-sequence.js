/** HMK World of Kèthîra pp.158–162, 169, 176–179.
 * GM-controlled turn sequence. No dice rolls, time gaps, or unknown character
 * attributes are inferred. Event gates inspect the authoritative persistent
 * character state after each confirmed transition.
 */
import {validateCombatState,dueInjuryMorale,unresolvedInjuryMishaps} from './persistent-combat-state.js';
import {successLevel,SL} from '../rules/tests.js';
import {validateSpatialBarriers} from './hmk-guided-spatial-barriers.js';

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
 requireValid(s.readied&&typeof s.readied==='object'&&!Array.isArray(s.readied),'Neplatný seznam připravených akcí');
 requireValid(s.interruptActiveId===undefined||s.interruptActiveId===null||s.order.includes(s.interruptActiveId),'Neplatný přerušující aktér');
 requireValid(s.confirmedHits===undefined||s.confirmedHits&&typeof s.confirmedHits==='object'&&!Array.isArray(s.confirmedHits),'Neplatný registr potvrzených zásahů');
 requireValid(s.commitments===undefined||s.commitments&&typeof s.commitments==='object'&&!Array.isArray(s.commitments),'Neplatná vícekolová akce');
 requireValid(s.pendingEndTurnAction===undefined||s.pendingEndTurnAction===null||
  (typeof s.pendingEndTurnAction==='object'&&!Array.isArray(s.pendingEndTurnAction)&&
   s.pendingEndTurnAction.actorId===s.order[s.cursor]&&s.pendingEndTurnAction.round===s.round&&
   s.active===true&&s.interruptActiveId===null&&
   (['STN','INC'].includes(s.entryShock)||s.entryAlertness==='confused'||
    ['routed','withdrawing'].includes(s.entryMorale))&&
   ACTIONS.has(s.pendingEndTurnAction.action)&&
   s.log.some(e=>['turn-action-resolved-before-shock-reroll','turn-action-resolved-before-confused-reaction',
     'turn-action-resolved-before-rally-reaction'].includes(e.type)&&
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
 requireValid(s.entryForcedPass===undefined||typeof s.entryForcedPass==='boolean','Neplatný původní Mishap Pass');
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
 if(state.morale?.state==='catatonic')return 'catatonic';
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
  if(['injury-morale','morale-reaction'].includes(e.type)&&
    (['catatonic','afraid','terrified'].includes(d.state)||['catatonic','afraid','terrified'].includes(d.after)))
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
      ['routed','withdrawing','catatonic'].includes(q.morale?.state)||q.morale?.gmVanquished?.active===true);
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
  'blood-shock-reroll':2,'brave-expiry':2.5,'injury-morale':3};
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
export function startEncounterTurn(sequence,states){
 const s=validateEncounterSequence(sequence);
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
   p.posture?.passNextTurn||row?.alertness!=='aware';
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
 s.entryShock=p.shock;s.entryMorale=p.morale?.state??'steady';s.entryForcedPass=!!p.posture?.passNextTurn;
 s.log.push({round:s.round,type:'turn-start',actorId:id,shock:p.shock,alertness:s.entryAlertness});
 return s;
}
/** HMK p.161: exactly one free action, BEFORE the main 1-turn action.
 * A free-action claim is an authoritative Initiative event, never a GM
 * checkbox. The same turn token works across save/restore and old saves. */
function freeActionToken(s){return `${s.timelineId}:${s.round}:${s.cursor}:${s.order[s.cursor]}`;}
export function encounterFreeActionAvailable(sequence,actorId){
 const s=validateEncounterSequence(sequence);
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
export function recordEncounterFreeAction(sequence,{actorId,kind}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(['rally','mounted-control','draw-weapon','ready-pocket-item','five-foot-step','open-unlocked-object','command-allies','intimidate-foe','free-missile-load'].includes(kind),'Nepodporovaná volná akce HMK');
 requireValid(encounterFreeActionAvailable(s,actorId),
  'Volná akce musí být jediná a provedená před hlavní akcí na vlastním IR');
 const token=freeActionToken(s);
 s.freeActionTurn={token,kind};
 s.log.push({round:s.round,type:'free-action',actorId,kind,token});
 return s;
}
export function finishEncounterTurn(sequence,states,{action='pass',durationRounds=null,readiedAction=null,gmConfirmed=false}={}){
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
 const helpless=['INC','UNC','KIA'].includes(p.shock)||p.coma?.active||p.morale?.state==='catatonic';
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
 const delayedRally=pending.some(e=>e.type==='rally-end-turn-reaction')&&
  ['routed','withdrawing'].includes(s.entryMorale);
 requireValid(!pending.length||((delayedShock||delayedRally)&&
  pending.every(e=>e.type==='shock-end-turn'||e.type==='rally-end-turn-reaction')),
  'Nelze ukončit tah: povinný Shock / Mishap Pass / Catatonic Reaction na konci tahu ještě nebyl vyhodnocen');
 if(action==='evade')requireValid(s.entryShock!=='STN'&&p.shock!=='STN','Stunned postava nesmí vybrat Evade (HMK str.161)');
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
 if(!helpless&&p.grabHold?.active&&p.grabHold.targetId===id)
  requireValid(action==='pass','HMK str.106: cíl Grab Hold musí Pass na svém následujícím tahu (bránit se smí)');
 if(!helpless&&s.entryMorale!=='catatonic'&&p.morale?.state==='routed')requireValid(['move','pass'].includes(action),'Routed musí utíkat nebo Pass podle HMK str.162');
 if(!helpless&&s.entryMorale!=='catatonic'&&p.morale?.state==='withdrawing')requireValid(['move','pass'].includes(action),'Withdrawing musí ustupovat nebo Pass');
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
  s.commitments??={};s.commitments[id]={startRound:s.round,startIR:row.rank,completionRound:s.round+durationRounds,
   durationRounds,startEventIndex:p.events.length,status:'in-progress'};
  s.log.push({round:s.round,type:'concentration-start',actorId:id,completionRound:s.round+durationRounds});
 }else if(['concentrate-hold','concentrate-abandon'].includes(action))fail('Tato akce není v koncentraci');
 if(action==='ready'){
  requireValid(!s.readied[id],'Postava už má otevřenou připravenou akci');
  requireValid(['attack','grope','move'].includes(readiedAction),'Připravit lze pouze 1-turn Attack, Grope či Move (HMK str.161)');
  s.readied[id]={fromRound:s.round,originalRank:row.rank,kind:readiedAction,resolved:false};
 }
 if(delayedShock||delayedRally||confusedReactionPending){
  s.pendingEndTurnAction={round:s.round,actorId:id,action};
  s.log.push({round:s.round,type:delayedShock?'turn-action-resolved-before-shock-reroll':
   delayedRally?'turn-action-resolved-before-rally-reaction':
   'turn-action-resolved-before-confused-reaction',actorId:id,action});
  return s;
 }
 s.log.push({round:s.round,type:'turn-complete',actorId:id,action});s.active=false;s.entryAlertness=null;s.entryShock=null;s.entryMorale=null;s.entryForcedPass=false;s.freeActionTurn=null;s.cursor++;
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
 s.log.push({round:s.round,type:'turn-complete',actorId:p.actorId,action:p.action,
  afterEndTurnShock:true});
 s.pendingEndTurnAction=null;s.active=false;s.entryAlertness=null;
 s.entryShock=null;s.entryMorale=null;s.entryForcedPass=false;s.freeActionTurn=null;s.cursor++;
 return validateEncounterSequence(s);
}
/** Readied 1-turn actions resolve later, may interrupt another turn;
 * next-round IR is the confirmed interrupt IR. Does not grant another turn. */
export function resolveReadiedEncounterAction(sequence,{actorId,interruptIR,moveHalfConfirmed=false,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true,'Přerušení připravenou akcí musí potvrdit GM');
 const r=s.readied[actorId];
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
 requireValid(!s.active&&!s.interruptActiveId&&s.cursor===s.order.length,'Nové kolo lze zahájit jen po skončení všech tahů a přerušení');
 requireValid(!s.pendingEndTurnAction,'Odložená akce čeká na povinný Shock Reroll');
 requireValid(s.round<MAX_ROUND,'Překročen maximální počet kol');
 requireValid(dueEncounterEvents(s,states).length===0,'Nelze přeskočit nevyřešené splatné události');
 requireValid(!Object.entries(s.readied).some(([,r])=>!r.resolved),'Nevyřízená připravená akce: GM ji musí nejprve vyhodnotit nebo zrušit');
 for(const [id,r] of Object.entries(s.readied)){
  if(r.resolved){const original=s.roster.find(x=>x.id===id);original.rank=r.interruptIR;original.source='readied-action';}
 }
 s.readied={};s.reactions={};s.initialCrossbowPriority=null;s.round++;s.cursor=0;s.active=false;s.entryAlertness=null;s.entryShock=null;s.entryMorale=null;s.entryForcedPass=false;s.freeActionTurn=null;s.interruptActiveId=null;
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
export function assertScheduledHitCanCommit(sequence,actorId){
 const s=validateEncounterSequence(sequence);
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
export function recordScheduledHitCommit(sequence,{actorId,gmConfirmed=false}={}){
 const s=validateEncounterSequence(sequence);
 requireValid(gmConfirmed===true,'Zápis do seznamu útoků vyžaduje skutečné potvrzení GM');
 assertScheduledHitCanCommit(s,actorId);
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
 const id=s.interruptActiveId;requireValid(!!id&&s.readied[id]?.triggered&&!s.readied[id]?.resolved,'Není otevřené přerušení připravenou akcí');
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
export function assertScheduledMeleeActor(sequence,attackerId){
 if(!sequence)return;
 const s=validateEncounterSequence(sequence);
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
