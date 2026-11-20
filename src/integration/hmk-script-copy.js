/** Copying existing written works (HMK 83, 132). Three immutable receipts:
 * scheduled work, observed test, and final allocation of that test's stars. */
import {resolveAuthoredScribing,writingIsText,writingSaleValueD} from './hmk-scribing-work.js?v=93.992';
import {resolveSkillTest,adjustSkillResultForTrauma} from './hmk-skill-test-engine.js?v=93.986';
import {automaticCriticalFailure} from './hmk-skill-consequence-resolution.js';
const demand=(ok,message)=>{if(!ok)throw Error('Opis: '+message);};
const whole=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const inputKeys=['scriptML','languageML','drawingML','modifier','slPenalty','forcedCF','roll','origin'];

export function copySource(journal,sourceId,campaignId){
 const done=journal.find(row=>row.id===sourceId&&row.calendarCampaignId===campaignId&&row.calendarSkillProjectComplete591?.kind==='writing');
 const start=done&&journal.find(row=>row.id===done.calendarSkillProjectComplete591.startId&&row.calendarCampaignId===campaignId)?.calendarSkillProjectStart591;
 if(!start?.writingPlan||!done.skillTestProof?.scribing)return null;
 return {id:sourceId,name:start.projectName,scope:start.scope,text:writingIsText(start),baseMinutes:start.baseMinutes,
  language:start.writingPlan.language,script:start.writingPlan.script,subject:done.skillTestProof.subjectSkill,insight:done.skillTestProof.insightStars};
}
export function resolveScriptCopy(source,method,input){
 demand(['script','drawing'].includes(method)&&whole(input.scriptML,0,1000)&&whole(input.languageML,0,1000)&&
  whole(input.drawingML,1,1000)&&whole(input.modifier,-1000,1000)&&whole(input.slPenalty,0,1)&&typeof input.forcedCF==='boolean'&&
  (input.forcedCF?input.roll===null&&input.origin==='rule-forced-no-die':whole(input.roll,1,100)&&['manual','software'].includes(input.origin)),
  'neplatné parametry dovedností nebo chybí potvrzená kostka.');
 if(method==='script'){
  demand(input.scriptML>0&&input.languageML>0,'opis přes Script vyžaduje Script, Language a Drawing.');
  return resolveAuthoredScribing({...input,mode:'self',scope:source.scope,intent:source.text?'text':'missive'}).result;
 }
 return input.forcedCF?automaticCriticalFailure({ml:input.drawingML,reason:'HMK p.170 – nepoužitelná zóna',svExtra:-2}):
  adjustSkillResultForTrauma(resolveSkillTest({ml:input.drawingML,roll:input.roll,gmModifier:input.modifier,svExtra:-2}),{slPenalty:input.slPenalty});
}
export function copyStars(result){return Math.max(0,Math.min(5,result.sv-4));}
export function copySettlement(source,startMinute,result,timeStars,priceStars){
 demand(whole(timeStars,0,5)&&whole(priceStars,0,5)&&timeStars+priceStars<=copyStars(result)&&(!priceStars||source.text),
  'počet hvězd na čas a cenu přesahuje výsledek nebo jde o dopis.');
 const base=source.text?writingSaleValueD(source.scope):null;
 return {timeStars,priceStars,dueMinute:startMinute+Math.ceil(source.baseMinutes*(10-timeStars)/10),
  saleValueD:base===null?null:base*(10+priceStars)/10,readingModifier:-Math.min(20,Math.max(0,4-result.sv)*5)||0};
}
export function copyRecords(journal,campaignId,actorId){
 return journal.filter(row=>row.calendarCampaignId===campaignId&&row.characterId===actorId&&row.calendarScriptCopy);
}
export function findCopyStages(journal,start){
 const rows=copyRecords(journal,start.calendarCampaignId,start.characterId);
 const test=rows.find(row=>row.calendarScriptCopy.stage==='test'&&row.calendarScriptCopy.startId===start.id);
 const done=rows.find(row=>row.calendarScriptCopy.stage==='done'&&row.calendarScriptCopy.startId===start.id);
 return {test,done};
}
export function copyRetryAllowed(journal,campaignId,actorId,sourceId,scriptML){
 const rows=copyRecords(journal,campaignId,actorId);
 const starts=rows.filter(row=>row.calendarScriptCopy.stage==='start'&&row.calendarScriptCopy.sourceId===sourceId);
 const last=starts.at(-1);
 if(!last)return true;
 const {test,done}=findCopyStages(rows,last);
 return !!done&&scriptML>=test.calendarScriptCopy.input.scriptML+10;
}
export function validateScriptCopies(journal){
 const seen=[];
 for(const row of journal){
  const p=row.calendarScriptCopy;if(!p){seen.push(row);continue;}
  const same=copyRecords(seen,row.calendarCampaignId,row.characterId);
  demand(typeof row.calendarCampaignId==='string'&&whole(row.campaignMinute)&&typeof row.characterId==='string','chybí datovaný aktér.');
  if(p.stage==='start'){
   const source=copySource(seen,p.sourceId,row.calendarCampaignId);
   demand(source&&whole(p.scriptML,0,1000)&&['script','drawing'].includes(p.method)&&copyRetryAllowed(seen,row.calendarCampaignId,row.characterId,p.sourceId,p.scriptML),
    'chybí předloha nebo nebyly splněny podmínky nového pokusu (+10 ML v Scriptu).');
  }else{
   const start=same.find(entry=>entry.id===p.startId&&entry.calendarScriptCopy.stage==='start');
   demand(start&&row.campaignMinute>=start.campaignMinute,'chybí předchozí zahájení opisování.');
   const source=copySource(seen,start.calendarScriptCopy.sourceId,row.calendarCampaignId);
   const {test,done}=findCopyStages(same,start);
   if(p.stage==='test'){
    demand(!test&&row.campaignMinute>=start.campaignMinute+Math.ceil(source.baseMinutes/2)&&
     copyRetryAllowed(seen.filter(entry=>entry.id!==start.id),row.calendarCampaignId,row.characterId,source.id,p.input?.scriptML),
     'hod je předčasný, už uložený nebo chybí potřebný nárůst Script ML.');
    demand(p.input&&inputKeys.every(key=>Object.hasOwn(p.input,key))&&
     JSON.stringify(p.result)===JSON.stringify(resolveScriptCopy(source,start.calendarScriptCopy.method,p.input)),
     'uložený test neodpovídá vstupům.');
   }else{
    demand(p.stage==='done'&&test&&!done&&row.campaignMinute>=test.campaignMinute,'dokončení vyžaduje jeden doložený test.');
    const expected=copySettlement(source,start.campaignMinute,test.calendarScriptCopy.result,p.settlement?.timeStars,p.settlement?.priceStars);
    demand(row.campaignMinute>=expected.dueMinute&&JSON.stringify(p.settlement)===JSON.stringify(expected),'čas nebo rozdělení hvězd nesouhlasí.');
   }
  }
  seen.push(row);
 }
}
export function assertScriptCopiesAppendOnly(before,after){
 const next=new Map(after.filter(row=>row.calendarScriptCopy).map(row=>[row.id,row]));
 for(const row of before)if(row.calendarScriptCopy)demand(JSON.stringify(next.get(row.id))===JSON.stringify(row),'uložený doklad se nesmí změnit.');
}
