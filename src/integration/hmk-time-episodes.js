/** HMK Keeper's Ledger – GM-timed episodes.
 * Explicit house-rule mode: time is divided into freely chosen episodes,
 * not compulsory four-hour watches. Printed LPW remains the source speed.
 * All receipts are append-only and never substitute for genuine Skill Tests.
 */
import {trekMovement,trekWeatherDay,trekWeatherWatch,trekHazards} from './hmk-trekking-routine.js';
import {expeditionSecondaryRoll} from './hmk-calendar-expedition.js';
export const EPISODE_FORMAT='hmk-gm-time-episode-v1';
const must=(x,s)=>{if(!x)throw Error(s)};
const whole=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
export const EPISODE_KINDS=['travel','rest','sleep','winded','forage','tracking','watch','other'];
export function calculateTimeEpisode({minute,minutes,kind='travel',topography='flat',terrain='paved-road',conveyance='foot',
 progress=0,bearing=0,extraSlow=0,wearied=false,injured=false,loaded=false,continuousPrecipitation=false,progressD10=[],directionD10=[],
 enduranceByActor={},endRollByActor={},memberIds=[],weather=null,encounterRoll=null,encounterEnviron='rural',
 encounterResolved=false,previousCarry={},mapScale=25000,forcedWeatherRoll=false}={}){
 must(whole(minute,0,1e9)&&whole(minutes,1,10080)&&minute+minutes<=1e9,'Epizoda potřebuje 1–10 080 skutečných minut.');
 must(EPISODE_KINDS.includes(kind),'Neznámý druh epizody');
 must(Array.isArray(memberIds)&&memberIds.length>0&&new Set(memberIds).size===memberIds.length,'Vyberte jedinečné účastníky');
 must(whole(mapScale,100,10000000),'Neplatné měřítko mapy');
 const slow=extraSlow+Number(wearied)+Number(injured)+Number(continuousPrecipitation);
 must(whole(extraSlow,0,20)&&whole(progress,0,10)&&whole(bearing,0,20),'Neplatné pohybové režimy');
 let motion=null,distanceMeters=0,actors=[],direction=null;
 if(kind==='travel'){
  // HMK printed rate is leagues per four-hour WATCH.  A freely timed GM episode
  // uses that rate as a speed; no fictional hour-based dice are rolled.
  motion=trekMovement({topography,terrain,conveyance,progress,slow,loaded,bearing,progressD10,
   continuousPrecipitation,doubleTime:false,hours:4});
  must(Array.isArray(directionD10)&&directionD10.length===motion.bearingDeficit&&directionD10.every(x=>whole(x,1,10)),
   'Chybí '+motion.bearingDeficit+' platný Direction Hazard d10 (HMK 148).');
  if(motion.bearingDeficit){
   direction={...trekHazards({bearingDeficit:motion.bearingDeficit,directionD10}),rolls:[...directionD10]};
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
 const target={highway:2,rural:4,wilderness:1,underworld:9}[encounterEnviron];
 must(target!==undefined,'Neznámé prostředí setkání');
 if(encounterRoll!==null){must(whole(encounterRoll,1,10),'Encounter vyžaduje skutečný hod d10');}
 const encounter=encounterRoll===null?null:{roll:encounterRoll,tn:target,found:encounterRoll<=target,
  resolved:!!encounterResolved};
 return {format:EPISODE_FORMAT,startMinute:minute,endMinute:minute+minutes,minutes,kind,
  memberIds:[...memberIds],terrain,topography,conveyance,motion,
  distanceMeters,distanceKilometres:distanceMeters/1000,
  mapCentimetres:Math.round(distanceMeters*100000/mapScale)/1000,
  actors,encounter,direction,weather,slow,progress,bearing,loaded,
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
export function validateTimeEpisodes(journal=[]){
 const byCampaign=new Map(),prior=[];
 for(const j of journal){const e=j.calendarTimeEpisode;if(!e)continue;
  must(e.format===EPISODE_FORMAT&&whole(e.startMinute,0,1e9)&&whole(e.minutes,1,10080)&&
   e.endMinute===e.startMinute+e.minutes&&e.startMinute===j.campaignMinute&&
   typeof j.calendarCampaignId==='string'&&Array.isArray(e.memberIds),'Neplatná herní epizoda');
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
