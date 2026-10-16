/** HMK v1.2 pp.183–184: STANDARD lethal disease, from transmission to course.
 * This module is pure: callers persist the complete proposed Combat State and
 * the corresponding immutable journal record in ONE verified transaction.
 * Nonlethal floor/HR0 and unusual symptom rules are deliberately not inferred.
 */
import {healingBase} from '../rules/healing.js';
import {SL,successLevel} from '../rules/tests.js';
import {ailmentOutcome,ailmentCourse} from '../rules/ailments.js';
import {contagionTest} from '../rules/ailments.js';
import {validateCombatState} from './persistent-combat-state.js';

const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const isId=x=>typeof x==='string'&&x.trim().length>=3&&x.trim().length<=120;
const slNames=['CF','F','S','CS'];
const transmissionModes=['airborne','contact','digested','vector'];
const symptoms=['chills','coughing','diarrhoea','dizziness','fever','headache','lesions/rash','pain','swelling','vomiting'];
const hrShock=['KIA','UNC','INC','STN','NONE','NONE','NONE'];
const hrWeakness=[0,0,0,0,10,5,0];
function actorProfile(actor){const a=actor?.hmk?.attributes;
 check(actor?.id&&integer(a?.end,1,99)&&integer(a?.wil,1,99),'Disease: chybí ověřené END nebo WIL');
 return {end:a.end,hb:healingBase({endurance:a.end,will:a.wil})};}
function draft(actor,state,round){actorProfile(actor);validateCombatState(state);
 check(integer(round,1,9999)&&round>=state.lastRound&&state.shock!=='KIA','Disease: kolo nebo životní stav je neplatný');
 return structuredClone(state);}
function push(state,id,type,round,details){check(!state.events.some(e=>e.id===id),'Disease: duplicitní událost');
 state.events.push({id,type,round,details});state.lastRound=round;validateCombatState(state);}
function conflict(state,{exceptId=null,allowCurrentDiseaseShock=false}={}){
 const active=(state.diseaseCourses||[]).filter(x=>x.id!==exceptId&&['pending-profile','incubating','active'].includes(x.status));
 check(!active.length,'Disease: jiná otevřená nemoc potřebuje samostatné pravidlové rozhodnutí GM');
 check(!(state.toxinCourses||[]).some(t=>['incubating','active'].includes(t.status)),'Disease: současný Poison/Toxin nelze sloučit bez pravidel');
 check(!(state.environmentalHazards||[]).some(t=>t.active),'Disease: současnou Environmental Exposure nelze sloučit bez pravidel');
 check(!state.shockFollowup&&!state.extendedShock&&!state.coma?.active&&!state.bloodShockPending,
  'Disease: současný Shock follow-up nebo Coma vyžaduje řešení GM');
 if(!allowCurrentDiseaseShock)check(state.shock==='NONE','Disease: nezávislý Shock nesmí být přepsán');
}
function find(state,sourceId){check(isId(sourceId),'Disease: chybí identifikátor expozice');
 const id='disease:'+sourceId.trim(),e=(state.diseaseCourses||[]).find(x=>x.id===id);
 check(e&&state.events.some(event=>event.id===id&&event.type==='disease-exposure'),
  'Disease: původní expozice nebyla doložena');return e;}
function mappedIndex(d20){return d20<=3?1:d20<=9?2:d20<=17?3:d20<=19?4:5;}
function mappedVirulence(d20){return d20<=2?1:d20<=5?2:d20<=12?3:d20<=16?4:5;}
function apply(state,episode,next,round){
 check(state.fatigue.otherWeakness>=episode.weaknessApplied,'Disease: změněná evidence slabosti');
 check(state.shock===episode.shockApplied,'Disease: Shock změnil jiný zdroj');
 check(next>=(episode.floorHR||0),'Disease: nepovolené překročení neletálního HR minima');
const out=ailmentOutcome(next),normalized=Math.max(0,Math.min(next,6)),kind=hrShock[normalized],weak=hrWeakness[normalized];
 check(({KIA:'killed',UNC:'unconscious',INC:'incapacitated',STN:'stunned',NONE:'none'})[kind]===out.shockState,
  'Disease: interní rozdíl v Outcome tabulce');
 state.fatigue.otherWeakness+=weak-episode.weaknessApplied;episode.weaknessApplied=weak;
 state.shock=kind;episode.shockApplied=kind;
 if(kind==='INC'||kind==='UNC'||kind==='KIA')state.posture.prone=true;
 if(kind==='KIA'){
  state.shockFollowup=null;state.extendedShock=null;state.coma=null;state.bloodShockPending=false;
  for(const wound of state.wounds)wound.nextAdvanceRound=null;
 }
 if(kind!=='NONE')state.shockOriginRound=round;
 episode.hr=normalized;episode.status=kind==='KIA'?'dead':normalized===6?'defeated':'active';
 return {hr:normalized,shock:kind,weakness:weak,status:episode.status};
}
/** A d100 roll only. A failed exposure creates an immutable pending task;
 * onset d6 and symptoms are not required until the confirmed contraction.
 * A previous CS bonus applies only to the immediately next exposure to the
 * SAME disease; it is consumed even when that subsequent roll succeeds.
 */
