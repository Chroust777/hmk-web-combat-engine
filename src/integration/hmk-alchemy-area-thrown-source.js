/** HârnMaster v1.2 pp.110,163–164,268–269,271–272,274.
 * Binds the existing, shared grenade-vial Missile resolver to the actual
 * positioned Initiative battlefield. A read-only source+blast stage is NOT a
 * persistence capability. The saved campaign's atomic combat checkpoint must
 * later commit this AND all victim states and the vial together.
 */
import {createAlchemicalAreaThrownVial} from './hmk-alchemy-acid-thrown.js';
import {previewAlchemyAreaBlast} from './hmk-alchemy-area-preflight.js';
import {validateEncounterSequence} from './encounter-turn-sequence.js';
import {availableMasteries} from './hmk-skill-test-engine.js';
import {effectiveSpatialBarriers,pathCrossesClosedBarrier} from './hmk-guided-spatial-barriers.js';
const check=(v,m)=>{if(!v)throw Error('Alchemy Area Source: '+m)};
const validPoint=p=>p&&typeof p.x==='number'&&typeof p.y==='number'&&
 Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=1000000&&Math.abs(p.y)<=1000000;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// The shared grenade resolver can return CF (the vial remains in hand).
// Form placeholders for rolls that never occurred must be allowed, but
// populated injury/impact/Morale results may NOT be attached to a CF.
function noExplosionDice(areaDice){
 if(!areaDice||typeof areaDice!=='object'||Array.isArray(areaDice))return false;
 const permitted=['rollsByTarget','impactD4','impactOrigin','threatenedOpponentIds',
  'threatGeometryConfirmed','moraleByOpponent'];
 if(Object.keys(areaDice).some(k=>!permitted.includes(k)))return false;
 return same(areaDice.rollsByTarget??{}, {})&&
  (areaDice.impactD4===undefined||areaDice.impactD4===null)&&
  (areaDice.impactOrigin===undefined||areaDice.impactOrigin===null)&&
  same(areaDice.threatenedOpponentIds??[],[])&&areaDice.threatGeometryConfirmed!==true&&
  same(areaDice.moraleByOpponent??{},{});
}
export const ALCHEMY_AREA_SOURCE_STAGE='hmk-alchemy-area-throw-stage-v1';
/** The attacker/target and impact locations are expressed in FEET in the
 * same coordinate frame already used by Initiative spatialUnits. Never accept
 * a success against an unplaced roster or an inferred impact location.
 */
