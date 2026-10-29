/** HMK v1.2 pp.184–186: proof-linked starvation and thirst.
 * A day of certified exclusive Foraging provisioning is the ONLY eligible
 * onset source. Never infer an ailment from an empty inventory. A medical roll
 * is committed separately, with the original due time and actual GM clock.
 * Both conditions contribute to the EXISTING persistent Combat Fatigue.
 */
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
import {campaignKey} from './hmk-calendar-multi-campaign.js';
import {healingBase} from '../rules/healing.js';
import {successLevel,SL} from '../rules/tests.js';
import {ailmentOutcome,exposureAdvance,exposureHealing,malnutritionSchedule} from '../rules/ailments.js';
export const MALNUTRITION_FORMAT='hmk-malnutrition-medical-v1';
const DAY=1440;
const check=(v,m)=>{if(!v)throw Error(m)};
const minute=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000000;
const kinds=['starvation','thirst'];
const column={starvation:['foodReceived','foodNeed'],thirst:['waterReceived','waterNeed']};
const weakness=hr=>ailmentOutcome(hr).weaknessFatigue;
const shock=hr=>({stunned:'STN',incapacitated:'INC',unconscious:'UNC',killed:'KIA',none:'NONE'})[ailmentOutcome(hr).shockState]??'NONE';
const severity={NONE:0,STN:1,INC:2,UNC:3,KIA:4};
function episodes(c){return c?.hmk?.combatState?.malnutritionEpisodes??[]}
/** Journal entries survive campaign switches. Their medical events may reside
 * in an inactive campaign's preserved actor branch, not the visible actor.
 * Never validate an old medical proof against another campaign's snapshot. */
function evidenceState(database,actorId,campaignId){
 const actor=database.characters?.find(c=>c.id===actorId);
 if(campaignId===campaignKey(database.campaignClock))return actor?.hmk?.combatState;
 return database.campaignActorBranches?.[campaignId]?.[actorId]?.hmk?.combatState??
  (database.calendarEvidenceArchives??[]).find(a=>a.sourceCampaignId===campaignId)
   ?.medicalBranches?.find(b=>b.actorId===actorId)?.state;
}
function ensureState(c){c.hmk??={};c.hmk.combatState??=initialCombatState();return c.hmk.combatState}
function rationStatus(p,kind){const [received,needed]=column[kind],got=p[received],want=p[needed];
 if(got>=want)return 'full';if(got===0)return 'none';if(got===want/2)return 'half';return 'partial';}
