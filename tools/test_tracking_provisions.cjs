/** Reproducible HMK printed p.120/145/147/186 provenance and clock tests.
 * Run: node tools/test_tracking_provisions.cjs
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),ext=require.extensions['.js'];
require.extensions['.js']=function(mod,file){if(!file.startsWith(path.join(root,'src')+path.sep))return ext(mod,file);
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file)};
const {pendingTrackingBearing,assertTrackingBearingWatch}=require('../src/integration/hmk-tracking-bearing-handoff.js');
const {assertOrienteeringModes}=require('../src/integration/hmk-trekking-orienteering.js');
const {trekkingModeHardLimit}=require('../src/integration/hmk-trekking-handoff.js');
const {correctedModes,modeTotal}=require('../src/integration/hmk-trekking-correction.js');
const {provenCarriedRations,assertExclusiveForagingProven}=require('../src/integration/hmk-inventory-provisions.js');
const {nutritionRisk,createNutritionPolicy,finishDueNutritionDays,validateNutritionJournal}=require('../src/integration/hmk-nutrition-days.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
let passed=0,id=0;function eq(actual,want,label){assert.deepEqual(actual,want,label);passed++}
function ok(v,label){assert.ok(v,label);passed++}
function no(fn,match,label){assert.throws(fn,match,label);passed++}
const c='campaignA',other='campaignB',A=['a','b'],clock=240;
function watch(name,t,group,campaign=c){return {id:name,characterId:group[0],calendarCampaignId:campaign,campaignMinute:t,
 calendarTrekProof:{partyModes:{memberIds:[...group].sort()},modes:{stalking:1}}};}
function tracking(name,source,minute,cf=true,campaign=c){return {id:name,characterId:'a',calendarCampaignId:campaign,campaignMinute:minute,
 calendarTrekTrackingProof:{sourceId:source.id,sourceMinute:source.campaignMinute,score:{nextWatchBearingOnCF:cf}}};}
const s=watch('s',0,A),t=tracking('t',s,0);
let j=[s,t];let p=pendingTrackingBearing({journal:j,campaignId:c,minute:clock,memberIds:A});
eq(p.trackingId,'t','real CF is bound to Tracking proof');
eq(p.forcedBearing,1,'one forced Bearing mode');
eq(pendingTrackingBearing({journal:j,campaignId:other,minute:clock,memberIds:A}),null,'separate campaign cannot borrow Bearing');
eq(pendingTrackingBearing({journal:j,campaignId:c,minute:clock,memberIds:['z']}),null,'unrelated party cannot borrow Bearing');
no(()=>pendingTrackingBearing({journal:j,campaignId:c,minute:clock,memberIds:['a']}),/rozhodnutí GM/,'party split cannot silently shed mandatory Bearing');
eq(pendingTrackingBearing({journal:j,campaignId:c,minute:0,memberIds:A}),null,'same instant without GM advancement is not the next watch');
const future={...t,campaignMinute:clock+1};
eq(pendingTrackingBearing({journal:[s,future],campaignId:c,minute:clock,memberIds:A}),null,'Tracking result with future timestamp cannot retroactively impose a Bearing');
const alteredTime={...t,calendarTrekTrackingProof:{...t.calendarTrekTrackingProof,sourceMinute:123}};
eq(pendingTrackingBearing({journal:[s,alteredTime],campaignId:c,minute:clock,memberIds:A}),null,'Tracking source minute must match original watch');
const m={progress:4,bearing:1,foraging:0,stalking:0,vigilance:0,orienteeringSlow:0,lax:false,doubleTime:false,
 trackingForcedBearingSourceId:'t'};
eq(trekkingModeHardLimit(m).selected,4,'forced Bearing is not a paid advantage');
eq(assertOrienteeringModes({adjustment:{adjustedSV:8,advantageModes:4},modes:m}).spent,4,'SV budget ignores forced Bearing');
const nextWatch={id:'s2',calendarCampaignId:c,campaignMinute:clock,characterId:'a',calendarTrekProof:{partyModes:{memberIds:A},modes:m}};
eq(assertTrackingBearingWatch(nextWatch,j),true,'next watch correctly identifies source CF');
no(()=>assertTrackingBearingWatch({...nextWatch,calendarTrekProof:{...nextWatch.calendarTrekProof,modes:{...m,trackingForcedBearingSourceId:null}}},j),/povinný Bearing/,'cannot erase required Bearing');
no(()=>assertTrackingBearingWatch({...nextWatch,calendarTrekProof:{...nextWatch.calendarTrekProof,modes:{...m,trackingForcedBearingSourceId:'forged'}}},j),/povinný Bearing/,'cannot forge foreign Tracking origin');
no(()=>assertOrienteeringModes({adjustment:{adjustedSV:8,advantageModes:4},modes:{...m,bearing:0}}),/povinný Bearing/,'cannot claim forced source without mode');
// Different party had a watch at the same time; it does not consume this party's receipt.
const different=watch('different',clock,['z']);
eq(pendingTrackingBearing({journal:[s,t,different],campaignId:c,minute:clock+240,memberIds:A}).trackingId,'t','other party never consumes bearing');
const used=watch('used',clock,A);
eq(pendingTrackingBearing({journal:[s,t,used],campaignId:c,minute:clock+240,memberIds:A}),null,'no double application after next watch');
// Late Tracking result must not retroactively shift a finished next watch to a third watch.
eq(pendingTrackingBearing({journal:[s,used,t],campaignId:c,minute:clock+240,memberIds:A}),null,'late result cannot create second-next watch obligation');
const success=tracking('success',s,0,false);
eq(pendingTrackingBearing({journal:[s,success],campaignId:c,minute:clock,memberIds:A}),null,'non-CF causes no Bearing');
const correction=correctedModes({...m,manualSlow:0,slow:0,loaded:false,progressD10:[1,2,3,4],directionD10:[]},
 {advantageModes:2,adjustedSV:6,stationaryForaging:false});
eq(correction.bearing,1,'correction preserves forced Bearing');
eq(correction.progress,2,'correction trims voluntary Progress first');
eq(modeTotal(correction),2,'corrected allocation still respects stars');
const snapshot={id:'hmk:gear:hmk-p120-027',name:'Rations, standard',category:'other',properties:{weightLb:3}};
const inventory=[{id:'item-1',characterId:'a',sourceItemId:snapshot.id,snapshot,quantity:2}];
eq(provenCarriedRations(inventory,'a').map(r=>[r.foodDays,r.weightLb]),[[2,6]],'2 carried printed rations = 6 lb');
eq(provenCarriedRations(inventory,'b'),[],'cannot borrow other actor stock');
no(()=>assertExclusiveForagingProven({inventory,actorId:'a'}),/Výhradní Foraging není prokázán/,'real inventory prevents a false exclusive-source claim');
eq(assertExclusiveForagingProven({inventory,actorId:'b'}),true,'no other verified rations does not itself invent supplies');
const forged=[{...inventory[0],snapshot:{...snapshot,id:'custom'}}];
eq(provenCarriedRations(forged,'a'),[],'custom label cannot impersonate printed catalogue food');
// Starting a regimen does not require time advancement. But on a GM advance,
// detecting an actual other source must stop the commitment BEFORE a false day proof.
const actor={id:'a',name:'Test',hmk:{combatState:initialCombatState()}},policy=createNutritionPolicy({campaignId:c,minute:0,actorId:'a',foragingOnly:true});
const db={campaignClock:{campaignId:c,minute:1440,characterIds:['a'],events:[]},characters:[actor],inventory,journal:[{id:'policy',characterId:'a',calendarCampaignId:c,campaignMinute:0,calendarNutritionPolicy:policy}]};
no(()=>finishDueNutritionDays(db,{idFactory:()=>`new-${++id}`,stamp:()=>''}),/Výhradní Foraging není prokázán/,'clock close refuses bogus forage-only claim');
eq(db.journal.length,1,'no partial day evidence created on refusal');
eq(db.campaignClock.minute,1440,'neither assessment nor rejection advances the clock');
// With no competing food evidence, the old 24-hour mechanism remains valid.
db.inventory=[];let rows=finishDueNutritionDays(db,{idFactory:()=>`new-${++id}`,stamp:()=>''});
eq(rows.length,1,'legacy no-inventory nutrition day still closes');
eq(validateNutritionJournal(db.journal),true,'nutrition journal replay remains valid');
eq(nutritionRisk(db.journal,c,'a').starvation,true,'new day of zero food is a risk');
// A full food day resets CURRENT risk; it does NOT cure an already-established ailment.
const journal=[{characterId:'a',calendarCampaignId:c,calendarNutritionDay:{format:'hmk-nutrition-day-v1',startMinute:0,endMinute:1440,foodNeed:1,foodReceived:0,waterNeed:1,waterReceived:1}},
 {characterId:'a',calendarCampaignId:c,calendarNutritionDay:{format:'hmk-nutrition-day-v1',startMinute:1440,endMinute:2880,foodNeed:1,foodReceived:1,waterNeed:1,waterReceived:1}}];
eq(nutritionRisk(journal,c,'a').starvation,false,'resolved CURRENT deficit risk no longer sticks forever');
eq(nutritionRisk(journal,c,'a').thirst,false,'healthy water intake has no thirst risk');
console.log(`PASS: ${passed} Tracking CF / physical ration gate / GM time checks`);
