/** HârnMaster v1.2 pp.268–269,271–272,274.
 * Strict NON-WRITING stage for Eruption / Fumebomb / Weakness.
 * A valid preflight is not a completed throw, battle action, or persistence
 * authority. It never removes a container, advances Initiative or edits a PC.
 * Target selection uses existing verified Initiative coordinates only.
 */
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';
import {validateEncounterSequence} from './encounter-turn-sequence.js';
import {validateCombatState,applyConfirmedAlchemyFumebombShock,applyConfirmedAlchemyWeakness} from './persistent-combat-state.js';
import {previewAreaCohort} from './hmk-area-cohort-preview.js';
import {registerSpecialMorale,resolveSpecialMorale} from './hmk-guided-special-morale.js';
import {strengthImpactModifier} from '../rules/weapon-modes.js';
import {strengthEncumbranceModifier} from '../rules/encumbrance.js';
import {availableMasteries} from './hmk-skill-test-engine.js';
import {effectiveSpatialBarriers,pathCrossesClosedBarrier} from './hmk-guided-spatial-barriers.js';
const check=(b,m)=>{if(!b)throw Error('Alchemy Area: '+m)};
const integer=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1000000;
const point=p=>p&&finite(p.x)&&finite(p.y);
const clone=structuredClone;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const diceOrigin=o=>o==='manual'||o==='cryptographic-software-die';
const kinds=Object.freeze({Eruption:{radiusFt:5,sourcePage:271},Fumebomb:{radiusFt:5,sourcePage:272},Weakness:{radiusFt:10,sourcePage:274}});
function oneSkill(character,name){
 const found=availableMasteries(character).filter(x=>x.name.toLowerCase()===name.toLowerCase());
 check(found.length===1&&integer(found[0].ml,1,200),
  'chybí jednoznačné živé '+name+' ML pro '+character?.id);
 return found[0].ml;
}
/** Geometric LOS occlusion, WITHOUT altering the authoritative line-of-sight
 * consumers. A smoke circle blocks any segment with nonzero interior overlap.
 * Tangential contact alone does not imply LOS loss. */
export function fumebombSegmentObscured(from,to,center,radiusFt=5){
 check(point(from)&&point(to)&&point(center)&&finite(radiusFt)&&radiusFt>0,'neplatná geometrie kouře');
 const vx=to.x-from.x,vy=to.y-from.y,dd=vx*vx+vy*vy;
 if(dd===0)return dist(from,center)<radiusFt-1e-7;
 const t=Math.max(0,Math.min(1,((center.x-from.x)*vx+(center.y-from.y)*vy)/dd));
 return dist({x:from.x+vx*t,y:from.y+vy*t},center)<radiusFt-1e-7;
}
export function fumebombSmokeActive({originRound,nowRound}={}){
 check(integer(originRound,1,9999)&&integer(nowRound,1,9999),'neplatné bojové kolo kouře');
 return nowRound===originRound;
}
/** No GM-supplied target list is trusted as authoritative: the existing
 * encounter's complete positioned roster is the only area target source.
 * Dice supplied for an omitted or extra victim always reject the stage.
 */