function entries(journal,campaignId,actorId){return journal.filter(j=>j.calendarCampaignId===campaignId&&j.characterId===actorId&&j.calendarNutritionDay?.format==='hmk-nutrition-day-v1').sort((a,b)=>a.calendarNutritionDay.endMinute-b.calendarNutritionDay.endMinute)}
function chooseShock(state,prev){
 const current=(state.malnutritionEpisodes??[]).filter(x=>x.status==='active'||x.status==='dead').reduce((s,x)=>severity[shock(x.hr)]>severity[s]?shock(x.hr):s,'NONE');
 // Never overwrite a foreign Injury, Disease, Poison, Coma or combat Shock.
 const protectedState=!!(state.extendedShock||state.coma?.active||state.shockFollowup||
  (state.shock!=='NONE'&&(state.wounds??[]).some(w=>!w.healed))||
  (state.toxinCourses??[]).some(x=>['active','incubating'].includes(x.status)&&x.shockApplied!=='NONE')||
  (state.diseaseCourses??[]).some(x=>x.status==='active'&&x.shockApplied!=='NONE')||
  (state.environmentalHazards??[]).some(x=>x.active&&x.shockApplied!=='NONE'));
 const external=state.shock!==prev&&state.shock!=='NONE';
 if(current!==prev)check(!protectedState&&!external,'Malnutrition: souběžný Shock z jiného zdroje vyžaduje původní pravidlové dořešení');
 if(current!==prev)state.shock=current;if(['INC','UNC'].includes(current))state.posture.prone=true;
 if(current==='KIA'){state.posture.prone=true;state.shockFollowup=null;state.extendedShock=null;state.coma=null;state.bloodShockPending=false;for(const w of state.wounds??[])w.nextAdvanceRound=null;}
}
/** Called atomically ONLY after the GM's clock finalized nutrition days. */
export function applyDueMalnutritionOnsets(database,{idFactory,stamp}={}){
 const clock=database?.campaignClock;if(!clock)return [];
 check(typeof idFactory==='function'&&typeof stamp==='function','Malnutrition: neplatné auditní funkce');
 const campaignId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const newEntries=[];
 const participants=new Set(clock.characterIds??database.characters.map(c=>c.id));
 for(const actor of database.characters.filter(c=>participants.has(c.id))){
  const history=entries(database.journal,campaignId,actor.id);if(!history.length||actor.hmk?.combatState?.shock==='KIA')continue;
  for(const kind of kinds){
   let zero=0,halves=0;
   // A cured episode cannot recur from ration shortages that were already
   // accounted for while that episode was active. Resume onset surveillance
   // only AFTER its final proven healing/death roll.
   const previousOnset=Math.max(-1,...episodes(actor).filter(e=>e.kind===kind&&e.campaignId===campaignId)
    .map(e=>e.status==='active'?e.originMinute:Math.max(e.originMinute,e.lastDueMinute)));
   for(const j of history){const d=j.calendarNutritionDay;
    if(d.endMinute<=previousOnset)continue;
    const policy=database.journal.find(x=>x.id===d.policyId)?.calendarNutritionPolicy;
    check(policy?.enabled===true&&(policy.foragingOnly===true||policy.inventoryRations===true||policy.gmProvisioned===true),
     'Malnutrition: chybí doložený úplný režim účtování zásob');
    const r=rationStatus(d,kind);
    if(r==='full'){zero=0;halves=0;}
    else if(r==='none'){zero++;halves=0;}
    else if(r==='half'){halves++;zero=0;}
    else {zero=0;halves=0;} // HMK does not define an arbitrary partial ration onset.
    const existing=episodes(actor).find(e=>e.kind===kind&&e.campaignId===campaignId&&e.status==='active');
    if(existing){
     if(d.endMinute>existing.lastDueMinute){
      if(r==='full'&&d.endMinute>=(existing.skipRecoveryBefore??0)&&d.endMinute<existing.nextDueMinute)
       existing.nextDueMinute=d.endMinute;
      // A missed full ration terminates daily HEALING eligibility. Revert to
      // p.186's slower Advance schedule, never fabricate a daily Advance for
      // starvation merely because yesterday's treatment was daily.
      if(r!=='full'&&existing.lastMode==='healing'&&existing.skipRecoveryBefore===null){
       const advance=malnutritionSchedule({kind,halfRations:r==='half',completeRest:d.foodNeed===0.5}).advanceEveryDays*DAY;
       const earliest=existing.lastDueMinute+advance;
       if(earliest>existing.nextDueMinute)existing.nextDueMinute=earliest;
      }
     }
     continue;
    }
    if(zero<1&&halves<2)continue;
    const sourceId=j.id;
    const state=ensureState(actor);
    // An existing active case is not a fresh second disease.
    if((state.malnutritionEpisodes??[]).some(e=>e.sourceDayId===sourceId&&e.kind===kind))continue;
    check(state.shock!=='KIA','Malnutrition: mrtvá postava nezíská novou expozici');
    const hr=kind==='starvation'?5:4;
    const newWeak=weakness(hr);
    const e={format:MALNUTRITION_FORMAT,id:'malnutrition:'+kind+':'+sourceId,kind,sourceDayId:sourceId,
     campaignId,originMinute:d.endMinute,hr,initialHR:hr,status:'active',sequence:0,
     weaknessApplied:newWeak,shockApplied:'NONE',lastDueMinute:d.endMinute,
     nextDueMinute:d.endMinute+malnutritionSchedule({kind,halfRations:r==='half',completeRest:d.foodNeed===0.5}).advanceEveryDays*DAY,
     lastMode:'advance',skipRecoveryBefore:null,sourcePages:[184,185,186]};
    state.malnutritionEpisodes??=[];state.malnutritionEpisodes.push(e);
    check(state.fatigue.otherWeakness+newWeak<=99999,'Malnutrition: překročení maximální slabosti');
    state.fatigue.otherWeakness+=newWeak;
    const round=Math.max(1,state.lastRound);
    check(!state.events.some(x=>x.id===e.id),'Malnutrition: duplicitní původ');
    state.events.push({id:e.id,type:'malnutrition-onset',round,details:{kind,sourceDayId:sourceId,minute:d.endMinute,hr}});
    const row={id:idFactory(),characterId:actor.id,calendarCampaignId:campaignId,campaignMinute:d.endMinute,
     createdAt:stamp(),title:`HMK · ${kind==='thirst'?'Thirst':'Starvation'} · HR${hr}`,
     body:`Doložený nástup ${kind} HR${hr}, slabost +${newWeak}; zdroj ${sourceId}. Čas posouvá jen GM.`,
     calendarMalnutritionMedical:{format:MALNUTRITION_FORMAT,phase:'onset',episodeId:e.id,kind,
      sourceDayId:sourceId,dueMinute:d.endMinute,hr,weakness:newWeak,sourcePages:[184,186]}};
    database.journal.push(row);newEntries.push(row);
    validateCombatState(state);
    // Once onset occurred, remain one active course until cured/dead.
   }
  }
 }
 return newEntries;
}
export function dueMalnutritionCases(database){
 const clock=database?.campaignClock;if(!clock)return [];
 const campaignId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const members=new Set(clock.characterIds??database.characters.map(c=>c.id));
 return database.characters.filter(c=>members.has(c.id)).flatMap(c=>episodes(c).filter(e=>e.campaignId===campaignId&&e.status==='active').map(e=>{
  const days=entries(database.journal,campaignId,c.id),last=days.find(x=>x.calendarNutritionDay.endMinute===e.nextDueMinute);
  const status=last?rationStatus(last.calendarNutritionDay,e.kind):'unknown';
  const mode=status==='full'?'healing':status==='unknown'?'pending':'advance';
  const recent=days.filter(x=>x.calendarNutritionDay.endMinute<=clock.minute).at(-1);
  const latestRation=recent?rationStatus(recent.calendarNutritionDay,e.kind):'unknown';
  const policies=database.journal.filter(j=>j.calendarCampaignId===campaignId&&j.characterId===c.id&&j.calendarNutritionPolicy);
  const policy=policies.at(-1)?.calendarNutritionPolicy;
  const provisionMode=policy?.gmProvisioned?'GM doložené externí zásobování':policy?.enabled===false?'sledování pozastaveno':
   policy?.inventoryRations?'fyzické a společné zásoby':policy?.foragingOnly?'výhradní Foraging':'bez aktivního režimu';
  return {characterId:c.id,actorName:c.name,episodeId:e.id,kind:e.kind,hr:e.hr,
   weakness:e.weaknessApplied,originMinute:e.originMinute,latestRation,provisionMode,
   dueMinute:e.nextDueMinute,mode,foodStatus:status,overdue:clock.minute>e.nextDueMinute};
 })).sort((a,b)=>a.dueMinute-b.dueMinute);
}
/** The GM may resolve an overdue roll at the actual current minute; the
 * attested due minute remains unchanged in history. No clock mutation. */
