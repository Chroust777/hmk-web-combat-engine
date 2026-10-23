/** HMK v1.2 pp.269-271: auditable elixir imbibing on the existing journal.
 * First implemented canonical effect: Darkvision. Other elixirs stay disabled
 * until their specific health/astral/skill consequences are integrated.
 */
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';
import {classifyProfusionImbibing} from './hmk-alchemy-profusion.js';
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
export const ALCHEMY_IMBIBING_FORMAT='hmk-alchemy-imbibing-v1';
const ok=(x,m)=>{if(!x)throw Error(m)};
const whole=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const originOK=o=>['manual','cryptographic-software-die'].includes(o);
const relevant=(j,c)=>j.calendarCampaignId===c;
export function activeDarkvision(journal=[],campaignId,targetId,minute=1e9){
 return journal.filter(j=>relevant(j,campaignId)&&j.calendarAlchemyImbibing?.targetId===targetId&&
  j.calendarAlchemyImbibing?.elixirName==='Darkvision'&&j.campaignMinute<=minute)
  .map(j=>({useId:j.id,...j.calendarAlchemyImbibing,state:alchemyElixirStrength(journal,campaignId,j.calendarAlchemyImbibing.finishId,minute)}))
  .filter(x=>x.state.currentAS>0&&x.state.activeTemporary&&x.state.imbibingId===x.useId);
}
/** HMK v1.2 p.271: currently active Erudition enchantments, reconstructed
 * from the same immutable finish / imbibing / decay / Physic evidence.
 */
export function activeErudition(journal=[],campaignId,targetId,minute=1e9){
 return journal.filter(j=>relevant(j,campaignId)&&j.calendarAlchemyImbibing?.targetId===targetId&&
  j.calendarAlchemyImbibing?.elixirName==='Erudition'&&j.campaignMinute<=minute)
  .map(j=>({useId:j.id,...j.calendarAlchemyImbibing,state:alchemyElixirStrength(journal,campaignId,j.calendarAlchemyImbibing.finishId,minute)}))
  .filter(x=>x.state.currentAS>0&&x.state.activeTemporary&&x.state.imbibingId===x.useId);
}
/** Shared, rules-based secondary Ill Effects. Footpad uses the *existing* Aural Shock,
 * not a second health counter. The explicit sourceElixir discriminator is included
 * only for Footpad, preserving all v93.429 historical Erudition evidence unchanged.
 */
