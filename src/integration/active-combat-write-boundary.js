/**
 * HMK Keeper's Ledger — alternate-write boundary during a running Initiative.
 * Ordinary character, catalogue, note and legacy forms use mutate(). This
 * fail-closed guard prevents those paths from changing combat authority.
 * The unified Combat wizard uses commitGuidedTransition() instead.
 * This guard makes no game-rule decisions and generates no dice.
 */
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const reject=(message)=>{throw new Error(message)};
export function assertLegacyMutationDoesNotChangeCombat(before,after,{sequence=null,participantIds=[]}={}){
 if(!sequence)return true;
 if(!before||!after||!Array.isArray(before.characters)||!Array.isArray(after.characters)||
    !Array.isArray(before.inventory)||!Array.isArray(after.inventory)||
    !Array.isArray(before.journal)||!Array.isArray(after.journal))
  reject('Během Initiative nelze uložit neúplná data mimo Combat průvodce');
 if(!same(before.combatRuntime??null,after.combatRuntime??null))
  reject('Kontrolní bod Initiative smí měnit pouze potvrzená Combat transakce');
 if(!same(before.inventory,after.inventory))
  reject('Inventář během Initiative smí měnit pouze dokončená Combat akce');
 const ids=new Set(participantIds);
 for(const id of ids){
  const a=before.characters.filter(c=>c.id===id),b=after.characters.filter(c=>c.id===id);
  if(a.length!==1||b.length!==1||!same(a[0],b[0]))
   reject('Účastníka Initiative, jeho Injury, Fatigue, Shock a Morale smí měnit pouze Combat průvodce');
 }
 // Once a combat result is confirmed, even its human-readable journal entry
 // is part of its audit trail. Notes without combatProof remain editable.
 const proofs=before.journal.filter(row=>row.combatProof);
 for(const row of proofs){
  const copies=after.journal.filter(other=>other.id===row.id);
  if(copies.length!==1||!same(copies[0],row))
   reject('Potvrzený bojový důkaz ani jeho text nesmí být změněn běžnou editací');
 }
 if(after.journal.some(row=>row.combatProof&&!proofs.some(prior=>prior.id===row.id)))
  reject('Nový Combat důkaz smí vytvořit pouze potvrzená Combat transakce');
 return true;
}
