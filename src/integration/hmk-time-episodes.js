import {verifyPassiveWeatherResistance} from './hmk-weather-passive-93820.js';
import {validateEquipmentTimeWork93844, EQUIPMENT_TIME_POLICY_93844} from './hmk-equipment-time-work-93844.js';
import {validateSharedTimeWindowJournal93767,assertSharedEpisodeOverlaps93768} from './hmk-shared-time-window-93767.js';
/** HMK Keeper's Ledger – GM-timed episodes.
 * Explicit house-rule mode: time is divided into freely chosen episodes,
 * not compulsory four-hour watches. Printed LPW remains the source speed.
 * All receipts are append-only and never substitute for genuine Skill Tests.
 */
import {trekMovement,trekWeatherDay,trekWeatherWatch,trekHazards} from './hmk-trekking-routine.js';
import {pcShelteredStayAt} from './hmk-pc-sheltered-stay-93730.js';
import {coldCatalogRule} from './hmk-cold-gear-93740.js';
import {expeditionSecondaryRoll} from './hmk-calendar-expedition.js';
import {createOrienteeringContext,adjustedOrienteeringSV} from './hmk-trekking-orienteering.js';
import {allocateTrekModes} from './hmk-trekking-correction.js';
import {assertOrienteeringModes} from './hmk-trekking-orienteering.js';
import {trackingModifiers,trackingOutcome} from './hmk-trekking-wilderness-tasks.js';
import {episodeEncounterSurprise,episodeEncounterDistance,episodeHazardFollowup,episodeTrackingFollowup,episodeWeatherExposure,episodeWeatherFatigueUnits,episodeLightIntervals} from './hmk-episode-travel-detail.js';
import {validateTrekAnimalHealthProof} from './hmk-trekking-animal-health.js';
import {validateTransportMassEvidence93816} from './hmk-transport-passengers-93816.js';
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
export function episodeEncounterByMinutes({minutes,environ='rural',night=false,d100,d100Sub=null,lightMinutes=null}={}){
 must(whole(minutes,1,10080),'Encounter vyžaduje délku epizody v minutách');
 const tn={highway:[2,1],rural:[4,1],wilderness:[1,1],underworld:[9,9]}[environ]?.[night?1:0];
 must(tn!==undefined&&typeof night==='boolean','Encounter: neplatné prostředí či denní doba');
 must(whole(d100,1,100),'Minutový Encounter vyžaduje skutečný d100 (1–100).');
 must(d100Sub===null||whole(d100Sub,1,100),'Upřesňující Encounter vyžaduje druhý skutečný d100 (1–100).');
 const referenceMinutes=night&&environ==='wilderness'?480:240;
 if(lightMinutes!==null)must(whole(lightMinutes.day,0,minutes)&&whole(lightMinutes.night,0,minutes)&&lightMinutes.day+lightMinutes.night===minutes,
  'Encounter: délka denního a nočního světla musí přesně odpovídat minutám epizody.');
 const intensity=lightMinutes===null?-Math.log1p(-tn/10)*minutes/referenceMinutes:
  -Math.log1p(-({highway:2,rural:4,wilderness:1,underworld:9}[environ])/10)*lightMinutes.day/240
  -Math.log1p(-({highway:1,rural:1,wilderness:1,underworld:9}[environ])/10)*lightMinutes.night/(environ==='wilderness'?480:240);
 // Percentile midpoint provides an unbiased, reproducible finite d100 draw.
 const target=d100Sub===null?(d100-.5)/100:((d100-1)*100+(d100Sub-.5))/10000;
 let probability=Math.exp(-intensity),cumulative=probability,count=0;
 while(cumulative<target&&count<10000){count++;probability*=intensity/count;cumulative+=probability;}
 return {format:'hmk-episode-encounter-minute-v1',d100,...(d100Sub===null?{}:{d100Sub}),tn,environ,night,minutes,
  ...(lightMinutes===null?{}:{lightMinutes}),count,found:count>0,chance:1-Math.exp(-intensity),resolved:false,
  procedure:'gm-minute-poisson-from-hmk-d10-density',sourcePage:150};
}

export function calculateTimeEpisode({minute,minutes,kind='travel',topography='flat',terrain='paved-road',conveyance='foot',
 progress=0,bearing=0,extraSlow=0,wearied=false,injured=false,loaded=false,continuousPrecipitation=false,progressD10=[],directionD10=[],
 enduranceByActor={},endRollByActor={},memberIds=[],weather=null,encounterRoll=null,encounterEnviron='rural',
 encounterResolved=false,encounterNight=false,encounterPercentile=null,encounterSubPercentile=null,previousCarry={},mapScale=25000,forcedWeatherRoll=false,
 survivalCriticalFailure=false,survivalD10=null,doubleTime=false,loadBypass=false,encByActor={},dunesSlow=false,
  forcedBearing=0,previousDistanceFraction=0,encounterLightMinutes=null,movementMinutes=null,inactiveByActor={},transportedMemberIds=[],walkingHandlerIds=[]}={}){
 must(whole(minute,0,1e9)&&whole(minutes,1,10080)&&minute+minutes<=1e9,'Epizoda potřebuje 1–10 080 skutečných minut.');
 must(EPISODE_KINDS.includes(kind),'Neznámý druh epizody');
 if(movementMinutes===null)movementMinutes=minutes;
 must(whole(movementMinutes,0,minutes),'Pohybové minuty nesmí přesáhnout skutečnou délku epizody.');
 must(Array.isArray(memberIds)&&memberIds.length>0&&new Set(memberIds).size===memberIds.length,'Vyberte jedinečné účastníky');
 must(Array.isArray(transportedMemberIds)&&new Set(transportedMemberIds).size===transportedMemberIds.length&&
  transportedMemberIds.every(id=>memberIds.includes(id))&&
  (!transportedMemberIds.length||(kind==='travel'&&['cart','wagon','mount'].includes(conveyance))),
  'Přepravovaní pacienti vyžadují doložený skutečný transport, jednotlivé členství a potvrzení GM.');
 must(Array.isArray(walkingHandlerIds)&&new Set(walkingHandlerIds).size===walkingHandlerIds.length&&
  walkingHandlerIds.every(id=>memberIds.includes(id)&&!transportedMemberIds.includes(id)),
  'Vedení koně pěšky musí patřit aktivnímu členovi této cestovní skupiny.');
 must(whole(mapScale,100,10000000),'Neplatné měřítko mapy');
 const slow=extraSlow+Number(wearied)+Number(injured)+Number(continuousPrecipitation)+Number(dunesSlow);
 must(whole(extraSlow,0,20)&&whole(progress,0,10)&&whole(bearing,0,20)&&whole(forcedBearing,0,1)&&
  typeof doubleTime==='boolean'&&typeof loadBypass==='boolean'&&typeof dunesSlow==='boolean'&&
  typeof previousDistanceFraction==='number'&&previousDistanceFraction>=0&&previousDistanceFraction<1,
  'Neplatné pohybové režimy nebo přenos zlomku vzdálenosti.');
 must(!(loaded&&loadBypass),'Zrušený Loaded Mode nelze současně započítat jako zpomalení.');
 must(!dunesSlow||(kind==='travel'&&terrain==='dunes'&&conveyance==='foot'),
  'Dunes Slow lze zvolit pouze při pěší cestě přes duny (HMK 146).');
 if(!['travel','forage'].includes(kind))must(!survivalCriticalFailure&&survivalD10===null,'Survival Hazard platí pouze pro Orienteering při cestování nebo samostatném Foraging.');
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
  const exactMetres=motion.finalLPW*4000*movementMinutes/240+previousDistanceFraction;
  distanceMeters=Math.floor(exactMetres+1e-10);
  var distanceFractionOut=Math.min(0.9999999999,Math.max(0,exactMetres-distanceMeters));
  actors=memberIds.map(id=>{
   const end=enduranceByActor[id],inactive=inactiveByActor[id];
   const carryIn=previousCarry[id]??0;
   must(whole(carryIn,0,239),'Neplatný zbytek poměrné únavy.');
   let activeMinutes=movementMinutes,earlyIncapacity=null;
   if(inactive){
    must(Number.isSafeInteger(inactive.minute)&&inactive.minute>=minute&&inactive.minute<=minute+minutes&&
     ['INC','UNC','KIA'].includes(inactive.shock),
     'Nesplnitelný END test vyžaduje doložený zdravotní stav a minutu vzniku.');
    activeMinutes=Math.min(movementMinutes,inactive.minute-minute);
    earlyIncapacity={minute:inactive.minute,shock:inactive.shock,sourceKey:inactive.sourceKey,
     activeMovementMinutes:activeMinutes};
   }
   const enc=encByActor[id]??0;
   must(whole(enc,0,100),'Nenastavená nebo neplatná ENC postavy.');
   if(transportedMemberIds.includes(id)){
    must(!inactive,'Přepravovaný pacient nemůže současně získat nový aktivní END během cesty.');
    must(endRollByActor[id]===undefined||endRollByActor[id]===''||endRollByActor[id]===0||
     (Array.isArray(endRollByActor[id])&&endRollByActor[id].length===0),
     'Přepravovaný pacient nemá provádět END d10 ani získat únavu z vlastní chůze.');
    return {id,endurance:end,roll:null,sr:null,rate:0,delta:0,carryIn,carryOut:carryIn,
     enc,extraFatigue:0,duneFatigue:0,movementFatigueUnits:0,
     endNotRequired:{reason:'transported',minute,sourceKey:'gm-confirmed-transport-v93.755'}};
   }
   const onFoot=conveyance==='foot'||walkingHandlerIds.includes(id);
   const extraFatigue=loadBypass?Math.floor(enc/(onFoot?10:20))*10:0;
   const duneFatigue=terrain==='dunes'&&onFoot&&!dunesSlow?5:0;
   if(activeMinutes===0)return {id,endurance:end,roll:null,sr:null,rate:0,delta:0,carryIn,
    carryOut:carryIn,enc,extraFatigue:0,duneFatigue:0,movementFatigueUnits:0,...(earlyIncapacity?{earlyIncapacity}:{}),
    endNotRequired:inactive?{minute:inactive.minute,shock:inactive.shock,sourceKey:inactive.sourceKey}:
     {reason:'equipment-delay',minute,sourceKey:'equipment-next-watch'}};
   must(whole(end,0,50),'Cestující postava potřebuje doložené END.');
   const raw=endRollByActor[id],rolls=Array.isArray(raw)?raw:[raw];
   const count=doubleTime?Math.ceil(activeMinutes/60):1;
   must(rolls.length===count&&rolls.every(r=>whole(r,1,10)),doubleTime?
    'Double Time vyžaduje samostatný skutečný END d10 za každou započatou hodinu pohybu ('+count+' hodů).':
    'Každá cestující postava potřebuje skutečný END SR d10.');
   const srs=rolls.map(roll=>expeditionSecondaryRoll({endurance:end,roll,
    riding:!onFoot&&(conveyance==='mount'||conveyance==='cart'||conveyance==='wagon')}));
   const baseUnits=doubleTime?srs.reduce((total,sr,i)=>{
    const inHour=Math.min(60,Math.max(0,activeMinutes-60*i));
    const base=onFoot?10:5;
    // Fatigue is accrued in 1/240-point units; 60 minutes * 4 = one hour.
    return total+inHour*4*Math.max(0,base-(sr.success?5:0));
   },0):activeMinutes*(srs[0].success?0:5);
   const movementFatigueUnits=baseUnits+activeMinutes*(extraFatigue+duneFatigue);
   const units=carryIn+movementFatigueUnits;
   return {id,endurance:end,roll:srs[0].roll,sr:srs[0],
    ...(doubleTime?{hourlyEndSR:srs}:{}),
    rate:activeMinutes?movementFatigueUnits/activeMinutes:0,movementFatigueUnits,
    delta:Math.floor(units/240),carryIn,carryOut:units%240,
    enc,extraFatigue,duneFatigue,...(earlyIncapacity?{earlyIncapacity}:{})};
  });
 }
 // HMK 145 / 148: Orienteering CF also applies when the party forages
 // in its starting hex. There is no Direction Hazard or movement.
 if(kind==='forage')survivalHazard=trekHazards({bearingDeficit:0,directionD10:[],
  survivalCriticalFailure,survivalD10}).survival;
 if(weather){must(weather.format==='hmk-trekking-weather-day-v1','Neplatný doklad počasí');}
 const target={highway:[2,1],rural:[4,1],wilderness:[1,1],underworld:[9,9]}[encounterEnviron]?.[encounterNight?1:0];
 must(target!==undefined,'Neznámé prostředí setkání');
 must(typeof encounterNight==='boolean','Encounter: neplatný den/noc');
 if(encounterRoll!==null){must(whole(encounterRoll,1,10),'Encounter vyžaduje skutečný hod d10');}
 const encounter=encounterPercentile!==null?
  {...episodeEncounterByMinutes({minutes,environ:encounterEnviron,night:encounterNight,d100:encounterPercentile,d100Sub:encounterSubPercentile,lightMinutes:encounterLightMinutes}),resolved:!!encounterResolved}:
  encounterRoll===null?null:{roll:encounterRoll,tn:target,night:encounterNight,found:encounterRoll<=target,
  resolved:!!encounterResolved};
 return {format:EPISODE_FORMAT,startMinute:minute,endMinute:minute+minutes,minutes,kind,
  ...(walkingHandlerIds.length?{walkingHandlerIds:[...walkingHandlerIds]}:{}),
  memberIds:[...memberIds],...(transportedMemberIds.length?{transportedMemberIds:[...transportedMemberIds]}:{}),terrain,topography,conveyance,mapScale,motion,
  distanceMeters,distanceKilometres:distanceMeters/1000,
  ...(kind==='travel'?{movementMinutes}:{}),
  ...(kind==='travel'?{distanceFractionIn:previousDistanceFraction,distanceFractionOut}:{}),
  mapCentimetres:Math.round(distanceMeters*100000/mapScale)/1000,
  actors,encounter,direction,survivalHazard,weather,slow,progress,bearing,loaded,
  ...(kind==='travel'?{doubleTime,loadBypass,dunesSlow,forcedBearing,...(doubleTime?{endSRMode:'hourly-verified-v93.663'}:{})}:{}),
  weatherHazard:weather?weather.daylightHazard:null,
  consumption:'stávající časově doložený 24hodinový účet výživy',
  gmTimeScale:'gm-arbitrary-episode-proportional-carry-v1',sourcePages:[144,145,146,149,150]};
}
/** GM minute adaptation of HMK pp.148–149: time lost to an obstacle is
 * still elapsed campaign time, but not moving time. Unspent delays survive
 * other activities and are consumed once by subsequent travel episodes.
 * Equipment F/CF is no longer represented by this carry after v93.695. */
