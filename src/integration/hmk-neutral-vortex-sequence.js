/** HMK Kèthîra v1.2 pp.203–204, 255. Read-only, chronological Vortex replay.
 * This is NOT a persistence writer. It never advances an Initiative Rank or
 * claims a source is historically proven merely because a GM supplied it.
 *
 * Restriction: a fixed set of individually verified source identities across
 * all ticks. New/destroyed/changed enchantments must first have their own
 * source-history bridge. Positional snapshots may change with GM evidence.
 */
import {neutralVortexRoundPreflight,neutralVortexSpecialML} from './hmk-neutral-vortex-round-preflight.js';
import {auditNeutralVortexAlchemyCensus} from './hmk-neutral-vortex-census-audit.js';
import {projectNeutralVortexSuppressionLifecycle} from './hmk-neutral-vortex-suppression-lifecycle.js';
const check=(condition,reason)=>{if(!condition)throw Error('Neutral Vortex sequence: '+reason)};
const whole=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const clone=structuredClone;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const location=s=>Number.isFinite(s.x)&&Number.isFinite(s.y);
const immutableSource=s=>{
 const out=clone(s);delete out.x;delete out.y;delete out.verified;return out;
};
/** A random source is chosen with a physical dN, over a *canonical sorted* list.
 * The dice are supplied by the GM; no pseudo-random roll is made here.
 * A free-form text "random confirmed" is not by itself a usable die record.
 */
export function neutralVortexSourceSelection({sources,origin,radiusFeet,spellCL,
 physicalSelectionDie=null,hiddenSourceIds=[]}={}){
 // Selection is an exported, independently callable read-only gate. Never
 // silently drop a malformed/unverified source from the random pool: that
 // would change the denominator of the physical dN and could hide magic.
 check(Array.isArray(sources)&&location(origin)&&whole(spellCL,1,6)&&
  Number.isFinite(radiusFeet)&&radiusFeet>=2.5&&radiusFeet<=spellCL*10&&
  (Number.isInteger((radiusFeet-2.5)/5)||radiusFeet===spellCL*10),
  'chybí soupis zdrojů nebo platná geometrie Vortexu');
 const seen=new Set();
 for(const source of sources){
  check(source&&typeof source.id==='string'&&source.id.length>0&&
   !seen.has(source.id)&&source.verified===true&&location(source),
   'neunikátní nebo neověřený zdroj v úplném soupisu Vortexu');
  neutralVortexSpecialML(source);
  seen.add(source.id);
 }
 // HMK p.255: concentration may hide on-person / affecting-person magic
 // from being TARGETED as a new centre for one round. This is NOT blanket
 // immunity from every area test when the Vortex centres elsewhere.
 check(Array.isArray(hiddenSourceIds)&&hiddenSourceIds.every(id=>
  typeof id==='string'&&id.length>0&&seen.has(id))&&
  new Set(hiddenSourceIds).size===hiddenSourceIds.length,
  'skryté zdroje musí být jedinečné položky úplného soupisu');
 const hidden=new Set(hiddenSourceIds);
 const choices=sources.filter(s=>!hidden.has(s.id)&&
  Math.hypot(s.x-origin.x,s.y-origin.y)+radiusFeet<=spellCL*10+1e-8)
  .map(s=>s.id).sort();
 if(!choices.length){check(physicalSelectionDie===null,'bez zdrojů neexistuje výběrový hod');
  return Object.freeze({choices:Object.freeze([]),selectedSourceId:null,selectionDie:null});}
 if(choices.length===1){check(physicalSelectionDie===null,
  'jediný možný zdroj nevyžaduje žádný náhodný fyzický hod');
  return Object.freeze({choices:Object.freeze(choices),selectedSourceId:choices[0],selectionDie:null});}
 check(physicalSelectionDie&&physicalSelectionDie.faces===choices.length&&
  whole(physicalSelectionDie.value,1,choices.length)&&physicalSelectionDie.origin==='GM-physical-die',
  'výběr vyžaduje původní fyzický dN s počtem stěn rovným dostupným zdrojům');
 return Object.freeze({choices:Object.freeze(choices),
  selectedSourceId:choices[physicalSelectionDie.value-1],
  selectionDie:Object.freeze({faces:physicalSelectionDie.faces,value:physicalSelectionDie.value,
   origin:'GM-physical-die'})});
}
/** Replay every completed tick in strict order: spellfire tick 0, then each
 * successive end-of-caster-turn tick. The full source census is repeated on
 * every tick, INCLUDING suppressed sources; the engine derives which are
 * currently active. A F duration of d20 rounds expires before tick start+d20;
 * a CF duration of d20 hours expires after d20*360 ten-second combat rounds
 * (six combat rounds per minute; p.160 and p.255).
 */
