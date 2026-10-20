import {validateTrekCorrections,effectiveTrekSource} from './hmk-trekking-correction.js';
/** HârnMaster Kèthîra v1.2, printed pp. 141–150.
 * Non-mutating, evidence-driven parts of the nine-step Trekking Routine.
 * Geographic facts and previously rolled skill outcomes MUST come from
 * actual inputs: never invent terrain, orientation, encounters or injuries.
 */
import {validateTrekPartySnapshot} from './hmk-trekking-party-modes.js';
import {createOrienteeringContext,adjustedOrienteeringSV,assertOrienteeringModes} from './hmk-trekking-orienteering.js';
const assert=(yes,msg)=>{if(!yes)throw Error(msg)};
const int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export const TREK_CLIMATES=Object.freeze(['subpolar','cool','warm','subtropical','dry-tropical','wet-tropical']);
export const TREK_SEASONS=Object.freeze(['spring','summer','autumn','winter']);
// [cold TN, hot TN, precipitation TN]; a null is an absent printed target.
const WEATHER={
 spring:[[4,null,4],[2,null,4],[-2,null,4],[null,null,3],[null,9,3],[null,9,5]],
 summer:[[-1,null,4],[-2,null,4],[null,10,3],[null,10,4],[null,7,3],[null,7,5]],
 autumn:[[2,null,4],[1,null,3],[-3,null,4],[null,null,3],[null,8,2],[null,8,6]],
 winter:[[7,null,6],[3,null,5],[2,null,5],[null,null,4],[null,9,2],[null,9,4]]};
const NIGHT=[-3,-2,-2,-1,-4,-4];
export function trekSeasonFromMonth(month){assert(int(month,1,12),'Neplatný měsíc Tuzyn Reckoning');return TREK_SEASONS[Math.floor((month-1)/3)];}
export function trekWeatherDay({season,climate,temperatureD10,precipitationD10,landscape='flat',alpine=false,aridDesert=false}={}){
 const c=TREK_CLIMATES.indexOf(climate);
 assert(TREK_SEASONS.includes(season)&&c>=0&&int(temperatureD10,1,10)&&int(precipitationD10,1,10),'Neplatný klimatický test HMK');
 assert(['flat','rough','mountain'].includes(landscape)&&typeof alpine==='boolean'&&typeof aridDesert==='boolean','Neplatné geografické údaje');
 const [coldTN,hotTN,precipTN]=WEATHER[season][c],height=alpine?-4:landscape==='mountain'?-2:landscape==='rough'?-1:0;
 const desertHeat=aridDesert&&season==='summer'?4:0;
 const base=temperatureD10+height+desertHeat;
 const hazard=(value)=>coldTN!==null&&value<=coldTN?'cold':hotTN!==null&&value>=hotTN?'heat':null;
 const precipRoll=precipitationD10+(aridDesert?2:0);
 return {format:'hmk-trekking-weather-day-v1',season,climate,landscape,alpine,aridDesert,
  temperatureD10,precipitationD10,adjustedDayTemperature:base,adjustedNightTemperature:base+NIGHT[c],
  precipitationRoll:precipRoll,precipitationTN:precipTN,hasPrecipitation:precipRoll<=precipTN,
  daylightHazard:hazard(base),nightHazard:hazard(base+NIGHT[c]),
  sourcePages:[144]};
}
export function trekWeatherWatch(day,{night=false,precipitationD6=null,pavedRoad=false}={}){
 assert(day?.format==='hmk-trekking-weather-day-v1'&&typeof night==='boolean'&&typeof pavedRoad==='boolean','Neplatný doložený výsledek počasí');
 assert(!day.hasPrecipitation||int(precipitationD6,1,6),'Za dne se srážkami je nutný d6 pro každou hlídku');
 assert(day.hasPrecipitation||precipitationD6===null,'Při suchu se d6 na srážky nehází');
 const hazard=night?day.nightHazard:day.daylightHazard;
 const continuous=day.hasPrecipitation&&precipitationD6===1;
 const precipitation=day.hasPrecipitation?(hazard==='cold'?(day.precipitationRoll===day.precipitationTN?'sleet':'snow'):'rain'):'none';
 return {hazard,precipitation,precipitationD6,continuous,slowMode:continuous&&!(pavedRoad&&precipitation==='rain'),
  // The resulting Cold/Heat Hazard Roll requires clothing AV, equipment and
  // actual location. This is NOT sufficient evidence to inflict exposure.
  requiresWeatherHazardRoll:hazard!==null,sourcePage:144};
}
const MOVE={
 flat:{'paved-road':[5,10,5,5],'unpaved-road':[5,9,5,4],'rural-track':[5,9,4,3],
  'wilderness-trail':[5,8,3,2],'cropland-grassland':[4,6,2,1],'mixed-woodland':[4,6,2,1],
  'heath-moor':[4,6,.5,.5],'needleleaf-forest':[4,5,1,.5],'mixed-forest':[3,4,.5,.5],
  dunes:[3,4,.5,.5],wetlands:[1,1,null,null]},
 rough:{'paved-road':[4,9,4,4],'unpaved-road':[4,8,4,3],'rural-track':[4,7,2,1],
  'wilderness-trail':[4,6,1,.5],'cropland-grassland':[3,5,1,.5],'mixed-woodland':[3,5,1,.5],
  'heath-moor':[3,5,.5,.5],'needleleaf-forest':[3,3,.5,null],'mixed-forest':[2,2,.5,null]},
 mountain:{'paved-road':[3,6,3,2],'unpaved-road':[3,6,2,1],'rural-track':[3,5,1,.5],
  'wilderness-trail':[3,4,.5,0],'cold-woodland':[2,4,0,0],'alpine-vegetation':[2,4,0,0],
  'needleleaf-forest':[2,2,0,0],'ice-snow-rockfield':[1,2,0,0],'mixed-forest':[1,1,0,0]}};
