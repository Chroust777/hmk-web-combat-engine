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


const f=prepared('Acid','wq');
const weapon={id:'actualSword',characterId:'A',quantity:1,slot:'main_hand',sourceItemId:'weapon:sample',
 currentWQ:4,snapshot:{name:'Iron sword',category:'weapon',properties:{quality:5,weightLb:3}}};
f.inventory.push(weapon);
const opts={journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,
 targetItemId:weapon.id,weaponConfirmed:true,contactConfirmed:true,gmConfirmed:true};
const a=AW.createAcidWeaponApplication(opts);eq(a.initialWQ,4);eq(a.asAtApplication,f.base);eq(a.noImbibingRoll,true);eq(a.profusionExempt,true);
no(()=>AW.createAcidWeaponApplication({...opts,weaponConfirmed:false}),/GM/);
no(()=>AW.createAcidWeaponApplication({...opts,contactConfirmed:false}),/GM/);
no(()=>AW.createAcidWeaponApplication({...opts,targetItemId:'vialwq'}),/zbraň/);
no(()=>AW.createAcidWeaponApplication({...opts,targetItemId:'missing'}),/zbraň/);
no(()=>AW.createAcidWeaponApplication({...opts,minute:f.minute-1}),/dostupný|Decay|účinný/);
const empty=V.createAlchemyVialEmpty({journal:f.journal,inventory:f.inventory,campaignId:'C',minute:f.minute,actorId:'A',finishId:f.finishId,reason:'Acid applied directly to weapon '+a.targetItemId,confirmedByGM:true});
let journal=[...f.journal,{...row('wa',f.minute,'A','calendarAlchemyAcidWeaponApply',a),calendarAlchemyVialEmpty:empty}];
yes(AW.validateAcidWeaponJournal(journal));yes(AW.validateAcidWeaponInventory({journal,inventory:f.inventory}));
let state=AW.acidWeaponState(journal,'C','wa',f.minute);eq(state.wq,4);eq(state.as,f.base);eq(state.spent,false);
no(()=>AW.createAcidWeaponApplication({...opts,journal}),/dostupný|účinný/);
function round(d10,origin='manual'){
 const args={journal,inventory:f.inventory,campaignId:'C',minute:f.minute,applicationId:'wa',d10,origin,continuousContactConfirmed:true,gmConfirmed:true};
 const proof=AW.createAcidWeaponRound(args);weapon.currentWQ=proof.wqAfter;
 journal.push(row('wr'+proof.round,f.minute,'A','calendarAlchemyAcidWeaponRound',proof));
 return proof;
}
no(()=>AW.createAcidWeaponRound({journal,inventory:f.inventory,campaignId:'C',minute:f.minute,applicationId:'wa',d10:0,origin:'manual',gmConfirmed:true,continuousContactConfirmed:true}),/d10/);
no(()=>AW.createAcidWeaponRound({journal,inventory:f.inventory,campaignId:'C',minute:f.minute,applicationId:'wa',d10:11,origin:'manual',gmConfirmed:true,continuousContactConfirmed:true}),/d10/);
no(()=>AW.createAcidWeaponRound({journal,inventory:f.inventory,campaignId:'C',minute:f.minute,applicationId:'wa',d10:1,origin:'manual',gmConfirmed:false,continuousContactConfirmed:true}),/potvrdit/);
const r1=round(1);eq(r1.success,true);eq(r1.damage,1);eq(r1.wqAfter,3);eq(r1.asAfter,f.base-1);eq(qualityImpactPenalty({baseWQ:5,currentWQ:weapon.currentWQ}),-2);
yes(AW.validateAcidWeaponJournal(journal));yes(AW.validateAcidWeaponInventory({journal,inventory:f.inventory}));
const snapshot=JSON.parse(JSON.stringify(journal));
const wr1=JSON.parse(JSON.stringify(journal));wr1.at(-1).calendarAlchemyAcidWeaponRound.d10=10;
no(()=>AW.validateAcidWeaponJournal(wr1),/poškozený|neplatný/);
no(()=>AW.assertAcidWeaponAppendOnly(snapshot,wr1),/neměnný/);
no(()=>AW.validateAcidWeaponInventory({journal,inventory:[{...weapon,currentWQ:4}]}),/nesouhlasí/);
no(()=>AW.createAcidWeaponRound({journal,inventory:[{...weapon,currentWQ:99}],campaignId:'C',minute:f.minute,applicationId:'wa',d10:1,origin:'manual',gmConfirmed:true,continuousContactConfirmed:true}),/WQ/);
const r2=round(10);eq(r2.success,false);eq(r2.damage,0);eq(r2.wqAfter,3);eq(r2.asAfter,f.base-2);
const r3=round(2);eq(r3.wqAfter,2);eq(r3.round,3);
const r4=round(3);eq(r4.wqAfter,1);eq(r4.round,4);
const r5=round(1);eq(r5.wqAfter,0);eq(r5.round,5);
state=AW.acidWeaponState(journal,'C','wa',f.minute);eq(state.spent,true);eq(state.as,f.base-5);eq(state.wq,0);eq(qualityImpactPenalty({baseWQ:5,currentWQ:weapon.currentWQ}),-5);
yes(AW.validateAcidWeaponJournal(journal));yes(AW.validateAcidWeaponInventory({journal,inventory:f.inventory}));
no(()=>AW.createAcidWeaponRound({journal,inventory:f.inventory,campaignId:'C',minute:f.minute,applicationId:'wa',d10:1,origin:'manual',gmConfirmed:true,continuousContactConfirmed:true}),/nepůsobí/);
// Boundary: old application format and nonweapon object branch remain separate.
eq(journal[0].calendarAlchemyAcidWeaponApply,undefined);
no(()=>AW.acidWeaponState(journal,'C','invalid'),/chybí původní/);
const tamper=JSON.parse(JSON.stringify(journal));tamper.find(x=>x.id==='wa').calendarAlchemyAcidWeaponApply.initialWQ=7;
no(()=>AW.validateAcidWeaponJournal(tamper),/poškozený/);
const tamper2=JSON.parse(JSON.stringify(journal));tamper2.find(x=>x.id==='wa').calendarAlchemyVialEmpty=null;
no(()=>AW.validateAcidWeaponJournal(tamper2),/lahvičky/);
const erased=journal.filter(x=>x.id!=='wr2');
no(()=>AW.assertAcidWeaponAppendOnly(journal,erased),/neměnný/);
// Use verified catalog WQ when no currentWQ has ever been edited.
const fresh={...weapon,id:'unused',currentWQ:null};eq(AW.acidWeaponInitialWQ(fresh),5);
eq(AW.acidWeaponInitialWQ({...fresh,snapshot:{name:'unknown',category:'weapon'}}),null);
eq(AW.acidWeaponInitialWQ({...fresh,quantity:2}),null);
const src=JSON.parse(JSON.stringify(journal));yes(AW.assertAcidWeaponAppendOnly(src,journal));
console.log('PASS Acid weapon WQ 435:',n,'assertions');