export function replayNeutralVortexSequence({spellCL,origin,sourceCensus,
 ticks,document=null,originCasterId=null,gmFullSourceHistoryConfirmed=false}={}){
 check(whole(spellCL,1,6)&&location(origin),'neplatný původní spell CL nebo pozice sesilatele');
 check(gmFullSourceHistoryConfirmed===true&&Array.isArray(sourceCensus)&&
  Array.isArray(ticks)&&ticks.length>=1&&ticks.length<=spellCL,
  'chybí úplná GM historie zdrojů a aspoň první tick');
 // An optional REAL campaign witness validates the identity and coordinates
 // of original alchemical doses/Wards. Without it this is still a GM-attested
 // simulation, and even WITH it other arcane categories remain unproven.
 const campaignCensusAudit=document===null?null:
  auditNeutralVortexAlchemyCensus({document,sourceCensus});
 // The GM's origin coordinates are NOT automatically the original caster's
 // coordinates. The Initiative checkpoint can prove them if (and only if)
 // the caller names a real character on this exact combat timeline. This is
 // a *first-tick* witness, not a replay of the caster's future movements.
 let originalCasterOriginProof=null;
 if(originCasterId!==null){
  const seq=document?.combatRuntime?.sequence;
  const matchingCharacters=document?.characters?.filter(c=>c.id===originCasterId);
  const matchingUnits=seq?.spatialUnits?.filter(u=>u.id===originCasterId&&location(u));
  check(typeof originCasterId==='string'&&originCasterId.length>0&&
   matchingCharacters?.length===1&&seq?.order?.includes(originCasterId)&&
   document?.combatRuntime?.timelineId===seq?.timelineId&&
   typeof seq.timelineId==='string'&&seq.timelineId.length>0&&
   matchingUnits?.length===1&&
   Math.hypot(matchingUnits[0].x-origin.x,matchingUnits[0].y-origin.y)<1e-7,
   'poloha sesilatele Vortexu nemá jediný původní důkaz Initiative na stejné časové ose');
  originalCasterOriginProof=Object.freeze({casterId:originCasterId,
   timelineId:seq.timelineId,round:seq.round,x:matchingUnits[0].x,y:matchingUnits[0].y});
 }
 // A successful campaign census binds ONLY the initial positions of its
 // alchemical sources, original active Wards and native Raw Pèleáhn.
 // It cannot establish positions
 // of other magical categories, nor predict source movement in later rounds.
 // A tick-0 location may not override that original Initiative snapshot.
 const originalPositionProofIds=new Set();
 if(campaignCensusAudit){
  for(const source of campaignCensusAudit.verifiedAlchemy){
   originalPositionProofIds.add(source.sourceId);
   if(source.wardProofId)originalPositionProofIds.add(source.wardProofId);
  }
  for(const source of campaignCensusAudit.verifiedRawPelahn)
   originalPositionProofIds.add(source.sourceId);
 }
 const originals=new Map();
 for(const src of sourceCensus){
  check(typeof src?.id==='string'&&src.id&&!originals.has(src.id)&&
   src.verified===true&&location(src),'původní zdroje musí mít originální ID a polohu');
  neutralVortexSpecialML(src);
  originals.set(src.id,immutableSource(src));
 }
 const suppression=new Map(),replay=[];
 let radiusFeet=2.5;
 for(let step=0;step<ticks.length;step++){
  const tick=ticks[step];
  check(tick?.roundOffset===step&&Array.isArray(tick.sources)&&
   tick.sources.length===originals.size&&Array.isArray(tick.rolls),
   'chybí nepřerušený tick, jeho pozice, hody nebo úplný soupis zdrojů');
  const originalIds=new Set();
  for(const src of tick.sources){
   check(src?.verified===true&&location(src)&&originals.has(src.id)&&
    !originalIds.has(src.id)&&same(immutableSource(src),originals.get(src.id)),
    'změněný, vynechaný, podvržený nebo nový magický zdroj');
   // Without this comparison, a GM tick could move a campaign-verified elixir
   // or Ward in the FIRST round while still returning a historical proof for
   // its unmodified position from sourceCensus. This check is only for the
   // original tick; later movement requires separate original timeline data.
   if(step===0&&originalPositionProofIds.has(src.id)){
    const witnessed=sourceCensus.find(s=>s.id===src.id);
    check(Math.abs(src.x-witnessed.x)<1e-7&&Math.abs(src.y-witnessed.y)<1e-7,
     'první tick změnil původní polohu magického zdroje proti živé Initiative');
   }
   originalIds.add(src.id);
  }
  const inactiveIds=new Set([...suppression.entries()]
   .filter(([,end])=>end>step).map(([id])=>id));
  const active=tick.sources.filter(s=>!inactiveIds.has(s.id)).map(s=>clone(s));
  for(const src of active){
   if(src.protectedByWardId&&inactiveIds.has(src.protectedByWardId))
    delete src.protectedByWardId;
  }
  const byId=new Map(active.map(s=>[s.id,s]));
  const suppressedProtectedSourceIds=[];
  for(const src of active){
   if(src.spell==='Ward'&&src.protectsSourceId&&!byId.has(src.protectsSourceId)){
    // The original full census retains the target while suppressed. The
    // Ward is active on that SAME physical source and can still be hit; the
    // suppressed source itself cannot be retested before its expiry.
    const target=tick.sources.find(x=>x.id===src.protectsSourceId);
    check(inactiveIds.has(src.protectsSourceId)&&
     target?.protectedByWardId===src.id&&location(target)&&
     Math.hypot(target.x-src.x,target.y-src.y)<1e-7,
     'obnovený Ward nemá doložený stále potlačený původní cíl');
    suppressedProtectedSourceIds.push(src.protectsSourceId);
   }
  }
  // A concentration receipt here is GM-ATTESTED and valid for one tick only.
 // The existing Initiative has no canonical post-spellfire shield action,
 // hence it cannot be upgraded to an authoritative saved effect.
 let hiddenSourceIds=[];
 if(tick.shielding!==undefined){
  const sh=tick.shielding;
  check(sh&&typeof originCasterId==='string'&&originCasterId&&
   sh.casterId===originCasterId&&sh.gmConcentrationConfirmed===true&&
   sh.gmOnOrAffectingCasterConfirmed===true&&
   sh.mode===(step===0?'continue-after-spellfire':'one-round-action')&&
   Array.isArray(sh.sourceIds)&&sh.sourceIds.length>0&&
   sh.sourceIds.every(id=>typeof id==='string'&&originals.has(id)&&
    !inactiveIds.has(id))&&new Set(sh.sourceIds).size===sh.sourceIds.length,
   'skrytí zdrojů vyžaduje GM doložené soustředění sesilatele a aktivní zdroje');
  hiddenSourceIds=[...sh.sourceIds].sort();
 }
 const selection=neutralVortexSourceSelection({sources:active,origin,radiusFeet,
   spellCL,hiddenSourceIds,physicalSelectionDie:tick.physicalSelectionDie??null});
  check(tick.selectedSourceId===selection.selectedSourceId,
   'vybraný střed neodpovídá původnímu fyzickému výběrovému hodu');
  const result=neutralVortexRoundPreflight({spellCL,roundOffset:step,origin,
   radiusFeet,sources:active,suppressedProtectedSourceIds,hiddenSourceIds,gmCompleteCensusConfirmed:true,
   selectedSourceId:selection.selectedSourceId,
   gmRandomSelectionConfirmed:selection.selectionDie!==null,
   selectionProof:selection.selectionDie===null?null:
    `GM-physical-d${selection.selectionDie.faces}:${selection.selectionDie.value}`,
   rolls:tick.rolls});
  for(const effect of result.outcomes){
   if(effect.suppressed){
    const end=step+effect.duration*(effect.unit==='hours'?360:1);
    check(whole(end,1,9999999),'neplatný konec potlačení');
    suppression.set(effect.sourceId,end);
   }
  }
  radiusFeet=result.radiusNextFeet;
  replay.push(Object.freeze({roundOffset:step,sourceSelection:selection,
   // Only alchemy, its Ward and native Raw Pèleáhn at the first tick.
   // No later tick is retrospectively authenticated by one LIVE snapshot.
   originalCampaignPositionProofSourceIds:Object.freeze(step===0?
    [...originalPositionProofIds].sort():[]),
   gmOnlyPositionSourceIds:Object.freeze(step===0?
    [...originals.keys()].filter(id=>!originalPositionProofIds.has(id)).sort():
    [...originals.keys()].sort()),
   suppressedAtStart:Object.freeze([...inactiveIds].sort()),
   // GM evidence only: no native Initiative shield-action log exists yet.
   hiddenFromCentreSelectionIds:Object.freeze([...hiddenSourceIds]),
   shieldingEvidence:tick.shielding===undefined?null:'GM-attested-only',
   outcome:result,suppressionUntilRound:Object.freeze(Object.fromEntries([...suppression]))}));
 }
 const startingRound=document?.combatRuntime?.sequence?.round??0;
 const replayWitness={format:'hmk-neutral-vortex-sequence-preflight-v1',
  spellCL,sourceIds:[...originals.keys()].sort(),processedTicks:replay.length,ticks:replay};
 const suppressionLifecycle=projectNeutralVortexSuppressionLifecycle({
  storm:replayWitness,startingRound});
 check(same(suppressionLifecycle.intervals.reduce((acc,entry)=>{
  acc[entry.sourceId]=entry.endRoundExclusive-startingRound;return acc;},{}),
  Object.fromEntries([...suppression])),
  'životní cyklus potlačení nesouhlasí s původním fyzickým d20');
 return Object.freeze({format:'hmk-neutral-vortex-sequence-preflight-v1',
  spellCL,initialPosition:Object.freeze(clone(origin)),processedTicks:replay.length,
  nextRadiusFeet:radiusFeet,ticks:Object.freeze(replay),
  sourceIds:Object.freeze([...originals.keys()].sort()),
  campaignCensusAudit,originalCasterOriginProof,suppressionLifecycle,
  suppressions:Object.freeze(Object.fromEntries([...suppression])),
  mayCommit:false,requiresForCommit:Object.freeze([
   'authoritative Total Release and Spirit consequences',
   'per-source evidence and verified movement chronology',
   'verified Initiative per caster turn and campaign-minute expiry',
   'historical source suppression in original spell/talent/elixir/rune subsystems',
   'source census proof and physical randomness in immutable campaign history',
   'native Initiative evidence for optional one-round concentration shielding'])});
}
