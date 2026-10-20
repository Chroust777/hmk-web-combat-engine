'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {curativeHealingEvidence}=require('../src/integration/hmk-herbal-healing-bridge.js');
const {applyConfirmedInjuryHealing,applyConfirmedInfectionCourse}=require('../src/integration/hmk-healing-persistence.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
let count=0;const eq=(a,b)=>{assert.deepEqual(a,b);count++},ok=(x)=>{assert.ok(x);count++},bad=(cb,re)=>{assert.throws(cb,re);count++};
const campaignId='camp-A',targetId='patient',woundId='wound-1',minute=7200;
const complete=(id='complete-1',m=5,potency=2,sv=8,expiry=40000)=>({id,characterId:'healer',calendarCampaignId:campaignId,campaignMinute:m,calendarHerbPotionComplete:{format:'hmk-herb-potion-complete-v1',campaignId,minute:m,actorId:'healer',herbType:'curative',potency,sv,usable:true,expiryMinute:expiry}});
const applied=(c,id='admin-1',m=100,wid=woundId,tgt=targetId)=>({id,characterId:'healer',calendarCampaignId:campaignId,campaignMinute:m,calendarHerbPotionAdminister:{format:'hmk-herb-potion-application-v1',campaignId,minute:m,actorId:'healer',completeId:c.id,targetId:tgt,method:'poultice',woundId:wid,herbType:'curative',potency:c.calendarHerbPotionComplete.potency,sv:c.calendarHerbPotionComplete.sv,bonus:c.calendarHerbPotionComplete.sv*(c.calendarHerbPotionComplete.potency===3?4:c.calendarHerbPotionComplete.potency===2?2:1),schedule:null,rule:{kind:'single-injury-healing-and-infection-roll-bonus',value:c.calendarHerbPotionComplete.sv*(c.calendarHerbPotionComplete.potency===3?4:c.calendarHerbPotionComplete.potency===2?2:1),appliesUntil:'injury-recovery-complete'},sourcePage:75,applicationStatus:'APPLIED_NO_AUTOMATIC_HEALTH_ROLL',gmConfirmed:true}});
const source=complete(),admin=applied(source),journal=[source,admin];
const context=(j=journal,override={})=>({journal:j,campaignId,minute,targetId,woundOnsetMinute:0,...override});
const ctx=context();
const e=curativeHealingEvidence({...ctx,woundId});eq(e.bonus,16);eq(e.sourceIds,[admin.id]);eq(e.completeIds,[source.id]);
for(const [pot,expected] of [[1,8],[2,16],[3,32]]){
 const s=complete('source-'+pot,5,pot),a=applied(s,'admin-'+pot);
 eq(curativeHealingEvidence({...context([s,a]),woundId}).bonus,expected);
}
eq(curativeHealingEvidence({...context(journal),woundId:'different-wound'}).bonus,0);
eq(curativeHealingEvidence({...context(journal,{targetId:'stranger'}),woundId}).bonus,0);
eq(curativeHealingEvidence({...context(journal,{campaignId:'camp-B'}),woundId}).bonus,0);
eq(curativeHealingEvidence({...context(journal,{minute:50}),woundId}).bonus,0);
bad(()=>curativeHealingEvidence({...context(journal,{woundOnsetMinute:101}),woundId}),/časové osy/);
bad(()=>curativeHealingEvidence({...context(journal,{woundOnsetMinute:minute+1}),woundId}),/ještě nevznikla/);
const changed=structuredClone(journal);changed[1].calendarHerbPotionAdminister.bonus=900;
bad(()=>curativeHealingEvidence({...context(changed),woundId}),/neodpovídá|bonus/);
const later=complete('other-complete',30,1,7),second=applied(later,'other-admin',110);
bad(()=>curativeHealingEvidence({...context([...journal,later,second]),woundId}),/více podání/);
const tooOld=complete('old',5,1,7,20),late=applied(tooOld,'late',100);
bad(()=>curativeHealingEvidence({...context([tooOld,late]),woundId}),/prošlý|neodpovídá|účinný/);
const state=()=>{let s=initialCombatState();s.wounds.push({id:woundId,location:'abdomen',severity:'S',level:2,aspect:'e',bleeding:false,nextAdvanceRound:null,healed:false,healing:{treated:true,healingRate:4,nextHealingDay:5,infectionPossible:true}});return s};
// d100 61 vs 52 = failure without Curative, but succeeds against 52+16.
const base={state:state(),round:1,eventId:'roll-1',woundId,daySinceInjury:5,endurance:13,will:13,roll:61,gmConfirmed:true};
const none=applyConfirmedInjuryHealing({...base});eq(none.state.wounds[0].level,2);eq(none.state.events.at(-1).details.rawEML,52);eq(none.state.events.at(-1).details.herbalBonus,0);
const withHerb=applyConfirmedInjuryHealing({...base,herbalContext:ctx});eq(withHerb.state.wounds[0].level,1);eq(withHerb.state.events.at(-1).details.rawEML,68);eq(withHerb.state.events.at(-1).details.herbalBonus,16);eq(withHerb.state.events.at(-1).details.herbalSourceIds,['admin-1']);
// Different patient's wound must not inherit Curative.
const foreign=applyConfirmedInjuryHealing({...base,herbalContext:context(journal,{targetId:'wrong-patient'})});eq(foreign.state.events.at(-1).details.herbalBonus,0);
const infected=state();infected.wounds[0].healing={...infected.wounds[0].healing,infected:true,infectionHR:3,nextInfectionDay:5};
// Test 51 against 39 (without) and 55 (with) to prove infection result differs.
const infBase={state:infected,round:1,eventId:'infection-1',woundId,daySinceInjury:5,endurance:13,will:13,roll:51,physicianSV:0,gmConfirmed:true};
const infNone=applyConfirmedInfectionCourse({...infBase});eq(infNone.state.wounds[0].healing.infectionHR,2);eq(infNone.state.events.at(-1).details.rawEML,39);
const infWith=applyConfirmedInfectionCourse({...infBase,herbalContext:ctx});eq(infWith.state.wounds[0].healing.infectionHR,4);eq(infWith.state.events.at(-1).details.rawEML,55);eq(infWith.state.events.at(-1).details.herbalSourceIds,['admin-1']);
// Physician bonus remains independent, with Curative added exactly once.
const infPhys=applyConfirmedInfectionCourse({...infBase,physicianSV:7,herbalContext:ctx});eq(infPhys.state.events.at(-1).details.rawEML,62);eq(infPhys.state.events.at(-1).details.physicianSV,7);
// Physical d100 remains the exact GM roll; the herb does not make a second roll.
eq(withHerb.state.events.length,1);eq(withHerb.state.events[0].details.roll,61);
eq(infWith.state.events.length,1);
// A locked historical source cannot be applied to a different campaign.
bad(()=>applyConfirmedInjuryHealing({...base,herbalContext:context(journal,{woundOnsetMinute:300})}),/časové osy/);
console.log('PASS',count,'Curative to original healing/infection EML; source replay, wound identity, campaigns, dice and clock');
