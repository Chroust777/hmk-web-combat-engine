/** HMK 83, 132: Reading, physical condition and timed reflection. */
import {writingScripts} from './hmk-scribing-work.js?v=94.003';
import {copySource} from './hmk-script-copy.js?v=94.002';
import {resolveSkillTest,adjustSkillResultForTrauma} from './hmk-skill-test-engine.js?v=93.986';
import {automaticCriticalFailure} from './hmk-skill-consequence-resolution.js';

export const READING_CONDITION={pristine:0,degraded:-1,damaged:-2};
const eraThresholds={ancient:[5,30],middle:[25,75],modern:[35,90]};
const scopePages={missive:1,tract:8,treatise:32,disquisition:128};
const whole=(value,min,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const require=(ok,message)=>{if(!ok)throw Error('Reading: '+message);};
const matches=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const dice=(rolls,count,faces)=>Array.isArray(rolls)&&rolls.length===count&&rolls.every(x=>whole(x,1,faces));

export function readingCondition(choice,roll=null){
 if(Object.hasOwn(READING_CONDITION,choice)){
  require(roll===null,'zadaný stav předlohy nepoužívá hod.');
  return choice;
 }
 require(Object.hasOwn(eraThresholds,choice)&&whole(roll,1,100),'vyber stáří předlohy a potvrď d100.');
 const [pristine,degraded]=eraThresholds[choice];
 return roll<=pristine?'pristine':roll<=degraded?'degraded':'damaged';
}
export function externalReadingSource({name,format,language,script,pages,legibility,subject,insight,conditionChoice,conditionRoll}){
 require(typeof name==='string'&&name.trim().length>0&&name.trim().length<=120,'zadejte název předlohy do 120 znaků.');
 require(['missive','text','cipher'].includes(format)&&writingScripts(language).includes(script)&&whole(pages,1,10000),
  'zadejte platný druh, rozsah, jazyk a odpovídající písmo.');
 require([0,-5,-10,-15,-20].includes(legibility)&&whole(insight,0,5)&&typeof subject==='string'&&subject.length<=120&&
  (format==='cipher'?subject==='Mathematics':format==='missive'?subject===''&&insight===0:!insight||!!subject.trim()),
  'čitelnost musí odpovídat Scribing. Insight vyžaduje předmětovou dovednost.');
 return {name:name.trim(),format,language,script,pages,legibility,subject:subject.trim(),insight,conditionChoice,conditionRoll,
  condition:readingCondition(conditionChoice,conditionRoll)};
}
export function readingSource(journal,id,campaignId){
 const row=journal.find(x=>x.id===id&&x.calendarCampaignId===campaignId);
 if(!row)return null;
 if(row.calendarReadingSource){
  const source=row.calendarReadingSource;
  return {...source,id,originalId:id,text:source.format!=='missive',external:true,
   ...(source.format==='cipher'?{purpose:'cipher'}:{})};
 }
 const copy=row.calendarScriptCopy;
 const start=copy?.stage==='done'?journal.find(x=>x.id===copy.startId&&x.calendarCampaignId===campaignId):null;
 const origin=start?.calendarScriptCopy.sourceId??id;
 const source=copySource(journal,origin,campaignId);
 if(!source)return null;
 const mod=start?copy.settlement?.readingModifier:row.skillTestProof?.scribing?.outcome?.readingModifier;
 if(!whole(-mod,0,20))return null;
 return {...source,id,originalId:origin,name:source.name+(start?' · opis':''),pages:scopePages[source.scope],legibility:mod};
}
export function resolveReading(source,condition,input){
 const penalty=READING_CONDITION[condition];
 require(whole(input?.languageML,1,1000)&&whole(input.scriptML,1,1000)&&whole(input.modifier,-900,900)&&whole(input.slPenalty,0,1)&&
  typeof input.forcedCF==='boolean'&&(input.forcedCF?input.roll===null:whole(input.roll,1,100))&&typeof penalty==='number',
  'test vyžaduje doložený jazyk, písmo, stav předlohy a skutečný hod, pokud pravidla neurčují automatické CF.');
 return input.forcedCF?automaticCriticalFailure({ml:input.languageML,reason:'HMK p.170 – nepoužitelná zóna',svExtra:penalty}):
  adjustSkillResultForTrauma(resolveSkillTest({ml:input.languageML,roll:input.roll,secondaryMLs:[input.scriptML],
   gmModifier:input.modifier+source.legibility,svExtra:penalty}),{slPenalty:input.slPenalty});
}
export function readingStars(result){return Math.max(0,Math.min(5,result.sv-4));}
export function readingComprehension(source,sv,pages,cipher){
 if(source.purpose==='cipher'){
  if(!cipher)return 'Šifrovaná předloha';
  return cipher.deciphered?'Šifra rozluštěna':cipher.hasKey?'Šifra nerozluštěna · s klíčem je nutné SV 3+':'Šifra nerozluštěna';
 }
 if(sv<=0)return 'Písmo rozpoznáno, sdělení nepochopeno';
 if(sv<=2)return source.text?'Text nepochopen':'Obecný předmět dopisu pochopen';
 if(sv<=4)return !source.text&&pages===1?'Krátký dopis pochopen slovo od slova':'Obecný předmět pochopen';
 return 'Dílo pochopeno';
}
export function settleReading(source,pages,opened,result,{timeStars,subjectML,insightRolls,known,hasKey}){
 const stars=readingStars(result);
 require(whole(timeStars,0,stars)&&whole(subjectML,0,1000)&&whole(known,0,source.insight??0),'neplatné rozdělení hvězd nebo znalost předlohy.');
 if(source.purpose==='cipher'){
  require(typeof hasKey==='boolean'&&timeStars===0&&known===0&&dice(insightRolls,hasKey?0:stars,10),
   'Klíč nevyžaduje další kostky. Bez klíče musí být potvrzen jeden d10 za každou hvězdu Reading.');
  const tn=Math.floor(subjectML/10);
  const successes=insightRolls.filter(d=>d<=tn).length;
  return {timeStars,subjectML,insightRolls,known,found:0,readDue:opened+pages*5,cipher:{
   hasKey,tn,successes,required:source.insight,deciphered:hasKey?result.sv>=3:successes>=source.insight
  }};
 }
 const count=source.text?stars-timeStars:0;
 const tn=Math.floor(subjectML/10);
 require(dice(insightRolls,count&&tn&&known<source.insight?count:0,10),'chybí předepsané Insight d10.');
 const found=Math.min((source.insight??0)-known,insightRolls.filter(x=>x<=tn).length);
 return {timeStars,subjectML,insightRolls,known,found,readDue:opened+Math.ceil(pages*5*(10-timeStars)/10)};
}
export function settleReflection(read,exchanged,days,creativity){
 require(whole(exchanged,0,Math.max(0,read.found-1))&&dice(days,Math.max(0,read.found-1-exchanged),6),'neplatná výměna Insight nebo počet d6.');
 let result=null;
 if(creativity!==null){
  require(days.length&&whole(creativity.ml,1,1000)&&whole(creativity.roll,1,100)&&whole(creativity.modifier,-900,900)&&whole(creativity.slPenalty,0,1),'chybí platný Creativity d100.');
  result=adjustSkillResultForTrauma(resolveSkillTest({ml:creativity.ml,roll:creativity.roll,gmModifier:creativity.modifier}),{slPenalty:creativity.slPenalty});
 }
 const divisor=result?.level==='CS'?4:result?.level==='S'?2:1;
 return {exchanged,days,creativity,level:result?.level??null,reflectionMinutes:days.reduce((a,b)=>a+b,0)*1440/divisor,insights:read.found-exchanged};
}
export function readingRows(journal,campaign,actor){
 return journal.filter(row=>row.calendarCampaignId===campaign&&row.characterId===actor&&row.calendarScriptReading);
}
export function readingStages(rows,start){
 return Object.fromEntries(rows.filter(row=>row.calendarScriptReading.startId===start.id).map(row=>[row.calendarScriptReading.stage,row]));
}
export function readingCanStart(rows,source,ml){
 const start=rows.findLast(row=>row.calendarScriptReading.stage==='start'&&row.calendarScriptReading.sourceId===source.id);
 if(!start)return true;
 const stages=readingStages(rows,start);
 return !!stages.done&&ml>=stages.test.calendarScriptReading.input.languageML+10;
}
export function knownReadingInsights(rows,journal,source){
 return rows.filter(row=>row.calendarScriptReading.stage==='done').reduce((sum,row)=>{
  const start=rows.find(x=>x.id===row.calendarScriptReading.startId);
  const readSource=readingSource(journal,start?.calendarScriptReading.sourceId,row.calendarCampaignId);
  return sum+(readSource?.originalId===source.originalId?row.calendarScriptReading.reflection.insights:0);
 },0);
}
export function validateReadingJournal(journal){
 const seen=[];
 for(const row of journal){
  const external=row.calendarReadingSource;
  if(external)require(typeof row.id==='string'&&!!row.id&&typeof row.calendarCampaignId==='string'&&!!row.calendarCampaignId&&
   typeof row.characterId==='string'&&!!row.characterId&&whole(row.campaignMinute,0)&&!seen.some(entry=>entry.id===row.id)&&
   !row.calendarScriptReading&&matches(external,externalReadingSource(external)),'neplatný zápis externí předlohy.');
  const receipt=row.calendarScriptReading;
  if(receipt){
   require(whole(row.campaignMinute,0)&&typeof row.characterId==='string'&&typeof row.calendarCampaignId==='string','chybí čas nebo čtenář.');
   const rows=readingRows(seen,row.calendarCampaignId,row.characterId);
   if(receipt.stage==='start'){
    const source=readingSource(seen,receipt.sourceId,row.calendarCampaignId);
    const occupied=rows.some(x=>x.calendarScriptReading.stage==='start'&&
     readingSource(seen,x.calendarScriptReading.sourceId,row.calendarCampaignId)?.originalId===source?.originalId&&!readingStages(rows,x).done);
    require(source&&!occupied&&whole(receipt.pages,1,10000)&&whole(receipt.languageML,1,1000)&&
     readingCanStart(rows,source,receipt.languageML)&&
     (!source.external||receipt.pages===source.pages&&receipt.conditionChoice===source.condition&&receipt.conditionRoll===null)&&
     (source.purpose==='cipher'?typeof receipt.hasCipherKey==='boolean'&&receipt.pages===source.pages:receipt.hasCipherKey===undefined)&&readingCondition(receipt.conditionChoice,receipt.conditionRoll)===receipt.condition,
     'nesouhlasí předloha, stav, stránky nebo podmínky pro opakování.');
   }else{
    const start=rows.find(x=>x.id===receipt.startId&&x.calendarScriptReading.stage==='start');
    require(start&&row.campaignMinute>=start.campaignMinute,'chybí dokončené zahájení.');
    const p=start.calendarScriptReading,stages=readingStages(rows,start),source=readingSource(seen,p.sourceId,row.calendarCampaignId);
    require(!stages[receipt.stage]&&!stages.done,'tento krok už byl uložen.');
    if(receipt.stage==='test'){
     require(row.campaignMinute>=start.campaignMinute+Math.ceil(p.pages*5/2)&&
      readingCanStart(rows.filter(x=>x!==start),source,receipt.input?.languageML)&&
      matches(receipt.result,resolveReading(source,p.condition,receipt.input)),'předčasný nebo neplatný hod.');
    }else{
     const test=stages.test?.calendarScriptReading;
     require(test&&row.campaignMinute>=stages.test.campaignMinute,'chybí potvrzený test.');
     if(receipt.stage==='read'){
      const known=knownReadingInsights(rows,seen,source);
      const expected=settleReading(source,p.pages,start.campaignMinute,test.result,{...receipt.read,known,hasKey:p.hasCipherKey});
      require(matches(expected,receipt.read),'nesouhlasí hvězdy, Insight nebo termín čtení.');
     }else{
      require(stages.read&&row.campaignMinute>=Math.max(stages.read.campaignMinute,stages.read.calendarScriptReading.read.readDue),'nejprve dokonči samotné čtení.');
      if(source.purpose==='cipher'){
       require(receipt.stage==='done'&&!stages.reflect&&matches(receipt.reflection,settleReflection(stages.read.calendarScriptReading.read,0,[],null)),
        'Čtení šifry se uzavírá potvrzením výsledku luštění.');
      }else if(receipt.stage==='reflect'){
       const ref=receipt.reflection;
       require(ref&&matches(ref,settleReflection(stages.read.calendarScriptReading.read,ref.exchanged,ref.days,ref.creativity)),
        'nesouhlasí plán rozjímání.');
      }else{
       const ref=stages.reflect?.calendarScriptReading.reflection;
       require(receipt.stage==='done'&&ref&&matches(receipt.reflection,ref)&&
        row.campaignMinute>=Math.max(stages.reflect.campaignMinute,Math.max(stages.read.campaignMinute,stages.read.calendarScriptReading.read.readDue)+ref.reflectionMinutes)&&
        knownReadingInsights(rows,seen,source)+ref.insights<=source.insight,'nesouhlasí doba rozjímání nebo zapsané Insight.');
      }
     }
    }
   }
  }
  seen.push(row);
 }
}
export function assertReadingAppendOnly(before,after){
 const current=new Map(after.filter(x=>x.calendarScriptReading||x.calendarReadingSource).map(x=>[x.id,x]));
 for(const row of before)if(row.calendarScriptReading||row.calendarReadingSource)require(matches(row,current.get(row.id)),'uložený doklad nelze měnit.');
}
