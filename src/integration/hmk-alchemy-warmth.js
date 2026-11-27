/** HMK 273–274. The imbiber's own Warmth needs no proximity proof. Other
 * recipients use current combat coordinates or a same-minute GM witness. */
import {activeAdditionalTemporary} from './hmk-alchemy-imbibing.js?v=94.169';

const check=(condition,message)=>{if(!condition)throw Error('Warmth: '+message);};
const live=actor=>actor&&actor.hmk?.healthState?.shock!=='KIA';
const hasShock=actor=>(actor.hmk?.arcane?.auralShockLevels??0)>0;
const finitePoint=point=>Number.isFinite(point?.x)&&Number.isFinite(point?.y);

export function activeWarmth(journal,campaignId,actorId,minute){
 return activeAdditionalTemporary(journal,campaignId,actorId,minute,'Warmth')
  .filter(source=>source.state.nextDueMinute>minute);
}

export function latestWarmthProximity(journal,campaignId,minute,sourceActorId){
 return journal.findLast(row=>row.calendarCampaignId===campaignId&&row.campaignMinute===minute&&
  row.calendarAlchemyWarmthProximity?.sourceActorId===sourceActorId)?.calendarAlchemyWarmthProximity;
}

export function createWarmthProximity({journal,campaignId,minute,sourceActorId,nearbyIds,gmConfirmed}){
 check(typeof campaignId==='string'&&campaignId&&Number.isSafeInteger(minute)&&minute>=0&&minute<=1e9&&
  typeof sourceActorId==='string'&&sourceActorId&&gmConfirmed===true,
  'GM musí potvrdit aktuální kampaň, minutu a příjemce dávky.');
 check(Array.isArray(nearbyIds)&&new Set(nearbyIds).size===nearbyIds.length&&
  nearbyIds.every(id=>typeof id==='string'&&id&&id!==sourceActorId),
  'Zadejte jednoznačný seznam ostatních tvorů do 5 stop.');
 const sourceUseIds=activeWarmth(journal,campaignId,sourceActorId,minute).map(source=>source.useId);
 check(sourceUseIds.length,'Příjemce nemá účinnou dávku Warmth.');
 return {campaignId,minute,sourceActorId,sourceUseIds,nearbyIds:[...nearbyIds].sort(),gmConfirmed:true,sourcePage:274};
}

export function warmthProtection({journal,campaignId,minute,actorId,characters,memberIds,spatialUnits=null}){
 const actor=characters.find(item=>item.id===actorId);
 if(!live(actor)||!memberIds.includes(actorId))return {av:0,advanceBonus:0,sources:[]};
 const units=spatialUnits&&new Map(spatialUnits.map(unit=>[unit.id,unit]));
 const sources=[];
 let av=0;
 const emitters=new Set(journal.flatMap(row=>row.calendarCampaignId===campaignId&&row.campaignMinute<=minute&&
  row.calendarAlchemyImbibing?.elixirName==='Warmth'?[row.calendarAlchemyImbibing.targetId]:[]));
 for(const sourceActorId of emitters){
  const emitter=characters.find(item=>item.id===sourceActorId),own=actorId===sourceActorId;
  if(!live(emitter)||!memberIds.includes(sourceActorId)||hasShock(emitter))continue;
  const doses=activeWarmth(journal,campaignId,sourceActorId,minute);
  if(!doses.length)continue;
  const proximity=!own&&!units?latestWarmthProximity(journal,campaignId,minute,sourceActorId):null;
  if(!own){
   if(units){
    const from=units.get(sourceActorId),to=units.get(actorId);
    if(!finitePoint(from)||!finitePoint(to)||Math.hypot(from.x-to.x,from.y-to.y)>5)continue;
   }else if(!proximity?.nearbyIds.includes(actorId))continue;
  }
  for(const dose of doses){
   if(proximity&&!proximity.sourceUseIds.includes(dose.useId))continue;
   sources.push({useId:dose.useId,sourceActorId,as:dose.state.currentAS});
   av=Math.max(av,own?2:1);
  }
 }
 return {av,advanceBonus:av*5,sources};
}

export function validateWarmthProximityJournal(journal){
 for(const [index,row] of journal.entries()){
  const proof=row.calendarAlchemyWarmthProximity;
  if(!proof)continue;
  check(row.calendarCampaignId===proof.campaignId&&row.campaignMinute===proof.minute&&
   row.characterId===proof.sourceActorId,'Doklad dosahu patří do jiné kampaně, minuty nebo postavy.');
  const expected=createWarmthProximity({...proof,journal:journal.slice(0,index)});
  check(JSON.stringify(expected)===JSON.stringify(proof),'Historický doklad dosahu byl změněn.');
 }
}

export function assertWarmthProximityAppendOnly(before,after){
 const rows=new Map(after.map(row=>[row.id,row]));
 for(const old of before)if(old.calendarAlchemyWarmthProximity)
  check(JSON.stringify(rows.get(old.id))===JSON.stringify(old),'Potvrzený dosah nelze změnit ani odstranit.');
}