export function episodeMinuteDelay({minutes,incoming=0,current=0,future=0,persistCarry=true}={}){
 must(whole(minutes,1,10080)&&whole(incoming,0,10000000)&&whole(current,0,10080)&&
  whole(future,0,10080),'Zdržení: potřebujeme skutečné celé minuty (nikoli odhadovaný hod).');
 const blocked=(persistCarry?incoming:0)+current,applied=Math.min(minutes,blocked);
 return {format:'hmk-episode-minute-delay-v1',incoming:persistCarry?incoming:0,current,future:persistCarry?future:0,applied,
  movementMinutes:minutes-applied,carryOut:persistCarry?blocked-applied+future:0,sourcePages:[148,149],
  method:persistCarry?'gm-documented-minutes-not-printed-watch-length':'gm-current-episode-only-v2'};
}
export function lastEpisodeTravelDelayCarry(journal=[],campaignId,minute=Infinity){
 for(let i=journal.length-1;i>=0;i--){const row=journal[i],ep=row.calendarTimeEpisode;
  if(row.calendarCampaignId!==campaignId||!ep||ep.startMinute>=minute||ep.kind!=='travel')continue;
  return ep.travelDelay?.carryOut??0;
 }return 0;
}
/** v93.763: travel consequences belong to travellers, not to the shared
 * campaign clock. An omitted scope retains the pre-93.763 replay semantics for
 * immutable historical receipts; new UI receipts supply actual participants.
 * Any overlapping participant is continuity. A change of membership involving
 * more than one independently travelling group remains GM-adjudicated.
 */
function travelPartySet93763(memberIds){
 if(memberIds===null)return null;
 must(Array.isArray(memberIds)&&memberIds.length>0&&
  new Set(memberIds).size===memberIds.length&&
  memberIds.every(id=>typeof id==='string'&&!!id),'Pochod: neplatní účastníci družiny pro přenos následků.');
 return new Set(memberIds);
}
function travelPartyOverlaps93763(e,party){
 return !party||Array.isArray(e?.memberIds)&&e.memberIds.some(id=>party.has(id));
}
/** A fully released member starts a new participation lifecycle on return.
 * This affects only the selected party's pending, fractional travel work;
 * the immutable earlier receipts (and still-active unrelated parties) remain.
 * Legacy unscoped historical reads are preserved verbatim.
 */
function partyHistoryAfterRelease93766(journal,campaignId,minute,party){
 if(!party)return journal;
 for(let i=journal.length-1;i>=0;i--){
  const j=journal[i],r=j.calendarMemberRelease;
  if(j.calendarCampaignId===campaignId&&j.campaignMinute<=minute&&
     r?.format==='hmk-calendar-member-release-v93.765'&&
     r.actorId===j.characterId&&party.has(r.actorId)&&
     r.campaignId===campaignId&&r.minute===j.campaignMinute&&r.gmConfirmed===true)
   return journal.slice(i+1);
 }
 return journal;
}
/** One Slow Mode from a successful equipment repair (S) applies to the NEXT
 * trekking watch (HMK p.148). Minutes in shorter watches decrement this
 * obligation only for actual moving minutes, without duplicating it. Older receipts had no carry;
 * inspect their result only for the first subsequent travel watch. */
export function lastEquipmentSlowCarry(journal=[],campaignId,minute=Infinity,memberIds=null){
 const party=travelPartySet93763(memberIds);
 journal=partyHistoryAfterRelease93766(journal,campaignId,minute,party);
 for(let i=journal.length-1;i>=0;i--){
  const row=journal[i],e=row.calendarTimeEpisode;
  if(row.calendarCampaignId!==campaignId||!e||e.kind!=='travel'||e.startMinute>=minute||
   !travelPartyOverlaps93763(e,party))continue;
  if(Number.isSafeInteger(e.equipmentSlowCarryOut))return e.equipmentSlowCarryOut;
  return e.hazardDetails?.some(h=>(h.hazard==='equipment'||h.hazard==='complication'&&h.automationVersion==='v93.681')&&h.result==='short-delay')?240:0;
 }
 return 0;
}
/** v93.695 GM adaptation: Equipment repairs are inventory work, never travel time.
 * Complication remains a genuine travel obstruction. Reconstruct its independent
 * remaining delay from immutable travel receipts, including pre-v93.695 saves.
 * Historical receipts themselves keep their original verification rules. */
export function independentTravelDelayCarry(journal=[],campaignId,minute=Infinity,memberIds=null){
 const party=travelPartySet93763(memberIds);
 journal=partyHistoryAfterRelease93766(journal,campaignId,minute,party);
 const episodes=journal.filter(j=>j.calendarCampaignId===campaignId&&
  j.calendarTimeEpisode?.kind==='travel'&&j.calendarTimeEpisode.startMinute<minute&&
  travelPartyOverlaps93763(j.calendarTimeEpisode,party))
  .map(j=>j.calendarTimeEpisode).sort((a,b)=>a.startMinute-b.startMinute);
 let remaining=0;
 for(const e of episodes){
  remaining=Math.max(0,remaining-e.minutes);
  const complication=e.hazardDetails?.find(h=>h.hazard==='complication'&&
   h.automationVersion==='v93.681'&&['long-delay','irreparable'].includes(h.result));
  if(complication&&Number.isSafeInteger(e.travelDelay?.future)&&e.travelDelay.future>0)remaining+=e.travelDelay.future;
 }
 return remaining;
}
/** Fractional metre accounting follows the last journey, even across rest. */
export function lastTimeEpisodeDistanceFraction(journal=[],campaignId,minute=Infinity,memberIds=null){
 const party=travelPartySet93763(memberIds);
 journal=partyHistoryAfterRelease93766(journal,campaignId,minute,party);
 for(let i=journal.length-1;i>=0;i--){const row=journal[i],ep=row.calendarTimeEpisode;
  if(row.calendarCampaignId!==campaignId||!ep||ep.startMinute>=minute||ep.kind!=='travel'||
   !travelPartyOverlaps93763(ep,party))continue;
  return ep.distanceFractionOut??0;
 }return 0;
}
/** A Tracking CF imposes Bearing on the next actual travelling episode,
 * not the next generic event. That obligation is consumed once, not repeated. */
