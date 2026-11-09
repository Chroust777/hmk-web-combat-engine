/** HMK v1.2 p.178 – calendar-minute Blood Stoppage for confirmed Travel
 * injuries. Shares the ORIGINAL bleeding, Shock and fatigue rules but does
 * not invent combat rounds, open an encounter, or reuse its combat forms.
 * A committed five-minute preparation is necessary for a Stoppage roll.
 */
import {SL,successLevel} from '../rules/tests.js';
import {bloodStoppageResult,bloodLossAdvanceTransition,multipleBleederStaunchModifier} from '../rules/bleeding.js';
import {SHOCK_STATE,resolveShockReroll,resolveStunnedRecovery} from '../rules/shock.js';
import {combatFatigueTotals,validateCombatState,initialCombatState} from './persistent-combat-state.js';
import {medicalOriginOfWound,MEDICAL_ORIGIN,isNoncombatMedicalOrigin} from './hmk-medical-origin.js';
import {weatherPhysicianCandidates} from './hmk-weather-healer.js';
import {herbPotionEffectAt} from './hmk-herbal-administration.js';
const check=(ok,message)=>{if(!ok)throw Error(message)};
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const limb=new Set(['sh','shoulder','ua','upper arm','el','elbow','fo','forearm','ha','hand',
 'th','thigh','kn','knee','ca','calf','ft','foot']);
const folkNames=new Set(['human','ænarin','aenarin','kúzhai','kuzhai','malákta','malakta',
 'nâdi','nadi','sinái','sinai','sidhé','sidhe']);