const CONVEYANCE=['foot','mount','cart','wagon'];
export function trekMovement({topography,terrain,conveyance='foot',progress=0,slow=0,loaded=false,
 bearing=0,progressD10=[],doubleTime=false,hours=4,continuousPrecipitation=false}={}){
 const rate=MOVE[topography]?.[terrain],column=CONVEYANCE.indexOf(conveyance);
 assert(rate&&column>=0,'Nepodporovaná kombinace HMK topografie, terénu a dopravy');
 const lpw=rate[column];assert(lpw!==null&&lpw>0,'HMK v tomto terénu nepovoluje daný způsob dopravy');
 assert(int(progress,0,10)&&int(slow,0,20)&&int(bearing,0,20)&&typeof loaded==='boolean'&&
  typeof doubleTime==='boolean'&&typeof continuousPrecipitation==='boolean'&&[1,2,3,4].includes(hours),'Neplatné režimy pohybu');
 const remainingSlow=Math.max(0,slow-progress),spareProgress=Math.max(0,progress-slow);
 assert(Array.isArray(progressD10)&&progressD10.length===spareProgress&&progressD10.every(r=>int(r,1,10)),'Zbývající Progress Mode vyžaduje vlastní hod d10');
 const progressSuccess=progressD10.some(r=>r<=2*lpw);
 let finalLPW=(lpw+(progressSuccess?1:0))/2**remainingSlow/(loaded?2:1);
 assert(!(doubleTime&&(remainingSlow>0||loaded)),'Double Time vyžaduje nula Slow a žádný Loaded Mode');
 if(doubleTime)finalLPW*=2;
 // One or two dots in the printed table (p.146) require Bearing. Path
 // droplets only require one Bearing during continuous precipitation.
 const dots=terrain==='dunes'||terrain==='wetlands'?2:
  ['paved-road','unpaved-road','rural-track','wilderness-trail'].includes(terrain)?(terrain==='paved-road'?0:continuousPrecipitation?1:0):1;
 const deficit=Math.max(0,dots-bearing);
 return {baseLPW:lpw,progressSuccess,remainingSlow,spareProgress,loaded,finalLPW,
  leagues:finalLPW*(hours/4),kilometres:finalLPW*(hours/4)*4,
  requiredBearing:dots,bearingDeficit:deficit,directionHazardDue:deficit>0,sourcePage:146};
}
/** HMK p.148: Lost Time gives one extra Slow Mode on this very watch.
 * If a Progress Mode remains it is consumed first, and the corresponding
 * previously-prepared Progress die does not confer a second benefit.
 */
