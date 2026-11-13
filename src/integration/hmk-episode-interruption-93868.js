/** v93.868 — confirmed event minute within a FULL shared calendar window.
 * This module has no character, journal or clock side effects.
 * The GM's minute controls movement; all later injuries are handled only
 * after the one calendar-window commit by the original Health/Skill engine.
 */
export const DEFERRED_EVENT_FORMAT_93868='hmk-episode-deferred-event-v93.868';
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
function must(ok,message){if(!ok)throw Error(message);}
export function randomEpisodeMinute93868(minutes,cryptoSource=globalThis.crypto){
 must(integer(minutes,1,10080),'Nejprve zvolte délku intervalu 1–10 080 minut.');
 must(cryptoSource&&typeof cryptoSource.getRandomValues==='function',
  'Bezpečný generátor minut není dostupný. Zadejte minutu ručně.');
 // Uniform without modulo bias, including arbitrary 30/45/240-minute spans.
 const limit=0x100000000,cutoff=Math.floor(limit/minutes)*minutes,a=new Uint32Array(1);
 do{cryptoSource.getRandomValues(a);}while(a[0]>=cutoff);
 return a[0]%minutes+1;
}
export function deferredEpisodeEvent93868({startMinute,minutes,atMinute,kind='accident',source='manual',incomingDelay=0}={}){
 must(integer(startMinute,0,1000000000)&&integer(minutes,1,10080)&&startMinute+minutes<=1000000000,
  'Událost: neplatný začátek nebo délka kalendářového intervalu.');
 must(integer(atMinute,1,minutes),'Událost: minuta musí být 1 až '+minutes+'.');
 must(['accident','complication'].includes(kind),'Událost: neznámý důvod přerušení.');
 must(['manual','cryptographic-software-minute'].includes(source),'Událost: neplatný původ minuty.');
 must(integer(incomingDelay,0,10000000),'Událost: neplatné předchozí zdržení.');
 return {format:DEFERRED_EVENT_FORMAT_93868,kind,source,startMinute,windowMinutes:minutes,
  atMinute,eventMinute:startMinute+atMinute,recordAtMinute:startMinute+minutes,
  remainingMinutes:minutes-atMinute,
  movingMinutes:Math.max(0,atMinute-incomingDelay),
  calendarWindowIntact:true,medicalDeferred:true};
}
export function validateDeferredEpisodeEvent93868(proof,expected={}){
 must(proof?.format===DEFERRED_EVENT_FORMAT_93868,'Chybí doložení okamžiku události.');
 const {startMinute,minutes,atMinute,kind,incomingDelay=0}=expected;
 const rebuilt=deferredEpisodeEvent93868({startMinute,minutes,atMinute,kind,
  source:proof.source,incomingDelay});
 must(JSON.stringify(proof)===JSON.stringify(rebuilt),
  'Událost nesouhlasí s potvrzenou minutou, celým intervalem nebo následným předáním.');
 return rebuilt;
}
/** Only movement within a travelling group ends early; no other group and
 * no completed foraging/production yield is scaled without a printed rule. */
export function actualGroupMovement93868({minutes,incomingDelay=0,atMinute=null}={}){
 must(integer(minutes,1,10080)&&integer(incomingDelay,0,10000000),
  'Pohyb: neplatná délka intervalu nebo dřívější zdržení.');
 if(atMinute===null)return Math.max(0,minutes-incomingDelay);
 must(integer(atMinute,1,minutes),'Pohyb: neplatná minuta zastavení skupiny.');
 return Math.max(0,atMinute-incomingDelay);
}

/** A confirmed full-watch Double Time sequence may precede discovery of an
 * earlier incident. Use ONLY the physically relevant first d10s; retain every
 * already confirmed surplus die as immutable, unused evidence. Never reroll. */
export function splitEpisodeEndDice93868(allRolls,movingMinutes){
 must(integer(movingMinutes,0,10080),'END: neplatné minuty skutečného pohybu.');
 must(Array.isArray(allRolls)&&allRolls.every(n=>integer(n,1,10)),
  'END: potvrzené fyzické hody musí být celá d10 v rozsahu 1–10.');
 const count=movingMinutes===0?0:Math.ceil(movingMinutes/60);
 return {required:count,used:allRolls.slice(0,count),unused:allRolls.slice(count)};
}
