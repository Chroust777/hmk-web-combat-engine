/** HârnMaster: Roleplaying in the World of Kèthîra v1.2, pp.226–230.
 * Printed Pèleáhn spell names, complexity and BASE casting time.
 * This is an audit/eligibility catalog, NOT a spellfire implementation.
 * A listed spell MUST NOT become castable without a separate, fully replayable
 * authoritative effect resolver and its supported aftermath.
 * No dice, writes, side effects or player-provided rules are accepted here.
 */
const SPECS=[
 // name, complexity, base time in rounds (null = printed Free action), page
 ['Brand',3,1,226],['Burn',6,2,226],['Caress',1,null,226],
 ['Cloak',2,null,226],['Conflagration',4,1,226],['Convoke',6,2,226],
 ['Desiccation',1,null,227],['Doom Curtain',5,2,227],['Doom Flame',6,2,227],
 ['Envelope',4,2,227],['Eyes',3,1,227],['Fever',4,1,227],
 ['Fire Fiend',6,2,228],['Fireworks',2,null,228],['Flame',1,null,228],
 ['Gauntlet',5,2,228],['Hastening',2,null,228],['Heat',1,null,228],
 ['Immolation',5,2,229],['Mantle',6,2,229],['Meteor',5,2,229],['Pyre',3,1,229],
 ['Seeker',5,2,230],['Shooting Star',3,1,230],['Skin',2,null,230],
 ['Sphere',1,null,230],['Thirst',2,null,230],['Wall',4,1,230]
];
const VERIFIED_RESOLVERS=Object.freeze({
 'Doom Flame':'hmk-guided-doom-flame',
 'Pyre':'hmk-guided-pyre'
});
export const PELAHN_HMK12_SPELLS=Object.freeze(SPECS.map(([name,complexity,castingTimeRounds,printedPage])=>
 Object.freeze({name,convocation:'Pèleáhn',complexity,castingTimeRounds,printedPage,
  printedCastingTime:castingTimeRounds===null?'Free action':`${castingTimeRounds} round${castingTimeRounds===1?'':'s'}`,
  // 'bounded' does not mean all possible variants of the printed spell!
  resolverStatus:Object.hasOwn(VERIFIED_RESOLVERS,name)?'bounded':'unimplemented',
  spellfireResolver:VERIFIED_RESOLVERS[name]??null})));
if(PELAHN_HMK12_SPELLS.length!==28||new Set(PELAHN_HMK12_SPELLS.map(x=>x.name)).size!==28)
 throw Error('Invalid HMK v1.2 Pèleáhn printed spell catalog');
export function printedPelahnSpell(name){
 return typeof name==='string'?PELAHN_HMK12_SPELLS.find(x=>x.name===name)??null:null;
}
export function castablePelahnSpell(name){
 const spell=printedPelahnSpell(name);
 return spell?.resolverStatus==='bounded'&&Number.isSafeInteger(spell.castingTimeRounds)&&
  spell.castingTimeRounds>0?spell:null;
}
