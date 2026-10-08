import test from 'node:test'; import assert from 'node:assert/strict';
import {successLevel,SL,opposed,effectiveMasteryLevel} from '../src/rules/tests.js';
import {reachModifier,grabRoll,pressEffect,tripEffect,setInClose,isInClose,startHold,activeHold,breakHold,alliesOffset,outnumberedPenalty,markNewFlanker,flankerAwareness,markIgnoredFlankerAttack,designateActiveFoes,activeFoeDesignationValid} from '../src/rules/melee.js';
import {evadeAreaShock} from '../src/rules/area.js';
import {CombatState} from '../src/domain/contracts.js';

test('d100 SL boundaries',()=>{assert.equal(successLevel(45,60),SL.CS);assert.equal(successLevel(61,60),SL.F);assert.equal(successLevel(65,60),SL.CF);});
test('Block tied success belongs to defender',()=>{assert.equal(opposed({a:{sl:2,roll:40},b:{sl:2,roll:30},tie:'b'}).winner,'b');});
test('In Close reverses reach disadvantage',()=>{assert.equal(reachModifier({attackerRCH:2,opponentRCH:6}),-20);assert.equal(reachModifier({attackerRCH:6,opponentRCH:2,inClose:true}),-20);assert.equal(reachModifier({attackerRCH:2,opponentRCH:6,inClose:true,thrust:true}),20);});
test('In Close is pair relation',()=>{const s=CombatState();setInClose(s,'a','b');assert.equal(isInClose(s,'b','a'),true);assert.equal(isInClose(s,'a','c'),false);});
test('Grab modifiers',()=>assert.equal(grabRoll({str:14,d6:4,impactTA:2,oneHanded:true,offHanded:true}),19));
test('Press margins',()=>{assert.deepEqual(pressEffect(4),{backFeet:5});assert.equal(pressEffect(30).shockIndex,7);assert.equal(pressEffect(50).shockIndex,8);});
test('Trip 10+ enables automatic Grab',()=>assert.equal(tripEffect(10).automaticGrabChoice,true));
test('Area evade S/CS reduces shock and always makes prone',()=>{assert.deepEqual(evadeAreaShock({shockIndex:6,dodgeSL:2}),{shockIndex:5,prone:true});assert.deepEqual(evadeAreaShock({shockIndex:6,dodgeSL:3}),{shockIndex:4,prone:true});});
import {successValue,secondaryModifier,secondaryRoll} from '../src/rules/tests.js';
test('SV uses primary ML Index plus SL modifier',()=>{assert.equal(successValue({ml:71,sl:SL.CS}),8);assert.equal(successValue({ml:82,sl:SL.F}),7);});
test('Secondary Mastery table',()=>{assert.equal(secondaryModifier(43),-5);assert.equal(secondaryModifier(72),10);assert.equal(secondaryModifier(102),25);assert.equal(secondaryModifier(110),30);});
test('Secondary Roll has no critical and TN may exceed bounds',()=>{assert.equal(secondaryRoll(10,10),true);assert.equal(secondaryRoll(1,0),false);});
test('Opposed both failures normally produce no victor',()=>assert.deepEqual(opposed({a:{sl:SL.F,roll:81,ml:60},b:{sl:SL.CF,roll:85,ml:60}}),{winner:null,stars:0,bothFailed:true}));

test('Most tests clamp final EML to 05..95',()=>{assert.equal(effectiveMasteryLevel(-30),5);assert.equal(effectiveMasteryLevel(140),95);assert.equal(successLevel(5,-30),SL.CS);assert.equal(successLevel(100,140),SL.CF);});
test('Explicit EML exception can bypass normal clamp',()=>assert.equal(successLevel(1,-40,{clamp:false}),SL.F));
test('Hold is pairwise state and persists until failed retest/break',()=>{const s=CombatState();startHold(s,'g','t','left-arm');assert.equal(activeHold(s,'t','g').forcesNextTargetTurnPass,true);breakHold(s,'g','t');assert.equal(activeHold(s,'g','t'),null);});
import {freePressEligibility} from '../src/rules/melee.js';
test('Free Press requires successful higher SL without tiebreak',()=>{assert.equal(freePressEligibility({winnerSL:SL.S,loserSL:SL.F}),true);assert.equal(freePressEligibility({winnerSL:SL.S,loserSL:SL.S,usedTiebreak:true}),false);});
test('Free Press excluded for Press attacker and Dodge defender',()=>{assert.equal(freePressEligibility({winnerSL:SL.CS,loserSL:SL.F,winnerWasPress:true}),false);assert.equal(freePressEligibility({winnerSL:SL.CS,loserSL:SL.F,winnerWasDodgeDefender:true}),false);});

import {resolveMeleeOutcome,DEFENCE,TA,normalFreePressEligible,mightyStrikeFreePress} from '../src/rules/melee.js';
test('Melee matrix: Block tied success wards strike and triggers Weapon Damage',()=>{
  const r=resolveMeleeOutcome({attacker:{sl:SL.S,roll:41,ml:60},defender:{sl:SL.S,roll:31,ml:60},defence:DEFENCE.BLOCK});
  assert.equal(r.winner,'defender'); assert.equal(r.strike,false); assert.equal(r.stars,1); assert.equal(r.weaponDamageCheck,true); assert.deepEqual(r.taTypes,[TA.ACTION,TA.SETUP]);
});
test('Melee matrix: Dodge tied success uses tiebreak and winner gets one star',()=>{
  const r=resolveMeleeOutcome({attacker:{sl:SL.S,roll:36,ml:60},defender:{sl:SL.S,roll:51,ml:60},defence:DEFENCE.DODGE});
  assert.equal(r.winner,'defender'); assert.equal(r.strike,false); assert.equal(r.stars,1); assert.equal(r.usedTiebreak,true);
});
test('Melee matrix: Counterstrike tied success belongs to attacker without tiebreak',()=>{
  const r=resolveMeleeOutcome({attacker:{sl:SL.S,roll:36,ml:60},defender:{sl:SL.S,roll:51,ml:60},defence:DEFENCE.COUNTERSTRIKE});
  assert.equal(r.winner,'attacker'); assert.equal(r.striker,'attacker'); assert.equal(r.stars,1); assert.equal(r.usedTiebreak,false);
});
test('Ignore maps F/S/CS to 1/3/4 stars and permits only Impact/Precision TA',()=>{
  for(const [sl,stars] of [[SL.F,1],[SL.S,3],[SL.CS,4]]){
    const r=resolveMeleeOutcome({attacker:{sl,roll:sl===SL.F?81:sl===SL.S?36:35,ml:60},defence:DEFENCE.IGNORE});
    assert.equal(r.stars,stars); assert.equal(r.striker,'attacker'); assert.deepEqual(r.taTypes,[TA.IMPACT,TA.PRECISION]);
  }
});
test('Ignore CF causes attacker mishap and no strike',()=>{
  assert.deepEqual(resolveMeleeOutcome({attacker:{sl:SL.CF,roll:80,ml:60},defence:DEFENCE.IGNORE}).attackerMishap,'fumble');
  assert.equal(resolveMeleeOutcome({attacker:{sl:SL.CF,roll:85,ml:60},defence:DEFENCE.IGNORE}).strike,false);
});
test('Dodge CF always causes Stumble, including a roll ending in 0',()=>{
  const r=resolveMeleeOutcome({attacker:{sl:SL.S,roll:41,ml:60},defender:{sl:SL.CF,roll:80,ml:60},defence:DEFENCE.DODGE});
  assert.equal(r.defenderMishap,'stumble');
});
test('Counterstrike victory extra TA are only Impact/Precision',()=>{
  const r=resolveMeleeOutcome({attacker:{sl:SL.F,roll:81,ml:60},defender:{sl:SL.CS,roll:35,ml:60},defence:DEFENCE.COUNTERSTRIKE});
  assert.equal(r.striker,'defender'); assert.equal(r.stars,2); assert.equal(r.extraTA,1); assert.deepEqual(r.taTypes,[TA.IMPACT,TA.PRECISION]);
});
test('Normal Free Press and Mighty Strike are separate eligibility routes',()=>{
  assert.equal(normalFreePressEligible({meleeSL:SL.S,opponentSL:SL.CS}),false);
  assert.deepEqual(mightyStrikeFreePress({attackerSTR:20,targetSTR:10,attackerSL:SL.S,defence:DEFENCE.BLOCK,weaponType:'sword',gmAppropriate:true}),{eligible:true,needsGMWeaponSuitabilityDecision:false});
  assert.equal(mightyStrikeFreePress({attackerSTR:20,targetSTR:10,attackerSL:SL.S,defence:DEFENCE.BLOCK,weaponType:'bite',gmAppropriate:true}).eligible,false);
});
test('Mighty Strike surfaces GM suitability for otherwise eligible weapon',()=>{
  const r=mightyStrikeFreePress({attackerSTR:20,targetSTR:10,attackerSL:SL.CS,defence:DEFENCE.COUNTERSTRIKE,weaponType:'whip'});
  assert.equal(r.eligible,true); assert.equal(r.needsGMWeaponSuitabilityDecision,true);
});

import {weaponDamageImpact,weaponDamageResult,qualityImpactPenalty,metalArmourWeaponDamage} from '../src/rules/weapon-damage.js';
import {naturalStrikeArmedBlockFollowup,limbBlockOutcome} from '../src/rules/melee.js';
test('Weapon Damage applies exact tie modifiers and strict WQ thresholds',()=>{
  assert.equal(weaponDamageImpact({strikeImpact:11,csTiebreak:true,targetIsShield:true,thrust:true}),16);
  assert.deepEqual(weaponDamageResult({impact:10,currentWQ:10}),{destroyed:false,wqLoss:0});
  assert.deepEqual(weaponDamageResult({impact:11,currentWQ:10}),{destroyed:false,wqLoss:1});
  assert.deepEqual(weaponDamageResult({impact:21,currentWQ:10}),{destroyed:true,wqLoss:0});
});
test('Weapon Quality loss reduces impact only below base WQ',()=>{
  assert.equal(qualityImpactPenalty({baseWQ:12,currentWQ:13}),0);
  assert.equal(qualityImpactPenalty({baseWQ:12,currentWQ:12}),0);
  assert.equal(qualityImpactPenalty({baseWQ:12,currentWQ:10}),-2);
});
test('Metal Armour Weapon Damage uses d6 plus absolute negative effective impact',()=>{
  assert.deepEqual(metalArmourWeaponDamage({aspect:'e',effectiveImpact:-10,metalArmour:true,d6:4,currentWQ:13}),{eligible:true,impact:14,destroyed:false,wqLoss:1});
  assert.equal(metalArmourWeaponDamage({aspect:'b',effectiveImpact:-10,metalArmour:true,d6:4,currentWQ:13}).eligible,false);
  assert.equal(metalArmourWeaponDamage({aspect:'p',effectiveImpact:0,metalArmour:true,d6:4,currentWQ:13}).eligible,false);
});
test('Natural Strike vs armed Block gives return strike only on actual defender victory, not tied warding',()=>{
  const win=naturalStrikeArmedBlockFollowup({attackerNatural:true,defenderArmed:true,meleeOutcome:{winner:'defender',stars:2,tiedSuccess:false}});
  assert.equal(win.automaticReturnStrike,true); assert.equal(win.rollLocationDie,'d10');
  const tie=naturalStrikeArmedBlockFollowup({attackerNatural:true,defenderArmed:true,meleeOutcome:{winner:'defender',stars:1,tiedSuccess:true}});
  assert.equal(tie.automaticReturnStrike,false); assert.equal(tie.wardingTie,true);
});
test('Limb Block tied successes hit blocking limb at -2 impact; higher defender SL wards without tiebreak',()=>{
  const tie=limbBlockOutcome({attacker:{sl:SL.S},defender:{sl:SL.S}});
  assert.equal(tie.strike,true); assert.equal(tie.target,'blocking-limb'); assert.equal(tie.strikeImpactModifier,-2);
  const win=limbBlockOutcome({attacker:{sl:SL.S},defender:{sl:SL.CS}});
  assert.equal(win.warded,true); assert.equal(win.strike,false);
});
test('Radically awkward Limb Block is surfaced as GM decision instead of guessed',()=>assert.deepEqual(limbBlockOutcome({attacker:{sl:SL.S},defender:{sl:SL.S},radicallyAwkward:true}),{allowed:false,needsGMDecision:true}));

import {TacticalAdvantageLedger,canUseActionTA,recordActionTA,earnSetupTA,availableSetups,spendSetupTA} from '../src/state/tactical-advantages.js';
test('Only one Action TA by anyone may occur during the same character turn',()=>{
  const l=TacticalAdvantageLedger(); recordActionTA({ledger:l,actorId:'a',round:1,turnToken:'r1-ir70-a'});
  assert.equal(canUseActionTA({ledger:l,actorId:'b',round:1,turnToken:'r1-ir70-a'}).allowed,false);
});
test('Actor normally has only one Action TA per round',()=>{
  const l=TacticalAdvantageLedger(); recordActionTA({ledger:l,actorId:'a',round:1,turnToken:'t1',action:'move'});
  assert.equal(canUseActionTA({ledger:l,actorId:'a',round:1,turnToken:'t2',action:'melee-attack',hand:'off',offHandLength:3}).allowed,false);
});
test('Two-Weapon exception is only two melee-attack Action TA, primary plus off-hand Length 2+',()=>{
  const l=TacticalAdvantageLedger(); recordActionTA({ledger:l,actorId:'a',round:1,turnToken:'t1',action:'melee-attack',hand:'primary'});
  assert.equal(canUseActionTA({ledger:l,actorId:'a',round:1,turnToken:'t2',action:'melee-attack',hand:'off',offHandLength:2}).allowed,true);
  assert.equal(canUseActionTA({ledger:l,actorId:'a',round:1,turnToken:'t2',action:'melee-attack',hand:'off',offHandLength:1}).allowed,false);
});
test('Setup TA remains usable through same IR next round and then expires',()=>{
  const l=TacticalAdvantageLedger(); earnSetupTA({ledger:l,actorId:'a',round:1,ir:70,count:2});
  assert.equal(availableSetups({ledger:l,actorId:'a',round:2,ir:80}).length,2);
  assert.equal(availableSetups({ledger:l,actorId:'a',round:2,ir:70}).length,2);
  assert.equal(availableSetups({ledger:l,actorId:'a',round:2,ir:69}).length,0);
});
test('Multiple Setup TA can be held and spread; spending gives +1 SL each',()=>{
  const l=TacticalAdvantageLedger(); earnSetupTA({ledger:l,actorId:'a',round:1,ir:70,count:3});
  assert.deepEqual(spendSetupTA({ledger:l,actorId:'a',round:1,ir:50,count:1}),{spent:1,successLevelBonus:1});
  assert.equal(availableSetups({ledger:l,actorId:'a',round:1,ir:40}).length,2);
});

import {CREATURE_SIZE,proneEffects,proneAimVsStandingHuman,standingStrikeVsProne,canOverrun} from '../src/rules/positioning.js';
test('Creature size table preserves ZN and base Reach modifiers',()=>{assert.deepEqual(CREATURE_SIZE.medium,{zn:10,rch:0});assert.deepEqual(CREATURE_SIZE.titanic,{zn:80,rch:6});});
test('Prone core effects and non-walking creature exception',()=>{assert.equal(proneEffects().meleeModifier,-20);assert.equal(proneEffects().countsForOpponentOutnumbered,false);assert.deepEqual(proneEffects({walks:false}),{canBecomeProne:false});});
test('Prone versus standing human has default Aim ZN2-3 and -2 RCH at ZN1',()=>{assert.equal(proneAimVsStandingHuman({zoneNumber:2}).defaultAim,true);assert.equal(proneAimVsStandingHuman({zoneNumber:1}).reachAdjustment,-2);});
test('Standing striker may freely aim any valid zone of prone target and get In Close',()=>assert.deepEqual(standingStrikeVsProne({zoneNumberValid:true}),{defaultAim:true,aimPenalty:0,mayGetInCloseFreely:true}));
test('Overrun requires sum of opponent ZN to be strictly less than mover ZN',()=>{assert.equal(canOverrun({moverZN:20,opponentZNs:[10]}),true);assert.equal(canOverrun({moverZN:20,opponentZNs:[10,10]}),false);});

import {deadlyAttackState} from '../src/rules/deadly.js';
test('Deadly Attack forces Ignore only for unaware/helpless targets',()=>{assert.equal(deadlyAttackState({}).forcedDefence,null);assert.equal(deadlyAttackState({unaware:true}).forcedDefence,'ignore');});
test('Helpless target suffers automatic four-star CS; exact location additionally requires one round concentration',()=>{assert.deepEqual(deadlyAttackState({helpless:true,concentratedRound:false}),{forcedDefence:'ignore',automaticFourStarCS:true,victoryStars:4,chooseExactLocation:false,unaware:false,helpless:true});assert.equal(deadlyAttackState({helpless:true,concentratedRound:true}).chooseExactLocation,true);});
test('Concentration alone never grants exact-location Deadly Attack',()=>assert.equal(deadlyAttackState({concentratedRound:true}).chooseExactLocation,false));

test('Allies option uses one-to-one ally/foe matching, not raw ally count',()=>{
  const r=alliesOffset({threateningFoeIds:['f1','f2','f3'],allyThreatens:{a1:['f1'],a2:['f1'],a3:['f2','f3']}});
  assert.equal(r.offset,20); assert.equal(r.pairs.length,2);
});
test('Allies matching finds maximum valid offset even when choices overlap',()=>{
  const r=alliesOffset({threateningFoeIds:['f1','f2'],allyThreatens:{a1:['f1','f2'],a2:['f1']}});
  assert.equal(r.offset,20);
});
test('Allies and Flanking modify Outnumbered independently',()=>{
  const r=outnumberedPenalty({threateningFoeIds:['4','5','6','7','8'],alliesEnabled:true,allyThreatens:{'2':['4','5'],'3':['5','6']},flankingEnabled:true,oppositePairs:[['4','7'],['5','8']]});
  assert.deepEqual({base:r.base,ally:r.alliesOffset,flank:r.flankingPenalty,total:r.total},{base:-40,ally:20,flank:-10,total:-30});
});
test('Flanking Awareness is pairwise and ends after ignored flanker attacks',()=>{
  const s=CombatState(); markNewFlanker(s,'d','f',{awareSuccess:false});
  assert.equal(flankerAwareness(s,'d','f').ignoreRequired,true);
  markIgnoredFlankerAttack(s,'d','f'); assert.equal(flankerAwareness(s,'d','f').ignoreRequired,false);
});
test('Melee Maximum Foe designates three, forces extras Ignore, and expires at same IR next round',()=>{
  const d=designateActiveFoes({knownFoeIds:['a','b','c','d'],activeFoeIds:['a','b','c'],round:2,ir:60});
  assert.deepEqual(d.forcedIgnoreFoeIds,['d']);
  assert.equal(activeFoeDesignationValid(d,{round:3,ir:60,knownFoeCount:4}),true);
  assert.equal(activeFoeDesignationValid(d,{round:3,ir:59,knownFoeCount:4}),false);
});
test('Pass raises Maximum Foe active limit to four only until next turn',()=>{
  const d=designateActiveFoes({knownFoeIds:['a','b','c','d','e'],activeFoeIds:['a','b','c','d'],round:1,ir:80,passed:true});
  assert.equal(d.limit,4); assert.deepEqual(d.forcedIgnoreFoeIds,['e']);
});

import {armourAfterReduction,weaponTestModifier,slowPenalty,impactTABonus,longWeaponRestriction,lowAimRule,createEnvelopedCondition,applyEnvelopEscapeSV,couchedHeft,shieldModifiers} from '../src/rules/weapon-traits.js';
test('Armour Reduction cannot reduce AV below zero',()=>{assert.equal(armourAfterReduction(3,5),0);assert.equal(armourAfterReduction(-2,4),0);});
test('Weapon melee/defence/block traits apply to exact test classes',()=>{assert.equal(weaponTestModifier({melee:5,defence:10,block:5,mode:'block'}),20);assert.equal(weaponTestModifier({melee:5,defence:10,block:5,mode:'counterstrike'}),15);assert.equal(weaponTestModifier({melee:5,defence:10,block:5,mode:'strike'}),5);});
test('Slow is independent -10 when multiple foes threaten and only Block/Counterstrike',()=>{assert.equal(slowPenalty({slow:true,threateningFoeCount:2,defence:'block'}),-10);assert.equal(slowPenalty({slow:true,threateningFoeCount:1,defence:'block'}),0);assert.equal(slowPenalty({slow:true,threateningFoeCount:3,defence:'dodge'}),0);});
test('Impact TA uses aspect defaults or weapon override',()=>{assert.equal(impactTABonus({aspect:'e',count:2}),10);assert.equal(impactTABonus({aspect:'e',count:2,override:{e:7}}),14);});
test('Long primary mode cannot threaten or strike In Close or within five feet',()=>{assert.equal(longWeaponRestriction({long:true,distanceFeet:5}).mayStrike,false);assert.equal(longWeaponRestriction({long:true,distanceFeet:10}).mayStrike,true);});
test('Low Aim defaults at ZN7+ and ZN1 additionally requires Jumping SR',()=>{assert.deepEqual(lowAimRule({lowAim:true,aimZN:7}),{modifier:0,jumpingSRRequired:false});assert.deepEqual(lowAimRule({lowAim:true,aimZN:1}),{modifier:-10,jumpingSRRequired:true});});
test('Envelop persists with -20 attack/defence/Move until accumulated Dexterity SV reaches 15',()=>{const c=createEnvelopedCondition({sourceId:'net'});assert.equal(c.moveModifier,-20);assert.equal(applyEnvelopEscapeSV(c,8).escaped,false);assert.deepEqual(applyEnvelopEscapeSV(c,7),{escaped:true,accumulatedSV:15});});
test('Couched reduces Heft by 3 only while mounted',()=>{assert.equal(couchedHeft({heft:13,mounted:true,couched:true}),10);assert.equal(couchedHeft({heft:13,mounted:false,couched:true}),13);});
test('Shield mod boosts Block/Dodge and Press but penalizes opponent in Counterstrike',()=>{assert.deepEqual(shieldModifiers({shieldMod:10,role:'defender',defence:'block'}),{self:10,opponent:0});assert.deepEqual(shieldModifiers({shieldMod:10,role:'defender',defence:'counterstrike'}),{self:0,opponent:-10});});

import {passiveDeflect,shieldMissileBlockEligibility,resolveShieldMissileBlock,shieldMissileBlockModifier,shieldWallBenefits,shieldWallMove} from '../src/rules/shields.js';
test('Passive Deflect works only for struck missile from front/shield side and triggers shield Weapon Damage',()=>{assert.equal(passiveDeflect({missileStruck:true,fromFrontOrShieldSide:true,deflectTN:3,d10:3}).weaponDamageCheck,true);assert.equal(passiveDeflect({missileStruck:true,fromFrontOrShieldSide:false,deflectTN:5,d10:1}).applicable,false);});
test('Shield Missile Block requires > half point blank, awareness, and melee freedom/ignored threats',()=>{const x={optionEnabled:true,missileSucceeded:true,aware:true,distance:31,pointBlankRange:60};assert.equal(shieldMissileBlockEligibility(x),true);assert.equal(shieldMissileBlockEligibility({...x,distance:30}),false);assert.equal(shieldMissileBlockEligibility({...x,threatenedInMelee:true}),false);assert.equal(shieldMissileBlockEligibility({...x,threatenedInMelee:true,ignoringThreatsForRound:true}),true);});
test('Shield Missile Block CS deflects, S strikes shield, failures strike target, CF mishaps',()=>{assert.equal(resolveShieldMissileBlock({sl:SL.CS,roll:15}).missileDeflected,true);assert.equal(resolveShieldMissileBlock({sl:SL.S,roll:31}).shieldStruck,true);assert.equal(resolveShieldMissileBlock({sl:SL.F,roll:81}).targetStruck,true);assert.equal(resolveShieldMissileBlock({sl:SL.CF,roll:90}).mishap,'fumble');assert.equal(shieldMissileBlockModifier(15),-5);});
test('Shield Wall gives +10 shield mod/+2 deflect but never with buckler/prone/out of In Close',()=>{const b={optionEnabled:true,hasShield:true,allyOnNonShieldSide:true,allyHasShield:true,inCloseWithAlly:true,halfMoveFeet:20,movedFeet:10};assert.deepEqual(shieldWallBenefits(b),{active:true,shieldModBonus:10,deflectBonus:2});assert.equal(shieldWallBenefits({...b,isBuckler:true}).active,false);assert.equal(shieldWallBenefits({...b,prone:true}).active,false);});
test('Shield Wall movement is Difficult half Move delayed to lowest participant IR',()=>{assert.deepEqual(shieldWallMove({participantIRs:[72,55,64]}),{allowed:true,difficult:true,maxRate:'half',moveAtIR:55});});

import {createMeleePostResolution,completeMeleePostPhase,canOfferActionTA,MELEE_POST_PHASE,dueEvents} from '../src/state/scheduler.js';
test('Melee post-resolution enforces Injury -> Mishaps -> Free Press -> Action TA',()=>{const f=createMeleePostResolution({hasStrike:true,hasMishaps:true,freePressEligible:true,actionTAAvailable:true});assert.deepEqual(f.phases,['injury','mishaps','free-press','action-ta','complete']);assert.equal(canOfferActionTA(f),false);completeMeleePostPhase(f,MELEE_POST_PHASE.INJURY);completeMeleePostPhase(f,MELEE_POST_PHASE.MISHAPS);completeMeleePostPhase(f,MELEE_POST_PHASE.FREE_PRESS);assert.equal(canOfferActionTA(f),true);});
test('Melee post-resolution skips absent phases but never reorders remaining phases',()=>{const f=createMeleePostResolution({hasStrike:false,hasMishaps:true,freePressEligible:false,actionTAAvailable:true});assert.deepEqual(f.phases,['mishaps','action-ta','complete']);assert.throws(()=>completeMeleePostPhase(f,'action-ta'));});

import { controlEML,mountedPenalty,mountingResolution,mountedTurnControl,mountTurnDistance,minimumMovementResult,riderImpactBonus,mountedAimReach,riderDefenceModifier,mountTargetDefenceOptions,unmountedDefencesAgainstRiderAndMount,mountedOutnumberedAllies,riderEncumbranceModifier,freePressStrength,chaseMelee,riderImpactEffect,riderImpactAtRound,mountedPairDefence,mountStumbleTrauma,thrownRiderTrauma } from '../src/rules/mounted.js';

test('Mounted Control Roll uses Riding ML plus mount Initiative Secondary Modifier',()=>{
  assert.equal(controlEML({ridingML:65,mountInitiativeML:60}),70);
  assert.equal(controlEML({ridingML:26,mountInitiativeML:60}),31);
});

test('Mounted Penalty is only negative Riding Secondary Modifier',()=>{
  assert.equal(mountedPenalty(65),0);
  assert.equal(mountedPenalty(26),-15);
});

test('Mounting costs Move plus 10 ft and moving failed Control causes six-foot leap/fall',()=>{
  assert.deepEqual(mountingResolution({moving:true,controlSucceeded:false}),{action:'move',movementCostFt:10,needsControl:true,fallFt:6});
  assert.equal(mountingResolution({agitated:true,controlSucceeded:false}).fallFt,0);
});

test('Mounted start-turn Control is free; failed Control may retest as 1-turn Grope which consumes rider action',()=>{
  assert.equal(mountedTurnControl({controlSucceeded:true}).riderActionAvailable,true);
  assert.equal(mountedTurnControl({controlSucceeded:false}).mayRetestAsGrope,true);
  assert.deepEqual(mountedTurnControl({controlSucceeded:false,retestSucceeded:true}),{controlled:true,controlAction:'grope',mayRetestAsGrope:false,riderActionAvailable:false});
});

test('Mounted turn spacing and minimum movement follow declared distance',()=>{
  assert.equal(mountTurnDistance({declaredDistanceFt:120,controlIndex:6}),20);
  assert.equal(minimumMovementResult({declaredDistanceFt:120,movedDistanceFt:119}).automaticFailedStumble,true);
});

test('Rider Impact uses mount data: full at 100+ straight feet, half at 50+',()=>{
  assert.equal(riderImpactBonus({mountRiderImpact:6,straightDistanceFt:100}),6);
  assert.equal(riderImpactBonus({mountRiderImpact:6,straightDistanceFt:50}),3);
  assert.equal(riderImpactBonus({mountRiderImpact:6,straightDistanceFt:49}),0);
});

