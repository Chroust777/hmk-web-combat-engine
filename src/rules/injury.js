import { SL } from './tests.js';

export function severityFromInjuryLevel(level){
  if(level<=0) return null;
  if(level===1) return 'M';
  if(level<=3) return 'S';
  return 'G';
}

export function compoundCompatible(a,b){
  if(!a||!b) return false;
  if(a.location!==b.location) return false;
  const aArea=!!a.area, bArea=!!b.area;
  if(aArea||bArea) return aArea&&bArea;
  const elemental=x=>x.aspect==='fire'||x.aspect==='frost';
  if(elemental(a)||elemental(b)) return elemental(a)&&elemental(b);
  return true;
}

export function compoundInjury({existing=[],incoming,d10}={}){
  if(!incoming) throw new Error('Incoming injury required');
  const compatible=existing.filter(x=>compoundCompatible(x,incoming));
  if(!compatible.length) return {required:false,tn:null,success:false,injury:{...incoming},injuryShock:incoming.level};
  const pool=[...compatible,incoming];
  const tn=pool.reduce((s,x)=>s+x.level,0);
  const success=d10<=tn;
  if(!success) return {required:true,tn,success:false,injury:{...incoming},injuryShock:incoming.level};
  const max=Math.max(...pool.map(x=>x.level));
  // If tied for highest IL, the most recent injury is increased. Incoming is always most recent.
  const chosen=(incoming.level===max)?incoming:[...compatible].reverse().find(x=>x.level===max);
  const incomingChosen=chosen===incoming;
  const oldLevel=chosen.level;
  const newLevel=Math.min(5,oldLevel+1);
  const compounded={...chosen,level:newLevel,severity:severityFromInjuryLevel(newLevel)};
  const resultIncoming=incomingChosen?compounded:{...incoming};
  return {
    required:true,tn,success:true,
    injury:resultIncoming,
    compoundedInjuryId:incomingChosen?(incoming.id??null):(chosen.id??null),
    compoundedExisting:incomingChosen?null:compounded,
    g5Compounded:oldLevel===5,
    injuryShock:oldLevel===5?6:newLevel
  };
}

export function amputationEligible({injury,triangleModifier=null}={}){
  return !!injury && injury.level===5 && injury.severity==='G' && injury.aspect==='edge' && triangleModifier!==null && triangleModifier!==undefined;
}

export function amputationTestML({strengthML,triangleModifier,isFolk=true}={}){
  if(isFolk) return strengthML+triangleModifier;
  if(triangleModifier===20) return 70;
  if(triangleModifier===0) return 50;
  if(triangleModifier===-20) return 30;
  throw new RangeError('Amputation triangle modifier must be +20, 0, or -20');
}

export function resolveAmputation({injury,triangleModifier=null,strengthSL,locationNormallyBleeds=false}={}){
  if(!amputationEligible({injury,triangleModifier})) return {eligible:false,severed:false,dead:false,forceBleeder:false,shockTestModifier:0};
  if(strengthSL===SL.CF) return {eligible:true,severed:true,dead:injury.location==='neck',forceBleeder:true,shockTestModifier:0};
  if(strengthSL===SL.F) return {eligible:true,severed:true,dead:injury.location==='neck',forceBleeder:!!locationNormallyBleeds,shockTestModifier:0};
  if(strengthSL===SL.S) return {eligible:true,severed:false,dead:false,forceBleeder:false,shockTestModifier:-20};
  if(strengthSL===SL.CS) return {eligible:true,severed:false,dead:false,forceBleeder:false,shockTestModifier:0};
  throw new RangeError('Amputation Strength SL must be CF/F/S/CS');
}

