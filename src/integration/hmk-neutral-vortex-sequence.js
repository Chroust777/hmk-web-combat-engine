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
 physicalSelectionDie=null}={}){
 check(Array.isArray(sources)&&origin&&Number.isFinite(origin.x)&&Number.isFinite(origin.y),
  'chybí soupis zdrojů nebo geometrie');
 const choices=sources.filter(s=>Math.hypot(s.x-origin.x,s.y-origin.y)+radiusFeet<=spellCL*10+1e-8)
  .map(s=>s.id).sort();
 check(choices.every(s=>typeof s==='string'&&s.length>0)&&new Set(choices).size===choices.length,
  'neplatné ID zdroje');
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
 ticks,document=null,gmFullSourceHistoryConfirmed=false}={}){
 check(whole(spellCL,1,6)&&location(origin),'neplatný původní spell CL nebo pozice sesilatele');
 check(gmFullSourceHistoryConfirmed===true&&Array.isArray(sourceCensus)&&
  Array.isArray(ticks)&&ticks.length>=1&&ticks.length<=spellCL,
  'chybí úplná GM historie zdrojů a aspoň první tick');
 // An optional REAL campaign witness validates the identity and coordinates
 // of original alchemical doses/Wards. Without it this is still a GM-attested
 // simulation, and even WITH it other arcane categories remain unproven.
 const campaignCensusAudit=document===null?null:
  auditNeutralVortexAlchemyCensus({document,sourceCensus});
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
  for(const src of active){
   if(src.spell==='Ward'&&src.protectsSourceId&&!byId.has(src.protectsSourceId)){
    // A suppressed protected source still exists: it is not normally a target,
    // but its active Ward must remain historically identifiable. No safe
    // representation of that special case yet; fail before any write.
    check(false,'aktivní Ward nad potlačeným zdrojem vyžaduje další historii');
   }
  }
  const selection=neutralVortexSourceSelection({sources:active,origin,radiusFeet,
   spellCL,physicalSelectionDie:tick.physicalSelectionDie??null});
  check(tick.selectedSourceId===selection.selectedSourceId,
   'vybraný střed neodpovídá původnímu fyzickému výběrovému hodu');
  const result=neutralVortexRoundPreflight({spellCL,roundOffset:step,origin,
   radiusFeet,sources:active,gmCompleteCensusConfirmed:true,
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
   suppressedAtStart:Object.freeze([...inactiveIds].sort()),
   outcome:result,suppressionUntilRound:Object.freeze(Object.fromEntries([...suppression]))}));
 }
 return Object.freeze({format:'hmk-neutral-vortex-sequence-preflight-v1',
  spellCL,initialPosition:Object.freeze(clone(origin)),processedTicks:replay.length,
  nextRadiusFeet:radiusFeet,ticks:Object.freeze(replay),
  sourceIds:Object.freeze([...originals.keys()].sort()),
  campaignCensusAudit,
  suppressions:Object.freeze(Object.fromEntries([...suppression])),
  mayCommit:false,requiresForCommit:Object.freeze([
   'authoritative Total Release and Spirit consequences',
   'per-source evidence and verified movement chronology',
   'verified Initiative per caster turn and campaign-minute expiry',
   'historical source suppression in original spell/talent/elixir/rune subsystems',
   'source census proof and physical randomness in immutable campaign history'])});
}