function concurrentAlchemyIllEffects(sources){
 return sources.map(a=>a.elixirName==='Darkvision'?
  {sourceUseId:a.useId,kind:'vision-light-penalty',baseAS:a.asBefore,penalty:Math.round(a.asBefore*2.5)}:
  a.elixirName==='Footpad'?
  {sourceUseId:a.useId,kind:'aural-shock',levels:1,weakness:5,sourceElixir:'Footpad'}:
  {sourceUseId:a.useId,kind:'aural-shock',levels:1,weakness:5});
}
/** HMK v1.2 p.272 Footpad: temporary sound-muffling enchantment. */
export function activeFootpad(journal=[],campaignId,targetId,minute=1e9){
 return journal.filter(j=>relevant(j,campaignId)&&j.calendarAlchemyImbibing?.targetId===targetId&&
  j.calendarAlchemyImbibing?.elixirName==='Footpad'&&j.campaignMinute<=minute)
  .map(j=>({useId:j.id,...j.calendarAlchemyImbibing,state:alchemyElixirStrength(journal,campaignId,j.calendarAlchemyImbibing.finishId,minute)}))
  .filter(x=>x.state.currentAS>0&&x.state.activeTemporary&&x.state.imbibingId===x.useId);
}
/** HMK 269/272: Footpad triggers all other active elixirs' Ill Effects on effective CF. */
export function createAlchemyFootpadImbibing({journal=[],inventory=[],campaignId,minute,actorId,targetId,finishId,
 testSkill,ml,d100,origin,emptyId,gmConfirmed=false}={}){
 ok(gmConfirmed===true,'Footpad: GM musí potvrdit úplné podání do jednoho kola');
 ok(typeof campaignId==='string'&&campaignId&&whole(minute,0,1e9)&&typeof actorId==='string'&&actorId&&
  typeof targetId==='string'&&targetId&&typeof emptyId==='string'&&emptyId,
  'Footpad: neplatná kampaň, čas nebo postava');
 ok(['Aura','Alchemy'].includes(testSkill)&&whole(ml,1,1000)&&whole(d100,1,100)&&originOK(origin),
  'Footpad: nutný skutečný Aura/Alchemy d100 a původ hodu');
 const state=alchemyElixirStrength(journal,campaignId,finishId,minute);
 ok(state.elixirName==='Footpad'&&state.currentAS>0&&!state.dispersed&&!state.activeTemporary&&!state.expires&&
  state.nextDueMinute>minute,'Footpad: chybí nepoužitá dávka nebo je splatný Decay');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 ok(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot)&&
  inventory.some(x=>x.id===vial.vialId&&x.characterId===actorId&&x.slot===vial.slot&&x.quantity===1),
  'Footpad: chybí skutečná nesená lahvička ve vlastnictví podávajícího');
 const others=[...activeDarkvision(journal,campaignId,targetId,minute),
  ...activeErudition(journal,campaignId,targetId,minute),...activeFootpad(journal,campaignId,targetId,minute)];
 ok(others.every(x=>x.state.nextDueMinute>minute),'Footpad: nejdříve vyřešte splatný Decay');
 const profusion=classifyProfusionImbibing(d100,ml,others.length);
 const level=profusion.adjusted,delta={CF:-2,F:-1,S:0,CS:1}[level];
 const finalAS=Math.max(0,state.currentAS+delta);
 const affected=level==='CF'&&finalAS>0?concurrentAlchemyIllEffects(others):[];
 return {format:ALCHEMY_IMBIBING_FORMAT,campaignId,minute,actorId,targetId,finishId,
  emptyId,vialId:vial.vialId,elixirName:'Footpad',consumptionAction:actorId===targetId?'self-1-turn':'administered-1-round',
  testSkill,ml,d100,origin,otherActiveElixirs:others.length,profusionCF:profusion.profusionCF,
  sl:level,asBefore:state.currentAS,modifier:delta,finalAS,temporary:finalAS>0,
  ...(affected.length?{profusionIllEffects:affected}:{}),
  illEffect:level==='CF'&&finalAS>0?{kind:'aural-shock',levels:1,weakness:5,recoveryPending:true}:null,
  consumedWithinRoundConfirmed:true,gmConfirmed:true,sourcePages:[269,270,272]};
}
/** Use existing shared Aural Shock and Combat State; do not create a health subsystem. */
export function applyAlchemyFootpadAural({state=null,arcane=null,proof,eventId}={}){
 ok(proof?.format===ALCHEMY_IMBIBING_FORMAT&&proof.elixirName==='Footpad'&&proof.sl==='CF'&&
  whole(proof.ml,1,1000)&&whole(proof.d100,1,100)&&originOK(proof.origin)&&
  classifyProfusionImbibing(proof.d100,proof.ml,proof.otherActiveElixirs).adjusted==='CF'&&
  whole(proof.otherActiveElixirs,0,100)&&whole(proof.asBefore,1,11)&&proof.modifier===-2&&
  proof.finalAS===Math.max(0,proof.asBefore-2)&&proof.finalAS>0&&
  proof.illEffect?.kind==='aural-shock'&&proof.illEffect.levels===1&&proof.illEffect.weakness===5&&
  typeof eventId==='string'&&eventId.length>=3,'Footpad CF: neúplný původní důkaz');
 const s=structuredClone(state??initialCombatState()),a=structuredClone(arcane??{});
 validateCombatState(s);
 ok(s.shock!=='KIA'&&!s.events.some(e=>e.id===eventId),'Footpad CF: KIA nebo duplicitní důkaz');
 const before=a.auralShockLevels??0;
 ok(whole(before,0,98)&&whole(s.fatigue.otherWeakness,0,99994),'Footpad CF: překročené hodnoty');
 a.auralShockLevels=before+1;s.fatigue.otherWeakness+=5;
 s.events.push({id:eventId,type:'hmk-alchemy-footpad-aural',round:Math.max(1,s.lastRound||1),
  details:{sourceEventId:eventId,finishId:proof.finishId,targetId:proof.targetId,
   calendarCampaignId:proof.campaignId,calendarMinute:proof.minute,imbibingD100:proof.d100,
   diceOrigin:proof.origin,auralShock:1,weaknessAdded:5,auralBefore:before,
   auralAfter:a.auralShockLevels,sourcePage:272,nonCombat:true}});
 validateCombatState(s);
 return {state:s,arcane:a,auralShockAdded:1,weaknessAdded:5};
}
/** First Erudition dose, HMK pp.269–271. Mixed-elixir CF is blocked until
 * every concurrent Ill Effect can be committed atomically. This is not a
 * reroll permission: no physical vial is consumed on a rejected operation.
 */
