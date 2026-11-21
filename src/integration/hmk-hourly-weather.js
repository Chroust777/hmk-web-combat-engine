import {weatherAreaKey} from './hmk-trekking-weather-lifecycle.js';

const HOUR=60,DAY=1440;
const VEIL=['clear','broken','overcast'];
const WET=['rain','snow','sleet'];

function weatherNumber(key){
 let n=2166136261;
 for(const c of key)n=Math.imul(n^c.codePointAt(0),16777619);
 return (n^(n>>>16))>>>0;
}

// Stable presentation generated from the confirmed source. No additional dice,
// timestamps from the browser, or new inputs to HMK travel calculations.
function pattern(source,weather){
 const seed=[source,weather.temperatureD10,weather.precipitationD10].join(':');
 const wetHours=new Set();
 if(weather.hasPrecipitation){
  const wetness=Math.max(0,weather.precipitationTN-weather.precipitationRoll);
  const runs=3+Math.min(3,wetness);
  for(let i=0;i<runs;i++){
   const n=weatherNumber(seed+':front:'+i);
   const from=n%24;
   const length=1+(n>>>8)%Math.min(4,2+wetness);
   for(let hour=from;hour<Math.min(24,from+length);hour++)wetHours.add(hour);
  }
 }
 return Array.from({length:24},(_,hour)=>{
  const n=weatherNumber(seed+':clouds:'+Math.floor(hour/2));
  if(wetHours.has(hour))return 'wet';
  if(wetHours.has(hour-1)||wetHours.has(hour+1))return n%2?'broken':'overcast';
  return VEIL[n%VEIL.length];
 });
}

function wetKind(weather,period){
 const hazard=period==='night'?weather.nightHazard:weather.daylightHazard;
 return hazard==='cold'?(weather.precipitationRoll===weather.precipitationTN?'sleet':'snow'):'rain';
}

function mergeSegments(segments){
 const merged=[];
 for(const segment of segments){
  const last=merged.at(-1);
  if(last?.end===segment.start&&last.condition===segment.condition&&last.continuous===segment.continuous&&
   last.period===segment.period&&last.hazard===segment.hazard)last.end=segment.end;
  else merged.push({...segment});
 }
 return merged;
}

// A day is projected from the existing append-only records, including any
// GM changes or withdrawals. Confirmed continuous weather takes precedence
// only for the actual minutes of the episode that supplied it.
export function weatherDisplayDay(journal,campaignId,area,dayStart,light){
 const key=weatherAreaKey(area),dayIndex=dayStart/DAY,dayEnd=dayStart+DAY;
 const sources=[],continuous=[];
 let active=null,first=true;
 for(const row of journal){
  if(row.calendarCampaignId!==campaignId)continue;
  const daily=row.calendarTrekDayWeather,shift=row.calendarTrekWeatherShift,withdraw=row.calendarTrekWeatherVoid;
  if(daily?.dayIndex===dayIndex&&weatherAreaKey(daily.area)===key){
   active=row.id;
   sources.push({from:first?dayStart:row.campaignMinute,id:row.id,weather:daily.weatherDay});
   first=false;
  }else if(active&&withdraw?.sourceId===active){
   sources.push({from:row.campaignMinute});
   active=null;
  }else if(active&&shift?.sourceId===active&&shift.dayIndex===dayIndex){
   sources.push({from:row.campaignMinute,id:row.id,weather:shift.weatherDay});
  }
  const trip=row.calendarTimeEpisode;
  if(trip?.precipitation?.continuous&&trip.startMinute<dayEnd&&trip.endMinute>dayStart&&weatherAreaKey(trip.area)===key){
   continuous.push(trip);
  }
 }
 return displaySegments(dayStart,dayEnd,light,sources,continuous);
}

function displaySegments(start,end,light,sources,continuous){
 const dayStart=Math.floor(start/DAY)*DAY;
 const boundaries=new Set([start,end]);
 const add=minute=>{if(minute>start&&minute<end)boundaries.add(minute);};
 for(let minute=dayStart+HOUR;minute<end;minute+=HOUR)add(minute);
 for(const segment of light)add(segment.start);
 for(const source of sources)add(source.from);
 for(const trip of continuous){add(trip.startMinute);add(trip.endMinute);}
 const points=[...boundaries].sort((a,b)=>a-b);
 const profiles=new Map(sources.filter(x=>x.weather).map(x=>[x,pattern(x.id,x.weather)]));
 return points.slice(0,-1).map((minute,i)=>{
  const source=sources.findLast(x=>x.from<=minute),weather=source?.weather;
  const period=light.find(x=>x.start<=minute&&minute<x.end)?.period??null;
  const hazard=(period==='night'?weather?.nightHazard:weather?.daylightHazard)??null;
  const hour=Math.floor((minute-dayStart)/HOUR);
  const confirmed=continuous.some(trip=>(trip.weatherDailySourceId??trip.weatherSourceId)===source?.id&&
   trip.startMinute<=minute&&minute<trip.endMinute);
  const sky=profiles.get(source)?.[hour];
  return {start:minute,end:points[i+1],period,hazard,
   condition:weather&&(confirmed||sky==='wet')?wetKind(weather,period):sky??'unknown',continuous:confirmed&&!!weather};
 });
}

