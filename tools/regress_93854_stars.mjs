/** HMK 1.2 pp.145–148: isolated deterministic calculation fixtures only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createOrienteeringContext,adjustedOrienteeringSV,assertOrienteeringModes} from '../src/integration/hmk-trekking-orienteering.js';
import {allocateTrekModes} from '../src/integration/hmk-trekking-correction.js';
import {computeEpisodeOrientation,episodeMovementContext} from '../src/integration/hmk-time-episodes.js';
let checks=0,errors=[];const examples=[];
function run(title,fn){try{fn();checks++}catch(e){errors.push({title,error:String(e.message)})}}
for(const baseSV of [-3,0,1,2,3,4,5,6,7,8,9,10,12])
 for(const partySize of [1,9,10,19,20])
 for(const night of [false,true])
 for(const familiar of [false,true])
 for(const stationaryForaging of [false,true])
 for(const failDrover of [false,true]){
 const ctx=createOrienteeringContext({partySize,night,familiar,stationaryForaging,
  conveyance:'mount',droverId:'a',animalsPresent:true,
  torchlight:night&&true,fullMoon:night&&true,afterSnowfall:false});
 run(`SV=${baseSV},party=${partySize},night=${night},familiar=${familiar},stationary=${stationaryForaging},droverFail=${failDrover}`,()=>{
  const r=adjustedOrienteeringSV({baseSV,context:ctx,droverResult:{level:failDrover?'F':'S'}});
  const expected=baseSV+(night?-1:0)-Math.floor(partySize/10)+(familiar?1:0)+(stationaryForaging?2:0)-(failDrover?1:0);
  assert.equal(r.adjustedSV,expected);
  assert.equal(r.advantageModes,Math.max(0,Math.min(5,expected-4)));
 });
}
// Mathematical modes matrix: all goals, all achievable Bearing obligations (terrain 0..2,
// Tracking CF +1, Lost recovery +1), and SV tiers, including underfunded Bearing/Hazard.
for(const sv of [-5,-1,0,1,2,3,4,5,6,7,8,9,13])
 for(const requiredBearing of [0,1,2,3,4])
 for(const priority of ['pace','forage','stealth','vigilance']){
 const adjustment={adjustedSV:sv,advantageModes:Math.max(0,Math.min(5,sv-4)),stationaryForaging:false};
 run(`AUTO SV=${sv} bearing=${requiredBearing} priority=${priority}`,()=>{
  const m=allocateTrekModes({autoAllocate:true,autoPriority:priority,slow:0,orienteeringSlow:0,foraging:0,stalking:0,vigilance:0,trackingForcedBearingSourceId:null},adjustment,{requiredBearing});
  const rule=assertOrienteeringModes({adjustment,modes:m});
  assert.ok(m.bearing<=adjustment.advantageModes);
  assert.equal(m.bearing,Math.min(requiredBearing,adjustment.advantageModes));
  assert.ok(rule.spent<=rule.available);
  if(sv>=5&&requiredBearing>=3)examples.push({sv,requiredBearing,priority,modes:{bearing:m.bearing,progress:m.progress,foraging:m.foraging,stalking:m.stalking,vigilance:m.vigilance}});
 });
}
const context=episodeMovementContext({guideId:'guide',memberIds:['guide'],area:'Fixture',topography:'flat',terrain:'dunes',conveyance:'foot',weatherSourceId:'wx',minute:480,nightOverride:false});
for(const adjustedSV of [-1,0,1,2,3,4,5,6,7,8,9,12]){
 const skill={skillId:'fixture-survival',guideId:'guide',skill:'Survival',sv:adjustedSV,level:'S',roll:30};
 for(const requiredBearing of [0,1,2,3,4]){
 run(`END-TO-END PURE automatic SV=${adjustedSV} bearing=${requiredBearing}`,()=>{
  const r=computeEpisodeOrientation({mode:'new',context,currentSkill:skill,allocationMode:'auto',requiredBearing,priority:'pace'});
  assert.equal(r.adjustment.adjustedSV,adjustedSV);
  assert.equal(r.stars,Math.max(0,Math.min(5,adjustedSV-4)));
  assert.equal(r.modes.bearing,Math.min(requiredBearing,r.stars));
 });
 run(`END-TO-END PURE manual SV=${adjustedSV} bearing=${requiredBearing}`,()=>{
  const affordable=Math.min(requiredBearing,Math.max(0,Math.min(5,adjustedSV-4)));
  const r=computeEpisodeOrientation({mode:'new',context,currentSkill:skill,allocationMode:'manual',requiredBearing,
   manualModes:{bearing:affordable,progress:0,foraging:0,stalking:0,vigilance:0}});
  assert.equal(r.modes.bearing,affordable);
  assert.equal(r.stars,Math.max(0,Math.min(5,adjustedSV-4)));
 });
 }
}
for(const sv of [5,6,7,8,9]){
 const adjustment={adjustedSV:sv,advantageModes:sv-4,stationaryForaging:false};
 const s=sv-4;
 run(`REJECT budget overrun ${s}+1`,()=>assert.throws(()=>assertOrienteeringModes({adjustment,modes:{progress:s,bearing:1,orienteeringSlow:0,lax:false,foraging:0,stalking:0,vigilance:0}}),/dovoluje/));
 run('REJECT two stalking',()=>assert.throws(()=>assertOrienteeringModes({adjustment,modes:{progress:0,bearing:0,foraging:0,stalking:2,vigilance:0,orienteeringSlow:0,lax:false}}),/Neplatné/));
 run('REJECT two vigilance',()=>assert.throws(()=>assertOrienteeringModes({adjustment,modes:{progress:0,bearing:0,foraging:0,stalking:0,vigilance:2,orienteeringSlow:0,lax:false}}),/Neplatné/));
}
for(const sv of [3,4,5,6,7,9]){
 const adjustment={adjustedSV:sv,advantageModes:Math.max(0,Math.min(5,sv-4)),stationaryForaging:true};
 const stars=adjustment.advantageModes;
 run(`Stationary Foraging +2 required modes, sv=${sv}`,()=>assertOrienteeringModes({adjustment,modes:{progress:0,bearing:0,foraging:Math.min(2,stars),stalking:0,vigilance:0,orienteeringSlow:0,lax:false}}));
 if(stars>0)run(`Stationary illegal diversion of mandatory Foraging stars sv=${sv}`,()=>assert.throws(()=>assertOrienteeringModes({adjustment,modes:{progress:0,bearing:0,foraging:0,stalking:1,vigilance:0,orienteeringSlow:0,lax:false}}),/první dva/));
}
// Context - special bonuses must never change primary Survival result.
run('Night bonus rejected during day',()=>assert.throws(()=>createOrienteeringContext({partySize:1,night:false,torchlight:true}),/Noční/));
run('out of range Bearing rejected',()=>assert.throws(()=>allocateTrekModes({autoAllocate:true,autoPriority:'pace',slow:0,orienteeringSlow:0,foraging:0,stalking:0,vigilance:0},{adjustedSV:9,advantageModes:5},{requiredBearing:5}),/Bearing/));
const report={version:'93.854',authority:'HMK v1.2 pp.145-148',test_kind:'deterministic rule-fixture matrix, not UI or historical rolls',total:checks+errors.length,pass:checks,fail:errors.length,errors,combined_bearing_examples:examples.slice(0,8)};
fs.mkdirSync('tools/evidence_93854',{recursive:true});fs.writeFileSync('tools/evidence_93854/stars_rule_matrix.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({total:report.total,pass:report.pass,fail:report.fail,errors:report.errors.slice(0,12)},null,2));
if(errors.length)process.exitCode=1;
