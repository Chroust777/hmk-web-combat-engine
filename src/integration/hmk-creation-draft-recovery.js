/** Selection-only logic. The existing persisted `characters` array is the
 * single source of truth; no second localStorage draft or game-state copy.
 */
export function isUnfinishedCreation(character){
 const c=character?.hmk?.creation;
 return !!c&&(c.status!=='review-required'||!c.completed?.[14]);
}
export function creationDrafts(database){
 return (database?.characters??[]).filter(isUnfinishedCreation);
}
export function mostRecentCreationDraft(database){return creationDrafts(database).at(-1)??null;}