const shockName=x=>Object.keys(SHOCK_STATE).find(k=>SHOCK_STATE[k]===x);
const slName=x=>Object.keys(SL).find(k=>SL[k]===x);
const campaignId=clock=>clock?.campaignId||`legacy:${clock?.events?.[0]?.id||''}`;
function sourceAnchor(clock,actorId,woundId){
 return (clock?.anchors||[]).find(a=>a.kind==='wound'&&a.characterId===actorId&&a.woundId===woundId)||null;
}
function sourceWound(state,woundId){
 validateCombatState(state);
 const w=state.wounds.find(x=>x.id===woundId&&x.bleeding===true&&!x.healed);
 check(!!w,'Vybraná rána není aktivní Bleeder');
 check(isNoncombatMedicalOrigin(medicalOriginOfWound(w,state.events)),
  'Krvácení nevzniklo v Cestování; bojové krvácení spravuje původní Combat');
 return w;
}
export function travelBleedingTerm({clock,actorId,wound,state}={}){
 check(clock&&integer(clock.minute,0,1e9),'Chybí skutečný kalendářní čas');
 check(wound?.id&&actorId,'Chybí totožnost pacienta nebo rány');
 check(isNoncombatMedicalOrigin(medicalOriginOfWound(wound,state?.events||[])),
  'Rána nemá doložený cestovní nebo povětrnostní původ');
 const anchor=sourceAnchor(clock,actorId,wound.id);
 check(anchor?.source==='confirmed-health'&&anchor.combatEventId===wound.originEventId,
  'Pětiminutový Bleeder musí mít automatickou kotvu původní potvrzené zdravotní události');
 check(anchor&&integer(anchor.minute,0,1e9)&&anchor.minute<=clock.minute,
  'Cestovní Bleeder nemá původní doloženou minutu vzniku');
 const prior=wound.travelBlood;
 if(prior){
  check(prior.campaignId===campaignId(clock)&&integer(prior.nextDueMinute,anchor.minute+5,1e9)&&
    prior.nextDueMinute>=anchor.minute+5&&(prior.nextDueMinute-anchor.minute)%5===0,
   'Blood Stoppage: nekonzistentní časový plán nebo cizí kampaň');
  if(prior.plan)check(integer(prior.plan.startMinute,anchor.minute,1e9)&&
    prior.plan.dueMinute===prior.nextDueMinute&&prior.plan.startMinute+5===prior.plan.dueMinute,
   'Doba skutečného ošetření není přesně 5 minut');
 }
 return {anchorMinute:anchor.minute,dueMinute:prior?.nextDueMinute??anchor.minute+5,
  plan:prior?.plan??null,periodMinutes:5};
}
function availableHealer({patient,wound,healer,party}){
 check(healer?.id,'Léčitel nebyl vybrán');
 const candidate=weatherPhysicianCandidates({patient,wound,party}).find(x=>x.id===healer.id);
 check(candidate,'Léčitel musí být živá a způsobilá postava aktuální kampaně s Physician ML');
 return candidate;
}
function bloodML(patient){
 const h=patient?.hmk||{};
 const isFolk=typeof h.isFolk==='boolean'?h.isFolk:
  folkNames.has(String(h.folk||'').trim().toLowerCase())?true:null;
 check(typeof isFolk==='boolean','Blood Loss: není doloženo, zda je pacient Folk');
 if(!isFolk)return 50;
 check(integer(h.attributes?.str,1,40),'Blood Loss: chybí skutečný Strength pacienta');
 return h.attributes.str*5;
}
function ensureNoIgnoredCoagulant(journal,camp,minute,patientId,woundId){
 // A combat-anchored Coagulant cannot silently be assumed to use Calendar
 // minutes. Refuse the roll rather than discard a genuinely active bonus.
 for(const row of journal||[]){
  const a=row.calendarHerbPotionAdminister;
  if(row.calendarCampaignId!==camp||a?.herbType!=='coagulant'||a.targetId!==patientId||
    a.woundId!==woundId||row.campaignMinute>minute)continue;
  const effect=herbPotionEffectAt(a,minute);
  if(effect.status==='active')throw Error('Aktivní Coagulant: chybí ověřený převod jeho bojové časové osy na minuty Cestování; Blood Loss nelze vyhodnotit s odhadnutým bonusem.');
 }
}
function note(s,eventId,type,minute,details){
 check(typeof eventId==='string'&&eventId&&!s.events.some(e=>e.id===eventId),
  'Duplicitní zdravotní událost');
 const sourceWound=s.wounds.find(w=>w.id===(details.woundId??details.sourceId));
 const origin=medicalOriginOfWound(sourceWound,s.events);
 check(isNoncombatMedicalOrigin(origin),'Zdravotní doklad musí zachovat ověřený původ cestovní rány');
 s.events.push({id:eventId,type,round:s.lastRound,details:{...details,
  domain:origin,campaignMinute:minute,sourcePage:178}});
 validateCombatState(s);
}
/** Start treatment at the onset of one five-minute interval, not afterwards. */
export function beginTravelBloodStoppage({clock,state,patient,healer,party=[],woundId,
 method,hasBandage=false,hasWater=false,hasNeedleThread=false,hasHeatedTool=false,
 tourniquet=false,eventId,gmConfirmed=false}={}){
 check(gmConfirmed===true,'GM musí potvrdit skutečné zahájení léčby');
 check(state&&patient?.id&&healer?.id,'Chybí léčitel nebo zdravotní stav');
 const w=sourceWound(state,woundId),term=travelBleedingTerm({clock,actorId:patient.id,wound:w,state});
 check(term.dueMinute-clock.minute===5,
  'Pětiminutové ošetření musí začít na počátku doloženého intervalu (nelze jej zpětně předstírat)');
 check(!term.plan,'Tato rána už má rozpracovaný Blood Stoppage');
 check(['sta','cau'].includes(method),'Dovoleno pouze Staunch nebo Cauterisation');
 if(method==='sta'){
  check(hasBandage===true&&hasWater===true,'Staunch včetně Clean & Dress vyžaduje obvaz a vodu');
  if(w.severity==='S'&&['e','edge','p','point'].includes(String(w.aspect).toLowerCase()))
   check(hasNeedleThread===true,'Serious Edge/Point vyžaduje jehlu a nit');
  check(!tourniquet||limb.has(String(w.location).toLowerCase()),
   'Turniket (+20) lze použít jen na končetině');
 }else check(hasHeatedTool===true&&!tourniquet,
  'Cauterisation vyžaduje rozžhavený kovový nástroj (bez turniketu)');
 const h=availableHealer({patient,wound:w,healer,party});
 const s=structuredClone(state),target=s.wounds.find(x=>x.id===woundId);
 target.travelBlood={campaignId:campaignId(clock),nextDueMinute:term.dueMinute,
  plan:{startMinute:clock.minute,dueMinute:term.dueMinute,healerId:h.id,
   method,hasBandage,hasWater,hasNeedleThread,hasHeatedTool,tourniquet}};
 note(s,eventId,'travel-blood-stoppage-start',clock.minute,{woundId,healerId:h.id,
  startMinute:clock.minute,dueMinute:term.dueMinute,method,campaignId:campaignId(clock)});
 return {state:s,dueMinute:term.dueMinute};
}
/** At the exact deadline resolve either the attested 5-minute treatment or
 * an untreated five-minute Blood Loss. Physical d100 are NEVER generated. */
