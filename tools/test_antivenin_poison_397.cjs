'use strict';
/** HMK p.75 Antivenin -> original p.184/186 Poison Course.
 * Reproducible offline source tests, no UI or simulated GM clock advance.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const {preparePoisonStart,preparePoisonOnset,preparePoisonCourse}=require('../src/integration/hmk-poison-course.js');
const {createHerbPotionAdministration,validateHerbAdministrationJournal,assertHerbAdministrationAppendOnly}=require('../src/integration/hmk-herbal-administration.js');
const {antiveninPoisonEvidence}=require('../src/integration/hmk-herbal-antivenin-bridge.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=x=>{assert.ok(x);n++},bad=(cb,re)=>{assert.throws(cb,re);n++};
const campaignId='campaign-A',patient='patient-A',sourceId='serpent-venom-A',timelineId='combat-A';
const actor={id:patient,name:'Patient',hmk:{attributes:{end:12,wil:10},skills:[]}};
const getCourseState=()=>{
 let state=initialCombatState();
 state=preparePoisonStart({actor,state,round:1,sourceId,transmission:'vector',onsetMinutes:10,periodMinutes:10,initialHR:4,symptomD10s:[1,2,3,4],actualExposureConfirmed:true,gmConfirmed:true}).state;
 state=preparePoisonOnset({actor,state,round:1,sourceId,elapsedMinutes:10,gmConfirmed:true}).state;
 return state;
};
const complete=(id,potency=2,sv=8)=>({id,characterId:'healer',calendarCampaignId:campaignId,campaignMinute:5,calendarHerbPotionComplete:{format:'hmk-herb-potion-complete-v1',campaignId,minute:5,actorId:'healer',herbType:'antivenin',potency,sv,usable:true,expiryMinute:1000}});
function proof(potency=2,{adminMinute=15,proofId='give-1',source=sourceId,sourceCampaign=campaignId,anchor=null,patientId=patient}={}){
 const c=complete('make-'+proofId,potency);
 const p=createHerbPotionAdministration({journal:[c],campaignId,minute:adminMinute,actorId:'healer',completeId:c.id,targetId:patientId,method:'ingested',poisonSourceId:source,gmConfirmed:true,memberIds:['healer',patientId],combatAnchor:anchor});
 const application={id:proofId,characterId:'healer',calendarCampaignId:sourceCampaign,campaignMinute:adminMinute,calendarHerbPotionAdminister:p};
 return {journal:[c,application],application,p};
}
const options=(journal,minute=20,other={})=>({journal,campaignId,minute,targetId:patient,sourceId,poisonOriginMinute:0,...other});
const course=(journal,minute=20,roll=56,other={})=>preparePoisonCourse({actor,state:getCourseState(),round:1,sourceId,elapsedMinutes:20,courseD100:roll,gmConfirmed:true,
 herbalContext:{journal,campaignId,minute,poisonOriginMinute:0,...other}});
const p2=proof(2);eq(p2.p.bonus,16);eq(p2.p.poisonSourceId,sourceId);eq(validateHerbAdministrationJournal(p2.journal),true);
eq(antiveninPoisonEvidence(options(p2.journal)).bonus,16);
const no=preparePoisonCourse({actor,state:getCourseState(),round:1,sourceId,elapsedMinutes:20,courseD100:56,gmConfirmed:true});
const yes=course(p2.journal);ok(yes.report.rawEML===no.report.rawEML+16);
eq(yes.report.antivenin.sourceIds,['give-1']);eq(yes.report.antivenin.completeIds,['make-give-1']);
eq(yes.report.antivenin.poisonSourceId,sourceId);eq(yes.state.events.at(-1).details.antivenin.bonus,16);
eq(yes.report.courseD100,56);ok(yes.report.sl!==no.report.sl);
eq(yes.report.elapsedMinutes,20);eq(yes.state.toxinCourses[0].elapsedMinutes,20);
// Rule onset: Mild +10 min; Strong +1 min; Great +1 combat round.
for(const [potency,now,expected] of [[1,24,0],[1,25,8],[2,15,0],[2,16,16],[3,15,32]]){
 const x=proof(potency,{proofId:'roll-'+potency});
 if(potency===3&&now===15)bad(()=>antiveninPoisonEvidence(options(x.journal,now)),/Great onset/);
 else eq(antiveninPoisonEvidence(options(x.journal,now)).bonus,expected);
}
const great=proof(3,{adminMinute:20,proofId:'great',anchor:{confirmedByGM:true,round:10,campaignMinute:20,timelineId}});
eq(antiveninPoisonEvidence(options(great.journal,20,{combatRound:10,timelineId})).bonus,0);
eq(antiveninPoisonEvidence(options(great.journal,20,{combatRound:11,timelineId})).bonus,32);
bad(()=>antiveninPoisonEvidence(options(great.journal,20,{combatRound:11,timelineId:'other'})),/Great onset/);
bad(()=>antiveninPoisonEvidence(options(great.journal,20,{combatRound:9,timelineId})),/Great onset/);
eq(antiveninPoisonEvidence(options(great.journal,21)).bonus,32);
// It is never permitted to infer source, patient, campaign or temporal provenance.
eq(antiveninPoisonEvidence(options(p2.journal,20,{sourceId:'other-poison'})).bonus,0);
eq(antiveninPoisonEvidence(options(p2.journal,20,{targetId:'another-patient'})).bonus,0);
eq(antiveninPoisonEvidence(options(p2.journal,20,{campaignId:'other-campaign'})).bonus,0);
bad(()=>antiveninPoisonEvidence(options(p2.journal,20,{poisonOriginMinute:18})),/časové větvi/);
bad(()=>course(p2.journal,21),/doložené minutě/);
bad(()=>course(p2.journal,19),/doložené minutě/);
const tamper=structuredClone(p2.journal);tamper[1].calendarHerbPotionAdminister.bonus=200;
bad(()=>antiveninPoisonEvidence(options(tamper)),/neodpovídá/);
const tamperSource=structuredClone(p2.journal);tamperSource[1].calendarHerbPotionAdminister.poisonSourceId='other-poison';
bad(()=>assertHerbAdministrationAppendOnly(p2.journal,tamperSource),/nelze změnit/);
const double=[...p2.journal,...proof(1,{adminMinute:10,proofId:'second'}).journal];
bad(()=>antiveninPoisonEvidence(options(double)),/více současně účinných/);
const legacy=complete('legacy-make',2);const legacyP=createHerbPotionAdministration({journal:[legacy],campaignId,minute:15,actorId:'healer',completeId:legacy.id,targetId:patient,method:'ingested',gmConfirmed:true,memberIds:['healer',patient]});
const legacyJournal=[legacy,{id:'legacy-use',characterId:'healer',calendarCampaignId:campaignId,campaignMinute:15,calendarHerbPotionAdminister:legacyP}];
eq(validateHerbAdministrationJournal(legacyJournal),true);
eq(antiveninPoisonEvidence(options(legacyJournal)).bonus,0);
// No effect is applied automatically at administration; no GM-clock mutation.
const snapshot=JSON.stringify(p2.journal),stateBefore=JSON.stringify(getCourseState());
course(p2.journal);eq(JSON.stringify(p2.journal),snapshot);eq(JSON.stringify(getCourseState()),stateBefore);
// Further refusal cases.
bad(()=>createHerbPotionAdministration({journal:[complete('m2',2)],campaignId,minute:15,actorId:'healer',completeId:'m2',targetId:patient,method:'ingested',poisonSourceId:'x',gmConfirmed:true,memberIds:['healer',patient]}),/jednoznačný/);
bad(()=>createHerbPotionAdministration({journal:[complete('m3',2)],campaignId,minute:15,actorId:'healer',completeId:'m3',targetId:patient,method:'ingested',poisonSourceId:sourceId,gmConfirmed:false,memberIds:['healer',patient]}),/GM/);
eq(course(p2.journal,20,56,{campaignId:'another'}).report.antivenin.bonus,0); // no leaked evidence into another campaign
console.log('PASS',n,'Antivenin onset, poison-source association, original course, audit, campaign and GM time');
