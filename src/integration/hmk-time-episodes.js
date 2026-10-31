/** HMK Keeper's Ledger – GM-timed episodes.
 * Explicit house-rule mode: time is divided into freely chosen episodes,
 * not compulsory four-hour watches. Printed LPW remains the source speed.
 * All receipts are append-only and never substitute for genuine Skill Tests.
 */
import {trekMovement,trekWeatherDay,trekWeatherWatch,trekHazards} from './hmk-trekking-routine.js';
import {expeditionSecondaryRoll} from './hmk-calendar-expedition.js';
import {createOrienteeringContext,adjustedOrienteeringSV} from './hmk-trekking-orienteering.js';
import {allocateTrekModes} from './hmk-trekking-correction.js';
import {assertOrienteeringModes} from './hmk-trekking-orienteering.js';
import {trackingModifiers,trackingOutcome} from './hmk-trekking-wilderness-tasks.js';
import {episodeEncounterSurprise,episodeEncounterDistance,episodeHazardFollowup,episodeTrackingFollowup,episodeWeatherExposure,episodeWeatherFatigueUnits,episodeLightIntervals} from './hmk-episode-travel-detail.js';
export const EPISODE_FORMAT='hmk-gm-time-episode-v1';
const must=(x,s)=>{if(!x)throw Error(s)};
const whole=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
export const EPISODE_KINDS=['travel','rest','sleep','winded','forage','tracking','watch','other'];
/** GM continuous-time random encounter adaptation of HMK p.150.
 * The source TN is from the published special d10, but the density is scaled
 * to the exact elapsed minutes rather than manufacturing discrete watches.
 * A SINGLE witnessed d100 percentile samples a Poisson count: multiple
 * encounters can occur during long episodes. This is a transparent GM variant,
 * not the printed HMK d10 test. Wilderness night has half the density.
 */
export function episodeEncounterByMinutes({minutes,environ='rural',night=false,d100,lightMinutes=null}={}){
 must(whole(minutes,1,10080),'Encounter vyžaduje délku epizody v minutách');
 const tn={highway:[2,1],rural:[4,1],wilderness:[1,1],underworld:[9,9]}[environ]?.[night?1:0];
 must(tn!==undefined&&typeof night==='boolean','Encounter: neplatné prostředí či denní doba');
 must(whole(d100,1,100),'Minutový Encounter vyžaduje skutečný d100 (1–100).');
 const referenceMinutes=night&&environ==='wilderness'?480:240;
 if(lightMinutes!==null)must(whole(lightMinutes.day,0,minutes)&&whole(lightMinutes.night,0,minutes)&&lightMinutes.day+lightMinutes.night===minutes,
  'Encounter: délka denního a nočního světla musí přesně odpovídat minutám epizody.');
 const intensity=lightMinutes===null?-Math.log1p(-tn/10)*minutes/referenceMinutes:
  -Math.log1p(-({highway:2,rural:4,wilderness:1,underworld:9}[environ])/10)*lightMinutes.day/240
  -Math.log1p(-({highway:1,rural:1,wilderness:1,underworld:9}[environ])/10)*lightMinutes.night/(environ==='wilderness'?480:240);
 // Percentile midpoint provides an unbiased, reproducible finite d100 draw.
 const target=(d100-.5)/100;
 let probability=Math.exp(-intensity),cumulative=probability,count=0;
 while(cumulative<target&&count<10000){count++;probability*=intensity/count;cumulative+=probability;}
 return {format:'hmk-episode-encounter-minute-v1',d100,tn,environ,night,minutes,
  ...(lightMinutes===null?{}:{lightMinutes}),count,found:count>0,chance:1-Math.exp(-intensity),resolved:false,
  procedure:'gm-minute-poisson-from-hmk-d10-density',sourcePage:150};
}