test('Mounted aim Reach penalties distinguish rider strikes and unmounted counterstrikes',()=>{
  assert.equal(mountedAimReach({riderAttacking:true,targetUnmountedHuman:true,aimZN:2}),-1);
  assert.equal(mountedAimReach({riderAttacking:true,targetUnmountedHuman:true,aimZN:1}),0);
  assert.equal(mountedAimReach({unmountedCounterstrikeAtRider:true,aimZN:1}),-1);
});

test('Mounted rider defence penalties and mount-target defence options are exact',()=>{
  assert.equal(riderDefenceModifier('dodge'),-20);
  assert.equal(riderDefenceModifier('block'),-10);
  assert.equal(riderDefenceModifier('counterstrike'),-10);
  assert.deepEqual(mountTargetDefenceOptions({controlled:true,riderDefendsMount:true}),[
    {actor:'mount',defence:'dodge',modifier:0},{actor:'mount',defence:'counterstrike',modifier:0},
    {actor:'rider',defence:'block',modifier:-20},{actor:'rider',defence:'counterstrike',modifier:-20}
  ]);
});

test('Unmounted defender may Block/Counterstrike one of rider/mount pair and must Dodge the other',()=>{
  assert.deepEqual(unmountedDefencesAgainstRiderAndMount({firstDefence:'block'}),{first:'block',other:['dodge']});
  assert.deepEqual(unmountedDefencesAgainstRiderAndMount({firstDefence:'counterstrike'}),{first:'counterstrike',other:['dodge']});
});

test('Mounted constants: rider+mount count as two allies and rider ENC improves by -15',()=>{
  assert.equal(mountedOutnumberedAllies(),2); assert.equal(riderEncumbranceModifier(),-15);
});

test('Controlled mount STR may substitute for rider Free Press',()=>{
  assert.equal(freePressStrength({riderSTR:12,mountSTR:30,mountControlled:true,useMount:true}),30);
  assert.equal(freePressStrength({riderSTR:12,mountSTR:30,mountControlled:false,useMount:true}),12);
});

test('Chase attack requires full/double pursuit catch/engagement; Dodge avoids defence -20',()=>{
  assert.deepEqual(chaseMelee({caughtOrMaintained:true,moveRate:'full',defence:'block',gmConditionsNotIdeal:true}),{eligible:true,attackModifier:-20,defenceModifier:-20,gmMayRequireStumble:true,stumbleParties:['pursuer','pursued']});
  assert.equal(chaseMelee({caughtOrMaintained:true,moveRate:'double',defence:'dodge'}).defenceModifier,0);
  assert.equal(chaseMelee({caughtOrMaintained:true,moveRate:'half'}).eligible,false);
});

import { acuteInjuryEffect,injuryMishap,testUsesInjuredZone,grievousUseResolution,stunnedImpairedSL,initiativeShockModifierPolicy,areaInjuryEffect,projectileImpalement } from '../src/rules/injury-effects.js';

test('Acute injury effect: Minor adrenaline delay, Serious -10, Grievous unusable',()=>{
  assert.equal(acuteInjuryEffect({severity:'M',shockSL:SL.S,minutesSinceInjury:9}).impairment,0);
  assert.equal(acuteInjuryEffect({severity:'M',shockSL:SL.S,minutesSinceInjury:10}).impairment,5);
  assert.equal(acuteInjuryEffect({severity:'M',shockSL:SL.F,minutesSinceInjury:0}).impairment,5);
  assert.equal(acuteInjuryEffect({severity:'S'}).impairment,10);
  assert.equal(acuteInjuryEffect({severity:'G'}).unusable,true);
});

test('Injury Mishaps match zone and severity table',()=>{
  assert.deepEqual(injuryMishap({severity:'S',zone:'head'}),[]);
  assert.deepEqual(injuryMishap({severity:'S',zone:'arm'}),['fumble-roll']);
  assert.deepEqual(injuryMishap({severity:'S',zone:'torso',location:'pelvis'}),['stumble-roll']);
  assert.deepEqual(injuryMishap({severity:'G',zone:'head'}),['automatic-fumble','automatic-stumble']);
  assert.deepEqual(injuryMishap({severity:'G',zone:'legs'}),['automatic-stumble']);
});

test('Impaired-test zone matrix preserves exceptions such as Awareness and Dodge arms',()=>{
  assert.equal(testUsesInjuredZone({test:'awareness',zone:'head'}),true);
  assert.equal(testUsesInjuredZone({test:'awareness',zone:'torso'}),false);
  assert.equal(testUsesInjuredZone({test:'dodge',zone:'arm'}),false);
  assert.equal(testUsesInjuredZone({test:'melee',zone:'arm'}),true);
});

test('Grievous unusable zone: forced melee defence may Ignore or accept automatic CF; missile target is Still',()=>{
  assert.equal(grievousUseResolution({requiresUnusableZone:true,context:'melee-defence',defence:'block'}).automaticCF,true);
  assert.equal(grievousUseResolution({requiresUnusableZone:true,context:'melee-defence',defence:'ignore'}).forcedIgnore,true);
  assert.equal(grievousUseResolution({requiresUnusableZone:true,context:'missile-target'}).missileStill,true);
  assert.equal(grievousUseResolution({requiresUnusableZone:true,context:'action'}).automaticCF,true);
});

test('Stunned reduces only Impaired tests by one Success Level',()=>{
  assert.equal(stunnedImpairedSL(SL.CS,{stunned:true,isImpairedTest:true}),SL.S);
  assert.equal(stunnedImpairedSL(SL.S,{stunned:true,isImpairedTest:false}),SL.S);
  assert.equal(stunnedImpairedSL(SL.CF,{stunned:true,isImpairedTest:true}),SL.CF);
});

test('Initiative and Shock are not Injury-impaired; Shock alone carries glancing/reroll policies',()=>{
  assert.deepEqual(initiativeShockModifierPolicy('initiative'),{injuryImpairment:false,fatigue:true,glancingBonus:false,shockRerollPenalty:false});
  assert.deepEqual(initiativeShockModifierPolicy('shock'),{injuryImpairment:false,fatigue:true,glancingBonus:true,shockRerollPenalty:true});
});

test('Area injuries affect every Impaired test and movement; Grievous uses head mishap profile',()=>{
  assert.deepEqual(areaInjuryEffect({severity:'G'}),{affectsAllImpairedTests:true,affectsMovement:true,grievousMishapProfile:'head'});
});

test('Projectile S3+ injury is impaled and requires Extraction',()=>{
  assert.equal(projectileImpalement({projectile:true,severity:'S',injuryLevel:3}),true);
  assert.equal(projectileImpalement({projectile:true,severity:'S',injuryLevel:2}),false);
  assert.equal(projectileImpalement({projectile:false,severity:'G',injuryLevel:5}),false);
});

import { SHOCK_STATE,shockRollModifier,shockStateFromIndex,calculateShockState,applyShockState,shockStateEffects,shockRecoverySchedule,resolveStunnedRecovery,resolveShockReroll,moraleRequirementAfterInjury,stunnedRecoveryTransition } from '../src/rules/shock.js';
import { extendedShockEML,physicianExtendedShockBonus,resolveExtendedShockCourse,comaInitialHR,comaEML,resolveComaCourse,comaRecoveryWeariness } from '../src/rules/recovery.js';

test('Shock Roll SL maps to exact SHK modifier and state thresholds',()=>{
 assert.equal(shockRollModifier(SL.CF),2); assert.equal(shockRollModifier(SL.CS),-1);
 assert.equal(shockStateFromIndex(6),SHOCK_STATE.NONE); assert.equal(shockStateFromIndex(7),SHOCK_STATE.STN); assert.equal(shockStateFromIndex(8),SHOCK_STATE.INC); assert.equal(shockStateFromIndex(9),SHOCK_STATE.UNC); assert.equal(shockStateFromIndex(10),SHOCK_STATE.KIA);
 assert.deepEqual(calculateShockState({locationShock:4,injuryShock:2,shockSL:SL.CF}),{index:8,state:SHOCK_STATE.INC});
});

test('Repeated same STN escalates to INC and repeated same INC escalates to UNC',()=>{
 assert.equal(applyShockState(SHOCK_STATE.STN,SHOCK_STATE.STN),SHOCK_STATE.INC);
 assert.equal(applyShockState(SHOCK_STATE.INC,SHOCK_STATE.INC),SHOCK_STATE.UNC);
 assert.equal(applyShockState(SHOCK_STATE.UNC,SHOCK_STATE.STN),SHOCK_STATE.UNC);
});

test('Shock states expose exact action awareness prone and concentration restrictions',()=>{
 assert.equal(shockStateEffects(SHOCK_STATE.STN).movement,'difficult-no-double');
 assert.equal(shockStateEffects(SHOCK_STATE.INC).aware,false); assert.equal(shockStateEffects(SHOCK_STATE.INC).prone,true);
 assert.equal(shockStateEffects(SHOCK_STATE.UNC).helpless,true); assert.equal(shockStateEffects(SHOCK_STATE.STN).concentration,false);
});

test('STN/INC/UNC recovery schedules differ exactly',()=>{
 assert.equal(shockRecoverySchedule(SHOCK_STATE.STN).modifier,0);
 assert.equal(shockRecoverySchedule(SHOCK_STATE.INC).modifier,-20);
 assert.equal(shockRecoverySchedule(SHOCK_STATE.UNC).timing,'ten-minutes-after-original-shock-roll');
 assert.equal(resolveStunnedRecovery(SL.S),SHOCK_STATE.NONE); assert.equal(resolveStunnedRecovery(SL.F),SHOCK_STATE.STN);
});

test('Shock Reroll CS clears, S becomes STN, F/CF create Extended Shock and UNC CF also coma',()=>{
 assert.equal(resolveShockReroll({state:SHOCK_STATE.INC,sl:SL.CS}).state,SHOCK_STATE.NONE);
 const s=resolveShockReroll({state:SHOCK_STATE.INC,sl:SL.S}); assert.equal(s.state,SHOCK_STATE.STN); assert.equal(s.remainsProne,true);
 assert.equal(resolveShockReroll({state:SHOCK_STATE.INC,sl:SL.F}).extendedShock.hr,5);
 const cf=resolveShockReroll({state:SHOCK_STATE.UNC,sl:SL.CF,locationShock:4,injuryLevel:4}); assert.equal(cf.extendedShock.hr,4); assert.equal(cf.coma.initialHR,4);
});

test('Serious/Grievous Morale is deferred until recovery from Stunned when shock state intervenes',()=>{
 assert.deepEqual(moraleRequirementAfterInjury({severity:'S',shockState:SHOCK_STATE.NONE}),{required:true,timing:'immediate'});
 assert.equal(moraleRequirementAfterInjury({severity:'G',shockState:SHOCK_STATE.INC}).timing,'after-recovering-from-stunned');
 assert.equal(moraleRequirementAfterInjury({severity:'M',shockState:SHOCK_STATE.NONE}).required,false);
});

test('Extended Shock Course uses HB x HR, fatigue, highest Physician SV stars and exact HR outcomes',()=>{
 assert.equal(physicianExtendedShockBonus(3),15); assert.equal(extendedShockEML({healingBase:13,hr:5,fatigue:15,physicianBonus:5}),55);
 assert.deepEqual(resolveExtendedShockCourse({state:SHOCK_STATE.UNC,hr:5,sl:SL.S}),{hr:6,active:false,state:SHOCK_STATE.NONE,dead:false});
 assert.equal(resolveExtendedShockCourse({state:SHOCK_STATE.INC,hr:1,sl:SL.F}).dead,true);
});

test('Coma is independent trauma with initial HR 12-location shock-injury level and d10-day Course',()=>{
 assert.equal(comaInitialHR({locationShock:4,injuryLevel:4}),4);
 assert.equal(comaEML({healingBase:13,initialHR:4,weaknessFatigue:5,restfulSheltered:false}),27);
 assert.equal(resolveComaCourse({currentHR:5,sl:SL.S}).recovered,true);
 assert.equal(resolveComaCourse({currentHR:1,sl:SL.F}).dead,true);
 assert.equal(comaRecoveryWeariness(12),10);
});

import { bloodLossPoints,bloodLossState,applyBloodLoss,bleedingAdvancePolicy,bloodStoppageResult,afterAllBleedingStopped,scheduleBleederAdvance,rescheduleBleederAdvance,scheduleActiveBleeders,BLOOD_LOSS_PERIOD_ROUNDS } from '../src/rules/bleeding.js';
test('Blood Loss Advance is per bleeder every five minutes and excludes fatigue/impairment',()=>{
 assert.deepEqual(bleedingAdvancePolicy({isFolk:true}),{periodMinutes:5,test:'strength',fixedML:null,excludeFatigue:true,excludeImpairment:true});
 assert.equal(bleedingAdvancePolicy({isFolk:false}).fixedML,50);
 assert.equal(bloodLossPoints(SL.CF),3);assert.equal(bloodLossPoints(SL.F),2);assert.equal(bloodLossPoints(SL.S),1);assert.equal(bloodLossPoints(SL.CS),0);
});
test('Accumulated BP maps 1 STN, 2 INC, 3 UNC, 4 KIA and 5 weakness fatigue per BP',()=>{
 assert.equal(bloodLossState(1),SHOCK_STATE.STN);assert.equal(bloodLossState(2),SHOCK_STATE.INC);assert.equal(bloodLossState(3),SHOCK_STATE.UNC);assert.equal(bloodLossState(4),SHOCK_STATE.KIA);
 const r=applyBloodLoss({currentBP:1,sl:SL.F});assert.equal(r.bp,3);assert.equal(r.weaknessFatigue,15);assert.equal(r.shockState,SHOCK_STATE.UNC);
});
test('Blood-loss state uses same-state escalation, including INC while INC equals UNC',()=>{
 const r=applyBloodLoss({currentBP:0,sl:SL.F,currentShockState:SHOCK_STATE.INC});
 assert.equal(r.bloodLossState,SHOCK_STATE.INC);assert.equal(r.shockState,SHOCK_STATE.UNC);
});
test('Blood Stoppage S requires one final Advance Roll while CS stops immediately',()=>{
 assert.deepEqual(bloodStoppageResult(SL.S),{stopped:true,advanceRoll:true,nextStaunchBonus:0});
 assert.deepEqual(bloodStoppageResult(SL.CS),{stopped:true,advanceRoll:false,nextStaunchBonus:0});
 assert.equal(bloodStoppageResult(SL.F).nextStaunchBonus,10);
});
test('Blood-loss STN clears when all bleeding stops; INC/UNC require Shock Reroll',()=>{
 assert.deepEqual(afterAllBleedingStopped(SHOCK_STATE.STN),{state:SHOCK_STATE.NONE,shockReroll:false});
 assert.equal(afterAllBleedingStopped(SHOCK_STATE.INC).shockReroll,true);assert.equal(afterAllBleedingStopped(SHOCK_STATE.UNC).shockReroll,true);
});

import { severityFromInjuryLevel,compoundCompatible,compoundInjury,amputationEligible,amputationTestML,resolveAmputation,injuryFromEffectiveImpact,bleedingEligibleForInjury,resolveInjuryStep3 } from '../src/rules/injury.js';

test('Compound Injury requires same body location, not merely same body zone',()=>{
 const old={id:'old',location:'thorax',zone:'torso',level:1,severity:'M',aspect:'blunt'};
 const incoming={id:'new',location:'abdomen',zone:'torso',level:2,severity:'S',aspect:'edge'};
 assert.equal(compoundCompatible(old,incoming),false);
 assert.equal(compoundInjury({existing:[old],incoming,d10:1}).required,false);
});

test('Compound Injury TN totals compatible IL and raises highest IL; tied highest selects newest injury',()=>{
 const old={id:'old',location:'shoulder',zone:'arm',level:4,severity:'G',aspect:'blunt'};
 const incoming={id:'new',location:'shoulder',zone:'arm',level:1,severity:'M',aspect:'edge'};
 const r=compoundInjury({existing:[old],incoming,d10:4});
 assert.equal(r.tn,5);assert.equal(r.success,true);assert.equal(r.compoundedInjuryId,'old');assert.equal(r.compoundedExisting.level,5);assert.equal(r.injuryShock,5);
 const tie=compoundInjury({existing:[{...old,level:2,severity:'S'}],incoming:{...incoming,level:2,severity:'S'},d10:4});
 assert.equal(tie.compoundedInjuryId,'new');assert.equal(tie.injury.level,3);assert.equal(tie.injury.severity,'S');
});

test('G5 Compound remains IL5 but contributes Injury Shock 6',()=>{
 const old={id:'old',location:'neck',zone:'head',level:1,severity:'M',aspect:'blunt'};
 const incoming={id:'new',location:'neck',zone:'head',level:5,severity:'G',aspect:'edge'};
 const r=compoundInjury({existing:[old],incoming,d10:6});
 assert.equal(r.injury.level,5);assert.equal(r.g5Compounded,true);assert.equal(r.injuryShock,6);
});

test('Fire/Frost compound only together and Area injuries only with Area injuries',()=>{
 const base={location:'thorax',zone:'torso',level:2,severity:'S'};
 assert.equal(compoundCompatible({...base,aspect:'fire'},{...base,aspect:'frost'}),true);
 assert.equal(compoundCompatible({...base,aspect:'fire'},{...base,aspect:'edge'}),false);
 assert.equal(compoundCompatible({...base,aspect:'fire',area:true},{...base,aspect:'frost',area:false}),false);
 assert.equal(compoundCompatible({...base,aspect:'fire',area:true},{...base,aspect:'frost',area:true}),true);
});

test('Amputation applies only to G5 edge injury in a triangle location',()=>{
 const g5e={location:'forearm',level:5,severity:'G',aspect:'edge'};
 assert.equal(amputationEligible({injury:g5e,triangleModifier:0}),true);
 assert.equal(amputationEligible({injury:{...g5e,aspect:'point'},triangleModifier:0}),false);
 assert.equal(amputationEligible({injury:g5e,triangleModifier:null}),false);
});

test('Amputation CF always severs and forces Bleeder; F forces Bleeder only where location normally bleeds',()=>{
 const injury={location:'forearm',level:5,severity:'G',aspect:'edge'};
 assert.deepEqual(resolveAmputation({injury,triangleModifier:0,strengthSL:SL.CF,locationNormallyBleeds:false}),{eligible:true,severed:true,dead:false,forceBleeder:true,shockTestModifier:0});
 assert.equal(resolveAmputation({injury,triangleModifier:0,strengthSL:SL.F,locationNormallyBleeds:false}).forceBleeder,false);
 assert.equal(resolveAmputation({injury,triangleModifier:0,strengthSL:SL.F,locationNormallyBleeds:true}).forceBleeder,true);
});

test('Amputation S does not sever but applies -20 to ensuing Shock test; CS has no extra effect',()=>{
 const injury={location:'forearm',level:5,severity:'G',aspect:'edge'};
 assert.equal(resolveAmputation({injury,triangleModifier:-20,strengthSL:SL.S}).shockTestModifier,-20);
 assert.equal(resolveAmputation({injury,triangleModifier:-20,strengthSL:SL.S}).severed,false);
 assert.equal(resolveAmputation({injury,triangleModifier:-20,strengthSL:SL.CS}).shockTestModifier,0);
});

test('Severed neck kills immediately and beast amputation ML derives from triangle shade',()=>{
 const neck={location:'neck',level:5,severity:'G',aspect:'edge'};
 assert.equal(resolveAmputation({injury:neck,triangleModifier:20,strengthSL:SL.F,locationNormallyBleeds:true}).dead,true);
 assert.equal(amputationTestML({triangleModifier:20,isFolk:false}),70);
 assert.equal(amputationTestML({triangleModifier:0,isFolk:false}),50);
 assert.equal(amputationTestML({triangleModifier:-20,isFolk:false}),30);
 assert.equal(amputationTestML({strengthML:63,triangleModifier:-20,isFolk:true}),43);
});

test('Effective impact maps exactly to M1/S2/S3/G4/G5 thresholds',()=>{
 assert.equal(injuryFromEffectiveImpact({effectiveImpact:0,aspect:'edge'}).injury,null);
 assert.equal(injuryFromEffectiveImpact({effectiveImpact:1,aspect:'blunt'}).injury.level,1);
 assert.equal(injuryFromEffectiveImpact({effectiveImpact:5,aspect:'edge'}).injury.level,2);
 assert.equal(injuryFromEffectiveImpact({effectiveImpact:10,aspect:'edge'}).injury.level,3);
 assert.equal(injuryFromEffectiveImpact({effectiveImpact:15,aspect:'edge'}).injury.level,4);
 assert.equal(injuryFromEffectiveImpact({effectiveImpact:20,aspect:'edge'}).injury.level,5);
});

test('Rigid armour E/P impact 1-4 is Glancing Blow: no injury, SHK1 and +10 Shock test',()=>{
 const e=injuryFromEffectiveImpact({effectiveImpact:4,aspect:'edge',rigidArmour:true});
 assert.deepEqual(e,{injury:null,glancing:true,injuryShock:1,shockTestModifier:10});
 assert.equal(injuryFromEffectiveImpact({effectiveImpact:4,aspect:'point',rigidArmour:true}).glancing,true);
 assert.equal(injuryFromEffectiveImpact({effectiveImpact:4,aspect:'blunt',rigidArmour:true}).glancing,false);
 assert.equal(injuryFromEffectiveImpact({effectiveImpact:5,aspect:'edge',rigidArmour:true}).glancing,false);
});

test('Bleeding location classes reproduce S3/G4/G5 aspect table',()=>{
 const i=(level,aspect)=>({level,severity:severityFromInjuryLevel(level),aspect});
 assert.equal(bleedingEligibleForInjury({bleedingClass:1,injury:i(4,'edge')}),false);
 assert.equal(bleedingEligibleForInjury({bleedingClass:1,injury:i(5,'blunt')}),true);
 assert.equal(bleedingEligibleForInjury({bleedingClass:2,injury:i(4,'edge')}),true);
 assert.equal(bleedingEligibleForInjury({bleedingClass:2,injury:i(4,'blunt')}),false);
 assert.equal(bleedingEligibleForInjury({bleedingClass:3,injury:i(3,'edge')}),true);
 assert.equal(bleedingEligibleForInjury({bleedingClass:3,injury:i(3,'point')}),false);
});

test('Step 3 keeps causal injury separate when Compound raises an older injury',()=>{
 const old={id:'old',location:'shoulder',zone:'arm',level:4,severity:'G',aspect:'blunt'};
 const incoming={id:'new',location:'shoulder',zone:'arm',level:1,severity:'M',aspect:'edge'};
 const r=resolveInjuryStep3({existing:[old],incoming,d10:4,bleedingClass:2});
 assert.equal(r.compound.compoundedInjuryId,'old');assert.equal(r.injury.level,1);assert.equal(r.injuryShock,5);assert.equal(r.bleeder,false);
});

test('Step 3 chains causal Compound to Amputation and forced Bleeder without changing unrelated old injury',()=>{
 const old={id:'old',location:'forearm',zone:'arm',level:4,severity:'G',aspect:'edge'};
 const incoming={id:'new',location:'forearm',zone:'arm',level:4,severity:'G',aspect:'edge'};
 const r=resolveInjuryStep3({existing:[old],incoming,d10:8,bleedingClass:0,triangleModifier:0,amputationSL:SL.CF,locationNormallyBleeds:false});
 assert.equal(r.injury.level,5);assert.equal(r.amputation.severed,true);assert.equal(r.bleeder,true);assert.equal(r.injuryShock,5);
});

test('Each Bleeder schedules its own first Blood Loss Advance exactly five minutes later',()=>{
 assert.equal(BLOOD_LOSS_PERIOD_ROUNDS,60);
 const events=scheduleActiveBleeders({currentRound:7,currentIR:55,combatantId:'c1',injuries:[{id:'a',bleeding:true},{id:'b',bleeding:true},{id:'c',bleeding:false}]});
 assert.equal(events.length,2);assert.equal(events[0].dueRound,67);assert.equal(events[0].dueIR,55);assert.equal(events[1].data.injuryId,'b');
});

test('An active Bleeder reschedules independently every five minutes',()=>{
 const e=scheduleBleederAdvance({currentRound:10,currentIR:40,combatantId:'c',injuryId:'i'});
 const next=rescheduleBleederAdvance(e);assert.equal(next.dueRound,130);assert.equal(next.data.injuryId,'i');
});

import { resolveInjurySequence,INJURY_PENDING } from '../src/rules/injury.js';

test('Unified Injury Sequence returns explicit pending Compound/Amputation/Shock tests instead of guessing',()=>{
 const loc={id:'forearm',zone:'arm',locationShock:1,bleedingClass:2,triangleModifier:0};
 const old={id:'old',location:'forearm',zone:'arm',level:4,severity:'G',aspect:'edge'};
 let r=resolveInjurySequence({location:loc,effectiveImpact:15,aspect:'edge',existingInjuries:[old]});
 assert.equal(r.pending.type,INJURY_PENDING.COMPOUND);assert.equal(r.pending.tn,8);
 r=resolveInjurySequence({location:loc,effectiveImpact:15,aspect:'edge',existingInjuries:[old],compoundD10:8});
 assert.equal(r.pending.type,INJURY_PENDING.AMPUTATION);
 r=resolveInjurySequence({location:loc,effectiveImpact:15,aspect:'edge',existingInjuries:[old],compoundD10:8,amputationSL:SL.CS});
 assert.equal(r.pending.type,INJURY_PENDING.SHOCK);
});

test('Unified Injury Sequence preserves Compound injury shock and causal Bleeding separately',()=>{
 const loc={id:'shoulder',zone:'arm',locationShock:3,bleedingClass:2,triangleModifier:null};
 const old={id:'old',location:'shoulder',zone:'arm',level:4,severity:'G',aspect:'blunt'};
 const r=resolveInjurySequence({location:loc,effectiveImpact:1,aspect:'edge',existingInjuries:[old],compoundD10:4,shockSL:SL.S});
 assert.equal(r.complete,true);assert.equal(r.step3.compound.compoundedInjuryId,'old');assert.equal(r.step3.injury.level,1);
 assert.equal(r.step3.bleeder,false);assert.equal(r.shock.index,8);assert.equal(r.shock.state,SHOCK_STATE.INC);
 assert.equal(r.effect.impairment,0);
});

test('Unified Injury Sequence applies Amputation S -20 as Shock test modifier without changing SHK directly',()=>{
 const loc={id:'forearm',zone:'arm',locationShock:1,bleedingClass:2,triangleModifier:0};
 const r=resolveInjurySequence({location:loc,effectiveImpact:20,aspect:'edge',compoundD10:null,amputationSL:SL.S,shockSL:SL.S});
 assert.equal(r.shock.testModifier,-20);assert.equal(r.shock.index,6);assert.equal(r.shock.rawState,SHOCK_STATE.NONE);
 assert.equal(r.step3.amputation.severed,false);
});

test('Unified Injury Sequence glancing blow skips injury special effects but still resolves Shock',()=>{
 const loc={id:'thorax',zone:'torso',locationShock:4,bleedingClass:2,triangleModifier:null};
 const r=resolveInjurySequence({location:loc,effectiveImpact:4,aspect:'point',rigidArmour:true,shockSL:SL.CF,currentShockState:SHOCK_STATE.STN});
 assert.equal(r.base.glancing,true);assert.equal(r.step3,null);assert.equal(r.shock.index,7);assert.equal(r.shock.rawState,SHOCK_STATE.STN);
 assert.equal(r.shock.state,SHOCK_STATE.INC);assert.equal(r.shock.testModifier,10);assert.equal(r.effect,null);
});

test('Unified Injury Sequence Step 5 produces exact injury effect, mishap, morale and projectile impalement',()=>{
 const loc={id:'pelvis',zone:'torso',locationShock:4,bleedingClass:0,triangleModifier:null};
 const r=resolveInjurySequence({location:loc,effectiveImpact:10,aspect:'point',shockSL:SL.CS,projectile:true});
 assert.equal(r.step3.injury.severity,'S');assert.equal(r.effect.impairment,10);assert.deepEqual(r.mishaps,['stumble-roll']);
 assert.equal(r.impaled,true);assert.equal(r.morale.required,true);
});

