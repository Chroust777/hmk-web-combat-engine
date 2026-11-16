/** HMK v1.2 p.71 Fishing: one SV after FOUR HOURS OF FISHING.
 * Project GM exception: work may be certified in variable whole-minute segments.
 * This module never rolls, advances the calendar, creates fish, or alters old
 * fishing-start-590 / {startId,dueMinute} historical receipts.
 */
export const FISH_START_V2='hmk-fishing-start-93910-v2';
export const FISH_WORK_V2='hmk-fishing-work-93910-v2';
export const FISH_CANCEL_V2='hmk-fishing-cancel-93910-v2';
export const FISH_SV_V2='hmk-fishing-sv-93910-v2';
export const FISH_REQUIRED_MINUTES=240;
const check=(test,msg)=>{if(!test)throw Error('Fishing: '+msg)};
const minute=n=>Number.isSafeInteger(n)&&n>=0;
const overlaps=(a,b,from,to)=>minute(a)&&minute(b)&&a<to&&b>from;
const finalIds=journal=>new Set(journal.flatMap(j=>[j.calendarFishingSVStart590?.startId,j.calendarFishingCancel93910?.startId].filter(Boolean)));
export function fishingStart93910({journal=[],campaignId,actorId,minute:at,gmConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&minute(at)&&gmConfirmed===true,
  'GM musí potvrdit začátek rybolovu konkrétní postavy v Kalendáři.');
 const finished=finalIds(journal);
 check(!journal.some(j=>j.calendarCampaignId===campaignId&&j.characterId===actorId&&
  j.calendarFishingStart590&&!finished.has(j.id)),
  'postava již má rozpracovaný rybolov; nejprve jej dokončete nebo zrušte.');
 return {format:FISH_START_V2,actorId,startMinute:at,requiredMinutes:FISH_REQUIRED_MINUTES,gmConfirmed:true,sourcePage:71};
}
export function fishingProgress93910(journal=[],startId){
 const start=journal.find(j=>j.id===startId&&j.calendarFishingStart590?.format===FISH_START_V2);
 if(!start)return null;
 let workedMinutes=0,lastEndMinute=start.calendarFishingStart590.startMinute;
 for(const row of journal){
  const w=row.calendarFishingWork93910;
  if(!w||w.startId!==startId)continue;
  check(minute(w.fromMinute)&&minute(w.toMinute)&&minute(row.campaignMinute)&&
   w.fromMinute>=lastEndMinute&&w.toMinute>w.fromMinute&&w.toMinute<=row.campaignMinute,
   'neplatný, budoucí nebo překrývající se doklad práce.');
  workedMinutes+=w.toMinute-w.fromMinute;
  check(workedMinutes<=FISH_REQUIRED_MINUTES,'jeden rybolov nesmí překročit 240 minut skutečné práce.');
  lastEndMinute=w.toMinute;
 }
 return {start,workedMinutes,remainingMinutes:FISH_REQUIRED_MINUTES-workedMinutes,lastEndMinute,
  completedAtMinute:workedMinutes===FISH_REQUIRED_MINUTES?lastEndMinute:null};
}
/** Only confirmed work counts: not a passive calendar deadline.
 * Check other committed work for the SAME actor and campaign. Never infer
 * working minutes of another person from the party's shared clock.
 */
export function fishingWorkConflict93910(journal,campaignId,actorId,from,to){
 const activity=journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarActivityProof&&
  (j.characterId===actorId||j.calendarActivityProof.plan?.travelGroup?.memberIds?.includes(actorId)));
 if(journal.some(j=>j.calendarCampaignId===campaignId&&(
  (j.calendarTimeEpisode?.memberIds?.includes(actorId)&&
   overlaps(j.calendarTimeEpisode.startMinute,j.calendarTimeEpisode.endMinute,from,to))||
  (j.characterId===actorId&&j.calendarTrappingWork93909&&
   overlaps(j.calendarTrappingWork93909.fromMinute,j.calendarTrappingWork93909.toMinute,from,to))||
  (j.characterId===actorId&&j.calendarTrappingStart93908?.format==='hmk-trapping-start-93908-v1'&&
   overlaps(j.calendarTrappingStart93908.startMinute,j.calendarTrappingStart93908.dueMinute,from,to))
  )))return true;
 return activity.some(j=>{
  const a=j.calendarActivityProof;
  const stops=journal.filter(r=>r.calendarCampaignId===campaignId&&r.calendarActivityInterruptProof?.activityId===j.id);
  const end=Math.min(a.endMinute,stops.length?Math.min(...stops.map(r=>r.campaignMinute)):a.endMinute);
  return overlaps(a.startMinute,end,from,to);
 });
}
export function fishingWork93910({journal=[],campaignId,actorId,minute:at,startId,fromMinute,toMinute,gmConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&minute(at)&&
  minute(fromMinute)&&minute(toMinute)&&toMinute>fromMinute&&toMinute<=at&&gmConfirmed===true,
  'GM musí potvrdit skutečný kladný interval práce v uplynulém čase.');
 const p=fishingProgress93910(journal,startId),s=p?.start;
 check(s&&s.calendarCampaignId===campaignId&&s.characterId===actorId&&
  s.calendarFishingStart590.actorId===actorId&&!finalIds(journal).has(startId),
  'chybí otevřený projekt stejné postavy a kampaně.');
 check(fromMinute>=p.lastEndMinute&&toMinute-fromMinute<=p.remainingMinutes,
  'intervaly se nesmějí překrývat ani přesáhnout 240 minut.');
 check(!fishingWorkConflict93910(journal,campaignId,actorId,fromMinute,toMinute),
  'práce se překrývá s doloženým Cestováním, Trappingem, odpočinkem či jinou činností.');
 return {format:FISH_WORK_V2,campaignId,actorId,startId,fromMinute,toMinute,
  workedMinutes:toMinute-fromMinute,previousMinutes:p.workedMinutes,
  totalMinutes:p.workedMinutes+toMinute-fromMinute,
  remainingMinutes:p.remainingMinutes-(toMinute-fromMinute),gmConfirmed:true,sourcePage:71};
}
export function fishingCancel93910({journal=[],campaignId,actorId,minute:at,startId,gmConfirmed=false}={}){
 const p=fishingProgress93910(journal,startId),s=p?.start;
 check(s&&s.calendarCampaignId===campaignId&&s.characterId===actorId&&minute(at)&&
  at>=p.lastEndMinute&&!finalIds(journal).has(startId)&&gmConfirmed===true,
  'GM musí potvrdit ukončení otevřeného rybolovu bez úlovku.');
 return {format:FISH_CANCEL_V2,campaignId,actorId,startId,minute:at,
  abandonedWorkedMinutes:p.workedMinutes,gmConfirmed:true,sourcePage:71};
}
export function fishingSVLink93910({journal=[],campaignId,actorId,minute:at,startId}={}){
 const p=fishingProgress93910(journal,startId),s=p?.start;
 check(s&&s.calendarCampaignId===campaignId&&s.characterId===actorId&&
  p.workedMinutes===FISH_REQUIRED_MINUTES&&minute(at)&&at>=p.completedAtMinute&&
  !finalIds(journal).has(startId),'před Fishing SV musí být potvrzeno 240 minut skutečné práce.');
 return {format:FISH_SV_V2,startId,workedMinutes:FISH_REQUIRED_MINUTES,
  completedAtMinute:p.completedAtMinute};
}
/** Rebuild every new receipt from the immutable preceding journal. Legacy
 * fishing-start-590 and its SV link are intentionally accepted verbatim.
 */
