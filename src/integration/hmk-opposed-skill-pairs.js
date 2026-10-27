/** Source-supported opposed pair suggestions; never an automatic opponent die.
 * HMK v1.2 pp.61,66,76–77,82,84,93,138. All other skills are available for
 * an explicit GM-chosen opposing Skill, not assigned an invented fixed pair.
 * Combat maneuvers are owned by Combat, NOT simulated here.
 */
export const HMK_OPPOSED_ACTIONS=Object.freeze({
 Charm:[['Seduction','Will',138]],
 Command:[['Authority','Will',138],['Intimidation','Initiative',138]],
 Discourse:[['Debate','Discourse',138]],
 Guile:[['Bluffing / lying','Intrigue',138]],
 Theatrics:[['Acting','Intrigue',138],['Disguise','Awareness',138],['Mimicry','Awareness',138]],
 Stealth:[['Alert observer','Awareness',84],['Active observer','Perception',93]],
 Awareness:[['Detect Stealth','Stealth',66]],
 Perception:[['Notice active Stealth','Stealth',82]],
 Legerdemain:[['Sleight of hand / pickpocket','Awareness',77]],
 Intrigue:[['Detect Guile','Guile',76],['Detect Theatrics','Theatrics',76]],
 Melee:[['Block (Combat only)','Melee',61],['Dodge (Combat only)','Dodge',61]],
 Eloquence:[['Opposed speech','Eloquence',61]]
});
export function opposedActionOptions(name){
 const skill=String(name||'');
 if(HMK_OPPOSED_ACTIONS[skill])return HMK_OPPOSED_ACTIONS[skill];
 const base=skill.match(/^([^(:]+?)(?:\s*\(|\s*:|$)/)?.[1]?.trim()||skill;
 return HMK_OPPOSED_ACTIONS[base]||[];
}
export function opposedPairIsPrinted(name,defender){
 return opposedActionOptions(name).some(row=>row[1]===defender);
}
