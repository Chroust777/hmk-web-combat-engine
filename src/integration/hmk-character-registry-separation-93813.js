/** v93.813 – Stable/bestiary veterinary actors are not characters in
 * the 14-step human PC/NPC creation registry. Their original actor object,
 * kind, stable ID, Health State, combat links and campaign memberships stay
 * unchanged so historical receipts can be replayed without migration. */
export function isStableAnimalProfile93813(record){
 return !!(record&&record.hmk&&typeof record.hmk.verifiedMountedBreed==='string'&&
  record.hmk.verifiedMountedBreed.trim());
}
export function registryCharacters93813(characters=[]){
 return characters.filter(c=>!isStableAnimalProfile93813(c));
}
export function registryCounts93813(characters=[]){
 const people=registryCharacters93813(characters);
 return {people:people.length,animals:characters.length-people.length};
}
