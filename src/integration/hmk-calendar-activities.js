/** Parallel actor actions; campaign time is owned exclusively by the GM.
 * Scheduling never edits the clock or fatigue. The existing HMK fatigue
 * calculation is committed only after GM advances past the documented end.
 * This module does not infer activities for other party members.
 */
import {commitExpeditionFatigue,expeditionRestRecovery} from './hmk-calendar-expedition.js';
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const min=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e9;
const F='hmk-calendar-actor-activity-v1';
const DONE='hmk-expedition-time-v1';
const STOP='hmk-calendar-activity-interruption-v1';
const activeClockKey=c=>c?.campaignId||`legacy:${c?.events?.[0]?.id||''}`;
export function plannedHMKActivities(journal=[],campaignId){return journal.filter(row=>row?.calendarActivityProof?.format===F&&row.calendarCampaignId===campaignId);}
export function scheduledHMKCompletionIds(journal=[]){return new Set(journal.filter(row=>row?.calendarExpeditionProof?.format===DONE&&row.calendarExpeditionProof?.activityId).map(row=>row.calendarExpeditionProof.activityId));}
export function interruptedHMKActivityIds(journal=[]){return new Set(journal.filter(row=>row?.calendarActivityInterruptProof?.format===STOP).map(row=>row.calendarActivityInterruptProof.activityId));}
export function activeHMKActivities(journal=[],clock){
 if(!clock)return [];
 const done=scheduledHMKCompletionIds(journal),stopped=interruptedHMKActivityIds(journal);
 return plannedHMKActivities(journal,activeClockKey(clock)).filter(row=>!done.has(row.id)&&!stopped.has(row.id)&&row.calendarActivityProof.endMinute>clock.minute);
}
/** GM records an interruption; it never moves campaign time, alters a past
 * activity, or awards recovery for an incomplete rest. */
