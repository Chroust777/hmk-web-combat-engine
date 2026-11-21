import {weatherAreaKey} from './hmk-trekking-weather-lifecycle.js';

const directions={N:'severu',NE:'severovýchodu',SE:'jihovýchodu',S:'jihu',SW:'jihozápadu',NW:'severozápadu'};
const forces=['slabý','mírný','silný','vichřice','bouře'];

function windRecords(journal,campaignId){
 return journal.flatMap((row,index)=>{
  const proof=row.calendarFieldCraft,wind=proof?.result;
  if(row.calendarCampaignId!==campaignId||proof?.task!=='wind'||!weatherAreaKey(proof.area)||
   !Number.isSafeInteger(row.campaignMinute)||row.campaignMinute<0||!Number.isInteger(wind?.hours)||
   wind.hours<3||wind.hours>12||!Number.isInteger(wind.force)||!Object.hasOwn(forces,wind.force)||
   !Object.hasOwn(directions,wind.direction))return [];
  return [{sourceId:row.id,area:proof.area,from:row.campaignMinute,until:row.campaignMinute+wind.hours*60,
   force:wind.force,direction:wind.direction,index}];
 }).sort((a,b)=>a.from-b.from||a.index-b.index);
}

export function activeCampaignWind(journal,campaignId,minute){
 const latest=new Map();
 for(const entry of windRecords(journal,campaignId)){
  if(entry.from>minute)break;
  latest.set(weatherAreaKey(entry.area),entry);
 }
 return [...latest.values()].filter(entry=>minute<entry.until);
}

export function travelWindSegments(journal,campaignId,area,start,end){
 const entries=windRecords(journal,campaignId).filter(entry=>weatherAreaKey(entry.area)===weatherAreaKey(area)&&entry.from<end);
 return entries.flatMap((entry,index)=>{
  const from=Math.max(start,entry.from),until=Math.min(end,entry.until,entries[index+1]?.from??end);
  return from<until?[{sourceId:entry.sourceId,from,until,force:entry.force,direction:entry.direction}]:[];
 });
}

export function windDescription(wind){
 return (wind.force<3?forces[wind.force]+' vítr':forces[wind.force])+' (WF '+wind.force+') '+windOrigin(wind);
}

function windOrigin(wind){
 return (wind.direction.startsWith('N')?'ze ':'z ')+directions[wind.direction];
}

export function travelWindProse(episode){
 const segments=episode.windSegments??[];
 return segments.map((segment,index)=>{
  const origin=windOrigin(segment),previous=segments[index-1];
  if(previous?.until===segment.from&&previous.force===segment.force&&previous.direction===segment.direction)return '';
  const full=segment.from===episode.startMinute&&segment.until===episode.endMinute;
  const time=full?'Po celou cestu':segment.from===episode.startMinute?'Zprvu':'Za cesty';
  return [
   time+' vanul '+origin+' slabý vítr.',
   time+' se '+origin+' opíral do šatů mírný vítr.',
   time+' se '+origin+' hnal silný vítr.',
   time+' se '+origin+' hnala vichřice.',
   time+' se '+origin+' hnal bouřlivý vítr.'
  ][segment.force];
 }).filter(Boolean).join(' ');
}

export function validateTravelWind(journal){
 for(const [index,row] of journal.entries()){
  const episode=row.calendarTimeEpisode;
  if(episode?.windSegments===undefined)continue;
  const expected=travelWindSegments(journal.slice(0,index),row.calendarCampaignId,episode.area,episode.startMinute,episode.endMinute);
  if(episode.kind!=='travel'||JSON.stringify(episode.windSegments)!==JSON.stringify(expected))
   throw Error('Cestovní zápis má neplatnou vazbu na doložený vítr.');
 }
}
