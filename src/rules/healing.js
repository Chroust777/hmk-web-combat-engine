import { SL } from './tests.js';

export const HEALING_ROUNDS_PER_DAY = 12 * 60 * 24;

/** p177: average END and WIL; a half point rounds up only when END > WIL. */
export function healingBase({endurance,will}={}){
  if(!Number.isFinite(endurance)||!Number.isFinite(will)) throw new Error('END and WIL are required');
  const avg=(endurance+will)/2;
  if(Number.isInteger(avg)) return avg;
  return endurance>will?Math.ceil(avg):Math.floor(avg);
}

export function treatmentDelayModifier(daysSinceInjury=0){
  if(!Number.isInteger(daysSinceInjury)||daysSinceInjury<0) throw new RangeError('daysSinceInjury must be a non-negative integer');
  return -5*daysSinceInjury;
}

/** p180: Area fire/frost adds -20 to the normal Treatment Difficulty modifier. */
export function treatmentEML({physicianML,treatmentDifficulty=0,daysSinceInjury=0,secondaryModifier=0,area=false,otherModifiers=0}={}){
  if(!Number.isFinite(physicianML)) throw new Error('Physician ML is required');
  return physicianML+treatmentDifficulty+treatmentDelayModifier(daysSinceInjury)+secondaryModifier+(area?-20:0)+otherModifiers;
}

/** p180: later healers may roll only with a strictly higher Physician Index. */
export function mayAttemptAdditionalTreatment({physicianIndex,previousPhysicianIndexes=[]}={}){
  if(!Number.isInteger(physicianIndex)||physicianIndex<0) throw new RangeError('physicianIndex must be non-negative');
  return previousPhysicianIndexes.length===0||physicianIndex>Math.max(...previousPhysicianIndexes);
}

/** p180: any CF supersedes all; otherwise retain the highest SL. */
export function chooseTreatmentResult(results=[]){
  if(!results.length) return null;
  const cf=results.find(r=>r.sl===SL.CF);
  if(cf) return cf;
  const rank={[SL.F]:0,[SL.S]:1,[SL.CS]:2};
  return [...results].sort((a,b)=>(rank[b.sl]??-1)-(rank[a.sl]??-1))[0];
}

/** p180: G injury HR cannot exceed Physician Index, unless its CF-table HR is higher. */
export function capGrievousHealingRate({healingRate,physicianIndex,cfHealingRate}={}){
  if(!Number.isFinite(healingRate)||!Number.isFinite(physicianIndex)||!Number.isFinite(cfHealingRate)) throw new Error('HR, Physician Index and CF HR are required');
  return Math.min(healingRate,Math.max(physicianIndex,cfHealingRate));
}

export function isGrimWound({severity,treatmentSL=null,untreated=false,area=false,injuryLevel=null}={}){
  if(area && severity==='G' && (injuryLevel===4||injuryLevel===5)) return true;
  return severity==='G' && (untreated||treatmentSL===SL.CF);
}

export function injuryHealingEML({healingBase:hb,healingRate}={}){
  if(!Number.isFinite(hb)||!Number.isFinite(healingRate)) throw new Error('HB and HR are required');
  return hb*healingRate;
}

/** Expanded CF faces apply only to failed rolls for cauterised or Area injuries. d100 100 has ones face 0. */
export function healingFailureIsCritical({roll,cauterised=false,area=false}={}){
  if(!Number.isInteger(roll)||roll<1||roll>100) throw new RangeError('d100 roll must be 1..100');
  const ones=roll%10;
  return (cauterised||area)?[0,3,5,8].includes(ones):[0,5].includes(ones);
}

export function resolveInjuryHealingRoll({injuryLevel,sl,infectionPossible=false,arcaneRecovery=false}={}){
  if(!Number.isInteger(injuryLevel)||injuryLevel<1) throw new RangeError('injuryLevel must be >= 1');
  if(arcaneRecovery&&(sl===SL.CF||sl===SL.F)) return {injuryLevel,healed:false,infected:false,arcaneFailureIgnored:true};
  if(sl===SL.CF) return {injuryLevel,healed:false,infected:!!infectionPossible};
  if(sl===SL.F) return {injuryLevel,healed:false,infected:false};
  const reduction=sl===SL.CS?2:sl===SL.S?1:null;
  if(reduction==null) throw new RangeError('Healing SL');
  const next=Math.max(0,injuryLevel-reduction);
  return {injuryLevel:next,healed:next===0,infected:false};
}

