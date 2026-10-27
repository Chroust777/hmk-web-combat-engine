'use strict';
/** HMK 1.2 pp.60–62,138,148,169–170: regression for source-backed primary,
 * secondary, opposed, Shock SL, and Survival Accident → Injury → Shock.
 */
const assert=require('node:assert/strict');
(async()=>{
 const {SL,indexOf,successLevel,secondaryModifier,secondaryRoll}=await import('../src/rules/tests.js');
 const {resolveSkillTest,resolveOpposedTests,canResolveOpposedTie,resolveOptionalOpposedTie,adjustSkillResultForTrauma,availableMasteries}=await import('../src/integration/hmk-skill-test-engine.js');
 const {prepareSkillPhysicalInjury}=await import('../src/integration/hmk-skill-physical-consequences.js');
 const {initialCombatState,validateCombatState}=await import('../src/integration/persistent-combat-state.js');
 const {automaticHMKFollowups}=await import('../src/integration/hmk-calendar-automatic-followups.js');
 const fs=require('node:fs');const vm=require('node:vm');
 let checks=0;const eq=(actual,expected,msg)=>{assert.deepEqual(actual,expected,msg);checks++};
 const yes=(value,msg)=>{assert.ok(value,msg);checks++};
 const throws=(fn,match,msg)=>{assert.throws(fn,match,msg);checks++};
 // Full d100 boundary matrix: 100 physical rolls across diverse EMLs.
 for(const ml of [1,5,20,35,50,65,95,120])for(let roll=1;roll<=100;roll++){
  const eml=Math.max(5,Math.min(95,ml));
  const expected=roll%5===0?(roll<=eml?SL.CS:SL.CF):(roll<=eml?SL.S:SL.F);
  eq(resolveSkillTest({ml,roll}).sl,expected,`d100 ${roll} ML ${ml}`);
  eq(successLevel(roll,ml),expected,`pure d100 ${roll} ML ${ml}`);
 }
 for(let index=0;index<=20;index++){
  eq(secondaryModifier(index*10),5*(index-5),'p62 modifier index '+index);
  for(let die=1;die<=10;die++)eq(secondaryRoll(die,index),die<=index,'SR TN '+index);
 }
 const assisted=resolveSkillTest({ml:72,roll:74,assistants:[43,16,101,51]});
 eq(assisted.assistance,10,'p60 assistance capped at +10');
 eq(assisted.assistantChecks.map(x=>x.eligible),[true,false,true,true],'must have half primary ML');
 eq(assisted.eml,82,'assistance modifies EML, not primary ML');
 eq(assisted.index,7,'SV uses original primary ML');
 throws(()=>resolveSkillTest({ml:72,roll:0}),/1 až 100/,'reject invalid physical d100');
 throws(()=>resolveSkillTest({ml:72,roll:101}),/1 až 100/,'reject invalid physical d100');
 // Every opposed categorical combination: no invented winner on both failures.
 for(let a=0;a<=3;a++)for(let b=0;b<=3;b++){
  const x={sl:a,ml:65,roll:21},y={sl:b,ml:65,roll:22};
  const out=resolveOpposedTests(x,y);
  if(a<2&&b<2)eq(out.winner,null,'two failures do not win');
  else if(a===b)eq(out.winner,null,'same SL is legitimate tie');
  else {eq(out.winner,a>b?'a':'b','higher successful SL wins');eq(out.stars,Math.abs(a-b),'p61 uncapped margin');}
 }
 const naturalCF=resolveSkillTest({ml:65,roll:75});
 const stunnedCF=adjustSkillResultForTrauma(naturalCF,{slPenalty:1});
 eq(stunnedCF.level,'CF','categorical consequence remains CF');
 eq(stunnedCF.victorySL,-1,'p61 negative Success Level is preserved');
 eq(stunnedCF.victoryLevel,'CF−1','trace reports actual level');
 eq(stunnedCF.sv,naturalCF.sv,'SV modifier is still CF, not imaginary fifth category');
 const success=resolveSkillTest({ml:65,roll:31});
 const opposed=resolveOpposedTests(success,stunnedCF);
 eq(opposed.winner,'a','winner remains successful side');
 eq(opposed.stars,3,'p61 S versus stunned CF−1 = 3 stars, NOT 2');
 eq(resolveOpposedTests(success,naturalCF).stars,2,'without STN same matchup is 2 stars');
 eq(canResolveOpposedTie(stunnedCF,naturalCF),false,'no tie when raw numerical SL differs');
 const stunF=adjustSkillResultForTrauma(resolveSkillTest({ml:65,roll:73}),{slPenalty:1});
 eq(stunF.sl,SL.CF,'STN downgrades F to categorical CF');
 eq(stunF.victorySL,0,'downgraded F gives numerical CF');
 const stunCS=adjustSkillResultForTrauma(resolveSkillTest({ml:65,roll:25}),{slPenalty:1});
 eq(stunCS.sl,SL.S,'STN downgrades CS to S');
 const failedA=resolveSkillTest({ml:65,roll:75}),failedB=resolveSkillTest({ml:65,roll:80});
 eq(resolveOpposedTests(failedA,failedB).winner,null,'ordinary CF/CF produces no winner');
 yes(canResolveOpposedTie(failedA,failedB,{persuasion:true}),'persuasion breaks failure ties');
 eq(resolveOptionalOpposedTie(failedA,failedB,{persuasion:true}).winner,'b','p138 higher d100');
 const exactA={...failedA,roll:75},exactB={...failedA,roll:75};
 yes(resolveOptionalOpposedTie(exactA,exactB,{persuasion:true}).requiresAnotherD10,'requires actual final d10');
 eq(resolveOptionalOpposedTie(exactA,exactB,{persuasion:true,d10A:4,d10B:6}).winner,'b','physical d10 determines tie');
 // An actual HUMAN character has an Agility ATTRIBUTE, not an invented Skill entry.
 const person={id:'human-545',name:'Ranger',hmk:{attributes:{agl:12,str:13,end:12,wil:12},skills:[{name:'Shock',ml:65}],combatState:initialCombatState()}};
 eq(availableMasteries(person).find(x=>x.name==='Agility')?.ml,60,'Attribute Agility × 5');
 const original=JSON.stringify(person.hmk.combatState);
 const opts={kind:'survival-accident',actor:person,inventory:[],state:person.hmk.combatState,sourceId:'hazard-545',round:1,gmConfirmed:true,hazardD10:5,randomVictimConfirmed:true};
 const avoided=prepareSkillPhysicalInjury({...opts,agilityD100:5});
 eq(avoided.avoided,true,'successful Agility prevents physical injury');
 eq(avoided.eml,60,'Agility attribute ML used as test EML');
 eq(avoided.state.wounds.length,0,'no fabricated wound on successful save');
 throws(()=>prepareSkillPhysicalInjury({...opts,agilityD100:81}),/Impact d6/,'failed attribute demands physical impact dice');
 const fall=prepareSkillPhysicalInjury({...opts,agilityD100:81,impactDie:6,zoneD10:2,locationD10:2,shockD100:95});
 eq(fall.sl,'F','Agility failed');eq(fall.impact,10,'p148 d6+4b after F');
 eq(fall.injury?.level,3,'fall enters canonical Injury Sequence');
 eq(fall.state.wounds.length,1,'canonical wound recorded exactly once');
 eq(fall.state.shock,'INC','Shock State computed by injury machinery');
 yes(validateCombatState(fall.state),'persistent combat state validates');
 eq(JSON.stringify(person.hmk.combatState),original,'preview leaves original actor unchanged');
 throws(()=>prepareSkillPhysicalInjury({...opts,state:fall.state,agilityD100:81,impactDie:6,zoneD10:2,locationD10:2,shockD100:95}),/zapsána|zapsán/,'idempotent physical consequence');
 const high=prepareSkillPhysicalInjury({...opts,agilityD100:95,impactDie:6,zoneD10:2,locationD10:2,shockD100:95});
 eq(high.sl,'CF','natural CF');eq(high.impact,15,'p148 CF adds +5 impact');
 eq(high.state.shock,'UNC','failed Agility can carry into unconsciousness');
 // Source-level integration regression: real app.js applies a physical SR
 // only to the remaining numerical SL, never to a falsely clamped CF.
 const app=fs.readFileSync(require('node:path').join(__dirname,'..','app.js'),'utf8');
 const start=app.indexOf('function hskApplySRResult('),end=app.indexOf('function hskScene(',start);
 yes(start>0&&end>start,'actual app.js secondary-result resolver present');
 const applySR=vm.runInNewContext(app.slice(start,end)+'\nhskApplySRResult;');
 const srRestoresCF=applySR(stunnedCF,{slBonus:1,svBonus:0});
 eq(srRestoresCF.sl,SL.CF,'SR +1 raises stunned CF−1 to CF, not F');
 eq(srRestoresCF.victorySL,0,'SR numerical progression retains CF level');
 eq(srRestoresCF.sv,4,'SV classifier correctly remains CF');
 const srRestoresF=applySR(stunF,{slBonus:1,svBonus:0});
 eq(srRestoresF.sl,SL.F,'SR +1 raises stunned F→CF back to F');
 const clock={campaignId:'test-545',minute:480,characterIds:[person.id]};
 const witnessed={...person,hmk:{...person.hmk,combatState:fall.state}};
 const agenda=automaticHMKFollowups(clock,[witnessed],[],()=>null).all;
 yes(agenda.some(e=>e.kind==='treatment'),'injury automatically appears for treatment');
 eq(fall.state.wounds[0].moralePending,true,'serious injury retains future morale obligation');
 yes(!agenda.some(e=>e.kind==='injury-morale'),'morale must wait for recovery from INC');
 yes(agenda.some(e=>e.kind==='injury-mishap'),'injury mishap is not erased by pending Shock');
 yes(agenda.some(e=>e.kind==='shock-followup'),'shock state opens recovery continuation');
 console.log(`PASS HMK skill chain 545: ${checks} assertions; 800 d100+800 pure, SR grid, opposed, CF−1, human attribute → fall → injury → shock → calendar`);
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
