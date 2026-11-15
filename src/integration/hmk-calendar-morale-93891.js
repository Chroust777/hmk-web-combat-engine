/** HMK p.162: time-anchored Morale Reaction obligations outside combat.
 * Morale is NOT cleared by the calendar. This read-only projection consumes
 * immutable journal proofs and explicit GM attestations; its executor is the
 * existing persistent-combat-state.applyConfirmedMoraleReaction.
 */
const isInt=(n)=>Number.isSafeInteger(n);
const known=new Set(['withdrawing','routed']);
const belongs=(j,clock,id)=>j?.characterId===id&&
  (!clock.campaignId||j.calendarCampaignId===clock.campaignId)&&
  isInt(j.campaignMinute)&&j.campaignMinute<=clock.minute;
const reactionOf=j=>j.calendarMoraleReaction?.format==='hmk-calendar-morale-reaction-v1'||
  (j.combatProof?.actionKind==='guided-morale-reaction'&&j.combatProof.transition?.type==='morale-reaction');
const originOf=j=>j.skillTestProof?.type==='weather-injury-morale'||
  (j.combatProof?.transition?.type==='injury-morale');
/** Returns scheduled checks, missing-origin debts, and auditable historical gaps.
 * Overdue checks stay at their ORIGINAL due minute; a late roll never claims
 * that earlier minutes were resolved. */
export function calendarMoraleProjection(clock,characters=[],journal=[]){
 const all=[],unknown=[],warnings=[];
 for(const c of characters){
  const state=c?.hmk?.healthState,morale=state?.morale?.state;
  if(!known.has(morale)||state?.shock==='KIA')continue;
  const duration=morale==='routed'?5:1;
  const evidence=journal.filter(j=>belongs(j,clock,c.id)&&(reactionOf(j)||originOf(j)));
  const origin=evidence.filter(originOf).at(-1);
  const reaction=evidence.filter(reactionOf).at(-1);
  const attested=[...(clock.events||[])].filter(e=>e.type==='morale-origin'&&e.characterId===c.id&&e.moraleState===morale).at(-1);
  const lastSafety=[...(clock.events||[])].filter(e=>e.type==='morale-safety'&&e.characterId===c.id&&e.moraleState===morale).at(-1);
  const originMinute=isInt(origin?.campaignMinute)?origin.campaignMinute:attested?.originMinute;
  const latestEvidence=[...evidence].filter(j=>!isInt(originMinute)||j.campaignMinute>=originMinute);
  const last=latestEvidence.filter(reactionOf).at(-1);
  if(!isInt(originMinute)){
   unknown.push({characterId:c.id,name:c.name,kind:'morale-reaction',description:
    `Morale ${morale} – chybí čas původního Morale Roll`,reason:'GM musí doložit počátek stavu; nepřevádět kola boje na minuty.'});
   continue;
  }
  if(isInt(last?.campaignMinute)&&last.campaignMinute>originMinute+duration){
   const earlier=latestEvidence.filter(reactionOf).filter(j=>j!==last).at(-1);
   const previous=earlier?.campaignMinute??originMinute;
   if(last.campaignMinute>previous+duration)
    warnings.push({characterId:c.id,name:c.name,from:previous+duration,to:last.campaignMinute,
     description:'Historicky přeskočené bezpečné minutové intervaly nejsou zpětně potvrzené; dodatečný pozdní hod je nenahrazuje.'});
  }
  let lastMinute=isInt(last?.campaignMinute)?last.campaignMinute:originMinute;
  if(lastSafety&&lastSafety.minute>=lastMinute&&lastSafety.minute>=originMinute){lastMinute=lastSafety.minute;
   // Verified continuous danger/blocked safe window may be longer than 1 minute.
   if(lastSafety.safe===false&&isInt(lastSafety.checkAfterMinute)&&lastSafety.checkAfterMinute>lastSafety.minute)
    lastMinute=lastSafety.checkAfterMinute-duration;
  }
  const minute=lastMinute+duration;
  all.push({id:`morale-reaction:${c.id}`,characterId:c.id,name:c.name,kind:'morale-reaction',
   moraleState:morale,description:morale==='withdrawing'?
    'Morale Reaction · po jedné skutečné minutě bez ohrožení (HMK 162)':
    'Morale Reaction · po pěti skutečných minutách bezpečí mimo LOS (HMK 162)',
   minute,anchorMinute:originMinute,duration,status:minute<=clock.minute?'due':'future',
   ...(last?{lastReactionMinute:last.campaignMinute}:{})});
 }
 return {all,unknown,warnings};
}
/** Attest a still-unsafe interval, without any dice or morale-state change.
 * GM must explicitly certify the entire interval. */
export function registerMoraleUnsafe(clock,{eventId,characterId,moraleState,reason,gmConfirmed}={}){
 if(gmConfirmed!==true||!known.has(moraleState)||
  typeof reason!=='string'||reason.trim().length<10||!characterId||!eventId)
  throw Error('Kontrola bezpečí Morale vyžaduje potvrzení GM a konkrétní důvod (min. 10 znaků).');
 const next=structuredClone(clock);
 if(next.events.some(e=>e.id===eventId))throw Error('Duplicitní časová událost');
 next.events.push({id:eventId,type:'morale-safety',minute:clock.minute,
  reason:`Morale ${moraleState}: neprokázaná bezpečná doba – ${reason.trim()}`,
  characterId,moraleState,safe:false,checkAfterMinute:clock.minute+(moraleState==='routed'?5:1),gmConfirmed:true});
 return next;
}
export function registerMoraleOrigin(clock,{eventId,characterId,moraleState,elapsedMinutes,reason,gmConfirmed}={}){
 if(gmConfirmed!==true||!known.has(moraleState)||!isInt(elapsedMinutes)||elapsedMinutes<0||
  elapsedMinutes>clock.minute||!eventId||!characterId||typeof reason!=='string'||reason.trim().length<10)
  throw Error('Historický počátek Morale vyžaduje skutečný čas a zdůvodněné GM potvrzení.');
 const next=structuredClone(clock);
 if(next.events.some(e=>e.id===eventId))throw Error('Duplicitní časová událost');
 next.events.push({id:eventId,type:'morale-origin',minute:clock.minute,
  originMinute:clock.minute-elapsedMinutes,characterId,moraleState,gmConfirmed:true,
  reason:'GM potvrzuje čas původního Morale Roll: '+reason.trim()});
 return next;
}