export function severityFromInjuryLevel(level){
  if(level<=0) return null;
  if(level===1) return 'M';
  if(level<=3) return 'S';
  return 'G';
}

export function infectionInitialHR(injuryHealingRate){
  if(!Number.isFinite(injuryHealingRate)) throw new Error('Injury HR required');
  return Math.min(5,injuryHealingRate+1);
}
export function infectionCourseEML({healingBase:hb,infectionHR,physicianSV=0}={}){
  return hb*infectionHR+physicianSV;
}
export function infectionWeaknessFatigue(hr){
  if(hr<=2) return 10;
  if(hr<=4) return 5;
  return 0;
}
export function resolveInfectionCourse({hr,sl}={}){
  const delta=sl===SL.CF?-2:sl===SL.F?-1:sl===SL.S?1:sl===SL.CS?2:null;
  if(delta==null) throw new RangeError('Infection Course SL');
  const next=hr+delta;
  if(next<=0) return {hr:next,active:false,dead:true,defeated:false,weaknessFatigue:infectionWeaknessFatigue(next)};
  if(next>=6) return {hr:next,active:false,dead:false,defeated:true,weaknessFatigue:0};
  return {hr:next,active:true,dead:false,defeated:false,weaknessFatigue:infectionWeaknessFatigue(next)};
}

export function indefiniteHealingImpairment({injuryLevel,healingRate}={}){
  const severity=severityFromInjuryLevel(injuryLevel);
  if(severity==='G') return {unusable:true,penalty:null};
  if(severity==='S') return {unusable:false,penalty:10};
  if(severity==='M') return {unusable:false,penalty:healingRate<=5?5:0};
  return {unusable:false,penalty:0};
}
export function permanentHealingImpairment({daysToMinor,eligible=false}={}){
  if(!eligible) return 0;
  if(!Number.isFinite(daysToMinor)||daysToMinor<0) throw new RangeError('daysToMinor must be non-negative');
  return Math.min(25,Math.floor(daysToMinor/20)*5);
}
export function effectiveHealingImpairment({injuryLevel,healingRate,permanent=0}={}){
  const indefinite=indefiniteHealingImpairment({injuryLevel,healingRate});
  if(indefinite.unusable) return {...indefinite,permanent,effective:null};
  return {...indefinite,permanent,effective:Math.max(indefinite.penalty,permanent)};
}

export function resolveBloodLossHealing({bp,sl,arcaneRecovery=false}={}){
  if(!Number.isInteger(bp)||bp<0) throw new RangeError('bp must be non-negative');
  if(arcaneRecovery&&(sl===SL.CF||sl===SL.F)) return {bp,weaknessFatigue:bp*5,skipNextPeriod:false,arcaneFailureIgnored:true};
  if(sl===SL.CF) return {bp,weaknessFatigue:bp*5,skipNextPeriod:true};
  if(sl===SL.F) return {bp,weaknessFatigue:bp*5,skipNextPeriod:false};
  const reduction=sl===SL.CS?2:sl===SL.S?1:null;
  if(reduction==null) throw new RangeError('Blood Loss Healing SL');
  const next=Math.max(0,bp-reduction);
  return {bp:next,weaknessFatigue:next*5,skipNextPeriod:false};
}

export function scheduleInjuryHealing({currentRound,combatantId,injuryId,days=5}={}){
  return {type:'injury-healing-roll',dueRound:currentRound+days*HEALING_ROUNDS_PER_DAY,dueIR:null,combatantId,data:{injuryId}};
}
export function scheduleInfectionCourse({currentRound,combatantId,injuryId}={}){
  return {type:'infection-course-roll',dueRound:currentRound+HEALING_ROUNDS_PER_DAY,dueIR:null,combatantId,data:{injuryId}};
}
export function scheduleBloodLossHealing({currentRound,combatantId,skipNextPeriod=false}={}){
  return {type:'blood-loss-healing-roll',dueRound:currentRound+(skipNextPeriod?20:10)*HEALING_ROUNDS_PER_DAY,dueIR:null,combatantId,data:{}};
}

