import assert from 'node:assert/strict';
import {weatherTreatmentTiming} from '../hmk93712_work/src/integration/hmk-weather-treatment-timing.js';
let n=0;
const check=(w,start,onset,want,method)=>{const p=weatherTreatmentTiming({wound:w,startMinute:start,onsetMinute:onset});assert.equal(p.durationMinutes,want);assert.equal(p.method,method);assert.equal(p.endMinute,start+want);n+=3;};
for(const [aspect,level,m,kind] of [
 ['frost',1,120,'wrm'],['frost',2,120,'wrm'],['frost',3,120,'wrm'],
 ['fire',1,15,'cmp'],['fire',2,10,'cln'],['fire',4,20,'cln'],
 ['blunt',1,15,'cmp'],['blunt',3,15,'set'],['edge',1,5,'cln'],
 ['edge',5,30,'sur'],['point',2,10,'cln'],['point',5,30,'sur'],
 ['projectile',2,10,'cln'],['projectile',3,30,'ext'],['projectile',4,30,'ext']
])check({aspect,level},720,720,m,kind);
let p=weatherTreatmentTiming({wound:{aspect:'fire',level:1},startMinute:1430,onsetMinute:720});
assert.equal(p.daySinceInjury,0);assert.equal(p.crossesCalendarDay,true);n+=2;
p=weatherTreatmentTiming({wound:{aspect:'fire',level:1},startMinute:1439,onsetMinute:0});assert.equal(p.daySinceInjury,1);n++;
p=weatherTreatmentTiming({wound:{aspect:'frost',level:2},startMinute:720,onsetMinute:720,untreated:true});assert.equal(p.durationMinutes,0);assert.equal(p.endMinute,720);n+=2;
for(const opts of [{wound:{aspect:'frost',level:4},startMinute:0,onsetMinute:0},{wound:{aspect:'frost',level:2},startMinute:2,onsetMinute:3},{wound:{aspect:'fire',level:2,healed:true},startMinute:720,onsetMinute:0},{wound:{aspect:'fire',level:2},startMinute:720,onsetMinute:undefined}]){assert.throws(()=>weatherTreatmentTiming(opts));n++;}
console.log('PASS',n,'treatment timing rule assertions');
p=weatherTreatmentTiming({wound:{aspect:'frost',level:4},startMinute:720,onsetMinute:720,allowAmputation:true});
assert.equal(p.method,'amp');assert.equal(p.durationMinutes,1);assert.equal(p.endMinute,721);n+=3;
assert.throws(()=>weatherTreatmentTiming({wound:{aspect:'frost',level:1},startMinute:720,onsetMinute:720,allowAmputation:true}));n++;
console.log('PASS',n,'including Frost G amputation timing');