test('Unified Injury Sequence severed neck ends immediately as KIA before Shock/Step 5',()=>{
 const loc={id:'neck',zone:'head',locationShock:5,bleedingClass:3,triangleModifier:0};
 const r=resolveInjurySequence({location:loc,effectiveImpact:20,aspect:'edge',amputationSL:SL.CF});
 assert.equal(r.dead,true);assert.equal(r.state,SHOCK_STATE.KIA);assert.equal(r.shock,null);assert.equal(r.effect,null);
});

import { zoneNumberFromRoll,locationCandidates,limbSideFromRoll,effectiveImpact } from '../src/rules/injury.js';

test('Injury Step 1 Zone Aim counts from selected ZN and can miss outside target table',()=>{
 assert.equal(zoneNumberFromRoll({aimZN:4,zdRoll:2}),5);
 const table=[{zn:1,zone:'head',lnMin:1,lnMax:10,id:'head'},{zn:2,zone:'torso',lnMin:1,lnMax:10,id:'torso'},{zn:3,zone:'legs',lnMin:1,lnMax:10,id:'leg'}];
 assert.equal(locationCandidates({bodyLocations:table,aimZN:3,zdRolls:[2],ldRolls:[5]}).miss,true);
});

test('Precision extra ZD creates extra LD only for ZD indicating same body zone',()=>{
 const table=[
  {zn:1,zone:'head',lnMin:1,lnMax:10,id:'head'},
  {zn:2,zone:'arm',lnMin:1,lnMax:10,id:'arm'},
  {zn:3,zone:'arm',lnMin:1,lnMax:5,id:'shoulder'},{zn:3,zone:'arm',lnMin:6,lnMax:10,id:'forearm'},
  {zn:4,zone:'torso',lnMin:1,lnMax:10,id:'torso'}
 ];
 const choose=locationCandidates({bodyLocations:table,aimZN:1,zdRolls:[2,3]});
 assert.equal(choose.pending.type,'zone-choice');
 const same=locationCandidates({bodyLocations:table,aimZN:1,zdRolls:[2,3],selectedZDIndex:0,ldRolls:[2,8]});
 assert.equal(same.requiredLocationDice,2);assert.equal(same.candidates.some(x=>x.id==='arm'),true);
 const different=locationCandidates({bodyLocations:table,aimZN:1,zdRolls:[1,2],selectedZDIndex:0,ldRolls:[7]});
 assert.equal(different.requiredLocationDice,1);
});

test('Helpless concentrated exact location bypasses ZD/LD and limb side follows odd-left even-right',()=>{
 const exact={id:'eye',zone:'head',locationShock:5};
 assert.deepEqual(locationCandidates({exactLocation:exact}).candidates,[exact]);
 assert.equal(limbSideFromRoll(7),'left');assert.equal(limbSideFromRoll(8),'right');
});

test('Injury Step 2 effective impact subtracts AV and preserves negative AV/effective impact',()=>{
 assert.equal(effectiveImpact({strikeImpact:12,armourValue:4}),8);
 assert.equal(effectiveImpact({strikeImpact:4,armourValue:-3}),7);
 assert.equal(effectiveImpact({strikeImpact:4,armourValue:9}),-5);
});

test('Precision does not demand bonus LD until player selects a ZD result',()=>{
 const table=[{zn:1,zone:'head',lnMin:1,lnMax:10,id:'head'},{zn:2,zone:'arm',lnMin:1,lnMax:10,id:'arm'},{zn:3,zone:'arm',lnMin:1,lnMax:10,id:'arm'}];
 const pre=locationCandidates({bodyLocations:table,aimZN:1,zdRolls:[1,2,3]});
 assert.equal(pre.pending.type,'zone-choice');assert.equal(pre.requiredLocationDice,null);
 const head=locationCandidates({bodyLocations:table,aimZN:1,zdRolls:[1,2,3],selectedZDIndex:0,ldRolls:[4]});
 assert.equal(head.requiredLocationDice,1);assert.equal(head.pending,null);
 const arm=locationCandidates({bodyLocations:table,aimZN:1,zdRolls:[1,2,3],selectedZDIndex:1,ldRolls:[4]});
 assert.equal(arm.requiredLocationDice,2);assert.equal(arm.pending.type,'location-dice');
});

import { injurySequenceEvents } from '../src/rules/injury.js';

test('Completed Bleeder schedules Blood Loss at five minutes and successful Minor schedules impairment at ten minutes',()=>{
 const loc={id:'hand',zone:'arm',locationShock:2,bleedingClass:0,triangleModifier:null};
 const minor=resolveInjurySequence({location:loc,effectiveImpact:2,aspect:'blunt',shockSL:SL.S});
 const ev=injurySequenceEvents({result:minor,currentRound:4,currentIR:70,combatantId:'c',injuryId:'i'});
 assert.equal(ev.find(x=>x.type==='minor-impairment-activate').dueRound,124);
 const bleedLoc={id:'neck',zone:'head',locationShock:5,bleedingClass:3,triangleModifier:null};
 const bleed=resolveInjurySequence({location:bleedLoc,effectiveImpact:10,aspect:'edge',shockSL:SL.CS});
 const bev=injurySequenceEvents({result:bleed,currentRound:4,currentIR:70,combatantId:'c',injuryId:'b'});
 assert.equal(bev.find(x=>x.type==='blood-loss-advance').dueRound,64);
});

test('Injury Sequence schedules STN/INC next-turn recovery and UNC ten-minute reroll',()=>{
 const mk=(locationShock,impact,shockSL)=>resolveInjurySequence({location:{id:'x',zone:'torso',locationShock,bleedingClass:0},effectiveImpact:impact,aspect:'blunt',shockSL});
 const stn=injurySequenceEvents({result:mk(5,1,SL.F),currentRound:2,currentIR:60,combatantId:'c'}).find(x=>x.type==='stunned-recovery');
 assert.equal(stn.dueRound,3);assert.equal(stn.timing,'end-turn');
 const inc=injurySequenceEvents({result:mk(5,5,SL.F),currentRound:2,currentIR:60,combatantId:'c'}).find(x=>x.type==='shock-reroll');
 assert.equal(inc.dueRound,3);assert.equal(inc.data.from,SHOCK_STATE.INC);
 const unc=injurySequenceEvents({result:mk(5,10,SL.F),currentRound:2,currentIR:60,combatantId:'c'}).find(x=>x.type==='shock-reroll');
 assert.equal(unc.dueRound,122);assert.equal(unc.data.from,SHOCK_STATE.UNC);
});

import { metalArmourTransform } from '../src/rules/injury.js';
test('Metal Armour option transforms exact E/P injuries one IL lower before Injury special effects',()=>{
 const mk=(level,aspect)=>({level,severity:severityFromInjuryLevel(level),aspect});
 assert.deepEqual(metalArmourTransform({injury:mk(2,'edge'),enabled:true,hasScaleOrMail:true}).injury,{level:1,severity:'M',aspect:'blunt'});
 assert.deepEqual(metalArmourTransform({injury:mk(3,'edge'),enabled:true,hasScaleOrMail:true}).injury,{level:2,severity:'S',aspect:'blunt'});
 assert.deepEqual(metalArmourTransform({injury:mk(4,'point'),enabled:true,hasPlate:true}).injury,{level:3,severity:'S',aspect:'blunt'});
 assert.deepEqual(metalArmourTransform({injury:mk(5,'point'),enabled:true,hasPlate:true}).injury,{level:4,severity:'G',aspect:'blunt'});
 assert.equal(metalArmourTransform({injury:mk(3,'point'),enabled:true,hasScaleOrMail:true}).transformed,false);
});

test('Unified Injury Sequence applies Metal Armour before Compound, Bleeding and Amputation',()=>{
 const loc={id:'forearm',zone:'arm',locationShock:1,bleedingClass:3,triangleModifier:0,hasPlate:true};
 const r=resolveInjurySequence({location:loc,effectiveImpact:20,aspect:'edge',metalArmour:true,shockSL:SL.S});
 assert.equal(r.metal.transformed,true);assert.equal(r.step3.injury.level,4);assert.equal(r.step3.injury.aspect,'blunt');
 assert.equal(r.step3.bleeder,false);assert.equal(r.step3.amputation,null);
});

import { missileRange,directMissileOutcome,spoiledMissileAttack,nearbyMissileStrike,missileStrikeImpact,MISSILE_RANGE ,chargingThrowBonusEligible,spoiledMissileResolution} from '../src/rules/missile.js';
test('Missile range table reproduces PB/Direct/Volley modifiers, ZD and impact',()=>{
 assert.deepEqual(missileRange({distance:50,baseRange:100}),{band:MISSILE_RANGE.PB,type:'direct',rangeModifier:10,zd:6,impactModifier:2,chargeImpactModifier:null,areaDiameter:null});
 assert.equal(missileRange({distance:100,baseRange:100}).zd,8);
 assert.equal(missileRange({distance:200,baseRange:100}).impactModifier,-2);
 assert.equal(missileRange({distance:300,baseRange:100}).rangeModifier,-20);
 assert.equal(missileRange({distance:400,baseRange:100}).rangeModifier,-40);
 assert.equal(missileRange({distance:401,baseRange:100}).outOfRange,true);
});
test('Charging thrown attack uses special PB/Direct impact and has maximum Volley x3',()=>{
 assert.equal(missileRange({distance:20,baseRange:60,thrownPbZD:8,chargingThrow:true}).chargeImpactModifier,3);
 assert.equal(missileRange({distance:50,baseRange:60,chargingThrow:true}).chargeImpactModifier,1);
 assert.equal(missileRange({distance:181,baseRange:60,chargingThrow:true}).outOfRange,true);
});
test('Direct Missile Still grants automatic Precision; CS adds one choice TA',()=>{
 assert.deepEqual(directMissileOutcome({sl:SL.S,targetMovement:'still'}),{strike:true,mishap:null,stars:2,precisionTA:1,choiceTA:0,nearbyCheck:false});
 assert.equal(directMissileOutcome({sl:SL.CS,targetMovement:'still'}).stars,3);
 assert.equal(directMissileOutcome({sl:SL.CS,targetMovement:'moving'}).stars,2);
});
test('Failed Direct Missile only checks nearby target above EML05; CF attack never takes place',()=>{
 assert.equal(directMissileOutcome({sl:SL.F,eml:5}).nearbyCheck,false);assert.equal(directMissileOutcome({sl:SL.F,eml:6}).nearbyCheck,true);
 assert.equal(directMissileOutcome({sl:SL.CF,roll:80}).mishap,'fumble');assert.equal(directMissileOutcome({sl:SL.CF,roll:85}).mishap,'stumble');
 assert.deepEqual(nearbyMissileStrike({targetCount:3,d20:2,d10:5}),{hit:true,impactTA:1,zoneDie:'d10-or-target-zones'});
});
test('Spoiled Missile threshold is final adjusted EML -40 or worse',()=>{assert.equal(spoiledMissileAttack(-40),true);assert.equal(spoiledMissileAttack(-39),false);});
test('Missile strike impact applies range/TA before blunt projectile head halves total',()=>{
 assert.equal(missileStrikeImpact({impactDieRoll:8,weaponImpactModifier:2,rangeImpactModifier:2,impactTACount:1,impactTAValue:4}),16);
 assert.equal(missileStrikeImpact({impactDieRoll:8,weaponImpactModifier:2,rangeImpactModifier:2,impactTACount:1,impactTAValue:4,bluntHead:true}),8);
});

import { resolveDirectMissileHit } from '../src/rules/missile.js';
test('Direct Missile hit gates passive Deflect before Injury Sequence',()=>{
 const loc={id:'thorax',zone:'torso',locationShock:4,bleedingClass:0,strikeAspect:'point'};
 const r=resolveDirectMissileHit({location:loc,aspect:'point',impactDieRoll:8,weaponImpactModifier:2,deflect:{fromFrontOrShieldSide:true,deflectTN:3,d10:2}});
 assert.equal(r.deflected,true);assert.equal(r.shieldWeaponDamageCheck,true);assert.equal(r.injury,null);
});
test('Direct Missile hit applies AR to AV, preserves impact, then enters unified Injury Sequence as projectile',()=>{
 const loc={id:'thorax',zone:'torso',locationShock:4,bleedingClass:0,strikeAspect:'point'};
 const r=resolveDirectMissileHit({location:loc,aspect:'point',impactDieRoll:8,weaponImpactModifier:2,rangeImpactModifier:2,armourValue:8,armourReduction:4,shockSL:SL.S});
 assert.equal(r.strikeImpact,12);assert.equal(r.armourValueAfterReduction,4);assert.equal(r.effectiveImpact,8);
 assert.equal(r.injury.step3.injury.level,2);assert.equal(r.injury.impaled,false);
});
test('Direct Missile S3+ is marked impaled through unified Injury Sequence',()=>{
 const loc={id:'thorax',zone:'torso',locationShock:4,bleedingClass:0,strikeAspect:'point'};
 const r=resolveDirectMissileHit({location:loc,aspect:'point',impactDieRoll:10,weaponImpactModifier:4,armourValue:0,shockSL:SL.S});
 assert.equal(r.injury.step3.injury.level,3);assert.equal(r.injury.impaled,true);
});

import { volleyMissileOutcome,volleyPotentialStrike,volleyZoneDieSize,resolveVolleyMissileHit } from '../src/rules/missile.js';
test('Volley Missile CF/F/S/CS produces exact mishap, deviation and Volley Precision states',()=>{
 assert.deepEqual(volleyMissileOutcome({sl:SL.CF,roll:80,eml:40}),{potentialStrike:false,deviation:false,mishap:'fumble',volleyPrecisionDice:0});
 assert.equal(volleyMissileOutcome({sl:SL.F,eml:5}).deviation,false);
 assert.equal(volleyMissileOutcome({sl:SL.F,eml:6}).deviation,true);
 assert.equal(volleyMissileOutcome({sl:SL.S}).potentialStrike,true);
 assert.equal(volleyMissileOutcome({sl:SL.CS}).volleyPrecisionDice,1);
});
test('Volley Potential Strike uses d20 normally, d10 with CS Precision, and separate d10 5/0 for Impact TA',()=>{
 assert.equal(volleyPotentialStrike({targetCount:5,targetRolls:[6],impactD10:5}).hit,false);
 const cs=volleyPotentialStrike({targetCount:7,targetRolls:[7],volleyPrecisionDice:1,impactD10:10});
 assert.equal(cs.hit,true);assert.equal(cs.targetRoll,7);assert.equal(cs.impactTA,1);
 assert.deepEqual(volleyPotentialStrike({targetCount:7,targetRolls:[],volleyPrecisionDice:1}).pending,{type:'target-count-dice',die:'d10',count:1});
});
test('Volley ZD is d10 or target body-zone die if larger',()=>{assert.equal(volleyZoneDieSize(3),10);assert.equal(volleyZoneDieSize(20),20);});
test('Volley Missile hit reuses projectile Deflect/AR/AV/Injury pipeline',()=>{
 const loc={id:'flank',zone:'torso',locationShock:4,bleedingClass:0};
 const r=resolveVolleyMissileHit({location:loc,aspect:'point',impactDieRoll:8,weaponImpactModifier:4,rangeImpactModifier:-3,armourValue:3,armourReduction:4,shockSL:SL.S});
 assert.equal(r.strikeImpact,9);assert.equal(r.armourValueAfterReduction,0);assert.equal(r.effectiveImpact,9);assert.equal(r.injury.step3.injury.level,2);
});

import { meleeStrikeImpact,resolveMeleeStrikeHit } from '../src/rules/melee.js';
test('Melee strike impact combines die, weapon, STR, other and Impact TA before AV',()=>{
 assert.equal(meleeStrikeImpact({impactDieRoll:6,weaponImpactModifier:3,strengthImpactModifier:1,otherImpactModifier:2,impactTACount:2,impactTAValue:5}),22);
});
test('Successful Melee strike enters unified AR/AV/Injury pipeline and is not a projectile',()=>{
 const loc={id:'abdomen',zone:'torso',locationShock:4,bleedingClass:2};
 const r=resolveMeleeStrikeHit({location:loc,aspect:'edge',impactDieRoll:8,weaponImpactModifier:3,strengthImpactModifier:1,impactTACount:1,impactTAValue:5,armourValue:4,shockSL:SL.S});
 assert.equal(r.strikeImpact,17);assert.equal(r.effectiveImpact,13);assert.equal(r.injury.step3.injury.level,3);assert.equal(r.injury.impaled,false);
});

import { resolveAreaHit,areaEvadeShockModifier } from '../src/rules/area.js';
test('Area Evade S/CS modifies final Shock Index by -1/-2 and always makes evader prone',()=>{
 assert.equal(areaEvadeShockModifier(SL.S),-1);assert.equal(areaEvadeShockModifier(SL.CS),-2);assert.equal(areaEvadeShockModifier(SL.F),0);
 const s=resolveAreaHit({strikeImpact:10,areaAV:0,aspect:'fire',evadeDodgeSL:SL.S,shockSL:SL.S});
 assert.equal(s.injury.shock.index,8);assert.equal(s.injury.state,SHOCK_STATE.INC);assert.equal(s.evade.prone,true);
 const cs=resolveAreaHit({strikeImpact:10,areaAV:0,aspect:'fire',evadeDodgeSL:SL.CS,shockSL:SL.S});
 assert.equal(cs.injury.shock.index,7);assert.equal(cs.injury.state,SHOCK_STATE.STN);
});
test('Area attack skips location dice, uses Area AV and Location Shock 6 through unified Injury Sequence',()=>{
 const r=resolveAreaHit({strikeImpact:12,areaAV:4,aspect:'frost',shockSL:SL.S});
 assert.equal(r.effectiveImpact,8);assert.equal(r.injury.location.area,true);assert.equal(r.injury.step3.injury.level,2);assert.equal(r.injury.shock.index,8);
 assert.equal(r.injury.effect.affectsAllImpairedTests,true);assert.equal(r.injury.effect.affectsMovement,true);
});

import { strengthImpactModifier,adjustedStrengthImpact,heftPenalty,twoHandedImpactBonus,specialStrikeMode } from '../src/rules/weapon-modes.js';
test('Strength Impact table and off-hand/thrown reductions match p97',()=>{
 assert.equal(strengthImpactModifier(1),-10);assert.equal(strengthImpactModifier(10),0);assert.equal(strengthImpactModifier(14),2);assert.equal(strengthImpactModifier(25),7);assert.equal(strengthImpactModifier(26),8);
 assert.equal(adjustedStrengthImpact({str:14,offHand:true}),1);assert.equal(adjustedStrengthImpact({str:14,thrown:true}),1);
});
test('Heft applies 2h -5 HFT, off-hand +5 HFT/min -10, with shield Block/Press exception',()=>{
 assert.deepEqual(heftPenalty({str:10,hft:13,twoHanded:true}),{effectiveHft:8,penalty:0});
 assert.deepEqual(heftPenalty({str:14,hft:10,offHand:true}),{effectiveHft:15,penalty:-10});
 assert.deepEqual(heftPenalty({str:9,hft:10,offHand:true,shieldBlockOrPress:true}),{effectiveHft:10,penalty:-5});
 assert.equal(twoHandedImpactBonus({str:13,listedHft:13,twoHanded:true,swung:true}),1);assert.equal(twoHandedImpactBonus({str:12,listedHft:13,twoHanded:true,swung:true}),0);
});
test('Half-sword transforms sword exactly and models ungauntleted CF gripping-hand injury',()=>{
 const r=specialStrikeMode({name:'Broadsword',group:'sword',length:5,zd:6,impact:{die:10,modifier:3},traits:{}},'half-sword');
 assert.equal(r.length,3);assert.equal(r.aspect,'point');assert.equal(r.traits.thrust,true);assert.equal(r.twoHanded,true);assert.equal(r.cfGripInjury.level,1);
 const estoc=specialStrikeMode({name:'Estoc',group:'sword',length:5,zd:6,impact:{die:8,modifier:3},traits:{}},'half-sword');assert.equal(estoc.cfGripInjury,null);
});
test('Handle and Shaft modes replace exact mode characteristics and traits',()=>{
 const h=specialStrikeMode({name:'Broadsword',group:'sword',length:5,traits:{block:5}},'handle');assert.equal(h.length,1);assert.equal(h.zd,6);assert.equal(h.impact.modifier,0);assert.equal(h.traits.block,-5);
 const s=specialStrikeMode({name:'Spear',group:'polearm',length:7,twoHanded:true,traits:{slow:true,thrust:true}},'shaft');assert.equal(s.length,5);assert.equal(s.zd,6);assert.equal(s.impact.modifier,1);assert.equal(s.traits.slow,undefined);assert.equal(s.traits.thrust,undefined);assert.equal(s.traits.melee,-5);
});

import { effectiveBaseRange,calculateMissileEML,grenadeDeviation,projectileHead } from '../src/rules/missile.js';
test('Missile EML uses range modifier once and exact p163 situational modifiers',()=>{
 const r=calculateMissileEML({ml:70,rangeModifier:10,targetMovement:'moving',movingShooter:true,weaponType:'bow',traumaPenalty:-5,aimedPreviousRound:true,targetTAR:2,attackType:'direct'});
 assert.equal(r.raw,75);assert.equal(r.parts.range,10);assert.equal(r.parts.massiveTarget,10);
});
test('Evading penalty is Dodge Index x5 and Moving Shooter does not apply to throwers',()=>{
 const r=calculateMissileEML({ml:60,targetMovement:'evading',effectiveDodgeIndex:7,movingShooter:true,weaponType:'thrown',str:12,hft:12});
 assert.equal(r.parts.target,-35);assert.equal(r.parts.movingShooter,0);assert.equal(r.raw,25);
});
test('Crosswind differs for Direct and Volley and Massive Target is Direct only',()=>{
 assert.equal(calculateMissileEML({ml:80,crosswind:true,windforce:3,attackType:'direct',targetTAR:3}).raw,65);
 assert.equal(calculateMissileEML({ml:80,crosswind:true,windforce:3,attackType:'volley',targetTAR:3}).raw,20);
});
test('Wet bow/crossbow halves Base Range before bands are derived',()=>{assert.equal(effectiveBaseRange({baseRange:80,wet:true,weaponType:'bow'}),40);assert.equal(effectiveBaseRange({baseRange:80,wet:true,weaponType:'thrown'}),80);});
test('Grenade deviation follows exact distance/SL table and CF is a mishap',()=>{
 assert.equal(grenadeDeviation({distance:30,sl:SL.F,dieRoll:2,directionD8:7}).deviationFt,10);
 assert.equal(grenadeDeviation({distance:60,sl:SL.S,dieRoll:2,directionD8:4}).deviationFt,10);
 assert.equal(grenadeDeviation({distance:90,sl:SL.CS,dieRoll:2,directionD8:2}).deviationFt,10);
 assert.equal(grenadeDeviation({distance:15,sl:SL.CF,criticalRoll:90}).mishap,'fumble');
});
test('Projectile heads preserve Bodkin AR/TA, Blunt final halving flag and Broad bleeding 5',()=>{
 assert.deepEqual(projectileHead('bodkin').armourReduction,{point:4});assert.deepEqual(projectileHead('bodkin').impactTA,{point:3});
 assert.equal(projectileHead('blunt').halveFinalImpact,true);assert.equal(projectileHead('broad').bleeding,5);
});

import {clenchAttempt,clenchedBite,constrictShock,constrictEscape,diveImpact,goreImpact,trample} from '../src/rules/animal-abilities.js';
import {resolveSameLocationFireFollowup} from '../src/rules/animal-abilities.js';
test('Clench requires successful bite then opposed d6+STR; maintained bite gets exact benefits',()=>{
 assert.equal(clenchAttempt({biteSucceeded:false}).eligible,false);assert.equal(clenchAttempt({biteSucceeded:true,animalSTR:14,targetSTR:12,animalD6:4,targetD6:3}).success,true);
 assert.deepEqual(clenchedBite(),{attackModifier:20,sameLocationOnSuccess:true,resistBreakSTRBonus:2});
});
test('Constrict maintained Grab causes SHK6 torso/SHK7 head and UNC dies on next failed Shock',()=>{
 assert.equal(constrictShock({zone:'torso',grabMaintained:true}).shockIndex,6);assert.equal(constrictShock({zone:'head',grabMaintained:true}).shockIndex,7);
 assert.equal(constrictShock({zone:'head',grabMaintained:true,targetUNC:true,shockFailed:true}).cardiacDeath,true);
 assert.equal(constrictEscape({armsPinned:true}).grabBreakAllowed,false);assert.equal(constrictEscape({armsPinned:false}).grabBreakAllowed,true);
});
test('Dive and Gore use trait bonuses only with their required Charge strikes',()=>{assert.equal(diveImpact({successfulTalon:true,flyingCharge:true}),5);assert.equal(diveImpact({successfulTalon:true,flyingCharge:false}),0);assert.equal(goreImpact({successfulTusk:true,charge:true}),4);assert.equal(goreImpact({successfulTusk:true,charge:true,impactBonus:5}),5);});
test('Trample is one free Kick over prone target during Charge/Move/Barge and ignores low aim',()=>{const r=trample({targetProne:true,movementAction:'charge'});assert.equal(r.eligible,true);assert.equal(r.countsAsAction,false);assert.equal(r.ignoreLowAim,true);assert.equal(r.chargeMayStillUseAttack,true);assert.equal(trample({targetProne:false,movementAction:'move'}).eligible,false);});

import {multipleBleederStaunchModifier} from '../src/rules/bleeding.js';
test('Multiple simultaneous bleeders impose cumulative -10 Staunch per bleeder beyond first',()=>{assert.equal(multipleBleederStaunchModifier(1),0);assert.equal(multipleBleederStaunchModifier(2),-10);assert.equal(multipleBleederStaunchModifier(4),-30);});

import {beginActionCommitment,abandonCommitmentForDefence,defenceDuringCommitment,effectiveMove,movementAllowance,doubleMovePolicy} from '../src/state/scheduler.js';
test('One-round and longer actions require concentration, Ignore defence and remove EZ until abandoned',()=>{const c=beginActionCommitment({kind:'1+-round',rounds:2,startRound:1,startIR:42});assert.equal(c.ignoreDefence,true);assert.equal(c.noEngagementZone,true);assert.equal(defenceDuringCommitment(c,{aware:true}).mayAbandon,true);const a=abandonCommitmentForDefence(c);assert.equal(a.ignoreDefence,false);assert.equal(a.abandoned,true);});
test('One-turn actions do not force Ignore throughout the ensuing round',()=>{const c=beginActionCommitment({kind:'1-turn',startRound:1,startIR:50});assert.equal(c.concentration,false);assert.equal(defenceDuringCommitment(c).forcedIgnore,false);});
test('Effective Move subtracts ENC, fatigue and impairment; below 5 means prone and unable to move',()=>{assert.equal(effectiveMove({move:50,encumbrance:10,fatigue:5,impairment:10}).feet,25);assert.deepEqual(effectiveMove({move:20,encumbrance:10,fatigue:5,impairment:2}),{feet:0,prone:true,immobile:true});});
test('Difficult Movement compounds and rounds down to nearest five or zero',()=>{assert.equal(movementAllowance({effectiveMoveFeet:50,rate:'half',difficultSources:0}),25);assert.equal(movementAllowance({effectiveMoveFeet:50,rate:'half',difficultSources:1}),10);assert.equal(movementAllowance({effectiveMoveFeet:50,rate:'half',difficultSources:2}),5);});
test('Double Move doubles distance, requires generally straight path, and accrues fatigue each round',()=>{assert.equal(movementAllowance({effectiveMoveFeet:45,rate:'double'}),90);assert.equal(doubleMovePolicy({generallyStraight:false}).stumbleRequired,true);assert.equal(doubleMovePolicy({generallyStraight:true}).fatigueAccruesThisRound,true);});

import {exportCombatState,importCombatState,validateCombatState} from '../src/state/persistence.js';
test('Combat persistence round-trip preserves pairwise relations, events, decisions and options',()=>{const s={schemaVersion:1,id:'c',round:4,activeIR:60,combatants:[{id:'a'},{id:'b'}],relations:{'a::b':{inClose:true}},events:[{id:'e',type:'shock',combatantId:'a',dueRound:5}],decisions:[{id:'d',type:'tight-quarters'}],options:{flanking:true},log:[]};const x=importCombatState(exportCombatState(s));assert.deepEqual(x,s);});
test('Combat export is canonical regardless of object insertion order',()=>{assert.equal(exportCombatState({b:2,a:1}),exportCombatState({a:1,b:2}));});
test('Combat import rejects schema mismatch and duplicate combatant UUID',()=>{assert.equal(validateCombatState({schemaVersion:99,combatants:[]}).valid,false);assert.throws(()=>importCombatState({schemaVersion:1,combatants:[{id:'a'},{id:'a'}]}));});
test('Combat import rejects dangling timed-event combatant references',()=>{assert.throws(()=>importCombatState({schemaVersion:1,combatants:[{id:'a'}],events:[{id:'e',combatantId:'b'}]}));});
test('Combat import rejects dangling pairwise relation references',()=>{assert.throws(()=>importCombatState({schemaVersion:1,combatants:[{id:'a'}],relations:{'a::b':{inClose:true}}}));});