/** p180: a grim wound repeats its Location Shock once per day until no longer G/CF-treated. */
export function scheduleGrimWoundShock({currentRound,combatantId,injuryId,locationShock}={}){
  return {type:'grim-wound-shock-roll',dueRound:currentRound+HEALING_ROUNDS_PER_DAY,dueIR:null,combatantId,data:{injuryId,locationShock}};
}

/** p182: states/trauma that automatically interrupt and prevent concentration. */
export function concentrationStatus({shockState='none',grievousSkull=false,grimWound=false,fearState=null}={}){
  const blockedShock=['stn','inc','unc'].includes(String(shockState).toLowerCase());
  const blockedFear=['afraid','terrified','catatonic'].includes(String(fearState??'').toLowerCase());
  const reasons=[];
  if(blockedShock) reasons.push('shock-state');
  if(grievousSkull) reasons.push('grievous-skull');
  if(grimWound) reasons.push('grim-wound');
  if(blockedFear) reasons.push('fear-state');
  return {allowed:reasons.length===0,interrupted:reasons.length>0,reasons};
}

/** Healing Sequence step 7 globally pauses ordinary Injury Healing Rolls while any infection is active. */
export function patientHealingPolicy({infectionActive=false}={}){
  return {injuryHealingRollsAllowed:!infectionActive,infectionCourseRequired:!!infectionActive};
}

/** Once an injury is in the Healing Sequence, p182 impairment supersedes the acute p170 value for that injury; do not add them. */
export function healingStageZoneEffect({injuryLevel,healingRate,permanent=0}={}){
  const impairment=effectiveHealingImpairment({injuryLevel,healingRate,permanent});
  return {source:'healing-sequence',...impairment};
}

/** p178, Treatments table. Times are stored as minutes for scheduler/UI use. */
export const TREATMENTS = Object.freeze({
  amp:{id:'amp',name:'amputation',minutes:1},
  cau:{id:'cau',name:'cauterisation',minutes:5,bloodStoppageBonus:30,expandedHealingCF:true},
  cln:{id:'cln',name:'clean-dress',minutesPerInjuryLevel:5,requiresWater:true,requiresBandages:true},
  cmp:{id:'cmp',name:'compress',minutes:15,frozenBonus:10},
  ext:{id:'ext',name:'extraction',minutes:30,requiresSurgeryTools:true},
  set:{id:'set',name:'set-splint',minutes:15},
  sta:{id:'sta',name:'staunch',minutes:5,includesCleanDress:true,tourniquetBonus:20},
  sur:{id:'sur',name:'surgery',minutes:30,requiresSurgeryTools:true,includesCleanDress:true},
  wrm:{id:'wrm',name:'warming',minutes:120}
});

const R=(hr,{infection=false,impairment=false,bleeding=false,eliminateMinorImpairment=false}={})=>Object.freeze({kind:'hr',healingRate:hr,infectionPossible:infection,permanentImpairmentEligible:impairment,bleeding,eliminateMinorImpairment});
const HEAL=Object.freeze({kind:'heal',immediateHeal:true,infectionPossible:false,permanentImpairmentEligible:false,bleeding:false});
const EDGE=(level,{bleeding=false}={})=>Object.freeze({kind:'edge-injury',injuryLevel:level,aspect:'edge',bleeding});

/**
 * p180 Treatment Roll table, visually transcribed from the authoritative PDF.
 * Cell shading is represented only by infectionPossible; dark-grey G/CF is also
 * captured independently by the grim-wound rule. Black/red symbols are explicit.
 */
