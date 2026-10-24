/** HMK v1.2 pp.160, 182, 200–203, 251, 254.
 * Deliberately bounded authoritative Neutral spellfire writer. It can commit
 * actual F/CF and bounded S/CS Detect/Reveal/Dispel after true spellstart
 * and concentration. Detect S/CS requires an attested complete source census.
 * An unwarded original alchemical source can now receive a touch-cast Ward
 * after 60 concentration rounds. Ward-target Detect→Reveal→Dispel is also
 * supported with the original Ward Level penalty. A stronger Ward can now
 * supersede an active Ward when the ordinary S level already exceeds its WL.
 * CS-only supersession and Total Release 100 remain explicitly unsupported.
 * The Combat UI exposes only this bounded, fail-closed casting path.
 */
import {alchemyArcaneTargetDossier} from './hmk-alchemy-arcane-targets.js';
import {activeAlchemyWard,wardFromSpellfire} from './hmk-neutral-ward-lifecycle.js';
import {buildNeutralDetectCensus,getNeutralDetectHistory} from './hmk-alchemy-neutral-detection.js';
import {neutralOrdinaryCastingEML,neutralSpellfireDice} from './hmk-alchemy-arcane-casting-readiness.js';
import {validateEncounterSequence,confirmConcentrationCompletion,startEncounterTurn,
 finishEncounterTurn,currentEncounterActor} from './encounter-turn-sequence.js';
