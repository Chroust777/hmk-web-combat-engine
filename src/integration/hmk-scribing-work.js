/** HMK pp. 83, 132, 424–425: written forms, notation, and the pure Scribing test. */
import {adjustSkillResultForTrauma,resolveSkillTest} from './hmk-skill-test-engine.js?v=93.986';

import {automaticCriticalFailure} from './hmk-skill-consequence-resolution.js';
const scriptsByLanguage={
 'Búqdin':['Ayâran'],Chogôri:['Tankóno'],Elánasi:['Ayâran'],Hérei:['Ayâran'],Neshái:['Ánneri'],
 Pèchalâri:['Nerámic'],Thónian:['Ánneri'],Tuvâran:['Ayâran','Nerámic'],
 Býrian:['Ayâran','Nerámic'],Elbýthian:['Ayâran','Lakíse'],Karéjian:['Ayâran','Lakíse'],
 'Nâsik Azéri':['Ayâran','Lakíse'],Ûrméch:['Ayâran'],Zâkimladal:['Ayâran','Zérin'],
 Áltic:['Runic'],Emélan:['Lakíse'],Émhlèn:['Lakíse'],Járin:['Lakíse','Runic'],Yaríli:['Khrúni'],Yârla:['Khrúni'],
 'Anil Ketâri':['Shénya'],Bésha:['Nerámic'],Dálken:['Nerámic'],Hácherian:['Nerámic'],Ketâri:['Shénya'],
 Namârdi:['Tankóno','Nerámic'],Reksýni:['Shénya'],Mafáni:['Tankóno'],Shénti:['Tankóno'],
 Faláni:['Hekôri'],Kôrlic:['Hekôri','Runic','Ayâran'],Númer:['Hekôri'],
 Chéler:['Runic','Lakíse'],Hârbáaler:['Runic','Lakíse'],Hârnic:['Lakíse','Runic'],Huriséan:['Runic'],
 Ivínian:['Runic'],Kántâl:['Runic','Lakíse'],Orbáaler:['Runic','Lakíse'],
 Pálithàner:['Lakíse','Runic'],Quârphic:['Runic'],Shôrka:['Lakíse'],Târkáiner:['Runic','Lakíse'],Tríerzi:['Lakíse'],
 Mengólan:['Períka'],Sináin:['Selénian'],Kúzhan:['Khrúni']
};
export const WRITING_LANGUAGES=Object.freeze(Object.keys(scriptsByLanguage).map(name=>'Language ('+name+')'));
export function writingScripts(language){
 const name=/^Language \((.+)\)$/.exec(language)?.[1];
 return (Object.hasOwn(scriptsByLanguage,name)?scriptsByLanguage[name]:[]).map(script=>'Script ('+script+')');
}
export const WRITING_SUBJECTS=Object.freeze({writ:'Law',cipher:'Mathematics'});
export function writingFixedSubject(plan){
 if(plan?.purpose==='poem')return plan.language;
 if(plan?.purpose==='music')return 'Musician';
 return Object.hasOwn(WRITING_SUBJECTS,plan?.purpose)?WRITING_SUBJECTS[plan.purpose]:null;
}
export function writingRollSkills(plan){
 const poetics=['poem','music'].includes(plan?.purpose);
 return poetics?{primary:'Creativity',secondary:'Folklore',routineId:'writing-poetics'}:
  {primary:plan?.language,secondary:'Creativity',routineId:'language-written'};
}
export const WRITING_PAGES=Object.freeze({missive:1,tract:8,treatise:32,disquisition:128});
export function writingPageSpread(scope){
 if(!Object.hasOwn(WRITING_PAGES,scope))return null;
 const base=WRITING_PAGES[scope];
 return {min:Math.ceil(base*4/5),max:Math.floor(base*6/5)};
}
export function writingVariation(scope,pageDie=null,timeDie=null){
 const spread=writingPageSpread(scope);
 const faces=spread?spread.max-spread.min+1:0;
 const valid=(roll,max)=>Number.isSafeInteger(roll)&&roll>=1&&roll<=max;
 if(!spread||pageDie===null&&timeDie===null||
  pageDie!==null&&(faces<2||!valid(pageDie,faces))||timeDie!==null&&!valid(timeDie,41))
  throw Error('Writing: chybí potvrzený hod v rozsahu kostky pro strany nebo dobu.');
 return {pageDie,timeDie,pages:pageDie===null?WRITING_PAGES[scope]:spread.min+pageDie-1,
  timePercent:timeDie===null?100:79+timeDie};
}
export function writingDictationFactor(plan){return plan?.mode==='dictation'?1.5:1;}
export function writingPlannedMinutes(baseMinutes,plan){
 return baseMinutes*writingDictationFactor(plan)*(plan?.variation?.timePercent??100)/100;
}
export function writingIsText(project){return project.writingPlan?.intent!=='missive'&&project.scope!=='missive';}
export function writingSaleValueD(scope){
 return {tract:45,treatise:240,disquisition:900}[scope]??null;
}
export function validWritingPlan(plan,actorId,scope){
 if(plan?.variation!==undefined){
  try{
   if(!plan.variation||JSON.stringify(writingVariation(scope,plan.variation.pageDie,plan.variation.timeDie))!==JSON.stringify(plan.variation))return false;
  }catch{return false;}
 }
 return !!plan&&['self','dictation'].includes(plan.mode)&&['missive','text'].includes(plan.intent)&&
  (scope!=='missive'||plan.intent==='missive')&&
  (plan.purpose===undefined||!!writingFixedSubject(plan)&&plan.intent==='text'&&scope!=='missive')&&typeof plan.scribeId==='string'&&plan.scribeId.length>0&&
  (plan.mode==='self'?plan.scribeId===actorId:plan.scribeId!==actorId)&&writingScripts(plan.language).includes(plan.script);
}
export function rewriteBaseline(journal,completed,actorId,campaignId){
 if(completed?.characterId!==actorId||completed.calendarCampaignId!==campaignId||
  completed.calendarSkillProjectComplete591?.kind!=='writing')return null;
 const receipt=completed.calendarSkillProjectComplete591;
 const start=journal.find(row=>row.id===receipt.startId&&row.characterId===actorId&&row.calendarCampaignId===campaignId)?.calendarSkillProjectStart591;
 const proof=completed.skillTestProof;
 if(!start?.writingPlan||!proof?.scribing||!writingIsText(start))return null;
 const test=journal.find(row=>row.id===receipt.sourceId&&row.characterId===actorId&&row.calendarCampaignId===campaignId)?.skillTestProof;
 const languageML=proof.authorLanguageML??(writingRollSkills(start.writingPlan).primary===start.writingPlan.language?test?.a?.ml:null);
 const subject=proof.subjectSkill;
 // Old completions kept only the Index. Its upper bound gives a provable
 // increase if the exact old ML is unavailable.
 const subjectML=proof.subjectML??(subject&&Number.isSafeInteger(proof.subjectIndex)?proof.subjectIndex*10+9:null);
 return {start,languageML,subject,subjectML};
}
export function rewriteAllowed(baseline,languageML,subjectML){
 const increased=(before,after)=>Number.isSafeInteger(before)&&before>0&&Number.isSafeInteger(after)&&after<=1000&&after>=before+10;
 return !!baseline&&(increased(baseline.languageML,languageML)||increased(baseline.subjectML,subjectML));
}
export function resolveAuthoredScribing({mode,scriptML,languageML,drawingML,modifier,slPenalty,forcedCF,roll,scope,intent}){
 const situational=mode==='dictation'?-20:0;
 const result=forcedCF?
  automaticCriticalFailure({ml:scriptML,reason:'HMK p.170 – nepoužitelná zóna',svExtra:0}):
  adjustSkillResultForTrauma(resolveSkillTest({ml:scriptML,roll,gmModifier:modifier+situational,secondaryMLs:[languageML,drawingML]}),{slPenalty});
 const stars=Math.max(0,Math.min(5,result.sv-4));
 const base=intent==='text'?writingSaleValueD(scope):null;
 return {result,situational,stars,readingModifier:-Math.min(20,5*Math.max(0,4-result.sv))||0,
  baseSaleValueD:base,saleBonusPercent:base===null?0:stars*10,saleValueD:base===null?null:base*(10+stars)/10};
}
