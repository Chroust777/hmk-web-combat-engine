/** HMK v1.2 p.85 Trapping. Eight hours followed by ONE original Survival
 * Success Value; each star yields one food-day of meat. This module neither
 * rolls a die nor advances the GM clock nor creates a physical food stack.
 */
const check=(ok,msg)=>{if(!ok)throw Error('Trapping: '+msg)};
export const TRAP_START_FORMAT='hmk-trapping-start-93908-v1';
export const TRAP_RESULT_FORMAT='hmk-trapping-result-93908-v1';
export const TRAP_START_MINUTE_FORMAT='hmk-trapping-start-93909-v2';
export const TRAP_WORK_MINUTE_FORMAT='hmk-trapping-work-93909-v2';
export const TRAP_CANCEL_MINUTE_FORMAT='hmk-trapping-cancel-93909-v2';
export const TRAP_SV_MINUTE_FORMAT='hmk-trapping-sv-93909-v2';
export const TRAP_RESULT_MINUTE_FORMAT='hmk-trapping-result-93909-v2';
export const TRAP_WORK_REQUIRED_MINUTES=480;
export function trappingStart93908({campaignId,actorId,minute,gmConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
  Number.isSafeInteger(minute)&&minute>=0&&gmConfirmed===true,'potvrďte postavu, kampaň a začátek osmihodinové práce.');
 return {format:TRAP_START_FORMAT,campaignId,actorId,startMinute:minute,dueMinute:minute+480,gmConfirmed:true,sourcePage:85};
}
/** HMK p.85: 480 ACTUALLY WORKED minutes, not 480 minutes on the clock.
 * GM may certify disjoint intervals of any positive integral length. Pauses
 * and intervening travel/rest do not count. No automatic clock adjustment.
 * Legacy 93908-v1 receipts remain immutable and keep their historical terms.
 */