export function createAlchemyEruditionImbibing({journal=[],inventory=[],campaignId,minute,actorId,targetId,finishId,
 testSkill,ml,d100,origin,emptyId,gmConfirmed=false}={}){
 ok(gmConfirmed===true,'Erudition: GM musí potvrdit celé vypití do jednoho kola');
 ok(typeof campaignId==='string'&&campaignId&&whole(minute,0,1e9)&&typeof actorId==='string'&&actorId&&
  typeof targetId==='string'&&targetId&&typeof emptyId==='string'&&emptyId,
  'Erudition: neplatná kampaň, čas nebo postava');
 ok(['Aura','Alchemy'].includes(testSkill)&&whole(ml,1,1000)&&whole(d100,1,100)&&originOK(origin),
  'Erudition: povinný doložený Aura/Alchemy d100');
 const state=alchemyElixirStrength(journal,campaignId,finishId,minute);
 ok(state.elixirName==='Erudition','Erudition: vybraná lahvička není Erudition');
 ok(state.currentAS>0&&!state.dispersed&&!state.activeTemporary&&!state.expires&&state.nextDueMinute>minute,
  'Erudition: dávka není dostupná nebo má splatný Decay Roll');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 ok(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot)&&
  inventory.some(x=>x.id===vial.vialId&&x.characterId===actorId&&x.slot===vial.slot&&x.quantity===1),
  'Erudition: dávku smí podat jen vlastník existující nesené lahvičky');
 const current=activeErudition(journal,campaignId,targetId,minute);
 const otherVision=activeDarkvision(journal,campaignId,targetId,minute);
 const footpadSources=activeFootpad(journal,campaignId,targetId,minute);
 const otherCount=current.length+otherVision.length+footpadSources.length;
 const profusion=classifyProfusionImbibing(d100,ml,otherCount);
 const level=profusion.adjusted,delta={CF:-2,F:-1,S:0,CS:1}[level];
 const finalAS=Math.max(0,state.currentAS+delta);

 // A CF affects the newly swallowed Erudition AND every already active
 // enchantment. Each secondary effect gets an independently replayable proof.
 const affected=level==='CF'&&finalAS>0?concurrentAlchemyIllEffects([...otherVision,...current,...footpadSources]):[];
 return {format:ALCHEMY_IMBIBING_FORMAT,campaignId,minute,actorId,targetId,finishId,
  emptyId,vialId:vial.vialId,elixirName:'Erudition',consumptionAction:actorId===targetId?'self-1-turn':'administered-1-round',
  testSkill,ml,d100,origin,otherActiveElixirs:otherCount,profusionCF:profusion.profusionCF,
  sl:level,asBefore:state.currentAS,modifier:delta,finalAS,temporary:finalAS>0,
  ...(affected.length?{profusionIllEffects:affected}:{}),
  illEffect:level==='CF'&&finalAS>0?{kind:'aural-shock',levels:1,weakness:5,recoveryPending:true}:null,
  consumedWithinRoundConfirmed:true,gmConfirmed:true,sourcePages:[269,270,271]};
}
export function createAlchemyDarkvisionImbibing({journal=[],inventory=[],campaignId,minute,actorId,targetId,finishId,
 testSkill,ml,d100,origin,emptyId,gmConfirmed=false}={}){
 ok(gmConfirmed===true,'Alchemy: GM musí potvrdit skutečné úplné vypití během jednoho kola');
 ok(typeof campaignId==='string'&&campaignId&&whole(minute,0,1e9)&&typeof targetId==='string'&&targetId&&
  typeof actorId==='string'&&actorId&&typeof emptyId==='string'&&emptyId,'Alchemy: neplatná kampaň, čas nebo osoby');
 ok(['Aura','Alchemy'].includes(testSkill)&&whole(ml,1,1000)&&whole(d100,1,100)&&originOK(origin),
  'Alchemy: Imbibing Roll vyžaduje skutečné Aura nebo Alchemy ML a doložený d100');
 const state=alchemyElixirStrength(journal,campaignId,finishId,minute);
 ok(state.elixirName==='Darkvision','Alchemy: mechanicky podporován zatím pouze Darkvision (HMK 271)');
 ok(state.currentAS>0&&!state.dispersed&&!state.activeTemporary&&!state.expires,
  'Alchemy: neexistující, použitý nebo neaktivní elixír nelze vypít');
 ok(state.nextDueMinute>minute,'Alchemy: nejprve vyhodnoťte splatný Decay Roll');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 ok(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot)&&
  inventory.some(x=>x.id===vial.vialId&&x.characterId===actorId&&x.slot===vial.slot&&x.quantity===1),
  'Alchemy: dávku musí podat skutečný vlastník držené existující nádoby');
 const footpadSources=activeFootpad(journal,campaignId,targetId,minute);
 const others=activeDarkvision(journal,campaignId,targetId,minute).length+
  activeErudition(journal,campaignId,targetId,minute).length+footpadSources.length;
 const profusion=classifyProfusionImbibing(d100,ml,others);
 const level=profusion.adjusted,delta={CF:-2,F:-1,S:0,CS:1}[level];
 const finalAS=Math.max(0,state.currentAS+delta);

 const existingErudition=activeErudition(journal,campaignId,targetId,minute);
 return {format:ALCHEMY_IMBIBING_FORMAT,campaignId,minute,actorId,targetId,finishId,
  emptyId,vialId:vial.vialId,elixirName:'Darkvision',consumptionAction:actorId===targetId?'self-1-turn':'administered-1-round',testSkill,ml,d100,origin,
  otherActiveElixirs:others,profusionCF:profusion.profusionCF,
  ...(others>0?{profusionIllEffects:level==='CF'&&finalAS>0?[
   ...concurrentAlchemyIllEffects([...activeDarkvision(journal,campaignId,targetId,minute),...existingErudition,...footpadSources])]:[]}:{}),
  sl:level,asBefore:state.currentAS,modifier:delta,finalAS,
  temporary:finalAS>0,darkvisionFeet:finalAS*5,
  // CF light sensitivity is a real adverse effect; do not invent a recovery roll.
  illEffect:level==='CF'&&finalAS>0?{kind:'vision-light-penalty',penalty:Math.round(state.currentAS*2.5),
    healingPeriodDays:'d6',healingRate:5,recoveryPending:true}:null,
  consumedWithinRoundConfirmed:true,gmConfirmed:true,sourcePages:[269,270,271]};
}
/** HMK v1.2 pp.269-270, 273: Physic never contributes to Profusion.
 * Only currently implemented targets (Darkvision) may be disenchanted.
 * CF is recorded with Aural Shock 1 in the existing Combat State, and
 * the entire journal/health operation must commit atomically.
 */
