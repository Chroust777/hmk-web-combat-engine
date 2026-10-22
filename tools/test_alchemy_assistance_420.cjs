'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js');
const {resolveSkillTest}=require('../src/integration/hmk-skill-test-engine.js');
let n=0;const eq=(x,y)=>{assert.deepEqual(x,y);n++},ok=x=>{assert.ok(x);n++},bad=(f,pattern)=>{assert.throws(f,pattern);n++};
const row=(id,c,m,a,key,value)=>({id,calendarCampaignId:c,campaignMinute:m,characterId:a,[key]:value,title:id,body:id});
const args=(assistantPlan,campaignId='C',journal=[],actorId='A',minute=0,alchemyML=100)=>({journal,campaignId,minute,actorId,alchemyML,elixirName:'Healing',sunsign:'Ùlándus',workshopSource:'private',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual'],assistantPlan});
function proof(ml,plan,sunsign){
 const participants=plan.map(x=>x.ml),r=resolveSkillTest({ml,roll:41,secondaryMLs:[65,70],assistants:participants,gmModifier:sunsign});
 return {type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:9,tn:5,success:false,sourcePage:268},a:r,gmModifiers:[sunsign],helpers:plan.map(h=>({actorId:h.actorId,skill:'Alchemy',ml:h.ml}))};
}
const start=A.createAlchemyStart(args([{actorId:'B',ml:40},{actorId:'C',ml:51}]));
eq(start.assistantPlan,[{actorId:'B',ml:40},{actorId:'C',ml:51}]);eq(start.durationDays,16);eq(start.dueMinute,23040);
let J=[row('start','C',0,'A','calendarAlchemyStart',start)];
const p=proof(100,start.assistantPlan,start.sunsignModifier);eq(p.a.assistantChecks.map(x=>x.eligible),[false,true]);eq(p.a.assistance,5);
J.push(row('skill','C',start.dueMinute,'A','skillTestProof',p));
const base={journal:J,campaignId:'C',minute:start.dueMinute,actorId:'A',startId:'start',skillId:'skill',gmContinuityConfirmed:true};
const count=Math.max(0,Math.min(5,p.a.sv-4));const finish=A.createAlchemyFinish({...base,augmentationD10:Array(count).fill(1),augmentationOrigins:Array(count).fill('manual')});
eq(finish.assistanceBonus,5);eq(finish.assistantPlan,start.assistantPlan);eq(finish.primaryRoll,41);eq(finish.preparationSV,p.a.sv);eq(finish.result,'completed');
J.push(row('finish','C',start.dueMinute,'A','calendarAlchemyFinish',finish));eq(A.validateAlchemyJournal(J),true);eq(A.assertAlchemyAppendOnly(J,structuredClone(J)),true);
const wrongJ=J.slice(0,2).map(x=>structuredClone(x));wrongJ[1].skillTestProof.helpers.reverse();bad(()=>A.createAlchemyFinish({...base,journal:wrongJ,augmentationD10:finish.augmentationD10,augmentationOrigins:finish.augmentationOrigins}),/pomocníci/);
const wrongML=J.slice(0,2).map(x=>structuredClone(x));wrongML[1].skillTestProof.helpers[0].ml=45;bad(()=>A.createAlchemyFinish({...base,journal:wrongML,augmentationD10:finish.augmentationD10,augmentationOrigins:finish.augmentationOrigins}),/pomocníci/);
const wrongBonus=J.slice(0,2).map(x=>structuredClone(x));wrongBonus[1].skillTestProof.a.assistance=10;bad(()=>A.createAlchemyFinish({...base,journal:wrongBonus,augmentationD10:finish.augmentationD10,augmentationOrigins:finish.augmentationOrigins}),/Assistance\/EML/);
const wrongEML=J.slice(0,2).map(x=>structuredClone(x));wrongEML[1].skillTestProof.a.rawEML+=10;bad(()=>A.createAlchemyFinish({...base,journal:wrongEML,augmentationD10:finish.augmentationD10,augmentationOrigins:finish.augmentationOrigins}),/Assistance\/EML/);
const modified=structuredClone(J);modified[0].calendarAlchemyStart.assistantPlan[0].ml=41;bad(()=>A.validateAlchemyJournal(modified),/historický důkaz|asist|změněn|pomocníci/);
bad(()=>A.createAlchemyStart(args([{actorId:'B',ml:39}])),/ML40/);
bad(()=>A.createAlchemyStart(args([{actorId:'B',ml:50},{actorId:'B',ml:60}])),/ML40/);
bad(()=>A.createAlchemyStart(args([{actorId:'A',ml:60}])),/ML40/);
bad(()=>A.createAlchemyStart(args([{actorId:'B',ml:50},{actorId:'C',ml:50},{actorId:'D',ml:50}])),/nejvýše dva/);
bad(()=>A.createAlchemyStart(args([{actorId:'B',ml:50}],'C',J.slice(0,1),'B',1,80)),/již připravuje/);
bad(()=>A.createAlchemyStart(args([], 'C',J.slice(0,1),'B',1,80)),/již připravuje/);
bad(()=>A.createAlchemyStart(args([{actorId:'B',ml:70}],'C',J.slice(0,1),'D',1,80)),/přidělen/);
// Campaign separation; an Assistant in campaign C can operate in independent campaign D.
const isolated=A.createAlchemyStart(args([{actorId:'B',ml:50}],'D',J.slice(0,1),'D',1,80));eq(isolated.assistantPlan.length,1);
// Index cap +10; ML40+ without reaching half primary ML contributes zero.
const top=proof(100,[{actorId:'B',ml:95},{actorId:'C',ml:90}],15);eq(top.a.assistance,10);eq(top.a.assistantChecks.map(x=>x.eligible),[true,true]);
const none=proof(100,[{actorId:'B',ml:40},{actorId:'C',ml:49}],15);eq(none.a.assistance,0);
// Explicit [] is a valid new start but cannot inherit unplanned assistance.
const empty=A.createAlchemyStart(args([],'E'));eq(empty.assistantPlan,[]);eq(A.validateAlchemyJournal([row('empty','E',0,'A','calendarAlchemyStart',empty)]),true);
const erow=[row('empty','E',0,'A','calendarAlchemyStart',empty),row('p','E',empty.dueMinute,'A','skillTestProof',proof(100,[{actorId:'B',ml:90}],empty.sunsignModifier))];
bad(()=>A.createAlchemyFinish({journal:erow,campaignId:'E',minute:empty.dueMinute,actorId:'A',startId:'empty',skillId:'p',gmContinuityConfirmed:true,augmentationD10:[],augmentationOrigins:[]}),/pomocníci/);
// Old proof shape remains unchanged, including an old mid-campaign preparation.
const legacy=A.createAlchemyStart({...args(null,'L'),assistantPlan:null});eq(Object.hasOwn(legacy,'assistantPlan'),false);eq(A.validateAlchemyJournal([row('old','L',0,'A','calendarAlchemyStart',legacy)]),true);
// Interrupted prep keeps previous journal; assistant can join a new one after abort.
let concurrent=[row('old-start','X',0,'A','calendarAlchemyStart',A.createAlchemyStart(args([{actorId:'B',ml:60}],'X')))];
const abort=A.createAlchemyAbort({journal:concurrent,campaignId:'X',minute:1,actorId:'A',startId:'old-start',reason:'GM confirmed interruption',gmConfirmed:true});concurrent.push(row('abort','X',1,'A','calendarAlchemyAbort',abort));
eq(A.createAlchemyStart(args([{actorId:'B',ml:60}],'X',concurrent,'D',2,80)).assistantPlan[0].actorId,'B');
console.log('PASS',n,'Alchemy Assistance: planning ML40+, eligible half-ML, Index +10 cap, Workbench original EML, overlap, immutable replay, campaigns, backward compatibility');
