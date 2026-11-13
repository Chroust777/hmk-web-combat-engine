/** HMK v1.2 p.148: the random victim of a Survival Accident can be any
 * actual participant in that travel interval, including a pack/draft animal.
 * Canonical animal Health actors are kind NPC with verifiedMountedBreed (not kind Animal).
 * A Stable animal is not a fabricated Character/Combat State. Do not silently
 * omit it from the lottery if its live injury profile has not been registered.
 * This module is READ ONLY: no rolling, registration, clock change or write.
 */
import {verifiedMountedAnimalAnatomy} from './hmk-mounted-live-animal-falling.js';
const unique=(values=[])=>[...new Set(values.filter(x=>typeof x==='string'&&x.length>0))];
export function survivalAccidentVictimPool93846({memberIds=[],stableAnimalIds=[],legacyAnimalIds=[],characters=[],activeIds=[]}={}){
 const people=unique(memberIds),animals=unique([...stableAnimalIds,...legacyAnimalIds]);
 const allIds=unique([...people,...animals]);
 const byId=new Map(characters.map(c=>[c.id,c]));
 const active=new Set(activeIds);
 const missingPeople=people.filter(id=>!byId.get(id)||byId.get(id).archived||!active.has(id));
 const missingAnimals=animals.filter(id=>{
  const c=byId.get(id);
  return !c||c.archived||!active.has(id)||!c.hmk?.verifiedMountedBreed||!c.hmk?.healthState;
 });
 const unsupportedAnimals=animals.filter(id=>!missingAnimals.includes(id)&&
  !verifiedMountedAnimalAnatomy(byId.get(id)?.hmk?.verifiedMountedBreed));
 const eligible=allIds.filter(id=>{
  const c=byId.get(id);
  return c&&!c.archived&&active.has(id)&&(!animals.includes(id)||
   (!!c.hmk?.verifiedMountedBreed&&!!c.hmk?.healthState&&
    !!verifiedMountedAnimalAnatomy(c.hmk.verifiedMountedBreed)));
 }).map(id=>byId.get(id));
 return {ok:!!allIds.length&&!missingPeople.length&&!missingAnimals.length&&!unsupportedAnimals.length,
  expectedIds:allIds,eligible,missingPeople,missingAnimals,unsupportedAnimals};
}