export function interruptHMKActivity({journal=[],clock,activityId,reason,id,createdAt}={}){
 check(clock&&min(clock.minute)&&typeof id==='string'&&id&&!journal.some(row=>row.id===id),'Neplatné potvrzení přerušení');
 check(typeof reason==='string'&&reason.trim().length>=3&&reason.trim().length<=400,'Doložte důvod přerušení');
 const source=plannedHMKActivities(journal,activeClockKey(clock)).find(row=>row.id===activityId);
 check(source,'Činnost nepatří do aktuální kampaně');
 const activity=source.calendarActivityProof;
 check(!scheduledHMKCompletionIds(journal).has(source.id)&&!interruptedHMKActivityIds(journal).has(source.id),
  'Tato činnost už byla dokončena nebo přerušena');
 check(clock.minute<activity.endMinute,'Nelze zpětně přerušit již ukončenou činnost');
 const p={format:STOP,activityId:source.id,characterId:activity.characterId,
  campaignId:activeClockKey(clock),startMinute:activity.startMinute,
  minute:clock.minute,elapsedMinutes:Math.max(0,clock.minute-activity.startMinute),
  reason:reason.trim(),awardFatigue:false,
  ...(activity.plan.kind==='travel'&&Number.isFinite(activity.plan.travelledLeagues)&&Number.isFinite(activity.plan.travelledKilometres)?{
   // Printed short-trek ratio p.146: provisional distance only. END SR is
   // NEVER prorated from a four-hour test or awarded for an incomplete watch.
   projectedShortTravel:{format:'hmk-interrupted-short-trek-v1',
    elapsedMinutes:Math.max(0,clock.minute-activity.startMinute),
    projectedLeagues:Math.round(activity.plan.travelledLeagues*Math.max(0,clock.minute-activity.startMinute)/activity.durationMinutes*1000)/1000,
    projectedKilometres:Math.round(activity.plan.travelledKilometres*Math.max(0,clock.minute-activity.startMinute)/activity.durationMinutes*1000)/1000,
    confirmedDistance:false,sourcePage:146}}:{})};
 return {id,createdAt,characterId:source.characterId,calendarCampaignId:source.calendarCampaignId,
  campaignMinute:clock.minute,title:'HMK · přerušeno · '+activity.kind+' · '+activity.name,
  body:'Přerušeno: '+reason.trim()+'. Nedokončená činnost nepřiznává automatickou obnovu ani cestovní únavu. Nedokončené následky je nutné vyhodnotit podle pravidel.'+
   (p.projectedShortTravel?' Orientační vzdálenost při nepřetržitém tempu '+p.projectedShortTravel.projectedLeagues+' leagues; skutečná trasa není automaticky potvrzena.':''),
  calendarActivityInterruptProof:p};
}
export function scheduleHMKActivity({journal=[],clock,characterId,name='',kind,plan,id,origin='none'}={}){
 check(clock&&min(clock.minute)&&typeof characterId==='string'&&characterId&&typeof id==='string'&&id,'Činnost vyžaduje postavu, čas a jedinečné ID');
 check(plan&&min(plan.durationMinutes)&&plan.durationMinutes>0&&clock.minute+plan.durationMinutes<=1e9,'Neplatné trvání činnosti');
 check(!journal.some(row=>row.id===id),'Duplicitní identita činnosti');
 const campaignId=activeClockKey(clock),startMinute=clock.minute,endMinute=startMinute+plan.durationMinutes;
 const done=scheduledHMKCompletionIds(journal),stopped=interruptedHMKActivityIds(journal);
 // Only one pending activity per character can cover a given minute; other
 // characters remain independent and may sleep/travel in parallel.
 for(const row of plannedHMKActivities(journal,campaignId)){
  const a=row.calendarActivityProof;
  if(a.characterId!==characterId||done.has(row.id)||stopped.has(row.id))continue;
  check(endMinute<=a.startMinute||startMinute>=a.endMinute,
   'Postava '+(name||characterId)+' už má v této době naplánovanou činnost ('+a.kind+').');
 }
 // A guide's single authenticated Trekking watch is shared by the party,
 // but each traveler owns independent END dice, fatigue and completion.
 // A second group cannot reuse that watch; a second member of the SAME group can.
 const sameSource=journal.filter(row=>plan.trekSourceId&&(
  row.calendarActivityProof?.plan?.trekSourceId===plan.trekSourceId||
  row.calendarExpeditionProof?.trekSourceId===plan.trekSourceId));
 check(!sameSource.some(row=>row.characterId===characterId||
  !plan.travelGroup||row.calendarActivityProof?.plan?.travelGroup?.id!==plan.travelGroup.id),
  'Cestovní hlídka už byla vyhodnocena nebo patří jinému plánování.');
 const activity={format:F,id,characterId,name,kind,startMinute,endMinute,durationMinutes:plan.durationMinutes,origin,plan:structuredClone(plan)};
 return {id,characterId,calendarCampaignId:campaignId,campaignMinute:startMinute,
  title:'HMK · '+kind+' · '+name,
  body:'Naplánovaná činnost '+name+' · '+kind+' · '+startMinute+'–'+endMinute+' min. Únava bude změněna až po posunu času GM.',
  calendarActivityProof:activity};
}
/** Called atomically from the GM clock advance mutation, never on form submit.
 * Each completed action produces an append-only authoritative rule proof.
 */
