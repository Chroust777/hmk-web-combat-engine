'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js'),F=require('../src/integration/hmk-alchemy-footpad-skill.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
let tests=0;const eq=(a,b)=>{assert.deepEqual(a,b);tests++},yes=x=>{assert.ok(x);tests++},no=(f,r)=>{assert.throws(f,r);tests++};
function row(id,minute,actor,key,value,campaign='C'){return {id,characterId:actor,calendarCampaignId:campaign,campaignMinute:minute,title:id,body:id,[key]:value}}
function fixture(name='Footpad',actor='A',vial='vial1',campaign='C'){
 const start=A.createAlchemyStart({campaignId:campaign,minute:0,actorId:actor,alchemyML:80,elixirName:name,sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const result=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});result.secondarySVBonus=1;
 const skill={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:result,gmModifiers:[start.sunsignModifier],helpers:[]};
 let journal=[row('start'+vial,0,actor,'calendarAlchemyStart',start,campaign),row('skill'+vial,start.dueMinute,actor,'skillTestProof',skill,campaign)];
 const n=Math.max(0,Math.min(5,result.sv-4));
 const finish=A.createAlchemyFinish({journal,campaignId:campaign,minute:start.dueMinute,actorId:actor,startId:'start'+vial,skillId:'skill'+vial,gmContinuityConfirmed:true,augmentationD10:Array(n).fill(10),augmentationOrigins:Array(n).fill('manual')});
 const finishId='finish'+vial;journal.push(row(finishId,start.dueMinute,actor,'calendarAlchemyFinish',finish,campaign));
 const inventory=[{id:vial,characterId:actor,sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{name:'Vial, 4 oz',properties:{weightLb:0.25}}}];
 const bind=V.createAlchemyVialBinding({journal,inventory,campaignId:campaign,minute:start.dueMinute,actorId:actor,finishId,vialId:vial,confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
 journal.push(row('bind'+vial,start.dueMinute,actor,'calendarAlchemyVialBinding',bind,campaign));
 return {journal,inventory,minute:start.dueMinute,campaign,finishId,actor,base:finish.baseAS};
}
function drink(a,roll=42,target='B'){
 const opts={journal:a.journal,inventory:a.inventory,campaignId:a.campaign,minute:a.minute,actorId:a.actor,targetId:target,finishId:a.finishId,testSkill:'Aura',ml:80,d100:roll,origin:'manual',emptyId:'empty'+a.finishId,gmConfirmed:true};
 const proof=I.createAlchemyFootpadImbibing(opts);
 const empty=V.createAlchemyVialEmpty({journal:a.journal,inventory:a.inventory,campaignId:a.campaign,minute:a.minute,actorId:a.actor,finishId:a.finishId,reason:'Footpad swallowed',confirmedByGM:true});
 const journal=[...a.journal,row(opts.emptyId,a.minute,a.actor,'calendarAlchemyVialEmpty',empty,a.campaign),row('use'+a.finishId,a.minute,a.actor,'calendarAlchemyImbibing',proof,a.campaign)];
 return {journal,proof,opts,useId:'use'+a.finishId};
}
const a=fixture();yes(a.base>=6);const u=drink(a);eq(u.proof.sl,'S');eq(u.proof.temporary,true);eq(u.proof.finalAS,a.base);eq(u.proof.illEffect,null);
eq(I.validateAlchemyImbibingJournal(u.journal),true);eq(I.activeFootpad(u.journal,'C','B',a.minute).length,1);
eq(I.activeFootpad(u.journal,'C','A',a.minute).length,0);eq(I.activeFootpad(u.journal,'OTHER','B',a.minute).length,0);
let e=F.footpadSkillEvidence({journal:u.journal,campaignId:'C',minute:a.minute,actorId:'B',skill:'Stealth'});
eq(e.activeAS,a.base);eq(e.modifier,a.base*5);eq(e.sourceIds,[u.useId]);
let mastery=F.footpadMastery({kind:'skill',name:'Stealth',ml:60,index:6},e);
eq(mastery.ml,60+a.base*5);eq(mastery.footpadBaseML,60);
const original=S.resolveSkillTest({ml:60,roll:80}),boosted=S.resolveSkillTest({ml:mastery.ml,roll:80});
yes(boosted.rawEML>original.rawEML);eq(boosted.ml,60+a.base*5);eq(boosted.index,Math.floor((60+a.base*5)/10));
for(const skill of ['Legerdemain','Awareness','Initiative','Melee','Cookery']){
 const q=F.footpadSkillEvidence({journal:u.journal,campaignId:'C',minute:a.minute,actorId:'B',skill});eq(q.modifier,0);}
e=F.footpadSkillEvidence({journal:u.journal,campaignId:'C',minute:a.minute,actorId:'B',skill:'Legerdemain',silenceConfirmed:true});eq(e.modifier,a.base*5);
e=F.footpadSkillEvidence({journal:u.journal,campaignId:'C',minute:a.minute,actorId:'B',skill:'Stealth',auralShockLevels:1});eq(e.suspended,true);eq(e.modifier,0);
no(()=>F.footpadSkillEvidence({journal:u.journal,campaignId:'C',minute:-1,actorId:'B',skill:'Stealth'}),/čas/);
no(()=>F.footpadMastery({ml:995}, {modifier:10,sourceIds:['x']}),/přesahuje/);
for(const [change,regex] of [[{d100:0},/d100/],[{ml:0},/d100/],[{gmConfirmed:false},/GM/],[{campaignId:'OTHER'},/dokončen|chybí/],[{actorId:'B'},/vlastnictví/],[{minute:a.minute+31*1440},/Decay/]]){
 no(()=>I.createAlchemyFootpadImbibing({...u.opts,...change}),regex);
}
no(()=>I.createAlchemyFootpadImbibing({...u.opts,journal:u.journal}),/použit|dostupná/);
const cf=I.createAlchemyFootpadImbibing({...u.opts,d100:85});eq(cf.sl,'CF');eq(cf.finalAS,a.base-2);eq(cf.illEffect.levels,1);
const effect=I.applyAlchemyFootpadAural({state:initialCombatState(),arcane:{auralShockLevels:0},proof:cf,eventId:'foot-cf'});
eq(effect.arcane.auralShockLevels,1);eq(effect.state.fatigue.otherWeakness,5);eq(effect.state.events.at(-1).type,'hmk-alchemy-footpad-aural');
no(()=>I.applyAlchemyFootpadAural({state:effect.state,arcane:effect.arcane,proof:cf,eventId:'foot-cf'}),/duplicit/);
no(()=>I.applyAlchemyFootpadAural({state:initialCombatState(),arcane:{},proof:{...cf,d100:84},eventId:'wrong'}),/důkaz/);
const recovered=require('../src/integration/hmk-spell-aural-recovery.js').availableSpellAuralRecoveries({characters:[{id:'B',name:'B',hmk:{attributes:{wil:14},combatState:effect.state,arcane:effect.arcane}}]});eq(recovered.length,1);
const due=a.minute+30*1440,decay=D.createAlchemyDecay({journal:u.journal,campaignId:'C',minute:due,actorId:'A',finishId:a.finishId,d10:1,origin:'manual',gmConfirmed:true});
const aged=[...u.journal,row('decay',due,'A','calendarAlchemyDecay',decay)];
eq(F.footpadSkillEvidence({journal:aged,campaignId:'C',minute:due,actorId:'B',skill:'Stealth'}).modifier,(a.base-1)*5);
const psychic=fixture('Physic','P','p1');const merged=[...u.journal,...psychic.journal];
const physic=I.createAlchemyPhysicImbibing({journal:merged,inventory:psychic.inventory,campaignId:'C',minute:a.minute,actorId:'P',targetId:'B',finishId:psychic.finishId,testSkill:'Aura',ml:80,d100:42,origin:'manual',emptyId:'phys-empty',gmConfirmed:true});
eq(physic.physicEffects.length,1);eq(physic.physicEffects[0].finishId,a.finishId);
const physicCF=I.createAlchemyPhysicImbibing({journal:merged,inventory:psychic.inventory,campaignId:'C',minute:a.minute,actorId:'P',targetId:'B',finishId:psychic.finishId,testSkill:'Aura',ml:80,d100:85,origin:'manual',emptyId:'phys-empty',gmConfirmed:true});eq(physicCF.profusionIllEffects[0].sourceElixir,'Footpad');
const second=fixture('Footpad','X','x1');const mixed=[...u.journal,...second.journal];
const footCF=I.createAlchemyFootpadImbibing({journal:mixed,inventory:second.inventory,campaignId:'C',minute:a.minute,actorId:'X',targetId:'B',finishId:second.finishId,testSkill:'Aura',ml:80,d100:83,origin:'manual',emptyId:'unused',gmConfirmed:true});eq(footCF.sl,'CF');eq(footCF.profusionIllEffects[0].sourceElixir,'Footpad');
const safe=I.createAlchemyFootpadImbibing({journal:mixed,inventory:second.inventory,campaignId:'C',minute:a.minute,actorId:'X',targetId:'B',finishId:second.finishId,testSkill:'Aura',ml:80,d100:42,origin:'manual',emptyId:'unused',gmConfirmed:true});eq(safe.otherActiveElixirs,1);
eq(I.assertAlchemyImbibingAppendOnly(u.journal,structuredClone(u.journal)),true);
no(()=>I.assertAlchemyImbibingAppendOnly(u.journal,u.journal.slice(0,-1)),/nelze/);
no(()=>I.validateAlchemyImbibingJournal([...u.journal.slice(0,-1),{...u.journal.at(-1),calendarAlchemyImbibing:{...u.proof,d100:80}}]),/změněn/);
console.log('PASS Alchemy Footpad 430:',tests,'assertions');
