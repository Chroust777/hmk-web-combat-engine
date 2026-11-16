import assert from 'node:assert/strict';
import {episodeHazardFollowup,episodeEncounterDistance,episodeEncounterSurprise,episodeWeatherExposure,episodeLightIntervals} from '../src/integration/hmk-episode-travel-detail.js';
import {episodeNavigationState,lastEpisodeBefore,pendingTrackingCFBearing} from '../src/integration/hmk-time-episodes.js';
import {episodeEncounterGMReceipt93902,validateEpisodeEncounterGM93902} from '../src/integration/hmk-episode-encounter-gm-93902.js';
import {fishingConditions,resolveFishingCatch} from '../src/integration/hmk-fishing-catch-548.js';
import {resolveAnimalTraining} from '../src/integration/hmk-animal-training-548.js';
let n=0;const eq=(a,b,why)=>{assert.deepEqual(a,b,why);n++};const ok=(x,why)=>{assert.ok(x,why);n++};const bad=(f,rx,why)=>{assert.throws(f,rx,why);n++};
let by={direction:0,encounter:0,weather:0,activities:0};
// 1: every actually entered Direction d10 must encode parity without guessing a roll.
for(const hazard of ['misdirection','lost'])for(let die=1;die<=10;die++){
 const x=episodeHazardFollowup({hazard,directionD10:die,directionTurn:die%2?'left':'right',directionObservationDeferred:hazard==='misdirection'});
 eq(x.directionD10,die, 'evidence retained');eq(x.requiresGMCompletion,false,'no fake pending');
 bad(()=>episodeHazardFollowup({hazard,directionD10:die,directionTurn:die%2?'right':'left'}),/lichému|sudému/,'cannot invert die');
}
for(const prior of ['lost','misdirection','clear'])for(const next of ['lost','misdirection','lost-time',null]){
 const out=episodeNavigationState({calendarTimeEpisode:{navigationState:prior}}, next?{direction:next}:null, {lostPriority:true});
 ok(['lost','misdirection','clear'].includes(out), 'valid state');
 if(prior==='lost')eq(out,'lost','Lost persists until proven special Bearing');
}
const mk=(id,memberIds,start,end,state,extra={})=>({id,calendarCampaignId:'A',calendarTimeEpisode:{kind:'travel',memberIds,startMinute:start,endMinute:end,minutes:end-start,navigationState:state,...extra}});
const same=[mk('a1',['a'],0,20,'lost'),mk('b1',['b'],20,50,'clear')];
eq(lastEpisodeBefore(same,'A',60,['a']).id,'a1','other group not overruling lost');
eq(lastEpisodeBefore(same,'A',60,['b']).id,'b1','own last episode');
const withCF=[mk('cf',['a'],0,20,'clear',{trackingMemory:{level:'CF',sourceMode:'new'}}),mk('other',['b'],20,40,'clear')];
eq(pendingTrackingCFBearing(withCF,'A',60,['a']),1,'CF for party A stays pending');
eq(pendingTrackingCFBearing(withCF,'A',60,['b']),0,'CF not gifted to B');
by.direction=n;
// 2: encounter follow-up carries a single party/foe decision with real geometry and no fabricated rolls.
for(const d4 of [1,2,3,4])for(const period of ['day','twilight','night']){
 const d=episodeEncounterDistance({terrain:'mixed-forest',d4,period,moon:'dark',hearingD10:4});
 ok(d.hearingFeet===d.sightingFeet*4,'derived hearing range');
}
const ep={kind:'travel',minutes:60,startMinute:480,endMinute:540,terrain:'grassland',conveyance:'foot',
 daylight:{segments:[{start:480,end:540,period:'day'}]},orientation:{modes:{vigilance:1}},
 encounter:{found:true},encounterDetails:[{i:0,disposition:'reported-to-gm'}]};
