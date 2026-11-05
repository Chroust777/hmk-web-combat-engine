/** v93.736: purely descriptive current-day weather in the calendar heading.
 * Only recorded weather (and subsequent dated GM changes) appears. Nothing
 * here rolls weather or advances the time. All distinct areas stay distinct.
 */
import {activeWeatherAreas} from './hmk-trekking-weather-lifecycle.js';
import {latestWeatherShift} from './hmk-trekking-weather-shift.js';
import {campaignTRDate} from './hmk-calendar-planner.js';
import {trekkingDaylightSeason,weather24HourTimeline} from './hmk-episode-weather-timeline.js';
import {EPISODE_DAYLIGHT_HOURS} from './hmk-episode-travel-detail.js';
export function currentCampaignWeatherRows({journal=[],clock}={}){
 if(!clock||!Number.isSafeInteger(clock.minute)||clock.minute<0)return [];
 const minute=clock.minute,dayIndex=Math.floor(minute/1440);
 const campaignId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const tr=campaignTRDate(clock,minute);
 return activeWeatherAreas(journal,campaignId,dayIndex).map(source=>{
  const base=source.calendarTrekDayWeather,area=base.area;
  const shift=latestWeatherShift(journal,campaignId,minute,area);
  const changed=shift&&journal.indexOf(shift)>journal.indexOf(source);
  const weather=changed?shift.calendarTrekWeatherShift.weatherDay:base.weatherDay;
  const latitudeBand=base.latitudeBand||'mid';
  const daylightSeason=tr?trekkingDaylightSeason(tr.month,tr.day):base.season;
  let period='unknown';
  try{
   const hours=EPISODE_DAYLIGHT_HOURS[latitudeBand]?.[daylightSeason];
   if(hours){
    // HMK supplies length of daylight, not absolute sunrise. This is
    // explicitly an approximate display; day/night rolls are authoritative.
    const rise=Math.round(720-hours*30);
    const preview=weather24HourTimeline({weather,latitudeBand,daylightSeason,sunriseMinute:rise,twilightMinutes:60});
    period=preview.rows.find(r=>r.start<=minute%1440&&minute%1440<r.end)?.period??'unknown';
   }
  }catch{} // When an old save lacks location inputs, show both day/night.
  return {area,weather,period,changed:!!changed,approximateLight:true};
 });
}
