/** Detailed GM minute-episode follow-ups. HMK 1.2 pp.142,147–150.
 * Pure/append-only data. Never fabricates a Skill Test, injury or weather roll.
 */
import {trekWatchfulness,trekSurpriseProcedure} from './hmk-trekking-wilderness-tasks.js';
const requireTrue=(v,message)=>{if(!v)throw Error(message)};
const die=(n,s)=>Number.isSafeInteger(n)&&n>=1&&n<=s;
const levels=['CF','F','S','CS'];
export const EPISODE_DAYLIGHT_HOURS={polar:{winter:6,spring:12,autumn:12,summer:18},
 high:{winter:8,spring:12,autumn:12,summer:16},mid:{winter:10,spring:12,autumn:12,summer:14},
 low:{winter:12,spring:12,autumn:12,summer:12}};
/** HMK p.142 provides durations, NOT geographical sunrise time or twilight duration.
 * Both boundaries must be certified by GM when automatic segmentation is used. */
export function episodeLightIntervals({startMinute,minutes,latitudeBand,season,sunriseMinute,twilightMinutes=0}={}){
 const hours=EPISODE_DAYLIGHT_HOURS[latitudeBand]?.[season];
 requireTrue(hours&&Number.isSafeInteger(startMinute)&&startMinute>=0&&Number.isSafeInteger(minutes)&&minutes>0&&
  minutes<=10080&&Number.isSafeInteger(sunriseMinute)&&sunriseMinute>=0&&sunriseMinute<1440&&
  Number.isSafeInteger(twilightMinutes)&&twilightMinutes>=0&&twilightMinutes<=180,
  'Světlo vyžaduje doloženou šířku, období, čas východu slunce a délku soumraku GM.');
 const dayLength=hours*60;
 let cursor=startMinute,segments=[];
 while(cursor<startMinute+minutes){
  const dayStart=Math.floor(cursor/1440)*1440;
  const sunrise=dayStart+sunriseMinute;
  const sunset=sunrise+dayLength;
  const breaks=[sunrise-twilightMinutes,sunrise,sunset,sunset+twilightMinutes,
   sunrise-twilightMinutes-1440,sunrise-1440,sunset-1440,sunset+twilightMinutes-1440,
   sunrise-twilightMinutes+1440,sunrise+1440,sunset+1440,sunset+twilightMinutes+1440,
   dayStart+1440,startMinute+minutes].filter(x=>x>cursor).sort((a,b)=>a-b);
  const finish=Math.min(startMinute+minutes,breaks[0]);
  const centre=(cursor+finish)/2;
  // Compare against the local sunrise/sunset from this or an adjacent day.
  let period='night';
  for(const shift of [-1440,0,1440]){
   const rise=sunrise+shift,set=sunset+shift;
   if(centre>=rise&&centre<set){period='day';break;}
   if(twilightMinutes&&(centre>=rise-twilightMinutes&&centre<rise||centre>=set&&centre<set+twilightMinutes))period='twilight';
  }
  if(segments.length&&segments.at(-1).period===period&&segments.at(-1).end===cursor)segments.at(-1).end=finish;
  else segments.push({start:cursor,end:finish,period});
  cursor=finish;
 }
 return {format:'hmk-episode-light-intervals-v1',sourcePage:142,latitudeBand,season,sunriseMinute,
  twilightMinutes,daylightHours:hours,segments,minutesByPeriod:{day:segments.filter(s=>s.period==='day').reduce((a,s)=>a+s.end-s.start,0),
   twilight:segments.filter(s=>s.period==='twilight').reduce((a,s)=>a+s.end-s.start,0),
   night:segments.filter(s=>s.period==='night').reduce((a,s)=>a+s.end-s.start,0)}};
}
export const EPISODE_DISTANCE_FT=Object.freeze({'alpine-vegetation':200,'cropland-grassland':250,
 'cropland-pasture':250,'dunes':100,'grassland':250,'heath-moor':250,
 'ice-snow-rockfield':300,'mixed-forest':50,'mixed-woodland':100,'cold-woodland':100,
 'needleleaf-forest':100,'wetlands':150});
