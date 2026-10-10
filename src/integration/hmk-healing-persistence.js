/** Source: HMK World of Kèthîra pp.177–182. Patient-level long-term
 * injury treatment, five-day rolls and infection. All elapsed days and dice
 * are supplied explicitly; never derived from encounter-local round numbers.
 */
import {SL,successLevel} from '../rules/tests.js';
import {treatmentContract,canPerformTreatment,resolveTreatmentTable,treatmentRollEMLFromInjury,
 healingBase,resolveInjuryHealingRoll,healingFailureIsCritical,healingStageZoneEffect,
 severityFromInjuryLevel,permanentHealingImpairment,infectionInitialHR,infectionCourseEML,
 resolveInfectionCourse,infectionWeaknessFatigue} from '../rules/healing.js';
import {validateCombatState,initialCombatState} from './persistent-combat-state.js';
const int=(x,lo=0,hi=999999)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const requireRule=(ok,message)=>{if(!ok)throw Error(message);};
const copy=x=>structuredClone(x);
const aspectKey=(w)=>{const x=String(w.aspect).toLowerCase();return {b:'blunt',e:'edge',p:'point',f:'fire'}[x]??x;};
function begin(state,{eventId,round,daySinceInjury}){
 const s=copy(state??initialCombatState());validateCombatState(s);
 requireRule(int(round,1,9999)&&round>=s.lastRound,'Neplatné pořadí kola bojové události');
 requireRule(typeof eventId==='string'&&eventId&&!s.events.some(e=>e.id===eventId),'Neplatné nebo duplicitní ID');
 requireRule(int(daySinceInjury,0,100000),'Dny od poranění musí potvrdit GM');
 requireRule(s.shock!=='KIA','Mrtvé postavě nelze provádět léčbu');
 return s;
}
function track(s,{eventId,round,type,details}){
 s.events.push({id:eventId,type,round,details});s.lastRound=round;validateCombatState(s);return s;
}
function wound(s,id){const w=s.wounds.find(x=>x.id===id);requireRule(!!w,'Rána neexistuje');requireRule(w.healed!==true,'Rána už je vyléčená');return w;}
/** Expose infection weakness through the existing Fatigue counter; exact delta is reversible. */
function setInfectionWeakness(s,w,next){const prior=w.healing?.infectionWeakness??0;
 requireRule(int(next,0,10)&&s.fatigue.otherWeakness+next-prior>=0,'Nekonzistentní infekční Weakness');
 s.fatigue.otherWeakness+=next-prior;w.healing.infectionWeakness=next;
}
export function applyConfirmedTreatment({state,round,eventId,woundId,daySinceInjury,physicianML=null,physicianIndex=null,
 physicianRoll=null,dexSecondaryModifier=0,available=[],untreated=false,area=false,broadhead=false,gmConfirmed=false}={}){
 const s=begin(state,{round,eventId,daySinceInjury});const w=wound(s,woundId);
 requireRule(gmConfirmed===true,'GM musí potvrdit podmínky léčení');
 requireRule(!s.wounds.some(x=>x.bleeding)&&!s.extendedShock,'HMK str.180: nejprve musí skončit veškeré krvácení a Extended Shock');
 requireRule(!w.healing?.infected,'Nejdříve je nutné vyřešit aktivní infekci');
 requireRule(!w.healing?.treated||!untreated,'Již ošetřená rána nemůže být zpětně označena jako neošetřená');
 const aspect=w.projectileArrowOrBolt===true||w.impaled?'projectile':aspectKey(w);
 const c=treatmentContract({aspect,injuryLevel:w.level,broadhead});
 if(!untreated){
  requireRule(Array.isArray(available),'Musí být uvedeno skutečně dostupné vybavení');
  const equipment=canPerformTreatment({treatment:c.treatment,injuryLevel:w.level,aspect,available});
  requireRule(equipment.allowed,'Chybí léčebné vybavení: '+equipment.missing.join(', '));
  requireRule(int(physicianIndex,0,20)&&int(physicianML,0,200)&&int(physicianRoll,1,100),'Chybí Physician Index / ML nebo skutečný d100');
  requireRule(int(dexSecondaryModifier,-100,100),'Neplatný DEX Secondary Modifier');
  const previous=w.healing?.treatments??[];
  requireRule(previous.length===0||physicianIndex>Math.max(...previous.map(x=>x.physicianIndex)),'Následující léčitel musí mít vyšší Physician Index');
  const eml=treatmentRollEMLFromInjury({physicianML,aspect,injuryLevel:w.level,daysSinceInjury:daySinceInjury,dexSecondaryModifier,broadhead,area});
  const sl=successLevel(physicianRoll,eml);
  const result=resolveTreatmentTable({aspect,injuryLevel:w.level,sl,physicianIndex,broadhead,area});
  if(result.result.kind==='edge-injury')throw Error('Amputation Treatment: výsledné nové Edge zranění vyžaduje samostatné vyhodnocení Injury Sequence a Shock před uložením');
  const attempt={physicianIndex,physicianML,physicianRoll,rawEML:eml,sl,slName:Object.keys(SL).find(k=>SL[k]===sl),result:result.result,day:daySinceInjury};
  const treatments=[...previous,attempt];
  const winner=treatments.find(x=>x.sl===SL.CF)??treatments.slice().sort((a,b)=>b.sl-a.sl)[0];
  const treatment=resolveTreatmentTable({aspect,injuryLevel:w.level,sl:winner.sl,physicianIndex:winner.physicianIndex,broadhead,area});
  if(treatment.result.kind==='edge-injury')throw Error('Navazující amputace vyžaduje samostatnou návaznost');
  if(treatment.result.immediateHeal){w.healed=true;w.healing={...(w.healing??{}),treated:true,treatments,healingRate:0,healedDay:daySinceInjury,permanentImpairment:0,confirmedBy: eventId};}
  else {
   const prior=w.healing??{};
   w.healing={...prior,treated:true,treatments,healingRate:treatment.result.healingRate,
    infectionPossible:!!treatment.result.infectionPossible,permanentEligible:!!treatment.result.permanentImpairmentEligible,
    cauterised:prior.cauterised??false,area,grimWound:!!treatment.grimWound,nextGrimShockDay:treatment.grimWound?Math.max(1,daySinceInjury+1):null,
    nextHealingDay:Math.floor(daySinceInjury/5)*5+5,healedDay:null};
   if(treatment.result.bleeding&&!w.bleeding){w.bleeding=true;w.nextAdvanceRound=round+60;}
  }
  track(s,{eventId,round,type:'injury-treatment',details:{woundId,daySinceInjury,physicianIndex,roll:physicianRoll,sl:attempt.slName,source:'HMK p180'}});
  return {state:s,healed:w.healed===true,treatment:w.healing};
 }
 // Untreated has the treatment properties of CF (p180), but does not entail a fictitious CF roll.
 requireRule(!w.healing?.treated,'Treatment already confirmed');
 const result=resolveTreatmentTable({aspect,injuryLevel:w.level,untreated:true,physicianIndex:0,broadhead,area});
 if(result.result.kind==='edge-injury')throw Error('Neošetřená frost amputace potřebuje samostatné potvrzení následného Edge zranění');
 w.healing={treated:true,untreated:true,treatments:[],healingRate:result.result.healingRate,
  infectionPossible:!!result.result.infectionPossible,permanentEligible:!!result.result.permanentImpairmentEligible,
  grimWound:result.grimWound,nextGrimShockDay:result.grimWound?Math.max(1,daySinceInjury+1):null,area, nextHealingDay:Math.floor(daySinceInjury/5)*5+5,
  cauterised:false,infectionWeakness:0};
 track(s,{eventId,round,type:'injury-untreated',details:{woundId,daySinceInjury,source:'HMK p180'}});
 return {state:s,healed:false,treatment:w.healing};
}
export function applyConfirmedInjuryHealing({state,round,eventId,woundId,daySinceInjury,endurance,will,roll,gmConfirmed=false}={}){
 const s=begin(state,{round,eventId,daySinceInjury});const w=wound(s,woundId),h=w.healing;
 requireRule(gmConfirmed===true&&h?.treated&&int(h.healingRate,1,6),'Rána nemá potvrzenou léčbu ani Healing Rate');
 requireRule(!s.wounds.some(x=>x.healing?.infected),'HMK str.181: jakákoli aktivní infekce přerušuje všechny Injury Healing Rolls');
 requireRule(daySinceInjury===h.nextHealingDay,'Healing Roll je splatný přesně podle pětideního intervalu: den '+h.nextHealingDay);
 requireRule(int(roll,1,100),'Povinný skutečný d100');
 const hb=healingBase({endurance,will}),rawEML=hb*h.healingRate;
 let sl=successLevel(roll,rawEML);
 if(sl===SL.F&&healingFailureIsCritical({roll,cauterised:!!h.cauterised,area:!!h.area}))sl=SL.CF;
 const result=resolveInjuryHealingRoll({injuryLevel:w.level,sl,infectionPossible:!!h.infectionPossible});
 if(result.infected){h.infected=true;h.infectionHR=infectionInitialHR(h.healingRate);h.nextInfectionDay=daySinceInjury+1;setInfectionWeakness(s,w,infectionWeaknessFatigue(h.infectionHR));}
 else if(result.injuryLevel===0){w.healed=true;h.healedDay=daySinceInjury;w.bleeding=false;w.nextAdvanceRound=null;}
 else {
  w.level=result.injuryLevel;w.severity=severityFromInjuryLevel(w.level);
  if(w.severity==='M'&&h.daysToMinor==null){h.daysToMinor=daySinceInjury;h.permanentImpairment=permanentHealingImpairment({daysToMinor:daySinceInjury,eligible:!!h.permanentEligible});}
 }
 if(!w.healed&&!result.infected)h.nextHealingDay=daySinceInjury+5;
 track(s,{eventId,round,type:'injury-healing-roll',details:{woundId,daySinceInjury,hb,hr:h.healingRate,rawEML,roll,sl:Object.keys(SL).find(k=>SL[k]===sl),after:w.healed?'healed':w.severity+w.level,infected:!!result.infected}});
 return {state:s,healed:!!w.healed,infected:!!h.infected,result};
}
export function applyConfirmedInfectionCourse({state,round,eventId,woundId,daySinceInjury,endurance,will,roll,physicianSV=0,gmConfirmed=false}={}){
 const s=begin(state,{round,eventId,daySinceInjury});const w=wound(s,woundId),h=w.healing;
 requireRule(gmConfirmed===true&&h?.infected,'Neexistuje aktivní infekce této rány');
 requireRule(daySinceInjury===h.nextInfectionDay,'Infection Course je splatný v den '+h.nextInfectionDay);
 requireRule(int(roll,1,100)&&int(physicianSV,-20,30),'Neplatný Infection Roll nebo Physician SV');
 const hb=healingBase({endurance,will}),rawEML=infectionCourseEML({healingBase:hb,infectionHR:h.infectionHR,physicianSV});
 const sl=successLevel(roll,rawEML),result=resolveInfectionCourse({hr:h.infectionHR,sl});
 h.infectionHR=result.hr;
 if(result.dead){s.shock='KIA';s.shockFollowup=null;s.extendedShock=null;s.coma=null;for(const x of s.wounds)x.nextAdvanceRound=null;}
 if(result.defeated){h.infected=false;h.nextInfectionDay=null;h.nextHealingDay=daySinceInjury+5;setInfectionWeakness(s,w,0);}
 else if(result.active){h.nextInfectionDay=daySinceInjury+1;setInfectionWeakness(s,w,result.weaknessFatigue);}
 track(s,{eventId,round,type:'infection-course',details:{woundId,daySinceInjury,hb,rawEML,roll,sl:Object.keys(SL).find(k=>SL[k]===sl),afterHR:result.hr,dead:result.dead,defeated:result.defeated}});
 return {state:s,result};
}
/** HMK p181: every ten days after actual BP loss; ignore only weakness CAUSED by anaemia. */
export function applyConfirmedBloodLossHealing({state,round,eventId,daySinceBloodLoss,endurance,roll,gmConfirmed=false}={}){
 const s=copy(state??initialCombatState());validateCombatState(s);
 requireRule(gmConfirmed===true&&s.shock!=='KIA','GM musí potvrdit skutečné desetidenní léčení Blood Loss');
 requireRule(int(round,1,9999)&&round>=s.lastRound&&typeof eventId==='string'&&eventId&&!s.events.some(e=>e.id===eventId),'Neplatné ID/kolo');
 requireRule(int(daySinceBloodLoss,0,100000)&&int(endurance,1,40)&&int(roll,1,100),'Povinný den, END a skutečný d100');
 requireRule(s.bloodLoss.bp>0,'Postava nemá BP k obnovení');
 const due=s.bloodLoss.healingNextDay??10;
 requireRule(daySinceBloodLoss===due,'Blood Loss Healing Roll je splatný den '+due);
 const otherFatigue=s.fatigue.windedness+s.fatigue.weariness+s.fatigue.otherWeakness;
 const eml=endurance-otherFatigue,sl=successLevel(roll,eml);
 const prior=s.bloodLoss.bp;
 s.bloodLoss.bp=Math.max(0,prior-(sl===SL.CS?2:sl===SL.S?1:0));
 s.bloodLoss.weaknessFatigue=s.bloodLoss.bp*5;
 s.bloodLoss.healingNextDay=s.bloodLoss.bp===0?null:daySinceBloodLoss+(sl===SL.CF?20:10);
 track(s,{eventId,round,type:'blood-loss-healing',details:{daySinceBloodLoss,roll,endurance,otherFatigue,eml,sl:Object.keys(SL).find(k=>SL[k]===sl),bpBefore:prior,bpAfter:s.bloodLoss.bp,nextDay:s.bloodLoss.healingNextDay}});
 return {state:s,bpBefore:prior,bpAfter:s.bloodLoss.bp,nextHealingDay:s.bloodLoss.healingNextDay};
}
/** Grim G/CF wound: daily Location Shock Roll until no longer G or CF-treated (p180). */
export function applyConfirmedGrimWoundShock({state,round,eventId,woundId,daySinceInjury,locationShock,shockML,roll,gmConfirmed=false}={}){
 const s=begin(state,{round,eventId,daySinceInjury});const w=wound(s,woundId);
 requireRule(gmConfirmed===true&&w.severity==='G'&&w.healing?.grimWound===true,'Rána není aktivní Grim Wound (G/CF-treatment)');
 const due=w.healing.nextGrimShockDay??Math.max(1,(w.healing.treatments?.at(-1)?.day??0)+1);
 requireRule(daySinceInjury===due,'Denní Grim Wound Shock je splatný den '+due);
 requireRule(int(locationShock,0,10)&&int(shockML,0,200)&&int(roll,1,100),'Je nutný skutečný Location Shock, EML a d100');
 const sl=successLevel(roll,shockML),modifier=sl===SL.CF?2:sl===SL.F?1:sl===SL.S?0:-1;
 const index=locationShock+modifier;
 const incoming=index>=10?'KIA':index===9?'UNC':index===8?'INC':index===7?'STN':'NONE';
 const rank={NONE:0,STN:1,INC:2,UNC:3,KIA:4};
 if(s.shock===incoming&&s.shock==='STN')s.shock='INC';
 else if(s.shock===incoming&&s.shock==='INC')s.shock='UNC';
 else if(rank[incoming]>rank[s.shock])s.shock=incoming;
 if(s.shock==='KIA'){s.extendedShock=null;s.coma=null;s.shockFollowup=null;for(const x of s.wounds)x.nextAdvanceRound=null;}
 else if(s.shock!=='NONE'){
  if(['INC','UNC'].includes(s.shock))s.posture.prone=true;
  s.shockFollowup={kind:s.shock,originRound:round,dueRound:round+(s.shock==='UNC'?120:1),phase:s.shock==='UNC'?'after-ten-minutes':'end-next-turn',timelineId:s.encounterTimelineId??null};
 }
 w.healing.nextGrimShockDay=daySinceInjury+1;
 track(s,{eventId,round,type:'grim-wound-shock',details:{woundId,daySinceInjury,locationShock,shockML,roll,sl:Object.keys(SL).find(k=>SL[k]===sl),index,newShock:s.shock}});
 return {state:s,shock:s.shock,index};
}
