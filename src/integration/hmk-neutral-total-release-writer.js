/** HMK v1.2 pp.200–204, 251,255. First NATIVE CAS Neutral Total Release
 * transaction. Deliberately limited to Neutral Detect (CL I), its ONE actual
 * Vortex tick, non-Shade Spirit, and a tick with no continuing suppression.
 * No GM-only nonalchemical sources or concentration shielding may be
 * laundered into an authoritative source/history claim. Unsupported cases
 * fail without writing any part of Spirit, Initiative or Journal.
 */
import {preflightNeutralTotalReleaseChain} from './hmk-neutral-total-release-chain.js';
import {confirmConcentrationCompletion,startEncounterTurn,finishEncounterTurn,
 currentEncounterActor,validateEncounterSequence} from './encounter-turn-sequence.js';
import {validateCombatState} from './persistent-combat-state.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
import {validateNeutralAlchemyHistory,validateNeutralAlchemyCombatLinks} from './hmk-alchemy-neutral-history.js';
const js=JSON.stringify,cp=structuredClone;
const must=(ok,what)=>{if(!ok)throw Error('Neutral Total Release writer: '+what)};
const die=(faces,value)=>({faces,value,source:'GM-entered-physical-die'});
/** Only a closed one-tick storm with NO persistent suppressions can yet be
 * fully committed. Every physical die must be present in the proof. */