export function trappingStart93909({campaignId,actorId,minute,gmConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
  Number.isSafeInteger(minute)&&minute>=0&&gmConfirmed===true,'GM musí potvrdit začátek skutečné práce.');
 return {format:TRAP_START_MINUTE_FORMAT,campaignId,actorId,startMinute:minute,
  requiredMinutes:TRAP_WORK_REQUIRED_MINUTES,gmConfirmed:true,sourcePage:85};
}
export function trappingProgress93909(journal=[],startId){
 const start=journal.find(j=>j.id===startId&&j.calendarTrappingStart93908?.format===TRAP_START_MINUTE_FORMAT);
 if(!start)return null;
 let worked=0,lastEnd=start.calendarTrappingStart93908.startMinute;
 const receipts=[];
 for(const row of journal){
  const w=row.calendarTrappingWork93909;
  if(!w||w.startId!==startId)continue;
  if(w.fromMinute<lastEnd||w.toMinute<=w.fromMinute||w.toMinute>row.campaignMinute||
   w.toMinute>Number.MAX_SAFE_INTEGER||!Number.isSafeInteger(w.fromMinute)||!Number.isSafeInteger(w.toMinute))
   throw Error('Trapping: překrývající se nebo neplatný interval práce.');
  worked+=w.toMinute-w.fromMinute;
  if(worked>TRAP_WORK_REQUIRED_MINUTES)throw Error('Trapping: více než osm hodin stejného projektu.');
  lastEnd=w.toMinute;receipts.push({row,w});
 }
 return {start,workedMinutes:worked,remainingMinutes:TRAP_WORK_REQUIRED_MINUTES-worked,
  lastEndMinute:lastEnd,completedAtMinute:worked===TRAP_WORK_REQUIRED_MINUTES?lastEnd:null,receipts};
}
export function trappingWork93909({journal=[],campaignId,actorId,minute,startId,fromMinute,toMinute,gmConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
  Number.isSafeInteger(minute)&&minute>=0&&Number.isSafeInteger(fromMinute)&&
  Number.isSafeInteger(toMinute)&&fromMinute>=0&&toMinute>fromMinute&&toMinute<=minute&&gmConfirmed===true,
  'GM musí doložit a potvrdit skutečný minutový úsek práce v minulosti.');
 const progress=trappingProgress93909(journal,startId),start=progress?.start;
 check(start&&start.calendarCampaignId===campaignId&&start.characterId===actorId&&
  start.calendarTrappingStart93908.actorId===actorId&&
  !journal.some(j=>j.calendarTrappingSV93908?.startId===startId||j.calendarTrappingCancel93909?.startId===startId),
  'chybí otevřená práce pro tuto postavu a kampaň.');
 check(fromMinute>=progress.lastEndMinute&&toMinute-fromMinute<=progress.remainingMinutes,
  'úseky se nesmějí překrývat ani přesáhnout 480 odpracovaných minut.');
 // The actor must not be on a different confirmed activity during any
 // credited minute. Other party members and other campaigns remain independent.
 const actorActivities=journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarActivityProof&&
  (j.characterId===actorId||j.calendarActivityProof.plan?.travelGroup?.memberIds?.includes(actorId)));
 const conflict=journal.some(j=>j.calendarCampaignId===campaignId&&(
   (j.calendarTimeEpisode?.memberIds?.includes(actorId)&&
    j.calendarTimeEpisode.startMinute<toMinute&&j.calendarTimeEpisode.endMinute>fromMinute)||
   (j.characterId===actorId&&j.calendarFishingStart590&&
    j.calendarFishingStart590.startMinute<toMinute&&j.calendarFishingStart590.dueMinute>fromMinute)))||
  actorActivities.some(j=>{
   const a=j.calendarActivityProof;
   const stops=journal.filter(r=>r.calendarCampaignId===campaignId&&r.calendarActivityInterruptProof?.activityId===j.id);
   const stop=stops.length?Math.min(...stops.map(r=>r.campaignMinute)):a.endMinute;
   const end=Math.min(a.endMinute,stop);
   return a.startMinute<toMinute&&end>fromMinute;
  });
 check(!conflict,'interval se překrývá s doloženou cestou, rybolovem, odpočinkem nebo jinou činností postavy.');
 return {format:TRAP_WORK_MINUTE_FORMAT,campaignId,actorId,startId,fromMinute,toMinute,
  workedMinutes:toMinute-fromMinute,previousMinutes:progress.workedMinutes,
  totalMinutes:progress.workedMinutes+(toMinute-fromMinute),
  remainingMinutes:progress.remainingMinutes-(toMinute-fromMinute),
  gmConfirmed:true,sourcePage:85};
}
export function trappingCancel93909({journal=[],campaignId,actorId,minute,startId,gmConfirmed=false}={}){
 const progress=trappingProgress93909(journal,startId),start=progress?.start;
 check(start&&start.calendarCampaignId===campaignId&&start.characterId===actorId&&
  Number.isSafeInteger(minute)&&minute>=progress.lastEndMinute&&
  !journal.some(j=>j.calendarTrappingSV93908?.startId===startId||j.calendarTrappingCancel93909?.startId===startId)&&
  gmConfirmed===true,'přerušení projektu musí GM výslovně potvrdit a nesmí rušit již hozený SV.');
 return {format:TRAP_CANCEL_MINUTE_FORMAT,campaignId,actorId,startId,minute,
  abandonedWorkedMinutes:progress.workedMinutes,gmConfirmed:true,sourcePage:85};
}
export function trappingSVLink93909({journal=[],campaignId,actorId,minute,startId}={}){
 const progress=trappingProgress93909(journal,startId),start=progress?.start;
 check(start&&start.calendarCampaignId===campaignId&&start.characterId===actorId&&
  progress.workedMinutes===TRAP_WORK_REQUIRED_MINUTES&&minute>=progress.completedAtMinute&&
  !journal.some(j=>j.calendarTrappingSV93908?.startId===startId||j.calendarTrappingCancel93909?.startId===startId),
  'před Survival SV je nutno doložit všech 480 minut aktivní práce.');
 return {format:TRAP_SV_MINUTE_FORMAT,startId,workedMinutes:TRAP_WORK_REQUIRED_MINUTES,
  completedAtMinute:progress.completedAtMinute};
}
export function trappingResult93908({journal=[],campaignId,actorId,minute,originId,secondary='none',
 secondaryNotAlreadyCounted=false,periodConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&Number.isSafeInteger(minute),
  'chybí aktuální kampaň a čas.');
 const source=journal.find(j=>j.id===originId&&j.calendarCampaignId===campaignId&&j.characterId===actorId);
 const p=source?.skillTestProof,sv=p?.a??p?.result,link=source?.calendarTrappingSV93908;
 const start=journal.find(j=>j.id===link?.startId&&j.calendarCampaignId===campaignId);
 const startProof=start?.calendarTrappingStart93908;
 const minuteWork=startProof?.format===TRAP_START_MINUTE_FORMAT;
 const minuteLink=minuteWork?trappingSVLink93909({journal:journal.slice(0,journal.indexOf(source)),campaignId,actorId,minute:source.campaignMinute,startId:start.id}):null;
 check((!minuteWork||JSON.stringify(link)===JSON.stringify(minuteLink))&&p?.type==='secondary-mastery-value-test'&&(p.skills?.[0]||p.skill)==='Survival'&&
  ['CF','F','S','CS'].includes(sv?.level)&&Number.isInteger(sv?.sv)&&
  [TRAP_START_FORMAT,TRAP_START_MINUTE_FORMAT].includes(startProof?.format)&&startProof.actorId===actorId&&start.characterId===actorId&&
  (minuteWork?true:startProof.dueMinute===link.dueMinute&&source.campaignMinute>=link.dueMinute)&&minute>=source.campaignMinute,
  'chybí originální Survival SV svázaný s dokončenými osmi hodinami.');
 check(!journal.some(j=>j.skillTestProof?.type==='trapping-result'&&j.skillTestProof.originId===originId),
  'tento výsledek byl již potvrzen.');
 check(periodConfirmed===true,'GM musí potvrdit osm hodin práce.');
 check(['none','Woodworking','Metalcraft'].includes(secondary),'neznámá Secondary dovednost.');
 check(secondary==='none'||(p.secondarySkills||[]).includes(secondary),
  'zvolený Secondary Modifier musí být doložen už v původním Survival testu.');
 check(secondary==='none'||secondaryNotAlreadyCounted===true,
  'GM musí potvrdit, že bonus není již v původním SV.');
 const bonus=secondary!=='none'&&['S','CS'].includes(sv.level)?1:0;
 const adjustedSV=sv.sv+bonus;
 const stars=Math.min(5,Math.max(0,adjustedSV-4));
 return {type:'trapping-result',format:minuteWork?TRAP_RESULT_MINUTE_FORMAT:TRAP_RESULT_FORMAT,campaignId,actorId,originId,
  startId:start.id,sourcePage:85,sourceRoll:sv.roll,sourceSV:sv.sv,sourceLevel:sv.level,
  secondary,secondaryNotAlreadyCounted:secondary!=='none',bonus,adjustedSV,stars,foodDays:stars,
  periodConfirmed:true,sourceMinute:source.campaignMinute,minute};
}
export function validateTrappingJournal93908(journal=[]){
 const starts=new Map(),used=new Set(),done=new Set(),prior=[];
 for(const row of journal){
  const s=row.calendarTrappingStart93908;
  if(!s)continue;
  const expected=s.format===TRAP_START_MINUTE_FORMAT?
   trappingStart93909({campaignId:row.calendarCampaignId,actorId:row.characterId,minute:row.campaignMinute,gmConfirmed:true}):
   trappingStart93908({campaignId:row.calendarCampaignId,actorId:row.characterId,minute:row.campaignMinute,gmConfirmed:true});
  check(JSON.stringify(s)===JSON.stringify(expected)&&!starts.has(row.id),'poškozený nebo opakovaný začátek.');
  starts.set(row.id,row);
 }
 for(const row of journal){
  const cancelled=row.calendarTrappingCancel93909;
  if(cancelled){const expected=trappingCancel93909({journal:prior,campaignId:row.calendarCampaignId,actorId:row.characterId,
    minute:row.campaignMinute,startId:cancelled.startId,gmConfirmed:true});
   check(JSON.stringify(expected)===JSON.stringify(cancelled),'poškozené potvrzené ukončení pastí.');}
  const work=row.calendarTrappingWork93909;
  if(work){
   const expected=trappingWork93909({journal:prior,campaignId:row.calendarCampaignId,actorId:row.characterId,
    minute:row.campaignMinute,startId:work.startId,fromMinute:work.fromMinute,toMinute:work.toMinute,gmConfirmed:true});
   check(JSON.stringify(expected)===JSON.stringify(work),'poškozený doklad odpracovaných minut.');
  }
  const l=row.calendarTrappingSV93908;
  if(l){
   const st=starts.get(l.startId),p=row.skillTestProof;
   const v2=st?.calendarTrappingStart93908?.format===TRAP_START_MINUTE_FORMAT;
   const expectedLink=v2?trappingSVLink93909({journal:prior,campaignId:row.calendarCampaignId,actorId:row.characterId,minute:row.campaignMinute,startId:l.startId}):null;
   check(st&&(v2?JSON.stringify(l)===JSON.stringify(expectedLink):
    l.dueMinute===st.calendarTrappingStart93908.dueMinute&&l.format==='hmk-trapping-sv-93908-v1'&&row.campaignMinute>=l.dueMinute)&&
    row.characterId===st.characterId&&row.calendarCampaignId===st.calendarCampaignId&&
    p?.type==='secondary-mastery-value-test'&&(p.skills?.[0]||p.skill)==='Survival'&&
    !used.has(l.startId),'nedoložený nebo duplicitní Survival SV.');
   used.add(l.startId);
  }
  const t=row.skillTestProof?.type==='trapping-result'?row.skillTestProof:null;
  if(t){
   const result=trappingResult93908({journal:prior,campaignId:row.calendarCampaignId,actorId:row.characterId,
    minute:row.campaignMinute,originId:t.originId,secondary:t.secondary,
    secondaryNotAlreadyCounted:t.secondaryNotAlreadyCounted,periodConfirmed:true});
   check(!done.has(t.originId)&&JSON.stringify(t)===JSON.stringify(result),'pozměněný nebo duplicitní výsledek pastí.');
   done.add(t.originId);
  }
  prior.push(row);
 }
 return true;
}