export function injuryFromEffectiveImpact({effectiveImpact,aspect,rigidArmour=false}={}){
  if(effectiveImpact<=0) return {injury:null,glancing:false,injuryShock:0,shockTestModifier:0};
  if(effectiveImpact<5){
    const glancing=rigidArmour&&(aspect==='edge'||aspect==='point'||aspect==='e'||aspect==='p');
    if(glancing) return {injury:null,glancing:true,injuryShock:1,shockTestModifier:10};
    return {injury:{severity:'M',level:1,aspect},glancing:false,injuryShock:1,shockTestModifier:0};
  }
  const level=effectiveImpact>=20?5:effectiveImpact>=15?4:effectiveImpact>=10?3:2;
  return {injury:{severity:severityFromInjuryLevel(level),level,aspect},glancing:false,injuryShock:level,shockTestModifier:0};
}

export function metalArmourTransform({injury,enabled=false,hasScaleOrMail=false,hasPlate=false}={}){
  if(!enabled||!injury||injury.level<2) return {injury:injury?{...injury}:injury,transformed:false};
  const a=injury.aspect==='e'?'edge':injury.aspect==='p'?'point':injury.aspect;
  const applies=(a==='edge'&&(hasScaleOrMail||hasPlate))||(a==='point'&&hasPlate);
  if(!applies) return {injury:{...injury},transformed:false};
  const level=injury.level-1;
  return {injury:{...injury,level,severity:severityFromInjuryLevel(level),aspect:'blunt'},transformed:true,original:{...injury}};
}

export function bleedingEligibleForInjury({bleedingClass=0,injury}={}){
  if(!injury) return false;
  const a=injury.aspect==='e'?'edge':injury.aspect==='p'?'point':injury.aspect==='b'?'blunt':injury.aspect;
  if(bleedingClass<=0) return false;
  if(injury.level>=5) return a==='edge'||a==='point'||a==='blunt';
  if(injury.level===4) return bleedingClass>=2&&(a==='edge'||a==='point');
  if(injury.level===3) return bleedingClass>=3&&a==='edge';
  return false;
}

export function resolveInjuryStep3({existing=[],incoming,d10=null,bleedingClass=0,triangleModifier=null,amputationSL=null,locationNormallyBleeds=null}={}){
  if(!incoming) return {injury:null,compound:null,bleeder:false,amputation:null,injuryShock:0,shockTestModifier:0,dead:false};
  const compound=d10==null?{required:existing.some(x=>compoundCompatible(x,incoming)),success:false,injury:{...incoming},injuryShock:incoming.level}:compoundInjury({existing,incoming,d10});
  const causal=compound.injury;
  const normalBleeder=locationNormallyBleeds??(bleedingClass>0);
  let bleeder=bleedingEligibleForInjury({bleedingClass,injury:causal});
  let amputation=null;
  if(amputationEligible({injury:causal,triangleModifier})&&amputationSL!=null){
    amputation=resolveAmputation({injury:causal,triangleModifier,strengthSL:amputationSL,locationNormallyBleeds:normalBleeder});
    if(amputation.forceBleeder) bleeder=true;
  }
  return {injury:causal,compound,bleeder,amputation,injuryShock:compound.injuryShock,shockTestModifier:amputation?.shockTestModifier??0,dead:!!amputation?.dead};
}

import { calculateShockState, shockStateFromIndex, applyShockState, SHOCK_STATE, moraleRequirementAfterInjury } from './shock.js';
import { acuteInjuryEffect, injuryMishap, areaInjuryEffect, projectileImpalement } from './injury-effects.js';

export const INJURY_PENDING={COMPOUND:'compound-roll',AMPUTATION:'amputation-roll',SHOCK:'shock-roll'};

/**
 * Deterministic Injury Sequence core (steps 1-5) once a strike location and
 * effective impact are known. Random tests are explicit inputs; if a required
 * test has not yet been supplied the resolver returns a pending request rather
 * than assuming an outcome.
 */
