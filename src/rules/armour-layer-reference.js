/** Transcription of printed HMK p.117 Armour Layers table.
 * Column values are literal printed tokens; this is reference data, NOT an
 * automated legality decision (which needs article identity, zone, ordering). */
export const ARMOUR_LAYER_COLUMNS=Object.freeze([
 {code:'C',underFar:'•',underNear:'C',base:'C',overNear:'CD',overFar:'Q'},
 {code:'L',underFar:'C',underNear:'CD',base:'L',overNear:'•',overFar:'C'},
 {code:'D',underFar:'•',underNear:'C',base:'D',overNear:'KP',overFar:'C'},
 {code:'Q',underFar:'•',underNear:'C',base:'Q',overNear:'[kp]',overFar:'C'},
 {code:'G',underFar:'•',underNear:'C',base:'G',overNear:'•',overFar:'C'},
 {code:'K',underFar:'C',underNear:'CD',base:'K',overNear:'•',overFar:'CDQ'},
 {code:'S',underFar:'•',underNear:'CD',base:'S',overNear:'[kp]',overFar:'CDQ'},
 {code:'M',underFar:'C',underNear:'CD',base:'M',overNear:'KP',overFar:'CDQ'},
 {code:'P',underFar:'C',underNear:'CD',base:'P',overNear:'•',overFar:'CDQ'}
]);
export const ARMOUR_LAYER_NOTES=Object.freeze([
 'Restrictions checked separately by Body Zone and Location',
 'No more than five layers per Body Zone',
 'Only one D or Q layer per five layers',
 'Multi-material columns allow only one article',
 '[kp] means arm/leg articles only',
 'Last over column restricted to Cloak, Mantle, Vest, Surcoat, Coat, Robe, Cuisse; D/Q adds 5 ENC',
 'Limited Cloth or Padded violation may incur cumulative -5 Bulk per affected Body Zone'
]);
