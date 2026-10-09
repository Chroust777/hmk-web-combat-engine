import { SL } from './tests.js';

export const MISSILE_RANGE={PB:'direct-pb',DIRECT:'direct',VOLLEY2:'volley-2',VOLLEY3:'volley-3',VOLLEY4:'volley-4'};

export function chargingThrowBonusEligible({chargeMovementFeet=0}={}){
  return Number.isFinite(chargeMovementFeet) && chargeMovementFeet>=20;
}

export function missileRange({distance,baseRange,thrownPbZD=null,chargingThrow=false}={}){
  if(distance<0||baseRange<=0) throw new RangeError('Valid distance and Base Range required');
  if(distance<=baseRange/2) return {band:MISSILE_RANGE.PB,type:'direct',rangeModifier:10,zd:thrownPbZD??6,impactModifier:2,chargeImpactModifier:chargingThrow?3:null,areaDiameter:null};
  if(distance<=baseRange) return {band:MISSILE_RANGE.DIRECT,type:'direct',rangeModifier:0,zd:8,impactModifier:0,chargeImpactModifier:chargingThrow?1:null,areaDiameter:null};
  const max=chargingThrow?3:4;
  if(distance<=baseRange*2) return {band:MISSILE_RANGE.VOLLEY2,type:'volley',rangeModifier:0,zd:10,impactModifier:-2,chargeImpactModifier:chargingThrow?-2:null,areaDiameter:15};
  if(distance<=baseRange*3) return {band:MISSILE_RANGE.VOLLEY3,type:'volley',rangeModifier:-20,zd:10,impactModifier:-3,chargeImpactModifier:chargingThrow?-3:null,areaDiameter:15};
  if(max>=4&&distance<=baseRange*4) return {band:MISSILE_RANGE.VOLLEY4,type:'volley',rangeModifier:-40,zd:10,impactModifier:-4,chargeImpactModifier:null,areaDiameter:15};
  return {band:'out-of-range',type:null,outOfRange:true};
}

export function directMissileOutcome({sl,targetMovement='still',roll=null,eml=null}={}){
  if(sl===SL.CF) return {strike:false,mishap:roll==null?null:(roll%10===0?'fumble':'stumble'),stars:0,precisionTA:0,choiceTA:0,nearbyCheck:false};
  if(sl===SL.F) return {strike:false,mishap:null,stars:0,precisionTA:0,choiceTA:0,nearbyCheck:eml!=null&&eml>5};
  const still=targetMovement==='still';
  const stars=(sl===SL.CS?2:1)+(still?1:0);
  return {strike:true,mishap:null,stars,precisionTA:still?1:0,choiceTA:sl===SL.CS?1:0,nearbyCheck:false};
}
export function spoiledMissileAttack(finalAdjustedEML){return finalAdjustedEML<=-40;}
export function spoiledMissileResolution({finalAdjustedEML,disposition=null,eml05Roll=null}={}){
  if(!spoiledMissileAttack(finalAdjustedEML)) return {spoiled:false,pending:null};
  if(disposition==null) return {spoiled:true,pending:{type:'spoiled-missile-disposition',choices:['action-wasted','automatic-fail']}};
  if(disposition==='action-wasted') return {spoiled:true,pending:null,attackOccurs:false,actionWasted:true,sl:null,mishap:null};
  if(disposition!=='automatic-fail') throw new RangeError('Unknown spoiled missile disposition');
  if(eml05Roll==null) return {spoiled:true,pending:{type:'eml05-cf-check',eml:5},attackOccurs:true,automaticFail:true};
  if(!Number.isInteger(eml05Roll)||eml05Roll<1||eml05Roll>100) throw new RangeError('d100 roll required');
  // The attack is already a failure; EML05 is rolled solely to distinguish CF.
  const cf=eml05Roll>5 && eml05Roll%5===0;
  return {spoiled:true,pending:null,attackOccurs:true,automaticFail:true,sl:cf?SL.CF:SL.F,mishap:cf?(eml05Roll%10===0?'fumble':'stumble'):null};
}
export function nearbyMissileStrike({targetCount,d20,d10=null}={}){
  if(!Number.isSafeInteger(targetCount)||targetCount<0) throw new RangeError('Target count must be a non-negative integer');
  if(!Number.isInteger(d20)||d20<1||d20>20) throw new RangeError('Nearby strike target roll must be d20 (1..20)');
  const hit=targetCount>0&&d20<=targetCount;
  if(!hit) return {hit:false,impactTA:0,zoneDie:null};
  if(d10==null) return {hit:true,complete:false,pending:{type:'impact-ta-d10'},zoneDie:'d10-or-target-zones'};
  if(!Number.isInteger(d10)||d10<1||d10>10) throw new RangeError('Nearby strike Impact TA roll must be d10 (1..10)');
  return {hit:true,complete:true,impactTA:(d10===5||d10===10)?1:0,zoneDie:'d10-or-target-zones'};
}
export function missileStrikeImpact({impactDieRoll,weaponImpactModifier=0,rangeImpactModifier=0,strengthImpactModifier=0,impactTACount=0,impactTAValue=0,bluntHead=false}={}){
  let total=impactDieRoll+weaponImpactModifier+rangeImpactModifier+strengthImpactModifier+(impactTACount*impactTAValue);
  if(bluntHead) total=Math.floor(total/2);
  return total;
}

