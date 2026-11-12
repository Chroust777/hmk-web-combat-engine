/** HMK v1.2 printed pp.141–150. Deterministic rule regressions (no synthetic stored journal / no random dice). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {trekMovementTableRow,trekBearingRequirement,trekAvailableTerrain} from '../src/integration/hmk-trekking-routine.js';
import {trekWatchfulness,trekSurpriseProcedure} from '../src/integration/hmk-trekking-wilderness-tasks.js';
import {calculateTimeEpisode,computeEpisodeOrientation,episodeMovementContext} from '../src/integration/hmk-time-episodes.js';
const rows=[];let pass=0;
function test(label,fn){try{const got=fn();rows.push({label,status:'PASS',details:got??null});pass++;}catch(e){rows.push({label,status:'FAIL',reason:e.message});}}
function travel(terrain,opts={}){return calculateTimeEpisode({minute:480,minutes:60,kind:'travel',topography:'flat',terrain,
 conveyance:'foot',bearing:terrain==='dunes'?2:terrain==='desert-flats'?2:0,memberIds:['a'],
 enduranceByActor:{a:12},endRollByActor:{a:5},encByActor:{a:0},progressD10:[],...opts});}
for(const [i,rate] of ['foot','mount','cart','wagon'].entries())test('desert-flats equals Flat Rural Track '+rate,()=>{
 const flats=trekMovementTableRow({topography:'flat',terrain:'desert-flats'});
 const track=trekMovementTableRow({topography:'flat',terrain:'rural-track'});
 assert.equal(flats[rate],track[rate]);return flats[rate];
});
for(const rainy of [false,true])for(const terrain of ['paved-road','unpaved-road','desert-flats','rural-track','wilderness-trail'])test(`Bearing ${terrain}, rain=${rainy}`,()=>{
 const actual=trekBearingRequirement({topography:'flat',terrain,continuousPrecipitation:rainy}).requiredBearing;
 const expected=['paved-road','unpaved-road'].includes(terrain)?0:terrain==='desert-flats'?2:rainy?1:0;
 assert.equal(actual,expected);return actual;
});
test('desert flats unavailable in rough',()=>assert.equal(trekAvailableTerrain('rough').includes('desert-flats'),false));
test('desert flats unavailable in mountain',()=>assert.equal(trekAvailableTerrain('mountain').includes('desert-flats'),false));
test('dunes Slow is not an extra Progress d10',()=>{
 const r=travel('dunes',{progress:1,dunesSlow:true});assert.equal(r.slow,1);assert.equal(r.motion.spareProgress,0);return {slow:r.slow,spare:r.motion.spareProgress};
});
test('dunes Slow consumes a would-be Progress die',()=>assert.throws(()=>travel('dunes',{progress:1,dunesSlow:true,progressD10:[1]}),/Progress/));
test('dunes Slow forbidden on paved road',()=>assert.throws(()=>travel('paved-road',{dunesSlow:true}),/Dunes Slow/));
test('dunes Slow forbidden on desert flats',()=>assert.throws(()=>travel('desert-flats',{dunesSlow:true}),/Dunes Slow/));
test('dunes Slow forbidden when mounted',()=>assert.throws(()=>travel('dunes',{conveyance:'mount',dunesSlow:true}),/Dunes Slow/));
test('dunes without Slow applies +5 fatigue',()=>{
 const normal=travel('dunes',{dunesSlow:false}),slow=travel('dunes',{dunesSlow:true});
 const n=normal.actors[0],s=slow.actors[0];assert.ok(JSON.stringify(n).includes('5'));return {normal:n,slow:s};
});
test('free GM Progress requires its own real d10 if no Slow',()=>{
 assert.throws(()=>travel('paved-road',{progress:1}),/Progress/);return true;
});
test('free GM Progress can cancel real Slow without extra d10',()=>{
 const r=travel('dunes',{progress:1,dunesSlow:true});assert.equal(r.motion.spareProgress,0);return r.motion.finalLPW;
});
test('Watchfulness foot with no animals unchanged',()=>{
 const r=trekWatchfulness({modes:{vigilance:1},conveyance:'foot',drovingAnimals:false});assert.equal(r.effective,'alert');return r;
});
test('Watchfulness foot with pack animal demoted alert to normal',()=>{
 const r=trekWatchfulness({modes:{vigilance:1},conveyance:'foot',drovingAnimals:true});assert.equal(r.effective,'normal');return r;
});
test('Watchfulness foot with pack animal demoted normal to lax',()=>{
 const r=trekWatchfulness({modes:{},conveyance:'foot',drovingAnimals:true});assert.equal(r.effective,'lax');return r;
});
test('Watchfulness foot pack applies to actual Surprise procedure',()=>{
 const alert=trekWatchfulness({modes:{vigilance:1},conveyance:'foot',drovingAnimals:false});
 const less=trekWatchfulness({modes:{vigilance:1},conveyance:'foot',drovingAnimals:true});
 const a=trekSurpriseProcedure({party:alert,foe:'lax'}),b=trekSurpriseProcedure({party:less,foe:'lax'});
 assert.equal(a.kind,'automatic');assert.equal(b.kind,'unopposed');return {without:a.kind,with:b.kind};
});
const ctx=episodeMovementContext({guideId:'a',memberIds:['a','b'],area:'Test',topography:'flat',terrain:'paved-road',conveyance:'foot',weatherSourceId:'weather',minute:480,nightOverride:false});
const survival={skillId:'survival-a',guideId:'a',skill:'Survival',sv:7,level:'S',roll:35};
const drover={skillId:'craft-b',guideId:'b',skill:'Animalcraft',sv:3,level:'F',roll:90};
test('non-guide Drover applied to Orienteering',()=>{
 const result=computeEpisodeOrientation({mode:'new',currentSkill:survival,context:ctx,animalsPresent:true,
 droverSkill:drover,droverActorId:'b',requiredDroverSkill:'Animalcraft',requiredBearing:0});
 assert.equal(result.droverActorId,'b');assert.equal(result.droverLevel,'F');assert.equal(result.adjustment.droverPenalty,-1);
 return {actor:result.droverActorId,penalty:result.adjustment.droverPenalty};
});
test('wrong Drover skill rejected',()=>assert.throws(()=>computeEpisodeOrientation({mode:'new',currentSkill:survival,context:ctx,animalsPresent:true,
 droverSkill:{...drover,skill:'Riding'},droverActorId:'b',requiredDroverSkill:'Animalcraft',requiredBearing:0}),/Animalcraft/));
test('wrong Drover actor rejected',()=>assert.throws(()=>computeEpisodeOrientation({mode:'new',currentSkill:survival,context:ctx,animalsPresent:true,
 droverSkill:{...drover,guideId:'a'},droverActorId:'b',requiredDroverSkill:'Animalcraft',requiredBearing:0}),/Animalcraft/));
test('no Drover proof rejected',()=>assert.throws(()=>computeEpisodeOrientation({mode:'new',currentSkill:survival,context:ctx,animalsPresent:true,
 droverActorId:'b',requiredDroverSkill:'Animalcraft',requiredBearing:0}),/Animalcraft/));
const report={version:'93.851',authority:'HMK v1.2 printed pp.141–150',passed:pass,total:rows.length,failed:rows.filter(x=>x.status==='FAIL'),rows};
fs.mkdirSync('./tools/evidence_93851',{recursive:true});fs.writeFileSync('./tools/evidence_93851/RULE_REGRESSION.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({total:report.total,passed:pass,failed:report.failed},null,2));
if(report.failed.length)process.exitCode=1;
