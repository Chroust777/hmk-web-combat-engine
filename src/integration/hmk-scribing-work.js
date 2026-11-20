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
export function writingScripts(language){
 const name=/^Language \((.+)\)$/.exec(language)?.[1];
 return (Object.hasOwn(scriptsByLanguage,name)?scriptsByLanguage[name]:[]).map(script=>'Script ('+script+')');
}
export const WRITING_SUBJECTS=Object.freeze({writ:'Law',cipher:'Mathematics'});
export function writingFixedSubject(plan){
 return Object.hasOwn(WRITING_SUBJECTS,plan?.purpose)?WRITING_SUBJECTS[plan.purpose]:null;
}
export function writingDictationFactor(plan){return plan?.mode==='dictation'?1.5:1;}
export function writingIsText(project){return project.writingPlan?.intent!=='missive'&&project.scope!=='missive';}
export function writingSaleValueD(scope){
 return {tract:45,treatise:240,disquisition:900}[scope]??null;
}
export function validWritingPlan(plan,actorId,scope){
 return !!plan&&['self','dictation'].includes(plan.mode)&&['missive','text'].includes(plan.intent)&&
  (scope!=='missive'||plan.intent==='missive')&&
  (plan.purpose===undefined||!!writingFixedSubject(plan)&&plan.intent==='text'&&scope!=='missive')&&typeof plan.scribeId==='string'&&plan.scribeId.length>0&&
  (plan.mode==='self'?plan.scribeId===actorId:plan.scribeId!==actorId)&&writingScripts(plan.language).includes(plan.script);
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
