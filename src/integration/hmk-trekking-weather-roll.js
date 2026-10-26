/** HMK v1.2 p.149: the weather AV roll precedes Endurance/Survival.
 * One independent physical die and immutable source-linked result per exposed
 * traveller. The roll by itself never inflicts Fatigue or creates a wound.
 */
const valid=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const must=(ok,message)=>{if(!ok)throw Error(message);};
export const WEATHER_ROLL_FORMAT='hmk-trekking-weather-roll-v1';
export function evaluateTrekkingWeatherRoll({kind,areaAV,gearAV=0,shelterAV=0,fireFS=0,
 continuousSleet=false,resting=false,shadedRest=false,nativeHotClimate=false,roll,origin='manual'}={}){
 must(['cold','heat'].includes(kind),'Chybí doložený Cold/Heat Hazard');
 must(valid(areaAV,0,99)&&valid(roll,1,12),'Je nutná ověřená Area AV a fyzický hod kostkou');
 must(['manual','cryptographic-software-die'].includes(origin),'Neznámý původ hodu');
 let av,sides,exposed;
 if(kind==='cold'){
  must(valid(gearAV,0,2)&&[0,2,3].includes(shelterAV)&&valid(fireFS,0,20)&&
   typeof continuousSleet==='boolean'&&resting===false&&shadedRest===false&&nativeHotClimate===false,
   'Neplatné ochranné podmínky Cold Hazard');
  av=Math.min(areaAV,4)+gearAV+shelterAV+fireFS;
  sides=continuousSleet?10:6;
  exposed=roll>av;
 }else{
  must(gearAV===0&&shelterAV===0&&fireFS===0&&continuousSleet===false&&
   typeof resting==='boolean'&&typeof shadedRest==='boolean'&&typeof nativeHotClimate==='boolean'&&
   (!shadedRest||resting),'Shade vyžaduje skutečný odpočinek bez pohybu');
  av=Math.max(areaAV,1);
  sides=(shadedRest?10:resting?6:4)+(nativeHotClimate?2:0);
  exposed=roll<=av;
 }
 must(roll<=sides,'Hod přesahuje skutečnou kostku Weather Hazard d'+sides);
 return {format:WEATHER_ROLL_FORMAT,kind,areaAV,gearAV,shelterAV,fireFS,continuousSleet,
  resting,shadedRest,nativeHotClimate,av,sides,roll,origin,exposed,requiresEndurance:exposed,
  rulePage:149};
}
export function weatherRollEvidence(journal=[],sourceId,actorId,campaignId){
 return journal.find(j=>j.calendarTrekWeatherRoll?.format===WEATHER_ROLL_FORMAT&&
  j.calendarTrekWeatherRoll.sourceId===sourceId&&j.characterId===actorId&&
  j.calendarCampaignId===campaignId&&j.calendarTrekWeatherRoll.actorId===actorId)??null;
}
export function certifyTrekkingWeatherRoll({journal=[],source,actorId,campaignId,minute,
 input,entryId,createdAt}={}){
 must(source?.id&&source.calendarTrekProof?.format==='hmk-trekking-watch-evidence-v1'&&
  source.calendarCampaignId===campaignId&&source.campaignMinute<=minute&&
  valid(minute,0,1000000000)&&source.calendarTrekProof.weatherWatch?.requiresWeatherHazardRoll&&
  (source.calendarTrekProof.partyModes?.memberIds??[source.characterId]).includes(actorId),
  'Weather Hazard nepatří doložené hlídce, postavě či kampani');
 must(!weatherRollEvidence(journal,source.id,actorId,campaignId),'Weather Hazard již byl doložen');
 const w=source.calendarTrekProof.weatherWatch;
 // A four-hour foot watch with actual movement is not a shaded or stationary
 // rest; the GM cannot claim larger Heat dice for a simultaneous trek.
 if(input?.kind==='heat'&&source.calendarTrekProof.conveyance==='foot'&&
  source.calendarTrekProof.movement?.leagues>0&&input.resting===true)
  throw Error('Při skutečné pěší cestě se nelze současně dovolávat klidu/stínu pro Heat Hazard.');
 must(input?.kind===w.hazard,'Typ Weather Hazard musí odpovídat původní hlídce');
 must(input.kind!=='cold'||(input.continuousSleet??false)===(w.precipitation==='sleet'&&w.continuous===true),
  'Kostka pro Continuous Sleet musí odpovídat uloženému počasí');
 const result=evaluateTrekkingWeatherRoll(input);
 must(typeof entryId==='string'&&entryId,'Chybí identita dokladu');
 return {id:entryId,characterId:actorId,calendarCampaignId:campaignId,campaignMinute:minute,
  createdAt,title:(result.kind==='cold'?'Cold':'Heat')+' Hazard Roll · HMK 149',
  body:`d${result.sides} ${result.roll} / AV ${result.av} → ${result.exposed?'vyžaduje Endurance (Survival)':'bez expozice'}`,
  calendarTrekWeatherRoll:{...result,sourceId:source.id,actorId,sourceMinute:source.campaignMinute,campaignId}};
}
/** Validate imported/cloud journal as strictly as a freshly submitted die. */
export function validateTrekkingWeatherRollEvidence(journal=[]){
 const sourceById=new Map(journal.map(x=>[x.id,x]));
 const keys=new Set();
 for(const entry of journal){
  const p=entry.calendarTrekWeatherRoll;if(!p)continue;
  must(p.format===WEATHER_ROLL_FORMAT&&typeof p.sourceId==='string'&&
   p.actorId===entry.characterId&&p.campaignId===entry.calendarCampaignId&&
   p.sourceMinute<=entry.campaignMinute&&valid(entry.campaignMinute,0,1000000000),
   'Weather Hazard: neplatná identita postavy, kampaně nebo času');
  const src=sourceById.get(p.sourceId),weather=src?.calendarTrekProof?.weatherWatch;
  must(src&&src.calendarCampaignId===p.campaignId&&src.campaignMinute===p.sourceMinute&&
   weather?.requiresWeatherHazardRoll===true&&weather.hazard===p.kind&&
   (src.calendarTrekProof.partyModes?.memberIds??[src.characterId]).includes(p.actorId),
   'Weather Hazard: neplatný původ hlídky či vystavené postavy');
  const key=[p.sourceId,p.actorId,p.campaignId].join('|');
  must(!keys.has(key),'Weather Hazard: zdvojený hod stejné postavy ve stejné hlídce');keys.add(key);
  const expected=evaluateTrekkingWeatherRoll(p);
  must(p.continuousSleet===(weather.precipitation==='sleet'&&weather.continuous===true)&&
   ['av','sides','exposed','requiresEndurance'].every(k=>expected[k]===p[k]),
   'Weather Hazard: nesouhlasí fyzická kostka, ochrana nebo výsledek');
 }
 return true;
}
