import assert from 'node:assert/strict';
import {initialCombatState} from '../src/integration/persistent-combat-state.js';
import {
 prepareTrekkingWeatherTest, startTrekkingWeatherExposureTreatment, advanceTrekkingWeatherExposure
} from '../src/integration/hmk-weather-hazard-aftermath.js';
import {prepareExposureSkinInjuries} from '../src/integration/hmk-weather-trauma-completion.js';
import {applyConfirmedTreatment} from '../src/integration/hmk-healing-persistence.js';
import {persistVerifiedCombatSnapshot} from '../src/integration/verified-combat-storage.js';

const sourceId='qa-heat';
const actor={id:'patient',hmk:{attributes:{end:14,wil:14},skills:[{name:'Shock',ml:70}]}};
const onset=prepareTrekkingWeatherTest({state:initialCombatState(),sourceId,kind:'heat',originalSL:'CF',
 weatherHazardConfirmed:true,gmConfirmed:true});
assert.deepEqual([onset.report.hr,onset.report.skinPending],[4,'sunburn']);

const start={state:onset.state,sourceId,round:2,elapsedMinutes:0,
 removedFromHazard:true,treatmentConfirmed:true,gmConfirmed:true};
assert.equal(startTrekkingWeatherExposureTreatment(start).report.intervalMinutes,15);
const bath=startTrekkingWeatherExposureTreatment({...start,coolWater:true});
assert.equal(bath.report.intervalMinutes,5);
const course={...start,state:bath.state,actor,round:3,method:'healing',roll:5,coolWater:true};
assert.throws(()=>advanceTrekkingWeatherExposure({...course,elapsedMinutes:4}),/termínu/);
assert.throws(()=>advanceTrekkingWeatherExposure({...course,elapsedMinutes:5,coolWater:false}),/Režim/);
const recovered=advanceTrekkingWeatherExposure({...course,elapsedMinutes:5});
assert.deepEqual([recovered.report.hr,recovered.report.defeated,recovered.report.skinPending],[6,true,'sunburn']);

const skin=prepareExposureSkinInjuries({actor,inventory:[],state:recovered.state,sourceId,round:4,complexion:'light',
 rows:[{location:'ha',side:'left',skinD10:7,shockD100:5},{location:'ha',side:'right',skinD10:8}],maximumExposureMinutes:15,
 originMinute:585,allLocationsReviewed:true,gmConfirmed:true});
const [burn]=skin.state.wounds;
assert.deepEqual([skin.state.wounds.length,burn.location,burn.side,burn.severity,burn.level,burn.aspect],
 [1,'ha','left','S',2,'fire']);

const treatment={state:skin.state,woundId:burn.id,round:5,eventId:'qa-burn-treatment',daySinceInjury:0,
 physicianML:35,physicianIndex:3,physicianRoll:5,gmConfirmed:true,
 procedureTime:{startMinute:590,endMinute:605,gmConfirmed:true}};
assert.throws(()=>applyConfirmedTreatment(treatment),/water, bandages/);
const treated=applyConfirmedTreatment({...treatment,available:['water','bandages']});
assert.equal(treated.state.wounds[0].healing.treated,true);

for(const [after,expect] of [['old','quota-exceeded'],['new','verified'],['unexpected','ambiguous-or-concurrent-change']]){
 let value='old';
 const storage={getItem:()=>value,setItem(){value=after;throw new DOMException('full','QuotaExceededError');}};
 assert.equal(persistVerifiedCombatSnapshot({storage,key:'test',baseline:'old',serialized:'new'}).code,expect);
}

console.log('PASS Heat CF, 15/5-minute intervals, bath recovery HR 4→6, separate Sunburn and treatment, and storage readback');