export function calculateTimeEpisode({minute,minutes,kind='travel',topography='flat',terrain='paved-road',conveyance='foot',
 progress=0,bearing=0,extraSlow=0,wearied=false,injured=false,loaded=false,continuousPrecipitation=false,progressD10=[],directionD10=[],
 enduranceByActor={},endRollByActor={},memberIds=[],weather=null,encounterRoll=null,encounterEnviron='rural',
 encounterResolved=false,encounterNight=false,encounterPercentile=null,previousCarry={},mapScale=25000,forcedWeatherRoll=false,
 survivalCriticalFailure=false,survivalD10=null,doubleTime=false,loadBypass=false,encByActor={},dunesSlow=false,
  forcedBearing=0,previousDistanceFraction=0,encounterLightMinutes=null}={}){
 must(whole(minute,0,1e9)&&whole(minutes,1,10080)&&minute+minutes<=1e9,'Epizoda potřebuje 1–10 080 skutečných minut.');
 must(EPISODE_KINDS.includes(kind),'Neznámý druh epizody');
 must(Array.isArray(memberIds)&&memberIds.length>0&&new Set(memberIds).size===memberIds.length,'Vyberte jedinečné účastníky');
 must(whole(mapScale,100,10000000),'Neplatné měřítko mapy');
 const slow=extraSlow+Number(wearied)+Number(injured)+Number(continuousPrecipitation)+Number(dunesSlow);
 must(whole(extraSlow,0,20)&&whole(progress,0,10)&&whole(bearing,0,20)&&whole(forcedBearing,0,1)&&
  typeof doubleTime==='boolean'&&typeof loadBypass==='boolean'&&typeof dunesSlow==='boolean'&&
  typeof previousDistanceFraction==='number'&&previousDistanceFraction>=0&&previousDistanceFraction<1,
  'Neplatné pohybové režimy nebo přenos zlomku vzdálenosti.');
 must(!(loaded&&loadBypass),'Zrušený Loaded Mode nelze současně započítat jako zpomalení.');
 if(kind!=='travel')must(!survivalCriticalFailure&&survivalD10===null,'Survival Hazard platí pouze pro aktivní cestování.');
 let motion=null,distanceMeters=0,actors=[],direction=null,survivalHazard=null;
 if(kind==='travel'){
  // HMK printed rate is leagues per four-hour WATCH.  A freely timed GM episode
  // uses that rate as a speed; no fictional hour-based dice are rolled.
  motion=trekMovement({topography,terrain,conveyance,progress,slow,loaded,bearing,progressD10,
   continuousPrecipitation,doubleTime,hours:4});
  must(Array.isArray(directionD10)&&directionD10.length===motion.bearingDeficit+forcedBearing&&directionD10.every(x=>whole(x,1,10)),
   'Chybí '+(motion.bearingDeficit+forcedBearing)+' platný Direction Hazard d10 (HMK 148).');
  const hazards=trekHazards({bearingDeficit:motion.bearingDeficit+forcedBearing,directionD10,survivalCriticalFailure,survivalD10});
  survivalHazard=hazards.survival;
  if(motion.bearingDeficit+forcedBearing){
   direction={...hazards,rolls:[...directionD10]};
   if(direction.direction==='lost-time'){
    // Printed Lost Time adds one Slow. One of the previously spare Progress
    // rolls is consumed by the new Slow; never credit the same die twice.
    motion=trekMovement({topography,terrain,conveyance,progress,slow:slow+1,loaded,bearing,
     progressD10:progressD10.slice(Math.max(0,progress-slow)-Math.max(0,progress-slow-1)),
     continuousPrecipitation,doubleTime:false,hours:4});
    motion.directionLostTime=true;
   }
  }
  const exactMetres=motion.finalLPW*4000*minutes/240+previousDistanceFraction;
  distanceMeters=Math.floor(exactMetres+1e-10);
  var distanceFractionOut=Math.min(0.9999999999,Math.max(0,exactMetres-distanceMeters));
  actors=memberIds.map(id=>{
   const end=enduranceByActor[id],roll=endRollByActor[id];
   must(whole(end,0,50)&&whole(roll,1,10),'Každá cestující postava potřebuje skutečný END SR d10.');
   const sr=expeditionSecondaryRoll({endurance:end,roll,riding:conveyance==='mount'||conveyance==='cart'||conveyance==='wagon'});
   const enc=encByActor[id]??0;
   must(whole(enc,0,100),'Nenastavená nebo neplatná ENC postavy.');
   const extraFatigue=loadBypass?(Math.floor(enc/(conveyance==='foot'?10:20))*10):0;
   const duneFatigue=terrain==='dunes'&&conveyance==='foot'&&!dunesSlow?5:0;
   const rate=(doubleTime?(conveyance==='foot'?40:20)-(sr.success?20:0):(sr.success?0:5))+extraFatigue+duneFatigue;
   // rate represents weariness per reference interval, scaled to actual minutes;
   // Double Time rates are per hour and are therefore multiplied by four.
   const carryIn=previousCarry[id]??0;
   must(whole(carryIn,0,239),'Neplatný zbytek poměrné únavy.');
   const units=carryIn+minutes*rate,delta=Math.floor(units/240),carryOut=units%240;
   return {id,endurance:end,roll,sr,rate,delta,carryIn,carryOut,enc,extraFatigue,duneFatigue};
  });
 }
 if(weather){must(weather.format==='hmk-trekking-weather-day-v1','Neplatný doklad počasí');}
 const target={highway:[2,1],rural:[4,1],wilderness:[1,1],underworld:[9,9]}[encounterEnviron]?.[encounterNight?1:0];
 must(target!==undefined,'Neznámé prostředí setkání');
 must(typeof encounterNight==='boolean','Encounter: neplatný den/noc');
 if(encounterRoll!==null){must(whole(encounterRoll,1,10),'Encounter vyžaduje skutečný hod d10');}
 const encounter=encounterPercentile!==null?
  {...episodeEncounterByMinutes({minutes,environ:encounterEnviron,night:encounterNight,d100:encounterPercentile,lightMinutes:encounterLightMinutes}),resolved:!!encounterResolved}:
  encounterRoll===null?null:{roll:encounterRoll,tn:target,night:encounterNight,found:encounterRoll<=target,
  resolved:!!encounterResolved};
 return {format:EPISODE_FORMAT,startMinute:minute,endMinute:minute+minutes,minutes,kind,
  memberIds:[...memberIds],terrain,topography,conveyance,motion,
  distanceMeters,distanceKilometres:distanceMeters/1000,
  ...(kind==='travel'?{distanceFractionIn:previousDistanceFraction,distanceFractionOut}:{}),
  mapCentimetres:Math.round(distanceMeters*100000/mapScale)/1000,
  actors,encounter,direction,survivalHazard,weather,slow,progress,bearing,loaded,
  ...(kind==='travel'?{doubleTime,loadBypass,dunesSlow,forcedBearing}:{}),
  weatherHazard:weather?weather.daylightHazard:null,
  consumption:'stávající časově doložený 24hodinový účet výživy',
  gmTimeScale:'gm-arbitrary-episode-proportional-carry-v1',sourcePages:[144,145,146,149,150]};
}
/** Fractional metre accounting follows the last journey, even across rest. */
export function lastTimeEpisodeDistanceFraction(journal=[],campaignId,minute=Infinity){
 for(let i=journal.length-1;i>=0;i--){const row=journal[i],ep=row.calendarTimeEpisode;
  if(row.calendarCampaignId!==campaignId||!ep||ep.startMinute>=minute||ep.kind!=='travel')continue;
  return ep.distanceFractionOut??0;
 }return 0;
}
/** A Tracking CF imposes Bearing on the next actual travelling episode,
 * not the next generic event. That obligation is consumed once, not repeated. */