import { passiveDeflect, resolvePassiveDeflectContact } from './shields.js';
import { armourAfterReduction } from './weapon-traits.js';
import { effectiveImpact, resolveInjurySequence } from './injury.js';
import { hardCoverStrike } from './positioning.js';

/** Pipeline after a successful Direct Missile test and after the player has
 * resolved Precision to one concrete body location. */
export function resolveDirectMissileHit({
  location,aspect,impactDieRoll,weaponImpactModifier=0,rangeImpactModifier=0,strengthImpactModifier=0,
  impactTACount=0,impactTAValue=0,bluntHead=false,armourValue=0,armourReduction=0,
  deflect=null,rigidArmour=false,existingInjuries=[],compoundD10=null,amputationSL=null,shockSL=null,currentShockState,
  metalArmour=false,broadBleedingBonus=0,locationProtectedByHardCover=false
}={}){
  const strikeImpact=missileStrikeImpact({impactDieRoll,weaponImpactModifier,rangeImpactModifier,strengthImpactModifier,impactTACount,impactTAValue,bluntHead});
  if(deflect){
    const d=resolvePassiveDeflectContact({missileStruck:true,strikeImpact,...deflect});
    if(d.deflected) return {deflected:true,strikeImpact,shieldWeaponDamageCheck:true,shieldDamage:d.shieldDamage,pending:d.pending??null,injury:null};
  }
  const cover=hardCoverStrike({locationProtected:locationProtectedByHardCover,strikeImpact});
  if(cover.deflectedByCover) return {deflected:false,deflectedByHardCover:true,strikeImpact,targetImpact:0,injury:null};
  const av=armourAfterReduction(armourValue,armourReduction);
  const eff=effectiveImpact({strikeImpact,armourValue:av});
  const injury=resolveInjurySequence({location,effectiveImpact:eff,aspect:bluntHead?'blunt':aspect,rigidArmour,existingInjuries,compoundD10,amputationSL,shockSL,currentShockState,projectile:true,metalArmour,bleedingImpactBonus:broadBleedingBonus});
  return {deflected:false,strikeImpact,armourValueAfterReduction:av,effectiveImpact:eff,injury};
}

/** Volley attack result before target-count resolution. */
export function volleyMissileOutcome({sl,roll=null,eml=null}={}){
  if(sl===SL.CF) return {potentialStrike:false,deviation:false,mishap:roll==null?null:(roll%10===0?'fumble':'stumble'),volleyPrecisionDice:0};
  if(sl===SL.F) return {potentialStrike:false,deviation:eml!=null&&eml>5,mishap:null,volleyPrecisionDice:0};
  return {potentialStrike:true,deviation:false,mishap:null,volleyPrecisionDice:sl===SL.CS?1:0};
}

/** Resolve target-count roll for a Volley Potential Strike.
 * CS replaces d20 with one d10; each step beyond CS adds another d10.
 * impactD10 is always a separate roll: 5 or 10 grants one Impact TA.
 */
