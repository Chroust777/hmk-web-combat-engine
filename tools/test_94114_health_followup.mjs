import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {initialCombatState,validateCombatState} from '../src/integration/persistent-combat-state.js';
import {applyConfirmedTreatment,applyConfirmedInjuryHealing,applyConfirmedInfectionCourse,
 applyConfirmedInfectionAmputation} from '../src/integration/hmk-healing-persistence.js';
import {projectLiveInjuries,projectInjuredMovement} from '../src/integration/live-injury-impairment.js';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const source=(start,end)=>{
 const from=app.indexOf(start),to=app.indexOf(end,from+start.length);
 assert.ok(from>=0&&to>from);
 return app.slice(from,to);
};
const wound=(id,side)=>({id,location:'ca',side,bodyKind:'human',severity:'S',level:3,
 aspect:'e',bleeding:false,nextAdvanceRound:null});
const record=(state,woundId,eventId,daySinceInjury)=>({state,woundId,eventId,daySinceInjury,
 round:1,gmConfirmed:true});
const treat=(state,id)=>applyConfirmedTreatment({...record(state,id,`treat-${id}`,0),untreated:true}).state;
const heal=(state,id,day,roll)=>applyConfirmedInjuryHealing({...record(state,id,`heal-${id}-${day}`,day),
 endurance:12,will:12,roll}).state;
const initial=initialCombatState();
initial.wounds.push(wound('primary','left'));
const treated=treat(initial,'primary');
const infected=heal(treated,'primary',5,95);
assert.equal(infected.wounds[0].healing.infected,true);
for(const [physicianRoll,sl,level,bleeding] of [[20,'CS',2,false],[21,'S',3,true],[91,'F',4,true],[95,'CF',5,true]]){
 const surgery=applyConfirmedInfectionAmputation({...record(infected,'primary',sl,6),
  physicianML:100,physicianIndex:10,physicianRoll,locationShock:1,shockML:90,shockRoll:5,
  amputationStrengthML:90,amputationRoll:20,
  procedureTime:{startMinute:9120,endMinute:9121,gmConfirmed:true}});
 assert.equal(surgery.state.events.at(-1).details.sl,sl);
 assert.equal(surgery.state.wounds[0].healing.infected,false);
 assert.equal(surgery.state.wounds[0].healing.nextInfectionDay,null);
 assert.equal(surgery.edgeWound.level,level);
 assert.equal(surgery.edgeWound.bleeding,bleeding);
 assert.equal(surgery.edgeWound.amputation.severed,true);
 assert.equal(surgery.edgeWound.side,'left');
 validateCombatState(JSON.parse(JSON.stringify(surgery.state)));
}

const permanentFixture=initialCombatState();
permanentFixture.wounds.push({...wound('primary','left'),aspect:'p'});
const permanentTreated=treat(permanentFixture,'primary');
for(const stop of [20,40,60,80,100]){
 let state=permanentTreated;
 const penalty=stop/4;
 for(let day=5;day<stop;day+=5)state=heal(state,'primary',day,81);
 state=heal(state,'primary',stop,5);
 assert.equal(state.wounds[0].level,1);
 assert.equal(state.wounds[0].healing.permanentImpairment,penalty);
 assert.equal(projectInjuredMovement({state,round:1}).impairment,penalty);
 state=heal(state,'primary',stop+5,1);
 state=JSON.parse(JSON.stringify(state));
 assert.equal(state.wounds[0].healed,true);
 assert.equal(projectLiveInjuries({state,round:1,test:'agility'}).impairment,penalty);
 assert.equal(projectInjuredMovement({state,round:1}).impairment,penalty);
}
let prolonged=structuredClone(permanentFixture);
prolonged.wounds.push({...wound('second','right'),aspect:'p'});
prolonged=treat(treat(prolonged,'primary'),'second');
prolonged=heal(prolonged,'primary',5,95);
assert.throws(()=>heal(prolonged,'second',5,5),/infekce přerušuje/);
for(let day=6;day<=20;day++){
 prolonged=applyConfirmedInfectionCourse({...record(prolonged,'primary',`course-${day}`,day),
  endurance:12,will:12,roll:day%2?81:21,otherWoundDays:{second:day}}).state;
}
assert.equal(prolonged.wounds[0].healing.permanentImpairment,5);
assert.equal(projectInjuredMovement({state:prolonged,round:1}).impairment,20);
prolonged=applyConfirmedInfectionCourse({...record(prolonged,'primary','course-recovery',21),
 endurance:12,will:12,roll:5,otherWoundDays:{second:21}}).state;