export function previewAlchemyAreaBlast({sequence,characters=[],inventory=[],journal=[],campaignId,
 minute,actorId,finishId,sourceId,center,gmConfirmed=false,rollsByTarget={},
 impactD4=null,impactOrigin=null,threatenedOpponentIds=[],threatGeometryConfirmed=false,
 moraleByOpponent={},
 method='weighted'}={}){
 check(gmConfirmed===true&&typeof sourceId==='string'&&sourceId.length>=3&&
  typeof campaignId==='string'&&campaignId&&integer(minute,0,1e9)&&
  typeof actorId==='string'&&actorId&&point(center),'chybí potvrzený skutečný zdroj, GM čas nebo geometrie');
 const seq=validateEncounterSequence(sequence);
 check(seq.active===true&&seq.order?.[seq.cursor]===actorId,'použití vyžaduje právě aktivního účastníka Initiative');
 const dose=alchemyElixirStrength(journal,campaignId,finishId,minute);
 const kind=dose.elixirName,rule=kinds[kind];
 check(!!rule,'pouze originální Eruption, Fumebomb a Weakness');
 check(dose.currentAS>0&&!dose.dispersed&&!dose.imbibingId&&
  (!dose.nextDueMinute||dose.nextDueMinute>minute),'neúčinná nebo splatná nevyhodnocená Decay');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 check(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot),'chybí plná dostupná originální lahvička');
 check(inventory.filter(i=>i.id===vial.vialId&&i.characterId===actorId&&i.quantity===1&&i.slot===vial.slot).length===1,
  'lahvička neodpovídá skutečnému inventáři');
 const binding=journal.find(r=>r.id===vial.bindingId)?.calendarAlchemyVialBinding;
 check(binding&&(kind==='Fumebomb'?binding.gasConfirmed===true&&binding.liquidConfirmed===false:
  binding.liquidConfirmed===true&&!binding.gasConfirmed),'Fumebomb musí být doloženým plynem, ostatní elixíry tekutinou');
 check(Array.isArray(seq.spatialUnits)&&seq.spatialUnits.length===seq.order.length&&
  seq.order.every(id=>seq.spatialUnits.filter(u=>u.id===id&&point(u)).length===1),
  'nelze automaticky určit všechny cíle bez úplné mapy Initiative');
 check(Array.isArray(characters)&&seq.order.every(id=>characters.filter(c=>c.id===id).length===1),
  'neúplný seznam původních postav střetnutí');
 const barriers=effectiveSpatialBarriers(seq);
 const radiusFt=rule.radiusFt,areaIds=seq.spatialUnits.filter(u=>dist(u,center)<=radiusFt+1e-7).map(u=>u.id);
 // Only a wall/closed door actually separating the explosion from a target
 // is ambiguous. Do not prohibit unrelated obstacles elsewhere on the map.
 for(const id of areaIds){
  const u=seq.spatialUnits.find(p=>p.id===id);
  check(!pathCrossesClosedBarrier([center,u],barriers),
   'výbuch za fyzickou stěnou / zavřenými dveřmi vyžaduje GM rozhodnutí o šíření: '+id);
 }
 const results={},stagedStates={},stagedCharacters={};
 check(rollsByTarget&&typeof rollsByTarget==='object'&&!Array.isArray(rollsByTarget)&&
  Object.keys(rollsByTarget).length===areaIds.length&&
  Object.keys(rollsByTarget).every(id=>areaIds.includes(id)),
  'hody musí odpovídat přesně všem zasaženým postavám');
 if(kind==='Eruption'){
  check(integer(impactD4,1,4)&&diceOrigin(impactOrigin),'nutný skutečný Impact d4 a jeho původ');
  const strikeImpact=impactD4+dose.currentAS;
  if(areaIds.length){
   const stateMap=Object.fromEntries(characters.map(c=>[c.id,c.hmk?.combatState]));
   const result=previewAreaCohort({id:sourceId,timelineId:seq.timelineId,round:seq.round,
    aspect:'fire',strikeImpact,targetIds:areaIds,characters,states:stateMap,inventory,
    rollsByTarget,sequence:seq,method});
   Object.assign(results,result.results);Object.assign(stagedStates,result.stagedStates);
  }
  check(Array.isArray(threatenedOpponentIds)&&new Set(threatenedOpponentIds).size===threatenedOpponentIds.length&&
   threatenedOpponentIds.every(id=>seq.order.includes(id)&&id!==actorId)&&threatGeometryConfirmed===true,
   'Eruption: GM musí určit všechny blízké ohrožené protivníky pro povinnou Morale (i mimo výbuch)');
  // Eruption's unusual explosion triggers Special Morale for confirmed nearby
  // threatened opponents, even those OUTSIDE the Fire radius (HMK p.271).
  // Use the existing p.162 Special Morale registration AND actual Initiative
  // resolution rather than inventing a new Morale state or skipping dice.
  check(moraleByOpponent&&typeof moraleByOpponent==='object'&&!Array.isArray(moraleByOpponent)&&
   Object.keys(moraleByOpponent).length===threatenedOpponentIds.length&&
   Object.keys(moraleByOpponent).every(id=>threatenedOpponentIds.includes(id)),
   'Eruption: nutný přesně jeden doložený Morale Roll každého ohroženého protivníka');
  let moraleSeq=seq;
  const moraleResults={};
  if(threatenedOpponentIds.length){
   for(const id of threatenedOpponentIds){
    const mr=moraleByOpponent[id];
    check(mr&&integer(mr.initiativeD100,1,100)&&mr.origin==='manual'&&
     integer(mr.aberrance,0,200)&&Object.keys(mr).length===3,
     'Eruption: Special Morale vyžaduje skutečný Initiative d100, fyzický původ a GM doloženou Aberrance pro '+id);
   }
   const originalStates=Object.fromEntries(characters.map(c=>[c.id,c.hmk.combatState]));
   const allStates={...originalStates,...stagedStates};
   const participants=characters.map(character=>({character,state:allStates[character.id]}));
   const registered=registerSpecialMorale({sequence:seq,participants,
    observerIds:threatenedOpponentIds,kind:'battlefield-event',
    incidentRef:sourceId,description:'Eruption explosion threatens nearby opponents',
    facts:{elixir:'Eruption',sourceId,blastCenter:clone(center),radiusFt,
     threatGeometryConfirmed:true},eventId:`${sourceId}:special-morale`,gmConfirmed:true});
   moraleSeq=registered.sequence;
   Object.assign(stagedStates,registered.states);
   for(const id of threatenedOpponentIds){
    const character=characters.find(c=>c.id===id),mr=moraleByOpponent[id];
    const resolved=resolveSpecialMorale({sequence:moraleSeq,character,state:stagedStates[id],
     roll:mr.initiativeD100,aberrance:mr.aberrance,eventId:`${sourceId}:morale:${id}`});
    stagedStates[id]=resolved.state;
    moraleSeq=resolved.sequence;
    moraleResults[id]={physicalDice:{initiativeD100:mr.initiativeD100,
     origin:mr.origin},aberrance:mr.aberrance,result:resolved.result};
   }
  }
  return {format:'hmk-alchemy-area-preflight-v1',status:'preview-only',readyForCommit:false,
   reason:'Pouze nezapisující pravidlový náhled; vlastní zápis vyžaduje ověřenou fyzickou Area source a jedinou atomickou transakci', 
   kind,sourceId,finishId,actorId,vialId:vial.vialId,as:dose.currentAS,minute,campaignId,
   timelineId:seq.timelineId,round:seq.round,center:clone(center),radiusFt,targetIds:areaIds,
   threatenedOpponentIds:[...threatenedOpponentIds],moraleRollsRequired:threatenedOpponentIds,
   strikeImpact,impactD4,impactOrigin,results,moraleResults,stagedStates,
   proposedMoraleSequence:moraleSeq,sourcePage:rule.sourcePage};
 }
 check(impactD4===null&&impactOrigin===null,'Fire Impact d4 je pouze pro Eruption');
 check(threatenedOpponentIds.length===0&&threatGeometryConfirmed===false&&
  moraleByOpponent&&Object.keys(moraleByOpponent).length===0,
  'povinná Morale mimo výbuch patří jen Eruption');
 for(const id of areaIds){
  const c=characters.find(x=>x.id===id),s=c?.hmk?.combatState;
  validateCombatState(s);
  check(s.shock!=='KIA'&&s.lastRound<=seq.round,'neplatný cíl nebo starší bojové kolo '+id);
  const roll=rollsByTarget[id];check(roll&&typeof roll==='object','chybí údaje cíle '+id);
  if(kind==='Fumebomb'){
   check(integer(roll.shockD100,1,100)&&diceOrigin(roll.origin)&&Object.keys(roll).length===2,
    'Fumebomb: každý zasažený musí mít skutečný Shock d100 a původ');
   const ml=oneSkill(c,'Shock');
   const p=applyConfirmedAlchemyFumebombShock({state:s,round:seq.round,
    eventId:`${sourceId}:smoke:${id}`,sourceId,timelineId:seq.timelineId,shockML:ml,
    as:dose.currentAS,d100:roll.shockD100,origin:roll.origin,gmConfirmed:true});
   stagedStates[id]=p.state;
   results[id]={shockML:ml,penalty:dose.currentAS*5,roll:roll.shockD100,origin:roll.origin,
    ...p.result};
  }else{
   check(Object.keys(roll).length===0,'Weakness: zásah nevyžaduje vymyšlené hody cíle');
   const before=c.hmk.attributes?.str;
   check(integer(before,1,200),'Weakness: neověřený skutečný STR '+id);
   const reduction=Math.round(dose.currentAS/2),after=before-reduction;
   check(after>=1,'Weakness: STR <=0 nemá dokončenou návaznost pro Heft/ENC/Impact; nutný GM výklad');
   const modified=clone(c);modified.hmk.attributes.str=after;
   stagedCharacters[id]=modified;
   const lossEvent=applyConfirmedAlchemyWeakness({state:s,round:seq.round,
    eventId:`${sourceId}:weakness:${id}`,sourceId,timelineId:seq.timelineId,
    as:dose.currentAS,strengthBefore:before,gmConfirmed:true});
   stagedStates[id]=lossEvent.state;
   results[id]={strengthBefore:before,strengthAfter:after,strengthReduction:reduction,
    strengthMLBefore:before*5,strengthMLAfter:after*5,
    strengthImpactBefore:strengthImpactModifier(before),strengthImpactAfter:strengthImpactModifier(after),
    strengthENCBefore:strengthEncumbranceModifier(before),strengthENCAfter:strengthEncumbranceModifier(after),
    shockPenaltyFromStrengthLoss:0,heftUsesLiveSTR:true,drawUsesLiveSTR:true,
    duration:'instantaneous; no automatic expiry specified in HMK p.274'};
  }
 }
 return {format:'hmk-alchemy-area-preflight-v1',status:'preview-only',readyForCommit:false,
  reason:'Pouze nezapisující pravidlový náhled; vlastní zápis vyžaduje ověřenou fyzickou Area source a jedinou atomickou transakci',
  kind,sourceId,finishId,actorId,vialId:vial.vialId,as:dose.currentAS,minute,campaignId,
  timelineId:seq.timelineId,round:seq.round,center:clone(center),radiusFt,targetIds:areaIds,
  results,stagedStates,stagedCharacters,smoke:kind==='Fumebomb'?{originRound:seq.round,
   throughRound:seq.round,center:clone(center),radiusFt,blocksLOS:true}:null,
  sourcePage:rule.sourcePage};
}
