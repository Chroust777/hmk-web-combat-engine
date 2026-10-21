/** Standard Poison & Toxin p.186 (Disease Course pp.183–184).
 * Intentionally limited to the printed standard lethal-HR0 variant.
 * Alternative outcomes (paralysis, etc.) require their own source-verified
 * adjudication and MUST NOT be silently treated as normal poison.
 * Pure functions; caller commits Combat State and journal atomically.
 */
import {healingBase} from '../rules/healing.js';
import {successLevel,SL} from '../rules/tests.js';
import {ailmentOutcome,ailmentCourse} from '../rules/ailments.js';
import {validateCombatState} from './persistent-combat-state.js';
import {antiveninPoisonEvidence} from './hmk-herbal-antivenin-bridge.js';
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const int=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const names=['CF','F','S','CS'];
const shock={none:'NONE',stunned:'STN',incapacitated:'INC',unconscious:'UNC',killed:'KIA'};
const isGoodId=id=>typeof id==='string'&&id.trim().length>=3&&id.length<=120;
const fourDice=arr=>Array.isArray(arr)&&arr.length===4&&arr.every(n=>int(n,1,10));
const SYMPTOMS=['chills','coughing','diarrhoea','dizziness','fever','headache','lesions/rash','pain','swelling','vomiting'];
const sym=d=>SYMPTOMS[d===10?9:d-1];
function profile(actor){const a=actor?.hmk?.attributes;check(actor?.id&&int(a?.end,1,99)&&int(a?.wil,1,99),
 'Poison Course: chybí ověřené Endurance a Will postavy');return healingBase({endurance:a.end,will:a.wil});}
function prepare(actor,state,round){profile(actor);validateCombatState(state);
 check(int(round,1,9999)&&round>=state.lastRound&&state.shock!=='KIA','Neplatné kolo nebo mrtvá postava');
 return structuredClone(state);
}
function noOtherObstacles(s,exceptId=null){
 check(s.shock==='NONE'&&!s.shockFollowup&&!s.extendedShock&&!s.coma?.active&&!s.bloodShockPending,
  'Poison: existuje nezávislý Shock / Coma; nelze jej tiše přepsat');
 check(!(s.environmentalHazards||[]).some(x=>x.active),'Poison: souběžná Environmental Exposure musí být předem pravidlově dořešena');
 check(!(s.diseaseCourses||[]).some(x=>['pending-profile','incubating','active'].includes(x.status)),
  'Poison: současná Disease expozice vyžaduje dořešení GM; žádný tichý souběh');
 check(!(s.toxinCourses||[]).some(x=>x.id!==exceptId&&(x.status==='active'||x.status==='incubating')), 
  'Poison: další současný toxin vyžaduje samostatné pravidlové řešení interakce');
}
function entry(s,sourceId){const id='poison:'+sourceId.trim(),t=(s.toxinCourses||[]).find(x=>x.id===id);
 check(t&&s.events.some(e=>e.id===id&&e.type==='poison-start'), 'Nenalezena doložená Poison událost');return t;
}
function applyOutcome(s,t,nextHR,round){
 const effect=ailmentOutcome(nextHR);
 check(s.fatigue.otherWeakness>=t.weaknessApplied,'Poison: již aplikovaná slabost se změnila nekonzistentně');
 check(s.shock===t.shockApplied,'Poison: Shock se změnil jinou událostí, přepis je blokován');
 s.fatigue.otherWeakness+=effect.weaknessFatigue-t.weaknessApplied;
 t.weaknessApplied=effect.weaknessFatigue;
 s.shock=shock[effect.shockState];
 t.shockApplied=s.shock;
 if(s.shock==='INC'||s.shock==='UNC'||s.shock==='KIA')s.posture.prone=true;
 if(s.shock==='KIA'){
  s.shockFollowup=null;s.extendedShock=null;s.coma=null;s.bloodShockPending=false;
  for(const w of s.wounds)w.nextAdvanceRound=null;
 }
 if(s.shock!=='NONE')s.shockOriginRound=round;
 t.hr=Math.max(0,Math.min(6,nextHR));
 t.status=effect.dead?'dead':effect.defeated?'defeated':'active';
 return {hr:t.hr,shock:s.shock,weakness:effect.weaknessFatigue,status:t.status};
}
function push(s,id,type,round,details){check(!s.events.some(x=>x.id===id),'Duplicitní Poison událost '+id);
 s.events.push({id,type,round,details});s.lastRound=round;validateCombatState(s);return s;}