export function pendingTrackingCFBearing(journal=[],campaignId,minute=Infinity,memberIds=null){
 // Historical callers may omit memberIds; new episode preparations must supply
 // the actual party. A CF is a party obligation, never a campaign-wide buff.
 const members=memberIds===null?null:new Set(memberIds);
 if(members&&(!Array.isArray(memberIds)||!memberIds.length||members.size!==memberIds.length))
  throw Error('Tracking CF: neplatní účastníci následující cesty');
 journal=partyHistoryAfterRelease93766(journal,campaignId,minute,members);
 const episodes=journal.filter(row=>row.calendarCampaignId===campaignId&&row.calendarTimeEpisode&&
  row.calendarTimeEpisode.startMinute<minute).sort((a,b)=>b.calendarTimeEpisode.startMinute-a.calendarTimeEpisode.startMinute);
 for(const row of episodes){const ep=row.calendarTimeEpisode;
  const party=ep.memberIds??[];
  if(members&&!party.some(id=>members.has(id)))continue;
  const cf=ep.trackingMemory?.level==='CF'&&ep.trackingMemory?.sourceMode==='new';
  if(cf&&members&&(party.length!==members.size||party.some(id=>!members.has(id))))
   throw Error('Tracking CF: původní družina změnila složení. Povinný Bearing vyžaduje rozhodnutí GM.');
  if(ep.kind==='travel')return cf?1:0;
  if(cf)return 1;
 }return 0;
}
/** Approved GM minute-accounting exception (2026-11-02), HMK p.176:
 * Whole Fatigue points are stored with a 1/240-point carried remainder.
 * The remainder follows the character through travel and exposed rest;
 * empty/non-exposed episodes do not discard it. Discrete rolls are unchanged.
 * NOTE: simultaneous climate+recovery netting remains under audit. */