export function createAlchemyPhysicImbibing({journal=[],inventory=[],campaignId,minute,actorId,targetId,finishId,
 testSkill,ml,d100,origin,emptyId,gmConfirmed=false}={}){
 ok(gmConfirmed===true,'Physic: GM musí potvrdit celé podání během jednoho kola');
 ok(typeof campaignId==='string'&&campaignId&&whole(minute,0,1e9)&&typeof actorId==='string'&&actorId&&
  typeof targetId==='string'&&targetId&&typeof emptyId==='string'&&emptyId,
  'Physic: neplatný kontext kampaně, hodu nebo postav');
 ok(['Aura','Alchemy'].includes(testSkill)&&whole(ml,1,1000)&&whole(d100,1,100)&&originOK(origin),
  'Physic: nutný doložený Aura/Alchemy d100');
 const state=alchemyElixirStrength(journal,campaignId,finishId,minute);
 ok(state.elixirName==='Physic','Physic: dávka není elixír Physic');
 ok(state.currentAS>0&&!state.dispersed&&!state.activeTemporary&&!state.expires&&state.nextDueMinute>minute,
  'Physic: dávka není dostupná nebo má splatný Decay');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 ok(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot)&&
  inventory.some(x=>x.id===vial.vialId&&x.characterId===actorId&&x.slot===vial.slot&&x.quantity===1),
  'Physic: nutná skutečná nesená fyzická lahvička');
 // The CF outcome is never rerolled or downgraded, regardless of existing
 // elixirs: Physic is explicitly exempt from Profusion (p.270).
 const level=classifyProfusionImbibing(d100,ml,0).adjusted;
 const delta={CF:-2,F:-1,S:0,CS:1}[level],finalAS=Math.max(0,state.currentAS+delta);
 const footpadSources=activeFootpad(journal,campaignId,targetId,minute);

 const affected=[...activeDarkvision(journal,campaignId,targetId,minute),...activeErudition(journal,campaignId,targetId,minute),...footpadSources];
 ok(affected.every(x=>x.state.nextDueMinute>minute),
  'Physic: nejprve vyhodnoťte všechny splatné alchymistické Decay Rolls');
 const physicEffects=finalAS>0?affected
  .map(x=>({finishId:x.finishId,sourceUseId:x.useId,asBefore:x.state.currentAS,
   asAfter:Math.max(0,x.state.currentAS-finalAS)})) : [];
 ok(new Set(physicEffects.map(x=>x.finishId)).size===physicEffects.length,
  'Physic: nelze použít stejný aktivní zdroj dvakrát');
 return {format:ALCHEMY_IMBIBING_FORMAT,campaignId,minute,actorId,targetId,finishId,
  emptyId,vialId:vial.vialId,elixirName:'Physic',consumptionAction:actorId===targetId?'self-1-turn':'administered-1-round',
  testSkill,ml,d100,origin,otherActiveElixirs:0,profusionCF:false,
  sl:level,asBefore:state.currentAS,modifier:delta,finalAS,temporary:false,
  physicEffects,
  ...(level==='CF'&&finalAS>0&&affected.length?{profusionIllEffects:concurrentAlchemyIllEffects(affected)}:{}),
  illEffect:level==='CF'&&finalAS>0?{kind:'aural-shock',levels:1,weakness:5,recoveryPending:true}:null,
  consumedWithinRoundConfirmed:true,gmConfirmed:true,sourcePages:[269,270,273]};
}
/** Immutable Physic CF evidence is mirrored in the SAME shared Combat State
 * and arcane Aural Shock counters as spell and alchemical dissolution.
 * A schema round value is historical metadata, not an invented combat turn.
 */
