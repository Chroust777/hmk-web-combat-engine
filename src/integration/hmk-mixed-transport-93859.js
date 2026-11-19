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

export const TRAVEL_OCCUPANCY_FORMAT_93956='hmk-travel-occupancy-93956';

/** Raw IDs are older saved selections of pedestrian handlers. */
export function travelCompanionAssignment93956(value=''){
 if(value.startsWith('ride:'))return {position:'mounted',personId:value.slice(5)};
 return {position:'leading',personId:value};
}

export function travelWheeledOccupants93956(v){
 const team=new Set(v.transportTeamIds||[]);
 const outside=new Set((v.stableAnimalIds||[]).filter(id=>!team.has(id)).map(id=>
  travelCompanionAssignment93956(v['packHandler_'+id]||'').personId).filter(Boolean));
 return (v.memberIds||[]).filter(id=>!outside.has(id));
}

/** These rows describe physical roles, independently of the one Drover test. */
export function travelOccupancy93956({v,roster=[],canOperate=()=>true,hasVehicle=()=>false,droverId}){
 const members=v.memberIds||[],patients=v.transportedMemberIds||[],selected=v.stableAnimalIds||[];
 const wheeled=['cart','wagon'].includes(v.conveyance);
 const primaryMount=v.conveyance==='mount'&&!patients.length?v.travelRideAnimalId:null;
 const team=new Set(wheeled?v.transportTeamIds||[]:[]);
 const riders=[],handlers=[];
 const requireField=(valid,field,message)=>{
  if(!valid)throw Object.assign(Error(message),{transportField:field});
 };
 const active=id=>members.includes(id)&&!patients.includes(id)&&canOperate(id);
 for(const animalId of selected){
  if(team.has(animalId))continue;
  const field=animalId===primaryMount?'travelRideRiderId':'packHandler_'+animalId;
  const {position,personId}=animalId===primaryMount?
   {position:'mounted',personId:v.travelRideRiderId}:
   travelCompanionAssignment93956(v[field]||'');
  const animal=roster.find(a=>a.id===animalId);
  const name=animal?.name||'Vybrané zvíře';
  requireField(animal&&!hasVehicle(animal),field,name+': odpojte vozidlo, nebo zařaďte zvíře do spřežení aktuálního vozu.');
  requireField(active(personId),field,name+': vyberte způsobilého jezdce nebo pěšího vodiče z této skupiny.');
  if(position==='mounted'){
   requireField(!riders.some(r=>r.riderId===personId),field,'Postava může současně jet jen v jednom sedle.');
   riders.push({animalId,riderId:personId});
  }else handlers.push({animalId,handlerId:personId});
 }
 if(v.conveyance==='mount')
  requireField(riders.some(r=>r.animalId===primaryMount),'travelRideAnimalId','Zvolte hlavní jezdecké zvíře a jeho jezdce.');
 const ridingIds=new Set(riders.map(r=>r.riderId));
 const leadingIds=new Set(handlers.map(h=>h.handlerId));
 for(const h of handlers)
  requireField(!ridingIds.has(h.handlerId),'packHandler_'+h.animalId,'Jezdec nemůže zároveň vést zvíře pěšky.');
 const walkers=members.filter(id=>!patients.includes(id)&&!ridingIds.has(id)&&(!wheeled||leadingIds.has(id)));
 const vehicleMemberIds=wheeled?travelWheeledOccupants93956(v):[];
 if(wheeled)requireField(active(droverId)&&vehicleMemberIds.includes(droverId),'droverActorId',
  'Hlavní Drover vozu musí být způsobilý člen posádky vozidla.');
 else requireField(active(droverId)&&(ridingIds.has(droverId)||leadingIds.has(droverId)),'droverActorId',
  'Hlavní Drover musí být jezdec nebo pěší vodič zvířete.');
 return {format:TRAVEL_OCCUPANCY_FORMAT_93956,riders,handlers,walkingMemberIds:walkers,vehicleMemberIds,primaryDroverId:droverId};
}

export function travelOccupancyContext93956(occupancy){
 if(!occupancy)return null;
 return JSON.stringify({
  riders:occupancy.riders.map(r=>[r.animalId,r.riderId]).sort(),
  handlers:occupancy.handlers.map(r=>[r.animalId,r.handlerId]).sort(),
  walking:[...occupancy.walkingMemberIds].sort(),
  vehicle:[...occupancy.vehicleMemberIds].sort(),
  drover:occupancy.primaryDroverId
 });
}
