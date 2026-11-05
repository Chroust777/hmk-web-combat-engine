/** HMK pp.142,144. Calendar-aware forecast boundaries for an arbitrary
 * real-minute interval. No roll or in-game time is generated here. Weather
 * is only drawn from independently witnessed daily d10 pairs. */
import {campaignTRDate} from './hmk-calendar-planner.js';
import {episodeLightIntervals,EPISODE_DAYLIGHT_HOURS} from './hmk-episode-travel-detail.js';
import {trekkingDaylightSeason} from './hmk-episode-weather-timeline.js';
import {trekSeasonFromMonth} from './hmk-trekking-routine.js';
const valid=(x)=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
export function calendarTravelWeatherSegments({clock,startMinute,minutes,latitudeBand='mid',
  dayWeather={},fallbackSeason=null,twilightMinutes=60}={}){
 if(!clock||!valid(startMinute)||!Number.isSafeInteger(minutes)||minutes<1||minutes>10080||
  !EPISODE_DAYLIGHT_HOURS[latitudeBand]||!Number.isSafeInteger(twilightMinutes)||twilightMinutes<0||twilightMinutes>180)
  throw Error('Kalendářní počasí vyžaduje skutečný čas, šířku a délku činnosti.');
 const rows=[];let cursor=startMinute;
 while(cursor<startMinute+minutes){
  const dayIndex=Math.floor(cursor/1440),dayStart=dayIndex*1440,end=Math.min((dayIndex+1)*1440,startMinute+minutes);
  const tr=campaignTRDate(clock,dayStart);
  const lightSeason=tr?trekkingDaylightSeason(tr.month,tr.day):fallbackSeason;
  const weatherSeason=tr?trekSeasonFromMonth(tr.month):fallbackSeason;
  if(!lightSeason||!weatherSeason)throw Error('Bez data TR je nutné doložit roční období.');
  const daylightHours=EPISODE_DAYLIGHT_HOURS[latitudeBand][lightSeason];
  const sunrise=Math.round(720-daylightHours*30);
  const light=episodeLightIntervals({startMinute:cursor,minutes:end-cursor,latitudeBand,
   season:lightSeason,sunriseMinute:sunrise,twilightMinutes});
  const weather=dayWeather[dayIndex]??null;
  for(const segment of light.segments){
   const night=segment.period==='night';
   const hazard=weather?(night?weather.nightHazard:weather.daylightHazard):null;
   const precipitation=!weather?'unconfirmed':!weather.hasPrecipitation?'none':hazard==='cold'?
    (weather.precipitationRoll===weather.precipitationTN?'sleet':'snow'):'rain';
   const adjustedTemperature=weather?(night?weather.adjustedNightTemperature:weather.adjustedDayTemperature):null;
   rows.push({start:segment.start,end:segment.end,dayIndex,tr,latitudeBand,
    lightSeason,weatherSeason,daylightHours,daypart:Math.floor((segment.start%1440)/60),
    period:segment.period,night,weatherConfirmed:!!weather,hazard,precipitation,adjustedTemperature});
  }
  cursor=end;
 }
 const weatherRequiredDays=[...new Set(rows.filter(r=>!r.weatherConfirmed).map(r=>r.dayIndex))];
 const lightChanges=rows.filter((r,i)=>i>0&&rows[i-1].period!==r.period).map(r=>r.start);
 const weatherChanges=rows.filter((r,i)=>i>0&&(r.hazard!==rows[i-1].hazard||r.precipitation!==rows[i-1].precipitation)).map(r=>r.start);
 const dateChanges=rows.filter((r,i)=>i>0&&rows[i-1].dayIndex!==r.dayIndex).map(r=>r.start);
 return {format:'hmk-calendar-travel-weather-preview-v1',startMinute,endMinute:startMinute+minutes,
  rows,weatherRequiredDays,lightChanges,weatherChanges,dateChanges};
}
export function firstCalendarTravelBoundary(plan,{requireWeather=true,requireLight=false,requireWeatherChange=false}={}){
 const candidates=[...(requireWeather?plan.dateChanges.filter(m=>plan.rows.find(r=>r.start===m&&!r.weatherConfirmed)):[]),
  ...(requireLight?plan.lightChanges:[]),...(requireWeatherChange?plan.weatherChanges:[])].filter(m=>m>plan.startMinute);
 return candidates.length?Math.min(...candidates):null;
}