export function validateFishingTime93910(journal=[],characters=null){
 const starts=new Map(),prior=[],used=new Set(),cancelled=new Set();
 for(const row of journal){
  const start=row.calendarFishingStart590;
  if(start){
   check(typeof row.calendarCampaignId==='string'&&row.calendarCampaignId&&row.characterId===start.actorId&&
    minute(row.campaignMinute)&&minute(start.startMinute)&&row.campaignMinute===start.startMinute&&
    (!characters||characters.some(c=>c.id===row.characterId&&!c.archived))&&!starts.has(row.id),
    'neplatný počáteční doklad nebo postava.');
   if(start.format===FISH_START_V2){
    const expected=fishingStart93910({journal:prior,campaignId:row.calendarCampaignId,
     actorId:row.characterId,minute:row.campaignMinute,gmConfirmed:true});
    check(JSON.stringify(expected)===JSON.stringify(start),'pozměněný začátek minutové práce.');
   }else check(start.format==='fishing-start-590'&&start.dueMinute===start.startMinute+FISH_REQUIRED_MINUTES,
    'neplatný historický čtyřhodinový doklad.');
   starts.set(row.id,row);
  }
  const work=row.calendarFishingWork93910;
  if(work){
   const expected=fishingWork93910({journal:prior,campaignId:row.calendarCampaignId,actorId:row.characterId,
    minute:row.campaignMinute,startId:work.startId,fromMinute:work.fromMinute,toMinute:work.toMinute,
    gmConfirmed:true});
   check(JSON.stringify(work)===JSON.stringify(expected),'pozměněný nebo duplicitní doklad odpracovaných minut.');
  }
  const c=row.calendarFishingCancel93910;
  if(c){
   const expected=fishingCancel93910({journal:prior,campaignId:row.calendarCampaignId,actorId:row.characterId,
    minute:row.campaignMinute,startId:c.startId,gmConfirmed:true});
   check(JSON.stringify(c)===JSON.stringify(expected)&&!cancelled.has(c.startId),
    'neplatné ukončení nebo dvojí zrušení rybolovu.');
   cancelled.add(c.startId);
  }
  const link=row.calendarFishingSVStart590;
  if(link){
   const s=starts.get(link.startId),p=row.skillTestProof;
   check(s&&!used.has(link.startId)&&!cancelled.has(link.startId)&&
    row.characterId===s.characterId&&row.calendarCampaignId===s.calendarCampaignId&&
    minute(row.campaignMinute)&&p?.type==='secondary-mastery-value-test'&&
    (p.skills?.[0]||p.skill)==='Fishing','Fishing SV nemá platný původní kalendářní doklad.');
   if(s.calendarFishingStart590.format===FISH_START_V2){
    const expected=fishingSVLink93910({journal:prior,campaignId:row.calendarCampaignId,
     actorId:row.characterId,minute:row.campaignMinute,startId:link.startId});
    check(JSON.stringify(link)===JSON.stringify(expected),'SV je předčasný nebo postrádá 240 minut práce.');
   }else check(link.format===undefined&&link.dueMinute===s.calendarFishingStart590.dueMinute&&
    row.campaignMinute>=link.dueMinute,'historický Fishing SV neodpovídá čtyřhodinovému dokladu.');
   used.add(link.startId);
  }
  prior.push(row);
 }
 // A later backdated activity must not silently invalidate earlier credited
 // Fishing work. Check all confirmed activity receipts after replay as well.
 for(const row of journal){
  const w=row.calendarFishingWork93910;
  if(w)check(!fishingWorkConflict93910(journal,row.calendarCampaignId,row.characterId,w.fromMinute,w.toMinute),
   'pozdější potvrzená činnost se překrývá s dříve započteným rybolovem.');
 }
 return true;
}
