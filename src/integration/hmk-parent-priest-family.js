/** HMK v1.2 p.27 and p.43: parent Priest religion must be within the
 * character's known family pantheon.  Unsupported pantheons remain GM review.
 * This file is a PURE eligibility and evidence rule, NOT a second DP ledger.
 */
import {PRIEST_VARIANTS,priestReligionOf} from './hmk-creation-tables.js';
import {religionChoices,instanceKey} from './hmk-skill-instances.js';
export function allowedParentPriestVariants(character){
 const religions=religionChoices(character);
 return PRIEST_VARIANTS.filter(name=>religions.includes(priestReligionOf(name)));
}
export function parentPriestRitual(character,variant){
 if(!allowedParentPriestVariants(character).includes(variant))return null;
 const faith=priestReligionOf(variant);
 return Object.freeze({religion:faith,skill:instanceKey('Ritual',faith),sourcePage:43});
}
export function familyVariantChoices(character,name){
 // A non-priest profession retains its existing printed subtype table.
 return name==='Priest'?allowedParentPriestVariants(character):null;
}
