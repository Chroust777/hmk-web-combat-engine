'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {episodeEncounterDistance,episodeEncounterSurprise,episodeHazardFollowup}=require('../src/integration/hmk-episode-travel-detail.js');
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++},reject=(fn,re,m)=>{assert.throws(fn,re,m);checks++};
const terrains={'alpine-vegetation':200,'cropland-grassland':250,'dunes':100,'heath-moor':250,'ice-snow-rockfield':300,'mixed-forest':50,'mixed-woodland':100,'cold-woodland':100,'needleleaf-forest':100,'wetlands':150};
for(const [terrain,base] of Object.entries(terrains))for(let d4=1;d4<=4;d4++)for(const [period,moon,ratio] of [['day','dark',1],['twilight','dark',.5],['night','bright',.25],['night','quarter',.1],['night','dark',.05]]){
 const hearing=/forest|woodland/.test(terrain)?7:null;
 const got=episodeEncounterDistance({terrain,d4,period,moon,hearingD10:hearing});
 eq(got.sightingFeet,base*d4*ratio,`${terrain} ${period}`);eq(got.hearingFeet,hearing===null?null:got.sightingFeet*7);
}
reject(()=>episodeEncounterDistance({terrain:'wetlands',d4:1,hearingD10:4}),/Hearing/i);
reject(()=>episodeEncounterDistance({terrain:'mixed-forest',d4:0}),/Distance/i);
for(const modes of [{},{lax:1},{stalking:1},{vigilance:1}])for(const conveyance of ['foot','mount','cart','wagon'])for(const foeWatchfulness of ['lax','normal','alert']){
 const options={partyModes:modes,conveyance,foeWatchfulness};
 const base=episodeEncounterSurprise(options);eq(base.verified,base.procedure==='automatic');
 if(base.procedure==='automatic'){
  const done=episodeEncounterSurprise({...options,decision:'observe'});eq(done.verified,true);
  reject(()=>episodeEncounterSurprise({...options,partySkill:'Awareness',partyLevel:'S'}),/automatick|dovednost/i);
 }else if(base.procedure==='unopposed'){
  const party=base.preferred==='party', skill=party?(modes.stalking&&conveyance==='foot'?'Stealth':'Awareness'):'Awareness';
  const vals=party?{partySkill:skill,partyLevel:'S'}:{foeSkill:skill,foeLevel:'S'};
  eq(episodeEncounterSurprise({...options,...vals,decision:'parlay'}).winner,base.preferred);
  reject(()=>episodeEncounterSurprise({...options,...(party?{partyLevel:'S'}:{foeLevel:'S'})}),/dovednost/i);
  reject(()=>episodeEncounterSurprise({...options,...vals,...(party?{foeSkill:'Awareness',foeLevel:'F'}:{partySkill:'Awareness',partyLevel:'F'})}),/Unopposed/i);
 }else{
  const skill=modes.stalking&&conveyance==='foot'?'Stealth':'Awareness';
  eq(episodeEncounterSurprise({...options,partySkill:skill,partyLevel:'CS',foeSkill:'Awareness',foeLevel:'F',decision:'leave'}).winner,'party');
  eq(episodeEncounterSurprise({...options,partySkill:skill,partyLevel:'F',foeSkill:'Awareness',foeLevel:'CS',decision:'observe'}).winner,'foe');
  reject(()=>episodeEncounterSurprise({...options,partyLevel:'S',foeSkill:'Awareness',foeLevel:'S'}),/dovednost/i);
 }
}
for(const sl of ['CS','S','F','CF']){
 const a=episodeHazardFollowup({hazard:'accident',accidentAgility:sl,accidentD6:sl==='S'||sl==='CS'?null:6,accidentZD10:sl==='S'||sl==='CS'?null:4});
 eq(a.result,sl==='S'||sl==='CS'?'avoided':{impact:sl==='CF'?15:10,aspect:'b',zd:4,requiresInjurySequence:true});
 if(sl==='F'||sl==='CF')reject(()=>episodeHazardFollowup({hazard:'accident',accidentAgility:sl,accidentD6:6}),/d10 ZD|d6 Impact/i);
}
console.log('PASS',checks,'Encounter distances/Surprise and Accident SL branches (pure, no browser)');
