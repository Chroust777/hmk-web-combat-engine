/** HMK v1.2 pp.200–203, 229: bounded *authoritative* Pyre III spellfire.
 * Restricted to a confirmed unattended, isolated, wholly wooden inanimate
 * object recorded in inventory. No touching creature, spread, living wood,
 * heightened bonus effects or unverified modifiers. This is not a generic
 * spell effect resolver. Dice are entered by the GM; no automatic rolls.
 * All effects, fatigue, spell loss and Initiative commit with one existing
 * persistVerifiedCombatSnapshot() checkpoint.
 */
import {successLevel,SL} from '../rules/tests.js';
import {validateEncounterSequence,currentEncounterActor,finishEncounterTurn} from './encounter-turn-sequence.js';
import {validateCombatState,combatFatigueTotals,dueInjuryMorale} from './persistent-combat-state.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
import {requirePelahnBonusIncantSpell} from './hmk-pelahn-incant-registry.js';
import {classifySpellMisfire,applyMisfireCombatTrauma,applyMisfireArcaneTrauma} from './hmk-spell-misfire-effects.js';
import {composeVerifiedPelahnTotalRelease} from './hmk-pelahn-total-release-core.js';
const cp=structuredClone,js=JSON.stringify;
const check=(x,m)=>{if(!x)throw Error(m)};
const integer=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const fireSun=Object.freeze({'Ùlándus':-5,'Arálius':0,'Fenéri':5,'Áhnù':10,'Angberélius':15,'Nadái':10,'Hîrin':5,'Táræl':0,'Tai':-5,'Skôrus':-10,'Masâra':-15,'Ládo':-10});
function verifiedItem(doc,id,si){
 const matches=doc.inventory?.filter(i=>i.id===id);
 check(matches?.length===1,'Pyre: chybí jedinečný předmět v autoritativním inventáři');
 const i=matches[0],p=i.snapshot?.properties;
 check(i.slot==='none'&&i.destroyed===false&&i.quantity===1&&
  doc.characters.some(c=>c.id===i.characterId)&&
  i.snapshot?.category==='other'&&p?.material==='wood'&&p?.living===false&&
  Number.isFinite(p.weightLb)&&p.weightLb>0&&p.weightLb<=si,
  'Pyre: jen jediný opuštěný neživý dřevěný předmět do SI liber, s doloženým materiálem a hmotností');
 return i;
}
export function prepareGuidedPyre({id,document,casterId,itemId,conditionsConfirmed=false,gmConfirmed=false}={}){
 check(gmConfirmed===true&&conditionsConfirmed===true,'GM musí ověřit dotyk, žádné dotýkající se osoby, izolovaný předmět, cant/gesture, klid a všechny modifikátory');
 const seq=validateEncounterSequence(document?.combatRuntime?.sequence);
 check(seq.active===true&&currentEncounterActor(seq)===casterId&&!seq.pendingEndTurnAction&&!seq.interruptActiveId,
  'Pyre Spellfire vyžaduje vlastní aktivní Incant IR');
 check(typeof id==='string'&&id.length>0&&id.length<=120&&!seq.log.some(e=>e.eventId===id),
  'Neplatné nebo již použité ID Spellfire');
 const mage=document?.characters?.find(c=>c.id===casterId);
 check(mage?.hmk?.arcane?.primaryConvocation==='Pèleáhn','Chybí Primary Pèleáhn');
 const desc=requirePelahnBonusIncantSpell(mage,'Pyre');
 check(desc.castingTimeRounds===1&&desc.complexity===3,'Nesouhlasí pevná tištěná data Pyre III');
 const arc=mage.hmk.arcane,state=mage.hmk.combatState;
 validateCombatState(state);
 check(!['STN','INC','UNC','KIA'].includes(state.shock)&&!state.coma?.active&&
  !['withdrawing','routed','catatonic'].includes(state.morale?.state)&&
  !state.morale?.surrender?.active&&!state.posture?.passNextTurn&&
  !['STN','INC','UNC','KIA'].includes(seq.entryShock)&&
  !['withdrawing','routed','catatonic'].includes(seq.entryMorale),
  'Pyre: Shock, Morale či povinný Pass vylučují Spellfire');
 check(!arc.auralShockLevels&&!arc.activeMisfireWarp&&!arc.pendingPsycheTraitChoice&&arc.verifiedGestureEncumbrance===0&&
  state.wounds.length===0&&!state.pendingManeuver&&!state.mishaps?.some(x=>!x.resolved)&&
  dueInjuryMorale(state).length===0,'Pyre: nedoložený Casting EML, stav nebo splatné následky');
 const skill=mage.hmk.skills?.filter(s=>String(s.name).toLowerCase()==='pvarism');
 check(skill?.length===1&&integer(skill[0].ml,0,200),'Pyre: chybí Pvarism ML');
 const sun=mage.hmk.identity?.sunsign;
 check(Object.hasOwn(fireSun,sun),'Pyre: chybí tištěný Sunsign');
 const spellML=skill[0].ml+fireSun[sun]-6,si=Math.floor(spellML/10);
 check(spellML>=10&&spellML<=200&&si>=1,'Pyre: nedostatečné Spell ML / SI');
 verifiedItem(document,itemId,si);
 const task=seq.commitments?.[casterId];
 check(task?.status==='completed'&&task.durationRounds===1&&task.completedRound===seq.round&&
  seq.log.some(e=>e.type==='concentration-complete'&&e.actorId===casterId&&
   e.startRound===task.startRound&&e.round===seq.round&&e.durationRounds===1)&&
  seq.log.some(e=>e.type==='pelahn-bonus-incant-spellstart'&&e.actorId===casterId&&
   e.round===task.startRound&&e.spell==='Pyre'),
  'Pyre: chybí kompletní původní bonusový spellstart a nepřerušená koncentrace');
 const eml=Math.max(0,Math.min(100,spellML-combatFatigueTotals(state).total));
 check(eml>0,'Pyre: Casting EML je nulové');
 return {format:'hmk-guided-pyre-v1',phase:'casting',id,round:seq.round,timelineId:seq.timelineId,
  casterId,itemId,spell:'Pyre',spellML,si,eml,castingRoll:null,castingSL:null,
  misfireD100:null,castingFatigue:null,sequenceWitness:js(seq),documentWitness:js(document)};
}
export function guidedPyreRequirement(stage){
 check(stage?.format==='hmk-guided-pyre-v1','Pyre: chybný formát průvodce');
 if(stage.phase==='casting')return {faces:100,label:`Pyre III Casting d100 · EML ${stage.eml}`};
 if(stage.phase==='misfire')return {faces:100,label:'Pyre III Spell Misfire d100'};
 if(stage.phase==='total-release-spirit')return {faces:100,label:`Pyre Total Release: Spirit d100 (EML ${stage.totalReleaseSpiritEML})`};
 if(stage.phase==='total-release-spirit-loss')return {faces:6,label:`Pyre Total Release: Spirit ML loss d6 (${stage.totalReleaseSpiritLossDice.length+1}/${stage.totalReleaseSpiritLossCount})`};
 if(stage.phase==='total-release-hyperburst-pending')return {kind:'total-release-hyperburst-pending'};
 if(stage.phase==='total-release-shade-pending')return {kind:'total-release-shade-pending'};
 return {kind:stage.phase==='ready'?'complete':'blocked'};
}
export function submitGuidedPyreDie(stage,value){
 const req=guidedPyreRequirement(stage);
 check(integer(value,1,req.faces??0),'Pyre: vyžadován přesný fyzický hod d'+(req.faces??'?')+' v této fázi');
 if(stage.phase==='casting'){
  const sl=successLevel(value,stage.eml),name=sl===SL.CS?'CS':sl===SL.S?'S':sl===SL.F?'F':'CF';
  // HMK p.202: CL III +5 above basic 0/5/10 fatigue.
  return {...stage,castingRoll:value,castingSL:name,
   castingFatigue:name==='CS'?5:name==='CF'?15:10,
   phase:name==='CF'?'misfire':'ready'};
 }
 if(stage.phase==='total-release-spirit'){
  const sl=successLevel(value,stage.totalReleaseSpiritEML),name=sl===SL.CF?'CF':sl===SL.F?'F':sl===SL.CS?'CS':'S';
  const count={CF:0,F:6,S:4,CS:2}[name];
  return {...stage,totalReleaseSpiritRoll:value,totalReleaseSpiritSL:name,
   totalReleaseSpiritMLLoss:count?null:0,totalReleaseSpiritLossCount:count,
   phase:count?'total-release-spirit-loss':'total-release-shade-pending'};
 }
 if(stage.phase==='total-release-spirit-loss'){
  const arr=[...stage.totalReleaseSpiritLossDice,value];
  check(arr.length<=stage.totalReleaseSpiritLossCount,'Pyre: příliš mnoho Spirit d6');
  return {...stage,totalReleaseSpiritLossDice:arr,
   totalReleaseSpiritMLLoss:arr.length===stage.totalReleaseSpiritLossCount?
    arr.reduce((a,b)=>a+b,0):null,
   phase:arr.length===stage.totalReleaseSpiritLossCount?'total-release-hyperburst-pending':'total-release-spirit-loss'};
 }
 const effect=classifySpellMisfire(value,3);
 if(effect.totalRelease){
  const doc=JSON.parse(stage.documentWitness);
  const caster=doc.characters?.find(c=>c.id===stage.casterId);
  const spirit=caster?.hmk?.skills?.filter(s=>String(s.name).trim().toLowerCase()==='spirit');
  if(spirit?.length!==1||!integer(spirit[0].ml,0,200))
   return {...stage,misfireD100:100,misfireKind:'total-release',crucialMisfire:true,
    phase:'unsupported-misfire'}; // Legacy fixture: no Spirit proof => fail closed.
  const fatigue=combatFatigueTotals(caster.hmk.combatState).total;
  return {...stage,misfireD100:100,misfireKind:'total-release',crucialMisfire:true,
   misfirePsycheStress:3,misfireAuralShock:0,castingFatigue:15,
   totalReleaseSpiritML:spirit[0].ml,
   totalReleaseFatigueBefore:fatigue,
   totalReleaseSpiritEML:Math.max(0,spirit[0].ml-15-fatigue),
   totalReleaseSpiritRoll:null,totalReleaseSpiritSL:null,
   totalReleaseSpiritLossCount:null,totalReleaseSpiritLossDice:[],
   totalReleaseSpiritMLLoss:null,phase:'total-release-spirit'};
 }
 return {...stage,misfireD100:value,misfireKind:effect.kind,
  misfirePsycheStress:effect.psycheStress,misfireAuralShock:effect.auralShock,
  crucialMisfire:effect.crucial,
  castingFatigue:15+effect.extraFatigue,phase:'ready'};
}
export function persistGuidedPyre({stage,document,storage,key,baseline}={}){
 check(stage?.format==='hmk-guided-pyre-v1'&&stage.phase==='ready'&&
  js(document)===stage.documentWitness,'Pyre: neúplný nebo zastaralý průvodce');
 const seq=validateEncounterSequence(document.combatRuntime.sequence);
 check(js(seq)===stage.sequenceWitness,'Pyre: změna Initiative během fyzických hodů');
 let fresh=prepareGuidedPyre({id:stage.id,document,casterId:stage.casterId,itemId:stage.itemId,
  conditionsConfirmed:true,gmConfirmed:true});
 fresh=submitGuidedPyreDie(fresh,stage.castingRoll);
 if(stage.castingSL==='CF')fresh=submitGuidedPyreDie(fresh,stage.misfireD100);
 check(js(fresh)===js(stage),'Pyre: podvržený stav, hod, EML či výsledek Misfire');
 const out=cp(document),mage=out.characters.find(c=>c.id===stage.casterId),state=mage.hmk.combatState;
 validateCombatState(state);
 state.fatigue.windedness+=stage.castingFatigue;
 const misfire=stage.castingSL==='CF'?classifySpellMisfire(stage.misfireD100,3):null;
 if(misfire)applyMisfireCombatTrauma(state,misfire);
 state.events.push({id:stage.id+':casting-fatigue',round:stage.round,type:'hmk-casting-fatigue',
  details:{spell:'Pyre',castingRoll:stage.castingRoll,outcome:stage.castingSL,
   fatigue:stage.castingFatigue,misfireD100:stage.misfireD100}});
 state.lastRound=Math.max(state.lastRound,stage.round);validateCombatState(state);
 check(dueInjuryMorale(state).length===0,'Pyre: dřívější splatná Injury Morale');
 const effect=stage.castingSL==='S'||stage.castingSL==='CS';
 if(effect){
  verifiedItem(out,stage.itemId,stage.si);
  // A consumed item leaves inventory altogether. A record with quantity=0
  // would violate the application's own import/export schema (app.js).
  out.inventory=out.inventory.filter(i=>i.id!==stage.itemId);
 }
 const crucial=misfire?.crucial===true;
 if(misfire)applyMisfireArcaneTrauma(mage.hmk.arcane,misfire,stage.id);
 if(crucial){
  check(mage.hmk.arcane.knownSpells.includes('Pyre'),'Pyre: crucial musí ztratit právě známé kouzlo');
  mage.hmk.arcane.knownSpells=mage.hmk.arcane.knownSpells.filter(s=>s!=='Pyre');
  mage.hmk.arcane.misfireLostSpells??=[];
  check(!mage.hmk.arcane.misfireLostSpells.includes('Pyre'),'Pyre: duplicitní Crucial Misfire');
  mage.hmk.arcane.misfireLostSpells.push('Pyre');
 }
 const next=cp(seq);
 next.log.push({type:stage.castingSL==='CF'?(misfire.category==='form-failure'?'spell-pyre-misfire-form-failure':'spell-pyre-misfire-mental-trauma'):
   effect?'spell-pyre-resolved':'spell-pyre-casting-failed',eventId:stage.id,
  actorId:stage.casterId,round:stage.round,spell:'Pyre',
  spellstartRound:seq.commitments[stage.casterId].startRound,
  castingEML:stage.eml,castingSL:stage.castingSL,castingFatigue:stage.castingFatigue,
  itemId:stage.itemId,effect,crucial,misfireKind:misfire?.kind??null,
  misfirePsycheStress:misfire?.psycheStress??0,misfireAuralShock:misfire?.auralShock??0,
  physicalDice:[{faces:100,value:stage.castingRoll,source:'GM-entered-physical-die'},
   ...(stage.misfireD100===null?[]:[{faces:100,value:stage.misfireD100,source:'GM-entered-physical-die'}])]});
 const states=Object.fromEntries(out.characters.map(c=>[c.id,c.hmk.combatState]));
 const finished=finishEncounterTurn(validateEncounterSequence(next),states,{action:'incant',gmConfirmed:true});
 check(!finished.pendingEndTurnAction,'Pyre: neuzavřená povinnost na konci tahu');
 out.combatRuntime.sequence=finished;
 out.combatRuntime.clock={round:finished.round,actorId:currentEncounterActor(finished)||''};
 const jid='pyre:'+stage.id;
 check(!out.journal.some(j=>j.id===jid),'Pyre: duplicitní potvrzení');
 out.journal.push({id:jid,characterId:stage.casterId,createdAt:new Date().toISOString(),
  title:`HMK Pyre III – ${stage.castingSL} (kolo ${stage.round})`,
  body:effect?`Nekontaktní dřevěný předmět ${stage.itemId} spotřebován ohněm bez rozšíření; žádní zranění účastníci.`:
   `Bez účinku; únava +${stage.castingFatigue}${misfire?'; Misfire '+misfire.kind+' / Psyche Stress '+misfire.psycheStress+' / Aural Shock '+misfire.auralShock:''}${crucial?'; Crucial Misfire: ztráta znalosti Pyre':''}`,
  combatProof:{actionKind:'pelahn-pyre-spellfire',sourceEventId:stage.id,
   casterId:stage.casterId,itemId:stage.itemId,castingEML:stage.eml,castingSL:stage.castingSL,
   castingFatigue:stage.castingFatigue,crucial,misfireKind:misfire?.kind??null,
   psycheStress:misfire?.psycheStress??0,auralShock:misfire?.auralShock??0,
   physicalDice:cp(next.log.at(-1).physicalDice)}});
 const serialized=js(out),res=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...res,document:res.ok?out:null,serialized:res.ok?serialized:null};
}

