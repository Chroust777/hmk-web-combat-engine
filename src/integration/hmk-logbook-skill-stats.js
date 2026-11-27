import {historyBelongsToCharacter} from './hmk-opposed-history-555.js';
import {successValueTier} from './hmk-skill-test-engine.js';

export const SKILL_CHECK_LEVELS=['S','CS','F','CF'];
const VALUE_TESTS=new Set(['success-value-test','success-value-specific','secondary-mastery-value-test','skill-value-result']);
const SUCCESS_TESTS=new Set(['success-test','secondary-mastery-test','opposed-success-test','assistance-success-test']);

export function journalSkillCheck(entry,actorId){
 const proof=entry.skillTestProof;
 if(!proof||(!SUCCESS_TESTS.has(proof.type)&&!VALUE_TESTS.has(proof.type))||
    !historyBelongsToCharacter(entry,actorId))return null;
 const opponent=proof.opponentId===actorId&&proof.actorId!==actorId;
 const result=opponent?proof.b:proof.a??proof.primaryResult??proof.result;
 const roll=result?.roll??result?.d100;
 const name=proof.skills?.[opponent?1:0]??(opponent?proof.skillB:proof.skill??proof.primarySkill);
 if(typeof name!=='string'||!name.trim()||!SKILL_CHECK_LEVELS.includes(result?.level)||
    !Number.isInteger(roll)||roll<1||roll>100)return null;
 const sv=VALUE_TESTS.has(proof.type)&&Number.isSafeInteger(result.sv)?result.sv:null;
 const storedStars=result.svTier?.stars;
 const stars=sv===null?null:Number.isSafeInteger(storedStars)&&storedStars>=0?storedStars:successValueTier(sv).stars;
 return {entry,name:name.trim(),result:{...result,roll},sv,stars,travel:false};
}

function travelEndChecks(entry,actorId){
 const episode=entry.calendarTimeEpisode;
 const actor=episode?.actors?.find(a=>a.id===actorId);
 const expedition=entry.calendarExpeditionProof;
 const rolls=actor&&!actor.endNotRequired?
  actor.hourlyEndSR??(actor.sr?[{...actor.sr,roll:actor.sr.roll??actor.roll}]:[]):
  entry.characterId===actorId&&expedition?.kind==='travel'?expedition.endSR??[]:[];
 return rolls.flatMap((sr,index)=>{
  if(!Number.isInteger(sr.roll)||sr.roll<1||sr.roll>10||typeof sr.success!=='boolean')return [];
  const moment=episode?{...entry,campaignMinute:episode.endMinute}:entry;
  return [{entry:moment,name:'Endurance',result:{roll:sr.roll,eml:sr.tn,level:sr.success?'S':'F'},
   sv:null,stars:null,travel:true,die:'d10',episodeRoll:!!episode,order:index}];
 });
}

export function characterLogbookSkillChecks(journal,actorId){
 const travelIds=new Set();
 const checks=[];
 for(const entry of journal){
  const episode=entry.calendarTimeEpisode;
  if(episode){
   for(const link of episode.skillLinks??[])travelIds.add(link.id);
   for(const memory of [episode.orientation,episode.trackingMemory])travelIds.add(memory?.skillId);
   for(const hazard of episode.hazardDetails??(episode.hazardDetail?[episode.hazardDetail]:[])){
    for(const id of [hazard.repairProofId,hazard.complicationProofId,hazard.directionProofId,...(hazard.complicationProofIds??[])])
     travelIds.add(id);
   }
  }
  const check=journalSkillCheck(entry,actorId);
  if(check)checks.push(check);
  checks.push(...travelEndChecks(entry,actorId));
 }
 for(const check of checks){
  const {entry}=check;
  check.travel||=travelIds.has(entry.id)||Boolean(entry.calendarEpisodeSkillLink||entry.calendarTrekSkillSource||
   entry.calendarTrekTrackingAwarenessProof);
 }
 return checks;
}

export function summarizeLogbookSkillChecks(checks){
 const bySkill=new Map();
 for(const {name,result,stars} of checks){
  if(!bySkill.has(name))bySkill.set(name,{name,S:0,CS:0,F:0,CF:0,starsTotal:0,starsByCount:new Map()});
  const skill=bySkill.get(name);
  skill[result.level]++;
  if(stars!==null){
   skill.starsTotal+=stars;
   skill.starsByCount.set(stars,(skill.starsByCount.get(stars)??0)+1);
  }
 }
 return [...bySkill.values()].sort((a,b)=>a.name.localeCompare(b.name,'cs'));
}