export function applyAlchemyPhysicAural({state=null,arcane=null,proof,eventId}={}){
 ok(proof?.format===ALCHEMY_IMBIBING_FORMAT&&proof.elixirName==='Physic'&&
  proof.sl==='CF'&&whole(proof.ml,1,1000)&&whole(proof.d100,1,100)&&
  originOK(proof.origin)&&classifyProfusionImbibing(proof.d100,proof.ml,0).adjusted==='CF'&&
  whole(proof.asBefore,1,11)&&proof.modifier===-2&&
  proof.finalAS===Math.max(0,proof.asBefore-2)&&proof.finalAS>0&&
  proof.illEffect?.kind==='aural-shock'&&
  proof.illEffect.levels===1&&proof.illEffect.weakness===5&&
  typeof eventId==='string'&&eventId.length>=3,
  'Physic CF: chybí doložený účinný Imbibing a Aural Shock 1');
 const s=structuredClone(state??initialCombatState()),a=structuredClone(arcane??{});
 validateCombatState(s);
 ok(s.shock!=='KIA'&&!s.events.some(e=>e.id===eventId),
  'Physic CF: zemřelá postava nebo opakovaný historický důkaz');
 const before=a.auralShockLevels??0;
 ok(whole(before,0,98)&&whole(s.fatigue.otherWeakness,0,99994),
  'Physic CF: Aural Shock/Weakness překročil limity');
 a.auralShockLevels=before+1;s.fatigue.otherWeakness+=5;
 s.events.push({id:eventId,type:'hmk-alchemy-physic-aural',round:Math.max(1,s.lastRound||1),
  details:{sourceEventId:eventId,finishId:proof.finishId,targetId:proof.targetId,
   calendarCampaignId:proof.campaignId,calendarMinute:proof.minute,imbibingD100:proof.d100,
   diceOrigin:proof.origin,auralShock:1,weaknessAdded:5,auralBefore:before,
   auralAfter:a.auralShockLevels,sourcePage:273,nonCombat:true}});
 validateCombatState(s);
 return {state:s,arcane:a,auralShockAdded:1,weaknessAdded:5};
}
/** Append to existing Combat State; no duplicate health or clock model.
 * Successful imbibing with no CF creates no Aural Shock event.
 */
export function applyAlchemyEruditionAural({state=null,arcane=null,proof,eventId}={}){
 ok(proof?.format===ALCHEMY_IMBIBING_FORMAT&&proof.elixirName==='Erudition'&&
  proof.sl==='CF'&&whole(proof.ml,1,1000)&&whole(proof.d100,1,100)&&originOK(proof.origin)&&
  classifyProfusionImbibing(proof.d100,proof.ml,proof.otherActiveElixirs).adjusted==='CF'&&
  whole(proof.otherActiveElixirs,0,100)&&whole(proof.asBefore,1,11)&&proof.modifier===-2&&
  proof.finalAS===Math.max(0,proof.asBefore-2)&&proof.finalAS>0&&
  proof.illEffect?.kind==='aural-shock'&&proof.illEffect.levels===1&&proof.illEffect.weakness===5&&
  typeof eventId==='string'&&eventId.length>=3,
  'Erudition CF: chybí úplný doklad o Aural Shock 1');
 const s=structuredClone(state??initialCombatState()),a=structuredClone(arcane??{});
 validateCombatState(s);
 ok(s.shock!=='KIA'&&!s.events.some(e=>e.id===eventId),
  'Erudition CF: zemřelá postava nebo duplicitní zdravotní důkaz');
 const before=a.auralShockLevels??0;
 ok(whole(before,0,98)&&whole(s.fatigue.otherWeakness,0,99994),'Erudition: překročené limity Aural/Weakness');
 a.auralShockLevels=before+1;s.fatigue.otherWeakness+=5;
 s.events.push({id:eventId,type:'hmk-alchemy-erudition-aural',round:Math.max(1,s.lastRound||1),
  details:{sourceEventId:eventId,finishId:proof.finishId,targetId:proof.targetId,
   calendarCampaignId:proof.campaignId,calendarMinute:proof.minute,imbibingD100:proof.d100,
   diceOrigin:proof.origin,auralShock:1,weaknessAdded:5,auralBefore:before,
   auralAfter:a.auralShockLevels,sourcePage:271,nonCombat:true}});
 validateCombatState(s);
 return {state:s,arcane:a,auralShockAdded:1,weaknessAdded:5};
}
export function validateAlchemyImbibingJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const p=row.calendarAlchemyImbibing;
  if(p){
   ok(p.campaignId===row.calendarCampaignId&&p.minute===row.campaignMinute&&
    p.actorId===row.characterId,'Alchemy Imbibing: poškozený kontext');
   const empty=prior.find(j=>j.id===p.emptyId&&j.calendarAlchemyVialEmpty);
   ok(empty&&empty.calendarCampaignId===p.campaignId&&empty.campaignMinute===p.minute&&
    empty.calendarAlchemyVialEmpty.finishId===p.finishId&&empty.calendarAlchemyVialEmpty.vialId===p.vialId,
    'Alchemy Imbibing: chybí bezprostřední fyzická spotřeba obsahu');
   // Replay from journal immediately before the empty proof, allowing genuine transfers.
   const beforeEmpty=prior.slice(0,prior.indexOf(empty));
   const state=alchemyVialState(beforeEmpty,p.campaignId,p.finishId,p.minute);
   const item=state&&{id:state.vialId,characterId:state.ownerId,slot:state.slot,quantity:1};
   ok(item&&item.characterId===p.actorId,'Alchemy Imbibing: nesprávný vlastník nádoby');
   const create=p.elixirName==='Physic'?createAlchemyPhysicImbibing:p.elixirName==='Erudition'?createAlchemyEruditionImbibing:p.elixirName==='Footpad'?createAlchemyFootpadImbibing:createAlchemyDarkvisionImbibing;
   const reproduced=create({journal:beforeEmpty,inventory:[item],campaignId:p.campaignId,
    minute:p.minute,actorId:p.actorId,targetId:p.targetId,finishId:p.finishId,testSkill:p.testSkill,
    ml:p.ml,d100:p.d100,origin:p.origin,emptyId:p.emptyId,gmConfirmed:p.gmConfirmed});
   ok(JSON.stringify(reproduced)===JSON.stringify(p),'Alchemy Imbibing: historický výsledek byl změněn');
  }
  prior.push(row);
 }
 return true;
}
export function assertAlchemyImbibingAppendOnly(before=[],after=[]){
 const map=new Map(after.map(x=>[x.id,x]));
 for(const j of before)if(j.calendarAlchemyImbibing)
  ok(JSON.stringify(map.get(j.id))===JSON.stringify(j),'Alchemy Imbibing: důkaz nelze upravovat ani odstranit');
 return true;
}

