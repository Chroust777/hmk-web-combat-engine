/** Calendar boundary for minute-based HMK travel episodes.
 * Proofs and medical changes remain in the immutable character journal,
 * but never become independent world-calendar entries merely because they
 * were produced inside a travel episode.  Truly independent tests and
 * persistent future medical obligations are NOT suppressed by this marker.
 */
export function isTravelEpisodeReceipt(row){
 if(!row || typeof row!=='object')return false;
 const proof=row.skillTestProof;
 return !!(row.calendarEpisodeSkillLink||row.calendarEpisodeEquipmentHazard||
  row.calendarTimeEpisode||row.calendarEpisodeInterruptionResolution||row.calendarEpisodeTimedMedical||
  proof?.autoFromTimeEpisode||
  ['episode-weather-health-aftercare','episode-weather-skin'].includes(proof?.type));
}

/** A single completed travel interval is the only calendar representation.
 * Each character keeps all constituent test and injury receipts elsewhere.
 */
export function travelEpisodeCalendarSegments(clock,characters=[],journal=[]){
 if(!clock)return [];
 const campaignId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const names=new Map(characters.map(c=>[c.id,c.name]));
 return journal.flatMap(row=>{
  const ep=row?.calendarTimeEpisode;
  if(row.calendarCampaignId!==campaignId||ep?.kind!=='travel'||
   !Number.isSafeInteger(ep.startMinute)||!Number.isSafeInteger(ep.endMinute)||
   ep.startMinute<0||ep.endMinute<=ep.startMinute||ep.endMinute>clock.minute)return [];
  const members=(ep.memberIds||[]).map(id=>names.get(id)||id).filter(Boolean);
  return [{id:'travel-episode:'+row.id,origin:'activity',kind:'travel',
   characterId:row.characterId,name:members.join(', '),
   sourceId:row.id,minute:ep.startMinute,dueMinute:ep.startMinute,
   endMinute:ep.endMinute,status:'resolved',destination:'notes',
   title:'Cestování · '+ep.minutes+' min',
   description:'Dokončený cestovní interval; podrobnosti a následky v kronice Cestování.'}];
 });
}