export function volleyPotentialStrike({targetCount,targetRolls=[],volleyPrecisionDice=0,impactD10=null,selectedTargetRollIndex=null}={}){
  if(!Number.isSafeInteger(targetCount)||targetCount<0) throw new RangeError('Target count must be a non-negative integer');
  if(!Number.isSafeInteger(volleyPrecisionDice)||volleyPrecisionDice<0) throw new RangeError('Volley precision dice must be non-negative integers');
  if(!Array.isArray(targetRolls)) throw new TypeError('Target rolls must be an array');
  const die=volleyPrecisionDice>0?10:20;
  for(const roll of targetRolls){
    if(!Number.isInteger(roll)||roll<1||roll>die) throw new RangeError(`Volley target roll must be d${die} (1..${die})`);
  }
  const required=Math.max(1,volleyPrecisionDice);
  if(targetRolls.length<required) return {complete:false,pending:{type:'target-count-dice',die:`d${die}`,count:required-targetRolls.length}};
  const rolls=targetRolls.slice(0,required);
  const hits=rolls.map((roll,index)=>({index,roll,hit:targetCount>0&&roll<=targetCount})).filter(x=>x.hit);
  if(!hits.length) return {complete:true,hit:false,targetRoll:null,impactTA:0};
  if(hits.length>1&&selectedTargetRollIndex==null)
    return {complete:false,pending:{type:'target-roll-choice',choices:hits.map(x=>x.index)},hits};
  const selected=selectedTargetRollIndex==null?hits[0]:hits.find(x=>x.index===selectedTargetRollIndex);
  if(!selected) throw new RangeError('Chosen volley target die must identify a real hit');
  if(impactD10==null) return {complete:false,hit:true,pending:{type:'impact-ta-d10'},targetIndex:selected.index,targetRoll:selected.roll};
  if(!Number.isInteger(impactD10)||impactD10<1||impactD10>10) throw new RangeError('Volley Impact TA roll must be d10 (1..10)');
  return {complete:true,hit:true,targetRoll:selected.roll,targetIndex:selected.index,impactTA:(impactD10===5||impactD10===10)?1:0};
}

export function volleyZoneDieSize(targetZoneCount=10){
  if(!Number.isInteger(targetZoneCount)||targetZoneCount<1) throw new RangeError('Target zone count must be a positive integer');
  return Math.max(10,targetZoneCount);
}

/** Successful Volley Potential Strike enters the same projectile Injury pipeline.
 * Passive Deflect remains a pre-Injury gate exactly as for Direct Missile.
 */
export function resolveVolleyMissileHit(args={}){
  return resolveDirectMissileHit(args);
}

import { heftPenalty } from './weapon-modes.js';

export function effectiveBaseRange({baseRange,wet=false,weaponType=null}={}){
  if(!Number.isFinite(baseRange)||baseRange<=0) throw new RangeError('Base Range must be > 0');
  return wet&&(weaponType==='bow'||weaponType==='crossbow') ? baseRange/2 : baseRange;
}

/** Exact p163 situational Missile EML. Range PB +10 is supplied by missileRange.rangeModifier
 * and therefore must never be added a second time. */
export function calculateMissileEML({
  ml,rangeModifier=0,targetMovement='still',effectiveDodgeIndex=0,movingShooter=false,
  weaponType=null,str=null,hft=null,thrownObject=false,oblong=false,windforce=0,crosswind=false,
  traumaPenalty=0,aimedPreviousRound=false,targetTAR=1,attackType='direct'
}={}){
  if(!Number.isFinite(ml)) throw new TypeError('Missile ML required');
  const parts={range:rangeModifier,target:0,movingShooter:0,heft:0,object:0,crosswind:0,trauma:traumaPenalty,aim:aimedPreviousRound?10:0,massiveTarget:0};
  if(targetMovement==='moving') parts.target=-10;
  else if(targetMovement==='evading') parts.target=-(Math.max(0,effectiveDodgeIndex)*5);
  if(movingShooter&&weaponType!=='thrown') parts.movingShooter=-10;
  if(weaponType==='thrown'&&Number.isFinite(str)&&Number.isFinite(hft)) parts.heft=heftPenalty({str,hft}).penalty;
  if(thrownObject) parts.object=oblong?-20:-10;
  if(crosswind&&windforce>0){
    if(attackType==='direct'&&windforce>=2) parts.crosswind=-10*windforce;
    if(attackType==='volley'&&windforce>=1) parts.crosswind=-20*windforce;
  }
  if(attackType==='direct'&&targetTAR>=2) parts.massiveTarget=5*targetTAR;
  const raw=ml+Object.values(parts).reduce((a,b)=>a+b,0);
  return {raw,spoiled:spoiledMissileAttack(raw),parts};
}

