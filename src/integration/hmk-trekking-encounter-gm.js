/** Non-combat encounters are ordinary GM adjudications. The trigger die stays
 * immutable and a conscious GM closure receipt has no combat or dice effects. */
export const TREK_ENCOUNTER_GM_FORMAT='hmk-trek-encounter-gm-v1';
export function encounterGMResolution(journal=[],sourceId,campaignId){
 return journal.find(j=>j.calendarCampaignId===campaignId&&j.calendarTrekEncounterGM?.sourceId===sourceId)??null;
}
export function validateEncounterGMJournal(journal=[]){
 const sources=new Map(journal.filter(j=>j?.id).map(j=>[j.id,j]));
 const done=new Set();
 for(const entry of journal){
  const p=entry?.calendarTrekEncounterGM;if(!p)continue;
  const src=sources.get(p.sourceId),key=entry.calendarCampaignId+'|'+p.sourceId;
  if(p.format!==TREK_ENCOUNTER_GM_FORMAT||!['no-further-action','adjudicated'].includes(p.disposition)||
    typeof p.note!=='string'||p.note.length>500||!src?.calendarTrekProof?.encounter?.encounter||
    src.calendarCampaignId!==entry.calendarCampaignId||src.characterId!==entry.characterId||
    entry.campaignMinute<src.campaignMinute||entry.campaignMinute!==p.minute||done.has(key))
   throw Error('Neplatné uzavření náhodného setkání GM.');
  done.add(key);
 }
 return true;
}
export function assertEncounterGMAppendOnly(before=[],after=[]){
 const now=new Map(after.filter(j=>j.calendarTrekEncounterGM).map(j=>[j.id,j]));
 for(const old of before)if(old.calendarTrekEncounterGM){
  const current=now.get(old.id);
  if(!current||JSON.stringify(current)!==JSON.stringify(old))throw Error('Výsledek setkání GM je neměnný doklad.');
 }
 return true;
}