import {kurbulPlateAVAdjustment,armourMaintenanceEffect,quickAreaAV,kurbulBreakage} from '../src/rules/armour-options.js';
test('Kurbul/Plate AV option makes limb pieces -1 AV and helms +1 AV only',()=>{assert.equal(kurbulPlateAVAdjustment({material:'plate',zone:'left-arm',optionEnabled:true}),-1);assert.equal(kurbulPlateAVAdjustment({material:'kurbul',zone:'head',optionEnabled:true}),1);assert.equal(kurbulPlateAVAdjustment({material:'mail',zone:'head',optionEnabled:true}),0);});
test('Armour Maintenance AQ -2 reduces AV; AQ -3 unwearable; AQ -4 destroyed',()=>{assert.equal(armourMaintenanceEffect(-2).avModifier,-1);assert.equal(armourMaintenanceEffect(-3).usable,false);assert.equal(armourMaintenanceEffect(-4).destroyed,true);assert.equal(armourMaintenanceEffect(-1).avModifier,0);});
test('Quick Area AV option is Thorax fire/frost AV minus one',()=>{assert.equal(quickAreaAV(7),6);});
test('Kurbul Breakage uses d10 + current AQ against ordinal excess TN',()=>{assert.equal(kurbulBreakage({ordinalExcess:2,currentAQ:0,d10:2}).destroyed,true);assert.equal(kurbulBreakage({ordinalExcess:2,currentAQ:1,d10:2}).destroyed,false);assert.equal(kurbulBreakage({ordinalExcess:4,currentAQ:-1,d10:5}).destroyed,true);});

import {MORALE,moraleEML,moraleResult,combineMoraleState,moraleActionPolicy,rallyResult,actionFatigueAccrual,actionFatiguePolicy,moraleDebtsAfterShockRecovery} from '../src/rules/morale.js';
test('Morale EML is Initiative with Aberrance -5 per ABE and Brave +20',()=>{assert.equal(moraleEML({initiativeML:70,aberrance:3}),55);assert.equal(moraleEML({initiativeML:70,aberrance:3,brave:true}),75);});
test('Morale CF0 is catatonic PSY2 while CF5 is routed PSY1',()=>{assert.equal(moraleResult({sl:SL.CF,roll:90}).state,MORALE.CATATONIC);assert.equal(moraleResult({sl:SL.CF,roll:95}).state,MORALE.ROUTED);assert.equal(moraleResult({sl:SL.CF,roll:90}).psycheStress,2);});
test('Morale F withdraws, S steadies and CS Brave grants +20 for five minutes',()=>{assert.equal(moraleResult({sl:SL.F,roll:81}).state,MORALE.WITHDRAWING);assert.equal(moraleResult({sl:SL.S,roll:31}).state,MORALE.STEADY);assert.deepEqual(moraleResult({sl:SL.CS,roll:25}),{state:MORALE.BRAVE,psycheStress:0,bonus:20,durationMinutes:5});});
test('Failed Morale retains only the most severe current state',()=>{assert.equal(combineMoraleState(MORALE.ROUTED,MORALE.WITHDRAWING),MORALE.ROUTED);assert.equal(combineMoraleState(MORALE.WITHDRAWING,MORALE.CATATONIC),MORALE.CATATONIC);});
test('Routed flees full Move and withdrawing retreats at half Move or higher',()=>{assert.equal(moraleActionPolicy(MORALE.ROUTED).rate,'full');assert.equal(moraleActionPolicy(MORALE.WITHDRAWING).minimumRate,'half');assert.equal(moraleActionPolicy(MORALE.CATATONIC).mayDefend,false);});
test('Rally CF/F lock out 5/1 minutes, S schedules Reaction, CS steadies immediately',()=>{assert.equal(rallyResult(SL.CF).lockoutMinutes,5);assert.equal(rallyResult(SL.F).lockoutMinutes,1);assert.equal(rallyResult(SL.S).reactionAtEndNextTurn,true);assert.equal(rallyResult(SL.CS).steadyImmediately,true);});
test('Action Fatigue accrues PF with successful END SR reducing accrual by 5',()=>{assert.equal(actionFatigueAccrual({personalFatigue:15,enduranceSR:false}),15);assert.equal(actionFatigueAccrual({personalFatigue:15,enduranceSR:true}),10);assert.equal(actionFatigueAccrual({personalFatigue:5,enduranceSR:true}),0);});
test('Action Fatigue uses 5 minutes normally, 12 rounds intense, and every round for Double Move',()=>{assert.equal(actionFatiguePolicy({}).intervalRounds,60);assert.equal(actionFatiguePolicy({intenseFight:true,personalFatigue:15}).splitAtRound,6);assert.equal(actionFatiguePolicy({doubleMove:true}).intervalRounds,1);});

import {faceSublocation,uniqueLocationShock,uniqueMovementEffect,uniqueGrievousLegMelee,uniqueFaceDiscretion} from '../src/rules/injury-effects.js';
test('Face option d20 maps exact eye/nose/cheek/ear/mouth/jaw bands',()=>{assert.equal(faceSublocation(1),'eye');assert.equal(faceSublocation(4),'nose');assert.equal(faceSublocation(12),'cheek');assert.equal(faceSublocation(14),'ear');assert.equal(faceSublocation(16),'mouth');assert.equal(faceSublocation(20),'jaw');});
test('Unique Injury option gives SHK5 only to eye/nose face and groin sublocation',()=>{assert.equal(uniqueLocationShock({location:'face',sublocation:'eye',optionEnabled:true}),5);assert.equal(uniqueLocationShock({location:'face',sublocation:'cheek',optionEnabled:true}),null);assert.equal(uniqueLocationShock({location:'pelvis',sublocation:'groin',optionEnabled:true}),5);});
test('Unique Serious leg/torso movement: one blocks double, two block full and double',()=>{assert.equal(uniqueMovementEffect({optionEnabled:true,seriousLegOrTorsoCount:1}).maxRate,'full');assert.equal(uniqueMovementEffect({optionEnabled:true,seriousLegOrTorsoCount:2}).maxRate,'half');});
test('Unique Grievous leg/torso movement and one-leg Melee -20 plus Stumble are option-only',()=>{assert.equal(uniqueMovementEffect({optionEnabled:true,grievousLegCount:1}).crawl,true);assert.equal(uniqueMovementEffect({optionEnabled:true,grievousTorsoCount:2}).maxRate,'none');assert.deepEqual(uniqueGrievousLegMelee({optionEnabled:true,grievousLegCount:1}),{allowed:true,modifier:-20,forcedStumbleRoll:true});});
test('Unique cheek/social wording remains GM decision rather than automatic penalty',()=>{assert.ok(uniqueFaceDiscretion({optionEnabled:true,sublocation:'cheek',severity:'S'}).gmDecision);assert.ok(uniqueFaceDiscretion({optionEnabled:true,sublocation:'jaw',severity:'G'}).gmDecision);});

import {creatureAimVsHuman,naturalWeaponReach,eludingStrike} from '../src/rules/positioning.js';
test('Tiny creature aim vs upright human is ZN8-10; ZN2-3 only against human Punch/Grab',()=>{assert.equal(creatureAimVsHuman({size:'tiny',zoneNumber:9}).defaultAim,true);assert.equal(creatureAimVsHuman({size:'tiny',zoneNumber:2}).available,false);assert.equal(creatureAimVsHuman({size:'tiny',zoneNumber:2,humanUsingPunchOrGrab:true}).available,true);});
test('Small creature aim permits ZN6-7 at -10 and medium permits ZN4-7 at -10',()=>{assert.equal(creatureAimVsHuman({size:'small',zoneNumber:6}).aimPenalty,-10);assert.equal(creatureAimVsHuman({size:'medium',zoneNumber:5}).aimPenalty,-10);});
test('Medium ZN2-3 is -10 and -1 RCH except against human Punch/Grab',()=>{assert.deepEqual(creatureAimVsHuman({size:'medium',zoneNumber:2}),{available:true,aimPenalty:-10,reachAdjustment:-1,defaultAim:false});assert.equal(creatureAimVsHuman({size:'medium',zoneNumber:2,humanUsingPunchOrGrab:true}).aimPenalty,0);});
test('Flying creature can select any human ZN; larger creatures default ZN1 and take -10 for ZN2-10',()=>{assert.equal(creatureAimVsHuman({size:'tiny',zoneNumber:1,flying:true}).available,true);assert.equal(creatureAimVsHuman({size:'large',zoneNumber:1}).aimPenalty,0);assert.equal(creatureAimVsHuman({size:'huge',zoneNumber:8}).aimPenalty,-10);});
test('Natural weapon Reach includes anatomy and Eluding misses when ZD exceeds target ZN',()=>{assert.equal(naturalWeaponReach({baseReach:1,anatomyBonus:3}),4);assert.equal(eludingStrike({zoneDieRoll:5,targetZN:3}).eluded,true);assert.equal(eludingStrike({zoneDieRoll:3,targetZN:3}).hit,true);});

import {flyingRateAllowed,flyingStumbleFailure,groundedFlyerMove,wingInjuryEffect,diveMovement} from '../src/rules/flying.js';
test('Flying slowest forward rate is half Move; dive permits double Move',()=>{assert.equal(flyingRateAllowed('half'),true);assert.equal(flyingRateAllowed('quarter'),false);assert.equal(diveMovement().rate,'double');});
test('Failed flying Stumble reduces next rate double->full->half',()=>{assert.equal(flyingStumbleFailure({currentRate:'double',halfMoveFeet:30}).nextRate,'full');assert.equal(flyingStumbleFailure({currentRate:'full',halfMoveFeet:30}).nextRate,'half');});
test('Failed flying Stumble at half Move loses altitude equal to half Move',()=>{assert.equal(flyingStumbleFailure({currentRate:'half',halfMoveFeet:30}).altitudeLossFt,30);});
test('Grounded flyer walks at one-tenth flying Move unless explicit walking Move exists',()=>{assert.equal(groundedFlyerMove({flyingMove:120}),12);assert.equal(groundedFlyerMove({flyingMove:120,explicitWalkingMove:25}),25);});
test('Wing M/S impair all tests and Move; one G grounds and two G cause fall',()=>{assert.equal(wingInjuryEffect({serious:1}).impairsAllTestsAndMove,true);assert.equal(wingInjuryEffect({grievous:1}).grounded,true);assert.equal(wingInjuryEffect({grievous:1}).falls,false);assert.equal(wingInjuryEffect({grievous:2}).falls,true);});

import {oversizedTargetZone,hardCoverStrike} from '../src/rules/positioning.js';
test('Oversized Target Zone option activates at zone ZN >= twice weapon ZD and replaces LD with placeable d6',()=>{assert.deepEqual(oversizedTargetZone({optionEnabled:true,zoneZNCount:16,weaponZDSize:6}),{active:true,locationDie:'d6',placeableWithinLN1to10:true});assert.equal(oversizedTargetZone({optionEnabled:true,zoneZNCount:10,weaponZDSize:6}).active,false);assert.equal(oversizedTargetZone({optionEnabled:false,zoneZNCount:20,weaponZDSize:6}).active,false);});
test('Hard cover makes a successful strike to a protected body location inflict no target impact',()=>{assert.deepEqual(hardCoverStrike({locationProtected:true,strikeImpact:18}),{targetImpact:0,deflectedByCover:true});assert.equal(hardCoverStrike({locationProtected:false,strikeImpact:18}).targetImpact,18);});

import {aberrantMoraleOption,attenuatedABE,groupABE,relativeABE} from '../src/rules/aberrance-options.js';
test('Aberrant Morale option ignores up to ABE triggers and gives ABE x5 Morale bonus when rolling',()=>{assert.deepEqual(aberrantMoraleOption({abe:3,triggersAlreadyIgnored:1}),{mayIgnoreTrigger:true,moraleBonus:15,remainingIgnoredTriggers:2});assert.equal(aberrantMoraleOption({abe:3,triggersAlreadyIgnored:3}).mayIgnoreTrigger,false);});
test('Attenuated ABE loses one per successful Fear Roll and two per CS',()=>{assert.equal(attenuatedABE({baseABE:5,successfulFearRolls:[SL.S,SL.CS,SL.F]}),2);assert.equal(attenuatedABE({baseABE:2,successfulFearRolls:[SL.CS,SL.CS]}),0);});
test('Group ABE uses only base ABE regardless of creature count',()=>{assert.equal(groupABE(3),3);});
test('Relative ABE reduces source ABE by occupational/cultural immunity amount to minimum zero',()=>{assert.equal(relativeABE({baseABE:5,immunityAmount:2}),3);assert.equal(relativeABE({baseABE:1,immunityAmount:3}),0);});

import {ALERTNESS,opposedSurprise,unopposedAwarenessSurprise,alertnessLimits,reactionResult} from '../src/rules/alertness.js';
test('Opposed Surprise uses SL gap: winner aware, loser confused or unaware at two-plus steps',()=>{
  assert.deepEqual(opposedSurprise({aSL:SL.S,bSL:SL.F}),{a:'aware',b:'confused',tie:false});
  assert.deepEqual(opposedSurprise({aSL:SL.CS,bSL:SL.F}),{a:'aware',b:'unaware',tie:false});
});
test('Opposed Surprise ties make both aware on tied successes and confused on tied failures',()=>{
  assert.deepEqual(opposedSurprise({aSL:SL.S,bSL:SL.S}),{a:'aware',b:'aware',tie:true});
  assert.deepEqual(opposedSurprise({aSL:SL.F,bSL:SL.F}),{a:'confused',b:'confused',tie:true});
});
test('Unopposed Awareness maps CF/F/S/CS exactly and CS alerts before concealed actor acts',()=>{
  assert.equal(unopposedAwarenessSurprise(SL.CF).state,ALERTNESS.UNAWARE);
  assert.equal(unopposedAwarenessSurprise(SL.F).state,ALERTNESS.CONFUSED);
  assert.equal(unopposedAwarenessSurprise(SL.S).state,ALERTNESS.AWARE);
  assert.equal(unopposedAwarenessSurprise(SL.CS).awareBeforeOpponentActs,true);
});
test('Confused may only Block with readied weapon or Dodge, must Pass, and earns no TA',()=>{
  const r=alertnessLimits(ALERTNESS.CONFUSED);assert.deepEqual(r.defences,['block-readied','dodge']);assert.equal(r.forcedAction,'pass');assert.equal(r.mayEarnTA,false);assert.equal(r.reactionTiming,'end-turn');
});
test('Unaware must Ignore, takes no actions, and gets immediate Reaction once alerted',()=>{
  const r=alertnessLimits(ALERTNESS.UNAWARE);assert.deepEqual(r.defences,['ignore']);assert.equal(r.mayAct,false);assert.equal(r.immediateReactionWhenAlerted,true);
});
test('Reaction success makes combatant aware for next turn; failure continues Confused',()=>{
  assert.deepEqual(reactionResult({sl:SL.S,currentState:ALERTNESS.CONFUSED}),{state:'aware',mayActNormallyNextTurn:true,repeatNextTurn:false});
  assert.deepEqual(reactionResult({sl:SL.F,currentState:ALERTNESS.CONFUSED}),{state:'confused',mayActNormallyNextTurn:false,repeatNextTurn:true});
});
test('Immediate Reaction after alerting an Unaware combatant maps failure to Confused and success to Aware',()=>{
  assert.equal(reactionResult({sl:SL.CF,currentState:ALERTNESS.UNAWARE,immediateAfterAlert:true}).state,'confused');
  assert.equal(reactionResult({sl:SL.CS,currentState:ALERTNESS.UNAWARE,immediateAfterAlert:true}).state,'aware');
});

import {engagementZoneFeet,engagementZoneSpaces,exudesEngagementZone,mayThreaten,mayMeleeStrike,movementOnEnteringThreateningEZ,mayLeaveThreateningEZAtTurnStart,initiativeTieOrder} from '../src/rules/engagement.js';
test('Engagement Zone is max of weapon Reach and 5 feet; map spaces use the exact p159 bands',()=>{
  assert.equal(engagementZoneFeet(3),5);assert.equal(engagementZoneFeet(12),12);assert.equal(engagementZoneSpaces(7),1);assert.equal(engagementZoneSpaces(8),2);assert.equal(engagementZoneSpaces(13),3);
});
test('Only aware non-helpless non-concentrating combatants exude EZ and may threaten reachable foes',()=>{
  assert.equal(exudesEngagementZone({alertness:'confused'}),false);assert.equal(exudesEngagementZone({alertness:'aware',concentratingMultiRound:true}),false);
  assert.equal(mayThreaten({alertness:'aware',targetInEZ:true,choosesThreat:true}),true);assert.equal(mayThreaten({alertness:'aware',targetInEZ:true,choosesThreat:true,weaponReachImpeded:true}),false);
});
test('Melee strike requires aware striker, readied weapon and a threatened target',()=>{
  assert.equal(mayMeleeStrike({alertness:'aware',readiedWeapon:true,targetThreatened:true}),true);assert.equal(mayMeleeStrike({alertness:'confused',readiedWeapon:true,targetThreatened:true}),false);
});
test('Entering an elected threatening EZ stops movement; threatened character may leave an EZ at start of own turn',()=>{
  assert.equal(movementOnEnteringThreateningEZ({entered:true,opponentCanThreaten:true,opponentChoosesThreat:true}).mustStop,true);assert.equal(mayLeaveThreateningEZAtTurnStart({atStartOfTurn:true}),true);
});
test('Initiative ties use higher Awareness EML then PC before NPC, leaving same-side ties to player/GM choice',()=>{
  assert.equal(initiativeTieOrder({awarenessEML:70,isPC:false},{awarenessEML:60,isPC:true}),-1);assert.equal(initiativeTieOrder({awarenessEML:60,isPC:true},{awarenessEML:60,isPC:false}),-1);assert.equal(initiativeTieOrder({awarenessEML:60,isPC:true},{awarenessEML:60,isPC:true}),0);
});
test('Initiative Reaction Roll is represented as an explicit combat option and defaults off',()=>{assert.equal(CombatState().options.initiativeReactionRoll,false);});

import {chargeEligibility,chargeAttackChoice,bargeEligibility,evadeAction,moveAction,freeActionAllowance,fiveFootFreeMove,readyActionEligibility,resolveReadiedAction} from '../src/rules/actions.js';
test('Charge requires unthreatened start, grants half Move, thrown only if still unthreatened and melee against engaged target',()=>{
  assert.equal(chargeEligibility({threatenedAtTurnStart:true}),false);const r=chargeAttackChoice({threatenedAfterMovement:false,targetEngaged:true});assert.equal(r.mayThrownAttack,true);assert.equal(r.mayMeleeAttack,true);assert.equal(r.movement,'half');
});
test('Barge is available only after Melee Attack leaves actor unthreatened and is half Move as Difficult Movement',()=>{
  assert.deepEqual(bargeEligibility({threatenedAfterMeleeAttack:false}),{eligible:true,movement:'half',difficultMovement:true,stopAtThreateningEZ:true});assert.equal(bargeEligibility({threatenedAfterMeleeAttack:true}).eligible,false);
});
test('Evade requires not stunned and 10 feet through half Move, prevents melee strikes and applies Dodge-index missile penalty',()=>{
  const r=evadeAction({stunned:false,distanceFt:20,halfMoveFt:25,effectiveDodgeIndex:7});assert.equal(r.legal,true);assert.equal(r.missilePenalty,-35);assert.equal(r.mayMeleeStrike,false);assert.equal(evadeAction({stunned:true,distanceFt:20,halfMoveFt:25}).legal,false);
});
test('Move may go to double effective Move and non-straight double Move requires Stumble',()=>{const r=moveAction({effectiveMove:45,rate:'double'});assert.equal(r.maxDistanceFt,90);assert.equal(r.stumbleIfDoubleNotStraight,true);});
test('Only one free action occurs before a 1-turn action; none accompanies one-round-or-longer action',()=>{
  assert.equal(freeActionAllowance({}).allowed,true);assert.equal(freeActionAllowance({alreadyUsedFree:true}).allowed,false);assert.equal(freeActionAllowance({mainActionTime:'1-round'}).allowed,false);assert.equal(freeActionAllowance({mainActionStarted:true}).allowed,false);
});
test('Five-foot free move works inside EZ but cannot precede Charge Evade or Move movement',()=>{assert.equal(fiveFootFreeMove({mainAction:'attack'}).allowed,true);assert.equal(fiveFootFreeMove({mainAction:'charge'}).allowed,false);});
test('Only 1-turn Attack Grope Move may be readied; readied Move is capped at half Move',()=>{
  assert.equal(readyActionEligibility({action:'attack'}).allowed,true);assert.equal(readyActionEligibility({action:'move'}).maxMove,'half');assert.equal(readyActionEligibility({action:'pass'}).allowed,false);assert.equal(readyActionEligibility({action:'attack',time:'1-round'}).allowed,false);
});
test('Resolved readied action interrupts and permanently changes actor IR to trigger IR',()=>assert.deepEqual(resolveReadiedAction({oldIR:70,triggerIR:55}),{interrupts:true,newIR:55,previousIR:70}));

import {combatMishap} from '../src/rules/mishaps.js';
test('Natural combat CF uses CF0 Fumble / CF5 Stumble, but downgraded F->CF uses even/odd units parity',()=>{
  assert.equal(combatMishap({finalSL:SL.CF,roll:80,naturalSL:SL.CF}),'fumble');assert.equal(combatMishap({finalSL:SL.CF,roll:85,naturalSL:SL.CF}),'stumble');assert.equal(combatMishap({finalSL:SL.CF,roll:82,naturalSL:SL.F}),'fumble');assert.equal(combatMishap({finalSL:SL.CF,roll:83,naturalSL:SL.F}),'stumble');
});
test('Dodge CF always Stumbles even when downgraded F->CF has an even units digit',()=>assert.equal(combatMishap({finalSL:SL.CF,roll:82,naturalSL:SL.F,dodge:true}),'stumble'));
import {vanquishedStatus,groupCohesionTrigger,moraleTriggers} from '../src/rules/morale.js';
test('Vanquished core states are recognized; disarmed vs armed foes remains GM judgement',()=>{
  assert.equal(vanquishedStatus({state:'incapacitated'}).vanquished,true);assert.equal(vanquishedStatus({preventsMovementOrAggression:true}).vanquished,true);assert.equal(vanquishedStatus({disarmedAgainstArmedFoes:true}).vanquished,null);
});
test('Group cohesion triggers when at least half the remaining ally cohort is vanquished and can recur at lower thresholds',()=>{
  let r=groupCohesionTrigger({remainingAlliesAtLastThreshold:6,newlyVanquished:3});assert.equal(r.triggered,true);assert.equal(r.nextRemaining,3);r=groupCohesionTrigger({remainingAlliesAtLastThreshold:r.nextRemaining,newlyVanquished:2});assert.equal(r.triggered,true);assert.equal(r.threshold,2);
});
test('Serious/Grievous injury Morale waits until full Shock State recovery; special triggers stay explicit GM-defined triggers',()=>{
  assert.deepEqual(moraleTriggers({injurySeverity:'S',recoveredFromShock:false}),[]);assert.deepEqual(moraleTriggers({injurySeverity:'G',recoveredFromShock:true}),['impairment']);assert.equal(moraleTriggers({special:['leader-vanquished']})[0].gmDefined,true);
});
test('Melee outcome honors downgraded F->CF mishap parity when naturalSL is supplied',()=>{
  const r=resolveMeleeOutcome({attacker:{sl:SL.CF,naturalSL:SL.F,roll:82,ml:60},defence:DEFENCE.IGNORE});assert.equal(r.attackerMishap,'fumble');
});

import {FEAR,fearEML,fearResult,fearActionPolicy,fearRecovery,aberranceInitiativeEML} from '../src/rules/fear.js';
test('Fear EML is Will minus ABE x5, with Brave +20',()=>assert.equal(fearEML({willML:55,aberrance:2,brave:true}),65));
test('Fear CF0 is catatonic PSY 2+ABE; CF5 terrified PSY 1+ABE',()=>{
  assert.deepEqual(fearResult({sl:SL.CF,roll:80,aberrance:2}),{state:'catatonic',psycheStress:4,recoveryTest:'will',reactionTiming:'end-next-turn'});assert.equal(fearResult({sl:SL.CF,roll:85,aberrance:2}).psycheStress,3);
});
test('Fear F/S/CS apply exact ABE stress and Brave five-minute bonus',()=>{
  assert.equal(fearResult({sl:SL.F,roll:81,aberrance:3}).psycheStress,3);assert.equal(fearResult({sl:SL.S,roll:41,aberrance:3}).psycheStress,1);assert.deepEqual(fearResult({sl:SL.CS,roll:40,aberrance:3}),{state:'brave',psycheStress:0,bonus:20,durationMinutes:5});
});
test('Terrified and Afraid may only Block/Dodge; terrified flees full Move while afraid Passes or moves away',()=>{
  assert.equal(fearActionPolicy(FEAR.TERRIFIED).rate,'full');assert.deepEqual(fearActionPolicy(FEAR.AFRAID).actions,['pass','move-away']);
});
test('Catatonic Fear Will success improves only to Terrified; Afraid success becomes Steady',()=>{
  assert.equal(fearRecovery({state:FEAR.CATATONIC,willSL:SL.S}).state,FEAR.TERRIFIED);assert.equal(fearRecovery({state:FEAR.AFRAID,willSL:SL.CS}).state,FEAR.STEADY);
});
test('Aberrance penalty applies to Initiative Reaction/Morale tests as well as Fear Will tests',()=>assert.equal(aberranceInitiativeEML({initiativeML:60,aberrance:2}),50));

import {fumbleTestPolicy,stumbleTestPolicy,droppedItemRecovery} from '../src/rules/mishaps.js';
test('Fumble tests DEX or Legerdemain; no DEX/non-DEX action converts Fumble to Stumble',()=>{
  assert.equal(fumbleTestPolicy({}).test,'dexterity');assert.equal(fumbleTestPolicy({useLegerdemain:true}).test,'legerdemain');assert.equal(fumbleTestPolicy({hasDEX:false}).convertedTo,'stumble');assert.equal(fumbleTestPolicy({actionUsesDEX:false}).convertedTo,'stumble');
});
test('Stumble tests AGL or Acrobatics; failed legless Stumble means Pass next turn instead of prone',()=>{
  assert.equal(stumbleTestPolicy({}).onFailure,'prone');assert.equal(stumbleTestPolicy({useAcrobatics:true}).test,'acrobatics');assert.equal(stumbleTestPolicy({hasLegs:false}).onFailure,'pass-next-turn');
});
test('Dropped item is a 1-turn Grope; while threatened it additionally requires successful Melee or turn ends',()=>{
  assert.equal(droppedItemRecovery({threatened:false}).pickedUp,true);assert.equal(droppedItemRecovery({threatened:true}).pending.type,'melee-test');assert.equal(droppedItemRecovery({threatened:true,meleeSuccess:false}).turnEnds,true);
});
import {openingCrossbowOrder} from '../src/rules/engagement.js';
test('Aware loaded crossbow archers shoot before regular opening IR sequence, ordered by IR',()=>{
 const r=openingCrossbowOrder([{id:'a',aware:true,loadedCrossbow:true,initiativeRank:40},{id:'b',aware:true,loadedCrossbow:true,initiativeRank:70},{id:'c',aware:false,loadedCrossbow:true,initiativeRank:90}]);assert.deepEqual(r.map(x=>x.id),['b','a']);
});