export function episodeEncounterDistance({terrain,d4,period='day',moon='dark',hearingD10=null}={}){
 const base=EPISODE_DISTANCE_FT[terrain];
 requireTrue(base&&die(d4,4)&&['day','twilight','night'].includes(period)&&
  ['bright','quarter','dark'].includes(moon),'Encounter Distance: zadejte terén, skutečný d4 a světlo (HMK 150).');
 const ratio=period==='day'?1:period==='twilight'?1/2:moon==='bright'?1/4:moon==='quarter'?1/10:1/20;
 const sightingFeet=base*d4*ratio;
 const forest=['mixed-forest','mixed-woodland','cold-woodland','needleleaf-forest'].includes(terrain);
 requireTrue(forest?(hearingD10===null||die(hearingD10,10)):hearingD10===null,
  'Hearing d10 platí pouze v lese nebo lesnaté krajině.');
 return {format:'hmk-episode-encounter-distance-v1',terrain,d4,period,moon,
  sightingFeet,hearingD10,hearingFeet:hearingD10===null?null:sightingFeet*hearingD10,sourcePage:150};
}
/** GM enters witnessed Skill Test success LEVELS only; this does not invent them. */
export function episodeEncounterSurprise({partyModes={},conveyance='foot',foeWatchfulness='normal',
 foeIsBeast=false,partySkill=null,foeSkill=null,partyLevel=null,foeLevel=null,decision=null}={}){
 requireTrue(['lax','normal','alert'].includes(foeWatchfulness),'Zvolte skutečnou bdělost protistrany.');
 const party=trekWatchfulness({modes:partyModes,conveyance});
 const other=foeIsBeast?'alert':foeWatchfulness;
 const procedure=trekSurpriseProcedure({party,foe:other});
 const validSkill=s=>s===null||['Awareness','Stealth'].includes(s);
 requireTrue(validSkill(partySkill)&&validSkill(foeSkill),'Surprise: neznámá dovednost.');
 if(partySkill!==null)requireTrue(procedure.partySkills.includes(partySkill),'Surprise: nesprávná dovednost družiny.');
 if(foeSkill!==null)requireTrue(other==='alert'||foeSkill==='Awareness',
  'Normal a Lax protivník používá Awareness, nikoliv Stealth.');
 let winner=procedure.automaticWinner,verified=false;
 if(procedure.kind==='automatic')verified=true;
 else if(procedure.kind==='unopposed'){
  const actual=procedure.preferred==='party'?partyLevel:foeLevel;
  requireTrue(actual===null||levels.includes(actual),'Surprise: neplatná úroveň testu.');
  if(actual!==null){winner=levels.indexOf(actual)>=2?procedure.preferred:null;verified=true;}
 }else{
  requireTrue((partyLevel===null||levels.includes(partyLevel))&&(foeLevel===null||levels.includes(foeLevel)),
   'Surprise: neplatná úroveň opposed testu.');
  if(partyLevel!==null&&foeLevel!==null){
   const p=levels.indexOf(partyLevel),f=levels.indexOf(foeLevel);
   winner=p>f?'party':f>p?'foe':null;verified=true;
  }
 }
 requireTrue(decision===null||['ambush','parlay','observe','leave'].includes(decision),
  'Surprise: GM musí zvolit skutečné rozhodnutí.');
 const alertness=winner==='party'?other==='lax'?'foe-unaware':'foe-confused':
  winner==='foe'?(party.effective==='lax'?'party-unaware':'party-confused'):
  !verified?'pending':procedure.kind==='opposed'&&partyLevel!=='F'&&partyLevel!=='CF'?'both-aware':'both-confused';
 return {format:'hmk-episode-encounter-surprise-v1',party,foeWatchfulness:other,
  foeIsBeast,procedure:procedure.kind,preferred:procedure.preferred,
  partySkill,foeSkill,partyLevel,foeLevel,winner,verified,decision,alertness,sourcePage:150};
}
export function episodeHazardFollowup({hazard,repairSkill=null,repairLevel=null,
 equipmentDisposition='repair',complicationDecision='test',
 accidentAgility=null,accidentD6=null,accidentZD10=null,complicationSkill=null,complicationLevel=null,
 directionTurn=null,directionD10=null,directionAwareness=null}={}){
 requireTrue(['equipment','accident','complication','misdirection','lost','lost-time'].includes(hazard),
  'Nesprávný druh hazardu.');
 requireTrue(['repair','ignore','abandon'].includes(equipmentDisposition)&&
  ['test','reroute'].includes(complicationDecision),'Hazard: neplatné rozhodnutí GM.');
 const outcomes={CF:'irreparable',F:'long-delay',S:'short-delay',CS:'no-delay'};
 let result='pending';
 if(hazard==='equipment'){
  requireTrue(repairSkill===null||['Hideworking','Metalcraft','Textilecraft','Woodworking'].includes(repairSkill),
   'Výstroj: zvolte opravářskou dovednost z HMK 148.');
  requireTrue(repairLevel===null||levels.includes(repairLevel),'Výstroj: doložte skutečnou úroveň testu.');
  result=equipmentDisposition==='ignore'?'ignored':equipmentDisposition==='abandon'?'abandoned':
   repairLevel===null?'pending':outcomes[repairLevel];
 }
 if(hazard==='accident'){
  requireTrue(accidentAgility===null||levels.includes(accidentAgility),'Nehoda: chybí platný Agility test.');
  if(accidentAgility==='CF'||accidentAgility==='F'){
   requireTrue((accidentD6===null&&accidentZD10===null)||(die(accidentD6,6)&&die(accidentZD10,10)),
    'Nehoda: musí být doloženy skutečné d6 Impact a d10 ZD.');
   result=accidentD6===null?'pending-injury':{impact:accidentD6+4+(accidentAgility==='CF'?5:0),
    aspect:'b',zd:accidentZD10,requiresInjurySequence:true};
  }else result=accidentAgility===null?'pending':'avoided';
 }
 if(hazard==='complication'){
  requireTrue(complicationSkill===null||['Agility','Animalcraft','Climbing','Timbercraft','Swimming'].includes(complicationSkill),
   'Komplikace: vyberte pravidlovou dovednost.');
  requireTrue(complicationLevel===null||levels.includes(complicationLevel),'Komplikace: nesprávná úroveň testu.');
  result=complicationDecision==='reroute'?'reroute':complicationLevel===null?'pending':outcomes[complicationLevel];
 }
 if(hazard==='misdirection'||hazard==='lost'){
  requireTrue(directionD10===null||die(directionD10,10),'Směr: skutečný d10 musí být 1–10.');
  requireTrue(directionTurn===null||['left','right'].includes(directionTurn),'Směr: doložte vlevo/vpravo.');
  requireTrue(directionD10===null||directionTurn===(directionD10%2?'left':'right'),'Směr: odchýlení neodpovídá lichému/sudému d10.');
  requireTrue(directionAwareness===null||levels.includes(directionAwareness),'Směr: nesprávný Awareness výsledek.');
  result=directionTurn===null?'pending-direction':hazard==='lost'?'requires-special-bearing':
   directionAwareness===null?'pending-awareness':levels.indexOf(directionAwareness)>=2?'reoriented':'continue-misdirected';
 }
 if(hazard==='lost-time')result='extra-slow-current-episode';
 return {format:'hmk-episode-hazard-followup-v1',hazard,repairSkill,repairLevel,equipmentDisposition,complicationDecision,accidentAgility,
  accidentD6,accidentZD10,complicationSkill,complicationLevel,directionTurn,directionD10,directionAwareness,
  result,requiresGMCompletion:result==='pending'||result==='pending-injury'||result==='pending-direction'||
   result==='pending-awareness'||(typeof result==='object'&&result.requiresInjurySequence),sourcePages:[148,149]};
}
export function episodeTrackingFollowup({adjustedSV,criticalFailure=false,awarenessLevel=null,spoorSpent=0}={}){
 requireTrue(Number.isInteger(adjustedSV)&&typeof criticalFailure==='boolean'&&
  (awarenessLevel===null||levels.includes(awarenessLevel))&&Number.isInteger(spoorSpent)&&spoorSpent>=0,
  'Tracking vyžaduje doložený SV, Awareness a příděl Spoor.');
 const stars=Math.max(0,adjustedSV-4),needsAwareness=adjustedSV>=3&&adjustedSV<=4;
 requireTrue(spoorSpent<=stars,'Spoor nesmí převýšit získané hvězdy.');
 return {format:'hmk-episode-tracking-followup-v1',adjustedSV,criticalFailure,
  awarenessLevel,needsAwareness,spoorStars:stars,spoorSpent,
  trailCapacity:stars-spoorSpent,
  hasOneSpoor:needsAwareness&&['S','CS'].includes(awarenessLevel),
  forcedBearingNextEpisode:criticalFailure,sourcePage:147};
}
/** Printed p.149 Cold/Heat Hazard Rolls; the GM supplies actual Area AV,
 * protective shelter and genuine dice. Exposure must be committed in the
 * existing Health/Trauma system; an episode receipt cannot mutate injuries. */
