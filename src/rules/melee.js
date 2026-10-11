import {pairKey} from '../domain/contracts.js';
import {SL, opposed} from './tests.js';
import {combatMishap} from './mishaps.js';

export const DEFENCE={BLOCK:'block',DODGE:'dodge',COUNTERSTRIKE:'counterstrike',IGNORE:'ignore'};
export const TA={ACTION:'action',IMPACT:'impact',PRECISION:'precision',SETUP:'setup'};
const STRIKE_TA=[TA.ACTION,TA.IMPACT,TA.PRECISION,TA.SETUP];
const BLOCK_DODGE_TA=[TA.ACTION,TA.SETUP];
const COUNTER_TA=[TA.IMPACT,TA.PRECISION];
const IGNORE_TA=[TA.IMPACT,TA.PRECISION];

export function setInClose(state,a,b,value=true){
  const k=pairKey(a,b); state.relations[k] ??= {}; state.relations[k].inClose=value; return state;
}
export function isInClose(state,a,b){ return !!state.relations[pairKey(a,b)]?.inClose; }
export function reachModifier({attackerRCH,opponentRCH,thrust=false,inClose=false}){
  const d=Math.abs(attackerRCH-opponentRCH)*5;
  if(attackerRCH===opponentRCH) return 0;
  if(!inClose){ if(attackerRCH<opponentRCH) return -d; return thrust?d:0; }
  if(attackerRCH>opponentRCH) return -d;
  return thrust?d:0;
}
export function grabRoll({str,d6,impactTA=0,oneHanded=false,offHanded=false}){
  return d6+str+impactTA*3-(oneHanded?2:0)-(offHanded?3:0);
}
export function pressRoll({str,d6,impactTA=0,charge=false}){ return d6+str+impactTA*2+(charge?2:0); }
export function tripRoll({str,d6,impactTA=0}){ return d6+str+impactTA*4; }
export function pressEffect(margin){
  if(margin<1) return null;
  if(margin<=4) return {backFeet:5};
  if(margin<=9) return {backFeet:5,stumble:true};
  return {backFeet:10,prone:true,shockIndex:margin>=50?8:margin>=30?7:6};
}
export function tripEffect(margin){
  if(margin<1) return null;
  if(margin<=4) return {prone:true};
  if(margin<=9) return {thrownFeet:5,prone:true};
  return {thrownFeet:5,prone:true,automaticGrabChoice:true};
}
export function startHold(state,grabberId,targetId,zone){
  const k=pairKey(grabberId,targetId); state.relations[k] ??= {};
  state.relations[k].hold={grabberId,targetId,zone,active:true,forcesNextTargetTurnPass:true,retestOnGrabberNextTurn:true};
  return state;
}
export function breakHold(state,grabberId,targetId){
  const h=state.relations[pairKey(grabberId,targetId)]?.hold; if(h) h.active=false; return state;
}
export function activeHold(state,a,b){ const h=state.relations[pairKey(a,b)]?.hold; return h?.active?h:null; }

function mishapFor(role, defence, sl, roll, naturalSL=sl){
  return combatMishap({finalSL:sl,roll,naturalSL,dodge:role==='defender'&&defence===DEFENCE.DODGE});
}
function outcome({winner=null,stars=0,striker=null,taTypes=[],tiedSuccess=false,usedTiebreak=false,weaponDamageCheck=false,attackerMishap=null,defenderMishap=null,ignore=false}={}){
  const strike=!!striker;
  return {winner,stars,striker,strike,baseImpact:strike,extraTA:Math.max(0,stars-(strike?1:1)),taTypes:[...taTypes],tiedSuccess,usedTiebreak,weaponDamageCheck,attackerMishap,defenderMishap,ignore};
}

