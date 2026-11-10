/** v93.823 — Travel is the ONLY authority for present mount occupancy.
 * Old Stable rider-mount/rider-dismount receipts stay immutable historical
 * records; they never grant an occupant in a newly evaluated journey.
 * All values below are derived from finalised Travel receipts only.
 */
export const TRAVEL_RIDING_FORMAT_93823='hmk-travel-ride-position-93823';
const validId=s=>typeof s==='string'&&s.length>0;
export function recordedTravelRide93823(data,campaignId,animalId){
 if(!validId(campaignId)||!validId(animalId))return null;
 const rows=(data?.journal||[]).filter(j=>j.calendarCampaignId===campaignId&&j.calendarTimeEpisode?.kind==='travel'&&
  (j.calendarTimeEpisode.settings?.stableAnimalIds||[]).includes(animalId));
 // Later completed travel overrides older animal occupancy. An episode
 // with foot/cart/wagon clears a prior riding position on the animal.
 const row=rows.at(-1);
 if(!row)return null;
 // When a rider later travels in a different group/on foot/on another mount,
 // the old mount cannot still list that same person as an occupant. This is
 // based on the next SAVED journey of the person, never on a new checkbox.
 const laterTravelOf=id=>(data?.journal||[]).slice((data.journal||[]).indexOf(row)+1).some(j=>
  j.calendarCampaignId===campaignId&&j.calendarTimeEpisode?.kind==='travel'&&
  (j.calendarTimeEpisode.memberIds||[]).includes(id));
 const currentOccupants=ids=>ids.filter(id=>validId(id)&&!laterTravelOf(id));
 const e=row.calendarTimeEpisode,proof=e.transportProof?.mount;
 const minute=e.endMinute??row.campaignMinute;
 if(e.settings?.conveyance!=='mount')return {format:TRAVEL_RIDING_FORMAT_93823,sourceId:row.id,minute,occupants:[],handlerId:null,handlerPosition:'none',loadLb:0,kind:'other'};
 if(proof?.mountId===animalId){
  const passengers=[proof.patientId];
  if(proof.handlerPosition==='mounted'&&proof.handlerId&&proof.handlerId!==proof.patientId)passengers.push(proof.handlerId);
  const occupants=currentOccupants(passengers);
  return {format:TRAVEL_RIDING_FORMAT_93823,sourceId:row.id,minute,occupants,
   handlerId:proof.handlerId&&!laterTravelOf(proof.handlerId)?proof.handlerId:null,handlerPosition:proof.handlerPosition,
   loadLb:(occupants.includes(proof.patientId)?proof.patientLb:0)+(occupants.includes(proof.handlerId)&&proof.handlerPosition==='mounted'?proof.handlerLb:0),kind:'patient'};
 }
 const riding=e.mountRiding93823;
 if(riding?.format===TRAVEL_RIDING_FORMAT_93823&&riding.animalId===animalId){
  return {format:TRAVEL_RIDING_FORMAT_93823,sourceId:row.id,minute,occupants:currentOccupants([riding.riderId]),
   handlerId:laterTravelOf(riding.riderId)?null:riding.riderId,handlerPosition:laterTravelOf(riding.riderId)?'none':'mounted',
   loadLb:laterTravelOf(riding.riderId)?0:riding.riderLb,kind:'rider'};
 }
 // Historic travel before v93.823 lacks an explicit rider assignment.
 // Never invent a rider from the old Stable checkbox.
 return {format:TRAVEL_RIDING_FORMAT_93823,sourceId:row.id,minute,occupants:[],
  handlerId:null,handlerPosition:'unknown',loadLb:0,kind:'historic'};
}