export function episodeWeatherExposure({kind,areaAV,roll,protection=0,fireStrength=0,
 continuousSleet=false,resting=false,shade=false,tropicalNative=false,endLevel=null}={}){
 requireTrue(['cold','heat'].includes(kind)&&Number.isInteger(areaAV)&&areaAV>=0&&areaAV<=20&&
  Number.isInteger(protection)&&protection>=0&&protection<=5&&
  Number.isInteger(fireStrength)&&fireStrength>=0&&fireStrength<=10&&
  ['CF','F','S','CS',null].includes(endLevel),'Weather Hazard: doložte AV, ochranu a END (Survival) test.');
 let faces,tn,trigger;
 if(kind==='cold'){
  faces=continuousSleet?10:6;
  tn=Math.min(areaAV,4)+protection+fireStrength;
  trigger=(n)=>n>tn;
 }else{
  faces=shade?10:resting?6:4;
  if(tropicalNative)faces={4:6,6:8,10:12}[faces];
  tn=Math.max(1,areaAV);
  trigger=(n)=>n<=tn;
 }
 requireTrue(roll===null||die(roll,faces),'Weather Hazard: skutečný hod neodpovídá velikosti kostky.');
 const exposed=roll===null?null:trigger(roll);
 const effects={cold:{CF:'cold-exposure-frostbite',F:'cold-exposure',S:'fatigue-5',CS:'none'},
  heat:{CF:'heat-exposure-HR4-sunburn',F:'heat-exposure-HR5',S:'fatigue-10',CS:'fatigue-5'}};
 return {format:'hmk-episode-weather-exposure-v1',kind,areaAV,protection,fireStrength,
  continuousSleet,resting,shade,tropicalNative,faces,tn,roll,exposed,
  endLevel,effect:exposed===null?'pending':!exposed?'none':endLevel===null?'pending-endurance':effects[kind][endLevel],
  sourcePage:149};
}