export function completeTravelBleedingInterval({clock,state,patient,healer=null,party=[],
 woundId,mode,physicianRoll=null,strengthRoll=null,journal=[],eventId,gmConfirmed=false}={}){
 check(gmConfirmed===true,'GM musí potvrdit skutečné hody v termínu');
 check(patient?.id&&clock,'Chybí pacient nebo Kalendář');
 const w=sourceWound(state,woundId),term=travelBleedingTerm({clock,actorId:patient.id,wound:w,state});
 check(clock.minute===term.dueMinute,
  'Blood Loss / Blood Stoppage lze vyhodnotit jen v přesné splatné minutě');
 check(['stoppage','loss'].includes(mode),'Neplatná zdravotní akce');
 check((mode==='stoppage')===!!term.plan,
  'Blood Stoppage vyžaduje předem potvrzené pětiminutové ošetření; bez něj se provede pouze Blood Loss');
 check(integer(strengthRoll,1,100)||strengthRoll===null,
  'Blood Loss d100 musí být skutečný hod, nikoli automatický údaj');
 const s=structuredClone(state),target=s.wounds.find(x=>x.id===woundId);
 let stop=null,physicianSL=null,eml=null,healerId=null;
 if(mode==='stoppage'){
  const plan=term.plan;
  check(healer?.id===plan.healerId,'Léčitel se od zahájení změnil');
  const h=availableHealer({patient,wound:w,healer,party});
  // Actual, immutable treatment-start receipts across ALL campaign members;
  // not a manually entered approximation and not just this patient's sheet.
  const claims=new Set();
  for(const actor of party){
   const medical=actor.id===patient.id?s:actor.hmk?.healthState;
   for(const e of medical?.events??[]){
    if(e.type!=='travel-blood-stoppage-start'||e.details?.healerId!==h.id||
      e.details?.dueMinute!==clock.minute||e.details?.campaignId!==campaignId(clock))continue;
    claims.add(actor.id+'::'+e.details.woundId);
   }
  }
  const simultaneous=claims.size;
  check(simultaneous>=1&&simultaneous<=100&&claims.has(patient.id+'::'+woundId),
   'Souběžné ošetření musí mít skutečné potvrzené začátky pro celou kampaň');
  check(integer(physicianRoll,1,100),'Chybí skutečný Physician d100');
  const fatigue=combatFatigueTotals(healer.hmk?.healthState??initialCombatState()).total;
  const bonus=plan.method==='cau'?30:plan.tourniquet?20:0;
  const repeat=plan.method==='sta'?(w.staunchBonus??0):0;
  check(integer(repeat,0,10),'Neplatný Staunch bonus');
  eml=h.ml-fatigue+bonus+repeat+multipleBleederStaunchModifier(simultaneous);
  physicianSL=slName(successLevel(physicianRoll,eml));
  stop=bloodStoppageResult(SL[physicianSL]);healerId=h.id;
 }else check(physicianRoll===null,'Bez Treatment nesmí vzniknout fiktivní Physician Roll');
 const requiresLoss=!stop||stop.advanceRoll;
 check(requiresLoss===integer(strengthRoll,1,100),
  'Po CF/F/S (nebo bez ošetření) je nutný právě jeden Blood Loss d100; po CS žádný');
 let bloodSL=null,gainedBP=0;
 if(requiresLoss){
  ensureNoIgnoredCoagulant(journal,campaignId(clock),clock.minute,patient.id,woundId);
  bloodSL=slName(successLevel(strengthRoll,bloodML(patient)));
  const result=bloodLossAdvanceTransition({bloodLoss:s.bloodLoss,sl:SL[bloodSL],
   currentShockState:SHOCK_STATE[s.shock]});
  const old=s.shock;
  s.bloodLoss=result.bloodLoss;s.shock=shockName(result.shockState);gainedBP=result.gainedBP;
  // HMK 178 (Bleeding example) -> 179 (Extended Shock): blood loss can
  // elevate an existing Extended Shock INC to UNC. Preserve its *original*
  // HR and elapsed four-hour course; only its current Shock State changes.
  // Never create a second Extended Shock or synthetic reroll.
  if(s.extendedShock&&s.shock!==old&&s.shock!=='KIA')
   s.extendedShock.originState=s.shock;
  if(['INC','UNC'].includes(s.shock))s.posture.prone=true;
  if(gainedBP>0&&s.shock!=='KIA')s.bloodShockPending=true;
  if(s.shock==='KIA'){
   s.extendedShock=null;s.coma=null;s.shockFollowup=null;s.bloodShockPending=false;
   for(const z of s.wounds)z.nextAdvanceRound=null;
  }else if(s.shock!==old){
   // Do not retain a now-invalid old Shock kind; the cumulative Blood Loss
   // Shock is resolved only after all bleeders stop (HMK p.178).
   s.shockFollowup=null;
   s.shockOriginRound=s.lastRound;
  }
 }
 // HMK 178, 181: the wider Healing CF faces apply only when a Bleeder
 // was STOPPED by Cauterisation, not merely exposed to a failed attempt.
 if(term.plan?.method==='cau'&&stop?.stopped){
  target.cauterised=true;
  if(target.healing)target.healing.cauterised=true;
 }
 const stopped=!!stop?.stopped||s.shock==='KIA';
 if(stopped){target.bleeding=false;target.nextAdvanceRound=null;target.staunchBonus=0;}
 else target.staunchBonus=stop?.nextStaunchBonus??0;
 target.travelBlood={campaignId:campaignId(clock),nextDueMinute:clock.minute+5,plan:null};
 if(stopped&&s.bloodShockPending&&s.shock!=='KIA'&&!s.wounds.some(x=>x.bleeding)){
  s.bloodShockPending=false;
  // Existing Extended Shock already owns recovery per HMK 179. The printed
  // Bleeding example continues as Extended Shock (UNC), not a new reroll.
  if(s.extendedShock){/* keep Course HR/elapsed hours and no followup */}
  else if(s.shock==='STN'){s.shock='NONE';s.shockFollowup=null;s.shockOriginRound=s.lastRound;}
  else if(['INC','UNC'].includes(s.shock))s.shockFollowup={kind:s.shock,
   domain:medicalOriginOfWound(target,s.events),sourceId:woundId,originMinute:clock.minute,
   originRound:s.lastRound,dueRound:s.lastRound,phase:'after-all-bleeding-stopped',timelineId:null,woundId};
 }
 note(s,eventId,mode==='stoppage'?'travel-blood-stoppage':'travel-blood-loss',clock.minute,
  {woundId,healerId,method:term.plan?.method??null,physicianRoll,
   physicianSL,physicianEML:eml,strengthRoll,bloodSL,gainedBP,totalBP:s.bloodLoss.bp,
   shock:s.shock,stopped,periodStartMinute:term.dueMinute-5,
   periodEndMinute:term.dueMinute,nextDueMinute:stopped?null:clock.minute+5});
 return {state:s,stopped,dead:s.shock==='KIA',gainedBP,bp:s.bloodLoss.bp,
  shock:s.shock,physicianSL,bloodSL,nextDueMinute:stopped?null:clock.minute+5};
}

