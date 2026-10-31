/** Guarded minute-accurate pause on a witnessed encounter.
 * This is NOT a new skill test and does not apply hazards of unknown onset.
 * The part of travel after the first encounter remains uncommitted.
 */
import {episodeLightIntervals} from './hmk-episode-travel-detail.js';
const check=(yes,message)=>{if(!yes)throw Error(message)};
export function truncateEpisodeBeforeEncounter(full,elapsed,event){
 check(full?.kind==='travel'&&Number.isSafeInteger(elapsed)&&elapsed>=1&&elapsed<full.minutes&&
  event?.offset===elapsed&&event.distance?.d4>=1,'Pozastavení vyžaduje čas a skutečný hod vzdálenosti.');
 check(!full.direction&&!full.survivalHazard&&!full.travelForaging?.length&&!full.weatherHazards?.length,
  'Nelze předčasně rozdělit hazard s neznámým okamžikem nebo jiný individuální nález.');
 const elapsedM=full.motion.finalLPW*4000*elapsed/240+full.distanceFractionIn;
 const distanceMeters=Math.floor(elapsedM+1e-10),distanceFractionOut=Math.min(.9999999999,Math.max(0,elapsedM-distanceMeters));
 const actors=full.actors.map(actor=>{
  const units=actor.carryIn+elapsed*actor.rate;
  return {...actor,delta:Math.floor(units/240),carryOut:units%240,weatherFatigueUnits:0};
 });
 const animals=(full.animals||[]).map(animal=>{
  const units=animal.carryIn+elapsed*animal.rate;
  return {...animal,delta:Math.floor(units/240),carryOut:units%240};
 });
 const encounter={...full.encounter,count:1,found:true,resolved:false,stoppedAtMinute:elapsed,
  originallyPlannedMinutes:full.minutes,originalEncounterCount:full.encounter.count,otherPotentialEventsUncommitted:true};
 const interruption={format:'hmk-episode-interruption-v1',kind:'encounter',atMinute:full.startMinute+elapsed,
  offsetMinutes:elapsed,remainingMinutes:full.minutes-elapsed,needsFollowup:true,
  eventIndex:event.i,originalEncounterRoll:full.encounter.d100};
 const daylight=full.daylight?episodeLightIntervals({startMinute:full.startMinute,minutes:elapsed,
  latitudeBand:full.daylight.latitudeBand,season:full.daylight.season,
  sunriseMinute:full.daylight.sunriseMinute,twilightMinutes:full.daylight.twilightMinutes}):null;
 return {...full,minutes:elapsed,endMinute:full.startMinute+elapsed,
  daylight,
  distanceMeters,distanceKilometres:distanceMeters/1000,
  distanceFractionOut,mapCentimetres:Math.round(distanceMeters*100000/full.mapScale)/1000||null,
  actors,animals,encounter,encounterDetails:[{...event,offset:elapsed,pending:false,awaitingFollowup:true}],interruption};
}