/** Core HMK p166 Melee outcome matrix. Does not yet resolve injury, TA choices or mishap rolls. */
export function resolveMeleeOutcome({attacker,defender=null,defence,finalD10Attacker=null,finalD10Defender=null}){
  if(!Object.values(DEFENCE).includes(defence)) throw new RangeError('Unknown defence option');
  const attackerMishap=mishapFor('attacker',defence,attacker.sl,attacker.roll,attacker.naturalSL??attacker.sl);
  if(defence===DEFENCE.IGNORE){
    if(attacker.sl===SL.CF) return outcome({attackerMishap,ignore:true});
    const stars=attacker.sl===SL.F?1:attacker.sl===SL.S?3:4;
    return outcome({winner:'attacker',stars,striker:'attacker',taTypes:IGNORE_TA,attackerMishap,ignore:true});
  }
  if(!defender) throw new TypeError('Defender test required for opposed defence');
  const defenderMishap=mishapFor('defender',defence,defender.sl,defender.roll,defender.naturalSL??defender.sl);
  let tie='none';
  if(attacker.sl===defender.sl && attacker.sl>=SL.S){
    tie=defence===DEFENCE.BLOCK?'b':defence===DEFENCE.COUNTERSTRIKE?'a':'break';
  }
  const r=opposed({a:attacker,b:defender,tie,finalD10A:finalD10Attacker,finalD10B:finalD10Defender});
  if(r.needsFinalD10) return {...outcome({attackerMishap,defenderMishap}),needsFinalD10:true};
  if(!r.winner) return outcome({attackerMishap,defenderMishap});
  const winner=r.winner==='a'?'attacker':'defender';
  const tiedSuccess=!!r.tiedSuccess || !!r.tiebreak;
  const usedTiebreak=!!r.tiebreak;
  if(winner==='attacker'){
    return outcome({winner,stars:r.stars,striker:'attacker',taTypes:STRIKE_TA,tiedSuccess,usedTiebreak,attackerMishap,defenderMishap});
  }
  if(defence===DEFENCE.COUNTERSTRIKE){
    return outcome({winner,stars:r.stars,striker:'defender',taTypes:COUNTER_TA,tiedSuccess,usedTiebreak,attackerMishap,defenderMishap});
  }
  return outcome({winner,stars:r.stars,taTypes:BLOCK_DODGE_TA,tiedSuccess,usedTiebreak,weaponDamageCheck:defence===DEFENCE.BLOCK && tiedSuccess,attackerMishap,defenderMishap});
}

/** Normal free Press route from p172. */
export function normalFreePressEligible({meleeSL,opponentSL,usedTiebreak=false,actualPressAttack=false,dodgeDefender=false}={}){
  return !actualPressAttack && !dodgeDefender && meleeSL>=SL.S && meleeSL>opponentSL && !usedTiebreak;
}

/** Mighty Strike route from p353. GM-inappropriate weapons are deliberately surfaced as a decision. */
export function mightyStrikeFreePress({attackerSTR,targetSTR,attackerSL,defence,weaponType,gmAppropriate=null}={}){
  if(attackerSTR<targetSTR+10 || attackerSL<SL.S) return {eligible:false};
  if(defence!==DEFENCE.BLOCK && defence!==DEFENCE.COUNTERSTRIKE) return {eligible:false};
  const type=String(weaponType||'').toLowerCase();
  if(type==='bite' || type==='grab') return {eligible:false};
  if(gmAppropriate===false) return {eligible:false};
  if(gmAppropriate===null) return {eligible:true,needsGMWeaponSuitabilityDecision:true};
  return {eligible:true,needsGMWeaponSuitabilityDecision:false};
}

// Compatibility wrapper for the earlier bootstrap API. New code should use the two explicit routes above.
export function freePressEligibility({winnerSL,loserSL,usedTiebreak=false,winnerWasPress=false,winnerWasDodgeDefender=false}={}){
  return normalFreePressEligible({meleeSL:winnerSL,opponentSL:loserSL,usedTiebreak,actualPressAttack:winnerWasPress,dodgeDefender:winnerWasDodgeDefender});
}

/** Natural Strike vs armed Block, HMK p171. A tied success is only a warding Block. */
export function naturalStrikeArmedBlockFollowup({attackerNatural=false,defenderArmed=false,meleeOutcome}={}){
  if(!attackerNatural || !defenderArmed || meleeOutcome?.winner!=='defender') return {automaticReturnStrike:false};
  if(meleeOutcome.tiedSuccess) return {automaticReturnStrike:false,wardingTie:true};
  if(meleeOutcome.stars>=1) return {automaticReturnStrike:true,location:'natural-weapon-body-zone',rollLocationDie:'d10'};
  return {automaticReturnStrike:false};
}