export function prepareNeutralTotalReleaseCommit({document,createdAt=new Date().toISOString(),gmNoOtherArcaneSourcesConfirmed=false,...input}={}){
 must(typeof createdAt==='string'&&!Number.isNaN(Date.parse(createdAt)),'neplatné datum');
 const original=js(document);
 const proof=preflightNeutralTotalReleaseChain({document,...input});
 const tick=proof.storm.ticks[0];
 must(proof.casting.complexity===1&&proof.spell==='Detect'&&proof.storm.processedTicks===1,
  'zapisovat lze zatím jen kompletní jednokolový Neutral Detect/Vortex');
 must(proof.spirit.shade!==true&&proof.spirit.spiritSL!=='CF',
  'Spirit CF / Shade dosud vyžaduje původní zvláštní writer');
 must(gmNoOtherArcaneSourcesConfirmed===true&&
  proof.storm.campaignCensusAudit?.externalArcaneSourceIds?.length===0&&
  tick.gmOnlyPositionSourceIds.length===0,
  'všechny zdroje a jejich pozice musí být historicky doložené v Initiative');
 must(tick.shieldingEvidence===null&&tick.hiddenFromCentreSelectionIds.length===0,
  'chybí původní historický koncentrací skrývaný zdroj');
 must(tick.outcome.outcomes.every(e=>e.successLevel==='S'&&e.suppressed===false)&&
  Object.keys(proof.storm.suppressions).length===0&&
  tick.outcome.casterPsycheStress===0,
  'potlačení, obnovení magie a CS stres vyžadují originální lifecycle writer');
 must(!document.journal.some(j=>j.id==='neutral-total-release:'+proof.eventId||
  j.calendarNeutralTotalRelease?.spellstartId===proof.spellstartId),
  'Total Release nebo původní Spellstart již byly využity');
 const out=cp(document),actor=out.characters.find(c=>c.id===proof.casterId);
 const state=actor.hmk.combatState,arc=actor.hmk.arcane;
 const prior=arc.auralShockLevels??0,shock=proof.spirit.auralShock;
 must(Number.isSafeInteger(prior)&&prior>=0&&prior+shock<=99&&
  Number.isSafeInteger(state.fatigue.windedness)&&state.fatigue.windedness+proof.casting.castingFatigue<=99999&&
  Number.isSafeInteger(state.fatigue.otherWeakness)&&state.fatigue.otherWeakness+shock*5<=99999&&
  Number.isSafeInteger(state.morale.psycheStress)&&state.morale.psycheStress+3<=99999&&
  !arc.pendingPsycheTraitChoice&&!(arc.misfireLostSpells??[]).includes('Neutral::Detect'),
  'nepřipravený Combat State, Psyche nebo ztracené kouzlo');
 const skill=actor.hmk.skills.filter(s=>String(s.name).trim().toLowerCase()==='spirit');
 must(skill.length===1&&skill[0].ml===proof.spirit.spiritML,
  'změnila se původní Spirit ML');
 skill[0].ml=proof.spiritMLAfter;
 arc.auralShockLevels=prior+shock;
 arc.misfireLostSpells??=[];arc.misfireLostSpells.push('Neutral::Detect');
 arc.pendingPsycheTraitChoice={sourceEventId:proof.eventId,levels:3};
 state.fatigue.windedness+=proof.casting.castingFatigue;
 state.fatigue.otherWeakness+=shock*5;
 state.morale.psycheStress+=3;
 state.events.push({id:proof.eventId+':total-release',round:proof.spellfireRound,
  type:'hmk-spell-total-release',details:{spell:'Neutral::Detect',complexity:1,
   sourceEventId:proof.eventId,castingD100:proof.casting.castingD100,
   misfire:100,castingFatigue:proof.casting.castingFatigue,
   spiritD100:proof.spirit.spiritD100,spiritSL:proof.spirit.spiritSL,
   spiritLossDice:cp(proof.spirit.lossD6),spiritMLLoss:proof.spirit.spiritMLLoss,
   auralShock:shock,weaknessFatigue:shock*5,psycheStress:3}});
 state.lastRound=Math.max(state.lastRound,proof.spellfireRound);
 validateCombatState(state);
 const states=Object.fromEntries(out.characters.filter(c=>c.hmk?.combatState)
  .map(c=>[c.id,validateCombatState(c.hmk.combatState)]));
 let sequence=validateEncounterSequence(document.combatRuntime.sequence);
 // Completion's eligibility must be evaluated against the state BEFORE
 // Spirit and fatigue, precisely as at an ordinary Neutral spellfire.
 const beforeStates=Object.fromEntries(document.characters.filter(c=>c.hmk?.combatState)
  .map(c=>[c.id,validateCombatState(c.hmk.combatState)]));
 sequence=confirmConcentrationCompletion(sequence,beforeStates,{actorId:proof.casterId,gmConfirmed:true});
 sequence=startEncounterTurn(sequence,beforeStates);
 must(currentEncounterActor(sequence)===proof.casterId,'nenastal originální Incant turn');
 const dice=[die(100,proof.casting.castingD100),die(100,100),
  die(100,proof.spirit.spiritD100),...proof.spirit.lossD6.map(d=>die(6,d))];
 const roundDice=cp(input.ticks[0].rolls).map(x=>({sourceId:x.sourceId,d100:x.d100,
  ...(x.d20!=null?{d20:x.d20}:{})}));
 const selection=proof.storm.ticks[0].sourceSelection.selectionDie;
 const vortex={roundOffset:0,sourceCensus:cp(input.sourceCensus),
  tickSources:cp(input.ticks[0].sources),gmNoOtherArcaneSourcesConfirmed:true,
  originalCenter:cp(proof.storm.initialPosition),
  resolvedCenter:cp(tick.outcome.centre),radiusBeforeFeet:tick.outcome.radiusBeforeFeet,
  radiusNextFeet:tick.outcome.radiusNextFeet,sourceIds:cp(proof.storm.sourceIds),
  selectedSourceId:tick.outcome.selectedSourceId,selectionDie:selection?cp(selection):null,
  physicalRolls:roundDice,outcomes:cp(tick.outcome.outcomes),
  wardBlockedSourceIds:cp(tick.outcome.wardBlockedSourceIds),
  ended:true,continuingSuppressions:[]};
 sequence.log.push({type:'neutral-incant-spellfire-total-release',eventId:proof.eventId,
  actorId:proof.casterId,round:proof.spellfireRound,spell:'Detect',
  spellstartId:proof.spellstartId,castingSL:'CF',castingEML:proof.casting.castingEML,
  castingFatigue:proof.casting.castingFatigue,physicalDice:cp(dice),vortex:cp(vortex),
  spiritSL:proof.spirit.spiritSL,spiritMLLoss:proof.spirit.spiritMLLoss});
 sequence=finishEncounterTurn(sequence,states,{action:'incant',gmConfirmed:true});
 must(!sequence.pendingEndTurnAction,'nevyřešené povinnosti na konci Incant');
 out.combatRuntime.sequence=sequence;
 out.combatRuntime.clock={round:sequence.round,actorId:currentEncounterActor(sequence)||''};
 const campaignId=document.campaignClock.campaignId??document.campaignClock.id;
 out.journal.push({id:'neutral-total-release:'+proof.eventId,
  characterId:proof.casterId,createdAt,calendarCampaignId:campaignId,
  campaignMinute:document.campaignClock.minute,
  title:'Neutral Detect – Total Release, Spirit a uzavřený Vortex I',
  body:'Fyzický Misfire 100; Spirit a celé první (zároveň poslední) kolo Chaos Storm zapsáno. Žádný zdroj nezůstal potlačen.',
  calendarNeutralTotalRelease:{format:'hmk-neutral-total-release-native-cl1-v1',
   spell:'Detect',casterId:proof.casterId,spellstartId:proof.spellstartId,
   finishId:proof.finishId,sourceId:proof.sourceId,
   castingSL:'CF',castingEML:proof.casting.castingEML,
   castingFatigue:proof.casting.castingFatigue,spirit:cp(proof.spirit),
   spiritMLAfter:proof.spiritMLAfter,vortex},
  combatProof:{actionKind:'neutral-total-release',sourceEventId:proof.eventId,
   timelineId:proof.timelineId,round:proof.spellfireRound,
   spellstartId:proof.spellstartId,physicalDice:cp(dice)}});
 must(js(document)===original,'předvýpočet nesmí měnit živou kampaň');
 validateNeutralAlchemyHistory(out);validateNeutralAlchemyCombatLinks(out);
 return {format:'hmk-neutral-total-release-native-stage-v1',createdAt,
  params:cp({...input,gmNoOtherArcaneSourcesConfirmed}),documentWitness:original,nextDocument:out,
  bounded:true,fullPoint10:false};
}
export function persistNeutralTotalReleaseCommit({stage,document,storage,key,baseline}={}){
 must(stage?.format==='hmk-neutral-total-release-native-stage-v1'&&
  js(document)===stage.documentWitness,'neúplný nebo zastaralý plán');
 const fresh=prepareNeutralTotalReleaseCommit({document,...stage.params,createdAt:stage.createdAt});
 must(js(fresh)===js(stage),'podvržený Spirit, kostky, pozice či Vortex');
 const serialized=js(fresh.nextDocument);
 const result=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...result,document:result.ok?fresh.nextDocument:null,
  serialized:result.ok?serialized:null};
}
