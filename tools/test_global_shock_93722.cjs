'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),original=require.extensions['.js'];
require.extensions['.js']=(m,p)=>p.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p):original(m,p);
const {initialCombatState,validateCombatState,applyExtendedShockCourse,applyComaCourse}=require('../src/integration/persistent-combat-state.js');
const {prepareColdWaterShock}=require('../src/integration/hmk-weather-trauma-completion.js');
const {resolveParallelColdReroll,resolveParallelColdCourse,assertParallelColdShocksAppendOnly}=require('../src/integration/hmk-parallel-cold-shock.js');
const {createCampaignCalendar,anchorCampaignOrigin,campaignCalendarAgenda}=require('../src/integration/hmk-campaign-calendar.js');
const {assertLegacyMutationDoesNotChangeCombat}=require('../src/integration/active-combat-write-boundary.js');
const a={id:'a1',name:'Patient',hmk:{attributes:{end:12,wil:14},skills:[{name:'Shock',ml:70}]}};
let count=0;const eq=(a,b)=>{assert.deepEqual(a,b);count++},yes=x=>{assert.ok(x);count++},bad=(fn,re)=>{assert.throws(fn,re);count++};
function start({coma=false}={}){let s=initialCombatState();s.shock='INC';s.shockOriginRound=1;s.extendedShock={originState:'INC',hr:5,elapsedHours:0,domain:'travel-weather',sourceId:'old'};
 if(coma)s.coma={active:true,hr:5,elapsedDays:0,nextCourseDays:3,domain:'travel-weather',sourceId:'old'};
 validateCombatState(s);return s;}
