/** Authoritative edition only: HârnMaster — Roleplaying in the World of Kèthîra,
 * pp.163–164. Pure staged resolver. No guesses about missing dice/target/location.
 */
import {SL,successLevel} from '../rules/tests.js';
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
 const range=missileRange({distance:a.distance,baseRange:br,thrownPbZD:a.thrownPbZD??null,chargingThrow:!!a.chargingThrow});
 need(!range.outOfRange,'Mimo pravidlový dostřel HMK str.163.');
 if(a.ceilingFeet!==null&&a.ceilingFeet!==undefined){
  need(Number.isFinite(a.ceilingFeet)&&a.ceilingFeet>=0,'Výška stropu není platná.');
  need(!(range.type==='volley'&&a.ceilingFeet<10),'HMK str.163: Volley je pod stropem 10 ft zakázáno.');
 }
 let overhead=0;
 if(a.ceilingFeet!=null&&a.ceilingFeet<5&&range.band==='direct'&&['bow','crossbow'].includes(a.weaponType))overhead=-20;
 need(integer(a.ml,0,200)&&integer(a.roll,1,100),'Missile ML a skutečný d100 jsou povinné.');
 need(Number.isFinite(a.traumaPenalty??0)&&Number.isFinite(a.targetTAR??1),'Neplatné modifikátory.');
 const eml=calculateMissileEML({ml:a.ml,rangeModifier:range.rangeModifier,targetMovement:a.targetMovement??'still',effectiveDodgeIndex:a.effectiveDodgeIndex??0,
 movingShooter:!!a.movingShooter,weaponType:a.weaponType,str:a.str??null,hft:a.hft??null,thrownObject:!!a.thrownObject,oblong:!!a.oblong,
 windforce:a.windforce??0,crosswind:!!a.crosswind,traumaPenalty:(a.traumaPenalty??0)+overhead,
 aimedPreviousRound:!!a.aimedPreviousRound,targetTAR:a.targetTAR??1,attackType:range.type});
 if(eml.spoiled){const s=spoiledMissileResolution({finalAdjustedEML:eml.raw,disposition:a.spoiledDisposition??null,eml05Roll:a.spoiledD100??null});
  if(s.pending)return {complete:false,pending:s.pending,eml:eml.raw,range};
  if(s.actionWasted)return {complete:true,hit:false,spoiled:true,eml:eml.raw,range,sl:null};
  return {complete:true,hit:false,spoiled:true,eml:eml.raw,range,sl:SLNAME[s.sl],mishap:s.mishap};
 }
 const sl=successLevel(a.roll,eml.raw);
 const resultBase={range,eml:eml.raw,emlParts:{...eml.parts,overhead},sl:SLNAME[sl],roll:a.roll,attackType:range.type};
 let impactTA=0,precisionTA=0,chosenTargetIndex=null;
 if(range.type==='direct'){
  const r=directMissileOutcome({sl,targetMovement:a.targetMovement??'still',roll:a.roll,eml:eml.raw});
  if(!r.strike){
   if(r.nearbyCheck&&a.nearbyTargetCount>0){
    if(a.nearbyD20==null)return {...resultBase,complete:false,pending:{type:'nearby-d20',die:'d20'},nearbyCheck:true};
    const near=nearbyMissileStrike({targetCount:a.nearbyTargetCount,d20:a.nearbyD20,d10:a.nearbyImpactD10??null});
    if(!near.hit)return {...resultBase,complete:true,hit:false,nearby};
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
  if(!r.potentialStrike){
   if(r.deviation)return {...resultBase,complete:false,pending:{type:'volley-deviation-d8-or-confirm-empty'},deviation:true};
   return {...resultBase,complete:true,hit:false,mishap:r.mishap??null};
  }
  need(integer(a.targetCount,0,200),'Počet cílů v 15ft oblasti musí být potvrzen.');
  const potential=volleyPotentialStrike({targetCount:a.targetCount,targetRolls:a.targetRolls??[],volleyPrecisionDice:r.volleyPrecisionDice,
   impactD10:a.volleyImpactD10??null,selectedTargetRollIndex:a.selectedTargetRollIndex??null});
  if(!potential.complete)return {...resultBase,complete:false,pending:potential.pending,potential};
  if(!potential.hit)return {...resultBase,complete:true,hit:false,potential};
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
 return {...resultBase,complete:true,hit:true,impactTA,precisionTA,chosenTargetIndex,strikeImpact,rangeImpact};
}