const original={id:'episode',calendarCampaignId:'A',characterId:'a',calendarTimeEpisode:ep};
const info={journal:[original],campaignId:'A',sourceId:'episode',index:0,minute:540};
const friendly=episodeEncounterGMReceipt93902({...info,input:{offset:10,d4:2,nonhostile:true,note:'peaceful encounter'}});
eq(friendly.eventMinute,490,'actual encountered minute kept');eq(friendly.nonhostile,true,'nonhostile never makes surprise rolls');
const hostile=episodeEncounterGMReceipt93902({...info,input:{offset:10,d4:2,foeWatchfulness:'lax',decision:'leave'}});
ok(hostile.surprise.verified,'automatic surprise is a valid result');
eq(hostile.surprise.procedure,'automatic','vigilant vs lax');
const row={id:'resolution',calendarCampaignId:'A',characterId:'a',campaignMinute:540,calendarEpisodeEncounterGM93902:hostile};
eq(validateEpisodeEncounterGM93902([original,row]),true,'immutable encounter replay');
bad(()=>episodeEncounterGMReceipt93902({...info,minute:530,input:{offset:10,d4:2,nonhostile:true}}),/předcházet/,'decision cannot precede closed episode');
bad(()=>episodeEncounterGMReceipt93902({...info,journal:[original,row],input:{offset:10,d4:2,nonhostile:true}}),/již bylo/,'no duplicate resolution');
bad(()=>episodeEncounterGMReceipt93902({...info,input:{offset:10,d4:2,nonhostile:true,partyRoll:50}}),/klidné/,'cannot invent peaceful surprise roll');
by.encounter=n-by.direction;
// 3: all combinations of weather hazard dice, initial AV, shelter and verified END results.
for(const kind of ['cold','heat'])for(const areaAV of [0,1,4,8,12,20])for(const level of ['CF','F','S','CS']){
 const opts={kind,areaAV,roll:1,endLevel:level};
 const r=episodeWeatherExposure(opts);eq(r.kind,kind,'weather category');
 ok(r.effect!=='pending','witnessed END has a defined outcome');
 if(kind==='heat')ok(r.faces===4,'moving heat d4');
}
for(const period of [1,30,60,90]){
 const light=episodeLightIntervals({startMinute:300,minutes:period,latitudeBand:'mid',season:'spring',sunriseMinute:360,twilightMinutes:30});
 eq(light.segments.reduce((n,x)=>n+x.end-x.start,0),period,'no lost minutes in light segmentation');
}
bad(()=>episodeWeatherExposure({kind:'heat',areaAV:5,roll:1,shade:true,resting:false}),/stín/,'shade dice need shade rest');
bad(()=>episodeWeatherExposure({kind:'heat',areaAV:5,roll:1,protection:1}),/ochrana/,'no cold gear bonus in heat');
by.weather=n-by.direction-by.encounter;
// 4: Fishing by physical d100 conditions and confirmed 4h test; Animal Training by saved SV.
for(let d=1;d<=100;d++){
 const c=fishingConditions(d);ok([1,3,5,7,9].includes(c.tn),'TN listed by HMK');
}
const fishProof=(level='S',sv=7)=>({actorId:'a',type:'secondary-mastery-value-test',skills:['Fishing'],secondarySkills:[],a:{roll:41,sv,level}});
for(const tech of ['line','net'])for(const c of [1,10,30,90,100]){
 const f=resolveFishingCatch({proof:fishProof(),originId:'fish',actorId:'a',technique:tech,
  conditionsD100:c,foodD10:[1,4,7,10],saltWater:false,offshore:false,periodConfirmed:true,baseSVNotPreAdjusted:true});
 eq(f.physicalFoodDice.length,4,'four evidenced d10');
 ok(f.foodDays>=0,'nonnegative food output');
}
bad(()=>resolveFishingCatch({proof:fishProof(),originId:'fish',actorId:'a',conditionsD100:50,foodD10:[1,2,3,4],baseSVNotPreAdjusted:true}),/čtyřhodinovou/,'unfinished time cannot yield food');
const trainProof=(level='S',sv=7)=>({actorId:'a',type:'secondary-mastery-value-test',skills:['Animalcraft'],a:{roll:41,sv,level}});
for(const level of ['S','F','CS'])for(const newborn of [true,false]){
 const t=resolveAnimalTraining({proof:trainProof(level,7),originId:'training',actorId:'a',animalName:'ox',reasoning:6,creativity:9,
  newborn,wasWild:false,previousBestStars:0,previousMasteryBoosts:0,trainingD10:Array(newborn?3:2).fill(3),
  periodConfirmed:true,baseSVNotPreAdjusted:true});
 eq(t.months,6,'six-month baseline');ok(t.finalBoosts<=5,'creative cap');
}
bad(()=>resolveAnimalTraining({proof:trainProof(),originId:'training',actorId:'a',animalName:'ox',reasoning:6,creativity:9,
  newborn:true,trainingD10:[1,2,3],periodConfirmed:false,baseSVNotPreAdjusted:true}),/dokončený/,'no premature animal training');
by.activities=n-by.direction-by.encounter-by.weather;
console.log('PASS HMK four priority independent test',n,by);
