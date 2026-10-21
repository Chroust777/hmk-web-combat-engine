'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {initialCombatState,validateCombatState}=require('../src/integration/persistent-combat-state.js');
const {createHerbPotionAdministration,validateHerbAdministrationJournal}=require('../src/integration/hmk-herbal-administration.js');
const {pendingGreatPoisons,requireGreatPoisonRoundMayAdvance,requireGreatPoisonGMTimeMayAdvance,prepareGreatPoisonOnset,validateGreatPoisonJournal,assertGreatPoisonAppendOnly,checkedPasteInjury}=require('../src/integration/hmk-herbal-great-poison.js');
const {preparePoisonCourse}=require('../src/integration/hmk-poison-course.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=x=>{assert.ok(x);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const c='camp-a',target='victim',caster='maker',timeline='battle-one',actor={id:target,hmk:{attributes:{end:12,wil:11}}};
function fixture(sv=8, id='one', campaignId=c){
 const made={id:'made-'+id,characterId:caster,calendarCampaignId:campaignId,campaignMinute:0,
  calendarHerbPotionComplete:{format:'hmk-herb-potion-complete-v1',campaignId,minute:0,actorId:caster,
   herbType:'poison',potency:3,sv,usable:true,expiryMinute:1000}};
 const app=createHerbPotionAdministration({journal:[made],campaignId,minute:3,actorId:caster,completeId:made.id,
  targetId:target,method:'ingested',gmConfirmed:true,memberIds:[caster,target],
  combatAnchor:{confirmedByGM:true,round:20,campaignMinute:3,timelineId:timeline}});
 const applied={id:'use-'+id,characterId:caster,calendarCampaignId:campaignId,campaignMinute:3,calendarHerbPotionAdminister:app};
 return [made,applied];
}
for(let sv=1;sv<=14;sv++){
 const journal=fixture(sv,`sv-${sv}`);const p=pendingGreatPoisons(journal,c)[0];
 eq(p.dueRound,20+15-sv);eq(p.originRound,20);eq(p.targetId,target);eq(p.timelineId,timeline);
 eq(validateHerbAdministrationJournal(journal),true);
 eq(pendingGreatPoisons(journal,'other').length,0);
 bad(()=>requireGreatPoisonRoundMayAdvance({journal,campaignId:c,timelineId:timeline,currentRound:p.dueRound,nextRound:p.dueRound+1}),/přeskočit/);
 eq(requireGreatPoisonRoundMayAdvance({journal,campaignId:c,timelineId:timeline,currentRound:p.dueRound-1,nextRound:p.dueRound}),true);
}
const journal=fixture(),pending=pendingGreatPoisons(journal,c)[0],opts={journal,campaignId:c,
 applicationId:journal[1].id,minute:3,round:pending.dueRound,timelineId:timeline,actor,
 state:initialCombatState(),periodMinutes:10,symptomD10s:[1,2,3,4],gmConfirmed:true};
const result=prepareGreatPoisonOnset(opts);
eq(result.course.initialHR,4);eq(result.course.onsetMinutes,0);eq(result.course.status,'active');
eq(result.course.elapsedMinutes,0);eq(result.course.herbalSource.onsetRounds,7);
 bad(()=>preparePoisonCourse({actor,state:result.state,sourceId:result.course.sourceId,round:27,elapsedMinutes:0,courseD100:67,gmConfirmed:true}),/splatný|přesně/);
eq(result.state.events.filter(e=>e.type==='poison-start').length,1);
eq(result.state.events.filter(e=>e.type==='poison-onset').length,1);
ok(validateCombatState(result.state));
const proofRow={id:'proof-one',characterId:target,calendarCampaignId:c,campaignMinute:3,
 calendarHerbGreatPoisonOnset:result.proof,skillTestProof:{type:'poison-onset',actorId:target,
 sourceId:result.course.sourceId,course:result.course}};
const full=[...journal,proofRow];eq(validateGreatPoisonJournal(full),true);
const historyModule=require('../src/integration/hmk-calendar-history.js');
const history=historyModule.historicalHMKCalendarEntries({format:'hmk-campaign-calendar-v1',campaignId:c,minute:3,characterIds:[caster,target],anchors:[],events:[]},[{id:caster,name:'Maker'},{id:target,name:'Victim'}],full);
ok(history.some(x=>x.kind==='herb-great-poison-onset'&&x.note.includes('HR4')));
eq(pendingGreatPoisons(full,c).length,0);
eq(requireGreatPoisonRoundMayAdvance({journal:full,campaignId:c,timelineId:timeline,currentRound:27,nextRound:28}),true);
eq(requireGreatPoisonGMTimeMayAdvance({journal:full,campaignId:c,beforeMinute:3,afterMinute:4}),true);
bad(()=>requireGreatPoisonGMTimeMayAdvance({journal,campaignId:c,beforeMinute:3,afterMinute:4}),/před posunem/);
bad(()=>prepareGreatPoisonOnset({...opts,round:26}),/přesně/);
bad(()=>prepareGreatPoisonOnset({...opts,round:28}),/přesně/);
bad(()=>prepareGreatPoisonOnset({...opts,minute:5}),/minuta/);
bad(()=>prepareGreatPoisonOnset({...opts,timelineId:'other-battle'}),/neexistuje/);
bad(()=>prepareGreatPoisonOnset({...opts,campaignId:'other'}),/neexistuje/);
bad(()=>prepareGreatPoisonOnset({...opts,actor:{...actor,id:'wrong'}}),/neexistuje/);
bad(()=>prepareGreatPoisonOnset({...opts,gmConfirmed:false}),/GM/);
bad(()=>prepareGreatPoisonOnset({...opts,periodMinutes:9}),/Course period/);
bad(()=>fixture(15,'bad'),/15 − SV/);
bad(()=>prepareGreatPoisonOnset({...opts,symptomD10s:[1,2,3,0]}),/symptom/);
bad(()=>prepareGreatPoisonOnset({...opts,journal:full}),/neexistuje/);
const tx=preparePoisonCourse({actor,state:result.state,sourceId:result.course.sourceId,round:27,elapsedMinutes:10,
 courseD100:67,gmConfirmed:true});eq(tx.report.elapsedMinutes,10);eq(tx.report.courseD100,67);
for(const alter of [j=>j[2].calendarHerbGreatPoisonOnset.sv=5,
 j=>j[2].calendarHerbGreatPoisonOnset.dueRound=29,
 j=>j[2].calendarHerbGreatPoisonOnset.onsetRounds=3,
 j=>j[2].calendarHerbGreatPoisonOnset.targetId='other',
 j=>j[2].calendarHerbGreatPoisonOnset.minute=4,
 j=>j[2].calendarHerbGreatPoisonOnset.symptomD10s[1]=10,
 j=>j[2].skillTestProof.course.herbalSource.sv=1,
 j=>j[2].skillTestProof.course.onsetMinutes=8]){
 const tampered=structuredClone(full);alter(tampered);
 bad(()=>validateGreatPoisonJournal(tampered),/Great Poison/);
 bad(()=>assertGreatPoisonAppendOnly(full,tampered),/historický/);
}
const double=[...full,{...proofRow,id:'proof-double'}];bad(()=>validateGreatPoisonJournal(double),/duplicitní/);
bad(()=>assertGreatPoisonAppendOnly(full,journal),/historický/);
eq(assertGreatPoisonAppendOnly(full,[...full,{id:'extra'}]),true);
eq(checkedPasteInjury({impactAspect:'edge',glancing:false,injuringStrike:true,gmConfirmed:true}).resistanceModifier,20);
eq(checkedPasteInjury({impactAspect:'point',glancing:false,injuringStrike:true,gmConfirmed:true}).valid,true);
for(const inputs of [{impactAspect:'blunt',glancing:false,injuringStrike:true,gmConfirmed:true},
 {impactAspect:'edge',glancing:true,injuringStrike:true,gmConfirmed:true},
 {impactAspect:'point',glancing:false,injuringStrike:false,gmConfirmed:true},
 {impactAspect:'point',glancing:false,injuringStrike:true,gmConfirmed:false}])bad(()=>checkedPasteInjury(inputs),/pasta/);
// Earlier great administrations without provenance are not forced into a new schedule.
const legacy=fixture();legacy[1].calendarHerbPotionAdminister.poisonGreatTracked=undefined;
eq(pendingGreatPoisons(legacy,c).length,0);
console.log('PASS',n,'Great ingested poison: tracked rounds, original Course, provenance, tamper proof, no double onset; weapon gate (not yet an automated hit)');
