/** HMK printed p.147–148; v93.904 Tracking CF mandatory free Bearing.
 * Only genuine mathematical inputs; no pretense of live browser clicking. */
import assert from 'node:assert/strict';
import {episodeTrackingFollowup} from '../src/integration/hmk-episode-travel-detail.js';
import {calculateTimeEpisode,computeEpisodeOrientation,computeEpisodeTracking,episodeTrackingAwareness,episodeMovementContext,
 EPISODE_TRACKING_BEARING_POLICY_93904 as POLICY} from '../src/integration/hmk-time-episodes.js';
import {trekMovement,trekHazards} from '../src/integration/hmk-trekking-routine.js';
import {trackingModifiers,trackingOutcome} from '../src/integration/hmk-trekking-wilderness-tasks.js';
let n=0;
const test=(label,fn)=>{try{fn();++n;}catch(e){e.message=label+': '+e.message;throw e;}};
const base={minute:480,minutes:60,kind:'travel',topography:'flat',terrain:'paved-road',
 conveyance:'foot',memberIds:['guide'],enduranceByActor:{guide:12},endRollByActor:{guide:5},encByActor:{guide:0}};
const context=({terrain})=>episodeMovementContext({guideId:'guide',memberIds:['guide'],area:'forest',topography:'flat',terrain,
 conveyance:'foot',weatherSourceId:'day',minute:480,nightOverride:false});
function orientation(terrain,sv,required,forced=1,manual=null){return computeEpisodeOrientation({
 mode:'new',currentSkill:{skillId:'real-survival',guideId:'guide',skill:'Survival',sv,level:'S',roll:41},
 context:context({terrain}),requiredBearing:required,forcedTrackingBearing:forced,
 allocationMode:manual?'manual':'auto',manualModes:manual});}
function travel(terrain,bearing,rolls=[],policy=POLICY,forced=1){return calculateTimeEpisode({...base,terrain,
 bearing,forcedBearing:forced,trackingBearingPolicy:policy,directionD10:rolls});}
for(const sv of [-1,0,1,2,3,4,5,6,7,8,9,10]){
 test('free Bearing independent of Survival stars for SV='+sv,()=>{
  const o=orientation('paved-road',sv,0);
  assert.equal(o.modes.bearing,1);assert.equal(o.modes.trackingForcedBearingSourceId,'minute-episode-tracking-cf-v93.904');
  assert.equal(o.stars,sv>=5?Math.min(5,sv-4):0);
 });
}
test('CF does not create paved-road Direction Hazard',()=>{
 const e=travel('paved-road',1);assert.equal(e.direction,null);assert.equal(e.motion.bearingDeficit,0);
 assert.equal(e.trackingBearingPolicy,POLICY);});
test('original old receipts keep legacy forced hazard for immutable replay',()=>{
 const e=travel('paved-road',0,[8],null);assert.equal(e.direction.direction,'misdirection');
 assert.equal(Object.hasOwn(e,'trackingBearingPolicy'),false);});
test('one terrain dot covered by single free bearing despite SV0',()=>{
 const o=orientation('mixed-woodland',0,1);assert.equal(o.modes.bearing,1);
 const e=travel('mixed-woodland',o.modes.bearing);assert.equal(e.direction,null);});
test('two terrain dots need only one paid mode in addition to free one',()=>{
 const o=orientation('dunes',5,2);assert.equal(o.stars,1);assert.equal(o.modes.bearing,2);
 const e=travel('dunes',o.modes.bearing);assert.equal(e.direction,null);});
test('two dots, no stars: true remaining deficit still rolls exactly one d10',()=>{
 const o=orientation('dunes',3,2);assert.equal(o.modes.bearing,1);
 const e=travel('dunes',o.modes.bearing,[10]);assert.equal(e.direction.direction,'lost');
 assert.equal(e.direction.rolls.length,1);});
test('two dots, no stars: falsely rolling twice is rejected',()=>{
 assert.throws(()=>travel('dunes',1,[3,7]),/Chybí 1 platný/);});
test('paved with CF rejects a fabricated extra direction die',()=>{
 assert.throws(()=>travel('paved-road',1,[10]),/Chybí 0 platný/);});
test('mandatory free bearing cannot be missing in new episode',()=>{
 assert.throws(()=>travel('paved-road',0),/bezplatný Bearing/);});
test('manual zero-stars can retain one mandatory free bearing',()=>{
 const o=orientation('paved-road',3,0,1,{bearing:1,progress:0,foraging:0,stalking:0,vigilance:0});
 assert.equal(o.stars,0);assert.equal(o.modes.bearing,1);});
test('manual free bearing does not allow 2 borrowed modes with no stars',()=>{
 assert.throws(()=>orientation('paved-road',3,0,1,{bearing:2,progress:0,foraging:0,stalking:0,vigilance:0}),/dovoluje 0/);});
test('real CF condition yields next Bearing and positive SV still caps at five stars',()=>{
 assert.equal(trackingOutcome(7,{criticalFailure:true}).nextWatchBearingOnCF,true);
 assert.equal(trackingOutcome(16,{criticalFailure:true}).spoorStars,5);
 assert.equal(trackingModifiers({continuousSnow:true,night:true}).delta,1);});
test('Direction Hazard highest of multiple genuine rolls',()=>{
 const r=trekHazards({bearingDeficit:2,directionD10:[3,9]});assert.equal(r.direction,'misdirection');});