/** Limb Block is not a normal Block tie: tied successes strike the blocking limb at -2 impact. */
export function limbBlockOutcome({attacker,defender,radicallyAwkward=false,trajectoryPenalty=false}={}){
  if(radicallyAwkward) return {allowed:false,needsGMDecision:true};
  const modifier=trajectoryPenalty?-20:0;
  if(attacker.sl<SL.S && defender.sl<SL.S) return {allowed:true,modifier,strike:false};
  if(defender.sl>attacker.sl && defender.sl>=SL.S) return {allowed:true,modifier,strike:false,warded:true,stars:defender.sl-attacker.sl};
  if(attacker.sl===defender.sl && attacker.sl>=SL.S) return {allowed:true,modifier,strike:true,target:'blocking-limb',rollLocationDie:'d10',strikeImpactModifier:-2,tiedSuccess:true};
  if(attacker.sl>defender.sl && attacker.sl>=SL.S) return {allowed:true,modifier,strike:true,target:'defender',stars:attacker.sl-defender.sl};
  return {allowed:true,modifier,strike:false};
}

/** Core Outnumbered: -10 per threatening opponent beyond the first. Prone/Ignored foes are excluded before calling. */
export function baseOutnumberedPenalty(threateningFoeIds=[]){
  return -10*Math.max(0,new Set(threateningFoeIds).size-1);
}

/** Allies option p191. Maximum-cardinality matching: each ally and each threatening foe may offset at most once. */
export function alliesOffset({threateningFoeIds=[],allyThreatens={}}={}){
  const foes=new Set(threateningFoeIds);
  const allies=Object.keys(allyThreatens);
  const match=new Map();
  function augment(ally,seen){
    for(const foe of allyThreatens[ally]||[]){
      if(!foes.has(foe)||seen.has(foe)) continue;
      seen.add(foe);
      if(!match.has(foe)||augment(match.get(foe),seen)){match.set(foe,ally);return true;}
    }
    return false;
  }
  let count=0; for(const ally of allies) if(augment(ally,new Set())) count++;
  return {offset:count*10,pairs:[...match].map(([foeId,allyId])=>({allyId,foeId}))};
}

/** Flanking option p191. Geometry is supplied by UI/map layer as exact opposite pairs. */
export function flankingPenalty({threateningFoeIds=[],oppositePairs=[]}={}){
  const active=new Set(threateningFoeIds);
  return oppositePairs.some(([a,b])=>active.has(a)&&active.has(b))?-10:0;
}

export function outnumberedPenalty({threateningFoeIds=[],alliesEnabled=false,allyThreatens={},flankingEnabled=false,oppositePairs=[]}={}){
  const base=baseOutnumberedPenalty(threateningFoeIds);
  const allies=alliesEnabled?alliesOffset({threateningFoeIds,allyThreatens}):{offset:0,pairs:[]};
  const flank=flankingEnabled?flankingPenalty({threateningFoeIds,oppositePairs}):0;
  return {base,alliesOffset:allies.offset,alliesPairs:allies.pairs,flankingPenalty:flank,total:Math.min(0,base+allies.offset+flank)};
}

/** Pairwise Flanking Awareness state. Failure forces Ignore only against that new flanker. */
export function markNewFlanker(state,defenderId,flankerId,{awareSuccess}={}){
  const k=pairKey(defenderId,flankerId); state.relations[k]??={};
  state.relations[k].flankingAwareness={defenderId,flankerId,aware:!!awareSuccess,ignoreRequired:!awareSuccess,retestEachRoundOnFlankerTurn:!awareSuccess};
  return state.relations[k].flankingAwareness;
}
export function flankerAwareness(state,defenderId,flankerId){return state.relations[pairKey(defenderId,flankerId)]?.flankingAwareness??null;}
export function resolveFlankerRetest(state,defenderId,flankerId,success){
  const x=flankerAwareness(state,defenderId,flankerId); if(!x) return null;
  if(success){x.aware=true;x.ignoreRequired=false;x.retestEachRoundOnFlankerTurn=false;} return x;
}
export function markIgnoredFlankerAttack(state,defenderId,flankerId){
  const x=flankerAwareness(state,defenderId,flankerId); if(x){x.aware=true;x.ignoreRequired=false;x.retestEachRoundOnFlankerTurn=false;} return x??null;
}

