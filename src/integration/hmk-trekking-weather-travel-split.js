/** v93.623 · GM weather change at the current minute.
 * Use the EXISTING calendar interruption and expedition fatigue executors.
 * A weather change never re-rolls or silently completes the future part of a
 * four-hour journey. Only the ACTUALLY elapsed part is booked now; the rest
 * awaits the normal confirmed Trekking / Orienteering / END workflow.
 */
import {activeHMKActivities,interruptHMKActivity,finishInterruptedHMKTravel} from './hmk-calendar-activities.js';
import {weatherAreaKey} from './hmk-trekking-weather-lifecycle.js';

const ok=(condition,message)=>{if(!condition)throw Error(message);};
const currentCampaignId=clock=>clock?.campaignId||`legacy:${clock?.events?.[0]?.id||''}`;
const partWeariness=(rate,period,elapsed)=>Math.floor((period==='hour'?4*rate:rate)*elapsed/240);

export function runningTravelForWeatherChange(database,area){
 const clock=database?.campaignClock;
 if(!clock)return [];
 const cid=currentCampaignId(clock),key=weatherAreaKey(area);
 return activeHMKActivities(database.journal,clock).filter(row=>{
  const activity=row.calendarActivityProof;
  if(activity?.plan?.kind!=='travel'||activity.startMinute>clock.minute||activity.endMinute<=clock.minute)return false;
  const trek=database.journal.find(j=>j.id===activity.plan.trekSourceId&&j.calendarCampaignId===cid);
  return trek?.calendarTrekProof&&weatherAreaKey(trek.calendarTrekProof.area)===key;
 });
}

/** Called exclusively inside an already user-confirmed, atomic `mutate`.
 * No new weather roll or new journey is fabricated. The existing journal
 * append-only / Combat State validators still check every derived effect.
 */
export function splitRunningTravelOnWeatherChange(database,{area,idFactory,stamp}={}){
 ok(typeof idFactory==='function'&&typeof stamp==='function','Chybí identita nových dokladů.');
 const candidates=runningTravelForWeatherChange(database,area),clock=database.campaignClock;
 const interrupted=[];
 for(const row of candidates){
  const plan=row.calendarActivityProof.plan;
  const elapsed=Math.max(0,clock.minute-row.calendarActivityProof.startMinute);
  const animalPartialWeariness=Object.fromEntries((plan.travelGroup?.animalWeariness??[]).map(policy=>[
   policy.actorId,partWeariness(policy.rate,policy.period,elapsed)
  ]));
  interrupted.push(interruptHMKActivity({journal:database.journal,clock,
   activityId:row.id,id:idFactory(),createdAt:stamp(),
   reason:'GM změnil počasí v oblasti '+area+' v aktuální herní minutě.',
   partialWeariness:null,animalPartialWeariness}));
 }
 if(interrupted.length){
  database.journal.push(...interrupted);
  finishInterruptedHMKTravel(database,{idFactory,stamp});
 }
 return {interrupted:interrupted.length,remainingMinutes:240-clock.minute%240,
  affectedIds:interrupted.map(x=>x.calendarActivityInterruptProof.activityId)};
}