export function resolveInjurySequence({
  location,
  effectiveImpact,
  aspect,
  rigidArmour=false,
  existingInjuries=[],
  compoundD10=null,
  amputationSL=null,
  shockSL=null,
  currentShockState=SHOCK_STATE.NONE,
  projectile=false,
  metalArmour=false,
  shockIndexModifier=0,
  bleedingImpactBonus=0
}={}){
  if(!location) throw new Error('Resolved injury location is required');
  if(!Number.isFinite(effectiveImpact)) throw new Error('Effective impact is required');
  if(!aspect) throw new Error('Strike aspect is required');
  const base=injuryFromEffectiveImpact({effectiveImpact,aspect,rigidArmour});
  if(!base.injury && !base.glancing){
    return {complete:true,pending:null,location,base,step3:null,shock:null,effect:null,mishaps:[],morale:{required:false,timing:null},impaled:false,dead:false};
  }

  // Glancing Blow has no recorded injury and therefore skips Compound,
  // Bleeding, Amputation and later treatment, but still proceeds to Shock.
  if(base.glancing){
    if(shockSL==null) return {complete:false,pending:{type:INJURY_PENDING.SHOCK,modifier:base.shockTestModifier},location,base};
    const rawShock=calculateShockState({locationShock:location.area?6:location.locationShock,injuryShock:1,shockSL});
    const shock={index:Math.max(0,rawShock.index+shockIndexModifier),state:null}; shock.state=shockStateFromIndex(shock.index);
    const finalState=applyShockState(currentShockState,shock.state);
    return {complete:true,pending:null,location,base,step3:null,shock:{...shock,state:finalState,rawState:shock.state,shockSL,testModifier:base.shockTestModifier},effect:null,mishaps:[],morale:{required:false,timing:null},impaled:false,dead:finalState===SHOCK_STATE.KIA};
  }

  const metal=metalArmourTransform({injury:base.injury,enabled:metalArmour,hasScaleOrMail:!!location.hasScaleOrMail,hasPlate:!!location.hasPlate});
  const incoming={...metal.injury,id:metal.injury.id??null,location:location.id??location.location,zone:location.zone,area:!!location.area};
  const compoundRequired=existingInjuries.some(x=>compoundCompatible(x,incoming));
  if(compoundRequired && compoundD10==null){
    const tn=[...existingInjuries.filter(x=>compoundCompatible(x,incoming)),incoming].reduce((s,x)=>s+x.level,0);
    return {complete:false,pending:{type:INJURY_PENDING.COMPOUND,die:'d10',tn},location,base,metal,incoming};
  }

  // First resolve Compound so eligibility for Amputation uses the causal injury
  // after Compound, exactly as step 3 orders the special effects.
  const preStep3=resolveInjuryStep3({
    existing:existingInjuries,incoming,d10:compoundD10,
    bleedingClass:location.bleedingClass??0,triangleModifier:location.triangleModifier??null,
    amputationSL:null,locationNormallyBleeds:(location.bleedingClass??0)>0
  });
  if(amputationEligible({injury:preStep3.injury,triangleModifier:location.triangleModifier??null}) && amputationSL==null){
    return {complete:false,pending:{type:INJURY_PENDING.AMPUTATION,test:'strength',triangleModifier:location.triangleModifier},location,base,metal,incoming,compound:preStep3.compound};
  }
  const step3=resolveInjuryStep3({
    existing:existingInjuries,incoming,d10:compoundD10,
    bleedingClass:location.bleedingClass??0,triangleModifier:location.triangleModifier??null,
    amputationSL,locationNormallyBleeds:(location.bleedingClass??0)>0
  });
  // Broad projectile heads (p108) add to Effective Impact only for the
  // Bleeding check. The actual injury level/severity and Shock stay unchanged.
  if(!step3.bleeder && bleedingImpactBonus>0){
    const virtual=injuryFromEffectiveImpact({effectiveImpact:effectiveImpact+bleedingImpactBonus,aspect,rigidArmour:false}).injury;
    if(virtual && bleedingEligibleForInjury({bleedingClass:location.bleedingClass??0,injury:virtual})) step3.bleeder=true;
  }
  if(step3.dead){
    return {complete:true,pending:null,location,base,metal,step3,shock:null,effect:null,mishaps:[],morale:{required:false,timing:null},impaled:false,dead:true,state:SHOCK_STATE.KIA};
  }
  const shockTestModifier=base.shockTestModifier+(step3.shockTestModifier??0);
  if(shockSL==null){
    return {complete:false,pending:{type:INJURY_PENDING.SHOCK,modifier:shockTestModifier},location,base,metal,step3};
  }
  const rawShock=calculateShockState({locationShock:location.area?6:location.locationShock,injuryShock:step3.injuryShock,shockSL});
  const shock={index:Math.max(0,rawShock.index+shockIndexModifier),state:null}; shock.state=shockStateFromIndex(shock.index);
  const finalState=applyShockState(currentShockState,shock.state);
  const effect=location.area?{...acuteInjuryEffect({severity:step3.injury.severity,shockSL}),...areaInjuryEffect({severity:step3.injury.severity})}:acuteInjuryEffect({severity:step3.injury.severity,shockSL});
  const mishapZone=location.area&&step3.injury.severity==='G'?'head':location.zone;
  const mishaps=injuryMishap({severity:step3.injury.severity,zone:mishapZone,location:location.id??location.location});
  const morale=moraleRequirementAfterInjury({severity:step3.injury.severity,shockState:finalState});
  const impaled=projectileImpalement({projectile,severity:step3.injury.severity,injuryLevel:step3.injury.level});
  return {complete:true,pending:null,location,base,metal,step3,shock:{...shock,state:finalState,rawState:shock.state,shockSL,testModifier:shockTestModifier},effect,mishaps,morale,impaled,dead:finalState===SHOCK_STATE.KIA,state:finalState};
}

