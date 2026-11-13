/** v93.859: physical mixed-party occupancy, independent of a single GM Drover test.
 * HMK pp.141,145: one primary Drover may be different from Guide; in a
 * mixed-conveyance party the LOWER of Riding/Animalcraft is used. The group
 * moves as its slowest participant. A handler is an actual WALKING party
 * member, never a second rider magically inferred from the Stable.
 *
 * This describes the supported one-riding-mount + n led-pack-animals model.
 * It does NOT assert a second rider, a second wheeled vehicle, or a fabricated
 * skill roll. These require distinct physical transport evidence.
 */
const check=(condition,message)=>{if(!condition)throw Error(message)};
export const MIXED_TRANSPORT_FORMAT_93859='hmk-mixed-transport-93859';
export function assessMountedPackGroup93859({memberIds=[],riderId='',mountAnimalId='',selectedAnimalIds=[],
 packHandlers={},droverId='',passengerIds=[]}={}){
 check(Array.isArray(memberIds)&&memberIds.length>0&&new Set(memberIds).size===memberIds.length,
  'Smíšená doprava: účastníci musejí tvořit jednoznačnou skupinu.');
 check(memberIds.includes(riderId)&&!passengerIds.includes(riderId),
  'Smíšená doprava: jezdec musí být aktivní, schopný člen této skupiny.');
 check(typeof mountAnimalId==='string'&&mountAnimalId&&selectedAnimalIds.includes(mountAnimalId)&&
  new Set(selectedAnimalIds).size===selectedAnimalIds.length,
  'Smíšená doprava: zvolte jedno skutečné jezdecké zvíře z této skupiny.');
 const others=selectedAnimalIds.filter(id=>id!==mountAnimalId);
 const handlers=[];
 for(const animalId of others){
  const handlerId=packHandlers?.[animalId]||'';
  check(memberIds.includes(handlerId)&&!passengerIds.includes(handlerId),
   'Smíšená doprava: pro každé další zvíře zvolte skutečného pěšího vodiče z této skupiny ('+animalId+').');
  check(handlerId!==riderId,
   'Smíšená doprava: jezdec '+riderId+' nemůže současně fyzicky vést další zvíře pěšky ('+animalId+').');
  handlers.push({animalId,handlerId,position:'leading-on-foot'});
 }
 const leadIds=[...new Set(handlers.map(x=>x.handlerId))];
 const primary=droverId||riderId;
 check(memberIds.includes(primary)&&!passengerIds.includes(primary),
  'Drover musí být skutečným členem této cestovní skupiny.');
 check(primary===riderId||leadIds.includes(primary),
  'Smíšená doprava: hlavní Drover musí být jezdec nebo skutečný vodič některého zvířete.');
 const walkingMemberIds=memberIds.filter(id=>id!==riderId&&!passengerIds.includes(id));
 return {format:MIXED_TRANSPORT_FORMAT_93859,mountAnimalId,riderId,
  handlers,primaryDroverId:primary,walkingMemberIds,
  mixed:others.length>0,requiredSkills:others.length>0?['Riding','Animalcraft']:['Riding'],
  sourcePages:[141,145,146]};
}
