'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(process.argv[2]||'/mnt/data/hmk_dev_93719');
const old=require.extensions['.js'];require.extensions['.js']=(m,p)=>p.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p):old(m,p);
const {initialCombatState,validateCombatState,applyExtendedShockCourse}=require(path.join(root,'src/integration/persistent-combat-state.js'));
const {preparePoisonStart,preparePoisonOnset,preparePoisonCourse}=require(path.join(root,'src/integration/hmk-poison-course.js'));
const {prepareDiseaseExposure,prepareDiseaseProfile,prepareDiseaseOnset,prepareDiseaseCourse}=require(path.join(root,'src/integration/hmk-disease-course.js'));
const {prepareTrekkingWeatherTest}=require(path.join(root,'src/integration/hmk-weather-hazard-aftermath.js'));
const {validateGlobalActionLedger,recordGlobalActionReceipt,assertGlobalActionLedgerAppendOnly}=require(path.join(root,'src/integration/hmk-global-action-ledger.js'));
const {concurrentShockSources}=require(path.join(root,'src/integration/hmk-concurrent-shock-projection.js'));
let n=0;function eq(a,b,m){assert.deepEqual(a,b,m);n++}function ok(a,m){assert.ok(a,m);n++}function reject(fn,re){assert.throws(fn,re);n++}
const actor={id:'actor-A',name:'A',hmk:{attributes:{end:12,wil:12},skills:[]}};
function setup(){let s=initialCombatState();for(const sourceId of ['toxin-one','toxin-two'])s=preparePoisonStart({actor,state:s,sourceId,round:1,transmission:'contact',onsetMinutes:10,periodMinutes:10,initialHR:2,symptomD10s:[1,2,3,4],actualExposureConfirmed:true,gmConfirmed:true}).state;
 s=prepareDiseaseExposure({actor,state:s,sourceId:'disease-one',diseaseKey:'illness-one',transmission:'airborne',contagionIndex:5,contagionD100:95,round:1,confirmedStandardLethal:true,gmConfirmed:true}).state;
 s=prepareDiseaseProfile({actor,state:s,sourceId:'disease-one',round:1,onsetD6:1,symptomD10s:[1,2,3,4],initialHR:1,gmConfirmed:true}).state;
 return s;}
function permute(xs){if(!xs.length)return [[]];return xs.flatMap((x,i)=>permute(xs.filter((_,j)=>j!==i)).map(r=>[x,...r]));}
const actions={
 one:s=>preparePoisonOnset({actor,state:s,sourceId:'toxin-one',round:1,elapsedMinutes:10,gmConfirmed:true}).state,
 two:s=>preparePoisonOnset({actor,state:s,sourceId:'toxin-two',round:1,elapsedMinutes:10,gmConfirmed:true}).state,
 disease:s=>prepareDiseaseOnset({actor,state:s,sourceId:'disease-one',round:1,elapsedMinutes:720,gmConfirmed:true}).state,
 weather:s=>prepareTrekkingWeatherTest({state:s,sourceId:'heat-one',round:1,kind:'heat',originalSL:'CF',weatherHazardConfirmed:true,gmConfirmed:true}).state,
};
let permutations=0;for(const order of permute(Object.keys(actions))){let s=setup();for(const name of order){s=actions[name](s);ok(validateCombatState(s));}
 eq(s.shock,'UNC','Worst independently active shock must win');
 eq(s.toxinCourses.filter(x=>x.status==='active').length,2);
 eq(s.diseaseCourses.filter(x=>x.status==='active').length,1);
 eq(s.environmentalHazards.filter(x=>x.active).length,1);
 eq(s.fatigue.otherWeakness,10,'Weather HR4 weakness survives all orderings');
 eq(concurrentShockSources(s).filter(x=>x.shock!=='NONE').length,3);
 eq(s.events.length,4+2+1+1,'all four causal receipts persisted');
 eq(JSON.parse(JSON.stringify(s)).shock,'UNC');
 // Two Poison courses and one Disease course can proceed independently.
 s=prepareDiseaseCourse({actor,state:s,round:1,sourceId:'disease-one',elapsedMinutes:2160,courseD100:10,gmConfirmed:true}).state;
 eq(s.shock,'INC','Recovering an UNC disease must not erase two INC toxins');
 s=preparePoisonCourse({actor,state:s,sourceId:'toxin-one',round:1,elapsedMinutes:20,courseD100:10,gmConfirmed:true}).state;
 eq(s.shock,'INC','Second toxin remains active');
 s=preparePoisonCourse({actor,state:s,sourceId:'toxin-two',round:1,elapsedMinutes:20,courseD100:10,gmConfirmed:true}).state;
 eq(s.shock,'STN','Disease HR3 still has STN when toxins recover');
 s=prepareDiseaseCourse({actor,state:s,round:1,sourceId:'disease-one',elapsedMinutes:3600,courseD100:10,gmConfirmed:true}).state;
 eq(s.shock,'NONE','Recover all serious sources without stuck Shock');
 eq(s.fatigue.otherWeakness,35,'All four independently active Weakness contributions remain');
 permutations++;}
