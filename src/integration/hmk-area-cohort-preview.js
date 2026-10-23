/** HMK: Roleplaying in the World of Kèthîra, pp.133, 166–169.
 * G04-025: a fail-closed, READ-ONLY preview for multiple Area Fire/Frost
 * victims. This is NOT a source resolver and NOT a commit authority.
 * The eventual Area-source guide must establish the complete target set,
 * attack success, area geometry, strike Impact and round before any write.
 * It must then commit the source and ALL target states atomically.
 */
import {validateCombatState,combatFatigueTotals} from './persistent-combat-state.js';
import {resolveVerifiedAreaProtection,assertAreaProtectionUnchanged} from './hmk-verified-area-protection.js';
import {applyConfirmedAreaStrike} from './hmk-combat-aftereffects.js';
import {liveSpatialEvade} from './hmk-spatial-evasion.js';
import {projectGuidedSpatialPath} from './hmk-guided-spatial-actions.js';
import {availableMasteries} from './hmk-skill-test-engine.js';
const assert=(v,m)=>{if(!v)throw Error(m)};
const valid=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const copy=structuredClone;
const witness=v=>JSON.stringify(v);
function verifiedML(character,name){
 const skills=availableMasteries(character).filter(x=>String(x?.name||'').trim().toLowerCase()===name&&valid(x.ml,0,200));
 assert(skills?.length===1,`Chybí jednoznačná živá ${name} ML`);
 return skills[0].ml;
}
/** Inputs named physical rolls are only previews. No source is inferred from
 * an arbitrary impact value, regardless of the strength of the dice proof. */
