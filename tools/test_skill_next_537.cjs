'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const fs=require('node:fs'),path=require('node:path');
 const {skillFollowupActivities,criticalFollowupPlan,criticalFollowupResult,skillFailureGuidance}=await import('../src/integration/hmk-skill-critical-activities.js');
 const {SKILL_DEFINITIONS}=await import('../src/integration/hmk-character-creation.js');
 const {validateSkillActivityTimeProofs}=await import('../src/integration/hmk-skill-activity-timeproof-537.js');
 let n=0;
 function eq(actual,expected,message){assert.deepEqual(actual,expected,message);n++}
 function ok(value,message){assert.ok(value,message);n++}
 eq(SKILL_DEFINITIONS.length,69,'complete canonical skills preserved');
 const cf={level:'CF',roll:95,eml:40};
 const a=criticalFollowupPlan('Animalcraft','animal-training',cf);
 ok(a&&!a.requiresRoll&&a.page===65,'Animalcraft CF requires d3 rather than invented d100');
 eq(skillFollowupActivities('Animalcraft','F').length,0,'ordinary Animalcraft F does not trigger extension');
 const writing=criticalFollowupPlan('Language','writing-routine',cf);
 ok(writing?.requiresRoll&&writing.test==='Will'&&writing.page===132,'Writing CF on Language test');
 ok(criticalFollowupPlan('Language (Járin)','writing-routine',cf)?.requiresRoll,'specialized Language Writing');
 ok(criticalFollowupPlan('Language:Járin','writing-routine',cf)?.requiresRoll,'instance-key Language Writing');
 eq(criticalFollowupPlan('Script','writing-routine',cf),null,'no erroneous Script CF -> Writing Will');
 eq(skillFollowupActivities('Script','CF').length,0,'Script does not automatically reroll Language Writing');
 eq(criticalFollowupResult(writing,82,50).level,'F','writing followup physical Will F');
 ok(criticalFollowupResult(writing,82,50).effect.includes('50 %'),'Will F adds 50 percent');
 ok(criticalFollowupResult(writing,95,50).effect.includes('100 %'),'Will CF adds 100 percent');
 ok(skillFailureGuidance('Language (Járin)','CF').kind==='writing','writing guideline for language');
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 for(const word of ['data-animal-training-fields','data-writing-routine-fields','trainingExtension={format:',"calendarTrekTrackingAwarenessProof:trackingAwareness",'trainingD3','writingExtension={format:'])ok(app.includes(word),word);
 // Validate append-only proof replay after saving and cloud round-trip.
 const original=(id,skill)=>({id,characterId:'A',calendarCampaignId:'campaign',campaignMinute:100,
  skillTestProof:{type:'secondary-mastery-value-test',actorId:'A',skills:[skill],a:{level:'CF',roll:95,eml:45,sv:6}}});
 const animalOrigin=original('animal-origin','Animalcraft'),languageOrigin=original('language-origin','Language: Járin');
 const animalFollow={id:'animal-follow',characterId:'A',calendarCampaignId:'campaign',campaignMinute:120,
  skillTestProof:{type:'critical-followup',originId:'animal-origin',side:'A',actorId:'A',activity:'animal-training',skill:'Animalcraft',
   trainingExtension:{format:'hmk-animal-training-cf-delay-p65-v1',animalName:'Guard Dog',dieD3:2,dieOrigin:'manual',timeReductionMonths:0,baseMonths:6,additionalMonths:2,totalMonths:8,requiresCalendarDate:true,sourcePage:65}}};
 const writingFollow={id:'write-follow',characterId:'A',calendarCampaignId:'campaign',campaignMinute:120,
  skillTestProof:{type:'critical-followup',originId:'language-origin',side:'A',actorId:'A',activity:'writing-routine',skill:'Language: Járin',technique:'Will',result:{level:'F',roll:82,eml:50},
   writingExtension:{format:'hmk-writing-cf-delay-p132-v1',scope:'tract',completionTimeMultiplier:1.5,requiresOriginalCalendarPlan:true,sourcePage:132}}};
 eq(validateSkillActivityTimeProofs([animalOrigin,animalFollow,languageOrigin,writingFollow]),true,'durable time proof validated');
 eq(validateSkillActivityTimeProofs(JSON.parse(JSON.stringify([animalOrigin,animalFollow,languageOrigin,writingFollow]))),true,'reload validates');
 const highSV={...animalOrigin,skillTestProof:{...animalOrigin.skillTestProof,a:{...animalOrigin.skillTestProof.a,sv:7}}};
 const reduced={...animalFollow,skillTestProof:{...animalFollow.skillTestProof,trainingExtension:{...animalFollow.skillTestProof.trainingExtension,timeReductionMonths:1,baseMonths:5,totalMonths:7}}};
 eq(validateSkillActivityTimeProofs([highSV,reduced]),true,'GM certified forfeited training roll reduces original six months to five');
 assert.throws(()=>validateSkillActivityTimeProofs([animalOrigin,{...animalFollow,skillTestProof:{...animalFollow.skillTestProof,trainingExtension:{...animalFollow.skillTestProof.trainingExtension,dieD3:1}}}]),/Poškozený/);n++;
 assert.throws(()=>validateSkillActivityTimeProofs([animalOrigin,{...animalFollow,skillTestProof:{...animalFollow.skillTestProof,trainingExtension:{...animalFollow.skillTestProof.trainingExtension,timeReductionMonths:1,baseMonths:5,totalMonths:7}}}]),/Poškozený/);n++;
 assert.throws(()=>validateSkillActivityTimeProofs([animalOrigin,animalFollow,languageOrigin,{...writingFollow,skillTestProof:{...writingFollow.skillTestProof,writingExtension:{...writingFollow.skillTestProof.writingExtension,completionTimeMultiplier:2}}}]),/Poškozený/);n++;
 // The physical result is not a new GM clock event and cannot invent a date
 ok(!/campaignMinute\s*\+\s*trainingExtension\.additionalMonths/.test(app),'no guessed Gregorian duration');
 console.log('PASS v93.537 '+n+' Animalcraft & Writing checks');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