export function stageAlchemyAreaThrownSource({sequence,characters,inventory,journal,campaignId,
 minute,actorId,finishId,sourceId,aimPoint,center,throwDice,areaDice={},gmConfirmed=false}={}){
 const seq=validateEncounterSequence(sequence);
 check(gmConfirmed===true&&typeof sourceId==='string'&&sourceId.length>=3,
  'GM musí potvrdit jediný zdroj a skutečné místo rozbití');
 check(validPoint(aimPoint)&&validPoint(center),'chybí ověřené souřadnice v ft');
 check(seq.active===true&&seq.order[seq.cursor]===actorId&&
  (!seq.interruptActiveId||seq.interruptActiveId===actorId),
  'pouze právě jednající účastník Initiative smí provést vrh');
 check(Array.isArray(seq.spatialUnits)&&seq.spatialUnits.length===seq.order.length&&
  seq.order.every(id=>seq.spatialUnits.filter(u=>u.id===id&&validPoint(u)).length===1),
  'chybí skutečná poloha některého účastníka Initiative');
 const from=seq.spatialUnits.find(u=>u.id===actorId);
 const actingCharacter=characters?.find(c=>c.id===actorId);
 check(actingCharacter&&characters.filter(c=>c.id===actorId).length===1,
  'vrhač nemá jednoznačnou živou postavu');
 check(throwDice&&typeof throwDice==='object'&&!Array.isArray(throwDice),
  'chybějí fyzické hody a okolnosti Throwing');
 // No fictitious zero-range throw. The source's BR and Range are certified
 // against the actual position of the thrower and intended landing point.
 check(Number.isSafeInteger(throwDice.distanceFt)&&throwDice.distanceFt>=1&&
  Math.abs(distance(from,aimPoint)-throwDice.distanceFt)<1e-6,
  'vzdálenost Throwing neodpovídá skutečné pozici a mířenému bodu');
 // This first source join certifies the canonical grenade route; it does NOT
 // turn a missed Direct Missile into a known ground impact without evidence.
 const liveThrowing=availableMasteries(actingCharacter).filter(m=>m.name.toLowerCase()==='throwing');
 check(liveThrowing.length===1&&throwDice.throwingML===liveThrowing[0].ml&&
  throwDice.str===actingCharacter.hmk?.attributes?.str,
  'Throwing ML a STR musejí odpovídat skutečnému Skill Workbench a živým atributům');
 check(throwDice.aimType==='grenade',
  'Direct bez samostatně doloženého místa dopadu nelze označit za Area výbuch');
 const source=createAlchemicalAreaThrownVial({...throwDice,journal,inventory,campaignId,
  minute,actorId,finishId,impactSurfaceFirmConfirmed:true,geometryConfirmed:true,
  gmConfirmed:true});
 if(!source.discharged){
  check(noExplosionDice(areaDice)&&same(center,aimPoint),
   'CF: bez vrhu není výbuch, centrum účinku ani hody zasažených');
  return {format:ALCHEMY_AREA_SOURCE_STAGE,kind:source.elixirName,sourceId,
   status:'preview-only',readyForCommit:false,reason:'CF: bez odhozu a bez rozbití',
   throw:source,blast:null,aimPoint:structuredClone(aimPoint),center:null,
   sequenceWitness:JSON.stringify(seq)};
 }
 // The recorded origin-to-impact path cannot be silently traced through
 // a physical wall/closed door; a blocked trajectory needs a GM-proven
 // actual collision and a different source, not a fictional explosion.
 const barriers=effectiveSpatialBarriers(seq);
 check(!pathCrossesClosedBarrier([from,aimPoint],barriers)&&
  !pathCrossesClosedBarrier([from,center],barriers),
  'trajektorie lahvičky protíná fyzickou stěnu nebo zavřené dveře');
 const df=source.deviation?.distanceFeet;
 check(Number.isSafeInteger(df)&&df>=0,'chybí vyhodnocená Grenade deviation');
 check(Math.abs(distance(aimPoint,center)-df)<1e-6,
  'bod rozbití neodpovídá fyzické vzdálenosti odchylky (ft)');
 // A nonzero d8 selects one of eight adjacent directions. Their actual
 // orientation on a map is subject to the GM's battlefield geometry; the
 // d8 and confirmed endpoint remain preserved, never silently fabricated.
 if(df===0)check(same(aimPoint,center),'nulová odchylka musí zasáhnout zamýšlený bod');
 const requiredKeys=['rollsByTarget','impactD4','impactOrigin','threatenedOpponentIds',
  'threatGeometryConfirmed','moraleByOpponent','method'];
 check(areaDice&&typeof areaDice==='object'&&!Array.isArray(areaDice)&&
  Object.keys(areaDice).every(k=>requiredKeys.includes(k)),
  'neznámá položka Area dice nesmí přepsat původ zdroje, Initiative či oběti');
 const blast=previewAlchemyAreaBlast({...areaDice,sequence:seq,characters,inventory,journal,campaignId,
  minute,actorId,finishId,sourceId,center,gmConfirmed:true});
 check(blast.kind===source.elixirName&&blast.vialId===source.vialId&&
  blast.timelineId===seq.timelineId&&blast.round===seq.round,
  'nesoulad fyzické nádoby, účinku a Initiative');
 return {format:ALCHEMY_AREA_SOURCE_STAGE,kind:source.elixirName,sourceId,
  status:'preview-only',readyForCommit:false,
  reason:'Toto je nezapisující zdroj; k potvrzení použijte jedinou ověřenou atomickou bojovou transakci',
  throw:source,blast,aimPoint:structuredClone(aimPoint),center:structuredClone(center),
  sequenceWitness:JSON.stringify(seq)};
}