export function pendingTrackingCFBearing(journal=[],campaignId,minute=Infinity){
 const episodes=journal.filter(row=>row.calendarCampaignId===campaignId&&row.calendarTimeEpisode&&
  row.calendarTimeEpisode.startMinute<minute).sort((a,b)=>b.calendarTimeEpisode.startMinute-a.calendarTimeEpisode.startMinute);
 for(const row of episodes){const ep=row.calendarTimeEpisode;
  if(ep.kind==='travel')return ep.trackingMemory?.level==='CF'&&ep.trackingMemory?.sourceMode==='new'?1:0;
  if(ep.trackingMemory?.level==='CF'&&ep.trackingMemory?.sourceMode==='new')return 1;
 }return 0;
}
export function lastTimeEpisodeCarry(journal=[],campaignId,actorId){
 for(let i=journal.length-1;i>=0;i--){const j=journal[i];
  if(j.calendarCampaignId!==campaignId||!j.calendarTimeEpisode)continue;
  const a=[...(j.calendarTimeEpisode.actors||[]),...(j.calendarTimeEpisode.animals||[])].find(x=>x.id===actorId);
  if(a)return a.carryOut;
 }return 0;
}
export function episodeTimeline(journal=[],campaignId,characterId=null){
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarTimeEpisode&&
  (!characterId||j.calendarTimeEpisode.memberIds.includes(characterId)))
  .sort((a,b)=>a.calendarTimeEpisode.startMinute-b.calendarTimeEpisode.startMinute);
}
export function assertTimeEpisodeAppendOnly(before=[],after=[]){
 const byId=new Map(after.filter(j=>j.calendarTimeEpisode).map(j=>[j.id,j]));
 for(const j of before)if(j.calendarTimeEpisode){
  must(byId.has(j.id)&&JSON.stringify(j)===JSON.stringify(byId.get(j.id)),'Historickou epizodu nelze smazat ani přepsat.');
 }return true;
}
/** A skill roll is a permanent witnessed fact; its temporary effect is not.
 * The free-minute episode mode is a declared GM variant of the printed watch.
 * No stars from distinct tests are ever added together.
 */
/** Partial, minute-exact recovery within the printed per-period maximum.
 * Historical complete rest claims are honoured; new partial attempts accrue
 * floor-rounded credits with a carried remainder rather than fixed thresholds.
 */
export const EPISODE_MINUTE_RECOVERY_FORMAT='hmk-episode-minute-recovery-v1';
export function calculateEpisodeMinuteRecovery({kind,minute,minutes,current,prior=null,legacyClaimStart=null}={}){
 const rates={rest:{numerator:5,denominator:240,maximum:5,period:1440},
  sleep:{numerator:15,denominator:480,maximum:15,period:1440},
  winded:{numerator:5,denominator:10,maximum:5,period:60}};
 const rate=rates[kind];
 must(rate&&whole(minute,0,1e9)&&whole(minutes,1,10080)&&whole(current,0,10000),
  'Neplatné údaje pro minutovou obnovu únavy.');
 let state=prior;
 if(!state&&whole(legacyClaimStart,0,1e9)&&minute>=legacyClaimStart&&minute-legacyClaimStart<rate.period)
  state={windowStart:legacyClaimStart,credited:rate.maximum,carry:0};
 if(state){must(whole(state.windowStart,0,1e9)&&whole(state.credited,0,rate.maximum)&&
  whole(state.carry,0,rate.denominator-1)&&state.windowStart<=minute,
  'Historie poměrné obnovy únavy je neplatná.');}
 let remaining=minutes,at=minute,totalCredited=0,totalRecovered=0;
 let available=current;
 while(remaining>0){
  if(!state||at>=state.windowStart+rate.period)
   state={windowStart:at,credited:0,carry:0};
  const segment=Math.min(remaining,state.windowStart+rate.period-at);
  const units=state.carry+segment*rate.numerator;
  const due=Math.min(rate.maximum-state.credited,Math.floor(units/rate.denominator));
  state={windowStart:state.windowStart,credited:state.credited+due,
   carry:state.credited+due>=rate.maximum?0:units%rate.denominator};
  totalCredited+=due;
  const healed=Math.min(available,due);totalRecovered+=healed;available-=healed;
  remaining-=segment;at+=segment;
 }
 return {format:EPISODE_MINUTE_RECOVERY_FORMAT,kind,minutes,minute,
  credited:totalCredited,recovered:totalRecovered,remaining:available,
  next:state,sourcePages:[150,176],procedure:'gm-proportional-floor-carry-per-period-v1'};
}
export const EPISODE_SKILL_MEMORY_FORMAT='hmk-gm-episode-skill-memory-v1';
const normalizedIds=ids=>[...(ids||[])].sort();
export function episodeSkillProof(row,skill,guideId,campaignId,atMinute){
 const p=row?.skillTestProof,actual=p?.skills?.[0]||p?.skill||p?.primarySkill;
 const r=p?.a||p?.result;
 if(!row||row.calendarCampaignId!==campaignId||row.characterId!==guideId||
  row.campaignMinute!==atMinute||actual!==skill||
  !String(p?.type||'').includes('value')||!Number.isSafeInteger(r?.sv)||
  !['CF','F','S','CS'].includes(r?.level))return null;
 const stars=r?.svTier?.stars;
 return {skillId:row.id,guideId,skill,sv:r.sv,level:r.level,
  stars:Number.isInteger(stars)?stars:null,roll:r.d100??r.roll??null};
}
/** Historical local weather is not a global receipt. Tie skill reuse to the
 * actual GM-weather dice as well, never to the name of the area alone. */