export function adjustedTrekkingMovement(proof){
 assert(proof?.format==='hmk-trekking-watch-evidence-v1','Chybí doložená Trekking Routine');
 if(proof.hazards?.direction!=='lost-time')return proof.movement;
 const m=proof.modes;
 const oldSpare=Math.max(0,m.progress-m.slow);
 return trekMovement({topography:proof.landscape,terrain:proof.terrain,
  conveyance:proof.conveyance,progress:m.progress,slow:m.slow+1,
  loaded:m.loaded,bearing:m.bearing,doubleTime:m.doubleTime,
  continuousPrecipitation:proof.weatherWatch?.continuous===true,
  progressD10:oldSpare>0?m.progressD10.slice(1):m.progressD10});
}
export function trekHazards({bearingDeficit=0,directionD10=[],survivalCriticalFailure=false,survivalD10=null}={}){
 assert(int(bearingDeficit,0,20)&&Array.isArray(directionD10)&&directionD10.length===bearingDeficit&&
  directionD10.every(r=>int(r,1,10)),'Chybí samostatné hody Direction Hazard');
 assert(typeof survivalCriticalFailure==='boolean'&&
  (survivalCriticalFailure?int(survivalD10,1,10):survivalD10===null),'Survival Hazard vyžaduje jen skutečné CF a d10');
 const high=bearingDeficit?Math.max(...directionD10):null;
 return {direction:high===null?null:high<=4?'lost-time':high<=9?'misdirection':'lost',
  survival:survivalD10===null?null:survivalD10<=3?'equipment':survivalD10<=6?'accident':'complication',
  // Follow-up inputs (route, impact, injury, etc.) belong to the existing
  // rules executors. Only the trigger is established by these dice.
  sourcePage:148};
}
export function trekEncounterCheck({environ,night=false,roll,elapsedWildernessNightWatches=0}={}){
 const tn={highway:[2,1],rural:[4,1],wilderness:[1,1],underworld:[9,9]}[environ];
 assert(tn&&typeof night==='boolean'&&int(elapsedWildernessNightWatches,0,100000),'Neplatná kontrola náhodného setkání');
 // Wilderness night encounters are only checked every *second* watch.
 const checkDue=!(environ==='wilderness'&&night&&elapsedWildernessNightWatches%2===0);
 assert(checkDue?int(roll,1,10):roll===null,'Při povinné kontrole vyžaduje HMK d10, mimo ni se nehází');
 return {tn:tn[night?1:0],roll,checkDue,encounter:checkDue&&roll<=tn[night?1:0],
  note:checkDue?'Druhy a počet účastníků určuje skutečná situace / Encounter Tables.':'V noci v divočině se kontroluje jen jednou za dvě hlídky.',sourcePage:150};
}
/** Strict import/save gate for NEW trekking preparations. Existing legacy
 * journal entries remain accepted unchanged. The same area/day/context
 * cannot acquire a second independent pair of weather d10 rolls. */