// legacy independent recovery (Extended Shock/Coma must not be deleted)
{let s=setup();s.shock='UNC';s.extendedShock={originState:'UNC',hr:5,elapsedHours:4};s.coma={active:true,hr:5,elapsedDays:0,nextCourseDays:3};
 s=actions.weather(s);eq(s.extendedShock.hr,5);eq(s.coma.active,true);eq(s.shock,'UNC');}
// Existing INC Extended Shock must survive a stronger independent UNC toxin;
// ending the original Course may not hide or resolve the toxin's UNC.
{let s=initialCombatState();s.shock='INC';s.extendedShock={originState:'INC',hr:5,elapsedHours:0};
 s=preparePoisonStart({actor,state:s,sourceId:'tox-on-ext',round:1,transmission:'contact',onsetMinutes:10,periodMinutes:10,initialHR:1,symptomD10s:[1,2,3,4],actualExposureConfirmed:true,gmConfirmed:true}).state;
 s=preparePoisonOnset({actor,state:s,sourceId:'tox-on-ext',round:1,elapsedMinutes:10,gmConfirmed:true}).state;
 eq(s.shock,'UNC');eq(s.extendedShock.hr,5);ok(validateCombatState(s));
 s=applyExtendedShockCourse({state:s,round:2,eventId:'ext-course-2',healingBase:12,roll:10,elapsedHoursSinceOnset:4,gmConfirmed:true}).state;
 eq(s.extendedShock,null);eq(s.shock,'UNC','Toxin UNC survives completion of independent Extended Shock');ok(validateCombatState(s));}
// The ledger works for any successful transaction, in two orders, with identical minute.
for(const order of permute(['A','B','C'])){
 let doc={characters:[{id:'A',name:'A',hmk:{healthState:initialCombatState()}}],journal:[],campaignClock:{minute:560,campaignId:'camp'},globalActionLedger:[]};
 for(const x of order){const before=structuredClone(doc);doc.journal.push({id:'proof-'+x,createdAt:'2026-11-04',characterId:'A'});let r=recordGlobalActionReceipt(doc,{before,id:'receipt-'+x,createdAt:'2026-11-04T20:00'});
 eq(r.minute,560);ok(validateGlobalActionLedger(doc));ok(assertGlobalActionLedgerAppendOnly(before,doc));}
 eq(doc.globalActionLedger.length,3);eq(new Set(doc.globalActionLedger.map(x=>x.id)).size,3);
 const copy=JSON.parse(JSON.stringify(doc));eq(copy.globalActionLedger.length,3);
 const prior=structuredClone(doc);prior.globalActionLedger[1].id='tampered';reject(()=>assertGlobalActionLedgerAppendOnly(doc,prior),/nelze smazat|přepsat/);
 reject(()=>recordGlobalActionReceipt(doc,{before:doc,id:doc.globalActionLedger[0].id}),/Poškozený|duplicit|trvalá/);
}
console.log('PASS '+n+' assertions; '+permutations+' medical four-source permutations; 6 global-ledger orderings');