import {validateCombatState} from './persistent-combat-state.js';
import {applyMisfireCombatTrauma,applyMisfireArcaneTrauma} from './hmk-spell-misfire-effects.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
import {validateNeutralAlchemyHistory,validateNeutralAlchemyCombatLinks} from './hmk-alchemy-neutral-history.js';
import {assertFumebombLineOfSight} from './hmk-alchemy-area-los.js';
const js=JSON.stringify,cp=structuredClone;
function check(v,message){if(!v)throw Error('Neutral Spellfire: '+message)}
/** Full identity of the spellstart must match the LIVE concentration schedule. */
export function verifyNeutralSpellstartWitness(document,{casterId,spell,finishId}={}){
 const seq=validateEncounterSequence(document?.combatRuntime?.sequence);
 const c=seq.commitments?.[casterId];
 check(c?.status==='in-progress'&&c.completionRound===seq.round&&
   seq.active===false&&seq.order[seq.cursor]===casterId,
  'spellfire vyžaduje dokončenou délku koncentrace před vlastním IR');
 const starts=document.journal.filter(x=>x.combatProof?.actionKind==='neutral-spellstart'&&
  x.combatProof.casterId===casterId&&x.combatProof.spell===spell&&
  x.combatProof.finishId===finishId&&x.combatProof.timelineId===seq.timelineId&&
  x.combatProof.startRound===c.startRound&&
  x.combatProof.castingTimeRounds===c.durationRounds);
 check(starts.length===1&&starts[0].calendarCampaignId===
  (document.campaignClock?.campaignId??document.campaignClock?.id),
  'chybí jediný originální Spellstart důkaz na této časové ose');
 const start=starts[0];
 check(!document.journal.some(x=>x.calendarAlchemyNeutralCast?.spellstartId===start.id),
  'tento Spellstart již má uložený Spellfire');
 check(seq.log.some(x=>x.type==='neutral-incant-spellstart'&&x.eventId===start.combatProof.sourceEventId&&
  x.actorId===casterId&&x.round===c.startRound&&x.spell===spell&&
  x.finishId===finishId), 'chybí původní událost koncentrace v Initiative');
 return {sequence:seq,commitment:c,spellstart:start};
}
/** Each outcome is resolved through a single original Initiative/Combat State commit. */
function prepareNeutralSpellfireOutcome({document,id,casterId,spell,finishId,
 distanceFeet,targetKind='Elixir',gmWardTargetConfirmed=false,gmSupersedeWardConfirmed=false,castingD100,misfireD100=null,critical=false,success=false,
 distancesByFinishId=null,otherSources=[],gmAllSourcesConfirmed=false,gmOrdinaryConditionsConfirmed=false,
 gmLOSConfirmed=false,gmWardAbsentConfirmed=false,gmTouchConfirmed=false,
 gmConcentrationConfirmed=false,gmConfirmed=false,
 createdAt=new Date().toISOString()}={}){
 check(gmConfirmed===true&&gmConcentrationConfirmed===true&&gmOrdinaryConditionsConfirmed===true,
  'chybí GM potvrzení koncentrace a podmínek při Spellfire');
 check(typeof id==='string'&&id.length>=3&&id.length<=120&&
  typeof casterId==='string'&&casterId&&typeof finishId==='string'&&finishId&&
  ['Detect','Reveal','Dispel','Ward'].includes(spell),'neplatný zdroj, kouzlo či událost');
 check(typeof createdAt==='string'&&!Number.isNaN(Date.parse(createdAt)),'chybí datum zápisu');
 check(Array.isArray(document?.characters)&&Array.isArray(document?.journal)&&
  Array.isArray(document?.inventory),'chybí původní kampaň');
 check(!document.journal.some(x=>x.id==='neutral-spellfire:'+id||x.combatProof?.sourceEventId===id),
  'opětovné použití Spellfire ID');
 const checkpoint=document.combatRuntime;
 check(checkpoint?.version===1&&Array.isArray(checkpoint.participants)&&
  checkpoint.participants.includes(casterId)&&
  checkpoint.timelineId===checkpoint.sequence?.timelineId&&
  checkpoint.participants.length===checkpoint.sequence?.order?.length&&
  checkpoint.participants.every(x=>checkpoint.sequence.order.includes(x))&&
  Number.isSafeInteger(checkpoint.clock?.round)&&checkpoint.clock.round>=1&&
  typeof checkpoint.clock?.actorId==='string',
  'Spellfire vyžaduje úplný originální Initiative checkpoint');
 const saved=js(document),{sequence,commitment,spellstart}=verifyNeutralSpellstartWitness(document,
  {casterId,spell,finishId});
 const caster=document.characters.find(x=>x.id===casterId);
 const state=validateCombatState(caster?.hmk?.combatState);
 const states=Object.fromEntries(document.characters.filter(c=>c.hmk?.combatState)
  .map(c=>[c.id,validateCombatState(c.hmk.combatState)]));
 check(sequence.order.every(x=>states[x]),'některému účastníkovi chybí Combat State');
 const campaignId=document.campaignClock?.campaignId??document.campaignClock?.id;
 const minute=document.campaignClock?.minute;
 check(Number.isSafeInteger(minute)&&minute>=0,'chybí živý GM čas');
 const target=alchemyArcaneTargetDossier({journal:document.journal,inventory:document.inventory,
  campaignId,minute,finishId});
 check(target.targetable,'cílový elixír již není aktivní');
 check(['Elixir','Ward'].includes(targetKind),'neplatná kategorie magického cíle');
 const existingWard=activeAlchemyWard({journal:document.journal,campaignId,finishId,sourceId:target.sourceId});
 const sourceId=targetKind==='Ward'?existingWard?.wardProofId:target.sourceId;
 check(sourceId===spellstart.combatProof.sourceId&&
  (targetKind==='Ward')===(spellstart.combatProof.targetKind==='Ward'),
  'cílový zdroj již není původní aktivní enchantment');
 if(targetKind==='Ward')check(spell!=='Ward'&&existingWard&&gmWardTargetConfirmed===true,
  'cílení Wardu vyžaduje aktivní původní Ward');
 check(Number.isFinite(distanceFeet)&&distanceFeet>=0&&
  Number.isFinite(spellstart.combatProof?.castingTimeRounds),
  'chybí fyzicky doložený rozsah');
 const eml=neutralOrdinaryCastingEML({character:caster,spell,
  target:targetKind==='Ward'?{...target,targetKind,wardLevel:existingWard.wardLevel}:target,
  encumbrance:caster.hmk.arcane.verifiedGestureEncumbrance,
  gmConfirmed:true,otherModifiersConfirmedAbsent:true});
 const limits={Detect:eml.spellSI*5,Reveal:eml.spellSI,Dispel:eml.spellSI*5,Ward:0};
 check(distanceFeet<=limits[spell],'kouzlo mimo ověřený dosah při spellfire');
 check(spell!=='Dispel'||gmLOSConfirmed===true,'Dispel vyžaduje skutečné LOS');
 if(spell==='Dispel')assertFumebombLineOfSight({journal:document.journal,sequence,campaignId,
  fromId:casterId,toId:sequence.order.includes(target.targetId)?target.targetId:null});
 if(targetKind==='Ward'){
  check(spell!=='Ward'&&gmWardTargetConfirmed===true,
   'Ward je aktivní zdroj s vlastními Detect/Reveal/Dispel důkazy');
 }else if(spell==='Ward'){
  check(gmTouchConfirmed===true&&distanceFeet===0&&
   spellstart.combatProof.touchConfirmed===true,'Ward vyžaduje původní dotyk během koncentrace');
  if(existingWard){
   check(gmSupersedeWardConfirmed===true&&
    spellstart.combatProof.priorWardProofId===existingWard.wardProofId&&
    spellstart.combatProof.priorWardLevel===existingWard.wardLevel,
    'Ward vyžaduje originální totožnost přebíjené ochrany');
  }else check(!spellstart.combatProof.priorWardProofId&&
    gmSupersedeWardConfirmed!==true,'Ward byl během koncentrace odstraněn nebo změněn');
 }else check(gmWardAbsentConfirmed===true&&!existingWard,
  'zdroj má aktivní Ward nebo chybí GM potvrzení');
 const detectHistory=['Detect','Ward'].includes(spell)?{found:false,critical:false,proofIds:[]}:
  getNeutralDetectHistory({journal:document.journal,campaignId,casterId,finishId,
   sourceId,targetKind});
 if(['Reveal','Dispel'].includes(spell))check(detectHistory.found,'chybí původní úspěšný Detect stejného zdroje');
 const detectCSBonus=detectHistory.critical?20:0;
 const priorReveals=spell!=='Dispel'?[]:document.journal.filter(j=>
  j.calendarCampaignId===campaignId&&j.characterId===casterId&&
  j.calendarAlchemyNeutralCast?.casterId===casterId&&
  j.calendarAlchemyNeutralCast?.spell==='Reveal'&&
  j.calendarAlchemyNeutralCast?.finishId===finishId&&
  j.calendarAlchemyNeutralCast?.sourceId===sourceId&&
  j.calendarAlchemyNeutralCast?.effect===true&&
  ['S','CS'].includes(j.calendarAlchemyNeutralCast.castingSL)&&
  (targetKind==='Ward'?j.calendarAlchemyNeutralCast.revealed?.wardProofId===sourceId:
   j.calendarAlchemyNeutralCast.revealed?.elixirName===target.elixirName));
 if(spell==='Dispel')check(priorReveals.length>0,
  'Dispel vyžaduje původní skutečně úspěšný Reveal stejného zdroje');
 const dice=neutralSpellfireDice({spell,fullEML:eml.eml+detectCSBonus,castingD100,misfireD100});
 check(success?(['S','CS'].includes(dice.castingSL)&&!critical&&
   (spell==='Detect'||spell==='Reveal'||spell==='Dispel'||spell==='Ward')):
   (critical?dice.castingSL==='CF'&&misfireD100!==null:dice.castingSL==='F'),
  'tato atomická větev bezpečně podporuje jen zvolený neúspěch F/CF nebo úspěch Detect/Reveal');
 check(dice.diceComplete===true&&!dice.misfireRequired&&!dice.totalReleaseNeedsSpiritAndRawPrinciple,
  'Misfire 100 vyžaduje vlastní kompletní Raw Principle a Spirit důkazy');
 check(dice.totalFatigue===(critical?10+dice.additionalMisfireFatigue:success&&dice.castingSL==='CS'?0:5),
  'nečekaná fatigue u Neutral I/II');
 const ward=success&&spell==='Ward'?wardFromSpellfire({spellSI:eml.spellSI,castingSL:dice.castingSL,
  sourceId:target.sourceId,finishId,spellfireId:'neutral-spellfire:'+id,
  priorWard:existingWard}):null;
 const detectedSources=success&&spell==='Detect'?buildNeutralDetectCensus({
  journal:document.journal,inventory:document.inventory,campaignId,minute,
  distancesByFinishId,otherSources,maxRangeFeet:limits.Detect,gmAllSourcesConfirmed}):null;
 if(detectedSources)check(detectedSources.some(x=>targetKind==='Ward'?
   x.kind==='other'&&x.spell==='Ward'&&x.sourceId===sourceId:
   x.kind==='alchemy'&&x.finishId===finishId&&x.sourceId===sourceId),
  'úspěšný Detect musí skutečně identifikovat původní cíl v dosahu');
 // Completion is verified by the original concentration scheduler BEFORE
 // the active turn begins, never by manually overriding task.status.
 let q=confirmConcentrationCompletion(sequence,states,{actorId:casterId,gmConfirmed:true});
 q=startEncounterTurn(q,states);
 check(currentEncounterActor(q)===casterId,'spellfire se musí odehrát na vlastním IR');
 const out=cp(document),newState=out.characters.find(c=>c.id===casterId).hmk.combatState;
 check(newState.fatigue.windedness+dice.totalFatigue<=99999,'překročen limit únavy');
 newState.fatigue.windedness+=dice.totalFatigue;
 if(critical){
  applyMisfireCombatTrauma(newState,dice.misfire);
  const arc=out.characters.find(c=>c.id===casterId).hmk.arcane;
  applyMisfireArcaneTrauma(arc,dice.misfire,id);
  if(dice.misfire.crucial){
   arc.misfireLostSpells??=[];
   check(!arc.misfireLostSpells.includes('Neutral::'+spell),'Crucial již ztratil dané kouzlo');
   arc.misfireLostSpells.push('Neutral::'+spell);
  }
 }
 newState.events.push({id:id+':casting-fatigue',round:q.round,type:'hmk-casting-fatigue',
  details:{spell,castingRoll:castingD100,outcome:dice.castingSL,fatigue:dice.totalFatigue,misfireD100}});
 newState.lastRound=Math.max(newState.lastRound,q.round);
 validateCombatState(newState);
 q.log.push({type:critical?'neutral-incant-spellfire-misfire':
  success?'neutral-incant-spellfire-success':'neutral-incant-spellfire-failed',eventId:id,round:q.round,
  actorId:casterId,spell,spellstartEventId:spellstart.combatProof.sourceEventId,
  castingSL:dice.castingSL,castingEML:dice.fullEML,castingFatigue:dice.totalFatigue,
  detectCSBonus,
  ...(critical?{misfireKind:dice.misfire.kind,crucial:dice.misfire.crucial}:{}),
  physicalDice:[{faces:100,value:castingD100,source:'GM-entered-physical-die'},
   ...(critical?[{faces:100,value:misfireD100,source:'GM-entered-physical-die'}]:[])]});
 const newStates={...states,[casterId]:newState};
 q=finishEncounterTurn(q,newStates,{action:'incant',gmConfirmed:true});
 check(!q.pendingEndTurnAction,'povinné reakce na konci tahu musí být doložené');
 out.combatRuntime.sequence=q;
 out.combatRuntime.clock={round:q.round,actorId:currentEncounterActor(q)||''};
 out.journal.push({id:'neutral-spellfire:'+id,characterId:casterId,createdAt,
  calendarCampaignId:campaignId,campaignMinute:minute,
  title:'Neutral '+spell+' – Spellfire ('+dice.castingSL+')',
  body:success?'Úspěšný '+spell+' – '+
    (spell==='Detect'?'ověřená mapa všech magických zdrojů v dosahu':
    spell==='Reveal'?'principle a aktuální AS původního elixíru':
    spell==='Ward'?'doložená ochrana jednoho magického zdroje':
    targetKind==='Ward'?'odstraněna ochrana Ward, elixír přetrvává':
    'ukončen enchantment původního elixíru')+'; únava +'+dice.totalFatigue+'.':
   'Ověřené fyzické hody, bez magického účinku; Windedness +'+dice.totalFatigue+
   (critical?'; Misfire '+dice.misfire.kind:'')+'.',
  calendarAlchemyNeutralCast:{spell,casterId,finishId,sourceId,
   ...(targetKind==='Ward'?{targetKind:'Ward'}:{}),
   spellstartId:spellstart.id,castingSL:dice.castingSL,castingD100,castingEML:dice.fullEML,
   castingFatigue:dice.totalFatigue,spellfireRound:commitment.completionRound,effect:success,
   detectCSBonus,
   ...(ward?{ward}:{}),
   ...(detectedSources?{detectedSources,allSourcesGMConfirmed:true}:{}),
   ...(success&&spell==='Dispel'&&targetKind==='Ward'?{dispel:{wardProofId:sourceId,
    wardLevel:existingWard.wardLevel,removed:true,
    originalRevealProofIds:priorReveals.map(j=>j.id)}}:{}),
   ...(success&&spell==='Dispel'&&targetKind==='Elixir'?{dispel:{asBefore:target.currentAS,asAfter:0,
    phaseBefore:target.phase,originalRevealProofIds:priorReveals.map(j=>j.id)}}:{}),
   ...(success&&spell==='Reveal'&&targetKind==='Ward'?{revealed:{
    principle:'Neutral',spell:'Ward',wardProofId:sourceId,wardLevel:existingWard.wardLevel},
    originalDetectProofIds:[...detectHistory.proofIds]}:{}),
   ...(success&&spell==='Reveal'&&targetKind==='Elixir'?{revealed:{principle:target.principle,
    elixirName:target.elixirName,currentAS:target.currentAS},
    originalDetectProofIds:[...detectHistory.proofIds]}:{}),
   ...(critical?{misfireD100,misfireKind:dice.misfire.kind,
    misfirePsycheStress:dice.misfire.psycheStress,misfireAuralShock:dice.misfire.auralShock,
    crucial:dice.misfire.crucial}: {})},
  combatProof:{actionKind:critical?'neutral-spellfire-misfire':
    success?'neutral-spellfire-success':'neutral-spellfire-failed',sourceEventId:id,
   timelineId:sequence.timelineId,round:commitment.completionRound,spellstartId:spellstart.id,
   physicalDice:[{faces:100,value:castingD100,source:'GM-entered-physical-die'},
    ...(critical?[{faces:100,value:misfireD100,source:'GM-entered-physical-die'}]:[])]}});
 validateNeutralAlchemyHistory(out);
 validateNeutralAlchemyCombatLinks(out);
 check(js(document)===saved,'zdrojová kampaň nesmí být změněna');
 return {format:critical?'hmk-neutral-spellfire-misfire-plan-v1':
   success?'hmk-neutral-spellfire-success-plan-v1':'hmk-neutral-spellfire-failed-plan-v1',
  id,casterId,spell,finishId,targetKind,gmWardTargetConfirmed:targetKind==='Ward',
  distanceFeet,castingD100,...(critical?{critical:true,misfireD100}:{}),
  ...(success?{success:true,distancesByFinishId,otherSources:cp(otherSources),
   gmAllSourcesConfirmed:spell==='Detect'?true:false}:{}),gmConcentrationConfirmed:true,
  gmOrdinaryConditionsConfirmed:true,gmWardAbsentConfirmed:spell!=='Ward'&&targetKind!=='Ward',
  gmWardTargetConfirmed:targetKind==='Ward',gmSupersedeWardConfirmed:spell==='Ward'&&Boolean(existingWard),gmTouchConfirmed:spell==='Ward',gmLOSConfirmed:gmLOSConfirmed===true,gmConfirmed:true,createdAt,
  documentWitness:saved,nextDocument:out};
}
export function prepareFailedNeutralSpellfire(args){
 return prepareNeutralSpellfireOutcome({...args,critical:false,misfireD100:null});
}
export function prepareCriticalNeutralSpellfire(args){
 return prepareNeutralSpellfireOutcome({...args,critical:true,success:false});
}
export function prepareSuccessfulNeutralSpellfire(args){
 return prepareNeutralSpellfireOutcome({...args,critical:false,success:true,misfireD100:null});
}
export function persistNeutralSpellfireFailure({stage,document,storage,key,baseline}={}){
 const critical=stage?.format==='hmk-neutral-spellfire-misfire-plan-v1';
 const success=stage?.format==='hmk-neutral-spellfire-success-plan-v1';
 check((critical||success||stage?.format==='hmk-neutral-spellfire-failed-plan-v1')&&
  js(document)===stage.documentWitness,
  'neúplný nebo změněný Spellfire plán');
 const fresh=prepareNeutralSpellfireOutcome({document,id:stage.id,casterId:stage.casterId,
  finishId:stage.finishId,spell:stage.spell,distanceFeet:stage.distanceFeet,
  targetKind:stage.targetKind??'Elixir',gmWardTargetConfirmed:stage.targetKind==='Ward',
  gmSupersedeWardConfirmed:stage.gmSupersedeWardConfirmed===true,
  castingD100:stage.castingD100,critical,success,
  distancesByFinishId:success?stage.distancesByFinishId:null,
  otherSources:success?stage.otherSources:[],
  gmAllSourcesConfirmed:success&&stage.spell==='Detect',
  misfireD100:critical?stage.misfireD100:null,
  createdAt:stage.createdAt,
  gmOrdinaryConditionsConfirmed:true,gmWardAbsentConfirmed:stage.spell!=='Ward'&&stage.targetKind!=='Ward',
  gmTouchConfirmed:stage.spell==='Ward',gmLOSConfirmed:stage.gmLOSConfirmed,gmConcentrationConfirmed:true,gmConfirmed:true});
 check(js(stage)===js(fresh),'podvržený výsledek, únavu nebo historii nelze uložit');
 const serialized=js(fresh.nextDocument);
 const result=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...result,document:result.ok?fresh.nextDocument:null,serialized:result.ok?serialized:null};
}

export function persistFailedNeutralSpellfire(args){
 check(args?.stage?.format==='hmk-neutral-spellfire-failed-plan-v1',
  'pouze F je přípustné v původní větvi');
 return persistNeutralSpellfireFailure(args);
}
export function persistCriticalNeutralSpellfire(args){
 check(args?.stage?.format==='hmk-neutral-spellfire-misfire-plan-v1',
  'CF vyžaduje původní kompletní Misfire důkaz');
 return persistNeutralSpellfireFailure(args);
}

export function persistSuccessfulNeutralSpellfire(args){
 check(args?.stage?.format==='hmk-neutral-spellfire-success-plan-v1',
  'úspěch vyžaduje kompletní původní zdrojové důkazy');
 return persistNeutralSpellfireFailure(args);
}
