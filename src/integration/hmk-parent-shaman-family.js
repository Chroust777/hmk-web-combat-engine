/** HMK v1.2 p.44 Shaman, p.47 Family Skills: Spirit 2 or an actually
 * possessed Talent 2; Shaman's Ritual 3 is a named faith available in
 * the character's verified Pantheon. No new physical dice. */
import {SHAMAN_VARIANTS} from './hmk-creation-tables.js';
import {religionChoices,instanceKey} from './hmk-skill-instances.js';
export function verifiedParentShamanVariants(character){
 const proof=character?.hmk?.creation?.values?.arcaneTalentProof;
 const generated=proof&&character?.hmk?.creation?.values?.arcaneTalentMode==='yes'&&Array.isArray(proof.generated)?proof.generated:[];
 return ['Shaman (Spirit)',...new Set(generated)].map(name=>name==='Shaman (Spirit)'?name:`Shaman (Talent: ${name})`).filter(n=>SHAMAN_VARIANTS.includes(n));
}
export function parentShamanRitual(character,faith){
 return typeof faith==='string'&&religionChoices(character).includes(faith)?{religion:faith,skill:instanceKey('Ritual',faith),sourcePage:44}:null;
}
export function verifyParentShamanChoice(character,variant,faith){
 const options=verifiedParentShamanVariants(character);
 if(!options.includes(variant))throw Error('Parent Shaman: Talent musí být skutečně získán fyzickými hody (p.40,44)');
 const ritual=parentShamanRitual(character,faith);
 if(!ritual)throw Error('Parent Shaman: Ritual musí odpovídat doloženému panteonu (p.44)');
 return {variant,ritual};
}