export const TREATMENT_ROLL_TABLE=Object.freeze({
  blunt:Object.freeze({
    M:{treatment:'cmp',modifier:30,dexSecondary:false,results:{[SL.CF]:R(4,{infection:true}),[SL.F]:R(5),[SL.S]:R(6,{eliminateMinorImpairment:true}),[SL.CS]:HEAL}},
    S:{treatment:'set',modifier:10,dexSecondary:false,results:{[SL.CF]:R(3,{infection:true,impairment:true}),[SL.F]:R(4,{impairment:true}),[SL.S]:R(5),[SL.CS]:R(6)}},
    G:{treatment:'sur',modifier:0,dexSecondary:true,results:{[SL.CF]:R(2,{infection:true,impairment:true,bleeding:true}),[SL.F]:R(3,{infection:true,impairment:true,bleeding:true}),[SL.S]:R(4,{infection:true,impairment:true}),[SL.CS]:R(5)}}
  }),
  edge:Object.freeze({
    M:{treatment:'cln',modifier:20,dexSecondary:false,results:{[SL.CF]:R(4,{infection:true}),[SL.F]:R(5),[SL.S]:R(6,{eliminateMinorImpairment:true}),[SL.CS]:HEAL}},
    S:{treatment:'cln',modifier:10,dexSecondary:false,results:{[SL.CF]:R(3,{infection:true}),[SL.F]:R(4,{infection:true}),[SL.S]:R(5),[SL.CS]:R(6)}},
    G:{treatment:'sur',modifier:0,dexSecondary:true,results:{[SL.CF]:R(2,{infection:true,impairment:true,bleeding:true}),[SL.F]:R(3,{infection:true,impairment:true,bleeding:true}),[SL.S]:R(4,{infection:true,impairment:true}),[SL.CS]:R(5)}}
  }),
  point:Object.freeze({
    M:{treatment:'cln',modifier:10,dexSecondary:false,results:{[SL.CF]:R(4,{infection:true}),[SL.F]:R(5),[SL.S]:R(6,{eliminateMinorImpairment:true}),[SL.CS]:HEAL}},
    S:{treatment:'cln',modifier:0,dexSecondary:false,results:{[SL.CF]:R(3,{infection:true,impairment:true}),[SL.F]:R(4,{infection:true}),[SL.S]:R(5),[SL.CS]:R(6)}},
    G:{treatment:'sur',modifier:-10,dexSecondary:true,results:{[SL.CF]:R(2,{infection:true,impairment:true,bleeding:true}),[SL.F]:R(3,{infection:true,impairment:true,bleeding:true}),[SL.S]:R(4,{infection:true,impairment:true}),[SL.CS]:R(5)}}
  }),
  projectile:Object.freeze({
    M:{treatment:'cln',modifier:10,broadheadModifier:0,dexSecondary:false,results:{[SL.CF]:R(4,{infection:true}),[SL.F]:R(5),[SL.S]:R(6,{eliminateMinorImpairment:true}),[SL.CS]:HEAL}},
    S:{treatmentByLevel:{2:'cln',3:'ext'},modifier:0,broadheadModifier:-20,dexSecondaryByLevel:{2:false,3:true},results:{[SL.CF]:R(3,{infection:true,impairment:true}),[SL.F]:R(4,{infection:true,impairment:true}),[SL.S]:R(5,{infection:true}),[SL.CS]:R(6)}},
    G:{treatment:'ext',modifier:-10,broadheadModifier:-30,dexSecondary:true,results:{[SL.CF]:R(2,{infection:true,impairment:true,bleeding:true}),[SL.F]:R(3,{infection:true,impairment:true,bleeding:true}),[SL.S]:R(4,{infection:true,impairment:true}),[SL.CS]:R(5,{infection:true})}}
  }),
  fire:Object.freeze({
    M:{treatment:'cmp',modifier:20,dexSecondary:false,results:{[SL.CF]:R(4),[SL.F]:R(5),[SL.S]:R(6,{eliminateMinorImpairment:true}),[SL.CS]:HEAL}},
    S:{treatment:'cln',modifier:10,dexSecondary:false,results:{[SL.CF]:R(2,{infection:true}),[SL.F]:R(3,{infection:true}),[SL.S]:R(4),[SL.CS]:R(5)}},
    G:{treatment:'cln',modifier:0,dexSecondary:false,results:{[SL.CF]:R(1,{infection:true,impairment:true}),[SL.F]:R(2,{infection:true,impairment:true}),[SL.S]:R(3,{infection:true,impairment:true}),[SL.CS]:R(4)}}
  }),
  frost:Object.freeze({
    M:{treatment:'wrm',modifier:40,dexSecondary:false,results:{[SL.CF]:R(4),[SL.F]:R(5),[SL.S]:HEAL,[SL.CS]:HEAL}},
    S:{treatment:'wrm',modifier:20,dexSecondary:false,results:{[SL.CF]:R(3,{infection:true,impairment:true}),[SL.F]:R(4),[SL.S]:R(5),[SL.CS]:R(6)}},
    G:{treatment:'amp',modifier:0,dexSecondary:true,results:{[SL.CF]:EDGE(5,{bleeding:true}),[SL.F]:EDGE(4,{bleeding:true}),[SL.S]:EDGE(3,{bleeding:true}),[SL.CS]:EDGE(2)}}
  })
});