/** Melee Maximum Foe option p191. Active designation lasts one round unless known foe count falls within limit. */
export function maximumFoeLimit({passed=false}={}){return passed?4:3;}
export function designateActiveFoes({knownFoeIds=[],activeFoeIds=[],round,ir,passed=false}={}){
  const known=[...new Set(knownFoeIds)], limit=maximumFoeLimit({passed});
  if(known.length<=limit) return {required:false,limit,activeFoeIds:known,forcedIgnoreFoeIds:[],expiresAt:null};
  const active=[...new Set(activeFoeIds)];
  if(active.length!==limit||active.some(id=>!known.includes(id))) throw new RangeError(`Exactly ${limit} known active foes required`);
  return {required:true,limit,activeFoeIds:active,forcedIgnoreFoeIds:known.filter(id=>!active.includes(id)),designatedAt:{round,ir},expiresAt:{round:round+1,ir}};
}
export function activeFoeDesignationValid(designation,{round,ir,knownFoeCount}={}){
  if(!designation?.required) return false;
  if(knownFoeCount<=designation.limit) return false;
  const e=designation.expiresAt;
  return round<e.round || (round===e.round && ir>=e.ir);
}

import { armourAfterReduction } from './weapon-traits.js';
import { effectiveImpact as injuryEffectiveImpact, resolveInjurySequence } from './injury.js';
import { hardCoverStrike } from './positioning.js';

export function meleeStrikeImpact({impactDieRoll,weaponImpactModifier=0,strengthImpactModifier=0,impactTACount=0,impactTAValue=0,otherImpactModifier=0}={}){
  return impactDieRoll+weaponImpactModifier+strengthImpactModifier+otherImpactModifier+(impactTACount*impactTAValue);
}

/** Adapter from an already-established successful Melee strike to Injury Sequence.
 * Precision is resolved before this call; Press/Trip deliberately never call it.
 */
export function resolveMeleeStrikeHit({
  location,aspect,impactDieRoll,weaponImpactModifier=0,strengthImpactModifier=0,otherImpactModifier=0,
  impactTACount=0,impactTAValue=0,armourValue=0,armourReduction=0,rigidArmour=false,
  existingInjuries=[],compoundD10=null,amputationSL=null,shockSL=null,currentShockState,metalArmour=false,locationProtectedByHardCover=false
}={}){
  const strikeImpact=meleeStrikeImpact({impactDieRoll,weaponImpactModifier,strengthImpactModifier,otherImpactModifier,impactTACount,impactTAValue});
  const cover=hardCoverStrike({locationProtected:locationProtectedByHardCover,strikeImpact});
  if(cover.deflectedByCover) return {strikeImpact,targetImpact:0,deflectedByHardCover:true,injury:null};
  const av=armourAfterReduction(armourValue,armourReduction);
  const eff=injuryEffectiveImpact({strikeImpact,armourValue:av});
  const injury=resolveInjurySequence({location,effectiveImpact:eff,aspect,rigidArmour,existingInjuries,compoundD10,amputationSL,shockSL,currentShockState,projectile:false,metalArmour});
  return {strikeImpact,armourValueAfterReduction:av,effectiveImpact:eff,injury};
}

/** p165 declaration gate. This validates only rule-level availability; weapon traits
 * (counter-only etc.) may further narrow Block/Counterstrike before this call. */
export function meleeDefenceDeclaration({defence,alertness='aware',helpless=false,evading=false,blockWeaponReadied=false,reachReferenceReadied=false,counterstrikeWeaponReadied=false,forcedIgnore=false}={}){
  if(!Object.values(DEFENCE).includes(defence)) return {allowed:false,reason:'unknown-defence'};
  if(helpless||forcedIgnore||alertness==='unaware') return {allowed:defence===DEFENCE.IGNORE,forced:DEFENCE.IGNORE,ignoreDurationRounds:1};
  if(alertness==='confused'){
    if(defence===DEFENCE.BLOCK) return {allowed:!!blockWeaponReadied,reason:blockWeaponReadied?null:'block-requires-readied-weapon'};
    return {allowed:defence===DEFENCE.DODGE,reason:defence===DEFENCE.DODGE?null:'confused-only-block-or-dodge'};
  }
  if(evading && defence!==DEFENCE.BLOCK && defence!==DEFENCE.DODGE) return {allowed:false,reason:'evade-only-block-or-dodge'};
  if(defence===DEFENCE.BLOCK) return {allowed:!!blockWeaponReadied,reason:blockWeaponReadied?null:'block-requires-readied-weapon',reachReferenceMayDiffer:true};
  if(defence===DEFENCE.DODGE) return {allowed:!!reachReferenceReadied,reason:reachReferenceReadied?null:'dodge-requires-readied-reach-reference'};
  if(defence===DEFENCE.COUNTERSTRIKE) return {allowed:!!counterstrikeWeaponReadied,reason:counterstrikeWeaponReadied?null:'counterstrike-requires-readied-strike-weapon',requiresZoneOptions:true};
  return {allowed:true,ignoreDurationRounds:1};
}