import {missileActionContract,abandonIgnoreMissileActionToDefend} from '../src/rules/missile.js';
test('Bow Aim is one round Ignore and requires Pull to exceed Draw by at least 75',()=>{
 assert.equal(missileActionContract({weaponType:'bow',action:'aim',pull:175,draw:100}).allowed,true);assert.equal(missileActionContract({weaponType:'bow',action:'aim',pull:174,draw:100}).allowed,false);
});
test('Crossbow Span preserves mechanical round count and Load remains a separate one-round Ignore action',()=>{
 assert.equal(missileActionContract({weaponType:'crossbow',action:'span',spanRounds:4}).rounds,4);assert.equal(missileActionContract({weaponType:'crossbow',action:'load'}).time,'1-round');
});
test('Accessible projectile can Load as free action with possible DEX/Missile test choice',()=>{
 const r=missileActionContract({weaponType:'bow',action:'load',projectileAccessible:'hand'});assert.equal(r.time,'free');assert.deepEqual(r.testChoice,['dexterity','missile']);
});
test('Shoot allows half Move; normal Throw no movement; thrown Charge allows half Move and requires target at least 5 feet away',()=>{
 assert.equal(missileActionContract({weaponType:'bow',action:'shoot'}).movement,'half');assert.equal(missileActionContract({weaponType:'thrown',action:'throw'}).movement,'none');assert.equal(missileActionContract({weaponType:'thrown',action:'charge'}).minimumTargetDistanceFt,5);
});
test('Aware combatant may abandon an Ignore-inducing missile action to defend normally, losing the action',()=>{
 assert.deepEqual(abandonIgnoreMissileActionToDefend({aware:true,actionDefence:'ignore'}),{mayAbandon:true,actionLost:true,defenceAfterAbandon:'any'});assert.equal(abandonIgnoreMissileActionToDefend({aware:false,actionDefence:'ignore'}).mayAbandon,false);
});


import {engagementZoneSpaces as ezSpacesExact,initiativeRankSource,spiritWorldTieOrder} from '../src/rules/engagement.js';
test('Engagement Zone map conversion follows exact p159 bands, including RCH 7/8 and 12/13 boundaries',()=>{
 assert.equal(ezSpacesExact(0),1);assert.equal(ezSpacesExact(7),1);assert.equal(ezSpacesExact(8),2);assert.equal(ezSpacesExact(12),2);assert.equal(ezSpacesExact(13),3);assert.equal(ezSpacesExact(17),3);assert.equal(ezSpacesExact(18),4);
});
test('Spirit-world entities or combatants lacking Initiative use Spirit ML for Initiative Rank',()=>{
 assert.deepEqual(initiativeRankSource({initiativeML:60,spiritML:75}),{initiativeRank:60,source:'initiative-ml'});assert.deepEqual(initiativeRankSource({initiativeML:60,spiritML:75,inhabitsSpiritWorld:true}),{initiativeRank:75,source:'spirit-ml'});assert.deepEqual(initiativeRankSource({spiritML:55}),{initiativeRank:55,source:'spirit-ml'});
});
test('Astralscape Initiative ties use Empathy EML before PC/NPC residual ordering',()=>{
 assert.equal(spiritWorldTieOrder({empathyEML:70,isPC:false},{empathyEML:60,isPC:true},{astralscape:true}),-1);assert.equal(spiritWorldTieOrder({empathyEML:60,isPC:true},{empathyEML:60,isPC:false},{astralscape:true}),-1);
});

import {meleeDefenceDeclaration,weaponReadyAction} from '../src/rules/melee.js';
test('Melee declaration forces Ignore for unaware/helpless targets and voluntary Ignore lasts one round',()=>{
 assert.equal(meleeDefenceDeclaration({defence:'block',alertness:'unaware',blockWeaponReadied:true}).allowed,false);assert.deepEqual(meleeDefenceDeclaration({defence:'ignore',helpless:true}),{allowed:true,forced:'ignore',ignoreDurationRounds:1});assert.equal(meleeDefenceDeclaration({defence:'ignore'}).ignoreDurationRounds,1);
});
test('Confused defenders may only Dodge or Block with a readied weapon; Evade likewise permits only Block/Dodge',()=>{
 assert.equal(meleeDefenceDeclaration({defence:'block',alertness:'confused',blockWeaponReadied:false}).allowed,false);assert.equal(meleeDefenceDeclaration({defence:'block',alertness:'confused',blockWeaponReadied:true}).allowed,true);assert.equal(meleeDefenceDeclaration({defence:'counterstrike',alertness:'confused',counterstrikeWeaponReadied:true}).allowed,false);assert.equal(meleeDefenceDeclaration({defence:'counterstrike',evading:true,counterstrikeWeaponReadied:true}).allowed,false);
});
test('Block, Dodge and Counterstrike preserve their exact readied-weapon declaration requirements',()=>{
 assert.equal(meleeDefenceDeclaration({defence:'block',blockWeaponReadied:true}).reachReferenceMayDiffer,true);assert.equal(meleeDefenceDeclaration({defence:'dodge',reachReferenceReadied:false}).allowed,false);assert.equal(meleeDefenceDeclaration({defence:'dodge',reachReferenceReadied:true}).allowed,true);assert.equal(meleeDefenceDeclaration({defence:'counterstrike',counterstrikeWeaponReadied:true}).requiresZoneOptions,true);
});
test('Melee ready-weapon actions distinguish unsheathe, unsling, resheath/resling and free dropping',()=>{
 assert.deepEqual(weaponReadyAction('unsheathe'),{time:'free',readiedAfter:true});assert.equal(weaponReadyAction('unsling').time,'1-turn');assert.equal(weaponReadyAction('resling').readiedAfter,false);assert.equal(weaponReadyAction('drop').mayOccurAnyTime,true);
});

import {personalFatigue,totalFatigue,fatigueTestPenalty,fatigueAccrual,windednessRecovery,wearinessRecovery,weaknessRecovery} from '../src/rules/fatigue.js';
test('Personal Fatigue is ENC +5 and all three fatigue classes sum into one global fatigue amount',()=>{
 assert.equal(personalFatigue(7),12);assert.equal(totalFatigue({windedness:5,weariness:10,weakness:15}),30);
});
test('Fatigue penalizes success tests but not END SR, Secondary Mastery, or Spirit of an active soul in spirit world',()=>{
 assert.equal(fatigueTestPenalty({fatigue:20,testKind:'melee'}),-20);assert.equal(fatigueTestPenalty({fatigue:20,testKind:'endurance-secondary-roll'}),0);assert.equal(fatigueTestPenalty({fatigue:20,testKind:'secondary-modifier'}),0);assert.equal(fatigueTestPenalty({fatigue:20,testKind:'secondary-roll'}),0);assert.equal(fatigueTestPenalty({fatigue:20,testKind:'spirit',activeSoulInSpiritWorld:true}),0);assert.equal(fatigueTestPenalty({fatigue:20,testKind:'spirit',activeSoulInSpiritWorld:false}),-20);
});
test('Applicable successful END SR reduces each fatigue accrual by 5 but never below zero',()=>{
 assert.equal(fatigueAccrual({amount:15,enduranceSRApplicable:true,enduranceSRSuccess:true}),10);assert.equal(fatigueAccrual({amount:5,enduranceSRApplicable:true,enduranceSRSuccess:true}),0);assert.equal(fatigueAccrual({amount:10,enduranceSRApplicable:false,enduranceSRSuccess:true}),10);
});
test('Windedness recovery is 5 per qualifying 10-minute rest, at most once per hour',()=>{
 assert.deepEqual(windednessRecovery({current:10,restMinutes:10}),{remaining:5,recovered:5,consumesHourlyRest:true});assert.equal(windednessRecovery({current:10,restMinutes:20,restUsedThisHour:true}).recovered,0);
});
test('Weariness recovery preserves separate daily 4-hour rest and 8-hour sleep allowances; weakness has no automatic recovery',()=>{
 assert.equal(wearinessRecovery({current:25,restHours:4}).recovered,5);assert.equal(wearinessRecovery({current:25,sleepHours:8}).recovered,15);assert.equal(wearinessRecovery({current:25,restHours:4,sleepHours:8}).recovered,20);assert.equal(weaknessRecovery().automatic,false);
});

import {strengthEncumbranceModifier,gearEncumbrance,modifiedEncumbrance,encumbranceTestPenalty,bulkPenalty} from '../src/rules/encumbrance.js';
test('STR Encumbrance modifier follows p112 bands and mounted use improves the modifier by 15',()=>{
 assert.equal(strengthEncumbranceModifier(5),15);assert.equal(strengthEncumbranceModifier(8),5);assert.equal(strengthEncumbranceModifier(12),-5);assert.equal(strengthEncumbranceModifier(18),-20);assert.equal(strengthEncumbranceModifier(22),-30);assert.equal(strengthEncumbranceModifier(12,{mounted:true}),-20);
});
test('Gear ENC is 5 per 20 full effective pounds and awkward/poorly-stowed weight counts double',()=>{
 assert.equal(gearEncumbrance(19),0);assert.equal(gearEncumbrance(20),5);assert.equal(gearEncumbrance(39),5);assert.equal(gearEncumbrance(40),10);assert.equal(gearEncumbrance(0,{awkwardWeightLb:10}),5);assert.equal(gearEncumbrance(10,{awkwardWeightLb:10}),5);
});
test('Final ENC adds armour+gear then STR adjustment, never below zero; low STR does not raise base ENC0',()=>{
 assert.equal(modifiedEncumbrance({armourENC:10,gearENC:5,str:12}),10);assert.equal(modifiedEncumbrance({armourENC:10,gearENC:5,str:18}),0);assert.equal(modifiedEncumbrance({armourENC:0,gearENC:0,str:8}),0);assert.equal(modifiedEncumbrance({armourENC:5,gearENC:0,str:8}),10);
});
test('ENC penalizes Move, Agility and skills with Agility in SB; Bulk independently penalizes tests requiring violated zones',()=>{
 assert.equal(encumbranceTestPenalty({encumbrance:10,testKind:'agility'}),-10);assert.equal(encumbranceTestPenalty({encumbrance:10,testKind:'melee',skillBaseIncludesAgility:true}),-10);assert.equal(encumbranceTestPenalty({encumbrance:10,testKind:'initiative'}),0);assert.equal(bulkPenalty({violatingZones:['arms','torso'],requiredZones:['arms','torso']}),-10);assert.equal(bulkPenalty({violatingZones:['arms','torso'],requiredZones:['legs']}),0);
});

import {movementAttributeAverage,moveModifierFromAverage,baseMove,evasionFromDodgeEML} from '../src/rules/movement.js';
test('Move attribute average rounds upward only when AGL is greater than STR',()=>{
 assert.equal(movementAttributeAverage({agility:13,strength:12}),13);assert.equal(movementAttributeAverage({agility:12,strength:13}),12);assert.equal(movementAttributeAverage({agility:12,strength:12}),12);
});
test('Move modifier follows p56 bands and human-sized/Kuzhai bases are 50/30',()=>{
 assert.equal(moveModifierFromAverage(5),-15);assert.equal(moveModifierFromAverage(10),0);assert.equal(moveModifierFromAverage(15),10);assert.equal(moveModifierFromAverage(21),25);assert.equal(baseMove({agility:12,strength:12}).move,55);assert.equal(baseMove({agility:12,strength:12,folk:'kuzhai'}).move,35);
});
test('Evasion equals Effective Dodge Index x5',()=>{assert.equal(evasionFromDodgeEML(79),35);assert.equal(evasionFromDodgeEML(80),40);});

import { healingBase,treatmentDelayModifier,treatmentEML,mayAttemptAdditionalTreatment,chooseTreatmentResult,capGrievousHealingRate,isGrimWound,injuryHealingEML,healingFailureIsCritical,resolveInjuryHealingRoll,severityFromInjuryLevel as healingSeverityFromInjuryLevel,infectionInitialHR,infectionCourseEML,infectionWeaknessFatigue,resolveInfectionCourse,indefiniteHealingImpairment,permanentHealingImpairment,effectiveHealingImpairment,resolveBloodLossHealing,scheduleInjuryHealing,scheduleInfectionCourse,scheduleBloodLossHealing,HEALING_ROUNDS_PER_DAY } from '../src/rules/healing.js';

test('Healing Base follows END/WIL directional half rounding',()=>{
 assert.equal(healingBase({endurance:13,will:12}),13);
 assert.equal(healingBase({endurance:12,will:13}),12);
 assert.equal(healingBase({endurance:12,will:10}),11);
});
test('Treatment EML applies difficulty, -5/day delay, secondary modifier and Area -20',()=>{
 assert.equal(treatmentDelayModifier(3),-15);
 assert.equal(treatmentEML({physicianML:70,treatmentDifficulty:-10,daysSinceInjury:2,secondaryModifier:5,area:true}),35);
});
test('Multiple Treatment Rolls require strictly increasing Physician Index and any CF supersedes',()=>{
 assert.equal(mayAttemptAdditionalTreatment({physicianIndex:5,previousPhysicianIndexes:[3,4]}),true);
 assert.equal(mayAttemptAdditionalTreatment({physicianIndex:4,previousPhysicianIndexes:[3,4]}),false);
 assert.equal(chooseTreatmentResult([{sl:SL.S,id:1},{sl:SL.CS,id:2}]).id,2);
 assert.equal(chooseTreatmentResult([{sl:SL.CS,id:1},{sl:SL.CF,id:2}]).id,2);
});
test('Grievous HR cap preserves CF floor and grim wounds follow CF/untreated/Area rules',()=>{
 assert.equal(capGrievousHealingRate({healingRate:5,physicianIndex:3,cfHealingRate:2}),3);
 assert.equal(capGrievousHealingRate({healingRate:4,physicianIndex:1,cfHealingRate:2}),2);
 assert.equal(isGrimWound({severity:'G',treatmentSL:SL.CF}),true);
 assert.equal(isGrimWound({severity:'G',untreated:true}),true);
 assert.equal(isGrimWound({severity:'G',area:true,injuryLevel:4,treatmentSL:SL.CS}),true);
});
test('Injury Healing Roll uses HB x HR and S/CS reduce Injury Level by 1/2',()=>{
 assert.equal(injuryHealingEML({healingBase:13,healingRate:4}),52);
 assert.deepEqual(resolveInjuryHealingRoll({injuryLevel:3,sl:SL.S}),{injuryLevel:2,healed:false,infected:false});
 assert.deepEqual(resolveInjuryHealingRoll({injuryLevel:2,sl:SL.CS}),{injuryLevel:0,healed:true,infected:false});
 assert.equal(resolveInjuryHealingRoll({injuryLevel:2,sl:SL.CF,infectionPossible:true}).infected,true);
 assert.equal(healingSeverityFromInjuryLevel(4),'G'); assert.equal(healingSeverityFromInjuryLevel(3),'S'); assert.equal(healingSeverityFromInjuryLevel(1),'M');
});
test('Area/cauterised failed Healing Rolls expand CF ones faces to 3,5,8,0',()=>{
 assert.equal(healingFailureIsCritical({roll:93,area:true}),true);
 assert.equal(healingFailureIsCritical({roll:98,cauterised:true}),true);
 assert.equal(healingFailureIsCritical({roll:93}),false);
 assert.equal(healingFailureIsCritical({roll:95}),true);
});
test('Infection starts at injury HR+1 capped 5 and course adjusts HR until death/defeat',()=>{
 assert.equal(infectionInitialHR(4),5); assert.equal(infectionInitialHR(5),5);
 assert.equal(infectionCourseEML({healingBase:13,infectionHR:5,physicianSV:4}),69);
 assert.equal(infectionWeaknessFatigue(2),10); assert.equal(infectionWeaknessFatigue(4),5); assert.equal(infectionWeaknessFatigue(5),0);
 assert.equal(resolveInfectionCourse({hr:5,sl:SL.S}).defeated,true);
 assert.equal(resolveInfectionCourse({hr:2,sl:SL.CF}).dead,true);
});
test('Healing impairment transitions G unusable -> S10 -> M5/0 and permanent overlaps by maximum',()=>{
 assert.deepEqual(indefiniteHealingImpairment({injuryLevel:4,healingRate:3}),{unusable:true,penalty:null});
 assert.equal(indefiniteHealingImpairment({injuryLevel:3,healingRate:3}).penalty,10);
 assert.equal(indefiniteHealingImpairment({injuryLevel:1,healingRate:5}).penalty,5);
 assert.equal(indefiniteHealingImpairment({injuryLevel:1,healingRate:6}).penalty,0);
 assert.equal(permanentHealingImpairment({daysToMinor:79,eligible:true}),15);
 assert.equal(permanentHealingImpairment({daysToMinor:120,eligible:true}),25);
 assert.equal(effectiveHealingImpairment({injuryLevel:1,healingRate:6,permanent:10}).effective,10);
});
test('Blood Loss Healing regenerates every ten days; CF skips the next period',()=>{
 assert.deepEqual(resolveBloodLossHealing({bp:3,sl:SL.S}),{bp:2,weaknessFatigue:10,skipNextPeriod:false});
 assert.deepEqual(resolveBloodLossHealing({bp:3,sl:SL.CS}),{bp:1,weaknessFatigue:5,skipNextPeriod:false});
 assert.equal(resolveBloodLossHealing({bp:2,sl:SL.CF}).skipNextPeriod,true);
});
test('Healing scheduler expresses 5-day injury, daily infection and 10/20-day blood recovery',()=>{
 assert.equal(scheduleInjuryHealing({currentRound:10,combatantId:'c',injuryId:'i'}).dueRound,10+5*HEALING_ROUNDS_PER_DAY);
 assert.equal(scheduleInfectionCourse({currentRound:10,combatantId:'c',injuryId:'i'}).dueRound,10+HEALING_ROUNDS_PER_DAY);
 assert.equal(scheduleBloodLossHealing({currentRound:10,combatantId:'c'}).dueRound,10+10*HEALING_ROUNDS_PER_DAY);
 assert.equal(scheduleBloodLossHealing({currentRound:10,combatantId:'c',skipNextPeriod:true}).dueRound,10+20*HEALING_ROUNDS_PER_DAY);
});

import { scheduleGrimWoundShock,concentrationStatus } from '../src/rules/healing.js';
test('Grim wounds schedule one Location-Shock roll per day',()=>{
 const e=scheduleGrimWoundShock({currentRound:7,combatantId:'c',injuryId:'i',locationShock:4});
 assert.equal(e.dueRound,7+HEALING_ROUNDS_PER_DAY); assert.equal(e.data.locationShock,4);
});
test('STN/INC/UNC, Grievous Skull, grim wound and Afraid/Terrified/Catatonic automatically prevent concentration',()=>{
 assert.equal(concentrationStatus({shockState:'stn'}).allowed,false);
 assert.equal(concentrationStatus({grievousSkull:true}).allowed,false);
 assert.equal(concentrationStatus({grimWound:true}).allowed,false);
 assert.equal(concentrationStatus({fearState:'terrified'}).allowed,false);
 assert.equal(concentrationStatus({shockState:'none',fearState:null}).allowed,true);
});

import { patientHealingPolicy,healingStageZoneEffect } from '../src/rules/healing.js';
test('Any active infection pauses ordinary Healing Rolls for all injuries',()=>{
 assert.deepEqual(patientHealingPolicy({infectionActive:true}),{injuryHealingRollsAllowed:false,infectionCourseRequired:true});
 assert.deepEqual(patientHealingPolicy({infectionActive:false}),{injuryHealingRollsAllowed:true,infectionCourseRequired:false});
});
test('Healing-stage impairment supersedes rather than adds to acute injury impairment',()=>{
 const x=healingStageZoneEffect({injuryLevel:1,healingRate:6,permanent:5});
 assert.equal(x.source,'healing-sequence'); assert.equal(x.penalty,0); assert.equal(x.effective,5);
});

import { TREATMENTS,TREATMENT_ROLL_TABLE,treatmentContract,resolveTreatmentTable,treatmentDurationMinutes } from '../src/rules/healing.js';

test('p180 Treatment contracts preserve exact treatment/modifier and projectile S2/S3 split',()=>{
 assert.deepEqual([treatmentContract({aspect:'blunt',injuryLevel:1}).treatment,treatmentContract({aspect:'blunt',injuryLevel:1}).modifier],['cmp',30]);
 assert.deepEqual([treatmentContract({aspect:'edge',injuryLevel:3}).treatment,treatmentContract({aspect:'edge',injuryLevel:3}).modifier],['cln',10]);
 assert.equal(treatmentContract({aspect:'projectile',injuryLevel:2}).treatment,'cln');
 assert.equal(treatmentContract({aspect:'projectile',injuryLevel:2}).dexSecondary,false);
 assert.equal(treatmentContract({aspect:'projectile',injuryLevel:3}).treatment,'ext');
 assert.equal(treatmentContract({aspect:'projectile',injuryLevel:3}).dexSecondary,true);
 assert.equal(treatmentContract({aspect:'projectile',injuryLevel:4,broadhead:true}).modifier,-40);
});

test('p180 ordinary Treatment Roll cells preserve HR/heal and symbols',()=>{
 assert.deepEqual(resolveTreatmentTable({aspect:'blunt',injuryLevel:1,sl:SL.S}).result,{kind:'hr',healingRate:6,infectionPossible:false,permanentImpairmentEligible:false,bleeding:false,eliminateMinorImpairment:true});
 assert.equal(resolveTreatmentTable({aspect:'edge',injuryLevel:1,sl:SL.CS}).result.immediateHeal,true);
 const p=resolveTreatmentTable({aspect:'point',injuryLevel:2,sl:SL.CF}).result;
 assert.equal(p.healingRate,3); assert.equal(p.infectionPossible,true); assert.equal(p.permanentImpairmentEligible,true);
 const f=resolveTreatmentTable({aspect:'fire',injuryLevel:5,sl:SL.S,physicianIndex:9}).result;
 assert.equal(f.healingRate,3); assert.equal(f.permanentImpairmentEligible,true);
});

test('p180 G-treatment HR cap also downgrades table effects to capped HR level',()=>{
 const r=resolveTreatmentTable({aspect:'edge',injuryLevel:4,sl:SL.CS,physicianIndex:3});
 assert.equal(r.result.healingRate,3);
 assert.equal(r.result.infectionPossible,true);
 assert.equal(r.result.bleeding,true);
 assert.equal(r.grimWound,false);
});

test('p180 untreated injury uses CF treatment characteristics and G untreated is grim',()=>{
 const m=resolveTreatmentTable({aspect:'edge',injuryLevel:1,untreated:true});
 assert.equal(m.sl,SL.CF); assert.equal(m.result.healingRate,4); assert.equal(m.result.infectionPossible,true); assert.equal(m.grimWound,false);
 const g=resolveTreatmentTable({aspect:'edge',injuryLevel:4,untreated:true,physicianIndex:0});
 assert.equal(g.result.healingRate,2); assert.equal(g.grimWound,true);
});

test('p180 Frost G treatment converts injury to Edge and preserves bleeding symbols',()=>{
 const cf=resolveTreatmentTable({aspect:'frost',injuryLevel:5,sl:SL.CF,physicianIndex:5}).result;
 assert.deepEqual(cf,{kind:'edge-injury',injuryLevel:5,aspect:'edge',bleeding:true});
 const s=resolveTreatmentTable({aspect:'frost',injuryLevel:5,sl:SL.S,physicianIndex:5}).result;
 assert.equal(s.injuryLevel,3); assert.equal(s.bleeding,true);
 const cs=resolveTreatmentTable({aspect:'frost',injuryLevel:5,sl:SL.CS,physicianIndex:5}).result;
 assert.equal(cs.injuryLevel,2); assert.equal(cs.bleeding,false);
});

test('p178 Treatment durations and intrinsic modifiers are exact',()=>{
 assert.equal(treatmentDurationMinutes({treatment:'cln',injuryLevel:3}),15);
 assert.equal(treatmentDurationMinutes({treatment:'wrm',injuryLevel:5}),120);
 assert.equal(TREATMENTS.cau.bloodStoppageBonus,30);
 assert.equal(TREATMENTS.sta.tourniquetBonus,20);
 assert.equal(TREATMENTS.ext.requiresSurgeryTools,true);
 assert.equal(TREATMENTS.sur.includesCleanDress,true);
});

test('p178 AMP does not invent surgery-tools requirement; EXT and SUR do require them',()=>{
 assert.equal(TREATMENTS.amp.requiresSurgeryTools,undefined);
 assert.equal(TREATMENTS.ext.requiresSurgeryTools,true);
 assert.equal(TREATMENTS.sur.requiresSurgeryTools,true);
});

test('Grievous Frost outside limb/facial feature has no treatment and is automatically grim',()=>{
 const r=resolveTreatmentTable({aspect:'frost',injuryLevel:4,sl:SL.CS,physicianIndex:9,frostAmputationEligible:false});
 assert.equal(r.available,false); assert.equal(r.untreated,true); assert.equal(r.grimWound,true);
 assert.equal(r.reason,'grievous-frost-location-has-no-treatment');
});

test('Area G4f/G5f remains grim regardless of successful treatment',()=>{
 const r=resolveTreatmentTable({aspect:'fire',injuryLevel:4,sl:SL.CS,physicianIndex:9,area:true});
 assert.equal(r.available,true); assert.equal(r.grimWound,true);
});

import { treatmentRequirements,canPerformTreatment,treatmentRollEMLFromInjury } from '../src/rules/healing.js';

test('p178 mandatory treatment supplies gate treatment without inventing AMP equipment',()=>{
 assert.deepEqual(treatmentRequirements({treatment:'cln',injuryLevel:1,aspect:'edge'}),['water','bandages']);
 assert.deepEqual(treatmentRequirements({treatment:'cln',injuryLevel:2,aspect:'projectile'}),['water','bandages','needle-thread']);
 assert.deepEqual(treatmentRequirements({treatment:'sur',injuryLevel:4,aspect:'edge'}),['water','bandages','surgery-tools']);
 assert.deepEqual(treatmentRequirements({treatment:'amp',injuryLevel:5,aspect:'frost'}),[]);
 assert.equal(canPerformTreatment({treatment:'ext',injuryLevel:3,aspect:'projectile',available:[]}).allowed,false);
 assert.deepEqual(canPerformTreatment({treatment:'ext',injuryLevel:3,aspect:'projectile',available:[]}).missing,['surgery-tools']);
});

test('Treatment EML from injury applies table, Broadhead, boxed DEX Secondary, delay and Area exactly once',()=>{
 // G projectile: -10 table, -30 broadhead, boxed DEX +5, one-day delay -5, Area -20.
 assert.equal(treatmentRollEMLFromInjury({physicianML:80,aspect:'projectile',injuryLevel:4,broadhead:true,dexSecondaryModifier:5,daysSinceInjury:1,area:true}),20);
 // S2 projectile uses CLN, so no boxed DEX modifier.
 assert.equal(treatmentRollEMLFromInjury({physicianML:60,aspect:'projectile',injuryLevel:2,dexSecondaryModifier:20}),60);
 // S3 projectile uses boxed EXT, so DEX applies.
 assert.equal(treatmentRollEMLFromInjury({physicianML:60,aspect:'projectile',injuryLevel:3,dexSecondaryModifier:20}),80);
});

test('Treatment table has complete 6 x 3 x 4 result matrix with no missing SL cell',()=>{
 for(const aspect of ['blunt','edge','point','projectile','fire','frost']){
  for(const severity of ['M','S','G']){
   const row=TREATMENT_ROLL_TABLE[aspect][severity];
   assert.ok(row,`${aspect}/${severity}`);
   for(const sl of [SL.CF,SL.F,SL.S,SL.CS]) assert.ok(row.results[sl],`${aspect}/${severity}/${sl}`);
  }
 }
});

test('Clean & Dress inheritance carries both water and bandages into Staunch and Surgery',()=>{
 assert.deepEqual(treatmentRequirements({treatment:'sta',injuryLevel:1,aspect:'edge'}),['water','bandages']);
 assert.deepEqual(treatmentRequirements({treatment:'sur',injuryLevel:4,aspect:'point'}),['water','bandages','surgery-tools']);
});

import { aggravationChecksForAction,applyAggravationShockSR,seriousInjuryMovementAggravation,applyCarriedAggravationToTreatmentHR } from '../src/rules/healing.js';

test('Serious Injury Aggravation remains explicit opt-in and triggers Shock SR only from CF use',()=>{
 assert.deepEqual(aggravationChecksForAction({enabled:false,testSL:SL.CF,seriousInjuryIdsUsed:['s1']}),[]);
 assert.deepEqual(aggravationChecksForAction({enabled:true,testSL:SL.S,seriousInjuryIdsUsed:['s1']}),[]);
 assert.deepEqual(aggravationChecksForAction({enabled:true,testSL:SL.CF,seriousInjuryIdsUsed:['s1'],grievousInjuryIdsPlausible:['g1']}),[
  {injuryId:'s1',type:'aggravation-shock-sr'},{injuryId:'g1',type:'aggravation-shock-sr'}
 ]);
});

