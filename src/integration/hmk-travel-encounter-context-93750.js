/** HMK 1.2 pp.150,158: read-only encounter-to-character handoff.
 * Watchfulness (lax/normal/alert) is NOT the combat Alertness condition.
 * The printed rules provide encounter/turn reactions, not a universal
 * elapsed-minute expiration. Never mutate Combat or the character.
 */
const states=Object.freeze({
 'party-confused':'confused',
 'party-unaware':'unaware',
 'both-confused':'confused',
 'both-aware':'aware',
 'foe-confused':'aware',
 'foe-unaware':'aware'
});
/** Shows the latest confirmed encounter at the CURRENT campaign clock only.
 * Once another episode advances time this hint disappears. GM still decides
 * whether the original initial condition applies when creating Combat.
 */
export function travelEncounterCharacterHint({journal=[],campaignId,minute,actorId}={}){
 if(!Array.isArray(journal)||typeof campaignId!=='string'||!campaignId||
  !Number.isSafeInteger(minute)||minute<0||!actorId)return null;
 const relevant=journal.filter(j=>j?.calendarCampaignId===campaignId&&
  j.calendarTimeEpisode?.endMinute===minute&&
  j.calendarTimeEpisode?.memberIds?.includes(actorId)&&
  Array.isArray(j.calendarTimeEpisode.encounterDetails));
 const source=relevant.at(-1);if(!source)return null;
 const episode=source.calendarTimeEpisode;
 const last=episode.encounterDetails.at(-1);
 if(!last||last.nonhostile||last.externalToGM||!last.surprise?.verified||
  !last.surprise.decision||last.surprise.decision==='leave')return null;
 const status=states[last.surprise.alertness];if(!status)return null;
 const watchfulness=last.surprise.party?.effective;
 if(!['lax','normal','alert'].includes(watchfulness))return null;
 const eventMinute=episode.startMinute+last.offset;
 if(!Number.isSafeInteger(eventMinute)||eventMinute<episode.startMinute||eventMinute>minute)return null;
 return {kind:'travel-encounter-initial-alertness-hint-v1',actorId,
  sourceEpisodeId:source.id,eventMinute,atCampaignMinute:minute,
  elapsedMinutes:minute-eventMinute,initialAlertness:status,
  watchfulness,decision:last.surprise.decision,
  provisional:true,autoCombat:false,sourcePage:150};
}
