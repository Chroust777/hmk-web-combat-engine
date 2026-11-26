export function deceasedCalendarActors(characters=[]){
 return new Set(characters.filter(c=>c.hmk?.healthState?.shock==='KIA').map(c=>c.id));
}

/** Operational source rows for tests that only the patient or practitioner
 * can complete. Never use this projection to validate or store history.
 * Ownership of an item is not evidence that a deadline is personal.
 */
export function livingPersonalCalendarSources(journal,campaignId,deceased){
 if(!deceased.size)return journal;
 return journal.filter(row=>{
  if(row.calendarCampaignId!==campaignId)return true;
  const target=row.calendarHerbPotionAdminister?.targetId??
   row.calendarHerbHallucinogenicTranceStart?.targetId??
   row.calendarHerbLucidDream?.targetId??
   row.calendarHerbHallucinogenicVeil?.targetId??
   row.calendarHerbTranscendence?.targetId??
   row.calendarHerbWeaponPasteHit?.targetId??
   row.calendarAlchemyImbibing?.targetId??
   row.calendarAlchemyDarkvisionProfusionIll?.targetId??
   row.calendarAlchemyStart?.actorId??
   row.calendarHerbPotionStart?.actorId;
  return !deceased.has(target);
 });
}