/** On any effective CF, EACH previously active Darkvision induces
 * its own Ill Effect (p.269), even when the trigger is exempt from Profusion
 * (Physic). One auditable proof per source; recovery remains
 * in the existing Darkvision Exposure Healing mechanism.
 */
export function createDarkvisionProfusionIll({journal=[],campaignId,minute,triggerUseId,sourceUseId,targetId}={}){
 const trigger=journal.find(j=>j.id===triggerUseId&&j.calendarCampaignId===campaignId&&j.campaignMinute===minute);
 const p=trigger?.calendarAlchemyImbibing;
 ok(['Darkvision','Physic','Erudition','Footpad'].includes(p?.elixirName)&&p.targetId===targetId&&p.sl==='CF'&&p.finalAS>0,
  'Profusion: chybí skutečný účinný Critical Failure Imbibing');
 const known=p.profusionIllEffects?.find(x=>x.sourceUseId===sourceUseId);
 ok(!!known&&sourceUseId!==triggerUseId,'Profusion: předchozí aktivní elixír nebyl v CF důkazu');
 const earlier=journal.slice(0,journal.indexOf(trigger));
 const active=activeDarkvision(earlier,campaignId,targetId,minute).find(x=>x.useId===sourceUseId);
 ok(!!active&&active.asBefore===known.baseAS&&Math.round(active.asBefore*2.5)===known.penalty,
  'Profusion: chybí platný aktivní zdroj Ill Effect');
 ok(!journal.some(j=>j.calendarCampaignId===campaignId&&j.calendarAlchemyDarkvisionProfusionIll?.triggerUseId===triggerUseId&&
  j.calendarAlchemyDarkvisionProfusionIll.sourceUseId===sourceUseId),
  'Profusion: stejný Ill Effect nelze doložit dvakrát');
 return {format:'hmk-darkvision-profusion-ill-v1',campaignId,minute,triggerUseId,sourceUseId,targetId,
  elixirName:'Darkvision',baseAS:known.baseAS,illEffect:{kind:'vision-light-penalty',penalty:known.penalty,
   healingPeriodDays:'d6',healingRate:5,recoveryPending:true},sourcePages:[269,270,271]};
}
export function validateDarkvisionProfusionJournal(journal=[]){
 const before=[];
 for(const row of journal){
  const p=row.calendarAlchemyDarkvisionProfusionIll;
  if(p){
   ok(p.campaignId===row.calendarCampaignId&&p.minute===row.campaignMinute&&p.targetId===row.characterId,
    'Profusion: poškozený kontext Ill Effect');
   const expected=createDarkvisionProfusionIll({...p,journal:before});
   ok(JSON.stringify(expected)===JSON.stringify(p),'Profusion: změněný historický důkaz');
  }
  before.push(row);
 }
 for(const row of journal){
  const p=row.calendarAlchemyImbibing;
  if(!p?.profusionIllEffects?.length)continue;
  for(const x of p.profusionIllEffects.filter(x=>x.kind==='vision-light-penalty')){
   const proofs=journal.filter(j=>j.calendarCampaignId===row.calendarCampaignId&&j.campaignMinute===row.campaignMinute&&
    j.calendarAlchemyDarkvisionProfusionIll?.triggerUseId===row.id&&j.calendarAlchemyDarkvisionProfusionIll.sourceUseId===x.sourceUseId);
   ok(proofs.length===1,'Profusion: CF musí obsahovat samostatný úplný důkaz Ill Effect každého aktivního elixíru');
  }
 }
 return true;
}
export function assertDarkvisionProfusionAppendOnly(before=[],after=[]){
 const map=new Map(after.map(x=>[x.id,x]));
 for(const row of before)if(row.calendarAlchemyDarkvisionProfusionIll)
  ok(JSON.stringify(map.get(row.id))===JSON.stringify(row),'Profusion: historický Ill Effect nelze změnit');
 return true;
}


