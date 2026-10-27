/** v93.549 — display-only filter for low-value inventory logistics.
 * Preserve original journal, physical-water evidence, cash, GM clock and
 * clinical/skill/combat events. Only CHARACTER and GM history views filter.
 */
export function isRoutineInventoryHistory(entry){
 if(!entry||typeof entry!=='object')return false;
 // Never hide clinical/procedure receipts, skill rolls or money changes.
 if(entry.skillTestProof||entry.combatProof||entry.cashReceipt||
    entry.calendarInventoryDisposition||entry.calendarInventoryRationLoss||
    entry.calendarInventoryWaterLoss||entry.calendarInventoryWaterUse||
    entry.calendarNutritionPolicy||
    entry.calendarAlchemyVialBinding||entry.calendarAlchemyVialEmpty||
    entry.origin==='cash'||entry.origin==='calendar-clock')return false;
 // Physical custody proofs are still required by inventory integrity checks;
 // suppress their ROUTINE display, never delete or mutate them.
 if(entry.calendarChestTransfer||entry.calendarInventoryWaterFill||
    entry.calendarInventoryWaterTransfer)return true;
 // Recognize older journal records without a structured proof. Anchored
 // titles avoid accidentally excluding arbitrary user notes mentioning gear.
 // Personal notes must never be silently hidden.
 const keys=Object.keys(entry);
 if(keys.every(k=>['id','characterId','title','body','createdAt','updatedAt','origin'].includes(k)))return false;
 const title=String(entry.title||'').toLocaleLowerCase('cs').trim();
 if(entry.calendarForagingSupplyUse&&!/^hmk\s*[·:–-]\s*foraging voda převedena do měchu/.test(title))return false;
 return /^(?:truhlice\s*[·:–-]\s*(?:uložení|vyzvednutí)|(?:inventář|výbava)\s*[·:–-]\s*(?:přesun mezi rukama|přesun do ruky|přesun z ruky|oblečení|svlečení)|hmk\s*[·:–-]\s*(?:potvrzené naplnění nádoby|naplnění nádoby pitnou vodou|doložená voda v nádobě|foraging voda převedena do měchu)|voda\s*[·:–-]\s*(?:předání do nádoby|převzetí do nádoby))/.test(title);
}