export function treatmentContract({aspect,injuryLevel,broadhead=false}={}){
  const key=String(aspect??'').toLowerCase();
  const severity=severityFromInjuryLevel(injuryLevel);
  const row=TREATMENT_ROLL_TABLE[key]?.[severity];
  if(!row) throw new RangeError('Unsupported injury aspect/level for treatment');
  const treatment=row.treatmentByLevel?.[injuryLevel]??row.treatment;
  const dexSecondary=row.dexSecondaryByLevel?.[injuryLevel]??row.dexSecondary??false;
  return {aspect:key,injuryLevel,severity,treatment,modifier:row.modifier+(broadhead?(row.broadheadModifier??0):0),broadheadModifier:broadhead?(row.broadheadModifier??0):0,dexSecondary,results:row.results};
}

/** Resolve the p180 table cell, then apply the G-injury HR cap. Untreated = CF characteristics. */
export function resolveTreatmentTable({aspect,injuryLevel,sl=null,untreated=false,physicianIndex=null,broadhead=false,area=false,frostAmputationEligible=true}={}){
  const contract=treatmentContract({aspect,injuryLevel,broadhead});
  if(contract.aspect==='frost'&&contract.severity==='G'&&!frostAmputationEligible){
    return {...contract,available:false,reason:'grievous-frost-location-has-no-treatment',sl:SL.CF,untreated:true,result:contract.results[SL.CF],grimWound:true};
  }
  const effectiveSL=untreated?SL.CF:sl;
  if(!Object.values(SL).includes(effectiveSL)) throw new RangeError('Treatment SL required');
  let result={...contract.results[effectiveSL]};
  if(contract.severity==='G'&&result.kind==='hr'){
    if(!Number.isFinite(physicianIndex)) throw new Error('Physician Index required for Grievous treatment');
    const cf=contract.results[SL.CF];
    result={...result,healingRate:capGrievousHealingRate({healingRate:result.healingRate,physicianIndex,cfHealingRate:cf.kind==='hr'?cf.healingRate:0})};
    // p180: the HR cap brings other effects commensurate to its level.
    // Use the lowest table result whose listed HR equals the capped HR, preserving its symbols.
    if(result.healingRate!==contract.results[effectiveSL].healingRate){
      const order=[SL.CF,SL.F,SL.S,SL.CS];
      const source=order.map(k=>contract.results[k]).find(x=>x.kind==='hr'&&x.healingRate===result.healingRate);
      if(source) result={...source,healingRate:result.healingRate};
    }
  }
  return {...contract,available:true,sl:effectiveSL,untreated:!!untreated,result,grimWound:isGrimWound({severity:contract.severity,treatmentSL:effectiveSL,untreated,area,injuryLevel})};
}

export function treatmentDurationMinutes({treatment,injuryLevel=1}={}){
  const t=TREATMENTS[treatment];
  if(!t) throw new RangeError('Unknown treatment');
  return t.minutesPerInjuryLevel?t.minutesPerInjuryLevel*injuryLevel:t.minutes;
}

/** p178 mandatory equipment/material gate. Missing requirements means the injury is untreated. */
export function treatmentRequirements({treatment,injuryLevel=1,aspect=null}={}){
  const t=TREATMENTS[treatment];
  if(!t) throw new RangeError('Unknown treatment');
  const a=String(aspect??'').toLowerCase();
  const req=[];
  if(t.requiresWater||t.includesCleanDress) req.push('water');
  if(t.requiresBandages||t.includesCleanDress) req.push('bandages');
  if(t.requiresSurgeryTools) req.push('surgery-tools');
  // Clean & Dress: Serious Edge & Point injuries also require needle and thread.
  // Projectile is explicitly a type of Point aspect (p180).
  if((treatment==='cln'||t.includesCleanDress)&&injuryLevel>=2&&injuryLevel<=3&&['edge','point','projectile'].includes(a)) req.push('needle-thread');
  return [...new Set(req)];
}
export function canPerformTreatment({treatment,injuryLevel=1,aspect=null,available=[]}={}){
  const required=treatmentRequirements({treatment,injuryLevel,aspect});
  const have=new Set(available);
  const missing=required.filter(x=>!have.has(x));
  return {allowed:missing.length===0,required,missing};
}

