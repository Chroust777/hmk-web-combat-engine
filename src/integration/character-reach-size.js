/** Only a verified, explicitly stored Creature Size reach modifier is authoritative.
 * Never infer from height, weight, folk or unspecified defaults. HMK p.401. */
export function resolveCharacterReachSizeModifier(character){
 const value=character?.hmk?.creatureSizeReachModifier;
 if(!Number.isSafeInteger(value))return {ok:false,reason:'missing-verified-creature-size-reach-modifier'};
 return {ok:true,value,source:'character-hmk-profile'};
}
