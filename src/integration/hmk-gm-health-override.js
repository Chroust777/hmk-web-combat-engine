/** Emergency GM adjudication of a *real* physical wound, separate from combat.
 * No dice are created. The original event and every healed wound are retained.
 * Injury levels and untreated Healing Rate are calculated by the HMK engine.
 */
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
import {severityFromInjuryLevel} from '../rules/healing.js';
import {applyConfirmedTreatment} from './hmk-healing-persistence.js';
import {MEDICAL_ORIGIN} from './hmk-medical-origin.js';
import {concurrentShockSources,projectConcurrentShock} from './hmk-concurrent-shock-projection.js';

export const GM_HEALTH_LOCATIONS=Object.freeze(['sk','fa','nk','sh','ua','el','fo','ha','tx','ab','pv','th','kn','ca','ft']);
const ASPECTS=new Set(['blunt','edge','point','fire']);
const assert=(condition,message)=>{if(!condition)throw Error(message);};
/** Read patient-wide consequences without requiring the GM to split a joint
 * medical state manually. A missing legacy link is never attributed to an
 * *independent* wound merely because one particular wound was removed.
 */
export function gmWoundConsequenceAssessment(state,woundId){
 validateCombatState(state);
 assert(typeof woundId==='string'&&state.wounds.some(w=>w.id===woundId&&!w.healed),
  'Pro původ následků zvolte aktivní ID rány');
 const otherActive=state.wounds.filter(w=>!w.healed&&w.id!==woundId);
 const shockActive=state.shock!=='NONE'||!!state.shockFollowup||!!state.extendedShock||
  !!state.coma?.active; 
 const owners=(state.shockFollowup?[state.shockFollowup.woundId]:
  state.extendedShock||state.coma?[state.extendedShock?.woundId,state.coma?.woundId]:
  [state.shockOriginWoundId]).filter(Boolean);
 const distinct=[...new Set(owners)];
 const outsideSources=concurrentShockSources(state).filter(x=>x.shock!=='NONE');
 let shock=shockActive?'unverified':'none';
 if(shockActive&&distinct.length===1&&distinct[0]===woundId&&!outsideSources.length){
  // The strongest Shock may have accumulated from earlier hits. If other wounds
  // are present the GM must confirm which injuries still sustain that state.
  shock=otherActive.length?'shared-or-uncertain':'owned';
 }else if(shockActive&&distinct.length===1&&distinct[0]!==woundId){shock='independent';}
 else if(shockActive&&distinct.length>1){shock='shared-or-uncertain';}
 if(shockActive&&state.shock==='KIA')shock='fatal-requires-review';
 const bp=state.bloodLoss?.bp??0;
 // BP increments are already recorded against a concrete wound ID. Account
 // for earlier GM closures so historical BP are not counted twice.
 const credits=new Map();let unknownBP=0;
 for(const e of state.events){
  const d=e.details||{};
  if(e.type==='gm-health-wound-resolve'){
   const spent=d.globalConsequences?.bloodPointsAttributed||0;
   if(d.woundId&&spent)credits.set(d.woundId,Math.max(0,(credits.get(d.woundId)||0)-spent));
   continue;
  }
  if(!['blood-loss-advance','blood-stoppage','travel-blood-loss','travel-blood-stoppage'].includes(e.type))continue;
  const gained=Number(d.gainedBP)||0;
  if(!Number.isSafeInteger(gained)||gained<=0)continue;
  if(typeof d.woundId==='string'&&d.woundId){credits.set(d.woundId,(credits.get(d.woundId)||0)+gained);}
  else unknownBP+=gained;
 }
 const bloodOwners=[...credits].filter(([,n])=>n>0).map(([id])=>id);
 let blood=bp>0?'unverified':'none';
 if(bp>0&&bloodOwners.length===1&&unknownBP===0)blood=bloodOwners[0]===woundId?'owned':'independent';
 else if(bp>0&&(bloodOwners.length>1||unknownBP))blood='shared-or-uncertain';
 const targetBP=credits.get(woundId)||0;
 // A no-evidence legacy BP balance can only be uniquely attributed if
 // there is no OTHER still-active wound or foreign BP provenance.
 const bloodPointsToRemove=bp===0?0:targetBP>0?Math.min(bp,targetBP):
  !bloodOwners.length&&!otherActive.length?bp:0;
 const rootOwner=state.shockOriginWoundId||null;
 const foreignGlobalOwners=[state.shockFollowup?.woundId,state.extendedShock?.woundId,state.coma?.woundId]
  .filter(id=>id&&id!==woundId);
 const legacySoleSource=otherActive.length===0&&!outsideSources.length&&!foreignGlobalOwners.length;
 const shockRootToRemove=shockActive&&(rootOwner===woundId||
  !rootOwner&&distinct.includes(woundId)||!rootOwner&&legacySoleSource||
  !rootOwner&&state.bloodShockPending===true&&bp>0&&bloodPointsToRemove===bp&&
   bloodOwners.every(id=>id===woundId))&&!foreignGlobalOwners.length;
 return {shockActive,shock,shockOwners:distinct,otherActiveWoundIds:otherActive.map(w=>w.id),
  concurrentShockSourceIds:outsideSources.map(x=>x.id),bloodPoints:bp,blood,
  bloodOwners,hasBloodShock:state.bloodShockPending===true,
  autoPlan:{shockRootToRemove,legacySoleSource,bloodPointsToRemove,
   targetBPRecorded:targetBP,unknownBP,otherBPRecorded:bloodOwners.filter(id=>id!==woundId),
   reason:shockRootToRemove?'původ cílové rány nebo jediný aktivní zdroj':'jiný či neprokázaný zdroj zůstává'}};
}

