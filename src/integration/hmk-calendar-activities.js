/** Parallel actor actions; campaign time is owned exclusively by the GM.
 * Scheduling never edits the clock or fatigue. The existing HMK fatigue
 * calculation is committed only after GM advances past the documented end.
 * This module does not infer activities for other party members.
 */
import {commitExpeditionFatigue} from './hmk-calendar-expedition.js';
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const min=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e9;
const F='hmk-calendar-actor-activity-v1';
const DONE='hmk-expedition-time-v1';
const activeClockKey=c=>c?.campaignId||`legacy:${c?.events?.[0]?.id||''}`;
export function plannedHMKActivities(journal=[],campaignId){return journal.filter(row=>row?.calendarActivityProof?.format===F&&row.calendarCampaignId===campaignId);}
export function scheduledHMKCompletionIds(journal=[]){return new Set(journal.filter(row=>row?.calendarExpeditionProof?.format===DONE&&row.calendarExpeditionProof?.activityId).map(row=>row.calendarExpeditionProof.activityId));}
export function scheduleHMKActivity({journal=[],clock,characterId,name='',kind,plan,id,origin='none'}={}){
 check(clock&&min(clock.minute)&&typeof characterId==='string'&&characterId&&typeof id==='string'&&id,'Činnost vyžaduje postavu, čas a jedinečné ID');
 check(plan&&min(plan.durationMinutes)&&plan.durationMinutes>0&&clock.minute+plan.durationMinutes<=1e9,'Neplatné trvání činnosti');
 check(!journal.some(row=>row.id===id),'Duplicitní identita činnosti');
 const campaignId=activeClockKey(clock),startMinute=clock.minute,endMinute=startMinute+plan.durationMinutes;
 const done=scheduledHMKCompletionIds(journal);
 // Only one pending activity per character can cover a given minute; other
 // characters remain independent and may sleep/travel in parallel.
 for(const row of plannedHMKActivities(journal,campaignId)){
  const a=row.calendarActivityProof;
  if(a.characterId!==characterId||done.has(row.id))continue;
  check(endMinute<=a.startMinute||startMinute>=a.endMinute,
   'Postava '+(name||characterId)+' už má v této době naplánovanou činnost ('+a.kind+').');
 }
 check(!journal.some(row=>row.calendarExpeditionProof?.trekSourceId&&row.calendarExpeditionProof.trekSourceId===plan.trekSourceId&&plan.trekSourceId),
  'Cestovní hlídka byla už vyhodnocena.');
 check(!plannedHMKActivities(journal,campaignId).some(row=>row.calendarActivityProof?.plan?.trekSourceId&&plan.trekSourceId&&row.calendarActivityProof.plan.trekSourceId===plan.trekSourceId),
  'Cestovní hlídka je již naplánována.');
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
 const campaignId=activeClockKey(clock),done=scheduledHMKCompletionIds(database.journal);
 const due=plannedHMKActivities(database.journal,campaignId).filter(row=>
  !done.has(row.id)&&row.calendarActivityProof.endMinute<=clock.minute)
  .sort((a,b)=>a.calendarActivityProof.endMinute-b.calendarActivityProof.endMinute||a.id.localeCompare(b.id));
 const completed=[];
 for(const row of due){
  const activity=row.calendarActivityProof;
  const actor=database.characters.find(c=>c.id===activity.characterId);
  check(actor,'Nelze dokončit činnost: postava už není dostupná.');
  const proof=commitExpeditionFatigue(actor,activity.plan,activity.endMinute,activity.origin,row.id);
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
 const done=scheduledHMKCompletionIds(journal);
 return plannedHMKActivities(journal,campaignId).filter(row=>allowed.has(row.characterId)).map(row=>{
  const a=row.calendarActivityProof,finished=done.has(row.id),isStarted=a.startMinute<=clock.minute;
  return {id:'activity:'+row.id,sourceId:row.id,origin:'activity',kind:a.kind,
   name:allowed.get(row.characterId),characterId:row.characterId,title:'HMK · '+a.kind,
   description:'Činnost postavy',note:finished?'Pravidlový výsledek byl dokončen a zapsán.':
    isStarted?'Činnost probíhá. Účinek se zapíše teprve po uplynutí intervalu a posunu času GM.':'Naplánovaná činnost.',
   minute:a.startMinute,dueMinute:a.startMinute,endMinute:a.endMinute,
   status:finished?'resolved':isStarted?'active':'future',destination:'notes'};
 });
}
/** Explicitly inspect all scheduled cases; legacy evidence is not mutated. */
export function validateHMKActivityEvidence(journal=[]){
 const ids=new Set(),all=new Map(journal.map(row=>[row.id,row]));
 for(const row of journal){
  const a=row.calendarActivityProof;if(!a)continue;
  check(a.format===F&&a.id===row.id&&a.characterId===row.characterId&&min(a.startMinute)&&min(a.endMinute)&&a.endMinute>a.startMinute&&a.endMinute-a.startMinute===a.durationMinutes&&row.campaignMinute===a.startMinute,
   'Poškozený časový interval činnosti');
  check(!ids.has(a.id),'Duplicitní činnost');ids.add(a.id);
 }
 const finished=new Set();
 for(const row of journal){const p=row.calendarExpeditionProof;if(!p?.activityId)continue;
  const source=all.get(p.activityId),a=source?.calendarActivityProof;
  check(a&&a.characterId===row.characterId&&source.calendarCampaignId===row.calendarCampaignId&&a.endMinute===row.campaignMinute&&p.campaignMinute===row.campaignMinute&&!finished.has(p.activityId),
   'Výsledek činnosti nemá jednoznačný správný zdroj');
  finished.add(p.activityId);
 }
 return true;
}

/** Treat new activity schedules and their completion proofs as immutable. */
export function assertHMKActivitiesAppendOnly(previous=[],next=[]){
 const current=new Map(next.map(row=>[row.id,row]));
 for(const row of previous){
  if(!row.calendarActivityProof&&!row.calendarExpeditionProof?.activityId)continue;
  check(current.has(row.id)&&JSON.stringify(current.get(row.id))===JSON.stringify(row),
   'Dříve uloženou časovanou činnost nebo její výsledek nelze přepsat ani odstranit.');
 }
 return true;
}
