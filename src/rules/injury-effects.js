import { SL } from './tests.js';

const IMPAIRED={
  acrobatics:['head','arm','torso','legs'], agility:['head','torso','legs'], archery:['head','arm','torso','legs'],
  awareness:['head'], climbing:['head','arm','torso','legs'], crafts:['head','arm','torso'], dancing:['head','arm','torso','legs'],
  dexterity:['head','arm','torso'], dodge:['head','torso','legs'], jumping:['head','arm','torso','legs'],
  legerdemain:['head','arm'], melee:['head','arm','torso','legs'], riding:['head','arm','torso','legs'], slings:['head','arm','torso','legs'],
  stealth:['head','torso','legs'], strength:['head','arm','torso','legs'], swimming:['head','arm','torso','legs'], throwing:['head','arm','torso','legs']
};

export function acuteInjuryEffect({severity,shockSL=null,minutesSinceInjury=0}={}){
  if(severity==='G') return {impairment:null,unusable:true};
  if(severity==='S') return {impairment:10,unusable:false};
  if(severity==='M'){
    const shockSucceeded=shockSL===SL.S||shockSL===SL.CS;
    return {impairment:(shockSucceeded&&minutesSinceInjury<10)?0:5,unusable:false};
  }
  return {impairment:0,unusable:false};
}

export function injuryMishap({severity,zone,location=null}={}){
  if(severity==='S'){
    if(zone==='arm') return ['fumble-roll'];
    if(zone==='legs') return ['stumble-roll'];
    if(zone==='torso'&&location==='pelvis') return ['stumble-roll'];
    return [];
  }
  if(severity==='G'){
    if(zone==='head') return ['automatic-fumble','automatic-stumble'];
    if(zone==='arm') return ['automatic-fumble'];
    if(zone==='torso'||zone==='legs') return ['automatic-stumble'];
  }
  return [];
}

export function impairedTestZones(test){ return IMPAIRED[test]??[]; }
export function testUsesInjuredZone({test,zone}){ return impairedTestZones(test).includes(zone); }

export function grievousUseResolution({requiresUnusableZone=false,context='action',defence=null}={}){
  if(!requiresUnusableZone) return {automaticCF:false,forcedIgnore:false,missileStill:false,mishapFromZone:false};
  if(context==='missile-target') return {automaticCF:false,forcedIgnore:false,missileStill:true,mishapFromZone:false};
  if(context==='melee-defence'){
    if(defence==='ignore') return {automaticCF:false,forcedIgnore:true,missileStill:false,mishapFromZone:false};
    return {automaticCF:true,forcedIgnore:false,missileStill:false,mishapFromZone:true};
  }
  return {automaticCF:true,forcedIgnore:false,missileStill:false,mishapFromZone:false};
}

export function stunnedImpairedSL(sl,{stunned=false,isImpairedTest=false}={}){
  return stunned&&isImpairedTest ? Math.max(SL.CF,sl-1) : sl;
}

export function initiativeShockModifierPolicy(test){
  if(test==='initiative') return {injuryImpairment:false,fatigue:true,glancingBonus:false,shockRerollPenalty:false};
  if(test==='shock') return {injuryImpairment:false,fatigue:true,glancingBonus:true,shockRerollPenalty:true};
  return null;
}

export function areaInjuryEffect({severity}={}){
  return {affectsAllImpairedTests:true,affectsMovement:true,grievousMishapProfile:severity==='G'?'head':null};
}

export function projectileImpalement({projectile=false,severity=null,injuryLevel=0}={}){
  return projectile && (severity==='S'||severity==='G') && injuryLevel>=3;
}

export function faceSublocation(d20){
 if(!Number.isInteger(d20)||d20<1||d20>20) throw new RangeError('d20 required');
 if(d20<=2)return 'eye'; if(d20<=4)return 'nose'; if(d20<=12)return 'cheek'; if(d20<=14)return 'ear'; if(d20<=16)return 'mouth'; return 'jaw';
}
export function uniqueLocationShock({location,sublocation=null,optionEnabled=false}={}){
 if(!optionEnabled) return null;
 if(location==='pelvis'&&sublocation==='groin') return 5;
 if(location==='face'&&(sublocation==='eye'||sublocation==='nose')) return 5;
 return null;
}
export function uniqueMovementEffect({optionEnabled=false,seriousLegOrTorsoCount=0,grievousLegCount=0,grievousTorsoCount=0}={}){
 if(!optionEnabled)return {maxRate:null,crawl:false,crutches:false};
 if(grievousTorsoCount>=2)return {maxRate:'none',crawl:false,crutches:false};
 if(grievousLegCount>=1)return {maxRate:'half',crawl:true,crutches:true,difficult:true};
 if(grievousTorsoCount===1)return {maxRate:'half',crawl:true,crutches:false,difficult:true};
 if(seriousLegOrTorsoCount>=2)return {maxRate:'half',crawl:false,crutches:false};
 if(seriousLegOrTorsoCount===1)return {maxRate:'full',crawl:false,crutches:false};
 return {maxRate:null,crawl:false,crutches:false};
}
export function uniqueGrievousLegMelee({optionEnabled=false,grievousLegCount=0}={}){return optionEnabled&&grievousLegCount===1?{allowed:true,modifier:-20,forcedStumbleRoll:true}:{allowed:false};}
export function uniqueFaceDiscretion({optionEnabled=false,sublocation,severity}={}){
 if(!optionEnabled)return null;
 if(sublocation==='cheek')return {gmDecision:'Cheek injury might impair only Eloquence'};
 if(severity==='G')return {gmDecision:'Grievous face injury might impose -20 social skill tests'};
 return null;
}

/** p170: Initiative and Shock are Combat skills but are not Impaired tests.
 * baseML is the current ML after any underlying attribute-score changes.
 * Fatigue applies to both; only Shock accepts Glancing +10 and Reroll -20. */
export function initiativeOrShockEML({test,baseML,fatigue=0,injuryImpairment=0,glancing=false,shockReroll=false}={}){
 if(test!=='initiative'&&test!=='shock') throw new RangeError('initiative or shock test required');
 if(!Number.isFinite(baseML)||!Number.isFinite(fatigue)||!Number.isFinite(injuryImpairment)) throw new TypeError('Numeric ML/penalties required');
 let eml=baseML-fatigue; // injuryImpairment deliberately does not apply.
 if(test==='shock'){
   if(glancing) eml+=10;
   if(shockReroll) eml-=20;
 }
 return eml;
}