const GRENADE_DISTANCE_COLUMNS=[5,15,30,60,90,120];
const GRENADE_DICE={F:[0,1,2,3,4,6],S:[0,0,1,2,3,4],CS:[0,0,0,1,2,3]};
export function grenadeDeviation({distance,sl,dieRoll=null,directionD8=null,criticalRoll=null}={}){
  const col=GRENADE_DISTANCE_COLUMNS.findIndex(x=>distance<=x);
  if(col<0) return {outOfRange:true};
  if(sl===SL.CF) return {outOfRange:false,mishap:criticalRoll==null?null:(criticalRoll%10===0?'fumble':'stumble'),deviationFt:null};
  const key=sl===SL.F?'F':sl===SL.S?'S':'CS';
  const die=GRENADE_DICE[key][col];
  if(die===0) return {outOfRange:false,deviationFt:0,direction:null};
  if(die===1) return {outOfRange:false,deviationFt:5,direction:directionD8};
  if(dieRoll==null) return {outOfRange:false,pending:{type:'deviation',die:`d${die}`}};
  if(dieRoll<1||dieRoll>die) throw new RangeError(`Deviation roll must be d${die}`);
  return {outOfRange:false,deviationFt:dieRoll*5,direction:directionD8};
}

export function projectileHead(head){
  if(head==='bodkin') return {armourReduction:{point:4},impactTA:{point:3},bleeding:null,halveFinalImpact:false};
  if(head==='blunt') return {armourReduction:null,impactTA:null,bleeding:null,halveFinalImpact:true};
  if(head==='broad') return {armourReduction:null,impactTA:null,bleeding:5,halveFinalImpact:false};
  return {armourReduction:null,impactTA:null,bleeding:null,halveFinalImpact:false};
}

export function missileActionContract({weaponType,action,pull=null,draw=null,projectileAccessible='container',spanRounds=1,aware=true}={}){
 const wt=weaponType;
 if(action==='aim'&&wt==='bow'){
   const allowed=Number.isFinite(pull)&&Number.isFinite(draw)&&pull-draw>=75;
   return {allowed,time:'1-round',movement:'none',defence:'ignore',reason:allowed?null:'bow-pull-must-exceed-draw-by-75'};
 }
 if(action==='aim'&&(wt==='crossbow'||wt==='thrown')) return {allowed:true,time:'1-round',movement:'none',defence:'ignore'};
 if(action==='span'&&wt==='crossbow') return {allowed:true,time:`${spanRounds}-round`,rounds:spanRounds,movement:'none',defence:'ignore'};
 if(action==='load'&&['bow','sling','crossbow'].includes(wt)){
   if(projectileAccessible==='hand'||projectileAccessible==='nearby') return {allowed:true,time:'free',movement:'none',defence:'any',mayRequireFreeLoadTest:true,testChoice:['dexterity','missile']};
   return {allowed:true,time:'1-round',movement:'none',defence:'ignore'};
 }
 if(action==='shoot'&&['bow','sling','crossbow'].includes(wt)) return {allowed:true,time:'1-turn',movement:'half',defence:'any'};
 if(action==='throw'&&wt==='thrown') return {allowed:true,time:'1-turn',movement:'none',defence:'any'};
 if(action==='charge'&&wt==='thrown') return {allowed:true,time:'1-turn',movement:'half',defence:'any',minimumTargetDistanceFt:5};
 return {allowed:false};
}
export function abandonIgnoreMissileActionToDefend({aware=false,actionDefence='any'}={}){
 return {mayAbandon:!!(aware&&actionDefence==='ignore'),actionLost:!!(aware&&actionDefence==='ignore'),defenceAfterAbandon:aware&&actionDefence==='ignore'?'any':actionDefence};
}
