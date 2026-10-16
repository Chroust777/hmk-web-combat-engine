/** HMK Keeper’s Ledger v93.214: read-side guard for old manual editors.
 * Creation-owned Skills are only assigned by the existing HMK creation DP
 * transaction. This module neither changes stored records nor creates rolls.
 */
export function isCreationOwned(character){return !!character?.hmk?.creation;}
export function assertLegacyMutationAllowed(character,scope='skill'){
 if(isCreationOwned(character))throw Error(scope==='profile'
  ?'Atributy a původ této postavy spravuje Character Creation. Použijte Edit / Pokračovat v tvorbě.'
  :'Skills této postavy vypočítává Character Creation. Ruční legacy editor je jen pro čtení; použijte Edit v průvodci.');
 return true;
}
/** Only historical manually-entered records; never delete them. If a manual
 * record shadows a calculated one, show an explicit GM reconciliation warning.
 */
export function inspectLegacySkillRecords(character,calculatedRows=[]){
 const manual=(Array.isArray(character?.hmk?.skills)?character.hmk.skills:[]).filter(x=>!x.creationDerived);
 const calculated=new Map(calculatedRows.map(x=>[x.name,x]));
 const collisions=manual.filter(x=>calculated.has(x.name)).map(x=>{
  const derived=calculated.get(x.name);
  return {name:x.name,legacyML:x.ml??null,calculatedML:derived.ml??null,
   legacySB:x.sb??null,calculatedSB:derived.sb??null,
   divergent:x.ml!==derived.ml||x.sb!==derived.sb};
 });
 return {manual,collisions,unmapped:manual.filter(x=>!calculated.has(x.name)),needsReview:isCreationOwned(character)&&manual.length>0};
}