test('Aggravation failed Shock SR lowers HR to minimum 1 and untreated reduction carries forward',()=>{
 assert.deepEqual(applyAggravationShockSR({healingRate:2,shockSRSuccess:false}),{healingRate:1,carriedReduction:0,aggravated:true});
 assert.deepEqual(applyAggravationShockSR({healingRate:1,shockSRSuccess:false}),{healingRate:1,carriedReduction:0,aggravated:true});
 assert.deepEqual(applyAggravationShockSR({healingRate:null,shockSRSuccess:false,untreated:true,carriedReduction:1}),{healingRate:null,carriedReduction:2,aggravated:true});
 assert.equal(applyCarriedAggravationToTreatmentHR({healingRate:4,carriedReduction:2}),2);
});

test('Serious Injury Aggravation movement cadence is half/4h, full+charge/turn, double prohibited',()=>{
 assert.deepEqual(seriousInjuryMovementAggravation({enabled:true,hasSeriousHeadTorsoLeg:true,rate:'half'}),{allowed:true,agilityTest:true,period:'4-hours'});
 assert.equal(seriousInjuryMovementAggravation({enabled:true,hasSeriousHeadTorsoLeg:true,rate:'full'}).period,'turn');
 assert.equal(seriousInjuryMovementAggravation({enabled:true,hasSeriousHeadTorsoLeg:true,rate:'charge'}).period,'turn');
 assert.equal(seriousInjuryMovementAggravation({enabled:true,hasSeriousHeadTorsoLeg:true,rate:'double'}).allowed,false);
});

test('G Edge/Point/Projectile CF-F combined symbol means both impairment eligibility and bleeding',()=>{
 for(const aspect of ['edge','point','projectile']) for(const sl of [SL.CF,SL.F]){
  const r=resolveTreatmentTable({aspect,injuryLevel:4,sl,physicianIndex:9}).result;
  assert.equal(r.bleeding,true,`${aspect}/${sl} bleeding`);
  assert.equal(r.permanentImpairmentEligible,true,`${aspect}/${sl} impairment`);
  assert.equal(r.infectionPossible,true,`${aspect}/${sl} infection`);
 }
});

import { ailmentOutcome,ailmentCourse,asphyxiaCapacity,asphyxiaAfterRelease,asphyxiaDeathCountdown,strangleholdStart,strangleholdRound,strangleholdUnconsciousRecovery,contagionTest } from '../src/rules/ailments.js';

test('Ailment HR outcome maps exactly to weakness/STN/INC/UNC/death and replaces prior outcome',()=>{
 assert.equal(ailmentOutcome(5).weaknessFatigue,5);
 assert.equal(ailmentOutcome(4).weaknessFatigue,10);
 assert.equal(ailmentOutcome(3).shockState,'stunned');
 assert.equal(ailmentOutcome(2).shockState,'incapacitated');
 assert.equal(ailmentOutcome(1).shockState,'unconscious');
 assert.equal(ailmentOutcome(0).dead,true);
 assert.equal(ailmentOutcome(6).defeated,true);
});

test('Disease/poison Course Roll changes HR by CF-2 F-1 S+1 CS+2',()=>{
 assert.equal(ailmentCourse({healingRate:4,sl:SL.CF}).healingRate,2);
 assert.equal(ailmentCourse({healingRate:4,sl:SL.F}).healingRate,3);
 assert.equal(ailmentCourse({healingRate:4,sl:SL.S}).healingRate,5);
 assert.equal(ailmentCourse({healingRate:4,sl:SL.CS}).healingRate,6);
});

test('Asphyxia uses better of END or half Swimming ML, extended by Will SV',()=>{
 assert.deepEqual(asphyxiaCapacity({endurance:12,willSV:3,swimmingML:56}),{baseRounds:28,maximumRounds:31});
 assert.deepEqual(asphyxiaCapacity({endurance:14,willSV:2,swimmingML:20}),{baseRounds:14,maximumRounds:16});
});

test('Asphyxia over half capacity causes 5 windedness; rescued unconscious uses END SL on Shock Reroll without -20',()=>{
 assert.equal(asphyxiaAfterRelease({maximumRounds:20,roundsHeld:10}).windednessFatigue,0);
 assert.equal(asphyxiaAfterRelease({maximumRounds:20,roundsHeld:11}).windednessFatigue,5);
 assert.deepEqual(asphyxiaAfterRelease({maximumRounds:20,roundsHeld:20,unconscious:true,enduranceTestSL:SL.S}),{windednessFatigue:5,shockRerollSL:SL.S,shockRerollModifier:0});
 assert.equal(asphyxiaDeathCountdown({endurance:12,d10:7}),13);
});

test('Stranglehold requires won Grab Hold to Head and SHK7 each full maintained round',()=>{
 assert.equal(strangleholdStart({grabWon:true,suboption:'hold',location:'head'}).active,true);
 assert.equal(strangleholdStart({grabWon:true,suboption:'take',location:'head'}).active,false);
 assert.equal(strangleholdRound({active:true,fullRoundsMaintained:0}).shockRollRequired,false);
 assert.deepEqual(strangleholdRound({active:true,fullRoundsMaintained:1}),{shockRollRequired:true,shockIndex:7});
 assert.equal(strangleholdUnconsciousRecovery({releasedImmediately:true,d6Rolls:[2,4,6]}).recoveryRounds,12);
});

test('Disease Contagion uses CI x END without normal EML clamp; CF halves onset and CS improves next same-disease exposure CI',()=>{
 assert.equal(contagionTest({contagionIndex:2,endurance:12,roll:35}).contracted,true);
 const cf=contagionTest({contagionIndex:2,endurance:12,roll:40});
 assert.equal(cf.sl,SL.CF); assert.equal(cf.onsetMultiplier,0.5);
 const cs=contagionTest({contagionIndex:5,endurance:20,roll:10});
 assert.equal(cs.sl,SL.CS); assert.equal(cs.nextExposureIndexBonus,1);
});

import { ailmentConditionEffect } from '../src/rules/ailments.js';

test('Disease non-lethal blindness/deafness/muteness preserve exact combat restrictions',()=>{
 const b=ailmentConditionEffect('blindness');
 assert.equal(b.dexPenalty,-40); assert.equal(b.aglPenalty,-40); assert.equal(b.stumbleIfFasterThanHalfMove,true);
 assert.equal(ailmentConditionEffect('deafness').awarenessHearing,'automatic-cf');
 assert.equal(ailmentConditionEffect('muteness').cantSpellcastingAllowed,false);
});

test('Complete paralysis makes target immobile, prone and helpless; limb paralysis only disables affected limb',()=>{
 assert.deepEqual(ailmentConditionEffect('paralysis',{completeParalysis:true}),{affectedLimbUsable:false,moveAllowed:false,prone:true,helpless:true});
 assert.deepEqual(ailmentConditionEffect('paralysis'),{affectedLimbUsable:false,moveAllowed:true,prone:false,helpless:false});
});

import { sleepDeprivationAccrual,sleepDeprivationPsyche } from '../src/rules/ailments.js';

test('Sleep deprivation accrues 15 weariness per 24h, reduced to 10 by successful END SR',()=>{
 assert.deepEqual(sleepDeprivationAccrual({enduranceSRSuccess:false}),{periodHours:24,wearinessFatigue:15});
 assert.equal(sleepDeprivationAccrual({enduranceSRSuccess:true}).wearinessFatigue,10);
});

test('Each full 30 sleep-deprivation fatigue creates 1 PSY and 5 indefinite weakness per PSY',()=>{
 assert.deepEqual(sleepDeprivationPsyche({sleepDeprivationFatigue:29}),{psycheLevels:0,indefiniteWeaknessFatigue:0});
 assert.deepEqual(sleepDeprivationPsyche({sleepDeprivationFatigue:60}),{psycheLevels:2,indefiniteWeaknessFatigue:10});
});

import { exposureAdvance,exposureHealing,heatExposureRecoveryPeriod,coldExposureRecoveryPeriod,malnutritionSchedule } from '../src/rules/ailments.js';

test('Exposure Advance uses CF-2/F-1/S0/CS0 and CS skips next advance',()=>{
 assert.equal(exposureAdvance({healingRate:4,sl:SL.CF}).healingRate,2);
 assert.equal(exposureAdvance({healingRate:4,sl:SL.F}).healingRate,3);
 assert.equal(exposureAdvance({healingRate:4,sl:SL.S}).healingRate,4);
 assert.equal(exposureAdvance({healingRate:4,sl:SL.CS}).skipNext,true);
});

test('Exposure Healing uses CF skip-next/F0/S+1/CS+2; heat/cold recovery cadence is exact',()=>{
 assert.equal(exposureHealing({healingRate:3,sl:SL.CF}).skipNext,true);
 assert.equal(exposureHealing({healingRate:3,sl:SL.S}).healingRate,4);
 assert.equal(exposureHealing({healingRate:3,sl:SL.CS}).healingRate,5);
 assert.deepEqual(heatExposureRecoveryPeriod(),{minutes:15,treatment:'compress',emlMultiplier:5});
 assert.equal(heatExposureRecoveryPeriod({coolWater:true}).minutes,5);
 assert.deepEqual(coldExposureRecoveryPeriod(),{minutes:120,treatment:'warming',emlMultiplier:5});
});

test('Starvation/thirst Advance cadence preserves half-ration and complete-rest doubling',()=>{
 assert.equal(malnutritionSchedule({kind:'starvation'}).advanceEveryDays,3);
 assert.equal(malnutritionSchedule({kind:'starvation',halfRations:true,completeRest:true}).advanceEveryDays,12);
 assert.equal(malnutritionSchedule({kind:'thirst'}).advanceEveryDays,1);
 assert.equal(malnutritionSchedule({kind:'thirst',halfRations:true,completeRest:true}).advanceEveryDays,4);
});

import { psycheStressState,addSamePsycheTrait,psycheSuppressionRequired,psycheStressRecovery,psycheRecoverySchedule,auralShockState,auralShockRecovery,spiritDissolution } from '../src/rules/mental-trauma.js';

test('Psyche Stress manifests after about 10 minutes and then gives 5 weakness per PSY',()=>{
 assert.deepEqual(psycheStressState({psycheLevels:2}),{psycheLevels:2,intensity:'trait',permanent:false,manifested:false,weaknessFatigue:0,manifestDelayMinutes:10});
 assert.equal(psycheStressState({psycheLevels:2,manifested:true}).weaknessFatigue,10);
});

test('Repeated same psyche trait raises intensity Trait -> Impulse -> Disorder and combines PSY',()=>{
 assert.deepEqual(addSamePsycheTrait({currentLevels:1,currentIntensity:'trait',newLevels:2}),{psycheLevels:3,intensity:'impulse'});
 assert.equal(addSamePsycheTrait({currentLevels:3,currentIntensity:'impulse',newLevels:1}).intensity,'disorder');
 assert.equal(psycheSuppressionRequired('impulse'),SL.S); assert.equal(psycheSuppressionRequired('disorder'),SL.CS);
});

test('Psyche recovery CF makes duration permanent then raises intensity; S/CS remove 1/2 PSY and 5 weakness each',()=>{
 let r=psycheStressRecovery({psycheLevels:3,intensity:'trait',permanent:false,sl:SL.CF});
 assert.equal(r.permanent,true); assert.equal(r.intensity,'trait');
 r=psycheStressRecovery({psycheLevels:3,intensity:'trait',permanent:true,sl:SL.CF}); assert.equal(r.intensity,'impulse');
 assert.equal(psycheStressRecovery({psycheLevels:3,sl:SL.S}).psycheLevels,2);
 assert.equal(psycheStressRecovery({psycheLevels:3,sl:SL.CS}).weaknessFatigue,5);
 assert.deepEqual(psycheRecoverySchedule(4),{days:4,fatiguePenaltyApplies:false});
});

test('Aural Shock combines levels, gives 5 weakness each and forces Aura/Aura-modified tests to CF',()=>{
 const s=auralShockState(3); assert.equal(s.weaknessFatigue,15); assert.equal(s.auraTestsAllowed,false); assert.equal(s.forcedAuraTestResult,'automatic-cf'); assert.equal(s.existingAttunementsUsable,false);
});

test('Aural Shock recovery is daily: CF +1 PSY, F no recovery, S -1, CS -2, with no fatigue/impairment penalty',()=>{
 assert.equal(auralShockRecovery({levels:2,sl:SL.CF}).psycheStressGained,1);
 assert.equal(auralShockRecovery({levels:2,sl:SL.F}).levels,2);
 assert.equal(auralShockRecovery({levels:2,sl:SL.S}).levels,1);
 const cs=auralShockRecovery({levels:2,sl:SL.CS}); assert.equal(cs.levels,0); assert.equal(cs.fatiguePenaltyApplies,false); assert.equal(cs.impairmentPenaltyApplies,false);
});

test('Spirit Aural Shock becomes one day dissolution per level and destroys incarnation',()=>{
 assert.deepEqual(spiritDissolution({auralShockLevels:3,isSpirit:true}),{dissolved:true,durationDays:3,actionsAllowed:false,physicalIncarnationDestroyed:true,trueFormConcealed:true});
});

import {ailmentCourse as rcAilmentCourse,exposureAdvance as rcExposureAdvance,exposureHealing as rcExposureHealing} from '../src/rules/ailments.js';
import {resolveInjuryHealingRoll as rcInjuryHealing,resolveBloodLossHealing as rcBloodHealing} from '../src/rules/healing.js';
test('Arcane Recovery ignores failed ailment Course/Advance/Healing rolls',()=>{
  assert.equal(rcAilmentCourse({healingRate:4,sl:SL.CF,arcaneRecovery:true}).healingRate,4);
  assert.equal(rcExposureAdvance({healingRate:4,sl:SL.CF,arcaneRecovery:true}).healingRate,4);
  const e=rcExposureHealing({healingRate:4,sl:SL.CF,arcaneRecovery:true});
  assert.equal(e.healingRate,4); assert.equal(e.skipNext,false);
});
test('Arcane Recovery ignores failed injury and blood-loss Healing rolls',()=>{
  const i=rcInjuryHealing({injuryLevel:3,sl:SL.CF,infectionPossible:true,arcaneRecovery:true});
  assert.equal(i.injuryLevel,3); assert.equal(i.infected,false);
  const b=rcBloodHealing({bp:2,sl:SL.CF,arcaneRecovery:true});
  assert.equal(b.bp,2); assert.equal(b.skipNextPeriod,false);
});

import {resolvePassiveDeflectContact as rcDeflectContact} from '../src/rules/shields.js';
test('Passive Deflect completes shield Weapon Damage instead of exposing only a flag',()=>{
  const r=rcDeflectContact({missileStruck:true,fromFrontOrShieldSide:true,deflectTN:3,d10:2,strikeImpact:8,shieldWQ:10});
  assert.equal(r.deflected,true); assert.equal(r.damageImpact,13); assert.equal(r.shieldDamage.wqLoss,1); assert.equal(r.shieldDamage.destroyed,false);
});
test('Passive Deflect returns an explicit pending gate when shield WQ is unavailable',()=>{
  const r=rcDeflectContact({missileStruck:true,fromFrontOrShieldSide:true,deflectTN:3,d10:1,strikeImpact:8});
  assert.equal(r.pending.type,'shield-weapon-damage'); assert.equal(r.shieldDamage,null);
});

import {creaturePoisonAilment as rcCreaturePoison} from '../src/rules/animal-abilities.js';
test('Creature Poison delegates species HR and period into the common Poison/Toxin ailment routine',()=>{
  assert.deepEqual(rcCreaturePoison({transmitted:true,healingRate:3,coursePeriodMinutes:10}),{active:true,kind:'poison',transmission:'vector',healingRate:3,coursePeriodMinutes:10,courseResolver:'ailmentCourse',outcomeResolver:'ailmentOutcome'});
  assert.equal(rcAilmentCourse({healingRate:3,sl:SL.F}).shockState,'incapacitated');
});

import {psycheStressFromFearResult as rcPsycheFromFear} from '../src/rules/mental-trauma.js';
test('Fear/Aberrance PSY enters Mental Trauma but never invents the psyche trait choice',()=>{
  const fear=fearResult({sl:SL.F,roll:61,aberrance:2});
  const pending=rcPsycheFromFear(fear);
  assert.equal(pending.pending.type,'psyche-trait-choice'); assert.equal(pending.pending.psycheLevels,2);
  const made=rcPsycheFromFear(fear,{trait:'paranoid'});
  assert.equal(made.created,true); assert.equal(made.psycheLevels,2); assert.equal(made.weaknessFatigue,0); assert.equal(made.manifestDelayMinutes,10);
});

import {defenceAvailability as rcDefAvail,opponentDefencePenalty as rcOppDef,entangleAttack as rcEntangle,envelopDefencePenalty as rcEnvelop} from '../src/rules/weapon-traits.js';
import {courseHRDelta as rcCourseDelta} from '../src/rules/recovery.js';
import {areaEffectiveImpact as rcAreaImpact} from '../src/rules/area.js';
import {impairedTestZones as rcImpairedZones} from '../src/rules/injury-effects.js';
import {applyWeaponDamage as rcApplyWD} from '../src/rules/weapon-damage.js';
import {pressRoll as rcPressRoll,tripRoll as rcTripRoll,baseOutnumberedPenalty as rcBaseOutnumbered,resolveFlankerRetest as rcFlankerRetest,maximumFoeLimit as rcMaxFoe} from '../src/rules/melee.js';
test('Previously indirect weapon/trauma helpers have direct contract coverage',()=>{
  assert.deepEqual(rcDefAvail({counterOnly:true}),{block:false,counterstrike:true});
  assert.equal(rcOppDef({oppDefence:-20}),-20); assert.equal(rcEntangle({entangle:true}).attack,'grab-hold'); assert.equal(rcEnvelop({envelop:true}),-20);
  assert.equal(rcCourseDelta(SL.CF),-2); assert.equal(rcAreaImpact(12,5),7); assert.ok(Array.isArray(rcImpairedZones('melee')));
  const w={currentWQ:10}; rcApplyWD(w,{destroyed:false,wqLoss:1}); assert.equal(w.currentWQ,9);
});
test('Previously indirect melee arithmetic helpers have direct contract coverage',()=>{
  assert.equal(rcPressRoll({str:12,d6:4,impactTA:2,charge:true}),22); assert.equal(rcTripRoll({str:12,d6:4,impactTA:2}),24);
  assert.equal(rcBaseOutnumbered(['a','b','b','c']),-20); assert.equal(rcMaxFoe({passed:false}),3); assert.equal(rcMaxFoe({passed:true}),4);
});
test('Flanker retest mutates only the pairwise awareness relation on success',()=>{
  const s=CombatState(); markNewFlanker(s,'d','f'); const r=rcFlankerRetest(s,'d','f',true);
  assert.equal(r.aware,true); assert.equal(r.ignoreRequired,false); assert.equal(isInClose(s,'d','f'),false);
});

import { commitInjuryResolution } from '../src/state/resolution-commit.js';
test('E2E completed bleeding injury commits one stable Injury id into blood-loss event and survives persistence round-trip',()=>{
  const result=resolveInjurySequence({
    location:{id:'forearm',zone:'arm',locationShock:1,bleedingClass:3},
    effectiveImpact:12,aspect:'edge',shockSL:SL.S
  });
  assert.equal(result.complete,true); assert.equal(result.step3.bleeder,true);
  const committed=commitInjuryResolution({result,combatantId:'def',injuryId:'inj-001',currentRound:7,currentIR:55});
  assert.equal(committed.injury.id,'inj-001'); assert.equal(committed.injury.bleeding,1);
  const blood=committed.events.find(e=>e.type==='blood-loss-advance');
  assert.equal(blood.data.injuryId,'inj-001'); assert.equal(blood.dueRound,67);
  const state={schemaVersion:1,id:'fight',round:7,activeIR:55,combatants:[{id:'def',injuries:[committed.injury]}],relations:{},events:committed.events,decisions:[],log:[],options:{}};
  const restored=importCombatState(exportCombatState(state));
  assert.equal(restored.combatants[0].injuries[0].id,'inj-001');
  assert.equal(restored.events.find(e=>e.type==='blood-loss-advance').data.injuryId,'inj-001');
});
test('Injury commit refuses to invent a persistent injury id and preserves pending resolutions',()=>{
  const pending=resolveInjurySequence({location:{id:'arm',zone:'arm',locationShock:1,bleedingClass:3},effectiveImpact:12,aspect:'edge'});
  const p=commitInjuryResolution({result:pending,combatantId:'c',injuryId:'i',currentRound:1,currentIR:50});
  assert.equal(p.committed,false); assert.equal(p.pending.type,INJURY_PENDING.SHOCK);
  const complete=resolveInjurySequence({location:{id:'arm',zone:'arm',locationShock:1,bleedingClass:3},effectiveImpact:12,aspect:'edge',shockSL:SL.S});
  assert.throws(()=>commitInjuryResolution({result:complete,combatantId:'c',currentRound:1,currentIR:50}),/injuryId/);
});

test('E2E Broadhead +5 is virtual for Bleeding only: it can create a bleeder without increasing real injury or Shock',()=>{
  // Effective 12p is S3. Point S3 is not a bleeder; virtual 17p is G4,
  // which is a bleeder at a bleeding-class 2 location.
  const loc={id:'abdomen',zone:'torso',locationShock:4,bleedingClass:2};
  const plain=resolveDirectMissileHit({location:loc,aspect:'point',impactDieRoll:12,shockSL:SL.S});
  assert.equal(plain.effectiveImpact,12); assert.equal(plain.injury.step3.injury.level,3); assert.equal(plain.injury.step3.bleeder,false);
  const broad=resolveDirectMissileHit({location:loc,aspect:'point',impactDieRoll:12,shockSL:SL.S,broadBleedingBonus:5});
  assert.equal(broad.effectiveImpact,12); assert.equal(broad.injury.step3.injury.level,3); assert.equal(broad.injury.step3.bleeder,true);
  assert.equal(broad.injury.shock.index,7); // location 4 + actual S3; virtual G4 must not add Shock.
});
test('HMK combat example broadhead 11p -> virtual 16p does not change actual S3 skull injury and still respects skull bleed threshold',()=>{
  const skull={id:'skull',zone:'head',locationShock:5,bleedingClass:1}; // white-circle skull bleeds only at G5
  const r=resolveDirectMissileHit({location:skull,aspect:'point',impactDieRoll:15,armourValue:4,shockSL:SL.S,broadBleedingBonus:5});
  assert.equal(r.effectiveImpact,11); assert.equal(r.injury.step3.injury.level,3); assert.equal(r.injury.step3.bleeder,false);
  assert.equal(r.injury.shock.index,8);
});

test('E2E Hard Cover is a pre-Injury gate for successful missile and melee strikes',()=>{
  const loc={id:'abdomen',zone:'torso',locationShock:4,bleedingClass:2};
  const missile=resolveDirectMissileHit({location:loc,aspect:'point',impactDieRoll:18,locationProtectedByHardCover:true,shockSL:SL.CF});
  assert.equal(missile.deflectedByHardCover,true); assert.equal(missile.targetImpact,0); assert.equal(missile.injury,null);
  const melee=resolveMeleeStrikeHit({location:loc,aspect:'edge',impactDieRoll:18,locationProtectedByHardCover:true,shockSL:SL.CF});
  assert.equal(melee.deflectedByHardCover,true); assert.equal(melee.targetImpact,0); assert.equal(melee.injury,null);
});

test('Persistence rejects injury-scoped scheduler events whose stable injury id no longer exists',()=>{
  const state={schemaVersion:1,id:'fight',round:1,activeIR:50,combatants:[{id:'c',injuries:[]}],relations:{},events:[{id:'e',type:'blood-loss-advance',combatantId:'c',dueRound:61,data:{injuryId:'gone'}}],decisions:[],log:[],options:{}};
  const v=validateCombatState(state); assert.equal(v.valid,false); assert.ok(v.errors.some(x=>x.includes('dangling-injury-event')));
  assert.throws(()=>importCombatState(JSON.stringify(state)),/dangling-injury-event/);
});

test('E2E scheduler does not expose end-turn Shock recovery at start of the due turn',()=>{
  const result=resolveInjurySequence({location:{id:'x',zone:'torso',locationShock:5,bleedingClass:0},effectiveImpact:1,aspect:'blunt',shockSL:SL.F});
  assert.equal(result.state,'stunned');
  const events=injurySequenceEvents({result,currentRound:3,currentIR:60,combatantId:'c'});
  const state={round:4,activeIR:60,events};
  assert.equal(dueEvents(state).some(e=>e.type==='stunned-recovery'),false);
  assert.equal(dueEvents(state,{timing:'end-turn'}).some(e=>e.type==='stunned-recovery'),true);
});

test('E2E failed STN recovery persists STN and schedules the required end-turn retry next round',()=>{
  const fail=stunnedRecoveryTransition({sl:SL.F,currentRound:4,currentIR:60,combatantId:'c'});
  assert.equal(fail.state,SHOCK_STATE.STN); assert.equal(fail.events.length,1);
  assert.deepEqual({dueRound:fail.events[0].dueRound,dueIR:fail.events[0].dueIR,timing:fail.events[0].timing},{dueRound:5,dueIR:60,timing:'end-turn'});
  const success=stunnedRecoveryTransition({sl:SL.S,currentRound:5,currentIR:60,combatantId:'c'});
  assert.equal(success.state,SHOCK_STATE.NONE); assert.deepEqual(success.events,[]);
});

test('E2E Serious injury preserves delayed Morale debt through persistence and releases it only after Shock State ends',()=>{
  const result=resolveInjurySequence({location:{id:'abdomen',zone:'torso',locationShock:4,bleedingClass:2},effectiveImpact:12,aspect:'edge',shockSL:SL.F});
  assert.equal(result.step3.injury.severity,'S'); assert.equal(result.morale.timing,'after-recovering-from-stunned');
  const c=commitInjuryResolution({result,combatantId:'c',injuryId:'serious-1',currentRound:2,currentIR:60});
  const state={schemaVersion:1,id:'f',round:2,activeIR:60,combatants:[{id:'c',injuries:[c.injury]}],relations:{},events:c.events,decisions:[],log:[],options:{}};
  const restored=importCombatState(exportCombatState(state));
  const injuries=restored.combatants[0].injuries;
  assert.deepEqual(moraleDebtsAfterShockRecovery({injuries,currentShockState:result.state}),[]);
  assert.deepEqual(moraleDebtsAfterShockRecovery({injuries,currentShockState:SHOCK_STATE.NONE}),[{injuryId:'serious-1',severity:'S'}]);
});

test('Charging Throw action is legal from 5 ft but range/impact charge bonus requires at least 20 ft movement',()=>{
  assert.equal(missileActionContract({weaponType:'thrown',action:'charge'}).minimumTargetDistanceFt,5);
  assert.equal(chargingThrowBonusEligible({chargeMovementFeet:5}),false);
  assert.equal(chargingThrowBonusEligible({chargeMovementFeet:19}),false);
  assert.equal(chargingThrowBonusEligible({chargeMovementFeet:20}),true);
  assert.equal(missileRange({distance:10,baseRange:30,chargingThrow:chargingThrowBonusEligible({chargeMovementFeet:10})}).chargeImpactModifier,null);
  assert.equal(missileRange({distance:10,baseRange:30,chargingThrow:chargingThrowBonusEligible({chargeMovementFeet:20})}).chargeImpactModifier,3);
});

test('Spoiled missile attack preserves the rule decision: wasted action vs automatic failure with EML05 used only for CF',()=>{
  assert.equal(spoiledMissileResolution({finalAdjustedEML:-39}).spoiled,false);
  const p=spoiledMissileResolution({finalAdjustedEML:-40}); assert.equal(p.pending.type,'spoiled-missile-disposition');
  assert.equal(spoiledMissileResolution({finalAdjustedEML:-40,disposition:'action-wasted'}).attackOccurs,false);
  const need=spoiledMissileResolution({finalAdjustedEML:-40,disposition:'automatic-fail'}); assert.equal(need.pending.type,'eml05-cf-check');
  assert.equal(spoiledMissileResolution({finalAdjustedEML:-40,disposition:'automatic-fail',eml05Roll:5}).sl,SL.F); // auto-fail overrides normal EML05 CS
  assert.equal(spoiledMissileResolution({finalAdjustedEML:-40,disposition:'automatic-fail',eml05Roll:15}).sl,SL.CF);
  assert.equal(spoiledMissileResolution({finalAdjustedEML:-40,disposition:'automatic-fail',eml05Roll:15}).mishap,'stumble');
  assert.equal(spoiledMissileResolution({finalAdjustedEML:-40,disposition:'automatic-fail',eml05Roll:20}).mishap,'fumble');
});

