'use strict';
/** HMK p.75/186; deterministic checks, no guessed onset or dice. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {initialCombatState,validateCombatState}=require('../src/integration/persistent-combat-state.js');
const {createHerbPotionAdministration,validateHerbAdministrationJournal}=require('../src/integration/hmk-herbal-administration.js');
const {herbalPoisonProfile,prepareHerbalPoisonExposure,validateHerbalPoisonExposureJournal,assertHerbalPoisonExposureAppendOnly}=require('../src/integration/hmk-herbal-poison-exposure.js');
const {preparePoisonStart,preparePoisonOnset,preparePoisonCourse}=require('../src/integration/hmk-poison-course.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=x=>{assert.ok(x);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const campaignId='camp-A',giver='herbalist',patient='patient';
const actor={id:patient,hmk:{attributes:{end:12,wil:11}}};
function setup(potency,sv,id='one',c=campaignId){
 const complete={id:'made-'+id,characterId:giver,calendarCampaignId:c,campaignMinute:0,
  calendarHerbPotionComplete:{format:'hmk-herb-potion-complete-v1',campaignId:c,minute:0,actorId:giver,
   herbType:'poison',potency,sv,usable:true,expiryMinute:100000}};
 const p=createHerbPotionAdministration({journal:[complete],campaignId:c,minute:1,actorId:giver,completeId:complete.id,
  targetId:patient,method:'ingested',gmConfirmed:true,memberIds:[giver,patient]});
 const app={id:'use-'+id,characterId:giver,calendarCampaignId:c,campaignMinute:1,calendarHerbPotionAdminister:p};
 return [complete,app];
}
function expose(potency=2,sv=8,id='one'){
 const journal=setup(potency,sv,id),result=prepareHerbalPoisonExposure({journal,campaignId,applicationId:'use-'+id,
  minute:1,actor,state:initialCombatState(),round:1,periodMinutes:10,
  symptomD10s:[1,2,3,4],standardLethalConfirmed:true,actualExposureConfirmed:true,gmConfirmed:true});
 const row={id:'proof-'+id,characterId:patient,calendarCampaignId:campaignId,campaignMinute:1,
  skillTestProof:{type:'poison-start',actorId:patient,sourceId:result.course.sourceId,course:result.course},
  calendarHerbPoisonExposure:result.proof};
 return {journal:[...journal,row],result,row};
}
for(let sv=1;sv<=14;sv++)for(const potency of [1,2]){
 const p=herbalPoisonProfile({potency,sv});eq(p.initialHR,potency===1?4:3);
 eq(p.onsetUnit,potency===1?'hours':'minutes');eq(p.onsetCount,15-sv);
 eq(p.onsetMinutes,(15-sv)*(potency===1?60:1));
}
bad(()=>herbalPoisonProfile({potency:3,sv:8}),/Great/);
bad(()=>herbalPoisonProfile({potency:2,sv:15}),/15 − SV/);
bad(()=>herbalPoisonProfile({potency:1,sv:20}),/15 − SV/);
bad(()=>herbalPoisonProfile({potency:0,sv:1}),/potence/);
for(const [potency,sv,expectedHR,expectedMinute] of [[1,8,4,420],[2,8,3,7],[1,1,4,840],[2,14,3,1]]){
 const x=expose(potency,sv,'p'+potency+'-'+sv),{result,journal}=x;
 eq(result.course.initialHR,expectedHR);eq(result.course.onsetMinutes,expectedMinute);
 eq(result.course.herbalSource.applicationId,'use-p'+potency+'-'+sv);
 eq(result.course.transmission,'digested');eq(result.state.shock,'NONE');
 eq(result.course.status,'incubating');ok(validateCombatState(result.state));
 eq(validateHerbAdministrationJournal(journal),true);eq(validateHerbalPoisonExposureJournal(journal),true);
 const state2=preparePoisonOnset({actor,state:result.state,sourceId:result.course.sourceId,
  round:1,elapsedMinutes:expectedMinute,gmConfirmed:true}).state;
 eq(state2.toxinCourses[0].status,'active');
 eq(state2.toxinCourses[0].hr,expectedHR);
 const course=preparePoisonCourse({actor,state:state2,sourceId:result.course.sourceId,round:1,
  elapsedMinutes:expectedMinute+10,courseD100:67,gmConfirmed:true});
 eq(course.report.elapsedMinutes,expectedMinute+10);eq(course.report.courseD100,67);
 bad(()=>preparePoisonOnset({actor,state:result.state,sourceId:result.course.sourceId,
  round:1,elapsedMinutes:expectedMinute-1,gmConfirmed:true}),/vyžaduje doložené uplynutí/);
}
const x=expose();const opts={journal:x.journal.slice(0,2),campaignId,applicationId:'use-one',minute:1,actor,
 state:initialCombatState(),round:1,periodMinutes:10,symptomD10s:[1,2,3,4],
 standardLethalConfirmed:true,actualExposureConfirmed:true,gmConfirmed:true};
bad(()=>prepareHerbalPoisonExposure({...opts,gmConfirmed:false}),/GM/);
bad(()=>prepareHerbalPoisonExposure({...opts,standardLethalConfirmed:false}),/standardní/);
bad(()=>prepareHerbalPoisonExposure({...opts,periodMinutes:9}),/10–60/);
bad(()=>prepareHerbalPoisonExposure({...opts,symptomD10s:[1,2,3,0]}),/čtyři/);
bad(()=>prepareHerbalPoisonExposure({...opts,applicationId:'not-found'}),/skutečné požití/);
bad(()=>prepareHerbalPoisonExposure({...opts,minute:2}),/aktuální minutě/);
bad(()=>prepareHerbalPoisonExposure({...opts,actor:{id:'other',hmk:{attributes:{end:12,wil:11}}}}),/konkrétního Poison/);
bad(()=>prepareHerbalPoisonExposure({...opts,campaignId:'other'}),/konkrétního Poison/);
bad(()=>prepareHerbalPoisonExposure({...opts,journal:x.journal}),/expozici/);
eq(x.result.proof.eventId, x.result.course.id);
const state=preparePoisonStart({actor,state:initialCombatState(),round:1,sourceId:'classic-vector',transmission:'vector',
 onsetMinutes:10,periodMinutes:10,initialHR:4,symptomD10s:[1,2,3,4],gmConfirmed:true,actualExposureConfirmed:true});
eq(state.course.onsetMinutes,10);
bad(()=>preparePoisonStart({actor,state:initialCombatState(),round:1,sourceId:'classic-vector',transmission:'vector',
 onsetMinutes:7,periodMinutes:10,initialHR:4,symptomD10s:[1,2,3,4],gmConfirmed:true,actualExposureConfirmed:true}),/10–60/);
bad(()=>preparePoisonStart({actor,state:initialCombatState(),round:1,sourceId:'herb:use-one',transmission:'digested',
 onsetMinutes:12,periodMinutes:10,initialHR:3,symptomD10s:[1,2,3,4],herbalSource:{applicationId:'use-one',potency:2,sv:8},gmConfirmed:true,actualExposureConfirmed:true}),/odpovídat/);
for(const [label,change] of [['HR',j=>j[2].calendarHerbPoisonExposure.initialHR=5],
 ['time',j=>j[2].calendarHerbPoisonExposure.onsetMinutes=8],
 ['SV',j=>j[2].calendarHerbPoisonExposure.sv=99],
 ['victim',j=>j[2].calendarHerbPoisonExposure.targetId='other'],
 ['symptoms',j=>j[2].calendarHerbPoisonExposure.symptomD10s[0]=10],
 ['courseHR',j=>j[2].skillTestProof.course.initialHR=5],
 ['courseOrigin',j=>j[2].skillTestProof.course.herbalSource.sv=1],
 ['combatEventId',j=>j[2].calendarHerbPoisonExposure.eventId='fake-event']]){
 const altered=structuredClone(x.journal);change(altered);
 bad(()=>validateHerbalPoisonExposureJournal(altered),/Herbal Poison/);
 bad(()=>assertHerbalPoisonExposureAppendOnly(x.journal,altered),/historickou/);
}
eq(assertHerbalPoisonExposureAppendOnly(x.journal,[...x.journal,{id:'something'}]),true);
bad(()=>assertHerbalPoisonExposureAppendOnly(x.journal,x.journal.slice(0,2)),/historickou/);
const second=[...x.journal,{...x.row,id:'second-proof'}];bad(()=>validateHerbalPoisonExposureJournal(second),/dvojí expozice/);
const legacy=setup(3,8,'great');eq(validateHerbalPoisonExposureJournal(legacy),true);
bad(()=>prepareHerbalPoisonExposure({...opts,journal:legacy,applicationId:'use-great'}),/Great/);
const nonpositive=setup(1,15,'notpositive');bad(()=>prepareHerbalPoisonExposure({...opts,journal:nonpositive,applicationId:'use-notpositive'}),/15 − SV/);
console.log('PASS',n,'Herbal Poison Mild/Strong HR4/HR3, printed onset units, original toxin course, proof replay, no guessing, campaign, legacy compatibility');