/** HMK v1.2 pp.269–271: when an effective CF strikes a subject with
 * an active Erudition, that prior elixir contributes its own Aural Shock 1.
 * This is distinct from the new elixir's own CF and retains its source ID.
 */
export function createEruditionProfusionIll({journal=[],campaignId,minute,triggerUseId,sourceUseId,targetId}={}){
 const trigger=journal.find(j=>j.id===triggerUseId&&j.calendarCampaignId===campaignId&&j.campaignMinute===minute);
 const p=trigger?.calendarAlchemyImbibing;
 ok(['Darkvision','Erudition','Physic','Footpad'].includes(p?.elixirName)&&p.targetId===targetId&&
  p.sl==='CF'&&p.finalAS>0,'Erudition Profusion: chybí účinné CF Imbibing');
 const known=p.profusionIllEffects?.filter(x=>x.sourceUseId===sourceUseId&&x.kind==='aural-shock')||[];
 ok(known.length===1&&known[0].levels===1&&known[0].weakness===5&&sourceUseId!==triggerUseId,
  'Erudition Profusion: chybí jednoznačný předchozí Aural Shock');
 const earlier=journal.slice(0,journal.indexOf(trigger));
 ok(!!activeErudition(earlier,campaignId,targetId,minute).find(x=>x.useId===sourceUseId),
  'Erudition Profusion: zdroj již není účinný nebo patří jiné kampani');
 ok(!journal.some(j=>j.calendarCampaignId===campaignId&&
  j.calendarAlchemyEruditionProfusionIll?.triggerUseId===triggerUseId&&
  j.calendarAlchemyEruditionProfusionIll.sourceUseId===sourceUseId),
  'Erudition Profusion: opakovaný historický důkaz');
 return {format:'hmk-erudition-profusion-ill-v1',campaignId,minute,triggerUseId,
  sourceUseId,targetId,elixirName:'Erudition',illEffect:{kind:'aural-shock',levels:1,weakness:5,recoveryPending:true},
  sourcePages:[269,270,271]};
}
/** Adds a genuine event to the EXISTING Combat State without starting a
 * fictitious combat or calendar turn. Caller commits alongside consumption.
 */
