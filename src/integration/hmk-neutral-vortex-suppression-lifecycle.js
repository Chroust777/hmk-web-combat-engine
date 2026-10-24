/** HMK v1.2 p.255 and p.160: deterministic, READ-ONLY projected suppression
 * timeline for a fully re-played Neutral Vortex. Every F/CF is temporary:
 * F lasts physical d20 combat rounds; CF lasts d20 * 360 combat rounds.
 *
 * The input MUST be the result of replayNeutralVortexSequence from originally
 * validated rolls; this function does not authenticate user-written history,
 * write a new magical registry, or authorize a spell/turn commit. No source's
 * AS, ML, or original enchantment is ever modified by Vortex suppression.
 * For a production commit a native, immutable Initiative/Journal writer AND
 * activation gates in every affected spell/talent/elixir/rune subsystem are
 * still required.
 */
const fail=(why)=>{throw Error('Neutral Vortex suppression: '+why)};
const ok=(v,why)=>{if(!v)fail(why)};
const whole=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validUnit=new Set(['rounds','hours']);

/** A tick is the end of the caster's corresponding combat turn. Expiry at
 * endRoundExclusive means the source is available BEFORE the next tick at
 * that same round offset (never one round earlier or later). */
export function projectNeutralVortexSuppressionLifecycle({storm,startingRound=0}={}){
 ok(storm?.format==='hmk-neutral-vortex-sequence-preflight-v1'&&
  whole(storm.spellCL,1,6)&&Array.isArray(storm.sourceIds)&&
  Array.isArray(storm.ticks)&&storm.ticks.length>=1&&
  storm.ticks.length===storm.processedTicks&&storm.ticks.length<=storm.spellCL&&
  whole(startingRound,0,999999999),
  'chybí ověřený přehrávaný Vortex, první kolo nebo jeho původní čas');
 const ids=storm.sourceIds;
 ok(ids.every(id=>typeof id==='string'&&id.length>0)&&
  new Set(ids).size===ids.length&&same([...ids].sort(),ids),
  'neúplné nebo duplicitní původní identity zdrojů');
 const known=new Set(ids),intervals=[],lastUntil=new Map(),activeAtStart=[];
 for(let tickIndex=0;tickIndex<storm.ticks.length;tickIndex++){
  const tick=storm.ticks[tickIndex],outcomes=tick?.outcome?.outcomes;
  const round=startingRound+tickIndex;
  ok(tick?.roundOffset===tickIndex&&Array.isArray(outcomes)&&
   whole(round,0,999999999)&&Array.isArray(tick.suppressedAtStart),
   'chybí souvislé původní kolo Vortexu');
  const expected=ids.filter(id=>(lastUntil.get(id)??-1)>round).sort();
  ok(same(tick.suppressedAtStart,expected),
   'aktivní potlačení nesouhlasí s původními d20 a skončením účinku');
  const seen=new Set();
  for(const outcome of outcomes){
   const id=outcome?.sourceId;
   ok(known.has(id)&&!seen.has(id)&&!expected.includes(id),
    'neplatný nebo předčasně znovu zasažený potlačený zdroj');
   seen.add(id);
   const affected=['F','CF'].includes(outcome.successLevel);
   ok(outcome.suppressed===affected&&
    (affected?validUnit.has(outcome.unit)&&
     outcome.unit===(outcome.successLevel==='F'?'rounds':'hours')&&
     whole(outcome.duration,1,20):
     ['S','CS'].includes(outcome.successLevel)&&
     outcome.unit===null&&outcome.duration===null),
    'výsledek, trvání nebo jednotka neodpovídá Vortex F/CF');
   if(!affected)continue;
   const durationRounds=outcome.duration*(outcome.unit==='hours'?360:1);
   const endRoundExclusive=round+durationRounds;
   ok(whole(endRoundExclusive,1,999999999),
    'přetečení času expirace potlačení');
   lastUntil.set(id,endRoundExclusive);
   intervals.push(Object.freeze({sourceId:id,category:outcome.category,
    startingRound:round,originRoundOffset:tickIndex,
    endRoundExclusive,duration:outcome.duration,unit:outcome.unit,
    durationRounds,physicalD100:outcome.physicalD100,
    successLevel:outcome.successLevel,permanentASLoss:0}));
  }
  activeAtStart.push(Object.freeze({round,roundOffset:tickIndex,
   suppressedSourceIds:Object.freeze(expected)}));
 }
 const finalRound=startingRound+storm.ticks.length;
 const continuing=intervals.filter(i=>i.endRoundExclusive>finalRound);
 // Source expiry and Ward expiry are INDEPENDENT even if the Ward protects
 // the other source; a suppressed Ward never prolongs the other suppression.
 return Object.freeze({format:'hmk-neutral-vortex-suppression-projection-v1',
  startingRound,finalRoundExclusive:finalRound,spellCL:storm.spellCL,
  sourceIds:Object.freeze([...ids]),
  intervals:Object.freeze(intervals),ticks:Object.freeze(activeAtStart),
  continuing:Object.freeze(continuing),mayCommit:false});
}

/** Pure temporal query. The caller must prove that its projection came from
 * the original Vortex evidence on the same Initiative timeline. */
export function neutralVortexSourceSuppressionAtRound({projection,sourceId,round}={}){
 ok(projection?.format==='hmk-neutral-vortex-suppression-projection-v1'&&
  Array.isArray(projection.sourceIds)&&projection.sourceIds.includes(sourceId)&&
  Array.isArray(projection.intervals)&&whole(round,0,999999999),
  'neznámý magický zdroj, čas nebo projekce');
 const matches=projection.intervals.filter(x=>x.sourceId===sourceId&&
  x.startingRound<=round&&round<x.endRoundExclusive);
 ok(matches.length<=1,'překrývající se účinky na stejném zdroji');
 const next=projection.intervals.filter(x=>x.sourceId===sourceId&&
  x.startingRound>round).sort((a,b)=>a.startingRound-b.startingRound)[0]??null;
 return Object.freeze({sourceId,round,suppressed:matches.length===1,
  restoreAtRound:matches[0]?.endRoundExclusive??null,
  remainingRounds:matches.length?matches[0].endRoundExclusive-round:0,
  nextSuppressionRound:next?.startingRound??null,
  physicalDurationProof:matches[0]?Object.freeze({
   roundOffset:matches[0].originRoundOffset,
   physicalD100:matches[0].physicalD100,duration:matches[0].duration,
   unit:matches[0].unit}):null,mayCommit:false});
}
