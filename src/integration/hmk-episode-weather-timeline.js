/** HMK 1.2 pp.142,144: display ONE 24-hour weather roll under the
 * locally applicable daylight/night schedule. This is presentation only:
 * existing episodes still own their GM-confirmed durations and consequences.
 */
import {episodeLightIntervals,EPISODE_DAYLIGHT_HOURS} from './hmk-episode-travel-detail.js';
const ensure=(condition,message)=>{if(!condition)throw Error(message)};
const PARTS=Object.freeze([
 [0,300,'Noc'],[300,540,'Ráno'],[540,720,'Dopoledne'],
 [720,840,'Poledne'],[840,1080,'Odpoledne'],[1080,1260,'Večer'],[1260,1440,'Noc']]);
export const TREK_DAYPARTS=PARTS;
export function trekkingDaylightSeason(month,day){
 ensure(Number.isSafeInteger(month)&&month>=1&&month<=12&&Number.isSafeInteger(day)&&day>=1&&day<=30,'Denní období vyžaduje datum TR.');
 // HMK p.142 season colours: first half / second half of the month.
 const perMonth=[['spring','spring'],['spring','summer'],['summer','summer'],['summer','summer'],
  ['summer','autumn'],['autumn','autumn'],['autumn','autumn'],['autumn','winter'],
  ['winter','winter'],['winter','winter'],['winter','spring'],['spring','spring']];
 return perMonth[month-1][day<=15?0:1];
}
/** HMK gives daylight HOURS, not local sunrise, so sunrise/twilight are
 * explicitly GM/approximate context and must never be presented as a rule. */
export function weather24HourTimeline({weather,latitudeBand,daylightSeason,sunriseMinute,twilightMinutes=60}={}){
 ensure(weather?.format==='hmk-trekking-weather-day-v1','Nejdříve doložte dvě denní d10.');
 ensure(EPISODE_DAYLIGHT_HOURS[latitudeBand]?.[daylightSeason],'Neznámé šířkové pásmo nebo denní období.');
 const light=episodeLightIntervals({startMinute:0,minutes:1440,latitudeBand,season:daylightSeason,
  sunriseMinute,twilightMinutes});
 const boundaries=new Set([0,1440,...PARTS.flatMap(p=>[p[0],p[1]]),
  ...light.segments.flatMap(p=>[p.start,p.end])]);
 const markers=[...boundaries].sort((a,b)=>a-b);
 const rows=[];
 for(let i=0;i<markers.length-1;i++){
  const start=markers[i],end=markers[i+1];if(end===start)continue;
  const mid=(start+end)/2,part=PARTS.find(p=>mid>=p[0]&&mid<p[1]);
  const period=light.segments.find(p=>mid>=p.start&&mid<p.end)?.period;
  ensure(part&&period,'Není určeno světlo během časové části dne.');
  const night=period==='night',hazard=night?weather.nightHazard:weather.daylightHazard;
  const precipitation=!weather.hasPrecipitation?'none':hazard==='cold'?
   (weather.precipitationRoll===weather.precipitationTN?'sleet':'snow'):'rain';
  rows.push({start,end,daypart:part[2],period,night,
   adjustedTemperature:night?weather.adjustedNightTemperature:weather.adjustedDayTemperature,
   hazard,precipitation});
 }
 return {format:'hmk-weather-24h-preview-v1',light,rows,nightModifier:
  weather.adjustedNightTemperature-weather.adjustedDayTemperature,
  changes:rows.filter((r,i)=>i>0&&(r.hazard!==rows[i-1].hazard||r.precipitation!==rows[i-1].precipitation))
  .map(r=>({minute:r.start,hazard:r.hazard,precipitation:r.precipitation}))};
}
