'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js');
const S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js');
const H=require('../src/integration/hmk-alchemy-darkvision-healing.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const recovery=require('../src/integration/hmk-spell-aural-recovery.js');
let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++},yes=(x)=>{assert.ok(x);checks++},no=(cb,rx)=>{assert.throws(cb,rx);checks++};
const row=(id,minute,actor,key,p,c='C')=>({id,characterId:actor,calendarCampaignId:c,campaignMinute:minute,title:id,body:id,[key]:p});
function make(name,actor,vial,c='C'){
 const start=A.createAlchemyStart({campaignId:c,minute:0,actorId:actor,alchemyML:80,elixirName:name,sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const result=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});result.secondarySVBonus=1;
 const skill={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:result,gmModifiers:[start.sunsignModifier],helpers:[]};
 const startId='start-'+vial,finishId='finish-'+vial,minute=start.dueMinute;
 const journal=[row(startId,0,actor,'calendarAlchemyStart',start,c),row('skill-'+vial,minute,actor,'skillTestProof',skill,c)];
 const n=Math.max(0,Math.min(5,result.sv-4));
 const finished=A.createAlchemyFinish({journal,campaignId:c,minute,actorId:actor,startId,skillId:'skill-'+vial,gmContinuityConfirmed:true,augmentationD10:Array(n).fill(10),augmentationOrigins:Array(n).fill('manual')});
 journal.push(row(finishId,minute,actor,'calendarAlchemyFinish',finished,c));
 const inventory=[{id:vial,characterId:actor,sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{name:'Vial, 4 oz',properties:{weightLb:.25}}}];
 const bind=V.createAlchemyVialBinding({journal,inventory,campaignId:c,minute,actorId:actor,finishId,vialId:vial,confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
 journal.push(row('bind-'+vial,minute,actor,'calendarAlchemyVialBinding',bind,c));
 return {name,actor,c,minute,journal,inventory,finishId};
}
function ingest(base,item,target,roll,useId){
 const emptyId='empty-'+useId;
 const params={journal:base,inventory:item.inventory,campaignId:item.c,minute:item.minute,actorId:item.actor,
  targetId:target,finishId:item.finishId,testSkill:'Aura',ml:80,d100:roll,origin:'manual',emptyId,gmConfirmed:true};
 const makeFn=item.name==='Darkvision'?I.createAlchemyDarkvisionImbibing:item.name==='Erudition'?I.createAlchemyEruditionImbibing:I.createAlchemyPhysicImbibing;
 const proof=makeFn(params);
 const empty=V.createAlchemyVialEmpty({journal:base,inventory:item.inventory,campaignId:item.c,minute:item.minute,actorId:item.actor,finishId:item.finishId,reason:'imbibed',confirmedByGM:true});
 const newJournal=[...base,row(emptyId,item.minute,item.actor,'calendarAlchemyVialEmpty',empty,item.c),row(useId,item.minute,item.actor,'calendarAlchemyImbibing',proof,item.c)];
 return {proof,journal:newJournal,useId};
}
const mk=(targetName,newName,oldName,oldRoll=42,newRoll=85)=>{
 const a=make(oldName,'A','v-a'),b=make(newName,'X','v-b');
 const base=[...a.journal,...b.journal];
 const first=ingest(base,a,'B',oldRoll,'use-a');
 const second=ingest(first.journal,b,'B',newRoll,'use-b');
 return {a,b,first,second,journal:second.journal};
};
// Erudition CF while Darkvision already active: own Aural + SECONDARY light sensitivity.
{
 const x=mk('B','Erudition','Darkvision');
 eq(x.second.proof.sl,'CF');eq(x.second.proof.illEffect.kind,'aural-shock');
 eq(x.second.proof.profusionIllEffects.map(x=>x.kind),['vision-light-penalty']);
 const ill=I.createDarkvisionProfusionIll({journal:x.journal,campaignId:'C',minute:x.a.minute,
  triggerUseId:'use-b',sourceUseId:'use-a',targetId:'B'});
 eq(ill.illEffect.kind,'vision-light-penalty');
 const illRow=row('vision-extra',x.a.minute,'B','calendarAlchemyDarkvisionProfusionIll',ill);
 no(()=>H.createDarkvisionHealingStart({journal:[...x.journal,illRow],campaignId:'C',minute:x.a.minute,
  useId:'vision-extra',targetId:'B',hpD6:0,origin:'manual',gmConfirmed:true}),/d6/);
 const hp=H.createDarkvisionHealingStart({journal:[...x.journal,illRow],campaignId:'C',minute:x.a.minute,
  useId:'vision-extra',targetId:'B',hpD6:4,origin:'manual',gmConfirmed:true});
 const complete=[...x.journal,illRow,row('hp-extra',x.a.minute,'B','calendarAlchemyDarkvisionHealingStart',hp)];
 eq(I.validateAlchemyImbibingJournal(complete),true);eq(I.validateDarkvisionProfusionJournal(complete),true);
 eq(H.validateDarkvisionHealingJournal(complete),true);
 const r=I.applyAlchemyEruditionAural({state:initialCombatState(),arcane:{},proof:x.second.proof,eventId:'use-b'});
 eq(r.arcane.auralShockLevels,1);eq(r.state.fatigue.otherWeakness,5);
 no(()=>I.validateDarkvisionProfusionJournal(complete.filter(j=>j.id!=='vision-extra')),/Ill Effect/);
}
// Darkvision CF while Erudition active: secondary Aural event +5 weakness, linked to source.
{
 const x=mk('B','Darkvision','Erudition',42,83);
 eq(x.second.proof.sl,'CF');eq(x.second.proof.profusionCF,true);
 eq(x.second.proof.profusionIllEffects.map(x=>x.kind),['aural-shock']);
 const ill=I.createEruditionProfusionIll({journal:x.journal,campaignId:'C',minute:x.a.minute,triggerUseId:'use-b',sourceUseId:'use-a',targetId:'B'});
 const rr=I.applyEruditionProfusionAural({journal:x.journal,proof:ill,state:initialCombatState(),arcane:{},eventId:'er-ill'});
 eq(rr.arcane.auralShockLevels,1);eq(rr.state.fatigue.otherWeakness,5);
 eq(rr.state.events.at(-1).details.sourceUseId,'use-a');
 const extraRow=row('er-ill',x.a.minute,'B','calendarAlchemyEruditionProfusionIll',ill);
 const complete=[...x.journal,extraRow];
 eq(I.validateAlchemyImbibingJournal(complete),true);eq(I.validateEruditionProfusionJournal(complete),true);
 no(()=>I.validateEruditionProfusionJournal(x.journal),/Aural důkaz/);
 no(()=>I.createEruditionProfusionIll({journal:x.journal,campaignId:'OTHER',minute:x.a.minute,triggerUseId:'use-b',sourceUseId:'use-a',targetId:'B'}),/CF|účinné/);
 no(()=>I.createEruditionProfusionIll({journal:x.journal,campaignId:'C',minute:x.a.minute,triggerUseId:'use-b',sourceUseId:'use-b',targetId:'B'}),/předchozí/);
 no(()=>I.applyEruditionProfusionAural({journal:x.journal,proof:{...ill,sourceUseId:'evil'},eventId:'er-ill'}),/Profusion/);
 no(()=>I.applyEruditionProfusionAural({journal:x.journal,proof:ill,state:rr.state,arcane:rr.arcane,eventId:'er-ill'}),/duplicitní/);
 no(()=>I.validateEruditionProfusionJournal([...x.journal,{...extraRow,calendarAlchemyEruditionProfusionIll:{...ill,sourceUseId:'fake'}}]),/předchozí|důkaz/);
 no(()=>I.assertEruditionProfusionAppendOnly(complete,x.journal),/nelze/);
 const candidates=recovery.availableSpellAuralRecoveries({characters:[{id:'B',name:'Recipient',hmk:{attributes:{wil:14},combatState:rr.state,arcane:rr.arcane}}]});
 eq(candidates.length,1);
}
// Physic CF with Erudition already active: its OWN Aural + another Erudition Aural.
{
 const x=mk('B','Physic','Erudition');
 eq(x.second.proof.sl,'CF');eq(x.second.proof.profusionIllEffects.length,1);
 const own=I.applyAlchemyPhysicAural({state:initialCombatState(),arcane:{},proof:x.second.proof,eventId:'use-b'});
 const ill=I.createEruditionProfusionIll({journal:x.journal,campaignId:'C',minute:x.a.minute,triggerUseId:'use-b',sourceUseId:'use-a',targetId:'B'});
 const extra=I.applyEruditionProfusionAural({journal:x.journal,state:own.state,arcane:own.arcane,proof:ill,eventId:'er-ill'});
 eq(extra.arcane.auralShockLevels,2);eq(extra.state.fatigue.otherWeakness,10);
 eq(extra.state.events.filter(x=>x.type==='hmk-alchemy-physic-aural').length,1);
 eq(extra.state.events.filter(x=>x.type==='hmk-alchemy-profusion-aural').length,1);
 eq(I.validateEruditionProfusionJournal([...x.journal,row('er-ill',x.a.minute,'B','calendarAlchemyEruditionProfusionIll',ill)]),true);
}
// Ordinary F/S/CS and ineffective AS0 do not produce Ill Effects.
{
 const x=mk('B','Erudition','Darkvision',42,42);
 eq(x.second.proof.sl,'S');eq(x.second.proof.profusionIllEffects,undefined);
 const x2=mk('B','Darkvision','Erudition',42,42);
 eq(x2.second.proof.sl,'S');eq(x2.second.proof.profusionIllEffects,[]);
}
console.log('PASS Alchemy mixed CF 429:',checks,'assertions');