export function resolveMalnutritionCourse(database,{actorId,episodeId,roll,rollOrigin='manual',gmConfirmed=false,idFactory,stamp}={}){
 const clock=database?.campaignClock;check(clock&&gmConfirmed===true,'Malnutrition: chybí kampaň nebo potvrzené vyhodnocení');
 const actor=database.characters.find(c=>c.id===actorId),state=actor&&ensureState(actor);
 const e=state?.malnutritionEpisodes?.find(x=>x.id===episodeId);
 check(e?.status==='active'&&e.campaignId===(clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`),'Malnutrition: neaktivní nebo cizí epizoda');
 check(Number.isSafeInteger(roll)&&roll>=1&&roll<=100,'Malnutrition: skutečný d100 musí být 1–100');
 check(['manual','software'].includes(rollOrigin),'Malnutrition: chybí platný původ hodu');
 check(clock.minute>=e.nextDueMinute,'Malnutrition: Advance/Healing ještě není splatný');
 const attr=actor.hmk?.attributes;
 check(Number.isSafeInteger(attr?.end)&&Number.isSafeInteger(attr?.wil),'Malnutrition: chybí ověřené END/WIL');
 const due=dueMalnutritionCases(database).find(t=>t.episodeId===episodeId&&t.characterId===actorId);
 check(due&&due.foodStatus!=='unknown','Malnutrition: chybí doložená dávka pro splatný den');
 const historical=entries(database.journal,e.campaignId,actorId).find(x=>x.calendarNutritionDay.endMinute===due.dueMinute);
 check(historical,'Malnutrition: splatný den není samostatně doložen; rozdělte časové úseky GM');
 const day=historical.calendarNutritionDay,half=due.foodStatus==='half',rest=day.foodNeed===0.5;
 const hb=healingBase({endurance:attr.end,will:attr.wil});
 const eml=hb*(due.mode==='healing'?5:e.hr),sl=successLevel(roll,eml);
 const transition=due.mode==='healing'?exposureHealing({healingRate:e.hr,sl}):exposureAdvance({healingRate:e.hr,sl});
 const before=e.hr,prevShock=state.malnutritionEpisodes.filter(x=>x.status==='active').reduce((s,x)=>severity[shock(x.hr)]>severity[s]?shock(x.hr):s,'NONE');
 const nextHR=Math.max(0,Math.min(6,transition.healingRate));
 const nextWeak=weakness(nextHR),delta=nextWeak-e.weaknessApplied;
 check(state.fatigue.otherWeakness+delta>=0&&state.fatigue.otherWeakness+delta<=99999,'Malnutrition: změna slabosti by poškodila jiné zdroje');
 // Clone the health state and commit only when the entire medical outcome is valid.
 const next=structuredClone(state),t=next.malnutritionEpisodes.find(x=>x.id===episodeId);
 t.hr=nextHR;t.weaknessApplied=nextWeak;t.shockApplied=shock(nextHR);t.sequence+=1;
 t.status=nextHR===0?'dead':nextHR===6?'defeated':'active';
 const interval=due.mode==='healing'?DAY:malnutritionSchedule({kind:e.kind,halfRations:half,completeRest:rest}).advanceEveryDays*DAY;
 t.lastDueMinute=due.dueMinute;t.lastMode=due.mode;
 t.skipRecoveryBefore=due.mode==='healing'&&transition.skipNext?due.dueMinute+2*DAY:null;
 t.nextDueMinute=t.status==='active'?due.dueMinute+interval*(transition.skipNext?2:1):null;
 next.fatigue.otherWeakness+=delta;
 chooseShock(next,prevShock);
 const eventId=idFactory(),jId=idFactory(),round=Math.max(1,next.lastRound);
 next.events.push({id:eventId,type:'malnutrition-'+due.mode,round,details:{kind:e.kind,episodeId,fromHR:before,toHR:nextHR,
  roll,eml,sl:['CF','F','S','CS'][sl],dueMinute:due.dueMinute,resolvedMinute:clock.minute}});
 validateCombatState(next);actor.hmk.combatState=next;
 const proof={format:MALNUTRITION_FORMAT,phase:due.mode,episodeId,kind:e.kind,sourceDayId:e.sourceDayId,
  dueMinute:due.dueMinute,resolvedMinute:clock.minute,sourceNutritionDayId:historical.id,
  beforeHR:before,afterHR:nextHR,roll,rollOrigin,eml,hb,sl:['CF','F','S','CS'][sl],skipNext:!!transition.skipNext,
  weaknessAfter:nextWeak,nextDueMinute:t.nextDueMinute,combatEventId:eventId,sourcePages:[184,185,186]};
 database.journal.push({id:jId,characterId:actorId,calendarCampaignId:e.campaignId,campaignMinute:clock.minute,
  createdAt:stamp(),title:`HMK · ${e.kind} · ${due.mode} · HR${nextHR}`,
  body:`${due.mode} d100=${roll}, HB=${hb}, EML=${eml}, HR${before} → HR${nextHR}. Splatnost ${due.dueMinute}, vyhodnoceno ${clock.minute}.`,
  calendarMalnutritionMedical:proof});
 return {episode:structuredClone(t),proof};
}
export function validateMalnutritionEvidence(database){
 const journal=database?.journal??[];
 for(const actor of database?.characters??[]){const state=actor.hmk?.combatState;if(!state)continue;
  const existing=new Set();for(const e of state.malnutritionEpisodes??[]){
   check(e.format===MALNUTRITION_FORMAT&&kinds.includes(e.kind)&&!existing.has(e.id)&&
    Number.isSafeInteger(e.originMinute)&&e.originMinute>=0&&Number.isSafeInteger(e.sequence)&&e.sequence>=0&&
    Number.isSafeInteger(e.hr)&&e.hr>=0&&e.hr<=6&&e.weaknessApplied===weakness(e.hr)&&
    e.status===(e.hr===0?'dead':e.hr===6?'defeated':'active')&&e.shockApplied===shock(e.hr)&&
    (e.status==='active'?minute(e.nextDueMinute):e.nextDueMinute===null)&&
    state.events.some(x=>x.id===e.id&&x.type==='malnutrition-onset')&&
    journal.some(j=>j.id===e.sourceDayId&&j.characterId===actor.id&&j.calendarCampaignId===e.campaignId&&j.calendarNutritionDay),
    'Malnutrition: poškozená zdravotní epizoda');existing.add(e.id);
  }
 }
 for(const j of journal)if(j.calendarMalnutritionMedical){const p=j.calendarMalnutritionMedical;
  check(p.format===MALNUTRITION_FORMAT&&kinds.includes(p.kind)&&
   j.calendarCampaignId&&j.characterId&&minute(j.campaignMinute)&&minute(p.dueMinute)&&
   journal.some(x=>x.id===p.sourceDayId&&x.characterId===j.characterId&&x.calendarCampaignId===j.calendarCampaignId&&x.calendarNutritionDay),
   'Malnutrition: neplatná vazba na doložené denní dávky');
  const proofState=evidenceState(database,j.characterId,j.calendarCampaignId);
  const e=proofState?.malnutritionEpisodes?.find(x=>x.id===p.episodeId);
  check(e&&e.sourceDayId===p.sourceDayId&&e.campaignId===j.calendarCampaignId&&e.kind===p.kind,
   'Malnutrition: chybí pravá zdravotní epizoda');
  if(p.phase==='onset')check(p.hr===e.initialHR&&p.dueMinute===e.originMinute&&p.weakness===weakness(e.initialHR)&&
   j.campaignMinute===p.dueMinute,'Malnutrition: pozměněný doklad nástupu');
  else{
   check(['advance','healing'].includes(p.phase)&&['manual','software'].includes(p.rollOrigin)&&Number.isSafeInteger(p.roll)&&p.roll>=1&&p.roll<=100&&
    p.resolvedMinute===j.campaignMinute&&p.dueMinute<=p.resolvedMinute&&
    proofState.events.some(x=>x.id===p.combatEventId&&x.type==='malnutrition-'+p.phase&&
      x.details?.episodeId===p.episodeId&&x.details.roll===p.roll&&
      x.details.dueMinute===p.dueMinute&&x.details.resolvedMinute===p.resolvedMinute),
    'Malnutrition: pozměněný nebo chybějící zdravotní hod');
  }
 }
 return true;
}
export function assertMalnutritionMedicalAppendOnly(previous=[],next=[]){
 const ids=new Map(next.map(x=>[x.id,x]));
 for(const row of previous)if(row.calendarMalnutritionMedical)
  check(ids.has(row.id)&&JSON.stringify(ids.get(row.id))===JSON.stringify(row),
   'Starvation/Thirst: zdravotní důkazy nelze přepisovat ani mazat');
 return true;
}
