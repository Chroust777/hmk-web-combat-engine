/** HMK v1.2 p.85 Trapping. Eight hours followed by ONE original Survival
 * Success Value; each star yields one food-day of meat. This module neither
 * rolls a die nor advances the GM clock nor creates a physical food stack.
 */
const check=(ok,msg)=>{if(!ok)throw Error('Trapping: '+msg)};
export const TRAP_START_FORMAT='hmk-trapping-start-93908-v1';
export const TRAP_RESULT_FORMAT='hmk-trapping-result-93908-v1';
export function trappingStart93908({campaignId,actorId,minute,gmConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
  Number.isSafeInteger(minute)&&minute>=0&&gmConfirmed===true,'potvrďte postavu, kampaň a začátek osmihodinové práce.');
 return {format:TRAP_START_FORMAT,campaignId,actorId,startMinute:minute,dueMinute:minute+480,gmConfirmed:true,sourcePage:85};
}
export function trappingResult93908({journal=[],campaignId,actorId,minute,originId,secondary='none',
 secondaryNotAlreadyCounted=false,periodConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&Number.isSafeInteger(minute),
  'chybí aktuální kampaň a čas.');
 const source=journal.find(j=>j.id===originId&&j.calendarCampaignId===campaignId&&j.characterId===actorId);
 const p=source?.skillTestProof,sv=p?.a??p?.result,link=source?.calendarTrappingSV93908;
 const start=journal.find(j=>j.id===link?.startId&&j.calendarCampaignId===campaignId);
 const startProof=start?.calendarTrappingStart93908;
 check(p?.type==='secondary-mastery-value-test'&&(p.skills?.[0]||p.skill)==='Survival'&&
  ['CF','F','S','CS'].includes(sv?.level)&&Number.isInteger(sv?.sv)&&
  startProof?.format===TRAP_START_FORMAT&&startProof.actorId===actorId&&start.characterId===actorId&&
  startProof.dueMinute===link.dueMinute&&source.campaignMinute>=link.dueMinute&&minute>=source.campaignMinute,
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
 return {type:'trapping-result',format:TRAP_RESULT_FORMAT,campaignId,actorId,originId,
  startId:start.id,sourcePage:85,sourceRoll:sv.roll,sourceSV:sv.sv,sourceLevel:sv.level,
  secondary,secondaryNotAlreadyCounted:secondary!=='none',bonus,adjustedSV,stars,foodDays:stars,
  periodConfirmed:true,sourceMinute:source.campaignMinute,minute};
}
export function validateTrappingJournal93908(journal=[]){
 const starts=new Map(),used=new Set(),done=new Set(),prior=[];
 for(const row of journal){
  const s=row.calendarTrappingStart93908;
  if(!s)continue;
  const expected=trappingStart93908({campaignId:row.calendarCampaignId,actorId:row.characterId,
   minute:row.campaignMinute,gmConfirmed:true});
  check(JSON.stringify(s)===JSON.stringify(expected)&&!starts.has(row.id),'poškozený nebo opakovaný začátek.');
  starts.set(row.id,row);
 }
 for(const row of journal){
  const l=row.calendarTrappingSV93908;
  if(l){
   const st=starts.get(l.startId),p=row.skillTestProof;
   check(st&&l.dueMinute===st.calendarTrappingStart93908.dueMinute&&
    l.format==='hmk-trapping-sv-93908-v1'&&row.characterId===st.characterId&&
    row.calendarCampaignId===st.calendarCampaignId&&row.campaignMinute>=l.dueMinute&&
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
