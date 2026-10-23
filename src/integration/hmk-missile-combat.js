/** Authoritative edition only: HârnMaster — Roleplaying in the World of Kèthîra,
 * pp.163–164. Pure staged resolver. No guesses about missing dice/target/location.
 */
import {SL,successLevel,secondaryModifier} from '../rules/tests.js';
import {missileRange,effectiveBaseRange,calculateMissileEML,spoiledMissileResolution,directMissileOutcome,volleyMissileOutcome,volleyPotentialStrike,missileStrikeImpact,nearbyMissileStrike} from '../rules/missile.js';
const integer=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
function need(ok,msg){if(!ok)throw Error(msg);}
const SLNAME=['CF','F','S','CS'];
/** Evaluate an attack before any armour, passive Deflect, zone-location and Shock processing.
 * Existing hit-confirmation handles the latter only after the GM supplies verified location.
 */
export function resolveHMKMissileAttack(a={}){
 need(['bow','crossbow','sling','thrown'].includes(a.weaponType),'Vyberte typ zbraně (bow/crossbow/sling/thrown).');
 need(Number.isFinite(a.distance)&&a.distance>=0,'Vzdálenost musí být nezáporná.');
 need(Number.isFinite(a.baseRange)&&a.baseRange>0,'Ověřený Base Range je povinný.');
 const br=effectiveBaseRange({baseRange:a.baseRange,wet:!!a.wet,weaponType:a.weaponType});
 // HMK p.110: ordinary thrown weapons / objects have VM ×2; after a
 // verified 20-ft Charging Throw the limit becomes ×3. Never inherit the
 // generic missile fallback VM ×4 or accept inconsistent supplied data.
 const thrownVM=a.weaponType==='thrown'?(a.chargingThrow?3:2):null;
 if(thrownVM!==null&&a.volleyMaxMultiplier!=null){
  need(a.volleyMaxMultiplier===thrownVM,
   'HMK str.110: vrhané zbraně mají Volley ×2, při platném Charging Throw ×3.');
 }
 // HMK p.110: a charging throw of at least 20 ft may add a POSITIVE
 // STR Secondary Modifier to BR for Volley ONLY; Direct PB/BR are unchanged.
 // STR secondary is calculated from a real attribute (STR × 5, p.62).
 if(a.weaponType==='thrown'&&a.chargingThrow)need(integer(a.str,1,200),
  'Charging Throw vyžaduje doloženou Strength pro výpočet Volley BR.');
 const chargeBRBonus=a.weaponType==='thrown'&&a.chargingThrow?
  Math.max(0,secondaryModifier(a.str*5)):0;
 const range=missileRange({distance:a.distance,baseRange:br,thrownPbZD:a.thrownPbZD??null,
  chargingThrow:!!a.chargingThrow,volleyMaxMultiplier:thrownVM??a.volleyMaxMultiplier??null,
  volleyBaseRange:br+chargeBRBonus});
 need(!range.outOfRange,'Mimo pravidlový dostřel HMK str.163.');
 if(a.ceilingFeet!==null&&a.ceilingFeet!==undefined){
  need(Number.isFinite(a.ceilingFeet)&&a.ceilingFeet>=0,'Výška stropu není platná.');
  need(!(range.type==='volley'&&a.ceilingFeet<10),'HMK str.163: Volley je pod stropem 10 ft zakázáno.');
 }
 // HMK p.110: staff slings receive no +10 PB bonus at 60 ft or less.
 const staffSlingPBCorrection=a.weaponType==='sling'&&a.staffSlingConstrictedPB===true&&a.distance<=60&&range.band==='direct-pb'?-10:0;
 let overhead=0;
 if(a.ceilingFeet!=null&&a.ceilingFeet<5&&range.band==='direct'&&['bow','crossbow'].includes(a.weaponType))overhead=-20;
 need(integer(a.ml,0,200),'Missile ML musí být doložené číslo 0–200.');
 need(Number.isFinite(a.traumaPenalty??0)&&Number.isFinite(a.targetTAR??1),'Neplatné modifikátory.');
 const eml=calculateMissileEML({ml:a.ml,rangeModifier:range.rangeModifier,targetMovement:a.targetMovement??'still',effectiveDodgeIndex:a.effectiveDodgeIndex??0,
 movingShooter:!!a.movingShooter,weaponType:a.weaponType,str:a.str??null,hft:a.hft??null,thrownObject:!!a.thrownObject,oblong:!!a.oblong,
 windforce:a.windforce??0,crosswind:!!a.crosswind,traumaPenalty:(a.traumaPenalty??0)+overhead+staffSlingPBCorrection,
 aimedPreviousRound:!!a.aimedPreviousRound,targetTAR:a.targetTAR??1,attackType:range.type});
 if(eml.spoiled){const s=spoiledMissileResolution({finalAdjustedEML:eml.raw,disposition:a.spoiledDisposition??null,eml05Roll:a.spoiledD100??null});
  if(s.pending)return {complete:false,pending:s.pending,eml:eml.raw,range,spoiled:true};
  if(s.actionWasted)return {complete:true,hit:false,spoiled:true,eml:eml.raw,range,sl:null};
  return {complete:true,hit:false,spoiled:true,eml:eml.raw,range,sl:SLNAME[s.sl],mishap:s.mishap};
 }
 // Non-mutating preflight for the guided wizard. Only this explicit probe
 // may discover that a normal attack die is required without rolling it.
 if(a.roll==null&&a.probeOnly===true)return {complete:false,spoiled:false,
  pending:{type:'missile-attack-d100'},eml:eml.raw,range};
 need(integer(a.roll,1,100),'Běžný Missile útok vyžaduje skutečný d100.');
 const sl=successLevel(a.roll,eml.raw);
 const resultBase={range,eml:eml.raw,emlParts:{...eml.parts,overhead,staffSlingPBCorrection},sl:SLNAME[sl],roll:a.roll,attackType:range.type};
 let impactTA=0,precisionTA=0,chosenTargetIndex=null;
 if(range.type==='direct'){
  const r=directMissileOutcome({sl,targetMovement:a.targetMovement??'still',roll:a.roll,eml:eml.raw});
  if(!r.strike){
   if(r.nearbyCheck&&a.nearbyTargetCount>0){
    if(a.nearbyD20==null)return {...resultBase,complete:false,pending:{type:'nearby-d20',die:'d20'},nearbyCheck:true};
    const near=nearbyMissileStrike({targetCount:a.nearbyTargetCount,d20:a.nearbyD20,d10:a.nearbyImpactD10??null});
    if(!near.hit)return {...resultBase,complete:true,hit:false,nearby:near};
    if(!near.complete)return {...resultBase,complete:false,pending:near.pending,nearbyCheck:true};
    impactTA=near.impactTA;chosenTargetIndex=a.nearbyD20;precisionTA=0;
   }else return {...resultBase,complete:true,hit:false,mishap:r.mishap??null,nearbyCheck:r.nearbyCheck};
  }else{
   need(integer(a.choiceImpactTA??0,0,r.choiceTA),'Povolený Impact TA nesouhlasí s Missile SL.');
   impactTA=a.choiceImpactTA??0;
   precisionTA=r.precisionTA+(r.choiceTA-impactTA);
  }
 }else{
  const r=volleyMissileOutcome({sl,roll:a.roll,eml:eml.raw});
  let targetCount=a.targetCount;
  if(!r.potentialStrike){
   if(r.deviation){
    if(a.deviationD8==null)return {...resultBase,complete:false,pending:{type:'volley-deviation-d8',die:'d8'},deviation:true};
    need(integer(a.deviationD8,1,8),'Volley deviation vyžaduje skutečný d8 (1–8).');
    if(a.deviationTargetCount==null)return {...resultBase,complete:false,
     pending:{type:'volley-deviation-target-count',direction:a.deviationD8},deviation:true};
    need(integer(a.deviationTargetCount,0,200),'Zadejte skutečný počet TAR pozic v sousední 15ft oblasti.');
    targetCount=a.deviationTargetCount;
    if(targetCount===0)return {...resultBase,complete:true,hit:false,deviation:true,deviationD8:a.deviationD8,
     deviationTargetCount:0};
   }else return {...resultBase,complete:true,hit:false,mishap:r.mishap??null};
  }
  need(integer(targetCount,0,200),'Počet cílů v 15ft oblasti musí být potvrzen.');
  const potential=volleyPotentialStrike({targetCount,targetRolls:a.targetRolls??[],volleyPrecisionDice:r.volleyPrecisionDice,
   impactD10:a.volleyImpactD10??null,selectedTargetRollIndex:a.selectedTargetRollIndex??null});
  if(!potential.complete)return {...resultBase,complete:false,pending:potential.pending,potential,
   deviation:!r.potentialStrike,deviationD8:a.deviationD8??null,targetCount};
  if(!potential.hit)return {...resultBase,complete:true,hit:false,potential,
   deviation:!r.potentialStrike,deviationD8:a.deviationD8??null,targetCount};
  impactTA=potential.impactTA;chosenTargetIndex=potential.targetRoll;
 }
 // Reaching this stage proves a particular creature has been hit. An actual
 // armour/location decision remains mandatory before any Injury Sequence.
 if(a.impactDieRoll==null)return {...resultBase,complete:false,hit:true,pending:{type:'weapon-impact-die'},impactTA,precisionTA,chosenTargetIndex};
 need(integer(a.impactDieSides,2,100)&&integer(a.impactDieRoll,1,a.impactDieSides),'Skutečný hod zbraňové Impact kostky je mimo její rozsah.');
 need(Number.isFinite(a.weaponImpactModifier)&&Number.isFinite(a.strengthImpactModifier??0),'Chybí ověřené modifikátory Impact.');
 need(integer(a.impactTAValue??0,0,50),'Chybí ověřený aspektový Impact TA bonus.');
 const rangeImpact=a.chargingThrow?range.chargeImpactModifier:range.impactModifier;
 need(Number.isFinite(rangeImpact),'Tento útok nemá v HMK dovolený Impact modifikátor.');
 const strikeImpact=missileStrikeImpact({impactDieRoll:a.impactDieRoll,weaponImpactModifier:a.weaponImpactModifier,rangeImpactModifier:rangeImpact,
  strengthImpactModifier:a.strengthImpactModifier??0,impactTACount:impactTA,impactTAValue:a.impactTAValue??0,bluntHead:!!a.bluntHead});
 return {...resultBase,complete:true,hit:true,impactTA,precisionTA,chosenTargetIndex,strikeImpact,rangeImpact,
  deviation:range.type==='volley'&&sl===SL.F,deviationD8:a.deviationD8??null};
}

/** HMK p.164 Direct/Volley CF: the missile attack does NOT take place.
 * Normal misses and successful strikes do discharge; p.163 spoiled
 * 'automatic-fail' explicitly makes an attack, unlike 'action-wasted'.
 * Whether a loaded arrow/bolt actually left the weapon must follow this
 * result, not merely the fact that the player's turn was spent.
 */
export function missileProjectileDischarged(outcome){
 need(outcome&&outcome.complete===true&&outcome.hit!==undefined,
  'Spotřeba střely vyžaduje dokončený Missile výsledek');
 if(outcome.forcedCF===true)return false;
 if(outcome.spoiled===true)return outcome.sl!==null;
 return outcome.sl!=='CF';
}
