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

// Independent actual v93.431 regression for all now-supported CF combinations.
const ART=['Footpad','Erudition','Darkvision','Physic'];
const prepared={};let counter=0;
function make(name){const id='id'+(++counter);return fixture(name,'caster'+id,'vial'+id)}
function use(f,target='patient',die=42){
 const opts={journal:f.journal,inventory:f.inventory,campaignId:f.campaign,minute:f.minute,
 actorId:f.actor,targetId:target,finishId:f.finishId,testSkill:'Aura',ml:80,d100:die,
 origin:'manual',emptyId:'empty'+f.finishId,gmConfirmed:true};
 const maker={Footpad:I.createAlchemyFootpadImbibing,Darkvision:I.createAlchemyDarkvisionImbibing,
 Erudition:I.createAlchemyEruditionImbibing,Physic:I.createAlchemyPhysicImbibing}[f.name];
 const proof=maker(opts);
 const empty=V.createAlchemyVialEmpty({journal:f.journal,inventory:f.inventory,campaignId:f.campaign,
 minute:f.minute,actorId:f.actor,finishId:f.finishId,reason:'consumed',confirmedByGM:true});
 return {proof,opts,journal:[...f.journal,row(opts.emptyId,f.minute,f.actor,'calendarAlchemyVialEmpty',empty),
 row('use'+f.finishId,f.minute,f.actor,'calendarAlchemyImbibing',proof)],id:'use'+f.finishId};
}
function fixtureNamed(name){const f=make(name);f.name=name;return f;}
function pair(priorName,triggerName,die=83){
 const f=fixtureNamed(priorName),g=fixtureNamed(triggerName);
 const earlier=use(f,'patient',42);
 const pre=[...earlier.journal,...g.journal];
 const maker={Footpad:I.createAlchemyFootpadImbibing,Darkvision:I.createAlchemyDarkvisionImbibing,
 Erudition:I.createAlchemyEruditionImbibing,Physic:I.createAlchemyPhysicImbibing}[triggerName];
 const opts={journal:pre,inventory:g.inventory,campaignId:'C',minute:g.minute,actorId:g.actor,
 targetId:'patient',finishId:g.finishId,testSkill:'Aura',ml:80,d100:die,origin:'manual',
 emptyId:'empty'+g.finishId,gmConfirmed:true};
 const proof=maker(opts);const useId='second-'+g.finishId;
 const incomplete=[...pre,row(useId,g.minute,g.actor,'calendarAlchemyImbibing',proof)];
 return {f,g,earlier,opts,proof,useId,incomplete};
}
for(const trigger of ART){
 const test=pair('Footpad',trigger,trigger==='Physic'?85:83),p=test.proof;
 eq(p.sl,'CF');yes(p.finalAS>0);eq(p.profusionIllEffects.length,1);
 eq(p.profusionIllEffects[0].sourceElixir,'Footpad');
 const foot=I.createFootpadProfusionIll({journal:test.incomplete,campaignId:'C',minute:test.g.minute,
  triggerUseId:test.useId,sourceUseId:test.earlier.id,targetId:'patient'});
 eq(foot.elixirName,'Footpad');eq(foot.illEffect.levels,1);
 const health=I.applyFootpadProfusionAural({journal:test.incomplete,state:initialCombatState(),arcane:{},
  proof:foot,eventId:'effect'+trigger});
 eq(health.arcane.auralShockLevels,1);eq(health.state.fatigue.otherWeakness,5);
 eq(health.state.events.at(-1).details.sourceUseId,test.earlier.id);
 no(()=>I.validateFootpadProfusionJournal(test.incomplete),/samostatný důkaz/);
 const complete=[...test.incomplete,row('effect'+trigger,test.g.minute,'patient',
  'calendarAlchemyFootpadProfusionIll',foot)];
 eq(I.validateFootpadProfusionJournal(complete),true);
 const H=require('../src/integration/hmk-calendar-history.js');
 const clock={format:'hmk-campaign-calendar-v1',campaignId:'C',minute:test.g.minute,
  characterIds:[test.f.actor,test.g.actor,'patient'],anchors:[],events:[]};
 const calendar=H.historicalHMKCalendarEntries(clock,[{id:test.f.actor,name:'First'},
  {id:test.g.actor,name:'Second'},{id:'patient',name:'Patient'}],complete);
 yes(calendar.some(x=>x.kind==='alchemy-footpad-profusion'&&x.note.includes('Footpad')));

 no(()=>I.applyFootpadProfusionAural({journal:complete,state:health.state,arcane:health.arcane,
  proof:foot,eventId:'effect'+trigger}),/duplicit|zdvojený/);
 no(()=>I.validateFootpadProfusionJournal([...test.incomplete,row('effect'+trigger,test.g.minute,'patient',
  'calendarAlchemyFootpadProfusionIll',{...foot,sourcePages:[269,270,999]})]),/změněn/);
 no(()=>I.assertFootpadProfusionAppendOnly(complete,test.incomplete),/nelze/);
 no(()=>I.createFootpadProfusionIll({journal:test.incomplete,campaignId:'another',minute:test.g.minute,
  triggerUseId:test.useId,sourceUseId:test.earlier.id,targetId:'patient'}),/CF/);
 // Health is committed at the same prevalidated instant as the source receipt.
 const res=I.applyAlchemyFootpadAural;
 if(trigger==='Footpad'){
  const own=res({state:initialCombatState(),arcane:{},proof:p,eventId:test.useId});
  const both=I.applyFootpadProfusionAural({journal:test.incomplete,state:own.state,
   arcane:own.arcane,proof:foot,eventId:'secondary'});
  eq(both.arcane.auralShockLevels,2);eq(both.state.fatigue.otherWeakness,10);
 }
 // A failed contextual proof never lets an incorrect source masquerade as a real Footpad.
 no(()=>I.createFootpadProfusionIll({journal:test.incomplete,campaignId:'C',minute:test.g.minute,
  triggerUseId:test.useId,sourceUseId:'some-other',targetId:'patient'}),/původní|chybí/);
}
// CF caused by Footpad also triggers the other active archetypes independently.
for(const source of ['Darkvision','Erudition']){
 const test=pair(source,'Footpad');eq(test.proof.sl,'CF');
 const eff=test.proof.profusionIllEffects[0];
 if(source==='Darkvision'){
  eq(eff.kind,'vision-light-penalty');
  const ill=I.createDarkvisionProfusionIll({journal:test.incomplete,campaignId:'C',minute:test.g.minute,
   triggerUseId:test.useId,sourceUseId:test.earlier.id,targetId:'patient'});
  eq(ill.elixirName,'Darkvision');
  no(()=>I.validateDarkvisionProfusionJournal(test.incomplete),/samostatný|důkaz/);
 }else{
  eq(eff.kind,'aural-shock');eq(eff.sourceElixir,undefined);
  const ill=I.createEruditionProfusionIll({journal:test.incomplete,campaignId:'C',minute:test.g.minute,
   triggerUseId:test.useId,sourceUseId:test.earlier.id,targetId:'patient'});
  eq(ill.elixirName,'Erudition');
  no(()=>I.validateEruditionProfusionJournal(test.incomplete),/samostatný|důkaz/);
 }
}
// An ordinary non-CF roll leaves all secondary effect ledgers untouched.
const p=pair('Footpad','Erudition',42);eq(p.proof.sl,'S');eq(p.proof.profusionIllEffects,undefined);
// Campaign isolation and unchanged proof formatting for previously saved Erudition sources.
const legacy=pair('Erudition','Darkvision',83);yes(legacy.proof.profusionIllEffects[0].sourceElixir===undefined);
console.log('PASS Alchemy Footpad mixed 431:',tests,'assertions');
