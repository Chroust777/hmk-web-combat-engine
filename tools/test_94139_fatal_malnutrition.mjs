import assert from 'node:assert/strict';
import {advanceCampaignCalendar,campaignCalendarAgenda,createCampaignCalendar} from '../src/integration/hmk-campaign-calendar.js';
import {episodeTimedMedicalPreview} from '../src/integration/hmk-episode-timed-medical.js';
import {applyDueMalnutritionOnsets,dueMalnutritionCases,resolveMalnutritionCourse,validateMalnutritionEvidence} from '../src/integration/hmk-malnutrition-medical.js';
import {createNutritionPolicy,finishDueNutritionDays} from '../src/integration/hmk-nutrition-days.js';
import {initialCombatState} from '../src/integration/persistent-combat-state.js';

const DAY=1440,campaignId='qa-health';
let serial=0;
const idFactory=()=>`qa-${++serial}`,stamp=()=>new Date(0).toISOString();
const actor=(id)=>({id,name:id,kind:'PC',hmk:{attributes:{end:12,wil:12},healthState:initialCombatState()}});

function scenario(kind){
 const target=actor('patient'),other=actor('other'),characters=[target,other];
 const campaignClock=createCampaignCalendar({day:1,hour:0,minute:0,campaignId,
  eventId:idFactory(),characterIds:characters.map(c=>c.id),gmConfirmed:true});
 const db={campaignClock,characters,journal:[],inventory:[]};
 for(const c of characters)db.journal.push({id:idFactory(),characterId:c.id,calendarCampaignId:campaignId,
  campaignMinute:0,calendarNutritionPolicy:createNutritionPolicy({campaignId,minute:0,actorId:c.id,foragingOnly:true})});
 const advance=(minute)=>{
  db.campaignClock=advanceCampaignCalendar(db.campaignClock,{deltaMinutes:minute-db.campaignClock.minute,
   eventId:idFactory(),reason:'Test of campaign clock',gmConfirmed:true,characters,journal:db.journal,inventory:db.inventory});
  finishDueNutritionDays(db,{idFactory,stamp});
  applyDueMalnutritionOnsets(db,{idFactory,stamp});
  assert.equal(dueMalnutritionCases(db).some(t=>t.overdue),false,'clock commit must not see an overdue case');
 };
 const eatOrDrink=(c,unit,at)=>db.journal.push({id:idFactory(),characterId:c.id,calendarCampaignId:campaignId,
  campaignMinute:at,calendarForagingSupplyUse:{unit,quantity:1,disposition:'consumed'}});
 const roll=(due,number)=>resolveMalnutritionCourse(db,{actorId:due.characterId,episodeId:due.episodeId,
  roll:number,gmConfirmed:true,idFactory,stamp});
 const hours=kind==='thirst'?5:11;
 const history=[];
 for(let day=1;day<=hours;day++){
  // The other character stays healthy. For a fatal starvation case, leave
  // thirst active but stable until the fatal starvation check.
  for(const unit of ['foodDays','waterDays'])eatOrDrink(other,unit,day*DAY);
  advance(day*DAY);
  const due=dueMalnutritionCases(db).filter(t=>t.dueMinute===day*DAY);
  // When both are due, resolve the fatal course before the surviving course.
  for(const t of due.filter(t=>t.kind===kind)){
   history.push(roll(t,100).proof.afterHR);
  }
  for(const t of due.filter(t=>t.kind!==kind)){
   if(target.hmk.healthState.shock!=='KIA')roll(t,5);
  }
  if(target.hmk.healthState.shock==='KIA')break;
 }
 assert.deepEqual(history,kind==='thirst'?[2,0]:[3,1,0]);
 const remaining=target.hmk.healthState.malnutritionEpisodes.find(t=>t.kind!==kind);
 assert.equal(remaining.status,'active','historical HR and other disease remain intact');
 assert.equal(dueMalnutritionCases(db).some(t=>t.characterId===target.id),false);
 assert.equal(campaignCalendarAgenda(db.campaignClock,characters,db.journal,db.inventory).all
  .some(t=>t.kind==='malnutrition-course'&&t.characterId===target.id),false);
 const end=Math.max(remaining.nextDueMinute,db.campaignClock.minute)+1;
 const preview=episodeTimedMedicalPreview(db,{endMinute:end,idFactory,stamp});
 assert.equal(preview.requirements?.some(t=>t.characterId===target.id)??false,false);
 for(let day=Math.floor(db.campaignClock.minute/DAY)+1;day<=Math.floor(end/DAY);day++){
  for(const unit of ['foodDays','waterDays'])eatOrDrink(other,unit,day*DAY);
 }
 advance(end);
 assert.equal(target.hmk.healthState.shock,'KIA');
 assert.equal(validateMalnutritionEvidence(db),true,'original fatal rolls still validate');
}
scenario('thirst');
scenario('starvation');
console.log('PASS fatal thirst and starvation, coexisting illness, calendar and travel advance, immutable evidence');
