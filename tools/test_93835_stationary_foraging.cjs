'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const O=require('../src/integration/hmk-time-episodes.js');
const S=require('../src/integration/hmk-foraging-supply-ledger.js');
const W=require('../src/integration/hmk-trekking-orienteering.js');
let n=0;
function eq(a,b,msg){assert.deepEqual(a,b,msg);n++}
function reject(f,re,msg){assert.throws(f,re,msg);n++}
const context={guideId:'actor',memberIds:['actor'],area:'les',topography:'flat',terrain:'mixed-forest',conveyance:'foot',weatherSourceId:'weather',night:false,familiar:false,torchlight:false,fullMoon:false,afterSnowfall:false};
function state(sv,manualModes,options={}){
 return O.computeEpisodeOrientation({mode:'new',currentSkill:{skill:'Survival',guideId:'actor',sv,level:'S',stars:Math.max(0,sv-4),roll:31,skillId:'skill-id'},context,minute:480,priority:'forage',stationaryForaging:true,allocationMode:manualModes?'manual':'auto',manualModes,...options});
}
for(let sv=-2;sv<=12;sv++){
 const r=state(sv);eq(r.adjustment.adjustedSV,sv+2,'+2 Stationary');
 eq(r.modes.foraging,Math.min(5,Math.max(0,sv+2-4)),'first two and remainder Foraging');
 eq([r.modes.bearing,r.modes.progress],[0,0],'no travel modes');
 eq(r.adjustment.stationaryForaging,true,'rule attribution');
}
const base=state(5);eq(base.modes.foraging,3,'SV5 +2 SV => 3 Foraging');
const valid=state(5,{bearing:0,progress:0,foraging:2,stalking:1,vigilance:0});eq([valid.modes.foraging,valid.modes.stalking],[2,1]);
reject(()=>state(5,{bearing:0,progress:0,foraging:1,stalking:1,vigilance:1}),/první dva/);
reject(()=>state(5,{bearing:1,progress:0,foraging:2,stalking:0,vigilance:0}),/Progress, Bearing/);
reject(()=>O.computeEpisodeOrientation({mode:'reuse',context,previous:{},stationaryForaging:true}),/nový situační Orienteering/);
const f1=O.calculateEpisodeForaging({minutes:60,habitat:'mixed-forest',season:'summer',roll:10,target:'food-water'});
const f2=O.calculateEpisodeForaging({minutes:60,habitat:'mixed-forest',season:'summer',roll:10,target:'food-water',carryIn:f1.carryOut});
const f3=O.calculateEpisodeForaging({minutes:60,habitat:'mixed-forest',season:'summer',roll:10,target:'food-water',carryIn:f2.carryOut});
const journal=[{id:'stationary',characterId:'actor',calendarCampaignId:'aud',campaignMinute:480,calendarTimeEpisode:{kind:'forage',startMinute:480,endMinute:540,minutes:60,standaloneForaging:[f1,f2,f3],foraging:f1}}];
const lots=S.supplyLots(journal,'aud');
eq(lots.reduce((a,l)=>a+l.quantity,0),4,'each independent Mode accounted, including fractional carry');
eq(lots.length,6,'three separate food and water batches; no duplicate alias');
const legacy=[{...journal[0],calendarTimeEpisode:{kind:'forage',foraging:f1}}];
eq(S.supplyLots(legacy,'aud').length,2,'legacy singleton retained');
const none=O.calculateEpisodeForaging({minutes:60,habitat:'desert',season:'summer',roll:1,target:'food-water'});
const zero=O.calculateEpisodeForaging({minutes:240,habitat:'mixed-forest',season:'spring',roll:3,target:'food-water'});
eq([none.results[0].foodDays,none.results[0].waterDays],[0,0],'none');
eq([zero.results[0].foodDays,zero.results[0].waterDays],[0,1],'zero');
console.log('PASS',n,'stationary HMK +2SV, mode allocation, invalid advantage prevention, 3 supply receipts, legacy, NONE/0');