function cold(s,sourceId='new'){return prepareColdWaterShock({actor:a,state:s,sourceId,round:2,condition:'freezingWater',d6s:[2,2,3],enduranceD100:100,originMinute:720,gmConfirmed:true}).state;}
for(const withComa of [false,true]){
 const src=start({coma:withComa}),originalCopy=structuredClone(src);
 const s=cold(src,'new-'+withComa);eq(src,originalCopy);eq(s.shock,'UNC');eq(s.extendedShock,src.extendedShock);eq(s.coma,src.coma);
 eq(s.parallelColdShocks[0].followup.dueMinute,730);validateCombatState(s);
 const clock=createCampaignCalendar({day:1,hour:12,minute:0,label:'Proof',eventId:'init',gmConfirmed:true,campaignId:'c1',characterIds:[a.id]});
 const firstAnchor=anchorCampaignOrigin(clock,{kind:'extended-shock',characterId:a.id,elapsedMinutes:0,eventId:'primary-anchor',gmConfirmed:true});
 const anchored=withComa?anchorCampaignOrigin(firstAnchor,{kind:'coma',characterId:a.id,elapsedMinutes:0,eventId:'primary-coma-anchor',gmConfirmed:true}):firstAnchor;
 const agenda=campaignCalendarAgenda(anchored,[{...a,hmk:{...a.hmk,healthState:s}}],[]);
 yes(agenda.all.some(x=>x.id==='weather-shock:a1:new-'+withComa&&x.minute===730));
 yes(agenda.all.some(x=>x.id==='extended-shock:a1:null'&&x.minute===960));
 if(withComa)yes(agenda.all.some(x=>x.id==='coma:a1:null'&&x.minute===720+3*1440));
 bad(()=>resolveParallelColdReroll({state:s,sourceId:'new-'+withComa,round:3,eventId:'tooearly',minute:729,shockML:70,roll:66,gmConfirmed:true}),/není splatný/);
 const reroll=resolveParallelColdReroll({state:s,sourceId:'new-'+withComa,round:3,eventId:'reroll-'+withComa,minute:730,shockML:70,roll:66,gmConfirmed:true});
 eq(reroll.state.parallelColdShocks[0].extendedShock.hr,5);eq(reroll.state.shock,'UNC');
 const nextAgenda=campaignCalendarAgenda(anchored,[{...a,hmk:{...a.hmk,healthState:reroll.state}}],[]);
 yes(nextAgenda.all.some(x=>x.id==='extended-shock:a1:new-'+withComa&&x.minute===970));
 bad(()=>resolveParallelColdReroll({state:reroll.state,sourceId:'new-'+withComa,round:4,eventId:'duplicate',minute:730,shockML:70,roll:66,gmConfirmed:true}),/není splatný/);
 const origCourse=applyExtendedShockCourse({state:reroll.state,round:4,eventId:'old-course-'+withComa,healingBase:13,roll:10,elapsedHoursSinceOnset:4,gmConfirmed:true}).state;
 eq(origCourse.extendedShock,null);eq(origCourse.shock,'UNC');
 const recovered=resolveParallelColdCourse({state:origCourse,sourceId:'new-'+withComa,kind:'extended-shock',round:5,eventId:'new-course-'+withComa,minute:970,actor:a,roll:10,gmConfirmed:true});
 eq(recovered.state.parallelColdShocks[0].phase,'resolved');
 if(withComa)eq(recovered.state.shock,'NONE');else eq(recovered.state.shock,'NONE');
 bad(()=>resolveParallelColdCourse({state:recovered.state,sourceId:'new-'+withComa,kind:'extended-shock',round:6,eventId:'repeat-course',minute:970,actor:a,roll:10,gmConfirmed:true}),/neexistuje/);
 assertParallelColdShocksAppendOnly(s,reroll.state);assertParallelColdShocksAppendOnly(reroll.state,origCourse);assertParallelColdShocksAppendOnly(origCourse,recovered.state);count+=3;
 const forgery=structuredClone(recovered.state);forgery.parallelColdShocks[0].originMinute=500;
 bad(()=>assertParallelColdShocksAppendOnly(recovered.state,forgery),/Původní minuta/);
 const erase=structuredClone(recovered.state);erase.parallelColdShocks=[];
 bad(()=>assertParallelColdShocksAppendOnly(recovered.state,erase),/nesmí zmizet/);
}
// Cold Water UNC+CF has no direct injury IL to derive the printed coma HR:
// do not fabricate it, but maintain the original coma independently.
let s=cold(start({coma:true}),'coldcf');
bad(()=>resolveParallelColdReroll({state:s,sourceId:'coldcf',round:3,eventId:'cf',minute:730,shockML:70,roll:100,gmConfirmed:true}),/GM musí výslovně rozhodnout/);
s=resolveParallelColdReroll({state:s,sourceId:'coldcf',round:3,eventId:'cf',minute:730,shockML:70,roll:100,gmConfirmed:true,initialComaHR:4,initialComaD10:2}).state;
eq(s.parallelColdShocks[0].extendedShock.hr,4);eq(s.parallelColdShocks[0].coma.nextCourseDays,2);
let agenda=campaignCalendarAgenda(createCampaignCalendar({day:1,hour:12,minute:0,gmConfirmed:true,eventId:'init',characterIds:['a1']}),[{...a,hmk:{...a.hmk,healthState:s}}],[]);
yes(agenda.all.some(x=>x.id==='coma:a1:coldcf'&&x.minute===730+2880));
// Resolve both secondary courses, without cancelling the original coma.
s=resolveParallelColdCourse({state:s,sourceId:'coldcf',kind:'extended-shock',round:4,eventId:'ext-1',minute:970,actor:a,roll:10,gmConfirmed:true}).state;
eq(s.parallelColdShocks[0].phase,'coma');yes(s.parallelColdShocks[0].coma.active);yes(s.coma.active);
s=resolveParallelColdCourse({state:s,sourceId:'coldcf',kind:'coma',round:5,eventId:'coma-1',minute:3610,actor:a,roll:10,gmConfirmed:true}).state;
eq(s.parallelColdShocks[0].phase,'resolved');yes(s.coma.active);
// Combat mutation boundary: unrelated inventory rows must not be frozen.
const aItem={id:'shield',characterId:'fighter',value:1},nItem={id:'apple',characterId:'bystander',value:1};
const b={characters:[{id:'fighter',name:'Warrior'},{id:'bystander',name:'Civilian'}],inventory:[aItem,nItem],journal:[],combatRuntime:{round:1}};
const change=structuredClone(b);change.inventory[1].value=2;
yes(assertLegacyMutationDoesNotChangeCombat(b,change,{sequence:{},participantIds:['fighter']}));
const illegal=structuredClone(b);illegal.inventory[0].value=2;
bad(()=>assertLegacyMutationDoesNotChangeCombat(b,illegal,{sequence:{},participantIds:['fighter']}),/Inventář účastníků/);
console.log(`PASS ${count} independent Cold/Extended/Coma and Combat inventory concurrency assertions`);
