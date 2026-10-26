/** Presentation-only filter for GM/world calendar. This module never edits
 * immutable journal receipts or changes rule obligations in the scheduler.
 * Every private transaction remains in the character's Notes & Logbook.
 */
const WORLD_CONSEQUENCES=[
 'combatProof', 'specialOutcomeProof', 'calendarMalnutritionMedical',
 'calendarHerbPoisonExposure', 'calendarHerbGreatPoisonOnset',
 'calendarHerbEmeticShock', 'calendarHerbParalyticEndurance',
 'calendarHerbSoporificEnd', 'calendarHerbSoporificEffect',
 'calendarHerbWeaponPasteHit', 'calendarHerbWeaponResistance',
 'calendarAlchemyAcidFleshApply', 'calendarAlchemyAcidFleshRound',
 'calendarAlchemyAcidThrown', 'calendarAlchemyDarkvisionHealingStart',
 'calendarAlchemyDarkvisionHealingRoll', 'calendarHerbTranscendenceWill',
 'calendarHerbReembodiment', 'calendarTrekEncounterProof'
];
const PRIVATE_COMBAT_ACTIONS=new Set([
 'guided-free-action', 'grab-take-transfer', 'pelahn-bonus-move',
 'mounted-shared-move', 'missile-precombat-crossbow-loaded'
]);
export function calendarWorldHistoryRelevant(entry){
 if(!entry || typeof entry!=='object')return false;
 // Nutrition receipts are worth a calendar marker only if a character actually
 // lacks food or water; ordinary rations accounting belongs to the logbook.
 if(entry.calendarNutritionDay && (Number(entry.calendarNutritionDay.foodShortfall)>0 ||
  Number(entry.calendarNutritionDay.waterShortfall)>0))return true;
 if(entry.calendarTrekProof?.encounter?.encounter)return true;
 const kind=String(entry.combatProof?.actionKind||'').toLowerCase();
 // Readying, loading, aiming and moving equipment are private combat actions,
 // not independent events in the world calendar. Real attacks, damage,
 // mandatory follow-ups and medical consequences still appear.
 if(entry.combatProof&&(PRIVATE_COMBAT_ACTIONS.has(kind)||
  kind.startsWith('missile-span-')||kind.startsWith('missile-load-')||
  kind.startsWith('missile-aim-')||kind.startsWith('grope-'))){
   return WORLD_CONSEQUENCES.some(key=>key!=='combatProof'&&!!entry[key]);
 }
 return WORLD_CONSEQUENCES.some(key=>!!entry[key]);
}
export function calendarVisibleHistory(history=[],journal=[]){
 const source=new Map(journal.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
 return history.filter(event=>event.origin!=='history'||
  calendarWorldHistoryRelevant(source.get(event.sourceId)));
}
export function calendarVisibleActivities(activities=[]){
 // Rest and 24-hour nutrition intervals are durable calendar activities.
 // Keep their completed/cancelled marker at the ORIGINAL interval without
 // turning them into another due obligation or repeating private log entries.
 const historicallyVisible=new Set(['winded','rest','sleep','nutrition-conditions']);
 return activities.filter(event=>event.origin!=='activity'||
  !['resolved','cancelled'].includes(event.status)||historicallyVisible.has(event.kind));
}
