/** HMK Keeper's Ledger – explicitly GM-confirmed physical travel locations.
 * A place is a GM-supplied site name, NOT a map coordinate or a rule modifier.
 * Only a final confirmed travel episode records relocation. Unknown pre-93.764
 * whereabouts remain unknown and require an initial GM attestation.
 * Retained historical events are never rewritten.
 */
export const TREK_POSITION_FORMAT_93764='hmk-gm-travel-position-v93.764';
const insist=(ok,why)=>{if(!ok)throw Error('Poloha pochodu: '+why)};
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=200&&x.trim()===x;
const place=x=>{
 insist(typeof x==='string'&&x.trim().length>=2&&x.trim().length<=120&&
  !/[\u0000-\u001f\u007f]/.test(x),'zadejte konkrétní výchozí a cílové místo (2–120 znaků).');
 return x.trim().replace(/\s+/g,' ');
};
const key=x=>place(x).toLocaleLowerCase('cs-CZ');
const ids=a=>Array.isArray(a)&&a.every(validId)&&new Set(a).size===a.length;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sorted=a=>[...a].sort();
/** Same real animal can appear as a living actor and a Stable record. */
export function travelPositionSubjects93764({memberIds=[],animalIds=[],stableAnimalIds=[],vehicleKey=null}={}){
 for(const [name,list] of [['účastníci',memberIds],['živá zvířata',animalIds],['Stáj',stableAnimalIds]])
  insist(ids(list),name+': neplatné nebo duplicitní ID.');
 insist(memberIds.length>0,'vyberte skutečné účastníky.');
 insist(vehicleKey===null||validId(vehicleKey),'neplatný klíč vozu.');
 const people=sorted([...new Set([...memberIds,...animalIds,...stableAnimalIds])].map(id=>'actor:'+id));
 return vehicleKey===null?people:sorted([...people,'vehicle:'+vehicleKey]);
}
/** Returns last *confirmed* named site for each subject. Legacy episodes have
 * no location proof, so are deliberately not turned into fictitious positions.
 */
export function travelPositionAt93764(journal=[],campaignId,minute=Infinity){
 const out=new Map();
 for(const row of journal){
  const ep=row?.calendarTimeEpisode,proof=ep?.travelPositionProof;
  if(!proof||row.calendarCampaignId!==campaignId||ep.kind!=='travel'||ep.endMinute>minute)continue;
  // A malformed historical proof must not become an authority.
  insist(proof.format===TREK_POSITION_FORMAT_93764&&Array.isArray(proof.subjects)&&
   ids(proof.subjects)&&proof.gmConfirmed===true,'historický doklad obsahuje neplatnou polohu.');
  for(const subject of proof.subjects)out.set(subject,{location:proof.toLocation,
   minute:ep.endMinute,episodeId:row.id});
 }
 return out;
}
/** Strict departure verification. A subject with an already known location
 * cannot be silently teleported to the departure point, including a parked
 * wagon or an unselected animal from another travel group.
 */
export function confirmTravelPosition93764({journal=[],campaignId,minute,
  memberIds=[],animalIds=[],stableAnimalIds=[],vehicleKey=null,
  fromLocation,toLocation,gmConfirmed=false}={}){
 insist(validId(campaignId)&&Number.isSafeInteger(minute)&&minute>=0,
  'neplatná kampaň nebo minuta odjezdu.');
 insist(gmConfirmed===true,'GM musí před potvrzením epizody výslovně ověřit polohu všech vybraných.');
 const from=place(fromLocation),to=place(toLocation);
 const subjects=travelPositionSubjects93764({memberIds,animalIds,stableAnimalIds,vehicleKey});
 const known=travelPositionAt93764(journal,campaignId,minute);
 for(const subject of subjects){
  const prior=known.get(subject);
  insist(!prior||key(prior.location)===key(from),
   subject+' je naposledy doložen na místě „'+(prior?.location||'')+'“; není na místě odjezdu „'+from+'“. GM musí nejprve doložit jeho skutečné přemístění.');
 }
 return {format:TREK_POSITION_FORMAT_93764,campaignId,minute,fromLocation:from,toLocation:to,
  subjects,memberIds:sorted(memberIds),animalIds:sorted(animalIds),
  stableAnimalIds:sorted(stableAnimalIds),vehicleKey,gmConfirmed:true};
}
/** Validate every post-93.764 witness by rebuilding it from PREVIOUS rows;
 * never from the final campaign state. Legacy rows are intentionally ignored.
 */
export function validateTravelPositions93764(journal=[]){
 const previous=[];
 for(const row of journal){
  const ep=row?.calendarTimeEpisode,proof=ep?.travelPositionProof;
  if(ep?.kind==='travel'&&ep?.settings?.travelFromLocation!==undefined)
   insist(proof!==undefined,'nová cestovní epizoda nemá povinný GM doklad polohy.');
  if(proof!==undefined){
   insist(ep?.kind==='travel'&&proof?.format===TREK_POSITION_FORMAT_93764&&
    ep.startMinute===row.campaignMinute&&proof.minute===ep.startMinute&&
    proof.campaignId===row.calendarCampaignId&&ep.memberIds.length>0,
    'doklad polohy neodpovídá cestovní epizodě.');
   // All newly confirmed wagon/cart journeys, even without patients, must
   // carry an actual Stable vehicle witness. Prevent a fictional cart from
   // quietly relocating subjects in the position ledger.
   if(['cart','wagon'].includes(ep.conveyance))
    insist(ep.transportProof?.vehicle?.format==='hmk-confirmed-passenger-vehicle-93756'&&
     proof.vehicleKey===ep.transportProof.vehicle.vehicleKey,
     'nová cesta károu nebo vozem nemá doložený skutečný vůz a spřežení.');
   const expected=confirmTravelPosition93764({journal:previous,campaignId:row.calendarCampaignId,
    minute:ep.startMinute,memberIds:ep.memberIds,animalIds:ep.settings?.animalIds||[],
    stableAnimalIds:ep.settings?.stableAnimalIds||[],
    vehicleKey:ep.transportProof?.vehicle?.vehicleKey||null,
    fromLocation:proof.fromLocation,toLocation:proof.toLocation,gmConfirmed:proof.gmConfirmed});
   insist(same(proof,expected),'historický doklad polohy či účastníků byl změněn.');
  }
  previous.push(row);
 }
 return true;
}