function appendSecondaryAlchemyAural({state=null,arcane=null,proof,eventId,sourcePage=269}={}){
 const s=structuredClone(state??initialCombatState()),a=structuredClone(arcane??{});
 validateCombatState(s);
 ok(s.shock!=='KIA'&&!s.events.some(e=>e.id===eventId),'Alchemy Profusion: KIA nebo duplicitní Aural event');
 const before=a.auralShockLevels??0;
 ok(whole(before,0,98)&&whole(s.fatigue.otherWeakness,0,99994),
  'Alchemy Profusion: překročené hodnoty Aural Shock');
 a.auralShockLevels=before+1;s.fatigue.otherWeakness+=5;
 s.events.push({id:eventId,type:'hmk-alchemy-profusion-aural',round:Math.max(1,s.lastRound||1),
  details:{triggerUseId:proof.triggerUseId,sourceUseId:proof.sourceUseId,targetId:proof.targetId,
   calendarCampaignId:proof.campaignId,calendarMinute:proof.minute,auralShock:1,
   weaknessAdded:5,auralBefore:before,auralAfter:a.auralShockLevels,sourcePage,nonCombat:true}});
 validateCombatState(s);
 return {state:s,arcane:a,auralShockAdded:1,weaknessAdded:5};
}
export function applyEruditionProfusionAural({journal=[],state=null,arcane=null,proof,eventId}={}){
 const expected=createEruditionProfusionIll({...proof,journal});
 ok(JSON.stringify(expected)===JSON.stringify(proof)&&typeof eventId==='string'&&eventId.length>=3,
  'Erudition Profusion: pozměněný důkaz');
 return appendSecondaryAlchemyAural({state,arcane,proof,eventId,sourcePage:269});
}
/** HMK pp.269, 272: independent, immutable Footpad secondary CF evidence. */
export function createFootpadProfusionIll({journal=[],campaignId,minute,triggerUseId,sourceUseId,targetId}={}){
 const trigger=journal.find(j=>j.id===triggerUseId&&j.calendarCampaignId===campaignId&&j.campaignMinute===minute);
 const p=trigger?.calendarAlchemyImbibing;
 ok(['Darkvision','Erudition','Physic','Footpad'].includes(p?.elixirName)&&p.targetId===targetId&&
  p.sl==='CF'&&p.finalAS>0,'Footpad Profusion: chybí účinný spouštěcí CF');
 const known=p.profusionIllEffects?.filter(x=>x.sourceUseId===sourceUseId&&x.kind==='aural-shock'&&x.sourceElixir==='Footpad')||[];
 ok(known.length===1&&known[0].levels===1&&known[0].weakness===5&&sourceUseId!==triggerUseId,
  'Footpad Profusion: chybí jednoznačný nezávislý Aural Shock');
 const earlier=journal.slice(0,journal.indexOf(trigger));
 ok(!!activeFootpad(earlier,campaignId,targetId,minute).find(x=>x.useId===sourceUseId),
  'Footpad Profusion: původní Footpad není aktivní v této kampani');
 ok(!journal.some(j=>j.calendarCampaignId===campaignId&&
  j.calendarAlchemyFootpadProfusionIll?.triggerUseId===triggerUseId&&
  j.calendarAlchemyFootpadProfusionIll.sourceUseId===sourceUseId),
  'Footpad Profusion: zdvojený důkaz');
 return {format:'hmk-footpad-profusion-ill-v1',campaignId,minute,triggerUseId,sourceUseId,targetId,
  elixirName:'Footpad',illEffect:{kind:'aural-shock',levels:1,weakness:5,recoveryPending:true},sourcePages:[269,270,272]};
}
/** Reuse the same combat-state Aural Shock + Weakness calculation as Erudition. */
export function applyFootpadProfusionAural({journal=[],state=null,arcane=null,proof,eventId}={}){
 const expected=createFootpadProfusionIll({...proof,journal});
 ok(JSON.stringify(expected)===JSON.stringify(proof)&&typeof eventId==='string'&&eventId.length>=3,
  'Footpad Profusion: neplatný či pozměněný zdravotní důkaz');
 return appendSecondaryAlchemyAural({state,arcane,proof,eventId,sourcePage:272});
}
export function validateFootpadProfusionJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const p=row.calendarAlchemyFootpadProfusionIll;
  if(p){
   ok(p.campaignId===row.calendarCampaignId&&p.minute===row.campaignMinute&&p.targetId===row.characterId,
    'Footpad Profusion: nesprávný kontext');
   ok(JSON.stringify(createFootpadProfusionIll({...p,journal:prior}))===JSON.stringify(p),
    'Footpad Profusion: historický důkaz byl změněn');
  }
  prior.push(row);
 }
 for(const row of journal){
  const p=row.calendarAlchemyImbibing;
  if(!p?.profusionIllEffects?.length)continue;
  for(const x of p.profusionIllEffects.filter(x=>x.kind==='aural-shock'&&x.sourceElixir==='Footpad')){
   const matching=journal.filter(j=>j.calendarCampaignId===row.calendarCampaignId&&
    j.campaignMinute===row.campaignMinute&&j.calendarAlchemyFootpadProfusionIll?.triggerUseId===row.id&&
    j.calendarAlchemyFootpadProfusionIll.sourceUseId===x.sourceUseId);
   ok(matching.length===1,'Footpad Profusion: chybí samostatný důkaz každého aktivního Footpad');
  }
 }
 return true;
}
export function assertFootpadProfusionAppendOnly(before=[],after=[]){
 const byId=new Map(after.map(j=>[j.id,j]));
 for(const row of before)if(row.calendarAlchemyFootpadProfusionIll)
  ok(JSON.stringify(byId.get(row.id))===JSON.stringify(row),'Footpad Profusion: důkaz nelze změnit ani smazat');
 return true;
}

export function validateEruditionProfusionJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const p=row.calendarAlchemyEruditionProfusionIll;
  if(p){
   ok(p.campaignId===row.calendarCampaignId&&p.minute===row.campaignMinute&&
    p.targetId===row.characterId,'Erudition Profusion: chybná kampaň či příjemce');
   ok(JSON.stringify(createEruditionProfusionIll({...p,journal:prior}))===JSON.stringify(p),
    'Erudition Profusion: historický důkaz se změnil');
  }
  prior.push(row);
 }
 for(const row of journal){
  const p=row.calendarAlchemyImbibing;
  if(!p?.profusionIllEffects?.length)continue;
  for(const x of p.profusionIllEffects.filter(x=>x.kind==='aural-shock'&&x.sourceElixir!=='Footpad')){
   const matching=journal.filter(j=>j.calendarCampaignId===row.calendarCampaignId&&
    j.campaignMinute===row.campaignMinute&&j.calendarAlchemyEruditionProfusionIll?.triggerUseId===row.id&&
    j.calendarAlchemyEruditionProfusionIll.sourceUseId===x.sourceUseId);
   ok(matching.length===1,'Erudition Profusion: chybí povinný samostatný Aural důkaz');
  }
 }
 return true;
}
export function assertEruditionProfusionAppendOnly(before=[],after=[]){
 const byId=new Map(after.map(j=>[j.id,j]));
 for(const row of before)if(row.calendarAlchemyEruditionProfusionIll)
  ok(JSON.stringify(byId.get(row.id))===JSON.stringify(row),
   'Erudition Profusion: nelze změnit ani vymazat Aural důkaz');
 return true;
}