export function episodeWeatherContextKey(sourceId,weather){
 if(sourceId)return sourceId;
 if(!weather)return null;
 return 'local:'+JSON.stringify([weather.season,weather.climate,weather.landscape,
  weather.temperatureD10,weather.precipitationD10,weather.alpine,weather.aridDesert]);
}
export function episodeMovementContext({guideId,memberIds,area,topography,terrain,conveyance,weatherSourceId,minute,
 familiar=false,torchlight=false,fullMoon=false,afterSnowfall=false,nightOverride=null}={}){
 return {guideId,memberIds:normalizedIds(memberIds),area:String(area||'').trim(),
  topography,terrain,conveyance,weatherSourceId:weatherSourceId??null,
  night:nightOverride===null?(minute%1440<360||minute%1440>=1200):!!nightOverride,familiar,torchlight,fullMoon,afterSnowfall};
}
export function lastEpisodeBefore(journal=[],campaignId,minute){
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarTimeEpisode&&
  j.calendarTimeEpisode.endMinute<=minute).sort((a,b)=>b.calendarTimeEpisode.endMinute-a.calendarTimeEpisode.endMinute)[0]||null;
}
export function mayReuseEpisodeSkill({previous,minute,context,kind='orientation',trail='' }={}){
 const old=previous?.calendarTimeEpisode;
 if(!old||old.endMinute!==minute||(kind==='orientation'?old.kind!=='travel':!['tracking','travel'].includes(old.kind)))return false;
 const memo=kind==='orientation'?old.orientation:old.trackingMemory;
 if(!memo?.skillId||memo.format!==EPISODE_SKILL_MEMORY_FORMAT||
  JSON.stringify(memo.context)!==JSON.stringify(context))return false;
 return kind!=='tracking'||memo.trail===String(trail||'').trim()&&!!memo.trail;
}
export function computeEpisodeOrientation({mode='none',currentSkill=null,previous=null,minute,
  context,priority='pace',allocationMode='auto',manualModes=null,lowChoice='slow',requiredBearing=0,continuousPrecipitation=false,familiar=false,
  torchlight=false,fullMoon=false,afterSnowfall=false,droverSkill=null}={}){
 must(['none','new','reuse'].includes(mode),'Neznámé použití Orienteering.');
 if(mode==='none')return null;
 let witness;
 if(mode==='reuse'){
  must(mayReuseEpisodeSkill({previous,minute,context}),
   'Předchozí Orienteering není použitelný: epizody přímo nenavazují nebo se změnily podmínky. Proveďte nový Survival test.');
  witness=previous.calendarTimeEpisode.orientation;
 }else{
  must(currentSkill?.skill==='Survival'&&currentSkill.guideId===context.guideId,
   'Pro nový Orienteering připojte skutečný Survival Success Value průvodce z aktuální minuty.');
  witness=currentSkill;
 }
 let adjustment,allocation;
 if(mode==='reuse'){
  adjustment=witness.adjustment;
  must(adjustment&&Number.isInteger(adjustment.adjustedSV),'Převzatý SV nemá doložený výpočet.');
 }else{
  const ctx=createOrienteeringContext({night:context.night,partySize:context.memberIds.length,
   familiar,torchlight:context.night&&torchlight,fullMoon:context.night&&fullMoon,
   afterSnowfall:context.night&&afterSnowfall,conveyance:context.conveyance,
   droverId:context.conveyance==='foot'?null:context.guideId,
   animalsPresent:context.conveyance!=='foot'});
  if(context.conveyance!=='foot')must(droverSkill?.skillId&&
   ['Animalcraft','Riding'].includes(droverSkill.skill)&&droverSkill.guideId===context.guideId,
   'Cesta se zvířaty potřebuje skutečný Riding/Animalcraft test průvodce.');
  adjustment=adjustedOrienteeringSV({baseSV:witness.sv,context:ctx,
   droverResult:droverSkill?{level:droverSkill.level}:null});
 }
 if(mode==='reuse'){
  // Do not change a previous GM Lax-vs-Slow ruling merely because the
  // hidden new-roll form defaults to Slow when continuing this watch.
  lowChoice=witness.lowChoice||lowChoice;
  allocationMode=witness.allocationMode||allocationMode;
  priority=witness.priority||priority;
  manualModes=witness.manualModes||manualModes;
 }
 must(['auto','manual'].includes(allocationMode)&&['slow','lax'].includes(lowChoice),
  'Neplatné rozhodnutí GM o Advantage Modes.');
 if(allocationMode==='manual'){
  const names=['bearing','progress','foraging','stalking','vigilance'];
  must(manualModes&&names.every(k=>whole(manualModes[k],0,k==='stalking'||k==='vigilance'?1:5)),
   'Ruční přidělení vyžaduje všechny nezáporné celočíselné režimy.');
  allocation={...Object.fromEntries(names.map(k=>[k,manualModes[k]])),
   lax:adjustment.adjustedSV<=0||adjustment.adjustedSV<=2&&lowChoice==='lax',
   orienteeringSlow:adjustment.adjustedSV<=0||adjustment.adjustedSV<=2&&lowChoice==='slow'?1:0};
  assertOrienteeringModes({adjustment,modes:allocation});
 }else{
  allocation=allocateTrekModes({autoAllocate:true,autoPriority:priority,slow:0,
   orienteeringSlow:0,foraging:0,stalking:0,vigilance:0,trackingForcedBearingSourceId:null},
   adjustment,{requiredBearing});
  if(adjustment.adjustedSV>=1&&adjustment.adjustedSV<=2&&lowChoice==='lax'){
   allocation.lax=true;allocation.orienteeringSlow=0;
   assertOrienteeringModes({adjustment,modes:allocation});
  }
 }
 return {format:EPISODE_SKILL_MEMORY_FORMAT,skillId:witness.skillId,guideId:context.guideId,
  context,sv:witness.sv,level:witness.level,stars:witness.stars??null,roll:witness.roll??null,
  adjustment,priority,allocationMode,lowChoice:mode==='reuse'?witness.lowChoice||lowChoice:lowChoice,
  manualModes:allocationMode==='manual'?Object.fromEntries(['bearing','progress','foraging','stalking','vigilance'].map(k=>[k,allocation[k]])):null,
  droverSkillId:mode==='reuse'?witness.droverSkillId??null:droverSkill?.skillId??null,
  droverLevel:mode==='reuse'?witness.droverLevel??null:droverSkill?.level??null,
  modes:{progress:allocation.progress,bearing:allocation.bearing,
   foraging:allocation.foraging,stalking:allocation.stalking,vigilance:allocation.vigilance,
   lax:allocation.lax,orienteeringSlow:allocation.orienteeringSlow},
  reusedFromEpisodeId:mode==='reuse'?previous.id:null,sourceMode:mode};
}
export function computeEpisodeTracking({mode='none',currentSkill=null,previous=null,minute,context,trail='',conditions=null}={}){
 must(['none','new','reuse'].includes(mode),'Neznámé použití Tracking.');
 if(mode==='none')return null;
 const trailName=String(trail||'').trim();must(trailName.length>0,'Uveďte skutečně sledovanou stopu.');
 const witness=mode==='reuse'?(mayReuseEpisodeSkill({previous,minute,context,kind:'tracking',trail:trailName})?
  previous.calendarTimeEpisode.trackingMemory:null):currentSkill;
 must(witness?.skill==='Tracking'||mode==='reuse'&&witness?.skillId,
  'Tracking: vyberte skutečný nový Tracking SV, nebo souvislé pokračování téže stopy.');
 must(witness.guideId===context.guideId,'Tracking musí patřit téže postavě.');
 const actual=conditions||{continuousSnow:false,continuousRain:false,partyTracked:0,twilight:false,night:context.night,alpine:false,road:'none'};
 must(!(actual.continuousRain&&actual.continuousSnow)&&!(actual.twilight&&actual.night),
  'Tracking: vzájemně vyloučené podmínky deště/sněhu nebo denní doby.');
 const modifier=trackingModifiers(actual);
 if(mode==='reuse'&&witness.conditions)must(JSON.stringify(actual)===JSON.stringify(witness.conditions),
  'Tracking SV nelze převzít při změně prostředí nebo stopových modifikátorů.');
 const score=trackingOutcome(witness.sv+modifier.delta,{criticalFailure:witness.level==='CF'});
 return {format:EPISODE_SKILL_MEMORY_FORMAT,skillId:witness.skillId,guideId:context.guideId,
  context,trail:trailName,sv:witness.sv,level:witness.level,stars:witness.stars??null,
  roll:witness.roll??null,conditions:actual,modifier,score,sourceMode:mode,reusedFromEpisodeId:mode==='reuse'?previous.id:null};
}
export function episodeNavigationState(previous,newDirection=null,{recovered=false}={}){
 const p=previous?.calendarTimeEpisode;
 const earlier=p?.navigationState||
  (p?.direction?.direction==='lost'?'lost':p?.direction?.direction==='misdirection'?'misdirection':'clear');
 const active=recovered?'clear':earlier;
 return newDirection?.direction==='lost'?'lost':newDirection?.direction==='misdirection'?'misdirection':active;
}
export function validateTimeEpisodes(journal=[]){
 const byCampaign=new Map(),prior=[];
 for(const j of journal){const e=j.calendarTimeEpisode;if(!e)continue;
  must(e.format===EPISODE_FORMAT&&whole(e.startMinute,0,1e9)&&whole(e.minutes,1,10080)&&
   e.endMinute===e.startMinute+e.minutes&&e.startMinute===j.campaignMinute&&
   typeof j.calendarCampaignId==='string'&&Array.isArray(e.memberIds),'Neplatná herní epizoda');
  // The references are not new rolls. Verify linked proof and continuous inheritance.
  for(const [key,skill] of [['orientation','Survival'],['trackingMemory','Tracking']]){
   const memo=e[key];if(!memo)continue;
   must(memo.format===EPISODE_SKILL_MEMORY_FORMAT&&typeof memo.skillId==='string'&&
    memo.guideId===memo.context?.guideId&&e.memberIds.includes(memo.guideId),
    'Neplatný doklad paměti epizody.');
   const expectedContext=episodeMovementContext({guideId:j.characterId,memberIds:e.memberIds,
    area:e.area,topography:e.topography,terrain:e.terrain,conveyance:e.conveyance,
    weatherSourceId:episodeWeatherContextKey(e.weatherSourceId,e.weather),minute:e.startMinute,
    nightOverride:e.settings?.lightPeriod?e.settings.lightPeriod==='night':null,
    familiar:!!e.settings?.orientationFamiliar,torchlight:!!e.settings?.orientationTorch,
    fullMoon:!!e.settings?.orientationMoon,afterSnowfall:!!e.settings?.orientationSnow});
   must(JSON.stringify(expectedContext)===JSON.stringify(memo.context),
    'Situační okolnosti a členové epizody neodpovídají doloženému SV.');
   const linked=journal.find(x=>x.id===memo.skillId);
   must(linked&&linked.calendarCampaignId===j.calendarCampaignId&&linked.campaignMinute<=e.startMinute,
    'Epizoda odkazuje na neexistující nebo budoucí Skill Test.');
   must(episodeSkillProof(linked,skill,memo.guideId,j.calendarCampaignId,linked.campaignMinute),
    'Epizoda odkazuje na nesprávnou dovednost nebo postavu.');
   const sr=episodeSkillProof(linked,skill,memo.guideId,j.calendarCampaignId,linked.campaignMinute);
   must(memo.sv===sr.sv&&memo.level===sr.level&&memo.stars===sr.stars,
    'Výsledek nebo hvězdičky historického Skill Testu byly pozměněny.');
   if(key==='orientation'){
    must(e.kind==='travel'&&memo.modes?.progress===e.progress&&memo.modes?.bearing===e.bearing,
     'Orienteering režimy musí souhlasit s vypočteným pohybem epizody.');
    must(memo.adjustment?.baseSV===sr.sv&&Number.isInteger(memo.adjustment?.advantageModes),
     'Upravený SV není podložen původním hodem.');
    const required=trekMovement({topography:e.topography,terrain:e.terrain,
     conveyance:e.conveyance,progress:0,slow:0,bearing:0,loaded:false,progressD10:[],
     continuousPrecipitation:!!e.precipitation?.slowMode}).requiredBearing;
    let allocation;
    if(memo.allocationMode==='manual'){
     allocation={...memo.manualModes,lax:memo.adjustment.adjustedSV<=0||memo.adjustment.adjustedSV<=2&&memo.lowChoice==='lax',
      orienteeringSlow:memo.adjustment.adjustedSV<=0||memo.adjustment.adjustedSV<=2&&memo.lowChoice!=='lax'?1:0};
     assertOrienteeringModes({adjustment:memo.adjustment,modes:allocation});
    }else{
     allocation=allocateTrekModes({autoAllocate:true,autoPriority:memo.priority,slow:0,
      orienteeringSlow:0,foraging:0,stalking:0,vigilance:0,trackingForcedBearingSourceId:null},
      memo.adjustment,{requiredBearing:required});
     if(memo.lowChoice==='lax'&&memo.adjustment.adjustedSV>=1&&memo.adjustment.adjustedSV<=2){
      allocation.lax=true;allocation.orienteeringSlow=0;
     }
    }
    const keys=['progress','bearing','foraging','stalking','vigilance','lax','orienteeringSlow'];
    must(keys.every(k=>memo.modes[k]===allocation[k]),
     'Advantage Modes neodpovídají doloženému SV a strategii GM.');
    if(memo.sourceMode==='new'){
     const droverRow=memo.droverSkillId?journal.find(x=>x.id===memo.droverSkillId):null;
     const droverProof= e.conveyance==='foot'?null:
      (episodeSkillProof(droverRow,'Animalcraft',memo.guideId,j.calendarCampaignId,e.startMinute)||
       episodeSkillProof(droverRow,'Riding',memo.guideId,j.calendarCampaignId,e.startMinute));
     must(e.conveyance==='foot'||droverProof&&droverProof.level===memo.droverLevel,
      'Cestování se zvířaty nemá doložený Drover Test.');
     const ctx=createOrienteeringContext({night:memo.context.night,
      partySize:memo.context.memberIds.length,familiar:memo.context.familiar,
      torchlight:memo.context.night&&memo.context.torchlight,
      fullMoon:memo.context.night&&memo.context.fullMoon,
      afterSnowfall:memo.context.night&&memo.context.afterSnowfall,
      conveyance:e.conveyance,
      ...(e.conveyance==='foot'?{}:{droverId:memo.guideId,animalsPresent:true})});
     must(JSON.stringify(adjustedOrienteeringSV({baseSV:sr.sv,context:ctx,
      droverResult:droverProof?{level:droverProof.level}:null}))===
      JSON.stringify(memo.adjustment),'Situační úprava Orienteering SV byla pozměněna.');
    }
   }
   if(key==='trackingMemory'&&memo.conditions){
    must(!(memo.conditions.continuousRain&&memo.conditions.continuousSnow)&&
     !(memo.conditions.twilight&&memo.conditions.night),'Tracking: neplatné podmínky');
    const expectedModifier=trackingModifiers(memo.conditions);
    must(JSON.stringify(expectedModifier)===JSON.stringify(memo.modifier)&&
     JSON.stringify(trackingOutcome(sr.sv+expectedModifier.delta,{criticalFailure:sr.level==='CF'}))===JSON.stringify(memo.score),
     'Tracking situace a Spoor neodpovídají původnímu hodu');
   }
   if(memo.sourceMode==='new')must(linked.campaignMinute===e.startMinute&&memo.reusedFromEpisodeId===null,
    'Nový hod musí být doložen na začátku právě této epizody.');
   else{
    must(memo.sourceMode==='reuse'&&typeof memo.reusedFromEpisodeId==='string',
     'Neplatná návaznost převzatého hodu.');
    const before=journal.find(x=>x.id===memo.reusedFromEpisodeId);
    must(before&&before.calendarTimeEpisode?.endMinute===e.startMinute&&
     (key!=='orientation'||JSON.stringify(before.calendarTimeEpisode?.orientation?.adjustment)===JSON.stringify(memo.adjustment))&&
     before.calendarTimeEpisode?.[key]?.skillId===memo.skillId&&
     before.calendarTimeEpisode?.[key]?.format===EPISODE_SKILL_MEMORY_FORMAT&&
     JSON.stringify(before.calendarTimeEpisode?.[key]?.context)===JSON.stringify(memo.context)&&
     (key!=='trackingMemory'||before.calendarTimeEpisode.trackingMemory.trail===memo.trail),
     'Převzatý hod nesouvisí s bezprostředně předcházející epizodou.');
   }
  }
  if(e.movementRollSources){
   for(const [key,sourceId] of Object.entries(e.movementRollSources)){
    must(['progress','direction'].includes(key),'Neznámý druh převzatých pohybových kostek.');
    if(!sourceId)continue;
    const source=journal.find(x=>x.id===sourceId&&x.calendarCampaignId===j.calendarCampaignId&&x.calendarTimeEpisode);
    const older=source?.calendarTimeEpisode;
    const diceKey=key==='progress'?'progressD10':'directionD10';
    must(older?.endMinute===e.startMinute&&older.kind==='travel'&&
     e.orientation?.reusedFromEpisodeId===sourceId&&
     JSON.stringify(older.movementRolls?.[diceKey])===JSON.stringify(e.movementRolls?.[diceKey])&&
     older.slow===e.slow&&older.progress===e.progress&&older.bearing===e.bearing&&
     older.loaded===e.loaded&&older.terrain===e.terrain&&older.topography===e.topography&&
     older.conveyance===e.conveyance,
     'Převzaté pohybové kostky neodpovídají skutečné souvislé epizodě.');
   }
  }
  if(e.encounter?.format==='hmk-episode-encounter-minute-v1'){
   const expected={...episodeEncounterByMinutes({minutes:e.minutes,environ:e.encounter.environ,
    night:e.encounter.night,d100:e.encounter.d100,lightMinutes:e.encounter.lightMinutes??null}),resolved:!!e.encounter.resolved};
   must(JSON.stringify(expected)===JSON.stringify(e.encounter),
    'Minutové riziko setkání musí odpovídat doloženému d100, prostředí a délce epizody.');
  }
  if(e.survivalHazard!==undefined){
   const critical=e.kind==='travel'&&e.orientation?.level==='CF'&&e.orientation?.sourceMode==='new';
   const d=e.settings?.survivalD10;
   const expected=critical?trekHazards({survivalCriticalFailure:true,survivalD10:Number(d)}).survival:null;
   must(e.survivalHazard===expected,'Survival Hazard neodpovídá CF ani doloženému d10.');
  }
  // New detailed receipts are checked against the exact witnessed inputs.
  // Older historical episodes legitimately have no detail fields.
  if(e.daylight){
   const d=e.daylight,expected=episodeLightIntervals({startMinute:e.startMinute,minutes:e.minutes,
    latitudeBand:d.latitudeBand,season:d.season,sunriseMinute:d.sunriseMinute,
    twilightMinutes:d.twilightMinutes});
   must(JSON.stringify(d)===JSON.stringify(expected),'Pozměněný čas denního světla.');
  }
  if(e.encounterDetails!==undefined){
   must(Array.isArray(e.encounterDetails)&&e.encounter?.found&&
    e.encounterDetails.length===e.encounter.count,'Každé setkání vyžaduje vlastní detail.');
   for(const [i,record] of e.encounterDetails.entries()){
    must(record.i===i&&whole(record.offset,0,e.minutes-1)&&record.pending===false,
     'Encounter: chybí skutečný čas výskytu nebo dokončení.');
    const d=record.distance;
    const distance=episodeEncounterDistance({terrain:d.terrain,d4:d.d4,period:d.period,
     moon:d.moon,hearingD10:d.hearingD10});
    must(JSON.stringify(distance)===JSON.stringify(d),'Encounter Distance nesouhlasí s d4, světlem nebo terénem.');
    if(e.daylight){const at=e.startMinute+record.offset;
     const segment=e.daylight.segments.find(x=>x.start<=at&&at<x.end);
     must(segment?.period===d.period,'Encounter použil špatné světlo pro čas události.');}
    if(record.nonhostile){must(record.surprise===null,'Pokojné setkání nemá Surprise test.');continue;}
    const t=record.surprise;
    must(t?.verified&&t.decision,'Encounter Surprise není rozhodnuto.');
    const expected=episodeEncounterSurprise({partyModes:e.orientation?.modes||{},conveyance:e.conveyance,
     foeWatchfulness:t.foeWatchfulness,foeIsBeast:t.foeIsBeast,
     partySkill:t.partySkill,foeSkill:t.foeSkill,partyLevel:t.partyLevel,
     foeLevel:t.foeLevel,decision:t.decision});
    must(JSON.stringify(expected)===JSON.stringify(t),'Surprise neodpovídá pravidlové tabulce.');
   }
   must(e.encounter.resolved===true,'Encounter má nevyřešené jednotlivé události.');
  }
  if(e.trackingFollowup){
   const t=e.trackingFollowup,m=e.trackingMemory;
   must(m&&t.adjustedSV===m.score.adjustedSV,'Tracking navazující test ztratil původní SV.');
   const expected=episodeTrackingFollowup({adjustedSV:t.adjustedSV,criticalFailure:m.level==='CF',
    awarenessLevel:t.awarenessLevel,spoorSpent:t.spoorSpent});
   const skill=t.awarenessSkillId?journal.find(x=>x.id===t.awarenessSkillId):null;
   const aw=skill?episodeSkillProof(skill,'Awareness',m.guideId,j.calendarCampaignId,e.startMinute):null;
   must(t.awarenessLevel===(aw?.level||null)&&
    JSON.stringify(t)===JSON.stringify({...expected,awarenessSkillId:t.awarenessSkillId}),
    'Tracking Awareness/Spoor neodpovídá skutečnému Skill Testu.');
  }
  if(e.hazardDetails!==undefined){
   must(Array.isArray(e.hazardDetails),'Neplatný seznam hazardů.');
   const types=[e.survivalHazard,e.direction?.direction].filter(Boolean);
   must(JSON.stringify(types)===JSON.stringify(e.hazardDetails.map(x=>x.hazard)),
    'Chybí Direction nebo Survival Hazard.');
   for(const h of e.hazardDetails){
    const x=episodeHazardFollowup({hazard:h.hazard,repairSkill:h.repairSkill,
     repairLevel:h.repairLevel,equipmentDisposition:h.equipmentDisposition,
     complicationDecision:h.complicationDecision,accidentAgility:h.accidentAgility,
     accidentD6:h.accidentD6,accidentZD10:h.accidentZD10,
     complicationSkill:h.complicationSkill,complicationLevel:h.complicationLevel,
     directionTurn:h.directionTurn,directionD10:h.directionD10??null,directionAwareness:h.directionAwareness});
    const linked=h.evidenceId?journal.find(k=>k.id===h.evidenceId&&
     k.calendarCampaignId===j.calendarCampaignId&&k.campaignMinute===e.startMinute):null;
    if(h.hazard==='accident'&&typeof x.result==='object'&&h.gmInjuryResolved&&linked){x.requiresGMCompletion=false;}
    must(!x.requiresGMCompletion&&JSON.stringify(h)===JSON.stringify({...x,
     evidenceId:linked?.id||null,gmInjuryResolved:!!h.gmInjuryResolved}),
     'Hazard nemá doložené nebo úplné vyhodnocení.');
   }
  }
  if(e.weatherExposure!==undefined){
   must(Array.isArray(e.weatherExposure)&&e.weatherExposure.length===e.memberIds.length*(e.weatherHazards||[]).length,
    'Weather Hazard neobsahuje všechny postavy a podmínky.');
   for(const w of e.weatherExposure){
    must(e.memberIds.includes(w.id)&&e.weatherHazards.includes(w.kind)&&!w.pending,
     'Weather Hazard se vztahuje na cizí postavu nebo nemá doložený hod.');
    const expected=episodeWeatherExposure({kind:w.kind,areaAV:w.areaAV,roll:w.roll,
     protection:w.protection,fireStrength:w.fireStrength,continuousSleet:w.continuousSleet,
     resting:w.resting,shade:w.shade,tropicalNative:w.tropicalNative,endLevel:w.endLevel});
    must(JSON.stringify(w)===JSON.stringify({id:w.id,...expected})&&
     !['pending','pending-endurance'].includes(w.effect),'Pozměněný nebo neúplný Weather Hazard.');
   }
  }
  if(e.weatherExposure!==undefined&&e.kind==='travel'&&e.actors?.some(a=>a.weatherFatigueUnits!==undefined)){
   const dayMinutes=e.daylight?.minutesByPeriod?
    e.daylight.minutesByPeriod.day+e.daylight.minutesByPeriod.twilight:
    e.settings?.lightPeriod==='night'?0:e.minutes;
   const units=episodeWeatherFatigueUnits({weather:e.weather,exposure:e.weatherExposure,
    minutes:e.minutes,dayMinutes,nightMinutes:e.minutes-dayMinutes});
   for(const a of e.actors){
    const expected=units[a.id]||0,total=a.carryIn+e.minutes*a.rate+expected;
    must(a.weatherFatigueUnits===expected&&a.delta===Math.floor(total/240)&&a.carryOut===total%240,
     'Minutová únava způsobená počasím neodpovídá doloženému Cold/Heat Hazard.');
   }
  }
  if(e.distanceFractionIn!==undefined){
   must(e.kind==='travel'&&Math.abs(e.distanceFractionIn-lastTimeEpisodeDistanceFraction(prior,j.calendarCampaignId,e.startMinute))<1e-7,
    'Ztracený nebo cizí zlomek cestovní vzdálenosti.');
   const meters=e.motion.finalLPW*4000*e.minutes/240+e.distanceFractionIn;
   must(e.distanceMeters===Math.floor(meters+1e-10)&&Math.abs(e.distanceFractionOut-Math.max(0,meters-e.distanceMeters))<1e-7,
    'Minutové metry nebo přenesený zlomek neodpovídají rychlosti.');
  }
  if(e.navigationState!==undefined){
   must(['clear','lost','misdirection'].includes(e.navigationState),
    'Neplatná evidence orientace družiny.');
   const earlier=lastEpisodeBefore(journal,j.calendarCampaignId,e.startMinute);
   must(e.navigationState===episodeNavigationState(earlier,e.direction,{recovered:!!e.navigationRecovered}),
    'Stav bloudění nebyl správně převeden do navazující epizody.');
  }
  if(e.travelForaging!==undefined){
   must(e.kind==='travel'&&e.orientation?.modes?.foraging===e.travelForaging.length,
    'Počet Foraging hodů při cestě neodpovídá skutečným získaným Modes.');
   const local=new Map();
   for(const f of e.travelForaging){
    const key=JSON.stringify([f.target,f.herbName||'']);
    const carryIn=local.get(key)||lastForagingCarry(prior,j.calendarCampaignId,j.characterId,f.target,f.herbName||'');
    const expected=calculateEpisodeForaging({minutes:e.minutes,habitat:f.habitat,season:f.season,
     roll:f.roll,target:f.target,herbName:f.herbName||'',carryIn});
    must(JSON.stringify(f)===JSON.stringify(expected),'Foraging při cestě není podložen doloženým d10 a přenosem.');
    local.set(key,f.carryOut);
   }
  }else if(e.orientation?.modes?.foraging>0){must(false,'Foraging při cestě není vyhodnocen.');}
  if(e.foraging){
   const f=e.foraging;
   must(e.kind==='forage'&&f.minutes===e.minutes&&j.characterId&&e.memberIds.includes(j.characterId),
    'Foraging neodpovídá času, činnosti a průvodci epizody.');
   const carryIn=lastForagingCarry(prior,j.calendarCampaignId,j.characterId,f.target,f.herbName||'');
   const expected=calculateEpisodeForaging({minutes:e.minutes,habitat:f.habitat,season:f.season,
    roll:f.roll,target:f.target,herbName:f.herbName||'',carryIn});
   must(JSON.stringify(f)===JSON.stringify(expected),'Pozměněný nebo nepodložený Foraging výsledek.');
  }
  const key=j.calendarCampaignId;if(!byCampaign.has(key))byCampaign.set(key,[]);byCampaign.get(key).push(e);
  prior.push(j);
 }
 for(const entries of byCampaign.values()){
  entries.sort((a,b)=>a.startMinute-b.startMinute);
  for(let i=1;i<entries.length;i++)must(entries[i].startMinute>=entries[i-1].endMinute,'Herní epizody se nesmějí časově překrývat.');
 }return true;
}