export function travelWeatherDisplay(journal,campaignId,episode){
 if(episode.kind!=='travel'||!episode.weather||!episode.weatherDailySourceId)return [];
 const {startMinute:start,endMinute:end,weather}=episode;
 const source=journal.find(row=>row.calendarCampaignId===campaignId&&row.id===episode.weatherDailySourceId);
 const localLight=episode.daylight?.segments??[{start,end,period:episode.settings?.lightPeriod??'day'}];
 const matched=journal.filter(row=>row.calendarCampaignId===campaignId&&row.calendarTimeEpisode?.area&&
  weatherAreaKey(row.calendarTimeEpisode.area)===weatherAreaKey(episode.area)&&
  row.calendarTimeEpisode?.precipitation?.continuous&&row.calendarTimeEpisode.startMinute<end&&row.calendarTimeEpisode.endMinute>start)
  .map(row=>row.calendarTimeEpisode);
 if(episode.precipitation?.continuous)matched.push(episode);
 const sharedWeather=source?.calendarTrekDayWeather?.weatherDay??source?.calendarTrekWeatherShift?.weatherDay??weather;
 const rows=displaySegments(start,end,localLight,[{from:start,id:episode.weatherDailySourceId,weather:sharedWeather}],matched);
 return mergeSegments(rows.map(segment=>{
  const hazard=(segment.period==='night'?weather.nightHazard:weather.daylightHazard)??null;
  const wet=WET.includes(segment.condition);
  const condition=wet?(weather.hasPrecipitation?wetKind(weather,segment.period):'overcast'):segment.condition;
  return {...segment,hazard,condition,continuous:segment.continuous&&weather.hasPrecipitation};
 }));
}

export function hourlyWeatherLabels({condition,continuous}){
 const labels={
  clear:['Jasno','bez srážek','☀️'],broken:['Polojasno','bez srážek','🌤️'],overcast:['Zataženo','bez srážek','☁️'],
  rain:['Deštivo',continuous?'souvislý déšť':'déšť','🌧️'],
  snow:['Sněží',continuous?'souvislé sněžení':'sněžení','🌨️'],
  sleet:['Déšť se sněhem',continuous?'souvislá plískanice':'plískanice','🌨️'],
  unknown:['Počasí nedoloženo','—','']
 };
 return labels[condition]??labels.unknown;
}

export function travelHourlyWeatherProse(segments){
 return mergeSegments(segments.map(row=>({...row,period:null,hazard:null}))).map((row,i,rows)=>{
  const first={
   clear:'Obloha je čistá.',broken:'Mezi oblaky prosvítá jasná obloha.',overcast:'Nad krajem leží souvislá vrstva mraků.',
   rain:row.continuous?'Po celou tu dobu prší.':'Cestu skrápí déšť.',
   snow:row.continuous?'Sníh padá bez ustání.':'Z nebe se snášejí vločky.',
   sleet:row.continuous?'Plískanice neustává.':'Do deště se mísí mokré vločky.'
  };
  if(i===0)return first[row.condition];
  if(rows[i-1].condition===row.condition)return '';
  if(WET.includes(rows[i-1].condition)&&VEIL.includes(row.condition))
   return {clear:'Srážky ustanou a obloha se vyjasní.',broken:'Srážky ustanou a mezi mraky se znovu ukáže obloha.',
    overcast:'Srážky ustanou, ale mraky se ještě drží.'}[row.condition];
  const later={
   clear:'Později se nebe vyjasní.',broken:'Oblaka se pak místy protrhají.',overcast:'Za cesty se obloha zatáhne.',
   rain:'Po chvíli se dá do deště.',snow:'Později začne sněžit.',sleet:'Pak se spustí plískanice.'
  };
  return later[row.condition];
 }).filter(Boolean).join(' ');
}