test('Survival CF separate from Tracking CF and its own hazard d10',()=>{
 const r=trekHazards({bearingDeficit:0,directionD10:[],survivalCriticalFailure:true,survivalD10:6});
 assert.equal(r.survival,'accident');assert.equal(r.direction,null);});
test('movement rates not changed by free bearing',()=>{
 const a=trekMovement({topography:'flat',terrain:'paved-road',bearing:0,progressD10:[]});
 const b=trekMovement({topography:'flat',terrain:'paved-road',bearing:1,progressD10:[]});
 assert.equal(a.finalLPW,b.finalLPW);});
test('manual Orienteering carries only paid Bearing and includes any new free Bearing',()=>{
 const terrain='paved-road';
 for(const [priorFree,nextFree,paid] of [[1,0,0],[1,0,1],[0,1,1],[1,1,1]]){
  const first=orientation(terrain,4+paid,0,priorFree,{bearing:paid+priorFree,progress:0,foraging:0,stalking:0,vigilance:0});
  const previous={id:'prior',calendarTimeEpisode:{kind:'travel',endMinute:510,orientation:first}};
  const next=computeEpisodeOrientation({mode:'reuse',previous,minute:510,context:context({terrain}),forcedTrackingBearing:nextFree});
  assert.equal(next.modes.bearing,paid+nextFree);
  assert.equal(next.stars,paid);
 }
});
test('same trail carries verified Awareness and its single Spoor',()=>{
 const movement=context({terrain:'wilderness-trail'});
 const first=computeEpisodeTracking({mode:'new',currentSkill:{skillId:'tracking',skill:'Tracking',
  guideId:'guide',sv:4,level:'CS'},minute:480,context:movement,trail:'Wolf'});
 const witness={id:'observation',characterId:'guide',calendarCampaignId:'qa',campaignMinute:480,
  skillTestProof:{type:'secondary-mastery-test',skills:['Awareness'],a:{level:'S',roll:11}}};
 const current=episodeTrackingAwareness({journal:[witness],campaignId:'qa',minute:480,memo:first,skillId:witness.id});
 assert.equal(current?.level,'S');
 const initial=episodeTrackingFollowup({adjustedSV:4,awarenessLevel:current.level});
 assert.deepEqual([initial.spoorStars,initial.trailCapacity,initial.hasOneSpoor],[1,1,true]);
 assert.equal(episodeTrackingFollowup({adjustedSV:4,awarenessLevel:'CS',spoorSpent:1}).trailCapacity,0);
 assert.equal(episodeTrackingFollowup({adjustedSV:4,awarenessLevel:'F'}).spoorStars,0);
 const previous={id:'prior',calendarCampaignId:'qa',calendarTimeEpisode:{kind:'tracking',startMinute:480,endMinute:510,
  trackingMemory:first,trackingFollowup:{...initial,awarenessSkillId:witness.id}}};
 const next=computeEpisodeTracking({mode:'reuse',previous,minute:510,context:movement,trail:'Wolf'});
 const resume={journal:[witness,previous],campaignId:'qa',minute:510,memo:next};
 assert.deepEqual(episodeTrackingAwareness(resume),current);
 assert.deepEqual(episodeTrackingAwareness({...resume,skillId:witness.id}),current);
 assert.equal(episodeTrackingAwareness({...resume,campaignId:'other'}),null);
 assert.equal(episodeTrackingAwareness({...resume,minute:511}),null);
 assert.equal(episodeTrackingAwareness({...resume,memo:{...next,trail:'Fox'}}),null);
 const oldObservation={...previous,calendarTimeEpisode:{...previous.calendarTimeEpisode,
  trackingFollowup:{...previous.calendarTimeEpisode.trackingFollowup,spoorStars:0,trailCapacity:0}}};
 assert.deepEqual(episodeTrackingAwareness({...resume,journal:[witness,oldObservation]}),current);
 const currentWitness={...witness,id:'old-repeat',campaignMinute:510};
 assert.equal(episodeTrackingAwareness({...resume,journal:[witness,previous,currentWitness],
  skillId:currentWitness.id})?.skillId,currentWitness.id);
});
test('successful Tracking reuse keeps the same Spoor under unchanged conditions',()=>{
 const movement=context({terrain:'wilderness-trail'});
 const first=computeEpisodeTracking({mode:'new',currentSkill:{skillId:'roll',skill:'Tracking',guideId:'guide',sv:7,level:'S'},
  minute:480,context:movement,trail:'Wolf'});
 assert.equal(first.score.spoorStars,3);
 const previous={id:'prior',calendarTimeEpisode:{kind:'tracking',endMinute:510,trackingMemory:first}};
 const continuation={mode:'reuse',previous,minute:510,context:movement,trail:'Wolf'};
 const next=computeEpisodeTracking(continuation);
 assert.deepEqual(next.score,first.score);
 assert.equal(next.skillId,first.skillId);
 assert.throws(()=>computeEpisodeTracking({...continuation,trail:'Fox'}),/téže stopy/);
 assert.throws(()=>computeEpisodeTracking({...continuation,minute:511}),/téže stopy/);
 assert.throws(()=>computeEpisodeTracking({...continuation,conditions:{...first.conditions,continuousRain:true}}),/změně prostředí/);
});
console.log('PASS HMK p147–148 Tracking CF free Bearing / v93.904',n,'assertion groups');
