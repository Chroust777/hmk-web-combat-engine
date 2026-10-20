/** HMK v1.2 printed p.147: a Tracking CF grants the party one mandatory
 * Bearing Mode on its NEXT prepared trekking watch. The mode is a consequence
 * of the previous result, not an Orienteering star and not a new die.
 * The original Tracking proof is immutable; this is a read-only linkage.
 */
const fail=message=>{throw Error(message)};
const ids=xs=>JSON.stringify([...xs].sort());
export function pendingTrackingBearing({journal=[],campaignId,minute,memberIds=[]}={}){
 if(typeof campaignId!=='string'||!campaignId||!Number.isSafeInteger(minute)||minute<0||
  !Array.isArray(memberIds)||!memberIds.length||new Set(memberIds).size!==memberIds.length)fail('Tracking Bearing: neplatná kampaň, čas nebo členové skupiny');
 const target=new Set(memberIds);
 for(let i=0;i<journal.length;i++){
  const row=journal[i],p=row.calendarTrekTrackingProof;
  if(row.calendarCampaignId!==campaignId||!p?.score?.nextWatchBearingOnCF)continue;
  const source=journal.slice(0,i).find(x=>x.id===p.sourceId&&x.calendarCampaignId===campaignId);
  if(!source?.calendarTrekProof||source.campaignMinute!==p.sourceMinute||
   row.campaignMinute!==source.campaignMinute||row.campaignMinute>=minute||
   source.campaignMinute>=minute)continue;
  const group=source.calendarTrekProof.partyModes?.memberIds??[source.characterId];
  if(!group.some(id=>target.has(id)))continue;
  // A subsequent actual watch containing any of these members has already
  // consumed the 'next watch' event. It cannot reappear every watch forever.
  const consumed=journal.some(x=>x.id!==source.id&&x.calendarCampaignId===campaignId&&x.calendarTrekProof&&
   x.campaignMinute>source.campaignMinute&&x.campaignMinute<=minute&&
   (x.calendarTrekProof.partyModes?.memberIds??[x.characterId]).some(id=>group.includes(id)));
  if(consumed)continue;
  // A party split before resolving mandatory Bearing needs an explicit GM
  // decision; never assign a shared mode to an arbitrary subset.
  if(ids(group)!==ids(memberIds))fail('Tracking CF: původní družina změnila složení. Povinný Bearing následující hlídky vyžaduje rozhodnutí GM.');
  return {trackingId:row.id,sourceId:p.sourceId,sourceMinute:p.sourceMinute,
   campaignId,memberIds:[...group].sort(),forcedBearing:1,sourcePage:147};
 }
 return null;
}
/** Replay for all NEW watch proofs; a missing tag indicates historical data. */
export function assertTrackingBearingWatch(row,priorJournal=[]){
 const p=row?.calendarTrekProof,m=p?.modes;
 if(!p||!Object.hasOwn(m??{},'trackingForcedBearingSourceId'))return true;
 const campaignId=row.calendarCampaignId;
 const expected=pendingTrackingBearing({journal:priorJournal,campaignId,minute:row.campaignMinute,
  memberIds:p.partyModes?.memberIds??[row.characterId]});
 const actual=m.trackingForcedBearingSourceId;
 if(actual!==(expected?.trackingId??null)||actual!==null&&m.bearing<1)
  fail('Tracking CF: povinný Bearing chybí nebo odkazuje na cizí/neaktuální hlídku');
 return true;
}