/** Minutová domácí adaptace HMK p.149: fatigue-5/10 applies only while the
 * corresponding Cold/Heat hazard is actually present. Units are reference-rate minute units
 * of four-hour reference accrual and are added to the character carry ledger;
 * no artificial watch boundary or second END roll is created. */
export function episodeWeatherFatigueUnits({weather,exposure=[],minutes,dayMinutes,nightMinutes}={}){
 requireTrue(weather?.format==='hmk-trekking-weather-day-v1'&&Number.isSafeInteger(minutes)&&minutes>0&&
   Number.isSafeInteger(dayMinutes)&&Number.isSafeInteger(nightMinutes)&&dayMinutes>=0&&nightMinutes>=0&&dayMinutes+nightMinutes===minutes,
   'Weather fatigue vyžaduje doložené počasí a skutečné minuty den/noc.');
 const out={};
 for(const item of exposure){
  requireTrue(typeof item.id==='string'&&['cold','heat'].includes(item.kind),'Weather fatigue: neplatná postava či hazard.');
  const points=item.effect==='fatigue-5'?5:item.effect==='fatigue-10'?10:0;
  const affected=(weather.daylightHazard===item.kind?dayMinutes:0)+(weather.nightHazard===item.kind?nightMinutes:0);
  out[item.id]=(out[item.id]||0)+points*affected;
 }
 return out;
}