export function zoneNumberFromRoll({aimZN=1,zdRoll}={}){
  if(!Number.isInteger(aimZN)||aimZN<1||!Number.isInteger(zdRoll)||zdRoll<1) throw new RangeError('Aim ZN and ZD roll must be positive integers');
  return aimZN+zdRoll-1;
}

/** Resolve Step 1 against a data-driven Body Location table.
 * bodyLocations rows: {zn, lnMin, lnMax, id/location, zone, ...}
 */
export function locationCandidates({bodyLocations=[],aimZN=1,zdRolls=[],ldRolls=[],exactLocation=null,selectedZDIndex=null,selectedLocationIndex=null,locationDie='d10',placedLN=null}={}){
  if(exactLocation) return {exact:true,miss:false,candidates:[exactLocation],zoneResults:[],requiredLocationDice:0};
  if(!zdRolls.length) return {exact:false,miss:false,pending:{type:'zone-dice'},candidates:[],zoneResults:[],requiredLocationDice:1};
  const zoneResults=zdRolls.map((roll,index)=>{
    const zn=zoneNumberFromRoll({aimZN,zdRoll:roll});
    const row=bodyLocations.find(r=>r.zn===zn);
    return {index,roll,zn,valid:!!row,zone:row?.zone??null};
  });
  const valid=zoneResults.filter(x=>x.valid);
  if(!valid.length) return {exact:false,miss:true,candidates:[],zoneResults,requiredLocationDice:0};
  if(selectedZDIndex==null && valid.length>1){
    return {exact:false,miss:false,pending:{type:'zone-choice',choices:valid.map(x=>x.index)},candidates:[],zoneResults,requiredLocationDice:null};
  }
  const chosen=selectedZDIndex==null?valid[0]:zoneResults.find(x=>x.index===selectedZDIndex&&x.valid);
  if(!chosen) throw new RangeError('Selected ZD must identify a valid target zone');
  const sameZoneCount=valid.filter(x=>x.zone===chosen.zone).length;
  if(ldRolls.length<sameZoneCount){
    return {exact:false,miss:false,pending:{type:'location-dice',count:sameZoneCount-ldRolls.length},candidates:[],zoneResults,selectedZN:chosen.zn,requiredLocationDice:sameZoneCount};
  }
  const candidates=[];
  const oversized=locationDie==='d6';
  if(oversized){
    if(sameZoneCount!==1) throw new Error('Oversized Target Zone uses one placeable d6 Location Die');
    const roll=ldRolls[0];
    if(!Number.isInteger(roll)||roll<1||roll>6) throw new RangeError('Oversized Target Zone requires a d6 Location Die');
    if(placedLN==null) return {exact:false,miss:false,pending:{type:'location-placement',roll,minLN:roll,maxLN:roll+4},candidates:[],zoneResults,selectedZN:chosen.zn,requiredLocationDice:1};
    if(!Number.isInteger(placedLN)||placedLN<roll||placedLN>roll+4||placedLN<1||placedLN>10) throw new RangeError('Placed LN must contain the rolled d6 within LN1..10');
    const row=bodyLocations.find(r=>r.zn===chosen.zn && placedLN>=r.lnMin && placedLN<=r.lnMax);
    if(row) candidates.push({...row,zn:chosen.zn,ld:roll,placedLN});
  } else {
    for(const ld of ldRolls.slice(0,sameZoneCount)){
      const row=bodyLocations.find(r=>r.zn===chosen.zn && ld>=r.lnMin && ld<=r.lnMax);
      if(row) candidates.push({...row,zn:chosen.zn,ld});
    }
  }
  if(candidates.length>1 && selectedLocationIndex==null) return {exact:false,miss:false,pending:{type:'location-choice',choices:candidates.map((_,i)=>i)},candidates,zoneResults,selectedZN:chosen.zn,requiredLocationDice:sameZoneCount};
  if(selectedLocationIndex!=null){
    if(!Number.isInteger(selectedLocationIndex)||selectedLocationIndex<0||selectedLocationIndex>=candidates.length) throw new RangeError('Selected location must identify a rolled Location Die result');
    return {exact:false,miss:false,pending:null,candidates,selectedLocation:candidates[selectedLocationIndex],zoneResults,selectedZN:chosen.zn,requiredLocationDice:sameZoneCount};
  }
  return {exact:false,miss:false,pending:null,candidates,selectedLocation:candidates[0]??null,zoneResults,selectedZN:chosen.zn,requiredLocationDice:sameZoneCount};
}
export function limbSideFromRoll(roll){
  if(!Number.isInteger(roll)||roll<1) throw new RangeError('Side roll must be a positive integer');
  return roll%2===1?'left':'right';
}

