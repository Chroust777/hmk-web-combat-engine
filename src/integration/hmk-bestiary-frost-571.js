/** HMK 1.2 pp. 168–169, 178, 180, 185.
 * G4/G5 Frost on a BEAST: a documented frost injury, followed by the special
 * AMP treatment where anatomy permits. All dice are real GM-supplied dice.
 * This does not auto-create a Frostbite/weather outcome or use human anatomy.
 */
import {animalLocation566,creatureAnatomyReadiness566} from './hmk-bestiary-anatomy-566.js';
import {resolveBeastFrostbite572} from './hmk-bestiary-frostbite-572.js';
import {animalAmputationMark570,resolveAnimalAmputation570} from './hmk-bestiary-amputation-570.js';
import {SL,successLevel} from '../rules/tests.js';
import {calculateShockState,applyShockState,shockRecoverySchedule} from '../rules/shock.js';
import {treatmentRollEMLFromInjury,resolveTreatmentTable,treatmentDurationMinutes} from '../rules/healing.js';

const check=(pass,msg)=>{if(!pass)throw Error(msg);};
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const slName=Object.fromEntries(Object.entries(SL).map(([k,v])=>[v,k]));
const paired=new Set(['flg','hlg','leg','wng','ear']);
const limb=new Set(['flg','hlg','leg']);
const validSource=new Set(['weather','spell','other']);

/** Classification uses the VERIFIED animal hit location, not the human table.
 * A whole head is NOT assumed to be a facial feature. GM must identify the
 * actual facial subsite independently of the broad Head hit location. */
export function frostAmputationSite571({location,facialFeature='',wingAsLimbConfirmed=false}={}){
 const id=location?.id,part=String(facialFeature||'').trim();
 const isFace=id==='hd'&&part.length>=3&&part.length<=80;
 const isWingLimb=id==='wng'&&wingAsLimbConfirmed===true;
 const eligible=limb.has(id)||isWingLimb||id==='ear'||isFace;
 const side=paired.has(id)?(int(location.ld,1,10)?(location.ld%2===1?'left':'right'):null):null;
 return {eligible,kind:limb.has(id)||isWingLimb?'limb':id==='ear'?'facial-feature':isFace?'facial-feature':'other',
  site:isFace?part:id||'unknown',side,sourcePage:178};
}
function certified(profile,prev,minute){
 check(profile?.combat&&creatureAnatomyReadiness566(profile).ready,
  'Tento druh nemá ověřenou zvířecí anatomii a–m: Frost sequence nelze automatizovat.');
 check(prev&&prev.shock==='none'&&!prev.extendedShock?.active&&!prev.coma?.active,
  'Před Frost záznamem/zákrokem je nutno uzavřít předchozí Shock, Extended Shock nebo Coma.');
 check(!prev.wounds.some(w=>w.bleeding),'Nejprve zastav krvácení ostatních ran.');
 check(int(minute,0,1e10),'Chybí platný herní čas.');
}
export function prepareAnimalFrostInjury571({profile,previous,minute,eventId,zoneNumber,locationD10,
 level,source,sourceDetails,frostbite=null,facialFeature='',wingAsLimbConfirmed=false,shockRoll,shockFatigue=0,gmConfirmed=false}={}){
 certified(profile,previous,minute);
 check(gmConfirmed===true&&typeof eventId==='string'&&eventId.length>=4,
  'GM musí potvrdit zdroj Grievous Frost a identitu zápisu.');
 check(int(level,4,5)&&validSource.has(source),'Grievous Frost vyžaduje G4/G5 a ověřený zdroj.');
 const details=String(sourceDetails||'').trim();
 check(details.length>=5&&details.length<=300,'GM musí popsat doložený zdroj a vznik Grievous Frost (5–300 znaků).');
 check(int(shockRoll,1,100)&&int(shockFatigue,0,300)&&shockFatigue%5===0,
  'Frost Injury vyžaduje skutečný Shock d100 a potvrzenou únavu.');
 const table=profile.combat.bodyTable;
 const location=animalLocation566({table,zoneNumber,locationD10});
 check(!previous.wounds.some(w=>!w.healed&&w.location===location.id),
  'V této lokalitě je aktivní rána; pro Frost/Compound je nutný samostatně ověřený postup.');
 // Weather p.185 is a genuine dice-driven path; legacy GM-certified
 // reports without a machine-readable weather proof remain readable.
 let frostbiteProof=null;
 if(frostbite!==null){
  check(source==='weather','Frostbite d20 patří pouze zdroji počasí.');
  const innateAV=profile.combat?.av?.f;
  frostbiteProof=resolveBeastFrostbite572({...frostbite,innateAV});
  check(frostbiteProof.injuryLevel===level&&level>=4,
   'Skutečný Frostbite podle d20 a AV nedal požadované G4f/G5f (HMK 185).');
 }
 const site=frostAmputationSite571({location,facialFeature,wingAsLimbConfirmed});
 if(wingAsLimbConfirmed)check(location.id==='wng','Zvláštní potvrzení přední končetiny je pouze pro křídlo.');
 if(facialFeature)check(location.id==='hd'&&site.eligible,
  'Výslovná část obličeje je dovolená jen při ověřené anatomické lokaci Head.');
 const ml=profile.combat.shock;
 check(int(ml,1,300),'Chybí doložená druhová Shock ML.');
 const eml=ml-shockFatigue,sl=successLevel(shockRoll,eml);
 const impact=calculateShockState({locationShock:location.locationShock,injuryShock:level,shockSL:sl});
 const after=applyShockState(previous.shock,impact.state);
 return {format:'hmk-bestiary-trauma-567-v1',kind:'frost',targetId:profile.id,woundId:eventId,minute,location,
  level,aspect:'frost',source,sourceDetails:details,...(frostbiteProof?{frostbite:frostbiteProof}:{}),facialFeature:site.kind==='facial-feature'?facialFeature:'',
  wingAsLimbConfirmed:wingAsLimbConfirmed===true,site,
  shock:{ml,fatigue:shockFatigue,eml,roll:shockRoll,sl:slName[sl],location:location.locationShock,
   injury:level,index:impact.index,incoming:impact.state,after,followup:shockRecoverySchedule(after)},
  grimDueMinute:minute+1440,sourcePage:178};
}
/** AMP is not a G5 Edge combat amputation test; it is a surgical excision
 * whose Treatment Roll necessarily creates a *new* S2..G5 Edge wound.
 * The optional G5e location amputation test affects that resulting injury;
 * the planned removal itself is permanent regardless of this test. */