/** Complete p180 Treatment Roll EML from injury data. DEX Secondary applies only to boxed SUR/EXT/AMP cells. */
export function treatmentRollEMLFromInjury({physicianML,aspect,injuryLevel,daysSinceInjury=0,broadhead=false,dexSecondaryModifier=0,area=false,otherModifiers=0}={}){
  const c=treatmentContract({aspect,injuryLevel,broadhead});
  return treatmentEML({physicianML,treatmentDifficulty:c.modifier,daysSinceInjury,secondaryModifier:c.dexSecondary?dexSecondaryModifier:0,area,otherModifiers});
}

/** p182 explicit OPTION — Serious Injury Aggravation. Disabled unless selected by campaign. */
export function aggravationChecksForAction({enabled=false,testSL,seriousInjuryIdsUsed=[],grievousInjuryIdsPlausible=[],forcedGrievousUseIds=[]}={}){
  if(!enabled) return [];
  const cf=testSL===SL.CF||forcedGrievousUseIds.length>0;
  if(!cf) return [];
  return [...new Set([...seriousInjuryIdsUsed,...grievousInjuryIdsPlausible,...forcedGrievousUseIds])].map(injuryId=>({injuryId,type:'aggravation-shock-sr'}));
}

/** A failed aggravation Shock SR lowers current HR by 1, minimum HR1. Untreated wounds carry the reduction into future treatment. */
export function applyAggravationShockSR({healingRate=null,shockSRSuccess,untreated=false,carriedReduction=0}={}){
  if(shockSRSuccess) return {healingRate,carriedReduction,aggravated:false};
  if(untreated&&healingRate==null) return {healingRate:null,carriedReduction:carriedReduction+1,aggravated:true};
  if(!Number.isFinite(healingRate)) throw new Error('Healing Rate required for treated injury');
  return {healingRate:Math.max(1,healingRate-1),carriedReduction,aggravated:true};
}

/** p182 OPTION movement gate for Serious head/torso/leg injury. */
export function seriousInjuryMovementAggravation({enabled=false,hasSeriousHeadTorsoLeg=false,rate}={}){
  if(!enabled||!hasSeriousHeadTorsoLeg) return {allowed:true,agilityTest:false,period:null};
  const r=String(rate??'').toLowerCase();
  if(r==='double') return {allowed:false,agilityTest:false,period:null};
  if(r==='half') return {allowed:true,agilityTest:true,period:'4-hours'};
  if(r==='full'||r==='charge') return {allowed:true,agilityTest:true,period:'turn'};
  throw new RangeError('Movement rate must be half, full, charge, or double');
}

/** Apply reductions accumulated while untreated to the HR eventually produced by treatment. */
export function applyCarriedAggravationToTreatmentHR({healingRate,carriedReduction=0}={}){
  if(!Number.isFinite(healingRate)||!Number.isInteger(carriedReduction)||carriedReduction<0) throw new RangeError('HR and non-negative carriedReduction required');
  return Math.max(1,healingRate-carriedReduction);
}

/** When infection is defeated, suspended injury healing resumes on its normal
 * five-day cadence from that point; missed rolls are not retroactively made. */
export function resumeInjuryHealingAfterInfection({currentRound,combatantId,injuryIds=[]}={}){
 return injuryIds.map(injuryId=>scheduleInjuryHealing({currentRound,combatantId,injuryId,days:5}));
}

/** Persistent Blood Loss recovery transition. As with Advance, anaemic weakness
 * is derived from current BP and replaces the prior blood-loss weakness value. */
export function bloodLossHealingTransition({bloodLoss={bp:0,weaknessFatigue:0},sl,arcaneRecovery=false,currentRound=null,combatantId=null}={}){
 const resolved=resolveBloodLossHealing({bp:bloodLoss?.bp??0,sl,arcaneRecovery});
 const event=(resolved.bp>0 && currentRound!=null && combatantId!=null)
   ? scheduleBloodLossHealing({currentRound,combatantId,skipNextPeriod:resolved.skipNextPeriod})
   : null;
 return {bloodLoss:{bp:resolved.bp,weaknessFatigue:resolved.weaknessFatigue},skipNextPeriod:resolved.skipNextPeriod,event,arcaneFailureIgnored:resolved.arcaneFailureIgnored===true};
}
