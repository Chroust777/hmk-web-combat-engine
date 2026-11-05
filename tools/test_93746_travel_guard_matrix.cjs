'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {trekWeatherDay,trekWeatherWatch,trekSeasonFromMonth,trekMovement}=require('../src/integration/hmk-trekking-routine.js');
const {episodeWeatherExposure,episodeWeatherFatigueUnits,episodeLightIntervals}=require('../src/integration/hmk-episode-travel-detail.js');
const {calculateEpisodeForaging,calculateTimeEpisode,episodeEncounterByMinutes,validateTimeEpisodes,EPISODE_FORMAT}=require('../src/integration/hmk-time-episodes.js');
const {supplyLots,createSupplyUse,supplyBalances,allocateForagingRations}=require('../src/integration/hmk-foraging-supply-ledger.js');
let checks=0;const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);checks++},reject=(f,re,msg)=>{assert.throws(f,re,msg);checks++};
// Independent transcription of the two HMK p.144 weather-roll columns, not reused from implementation.
const climates=['subpolar','cool','warm','subtropical','dry-tropical','wet-tropical'];
const seasons=['spring','summer','autumn','winter'];
const weather=[[[4,null,4],[2,null,4],[-2,null,4],[null,null,3],[null,9,3],[null,9,5]],
[[-1,null,4],[-2,null,4],[null,10,3],[null,10,4],[null,7,3],[null,7,5]],
[[2,null,4],[1,null,3],[-3,null,4],[null,null,3],[null,8,2],[null,8,6]],
[[7,null,6],[3,null,5],[2,null,5],[null,null,4],[null,9,2],[null,9,4]]];
const nightMods=[-3,-2,-2,-1,-4,-4];
for(let m=1;m<=12;m++)eq(trekSeasonFromMonth(m),seasons[Math.floor((m-1)/3)],'HMK 12 months');
for(let s=0;s<4;s++)for(let c=0;c<6;c++)for(let t=1;t<=10;t++)for(let p=1;p<=10;p++){
 const [cold,hot,precip]=weather[s][c],height=c%3===0?-1:0, desert=c>=4;
 const options={season:seasons[s],climate:climates[c],temperatureD10:t,precipitationD10:p,landscape:height?'rough':'flat',aridDesert:desert};
 const actual=trekWeatherDay(options),temp=t+height+(desert&&s===1?4:0),night=temp+nightMods[c];
 const hazard=n=>cold!==null&&n<=cold?'cold':hot!==null&&n>=hot?'heat':null;
 eq([actual.adjustedDayTemperature,actual.adjustedNightTemperature,actual.daylightHazard,actual.nightHazard,actual.hasPrecipitation],
 [temp,night,hazard(temp),hazard(night),p+(desert?2:0)<=precip], 'HMK p.144 day/night/precipitation/desert');
 if(actual.hasPrecipitation){const watch=trekWeatherWatch(actual,{night:false,precipitationD6:1});eq(watch.slowMode,true,'Continuous precipitation gives slow')}
}
const split=episodeLightIntervals({startMinute:1380,minutes:2880,latitudeBand:'mid',season:'winter',sunriseMinute:360,twilightMinutes:30});
eq(split.minutesByPeriod.day+split.minutesByPeriod.night+split.minutesByPeriod.twilight,2880,'48 hours partition');
eq(split.segments[0].start,1380,'starts before midnight');eq(split.segments.at(-1).end,4260,'ends after two days');
for(const minutes of [1,5,37,60,120,239,240,480,1440,10080]){
 const result=trekMovement({topography:'flat',terrain:'paved-road',minutes});
 assert.ok(Math.abs(result.leagues-5*minutes/240)<1e-10,'time uses selected minutes exactly');checks++;
}
const cold=episodeWeatherExposure({kind:'cold',areaAV:0,roll:6,endLevel:'F'});
eq(cold.exposed,true,'cold without clothes fails hazard d6');
const hot=episodeWeatherExposure({kind:'heat',areaAV:4,roll:4,resting:false,endLevel:'S'});
eq(hot.exposed,true,'heat clothed exposed d4');
eq(episodeWeatherExposure({kind:'heat',areaAV:0,roll:1}).tn,1,'heat minimum AV 1');
reject(()=>episodeWeatherExposure({kind:'heat',areaAV:2,roll:1,shade:true,resting:false}),/st[ií]n|odpo[cč]in/i,'no shade dice when travelling');
reject(()=>episodeWeatherExposure({kind:'heat',areaAV:2,roll:1,fireStrength:4}),/chlad|ohe[nň]|heat/i,'cold fire cannot benefit heat');
reject(()=>episodeWeatherExposure({kind:'heat',areaAV:2,roll:1,protection:2}),/chlad|vybaven[ií]|heat/i,'cold gear cannot benefit heat');
const weatherCold=trekWeatherDay({season:'winter',climate:'subpolar',temperatureD10:1,precipitationD10:10});
const witness=[{id:'pc1',kind:'cold',effect:'fatigue-5'}];
eq(episodeWeatherFatigueUnits({weather:weatherCold,exposure:witness,minutes:240,dayMinutes:120,nightMinutes:120}).pc1,1200,'fractional 5 fatigue x240min');
reject(()=>episodeWeatherFatigueUnits({weather:weatherCold,exposure:[...witness,...witness],minutes:240,dayMinutes:120,nightMinutes:120}),/duplicit|stejn/i,'one heat/cold receipt per actor');
const short1=calculateEpisodeForaging({minutes:120,habitat:'mixed-forest',season:'summer',roll:10,target:'food-water'});
const short2=calculateEpisodeForaging({minutes:120,habitat:'mixed-forest',season:'summer',roll:10,target:'food-water',carryIn:short1.carryOut});
eq(short1.results[0].foodDays+short2.results[0].foodDays,3,'two 120m foraging episodes sum same as one 240m');
const journal=[{id:'source',characterId:'pc1',calendarCampaignId:'camp',campaignMinute:480,calendarTimeEpisode:{endMinute:720,foraging:short1}}];
eq(supplyLots(journal,'camp').find(x=>x.unit==='foodDays').quantity,1.5,'foraging creates real account lot');
let proofs=allocateForagingRations({journal,campaignId:'camp',minute:721,actorIds:['pc1','pc2'],foodEach:.5,waterEach:.5});
eq(proofs.length,4,'two characters have four provenance-linked allocations');
reject(()=>createSupplyUse({journal,campaignId:'camp',minute:721,sourceId:'source',resultIndex:0,unit:'foodDays',quantity:2,actorId:'pc1',disposition:'consumed'}),/ji[zž]|nesta[cč]i/i,'cannot overdraw food');
// Three-person continuous expedition: minute carry cannot be reset or charged twice.
const participants=['p1','p2','p3'],endurance={p1:15,p2:4,p3:11},rolls={p1:1,p2:10,p3:1};
let carry={},fraction=0,sumDistance=0,addedP2=0,minute=480;
for(const duration of [60,180,240,1440]){
 const result=calculateTimeEpisode({minute,minutes:duration,kind:'travel',topography:'flat',terrain:'paved-road',
  memberIds:participants,enduranceByActor:endurance,endRollByActor:rolls,previousCarry:carry,
  previousDistanceFraction:fraction,encounterEnviron:'rural',encounterRoll:10});
 eq(result.endMinute,minute+duration,'episode clock uses exact approved duration');
 eq(result.actors.length,3,'three independent character receipts');
 const second=result.actors.find(x=>x.id==='p2');
 addedP2+=second.delta;carry=Object.fromEntries(result.actors.map(x=>[x.id,x.carryOut]));
 fraction=result.distanceFractionOut;sumDistance+=result.distanceMeters;minute=result.endMinute;
}
eq(minute,2400,'over-midnight four-episode clock');
eq(addedP2,40,'unskilled END fatigue exactly 40 over 1920 minutes');
eq(sumDistance+fraction,5*4000*1920/240,'no double-counted distance across episodes');
const b=calculateTimeEpisode({minute:3000,minutes:65,kind:'travel',topography:'flat',terrain:'paved-road',
 memberIds:['p1'],enduranceByActor:{p1:4},endRollByActor:{p1:[10,10]},doubleTime:true,encounterRoll:10});
