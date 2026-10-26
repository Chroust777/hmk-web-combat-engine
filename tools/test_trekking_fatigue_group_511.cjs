'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const R=require('../src/integration/hmk-trekking-readiness.js'),P=require('../src/integration/hmk-trekking-party-modes.js');
let original=[],weather=[];
const group={format:'hmk-trek-party-modes-v1',memberIds:['a','b'],guideId:'a',conveyance:'foot',loaded:false,manualLoaded:false,loadUnresolved:[],members:[]};
const member=(id,fatigue)=>({id,name:id,fatigue,injured:false,immobile:false,seriousWounds:[],modifiedENC:0,minimumENC:null,loaded:false,loadUnresolved:false});
const source={id:'watch',characterId:'a',calendarCampaignId:'t511',campaignMinute:480,calendarTrekProof:{format:'hmk-trekking-watch-evidence-v1',modes:{ignoreLoaded:false,slow:1},partyModes:group,movement:{leagues:2,kilometres:8}}};
R.assessTrekkingReadiness=()=>({sourceId:'watch',source,orienteeringId:'o',movement:source.calendarTrekProof.movement});
P.trekPartyModes=()=>({...group,members:weather});
const {planHMKGroupWatch}=require('../src/integration/hmk-group-travel.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
let n=0;const eq=(x,y)=>{assert.deepEqual(x,y);n++},bad=(f,r)=>{assert.throws(f,r);n++};
let serial=0;const idFactory=()=>`p-${++serial}`;
const clock={minute:480,campaignId:'t511',characterIds:['a','b']};
const actor=(id,end=10)=>({id,name:id,hmk:{attributes:{end},combatState:initialCombatState()}});
const characters=[actor('a'),actor('b')];
function params(kind='walk',journal=[]){return {journal,characters,clock,memberIds:['a','b'],guideId:'a',kind,idFactory,diceByActor:{a:{rawValues:kind==='double-walk'?['10','10','10','10']:['10']},b:{rawValues:kind==='double-walk'?['10','10','10','10']:['10']}}}}
// At departure Fatigue 35; weather during the watch adds 10. It may now be
// 45, but recording the already travelled watch must remain permitted.
original=[member('a',35),member('b',0)];weather=[member('a',45),member('b',0)];group.members=original;
characters[0].hmk.combatState.fatigue.weariness=45;
const onset=[{id:'roll-a',characterId:'a',calendarCampaignId:'t511',calendarTrekSkillSource:{format:'hmk-trek-linked-skill-v1',sourceId:'watch',hazard:'weather'}},
{id:'weather-a',characterId:'a',calendarCampaignId:'t511',skillTestProof:{type:'skill-weather-onset',sourceId:'roll-a',report:{addedWeariness:10}}}];
let p=planHMKGroupWatch(params('walk',onset));eq(p.plans.length,2);eq(p.plans[0].calendarActivityProof.plan.accrual,5);
// No witness: cannot claim another unrelated +10 change was weather.
bad(()=>planHMKGroupWatch(params('walk',[])),/změnily/);
// A character already at 40 before the watch cannot start walking.
original=[member('a',40),member('b',0)];weather=[...original];group.members=original;
characters[0].hmk.combatState.fatigue.weariness=40;
bad(()=>planHMKGroupWatch(params('walk')),/dosahuje 40/);
// Blood loss weakens the traveller too: 32 Weariness + 9 Blood Loss Weakness.
// The old plan guard ignored this Weakness and would accept departure.
source.calendarTrekProof.partyModes=null;
characters[0].hmk.combatState.fatigue.weariness=32;
characters[0].hmk.combatState.bloodLoss.weaknessFatigue=9;
bad(()=>planHMKGroupWatch(params('walk')),/dosahuje 40/);
// Rider without a foot locomotion limit can be transported at high Fatigue,
// but the END roll must still use the original riding +2 modifier.
source.calendarTrekProof.partyModes=null;
p=planHMKGroupWatch(params('ride'));eq(p.plans[0].calendarActivityProof.plan.rolls[0].tn,7);
console.log('PASS '+n+' Trekking party weather crossing, original eligibility, blood loss, riding END TN');
