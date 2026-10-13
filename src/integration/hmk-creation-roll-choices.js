/** HMK v1.2, chapter 2: deterministic physical-die -> character choice.
 * The GM throws; this module NEVER rolls. The returned properties must be
 * persisted through the ordinary Character Creation/CAS transaction.
 * Unsupported regional occupation tables remain GM-confirmed, never guessed.
 */
import {SOCIETIES,classFromRoll,realmFromRegionRoll,regionFromD1000,tribalFreeOccupation} from './hmk-creation-tables.js';
import {parentOccupationFromRoll} from './hmk-parent-occupation-tables.js';
import {folkFromDie,ageFromDie,SIGN_TRAITS,backgroundFromRoll,normalizeRoll} from './hmk-character-creation.js';
const has=v=>v!==undefined&&v!==null&&String(v).trim()!=='';
export function creationChoicesFromPhysicalDice(character,step,values={}){
 const h=character?.hmk??{},out={};
 if(step===1&&has(values.folkRoll))out.folk=folkFromDie(values.folkRoll);
 if(step===2){
  const folk=h.folk??values.folk;
  if(['Kúzhai','Sinái','Sidhé'].includes(folk)){
   if(has(values.ageRoll))throw Error('Tato Elder Folk Age Group se neurčuje d100 (HMK str.21)');
   out.ageGroup=ageFromDie(1,folk);
  }else if(has(values.ageRoll))out.ageGroup=ageFromDie(values.ageRoll,folk);
 }
 if(step===4){
  const signs=String(h.sunsign??'').split(' / ');
  if(has(values.traitRoll)){
   if(!SIGN_TRAITS[signs[0]])throw Error('Nejdříve určete Sunsign z fyzického d12/d30');
   out.sunsignTraits=SIGN_TRAITS[signs[0]][normalizeRoll(values.traitRoll,6)-1];
  }
  if(has(values.traitRollSecondary)){
   if(!SIGN_TRAITS[signs[1]])throw Error('Druhý Sunsign Trait je možný jen u cusp');
   out.sunsignTraitSecondary=SIGN_TRAITS[signs[1]][normalizeRoll(values.traitRollSecondary,6)-1];
  }
 }
 if(step===5){
  if(has(values.venariveRoll))out.birthRegion=regionFromD1000(values.venariveRoll).region;
  const region=out.birthRegion??values.birthRegion;
  if(has(values.regionRoll)){
   const r=realmFromRegionRoll(region,values.regionRoll,values.nativeLanguageRoll,values.regionSubRoll,values.nativeLanguageChoice,values.regionDialectRoll,values.regionDialectChoice,values.regionAzeriDialectChoice,values.regionCommunityChoice,values.regionTribeRoll);
   out.birthplace=r.realm;out.society=r.society;
  }
 }
 if(step===6&&has(values.classRoll))out.socialClass=classFromRoll(h.society,values.classRoll,Number(values.classDie||100));
 if(step===7&&has(values.parentOccupationRoll)){
  const r=['Tribal','Tribal-Settled'].includes(h.society)&&h.socialClass==='Free' ? tribalFreeOccupation(values.subsistence,values.parentOccupationRoll) : parentOccupationFromRoll({society:h.society,socialClass:h.socialClass,roll:values.parentOccupationRoll,classRoll:character?.hmk?.creation?.values?.classRoll,classDie:character?.hmk?.creation?.values?.classDie??100,subRoll:values.parentOccupationSubRoll,specialRoll:values.parentOccupationSpecialRoll,convocationRoll:values.parentOccupationConvocationRoll});
  out.familyOccupation=r.name;out.urbanChance=String(r.urbanChance);
 }
 if(step===8){
  if(values.tribalUnsettled==='yes')out.background='Wilderness';
  else if(has(values.backgroundRoll))out.background=backgroundFromRoll(values.backgroundRoll,values.urbanChance,{unsettledTribal:false,society:h.society,cityStateTens:values.backgroundTensRoll,folk:h.folk});
 }
 return out;
}
/** UI may send an empty selection. If a physical die was entered, the
 * calculated choice is authoritative; conflicting *explicit* choices are
 * rejected at the domain boundary rather than silently trusting the UI.
 */
export function mergeCreationChoices(character,step,incoming={},existing={}, {strict=true}={}){
 const combined={...existing,...incoming};
 const calculated=creationChoicesFromPhysicalDice(character,step,combined);
 for(const [key,result] of Object.entries(calculated)){
  if(strict&&Object.prototype.hasOwnProperty.call(incoming,key)&&has(incoming[key])&&incoming[key]!==result)
   throw Error(`${key}: zvolená položka neodpovídá fyzickému hodu (${result}). Vymažte hod, chcete-li zvolit ručně.`);
 }
 return {...incoming,...calculated};
}
