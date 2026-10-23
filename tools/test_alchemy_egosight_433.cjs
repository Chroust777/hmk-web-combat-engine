'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const original=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return original(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js'),E=require('../src/integration/hmk-alchemy-egosight.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
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
const f=prepared(),used=imbibe(f);eq(used.proof.elixirName,'Egosight');eq(used.proof.sl,'S');eq(used.proof.temporary,true);eq(used.proof.finalAS,f.base);eq(used.proof.otherActiveElixirs,0);
yes(I.validateAlchemyImbibingJournal(used.journal));
const ctx=E.egosightTouchContext({journal:used.journal,campaignId:'C',minute:f.minute,actorId:'B'});eq(ctx.active,true);eq(ctx.strengths[0].as,f.base);eq(ctx.sourceUseIds,['usee']);
const common={journal:used.journal,campaignId:'C',minute:f.minute,actorId:'B',artefactReference:'Alazar Amber Ring',gmConfirmed:true,touchedConfirmed:true};
const minor=E.createEgosightTouch({...common,gmClassification:'minor'});eq(minor.gmClassification,'minor');eq(minor.learnedPowers,false);eq(minor.learnedExactWill,false);eq(minor.sourceUseIds,['usee']);
const major=E.createEgosightTouch({...common,artefactReference:'Ancient Shield A',gmClassification:'major-ego',ego:13,egoSubversion:false});eq(major.ego,13);eq(major.egoSubversion,false);
const will=E.createEgosightTouch({...common,artefactReference:'Living Blade C',gmClassification:'major-will'});yes(!('ego' in will));
const viewJournal=[...used.journal,row('touch1',f.minute,'B','calendarAlchemyEgosightTouch',minor),row('touch2',f.minute,'B','calendarAlchemyEgosightTouch',major),row('touch3',f.minute,'B','calendarAlchemyEgosightTouch',will)];
yes(E.validateEgosightTouchJournal(viewJournal));yes(E.assertEgosightTouchAppendOnly(viewJournal,structuredClone(viewJournal)));
no(()=>E.assertEgosightTouchAppendOnly(viewJournal,viewJournal.filter(x=>x.id!=='touch1')),/důkaz/);
let tampered=structuredClone(viewJournal);tampered.find(x=>x.id==='touch2').calendarAlchemyEgosightTouch.ego=99;
no(()=>E.assertEgosightTouchAppendOnly(viewJournal,tampered),/důkaz/);
for(const [opts,error] of [
 [{gmConfirmed:false},/GM/],[{touchedConfirmed:false},/GM/],
 [{actorId:'X'},/není využitelný/],[{campaignId:'D'},/není využitelný/],
 [{auralShockLevels:1},/není využitelný/],
 [{artefactReference:' '},/označení/],[{gmClassification:'ghost'},/druh/],
 [{gmClassification:'minor',ego:13},/minor/],
 [{gmClassification:'major-will',ego:13},/minor/],
 [{gmClassification:'major-ego',ego:null,egoSubversion:false},/Ego/],
 [{gmClassification:'major-ego',ego:10,egoSubversion:null},/Ego/],
 [{journal:viewJournal},/tentýž dotyk/]
 ])no(()=>E.createEgosightTouch({...common,gmClassification:'minor',...opts}),error);
const cf=imbibe(prepared('Egosight','cf'),95);eq(cf.proof.sl,'CF');yes(!!cf.proof.illEffect);
const healed=I.applyAlchemyEgosightAural({state:initialCombatState(),arcane:{},proof:cf.proof,eventId:'usecf'});eq(healed.arcane.auralShockLevels,1);eq(healed.state.fatigue.otherWeakness,5);
no(()=>I.applyAlchemyEgosightAural({state:healed.state,arcane:healed.arcane,proof:cf.proof,eventId:'usecf'}),/zdvojený/);
yes(I.validateAlchemyImbibingJournal(cf.journal));
const zero=imbibe(prepared('Egosight','zero'),99);eq(zero.proof.sl,'F');eq(zero.proof.modifier,-1);
const wrong=prepared('Darkvision','dv');no(()=>I.createAlchemyEgosightImbibing({journal:wrong.journal,inventory:wrong.inventory,campaignId:'C',minute:wrong.minute,actorId:'A',targetId:'B',finishId:wrong.finishId,testSkill:'Aura',ml:80,d100:42,origin:'manual',emptyId:'empty',gmConfirmed:true}),/Egosight/);
// Secondary CF Egosight is based on the same immutable source that was drunk earlier.
const other=prepared('Footpad','fp');
const otherJournal=[...used.journal,...other.journal];
const otherOpts={journal:otherJournal,inventory:other.inventory,campaignId:'C',minute:other.minute,actorId:'A',targetId:'B',finishId:other.finishId,testSkill:'Aura',ml:80,d100:83,origin:'manual',emptyId:'emptyfp',gmConfirmed:true};
const otherProof=I.createAlchemyFootpadImbibing(otherOpts);eq(otherProof.sl,'CF');eq(otherProof.profusionIllEffects?.[0]?.sourceElixir,'Egosight');
const trigger='usefp';const pending=[...otherJournal,row(trigger,other.minute,'A','calendarAlchemyImbibing',otherProof)];
const secondary=I.createEgosightProfusionIll({journal:pending,campaignId:'C',minute:other.minute,triggerUseId:trigger,sourceUseId:'usee',targetId:'B'});
eq(secondary.elixirName,'Egosight');
const secondaryResult=I.applyEgosightProfusionAural({journal:pending,state:initialCombatState(),arcane:{},proof:secondary,eventId:'secondary-egosight'});eq(secondaryResult.arcane.auralShockLevels,1);
yes(I.validateEgosightProfusionJournal([...pending,row('secondary-egosight',other.minute,'B','calendarAlchemyEgosightProfusionIll',secondary)]));
no(()=>I.validateEgosightProfusionJournal(pending),/chybí důkaz/);
no(()=>I.createEgosightProfusionIll({journal:pending,campaignId:'WRONG',minute:other.minute,triggerUseId:trigger,sourceUseId:'usee',targetId:'B'}),/spouštěcí/);
// Physic references an existing dose and cannot silently lose its Egosight effects.
const physic=prepared('Physic','ph');const p=I.createAlchemyPhysicImbibing({journal:[...used.journal,...physic.journal],inventory:physic.inventory,campaignId:'C',minute:physic.minute,actorId:'A',targetId:'B',finishId:physic.finishId,testSkill:'Aura',ml:80,d100:42,origin:'manual',emptyId:'emptyph',gmConfirmed:true});
eq(p.physicEffects.some(x=>x.sourceUseId==='usee'),true);
// Original campaign, original AS, no new timeline, no invented physical object.
const afterPhysic=prepared('Egosight','diff','D');eq(I.activeEgosight(used.journal,'D','B',f.minute).length,0);eq(I.activeEgosight(used.journal,'C','B',f.minute).length,1);
console.log('Alchemy Egosight 433:',n,'assertions passed');
