'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js');
const S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js');
const D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js');
const E=require('../src/integration/hmk-alchemy-erudition-skill.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
let checks=0;
function eq(a,b){assert.deepEqual(a,b);checks++}function yes(a){assert.ok(a);checks++}
function no(f,m){assert.throws(f,m);checks++}
function row(id,minute,actor,key,value,campaign='C'){
 return {id,characterId:actor,calendarCampaignId:campaign,campaignMinute:minute,title:id,body:id,[key]:value};
}
function make({campaign='C',name='Erudition',actor='A',vialId='vial1'}={}){
 const start=A.createAlchemyStart({campaignId:campaign,minute:0,actorId:actor,alchemyML:80,elixirName:name,sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const result=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});result.secondarySVBonus=1;
 const skill={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:result,gmModifiers:[start.sunsignModifier],helpers:[]};
 let journal=[row('start'+vialId,0,actor,'calendarAlchemyStart',start,campaign),row('skill'+vialId,start.dueMinute,actor,'skillTestProof',skill,campaign)];
 const n=Math.max(0,Math.min(5,result.sv-4));const finished=A.createAlchemyFinish({journal,campaignId:campaign,minute:start.dueMinute,actorId:actor,startId:'start'+vialId,skillId:'skill'+vialId,gmContinuityConfirmed:true,augmentationD10:Array(n).fill(10),augmentationOrigins:Array(n).fill('manual')});
 const finishId='finish'+vialId; journal.push(row(finishId,start.dueMinute,actor,'calendarAlchemyFinish',finished,campaign));
 const inventory=[{id:vialId,characterId:actor,sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{name:'Vial, 4 oz',properties:{weightLb:.25}}}];
 const bind=V.createAlchemyVialBinding({journal,inventory,campaignId:campaign,minute:start.dueMinute,actorId:actor,finishId,vialId,confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
 journal.push(row('bind'+vialId,start.dueMinute,actor,'calendarAlchemyVialBinding',bind,campaign));
 return {journal,inventory,campaign,minute:start.dueMinute,finishId,actor,base:finished.baseAS};
}
const a=make();yes(a.base>=6);
const opt={journal:a.journal,inventory:a.inventory,campaignId:'C',minute:a.minute,actorId:'A',targetId:'B',finishId:a.finishId,testSkill:'Aura',ml:80,d100:43,origin:'manual',emptyId:'empty',gmConfirmed:true};
const proof=I.createAlchemyEruditionImbibing(opt);
eq(proof.sl,'S');eq(proof.elixirName,'Erudition');eq(proof.finalAS,a.base);eq(proof.temporary,true);eq(proof.illEffect,null);
no(()=>I.createAlchemyEruditionImbibing({...opt,d100:0}),/d100/);
no(()=>I.createAlchemyEruditionImbibing({...opt,testSkill:'Strength'}),/d100/);
no(()=>I.createAlchemyEruditionImbibing({...opt,gmConfirmed:false}),/GM/);
no(()=>I.createAlchemyEruditionImbibing({...opt,actorId:'B'}),/vlastník/);
no(()=>I.createAlchemyEruditionImbibing({...opt,campaignId:'N'}),/dokončen|chybí/);
const empty=V.createAlchemyVialEmpty({journal:a.journal,inventory:a.inventory,campaignId:'C',minute:a.minute,actorId:'A',finishId:a.finishId,reason:'Erudition imbibed',confirmedByGM:true});
let j=[...a.journal,row('empty',a.minute,'A','calendarAlchemyVialEmpty',empty),row('use',a.minute,'A','calendarAlchemyImbibing',proof)];
eq(I.validateAlchemyImbibingJournal(j),true);eq(I.activeErudition(j,'C','B',a.minute).length,1);eq(I.activeErudition(j,'C','X',a.minute).length,0);
const sig=E.eruditionSkillEvidence({journal:j,campaignId:'C',minute:a.minute,actorId:'B',skill:'Physician'});
eq(sig.canPromote,true);eq(sig.sourceIds,['use']);eq(sig.activeAS,[a.base]);
for(const skill of ['Physician','Cookery','Reasoning','Creativity']){
 const evidence=E.eruditionSkillEvidence({journal:j,campaignId:'C',minute:a.minute,actorId:'B',skill});
 yes(evidence.eligible);
 for(const roll of [23,43,53,68]){const raw=S.resolveSkillTest({ml:90,roll});eq(raw.level,'S');const x=E.applyEruditionSkillResult(raw,evidence);
  eq(x.level,'CS');eq(x.sl,3);eq(x.sv,raw.index+1);eq(x.eml,raw.eml);eq(x.roll,roll);eq(x.unopposedStars,2);
 }
}
for(const skill of ['Stealth','Melee','Aura','Jumping','Initiative']){
 const x=E.applyEruditionSkillResult(S.resolveSkillTest({ml:90,roll:43}),E.eruditionSkillEvidence({journal:j,campaignId:'C',minute:a.minute,actorId:'B',skill}));eq(x.level,'S');}
for(const roll of [44,71,84,95]){const raw=S.resolveSkillTest({ml:70,roll});const got=E.applyEruditionSkillResult(raw,sig);eq(got.level,raw.level);}
const shockE=E.eruditionSkillEvidence({journal:j,campaignId:'C',minute:a.minute,actorId:'B',skill:'Physician',auralShockLevels:1});eq(shockE.suspended,true);eq(shockE.canPromote,false);
eq(E.applyEruditionSkillResult(S.resolveSkillTest({ml:90,roll:43}),shockE).level,'S');
eq(E.eruditionSkillEvidence({journal:j,campaignId:'C',minute:a.minute,actorId:'C',skill:'Physician'}).canPromote,false);
no(()=>I.createAlchemyEruditionImbibing({...opt,journal:j}),/použit|neaktivní|dostupná/);
const due=a.minute+30*1440;const decay=D.createAlchemyDecay({journal:j,campaignId:'C',minute:due,actorId:'A',finishId:a.finishId,d10:1,origin:'manual',gmConfirmed:true});
j=[...j,row('decay',due,'A','calendarAlchemyDecay',decay)];eq(D.alchemyElixirStrength(j,'C',a.finishId,due).currentAS,a.base-1);
eq(E.eruditionSkillEvidence({journal:j,campaignId:'C',minute:due,actorId:'B',skill:'Physician'}).activeAS,[a.base-1]);
no(()=>I.createAlchemyEruditionImbibing({...opt,minute:due+1,journal:a.journal}),/Decay/);
const cf=I.createAlchemyEruditionImbibing({...opt,d100:85});eq(cf.sl,'CF');eq(cf.finalAS,a.base-2);eq(cf.illEffect.kind,'aural-shock');
const applied=I.applyAlchemyEruditionAural({state:initialCombatState(),arcane:{auralShockLevels:0},proof:cf,eventId:'CF1'});
eq(applied.arcane.auralShockLevels,1);eq(applied.state.fatigue.otherWeakness,5);eq(applied.state.events.at(-1).type,'hmk-alchemy-erudition-aural');
no(()=>I.applyAlchemyEruditionAural({state:applied.state,arcane:applied.arcane,proof:cf,eventId:'CF1'}),/opakovan|duplicit/);
no(()=>I.applyAlchemyEruditionAural({state:initialCombatState(),arcane:{},proof:{...cf,d100:84},eventId:'CF2'}),/doklad/);
const cfEmpty=V.createAlchemyVialEmpty({journal:a.journal,inventory:a.inventory,campaignId:'C',minute:a.minute,actorId:'A',finishId:a.finishId,reason:'Erudition CF',confirmedByGM:true});
let cfJournal=[...a.journal,row('empty',a.minute,'A','calendarAlchemyVialEmpty',cfEmpty),row('cf',a.minute,'A','calendarAlchemyImbibing',{...cf,emptyId:'empty'})];
eq(I.validateAlchemyImbibingJournal(cfJournal),true);
no(()=>I.validateAlchemyImbibingJournal([...cfJournal.slice(0,-1),{...cfJournal.at(-1),calendarAlchemyImbibing:{...cf,emptyId:'empty',finalAS:10}}]),/změněn|neplatná/);
eq(I.assertAlchemyImbibingAppendOnly(cfJournal,structuredClone(cfJournal)),true);
no(()=>I.assertAlchemyImbibingAppendOnly(cfJournal,cfJournal.slice(0,-1)),/nelze/);
const gone=E.eruditionSkillEvidence({journal:j,campaignId:'OTHER',minute:due,actorId:'B',skill:'Physician'});eq(gone.canPromote,false);
const dex=E.eruditionSkillEvidence({journal:j,campaignId:'C',minute:due,actorId:'B',skill:'Stealth'});eq(dex.eligible,false);
const recovery=require('../src/integration/hmk-spell-aural-recovery.js');
const available=recovery.availableSpellAuralRecoveries({characters:[{id:'B',name:'Recipient',hmk:{
 attributes:{wil:14},combatState:applied.state,arcane:applied.arcane}}]});
eq(available.length,1);eq(available[0].levels,1);
// The existing Physic must affect Erudition AS, as it affects any active elixir.
const physic=make({name:'Physic',actor:'X',vialId:'phys'});
const merged=[...j.slice(0,-1),...physic.journal,j.at(-1)];
const pp=I.createAlchemyPhysicImbibing({journal:merged,inventory:physic.inventory,campaignId:'C',
 minute:a.minute,actorId:'X',targetId:'B',finishId:physic.finishId,testSkill:'Aura',ml:80,
 d100:42,origin:'manual',emptyId:'emptyPhysic',gmConfirmed:true});
eq(pp.sl,'S');eq(pp.physicEffects.length,1);eq(pp.physicEffects[0].finishId,a.finishId);
eq(pp.physicEffects[0].asAfter,Math.max(0,a.base-pp.finalAS));
no(()=>I.createAlchemyPhysicImbibing({journal:merged,inventory:physic.inventory,campaignId:'C',
 minute:a.minute,actorId:'X',targetId:'B',finishId:physic.finishId,testSkill:'Aura',ml:80,
 d100:85,origin:'manual',emptyId:'emptyPhysic',gmConfirmed:true}),/Physic CF \+ Erudition/);
// Changing an already documented imbibing d100 must fail immutable replay.
no(()=>I.validateAlchemyImbibingJournal([...j.slice(0,-2),
 {...j.at(-2),calendarAlchemyImbibing:{...proof,d100:83}},j.at(-1)]),/změněn|neplatná|Profusion/);
console.log('PASS Alchemy Erudition 428:',checks,'assertions');
