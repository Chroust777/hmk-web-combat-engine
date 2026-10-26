'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const R=require('../src/integration/hmk-trekking-readiness.js'),P=require('../src/integration/hmk-trekking-party-modes.js');
let n=0;const eq=(v,w)=>{assert.deepEqual(v,w);n++},yes=(v)=>{assert.ok(v);n++};
const base=[{id:'a',name:'A',fatigue:0,injured:false,immobile:false,seriousWounds:[],modifiedENC:22,minimumENC:null,loaded:true,loadUnresolved:false},
{id:'b',name:'B',fatigue:0,injured:false,immobile:false,seriousWounds:[],modifiedENC:0,minimumENC:null,loaded:false,loadUnresolved:false}];
const source={id:'watch',calendarCampaignId:'travel-c',characterId:'a',calendarTrekProof:{modes:{ignoreLoaded:true},partyModes:{format:'hmk-trek-party-modes-v1',guideId:'a',memberIds:['a','b'],conveyance:'foot',members:base,loaded:true,manualLoaded:false,loadUnresolved:[]}}};
R.assessTrekkingReadiness=()=>({sourceId:'watch',source,orienteeringId:'o',movement:{leagues:3,kilometres:12}});
P.trekPartyModes=()=>({...source.calendarTrekProof.partyModes,members:base.map(m=>m.id==='a'?{...m,fatigue:10}:m)});
const {planHMKGroupWatch}=require('../src/integration/hmk-group-travel.js');
const clock={minute:480,campaignId:'travel-c',characterIds:['a','b']};
const actors=base.map(m=>({id:m.id,name:m.name,hmk:{attributes:{end:10},combatState:{fatigue:{weariness:m.id==='a'?10:0,windedness:0,otherWeakness:0}}}}));
const weatherRoll={id:'r-a',characterId:'a',calendarCampaignId:'travel-c',campaignMinute:480,
 calendarTrekSkillSource:{format:'hmk-trek-linked-skill-v1',sourceId:'watch',hazard:'weather'}};
const onset={id:'on-a',characterId:'a',calendarCampaignId:'travel-c',campaignMinute:480,
 skillTestProof:{type:'skill-weather-onset',sourceId:'r-a',report:{addedWeariness:10}}};
let id=0;const args={journal:[weatherRoll,onset],characters:actors,clock,memberIds:['a','b'],guideId:'a',kind:'walk',idFactory:()=>`proof-${++id}`,diceByActor:{a:{rawValues:['10']},b:{rawValues:['10']}}};
const result=planHMKGroupWatch(args);
eq(result.plans.length,2);
const accruals=result.plans.map(x=>x.calendarActivityProof.plan.accrual);
eq(accruals,[25,5]); // 5 base + 20 from ENC22 only for A; weather +10 already present in Combat State
const pa=result.plans[0].calendarActivityProof.plan;
eq(pa.extraLoad,20);eq(pa.weatherExtra,0);
yes(pa.rolls.length===1&&pa.rolls[0].success===false);
// No additional weather witness -> a fatigue change since preparing the watch is unexplained.
assert.throws(()=>planHMKGroupWatch({...args,journal:[]}),/změnily/);n++;
console.log('PASS '+n+' loaded trekking Fatigue and attested same-watch weather deltas v93.509');
