import assert from 'node:assert/strict';
import {createOrienteeringContext,adjustedOrienteeringSV,assertOrienteeringModes} from '../src/integration/hmk-trekking-orienteering.js';
import {trekWeatherDay,trekWeatherWatch,trekMovementTableRow,trekMovement,trekAvailableTerrain,trekHazards,trekEncounterCheck} from '../src/integration/hmk-trekking-routine.js';
import {episodeWeatherExposure,episodeHazardFollowup} from '../src/integration/hmk-episode-travel-detail.js';
let t={weather:0,orientation:0,movement:0,direction:0,encounter:0,exposure:0};
for(const season of ['spring','summer','autumn','winter'])for(const climate of ['subpolar','cool','warm','subtropical','dry-tropical','wet-tropical'])for(let temp=1;temp<=10;temp++)for(let precip=1;precip<=10;precip++){
 const weather=trekWeatherDay({season,climate,temperatureD10:temp,precipitationD10:precip});
 assert.equal(weather.daylightHazard==='cold'&&weather.daylightHazard==='heat',false);
 for(const night of [false,true]){
  const watch=trekWeatherWatch(weather,{night,precipitationD6:weather.hasPrecipitation?1:null});
  assert.equal(watch.continuous,weather.hasPrecipitation);
  assert.equal(watch.requiresWeatherHazardRoll,(night?weather.nightHazard:weather.daylightHazard)!==null);
  t.weather++;
 }
}
for(let base=-5;base<=12;base++)for(const night of [false,true])for(const partySize of [1,9,10,19,20,31])for(const familiar of [false,true])for(const forage of [false,true]){
 const context=createOrienteeringContext({night,partySize,familiar,stationaryForaging:forage,torchlight:night,fullMoon:night,afterSnowfall:night});
 const result=adjustedOrienteeringSV({baseSV:base,context});
 const expected=base+Number(familiar)+(forage?2:0)-Math.floor(partySize/10);
 assert.equal(result.adjustedSV,expected);
 assert.equal(result.advantageModes,Math.min(5,Math.max(0,expected-4)));
 const sv=expected;const flags=sv<=0?{lax:true,orienteeringSlow:1}:sv<=2?{lax:false,orienteeringSlow:1}:{lax:false,orienteeringSlow:0};
 const available=result.advantageModes;
 const modes={progress:0,bearing:0,foraging:forage?Math.min(2,available):0,stalking:0,vigilance:0,doubleTime:false,...flags};
 assertOrienteeringModes({adjustment:result,modes});t.orientation++;
 if(sv<=0){assert.throws(()=>assertOrienteeringModes({adjustment:result,modes:{...modes,lax:false}}));t.orientation++;}
}
for(const topography of ['flat','rough','mountain'])for(const conveyance of ['foot','mount','cart','wagon'])for(const terrain of trekAvailableTerrain(topography,conveyance)){
 const row=trekMovementTableRow({topography,terrain}),lpw=row[conveyance];
 for(const slow of [0,1,2])for(const loaded of [false,true])for(const continuousPrecipitation of [false,true]){
  const m=trekMovement({topography,terrain,conveyance,progress:0,slow,loaded,continuousPrecipitation,minutes:30,bearing:2});
  assert.equal(m.baseLPW,lpw);
  assert.equal(m.kilometres,m.finalLPW*0.5);
  assert.equal(m.finalLPW,lpw/(2**slow)/(loaded?2:1));
  t.movement++;
 }
 const faster=trekMovement({topography,terrain,conveyance,progress:1,slow:0,progressD10:[1],minutes:240});
 assert.equal(faster.progressSuccess,true);assert.equal(faster.finalLPW,lpw+1);t.movement++;
}
for(const bearingDeficit of [0,1,2])for(let a=1;a<=10;a++)for(let b=1;b<=10;b++){
 const rolls=bearingDeficit===0?[]:bearingDeficit===1?[a]:[a,b];
 const result=trekHazards({bearingDeficit,directionD10:rolls});
 const highest=bearingDeficit?Math.max(...rolls):null;
 assert.equal(result.direction,highest===null?null:highest<=4?'lost-time':highest<=9?'misdirection':'lost');t.direction++;
}
for(const environ of ['highway','rural','wilderness','underworld'])for(const night of [false,true])for(const roll of [1,2,3,4,5,6,7,8,9,10]){
 for(const previousNight of (environ==='wilderness'&&night?[0,1]:[0])){
  const due=!(environ==='wilderness'&&night&&previousNight%2===0);
  const r=trekEncounterCheck({environ,night,roll:due?roll:null,elapsedWildernessNightWatches:previousNight});
  assert.equal(r.checkDue,due);assert.equal(r.encounter,due&&roll<=r.tn);t.encounter++;
 }
}
for(const kind of ['cold','heat'])for(let areaAV=0;areaAV<=20;areaAV++){
 const sample=episodeWeatherExposure({kind,areaAV,roll:null});
 for(let roll=1;roll<=sample.faces;roll++){
  const e=episodeWeatherExposure({kind,areaAV,roll,endLevel:'CS'});
  const expected=kind==='cold'?roll>Math.min(4,areaAV):roll<=Math.max(1,areaAV);
  assert.equal(e.exposed,expected);t.exposure++;
 }
}
for(const hazard of ['misdirection','lost'])for(let roll=1;roll<=10;roll++){
 const d=episodeHazardFollowup({hazard,directionD10:roll,directionTurn:roll%2?'left':'right',directionObservationDeferred:hazard==='misdirection'});
 assert.equal(d.requiresGMCompletion,false);t.direction++;
}
console.log('PASS v93.785 rule matrix',JSON.stringify(t),'TOTAL',Object.values(t).reduce((a,b)=>a+b,0));
