// Reproduce: extract HMK_v93.850_FULL.zip; put this script in the application root next to app.js; run `node HMK_v93.850_REPRO_AUDIT_TERRAIN.mjs`.
import {trekMovementTableRow,trekBearingRequirement,trekAvailableTerrain,trekWeatherDay,trekWeatherWatch} from '../src/integration/hmk-trekking-routine.js';
import {foragingQuality,foragingHabitatFromTerrain,trackingModifiers,trekWatchfulness} from '../src/integration/hmk-trekking-wilderness-tasks.js';
import {calculateTimeEpisode} from '../src/integration/hmk-time-episodes.js';
import fs from 'node:fs';
// Independently transcribed from HMK v1.2 printed pp. 145-147,150.
const published={
 flat:{'paved-road':[5,10,5,5],'unpaved-road':[5,9,5,4],'rural-track':[5,9,4,3],
 'wilderness-trail':[5,8,3,2],'cropland-grassland':[4,6,2,1],'mixed-woodland':[4,6,2,1],
 'heath-moor':[4,6,.5,.5],'needleleaf-forest':[4,5,1,.5],'mixed-forest':[3,4,.5,.5],
 dunes:[3,4,.5,.5],wetlands:[1,1,null,null]},
 rough:{'paved-road':[4,9,4,4],'unpaved-road':[4,8,4,3],'rural-track':[4,7,2,1],
 'wilderness-trail':[4,6,1,.5],'cropland-grassland':[3,5,1,.5],'mixed-woodland':[3,5,1,.5],
 'heath-moor':[3,5,.5,.5],'needleleaf-forest':[3,3,.5,null],'mixed-forest':[2,2,.5,null]},
 mountain:{'paved-road':[3,6,3,2],'unpaved-road':[3,6,2,1],'rural-track':[3,5,1,.5],
 'wilderness-trail':[3,4,.5,0],'cold-woodland':[2,4,0,0],'alpine-vegetation':[2,4,0,0],
 'needleleaf-forest':[2,2,0,0],'ice-snow-rockfield':[1,2,0,0],'mixed-forest':[1,1,0,0]}
};
const marks={'paved-road':[0,0],'unpaved-road':[0,0],'rural-track':[0,1],'wilderness-trail':[0,1],
 'cropland-grassland':[1,1],'mixed-woodland':[1,1],'heath-moor':[1,1],'needleleaf-forest':[1,1],
 'mixed-forest':[1,1],dunes:[2,2],wetlands:[2,2],'cold-woodland':[1,1],'alpine-vegetation':[1,1],
 'ice-snow-rockfield':[1,1]};
const mismatches=[],pass=[];const cols=['foot','mount','cart','wagon'];
for(const [topography,rows] of Object.entries(published))for(const [terrain,expect] of Object.entries(rows)){
 const got=trekMovementTableRow({topography,terrain});
 for(let k=0;k<4;k++)(got[cols[k]]===expect[k]?pass:mismatches).push({section:'LPW',topography,terrain,conveyance:cols[k],expected:expect[k],actual:got[cols[k]]});
 for(let rain=0;rain<2;rain++){
  const actual=trekBearingRequirement({topography,terrain,continuousPrecipitation:!!rain}).requiredBearing;
  const expected=marks[terrain][rain];(actual===expected?pass:mismatches).push({section:'Bearing',topography,terrain,rain:!!rain,expected,actual});
 }
 for(let k=0;k<4;k++){
  const allowable=expect[k]!=null&&expect[k]>0,actual=trekAvailableTerrain(topography,cols[k]).includes(terrain);
  (allowable===actual?pass:mismatches).push({section:'Conveyance availability',topography,terrain,conveyance:cols[k],expected:allowable,actual});
 }
}
const weather=[];
for(const target of ['paved-road','unpaved-road'])for(const precip of ['rain','sleet','snow']){
 const p={format:'hmk-trekking-weather-day-v1',hasPrecipitation:true,daylightHazard:precip==='rain'?null:'cold',nightHazard:precip==='rain'?null:'cold',precipitationRoll:precip==='sleet'?4:2,precipitationTN:4};
 const w=trekWeatherWatch(p,{precipitationD6:1,pavedRoad:target==='paved-road'});
 weather.push({target,requestedPrecip:precip,observedPrecip:w.precipitation,continuous:w.continuous,slow:w.slowMode});
}
const tracking=[];
for(const road of ['none','unpaved','paved'])for(const continuousSnow of [false,true])for(const continuousRain of [false,true]){
 const p=trackingModifiers({road,continuousRain,continuousSnow,partyTracked:10,night:true,alpine:true});
 tracking.push({road,continuousSnow,continuousRain,expected:2-3-1-(['none','unpaved','paved'].indexOf(road)*2)+(continuousSnow?4:0)-(continuousRain?1:0),actual:p.delta});
}
let duneOvershoot;
try{calculateTimeEpisode({minute:480,minutes:60,memberIds:['A'],kind:'travel',topography:'flat',terrain:'dunes',conveyance:'foot',enduranceByActor:{A:10},endRollByActor:{A:5},encByActor:{A:0},encounterEnviron:'wilderness',bearing:2,progress:1,dunesSlow:true,progressD10:[3]});duneOvershoot='unexpected PASS';}
catch(e){duneOvershoot=e.message;}
let nonDuneSlow;
try{const r=calculateTimeEpisode({minute:480,minutes:60,memberIds:['A'],kind:'travel',topography:'flat',terrain:'paved-road',conveyance:'foot',enduranceByActor:{A:10},endRollByActor:{A:5},encByActor:{A:0},encounterEnviron:'highway',bearing:0,progress:0,dunesSlow:true,progressD10:[]});nonDuneSlow={slow:r.slow,lpw:r.motion.finalLPW};}
catch(e){nonDuneSlow={error:e.message};}
const report={basis:'HMK v1.2 pp.145-147,150 compared with v93.850 engine',checked:pass.length+mismatches.length,pass:pass.length,failed:mismatches.length,mismatches,weather,tracking,duneOvershoot,nonDuneSlow};
fs.writeFileSync('./tools/evidence_93851_terrain.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({checked:report.checked,passed:pass.length,failed:report.failed,mismatches,weather,trackingErrors:tracking.filter(t=>t.expected!==t.actual),duneOvershoot,nonDuneSlow},null,2));
