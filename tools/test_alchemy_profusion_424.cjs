'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js'),P=require('../src/integration/hmk-alchemy-profusion.js');
const H=require('../src/integration/hmk-alchemy-darkvision-healing.js'),K=require('../src/integration/hmk-alchemy-darkvision-skill.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
let count=0;const eq=(a,b)=>{assert.deepEqual(a,b);count++},ok=x=>{assert.ok(x);count++},fail=(f,re)=>{assert.throws(f,re);count++};
const row=(id,t,actor,key,proof,c='C')=>({id,characterId:actor,calendarCampaignId:c,campaignMinute:t,title:id,body:id,[key]:proof});
// HMK 269 exact expanded critical-failure units on ordinary failed d100.
for(const [number,extra] of [[0,[5,0]],[1,[3,5,8,0]],[2,[2,3,5,7,8,0]],[3,[2,3,4,5,7,8,9,0]]]){
 for(let unit=0;unit<=9;unit++){
  const die=unit===0?100:80+unit; // 80 itself is CF, 81..89 are ordinary failures vs ML60
  const got=P.classifyProfusionImbibing(die,60,number);
  const expected=unit===0||unit===5?'CF':extra.includes(unit)?'CF':'F';
  eq(got.adjusted,expected);eq(got.profusionCF,unit!==0&&unit!==5&&extra.includes(unit));
 }
}
for(let n=4;n<8;n++)for(const die of [81,82,83,84,86,87,88,89])eq(P.classifyProfusionImbibing(die,60,n).adjusted,'CF');
for(let n=0;n<6;n++){eq(P.classifyProfusionImbibing(40,60,n).adjusted,'CS');eq(P.classifyProfusionImbibing(41,60,n).adjusted,'S');}
for(const name of ['Quiescence','Physic','Poison'])eq(P.contributesProfusion(name),false);
eq(P.contributesProfusion('Darkvision'),true);eq(P.contributesProfusion('Darkvision','Applied'),false);
eq(P.contributesProfusion('Healing','Imbibed','Instantaneous',false),false);
eq(P.contributesProfusion('Healing','Imbibed','Instantaneous',true),true);
for(const bad of [[0,0,0],[101,60,1],[50,-3,1],[50,70,-1],[55,70,.5]])fail(()=>P.classifyProfusionImbibing(...bad),/Profusion/);
function make(suffix,actor='A',c='C'){
 const start=A.createAlchemyStart({campaignId:c,minute:0,actorId:actor,alchemyML:80,elixirName:'Darkvision',sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const r=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});r.secondarySVBonus=1;
 const p={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:r,gmModifiers:[start.sunsignModifier],helpers:[]};
 const id=k=>`${suffix}-${k}`;
 const j=[row(id('start'),0,actor,'calendarAlchemyStart',start,c),row(id('skill'),start.dueMinute,actor,'skillTestProof',p,c)];
 const n=Math.max(0,Math.min(5,r.sv-4)),finished=A.createAlchemyFinish({journal:j,campaignId:c,minute:start.dueMinute,actorId:actor,startId:id('start'),skillId:id('skill'),gmContinuityConfirmed:true,augmentationD10:Array(n).fill(10),augmentationOrigins:Array(n).fill('manual')});
 j.push(row(id('finish'),start.dueMinute,actor,'calendarAlchemyFinish',finished,c));
 const vial={id:id('vial'),characterId:actor,sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{name:'Vial, 4 oz',properties:{weightLb:.25}}};
 const bind=V.createAlchemyVialBinding({journal:j,inventory:[vial],campaignId:c,minute:start.dueMinute,actorId:actor,finishId:id('finish'),vialId:vial.id,confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
 j.push(row(id('bind'),start.dueMinute,actor,'calendarAlchemyVialBinding',bind,c));
 return {j,vial,minute:start.dueMinute,finishId:id('finish'),actor};
}
const a=make('alpha','A'),b=make('bravo','D'),minute=a.minute;
let j=[...a.j,...b.j],inventory=[a.vial,b.vial];
const options=x=>({journal:j,inventory,campaignId:'C',minute,actorId:x.actor,targetId:'B',finishId:x.finishId,testSkill:'Aura',ml:60,d100:42,origin:'manual',emptyId:x.actor+'-empty',gmConfirmed:true});
const one=I.createAlchemyDarkvisionImbibing(options(a));eq(one.sl,'S');eq(one.otherActiveElixirs,0);
const e1=V.createAlchemyVialEmpty({journal:j,inventory,campaignId:'C',minute,actorId:'A',finishId:a.finishId,reason:'imbibed by B',confirmedByGM:true});
j.push(row('A-empty',minute,'A','calendarAlchemyVialEmpty',e1),row('A-use',minute,'A','calendarAlchemyImbibing',{...one,emptyId:'A-empty'}));
// Reconstruct proof using exact empty-id so historical replay matches.
j[j.length-1].calendarAlchemyImbibing=I.createAlchemyDarkvisionImbibing({...options(a),journal:j.slice(0,-2),emptyId:'A-empty'});
eq(I.activeDarkvision(j,'C','B',minute).length,1);
const opts={...options(b),emptyId:'D-empty',d100:83};
const two=I.createAlchemyDarkvisionImbibing(opts);eq(two.otherActiveElixirs,1);eq(two.sl,'CF');eq(two.profusionCF,true);
eq(two.profursionIllEffects,undefined); // no misspelled property in proof
ok(two.profusionIllEffects?.length===1);eq(two.profusionIllEffects[0].sourceUseId,'A-use');
eq(two.illEffect.kind,'vision-light-penalty');
const e2=V.createAlchemyVialEmpty({journal:j,inventory,campaignId:'C',minute,actorId:'D',finishId:b.finishId,reason:'imbibed by B',confirmedByGM:true});
j.push(row('D-empty',minute,'D','calendarAlchemyVialEmpty',e2),row('D-use',minute,'D','calendarAlchemyImbibing',two));
const ill=I.createDarkvisionProfusionIll({journal:j,campaignId:'C',minute,triggerUseId:'D-use',sourceUseId:'A-use',targetId:'B'});
eq(ill.baseAS,one.asBefore);eq(ill.illEffect.penalty,Math.round(one.asBefore*2.5));
j.push(row('old-ill',minute,'B','calendarAlchemyDarkvisionProfusionIll',ill));
fail(()=>I.createDarkvisionProfusionIll({journal:j,campaignId:'C',minute,triggerUseId:'D-use',sourceUseId:'A-use',targetId:'B'}),/dvakrát/);
const startNew=H.createDarkvisionHealingStart({journal:j,campaignId:'C',minute,useId:'D-use',targetId:'B',hpD6:2,origin:'manual',gmConfirmed:true});
j.push(row('D-heal-start',minute,'B','calendarAlchemyDarkvisionHealingStart',startNew));
const startOld=H.createDarkvisionHealingStart({journal:j,campaignId:'C',minute,useId:'old-ill',targetId:'B',hpD6:4,origin:'manual',gmConfirmed:true});
j.push(row('A-ill-heal-start',minute,'B','calendarAlchemyDarkvisionHealingStart',startOld));
eq(H.pendingDarkvisionHealing(j,'C',minute).length,2);eq(I.activeDarkvision(j,'C','B',minute).length,2);
eq(I.validateAlchemyImbibingJournal(j),true);eq(I.validateDarkvisionProfusionJournal(j),true);eq(H.validateDarkvisionHealingJournal(j),true);
eq(I.assertDarkvisionProfusionAppendOnly(j,structuredClone(j)),true);
const ctx=K.darkvisionSkillContext({journal:j,campaignId:'C',minute,actorId:'B',visionUse:'sight',light:'bright'});
eq(ctx.illEffectIds.length,2);eq(ctx.rangeFeet,Math.max(one.finalAS,two.finalAS)*5);eq(ctx.lightPenalty,Math.round(one.asBefore*2.5)+Math.round(two.asBefore*2.5));
eq(D.alchemyElixirStrength(j,'C',a.finishId,minute).activeTemporary,true);
eq(D.alchemyElixirStrength(j,'C',b.finishId,minute).activeTemporary,true);
const broken=structuredClone(j);broken.find(x=>x.id==='old-ill').calendarAlchemyDarkvisionProfusionIll.illEffect.penalty=500;
fail(()=>I.validateDarkvisionProfusionJournal(broken),/změněný/);
fail(()=>I.assertDarkvisionProfusionAppendOnly(j,j.filter(x=>x.id!=='old-ill')),/nelze/);
fail(()=>H.requireDarkvisionHealingGMTimeMayAdvance({journal:j,campaignId:'C',beforeMinute:minute,afterMinute:minute+4*1440+1}),/nesmí přeskočit/);
const stateH=H.darkvisionHealingState(j,'C','old-ill',minute);eq(stateH.nextDueMinute,minute+4*1440);
const recovery=H.createDarkvisionHealingRoll({journal:j,campaignId:'C',minute:minute+4*1440,useId:'old-ill',targetId:'B',endurance:14,will:14,d100:1,origin:'manual',gmConfirmed:true});
ok(recovery.hrAfter>=5);eq(recovery.useId,'old-ill');
// Strong negative boundary: CF with resulting AS0 must NOT activate any new Ill Effects.
const veryLow=P.classifyProfusionImbibing(83,60,1);eq(veryLow.adjusted,'CF');
// Cross-campaign, no false Profusion sources.
eq(I.activeDarkvision(j,'OTHER','B',minute).length,0);
console.log('PASS Alchemy Profusion 424: '+count+' assertions');