export function preparePoisonStart({actor,state,round=1,sourceId,transmission,
 onsetMinutes,periodMinutes,initialHR,symptomD10s,standardLethal=true,herbalSource=null,
 actualExposureConfirmed=false,gmConfirmed=false}={}){
 const s=prepare(actor,state,round);
 check(gmConfirmed===true&&actualExposureConfirmed===true&&isGoodId(sourceId),
  'Poison: GM musí potvrdit konkrétní skutečnou expozici a jednoznačný klíč');
 check(['digested','vector','contact'].includes(transmission),'Poison: potvrďte skutečnou cestu přenosu');
 if(herbalSource!==null){
  check(herbalSource&&typeof herbalSource.applicationId==='string'&&herbalSource.applicationId.length>=3&&
   int(herbalSource.potency,1,3)&&int(herbalSource.sv,1,14)&&
   sourceId==='herb:'+herbalSource.applicationId&&transmission==='digested'&&
   initialHR===(herbalSource.potency===2?3:4)&&
   (herbalSource.potency===3?onsetMinutes===0&&
     int(herbalSource.onsetRounds,1,14)&&herbalSource.onsetRounds===15-herbalSource.sv&&
     int(herbalSource.originRound,1,9999)&&round===herbalSource.originRound+herbalSource.onsetRounds&&
     typeof herbalSource.timelineId==='string'&&herbalSource.timelineId.length>=3:
     onsetMinutes===(15-herbalSource.sv)*(herbalSource.potency===1?60:1)),
   'Herbal Poison: skutečný HR a nástup musí přesně odpovídat HMK 75');
  check(int(periodMinutes,10,60),'Herbal Poison: GM musí doložit Course period 10–60 minut podle HMK 186');
 }else check(int(onsetMinutes,10,60)&&int(periodMinutes,10,60),
  'Pro standardní toxin jsou potřebné GM potvrzené časy 10–60 minut (p.186)');
 check(int(initialHR,1,5)&&fourDice(symptomD10s),'Poison: potvrďte HR1–5 a čtyři skutečné d10 symptomů (p.183)');
 check(standardLethal===true,'Alternativní Poison výsledek (paralysis apod.) vyžaduje jiný doložený průchod GM');
 noOtherObstacles(s);
 const id='poison:'+sourceId.trim();check(!s.events.some(x=>x.id===id),'Stejná expozice toxinu již existuje');
 const course={id,sourceId:sourceId.trim(),transmission,onsetMinutes,periodMinutes,initialHR,
  symptoms:symptomD10s.map(sym),symptomD10s:[...symptomD10s],hr:initialHR,
  status:'incubating',elapsedMinutes:0,sequence:0,weaknessApplied:0,shockApplied:'NONE',
  standardLethal:true,...(herbalSource?{herbalSource:structuredClone(herbalSource)}:{})};
 s.toxinCourses=[...(s.toxinCourses||[]),course];
 push(s,id,'poison-start',round,{sourceId:course.sourceId,transmission,
  onsetMinutes,periodMinutes,initialHR,symptomD10s:[...symptomD10s],symptoms:course.symptoms,
  ...(herbalSource?{herbalSource:structuredClone(herbalSource)}:{}),rulePages:herbalSource?[75,183,184,186]:[183,184,186]});
 return {state:s,course:structuredClone(course),report:{id,phase:'incubating',onsetMinutes,periodMinutes}};
}
export function preparePoisonOnset({actor,state,sourceId,round=1,elapsedMinutes,gmConfirmed=false}={}){
 const s=prepare(actor,state,round);check(gmConfirmed===true&&isGoodId(sourceId),'Potvrďte GM a původní toxin');
 const t=entry(s,sourceId);check(t.status==='incubating','Poison: nástup již proběhl');
 check(elapsedMinutes===t.onsetMinutes,'Poison: nástup vyžaduje doložené uplynutí '+t.onsetMinutes+' minut; mezikroky nesmí zmizet');
 noOtherObstacles(s,t.id);t.elapsedMinutes=elapsedMinutes;
 const effects=applyOutcome(s,t,t.hr,round);
 push(s,t.id+':onset','poison-onset',round,{elapsedMinutes,hr:t.hr,conditions:effects,symptoms:[...t.symptoms]});
 return {state:s,course:structuredClone(t),report:{phase:'onset',...effects,elapsedMinutes}};
}
export function preparePoisonCourse({actor,state,sourceId,round=1,elapsedMinutes,
 courseD100,physicianSV=0,physicianConfirmed=false,gmConfirmed=false,herbalContext=null}={}){
 const s=prepare(actor,state,round);check(gmConfirmed===true&&isGoodId(sourceId),'Potvrďte GM a toxin');
 const t=entry(s,sourceId);
 check(t.status==='active','Poison Course smí pokračovat až po doloženém onset a jen při aktivním průběhu');
 check(int(courseD100,1,100)&&int(physicianSV,0,30)&&
  (physicianSV===0||physicianConfirmed===true),'Poison: skutečný d100, doložený Physician SV / GM potvrzení');
 check(elapsedMinutes===t.elapsedMinutes+t.periodMinutes,
  'Poison: další Course je splatný přesně po '+t.periodMinutes+' minutách; žádné tiché přeskočení');
 check(s.shock===t.shockApplied,'Poison Course: existující Shock pochází z jiného zdroje');
 check(!s.shockFollowup&&!s.extendedShock&&!s.coma?.active,'Poison Course: paralelní Shock/Coma musí posoudit GM');
 check(!(s.diseaseCourses||[]).some(x=>['pending-profile','incubating','active'].includes(x.status)),
  'Poison Course: současná Disease expozice vyžaduje dořešení GM');
 const hb=profile(actor),baseEML=hb*t.hr+physicianSV;
 let antivenin={bonus:0,sourceIds:[],completeIds:[],sourcePage:75};
 if(herbalContext!==null){
  check(herbalContext&&herbalContext.campaignId&&Number.isSafeInteger(herbalContext.minute)&&
   Number.isSafeInteger(herbalContext.poisonOriginMinute)&&
   herbalContext.minute===herbalContext.poisonOriginMinute+elapsedMinutes,
   'Antivenin: Course musí odpovídat doložené minutě původní expozice');
  antivenin=antiveninPoisonEvidence({journal:herbalContext.journal,
   campaignId:herbalContext.campaignId,minute:herbalContext.minute,
   poisonOriginMinute:herbalContext.poisonOriginMinute,targetId:actor.id,sourceId:t.sourceId,
   combatRound:herbalContext.combatRound??null,timelineId:herbalContext.timelineId??null});
 }
 const rawEML=baseEML+antivenin.bonus,
  sl=successLevel(courseD100,rawEML),course=ailmentCourse({healingRate:t.hr,sl});
 const beforeHR=t.hr;t.elapsedMinutes=elapsedMinutes;t.sequence++;
 const effects=applyOutcome(s,t,course.healingRate,round);
 push(s,t.id+':course:'+t.sequence,'poison-course',round,
  {elapsedMinutes,beforeHR,afterHR:t.hr,hb,rawEML,courseD100,sl:names[sl],
   physicianSV,physicianConfirmed,baseEML,antivenin,delta:course.delta,conditions:effects,rulePages:[75,183,184,186]});
 return {state:s,course:structuredClone(t),report:{phase:'course',beforeHR,...effects,hb,rawEML,
  courseD100,sl:names[sl],physicianSV,baseEML,antivenin,elapsedMinutes,nextDueMinutes:t.status==='active'?elapsedMinutes+t.periodMinutes:null}};
}