export function lastTimeEpisodeCarry(journal=[],campaignId,actorId){
 for(let i=journal.length-1;i>=0;i--){const j=journal[i];
  if(j.calendarCampaignId!==campaignId)continue;
  // GM offboarding (v93.765) terminates live medical and Fatigue monitoring.
  // A later return must not resurrect sub-point weariness from an older trek.
  // Keep the immutable old receipt intact for replay before the release.
  const release=j.calendarMemberRelease;
  if(release?.format==='hmk-calendar-member-release-v93.765'&&
     release.actorId===actorId&&j.characterId===actorId&&
     release.campaignId===campaignId&&release.minute===j.campaignMinute&&
     release.gmConfirmed===true)return 0;
  if(!j.calendarTimeEpisode)continue;
  const ep=j.calendarTimeEpisode;
  const a=[...(ep.actors||[]),...(ep.animals||[]),...(ep.weatherRestFatigue||[])].find(x=>x.id===actorId);
  if(a){
   if(a.carryOut===undefined)return 0; // legacy pre-carry documents
   must(whole(a.carryOut,0,239),'Historický zbytek minutové únavy je neplatný.');
   return a.carryOut;
  }
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
export function episodeSkillProof(row,skill,guideId,campaignId,atMinute,{requireSV=false}={}){
 // A stand-alone Skill Test may have its own calendar obligations, including
 // CF follow-ups, but it cannot become evidence for an unrelated episode.
 if(row?.calendarIndependentSkillTest)return null;
 const p=row?.skillTestProof,actual=p?.skills?.[0]||p?.skill||p?.primarySkill;
 const r=p?.a||p?.result;
 if(!row||row.calendarCampaignId!==campaignId||row.characterId!==guideId||
  row.campaignMinute!==atMinute||actual!==skill||
  !['secondary-mastery-value-test','skill-value-result','secondary-mastery-test'].includes(p?.type)||
  (requireSV&&(!['secondary-mastery-value-test','skill-value-result'].includes(p?.type)||!Number.isSafeInteger(r?.sv)))||
  !['CF','F','S','CS'].includes(r?.level))return null;
 const stars=r?.svTier?.stars;
 return {skillId:row.id,guideId,skill,sv:['secondary-mastery-value-test','skill-value-result'].includes(p.type)?r.sv:null,level:r.level,
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
export function lastEpisodeBefore(journal=[],campaignId,minute,memberIds=null){
 // Historical callers can request the campaign's latest episode. Navigation
 // MUST instead follow only an overlapping party: an unrelated party's rest
 // cannot erase Lost, and its Lost must never infect independent travellers.
 const members=memberIds===null?null:new Set(memberIds);
 if(members&&(!Array.isArray(memberIds)||members.size!==memberIds.length||!memberIds.length))
  throw Error('Navigation: neplatní účastníci epizody.');
 journal=partyHistoryAfterRelease93766(journal,campaignId,minute,members);
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarTimeEpisode&&
  j.calendarTimeEpisode.endMinute<=minute&&
  (!members||j.calendarTimeEpisode.memberIds?.some(id=>members.has(id))))
  .sort((a,b)=>b.calendarTimeEpisode.endMinute-a.calendarTimeEpisode.endMinute)[0]||null;
}
export function mayReuseEpisodeSkill({previous,minute,context,kind='orientation',trail='',trackerId=null }={}){
 const old=previous?.calendarTimeEpisode;
 if(!old||old.endMinute!==minute||(kind==='orientation'?old.kind!=='travel':!['tracking','travel'].includes(old.kind)))return false;
 const memo=kind==='orientation'?old.orientation:old.trackingMemory;
 if(!memo?.skillId||memo.format!==EPISODE_SKILL_MEMORY_FORMAT||
  JSON.stringify(memo.context)!==JSON.stringify(context))return false;
 return kind!=='tracking'||memo.trail===String(trail||'').trim()&&!!memo.trail&&(!trackerId||(memo.trackerId||memo.guideId)===trackerId);
}
export function computeEpisodeOrientation({mode='none',currentSkill=null,previous=null,minute,
  context,priority='pace',allocationMode='auto',manualModes=null,lowChoice='slow',requiredBearing=0,continuousPrecipitation=false,familiar=false,
  torchlight=false,fullMoon=false,afterSnowfall=false,droverSkill=null,droverActorId=null,animalsPresent=context?.conveyance!=='foot',requiredDroverSkill=null,stationaryForaging=false}={}){
 must(['none','new','reuse'].includes(mode),'Neznámé použití Orienteering.');
 if(mode==='none')return null;
 must(!stationaryForaging||mode==='new','Samostatný Foraging vyžaduje nový situační Orienteering; přebírání cestovního SV není dovoleno.');
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
   afterSnowfall:context.night&&afterSnowfall,stationaryForaging,conveyance:context.conveyance,
   droverId:animalsPresent?(droverActorId||context.guideId):null,
   animalsPresent});
  if(animalsPresent)must(droverSkill?.skillId&&
   (!requiredDroverSkill||droverSkill.skill===requiredDroverSkill)&&
   ['Animalcraft','Riding'].includes(droverSkill.skill)&&
   droverSkill.guideId===(droverActorId||context.guideId)&&
   context.memberIds.includes(droverActorId||context.guideId),
   'Cesta se zvířaty potřebuje skutečný '+(requiredDroverSkill||'Riding/Animalcraft')+' Drover test určeného člena družiny.');
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
 }else if(stationaryForaging){
  const stars=adjustment.advantageModes;
  // HMK 145: the first two awarded stars are forced Foraging. Remaining
  // stars default to Foraging; GM can manually choose Stalking/Vigilance.
  allocation={progress:0,bearing:0,foraging:stars,stalking:0,vigilance:0,
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
  context,sv:witness.sv,level:witness.level,stars:adjustment.advantageModes,roll:witness.roll??null,
  adjustment,priority,allocationMode,stationaryForaging:stationaryForaging===true,lowChoice:mode==='reuse'?witness.lowChoice||lowChoice:lowChoice,
  manualModes:allocationMode==='manual'?Object.fromEntries(['bearing','progress','foraging','stalking','vigilance'].map(k=>[k,allocation[k]])):null,
  droverSkillId:mode==='reuse'?witness.droverSkillId??null:droverSkill?.skillId??null,
  ...(mode==='new'&&animalsPresent?{droverActorId:droverActorId||context.guideId,requiredDroverSkill}:{}),
  droverLevel:mode==='reuse'?witness.droverLevel??null:droverSkill?.level??null,
  modes:{progress:allocation.progress,bearing:allocation.bearing,
   foraging:allocation.foraging,stalking:allocation.stalking,vigilance:allocation.vigilance,
   lax:allocation.lax,orienteeringSlow:allocation.orienteeringSlow},
  reusedFromEpisodeId:mode==='reuse'?previous.id:null,sourceMode:mode};
}
/** Pure source-of-truth for HMK p.147 Tracking Conditions. Never trust
 * disabled UI checkbox serialization: the actual witnessed precipitation,
 * calendar illumination and terrain are the authority. */
export function episodeTrackingConditionsFromContext({weatherWatch=null,period='day',terrain='',road='none',partyTracked=0}={}){
 must(['day','twilight','night'].includes(period),'Tracking: neznámá denní doba');
 const isContinuous=weatherWatch?.continuous===true;
 const conditions={continuousSnow:isContinuous&&weatherWatch?.precipitation==='snow',
  continuousRain:isContinuous&&weatherWatch?.precipitation==='rain',
  partyTracked,twilight:period==='twilight',night:period==='night',
  alpine:terrain==='alpine-vegetation',road};
 trackingModifiers(conditions); // Validate all user-supplied non-derived facts.
 return conditions;
}
export function computeEpisodeTracking({mode='none',currentSkill=null,previous=null,minute,context,trackerId=context?.guideId,trail='',conditions=null}={}){
 must(['none','new','reuse'].includes(mode),'Neznámé použití Tracking.');
 if(mode==='none')return null;
 const trailName=String(trail||'').trim();must(trailName.length>0,'Uveďte skutečně sledovanou stopu.');
 must(context?.memberIds?.includes(trackerId),'Tracking musí provést skutečný člen cestující družiny.');
 const witness=mode==='reuse'?(mayReuseEpisodeSkill({previous,minute,context,kind:'tracking',trail:trailName,trackerId})?
  previous.calendarTimeEpisode.trackingMemory:null):currentSkill;
 must(witness?.skill==='Tracking'||mode==='reuse'&&witness?.skillId,
  'Tracking: vyberte skutečný nový Tracking SV, nebo souvislé pokračování téže stopy.');
 must((witness.trackerId||witness.guideId)===trackerId,'Tracking musí patřit vybranému stopaři.');
 const actual=conditions||{continuousSnow:false,continuousRain:false,partyTracked:0,twilight:false,night:context.night,alpine:false,road:'none'};
 must(!(actual.continuousRain&&actual.continuousSnow)&&!(actual.twilight&&actual.night),
  'Tracking: vzájemně vyloučené podmínky deště/sněhu nebo denní doby.');
 const modifier=trackingModifiers(actual);
 if(mode==='reuse'&&witness.conditions)must(JSON.stringify(actual)===JSON.stringify(witness.conditions),
  'Tracking SV nelze převzít při změně prostředí nebo stopových modifikátorů.');
 const score=trackingOutcome(witness.sv+modifier.delta,{criticalFailure:witness.level==='CF'});
 return {format:EPISODE_SKILL_MEMORY_FORMAT,skillId:witness.skillId,guideId:context.guideId,
  trackerId,context,trail:trailName,sv:witness.sv,level:witness.level,stars:witness.stars??null,
  roll:witness.roll??null,conditions:actual,modifier,score,sourceMode:mode,reusedFromEpisodeId:mode==='reuse'?previous.id:null};
}
export function episodeNavigationState(previous,newDirection=null,{recovered=false,redirected=false,lostPriority=false}={}){
 const p=previous?.calendarTimeEpisode;
 const earlier=p?.navigationState||
  (p?.direction?.direction==='lost'?'lost':p?.direction?.direction==='misdirection'?'misdirection':'clear');
 const active=recovered?'clear':earlier;
 // The guide's successful Awareness in the current misdirection watch can
 // correct that watch (HMK p148). A newly rolled Lost is not curable this way.
 return newDirection?.direction==='lost'?'lost':
  lostPriority&&active==='lost'?'lost':
  newDirection?.direction==='misdirection'?(redirected?'clear':'misdirection'):active;
}
export function validateTimeEpisodes(journal=[]){
 const byCampaign=new Map(),prior=[];
 for(const j of journal){const e=j.calendarTimeEpisode;
  // An authorized calendar exit is a real boundary for actor-local Fatigue
  // carry, although it is not itself a time episode. Retain it in replay's
  // prefix so validation of later trips never revives a cleared remainder.
  if(!e){if(j.calendarMemberRelease)prior.push(j);continue;}
  must(e.format===EPISODE_FORMAT&&whole(e.startMinute,0,1e9)&&whole(e.minutes,1,10080)&&
   e.endMinute===e.startMinute+e.minutes&&e.startMinute===j.campaignMinute&&
   typeof j.calendarCampaignId==='string'&&Array.isArray(e.memberIds),'Neplatná herní epizoda');
  must(e.travelPartyScope===undefined||e.kind==='travel'&&e.travelPartyScope==='v93.763'&&
   Array.isArray(e.memberIds)&&e.memberIds.length>0&&new Set(e.memberIds).size===e.memberIds.length,
   'Neznámé nebo neplatné vymezení cestovní družiny.');
  const travelScope=e.travelPartyScope==='v93.763'?e.memberIds:null;
  // The references are not new rolls. Verify linked proof and continuous inheritance.
  for(const [key,skill] of [['orientation','Survival'],['trackingMemory','Tracking']]){
   const memo=e[key];if(!memo)continue;
   must(memo.format===EPISODE_SKILL_MEMORY_FORMAT&&typeof memo.skillId==='string'&&
    memo.guideId===memo.context?.guideId&&e.memberIds.includes(memo.guideId)&&
    (key!=='trackingMemory'||e.memberIds.includes(memo.trackerId||memo.guideId)),
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
   must(episodeSkillProof(linked,skill,key==='trackingMemory'?(memo.trackerId||memo.guideId):memo.guideId,j.calendarCampaignId,linked.campaignMinute),
    'Epizoda odkazuje na nesprávnou dovednost nebo postavu.');
   const sr=episodeSkillProof(linked,skill,key==='trackingMemory'?(memo.trackerId||memo.guideId):memo.guideId,j.calendarCampaignId,linked.campaignMinute);
   must(memo.sv===sr.sv&&memo.level===sr.level&&memo.stars===sr.stars,
    'Výsledek nebo hvězdičky historického Skill Testu byly pozměněny.');
   if(key==='orientation'){
    const stationary=e.kind==='forage'&&e.stationaryForagingPolicy==='hmk-stationary-v93.835';
    must((e.kind==='travel'||stationary)&&memo.modes?.progress+(e.gmExtraProgress||0)===e.progress&&memo.modes?.bearing===e.bearing,
     'Orienteering režimy musí souhlasit s vypočteným pohybem epizody.');
    if(stationary)must(e.progress===0&&e.bearing===0&&memo.stationaryForaging===true&&memo.sourceMode==='new'&&
     e.distanceMeters===0&&Array.isArray(e.standaloneForaging),
     'Foraging na místě vyžaduje nulový pohyb a nový doložený Orienteering.');
    must(memo.adjustment?.baseSV===sr.sv&&Number.isInteger(memo.adjustment?.advantageModes),
     'Upravený SV není podložen původním hodem.');
    const required=stationary?0:trekMovement({topography:e.topography,terrain:e.terrain,
     conveyance:e.conveyance,progress:0,slow:0,bearing:0,loaded:false,progressD10:[],
     continuousPrecipitation:!!e.precipitation?.slowMode,
     bearingRule:e.trekTerrainPolicy93851==='hmk-v1.2-93851'?'hmk':'legacy'}).requiredBearing;
    const recoveryRule=e.navigationRecoveryRule==='special-bearing-and-awareness-v93.780';
    const navPrior=recoveryRule?lastEpisodeBefore(prior,j.calendarCampaignId,e.startMinute,e.memberIds):null;
    const specialBearing=recoveryRule&&e.navigationRecovered&&episodeNavigationState(navPrior)==='lost'?1:0;
    const trackingBearing=recoveryRule?pendingTrackingCFBearing(prior,j.calendarCampaignId,e.startMinute,e.memberIds):0;
    if(recoveryRule&&specialBearing)must(e.bearing>=required+trackingBearing+1,
     'Lost: návrat na trasu bez zvláštního, skutečně přiděleného Bearing Mode.');
    let allocation;
    if(memo.allocationMode==='manual'){
     allocation={...memo.manualModes,lax:memo.adjustment.adjustedSV<=0||memo.adjustment.adjustedSV<=2&&memo.lowChoice==='lax',
      orienteeringSlow:memo.adjustment.adjustedSV<=0||memo.adjustment.adjustedSV<=2&&memo.lowChoice!=='lax'?1:0};
     assertOrienteeringModes({adjustment:memo.adjustment,modes:allocation});
    }else if(stationary){
     allocation={progress:0,bearing:0,foraging:memo.adjustment.advantageModes,stalking:0,vigilance:0,
      lax:memo.adjustment.adjustedSV<=0||memo.adjustment.adjustedSV<=2&&memo.lowChoice==='lax',
      orienteeringSlow:memo.adjustment.adjustedSV<=0||memo.adjustment.adjustedSV<=2&&memo.lowChoice!=='lax'?1:0};
     assertOrienteeringModes({adjustment:memo.adjustment,modes:allocation});
    }else{
     allocation=allocateTrekModes({autoAllocate:true,autoPriority:memo.priority,slow:0,
      orienteeringSlow:0,foraging:0,stalking:0,vigilance:0,trackingForcedBearingSourceId:null},
      memo.adjustment,{requiredBearing:required+trackingBearing+specialBearing});
     if(memo.lowChoice==='lax'&&memo.adjustment.adjustedSV>=1&&memo.adjustment.adjustedSV<=2){
      allocation.lax=true;allocation.orienteeringSlow=0;
     }
    }
    const keys=['progress','bearing','foraging','stalking','vigilance','lax','orienteeringSlow'];
    must(keys.every(k=>memo.modes[k]===allocation[k]),
     'Advantage Modes neodpovídají doloženému SV a strategii GM.');
    if(memo.sourceMode==='new'){
     const droverRow=memo.droverSkillId?journal.find(x=>x.id===memo.droverSkillId):null;
     const proofActor=memo.droverActorId||memo.guideId;
     const droverProof=!memo.droverSkillId?null:
      (episodeSkillProof(droverRow,'Animalcraft',proofActor,j.calendarCampaignId,e.startMinute)||
       episodeSkillProof(droverRow,'Riding',proofActor,j.calendarCampaignId,e.startMinute));
     must((e.conveyance==='foot'&&!memo.droverSkillId)||droverProof&&droverProof.level===memo.droverLevel&&
      (!memo.requiredDroverSkill||droverProof.skill===memo.requiredDroverSkill)&&
      e.memberIds.includes(proofActor),
      'Cestování se zvířaty nemá doložený Drover Test.');
     const ctx=createOrienteeringContext({night:memo.context.night,
      partySize:memo.context.memberIds.length,familiar:memo.context.familiar,
      torchlight:memo.context.night&&memo.context.torchlight,
      fullMoon:memo.context.night&&memo.context.fullMoon,
      afterSnowfall:memo.context.night&&memo.context.afterSnowfall,stationaryForaging:stationary,
      conveyance:e.conveyance,
      ...(memo.droverSkillId?{droverId:proofActor,animalsPresent:true}:{} )});
     must(JSON.stringify(adjustedOrienteeringSV({baseSV:sr.sv,context:ctx,
      droverResult:droverProof?{level:droverProof.level}:null}))===
      JSON.stringify(memo.adjustment),'Situační úprava Orienteering SV byla pozměněna.');
    }
   }
   if(key==='trackingMemory'&&memo.conditions){
    must(!(memo.conditions.continuousRain&&memo.conditions.continuousSnow)&&
     !(memo.conditions.twilight&&memo.conditions.night),'Tracking: neplatné podmínky');
    const expectedModifier=trackingModifiers(memo.conditions);
    const expectedTrackingScore=trackingOutcome(sr.sv+expectedModifier.delta,{criticalFailure:sr.level==='CF'});
    // Preserve pre-93.730 episode receipts with the historically excessive
    // Spoor calculation, but apply the printed 9+ = 5 cap to every new score.
    const oldSpoor=Number.isSafeInteger(memo.score?.spoorStars)&&memo.score.spoorStars>5&&
     expectedTrackingScore.adjustedSV>=10&&memo.score.spoorStars===expectedTrackingScore.adjustedSV-4;
    if(oldSpoor)expectedTrackingScore.spoorStars=expectedTrackingScore.adjustedSV-4;
    must(JSON.stringify(expectedModifier)===JSON.stringify(memo.modifier)&&
     JSON.stringify(expectedTrackingScore)===JSON.stringify(memo.score),
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
    night:e.encounter.night,d100:e.encounter.d100,d100Sub:e.encounter.d100Sub??null,lightMinutes:e.encounter.lightMinutes??null}),resolved:!!e.encounter.resolved};
   if(e.interruption?.kind==='encounter'){
    must(e.interruption.format==='hmk-episode-interruption-v1'&&
     e.interruption.atMinute===e.endMinute&&e.interruption.offsetMinutes===e.minutes&&
     e.interruption.remainingMinutes===e.encounter.originallyPlannedMinutes-e.minutes&&
     e.encounter.originallyPlannedMinutes>e.minutes&&
     e.encounter.stoppedAtMinute===e.minutes&&e.encounter.count===1&&e.encounter.found&&
     e.encounter.d100===e.interruption.originalEncounterRoll&&e.encounter.resolved===false&&
     e.encounter.otherPotentialEventsUncommitted===true,
     'Pozastavení nemá původní hod, okamžik nebo zachovaný zbývající čas.');
    const original=episodeEncounterByMinutes({minutes:e.encounter.originallyPlannedMinutes,
     environ:e.encounter.environ,night:e.encounter.night,d100:e.encounter.d100,d100Sub:e.encounter.d100Sub??null,
     lightMinutes:e.encounter.lightMinutes??null});
    must(original.count===e.encounter.originalEncounterCount&&original.found,
     'Pozastavené setkání neodpovídá původnímu doloženému d100.');
   }else must(JSON.stringify(expected)===JSON.stringify(e.encounter),
    'Minutové riziko setkání musí odpovídat doloženému d100, prostředí a délce epizody.');
  }
  if(e.survivalHazard!==undefined){
   const critical=(e.kind==='travel'||e.kind==='forage'&&e.stationaryForagingPolicy==='hmk-stationary-v93.835')&&
    e.orientation?.level==='CF'&&e.orientation?.sourceMode==='new';
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
    if(record?.externalToGM===true){
     must(record.i===i&&record.pending===false&&e.encounter.resolved===true&&
      ['adjudicated','no-further-action','reported-to-gm'].includes(record.disposition)&&
      Object.keys(record).every(k=>['i','externalToGM','pending','disposition'].includes(k)),
      'Encounter: GM musí potvrdit samostatné vyhodnocení bez automatického Combatu.');
     continue;
    }
    must(record.i===i&&whole(record.offset,0,e.interruption?.kind==='encounter'?e.minutes:e.minutes-1)&&record.pending===false,
     'Encounter: chybí skutečný čas výskytu nebo dokončení.');
    const d=record.distance;
    const distance=episodeEncounterDistance({terrain:d.terrain,d4:d.d4,period:d.period,
     moon:d.moon,hearingD10:d.hearingD10});
    must(JSON.stringify(distance)===JSON.stringify(d),'Encounter Distance nesouhlasí s d4, světlem nebo terénem.');
    if(e.daylight&&!(e.interruption?.kind==='encounter'&&record.offset===e.minutes)){const at=e.startMinute+record.offset;
     const segment=e.daylight.segments.find(x=>x.start<=at&&at<x.end);
     must(segment?.period===d.period,'Encounter použil špatné světlo pro čas události.');}
    if(e.interruption?.kind==='encounter'&&record.awaitingFollowup===true){
     // Surprise is resolved at the actual event time, never pre-rolled for a future minute.
     continue;
    }
    if(record.nonhostile){must(record.surprise===null,'Pokojné setkání nemá Surprise test.');continue;}
    const t=record.surprise;
    must(t?.verified&&t.decision,'Encounter Surprise není rozhodnuto.');
    const expected=episodeEncounterSurprise({partyModes:e.orientation?.modes||{},conveyance:e.conveyance,
     foeWatchfulness:t.foeWatchfulness,foeIsBeast:t.foeIsBeast,
     partySkill:t.partySkill,foeSkill:t.foeSkill,partyLevel:t.partyLevel,
     foeLevel:t.foeLevel,
     ...(t.partyEvidence?{partyRoll:t.partyEvidence.roll,partyEML:t.partyEvidence.eml}:{}),
     ...(t.foeEvidence?{foeRoll:t.foeEvidence.roll,foeEML:t.foeEvidence.eml}:{}),
     requireWitness:!!(t.partyEvidence||t.foeEvidence),decision:t.decision});
    must(JSON.stringify(expected)===JSON.stringify(t),'Surprise neodpovídá pravidlové tabulce.');
   }
   must(e.encounter.resolved===true||e.interruption?.kind==='encounter'&&e.encounter.resolved===false&&
    e.encounterDetails.length===1&&e.encounterDetails[0].awaitingFollowup===true,
    'Encounter má nevyřešené jednotlivé události.');
  }
  if(e.trackingFollowup){
   const t=e.trackingFollowup,m=e.trackingMemory;
   must(m&&t.adjustedSV===m.score.adjustedSV,'Tracking navazující test ztratil původní SV.');
   const originalV2Overcap=t.spoorStars>5&&t.adjustedSV>=10&&t.spoorStars===t.adjustedSV-4&&
    t.spoorSpent<=t.spoorStars&&t.trailCapacity===t.spoorStars-t.spoorSpent;
   const expected=episodeTrackingFollowup({adjustedSV:t.adjustedSV,criticalFailure:m.level==='CF',
    awarenessLevel:t.awarenessLevel,spoorSpent:originalV2Overcap?Math.min(t.spoorSpent,5):t.spoorSpent});
   if(originalV2Overcap){expected.spoorStars=t.adjustedSV-4;expected.spoorSpent=t.spoorSpent;
    expected.trailCapacity=expected.spoorStars-t.spoorSpent;}
   const skill=t.awarenessSkillId?journal.find(x=>x.id===t.awarenessSkillId):null;
   const aw=skill?episodeSkillProof(skill,'Awareness',m.trackerId||m.guideId,j.calendarCampaignId,e.startMinute):null;
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
     directionTurn:h.directionTurn,directionD10:h.directionD10??null,directionAwareness:h.directionAwareness,
     directionObservationDeferred:h.directionObservationDeferred===true});
    const linked=h.evidenceId?journal.find(k=>k.id===h.evidenceId&&
     k.calendarCampaignId===j.calendarCampaignId&&k.campaignMinute===e.startMinute):null;
    if(['v93.675','v93.773-end-of-episode'].includes(h.automationVersion)&&h.hazard==='accident'){
     must(h.externalMedicalPending===true&&h.requiresGMCompletion===false&&
      h.result==='pending-original-skill-combat'&&whole(h.hazardAtMinute,1,e.minutes)&&
      h.hazardAtMinute===e.minutes&&whole(h.hazardD10,4,6)&&e.endMinute===e.startMinute+e.minutes&&
      (h.automationVersion!=='v93.773-end-of-episode'||h.medicalHandoffMinute===e.endMinute)&&
      e.orientation?.level==='CF'&&e.survivalHazard==='accident'&&
      !h.accidentProof&&!h.injuryProofId&&!h.victimId,
      'Accident: činnost musí skončit v doložené minutě a předat zranění původnímu modulu.');
     continue;
    }
    if(h.automationVersion==='v93.635'||h.automationVersion==='v93.681'&&h.hazard==='complication'){
     must(h.requiresGMCompletion===false,'Automatizovaný hazard nesmí mít nedokončené následky.');
     if(h.hazard==='accident'){
      const a=h.accidentProof;
      const proof=journal.find(k=>k.characterId===a?.victimId&&
       k.calendarCampaignId===j.calendarCampaignId&&k.campaignMinute===e.startMinute&&
       k.skillTestProof?.type==='skill-physical-consequence'&&
       k.skillTestProof?.kind==='survival-accident'&&
       k.skillTestProof?.autoFromTimeEpisode===j.id);
      const report=proof?.skillTestProof?.report;
      must(a&&(e.memberIds.includes(a.victimId)||e.animals?.some(q=>q.id===a.victimId))&&report&&
       a.sl===report.sl&&a.eml===report.eml&&a.avoided===report.avoided&&
       a.impact===(report.impact??null)&&a.location===(report.location??null)&&
       a.armourValue===(report.armourValue??null)&&
       JSON.stringify(a.physicalDice)===JSON.stringify(report.physicalDice)&&
       h.injuryProofId==='skill-injury:survival-accident:'+report.sourceId&&
       h.victimId===a.victimId,'Accident nemá původní, jednoznačně zapsaný Injury/Combat důkaz.');
     }else{
      must(!x.requiresGMCompletion&&JSON.stringify(h.result)===JSON.stringify(x.result),
       'Hazard nesouhlasí s potvrzenými kostkami nebo výsledkem.');
      if(h.hazard==='equipment'&&h.equipmentDisposition==='repair'){
       const proof=journal.find(k=>k.id===h.repairProofId);
       must(episodeSkillProof(proof,h.repairSkill,proof?.characterId,j.calendarCampaignId,e.startMinute)?.level===h.repairLevel,
        'Oprava výstroje nemá pravý Skill Test.');
      }
      if(h.hazard==='complication'&&h.complicationDecision==='test'){
       if(Array.isArray(h.memberOutcomes)){
        must(h.memberOutcomes.length===e.memberIds.length&&h.memberOutcomes.every(m=>{
         const p=journal.find(k=>k.id===h.complicationProofIds?.[e.memberIds.indexOf(m.id)]);
         return e.memberIds.includes(m.id)&&
          episodeSkillProof(p,h.complicationSkill,m.id,j.calendarCampaignId,e.startMinute)?.level===m.level;
        }), 'Komplikace družiny nemá jednotlivé ověřené Skill Tests.');
       }else{
        const proof=journal.find(k=>k.id===h.complicationProofId);
        must(episodeSkillProof(proof,h.complicationSkill,proof?.characterId,j.calendarCampaignId,e.startMinute)?.level===h.complicationLevel,
         'Komplikace nemá skutečný Skill Test.');
       }
      }
      if(h.hazard==='misdirection'){
       if(h.directionObservationDeferred===true)must(h.directionAwareness===null&&!h.directionProofId&&
        h.result==='continue-misdirected',
        'Odložený Awareness nesmí obsahovat vymyšlený hod ani změnu směru.');
       else{
        const proof=journal.find(k=>k.id===h.directionProofId);
        must(episodeSkillProof(proof,'Awareness',proof?.characterId,j.calendarCampaignId,e.startMinute)?.level===h.directionAwareness,
         'Misdirection nesouhlasí se skutečným Awareness.');
       }
      }
     }
    }else{
     if(h.hazard==='accident'&&typeof x.result==='object'&&h.gmInjuryResolved&&linked){x.requiresGMCompletion=false;}
     must(!x.requiresGMCompletion&&JSON.stringify(h)===JSON.stringify({...x,
      evidenceId:linked?.id||null,gmInjuryResolved:!!h.gmInjuryResolved}),
      'Hazard nemá doložené nebo úplné vyhodnocení.');
    }
   }
  }
  const safeAtStart=e.weatherShelteredPCs??[];
  must(Array.isArray(safeAtStart)&&new Set(safeAtStart).size===safeAtStart.length&&
   (!safeAtStart.length||!['travel','tracking','watch','forage'].includes(e.kind))&&
   safeAtStart.every(id=>e.memberIds.includes(id)&&pcShelteredStayAt(journal,j.calendarCampaignId,id,e.startMinute)),
   'Zajištěný pobyt PC nemá doložený doklad v kalendáři nebo byl použit na venkovní činnost.');
  if(e.weatherExposure!==undefined){
   must(Array.isArray(e.weatherExposure)&&e.weatherExposure.length===(e.memberIds.length-safeAtStart.length)*(e.weatherHazards||[]).length,
    'Weather Hazard neobsahuje všechny skutečně vystavené postavy a podmínky.');
   const witnessedHazards=new Set();
   for(const w of e.weatherExposure){
    const receiptKey=w.id+':'+w.kind;
    must(!witnessedHazards.has(receiptKey),'Duplicitní Weather Hazard u stejné postavy a typu.');
    witnessedHazards.add(receiptKey);
    must(e.memberIds.includes(w.id)&&!safeAtStart.includes(w.id)&&e.weatherHazards.includes(w.kind)&&!w.pending,
     'Weather Hazard se vztahuje na cizí nebo bezpečně krytou postavu či nemá doložený hod.');
    const expected=episodeWeatherExposure({kind:w.kind,areaAV:w.areaAV,roll:w.roll,
     protection:w.protection,fireStrength:w.fireStrength,continuousSleet:w.continuousSleet,
     resting:w.resting,shade:w.shade,tropicalNative:w.tropicalNative,endLevel:w.endLevel});
    if(w.passiveResistance!==undefined){
     must(w.exposed===true&&w.proofId===null&&verifyPassiveWeatherResistance(w.passiveResistance)&&
      w.endLevel===w.passiveResistance.level,
      'Weather Hazard nemá platný pasivní zdravotní Endurance (Survival) hod.');
    }
    if(w.proofId!==undefined&&w.exposed&&!w.passiveResistance){
     const linked=journal.find(x=>x.id===w.proofId);
     must(!!linked&&(episodeSkillProof(linked,'Endurance',w.id,j.calendarCampaignId,e.startMinute)||
      episodeSkillProof(linked,'Survival',w.id,j.calendarCampaignId,e.startMinute))?.level===w.endLevel,
      'Weather Hazard nemá skutečný doložený Endurance/Survival test.');
    }
    // v93.774: cold protection is a documented part of every new weather
    // receipt, even when nothing was equipped. Historic receipts without the
    // field remain valid. Compare its attested item snapshots and exact AV;
    // never accept the object merely because it came from the UI.
    let protectionEvidence={};
    if(w.coldProtection!==undefined){
     const cp=w.coldProtection;
     must(w.kind==='cold'&&cp&&typeof cp==='object'&&!Array.isArray(cp)&&
      typeof cp.inventoryWitness==='string'&&typeof cp.automaticCloak==='boolean'&&
      (cp.gearSourceId===null||typeof cp.gearSourceId==='string')&&
      (cp.shelterSourceId===null||typeof cp.shelterSourceId==='string')&&
      (cp.gearName===null||typeof cp.gearName==='string')&&
      Object.keys(cp).sort().join('|')===
       'automaticCloak|gearName|gearSourceId|inventoryWitness|shelterSourceId',
      'Weather Cold: neplatný doklad ochrany proti chladu.');
     let gear=null,shelter=null;
     try{
      const pair=JSON.parse(cp.inventoryWitness);
      must(Array.isArray(pair)&&pair.length===2,'Cold inventář musí obsahovat dva zdroje.');
      [gear,shelter]=pair;
     }catch{throw Error('Weather Cold: poškozený doklad inventáře.');}
     const itemValid=item=>item&&typeof item==='object'&&!Array.isArray(item)&&
      item.characterId===w.id&&Number.isSafeInteger(item.quantity)&&item.quantity>0&&
      !['chest','stable'].includes(item.slot)&&item.destroyed!==true;
     const gearRule=gear&&coldCatalogRule(gear),shelterRule=shelter&&coldCatalogRule(shelter);
     must((gear===null&&(cp.gearSourceId===null&&cp.gearName===null&&!cp.automaticCloak)||
       itemValid(gear)&&gearRule&&gearRule.kind!=='shelter'&&cp.gearSourceId===gear.id&&
       cp.gearName===(gear.snapshot?.name??null)&&
       (!cp.automaticCloak||(gearRule.kind==='cloak'&&
        (gear.snapshot?.category==='armor'&&gear.slot==='worn'||
         gear.snapshot?.category==='other'&&gear.coldWorn===true))))&&
      (shelter===null&&(cp.shelterSourceId===null||cp.shelterSourceId==='Shallow cave · GM')||
       itemValid(shelter)&&shelterRule?.kind==='shelter'&&cp.shelterSourceId===shelter.id)&&
      w.protection===(gearRule?.av??0)+(cp.shelterSourceId==='Shallow cave · GM'?3:shelterRule?.av??0),
      'Weather Cold: doklad vybavení neodpovídá ochraně nebo postavě.');
     protectionEvidence={coldProtection:cp};
    }
    const newProof=w.proofId!==undefined;
    must(JSON.stringify(w)===JSON.stringify(newProof?{id:w.id,...expected,proofId:w.exposed?w.proofId:null,
     ...(w.passiveResistance?{passiveResistance:w.passiveResistance}:{}),
     ...protectionEvidence,coldCondition:w.kind==='cold'?w.coldCondition||'dry':null}:{id:w.id,...expected,...protectionEvidence})&&
     !['pending','pending-endurance'].includes(w.effect),'Pozměněný nebo neúplný Weather Hazard.');
   }
  }
  if(e.weatherAftercare!==undefined){
   must(e.weatherAftercare==='external-v93.676'&&e.weatherSkinDetails===undefined&&
    Array.isArray(e.weatherExposure),
    'Nový Weather Hazard musí být vyhodnocen výhradně mimo Cestování.');
   for(const w of e.weatherExposure.filter(w=>w.exposed)){
    must((typeof w.proofId==='string'&&!!w.proofId)||verifyPassiveWeatherResistance(w.passiveResistance),
     'Předání Weather Onset vyžaduje původní Endurance/Survival nebo skutečný pasivní zdravotní hod.');
   }
  }
  if(e.weatherSkinDetails!==undefined){
   must(Array.isArray(e.weatherSkinDetails),'Frostbite/Sunburn vyžaduje seznam doložených lokalit.');
   const required=e.weatherExposure?.filter(w=>w.effect==='cold-exposure-frostbite'||
    w.effect==='heat-exposure-HR4-sunburn')||[];
   must(e.weatherSkinDetails.length===required.length,'Každé skutečné kožní trauma musí mít úplnou Injury Sequence.');
   for(const skin of e.weatherSkinDetails){
    must(skin.pending===false&&skin.report?.rulePage===185&&
     required.some(w=>w.id===skin.id&&w.kind===skin.kind&&
      skin.sourceId===w.proofId+':episode:'+e.startMinute+':'+w.kind),
     'Kožní poranění nesouhlasí s expozicí a doloženým Skill Testem.');
    must(journal.some(k=>k.characterId===skin.id&&k.skillTestProof?.type==='episode-weather-skin'&&
     k.skillTestProof.sourceId===skin.sourceId&&
     k.skillTestProof.autoFromTimeEpisode===j.id&&
     JSON.stringify(k.skillTestProof.report)===JSON.stringify(skin.report)),
     'Kožní trauma nebylo ve zdravotním stavu skutečně zapsáno.');
   }
  }
  if(e.animalHealth!==undefined){
   // Older episodes had only animalIds (legacy veterinary actors). New
   // journeys select physical animals once via stableAnimalIds; when one
   // has a verified Combat State its health is ALSO mandatory evidence,
   // without adding a second animal membership or speculative fatigue.
   // Validate legacy prefix exactly and the optional stable-health suffix
   // against the same immutable Stable selection, never by animal name.
   const legacyAnimalIds=e.settings?.animalIds||[];
   const stableAnimalIds=e.settings?.stableAnimalIds||[];
   const healthIds=e.animalHealth.map(h=>h.actorId);
   must(e.kind==='travel'&&Array.isArray(e.animalHealth)&&
    (e.settings?.animalIds===undefined||Array.isArray(e.settings.animalIds))&&
    (e.settings.stableAnimalIds===undefined||Array.isArray(e.settings.stableAnimalIds))&&
    healthIds.length>=legacyAnimalIds.length&&
    legacyAnimalIds.every((id,i)=>healthIds[i]===id)&&
    healthIds.slice(legacyAnimalIds.length).every(id=>stableAnimalIds.includes(id))&&
    new Set([...legacyAnimalIds,...stableAnimalIds]).size===legacyAnimalIds.length+stableAnimalIds.length&&
    new Set(healthIds).size===healthIds.length,
    'Zdravotní snapshot zvířat neodpovídá jedinečnému výběru zvířat ze Stáje.');
   must(!e.animals?.length,'HMK p.145: nesmí vzniknout automatická zvířecí únava bez pravidla.');
   for(const h of e.animalHealth){
    validateTrekAnimalHealthProof(h,h.actorId);
    must(h.shock==='NONE'&&!h.comaActive&&!h.extendedShockActive&&!h.immobile&&h.fatigue<40,
     'Neschopné zvíře nesmí pokračovat v potvrzeném pochodu.');
   }
   // These two modes are OR-combinations with human mobility restrictions;
   // they are never two Slow Modes for one and the same condition.
   if(e.animalHealth.some(h=>h.fatigue>=20))must(e.slow>=1,'Cesta opomenula unavené zvíře.');
   if(e.animalHealth.some(h=>h.injured))must(e.slow>=1,'Cesta opomenula zraněné zvíře.');
  }
  if(e.minuteCarryRule==='fixed-point-240-v93.684'){
   for(const a of [...(e.actors||[]),...(e.animals||[]),...(e.weatherRestFatigue||[])]){
    must(a.carryIn===lastTimeEpisodeCarry(prior,j.calendarCampaignId,a.id)&&
     whole(a.carryOut,0,239),
     'Časová epizoda ztratila potvrzený zbytek minutové únavy postavy.');
   }
  }else must(e.minuteCarryRule===undefined,'Neznámý model minutové únavy.');
  if(e.weatherRestFatigue!==undefined){
   must(['rest','sleep','winded'].includes(e.kind)&&
    e.weatherRestFatigue.length===e.memberIds.length,
    'Klimatická únava při odpočinku má chybný seznam postav.');
   const day=e.daylight?.minutesByPeriod?
    e.daylight.minutesByPeriod.day+e.daylight.minutesByPeriod.twilight:
    e.settings?.lightPeriod==='night'?0:e.minutes;
   const units=episodeWeatherFatigueUnits({weather:e.weather,exposure:e.weatherExposure,
    minutes:e.minutes,dayMinutes:day,nightMinutes:e.minutes-day});
   for(const a of e.weatherRestFatigue){
    must(e.memberIds.includes(a.id)&&a.addedUnits===(units[a.id]||0)&&
     a.delta===Math.floor((a.carryIn+a.addedUnits)/240)&&
     a.carryOut===(a.carryIn+a.addedUnits)%240&&
     e.recovery?.some(x=>x.id===a.id&&x.weatherAdded===a.delta&&x.weatherCarry===a.carryOut),
     'Odpočinek nesouhlasí s minutovou klimatickou únavou.');
   }
  }
  if(e.weatherExposure!==undefined&&e.kind==='travel'&&e.actors?.some(a=>a.weatherFatigueUnits!==undefined)){
   const dayMinutes=e.daylight?.minutesByPeriod?
    e.daylight.minutesByPeriod.day+e.daylight.minutesByPeriod.twilight:
    e.settings?.lightPeriod==='night'?0:e.minutes;
   const units=episodeWeatherFatigueUnits({weather:e.weather,exposure:e.weatherExposure,
    minutes:e.minutes,dayMinutes,nightMinutes:e.minutes-dayMinutes});
   for(const a of e.actors){
    const expected=units[a.id]||0,activeMinutes=a.earlyIncapacity?.activeMovementMinutes??
     (e.movementMinutes??e.travelDelay?.movementMinutes??e.minutes),
     total=a.carryIn+(a.movementFatigueUnits??activeMinutes*a.rate)+expected;
    must(a.weatherFatigueUnits===expected&&a.delta===Math.floor(total/240)&&a.carryOut===total%240,
     'Minutová únava způsobená počasím neodpovídá doloženému Cold/Heat Hazard.');
   }
  }
  // New Double Time receipts are strictly backed by ONE independent END SR
  // for each real hour, not a reused watch-wide roll (HMK 150).
  // Keep older pre-93.663 receipts readable without inventing missing dice.
  if(e.kind==='travel'&&e.endSRMode==='hourly-verified-v93.663'){
   must(e.doubleTime===true,'Hourly END audit: pouze pro Double Time.');
   for(const a of e.actors||[]){
    if(a.endNotRequired){must(a.movementFatigueUnits===0&&a.hourlyEndSR===undefined,
     'Hourly END audit: po ztrátě schopnosti pohybu není další hod.');continue;}
    const active=a.earlyIncapacity?.activeMovementMinutes??e.movementMinutes??e.minutes;
    must(Array.isArray(a.hourlyEndSR)&&a.hourlyEndSR.length===Math.ceil(active/60)&&
     a.hourlyEndSR.every(r=>whole(r.roll,1,10)&&r.tn===Math.floor(a.endurance/2)+
      (['mount','wagon','cart'].includes(e.conveyance)&&!(e.walkingHandlerIds||[]).includes(a.id)?2:0)&&r.success===(r.roll<=r.tn)),
     'Hourly END audit: chybí samostatné a doložené hodinové hody.');
    const expected=a.hourlyEndSR.reduce((n,r,i)=>n+Math.min(60,Math.max(0,active-60*i))*4*
     Math.max(0,(e.conveyance==='foot'||(e.walkingHandlerIds||[]).includes(a.id)?10:5)-(r.success?5:0)),0)+
     active*(a.extraFatigue+a.duneFatigue);
    must(a.movementFatigueUnits===expected&&a.roll===a.hourlyEndSR[0]?.roll,
     'Hourly END audit: skutečná hodinová únava neodpovídá dokladům.');
   }
  }
  if(e.kind==='travel')for(const a of e.actors||[])if(a.earlyIncapacity){
   const med=a.earlyIncapacity,witness=e.timedMedical?.find(x=>x.actorId===a.id&&
    x.dueMinute===med.minute&&x.shockAfter===med.shock);
   const expectedMinutes=Math.min(e.movementMinutes,med.minute-e.startMinute);
   must(witness&&['INC','UNC','KIA'].includes(witness.shockAfter)&&
    med.activeMovementMinutes===expectedMinutes&&
    (expectedMinutes===0||a.sr!==null&&whole(a.roll,1,10))&&
    a.delta===Math.floor((a.carryIn+(a.movementFatigueUnits??expectedMinutes*a.rate)+(a.weatherFatigueUnits||0))/240)&&
    a.carryOut===(a.carryIn+(a.movementFatigueUnits??expectedMinutes*a.rate)+(a.weatherFatigueUnits||0))%240,
    'Částečná únava postavy před zdravotní neschopností nemá pravidlový doklad.');
  }
  if(e.kind==='travel')for(const a of e.actors||[])if(a.endNotRequired){
   if(a.endNotRequired.reason==='equipment-delay'){
    must(e.movementMinutes===0&&e.travelDelay?.applied===e.minutes&&
     a.roll===null&&a.sr===null&&a.movementFatigueUnits===0&&a.rate===0&&
     a.delta===Math.floor((a.carryIn+(a.weatherFatigueUnits||0))/240)&&
     a.carryOut===(a.carryIn+(a.weatherFatigueUnits||0))%240,
     'Při opravě výstroje bez chůze nesmí vzniknout fiktivní END hod ani únava z pohybu.');
    continue;
   }
   // A documented passive patient is not a newly incapacitated walker. The
   // original live health snapshot was witnessed at departure; no invented END
   // or timed-medical onset may be required for someone carried from minute 0.
   if(a.endNotRequired.reason==='transported'){
    const proof=e.transportProof,health=proof?.originalHealth?.find(x=>x.id===a.id);
    must(e.transportedMemberIds?.includes(a.id)&&['gm-transport-confirmation-v93.755','gm-transport-confirmation-v93.756','gm-transport-confirmation-v93.816'].includes(proof?.format)&&
     (proof.format!=='gm-transport-confirmation-v93.756'||
      proof.vehicle?.format==='hmk-confirmed-passenger-vehicle-93756')&&
     (proof.format!=='gm-transport-confirmation-v93.816'||
      proof.mount?.format==='hmk-gm-secured-mount-passenger-93816'&&
      proof.mount.patientId===a.id&&(proof.mount.handlerId?proof.mount.handlerId!==a.id:proof.mount.riderId!==a.id)&&
      proof.mount.gmConfirmed===true&&proof.mount.totalLb>=proof.mount.patientLb&&
      proof.mount.enc>=0&&Number.isFinite(proof.mount.moveAfterLoad))&&
     proof.gmConfirmed===true&&proof.conveyance===e.conveyance&&
     ['cart','wagon','mount'].includes(e.conveyance)&&Array.isArray(proof.memberIds)&&
     JSON.stringify([...proof.memberIds].sort())===JSON.stringify([...e.transportedMemberIds].sort())&&
     proof.originalHealth?.length===e.transportedMemberIds.length&&health&&
     (health.immobile===true||health.fatigue>=40||health.shock!=='NONE'||
      health.comaActive===true||health.extendedShockActive===true)&&
     a.endNotRequired.minute===e.startMinute&&a.endNotRequired.sourceKey==='gm-confirmed-transport-v93.755'&&
     a.roll===null&&a.sr===null&&a.rate===0&&a.movementFatigueUnits===0&&
     a.delta===Math.floor((a.carryIn+(a.weatherFatigueUnits||0))/240)&&
     a.carryOut===(a.carryIn+(a.weatherFatigueUnits||0))%240,
     'Přepravovaný pacient nemá správné potvrzení GM, původ zdravotního stavu nebo vynechaný END.');
    if(proof.format==='gm-transport-confirmation-v93.816'){
     const mount=proof.mount;
     const modern=mount?.handlerId&&['leading','mounted'].includes(mount.handlerPosition)&&
      mount.handlerId!==mount.patientId&&e.memberIds.includes(mount.handlerId)&&
      mount.handlerLb===(mount.handlerPosition==='leading'?0:proof.mass.people.find(p=>p.id===mount.handlerId)?.totalLb)&&
      mount.riderId===(mount.handlerPosition==='leading'?null:mount.handlerId)&&
      mount.totalLb===Math.round((mount.minimumLb+mount.patientLb+mount.handlerLb)*1000)/1000;
     const legacy=mount?.riderId&&mount.stableRiderProofId&&
      mount.totalLb===Math.round((mount.minimumLb+mount.patientLb)*1000)/1000&&mount.moveAfterLoad>=5;
     must(mount?.format==='hmk-gm-secured-mount-passenger-93816'&&mount.mountId&&
      (modern||legacy)&&mount.patientLb===proof.mass?.patientLoadLb?.[a.id]&&
      Number.isSafeInteger(mount.enc)&&Number.isFinite(mount.moveAfterLoad)&&
      mount.campaignId&&mount.minute===e.startMinute&&mount.gmConfirmed===true,
      'Převoz na koni: nesouhlasí účastníci nebo skutečná hmotnost.');
     validateTransportMassEvidence93816(proof.mass,e.memberIds,e.transportedMemberIds,
      {[a.id]:proof.mount.patientLb},proof.mass.otherLoadLb);
    }
    continue;
   }
   const witness=e.timedMedical?.find(x=>x.actorId===a.id&&
    x.dueMinute===a.endNotRequired.minute&&x.shockAfter===a.endNotRequired.shock);
   must(witness&&['INC','UNC','KIA'].includes(witness.shockAfter)&&
    a.roll===null&&a.sr===null&&a.rate===0&&
    a.carryOut===(a.carryIn+(a.weatherFatigueUnits||0))%240&&Number.isSafeInteger(a.endNotRequired.minute),
    'Vynechaný END d10 nemá doloženou neschopnost ze zdravotní kontroly.');
  }
  if(e.travelDelay!==undefined){
   must(e.kind==='travel','Zdržení lze přenášet jen mezi cestovními epizodami.');
   const d=e.travelDelay;
   const independent=d.method==='gm-complication-only-v93.695';
   const expected=episodeMinuteDelay({minutes:e.minutes,
    incoming:d.method==='gm-current-episode-only-v2'?0:independent?
     independentTravelDelayCarry(prior,j.calendarCampaignId,e.startMinute,travelScope):
     lastEpisodeTravelDelayCarry(prior,j.calendarCampaignId,e.startMinute),
    current:d.current,future:d.future,persistCarry:d.method!=='gm-current-episode-only-v2'});
   if(independent)expected.method='gm-complication-only-v93.695';
   must(JSON.stringify(expected)===JSON.stringify(d)&&
    (e.medicalTravelStop?e.movementMinutes<=d.movementMinutes:e.movementMinutes===d.movementMinutes),
    'Zdržení nebo přenesené minuty neodpovídají předchozí cestě.');
   if(e.medicalTravelStop){
    const stop=e.medicalTravelStop;
    must(e.incapacitationDecision==='stop'&&Number.isSafeInteger(stop.minute)&&
     stop.minute>=e.startMinute&&stop.minute<=e.endMinute&&
     Number.isSafeInteger(stop.movementMinutes)&&stop.movementMinutes===e.movementMinutes&&
     stop.movementMinutes>=0&&stop.movementMinutes<=stop.minute-e.startMinute&&
     e.timedMedical?.some(x=>x.dueMinute===stop.minute&&['INC','UNC','KIA'].includes(x.shockAfter)),
     'Zastavený pochod nemá doložený čas ani zdravotní příčinu.');
   }
   const hazard=e.hazardDetails?.find(h=>h.hazard==='equipment'||h.hazard==='complication');
   const outcome=hazard?.result;
   const currentComplication=hazard?.hazard==='complication'&&hazard.automationVersion==='v93.681';
   const mandatoryNext=(hazard?.hazard==='equipment'||currentComplication)&&['long-delay','irreparable'].includes(outcome);
   if(d.method!=='gm-current-episode-only-v2')must(d.future===((independent?(currentComplication&&['long-delay','irreparable'].includes(outcome)):mandatoryNext)?e.minutes:0)&&
    (d.current===0||!!hazard),
    'Zdržení v další hlídce nemá doložený Equipment Hazard nebo je jeho délka pozměněna.');
   if(e.equipmentSlowCarryOut!==undefined){
    const priorSlow=lastEquipmentSlowCarry(prior,j.calendarCampaignId,e.startMinute,travelScope);
    const repairS=e.hazardDetails?.find(h=>h.hazard==='equipment'&&h.result==='short-delay');
    const newSlow=repairS?.equipmentGMPolicy==='gm-controlled-v93.845'?0:
      repairS?.equipmentMinutePolicy===EQUIPMENT_TIME_POLICY_93844?240:
      e.hazardDetails?.some(h=>(h.hazard==='equipment'||h.hazard==='complication'&&h.automationVersion==='v93.681')&&h.result==='short-delay')?e.minutes:0;
    // Legacy receipts before v93.666 incorrectly consumed a Slow obligation
    // during an equipment repair with zero movement. Keep historical data
    // readable, but never issue (or accept as new) that calculation again.
    const movingCarry=Math.max(0,priorSlow-e.movementMinutes)+newSlow;
    const legacyCarry=Math.max(0,priorSlow-e.minutes)+newSlow;
    const verified=e.equipmentSlowCarryRule==='moving-minutes-v93.666';
    must(e.equipmentSlowCarryRule===undefined||verified,
     'Neznámá verze výpočtu Equipment Slow.');
    must(e.equipmentSlowCarryIn===priorSlow&&
     (e.equipmentSlowCarryOut===movingCarry||!verified&&e.equipmentSlowCarryOut===legacyCarry)&&
     e.slow===e.equipmentBaseSlow+Number(priorSlow>0)+Number(!!e.dunesSlow),
     'Equipment Hazard Slow se musí odečíst přesně jednou během skutečného pohybu; starší doklady zůstávají čitelné.');
   }
   if(currentComplication){
    if(['long-delay','irreparable'].includes(outcome)){
     must(whole(hazard.hazardAtMinute,1,e.minutes)&&d.current===e.minutes-hazard.hazardAtMinute&&
      d.future===e.minutes,'Complication F/CF: zdržení musí odpovídat minutě překážky a navazujícímu minutovému intervalu.');
    }else must(d.future===0,'Complication S/CS: nesmí se přidávat další časový interval jako zdržení.');
    if(outcome==='irreparable')must(hazard.routeChangeConfirmed===true,
      'Complication CF: chybí potvrzená změna trasy.');
   }else if(hazard?.hazard==='complication'&&['long-delay','irreparable'].includes(outcome)) {
    // Archived documents are not rewritten or reinterpreted.
    must(d.method==='gm-current-episode-only-v2'||d.current>0,
     'Starší dlouhá komplikace nemá doložené zdržení aktuální hlídky.');
   }
  }
  if(e.travelDelay&&Array.isArray(e.animals)){
   for(const a of e.animals){const units=a.carryIn+(e.movementMinutes??e.travelDelay.movementMinutes)*a.rate;
    must(a.delta===Math.floor(units/240)&&a.carryOut===units%240,
     'Únava zvířat nebyla přepočtena na skutečný čas pohybu.');
   }
  }
  if(e.distanceFractionIn!==undefined){
   must(e.kind==='travel'&&Math.abs(e.distanceFractionIn-lastTimeEpisodeDistanceFraction(prior,j.calendarCampaignId,e.startMinute,travelScope))<1e-7,
    'Ztracený nebo cizí zlomek cestovní vzdálenosti.');
   const meters=e.motion.finalLPW*4000*(e.movementMinutes??e.travelDelay?.movementMinutes??e.minutes)/240+e.distanceFractionIn;
   must(e.distanceMeters===Math.floor(meters+1e-10)&&Math.abs(e.distanceFractionOut-Math.max(0,meters-e.distanceMeters))<1e-7,
    'Minutové metry nebo přenesený zlomek neodpovídají rychlosti.');
  }
  if(e.navigationState!==undefined){
   must(['clear','lost','misdirection'].includes(e.navigationState),
    'Neplatná evidence orientace družiny.');
   // Preserve immutable pre-93.699 saves under their original validation
   // policy. New episodes use the party-scoped rule; never rewrite old dice
   // or historical episode records as part of an application upgrade.
   must(e.navigationPartyScope===undefined||e.navigationPartyScope==='v93.699',
    'Neznámý formát návaznosti navigace.');
   const earlier=lastEpisodeBefore(journal,j.calendarCampaignId,e.startMinute,
    e.navigationPartyScope==='v93.699'?e.memberIds:null);
   const recoveryRule=e.navigationRecoveryRule;
   must(recoveryRule===undefined||recoveryRule==='special-bearing-and-awareness-v93.780',
    'Neznámý formát pravidlového návratu na trasu.');
   const scopedEarlier=lastEpisodeBefore(prior,j.calendarCampaignId,e.startMinute,
    e.navigationPartyScope==='v93.699'?e.memberIds:null);
   if(recoveryRule){
    const hadLost=episodeNavigationState(scopedEarlier)==='lost';
    if(e.navigationRecovered&&episodeNavigationState(scopedEarlier)==='misdirection'){
     const proof=journal.find(x=>x.id===e.navigationRecoveryAwarenessProofId);
     const witnessed=episodeSkillProof(proof,'Awareness',e.orientation?.guideId,j.calendarCampaignId,e.startMinute);
     must(!!witnessed&&['S','CS'].includes(witnessed.level),
      'Misdirection: návrat na trasu bez skutečného úspěšného Awareness navigující postavy.');
    }else must(e.navigationRecoveryAwarenessProofId===null,
     'Misdirection: nadbytečný cizí doklad Awareness pro návrat.');
    if(e.navigationRecovered&&hadLost){
     const terrainBearing=trekMovement({topography:e.topography,terrain:e.terrain,
      conveyance:e.conveyance,progress:0,slow:0,bearing:0,loaded:false,progressD10:[],
      continuousPrecipitation:!!e.precipitation?.slowMode,
      bearingRule:e.trekTerrainPolicy93851==='hmk-v1.2-93851'?'hmk':'legacy'}).requiredBearing;
     const forced=pendingTrackingCFBearing(prior,j.calendarCampaignId,e.startMinute,e.memberIds);
     must(e.orientation?.modes?.bearing>=terrainBearing+forced+1,
      'Lost vyžaduje zvláštní Bearing z prokázaného Orienteering, nikoli jen rozhodnutí GM.');
    }
    const reoriented=(e.hazardDetails||[]).some(h=>h.hazard==='misdirection'&&
     h.result==='reoriented'&&h.directionAwareness&&['S','CS'].includes(h.directionAwareness));
    must(e.navigationReorientedInWatch===reoriented,'Misdirection: změna směru neodpovídá skutečnému Awareness.');
    if(reoriented){
     const witness=(e.hazardDetails||[]).find(h=>h.hazard==='misdirection'&&h.result==='reoriented');
     const proof=journal.find(x=>x.id===witness.directionProofId);
     must(!!episodeSkillProof(proof,'Awareness',e.orientation?.guideId,j.calendarCampaignId,e.startMinute),
      'Misdirection: úspěšný Awareness musí patřit navigující postavě.');
    }
   }
   must(e.navigationState===episodeNavigationState(earlier,e.direction,{recovered:!!e.navigationRecovered,
    redirected:recoveryRule?!!e.navigationReorientedInWatch:false,lostPriority:!!recoveryRule}),
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
  }else if(e.kind==='travel'&&e.orientation?.modes?.foraging>0){must(false,'Foraging při cestě není vyhodnocen.');}
  if(e.stationaryForagingPolicy==='hmk-stationary-v93.835'){
   must(e.kind==='forage'&&e.orientation?.stationaryForaging===true&&
    e.standaloneForaging.length===e.orientation.modes.foraging&&e.standaloneForaging.length<=5,
    'Nález při samostatném Foraging musí mít jeden d10 za každý získaný Foraging Mode.');
   const local=new Map();
   for(const f of e.standaloneForaging){
    const key=JSON.stringify([f.target,f.herbName||'']);
    const carryIn=local.has(key)?local.get(key):lastForagingCarry(prior,j.calendarCampaignId,j.characterId,f.target,f.herbName||'');
    const expected=calculateEpisodeForaging({minutes:e.minutes,habitat:f.habitat,season:f.season,
     roll:f.roll,target:f.target,herbName:f.herbName||'',carryIn});
    must(JSON.stringify(f)===JSON.stringify(expected),'Samostatný Foraging: změněný d10, cíl nebo přenos.');
    local.set(key,f.carryOut);
   }
   must(e.foraging===undefined||JSON.stringify(e.foraging)===JSON.stringify(e.standaloneForaging[0]),
    'Foraging: souhrnný nález neodpovídá doloženým hodům.');
  }
  if(e.foraging&&e.stationaryForagingPolicy!=='hmk-stationary-v93.835'){
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
 // Keep the existing legacy rules for disjoint chronological episodes;
 // a GM shared window is the only supported exception to time overlap.
 assertSharedEpisodeOverlaps93768([...byCampaign].flatMap(([campaignId,entries])=>
  entries.map(e=>({campaignId,startMinute:e.startMinute,endMinute:e.endMinute,
   memberIds:e.memberIds||[],animalIds:(e.animals||[]).map(x=>x.id),
   sharedWindowId:e.sharedWindowId||null}))));
 validateSharedTimeWindowJournal93767(journal);
 validateEquipmentTimeWork93844(journal);
 return true;
}

/** GM time-scaled Foraging (original printed table, new arbitrary-minute procedure).
 * One GM-declared roll per earned Foraging Mode; fractional yields carried in quantum units
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
  // Unfinished proportional search is not inventory. GM release ends the
  // abandoned activity; already gained supplies are separate receipts.
  if(row.calendarMemberRelease?.format==='hmk-calendar-member-release-v93.765'&&
     row.calendarMemberRelease.actorId===actorId&&row.calendarMemberRelease.gmConfirmed===true)
   break;
  for(const f of [...(p?.travelForaging||[]),...(p?.standaloneForaging||
    (p?.foraging?[p.foraging]:[]))].reverse())
   if(f.target===target&&f.herbName===(target==='herbs'?herbName.trim():null))return f.carryOut;
 }
 return {foodDays:0,waterDays:0,herbDoses:0};
}
