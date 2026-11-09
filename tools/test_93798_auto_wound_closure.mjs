import assert from 'node:assert/strict';
import {initialCombatState,validateCombatState} from '../src/integration/persistent-combat-state.js';
import {gmWoundConsequenceAssessment,prepareGMHealthOverride} from '../src/integration/hmk-gm-health-override.js';
import {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda} from '../src/integration/hmk-campaign-calendar.js';
const reason='GM kompletně odstranil jedno konkrétní doložené zranění.';
const add=(s,loc,i)=>prepareGMHealthOverride({state:s,action:'add',location:loc,side:loc==='ha'?'left':null,level:4,aspect:'blunt',initialCare:'pending',eventId:'add-798-'+i,reason,gmConfirmed:true});
const del=(s,id,i)=>prepareGMHealthOverride({state:s,action:'resolve',woundId:id,eventId:'remove-798-'+i,reason,gmConfirmed:true});
let x=add(initialCombatState(),'ha',1),s=x.state,w=x.woundId;
s.shock='UNC';s.shockOriginWoundId=w;
s.extendedShock={originState:'UNC',hr:4,elapsedHours:0,woundId:w};
s.coma={active:true,hr:3,elapsedDays:0,nextCourseDays:2,woundId:w};
s.bloodLoss={bp:2,weaknessFatigue:10,healingNextDay:10};s.bloodShockPending=true;
s.events.push({id:'blood-798-1',type:'blood-loss-advance',round:1,details:{woundId:w,gainedBP:2,totalBP:2}});
validateCombatState(s);
let r=del(s,w,1);validateCombatState(r.state);
assert.equal(r.state.shock,'NONE');assert.equal(r.state.extendedShock,null);assert.equal(r.state.coma,null);
assert.equal(r.state.shockFollowup,null);assert.equal(r.state.bloodLoss.bp,0);
assert.equal(r.state.bloodLoss.weaknessFatigue,0);assert.equal(r.state.bloodShockPending,false);
assert(r.state.wounds[0].healed);assert.equal(r.state.events.at(-1).details.globalConsequences.autoResolved,true);
// A legacy injury with no origin, but NO other possible active wounds, is
// automatically cleared without any GM input.
x=add(initialCombatState(),'ha',2);s=x.state;w=x.woundId;
s.shock='STN';s.shockFollowup={kind:'STN',originRound:1,dueRound:2,phase:'end-next-turn',timelineId:null};
s.bloodLoss={bp:1,weaknessFatigue:5};validateCombatState(s);
r=del(s,w,2);assert.equal(r.state.shock,'NONE');assert.equal(r.state.bloodLoss.bp,0);
// Two independent active wound sources retain their own scheduled controls
// and BP when only the first has been closed.
x=add(initialCombatState(),'ha',3);s=x.state;let w1=x.woundId;
x=add(s,'fo',4);s=x.state;let w2=x.woundId;
s.shock='INC';s.shockOriginWoundId=w2;
s.shockFollowup={kind:'INC',originRound:1,dueRound:2,phase:'end-next-turn',timelineId:null,woundId:w2};
s.bloodLoss={bp:1,weaknessFatigue:5,healingNextDay:10};
s.events.push({id:'blood-798-2',type:'blood-loss-advance',round:1,details:{woundId:w2,gainedBP:1,totalBP:1}});
validateCombatState(s);r=del(s,w1,3);assert.equal(r.state.shock,'INC');
assert.equal(r.state.bloodLoss.bp,1);assert(r.state.wounds.find(z=>z.id===w2&&!z.healed));
// Contributions from two wounds get split automatically using persisted
// event provenance, without a field in the UI or a guess.
x=add(initialCombatState(),'ha',5);s=x.state;w1=x.woundId;
x=add(s,'fo',6);s=x.state;w2=x.woundId;
s.bloodLoss={bp:3,weaknessFatigue:15,healingNextDay:10};
s.events.push({id:'blood-798-3',type:'blood-loss-advance',round:1,details:{woundId:w1,gainedBP:2,totalBP:2}});
s.events.push({id:'blood-798-4',type:'blood-loss-advance',round:1,details:{woundId:w2,gainedBP:1,totalBP:3}});
validateCombatState(s);assert.equal(gmWoundConsequenceAssessment(s,w1).autoPlan.bloodPointsToRemove,2);
r=del(s,w1,4);assert.equal(r.state.bloodLoss.bp,1);assert.equal(r.state.bloodLoss.weaknessFatigue,5);
r=del(r.state,w2,5);assert.equal(r.state.bloodLoss.bp,0);
// Legacy ambiguity: no GM prompts, do not falsely claim independent BP came
// from the target if several live wounds are possible sources.
x=add(initialCombatState(),'ha',7);s=x.state;w1=x.woundId;
x=add(s,'fo',8);s=x.state;w2=x.woundId;
s.bloodLoss={bp:1,weaknessFatigue:5};s.shock='STN';
validateCombatState(s);r=del(s,w1,6);assert.equal(r.state.bloodLoss.bp,1);
assert.equal(r.state.shock,'STN');assert(r.state.wounds.some(x=>x.id===w2&&!x.healed));
r=del(r.state,w2,7);assert.equal(r.state.bloodLoss.bp,0);assert.equal(r.state.shock,'NONE');
// Calendar re-projection after complete linked closure.
x=add(initialCombatState(),'ha',9);s=x.state;w=x.woundId;
s.shock='UNC';s.shockOriginWoundId=w;s.extendedShock={originState:'UNC',hr:4,elapsedHours:0,woundId:w};
s.coma={active:true,hr:3,elapsedDays:0,nextCourseDays:2,woundId:w};s.bloodLoss={bp:1,weaknessFatigue:5,healingNextDay:10};
s.events.push({id:'blood-798-5',type:'blood-loss-advance',round:1,details:{woundId:w,gainedBP:1,totalBP:1}});
validateCombatState(s);
let clock=createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-798',eventId:'clock-798',gmConfirmed:true,characterIds:['c']});
for(const k of ['extended-shock','coma','blood-loss'])clock=anchorCampaignOrigin(clock,{kind:k,characterId:'c',eventId:'anchor-798-'+k,gmConfirmed:true});
const person={id:'c',name:'C',hmk:{healthState:s}};
assert(campaignCalendarAgenda(clock,[person]).all.some(e=>e.kind==='coma'));
person.hmk.healthState=del(s,w,8).state;
assert(!campaignCalendarAgenda(clock,[person]).all.some(e=>['extended-shock','coma','blood-loss'].includes(e.kind)));
console.log('PASS 93.798: auto closure, shared BP, independent wound, no GM cause fields, legacy fallback, calendar');
