import assert from 'node:assert/strict';
import {
 MAX_ALCHEMY_PREPARATIONS,
 createAlchemyStart,
 createAlchemyFinish,
 createAlchemyAbort,
 pendingAlchemyPreparations,
 requireAlchemyGMTimeMayAdvance,
 validateAlchemyJournal
} from '../src/integration/hmk-alchemy-preparation.js';
import {resolveSkillTest} from '../src/integration/hmk-skill-test-engine.js';

const journal=[];
const record=(id, campaignMinute, field, proof, characterId='A')=>({
 id, calendarCampaignId:'C', campaignMinute, characterId, [field]:proof
});
const startOptions={
 journal, campaignId:'C', actorId:'A', alchemyML:80, minute:0,
 elixirName:'Healing', sunsign:'Ùlándus', wealth:30, workshopConfirmed:true,
 timeD6:[2,3,4], timeOrigins:['manual','manual','manual'], assistantPlan:[], requireLinkedRoll:true
};
const start=(id, options={})=>{
 const proof=createAlchemyStart({...startOptions,...options});
 const row=record(id,proof.minute,'calendarAlchemyStart',proof,proof.actorId);
 journal.push(row);
 return row;
};
const first=start('legacy',{requireLinkedRoll:false,timeD6:[1,1,1]});
const twin=start('twin',{timeD6:[1,1,1]});
const later=start('later',{minute:1440,timeD6:[1,1,2],alchemyML:120});
assert.equal(first.calendarAlchemyStart.dueMinute,twin.calendarAlchemyStart.dueMinute);
assert.equal(later.calendarAlchemyStart.dueMinute,15*1440);
assert.equal(createAlchemyStart({...startOptions,alchemyML:60}).durationDays,
 createAlchemyStart({...startOptions,alchemyML:120}).durationDays);
for(let index=3;index<MAX_ALCHEMY_PREPARATIONS;index++){
 start('dose-'+index,{minute:1440,elixirName:'Darkvision',assistantPlan:index===3?[{actorId:'helper',ml:60}]:[]});
}
assert.equal(pendingAlchemyPreparations(journal,'C').length,15);
assert.throws(()=>createAlchemyStart(startOptions),/15 dávek/);
assert.throws(()=>createAlchemyStart({...startOptions,actorId:'helper'}),/asistuje/);
assert.equal(createAlchemyStart({...startOptions,actorId:'B'}).actorId,'B');
assert.equal(createAlchemyStart({...startOptions,campaignId:'D'}).campaignId,'D');

function addRoll(startRow, id, linked=true) {
 const {dueMinute,alchemyML,sunsignModifier}=startRow.calendarAlchemyStart;
 const a=resolveSkillTest({ml:alchemyML,roll:41,secondaryMLs:[70,65],gmModifier:sunsignModifier,svExtra:1});
 a.secondarySVBonus=1;
 const proof={
  type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],
  secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},
  a, gmModifiers:[sunsignModifier], helpers:[]
 };
 const row=record(id,dueMinute,'skillTestProof',proof);
 if(linked)row.calendarCharacterCraftSkill={startId:startRow.id};
 journal.push(row);
 return row;
}
function finish(startRow, skillRow, records=journal){
 const checks=Math.min(5,Math.max(0,skillRow.skillTestProof.a.sv-4));
 const args={
  journal:records, campaignId:'C', actorId:'A', minute:startRow.calendarAlchemyStart.dueMinute,
  startId:startRow.id, skillId:skillRow.id, gmContinuityConfirmed:true,
  augmentationD10:Array(checks).fill(skillRow.id==='twin-roll'?10:1),augmentationOrigins:Array(checks).fill('manual')
 };
 return createAlchemyFinish(args);
}
const beforeMinute=first.calendarAlchemyStart.dueMinute;
const advance=()=>requireAlchemyGMTimeMayAdvance({journal,campaignId:'C',beforeMinute,afterMinute:beforeMinute+1});
assert.throws(advance,/nesmí přeskočit/);
const firstRoll=addRoll(first,'legacy-roll',false);
const twinRoll=addRoll(twin,'twin-roll');
assert.throws(()=>finish(twin,firstRoll),/originální Alchemy/);
assert.throws(()=>finish(first,twinRoll),/originální Alchemy/);
const firstFinish=finish(first,firstRoll);
journal.push(record('first-finish',beforeMinute,'calendarAlchemyFinish',firstFinish));
assert.throws(advance,/nesmí přeskočit/);
const twinFinish=finish(twin,twinRoll);
journal.push(record('twin-finish',beforeMinute,'calendarAlchemyFinish',twinFinish));
assert.ok(firstFinish.baseAS>twinFinish.baseAS);
assert.equal(advance(),true);
assert.equal(pendingAlchemyPreparations(journal,'C').length,13);

const laterRoll=addRoll(later,'later-roll');
const laterFinish=finish(later,laterRoll);
assert.throws(()=>finish(later,laterRoll,[...journal,record('combat',5000,'combatProof',{})]),/přerušila přípravu/);
journal.push(record('later-finish',laterFinish.minute,'calendarAlchemyFinish',laterFinish));
const abort=createAlchemyAbort({journal,campaignId:'C',actorId:'A',startId:'dose-3',minute:laterFinish.minute,
 reason:'GM potvrdil přerušení',gmConfirmed:true});
journal.push(record('aborted',abort.minute,'calendarAlchemyAbort',abort));
start('replacement',{minute:abort.minute,assistantPlan:[{actorId:'helper',ml:60}]});
assert.equal(pendingAlchemyPreparations(journal,'C').length,12);
assert.equal(validateAlchemyJournal(JSON.parse(JSON.stringify(journal))),true);
console.log('PASS parallel alchemy: cap, campaign isolation, independent timing and rolls, GM barriers, assistants, legacy replay');