export function validateTrekkingJournalEvidence(document){
 const days=new Map();
 for(const entry of document?.journal??[]){
  const p=entry.calendarTrekProof;if(!p)continue;
  assert(p.format==='hmk-trekking-watch-evidence-v1'&&int(p.campaignMinute,0,1e9)&&
   p.campaignMinute===entry.campaignMinute&&p.dayIndex===Math.floor(p.campaignMinute/1440)&&
   typeof p.area==='string'&&p.area.length>0&&p.area.length<=90&&
   ['flat','rough','mountain'].includes(p.landscape)&&
   typeof entry.calendarCampaignId==='string'&&entry.calendarCampaignId,'Neplatný cestovní čas či identita kampaně');
  if(p.orienteeringContext){
   const c=createOrienteeringContext(p.orienteeringContext);
   assert(JSON.stringify(c)===JSON.stringify(p.orienteeringContext)&&c.night===p.night&&
    c.partySize===(p.partyModes?.memberIds?.length??1)&&c.conveyance===p.conveyance&&
    (c.conveyance==='foot'||p.partyModes?.memberIds?.includes(c.droverId)),
    'Orienteering context neodpovídá doložené hlídce');
   assert(typeof p.modes?.lax==='boolean'&&[0,1].includes(p.modes.orienteeringSlow),
    'Chybí doložený Lax/Slow z Orienteering');
  }
  if(p.partyModes){
   validateTrekPartySnapshot(p.partyModes);
   assert(p.partyModes.guideId===entry.characterId&&p.partyModes.conveyance===p.conveyance&&
    p.modes.slow===p.modes.manualSlow+p.partyModes.forcedSlow+(p.weatherWatch?.slowMode?1:0)+(p.modes.orienteeringSlow??0)+(p.modes.foraging>0?1:0)+(p.modes.stalking??0)&&
    p.modes.loaded===p.partyModes.loaded&&int(p.modes.manualSlow,0,20),
    'Skupinové postihy neodpovídají uloženému pohybu a počasí.');
  }
  const expectedDay=trekWeatherDay({season:p.season,climate:p.climate,landscape:p.landscape,
   alpine:p.alpine,aridDesert:p.aridDesert,temperatureD10:p.weatherDay?.temperatureD10,
   precipitationD10:p.weatherDay?.precipitationD10});
  assert(JSON.stringify(expectedDay)===JSON.stringify(p.weatherDay),'Nesouhlasí uložené klimatické vyhodnocení');
  const key=JSON.stringify([entry.calendarCampaignId,p.dayIndex,p.area,p.season,p.climate,p.landscape,p.alpine,p.aridDesert]);
  const prior=days.get(key);
  assert(!prior||JSON.stringify(prior)===JSON.stringify(p.weatherDay),'Duplicitní odlišné počasí v jedné oblasti a jednom dni');
  assert(p.dayAlready===!!prior,'Chybné použití opakovaného denního počasí');
  days.set(key,p.weatherDay);
  const watch=trekWeatherWatch(expectedDay,{night:p.night,pavedRoad:p.terrain==='paved-road',
   precipitationD6:p.weatherWatch?.precipitationD6});
  assert(JSON.stringify(watch)===JSON.stringify(p.weatherWatch),'Nesouhlasí výsledek srážek pro hlídku');
  const movement=trekMovement({topography:p.landscape,terrain:p.terrain,conveyance:p.conveyance,
   progress:p.modes?.progress,slow:p.modes?.slow,loaded:p.modes?.loaded,bearing:p.modes?.bearing,
   progressD10:p.modes?.progressD10,doubleTime:p.modes?.doubleTime,
   continuousPrecipitation:watch.continuous});
  assert(JSON.stringify(movement)===JSON.stringify(p.movement),'Nesouhlasí vypočítaný pohyb');
  if(p.effectiveMovement)assert(JSON.stringify(adjustedTrekkingMovement(p))===JSON.stringify(p.effectiveMovement),
   'Doložené zkrácení trasy v Direction Lost Time neodpovídá HMK 148');
  const hazards=trekHazards({bearingDeficit:movement.bearingDeficit,directionD10:p.modes?.directionD10});
  assert(JSON.stringify(hazards)===JSON.stringify(p.hazards),'Nesouhlasí uložení Direction Hazard');
  const encounter=trekEncounterCheck({environ:p.modes?.environ,night:p.night,
   roll:p.encounter?.roll,elapsedWildernessNightWatches:p.modes?.wildernessNightWatches});
  assert(JSON.stringify(encounter)===JSON.stringify(p.encounter),'Nesouhlasí Encounter Roll');
  const expectedRolls=[];
  if(!prior){
   expectedRolls.push([10,'Daily Temperature',expectedDay.temperatureD10],
    [10,'Daily Precipitation',expectedDay.precipitationD10]);
  }
  if(expectedDay.hasPrecipitation)expectedRolls.push([6,'Precipitation per Watch',watch.precipitationD6]);
  for(const value of p.modes.progressD10)expectedRolls.push([10,'Progress',value]);
  for(const value of p.modes.directionD10)expectedRolls.push([10,'Direction Hazard',value]);
  if(encounter.checkDue)expectedRolls.push([10,'Random Encounter',encounter.roll]);
  assert(Array.isArray(p.rolls)&&p.rolls.length===expectedRolls.length&&
   p.rolls.every((r,i)=>r.faces===expectedRolls[i][0]&&r.label===expectedRolls[i][1]&&
     r.value===expectedRolls[i][2]&&int(r.value,1,r.faces)&&
     ['manual','cryptographic-software-die'].includes(r.origin))&&
   new Set(p.rolls.map(r=>r.origin)).size===1,
   'Uložené hody nesouhlasí s vyhodnocenými kostkami a jejich původem');
 }
 validateTrekCorrections(document?.journal??[]);
 const byId=new Map((document?.journal??[]).map(x=>[x.id,x]));
 for(const entry of document?.journal??[]){
  const e=entry.calendarExpeditionProof;if(!e?.trekSourceId)continue;
  const originalSource=byId.get(e.trekSourceId),source=originalSource?.calendarTrekProof?effectiveTrekSource(originalSource,document.journal):null,p=source?.calendarTrekProof;
  const group=e.travelGroup;
  const validPartyMember=source?.characterId===entry.characterId||
   (group?.format==='hmk-group-watch-v1'&&group.guideId===source?.characterId&&
    group.memberIds?.includes(entry.characterId));
  assert(p&&p.format==='hmk-trekking-watch-evidence-v1'&&validPartyMember&&
   source.calendarCampaignId===entry.calendarCampaignId&&
   source.campaignMinute+e.durationMinutes===entry.campaignMinute&&
   e.travelledLeagues===(p.effectiveMovement??p.movement).leagues&&e.travelledKilometres===(p.effectiveMovement??p.movement).kilometres,
   'Cestovní únava nemá doloženou stejnou trasu, kampaň a čas');
  // From 93.371 onward the END entry retains a witness to the *specific*
  // Orienteering Success Value that certified this source watch. Legacy
  // entries without this field remain readable; no historical data is guessed.
  if(e.orienteeringId!==undefined){
   const roll=byId.get(e.orienteeringId),link=roll?.calendarTrekSkillSource;
   const test=roll?.skillTestProof?.a??roll?.skillTestProof?.result;
   const selected=p.modes?.progress+p.modes?.bearing+(p.modes?.foraging??0)+(p.modes?.stalking??0)+(p.modes?.vigilance??0);
   const droverRow=document.journal.find(j=>j.calendarTrekSkillSource?.sourceId===source.id&&
    j.calendarTrekSkillSource.hazard==='drover'&&j.characterId===p.orienteeringContext?.droverId&&
    j.calendarCampaignId===entry.calendarCampaignId);
   const droverResult=droverRow?.skillTestProof?.a??droverRow?.skillTestProof?.result;
   const adjusted=p.orienteeringContext?adjustedOrienteeringSV({baseSV:test?.sv,
    context:p.orienteeringContext,droverResult:p.conveyance==='foot'?null:droverResult}):null;
   if(adjusted)assertOrienteeringModes({adjustment:adjusted,modes:p.modes});
   const stars=adjusted?adjusted.advantageModes:Number.isSafeInteger(test?.sv)?Math.max(0,Math.min(5,test.sv-4)):NaN;
   assert(roll&&link?.format==='hmk-trek-linked-skill-v1'&&link.hazard==='survival'&&
    link.sourceId===source.id&&roll.characterId===source.characterId&&
    roll.calendarCampaignId===entry.calendarCampaignId&&
    Number.isSafeInteger(roll.campaignMinute)&&roll.campaignMinute>=source.campaignMinute&&
    roll.campaignMinute<=entry.campaignMinute&&
    ['secondary-mastery-value-test','success-value-specific'].includes(roll.skillTestProof?.type)&&
    Number.isSafeInteger(selected)&&selected<=stars&&
    (adjusted?true:(test.sv>=3||(test.sv>=1&&p.modes.slow>=1))),
    'Únava neodkazuje na přípustný, zdrojově doložený Orienteering SV');
  }
 }
 return true;
}