eq(b.actors[0].hourlyEndSR.length,2,'65-minute Double Time has two independent actual rolls');
reject(()=>calculateTimeEpisode({minute:3000,minutes:65,kind:'travel',topography:'flat',terrain:'paved-road',
 memberIds:['p1'],enduranceByActor:{p1:4},endRollByActor:{p1:[10]},doubleTime:true,encounterRoll:10}),/hod|END|hour/i,'cannot reuse a single double-time END die');
for(const area of ['highway','rural','wilderness','underworld']){
 const d=episodeEncounterByMinutes({minutes:240,environ:area,d100:70});
 const two=episodeEncounterByMinutes({minutes:480,environ:area,d100:70});
 assert.ok(two.chance>=d.chance,'longer episode cannot reduce chance of encounter');checks++;
}
// An imported/forged episode with two receipts for one actor must not pass replay.
const duplicate={id:'weather-duplicate',characterId:'p1',calendarCampaignId:'camp',campaignMinute:0,
 calendarTimeEpisode:{format:EPISODE_FORMAT,kind:'other',startMinute:0,endMinute:60,minutes:60,memberIds:['p1'],
 weatherHazards:['cold','cold'],weatherExposure:[{id:'p1',...cold},{id:'p1',...cold}]}};
reject(()=>validateTimeEpisodes([duplicate]),/duplicitn[ií] Weather Hazard/i,'duplicated actor hazard receipts must fail journal replay');
console.log('PASS '+checks+' HMK p.142/144/146/147/149: climate/day/night/weather matrix, minutes, light intervals, heat-cold safety, forage conservation and supply allocations');
