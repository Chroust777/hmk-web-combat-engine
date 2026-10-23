'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const original=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return original(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js'),E=require('../src/integration/hmk-alchemy-egosight.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const Acid=require('../src/integration/hmk-alchemy-acid-applied.js');
const AW=require('../src/integration/hmk-alchemy-acid-weapon.js');
const {qualityImpactPenalty}=require('../src/rules/weapon-damage.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
let n=0;const eq=(x,y)=>{assert.deepEqual(x,y);n++},yes=x=>{assert.ok(x);n++},no=(fn,re)=>{assert.throws(fn,re);n++};
function row(id,minute,actor,key,value,campaign='C'){return {id,characterId:actor,calendarCampaignId:campaign,campaignMinute:minute,[key]:value};}
function prepared(name='Egosight',tag='e',campaign='C'){
 const actor='A',vial='vial'+tag;
 const start=A.createAlchemyStart({campaignId:campaign,minute:0,actorId:actor,alchemyML:80,elixirName:name,sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const result=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});result.secondarySVBonus=1;
 const skill={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:result,gmModifiers:[start.sunsignModifier],helpers:[]};
 const j=[row('start'+tag,0,actor,'calendarAlchemyStart',start,campaign),row('skill'+tag,start.dueMinute,actor,'skillTestProof',skill,campaign)];
 const rolls=Math.max(0,Math.min(5,result.sv-4));
 const finish=A.createAlchemyFinish({journal:j,campaignId:campaign,minute:start.dueMinute,actorId:actor,startId:'start'+tag,skillId:'skill'+tag,gmContinuityConfirmed:true,augmentationD10:Array(rolls).fill(10),augmentationOrigins:Array(rolls).fill('manual')});
 const finishId='finish'+tag;j.push(row(finishId,start.dueMinute,actor,'calendarAlchemyFinish',finish,campaign));
 const inventory=[{id:vial,characterId:actor,sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{name:'Vial, 4 oz',properties:{weightLb:0.25}}}];
 const bind=V.createAlchemyVialBinding({journal:j,inventory,campaignId:campaign,minute:start.dueMinute,actorId:actor,finishId,vialId:vial,confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
 j.push(row('bind'+tag,start.dueMinute,actor,'calendarAlchemyVialBinding',bind,campaign));
 return {journal:j,inventory,finishId,minute:start.dueMinute,campaign,actor,base:finish.baseAS,tag};
}
function imbibe(fix,d100=41,targetId='B',initial=null){
 const journal=initial??fix.journal,opts={journal,inventory:fix.inventory,campaignId:fix.campaign,minute:fix.minute,actorId:fix.actor,targetId,finishId:fix.finishId,testSkill:'Aura',ml:80,d100,origin:'manual',emptyId:'empty'+fix.tag,gmConfirmed:true};
 const proof=I.createAlchemyEgosightImbibing(opts),empty=V.createAlchemyVialEmpty({journal,inventory:fix.inventory,campaignId:fix.campaign,minute:fix.minute,actorId:fix.actor,finishId:fix.finishId,reason:'Egosight imbibed',confirmedByGM:true});
 const useId='use'+fix.tag;
 return {proof,useId,journal:[...journal,row(opts.emptyId,fix.minute,fix.actor,'calendarAlchemyVialEmpty',empty,fix.campaign),row(useId,fix.minute,fix.actor,'calendarAlchemyImbibing',proof,fix.campaign)]};
}



const O=require('../src/integration/hmk-alchemy-applied-objects.js');
const w={id:'sword',characterId:'A',quantity:1,slot:'main_hand',sourceItemId:'weapon',currentWQ:2,
 snapshot:{name:'Sword',category:'weapon',properties:{weightLb:3,quality:5}}};
const b={id:'broken',characterId:'A',quantity:1,slot:'carried',condition:'broken in two',
 snapshot:{name:'Broken artifact',category:'other',properties:{weightLb:2}}};
const f=prepared('Mending','m');f.inventory.push(w,b);
const vars={journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,
 accessConfirmed:true,gmConfirmed:true};
const repair=O.createAlchemyMending({...vars,targetItemIds:['sword','broken']});
eq(repair.targets.length,2);eq(repair.totalWeightLb,5);eq(repair.maximumWeightLb,repair.asAtApplication*2);
no(()=>O.createAlchemyMending({...vars,targetItemIds:['sword','sword']}),/distinct/);
no(()=>O.createAlchemyMending({...vars,targetItemIds:['missing']}),/missing/);
no(()=>O.createAlchemyMending({...vars,targetItemIds:[]}),/choose/);
const acidItem={id:'acidpeg',characterId:'A',quantity:1,slot:'carried',
 snapshot:{name:'Acid-damaged peg',category:'other',properties:{weightLb:1}}};
f.inventory.push(acidItem);
const witness=[...f.journal,
 row('acidStart',f.minute,'A','calendarAlchemyAcidApply',{targetItemId:'acidpeg',asAtApplication:1,destroyAtSuccesses:5}),
 row('acidRoll',f.minute,'A','calendarAlchemyAcidRound',{applicationId:'acidStart',targetItemId:'acidpeg',success:true,asAfter:0,successesAfter:1})];
eq(O.alchemyAcidObjectDamage(witness,'C','acidpeg',f.minute),1);
const recovered=O.createAlchemyMending({...vars,journal:witness,targetItemIds:['acidpeg']});
eq(recovered.targets[0].acidObjectDamageBefore,1);
eq(recovered.targets[0].acidObjectDamageAfter,0);
const big={id:'anvil',characterId:'A',quantity:1,slot:'carried',condition:'cracked',snapshot:{name:'Anvil',category:'other',properties:{weightLb:1000}}};
f.inventory.push(big);
no(()=>O.createAlchemyMending({...vars,targetItemIds:['anvil']}),/mass/);
const after=structuredClone(f.inventory);O.applyAlchemyMending(after,repair);
eq(after.find(x=>x.id==='sword').currentWQ,5);eq(after.find(x=>x.id==='broken').condition,'');
eq(f.inventory.find(x=>x.id==='sword').currentWQ,2);
no(()=>O.applyAlchemyMending(after,repair),/WQ drift|changed/);
const empty=V.createAlchemyVialEmpty({...vars,reason:'Mending restored two real objects',confirmedByGM:true});
const jr=[...f.journal,{id:'Mending1',characterId:'A',calendarCampaignId:'C',campaignMinute:f.minute,
 calendarAlchemyMending:repair,calendarAlchemyVialEmpty:empty}];
yes(O.validateAlchemyAppliedObjectJournal(jr));
yes(O.validateAlchemyMendingInventory({journal:jr,inventory:after}));
no(()=>O.validateAlchemyMendingInventory({journal:jr,inventory:f.inventory}),/WQ/);
no(()=>O.validateAlchemyAppliedObjectJournal(jr.map(r=>r.id==='Mending1'?{...r,calendarAlchemyMending:{...repair,totalWeightLb:7}}:r)),/modified/);
no(()=>O.validateAlchemyAppliedObjectJournal(jr.filter(r=>r.id!=='Mending1').concat([{...jr[jr.length-1],calendarAlchemyVialEmpty:null}])),/vial/);
no(()=>O.assertAlchemyAppliedObjectAppendOnly(jr,f.journal),/immutable/);
const noAegis=prepared('Object Aegis','a');
const item={id:'secret',characterId:'A',quantity:1,slot:'carried',snapshot:{name:'Artifact',category:'other',properties:{weightLb:3}}};
noAegis.inventory.push(item);
const ao={journal:noAegis.journal,inventory:noAegis.inventory,campaignId:'C',minute:noAegis.minute,
 actorId:'A',finishId:noAegis.finishId,targetItemId:'secret',accessConfirmed:true,gmConfirmed:true};
const aegis=O.createAlchemyObjectAegis(ao);
eq(aegis.weightLb,3);eq(aegis.maximumWeightLb,aegis.asAtApplication*5);
const ae=V.createAlchemyVialEmpty({...ao,reason:'Object Aegis applied on artifact',confirmedByGM:true});
let journal=[...noAegis.journal,{id:'Aegis1',characterId:'A',calendarCampaignId:'C',campaignMinute:noAegis.minute,
 calendarAlchemyObjectAegis:aegis,calendarAlchemyVialEmpty:ae}];
yes(O.validateAlchemyAppliedObjectJournal(journal));
no(()=>O.createAlchemyObjectAegis({...ao,journal}),/finished effective|original full physical vial/);
const src=(id,kind,level)=>({id,characterId:'A',calendarCampaignId:'C',campaignMinute:noAegis.minute,
 skillTestProof:{type:'single-skill-test',skills:[kind],a:{level,roll:43}}});
journal.push(src('spell1','Attunement','CS'));
const opts={journal,inventory:noAegis.inventory,campaignId:'C',minute:noAegis.minute,applicationId:'Aegis1',
 kind:'Attunement',sourceTestId:'spell1',d10:1,origin:'manual',targetConfirmed:true,gmConfirmed:true};
const t=O.createAlchemyObjectAegisTest(opts);
eq(t.originalLevel,'CS');eq(t.finalLevel,'S');eq(t.asAfter,t.asBefore-1);
no(()=>O.createAlchemyObjectAegisTest({...opts,kind:'Psychometry'}),/wrong skill/);
no(()=>O.createAlchemyObjectAegisTest({...opts,d10:11}),/d10/);
no(()=>O.createAlchemyObjectAegisTest({...opts,targetConfirmed:false}),/confirm/);
journal.push({id:'response1',characterId:'A',calendarCampaignId:'C',campaignMinute:noAegis.minute,calendarAlchemyObjectAegisTest:t});
yes(O.validateAlchemyAppliedObjectJournal(journal));eq(O.alchemyObjectAegisState(journal,'C','Aegis1',noAegis.minute).remainingAS,t.asAfter);
no(()=>O.createAlchemyObjectAegisTest({...opts,journal}),/one Aegis response/);
no(()=>O.validateAlchemyAppliedObjectJournal(journal.map(r=>r.id==='response1'?{...r,calendarAlchemyObjectAegisTest:{...t,asAfter:t.asAfter+1}}:r)),/d10|proof/);
journal.push(src('spell2','Psychometry','F'));
const failed=O.createAlchemyObjectAegisTest({...opts,journal,kind:'Psychometry',sourceTestId:'spell2',d10:10});
eq(failed.success,10<=t.asAfter);eq(failed.finalLevel,'F');
console.log('PASS Applied Mending / Object Aegis 439:',n,'assertions');