/** Pyre III Misfire 100: one authority for the full consequences and source.
 * Replay all GM dice from the original, then use the SAME single CAS writer.
 */
export function persistGuidedPyreTotalReleaseSource({stage,document,storage,key,baseline}={}){
 check(stage?.format==='hmk-guided-pyre-v1'&&
  ['total-release-hyperburst-pending','total-release-shade-pending'].includes(stage.phase)&&
  stage.misfireD100===100&&js(document)===stage.documentWitness,
  'Pyre: Total Release vyžaduje úplný důkaz fyzických hodů');
 const seq=validateEncounterSequence(document.combatRuntime.sequence);
 check(js(seq)===stage.sequenceWitness,'Pyre: Initiative změněna při Total Release');
 let witness=prepareGuidedPyre({id:stage.id,document,casterId:stage.casterId,
  itemId:stage.itemId,conditionsConfirmed:true,gmConfirmed:true});
 for(const die of [stage.castingRoll,100,stage.totalReleaseSpiritRoll,...stage.totalReleaseSpiritLossDice])
  witness=submitGuidedPyreDie(witness,die);
 check(js(witness)===js(stage),'Pyre: fyzický Casting/Misfire/Spirit/d6 nesouhlasí');
 const out=composeVerifiedPelahnTotalRelease({document,stage,spell:'Pyre',
  complexity:3,castingFatigue:15});
 const serialized=js(out),result=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...result,document:result.ok?out:null,serialized:result.ok?serialized:null};
}
