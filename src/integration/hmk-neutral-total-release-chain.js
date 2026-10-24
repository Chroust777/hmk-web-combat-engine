/** HMK v1.2 pp.160–163, 200–204, 251, 255.
 * READ-ONLY first-step bridge between a REAL Neutral Detect spellstart,
 * Casting CF + physical Misfire 100, the caster's Spirit consequences and
 * the first Neutral Chaos Storm/Vortex tick. This is a proof, NOT a writer:
 * no Spirit ML, Shade, Psyche, Fatigue, Initiative or magic source is changed.
 *
 * Deliberately limited to Detect on an original alchemical source. Other
 * Neutral spells/target types require their own live modifier histories.
 * A full atomic writer must revalidate these witnesses against the live CAS
 * snapshot before mutating the existing combat document.
 */
import {verifyNeutralSpellstartWitness} from './hmk-alchemy-neutral-spellfire-commit.js';
import {alchemyArcaneTargetDossier} from './hmk-alchemy-arcane-targets.js';
import {activeAlchemyWard} from './hmk-neutral-ward-lifecycle.js';
import {neutralOrdinaryCastingEML,neutralSpellfireDice} from './hmk-alchemy-arcane-casting-readiness.js';
import {neutralTotalReleaseSpirit} from './hmk-neutral-arcane-exceptions.js';
import {replayNeutralVortexSequence} from './hmk-neutral-vortex-sequence.js';
import {validateCombatState,dueInjuryMorale} from './persistent-combat-state.js';
import {validateEncounterSequence} from './encounter-turn-sequence.js';
const guard=(ok,m)=>{if(!ok)throw Error('Neutral Total Release chain: '+m)};
const whole=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const same=JSON.stringify;
export function preflightNeutralTotalReleaseChain({document,id,casterId,finishId,
 spell='Detect',distanceFeet,castingD100,misfireD100,
 spiritD100,spiritLossD6=[],verifiedSpiritOtherModifiers=0,
 gmSpiritModifiersVerified=false,gmOrdinaryConditionsConfirmed=false,
 gmWardAbsentConfirmed=false,gmConcentrationConfirmed=false,
 origin,sourceCensus,ticks,gmFullSourceHistoryConfirmed=false}={}){
 guard(gmOrdinaryConditionsConfirmed===true&&gmWardAbsentConfirmed===true&&
  gmConcentrationConfirmed===true&&gmSpiritModifiersVerified===true,
  'chybí samostatná GM potvrzení původního spellfire, Ward a Spirit modifikátorů');
 guard(spell==='Detect'&&typeof id==='string'&&id.length>=3&&id.length<=120&&
  typeof casterId==='string'&&casterId&&typeof finishId==='string'&&finishId,
  'v této větvi je povolen jen originální Neutral Detect na elixír');
 guard(Array.isArray(document?.journal)&&Array.isArray(document?.characters)&&
  Array.isArray(document?.inventory)&&document?.combatRuntime?.version===1,
  'chybí původní úplný bojový dokument');
 const witness=same(document);
 guard(!document.journal.some(j=>j.id==='neutral-spellfire:'+id||
  j.combatProof?.sourceEventId===id),'duplicitní Spellfire důkaz');
 const {sequence,commitment,spellstart}=verifyNeutralSpellstartWitness(document,
  {casterId,finishId,spell});
 const runtime=document.combatRuntime;
 guard(runtime.timelineId===sequence.timelineId&&
  runtime.participants?.length===sequence.order.length&&
  runtime.participants.every(x=>sequence.order.includes(x))&&
  runtime.clock?.round===sequence.round&&
  runtime.clock?.actorId===casterId,
  'neodpovídá původní časová osa a její checkpoint');
 const caster=document.characters.filter(c=>c.id===casterId);
 guard(caster.length===1,'sesilatel musí být jediná živá postava');
 const state=validateCombatState(caster[0].hmk?.combatState);
 guard(dueInjuryMorale(state).length===0&&
  !caster[0].hmk?.arcane?.activeMisfireWarp&&
  !caster[0].hmk?.arcane?.pendingPsycheTraitChoice,
  'nelze obejít nevyřešené bojové nebo psychické povinnosti');
 const seq=validateEncounterSequence(sequence);
 guard(seq.commitments?.[casterId]?.durationRounds===2&&
  seq.commitments[casterId]?.status==='in-progress'&&
  seq.commitments[casterId]?.completionRound===seq.round,
  'neprokázaná celá délka Neutral Detect koncentrace');
 const campaignId=document.campaignClock?.campaignId??document.campaignClock?.id;
 const minute=document.campaignClock?.minute;
 guard(typeof campaignId==='string'&&campaignId&&whole(minute,0,1e9),
  'chybí platný živý kampaní čas');
 const target=alchemyArcaneTargetDossier({journal:document.journal,
  inventory:document.inventory,campaignId,minute,finishId});
 guard(target.targetable===true&&target.currentAS>=1&&
  spellstart.combatProof?.sourceId===target.sourceId&&
  spellstart.combatProof?.targetKind!=='Ward'&&
  !activeAlchemyWard({journal:document.journal,campaignId,
   finishId,sourceId:target.sourceId}),
  'původní aktivní elixír nebo Ward se během sesílání změnil');
 const eml=neutralOrdinaryCastingEML({character:caster[0],spell,
  target,encumbrance:caster[0].hmk.arcane.verifiedGestureEncumbrance,
  gmConfirmed:true,otherModifiersConfirmedAbsent:true});
 // Range cannot be shortened by GM testimony if the original Initiative
 // places the live magical source farther away. Height or an indirect route
 // can only INCREASE the measured distance, never shorten planar distance.
 const units=seq.spatialUnits;
 const casterPos=units?.filter(u=>u.id===casterId&&Number.isFinite(u.x)&&Number.isFinite(u.y));
 const targetPos=units?.filter(u=>u.id===target.targetId&&Number.isFinite(u.x)&&Number.isFinite(u.y));
 guard(Array.isArray(units)&&units.length===seq.order.length&&
  casterPos?.length===1&&targetPos?.length===1,
  'chybí úplné původní prostorové pozice sesilatele a cíle');
 const minimumDistance=Math.hypot(casterPos[0].x-targetPos[0].x,
  casterPos[0].y-targetPos[0].y);
 guard(Number.isFinite(distanceFeet)&&distanceFeet>=minimumDistance-1e-7&&
  distanceFeet<=eml.spellSI*5&&
  spellstart.combatProof.spellML===eml.spellML,
  'při Spellfire nesouhlasí rozsah, skutečná poloha nebo původní Spell ML');
 const casting=neutralSpellfireDice({spell,fullEML:eml.eml,
  castingD100,misfireD100});
 guard(misfireD100===100&&casting.castingSL==='CF'&&
  casting.misfire?.kind==='total-release'&&
  casting.totalReleaseNeedsSpiritAndRawPrinciple===true,
  'Neutral Total Release vyžaduje Casting CF a skutečný Misfire 100');
 const originalSpirit=caster[0].hmk?.skills?.filter(x=>
  String(x.name).trim().toLowerCase()==='spirit');
 guard(originalSpirit?.length===1&&whole(originalSpirit[0].ml,0,1000),
  'Spirit ML musí být jediná původní živá dovednost');
 const spirit=neutralTotalReleaseSpirit({spellCL:casting.complexity,
  spiritML:originalSpirit[0].ml,verifiedOtherModifiers:verifiedSpiritOtherModifiers,
  modifiersVerified:true,spiritD100,lossD6:spiritLossD6});
 guard(Array.isArray(ticks)&&ticks.length===1&&ticks[0]?.roundOffset===0,
  'první Total Release checkpoint smí zahrnovat právě původní Vortex tick');
 const storm=replayNeutralVortexSequence({spellCL:casting.complexity,origin,
  sourceCensus,ticks,document,originCasterId:casterId,
  gmFullSourceHistoryConfirmed});
 guard(storm.originalCasterOriginProof?.round===seq.round&&
  storm.originalCasterOriginProof?.timelineId===seq.timelineId&&
  storm.processedTicks===1&&storm.ticks[0].roundOffset===0,
  'první Vortex tick nevznikl v původním Spellfire kole sesilatele');
 guard(same(document)===witness,'výpočet nesmí měnit žádný z původních záznamů');
 return Object.freeze({format:'hmk-neutral-total-release-first-tick-proof-v1',
  eventId:id,casterId,spell,finishId,sourceId:target.sourceId,
  timelineId:seq.timelineId,spellstartId:spellstart.id,
  startRound:commitment.startRound,spellfireRound:seq.round,
  casting:Object.freeze({castingD100,misfireD100,castingSL:casting.castingSL,
   castingEML:casting.fullEML,castingFatigue:casting.totalFatigue,
   originalSpellML:eml.spellML,complexity:casting.complexity}),
  spirit,spiritMLAfter:Math.max(0,originalSpirit[0].ml-spirit.spiritMLLoss),
  storm,physicalDice:Object.freeze([
   {faces:100,value:castingD100},{faces:100,value:misfireD100},
   {faces:100,value:spiritD100},
   ...spiritLossD6.map(value=>({faces:6,value}))]),
  sourcePages:Object.freeze([160,200,202,203,204,251,255]),
  documentWitness:witness,
  // A GM-confirmed census does NOT turn non-native sources into original
  // historical receipts, and the actual Neutral vortex has NO writer yet.
  firstTickOnly:true,mayCommit:false,
  outstanding:Object.freeze(['native Neutral Total Release CAS writer',
   'all six original magical-source histories',
   'historical Vortex suppression, expiration and revival',
   'future Initiative movement, concentration and all remaining ticks'])});
}