export function prepareGMHealthOverride({state,action,eventId,reason,gmConfirmed,location,
 side=null,level=1,aspect='blunt',woundId,daySinceInjury=null,otherWoundDays={},initialCare='untreated',
}={}){
 const s=structuredClone(state??initialCombatState());validateCombatState(s);
 assert(gmConfirmed===true&&typeof reason==='string'&&reason.trim().length>=10&&reason.length<=500,
  'Zdravotní zásah vyžaduje potvrzení GM a důvod (10–500 znaků)');
 assert(typeof eventId==='string'&&eventId.length>=8&&!s.events.some(e=>e.id===eventId),
  'Chybí jedinečný identifikátor zdravotního zásahu');
 assert(['add','resolve'].includes(action)&&s.shock!=='KIA',
  'Tento GM zásah není pro vybraný stav postavy povolen');
 const round=Math.max(1,s.lastRound);
 if(action==='add'){
  assert(GM_HEALTH_LOCATIONS.includes(location)&&[null,'left','right'].includes(side)&&
   Number.isSafeInteger(level)&&level>=1&&level<=5&&ASPECTS.has(aspect),
   'Vyberte pravidlovou anatomickou lokaci, stranu, úroveň a typ poranění');
  assert(!s.wounds.some(w=>w.bleeding&&!w.healed)&&!s.extendedShock,
   'Novou neošetřenou ránu nelze vložit během aktivního krvácení nebo Extended Shock; nejprve vyřešte existující naléhavý stav');
  assert(['pending','untreated'].includes(initialCare),'Chybí rozhodnutí o počátečním stavu ošetření');
  const newWoundId='wound:'+eventId;
  s.wounds.push({id:newWoundId,location,side,severity:severityFromInjuryLevel(level),level,
   aspect,bleeding:false,nextAdvanceRound:null,recordedRound:round,originEventId:eventId,
   originDomain:MEDICAL_ORIGIN.GM,bodyKind:'human',healed:false});
  s.events.push({id:eventId,type:'gm-health-wound-create',round,
   details:{woundId:newWoundId,location,side,level,aspect,reason:reason.trim(),rule:'HMK 177–181',
    actualRoll:null,gmOverride:true,initialCare}});
  s.lastRound=round;
  if(initialCare==='pending'){validateCombatState(s);return {state:s,action,woundId:newWoundId};}
  // Explicit GM choice: this wound is left untreated NOW. It receives CF
  // table characteristics without inventing a d100 or a Physician test.
  const r=applyConfirmedTreatment({state:s,round,eventId:eventId+':untreated',woundId:newWoundId,
   daySinceInjury:0,untreated:true,gmConfirmed:true});
  validateCombatState(r.state);
  return {state:r.state,action,woundId:newWoundId};
 }
 assert(typeof woundId==='string'&&s.wounds.some(w=>w.id===woundId&&!w.healed),
  'Vyberte existující nezhojenou ránu');
 const impact=gmWoundConsequenceAssessment(s,woundId);
 // No additional GM input. The closure is a single decision, with a
 // deterministic provenance-based removal plan and an immutable receipt.
 const attributedBP=impact.autoPlan.bloodPointsToRemove;
 const selectedShock=impact.autoPlan.shockRootToRemove?'clear':'retain';
 const w=s.wounds.find(w=>w.id===woundId),h=w.healing||{};
 assert(daySinceInjury===null||(Number.isSafeInteger(daySinceInjury)&&daySinceInjury>=0&&daySinceInjury<=100000),
  'Nelze dosadit nedoložený počet dní');
 const priorBleeding=!!w.bleeding;
 // Unlike ordinary HMK healing, explicit GM *removal* of a wound rescinds
 // all of that wound's lasting physical consequences. Original values stay
 // in the immutable event receipt, not in active mechanical projections.
 const priorPermanentEffects={healingImpairment:h.permanentImpairment??0,
  rootImpairment:w.permanentImpairment??0,
  amputation:w.amputation?structuredClone(w.amputation):null,
  impaled:w.impaled===true,projectileArrowOrBolt:w.projectileArrowOrBolt===true};
 const outstandingMishaps=(s.mishaps??[]).filter(m=>m.woundId===woundId&&!m.resolved);
 const pendingMorale=w.moralePending===true;
 const infectionWeakness=Number(h.infectionWeakness)||0;
 assert(Number.isSafeInteger(infectionWeakness)&&infectionWeakness>=0&&
  s.fatigue.otherWeakness>=infectionWeakness,'Infekce má nekonzistentní Weakness');
 s.fatigue.otherWeakness-=infectionWeakness;
 // Unresolved Mishap/Morale obligations belong to this precise wound.
 // An administrative GM closure cancels the outstanding action, not its history
 // and not by fabricating a dice roll.
 for(const m of outstandingMishaps)m.resolved=true;
 // Once the LAST active Infection disappears, other wounds' healing timers
 // cannot resume from their stale pre-infection dates. Their elapsed days
 // must come from individual, confirmed campaign wound anchors.
 const resumedOtherWounds=[];
 if(h.infected&&!s.wounds.some(x=>x.id!==woundId&&!x.healed&&x.healing?.infected)){
  for(const other of s.wounds){
   if(other.id===woundId||other.healed||!other.healing?.treated||other.healing.noMundaneHealing)continue;
   const elapsed=otherWoundDays?.[other.id];
   assert(Number.isSafeInteger(elapsed)&&elapsed>=0&&elapsed<=100000,
    'Infekce zastavila Healing dalších ran: nejprve doložte aktuální věk každé rány z kalendáře ('+other.id+')');
   const prior=s.events.filter(e=>e.details?.woundId===other.id&&Number.isSafeInteger(e.details?.daySinceInjury))
    .map(e=>e.details.daySinceInjury);
   assert(!prior.length||elapsed>=Math.max(...prior),'Následný Healing nesmí předcházet již doloženým kontrolám rány '+other.id);
   other.healing.nextHealingDay=elapsed+5;
   resumedOtherWounds.push({woundId:other.id,confirmedElapsedDays:elapsed,nextHealingDay:elapsed+5});
  }
 }
 // Delete linked consequences in ONE mutation, but do not delete a
 // different wound's evidence or a concurrent independent illness.
 const globalBefore={shock:s.shock,shockFollowup:!!s.shockFollowup,
  extendedShock:!!s.extendedShock,coma:!!s.coma?.active,
  bp:s.bloodLoss.bp,bloodShockPending:s.bloodShockPending===true};
 const autoRemoved=[];
 const belongs=(item)=>{
  if(!item)return false;
  const origin=item.woundId||item.sourceId;
  return origin?origin===woundId:impact.autoPlan.shockRootToRemove;
 };
 if(belongs(s.shockFollowup)){s.shockFollowup=null;autoRemoved.push('shock-followup');}
 if(belongs(s.extendedShock)){s.extendedShock=null;autoRemoved.push('extended-shock');}
 if(belongs(s.coma)){s.coma=null;autoRemoved.push('coma');}
 if(selectedShock==='clear'){
  s.shock='NONE';s.shockOriginRound=round;s.shockOriginWoundId=null;
  autoRemoved.push('shock');
  if(s.concurrentShockProjection){
   s.concurrentShockProjection.baseShock='NONE';
   s.concurrentShockProjection.projectedShock='NONE';
   projectConcurrentShock(s,{round});
  }
 }
 if(attributedBP>0){
  s.bloodLoss.bp-=attributedBP;
  s.bloodLoss.weaknessFatigue=s.bloodLoss.bp*5;
  autoRemoved.push('blood-loss:'+attributedBP);
  if(s.bloodLoss.bp===0)s.bloodLoss.healingNextDay=null;
 }
 if(s.bloodLoss.bp===0){
  s.bloodShockPending=false;
  if(globalBefore.bloodShockPending)autoRemoved.push('blood-shock');
 }
 w.healed=true;w.bleeding=false;w.nextAdvanceRound=null;w.moralePending=false;
 w.permanentImpairment=0;w.impaled=false;w.projectileArrowOrBolt=false;
 if(w.amputation?.severed===true){
  w.amputation={...w.amputation,severed:false,gmReversedEventId:eventId};
 }
 w.healing={...h,infected:false,infectionWeakness:0,nextInfectionDay:null,
  grimWound:false,nextGrimShockDay:null,nextHealingDay:null,permanentImpairment:0,
  gmResolved:true,gmResolvedEventId:eventId,...(daySinceInjury===null?{}:{healedDay:daySinceInjury})};
 s.events.push({id:eventId,type:'gm-health-wound-resolve',round,
  details:{woundId,reason:reason.trim(),priorInfected:!!h.infected,
   priorBleeding,priorPermanentEffects,gmCancelledMishaps:outstandingMishaps.map(x=>x.id),
   globalConsequences:{assessment:impact,autoResolved:true,autoRemoved,
    shockDisposition:selectedShock,bloodPointsAttributed:attributedBP,
    before:globalBefore,after:{shock:s.shock,shockFollowup:!!s.shockFollowup,
     extendedShock:!!s.extendedShock,coma:!!s.coma?.active,bp:s.bloodLoss.bp,
     bloodShockPending:s.bloodShockPending===true}},
   gmCancelledMorale:pendingMorale,resumedOtherWounds,actualRoll:null,gmOverride:true}});
 s.lastRound=round;validateCombatState(s);
 return {state:s,action,woundId};
}
/** Recheck journal -> original health event -> same wound on every save/load.
 * The receipt cannot be repurposed as a fabricated Physician or Healing roll.
 */