assert.equal(prolonged.wounds[0].healing.infected,false);
assert.deepEqual(prolonged.wounds.map(w=>w.healing.nextHealingDay),[26,26]);
prolonged=heal(heal(prolonged,'primary',26,5),'second',26,81);
prolonged=heal(prolonged,'primary',31,1);
for(let day=31;day<41;day+=5)prolonged=heal(prolonged,'second',day,81);
prolonged=heal(heal(prolonged,'second',41,5),'second',46,1);
assert.deepEqual(prolonged.wounds.map(w=>[w.healed,w.healing.permanentImpairment]),[[true,5],[true,10]]);
assert.equal(projectInjuredMovement({state:prolonged,round:1}).impairment,15);

const scar={...wound('scar','left'),healed:true,amputation:{severed:true}};
const chronic={...wound('chronic','right'),healed:true,healing:{permanentImpairment:10}};
const historical={...wound('old','right'),location:'ha',healed:true};
const renderAnatomy=runInNewContext(source('const JOURNAL_ANATOMICAL_LOCATIONS=', 'function journalWoundCareButton')+
 source('function journalBodyLocationsHTML(', 'function journalConvocationsHTML(')+'journalBodyLocationsHTML',{
  data:{inventory:[]},identifyWornPrintedSuit:()=>({ok:false}),armourCoverageReport:()=>({locations:{}}),
  persistentStateOf:()=>({wounds:[scar,chronic,historical]}),hmkHumanLocationSymbols:()=>null,
  calculateWeatherAreaAV:()=>({ready:true,value:0,raw:0}),
  esc:String,journalTerm:String,journalHelpData:()=>'',
 });
const html=renderAnatomy({id:'patient',hmk:{injuries:[scar]}});
const calf=html.match(/<tr><th scope="row">CA<\/th>.*?<\/tr>/)[0];
assert.match(calf,/L:<\/strong>.*Trvalá amputace.*R:<\/strong>.*Trvalé Impairment 10/);
assert.equal(calf.match(/Trvalá amputace/g).length,1);
assert.match(html,/Aktivní rány: 0/);
assert.doesNotMatch(html,/S3e/);

const heading={textContent:'Aktuální krok: Treatment'};
const cards=[{dataset:{weatherCareCard:'treatment'},hidden:false,querySelector:()=>null},
 {dataset:{weatherCareCard:'healing'},hidden:true,querySelector:()=>null}];
const panel={querySelectorAll:s=>s==='[data-weather-care-card]'?cards:[],querySelector:()=>heading};
runInNewContext(source('const weatherCareStepLabels=', 'function ')+
 source('function syncWeatherCarePanel()', 'let calendarUI=')+'syncWeatherCarePanel()',{
 document:{querySelector:()=>panel},weatherCareActiveSection:'healing',
});
assert.equal(cards[0].hidden,true);
assert.equal(cards[1].hidden,false);
assert.equal(heading.textContent,'Aktuální krok: Healing');

const listener=source("document.addEventListener('click',e=>{\n const button=e.target.closest?.('[data-infection-amputation]", 
 "document.addEventListener('click',e=>{\n const action=e.target.closest?.('[data-treatment-select-untreated]');");
const actor={id:'patient'},routes=[];
runInNewContext(listener,{
 document:{addEventListener:(_,handler)=>{
  for(const back of [false,true])handler({target:{closest:()=>({hidden:false,
   form:{elements:{namedItem:()=>({value:'patient::primary'})}},hasAttribute:()=>back,
  })}});
 }},character:id=>id===actor.id?actor:null,persistentStateOf:()=>infected,
 canAmputateInfectedLimb:w=>w?.healing?.infected===true,
 focusCalendarRuleAction:(_,kind,id)=>routes.push([kind,id]),
});
assert.deepEqual(routes,[['frost-amputation','primary'],['infection','primary']]);
console.log('PASS v94.114: infection AMP CS/S/F/CF, impairment 20/40/60/80/100 days, infection pause and recovery, anatomy, care title, same-wound return');