/** GM time-scaled Foraging (original printed table, new arbitrary-minute procedure).
 * One GM-declared roll per episode; fractional yields carried in quantum units
 * until a real half food-/water-day or full herb dose exists. */
import {foragingDie} from './hmk-trekking-wilderness-tasks.js';
export function calculateEpisodeForaging({minutes,habitat,season,roll,target='food-water',herbName='',carryIn={}}={}){
 must(whole(minutes,1,10080),'Foraging vyžaduje skutečné trvání');
 const die=foragingDie({habitat,season,roll,target,herbName});
 const result={},carryOut={};
 for(const [key,units] of [['foodDays',2],['waterDays',2],['herbDoses',1]]){
  const prior=carryIn[key]??0;
  must(whole(prior,0,239),'Neplatný převod dřívějšího sběru');
  const numerator=prior+die[key]*minutes*units;
  const count=Math.floor(numerator/240);
  result[key]=count/units;
  carryOut[key]=numerator%240;
 }
 return {format:'hmk-episode-foraging-v1',minutes,habitat,season,roll,target,herbName:die.herbName,
  quality:die.quality,found:die.found,results:[{...die,...result}],carryIn,carryOut,
  accounting:'gm-proportional-carry-yield-v1',sourcePage:147};
}
export function lastForagingCarry(journal=[],campaignId,actorId,target,herbName=''){
 for(let i=journal.length-1;i>=0;i--){const row=journal[i],p=row.calendarTimeEpisode;
  if(row.calendarCampaignId!==campaignId||row.characterId!==actorId)continue;
  for(const f of [...(p?.travelForaging||[])].reverse().concat(p?.foraging?[p.foraging]:[]))
   if(f.target===target&&f.herbName===(target==='herbs'?herbName.trim():null))return f.carryOut;
 }
 return {foodDays:0,waterDays:0,herbDoses:0};
}