export function effectiveImpact({strikeImpact,armourValue=0}={}){
  if(!Number.isFinite(strikeImpact)||!Number.isFinite(armourValue)) throw new Error('Strike impact and Armour Value are required');
  return strikeImpact-armourValue; // deliberately preserve negative values
}

/** Build deterministic timed consequences after a completed Injury Sequence. */
export function injurySequenceEvents({result,currentRound,currentIR,combatantId,injuryId=null}={}){
  if(!result?.complete||result.dead) return [];
  const events=[];
  if(result.step3?.bleeder){
    events.push({type:'blood-loss-advance',dueRound:currentRound+60,dueIR:currentIR??null,combatantId,data:{injuryId}});
  }
  if(result.step3?.injury?.severity==='M' && (result.shock?.rawState!==undefined)){
    // Minor impairment is delayed only when the actual Shock test succeeded.
    // raw Shock state cannot tell SL, so resolver records it below as shockSL.
    if(result.shock.shockSL===SL.S||result.shock.shockSL===SL.CS){
      events.push({type:'minor-impairment-activate',dueRound:currentRound+120,dueIR:currentIR??null,combatantId,data:{injuryId,impairment:5}});
    }
  }
  const state=result.state??result.shock?.state;
  if(state===SHOCK_STATE.STN) events.push({type:'stunned-recovery',dueRound:currentRound+1,dueIR:currentIR??null,combatantId,data:{},timing:'end-turn'});
  if(state===SHOCK_STATE.INC) events.push({type:'shock-reroll',dueRound:currentRound+1,dueIR:currentIR??null,combatantId,data:{from:SHOCK_STATE.INC},timing:'end-turn'});
  if(state===SHOCK_STATE.UNC) events.push({type:'shock-reroll',dueRound:currentRound+120,dueIR:currentIR??null,combatantId,data:{from:SHOCK_STATE.UNC}});
  return events;
}