// Full exported-contract smoke coverage (infrastructure + domain constructors).
import {indexOf as rcIndexOf} from '../src/rules/tests.js';
import {DEFAULT_IMPACT_TA as rcDefaultImpactTA} from '../src/rules/weapon-traits.js';
import {VANQUISHED_STATES as rcVanquishedStates} from '../src/rules/morale.js';
import {sortTurnOrder,advanceRound,ROUNDS_PER_MINUTE,scheduleMinutes,scheduleEndNextTurn} from '../src/state/scheduler.js';
import {setupAvailable,expireSetups} from '../src/state/tactical-advantages.js';
import {SCHEMA_VERSION,uuid,Character,Skill,WeaponDefinition,WeaponInstance,ArmourArticle,TimedEvent,Combatant,CombatOptions,Campaign,pairKey,Condition,GMDecision} from '../src/domain/contracts.js';

test('Infrastructure exports have direct contract coverage',()=>{
  assert.equal(rcIndexOf(79),7); assert.equal(rcDefaultImpactTA.p,4); assert.equal(rcVanquishedStates.has('unconscious'),true);
  assert.deepEqual(sortTurnOrder([{id:'a',initiativeRank:20},{id:'b',initiativeRank:40}]).map(x=>x.id),['b','a']);
  assert.deepEqual(advanceRound({round:2,activeIR:50}),{round:3,activeIR:null}); assert.equal(ROUNDS_PER_MINUTE,12);
  assert.equal(scheduleMinutes({currentRound:1,currentIR:50,minutes:5,type:'x',combatantId:'c'}).dueRound,61);
  assert.equal(scheduleEndNextTurn({currentRound:1,currentIR:50,type:'x',combatantId:'c'}).timing,'end-turn');
  const ledger=TacticalAdvantageLedger(); earnSetupTA({ledger,actorId:'a',round:1,ir:50});
  assert.equal(setupAvailable(ledger.setups[0],{round:2,ir:50}),true); expireSetups({ledger,round:3,ir:50}); assert.equal(ledger.setups[0].expired,true);
});
test('All domain constructors and identifiers have direct serialisable smoke coverage',()=>{
  assert.equal(SCHEMA_VERSION,1); assert.equal(typeof uuid(),'string');
  const ch=Character({id:'ch',name:'N'}), sk=Skill({id:'s',key:'melee',name:'Melee',ml:60});
  const wd=WeaponDefinition({id:'wd',name:'Sword'}), wi=WeaponInstance({id:'wi',definitionId:'wd'});
  const aa=ArmourArticle({id:'aa',definitionId:'ad'}), te=TimedEvent({id:'e',type:'x',dueRound:2});
  const co=Combatant({id:'c',characterId:'ch',name:'N'}), op=CombatOptions(), ca=Campaign({id:'camp',name:'C'});
  for(const x of [ch,sk,wd,wi,aa,te,co,op,ca]) assert.doesNotThrow(()=>JSON.stringify(x));
  assert.equal(pairKey('z','a'),'a::z');
});


test('E2E Rider Impact persists through the earning turn and ensuing round only',()=>{
  const fx=riderImpactEffect({mountRiderImpact:6,straightDistanceFt:100,earnedRound:4});
  assert.deepEqual(fx,{bonus:6,earnedRound:4,activeThroughRound:5});
  assert.equal(riderImpactAtRound(fx,4),6);assert.equal(riderImpactAtRound(fx,5),6);assert.equal(riderImpactAtRound(fx,6),0);
  const half=riderImpactEffect({mountRiderImpact:6,straightDistanceFt:50,earnedRound:4});assert.equal(half.bonus,3);
});

test('E2E shared rider+mount turn cannot Block/Counterstrike both attacks',()=>{
  assert.equal(mountedPairDefence({defence:'block'}).nextRequired,'dodge');
  assert.equal(mountedPairDefence({previousDefence:'block',defence:'dodge'}).allowed,true);
  assert.equal(mountedPairDefence({previousDefence:'block',defence:'counterstrike'}).allowed,false);
  assert.equal(mountedPairDefence({previousDefence:'dodge',defence:'counterstrike'}).allowed,true);
  assert.equal(mountedPairDefence({previousDefence:'dodge',defence:'block'}).allowed,true);
  assert.equal(mountedPairDefence({previousDefence:'dodge',defence:'dodge'}).allowed,false);
});


test('Mount failed Stumble produces p355 blunt trauma and leg-treatment HR penalty',()=>{
  assert.deepEqual(mountStumbleTrauma({stumbleSL:'S',impactD10:7}),{failed:false});
  const f=mountStumbleTrauma({stumbleSL:'F',impactD10:7,legInjurySeverity:'S'});assert.equal(f.strikeImpact,7);assert.equal(f.aspect,'blunt');assert.equal(f.legTreatmentHRModifier,-2);
  const cf=mountStumbleTrauma({stumbleSL:'CF',impactD10:7,legInjurySeverity:'G'});assert.equal(cf.strikeImpact,12);assert.equal(cf.legTreatmentHRModifier,-3);
});

test('Thrown rider fall is d10-2b with +5 at Full/Double Move',()=>{
  assert.equal(thrownRiderTrauma({impactD10:6,moveRate:'half'}).strikeImpact,4);
  assert.equal(thrownRiderTrauma({impactD10:6,moveRate:'full'}).strikeImpact,9);
  assert.equal(thrownRiderTrauma({impactD10:6,moveRate:'double'}).strikeImpact,9);
  assert.equal(thrownRiderTrauma({impactD10:6,moveRate:'full'}).zoneDie,'d10');
});


test('E2E Melee post-resolution cannot advance past a pending Injury/Mishap decision',()=>{
  const f=createMeleePostResolution({hasStrike:true,hasMishaps:true,freePressEligible:true,actionTAAvailable:true});
  assert.throws(()=>completeMeleePostPhase(f,MELEE_POST_PHASE.INJURY,{resolutionComplete:false}),/pending/);
  assert.equal(f.current,MELEE_POST_PHASE.INJURY);
  completeMeleePostPhase(f,MELEE_POST_PHASE.INJURY,{resolutionComplete:true});
  assert.equal(f.current,MELEE_POST_PHASE.MISHAPS);
  assert.throws(()=>completeMeleePostPhase(f,MELEE_POST_PHASE.MISHAPS,{resolutionComplete:false}),/pending/);
  assert.equal(f.current,MELEE_POST_PHASE.MISHAPS);
});


test('Mounted Reach penalty is data-driven so camel can use its explicit -2 exception',()=>{
  assert.equal(mountedAimReach({riderAttacking:true,targetUnmountedHuman:true,aimZN:2}),-1);
  assert.equal(mountedAimReach({riderAttacking:true,targetUnmountedHuman:true,aimZN:2,reachPenalty:2}),-2);
  assert.equal(mountedAimReach({unmountedCounterstrikeAtRider:true,aimZN:1,reachPenalty:2}),-2);
});


test('Condition and GMDecision domain contracts are directly serialisable',()=>{
  const c=Condition({id:'cond-1',combatantId:'c1',type:'stunned',index:7,source:'injury'});
  assert.deepEqual(JSON.parse(JSON.stringify(c)),c);
  const d=GMDecision({id:'dec-1',type:'tight-quarters',combatantIds:['c1','c2'],choices:['ALLOW','PENALTY_-20','DISALLOW']});
  assert.equal(d.status,'pending');assert.deepEqual(JSON.parse(JSON.stringify(d)),d);
});

import {createClenchState,beginConstrict,constrictTurnTransition,releaseClench} from '../src/rules/animal-abilities.js';
test('E2E Clench -> Constrict persists exact location, optional arm pin, and kills only on a later failed Shock after UNC',()=>{
 const c=createClenchState({attackerId:'snake',targetId:'victim',location:'neck',success:true});
 assert.equal(c.location,'neck');
 const coil=beginConstrict({clenchState:c,grabHoldWon:true,pinArmsTA:true,zone:'head'});
 assert.equal(coil.state.armsPinned,true);
 assert.equal(constrictEscape({armsPinned:coil.state.armsPinned}).grabBreakAllowed,false);
 const reachesUNC=constrictTurnTransition({state:coil.state,grabMaintained:true,targetWasUNC:false,shockFailed:true,resultingShockState:SHOCK_STATE.UNC});
 assert.equal(reachesUNC.shockIndex,7); assert.equal(reachesUNC.cardiacDeath,false); assert.equal(reachesUNC.state.targetRenderedUNC,true);
 const nextFail=constrictTurnTransition({state:reachesUNC.state,grabMaintained:true,targetWasUNC:true,shockFailed:true,resultingShockState:SHOCK_STATE.UNC});
 assert.equal(nextFail.cardiacDeath,true); assert.equal(nextFail.active,false);
});
test('Clench/Constrict ends cleanly when Hold is broken and release clears arm pin',()=>{
 const c=createClenchState({attackerId:'snake',targetId:'victim',location:'abdomen',success:true});
 const coil=beginConstrict({clenchState:c,grabHoldWon:true,pinArmsTA:false,zone:'torso'}).state;
 const broken=constrictTurnTransition({state:coil,grabMaintained:false});
 assert.equal(broken.shockRequired,false); assert.equal(broken.state.active,false);
 assert.equal(releaseClench({...coil,armsPinned:true}).armsPinned,false);
});

import {scheduleExtendedShockCourse,scheduleComaCourse,extendedShockTransition,comaTransition,RECOVERY_ROUNDS_PER_HOUR,RECOVERY_ROUNDS_PER_DAY} from '../src/rules/recovery.js';
test('E2E Extended Shock repeats every four hours and recovery does not wake a patient whose Coma is still active',()=>{
 const ev=scheduleExtendedShockCourse({currentRound:10,combatantId:'c'});
 assert.equal(ev.dueRound,10+4*RECOVERY_ROUNDS_PER_HOUR);
 const r=extendedShockTransition({state:SHOCK_STATE.UNC,hr:5,sl:SL.S,comaActive:true,currentRound:ev.dueRound,combatantId:'c'});
 assert.equal(r.active,false); assert.equal(r.hr,6); assert.equal(r.effectiveState,SHOCK_STATE.UNC); assert.equal(r.comaActive,true); assert.equal(r.events.length,0);
 const still=extendedShockTransition({state:SHOCK_STATE.UNC,hr:4,sl:SL.S,comaActive:false,currentRound:10,combatantId:'c'});
 assert.equal(still.active,true); assert.equal(still.events[0].dueRound,10+4*RECOVERY_ROUNDS_PER_HOUR);
});
test('E2E Coma schedules each d10-day course independently and only coma recovery can wake the patient',()=>{
 const ev=scheduleComaCourse({currentRound:20,combatantId:'c',d10Days:7});
 assert.equal(ev.dueRound,20+7*RECOVERY_ROUNDS_PER_DAY);
 const ongoing=comaTransition({currentHR:3,sl:SL.S,currentRound:ev.dueRound,combatantId:'c'});
 assert.equal(ongoing.hr,4); assert.equal(ongoing.state,SHOCK_STATE.UNC); assert.equal(ongoing.pending.type,'coma-course-period-d10');
 const scheduled=comaTransition({currentHR:3,sl:SL.S,currentRound:ev.dueRound,combatantId:'c',nextD10Days:2});
 assert.equal(scheduled.events[0].dueRound,ev.dueRound+2*RECOVERY_ROUNDS_PER_DAY);
 const wake=comaTransition({currentHR:5,sl:SL.S,currentRound:1,combatantId:'c',comaDaysElapsed:12});
 assert.equal(wake.recovered,true); assert.equal(wake.state,SHOCK_STATE.NONE); assert.equal(wake.wearinessFatigue,10);
});

import {dueTraumaEvents} from '../src/state/scheduler.js';
import {resumeInjuryHealingAfterInfection} from '../src/rules/healing.js';
test('E2E active infection suspends due Injury Healing Rolls but not Infection Course or unrelated trauma events',()=>{
 const state={round:100,activeIR:null,events:[
  {type:'injury-healing-roll',dueRound:100,dueIR:null,combatantId:'c',data:{injuryId:'i1'}},
  {type:'infection-course-roll',dueRound:100,dueIR:null,combatantId:'c',data:{injuryId:'i1'}},
  {type:'blood-loss-healing-roll',dueRound:100,dueIR:null,combatantId:'c',data:{}}
 ]};
 const r=dueTraumaEvents(state,{infectionActive:true});
 assert.deepEqual(r.due.map(x=>x.type),['infection-course-roll','blood-loss-healing-roll']);
 assert.equal(r.suspended.length,1);
});
test('E2E defeating infection resumes each suspended injury on a fresh five-day healing cadence',()=>{
 const events=resumeInjuryHealingAfterInfection({currentRound:500,combatantId:'c',injuryIds:['i1','i2']});
 assert.equal(events.length,2); assert.equal(events[0].dueRound,500+5*HEALING_ROUNDS_PER_DAY); assert.equal(events[1].data.injuryId,'i2');
});

import {bloodStoppageTransition} from '../src/rules/bleeding.js';
test('E2E Blood Stoppage consumes exactly one periodic Advance slot and never double-counts the same five-minute period',()=>{
 const event=scheduleBleederAdvance({currentRound:1,currentIR:50,combatantId:'c',injuryId:'i'});
 const f=bloodStoppageTransition({sl:SL.F,event,currentRound:event.dueRound,currentIR:50,combatantId:'c',injuryId:'i'});
 assert.equal(f.consumeEvent,true); assert.equal(f.advanceRollRequired,true); assert.equal(f.bleedingContinues,true); assert.equal(f.result.nextStaunchBonus,10); assert.equal(f.nextEvent.dueRound,event.dueRound+BLOOD_LOSS_PERIOD_ROUNDS);
 const s=bloodStoppageTransition({sl:SL.S,event,currentRound:event.dueRound,currentIR:50,combatantId:'c',injuryId:'i'});
 assert.equal(s.advanceRollRequired,true); assert.equal(s.bleedingContinues,false); assert.equal(s.nextEvent,null);
 const cs=bloodStoppageTransition({sl:SL.CS,event,currentRound:event.dueRound,currentIR:50,combatantId:'c',injuryId:'i'});
 assert.equal(cs.advanceRollRequired,false); assert.equal(cs.nextEvent,null);
});

import {bloodLossAdvanceTransition} from '../src/rules/bleeding.js';
import {bloodLossHealingTransition} from '../src/rules/healing.js';
test('E2E Blood Loss BP and anaemic weakness are absolute state, never cumulatively re-added',()=>{
 const first=bloodLossAdvanceTransition({bloodLoss:{bp:0,weaknessFatigue:0},sl:SL.S,currentShockState:SHOCK_STATE.NONE});
 assert.deepEqual(first.bloodLoss,{bp:1,weaknessFatigue:5}); assert.equal(first.shockState,SHOCK_STATE.STN);
 const second=bloodLossAdvanceTransition({bloodLoss:first.bloodLoss,sl:SL.S,currentShockState:first.shockState});
 assert.deepEqual(second.bloodLoss,{bp:2,weaknessFatigue:10}); assert.equal(second.shockState,SHOCK_STATE.INC);
 // The second result is 10 total weakness, not +10 to the previous 5.
 assert.notEqual(first.bloodLoss.weaknessFatigue+second.bloodLoss.weaknessFatigue,second.bloodLoss.weaknessFatigue);
});
test('E2E Blood Loss recovery lowers BP and derives weakness from the remaining BP',()=>{
 const r=bloodLossHealingTransition({bloodLoss:{bp:3,weaknessFatigue:15},sl:SL.S,currentRound:100,combatantId:'c'});
 assert.deepEqual(r.bloodLoss,{bp:2,weaknessFatigue:10}); assert.equal(r.event.type,'blood-loss-healing-roll');
 const healed=bloodLossHealingTransition({bloodLoss:{bp:2,weaknessFatigue:10},sl:SL.CS,currentRound:100,combatantId:'c'});
 assert.deepEqual(healed.bloodLoss,{bp:0,weaknessFatigue:0}); assert.equal(healed.event,null);
});

import {actionLegality} from '../src/state/action-state.js';
test('E2E central action gate prevents direct helpers from bypassing INC/UNC/STN and alertness restrictions',()=>{
 assert.equal(actionLegality({action:'move',shockState:SHOCK_STATE.INC}).legal,false);
 assert.equal(actionLegality({action:'attack',shockState:SHOCK_STATE.UNC}).legal,false);
 assert.equal(actionLegality({action:'evade',shockState:SHOCK_STATE.STN}).legal,false);
 assert.equal(actionLegality({action:'move',moveRate:'double',shockState:SHOCK_STATE.STN}).legal,false);
 assert.equal(actionLegality({action:'pass',alertness:ALERTNESS.CONFUSED}).legal,true);
 assert.equal(actionLegality({action:'attack',alertness:ALERTNESS.CONFUSED}).legal,false);
 assert.equal(actionLegality({action:'attack',alertness:ALERTNESS.UNAWARE}).legal,false);
});
test('E2E central action gate preserves forced-CF use of a Grievous zone and concentration blocking',()=>{
 const g=actionLegality({action:'attack',requiresUnusableZone:true});
 assert.equal(g.legal,true); assert.equal(g.automaticCF,true);
 const c=actionLegality({action:'incant',requiresConcentration:true,concentrationAllowed:false});
 assert.equal(c.legal,false); assert.ok(c.reasons.includes('concentration-blocked'));
});

test('E2E Faldrik-style two Serious injuries survive save/import with combined Move, INC gate, and two delayed Morale debts',()=>{
 const injuries=[
  {id:'skull-s2',severity:'S',impairment:10,meta:{morale:{required:true,timing:'after-recovering-from-stunned'}}},
  {id:'thorax-s3',severity:'S',impairment:10,meta:{morale:{required:true,timing:'after-recovering-from-stunned'}}}
 ];
 const combinedImpairment=injuries.reduce((n,i)=>n+i.impairment,0);
 assert.equal(effectiveMove({move:50,impairment:combinedImpairment}).feet,30);
 assert.equal(applyShockState(SHOCK_STATE.STN,SHOCK_STATE.STN),SHOCK_STATE.INC);
 const state={schemaVersion:1,id:'combat',round:4,activeIR:60,combatants:[{id:'faldrik',injuries,conditions:[{id:'shock',combatantId:'faldrik',type:'shock-state',index:8,data:{state:SHOCK_STATE.INC}}]}],relations:{},events:[{id:'reroll',type:'shock-reroll',dueRound:4,dueIR:60,combatantId:'faldrik',data:{},timing:'end-turn'}],decisions:[],options:{},log:[]};
 const restored=importCombatState(exportCombatState(state));
 assert.equal(actionLegality({action:'attack',shockState:restored.combatants[0].conditions[0].data.state}).legal,false);
 assert.equal(moraleDebtsAfterShockRecovery({injuries:restored.combatants[0].injuries,currentShockState:SHOCK_STATE.INC}).length,0);
 assert.equal(moraleDebtsAfterShockRecovery({injuries:restored.combatants[0].injuries,currentShockState:SHOCK_STATE.STN}).length,0);
 assert.equal(moraleDebtsAfterShockRecovery({injuries:restored.combatants[0].injuries,currentShockState:SHOCK_STATE.NONE}).length,2);
 assert.equal(dueEvents(restored,{timing:'end-turn'}).length,1);
});

import {initiativeOrShockEML} from '../src/rules/injury-effects.js';
test('E2E Initiative/Shock EML applies fatigue but never injury impairment',()=>{
 assert.equal(initiativeOrShockEML({test:'initiative',baseML:60,fatigue:15,injuryImpairment:20}),45);
 assert.equal(initiativeOrShockEML({test:'shock',baseML:60,fatigue:15,injuryImpairment:20}),45);
 assert.equal(initiativeOrShockEML({test:'shock',baseML:60,fatigue:15,injuryImpairment:20,glancing:true}),55);
 assert.equal(initiativeOrShockEML({test:'shock',baseML:60,fatigue:15,injuryImpairment:20,shockReroll:true}),25);
 assert.equal(initiativeOrShockEML({test:'initiative',baseML:60,fatigue:15,injuryImpairment:20,glancing:true,shockReroll:true}),45);
});

test('E2E Faldrik movement composes Effective Move first, then independent prone and STN Difficult Movement',()=>{
 const em=effectiveMove({move:50,encumbrance:0,fatigue:0,impairment:10});
 assert.equal(em.feet,40);
 assert.equal(shockStateEffects(SHOCK_STATE.STN).movement,'difficult-no-double');
 assert.equal(movementAllowance({effectiveMoveFeet:em.feet,rate:'full',difficultSources:2}),10);
 // Adding fatigue changes Effective Move before the two Difficult Movement halvings.
 const fatigued=effectiveMove({move:50,fatigue:10,impairment:10});
 assert.equal(fatigued.feet,30);
 assert.equal(movementAllowance({effectiveMoveFeet:fatigued.feet,rate:'full',difficultSources:2}),5);
});

import {actionCommitmentLifecycle,actionCommitmentAt,interruptActionCommitment,abandonActionCommitment} from '../src/state/scheduler.js';
test('E2E p160 two-round commitment completes immediately before the same IR in round three',()=>{
 const c=actionCommitmentLifecycle({kind:'1+-round',rounds:2,startRound:1,startIR:42});
 assert.equal(c.completionRound,3); assert.equal(c.completionIR,42); assert.equal(c.status,'in-progress');
 assert.deepEqual(actionCommitmentAt(c,{round:2,ir:42}),{status:'in-progress',completesNow:false});
 assert.deepEqual(actionCommitmentAt(c,{round:3,ir:42}),{status:'completed',completesNow:true});
});
test('E2E one-round concentrating action occupies the full ensuing round boundary',()=>{
 const c=actionCommitmentLifecycle({kind:'1-round',startRound:3,startIR:42});
 assert.equal(c.completionRound,4); assert.equal(actionCommitmentAt(c,{round:4,ir:42}).completesNow,true);
});
test('E2E concentration loss interrupts commitment while aware defence may deliberately abandon it',()=>{
 const c=actionCommitmentLifecycle({kind:'1+-round',rounds:2,startRound:1,startIR:42});
 const shocked=interruptActionCommitment(c,{concentrationAllowed:false,reason:'shock-state'});
 assert.equal(shocked.status,'interrupted'); assert.equal(shocked.ignoreDefence,false); assert.equal(shocked.interruptionReason,'shock-state');
 const defended=abandonActionCommitment(c,{reason:'defence'});
 assert.equal(defended.status,'abandoned'); assert.equal(defended.abandoned,true); assert.equal(defended.abandonReason,'defence');
});

import {createReadiedAction,triggerReadiedAction,expireReadiedAction} from '../src/rules/actions.js';
test('E2E readied action persists only through later IRs of the declaring round and permanently adopts trigger IR',()=>{
 const r=createReadiedAction({action:'attack',startRound:5,startIR:70});
 assert.equal(triggerReadiedAction(r,{round:5,triggerIR:80}).triggered,false);
 const fired=triggerReadiedAction(r,{round:5,triggerIR:55});
 assert.equal(fired.triggered,true); assert.equal(fired.interrupts,true); assert.equal(fired.newIR,55); assert.equal(fired.previousIR,70);
 assert.equal(expireReadiedAction(r,{round:6}).status,'expired');
});
test('E2E readied Move carries its half-Move ceiling as persistent state',()=>{
 const r=createReadiedAction({action:'move',startRound:2,startIR:60}); assert.equal(r.maxMove,'half');
});

test('E2E save/import preserves an in-progress multi-round commitment and its exact completion boundary',()=>{
 const actionState=actionCommitmentLifecycle({kind:'1+-round',rounds:2,startRound:1,startIR:42});
 const state=CombatState({round:2,activeIR:42,combatants:[Combatant({id:'span',characterId:'char-span',name:'Faldrik',initiativeRank:42,actionState})]});
 const restored=importCombatState(exportCombatState(state)); const c=restored.combatants[0].actionState;
 assert.equal(c.status,'in-progress'); assert.equal(c.completionRound,3); assert.equal(actionCommitmentAt(c,{round:3,ir:42}).completesNow,true);
});
test('E2E save/import preserves a readied Move and its half-Move restriction until trigger',()=>{
 const actionState=createReadiedAction({action:'move',startRound:4,startIR:65});
 const state=CombatState({round:4,activeIR:50,combatants:[Combatant({id:'ready',characterId:'char-ready',name:'Watcher',initiativeRank:65,actionState})]});
 const restored=importCombatState(exportCombatState(state)); const r=restored.combatants[0].actionState;
 assert.equal(r.maxMove,'half'); assert.equal(triggerReadiedAction(r,{round:4,triggerIR:50}).newIR,50);
});
test('E2E concentrating defender either keeps action and must Ignore, or abandons it and defends normally',()=>{
 const c=actionCommitmentLifecycle({kind:'1-round',startRound:1,startIR:60});
 assert.deepEqual(defenceDuringCommitment(c,{aware:true}),{forcedIgnore:true,mayAbandon:true});
 const abandoned=abandonActionCommitment(c,{reason:'defence'});
 assert.equal(defenceDuringCommitment(abandoned,{aware:true}).forcedIgnore,false);
 assert.equal(abandoned.status,'abandoned');
});
test('E2E Shock during a kept concentrating action automatically interrupts concentration',()=>{
 const c=actionCommitmentLifecycle({kind:'1-round',startRound:1,startIR:60});
 const status=concentrationStatus({shockState:'stn'}); assert.equal(status.allowed,false);
 const interrupted=interruptActionCommitment(c,{concentrationAllowed:status.allowed,reason:status.reasons[0]});
 assert.equal(interrupted.status,'interrupted'); assert.equal(interrupted.interruptionReason,'shock-state');
});

test('E2E Missile contract feeds concrete 2-round crossbow span directly into scheduler',()=>{
 const span=missileActionContract({weaponType:'crossbow',action:'span',spanRounds:2});
 assert.equal(span.time,'2-round');
 const c=actionCommitmentLifecycle({kind:span.time,rounds:span.rounds,startRound:1,startIR:42});
 assert.equal(c.rounds,2); assert.equal(c.completionRound,3); assert.equal(c.completionIR,42);
});
test('E2E p160 crossbow chain is span 2 rounds -> load 1 round -> shoot 1 turn',()=>{
 const span=actionCommitmentLifecycle({kind:missileActionContract({weaponType:'crossbow',action:'span',spanRounds:2}).time,startRound:1,startIR:42});
 assert.equal(actionCommitmentAt(span,{round:3,ir:42}).completesNow,true);
 const loadContract=missileActionContract({weaponType:'crossbow',action:'load',projectileAccessible:'container'});
 const load=actionCommitmentLifecycle({kind:loadContract.time,startRound:3,startIR:42});
 assert.equal(actionCommitmentAt(load,{round:4,ir:42}).completesNow,true);
 const shoot=missileActionContract({weaponType:'crossbow',action:'shoot'});
 assert.equal(shoot.time,'1-turn'); assert.equal(shoot.defence,'any');
});

test('E2E p202 one-round spellstart completes before next IR but spellfire remains a separate 1-turn action',()=>{
 const spellstart=actionCommitmentLifecycle({kind:'1-round',startRound:1,startIR:60});
 assert.equal(actionCommitmentAt(spellstart,{round:2,ir:60}).completesNow,true);
 const spellfire={action:'incant',phase:'spellfire',time:'1-turn'};
 assert.equal(spellfire.time,'1-turn');
 assert.equal(spellstart.status,'in-progress');
});

