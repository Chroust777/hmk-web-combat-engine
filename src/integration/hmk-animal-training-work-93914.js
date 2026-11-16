/** HMK v1.2 p.65 — six months of training, about an hour per day.
 * GM minute-ledger policy for NEW starts only (pre-93.914 starts unchanged).
 * The 60-minute daily credit is an explicit project accounting convention:
 * the printed rule says "about" an hour, not an immutable 60-minute cutoff.
 * Recorded actual time never moves the GM calendar or rolls any dice.
 */
import {trainingInterruptionState93902} from './hmk-animal-training-interruption-93902.js';
export const ANIMAL_WORK_POLICY93914='hmk-animal-training-work-policy-93914-v1';
export const ANIMAL_WORK_FORMAT93914='hmk-animal-training-work-93914-v1';
export const ANIMAL_WORK_DAILY_TARGET93914=60;
export const ANIMAL_WORK_BASE_DAYS93914=180;
const fail=msg=>{throw Error('Animal Training: '+msg)};
const ok=(v,msg)=>{if(!v)fail(msg)};
const minute=v=>Number.isSafeInteger(v)&&v>=0;
const overlaps=(a,b,c,d)=>a<d&&b>c;
const isWork=row=>row?.calendarAnimalTrainingWork93914?.format===ANIMAL_WORK_FORMAT93914;
const startValid=row=>row?.calendarAnimalTrainingStart590?.trainingWorkPolicy===ANIMAL_WORK_POLICY93914;
const workFor=(journal,startId)=>journal.filter(row=>isWork(row)&&row.calendarAnimalTrainingWork93914.startId===startId);
const sessions=p=>p?.segments||[];
function blockedByOtherWork(journal,campaignId,actorId,from,to,startId){
 return journal.some(row=>{
  if(row.calendarCampaignId!==campaignId)return false;
  const t=row.calendarAnimalTrainingWork93914;
  if(t&&t.actorId===actorId&&t.startId!==startId&&sessions(t).some(s=>overlaps(s.fromMinute,s.toMinute,from,to)))return true;
  const fish=row.calendarFishingWork93910;
  if(fish&&row.characterId===actorId&&overlaps(fish.fromMinute,fish.toMinute,from,to))return true;
  const trap=row.calendarTrappingWork93909;
  if(trap&&row.characterId===actorId&&overlaps(trap.fromMinute,trap.toMinute,from,to))return true;
  const oldFish=row.calendarFishingStart590;
  if(oldFish?.format==='fishing-start-590'&&row.characterId===actorId&&overlaps(oldFish.startMinute,oldFish.dueMinute,from,to))return true;
  const oldTrap=row.calendarTrappingStart93908;
  if(oldTrap?.format==='hmk-trapping-start-93908-v1'&&row.characterId===actorId&&overlaps(oldTrap.startMinute,oldTrap.dueMinute,from,to))return true;
  const ep=row.calendarTimeEpisode;
  if(ep?.memberIds?.includes(actorId)&&overlaps(ep.startMinute,ep.endMinute,from,to))return true;
  const activity=row.calendarActivityProof;
  if(activity&&(row.characterId===actorId||activity.plan?.travelGroup?.memberIds?.includes(actorId))){
   const stop=journal.filter(r=>r.calendarCampaignId===campaignId&&r.calendarActivityInterruptProof?.activityId===row.id);
   const end=Math.min(activity.endMinute,...stop.map(r=>r.campaignMinute));
   if(overlaps(activity.startMinute,end,from,to))return true;
  }
  return false;
 });
}
function pausedDuring(journal,startId,from,to){
 let opening=null;
 for(const row of journal){
  const p=row.calendarAnimalTrainingInterruption93902;
  if(p?.startId!==startId)continue;
  if(p.action==='pause')opening=p.minute;
  if(p.action==='resume'&&opening!==null){if(overlaps(opening,p.minute,from,to))return true;opening=null;}
 }
 return opening!==null&&to>opening;
}
/** Progress includes only confirmed actual time; GM clock never advances here. */
export function trainingWorkProgress93914(journal=[],startRow,requiredDays=ANIMAL_WORK_BASE_DAYS93914){
 ok(startValid(startRow),'chybí nový začátek výcviku s minutovou evidencí.');
 ok(Number.isSafeInteger(requiredDays)&&requiredDays>=150&&requiredDays<=270,'neplatný požadovaný počet dní výcviku.');
 const s=startRow.calendarAnimalTrainingStart590,totals=new Map();
 let lastEnd=s.startMinute,workedMinutes=0,creditedDays=0,completedAtMinute=null;
 for(const row of workFor(journal,startRow.id))for(const segment of sessions(row.calendarAnimalTrainingWork93914)){
  ok(minute(segment.fromMinute)&&minute(segment.toMinute)&&segment.fromMinute>=lastEnd&&segment.toMinute>segment.fromMinute&&
    Math.floor(segment.fromMinute/1440)===Math.floor((segment.toMinute-1)/1440),
    'výcvikové úseky nesmějí překrývat půlnoc ani být zapsané v opačném pořadí.');
  const day=Math.floor(segment.fromMinute/1440),old=totals.get(day)||0,added=segment.toMinute-segment.fromMinute;
  totals.set(day,old+added);workedMinutes+=added;
  if(old<ANIMAL_WORK_DAILY_TARGET93914&&old+added>=ANIMAL_WORK_DAILY_TARGET93914){creditedDays++;if(creditedDays===requiredDays)completedAtMinute=segment.toMinute;}
  lastEnd=segment.toMinute;
 }
 const interruption=trainingInterruptionState93902(journal,startRow);
 const baseline=s.startMinute+requiredDays*1440;
 return {startId:startRow.id,workedMinutes,creditedDays,requiredDays,remainingDays:Math.max(0,requiredDays-creditedDays),
  lastEndMinute:lastEnd,completedAtMinute,paused:interruption.paused,pausedAt:interruption.pausedAt,
  attestedMissedDays:interruption.missedDays,
  // Missed days are accounted for by the actual number of day credits, not
  // added a second time to the deadline from the legacy pause annotation.
  due:interruption.paused||creditedDays<requiredDays?null:Math.max(baseline,completedAtMinute),
  partialDays:[...totals.values()].filter(n=>n<ANIMAL_WORK_DAILY_TARGET93914).length};
}
/** One certified interval, or up to 30 identical DAILY intervals. An explicit
 * batch is an attestation of every named day's real work, not auto-play.
 */