export function previewAreaCohort({id,timelineId,round,aspect,strikeImpact,
 targetIds,characters,states,inventory,rollsByTarget,sequence=null,method='weighted'}={}){
 assert(typeof id==='string'&&id&&typeof timelineId==='string'&&timelineId&&valid(round,1,9999),
  'Chybí identita Area zdroje nebo kolo');
 assert(['fire','frost'].includes(aspect)&&valid(strikeImpact,0,999),
  'Neplatný Fire/Frost Impact (pouze nezapisující náhled)');
 assert(Array.isArray(targetIds)&&targetIds.length>0&&targetIds.length<=100&&
  targetIds.every(x=>typeof x==='string'&&x.length>0)&&new Set(targetIds).size===targetIds.length,
  'Cíle Area musí být jednoznačná úplná sada dodaná budoucím ověřeným zdrojem');
 assert(Array.isArray(characters)&&Array.isArray(inventory)&&states&&rollsByTarget&&
  typeof states==='object'&&typeof rollsByTarget==='object',
  'Chybí aktuální postavy, inventář, bojové stavy nebo fyzické hody');
 const results={},newStates={},proofs={},stateWitnesses={};
 for(const targetId of targetIds){
  const matches=characters.filter(c=>c.id===targetId);
  assert(matches.length===1,`Neznámá nebo duplicitní Area postava ${targetId}`);
  const current=states[targetId];validateCombatState(current);
  assert(current.shock!=='KIA',`Cíl ${targetId} je KIA`);
  assert(current.lastRound<=round,`Nelze zapsat Area do minulosti pro ${targetId}`);
  stateWitnesses[targetId]=witness(current);
  const armour=resolveVerifiedAreaProtection({inventory,targetId,method});
  assert(armour.ready,`Area zbroj ${targetId}: ${armour.reason}`);
  const roll=rollsByTarget[targetId];
  const needsShock=strikeImpact>armour.areaAV;
  assert(roll&&typeof roll==='object'&&
   (needsShock?valid(roll.shockD100,1,100):roll.shockD100==null),
   needsShock?`Chybí fyzický Shock d100 pro ${targetId}`:
    `Cíl ${targetId} nemá Effective Impact; Shock d100 se nesmí vynucovat`);
  const dodge=roll.dodgeD100===undefined||roll.dodgeD100===null?null:roll.dodgeD100;
  assert(dodge===null||valid(dodge,1,100),`Neplatný fyzický Dodge d100 pro ${targetId}`);
  assert(roll.compoundD10===undefined||roll.compoundD10===null||valid(roll.compoundD10,1,10),
   `Neplatný Compound Injury d10 pro ${targetId}`);
  // HMK pp.165–166: an already committed Evade lasts through its
  // action and following round. Never accept a free Dodge without the
  // matching durable spatial movement and its Dodge Index provenance.
  const baseShockML=verifiedML(matches[0],'shock');
  const fatigue=combatFatigueTotals(current).total;
  const shockML=Math.max(0,baseShockML-fatigue);
  let dodgeML=null,evadeSourceEventId=null;
  if(dodge!==null){
   assert(sequence,'Cíl '+targetId+': pro Area Dodge chybí skutečná Initiative');
   const ev=liveSpatialEvade(sequence,{targetId,targetState:current});
   assert(ev.active,'Cíl '+targetId+': chybí předchozí uložená Evade akce');
   const proof=sequence.spatialEvents?.find(e=>e.id===ev.sourceEventId&&e.actorId===targetId);
   const projection=proof?.projection;
   const completed=sequence.log?.some(e=>e.type==='turn-complete'&&e.actorId===targetId&&
    e.round===proof?.round&&e.action==='evade'&&e.spatialEventId===proof.id)||
    sequence.log?.some(e=>e.type==='proactive-area-evade'&&e.actorId===targetId&&
     e.sourceEventId===id&&e.round===round&&e.spatialEventId===proof?.id&&
     e.alreadyMoved===true&&e.dueRound>=round&&e.dueRound<=round+1);
   assert(completed&&projection?.format==='hmk-guided-spatial-projection-v1'&&
    typeof projection.battlefieldWitness==='string'&&projection.actualFt>=10,
    'Area Evade nemá kompletní trvalý prostorový důkaz a spotřebovaný tah');
   const snapshot=JSON.parse(projection.battlefieldWitness);
   const actual=projectGuidedSpatialPath({actorId:targetId,
    battlefield:{units:snapshot.units,barriers:snapshot.barriers},
    path:projection.requestedPath,action:'evade',effectiveMove:projection.effectiveMove,
    dodgeIndex:ev.index,difficultSources:projection.difficultSources,
    stunned:projection.terrainFactor/(2**projection.difficultSources)>1});
   assert(witness(actual)===witness(projection)&&
    Math.hypot((sequence.spatialUnits?.find(u=>u.id===targetId)?.x??Infinity)-projection.finalPosition.x,
     (sequence.spatialUnits?.find(u=>u.id===targetId)?.y??Infinity)-projection.finalPosition.y)<1e-7,
    'Area Evade má podvrženou trasu nebo se záznam neshoduje s aktuální polohou');
   // Narrow proven case only. Wounded, encumbered and other modified Dodge
   // checks require the complete future effective-Dodge gate.
   assert(current.wounds.length===0&&
    !inventory.some(x=>x.characterId===targetId&&['armour','shield'].includes(x.snapshot?.category)&&x.slot!=='none'),
    'Area Dodge se zraněním nebo nespočteným ENC vyžaduje úplný modifikátor');
   dodgeML=Math.max(0,verifiedML(matches[0],'dodge')-fatigue);
   assert(Math.floor(dodgeML/10)===ev.index,'Dodge EML neodpovídá uloženému Evade Indexu');
   evadeSourceEventId=ev.sourceEventId;
  }
  // Even a successful target preview cannot create a persisted Area source.
  const out=applyConfirmedAreaStrike({state:current,round,eventId:`${id}:area:${targetId}`,
   strikeImpact,areaAV:armour.areaAV,aspect,dodgeML,dodgeRoll:dodge,
   shockML,shockRoll:roll.shockD100??null,compoundD10:roll.compoundD10??null,gmConfirmed:true});
  newStates[targetId]=out.state;
  results[targetId]={result:out.result,areaAV:armour.areaAV,baseShockML,fatigue,shockEML:shockML,dodgeML,
   evadeSourceEventId,physicalDice:[...(dodge===null?[]:[{id:'evadeDodgeD100',faces:100,value:dodge}]),
    ...(roll.compoundD10==null?[]:[{id:'compoundD10',faces:10,value:roll.compoundD10}]),
    ...(needsShock?[{id:'shockD100',faces:100,value:roll.shockD100}]:[])]};
  proofs[targetId]=armour;
 }
 assert(Object.keys(rollsByTarget).length===targetIds.length&&
  Object.keys(rollsByTarget).every(k=>targetIds.includes(k)),
  'Hody nesmějí obsahovat jiný ani vynechaný Area cíl');
 return {format:'hmk-area-cohort-preview-v1',status:'preview-only',mutatesCharacter:false,
  readyForCommit:false,reason:'Chybí ověřený původ Area útoku, jeho geometrie a atomická transakce celého seznamu',
  id,timelineId,round,aspect,strikeImpact,targetIds:[...targetIds],
  stateWitnesses,armourProofs:proofs,results,stagedStates:newStates};
}
/** Fail if a target state/equipment changed while the GM supplied physical dice.
 * This never turns the preview into a write permission. */
export function assertAreaCohortUnchanged(preview,{states,inventory}={}){
 assert(preview?.format==='hmk-area-cohort-preview-v1'&&preview.status==='preview-only'&&
  preview.readyForCommit===false,'Náhled Area není autoritou pro zápis');
 for(const id of preview.targetIds){
  validateCombatState(states?.[id]);
  assert(witness(states[id])===preview.stateWitnesses[id],`Area stav ${id} se změnil`);
  assertAreaProtectionUnchanged(preview.armourProofs[id],{inventory,targetId:id});
 }
 return true;
}
