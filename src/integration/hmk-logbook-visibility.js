/** A removable PERSONAL logbook projection, without deleting immutable HMK
 * rolls, inventory transfers, nutrition receipts or combat evidence.
 * Entries are hidden by (characterId, entryId), never by title or campaign time.
 */
const PERSONAL_KEYS=new Set(['id','characterId','title','body','createdAt','updatedAt','campaignMinute','calendarCampaignId','campaignTRDate']);
export function isPersonalNote(entry){
 return !!entry && !entry.cashReceipt && !!entry.id && !!entry.characterId &&
  Object.keys(entry).every(key=>PERSONAL_KEYS.has(key));
}
export function hiddenLogbookIds(database,characterId,field='logbookHiddenEntries'){
 const list=database?.[field]?.[characterId];
 return new Set(Array.isArray(list)?list.filter(id=>typeof id==='string'):[]);
}
export function visibleLogbookEntries(entries,hidden){
 const excluded=hidden instanceof Set?hidden:new Set(hidden||[]);
 return entries.filter(entry=>!excluded.has(entry.id));
}
export function logbookHideEntry(database,characterId,entryId,field='logbookHiddenEntries'){
 if(typeof characterId!=='string'||!characterId||typeof entryId!=='string'||!entryId)throw Error('Chybí identita zápisu nebo postavy');
 database[field]??={};
 const byActor=database[field];
 const existing=Array.isArray(byActor[characterId])?byActor[characterId]:[];
 if(!existing.includes(entryId))byActor[characterId]=[...existing,entryId];
 return database;
}
export function logbookRestoreEntry(database,characterId,entryId){
 const existing=database?.logbookHiddenEntries?.[characterId];
 if(Array.isArray(existing))database.logbookHiddenEntries[characterId]=existing.filter(id=>id!==entryId);
 return database;
}
export function validateLogbookVisibility(database,field='logbookHiddenEntries'){
 const record=database?.[field];
 if(record===undefined)return true;
 if(!record||typeof record!=='object'||Array.isArray(record))throw Error('Logbook: neplatné záznamy skrytí');
 for(const [actor,ids] of Object.entries(record)){
  if(!actor||!Array.isArray(ids)||ids.length>20000||
   ids.some(id=>typeof id!=='string'||!id||id.length>300)||new Set(ids).size!==ids.length)
   throw Error('Logbook: neplatný seznam skrytých položek postavy');
 }
 return true;
}