export function createAnimalTrainingWork93914({journal=[],startRow,campaignId,actorId,minute:at,fromMinute,durationMinutes,repeatDays=1,gmConfirmed=false}={}){
 ok(startValid(startRow)&&startRow.calendarCampaignId===campaignId&&startRow.characterId===actorId&&
  startRow.calendarAnimalTrainingStart590.ownerId===actorId,'výcvik nepatří této postavě nebo kampani.');
 ok(minute(at)&&minute(fromMinute)&&Number.isSafeInteger(durationMinutes)&&durationMinutes>=1&&durationMinutes<=180&&
  Number.isSafeInteger(repeatDays)&&repeatDays>=1&&repeatDays<=30&&gmConfirmed===true,
  'GM musí potvrdit skutečný čas v minutách a počet jednotlivých dní (nejvýše 30).');
 const s=startRow.calendarAnimalTrainingStart590;
 ok(!journal.some(row=>row.calendarAnimalTraining590?.startId===startRow.id),
  'po dokončení výsledku už nelze přidat výcvik.');
 const previous=trainingWorkProgress93914(journal,startRow);
 const segments=[];
 for(let i=0;i<repeatDays;i++){
  const from=fromMinute+i*1440,to=from+durationMinutes;
  ok(from>=s.startMinute&&from>=previous.lastEndMinute&&to<=at&&
   Math.floor(from/1440)===Math.floor((to-1)/1440),
   'interval je před zahájením, mimo den, budoucí nebo překrývá předchozí práci.');
  ok(!pausedDuring(journal,startRow.id,from,to),'během přerušení nelze započítat výcvik.');
  ok(!blockedByOtherWork(journal,campaignId,actorId,from,to,startRow.id),
   'lekce se překrývá s doloženým rybolovem, pastmi, cestováním, odpočinkem nebo jiným výcvikem.');
  segments.push({fromMinute:from,toMinute:to,dayIndex:Math.floor(from/1440)});
 }
 return {format:ANIMAL_WORK_FORMAT93914,startId:startRow.id,animalId:s.animalId,actorId,campaignId,
  segments,repeatDays,durationMinutes,minute:at,gmConfirmed:true,sourcePage:65};
}
export function trainingLedgerDue93914(journal,startRow,requiredDays=180){
 const p=trainingWorkProgress93914(journal,startRow,requiredDays);
 return {...p,reason:p.paused?'Výcvik je právě přerušen.':p.remainingDays>0?
  'Schází '+p.remainingDays+' denních doložených lekcí (cílově asi 60 minut za den).':
  'Doložen termín po '+requiredDays+' odcvičených dnech.'};
}
/** Full replay: postdated conflicting activities cannot retroactively consume
 * previously credited minutes; older starts/results are left unmodified.
 */
export function validateAnimalTrainingWork93914(journal=[]){
 const prior=[],starts=new Map();
 for(const row of journal){
  if(startValid(row))starts.set(row.id,row);
  const w=row.calendarAnimalTrainingWork93914;
  if(w){
   const start=starts.get(w.startId);
   ok(start&&row.characterId===w.actorId&&row.calendarCampaignId===w.campaignId&&row.campaignMinute===w.minute,
    'neplatná identita dokladu výcviku.');
   const from=w.segments?.[0]?.fromMinute;
   const want=createAnimalTrainingWork93914({journal:prior,startRow:start,campaignId:row.calendarCampaignId,
    actorId:row.characterId,minute:row.campaignMinute,fromMinute:from,durationMinutes:w.durationMinutes,
    repeatDays:w.repeatDays,gmConfirmed:true});
   ok(JSON.stringify(w)===JSON.stringify(want),'neplatný nebo dodatečně změněný doklad lekcí.');
  }
  prior.push(row);
 }
 for(const row of journal){
  const w=row.calendarAnimalTrainingWork93914;if(!w)continue;
  for(const s of w.segments)ok(!blockedByOtherWork(journal,row.calendarCampaignId,row.characterId,s.fromMinute,s.toMinute,w.startId)&&
   !pausedDuring(journal,w.startId,s.fromMinute,s.toMinute),
   'pozdější potvrzená činnost přepsala již doložený výcvik.');
 }
 return true;
}
export function assertAnimalTrainingWorkAppendOnly93914(before=[],after=[]){
 const future=new Map(after.filter(isWork).map(row=>[row.id,row]));
 for(const row of before)if(isWork(row))ok(JSON.stringify(future.get(row.id))===JSON.stringify(row),
  'historické potvrzené lekce nelze změnit ani odstranit.');
 return true;
}