export function finishDueHMKActivities(database,{idFactory,stamp}={}){
 const clock=database?.campaignClock;if(!clock)return [];
 check(typeof idFactory==='function'&&typeof stamp==='function','Chybí generátor auditních ID');
 const campaignId=activeClockKey(clock),done=scheduledHMKCompletionIds(database.journal),stopped=interruptedHMKActivityIds(database.journal);
 const due=plannedHMKActivities(database.journal,campaignId).filter(row=>
  !done.has(row.id)&&!stopped.has(row.id)&&row.calendarActivityProof.endMinute<=clock.minute)
  .sort((a,b)=>a.calendarActivityProof.endMinute-b.calendarActivityProof.endMinute||a.id.localeCompare(b.id));
 const completed=[];
 for(const row of due){
  const activity=row.calendarActivityProof;
  const actor=database.characters.find(c=>c.id===activity.characterId);
  check(actor,'Nelze dokončit činnost: postava už není dostupná.');
  // A new injury, fatigue event or earlier rest can alter the fatigue during
  // this interval. Recalculate recovery using CURRENT authoritative state.
  // A rest cannot finish if the actor was demonstrably acting/injured in
  // its middle. GM must interrupt the interval at the event time; otherwise
  // a sleep interrupted by combat would incorrectly heal Weariness.
  if(activity.plan.kind!=='travel'){
   const i=database.journal.findIndex(x=>x.id===row.id);
   const collision=database.journal.slice(i+1).find(x=>x.characterId===actor.id&&
    x.calendarCampaignId===campaignId&&Number.isSafeInteger(x.campaignMinute)&&
    x.campaignMinute>=activity.startMinute&&x.campaignMinute<activity.endMinute&&
    (x.combatProof||x.skillTestProof||x.calendarTrekProof));
   check(!collision,actor.name+': během plánovaného odpočinku proběhla jiná doložená akce. '+
    'Před dalším posunem času GM nejprve přerušte činnost v jejím aktuálním čase.');
  }
  const plan=activity.plan.kind==='travel'?activity.plan:
   expeditionRestRecovery({minute:activity.startMinute,kind:activity.kind,
    current:actor.hmk.combatState.fatigue[activity.kind==='winded'?'windedness':'weariness'],
    claims:actor.hmk.expedition?.claims||{}});
  const proof=commitExpeditionFatigue(actor,plan,activity.endMinute,activity.origin,row.id);
  proof.activityId=row.id;
  const result={id:idFactory(),characterId:actor.id,createdAt:stamp(),calendarCampaignId:campaignId,
   campaignMinute:activity.endMinute,title:'HMK · dokončeno · '+activity.kind+' · '+actor.name,
   body:'Dokončeno v minutě '+activity.endMinute+' na základě činnosti '+row.id+'. Změna únavy '+proof.delta+'.',
   calendarExpeditionProof:proof};
  database.journal.push(result);completed.push(result);
 }
 return completed;
}
/** Read-only timeline: individual actions remain visible through the entire
 * activity interval and in the original history. No duplicate state is stored.
 */
