'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const {SKILL_DEFINITIONS}=await import('../src/integration/hmk-character-creation.js');
 const {HMK_OPPOSED_ACTIONS,opposedActionOptions,opposedPairIsPrinted}=await import('../src/integration/hmk-opposed-skill-pairs.js');
 const {criticalActivities,skillFollowupActivities,skillFailureGuidance,criticalFollowupPlan,criticalFollowupResult}=await import('../src/integration/hmk-skill-critical-activities.js');
 const {skillSecondaryRoutines}=await import('../src/integration/hmk-skill-secondary-routines.js');
 const {resolveOpposedTests,resolveOptionalOpposedTie,canResolveOpposedTie}=await import('../src/integration/hmk-skill-test-engine.js');
 let checks=0;const ok=(truth,msg)=>{assert.ok(truth,msg);checks++};
 ok(SKILL_DEFINITIONS.length===69,'69 canonical HMK base Skills');
 const known=new Set(SKILL_DEFINITIONS.map(x=>x.name));
 const extra=new Set(['Will','Initiative','Dodge','Strength','Agility','Perception','Eloquence']);
 const statuses={};
 for(const {name} of SKILL_DEFINITIONS){
  const choices=opposedActionOptions(name),failure=skillFollowupActivities(name,'F'),critical=skillFollowupActivities(name,'CF');
  const fNote=skillFailureGuidance(name,'F'),cfNote=skillFailureGuidance(name,'CF');
  ok(Array.isArray(choices)&&Array.isArray(failure)&&Array.isArray(critical),'valid action arrays '+name);
  ok(fNote?.text&&cfNote?.text,'both outcomes explicitly classified '+name);
  for(const [action,skill,page] of choices){
   ok(typeof action==='string'&&action&&typeof skill==='string'&&skill&&Number.isInteger(page),'grounded opposed option '+name+':'+action);
   ok(known.has(skill)||extra.has(skill),'defender skill is in HarnMaster roster '+skill);
   ok(opposedPairIsPrinted(name,skill),'stored pair discoverable '+name+':'+skill);
  }
  for(const kind of ['F','CF'])for(const activity of skillFollowupActivities(name,kind)){
   const plan=criticalFollowupPlan(name,activity.id,{level:kind,roll:kind==='CF'?95:77});
   ok(plan?.page===activity.page&&typeof plan.detail==='string','real follow-up plan '+name+':'+kind+':'+activity.id);
  }
  statuses[name]={opposed:choices.length,F:failure.length,CF:critical.length};
 }
 // Fully rule-supported three-way differences.
 ok(opposedPairIsPrinted('Legerdemain','Awareness'),'Legerdemain vs Awareness p.77');
 ok(opposedPairIsPrinted('Awareness','Stealth'),'Awareness vs Stealth p.66');
 ok(opposedPairIsPrinted('Perception','Stealth'),'Perception vs Stealth p.82');
 ok(opposedPairIsPrinted('Charm','Will'),'Charm vs Will p.138');
 ok(opposedPairIsPrinted('Discourse (Folklore)','Discourse'),'specialized Discourse resolves its base rule');
 ok(!opposedPairIsPrinted('Fishing','Endurance'),'never invent unrelated fixed pairs');
 ok(opposedActionOptions('Ritual (Peóni)').length===0,'specialised Ritual correctly marked GM-only');
 ok(opposedActionOptions('Script (Kúzhan)').length===0,'specialised Script correctly marked GM-only');
 ok(skillFollowupActivities('Acrobatics','F').some(x=>x.test==='Strength'),'ordinary Gymnastics F requires Strength');
 ok(!skillFollowupActivities('Acrobatics','S').length,'no additional Success roll');
 ok(!skillFollowupActivities('Fishing','F').length,'Fishing F no arbitrary reroll');
 ok(!!skillFollowupActivities('Fishing','CF').length,'Fishing CF follow-up retained');
 const failed={level:'F',roll:77};const plan=criticalFollowupPlan('Acrobatics','acro-gymnastics-failure',failed);
 ok(plan?.requiresRoll&&plan.test==='Strength','Strength mandatory on gymnastics F');
 const lower=criticalFollowupResult(plan,89,50),higher=criticalFollowupResult(plan,31,50);
 ok(lower.level==='F'&&/prone/.test(lower.effect),'Strength F -> prone');
 ok(higher.level==='S'&&/udržela/.test(higher.effect),'Strength S stays upright');
 ok(criticalFollowupPlan('Acrobatics','acro-gymnastics-failure',{level:'CF',roll:95})===null,'F link cannot fire after CF');
 ok(criticalFollowupPlan('Acrobatics','acro-gymnastics',{level:'F',roll:88})===null,'CF link cannot fire after F');
 const fA={sl:1,ml:65,roll:71},fB={sl:1,ml:45,roll:72};
 ok(resolveOpposedTests(fA,fB).bothFailed===true,'general double-F remains without winner');
 const persuasionTie=resolveOpposedTests(fA,fB,{persuasion:true});
 ok(persuasionTie.tie&&persuasionTie.persuasionTie&&persuasionTie.sourcePage===138,'persuasion F/F requires break p.138');
 ok(!canResolveOpposedTie(fA,fB),'cannot break failed tie in ordinary opposed');
 ok(canResolveOpposedTie(fA,fB,{persuasion:true}),'can break failed persuasion tie');
 ok(resolveOptionalOpposedTie(fA,fB,{persuasion:true}).winner==='b','higher original d100 breaks persuasion failure tie');
 const evenA={sl:0,ml:50,roll:95},evenB={sl:0,ml:50,roll:95};
 ok(resolveOpposedTests(evenA,evenB,{persuasion:true}).persuasionTie,'CF/CF needs mandatory break');
 const pending=resolveOptionalOpposedTie(evenA,evenB,{persuasion:true});
 ok(pending.requiresAnotherD10,'identical d100 and ML requires pair of d10');
 ok(resolveOptionalOpposedTie(evenA,evenB,{persuasion:true,d10A:4,d10B:6}).winner==='b','d10 resolves CF/CF');
 ok(resolveOpposedTests({sl:2,ml:60,roll:31},{sl:2,ml:65,roll:41},{persuasion:true}).persuasionTie,'S/S persuasion also requires break');
 ok(skillFailureGuidance('Guile','CF').kind==='persuasion','persuasion CF not invented reroll');
 ok(skillFailureGuidance('Stealth','F').kind==='stealth','Stealth retry opposed guidance');
 ok(skillFailureGuidance('Lockcraft','CF').kind==='lockcraft','Lockcraft penalty preserved');
 ok(skillFailureGuidance('Animalcraft','CF').kind==='training','Animalcraft setbacks no arbitrary skill roll');
 const srSkills=SKILL_DEFINITIONS.filter(d=>skillSecondaryRoutines(d.name,'value').length||skillSecondaryRoutines(d.name,'success').length);
 ok(srSkills.length>10,'secondary-roll catalogue is active');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const ui=fs.readFileSync(path.join(root,'src/integration/hmk-skill-workbench-ui.js'),'utf8');
 ok(app.includes('skillFollowupActivities(x.skill,x.result.level)'),'UI supports both F and CF follow-ups');
 ok(app.includes('if(!form.elements.namedItem(\'opponentSkill\')?.value)throw Error'),'Opposed requires actual selected counter-skill');
 ok(app.includes('hskOpposedPrimary'),'stale action index cleared on primary-skill change');
 ok(app.includes("result?.level))"),'post-test F/CF stage uses actual level');
 ok(ui.includes('data-opposed-rule-guidance'),'workbench explains unsupported rule pair');
 ok(app.includes("plan.id==='acro-gymnastics-failure'"),'prone consequence is written only on failed Strength');
 const nOpposed=Object.keys(HMK_OPPOSED_ACTIONS).length;
 console.log('PASS '+checks+' checks; '+SKILL_DEFINITIONS.length+' skills; '+nOpposed+' explicit opposed suggestion classes; '+srSkills.length+' base skills with secondary routines');
 console.log('Skill coverage:'+JSON.stringify(statuses));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
