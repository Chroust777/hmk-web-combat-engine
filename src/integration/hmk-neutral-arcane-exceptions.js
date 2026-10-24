/** HârnMaster Kèthîra v1.2 pp.7, 203–204, 251, 255.
 * READ-ONLY canonical adjudication of two still-uncommitted Neutral branches:
 * Ward (Neutral II) and Total Release / Neutral Chaos Storm (Misfire 100).
 *
 * Deliberately no persistent state, no random dice, no replacement combat or
 * spellcaster: callers must obtain REAL caster/ward/source proofs first. A
 * completed *die* is never equivalent to a completed Neutral spellfire.
 */
import {successLevel} from '../rules/tests.js';
const levels=Object.freeze(['CF','F','S','CS']);
const guard=(ok,msg)=>{if(!ok)throw Error('Neutral exceptions: '+msg)};
const whole=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const WARD_SOURCES=Object.freeze(['Active spell','Active talent','Artefact enchantment','Elixir','Rune object']);

/** Ward: WL = half SI, CS +2; indefinite, touches one magical source.
 * A weaker/equal Ward does not overwrite a stronger/equal older Ward.
 * A Ward itself is an *active indefinite spell* (Dispel EML −WL×10).
 */
export function neutralWardProfile({spellSI,castingSL,sourceCategory,priorWardLevel=0,
 sourceStillActive=true}={}){
 guard(whole(spellSI,0,100)&&['S','CS'].includes(castingSL),
  'vyžaduje úspěšný ověřený Ward spellfire a Spell Index');
 guard(WARD_SOURCES.includes(sourceCategory),'Ward nelze umístit na tuto kategorii zdroje');
 guard(whole(priorWardLevel,0,100)&&typeof sourceStillActive==='boolean',
  'chybí aktivní původní zdroj nebo historický Ward');
 // General rounding rule, HMK p.7: computed fractions are rounded normally.
 const wardLevel=Math.round(spellSI/2)+(castingSL==='CS'?2:0);
 const supersedesPrior=sourceStillActive&&wardLevel>priorWardLevel;
 return Object.freeze({format:'hmk-neutral-ward-profile-v1',sourceCategory,
  wardLevel,priorWardLevel,supersedesPrior,
  protecting:sourceStillActive&&supersedesPrior,
  ...(sourceStillActive&&supersedesPrior?{detectableAs:'Active spell: Ward',
   protectedSourceVisibleToDetect:false,
   protectedSourceAffectedByRevealOrDispel:false,
   wardDispelPenalty:-10*wardLevel,
   duration:'Indefinite; until dispelled / superseded; active spell/talent Ward ends with source'}:{}),
  requires:['original Ward spellstart','10 minutes concentration','original Spellfire proof',
   'touch target','live source and earlier Ward proof'],
  mayCommit:false,sourcePages:[7,251,255]});
}

/** Misfire 100 is crucial, with PSY 3, a Spirit test (−5 per spell CL),
 * a separate 2/4/6d6 Spirit ML loss, plus a Neutral Chaos Storm. This
 * processes only physical rolls with GM-attested CURRENT Spirit EML basis.
 */
export function neutralTotalReleaseSpirit({spellCL,spiritML,verifiedOtherModifiers=null,
 modifiersVerified=false,spiritD100,lossD6=[]}={}){
 guard(whole(spellCL,1,6)&&whole(spiritML,0,1000),
  'chybí doložené spell CL nebo aktuální Spirit ML');
 guard(modifiersVerified===true&&whole(verifiedOtherModifiers,-1000,1000),
  'GM musí doložit ostatní živé modifikátory Spirit EML');
 guard(whole(spiritD100,1,100),'chybí fyzický Spirit d100');
 const penalty=-5*spellCL,eml=spiritML+penalty+verifiedOtherModifiers;
 guard(Number.isSafeInteger(eml),'neplatný aktuální Spirit EML');
 const sl=levels[successLevel(spiritD100,eml)];
 const numberOfD6=sl==='F'?6:sl==='S'?4:sl==='CS'?2:0;
 guard(Array.isArray(lossD6)&&lossD6.length===numberOfD6&&
  lossD6.every(d=>whole(d,1,6)),
  'Spirit test vyžaduje přesně příslušné fyzické d6, žádné odhady');
 const lost=lossD6.reduce((sum,d)=>sum+d,0);
 return Object.freeze({format:'hmk-neutral-total-release-spirit-v1',
  spellCL,spiritML,otherModifiers:verifiedOtherModifiers,spiritPenalty:penalty,
  spiritEML:eml,spiritD100,spiritSL:sl,lossD6:Object.freeze([...lossD6]),
  spiritMLLoss:lost,psycheStress:3,auralShock:sl==='F'?6:sl==='S'?4:sl==='CS'?2:0,
  fatalTransformation:sl==='CF',shade:sl==='CF',
  crucialSpellLoss:true,neutralChaosStormRequired:true,
  mayCommit:false,sourcePages:[203,204]});
}

/** The Neutral Raw Principle event is the VI Vortex, but with *SI =
 * causal spell CL*. It is not a normal VI spell with a Pvârism-based SI.
 * Vortex effects temporarily SUPPRESS spells rather than erase AS.
 */
export function neutralChaosStormGeometry(spellCL){
 guard(whole(spellCL,1,6),'neutral Chaos Storm vyžaduje původní spell CL');
 return Object.freeze({format:'hmk-neutral-chaos-storm-v1',
  spellCL,spellSI:spellCL,initialDiameterFeet:5,
  roamingRadiusFeet:10*spellCL,roamingDiameterFeet:20*spellCL,
  durationRounds:spellCL,origin:'caster',casterMayShieldSources:false,
  selection:'at end of each caster turn; GM must establish all sources and random target',
  wardBeforeProtectedSource:true,mayCommit:false,sourcePages:[204,255]});
}

/** One recorded Vortex test, restricted to alchemical sources or Ward.
 * The remainder of its geometry, randomly selected centre, all affected
 * sources, duration clock and the GM's complete encounter are NOT supplied
 * by this function, so it cannot authorize any storage commit.
 */
export function neutralVortexSourceRoll({category,currentAS=null,wardLevel=null,
  protectedByActiveWard=false,d100,d20=null}={}){
 guard(['Elixir','Ward'].includes(category),'pouze ověřený elixír či Ward');
 guard(protectedByActiveWard===false,'nejdřív musí být vyřešen ochranný Ward');
 guard(whole(d100,1,100),'chybí původní fyzický d100 zdroje');
 const targetML=category==='Elixir'?
  (guard(whole(currentAS,1,100),'chybí aktuální AS elixíru'),currentAS*5):
  (guard(whole(wardLevel,0,100),'chybí doložený Ward Level'),wardLevel*10);
 const sl=levels[successLevel(d100,targetML)];
 const affected=['F','CF'].includes(sl);
 guard(!affected&&d20===null||affected&&whole(d20,1,20),
  'selhání vyžaduje fyzický d20 trvání, úspěch jej nesmí mít');
 return Object.freeze({format:'hmk-neutral-vortex-source-roll-v1',category,
  targetML,d100,successLevel:sl,
  suppressed:affected,suppressionDuration:affected?d20:null,
  suppressionUnit:sl==='CF'?'hours':sl==='F'?'rounds':null,
  immuneOneRound:!affected,casterPsycheStress:sl==='CS'?1:0,
  permanentASLoss:0,mayCommit:false,sourcePages:[255]});
}