import {meleeDeclarationSnapshot,allocateMeleeTacticalAdvantages} from '../src/rules/melee.js';
test('E2E p165 Melee declaration snapshot requires all pre-test Strike/Defence choices and survives JSON round-trip',()=>{
 const gate=meleeDefenceDeclaration({defence:DEFENCE.BLOCK,blockWeaponReadied:true});
 const d=meleeDeclarationSnapshot({attackerId:'a',targetId:'d',attackerWeaponId:'sword',attackerStrikeMode:'swing-edge',zoneDie:'d6',zoneAim:2,defence:DEFENCE.BLOCK,defenderWeaponId:'shield',defenderStrikeMode:'block',reachReferenceWeaponId:'spear',declarationGate:gate});
 assert.equal(d.attacker.zoneAim,2); assert.equal(d.defender.weaponId,'shield'); assert.equal(d.defender.reachReferenceWeaponId,'spear');
 assert.deepEqual(JSON.parse(JSON.stringify(d)),d);
 assert.throws(()=>meleeDeclarationSnapshot({attackerId:'a',targetId:'d',attackerWeaponId:'sword',attackerStrikeMode:'edge',zoneDie:'d6',defence:DEFENCE.DODGE}),/Zone Die and Zone Aim/);
});
test('E2E p165 Counterstrike declaration freezes its own strike zone before opposed Melee test',()=>{
 const d=meleeDeclarationSnapshot({attackerId:'a',targetId:'d',attackerWeaponId:'sword',attackerStrikeMode:'edge',zoneDie:'d6',zoneAim:1,defence:DEFENCE.COUNTERSTRIKE,defenderWeaponId:'axe',defenderStrikeMode:'edge',counterZoneDie:'d6',counterZoneAim:4});
 assert.equal(d.defender.counterZoneAim,4); assert.throws(()=>meleeDeclarationSnapshot({attackerId:'a',targetId:'d',attackerWeaponId:'s',attackerStrikeMode:'e',zoneDie:'d6',zoneAim:1,defence:DEFENCE.COUNTERSTRIKE,defenderWeaponId:'x',defenderStrikeMode:'e'}),/Counterstrike/);
});

import {meleePostResolutionFromOutcome} from '../src/state/scheduler.js';
test('E2E Melee outcome itself drives post-resolution phases instead of caller booleans',()=>{
 const out=resolveMeleeOutcome({attacker:{sl:SL.CS,roll:35,ml:60},defender:{sl:SL.F,roll:81,ml:60},defence:DEFENCE.BLOCK});
 assert.equal(out.strike,true); assert.equal(out.extraTA,1);
 const ta=allocateMeleeTacticalAdvantages({outcome:out,choices:[TA.ACTION]});
 const flow=meleePostResolutionFromOutcome({outcome:out,freePressEligible:true,taAllocation:ta});
 assert.deepEqual(flow.phases,['injury','free-press','action-ta','complete']);
});
test('E2E Melee outcome cannot invent post phases after a no-strike/no-TA result',()=>{
 const out=resolveMeleeOutcome({attacker:{sl:SL.F,roll:81,ml:60},defender:{sl:SL.S,roll:41,ml:60},defence:DEFENCE.BLOCK});
 const flow=meleePostResolutionFromOutcome({outcome:out,freePressEligible:false,taAllocation:allocateMeleeTacticalAdvantages({outcome:out,choices:[]})});
 assert.deepEqual(flow.phases,['complete']);
});

test('E2E Counterstrike declaration -> defender strike -> pending Injury survives save/import -> post flow resumes in order',()=>{
 const declaration=meleeDeclarationSnapshot({attackerId:'atk',targetId:'def',attackerWeaponId:'sword',attackerStrikeMode:'edge',zoneDie:'d6',zoneAim:1,defence:DEFENCE.COUNTERSTRIKE,defenderWeaponId:'axe',defenderStrikeMode:'edge',counterZoneDie:'d6',counterZoneAim:4});
 const out=resolveMeleeOutcome({attacker:{sl:SL.F,roll:81,ml:60},defender:{sl:SL.CS,roll:35,ml:60},defence:DEFENCE.COUNTERSTRIKE});
 assert.equal(out.striker,'defender'); assert.equal(declaration.defender.counterZoneAim,4);
 const location={id:'thorax',zone:'torso',locationShock:4,bleedingClass:4};
 const pending=resolveInjurySequence({location,effectiveImpact:10,aspect:'edge'});
 assert.equal(pending.complete,false); assert.equal(pending.pending.type,INJURY_PENDING.SHOCK);
 const ta=allocateMeleeTacticalAdvantages({outcome:out,choices:[TA.IMPACT]});
 const flow=meleePostResolutionFromOutcome({outcome:out,freePressEligible:true,taAllocation:ta});
 const state={schemaVersion:1,id:'combat',round:2,activeIR:60,combatants:[{id:'atk'},{id:'def'}],relations:{},events:[],decisions:[{id:'melee-1',type:'melee-resolution',declaration,outcome:out,injury:pending,postFlow:flow}],options:{},log:[]};
 const restored=importCombatState(exportCombatState(state));
 const d=restored.decisions[0]; assert.equal(d.declaration.defender.counterZoneAim,4); assert.equal(d.injury.pending.type,INJURY_PENDING.SHOCK); assert.equal(d.postFlow.current,'injury');
 const finished=resolveInjurySequence({location,effectiveImpact:10,aspect:'edge',shockSL:SL.S}); assert.equal(finished.complete,true);
 completeMeleePostPhase(d.postFlow,MELEE_POST_PHASE.INJURY); assert.equal(d.postFlow.current,'free-press');
});

import {resumeInterruptedAction} from '../src/state/action-state.js';
test('E2E readied Attack fully interrupts a turn and post-interrupt INC prevents the original action from resuming',()=>{
 const readied=createReadiedAction({action:'attack',startRound:3,startIR:70});
 const fired=triggerReadiedAction(readied,{round:3,triggerIR:50}); assert.equal(fired.interrupts,true);
 const resume=resumeInterruptedAction({action:'move',postInterruptState:{shockState:SHOCK_STATE.INC}});
 assert.equal(resume.mayResume,false); assert.ok(resume.legality.reasons.includes('incapacitated-no-independent-actions'));
});
test('E2E readied interruption permits original turn to continue only after fresh post-interrupt legality check',()=>{
 const resume=resumeInterruptedAction({action:'move',postInterruptState:{shockState:SHOCK_STATE.NONE,alertness:'aware'}});
 assert.equal(resume.mayResume,true);
});

test('E2E TA allocation occurs before Injury and Counterstrike can never invent an Action TA',()=>{
 const out=resolveMeleeOutcome({attacker:{sl:SL.F,roll:81,ml:60},defender:{sl:SL.CS,roll:35,ml:60},defence:DEFENCE.COUNTERSTRIKE});
 assert.equal(out.extraTA,1); assert.deepEqual(out.taTypes,[TA.IMPACT,TA.PRECISION]);
 assert.throws(()=>allocateMeleeTacticalAdvantages({outcome:out,choices:[TA.ACTION]}),/not allowed/);
 const ta=allocateMeleeTacticalAdvantages({outcome:out,choices:[TA.PRECISION]});
 const flow=meleePostResolutionFromOutcome({outcome:out,taAllocation:ta});
 assert.deepEqual(flow.phases,['injury','complete']); assert.equal(ta.precision,1);
});
test('E2E strike TA allocation validates every extra star and exposes Impact/Precision before Injury',()=>{
 const out=resolveMeleeOutcome({attacker:{sl:SL.CS,roll:35,ml:60},defender:{sl:SL.F,roll:81,ml:60},defence:DEFENCE.BLOCK});
 assert.equal(out.extraTA,1); assert.throws(()=>allocateMeleeTacticalAdvantages({outcome:out,choices:[]}),/Exactly 1/);
 const ta=allocateMeleeTacticalAdvantages({outcome:out,choices:[TA.IMPACT]}); assert.equal(ta.impact,1);
});

test('E2E post-resolution persists exact Mishap ownership and TA allocation across save/import',()=>{
 const out=resolveMeleeOutcome({attacker:{sl:SL.S,roll:41,ml:60},defender:{sl:SL.CF,roll:80,ml:60},defence:DEFENCE.DODGE});
 assert.equal(out.defenderMishap,'stumble');
 const ta=allocateMeleeTacticalAdvantages({outcome:out,choices:[TA.IMPACT]});
 const flow=meleePostResolutionFromOutcome({outcome:out,taAllocation:ta});
 assert.deepEqual(flow.mishaps,[{owner:'defender',type:'stumble'}]);
 const restored=JSON.parse(JSON.stringify(flow)); assert.deepEqual(restored.mishaps,flow.mishaps); assert.deepEqual(restored.taAllocation,flow.taAllocation);
 assert.deepEqual(restored.phases,['injury','mishaps','complete']);
});


test('E2E Precision Step 1 can resume after Location Die choice and returns the exact selected location',()=>{
 const table=[
  {zn:2,zone:'arm',lnMin:1,lnMax:5,id:'upper-arm',locationShock:1},
  {zn:2,zone:'arm',lnMin:6,lnMax:10,id:'forearm',locationShock:1},
  {zn:3,zone:'arm',lnMin:1,lnMax:5,id:'upper-arm',locationShock:1},
  {zn:3,zone:'arm',lnMin:6,lnMax:10,id:'forearm',locationShock:1}
 ];
 const pending=locationCandidates({bodyLocations:table,aimZN:1,zdRolls:[2,3],selectedZDIndex:0,ldRolls:[2,8]});
 assert.equal(pending.pending.type,'location-choice');
 const chosen=locationCandidates({bodyLocations:table,aimZN:1,zdRolls:[2,3],selectedZDIndex:0,ldRolls:[2,8],selectedLocationIndex:1});
 assert.equal(chosen.pending,null);
 assert.equal(chosen.selectedLocation.id,'forearm');
 assert.equal(chosen.selectedLocation.ld,8);
});

test('E2E Precision Step 1 rejects an invented Location Die choice that was not rolled',()=>{
 const table=[{zn:1,zone:'head',lnMin:1,lnMax:5,id:'skull'},{zn:1,zone:'head',lnMin:6,lnMax:10,id:'face'}];
 assert.throws(()=>locationCandidates({bodyLocations:table,aimZN:1,zdRolls:[1,1],selectedZDIndex:0,ldRolls:[2,8],selectedLocationIndex:2}),/Selected location/);
});

test('E2E Precision selected location is tested for Hard Cover before Impact and Injury',()=>{
 const table=[
  {zn:2,zone:'arm',lnMin:1,lnMax:5,id:'upper-arm',locationShock:1,bleedingClass:1},
  {zn:2,zone:'arm',lnMin:6,lnMax:10,id:'forearm',locationShock:1,bleedingClass:1}
 ];
 const loc=locationCandidates({bodyLocations:table,aimZN:1,zdRolls:[2,2],selectedZDIndex:0,ldRolls:[2,8],selectedLocationIndex:1}).selectedLocation;
 const hit=resolveMeleeStrikeHit({location:loc,aspect:'edge',impactDieRoll:10,weaponImpactModifier:5,armourValue:0,locationProtectedByHardCover:true});
 assert.equal(loc.id,'forearm');
 assert.equal(hit.deflectedByHardCover,true);assert.equal(hit.targetImpact,0);assert.equal(hit.injury,null);
});

test('E2E Metal Armour transforms before Compound and cannot regain edge Amputation after compounding',()=>{
 const loc={id:'shoulder',location:'shoulder',zone:'arm',locationShock:3,bleedingClass:2,triangleModifier:0,hasPlate:true};
 const old={id:'old',location:'shoulder',zone:'arm',severity:'M',level:1,aspect:'blunt'};
 const hit=resolveMeleeStrikeHit({location:loc,aspect:'edge',impactDieRoll:10,weaponImpactModifier:11,armourValue:0,metalArmour:true,existingInjuries:[old],compoundD10:1,shockSL:SL.CS});
 assert.equal(hit.injury.base.injury.level,5);assert.equal(hit.injury.base.injury.aspect,'edge');
 assert.equal(hit.injury.metal.transformed,true);assert.equal(hit.injury.metal.injury.level,4);assert.equal(hit.injury.metal.injury.aspect,'blunt');
 assert.equal(hit.injury.step3.injury.level,5);assert.equal(hit.injury.step3.injury.aspect,'blunt');
 assert.equal(hit.injury.step3.amputation,null);assert.equal(hit.injury.pending,null);
});


test('E2E Bestiary same-location Flame is a separate Fire injury and never receives weapon Impact TA',()=>{
 const loc={id:'thorax',location:'thorax',zone:'torso',locationShock:4,bleedingClass:0};
 const weaponInjury={id:'weapon-now',location:'thorax',zone:'torso',severity:'G',level:4,aspect:'edge'};
 const oldFire={id:'old-fire',location:'thorax',zone:'torso',severity:'M',level:1,aspect:'fire'};
 const r=resolveSameLocationFireFollowup({weaponAttackSucceeded:true,location:loc,fireStrikeImpact:10,fireArmourValue:4,existingInjuries:[weaponInjury,oldFire],compoundD10:1,shockSL:SL.CS});
 assert.equal(r.triggered,true);assert.equal(r.effectiveImpact,6);
 assert.equal(r.injury.base.injury.level,2);assert.equal(r.injury.base.injury.aspect,'fire');
 assert.equal(r.injury.step3.compound.tn,3); // S2 fire + old M1 fire; weapon G4e is excluded
 assert.equal(r.injury.step3.injury.level,3);assert.equal(r.injury.step3.injury.aspect,'fire');
});

test('E2E Bestiary same-location Flame does not trigger when the weapon attack did not succeed',()=>{
 assert.deepEqual(resolveSameLocationFireFollowup({weaponAttackSucceeded:false}),{triggered:false,injury:null});
});

import {dragonBreathReadiness,dragonBreathAction,dragonBreathImpact} from '../src/rules/animal-abilities.js';

test('E2E Dragon Breath readiness enforces CF/F idle and CS +5 without allowing storage',()=>{
 assert.deepEqual(dragonBreathReadiness({sl:SL.CF}),{ready:false,idleRounds:2,impactBonus:0});
 assert.deepEqual(dragonBreathReadiness({sl:SL.F}),{ready:false,idleRounds:1,impactBonus:0});
 const cs=dragonBreathReadiness({sl:SL.CS});assert.equal(cs.ready,true);assert.equal(cs.impactBonus,5);assert.equal(cs.mustDischargeNowOrRetest,true);
});

test('E2E Dragon Breath is own-IR only, never Action TA, with flying full Move versus grounded half Move',()=>{
 assert.equal(dragonBreathAction({ready:true,onOwnIR:true,fromActionTA:true}).allowed,false);
 assert.equal(dragonBreathAction({ready:true,onOwnIR:false}).allowed,false);
 assert.equal(dragonBreathAction({ready:true,onOwnIR:true,flying:true,movement:'full'}).maxMove,'full');
 assert.equal(dragonBreathAction({ready:true,onOwnIR:true,flying:false,movement:'full'}).allowed,false);
 assert.equal(dragonBreathAction({ready:true,onOwnIR:true,flying:false,movement:'charge'}).maxMove,'half');
});

test('E2E Mature Dragon Breath reproduces 20-foot bands, cone widths, 50% coverage, and CS impact',()=>{
 const mods=[15,11,7];
 const near=dragonBreathImpact({distanceFeet:20,d4:3,bandModifiers:mods,criticalBonus:5,targetOverlap:.5});
 assert.equal(near.band,1);assert.equal(near.widthFeet,5);assert.equal(near.strikeImpact,23);
 const mid=dragonBreathImpact({distanceFeet:21,d4:3,bandModifiers:mods,targetOverlap:.5});assert.equal(mid.strikeImpact,14);assert.equal(mid.widthFeet,10);
 const edge=dragonBreathImpact({distanceFeet:60,d4:3,bandModifiers:mods,targetOverlap:.49});assert.equal(edge.affected,false);assert.equal(edge.strikeImpact,null);
 assert.equal(dragonBreathImpact({distanceFeet:61,d4:3,bandModifiers:mods,targetOverlap:1}).inRange,false);
});

test('E2E Dragon Breath impact feeds the common Area Injury pipeline instead of a parallel injury rule',()=>{
 const breath=dragonBreathImpact({distanceFeet:35,d4:4,bandModifiers:[15,11,7],criticalBonus:0,targetOverlap:.75});
 const area=resolveAreaHit({strikeImpact:breath.strikeImpact,areaAV:6,aspect:'fire',shockSL:SL.CS});
 assert.equal(breath.strikeImpact,15);assert.equal(area.effectiveImpact,9);
 assert.equal(area.injury.step3.injury.level,2);assert.equal(area.injury.step3.injury.aspect,'fire');
 assert.equal(area.injury.location.area,true);
});

import {vhirFireContact} from '../src/rules/animal-abilities.js';

test('E2E Vhir Flame contact preserves same-location weapon burns but requests a random location for unarmed victory',()=>{
 const loc={id:'forearm',zone:'arm'};
 assert.deepEqual(vhirFireContact({kind:'weapon-flame',successful:true,location:loc}),{triggered:true,locationMode:'same-location',location:loc});
 const unarmed=vhirFireContact({kind:'unarmed-victory',successful:true,zone:'arm'});
 assert.equal(unarmed.triggered,true);assert.equal(unarmed.locationMode,'random-in-zone');assert.equal(unarmed.pending.type,'location-roll');assert.equal(unarmed.pending.zone,'arm');
});

test('E2E Blood of Agrik never invents the body location touched by Vhir blood',()=>{
 const p=vhirFireContact({kind:'blood-contact',successful:true});assert.equal(p.pending.type,'contact-location');
 const loc={id:'hand',zone:'arm'};const r=vhirFireContact({kind:'blood-contact',successful:true,location:loc});assert.equal(r.location,loc);assert.equal(r.pending,undefined);
});

test('E2E Initiative Reaction option starts aware combatants Confused and resolves first Reaction at start of turn', async()=>{
 const {initialAlertnessWithInitiativeReaction,initiativeReactionTurn}=await import('../src/rules/alertness.js');
 assert.deepEqual(initialAlertnessWithInitiativeReaction({initialState:ALERTNESS.AWARE,optionEnabled:true}),{state:ALERTNESS.CONFUSED,reactionTiming:'start-first-turn',initiativeReaction:true});
 const s=initiativeReactionTurn({sl:SL.S,firstTurn:true}); assert.equal(s.state,ALERTNESS.AWARE); assert.equal(s.mayActNormallyThisTurn,true); assert.equal(s.timing,'start-turn');
 const f=initiativeReactionTurn({sl:SL.F,firstTurn:true}); assert.equal(f.state,ALERTNESS.CONFUSED); assert.equal(f.repeatNextTurn,true);
});

test('E2E Oversized Target Zone d6 is placeable within LN1..10 and feeds real Step 1 location',()=>{
 const body=[{zn:1,lnMin:1,lnMax:5,id:'thorax',zone:'torso'},{zn:1,lnMin:6,lnMax:7,id:'abdomen',zone:'torso'},{zn:1,lnMin:8,lnMax:10,id:'pelvis',zone:'torso'}];
 const pending=locationCandidates({bodyLocations:body,aimZN:1,zdRolls:[1],ldRolls:[2],locationDie:'d6'});
 assert.deepEqual(pending.pending,{type:'location-placement',roll:2,minLN:2,maxLN:6});
 const placed=locationCandidates({bodyLocations:body,aimZN:1,zdRolls:[1],ldRolls:[2],locationDie:'d6',placedLN:6});
 assert.equal(placed.selectedLocation.id,'abdomen'); assert.equal(placed.selectedLocation.placedLN,6);
 assert.throws(()=>locationCandidates({bodyLocations:body,aimZN:1,zdRolls:[1],ldRolls:[2],locationDie:'d6',placedLN:8}),/Placed LN/);
});

test('Mental trauma p189 expression duration preserves 10 minutes and CF d6x10 extension', async()=>{
 const {psycheExpressionDuration}=await import('../src/rules/mental-trauma.js');
 assert.equal(psycheExpressionDuration({intensity:'trait'}).minutesAfterTrigger,10);
 assert.deepEqual(psycheExpressionDuration({intensity:'impulse',suppressionSL:SL.CF}).pending,{type:'d6-expression-duration'});
 assert.equal(psycheExpressionDuration({intensity:'disorder',suppressionSL:SL.CF,d6:4}).minutesAfterTrigger,40);
});

test('Mental trauma p190 astral Aural Shock forces immediate CF reembodiment while pure spirits dissolve by level-days', async()=>{
 const {auralShockDissolution}=await import('../src/rules/mental-trauma.js');
 const astral=auralShockDissolution({auralShockLevels:2,isAstral:true}); assert.equal(astral.reembody.result,SL.CF); assert.equal(astral.duration,'until-aural-shock-recovery');
 const spirit=auralShockDissolution({auralShockLevels:3,isSpirit:true}); assert.equal(spirit.durationDays,3); assert.equal(spirit.actionsAllowed,false); assert.equal(spirit.physicalIncarnationDestroyed,true);
});

test('Mental trauma p190 Possession Recovery maps CF/F stress and S/CS to pending Spirit Conflict', async()=>{
 const {possessionRecovery}=await import('../src/rules/mental-trauma.js');
 assert.equal(possessionRecovery({sl:SL.CF}).psycheStressGained,2); assert.equal(possessionRecovery({sl:SL.F}).psycheStressGained,1);
 assert.deepEqual(possessionRecovery({sl:SL.S}).pending,{type:'spirit-conflict',bonus:0}); assert.deepEqual(possessionRecovery({sl:SL.CS}).pending,{type:'spirit-conflict',bonus:20});
});

test('E2E armour composition applies Kurbul/Plate thickness and Maintenance before location AV reaches Injury', async()=>{
 const {locationArmourValue}=await import('../src/rules/armour-options.js');
 const r=locationArmourValue({layers:[{material:'plate',aq:-2},{material:'padded',aq:0}],zone:'arm',aspect:'edge',options:{kurbulPlateArmourValue:true,armourMaintenance:true}});
 assert.equal(r.av,11); // plate 11 -1 limb -1 AQ + padded 2
 assert.equal(r.hasPlate,true); assert.equal(r.rigid,false); assert.equal(r.metalArmour,true);
});

test('E2E Quick Area AV uses resolved Thorax f AV minus one while normal method requires weighted coverage', async()=>{
 const {resolvedAreaArmourValue}=await import('../src/rules/armour-options.js');
 const q=resolvedAreaArmourValue({thoraxLayers:[{material:'mail'},{material:'padded'}],quickOption:true}); assert.equal(q.areaAV,4); assert.equal(q.method,'quick-thorax-minus-1');
 const p=resolvedAreaArmourValue({quickOption:false}); assert.equal(p.pending.type,'weighted-area-av');
 assert.equal(resolvedAreaArmourValue({quickOption:false,weightedAreaAV:3.7}).areaAV,4);
});

test('E2E persistence stress: nested pending Injury/location/Psyche/Possession state is byte-stable across repeated export/import', async()=>{
 const {exportCombatState,importCombatState}=await import('../src/state/persistence.js');
 const state={schemaVersion:1,id:'stress',round:17,activeIR:65,combatants:[{id:'a',injuries:[]},{id:'b',injuries:[]}],relations:{'a::b':{inClose:true}},events:[],decisions:[
  {id:'d1',type:'injury',combatantIds:['b'],status:'pending',context:{pending:{type:'shock-roll'},nested:{location:{pending:{type:'location-placement',roll:3,minLN:3,maxLN:7}}}}},
  {id:'d2',type:'psyche',combatantIds:['a'],status:'pending',context:{pending:{type:'d6-expression-duration'}}},
  {id:'d3',type:'possession',combatantIds:['a'],status:'pending',context:{pending:{type:'spirit-conflict',bonus:20}}}
 ],log:[],options:{initiativeReactionRoll:true,oversizedTargetZone:true}};
 const j1=exportCombatState(state),r1=importCombatState(j1),j2=exportCombatState(r1),r2=importCombatState(j2),j3=exportCombatState(r2);
 assert.equal(j1,j2); assert.equal(j2,j3); assert.deepEqual(r2.decisions,state.decisions);
});

test('E2E persistence stress: multiple injury-linked timed events retain exact stable IDs and due timing', async()=>{
 const {exportCombatState,importCombatState}=await import('../src/state/persistence.js');
 const state={schemaVersion:1,id:'stress-events',round:9,activeIR:50,combatants:[{id:'c',injuries:[{id:'i1'},{id:'i2'}]}],relations:{},events:[
  {id:'e1',type:'blood-loss-advance',dueRound:69,dueIR:50,combatantId:'c',data:{injuryId:'i1'}},
  {id:'e2',type:'minor-impairment-activate',dueRound:129,dueIR:50,combatantId:'c',data:{injuryId:'i2'}},
  {id:'e3',type:'stunned-recovery',dueRound:10,dueIR:50,combatantId:'c',data:{},timing:'end-turn'}
 ],decisions:[],log:[],options:{}};
 const restored=importCombatState(exportCombatState(state)); assert.deepEqual(restored.events,state.events);
 const {dueEvents}=await import('../src/state/scheduler.js'); restored.round=10; restored.activeIR=50; assert.equal(dueEvents(restored).length,0); assert.equal(dueEvents(restored,{timing:'end-turn'})[0].id,'e3');
});

test('Spirit Conflict p296 breaks tied successes but never tied failures and applies Native Soul defence +1 SL', async()=>{
 const {spiritConflict}=await import('../src/rules/spirit-conflict.js');
 const fail=spiritConflict({attacker:{sl:SL.F,roll:80,ml:50},defender:{sl:SL.F,roll:90,ml:50}}); assert.equal(fail.winner,null); assert.equal(fail.bothFailed,true);
 const nat=spiritConflict({attacker:{sl:SL.S,roll:40,ml:60},defender:{sl:SL.F,roll:70,ml:50},defenderNativeSoul:true}); assert.equal(nat.defenderSL,SL.S); assert.equal(nat.fatigue.defender,5);
 const tie=spiritConflict({attacker:{sl:SL.S,roll:60,ml:60},defender:{sl:SL.S,roll:50,ml:60},loserKind:{defender:'physical'}}); assert.equal(tie.winner,'a'); assert.equal(tie.stars,1); assert.equal(tie.dissolution.auralShock,1);
});

test('Spirit Conflict dissolution maps spirit/astral/physical loss stars exactly', async()=>{
 const {spiritConflict}=await import('../src/rules/spirit-conflict.js');
 const spirit=spiritConflict({attacker:{sl:SL.CS,roll:20,ml:80},defender:{sl:SL.F,roll:70,ml:50},loserKind:{defender:'spirit'}}); assert.equal(spirit.dissolution.durationDays,2);
 const astral=spiritConflict({attacker:{sl:SL.CS,roll:20,ml:80},defender:{sl:SL.S,roll:40,ml:50},loserKind:{defender:'astral'}}); assert.equal(astral.dissolution.auralShock,1); assert.equal(astral.dissolution.reembodyResult,SL.CF);
});

test('Possession p297 requires natural active spirit victory, same locale and same-turn choice', async()=>{
 const {possessionAfterSpiritConflict}=await import('../src/rules/spirit-conflict.js');
 const conflict={winner:'a',stars:2};
 const p=possessionAfterSpiritConflict({conflict,initiatorIsNaturalSpirit:true,sameAstralLocale:true,sameTurn:true,choosePossess:null}); assert.equal(p.pending.type,'possession-choice');
 const yes=possessionAfterSpiritConflict({conflict,initiatorIsNaturalSpirit:true,sameAstralLocale:true,sameTurn:true,choosePossess:true}); assert.equal(yes.possessed,true); assert.equal(yes.possessedPersonality,'mute');
 assert.equal(possessionAfterSpiritConflict({conflict,initiatorIsNaturalSpirit:true,sameAstralLocale:true,sameTurn:false,choosePossess:true}).eligible,false);
});

test('Possession Recovery p190 now terminates through actual Spirit Conflict outcome', async()=>{
 const {possessionRecoveryConflictOutcome}=await import('../src/rules/spirit-conflict.js');
 assert.equal(possessionRecoveryConflictOutcome({conflict:{winner:'a',stars:1},possessedSide:'a'}).possessed,false);
 const lost=possessionRecoveryConflictOutcome({conflict:{winner:'b',stars:2},possessedSide:'a'}); assert.equal(lost.possessed,true); assert.equal(lost.auralShock,2); assert.equal(lost.restartPossession,true);
});

test('Native Soul defence SL helper caps one-step increase at CS', async()=>{ const {nativeSoulDefenceSL}=await import('../src/rules/spirit-conflict.js'); assert.equal(nativeSoulDefenceSL(SL.F,{nativeSoul:true}),SL.S); assert.equal(nativeSoulDefenceSL(SL.CS,{nativeSoul:true}),SL.CS); });
