'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),previous=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)
 ?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):previous(m,f);
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const {releaseCalendarMembers93765}=require('../src/integration/hmk-calendar-member-release-93765.js');
const {lastTimeEpisodeCarry,lastTimeEpisodeDistanceFraction,lastEquipmentSlowCarry,independentTravelDelayCarry,lastEpisodeBefore,lastForagingCarry,calculateTimeEpisode,validateTimeEpisodes}=require('../src/integration/hmk-time-episodes.js');
let n=0;function eq(a,b,msg){n++;assert.deepStrictEqual(a,b,msg);}
const campaignId='audit-carry-766', actorId='returning-npc', otherId='continuing-pc';
const traveller=(id,name)=>({id,name,kind:id===actorId?'NPC':'PC',hmk:{healthState:initialCombatState(),injuries:[]}});
const data={characters:[traveller(actorId,'Returning NPC'),traveller(otherId,'Continuing PC')],journal:[
 {id:'old-time',characterId:actorId,calendarCampaignId:campaignId,campaignMinute:100,calendarTimeEpisode:{kind:'travel',startMinute:100,endMinute:113,minutes:13,memberIds:[actorId,otherId],actors:[{id:actorId,carryOut:179},{id:otherId,carryOut:80}],distanceFractionOut:0.75,equipmentSlowCarryOut:20,hazardDetails:[{hazard:'complication',automationVersion:'v93.681',result:'long-delay'}],travelDelay:{future:100},travelForaging:[{target:'food-water',herbName:null,carryOut:{foodDays:0.5,waterDays:0,herbDoses:0}}]}}
],campaignClock:{campaignId,minute:120,characterIds:[actorId,otherId]},inventory:[]};
eq(lastTimeEpisodeCarry(data.journal,campaignId,actorId),179,'confirmed old fractional fatigue before release');
eq(lastTimeEpisodeCarry(data.journal,campaignId,otherId),80,'other member existing remainder');
const snapshot=JSON.stringify(data.journal[0]);
const event=releaseCalendarMembers93765(data,[actorId],{campaignId,minute:120,idFactory:()=> 'release-npc',stamp:()=> 'GM-approved',gmConfirmed:true});
eq(event.length,1,'one GM exit receipt');
eq(data.characters[0].hmk.healthState.fatigue.weariness,0,'NPC leaves healthy');
eq(JSON.stringify(data.journal[0]),snapshot,'prior travel remains immutable');
// Returning to the calendar does not restore old injuries, nor the fractional
// weariness stored by the OLD confirmed trip; the other traveller retains it.
data.campaignClock.characterIds.push(actorId); // isolated GM returning membership
// Explicitly check the old trip against its own historical cutoff.
eq(lastTimeEpisodeCarry(data.journal.slice(0,1),campaignId,actorId),179,'historical replay before exit');
eq(lastTimeEpisodeCarry(data.journal,campaignId,actorId),0,'released NPC must never inherit pre-exit fractional fatigue');
eq(lastTimeEpisodeCarry(data.journal,campaignId,otherId),80,'continuing PC must retain fractional fatigue');
eq(lastTimeEpisodeDistanceFraction(data.journal,campaignId,140,[actorId]),0,'returning NPC starts a new distance fraction');
eq(lastTimeEpisodeDistanceFraction(data.journal,campaignId,140,[otherId]),0.75,'other active PC retains distance fraction');
eq(lastEquipmentSlowCarry(data.journal,campaignId,140,[actorId]),0,'no old Equipment Slow after exit');
eq(lastEquipmentSlowCarry(data.journal,campaignId,140,[otherId]),20,'other PC retains Equipment Slow');
eq(independentTravelDelayCarry(data.journal,campaignId,140,[actorId]),0,'no ancient Complication after exit');
eq(independentTravelDelayCarry(data.journal,campaignId,140,[otherId]),100,'other PC retains independent Complication');
eq(lastEpisodeBefore(data.journal,campaignId,140,[actorId]),null,'no stale navigation or old skill reuse after exit');
eq(lastEpisodeBefore(data.journal,campaignId,140,[otherId]).id,'old-time','other PC keeps prior navigation context');
eq(lastForagingCarry(data.journal,campaignId,actorId,'food-water'),{foodDays:0,waterDays:0,herbDoses:0},'abandoned partial Foraging is not stored food');
eq(lastTimeEpisodeDistanceFraction(data.journal.slice(0,1),campaignId,140,[actorId]),0.75,'historical distance still intact');
eq(lastEquipmentSlowCarry(data.journal.slice(0,1),campaignId,140,[actorId]),20,'historical Slow unchanged');

// A later genuine GM-confirmed episode supersedes the release boundary.
data.journal.push({id:'new-time',calendarCampaignId:campaignId,campaignMinute:140,calendarTimeEpisode:{kind:'travel',startMinute:140,endMinute:141,minutes:1,memberIds:[actorId],actors:[{id:actorId,carryOut:3}]}});
eq(lastTimeEpisodeCarry(data.journal,campaignId,actorId),3,'after return, only new travel fatigue may carry');
// Two campaigns cannot share the same medical remainder.
eq(lastTimeEpisodeCarry(data.journal,'independent-campaign',actorId),0,'other campaign isolated');
// Replay a pair of full production time-episode receipts separated by
// offboarding. The second actor carries 0 after the exit, not the prior 65/240.
function journey(minute,minutes,carry){
 const episode=calculateTimeEpisode({minute,minutes,kind:'travel',topography:'flat',terrain:'paved-road',conveyance:'foot',
   memberIds:[actorId],enduranceByActor:{[actorId]:12},endRollByActor:{[actorId]:10},
   previousCarry:{[actorId]:carry},encByActor:{[actorId]:0},progress:0,bearing:0,
   progressD10:[],directionD10:[]});
 return {...episode,minuteCarryRule:'fixed-point-240-v93.684',travelPartyScope:'v93.763'};
}
const first=journey(100,13,0),second=journey(140,1,0);
const witnessed=[{id:'real-first',calendarCampaignId:campaignId,campaignMinute:100,calendarTimeEpisode:first},
  data.journal.find(j=>j.calendarMemberRelease),
  {id:'real-next',calendarCampaignId:campaignId,campaignMinute:140,calendarTimeEpisode:second}];
eq(validateTimeEpisodes(witnessed),true,'new post-release time episode validated without prior weariness');
const malformed=structuredClone(witnessed);malformed[2].calendarTimeEpisode.actors[0].carryIn=65;
assert.throws(()=>validateTimeEpisodes(malformed),/zbytek|únavy/);n++;
// A second old-style receipt with no release boundary must keep the carry.
const withoutExit=[witnessed[0],witnessed[2]];
assert.throws(()=>validateTimeEpisodes(withoutExit),/zbytek|únavy/);n++;
console.log('PASS',n,'released NPC resets historic fractional fatigue without changing other characters or historical receipts');
