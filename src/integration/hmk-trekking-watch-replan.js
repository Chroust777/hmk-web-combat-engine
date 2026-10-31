/** Replanning the still-current four-hour watch. Append-only: every affected
 * real activity is interrupted at the actual GM minute, with the existing
 * proportional travel/animal fatigue executor. A planning cancellation itself
 * does not erase a roll, a consequence or the elapsed part of the activity. */
import {activeHMKActivities,interruptHMKActivity,finishInterruptedHMKTravel} from './hmk-calendar-activities.js';
const campaignId=clock=>clock?.campaignId||`legacy:${clock?.events?.[0]?.id||''}`;
export function interruptedForWatchReplan(database,{dayIndex,watchIndex,memberIds,idFactory,stamp}={}){
 const clock=database?.campaignClock;
 if(!clock||typeof idFactory!=='function'||typeof stamp!=='function')throw Error('Chybí čas nebo potvrzení GM.');
 const from=dayIndex*1440+watchIndex*240,to=from+240;
 if(clock.minute>=to)throw Error('Tento časový úsek již skončil.');
 const members=new Set(memberIds||[]),cid=campaignId(clock);
 const active=activeHMKActivities(database.journal,clock).filter(row=>{
  const a=row.calendarActivityProof;
  return row.calendarCampaignId===cid&&members.has(a?.characterId)&&a.startMinute<to&&a.endMinute>from;
 });
 const stops=[];
 for(const row of active){
  const a=row.calendarActivityProof,elapsed=Math.max(0,clock.minute-a.startMinute),plan=a.plan;
  const animalPartialWeariness=plan.kind==='travel'?
   Object.fromEntries((plan.travelGroup?.animalWeariness??[]).map(x=>[x.actorId,
    Math.floor((x.period==='hour'?4*x.rate:x.rate)*elapsed/240)])):null;
  const stop=interruptHMKActivity({journal:database.journal,clock,activityId:row.id,
   reason:'GM mění plán '+(watchIndex+1)+'. hlídky od '+clock.minute+'.',
   id:idFactory(),createdAt:stamp(),animalPartialWeariness});
  // If other activities in same group require cross-checking, ensure that all
  // interruption receipts exist before running the original executor.
  stops.push(stop);
 }
 if(stops.length){
  database.journal.push(...stops);
  finishInterruptedHMKTravel(database,{idFactory,stamp});
 }
 return {count:stops.length,travelCount:stops.filter(r=>r.calendarActivityInterruptProof.partialTravel).length,
  elapsedMinute:clock.minute,remainingMinutes:Math.max(0,to-clock.minute)};
}
