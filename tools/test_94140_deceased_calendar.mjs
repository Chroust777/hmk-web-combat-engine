import assert from 'node:assert/strict';
import {advanceCampaignCalendar,campaignCalendarAgenda,createCampaignCalendar} from '../src/integration/hmk-campaign-calendar.js';
import {addGMCalendarPlan,completeGMCalendarPlan,gmCalendarAgenda} from '../src/integration/hmk-calendar-planner.js';
import {calendarBoardEvents} from '../src/integration/hmk-campaign-calendar-ui.js';
import {deceasedCalendarActors,livingPersonalCalendarSources} from '../src/integration/hmk-calendar-deceased.js';
import {startConcurrentProcedure,cancelConcurrentProcedure} from '../src/integration/hmk-concurrent-procedures.js';
import {requireParalyticGMTimeMayAdvance} from '../src/integration/hmk-herbal-paralytic.js';
import {requireSoporificGMTimeMayAdvance} from '../src/integration/hmk-herbal-soporific.js';
import {requireAlchemyGMTimeMayAdvance} from '../src/integration/hmk-alchemy-preparation.js';
import {initialCombatState} from '../src/integration/persistent-combat-state.js';

const campaignId='qa-deceased';
const person=(id,shock='NONE')=>({id,name:id,hmk:{healthState:{...initialCombatState(),shock}}});
const characters=[person('deceased','KIA'),person('helper'),person('patient'),person('other-healer')];
let clock=createCampaignCalendar({day:1,hour:0,minute:0,campaignId,eventId:'origin',
 gmConfirmed:true,characterIds:characters.map(c=>c.id)});
const plan=(id,characterId,minute,requiresAction=true)=>{
 clock=addGMCalendarPlan(clock,{id,eventId:'plan-'+id,title:id,characterId,minute,requiresAction,confirmed:true});
};
plan('deceased-plan','deceased',2);
plan('deceased-finished','deceased',0);
plan('party-plan','',8);
plan('living-plan','helper',10);
plan('world-note','deceased',12,false);
clock=completeGMCalendarPlan(clock,{id:'confirmed',planId:'deceased-finished',confirmed:true});
const procedure=(id,characterId,healerId,endMinute)=>{
 clock=startConcurrentProcedure(clock,{id,procedure:{formId:'hmk-treatment-form',
  characterId,healerId,woundId:'wound-'+id,eventId:'outcome-'+id,
  startMinute:0,endMinute,confirmed:true,args:{physicianRoll:5}}});
};
procedure('deceased-treatment','deceased','helper',3);
procedure('living-treatment','patient','other-healer',6);

const row=(id,fields,scope=campaignId)=>({id,characterId:'helper',
 calendarCampaignId:scope,campaignMinute:0,...fields});
const paralytic=targetId=>({calendarHerbPotionAdminister:{targetId,herbType:'paralytic',paralyticTracked:true,potency:2}});
const journal=[
 row('dead-poison',paralytic('deceased')),
 row('living-poison',{...paralytic('patient'),characterId:'deceased'}),
 row('archived-poison',paralytic('deceased'),'other-campaign'),
 row('dead-herblore',{calendarHerbPotionStart:{actorId:'deceased',herbType:'Curative',minute:0,dueMinute:4},characterId:'deceased'}),
 row('dead-alchemy',{calendarAlchemyStart:{actorId:'deceased',elixirName:'Healing',dueMinute:3},characterId:'deceased'}),
 row('dead-soporific',{calendarHerbPotionAdminister:{targetId:'deceased',herbType:'soporific',soporificTracked:true,potency:1,sv:3}}),
 row('dead-soporific-end',{calendarHerbSoporificEnd:{applicationId:'dead-soporific',targetId:'deceased',minute:0,endSV:3}}),
 row('physical-elixir',{characterId:'deceased',calendarAlchemyFinish:{startId:'old-work'}})
];
const snapshot=structuredClone({clock,journal});
const agenda=campaignCalendarAgenda(clock,characters,journal);
assert.deepEqual(agenda.all.map(x=>x.id),['herbal-paralytic:living-poison','concurrent-treatment:living-treatment']);
assert.equal(agenda.unknown.some(x=>x.characterId==='deceased'),false);
const board=calendarBoardEvents({clock,characters});
assert.equal(board.some(x=>x.id==='deceased-plan'),false);
assert.equal(board.some(x=>x.id==='deceased-finished'&&x.status==='resolved'),true);
assert.equal(board.some(x=>x.id==='world-note'),true);
assert.equal(gmCalendarAgenda(clock,characters).some(x=>x.id==='party-plan'),true);
const advance=(current,delta,rows=[])=>advanceCampaignCalendar(current,{deltaMinutes:delta,eventId:'advance-'+delta,
 reason:'QA move campaign time',gmConfirmed:true,characters,journal:rows});
let progressed=advance(clock,6);
assert.equal(progressed.minute,6);
assert.throws(()=>advance(progressed,1),/živ|patient|Treatment/);
progressed=cancelConcurrentProcedure(progressed,{id:'cancelled-treatment',startId:'living-treatment',reason:'QA controlled interruption',confirmed:true});
progressed=advance(progressed,2);
assert.equal(progressed.minute,8);
assert.throws(()=>advance(progressed,1),/party-plan/);
progressed=completeGMCalendarPlan(progressed,{id:'party-response',planId:'party-plan',confirmed:true});
assert.throws(()=>advance(progressed,3),/living-plan/);

const personal=livingPersonalCalendarSources(journal,campaignId,deceasedCalendarActors(characters));
assert.deepEqual(personal.map(x=>x.id),['living-poison','archived-poison','dead-soporific-end','physical-elixir']);
const guard=(fn,rows)=>fn({journal:rows,campaignId,beforeMinute:0,afterMinute:5});
assert.throws(()=>guard(requireParalyticGMTimeMayAdvance,journal),/dead-poison/);
assert.throws(()=>guard(requireParalyticGMTimeMayAdvance,personal),/living-poison/);
assert.throws(()=>guard(requireAlchemyGMTimeMayAdvance,journal),/Healing/);
assert.equal(guard(requireAlchemyGMTimeMayAdvance,personal),true);
assert.throws(()=>guard(requireSoporificGMTimeMayAdvance,journal),/Soporific/);
assert.equal(guard(requireSoporificGMTimeMayAdvance,personal),true);
assert.deepEqual({clock,journal},snapshot,'history is immutable');
console.log('PASS deceased personal dates, timed treatment, herbal/alchemy guards, living/global blockers and retained history');
