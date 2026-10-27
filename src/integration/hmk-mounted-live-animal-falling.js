/** HMK Kèthîra pp.166–169, 354–355: ORIGINAL animal table B/C
 * source data for the F/CF Stumble injury. A submitted zone roll is NEVER
 * assumed to be d10/d20 merely because a horse has 16/20 body zones.
 * The animal's WEAPON has an attacking ZD (d6/d8); this does not
 * determine the LOCATION die when the animal itself falls. The explicit
 * unexpected Falling Routine (p.67) calls for a d10 Zone Die and d10 LD.
 * PREVIEW ONLY. It is not a write capability or a substitute for the Rider
 * Falling Routine, compounded injury, Shock or the mount's Healing Rate.
 */
import {injuryFromEffectiveImpact,compoundCompatible} from '../rules/injury.js';
import {validateCombatState} from './persistent-combat-state.js';
const verify=(test,msg)=>{if(!test)throw Error(msg)};
const isDie=(v,n)=>Number.isSafeInteger(v)&&v>=1&&v<=n;
const info={
 donkey:{table:'B',maxZN:16,b:4,shockML:39},
 pony:{table:'B',maxZN:16,b:4,shockML:36},
 mule:{table:'C',maxZN:20,b:4,shockML:39},
 palfrey:{table:'C',maxZN:20,b:5,shockML:36},
 courser:{table:'C',maxZN:20,b:5,shockML:52},
 charger:{table:'C',maxZN:20,b:5,shockML:65},
 destrier:{table:'C',maxZN:20,b:6,shockML:75}
};
/** Breed-verified printed Shock ML for the original animal, never a GM guess. */
export function verifiedMountedShockML(animal){
 const breed=animal?.hmk?.verifiedMountedBreed;
 return Object.hasOwn(info,breed)?info[breed].shockML:null;
}
const leg=new Set(['flg','hlg']);
function locationFor(spec,zn,ld){
 const b=spec.table==='B';
 if(zn<=(b?3:4))return ld<=4?'hd':'nk';
 if(zn<=(b?5:6))return 'flg';
 if(zn<=(b?12:14))return ld<=6?'flk':'ab';
 return ld<=5?'qtr':ld<=9?'hlg':'tl';
}
const shockByLoc={hd:5,nk:5,flg:2,flk:4,ab:4,qtr:3,hlg:2,tl:1};
/** Source must be a live character with an EXPLICIT, verified printed breed;
 * no animal body chart is inferred from the mount's name or old wounds. */
export function previewVerifiedMountedAnimalTrauma({mount,stumbleSL,impactD10,zoneD,locationD,aimZN,
 aimConfirmed=false,printedBreed=null}={}){
 const breed=mount?.hmk?.verifiedMountedBreed;
 verify(typeof breed==='string'&&Object.hasOwn(info,breed)&&breed===printedBreed,
  'Horse injury requires a verified p355 breed and matching GM attestation');
 const s=info[breed];
 const fallZoneDieFaces=10; // HMK p.67 unexpected fall, not p.355 animal attack ZD
 verify(mount?.hmk?.combatState?.format==='hmk-persistent-combat-v1',
  'Animal injury requires its live persistent combat state');
 validateCombatState(mount.hmk.combatState);
 verify(['F','CF'].includes(stumbleSL)&&isDie(impactD10,10)&&
  isDie(zoneD,fallZoneDieFaces)&&isDie(locationD,10)&&aimConfirmed===true&&aimZN===1,
  'Mount Stumble random hit requires physical FALL d10 ZD and d10 LD (HMK p67), Aim ZN1; p355 attack ZD is not fall ZD');
 const zn=aimZN+zoneD-1;
 // HMK p166: a zone die exceeding a creature's available body ZNs MISSES.
 // A stumble's random location has no GM permission to silently reroll it.
 if(zn>s.maxZN)return {format:'hmk-verified-mount-injury-preview-v1',breed,bodyTable:s.table,
  zoneDieFaces:fallZoneDieFaces,aimZN,zoneD,locationD,zn,miss:true,impactD10,stumbleSL,
  mayPersist:false,reason:'Zone Die misses the mount body table; GM must resolve the falling circumstance'};
 const location=locationFor(s,zn,locationD),shock=shockByLoc[location];
 const strikeImpact=impactD10+(stumbleSL==='CF'?5:0),effectiveImpact=strikeImpact-s.b;
 const base=injuryFromEffectiveImpact({effectiveImpact,aspect:'blunt',rigidArmour:false});
 // HMK p.167: a leg hit has a left/right side. For an independent
 // preview use the physical ZD parity (odd=left, even=right), never a
 // freely supplied side. Older wounds lacking a side cannot be silently
 // assigned to this leg; require a separate GM review before any write.
 const side=leg.has(location)?(zoneD%2?'left':'right'):null;
 const sameLocation=mount.hmk.combatState.wounds.filter(w=>!w.healed&&w.location===location);
 verify(side===null||sameLocation.every(w=>w.side==='left'||w.side==='right'),
  'Existing mount leg wound has unknown side; compound must be reviewed');
 const candidate={location,aspect:'blunt',area:false};
 const existing=sameLocation.filter(w=>(side===null||w.side===side)&&compoundCompatible(w,candidate));
 return {format:'hmk-verified-mount-injury-preview-v1',breed,bodyTable:s.table,
  zoneDieFaces:fallZoneDieFaces,aimZN,zoneD,locationD,zn,miss:false,location,side,locationShock:shock,
  naturalBluntAV:s.b,printedShockML:s.shockML,stumbleSL,impactD10,strikeImpact,effectiveImpact,
  injury:base.injury,requiresShock:effectiveImpact>0,requiresCompound:base.injury!==null&&existing.length>0,compatibleExistingWoundIds:existing.map(w=>w.id),
  legTreatmentHRModifier:base.injury&&leg.has(location)?{M:-1,S:-2,G:-3}[base.injury.severity]:0,
  mayPersist:false,reason:'Needs verified Shock, Compound, full Falling Routine for rider and single atomic mutation'};
}
