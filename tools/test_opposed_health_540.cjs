'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const {SKILL_DEFINITIONS}=await import('../src/integration/hmk-character-creation.js');
 const {opposedActionOptions,opposedAvailabilityMatrix,resolveOpposedDefenderMastery,opposedPairIsPrinted}=await import('../src/integration/hmk-opposed-skill-pairs.js');
 const {initialCombatState,validateCombatState,applyExtendedShockCourse,applyComaCourse}=await import('../src/integration/persistent-combat-state.js');
 const {applyConfirmedInjuryHealing,applyConfirmedInfectionCourse}=await import('../src/integration/hmk-healing-persistence.js');
 const {campaignCalendarAgenda,createCampaignCalendar,anchorCampaignOrigin,advanceCampaignCalendar}=await import('../src/integration/hmk-campaign-calendar.js');
 const {automaticHMKFollowups}=await import('../src/integration/hmk-calendar-automatic-followups.js');
 const {projectLiveInjuries}=await import('../src/integration/live-injury-impairment.js');
 const {resolveSkillTrauma}=await import('../src/integration/hmk-skill-trauma.js');
 let n=0;
 const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);n++};
 const yes=(x,msg)=>{assert.ok(x,msg);n++};
 const fails=(fn,msg)=>{assert.throws(fn,msg);n++};
 eq(SKILL_DEFINITIONS.length,69,'entire canonical skill roster');
 const physical=[...new Map([...SKILL_DEFINITIONS.map(s=>({name:s.name,ml:55})),...['Perception','Will','Initiative','Dodge','Strength','Agility','Eloquence'].map(name=>({name,ml:45}))].map(x=>[x.name,x])).values()];
 const matrix=opposedAvailabilityMatrix(SKILL_DEFINITIONS.map(s=>s.name),physical);
 eq(matrix.length,69,'all attacker skills enumerated');
 for(const skill of matrix)for(const action of skill.actions){
  yes(action.status==='exact','full defender has exact mastery for '+skill.skill+' / '+action.defender);
  yes(opposedPairIsPrinted(skill.skill,action.defender),'each proposed opponent belongs to that attacker skill');
 }
 const awareness=opposedActionOptions('Awareness');
 yes(awareness.some(x=>x[1]==='Legerdemain'),'user-reported pair printed p77');
 yes(awareness.some(x=>x[1]==='Awareness'&&x[2]===150),'watch-to-watch Awareness encounter p150');
 yes(opposedActionOptions('Stealth').some(x=>x[1]==='Stealth'&&x[2]===150),'watch-to-watch Stealth encounter p150');
 eq(resolveOpposedDefenderMastery('Legerdemain',[{name:'Legerdemain',ml:45}]).name,'Legerdemain');
 eq(resolveOpposedDefenderMastery('Legerdemain',[{name:'Legerdemain (sleight)',ml:55}]).status,'specialised');
 eq(resolveOpposedDefenderMastery('Legerdemain',[{name:'Legerdemain (sleight)',ml:55},{name:'Legerdemain (juggling)',ml:60}]).status,'ambiguous');
 eq(resolveOpposedDefenderMastery('Legerdemain',[{name:'Awareness',ml:80}]).status,'untrained');
 eq(resolveOpposedDefenderMastery('Awareness',[{name:'Awareness (sight)',ml:55},{name:'Awareness (sound)',ml:60}]).status,'ambiguous');
 eq(resolveOpposedDefenderMastery('Stealth',[{name:'Stealth',ml:55}]).status,'exact');
 eq(opposedActionOptions('Discourse (Law)').length,opposedActionOptions('Discourse').length);
 yes(opposedActionOptions('Discourse')[0][0].includes('SV debate'),'printed extended debate is not mislabeled a normal roll');
 const app=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
 const ui=fs.readFileSync(require('node:path').join(__dirname,'../src/integration/hmk-skill-workbench-ui.js'),'utf8');
 yes(app.includes('resolveOpposedDefenderMastery(row[1]'),'selection uses defender mastery rather than arbitrary first option');
 yes(app.includes('hskOpposedNotice(form,text,true)'),'missing mastery prompts explicit blocking warning');
 yes(app.includes('hskOpposedNotice(form')&&ui.includes('data-opposed-selection-notice'),'UI warning wired');
 const cash=app.slice(app.indexOf('function wealthInventoryPanel(c)'),app.indexOf('let activeSkillTab',app.indexOf('function wealthInventoryPanel(c)')));
 yes(!cash.includes('Historie mincí')&&!cash.includes('Historie nákupů')&&!cash.includes('Starší finanční doklady'),'Arsenal & Gear has no cash or purchase history panels');
 yes(app.includes('recordCampaignCashPurchase')&&app.includes('cashLedger.push')&&app.includes('coinAdjustments.push'),'financial evidence immutable and present');
 // Authoritative injury followed by infection interruption and 5-day resumption.
 const fresh=(id)=>({id,location:'ua',severity:'S',level:3,aspect:'b',bleeding:false,nextAdvanceRound:null,
  healing:{treated:true,healingRate:5,nextHealingDay:5,infectionPossible:true,infected:false,permanentEligible:false,infectionWeakness:0}});
 let s=initialCombatState();s.wounds=[fresh('w-a'),fresh('w-b')];validateCombatState(s);n++;
 let clock=createCampaignCalendar({day:1,hour:8,minute:0,label:'health 540',gmConfirmed:true,eventId:'start540',campaignId:'health540',characterIds:['victim']});
 for(const wound of s.wounds)clock=anchorCampaignOrigin(clock,{kind:'wound',characterId:'victim',woundId:wound.id,eventId:'origin:'+wound.id,source:'gm-attested',gmConfirmed:true});
 const actor=()=>({id:'victim',name:'Patient',hmk:{combatState:s}});
 let agenda=campaignCalendarAgenda(clock,[actor()],[]);
 eq(agenda.future.filter(x=>x.kind==='healing').length,2,'two parallel five-day healing periods');
 // Infection is triggered by an actual confirmed healing result, not by a new manual state authority.
 const infected=applyConfirmedInjuryHealing({state:s,round:1,eventId:'trigger-infection',woundId:'w-a',daySinceInjury:5,endurance:12,will:12,roll:95,gmConfirmed:true});
 yes(infected.infected,'actual CF infection trigger');
 s=infected.state;validateCombatState(s);n++;
 agenda=campaignCalendarAgenda(clock,[actor()],[]);
 eq(agenda.all.filter(x=>x.kind==='healing').length,0,'all healing disappears from due schedule during infection');
 eq(agenda.suspended.length,2,'both wounds visible as suspended, not silently lost');
 yes(agenda.future.some(x=>x.kind==='infection'),'real daily Infection Course scheduled');
 fails(()=>applyConfirmedInjuryHealing({state:s,round:2,eventId:'cannot-heal-infection',woundId:'w-b',daySinceInjury:5,endurance:12,will:12,roll:1,gmConfirmed:true}),/infek|infection|Infek|Infection/);
 let delay=JSON.parse(JSON.stringify(s));eq(campaignCalendarAgenda(clock,[{id:'victim',name:'Patient',hmk:{combatState:delay}}],[]).suspended.length,2);
 // Cure of the LAST infection reopens five-day rolls from separately
 // attested actual age for each wound; no retroactive d100 is fabricated.
 s.wounds[0].healing.infectionHR=5;s.wounds[0].healing.nextInfectionDay=6;
 const treatment=applyConfirmedInfectionCourse({state:s,round:2,eventId:'cure-infection',woundId:'w-a',daySinceInjury:6,
  endurance:12,will:12,roll:1,physicianSV:0,otherWoundDays:{'w-b':6},gmConfirmed:true});
 yes(treatment.result.defeated,'last infection defeated by actual Course roll');
 s=treatment.state;
 eq(s.wounds.map(w=>w.healing.nextHealingDay),[11,11],'both healing periods restarted on certified day 6');
 eq(campaignCalendarAgenda(clock,[actor()],[]).suspended.length,0,'no remaining frozen rolls');
 eq(campaignCalendarAgenda(clock,[actor()],[]).future.filter(x=>x.kind==='healing').length,2,'both new due entries visible');
 const s2=initialCombatState();s2.shock='UNC';s2.extendedShock={originState:'UNC',hr:4,elapsedHours:0};
 s2.coma={active:true,hr:5,elapsedDays:0,nextCourseDays:6};validateCombatState(s2);n++;
 fails(()=>applyExtendedShockCourse({state:s2,round:1,eventId:'premature',healingBase:12,roll:1,physicianStars:0,elapsedHoursSinceOnset:3,gmConfirmed:true}),/4 hodin|4 h|doložen/);
 const ext=applyExtendedShockCourse({state:s2,round:1,eventId:'extended-first',healingBase:12,roll:5,physicianStars:0,elapsedHoursSinceOnset:4,gmConfirmed:true});
 eq(ext.state.extendedShock,null,'HR reaches 6 after real 4-hour roll');
 yes(ext.state.coma?.active,'Coma persists after Extended Shock ended');
 fails(()=>applyComaCourse({state:ext.state,round:2,eventId:'premature-coma',healingBase:12,roll:1,daysElapsed:5,gmConfirmed:true}),/6|interval/);
 const coma=applyComaCourse({state:ext.state,round:2,eventId:'coma-after-six-days',healingBase:12,roll:1,daysElapsed:6,gmConfirmed:true});
 eq(coma.state.coma,null,'Coma ended after actual course');
 eq(coma.wearinessAdded,5,'weariness rounds duration down to nearest 5 days');
 // Newly injured patient in Extended Shock is NOT asked to complete treatment
 // before time can progress to the first legitimate 4-hour Course deadline.
 const extWound=structuredClone(s2);extWound.wounds=[{id:'untreated',location:'ua',severity:'S',level:3,aspect:'e',bleeding:false,nextAdvanceRound:null}];
 const future=automaticHMKFollowups({campaignId:'health540',minute:480,characterIds:['victim']},[{id:'victim',name:'Patient',hmk:{combatState:extWound}}],[],()=>null);
 yes(!future.all.some(x=>x.kind==='treatment'),'Treatment is postponed until Extended Shock resolved');
 // Impairment is projected from the same injury record and evolves through
 // treated, fully healed and permanent stages without modifying the original.
 let impairment=initialCombatState();
 impairment.wounds=[{id:'w-impairment',location:'tx',severity:'S',level:3,aspect:'b',bleeding:false,nextAdvanceRound:null}];
 let proj=projectLiveInjuries({state:impairment,round:12,test:'acrobatics',usedArms:['none']});
 eq(proj.ready,true,'fresh injury is projectable');
 eq(proj.impairment,10,'untreated serious torso injury impairs applicable tests');
 impairment.wounds[0].healing={treated:true,healingRate:5,permanentImpairment:0};
 proj=projectLiveInjuries({state:impairment,round:13,test:'acrobatics',usedArms:['none']});
 eq(proj.impairment,10,'early treatment does not magically remove injury impairment');
 impairment.wounds[0].healed=true;
 proj=projectLiveInjuries({state:impairment,round:14,test:'acrobatics',usedArms:['none']});
 eq(proj.impairment,0,'completed healing restores function without permanent damage');
 impairment.wounds[0].healing.permanentImpairment=5;
 proj=projectLiveInjuries({state:impairment,round:15,test:'acrobatics',usedArms:['none']});
 eq(proj.impairment,5,'permanent impairment survives completed healing');
 impairment.shock='STN';
 proj=projectLiveInjuries({state:impairment,round:16,test:'acrobatics',usedArms:['none']});
 eq(proj.successLevelPenalty,1,'stunned actor has lower success level');
 impairment.shock='UNC';
 fails(()=>resolveSkillTrauma({actor:{id:'victim',hmk:{combatState:impairment}},name:'Acrobatics',inventory:[],shockMode:'auto'}),/Shock UNC/);
 // The pending injury may need morale/mishap if real state marks them; no GM rolls autogenerated.
 console.log('PASS v93.540 opposed, cash UI, Extended Shock, Coma, Infection, Healing: '+n+' checks');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