/** The immediate reroll after ALL bleeders stop is NOT the ten-minute UNC
 * follow-up. Reuse the printed Shock outcome table, while owning its
 * calendar-minute witness strictly in the Travel medical branch. */
export function completeTravelBloodShockReroll({clock,state,actorId,sourceId,shockML,roll,
 comaLocationShock=null,comaInjuryLevel=null,initialComaD10=null,eventId,gmConfirmed=false}={}){
 check(gmConfirmed===true,'Shock Reroll musí potvrdit GM');
 validateCombatState(state);
 const q=state.shockFollowup;
 check(isNoncombatMedicalOrigin(q?.domain)&&q.phase==='after-all-bleeding-stopped'&&
  q.sourceId===sourceId&&integer(q.originMinute,0,1e9)&&clock?.minute===q.originMinute,
  'Okamžitý Blood Shock Reroll není splatný nebo má cizí původ');
 check(['STN','INC','UNC'].includes(state.shock)&&state.shock===q.kind&&
  state.shock!=='KIA'&&!state.extendedShock&&!state.wounds.some(w=>w.bleeding),
  'Blood Shock Reroll je možný teprve po zastavení všech Bleederů');
 check(integer(shockML,1,200)&&integer(roll,1,100),'Vyžaduje skutečné Shock ML a d100');
 const fatigue=combatFatigueTotals(state).total;
 const eml=shockML-fatigue-(state.shock==='STN'?0:20);
 const sl=successLevel(roll,eml),before=state.shock;
 const s=structuredClone(state);
 if(before==='STN'){
  s.shock=shockName(resolveStunnedRecovery(sl));
 }else{
  if(before==='UNC'&&sl===SL.CF){
   check(integer(comaLocationShock,0,15)&&integer(comaInjuryLevel,1,5)&&
    integer(initialComaD10,1,10)&&12-comaLocationShock-comaInjuryLevel>0,
    'UNC+CF vyžaduje doloženou lokaci, Injury Level a skutečný Coma d10');
  }
  const result=resolveShockReroll({state:SHOCK_STATE[before],sl,
   locationShock:comaLocationShock,injuryLevel:comaInjuryLevel});
  s.shock=shockName(result.state);
  if(['INC','UNC'].includes(s.shock))s.posture.prone=true;
  if(result.extendedShock){
   s.extendedShock={originState:before,hr:result.extendedShock.hr,elapsedHours:0,
    domain:q.domain,sourceId};
   if(result.coma)s.coma={active:true,hr:result.coma.initialHR,elapsedDays:0,
    nextCourseDays:initialComaD10,domain:q.domain,sourceId};
  }
 }
 s.shockFollowup=s.shock==='STN'?{kind:'STN',originRound:s.lastRound,
  dueRound:s.lastRound+1,phase:'end-next-turn',timelineId:null,domain:q.domain,
  sourceId,originMinute:clock.minute}:null;
 if(s.shock!==before)s.shockOriginRound=s.lastRound;
 note(s,eventId,'shock-recovery',clock.minute,{sourceId,phase:q.phase,before,
  after:s.shock,shockML,eml,roll,sl:slName(sl),fatigue,
  extendedShockHR:s.extendedShock?.hr??null,comaHR:s.coma?.hr??null,
  comaLocationShock:before==='UNC'&&sl===SL.CF?comaLocationShock:null,
  comaInjuryLevel:before==='UNC'&&sl===SL.CF?comaInjuryLevel:null,
  initialComaD10:before==='UNC'&&sl===SL.CF?initialComaD10:null});
 return {state:s,sl:slName(sl),eml};
}