export function prepareAnimalFrostAmputation571({profile,previous,wound,minute,eventId,
 physicianML,physicianIndex,physicianRoll,dexSecondaryModifier=0,
 shockRoll,shockFatigue=0,amputationRoll=null,procedureConfirmed=false,gmConfirmed=false}={}){
 certified(profile,previous,minute);
 check(wound&&!wound.healed&&!wound.treatment&&wound.aspect==='frost'&&int(wound.level,4,5),
  'Frost AMP je dovolena pouze u původního neošetřeného G4f/G5f.');
 check(wound.frostSite?.eligible===true,
  'HMK str.178: Grievous Frost v této lokalitě nemá AMP treatment; jde o Grim Wound.');
 check(!previous.wounds.some(w=>w.id!==wound.id&&!w.healed&&w.location===wound.location),
  'Ve stejné lokalitě je jiná aktivní rána: nutno samostatně rozhodnout Compound.');
 check(gmConfirmed===true&&procedureConfirmed===true&&typeof eventId==='string'&&eventId.length>=4,
  'GM musí potvrdit fyzické odstranění části těla a čas zákroku.');
 check(int(physicianML,1,300)&&int(physicianIndex,1,30)&&int(physicianRoll,1,100)&&
  int(dexSecondaryModifier,-100,100)&&dexSecondaryModifier%5===0&&int(shockRoll,1,100)&&
  int(shockFatigue,0,300)&&shockFatigue%5===0,
  'AMP vyžaduje Physician ML/Index, DEX Secondary, Treatment d100 a Shock d100.');
 check(int(minute,wound.minute+treatmentDurationMinutes({treatment:'amp'}),1e10),
  'Amputation Treatment trvá nejméně 1 herní minutu (HMK str.178).');
 const eml=treatmentRollEMLFromInjury({physicianML,aspect:'frost',injuryLevel:wound.level,
  daysSinceInjury:Math.floor((minute-wound.minute)/1440),dexSecondaryModifier});
 const sl=successLevel(physicianRoll,eml),resolved=resolveTreatmentTable({aspect:'frost',injuryLevel:wound.level,sl,physicianIndex});
 const result=resolved.result;
 check(result.kind==='edge-injury'&&int(result.injuryLevel,2,5),'AMP musí vytvořit nové S2–G5 Edge zranění.');
 const oldHit=previous.records.find(r=>r.id===wound.sourceId)?.bestiaryTrauma;
 check(oldHit?.kind==='frost'&&oldHit?.location?.id===wound.location,
  'Chybí nezměněný originální doklad lokalizace původního Frost zranění.');
 const loc=oldHit.location;
 const mark=animalAmputationMark570(loc);
 const ampCheck=resolveAnimalAmputation570({location:loc,injuryLevel:result.injuryLevel,
  aspect:'e',roll:amputationRoll});
 // The excision is permanent regardless of the G5e location check.
 const ml=profile.combat.shock;
 check(int(ml,1,300),'Chybí druhová Shock ML.');
 const shockEML=ml-shockFatigue+(ampCheck?.shockPenalty||0),shockSL=successLevel(shockRoll,shockEML);
 const index=calculateShockState({locationShock:loc.locationShock,injuryShock:result.injuryLevel,shockSL});
 const after=applyShockState(previous.shock,index.state);
 const bleeding=!!result.bleeding||!!ampCheck?.bleedingForced;
 const permanentLoss={severed:true,viaTreatment:true,sourceFrostWoundId:wound.id,
  site:wound.frostSite.site,kind:wound.frostSite.kind,side:wound.frostSite.side,sourcePage:178};
 return {format:'hmk-bestiary-trauma-567-v1',kind:'frost-amputation',targetId:profile.id,woundId:wound.id,newWoundId:'wound:'+eventId,
  location:loc,minute,method:'amp',physicianML,physicianIndex,physicianRoll,dexSecondaryModifier,
  treatmentEML:eml,treatmentSL:slName[sl],edgeLevel:result.injuryLevel,bleeding,
  ...(ampCheck?{amputationCheck:ampCheck}:{}),permanentLoss,
  shock:{ml,fatigue:shockFatigue,eml:shockEML,roll:shockRoll,sl:slName[shockSL],location:loc.locationShock,
   injury:result.injuryLevel,index:index.index,incoming:index.state,after,
   followup:shockRecoverySchedule(after)},
  grimDueMinute:result.injuryLevel>=4?minute+1440:null,
  sourcePages:[168,169,178,180]};
}
