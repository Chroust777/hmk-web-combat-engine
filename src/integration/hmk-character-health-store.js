/** Authoritative per-character medical ledger (HMK 1.2 pp.177-186).
 * Travel, Combat, Calendar, Journal and other effects all read and write
 * ONE persistent healthState on the character, never competing state copies.
 * Combat session turns and initiative live in data.combatRuntime.
 * The character's injuries[] is only a display/provenance projection.
 * Historical saves with hmk.combatState are intentionally not supported.
 */
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
export const CHARACTER_HEALTH_FIELD='healthState';
export const CHARACTER_HEALTH_FORMAT='hmk-character-health-v1';
const ensure=(v,m)=>{if(!v)throw Error(m)};
export function assertCharacterHealthAuthority(character){
 const h=character?.hmk;
 if(!h)return true;
 ensure(!Object.hasOwn(h,'combatState'),
  'Nepovolené druhé zdravotní úložiště combatState; stav postavy patří pouze do healthState.');
 if(h.healthState!==undefined)validateCombatState(h.healthState);
 return true;
}
export function readCharacterHealth(character){
 if(character?.hmk&&Object.hasOwn(character.hmk,'combatState'))throw Error('Duplicitní zdravotní stav combatState');
 return character?.hmk?.healthState??initialCombatState();
}
export function writeCharacterHealth(character,state){
 ensure(character&&typeof character==='object','Chybí postava zdravotního deníku.');
 validateCombatState(state);
 character.hmk??={};
 assertCharacterHealthAuthority(character);
 character.hmk.healthState=state;
 return state;
}
/** Pure immutable projection: never allocate independent health state. */
export function characterHealthSnapshot(character){
 return structuredClone(readCharacterHealth(character));
}