export function calendarActorActivities(clock,characters=[],journal=[]){
 if(!clock)return [];
 const campaignId=activeClockKey(clock),allowed=new Map(characters.map(c=>[c.id,c.name]));
 const done=scheduledHMKCompletionIds(journal),interrupts=new Map(journal.filter(row=>row.calendarActivityInterruptProof?.format===STOP).map(row=>[row.calendarActivityInterruptProof.activityId,row]));
 const activities=plannedHMKActivities(journal,campaignId).filter(row=>allowed.has(row.characterId)).map(row=>{
  const a=row.calendarActivityProof,finished=done.has(row.id),stop=interrupts.get(row.id),interrupted=!!stop,isStarted=a.startMinute<=clock.minute;
  return {id:'activity:'+row.id,sourceId:row.id,origin:'activity',kind:a.kind,
   name:allowed.get(row.characterId),characterId:row.characterId,title:'HMK · '+a.kind,
   description:'Činnost postavy',note:interrupted?'GM přerušil činnost v minutě '+stop.campaignMinute+' ('+stop.calendarActivityInterruptProof.reason+'); bez automatického účinku.':finished?'Pravidlový výsledek byl dokončen a zapsán.':
    isStarted?'Činnost probíhá. Účinek se zapíše teprve po uplynutí intervalu a posunu času GM.':'Naplánovaná činnost.',
   minute:a.startMinute,dueMinute:a.startMinute,endMinute:interrupted?Math.max(a.startMinute,stop.campaignMinute):a.endMinute,
   status:interrupted?'cancelled':finished?'resolved':isStarted?'active':'future',destination:'notes'};
 });
 // A cancelled eight-hour rest stops at its documented interruption minute.
 // Record that exact minute as its own visible history event as well.
 const stops=journal.filter(row=>row.calendarActivityInterruptProof?.format===STOP&&
  row.calendarCampaignId===campaignId&&allowed.has(row.characterId)&&
  row.campaignMinute<=clock.minute).map(row=>({
    id:'activity-stop:'+row.id,sourceId:row.id,origin:'activity',kind:'activity-interruption',
    characterId:row.characterId,name:allowed.get(row.characterId),
    title:'HMK · přerušení činnosti',description:'Přerušení činnosti postavy',
    note:row.calendarActivityInterruptProof.reason+' · neúplný interval bez automatické obnovy.',
    minute:row.campaignMinute,dueMinute:row.campaignMinute,status:'cancelled',destination:'notes'
  }));
 return [...activities,...stops];
}
/** Explicitly inspect all scheduled cases; legacy evidence is not mutated. */
export function validateHMKActivityEvidence(journal=[]){
 const ids=new Set(),all=new Map(journal.map(row=>[row.id,row]));
 for(const row of journal){
  const a=row.calendarActivityProof;if(!a)continue;
  check(a.format===F&&a.id===row.id&&a.characterId===row.characterId&&min(a.startMinute)&&min(a.endMinute)&&a.endMinute>a.startMinute&&a.endMinute-a.startMinute===a.durationMinutes&&a.plan?.durationMinutes===a.durationMinutes&&row.campaignMinute===a.startMinute,
   'Poškozený časový interval činnosti');
  check(!ids.has(a.id),'Duplicitní činnost');ids.add(a.id);
 }
 // Audit every group as one atomic, time-synchronous watch. Never accept a
 // partial group or a fabricated additional passenger in imported evidence.
 const groups=new Map(),travelWatchOwners=new Map();
 for(const row of journal){
  const a=row.calendarActivityProof,g=a?.plan?.travelGroup;
  if(a?.plan?.trekSourceId){
   const id=a.plan.trekSourceId,owner=g?.id??'solo:'+row.id;
   check(!travelWatchOwners.has(id)||travelWatchOwners.get(id)===owner,
    'Jedna doložená cestovní hlídka nesmí být použita dvěma nezávislými skupinami');
   travelWatchOwners.set(id,owner);
  }
  if(!g)continue;
  const trek=all.get(a.plan.trekSourceId),skill=all.get(a.plan.orienteeringId);
  check(!trek?.calendarTrekProof?.partyModes||(
   g.memberIds.length===trek.calendarTrekProof.partyModes.memberIds.length&&
   g.memberIds.every(id=>trek.calendarTrekProof.partyModes.memberIds.includes(id))),
   'Cestovní skupina není totožná se skupinou doloženou v Trekking Routine.');
  check(trek?.calendarTrekProof?.format==='hmk-trekking-watch-evidence-v1'&&
   trek.characterId===g.guideId&&trek.calendarCampaignId===row.calendarCampaignId&&
   trek.campaignMinute===a.startMinute&&
   skill?.calendarTrekSkillSource?.sourceId===trek.id&&
   skill.calendarTrekSkillSource.hazard==='survival'&&
   skill.characterId===g.guideId&&skill.calendarCampaignId===row.calendarCampaignId,
   'Skupinový průvodce nemá vlastní původní Trekking/Survival důkazy');
  check(a.plan.kind==='travel'&&g.format==='hmk-group-watch-v1'&&typeof g.id==='string'&&g.id&&
   typeof g.guideId==='string'&&Array.isArray(g.memberIds)&&g.memberIds.length>=1&&
   g.memberIds.length===new Set(g.memberIds).size&&g.memberIds.includes(a.characterId)&&
   g.memberIds.includes(g.guideId)&&typeof a.plan.trekSourceId==='string'&&
   typeof a.plan.orienteeringId==='string','Poškozený skupinový cestovní důkaz');
  const signature=JSON.stringify([g,row.calendarCampaignId,a.startMinute,a.endMinute,
   a.plan.trekSourceId,a.plan.orienteeringId,a.plan.mode]);
  if(!groups.has(g.id))groups.set(g.id,{signature,members:new Set(),expected:g.memberIds});
  const grp=groups.get(g.id);
  check(grp.signature===signature&&!grp.members.has(a.characterId),'Nesoulad členů a časů skupinové cesty');
  grp.members.add(a.characterId);
 }
 for(const group of groups.values())check(group.members.size===group.expected.length&&
  group.expected.every(id=>group.members.has(id)), 'Skupinová cesta musí být uložena pro všechny vybrané postavy najednou');
 const stopped=new Set(),finished=new Set();
 for(const row of journal){const p=row.calendarActivityInterruptProof;if(!p)continue;
  const source=all.get(p.activityId),a=source?.calendarActivityProof;
  check(p.format===STOP&&a&&p.characterId===a.characterId&&row.characterId===a.characterId&&
   p.campaignId===source.calendarCampaignId&&row.calendarCampaignId===source.calendarCampaignId&&
   min(p.minute)&&p.minute===row.campaignMinute&&p.minute<a.endMinute&&
   p.startMinute===a.startMinute&&p.elapsedMinutes===Math.max(0,p.minute-a.startMinute)&&
   p.awardFatigue===false&&(!p.projectedShortTravel||(
    p.projectedShortTravel.format==='hmk-interrupted-short-trek-v1'&&
    p.projectedShortTravel.confirmedDistance===false&&
    p.projectedShortTravel.elapsedMinutes===p.elapsedMinutes&&
    a.plan.kind==='travel'&&
    p.projectedShortTravel.projectedLeagues===Math.round(a.plan.travelledLeagues*p.elapsedMinutes/a.durationMinutes*1000)/1000&&
    p.projectedShortTravel.projectedKilometres===Math.round(a.plan.travelledKilometres*p.elapsedMinutes/a.durationMinutes*1000)/1000))&&
   typeof p.reason==='string'&&p.reason.length>=3&&!stopped.has(p.activityId),
   'Přerušení činnosti nemá jednoznačný platný zdroj');
  stopped.add(p.activityId);
 }
 for(const row of journal){const p=row.calendarExpeditionProof;if(!p?.activityId)continue;
  const source=all.get(p.activityId),a=source?.calendarActivityProof;
  check(a&&a.characterId===row.characterId&&source.calendarCampaignId===row.calendarCampaignId&&a.endMinute===row.campaignMinute&&p.campaignMinute===row.campaignMinute&&!finished.has(p.activityId)&&!stopped.has(p.activityId)&&
   (!a.plan.travelGroup||JSON.stringify(p.travelGroup)===JSON.stringify(a.plan.travelGroup)),
   'Výsledek činnosti nemá jednoznačný správný zdroj');
  finished.add(p.activityId);
 }
 return true;
}

/** Treat new activity schedules and their completion proofs as immutable. */
export function assertHMKActivitiesAppendOnly(previous=[],next=[]){
 const current=new Map(next.map(row=>[row.id,row]));
 for(const row of previous){
  if(!row.calendarActivityProof&&!row.calendarExpeditionProof?.activityId&&!row.calendarActivityInterruptProof)continue;
  check(current.has(row.id)&&JSON.stringify(current.get(row.id))===JSON.stringify(row),
   'Dříve uloženou časovanou činnost nebo její výsledek nelze přepsat ani odstranit.');
 }
 return true;
}
