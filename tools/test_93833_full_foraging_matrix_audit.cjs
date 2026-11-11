'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')};
const root=path.resolve(__dirname,'..'),prev=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):prev(m,f);
const W=require('../src/integration/hmk-trekking-wilderness-tasks.js');
const E=require('../src/integration/hmk-time-episodes.js');
const S=require('../src/integration/hmk-foraging-supply-ledger.js');
const C=require('../src/integration/hmk-foraging-carried-food.js');
const H=require('../src/integration/hmk-tracking-bearing-handoff.js');
let n=0;const equal=(x,y,msg)=>{assert.deepStrictEqual(x,y,msg);n++},bad=(f,msg)=>{assert.throws(f,msg);n++};
// Independent manual transcription HMK p.147 (season order Spring/Summer/Autumn/Winter)
const quals={
'alpine-vegetation':['poor','fair','poor','trace'], 'cropland-pasture':['fair','good','excellent','poor'],
'desert':['poor','trace','trace','trace'], 'grassland':['poor','fair','fair','poor'],
'heath-moor':['poor','fair','fair','poor'], 'ice-snow-rockfield':['trace','poor','trace','trace'],
'mixed-forest':['fair','good','average','poor'], 'mixed-cold-woodland':['fair','average','average','poor'],
'needleleaf-forest':['fair','average','fair','poor']};
const values={trace:[null,null,null,0,1], poor:[null,null,0,1,2],fair:[null,0,1,1,2],average:[0,0,1,2,3],good:[1,1,1,2,3],excellent:[1,1,2,3,4]};
const seasons=['spring','summer','autumn','winter'];
for(const [habitat,Q] of Object.entries(quals))for(let k=0;k<4;k++){
 const quality=Q[k],season=seasons[k];equal(W.foragingQuality({habitat,season}),quality,`${habitat}/${season} quality`);
 for(let d=1;d<=10;d++)for(const target of ['food-water','herbs']){
  const tier=d<=2?0:d<=4?1:d<=7?2:d<=9?3:4,raw=values[quality][tier];
  const r=W.foragingDie({habitat,season,roll:d,target,herbName:'Moss'});
  equal(r.found,raw,`p147 raw ${habitat}/${season}/${d}/${target}`);
  equal([r.foodDays,r.waterDays,r.herbDoses],target==='food-water'?[Math.max(0,raw??0),raw===null?0:Math.max(1,raw),0]:[0,0,Math.max(0,raw??0)],'food/water/herb');
 }
}
bad(()=>W.foragingDie({habitat:'mixed-forest',season:'summer',roll:0,target:'food-water'}),/d10/);
bad(()=>W.foragingDie({habitat:'mixed-forest',season:'summer',roll:11,target:'food-water'}),/d10/);
bad(()=>W.foragingDie({habitat:'mixed-forest',season:'summer',roll:5,target:'herbs'}),/bylin/);
bad(()=>W.foragingDie({habitat:'wetlands',season:'summer',roll:5,target:'food-water'}),/biotop/);
// 60 min * 4 generates equal 240 min yield. Not independent HMK rule: GM proportional extension.
let carry={foodDays:0,waterDays:0,herbDoses:0},got={foodDays:0,waterDays:0,herbDoses:0};
for(let i=0;i<4;i++){const r=E.calculateEpisodeForaging({minutes:60,habitat:'mixed-forest',season:'summer',roll:10,target:'food-water',carryIn:carry});
 for(const k of Object.keys(got))got[k]+=r.results[0][k];carry=r.carryOut}
equal(got,{foodDays:3,waterDays:3,herbDoses:0},'four quarter-watch yields');equal(carry,{foodDays:0,waterDays:0,herbDoses:0},'carry clean after full watch');
const zero=E.calculateEpisodeForaging({minutes:240,habitat:'mixed-forest',season:'spring',roll:3,target:'food-water'});
equal([zero.results[0].foodDays,zero.results[0].waterDays],[0,1],'p147 ZERO means 1 water-day');
const none=E.calculateEpisodeForaging({minutes:240,habitat:'desert',season:'summer',roll:1,target:'food-water'});
equal([none.results[0].foodDays,none.results[0].waterDays],[0,0],'p147 NONE means zero food and zero water');
// Tracking mod factors and outcomes incl valid upper cap at 5 stars
for(let sv=-2;sv<=15;sv++){const res=W.trackingOutcome(sv,{criticalFailure:sv%2===0});equal(res.spoorStars,sv>=5?Math.min(5,sv-4):0,'spoor cap');equal(res.awarenessNeeded,sv>=3&&sv<=4,'Awareness gate');equal(res.nextWatchBearingOnCF,sv%2===0,'CF bearing');}
equal(W.trackingModifiers({continuousSnow:true,continuousRain:false,partyTracked:12,night:true,alpine:true,road:'paved'}).delta,4+2-3-1-4,'combined p147 modifiers');
console.log(`PASS ${n} independent Foraging matrix, GM 60m carry, NONE/0, Tracking SV and validation assertions`);