/** p165 readied-weapon handling around the Melee Sequence. */
export function weaponReadyAction(action){
  if(action==='unsheathe') return {time:'free',readiedAfter:true};
  if(action==='unsling') return {time:'1-turn',kind:'grope',readiedAfter:true};
  if(action==='resheathe'||action==='resling') return {time:'1-turn',kind:'grope',readiedAfter:false};
  if(action==='drop') return {time:'none',readiedAfter:false,mayOccurAnyTime:true};
  throw new RangeError('Unknown weapon ready action');
}

/** p165 immutable declaration snapshot. All choices that affect the Melee test
 * must exist before dice are resolved; later Injury choices are deliberately absent.
 */
export function meleeDeclarationSnapshot({attackerId,targetId,attackerWeaponId,attackerStrikeMode,zoneDie,zoneAim,defence,defenderWeaponId=null,defenderStrikeMode=null,reachReferenceWeaponId=null,counterZoneDie=null,counterZoneAim=null,declarationGate=null}={}){
  if(!attackerId||!targetId) throw new TypeError('Attacker and target required');
  if(!attackerWeaponId||!attackerStrikeMode) throw new TypeError('Attacker readied weapon and Strike Mode required');
  if(zoneDie==null||zoneAim==null) throw new TypeError('Attacker Zone Die and Zone Aim required');
  if(!Object.values(DEFENCE).includes(defence)) throw new RangeError('Unknown defence option');
  if(declarationGate?.allowed===false) throw new Error(`Illegal defence declaration: ${declarationGate.reason??'forced defence'}`);
  if(defence===DEFENCE.BLOCK && (!defenderWeaponId||!defenderStrikeMode)) throw new TypeError('Block weapon and Strike Mode required');
  if([DEFENCE.BLOCK,DEFENCE.DODGE].includes(defence) && !reachReferenceWeaponId) throw new TypeError('Readied Reach reference required');
  if(defence===DEFENCE.COUNTERSTRIKE && (!defenderWeaponId||!defenderStrikeMode||counterZoneDie==null||counterZoneAim==null)) throw new TypeError('Counterstrike weapon, Strike Mode, Zone Die and Zone Aim required');
  const snapshot={attackerId,targetId,attacker:{weaponId:attackerWeaponId,strikeMode:attackerStrikeMode,zoneDie,zoneAim},defence};
  if(defence!==DEFENCE.IGNORE) snapshot.defender={weaponId:defenderWeaponId,strikeMode:defenderStrikeMode,reachReferenceWeaponId,counterZoneDie,counterZoneAim};
  return Object.freeze(snapshot);
}

/** Allocate exactly the extra victory stars to legal TA types before Injury.
 * This is a player choice: the kernel validates but never optimises it.
 */
export function allocateMeleeTacticalAdvantages({outcome,choices=[]}={}){
  const count=outcome?.extraTA??0;
  if(choices.length!==count) throw new RangeError(`Exactly ${count} Tactical Advantage choices required`);
  for(const choice of choices) if(!outcome.taTypes?.includes(choice)) throw new RangeError(`Tactical Advantage ${choice} not allowed by this outcome`);
  const tally={action:0,impact:0,precision:0,setup:0};
  for(const choice of choices) tally[choice]++;
  return {...tally,total:choices.length,choices:[...choices]};
}

/** HMK p.106: Take affects an item physically held in the rolled arm zone.
 * Main/off hand are dominance slots, not right/left anatomical slots. */
export function heldSlotInGrabZone(zone,handedness){
 if(!['right','left'].includes(handedness))return null;
 if(zone==='right-arm')return handedness==='right'?'main_hand':'off_hand';
 if(zone==='left-arm')return handedness==='left'?'main_hand':'off_hand';
 return null;
}