export function validateGMHealthOverrideEvidence(characters=[],journal=[],archived=[]){
 const actors=new Map([...characters,...archived].map(a=>[a.id,a])),seen=new Set();
 for(const j of journal){
  const p=j.calendarGMHealthOverride;if(!p)continue;
  assert(p.format==='hmk-gm-health-override-v1'&&['add','resolve'].includes(p.action)&&
   typeof p.sourceEventId==='string'&&typeof p.woundId==='string'&&
   typeof p.reason==='string'&&p.reason.trim().length>=10&&p.actualRoll===null,
   'GM zdravotní zásah: neplatný auditní záznam');
  assert(!seen.has(p.sourceEventId),'GM zdravotní zásah: duplicitní zdroj');seen.add(p.sourceEventId);
  const actor=actors.get(j.characterId),s=actor?.hmk?.healthState;
  assert(s&&Array.isArray(s.events)&&Array.isArray(s.wounds),'GM zdravotní zásah: chybí původní postava či zdravotní stav');
  const ev=s.events.find(e=>e.id===p.sourceEventId),w=s.wounds.find(w=>w.id===p.woundId);
  assert(ev?.type===(p.action==='add'?'gm-health-wound-create':'gm-health-wound-resolve')&&
   ev.details?.woundId===p.woundId&&ev.details?.reason===p.reason&&ev.details?.gmOverride===true&&w,
   'GM zdravotní zásah: chybí stejná původní událost a rána');
  if(p.action==='add')assert(w.originEventId===p.sourceEventId&&w.originDomain===MEDICAL_ORIGIN.GM,
   'GM zdravotní zásah: nesouhlasí původ rány');
  if(p.action==='resolve')assert(w.healed===true&&w.healing?.gmResolvedEventId===p.sourceEventId,
   'GM zdravotní zásah: pozdější změna zhojení postrádá původní doklad');
  if(p.globalConsequences!==undefined)assert(p.action==='resolve'&&
   JSON.stringify(p.globalConsequences)===JSON.stringify(ev.details?.globalConsequences),
   'GM zdravotní zásah: změna atribuce Shock / Coma / Blood Loss postrádá auditní doklad');
 }
 for(const actor of actors.values())for(const event of actor.hmk?.healthState?.events??[])
  if(['gm-health-wound-create','gm-health-wound-resolve'].includes(event.type))
   assert(seen.has(event.id),'GM zdravotní zásah: z původního zdravotního stavu zmizel odpovídající doklad v deníku');
 return true;
}
