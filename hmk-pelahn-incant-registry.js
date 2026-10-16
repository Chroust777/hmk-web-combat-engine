/** HMK Kèthîra v1.2 pp.200–204, 226–230.
 * Fail-closed SECOND-INCANT entry gate. The source catalog lists all 28 printed
 * Pèleáhn spells, but only independently finished spellfire journeys may enter
 * the Initiative concentration scheduler. Free-action spells have a different
 * action contract and are not silently converted to one-round commitments.
 */
import {PELAHN_HMK12_SPELLS,castablePelahnSpell} from '../rules/pelahn-spell-catalog-hmk12.js';
export function pelahnPrintedSpellCoverage(){return PELAHN_HMK12_SPELLS;}
export function pelahnBonusIncantChoices(character){
 const known=character?.hmk?.arcane?.knownSpells;
 if(!Array.isArray(known))return [];
 return PELAHN_HMK12_SPELLS.filter(x=>known.includes(x.name)&&castablePelahnSpell(x.name)!==null);
}
export function requirePelahnBonusIncantSpell(character,spell){
 const entry=castablePelahnSpell(spell);
 if(!entry||!pelahnBonusIncantChoices(character).some(x=>x.name===entry.name))
  throw Error('Incant nemá ověřený známý spellfire resolver a tištěný Casting Time; další kouzlo nelze bezpečně zahájit');
 return entry;
}
