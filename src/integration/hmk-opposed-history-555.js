/** Display-only participation of a single immutable journal receipt in both logbooks.
 * A two-character Opposed Test is ONE historical event, not two game events.
 * No mutation, rolling, duplicate IDs or changed character ownership. */
export const isSharedOpposedReceipt=row=>!!row?.skillTestProof &&
 ['opposed-success-test','opposed-tiebreak'].includes(row.skillTestProof.type) &&
 typeof row.skillTestProof.actorId==='string' && !!row.skillTestProof.actorId &&
 typeof row.skillTestProof.opponentId==='string' && !!row.skillTestProof.opponentId;

export function historyParticipantIds(row){
 const ids=isSharedOpposedReceipt(row)
  ?[row.skillTestProof.actorId,row.skillTestProof.opponentId]
  :[row?.characterId];
 return [...new Set(ids.filter(x=>typeof x==='string'&&x))];
}
export function historyBelongsToCharacter(row,characterId){
 return !!characterId && historyParticipantIds(row).includes(characterId);
}
/** Title decoration only. No changes to saved journal title or proof. */
export function historyDisplayTitle(row,nameById){
 const title=String(row?.title||'Událost');
 if(!isSharedOpposedReceipt(row))return title;
 const p=row.skillTestProof;
 const getName=id=>{const v=typeof nameById==='function'?nameById(id):'';return String(v||'').trim()};
 const fromProof=side=>{
  const match=String(row.body||'').match(new RegExp('^'+side+' · ([^\\n/]+)\\s*\\/','m'));
  return match?.[1]?.trim()||'';
 };
 const first=getName(p.actorId)||fromProof('A')||'Aktivní postava';
 const second=getName(p.opponentId)||fromProof('B')||'Oponent';
 return title+' ('+(p.actorId!==p.opponentId&&first===second?first+' [aktivní]':first)+
  ' proti '+(p.actorId!==p.opponentId&&first===second?second+' [oponent]':second)+')';
}
/** One read-only projection per participant in the GM's per-character groups. */
export function groupHistoryByCharacter(entries,characters){
 const known=new Set(characters.map(c=>c.id));
 const groups=characters.map(c=>({id:c.id,name:c.name,entries:entries.filter(j=>historyBelongsToCharacter(j,c.id))})).filter(x=>x.entries.length);
 const unassigned=entries.filter(j=>!historyParticipantIds(j).some(id=>known.has(id)));
 return {groups,unassigned};
}
