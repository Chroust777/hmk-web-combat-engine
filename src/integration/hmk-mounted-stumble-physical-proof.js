/** HMK Kethira pp67,354–355: fail-closed independent physical-dice proof
 * for failed mounted Stumble and a thrown rider's Falling Routine. This is
 * deliberately NOT an injury or Initiative commit. Exact worn AV, the
 * animal's verified location chart and mandatory Shock/Compound/Mishaps
 * must be resolved through live injury pipelines before persistence.
 */
import {successLevel,SL} from '../rules/tests.js';
import {mountStumbleTrauma,thrownRiderTrauma} from '../rules/mounted.js';
const check=(x,m)=>{if(!x)throw Error(m)};
const die=(x,faces)=>Number.isSafeInteger(x)&&x>=1&&x<=faces;
const slText=(sl)=>['CF','F','S','CS'][sl];
/** FallingRoutine p67, step 3 (unexpected fall), with no invented GM data. */
export function mountedFallTestProof({technique,EML,d100}={}){
 check(['jumping','acrobatics'].includes(technique)&&Number.isSafeInteger(EML)&&EML>=0&&EML<=200&&die(d100,100),
  'Pád vyžaduje ověřenou Jumping/Acrobatics EML a fyzický d100');
 const result=slText(successLevel(d100,EML));
 const adjustment=technique==='jumping'?{CF:4,F:0,S:-2,CS:-4}:{CF:2,F:0,S:-4,CS:-6};
 return {technique,EML,d100,SL:result,impactModifier:adjustment[result],
  requiresSecondFallingInjury:result==='CF',physicalDie:{faces:100,value:d100,source:'GM-entered-physical-die'}};
}
export function prepareFailedMountedStumblePhysicalProof({stumbleSL,stumbleD100,stumbleEML,
 mountImpactD10,mountZoneDie,mountLocationDie,mountZoneFaces,
 riderImpactD10,riderZoneD10,riderLocationD10,moveRate,
 riderFallingTest,secondRiderFalls=[],gmConfirmed=false}={}){
 check(gmConfirmed===true&&die(stumbleD100,100)&&Number.isSafeInteger(stumbleEML),
  'Vyžadován skutečný Stumble AGL test ze živého mounta');
 const sl=slText(successLevel(stumbleD100,stumbleEML));
 check(sl===stumbleSL&&['F','CF'].includes(sl),'Větev vyžaduje prokázaný Stumble F/CF');
 // HMK p.355 ZD d6/d8 belongs to the horse's kick ATTACK weapon.
 // It does NOT determine where the horse is injured when it falls.
 // HMK p.67 Falling Routine explicitly specifies d10 ZD plus d10 LD for
 // an unexpected fall; do not silently substitute the animal's attack die.
 check(die(mountImpactD10,10)&&mountZoneFaces===10&&die(mountZoneDie,10)&&die(mountLocationDie,10),
  'Falling Routine: random horse injury requires physical d10 Impact, d10 ZD and d10 LD (p67); attack ZD p355 is unrelated');
 check(die(riderImpactD10,10)&&die(riderZoneD10,10)&&die(riderLocationD10,10)&&
  ['half','full','double'].includes(moveRate),
  'Pád jezdce vyžaduje samostatný d10 Impact, d10 ZD a d10 LD');
 const fall=mountedFallTestProof(riderFallingTest);
 const mount=mountStumbleTrauma({stumbleSL:sl,impactD10:mountImpactD10});
 const rider=thrownRiderTrauma({impactD10:riderImpactD10,moveRate});
 check(Array.isArray(secondRiderFalls)&&secondRiderFalls.length<=20,
  'Opakování Falling Routine musí mít úplné samostatné fyzické hody (max 20)');
 let additionalRequired=fall.requiresSecondFallingInjury;
 const additionalFalls=[],additionalDice=[];
 for(const extra of secondRiderFalls){
  check(additionalRequired,'Další Falling Routine není po úspěchu přípustný');
  check(die(extra?.impactD10,10)&&die(extra?.zoneD10,10)&&die(extra?.locationD10,10),
   'Každé opakování Falling Routine vyžaduje nový Impact d10, ZD d10 a LD d10');
  const test=mountedFallTestProof(extra.fallingTest);
  const impact=thrownRiderTrauma({impactD10:extra.impactD10,moveRate});
  additionalFalls.push({...impact,zoneDie:extra.zoneD10,locationDie:extra.locationD10,
   fall:test,impactBeforeArmour:impact.strikeImpact+test.impactModifier,
   requiresSecondFallingInjury:test.requiresSecondFallingInjury});
  additionalDice.push({faces:10,value:extra.impactD10,source:'GM-entered-physical-die'},
   {faces:10,value:extra.zoneD10,source:'GM-entered-physical-die'},
   {faces:10,value:extra.locationD10,source:'GM-entered-physical-die'},test.physicalDie);
  additionalRequired=test.requiresSecondFallingInjury;
 }
 check(!additionalRequired,'Falling CF vyžaduje další úplné opakování všech fyzických hodů');
 return {format:'hmk-mounted-failed-stumble-dice-proof-v1',stumbleSL:sl,
  mount:{...mount,zoneDie:mountZoneDie,locationDie:mountLocationDie,zoneFaces:mountZoneFaces},
  rider:{...rider,zoneDie:riderZoneD10,locationDie:riderLocationD10,fall,additionalFalls,
   impactBeforeArmour:rider.strikeImpact+fall.impactModifier,
   requiresSecondFallingInjury:fall.requiresSecondFallingInjury},
  physicalDice:[{faces:100,value:stumbleD100,source:'GM-entered-physical-die'},
   {faces:10,value:mountImpactD10,source:'GM-entered-physical-die'},
   {faces:mountZoneFaces,value:mountZoneDie,source:'GM-entered-physical-die'},
   {faces:10,value:mountLocationDie,source:'GM-entered-physical-die'},
   {faces:10,value:riderImpactD10,source:'GM-entered-physical-die'},
   {faces:10,value:riderZoneD10,source:'GM-entered-physical-die'},
   {faces:10,value:riderLocationD10,source:'GM-entered-physical-die'},fall.physicalDie,...additionalDice],
  injurySequencePending:true,riderAdditionalFallPending:additionalRequired,
  authorizesPersistence:false};
}
