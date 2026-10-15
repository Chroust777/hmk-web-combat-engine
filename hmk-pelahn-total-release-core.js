/** HMK Kethira v1.2 pp.190, 202-204: ONE Pèleáhn Total Release consequence
 * composer for already verified Doom Flame VI and Pyre III physical journeys.
 * Never generates dice, never writes storage and cannot confirm a partial state.
 * Its caller MUST replay its full staged GM transcript against the live document.
 */
import {validateCombatState,dueInjuryMorale} from './persistent-combat-state.js';
import {validateEncounterSequence,currentEncounterActor,finishEncounterTurn} from './encounter-turn-sequence.js';
import {successLevel,SL} from '../rules/tests.js';
import {appendPelahnBurstSource,listPelahnBurstSources} from './hmk-pelahn-burst-registry.js';
const cp=structuredClone,whole=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const check=(x,m)=>{if(!x)throw Error(m)};
const labels={0:'CF',1:'F',2:'S',3:'CS'};
/** Pure composer, not a second persistence path. */
export function composeVerifiedPelahnTotalRelease({document,stage,spell,complexity,castingFatigue}={}){
 check((spell==='Doom Flame'&&complexity===6)||(spell==='Pyre'&&complexity===3),
  'Total Release vyžaduje tištěnou Complexity daného Pèleáhn kouzla');
 check(stage?.misfireD100===100&&
  ['total-release-hyperburst-pending','total-release-shade-pending'].includes(stage.phase)&&
  whole(stage.castingRoll,1,100)&&
  whole(stage.totalReleaseSpiritRoll,1,100)&&whole(castingFatigue,0,100),
  'Total Release není dokončen nebo chybí fyzický Spirit d100');
 const seq=validateEncounterSequence(document?.combatRuntime?.sequence);
 check(seq.active&&currentEncounterActor(seq)===stage.casterId&&
  seq.round+complexity-1<=9999,
  'Total Release: neplatný aktivní Incant nebo přesah časové osy');
 const caster0=document.characters.find(c=>c.id===stage.casterId);
 check(caster0?.hmk?.arcane?.primaryConvocation==='Pèleáhn'&&
  caster0.hmk.arcane.knownSpells?.includes(spell),'Total Release: neodpovídá původní kouzlo');
 const spirit0=caster0.hmk.skills?.filter(s=>String(s.name).trim().toLowerCase()==='spirit');
 check(spirit0?.length===1&&spirit0[0].ml===stage.totalReleaseSpiritML,
  'Total Release: neplatná původní Spirit ML');
 const currentSL=labels[successLevel(stage.totalReleaseSpiritRoll,stage.totalReleaseSpiritEML)];
 check(currentSL===stage.totalReleaseSpiritSL,'Total Release: podvržený Spirit SL');
 const isShade=currentSL==='CF';
 const count={CF:0,F:6,S:4,CS:2}[currentSL];
 const dice=stage.totalReleaseSpiritLossDice;
 check(whole(stage.totalReleaseSpiritEML,0,200)&&
  Array.isArray(dice)&&dice.length===count&&dice.every(d=>whole(d,1,6))&&
  stage.totalReleaseSpiritLossCount===count&&
  dice.reduce((a,b)=>a+b,0)===stage.totalReleaseSpiritMLLoss,
  'Total Release: chybí všechny fyzické Spirit loss d6');
 const out=cp(document),caster=out.characters.find(c=>c.id===stage.casterId);
 const state=caster.hmk.combatState;
 validateCombatState(state);
 check(dueInjuryMorale(state).length===0,'Total Release: splatná Morale');
 check(!caster.hmk.arcane.activeMisfireWarp&&!caster.hmk.arcane.pendingPsycheTraitChoice,
  'Total Release: přítomna nevyřešená předchozí Psyche povinnost');
 const prior=caster.hmk.arcane.auralShockLevels??0;
 check(!caster.hmk.arcane.shade,'Total Release: již existující Shade se nemůže znovu fyzicky proměnit');
 check(whole(prior,0,99)&&prior+count<=99&&
  whole(state.morale.psycheStress,0,99999),'Total Release: neověřený Aural Shock/Psyche stav');
 if(!isShade)caster.hmk.arcane.auralShockLevels=prior+count;
 state.fatigue.windedness+=castingFatigue;
 state.fatigue.otherWeakness+=count*5;
 state.morale.psycheStress+=3;
 state.events.push({id:stage.id+':total-release',round:seq.round,type:'hmk-spell-total-release',
  details:{spell,complexity,misfire:100,castingD100:stage.castingRoll,
   castingFatigue,spiritD100:stage.totalReleaseSpiritRoll,spiritSL:currentSL,
   spiritLossDice:cp(dice),spiritMLLoss:stage.totalReleaseSpiritMLLoss,
   auralShock:count,weaknessFatigue:count*5,psycheStress:3,sourceEventId:stage.id}});
 state.lastRound=Math.max(state.lastRound,seq.round);
 caster.hmk.skills.filter(s=>String(s.name).trim().toLowerCase()==='spirit')[0].ml=
  Math.max(0,spirit0[0].ml-stage.totalReleaseSpiritMLLoss);
 caster.hmk.arcane.knownSpells=caster.hmk.arcane.knownSpells.filter(s=>s!==spell);
 caster.hmk.arcane.misfireLostSpells??=[];
 check(!caster.hmk.arcane.misfireLostSpells.includes(spell),'Total Release: duplicitní ztráta kouzla');
 caster.hmk.arcane.misfireLostSpells.push(spell);
 // Total Release's PSY 3 needs a persistent, unresolved trait choice.
 // Distortion's extra CF digits are NOT a Total Release consequence (p.203).
 caster.hmk.arcane.pendingPsycheTraitChoice={sourceEventId:stage.id,levels:3};
 // Spirit CF: the mortal body is extinguished; the soul is a Shade in the
 // astralscape. Preserve the same character identity, possessions and logs.
 // Astral Spirit Actions require a distinct verified astralscape encounter.
 if(isShade){
  caster.hmk.arcane.shade={format:'hmk-spirit-shade-v1',sourceEventId:stage.id,
   originTimelineId:seq.timelineId,originRound:seq.round,convocation:'Pèleáhn',
   physicalBody:'puff-of-smoke',spiritWorld:true,
   astralActionsEnabled:false,gmDispositionRequired:true};
  state.shock='KIA';state.shockFollowup=null;state.extendedShock=null;
  state.coma=null;state.bloodShockPending=false;
  if(state.posture)state.posture.passNextTurn=false;
  if(state.morale?.specialPending)state.morale.specialPending=[];
  for(const wound of state.wounds)wound.nextAdvanceRound=null;
  state.events.push({id:stage.id+':shade',round:seq.round,type:'hmk-total-release-shade',
   details:{spiritSL:'CF',physicalBody:'puff-of-smoke',
    spiritWorld:true,sourceEventId:stage.id,
    physicalDice:[{faces:100,value:stage.castingRoll,source:'GM-entered-physical-die'},
     {faces:100,value:100,source:'GM-entered-physical-die'},
     {faces:100,value:stage.totalReleaseSpiritRoll,source:'GM-entered-physical-die'}]}});
 }
 validateCombatState(state);
 const originalPos=seq.spatialUnits?.filter(x=>x.id===stage.casterId&&
  Number.isFinite(x.x)&&Number.isFinite(x.y));
 check(originalPos?.length===1,'Total Release: není skutečná poloha sesilatele');
 const center={x:originalPos[0].x,y:originalPos[0].y};
 const next=appendPelahnBurstSource(seq,{format:'hmk-pelahn-burst-source-v1',id:stage.id,casterId:stage.casterId,
  spell,complexity,durationRounds:complexity,startRound:seq.round,
  endRound:seq.round+complexity-1,center});
 const physicalDice=[{faces:100,value:stage.castingRoll,source:'GM-entered-physical-die'},
  {faces:100,value:100,source:'GM-entered-physical-die'},
  {faces:100,value:stage.totalReleaseSpiritRoll,source:'GM-entered-physical-die'},
  ...dice.map(value=>({faces:6,value,source:'GM-entered-physical-die'}))];
 next.log.push({type:'pelahn-total-release-source',eventId:stage.id,actorId:stage.casterId,
  spell,complexity,durationRounds:complexity,round:seq.round,center:cp(center),
  startRound:seq.round,endRound:seq.round+complexity-1,gmEnteredDice:true,physicalDice:cp(physicalDice),
  shadeTransformation:isShade});
 if(isShade)next.log.push({type:'pelahn-total-release-shade',eventId:stage.id,actorId:stage.casterId,
  round:seq.round,spiritD100:stage.totalReleaseSpiritRoll,gmEnteredDice:true,
  physicalBody:'puff-of-smoke',spiritWorld:true});
 if(spell==='Pyre'){
  const task=seq.commitments?.[stage.casterId];
  check(task?.status==='completed'&&task.completedRound===seq.round&&
   task.durationRounds===1,'Pyre Total Release: není ukončen původní spellstart');
  next.log.push({type:'spell-pyre-total-release',eventId:stage.id,actorId:stage.casterId,
   round:seq.round,spell,spellstartRound:task.startRound,castingEML:stage.eml,
   castingSL:'CF',castingFatigue,effect:false,misfireKind:'total-release',
   crucial:true,misfirePsycheStress:3,misfireAuralShock:count,
   totalReleaseSpiritSL:currentSL,totalReleaseSpiritMLLoss:stage.totalReleaseSpiritMLLoss,
   physicalDice:cp(physicalDice)});
 }
 // Spellfire is resolved during this IR. Its Fatal/Spirit-CF status takes
 // effect immediately AFTER validating the completed Incant's physical dice.
 const finishStates=Object.fromEntries(out.characters.map(c=>[c.id,c.hmk?.combatState]));
 if(isShade)finishStates[stage.casterId]={...state,shock:caster0.hmk.combatState.shock};
 const completed=finishEncounterTurn(validateEncounterSequence(next),finishStates,
  {action:'incant',gmConfirmed:true});
 check(!completed.pendingEndTurnAction,'Total Release: nevyřešené povinnosti po Incant');
 out.combatRuntime.sequence=validateEncounterSequence(completed);
 out.combatRuntime.clock={round:completed.round,actorId:currentEncounterActor(completed)||''};
 const jid='total-release:'+stage.id;
 check(!out.journal.some(x=>x.id===jid),'Total Release: duplicitní potvrzení');
 out.journal.push({id:jid,characterId:stage.casterId,createdAt:new Date().toISOString(),
  title:`HMK Pèleáhn Total Release — ${spell}`,
  body:isShade?`Misfire 100, Spirit CF: smrtelné tělo přeměněno na elementární oheň; duše Shade ve Spirit World. Psyche Stress +3 a Raw Pèleáhn Hyper Burst na ${complexity} kola; astrální akce zůstávají mimo fyzickou Initiative.`:
   `Misfire 100, Spirit ${currentSL}, ztráta Spirit ML ${stage.totalReleaseSpiritMLLoss}, Aural Shock +${count}, Weakness +${count*5}, Psyche Stress +3; Hyper Burst na ${complexity} kola.`,
  combatProof:{actionKind:'pelahn-total-release',sourceEventId:stage.id,spell,complexity,
   durationRounds:complexity,auralShock:count,weaknessFatigue:5*count,
   spiritLossD6:cp(dice),shadeTransformation:isShade,physicalDice:cp(physicalDice)}});
 return out;
}
