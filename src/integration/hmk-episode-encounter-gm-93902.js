/** Explicit follow-up for a new shared Time Episode encounter, HMK p.150.
 * No medical, combat, time, or inventory effects. The original episode is immutable.
 * Every die, skill EML, event minute, and GM decision remains a witnessed input.
 */
import {episodeEncounterDistance,episodeEncounterSurprise} from './hmk-episode-travel-detail.js';

export const EPISODE_ENCOUNTER_GM_FORMAT_93902='hmk-episode-encounter-gm-93902-v1';
const fail=message=>{throw Error(message)};
const integer=(raw,min,max,label)=>{
 if(raw===null||raw===undefined||String(raw).trim()===''||!/^[-+]?\d+$/.test(String(raw).trim()))return fail('Encounter GM: chybí '+label+'.');
 const value=Number(raw);
 if(!Number.isSafeInteger(value)||value<min||value>max)return fail('Encounter GM: '+label+' mimo povolený rozsah.');
 return value;
};
const optionalInteger=(raw,min,max,label)=>raw===null||raw===undefined||String(raw).trim()===''?null:integer(raw,min,max,label);
const clean=s=>String(s??'').trim();
const owned=(journal,campaignId,sourceId,index)=>{
 const source=journal.find(x=>x.id===sourceId&&x.calendarCampaignId===campaignId&&x.calendarTimeEpisode);
 const episode=source?.calendarTimeEpisode;
 if(!episode?.encounter?.found||!episode?.encounterDetails?.some(x=>x.i===index&&x.disposition==='reported-to-gm'))
  fail('Encounter GM: neexistuje doložené neuzavřené setkání tohoto čísla.');
 return {source,episode};
};
export function episodeEncounterGMReceipt93902({journal=[],campaignId,sourceId,index,minute,input={}}={}){
 if(!campaignId||!sourceId)return fail('Encounter GM: chybí kampaň nebo původní událost.');
 const i=integer(index,0,100,'číslo setkání'),{source,episode}=owned(journal,campaignId,sourceId,i);
 if(!Number.isSafeInteger(minute)||minute<episode.endMinute)fail('Encounter GM: rozhodnutí nesmí předcházet původnímu setkání.');
 if(journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarEpisodeEncounterGM93902?.sourceId===sourceId&&x.calendarEpisodeEncounterGM93902.index===i))
  fail('Encounter GM: toto setkání již bylo doloženo.');
 const offset=integer(input.offset,0,episode.minutes-1,'minuta setkání'),eventMinute=episode.startMinute+offset;
 const period=episode.daylight?.segments?.find(s=>s.start<=eventMinute&&eventMinute<s.end)?.period;
 if(!['day','twilight','night'].includes(period))fail('Encounter GM: chybí doložené světlo ve skutečné minutě setkání.');
 const terrain=clean(input.terrain)||episode.terrain;
 const d4=integer(input.d4,1,4,'d4 vzdálenosti'),hearingD10=optionalInteger(input.hearingD10,1,10,'Hearing d10');
 const moon=period==='night'?clean(input.moon):'dark';
 const distance=episodeEncounterDistance({terrain,d4,period,moon,hearingD10});
 const nonhostile=!!input.nonhostile;
 const note=clean(input.note);
 if(note.length>500)fail('Encounter GM: poznámka přesahuje 500 znaků.');
 let surprise=null;
 if(!nonhostile){
  const beast=!!input.foeIsBeast,foeWatchfulness=clean(input.foeWatchfulness);
  if(!beast&&!['lax','normal','alert'].includes(foeWatchfulness))fail('Encounter GM: zvolte bdělost protistrany.');
  const partySkill=clean(input.partySkill)||null,foeSkill=clean(input.foeSkill)||null;
  const partyRoll=optionalInteger(input.partyRoll,1,100,'d100 družiny'),foeRoll=optionalInteger(input.foeRoll,1,100,'d100 protistrany');
  const partyEML=optionalInteger(input.partyEML,-200,200,'EML družiny'),foeEML=optionalInteger(input.foeEML,-200,200,'EML protistrany');
  const decision=clean(input.decision)||null;
  surprise=episodeEncounterSurprise({partyModes:episode.orientation?.modes||{},conveyance:episode.conveyance,
   drovingAnimals:episode.conveyance==='foot'&&!!((episode.stableAnimalLoad?.length||0)+(episode.animals?.length||0)),
   foeWatchfulness:beast?'alert':foeWatchfulness,foeIsBeast:beast,partySkill,foeSkill,partyRoll,partyEML,foeRoll,foeEML,decision,requireWitness:true});
  if(!surprise.verified)fail('Encounter GM: Surprise vyžaduje skutečný d100 a EML povinných stran; automatická varianta nesmí mít další hody.');
  if(!decision)fail('Encounter GM: potvrďte rozhodnutí po Surprise.');
  if(decision==='ambush'&&(offset!==episode.minutes-1||!surprise.winner))
   fail('Encounter GM: zpětný ambush nelze zapsat uprostřed již dokončené cesty nebo bez vítěze překvapení. Oddělte čas a rozhodněte s GM.');
 }else if(clean(input.decision)||clean(input.foeWatchfulness)||clean(input.partySkill)||clean(input.foeSkill)||
   clean(input.partyRoll)||clean(input.foeRoll)||clean(input.partyEML)||clean(input.foeEML)||input.foeIsBeast){
  fail('Encounter GM: klidné setkání nesmí obsahovat fingované Surprise hody nebo rozhodnutí.');
 }
 return {format:EPISODE_ENCOUNTER_GM_FORMAT_93902,sourceId,index:i,minute,eventMinute,offset,
  input:{offset,d4,terrain,moon:period==='night'?moon:'dark',hearingD10,nonhostile,
   ...(nonhostile?{}:{foeIsBeast:!!input.foeIsBeast,foeWatchfulness:clean(input.foeWatchfulness),
    partySkill:clean(input.partySkill),partyRoll:optionalInteger(input.partyRoll,1,100,'d100 družiny'),
    partyEML:optionalInteger(input.partyEML,-200,200,'EML družiny'),foeSkill:clean(input.foeSkill),
    foeRoll:optionalInteger(input.foeRoll,1,100,'d100 protistrany'),
    foeEML:optionalInteger(input.foeEML,-200,200,'EML protistrany'),decision:clean(input.decision)}),note},
  distance,nonhostile,surprise,sourcePage:150};
}
export function validateEpisodeEncounterGM93902(journal=[]){
 const known=[];
 for(const row of journal){
  if(!row.calendarEpisodeEncounterGM93902)continue;
  const p=row.calendarEpisodeEncounterGM93902;
  const receipt=episodeEncounterGMReceipt93902({journal:known.concat(journal.filter(x=>x!==row&&!x.calendarEpisodeEncounterGM93902)),
   campaignId:row.calendarCampaignId,sourceId:p.sourceId,index:p.index,minute:row.campaignMinute,input:p.input});
  if(row.characterId!==journal.find(x=>x.id===p.sourceId)?.characterId||JSON.stringify(p)!==JSON.stringify(receipt))
   fail('Encounter GM: uložená položka se liší od původních hodů a odvozených výsledků.');
  known.push(row);
 }
 return true;
}
export function assertEpisodeEncounterGMAppendOnly93902(before=[],after=[]){
 const next=new Map(after.filter(x=>x.calendarEpisodeEncounterGM93902).map(x=>[x.id,x]));
 for(const row of before)if(row.calendarEpisodeEncounterGM93902&&JSON.stringify(row)!==JSON.stringify(next.get(row.id)))
  fail('Encounter GM: původní potvrzení je neměnný doklad.');
 return true;
}
