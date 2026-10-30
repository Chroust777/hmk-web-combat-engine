/** GM-confirmed, time-scoped variation of an existing HMK 144 daily weather.
 * The random weather tables prescribe daily checks, NOT this discretionary
 * change. Original day weather and older travel consequences are immutable.
 */
import {trekWeatherDay} from './hmk-trekking-routine.js';
import {activeAreaWeather,weatherAreaKey} from './hmk-trekking-weather-lifecycle.js';
export const WEATHER_SHIFT_FORMAT='hmk-trek-gm-weather-shift-v1';
const ok=(yes,msg)=>{if(!yes)throw Error(msg)};
export function latestWeatherShift(journal=[],campaignId,minute,area){
 const dayIndex=Math.floor(minute/1440),norm=weatherAreaKey(area);
 return [...journal].reverse().find(j=>j.calendarCampaignId===campaignId&&
  j.calendarTrekWeatherShift?.format===WEATHER_SHIFT_FORMAT&&
  j.calendarTrekWeatherShift.dayIndex===dayIndex&&
  weatherAreaKey(j.calendarTrekWeatherShift.area)===norm&&
  j.campaignMinute<=minute)??null;
}
export function createWeatherShift({journal=[],campaignId,minute,area,
 season,climate,landscape,alpine,aridDesert,temperatureD10,precipitationD10,
 diceOrigins=['manual','manual']}={}){
 const dayIndex=Math.floor(minute/1440);
 const original=activeAreaWeather(journal,campaignId,dayIndex,area);
 ok(original,'Nejprve doložte běžné denní počasí oblasti, teprve pak změnu GM.');
 const base=original.calendarTrekDayWeather;
 ok(base.season===season&&base.climate===climate&&base.landscape===landscape&&
  base.alpine===alpine&&base.aridDesert===aridDesert,
  'Změna počasí používá stejné potvrzené klimatické podmínky oblasti.');
 ok(Number.isSafeInteger(minute)&&minute>=dayIndex*1440&&minute<(dayIndex+1)*1440,
  'Neplatný okamžik změny počasí.');
 ok(diceOrigins.length===2&&diceOrigins.every(v=>['manual','cryptographic-software-die'].includes(v)),
  'Změna musí obsahovat původ obou skutečných hodů.');
 const weatherDay=trekWeatherDay({season,climate,landscape,alpine,aridDesert,temperatureD10,precipitationD10});
 return {format:WEATHER_SHIFT_FORMAT,dayIndex,area,sourceId:original.id,fromMinute:minute,
  season,climate,landscape,alpine,aridDesert,weatherDay,diceOrigins,sourceRule:'GM discretionary change; HMK p.144 daily rolls unchanged'};
}
export function validateWeatherShifts(journal=[]){
 const prior=[];
 for(const row of journal){
  const s=row.calendarTrekWeatherShift;
  if(s){
   ok(s.format===WEATHER_SHIFT_FORMAT&&s.fromMinute===row.campaignMinute&&
    Number.isSafeInteger(s.fromMinute)&&s.dayIndex===Math.floor(s.fromMinute/1440)&&
    !!row.calendarCampaignId&&typeof s.area==='string'&&s.area.trim(),
    'Nesprávný čas nebo oblast změny počasí.');
   const restored=createWeatherShift({journal:prior,campaignId:row.calendarCampaignId,
    minute:s.fromMinute,area:s.area,season:s.season,climate:s.climate,landscape:s.landscape,
    alpine:s.alpine,aridDesert:s.aridDesert,
    temperatureD10:s.weatherDay?.temperatureD10,precipitationD10:s.weatherDay?.precipitationD10,
    diceOrigins:s.diceOrigins});
   ok(JSON.stringify(s)===JSON.stringify(restored),'Změna počasí neodpovídá oběma doloženým d10.');
  }
  prior.push(row);
 }
 return true;
}
export function assertWeatherShiftAppendOnly(before=[],after=[]){
 const current=new Map(after.filter(x=>x.calendarTrekWeatherShift).map(x=>[x.id,x]));
 for(const old of before)if(old.calendarTrekWeatherShift){
  const now=current.get(old.id);ok(now&&JSON.stringify(now)===JSON.stringify(old),
   'Historickou změnu počasí nelze přepsat.');
 }
 return true;
}