export function prepareDiseaseExposure({actor,state,sourceId,diseaseKey,transmission,
 contagionIndex,contagionIndexD20=null,contagionD100,round=1,
 confirmedStandardLethal=false,nonlethalFloorHR=null,gmConfirmedFloor=false,gmConfirmed=false}={}){
 const s=draft(actor,state,round),{end}=actorProfile(actor);
 check(gmConfirmed===true&&isId(sourceId)&&isId(diseaseKey),
  'Disease: GM musí potvrdit skutečný zdroj a totožnost nemoci');
 const hasFloor=nonlethalFloorHR!==null;
 check((!hasFloor&&confirmedStandardLethal===true)||
  (hasFloor&&confirmedStandardLethal===false&&gmConfirmedFloor===true&&[1,2].includes(nonlethalFloorHR)),
  'Disease: potvrďte buď standardní fatální HR0, nebo doložené neletální minimum HR1/HR2 (p.184)');
 check(transmissionModes.includes(transmission),'Disease: neplatný způsob přenosu');
 check(integer(contagionIndex,1,5)&&integer(contagionD100,1,100),
  'Disease: je nutné doložit CI1–5 a skutečný Contagion d100');
 if(contagionIndexD20!==null)check(integer(contagionIndexD20,1,20)&&mappedIndex(contagionIndexD20)===contagionIndex,
  'Disease: CI neodpovídá skutečnému d20 z tabulky p183');
 const id='disease:'+sourceId.trim();check(!(s.diseaseCourses||[]).some(x=>x.id===id),'Disease: stejná expozice již byla vyhodnocena');
 const prev=(s.diseaseCourses||[]).filter(x=>x.diseaseKey===diseaseKey.trim()).at(-1);
 const priorBonus=prev?.nextExposureBonus||0,usedCI=contagionIndex+priorBonus;
 const contagion=contagionTest({contagionIndex:usedCI,endurance:end,roll:contagionD100});
 const contracted=contagion.contracted;
 if(contracted)conflict(s);
 const current={id,sourceId:sourceId.trim(),diseaseKey:diseaseKey.trim(),transmission,
  contagionIndex,contagionIndexD20,contagionD100,usedCI,priorBonus,
  contagionEML:usedCI*end,contagionSL:slNames[contagion.sl],
  nextExposureBonus:contagion.sl===SL.CS?1:0,
  onsetD6:null,onsetMinutes:null,initialHR:null,virulenceD20:null,
  symptomD10s:[],symptoms:[],hr:null,
  status:contracted?'pending-profile':'avoided',elapsedMinutes:0,sequence:0,
  weaknessApplied:0,shockApplied:'NONE',standardLethal:!hasFloor,floorHR:nonlethalFloorHR??0};
 s.diseaseCourses=[...(s.diseaseCourses||[]),current];
 push(s,id,'disease-exposure',round,{sourceId:current.sourceId,diseaseKey:current.diseaseKey,
  transmission,contagionIndex,contagionIndexD20,contagionD100,usedCI,priorBonus,
  eml:current.contagionEML,sl:current.contagionSL,contracted,
  standardLethal:current.standardLethal,floorHR:current.floorHR,rulePages:[183,184]});
 return {state:s,episode:structuredClone(current),report:{phase:'contagion',contracted,
  sl:current.contagionSL,eml:current.contagionEML,usedCI,nextExposureBonus:current.nextExposureBonus}};
}
/** GM completes all four physical symptom dice and onset AFTER contraction. */
export function prepareDiseaseProfile({actor,state,sourceId,round=1,onsetD6,
 symptomD10s,initialHR=null,virulenceD20=null,gmConfirmed=false}={}){
 const s=draft(actor,state,round),t=find(s,sourceId);
 check(gmConfirmed===true&&t.status==='pending-profile','Disease: nejprve musí být potvrzena kontrakce (CF/F)');
 check(integer(onsetD6,1,6)&&Array.isArray(symptomD10s)&&symptomD10s.length===4&&
  symptomD10s.every(v=>integer(v,1,10)),'Disease: doložte d6 onset a čtyři skutečné symptom d10');
 check(initialHR===null||integer(initialHR,1,5),'Disease: GM musí potvrdit počáteční HR1–5');
 if(virulenceD20!==null){
  check(integer(virulenceD20,1,20),'Disease: virulence d20 musí být 1–20');
  const fromDie=mappedVirulence(virulenceD20);
  check(initialHR===null||fromDie===initialHR,'Disease: HR neodpovídá virulence d20');
  initialHR=fromDie;
 }
 check(integer(initialHR,1,5),'Disease: chybí doložená virulence (HR nebo d20)');
 check(initialHR>=(t.floorHR||0),'Disease: počáteční HR nesmí být pod GM potvrzenou neletální mezí');
 t.onsetD6=onsetD6;t.onsetMinutes=onsetD6*(t.contagionSL==='CF'?720:1440);
 t.symptomD10s=[...symptomD10s];t.symptoms=symptomD10s.map(n=>symptoms[n-1]);
 t.initialHR=initialHR;t.virulenceD20=virulenceD20;t.hr=initialHR;t.status='incubating';
 push(s,t.id+':profile','disease-profile',round,{onsetD6,onsetMinutes:t.onsetMinutes,
  initialHR,virulenceD20,symptomD10s:[...symptomD10s],symptoms:[...t.symptoms],rulePage:183});
 return {state:s,episode:structuredClone(t),report:{phase:'incubating',onsetMinutes:t.onsetMinutes,initialHR}};
}
export function prepareDiseaseOnset({actor,state,sourceId,round=1,elapsedMinutes,gmConfirmed=false}={}){
 const s=draft(actor,state,round),t=find(s,sourceId);
 check(gmConfirmed===true&&t.status==='incubating','Disease: ještě není doložená příprava nástupu');
 check(elapsedMinutes===t.onsetMinutes,'Disease: GM musí doložit přesný onset '+t.onsetMinutes+' minut');
 conflict(s,{exceptId:t.id});t.elapsedMinutes=elapsedMinutes;
 const outcome=apply(s,t,t.hr,round);
 push(s,t.id+':onset','disease-onset',round,{elapsedMinutes,initialHR:t.initialHR,
  symptoms:[...t.symptoms],outcome,rulePages:[183,184]});
 return {state:s,episode:structuredClone(t),report:{phase:'onset',elapsedMinutes,...outcome}};
}
export function prepareDiseaseCourse({actor,state,sourceId,round=1,elapsedMinutes,
 courseD100,physicianSV=0,physicianConfirmed=false,selfTreatment=false,
 gmConfirmed=false}={}){
 const s=draft(actor,state,round),t=find(s,sourceId);
 check(gmConfirmed===true&&t.status==='active','Disease: Course lze provést jen po nástupu aktivní nemoci');
 check(integer(courseD100,1,100)&&integer(physicianSV,0,30),
  'Disease: je nutný skutečný Course d100 a doložené Physician SV');
 check(physicianSV===0||physicianConfirmed===true,
  'Disease: kladný Physician SV vyžaduje potvrzený úspěšný test');
 check(!selfTreatment||t.initialHR>=4,'Disease: self-treatment je povolen jen při počáteční HR4 nebo HR5');
 check(elapsedMinutes===t.elapsedMinutes+1440,'Disease: Course probíhá každých 24 hodin po nástupu');
 conflict(s,{exceptId:t.id,allowCurrentDiseaseShock:true});
 check(s.shock===t.shockApplied,'Disease: aktuální Shock se změnil nezávisle; přepis blokován');
 const hb=actorProfile(actor).hb,rawEML=hb*t.hr+physicianSV;
 const sl=successLevel(courseD100,rawEML),course=ailmentCourse({healingRate:t.hr,sl});
 const beforeHR=t.hr;t.elapsedMinutes=elapsedMinutes;t.sequence+=1;
 const appliedHR=Math.max(t.floorHR||0,course.healingRate);
 const floorApplied=appliedHR!==course.healingRate;
 const outcome=apply(s,t,appliedHR,round);
 push(s,t.id+':course:'+t.sequence,'disease-course',round,{elapsedMinutes,beforeHR,
  afterHR:t.hr,hb,eml:rawEML,courseD100,sl:slNames[sl],physicianSV,
  physicianConfirmed,selfTreatment,delta:course.delta,unflooredHR:course.healingRate,
   floorApplied,gmFloor:t.floorHR||0,outcome,rulePage:184});
 return {state:s,episode:structuredClone(t),report:{phase:'course',beforeHR,
  ...outcome,hb,rawEML,courseD100,sl:slNames[sl],physicianSV,elapsedMinutes,
  floorApplied,unflooredHR:course.healingRate,gmFloor:t.floorHR||0,
  nextDueMinutes:t.status==='active'?elapsedMinutes+1440:null}};
}
