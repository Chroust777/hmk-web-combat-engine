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
export const EPISODE_FORMAT='hmk-gm-time-episode-v1';
const must=(x,s)=>{if(!x)throw Error(s)};
const whole=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
export const EPISODE_KINDS=['travel','rest','sleep','winded','forage','tracking','watch','other'];
export function calculateTimeEpisode({minute,minutes,kind='travel',topography='flat',terrain='paved-road',conveyance='foot',
 progress=0,bearing=0,extraSlow=0,wearied=false,injured=false,loaded=false,continuousPrecipitation=false,progressD10=[],directionD10=[],
 enduranceByActor={},endRollByActor={},memberIds=[],weather=null,encounterRoll=null,encounterEnviron='rural',
 encounterResolved=false,encounterNight=false,previousCarry={},mapScale=25000,forcedWeatherRoll=false,
 survivalCriticalFailure=false,survivalD10=null}={}){
 must(whole(minute,0,1e9)&&whole(minutes,1,10080)&&minute+minutes<=1e9,'Epizoda potřebuje 1–10 080 skutečných minut.');
 must(EPISODE_KINDS.includes(kind),'Neznámý druh epizody');
 must(Array.isArray(memberIds)&&memberIds.length>0&&new Set(memberIds).size===memberIds.length,'Vyberte jedinečné účastníky');
 must(whole(mapScale,100,10000000),'Neplatné měřítko mapy');
 const slow=extraSlow+Number(wearied)+Number(injured)+Number(continuousPrecipitation);
 must(whole(extraSlow,0,20)&&whole(progress,0,10)&&whole(bearing,0,20),'Neplatné pohybové režimy');
 if(kind!=='travel')must(!survivalCriticalFailure&&survivalD10===null,'Survival Hazard platí pouze pro aktivní cestování.');
 let motion=null,distanceMeters=0,actors=[],direction=null,survivalHazard=null;
 if(kind==='travel'){
  // HMK printed rate is leagues per four-hour WATCH.  A freely timed GM episode
  // uses that rate as a speed; no fictional hour-based dice are rolled.
  motion=trekMovement({topography,terrain,conveyance,progress,slow,loaded,bearing,progressD10,
   continuousPrecipitation,doubleTime:false,hours:4});
  must(Array.isArray(directionD10)&&directionD10.length===motion.bearingDeficit&&directionD10.every(x=>whole(x,1,10)),
   'Chybí '+motion.bearingDeficit+' platný Direction Hazard d10 (HMK 148).');
  const hazards=trekHazards({bearingDeficit:motion.bearingDeficit,directionD10,survivalCriticalFailure,survivalD10});
  survivalHazard=hazards.survival;
  if(motion.bearingDeficit){
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
  distanceMeters=Math.floor((motion.finalLPW*4000*minutes)/240+1e-10);
  actors=memberIds.map(id=>{
   const end=enduranceByActor[id],roll=endRollByActor[id];
   must(whole(end,0,50)&&whole(roll,1,10),'Každá cestující postava potřebuje skutečný END SR d10.');
   const sr=expeditionSecondaryRoll({endurance:end,roll,riding:conveyance==='mount'||conveyance==='cart'||conveyance==='wagon'});
   const rate=sr.success?0:5; // GM time-scaled analogue of normal watch
   const carryIn=previousCarry[id]??0;
   must(whole(carryIn,0,239),'Neplatný zbytek poměrné únavy.');
   const units=carryIn+minutes*rate,delta=Math.floor(units/240),carryOut=units%240;
   return {id,endurance:end,roll,sr,rate,delta,carryIn,carryOut};
  });
 }
 if(weather){must(weather.format==='hmk-trekking-weather-day-v1','Neplatný doklad počasí');}
 const target={highway:[2,1],rural:[4,1],wilderness:[1,1],underworld:[9,9]}[encounterEnviron]?.[encounterNight?1:0];
 must(target!==undefined,'Neznámé prostředí setkání');
 must(typeof encounterNight==='boolean','Encounter: neplatný den/noc');
 if(encounterRoll!==null){must(whole(encounterRoll,1,10),'Encounter vyžaduje skutečný hod d10');}
 const encounter=encounterRoll===null?null:{roll:encounterRoll,tn:target,night:encounterNight,found:encounterRoll<=target,
  resolved:!!encounterResolved};
 return {format:EPISODE_FORMAT,startMinute:minute,endMinute:minute+minutes,minutes,kind,
  memberIds:[...memberIds],terrain,topography,conveyance,motion,
  distanceMeters,distanceKilometres:distanceMeters/1000,
  mapCentimetres:Math.round(distanceMeters*100000/mapScale)/1000,
  actors,encounter,direction,survivalHazard,weather,slow,progress,bearing,loaded,
  weatherHazard:weather?weather.daylightHazard:null,
  consumption:'stávající časově doložený 24hodinový účet výživy',
  gmTimeScale:'gm-arbitrary-episode-proportional-carry-v1',sourcePages:[144,145,146,149,150]};
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
 if(!old||old.endMinute!==minute||old.kind!==(kind==='orientation'?'travel':'tracking'))return false;
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
  if(e.survivalHazard!==undefined){
   const critical=e.kind==='travel'&&e.orientation?.level==='CF'&&e.orientation?.sourceMode==='new';
   const d=e.settings?.survivalD10;
   const expected=critical?trekHazards({survivalCriticalFailure:true,survivalD10:Number(d)}).survival:null;
   must(e.survivalHazard===expected,'Survival Hazard neodpovídá CF ani doloženému d10.');
  }
  if(e.navigationState!==undefined){
   must(['clear','lost','misdirection'].includes(e.navigationState),
    'Neplatná evidence orientace družiny.');
   const earlier=lastEpisodeBefore(journal,j.calendarCampaignId,e.startMinute);
   must(e.navigationState===episodeNavigationState(earlier,e.direction,{recovered:!!e.navigationRecovered}),
    'Stav bloudění nebyl správně převeden do navazující epizody.');
  }
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
  if(!p?.foraging||row.calendarCampaignId!==campaignId||row.characterId!==actorId||
   p.foraging.target!==target||p.foraging.herbName!==(target==='herbs'?herbName.trim():null))continue;
  return p.foraging.carryOut;
 }
 return {foodDays:0,waterDays:0,herbDoses:0};
}
