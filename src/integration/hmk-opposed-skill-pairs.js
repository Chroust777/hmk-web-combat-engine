/** Only explicitly described HMK v1.2 counter tests. p.61, p.84, p.138.
 * The proposed skill is advisory. A GM can select another skill; the physical
 * combat attack/block/dodge system is never simulated by the generic workbench.
 */
export const HMK_OPPOSED_ACTIONS=Object.freeze({
 Charm:[['Seduction','Will']],
 Command:[['Authority','Will'],['Intimidation','Initiative']],
 Discourse:[['Debate','Discourse']],
 Guile:[['Bluffing / lying','Intrigue']],
 Theatrics:[['Acting','Intrigue'],['Disguise','Awareness'],['Mimicry','Awareness']],
 Stealth:[['Alert observer','Awareness']],
 Melee:[['Block (Combat only)','Melee'],['Dodge (Combat only)','Dodge']],
 Eloquence:[['Opposed speech','Eloquence']]
});
