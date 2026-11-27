/** HMK v1.2 pp.269-271: auditable elixir imbibing on the existing journal.
 * First implemented canonical effect: Darkvision. Other elixirs stay disabled
 * until their specific health/astral/skill consequences are integrated.
 */
import {alchemyElixirStrength} from './hmk-alchemy-decay.js?v=94.164';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';
import {classifyProfusionImbibing,canonicalProfusionProfile} from './hmk-alchemy-profusion.js';
import {supportedAlchemyConcurrentIllEffect,planAlchemyIllEffect} from './hmk-alchemy-ill-effects.js?v=94.164';
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
export const ALCHEMY_IMBIBING_FORMAT='hmk-alchemy-imbibing-v1';
const ok=(x,m)=>{if(!x)throw Error(m)};
const whole=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const originOK=o=>['manual','cryptographic-software-die'].includes(o);
const relevant=(j,c)=>j.calendarCampaignId===c;
const newElixirNames=['Mindsalve','Fireshield','Poison','Quiescence','Iceshield','Warmth','Soulcloak'];
const fullImbibingNames=['Darkvision','Erudition','Physic','Footpad','Egosight','Healing','Verity',...newElixirNames];
const additionalTemporary=['Fireshield','Quiescence','Iceshield','Warmth','Soulcloak'];

export function activeAdditionalTemporary(journal,campaignId,targetId,minute,name){
 return journal.filter(row=>relevant(row,campaignId)&&row.campaignMinute<=minute&&
  row.calendarAlchemyImbibing?.targetId===targetId&&row.calendarAlchemyImbibing?.elixirName===name&&
  typeof row.calendarAlchemyImbibing.finishId==='string'&&row.calendarAlchemyImbibing.finalAS>0)
  .map(row=>({useId:row.id,...row.calendarAlchemyImbibing,
   state:alchemyElixirStrength(journal,campaignId,row.calendarAlchemyImbibing.finishId,minute)}))
  .filter(source=>source.state.activeTemporary&&source.state.imbibingId===source.useId);
}
function activeAdditionalInstant(journal,campaignId,targetId,minute,name){
 return journal.flatMap(row=>{
  const proof=row.calendarAlchemyImbibing;
  if(!relevant(row,campaignId)||row.campaignMinute>minute||proof?.targetId!==targetId||proof?.elixirName!==name)return [];
  const last=journal.findLast(entry=>relevant(entry,campaignId)&&entry.campaignMinute<=minute&&
   entry.calendarAlchemyExtendedRecovery?.useId===row.id)?.calendarAlchemyExtendedRecovery;
  return last?.active&&last.asAfter>0?[{...proof,useId:row.id,state:{currentAS:last.asAfter,nextDueMinute:null}}]:[];
 });
}

function latestHealingReceipt(journal,use,minute){
 return journal.findLast(row=>row.calendarCampaignId===use.calendarCampaignId&&row.campaignMinute<=minute&&
  (row.calendarAlchemyHealingInteraction??row.calendarAlchemyHealingRecovery)?.useId===use.id);
}
function activeHealing(journal,campaignId,targetId,minute){
 return journal.flatMap(use=>{
  const proof=use.calendarAlchemyImbibing;
  if(!relevant(use,campaignId)||use.campaignMinute>minute||proof?.targetId!==targetId||proof.elixirName!=='Healing')return [];
  const row=latestHealingReceipt(journal,use,minute);
  const last=row?.calendarAlchemyHealingInteraction??row?.calendarAlchemyHealingRecovery;
  return last?.nextMinute!=null&&last.asAfter>0?[{...proof,useId:use.id,
   state:{currentAS:last.asAfter,nextDueMinute:null}}]:[];
 });
}
const decayCurrent=(source,minute)=>['Healing','Mindsalve','Poison'].includes(source.elixirName)||source.state.nextDueMinute>minute;
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
/** HMK p.271: active Egosight uses the SAME elixir AS and Decay ledger. */
export function activeEgosight(journal=[],campaignId,targetId,minute=1e9){
 return journal.filter(j=>relevant(j,campaignId)&&j.calendarAlchemyImbibing?.targetId===targetId&&
  j.calendarAlchemyImbibing?.elixirName==='Egosight'&&j.campaignMinute<=minute)
  .map(j=>({useId:j.id,...j.calendarAlchemyImbibing,state:alchemyElixirStrength(journal,campaignId,j.calendarAlchemyImbibing.finishId,minute)}))
  .filter(x=>x.state.currentAS>0&&x.state.activeTemporary&&x.state.imbibingId===x.useId);
}
/** Shared, rules-based secondary Ill Effects. Footpad uses the *existing* Aural Shock,
 * not a second health counter. The explicit sourceElixir discriminator is included
 * only for Footpad, preserving all v93.429 historical Erudition evidence unchanged.
 */
function concurrentAlchemyIllEffects(sources){
 return sources.map(supportedAlchemyConcurrentIllEffect);
}

/** One view of the documented *active* profusion cohort (pp.269–270).
 * The order is deliberately the same as the v93.440 individual finders,
 * so historical imbibing evidence can be replayed byte-for-byte.
 * Unknown/unimplemented imbibing sources are NEVER silently omitted from
 * Profusion: until their effect end can be reconstructed from canonical
 * journal evidence, a new imbibing action is blocked without consuming a vial.
 */
export function activeAlchemyProfusionCohort(journal=[],campaignId,targetId,minute=1e9){
 const live=[...activeDarkvision(journal,campaignId,targetId,minute),
  ...activeErudition(journal,campaignId,targetId,minute),
  ...activeFootpad(journal,campaignId,targetId,minute),
  ...activeEgosight(journal,campaignId,targetId,minute),...activeHealing(journal,campaignId,targetId,minute),
  ...activeVerity(journal,campaignId,targetId,minute),
  ...activeAdditionalTemporary(journal,campaignId,targetId,minute,'Fireshield'),
  ...activeAdditionalInstant(journal,campaignId,targetId,minute,'Mindsalve'),
  ...activeAdditionalTemporary(journal,campaignId,targetId,minute,'Iceshield'),
  ...activeAdditionalTemporary(journal,campaignId,targetId,minute,'Warmth'),
  ...activeAdditionalTemporary(journal,campaignId,targetId,minute,'Soulcloak')];
 const seen=new Set(live.map(x=>x.useId));
 ok(seen.size===live.length,'Profusion: duplicitní aktivní zdroj');
 for(const row of journal){
  const proof=row.calendarAlchemyImbibing;
  if(row.calendarCampaignId!==campaignId||row.campaignMinute>minute||proof?.targetId!==targetId)continue;
  const profile=canonicalProfusionProfile(proof.elixirName);
  ok(profile.use==='Imbibed','Profusion: Applied elixír nesmí mít Imbibing důkaz');
  if(profile.exempt||seen.has(row.id)||!(proof.finalAS>0)||proof.elixirName==='Healing'&&latestHealingReceipt(journal,row,minute))continue;
  // A previously applied Instantaneous effect may still remain (Healing etc).
  // Without its canonical lifetime/recovery evidence, NEVER assume it ended.
  // A previous Temporary effect might have decayed/been dispelled; the
  // supported finders above do reconstruct those lifetimes from the journal.
  if(['Darkvision','Erudition','Footpad','Egosight','Verity',...newElixirNames].includes(proof.elixirName))continue;
  throw Error('Profusion: účinek elixíru '+proof.elixirName+
   ' nemá dosud doložené ukončení; nelze bezpečně vyhodnotit souběh ani CF');
 }
 return live;
}
/** HMK v1.2 pp.270,273: Physic is NOT Profusion.  In particular,
 * Poison and Quiescence are exempt from Profusion, yet Physic affects any
 * elixir actually affecting the imbiber (including Poison's lingering
 * enchantment).  Only supported lifecycles are verified
 * end-to-end.  For any other imbibed source whose continuing effect cannot
 * be established, fail BEFORE any vial, combat state, or journal mutation;
 * never mistake a Profusion exemption for an immunity to Physic.
 *
 * This is intentionally a read-only projection of the existing journal.
 * Future elixirs must gain their own proven active/end witnesses here; the
 * mere existence of their catalog profile is not permission to dispel them.
 */
export function activeAlchemyPhysicTargets(journal=[],campaignId,targetId,minute=1e9){
 ok(whole(minute,0,1e9)&&typeof campaignId==='string'&&campaignId&&
  typeof targetId==='string'&&targetId,'Physic: neplatný kontext hledání účinků');
 const live=[...activeDarkvision(journal,campaignId,targetId,minute),
  ...activeErudition(journal,campaignId,targetId,minute),
  ...activeFootpad(journal,campaignId,targetId,minute),
  ...activeEgosight(journal,campaignId,targetId,minute),...activeHealing(journal,campaignId,targetId,minute),
  ...activeVerity(journal,campaignId,targetId,minute),
  ...additionalTemporary.flatMap(name=>activeAdditionalTemporary(journal,campaignId,targetId,minute,name)),
  ...['Mindsalve','Poison'].flatMap(name=>activeAdditionalInstant(journal,campaignId,targetId,minute,name))];
 const knownNames=new Set(['Darkvision','Erudition','Footpad','Egosight','Verity',...newElixirNames]);
 const seen=new Set();
 for(const source of live){
  ok(!seen.has(source.useId),'Physic: duplicitní účinný zdroj');
  seen.add(source.useId);
 }
 for(const row of journal){
  const proof=row.calendarAlchemyImbibing;
  if(row.calendarCampaignId!==campaignId||row.campaignMinute>minute||
   proof?.targetId!==targetId)continue;
  const profile=canonicalProfusionProfile(proof.elixirName);
  ok(profile.use==='Imbibed','Physic: Applied účinek nesmí mít důkaz požití');
  if(proof.elixirName==='Physic'||!(proof.finalAS>0)||proof.elixirName==='Healing'&&latestHealingReceipt(journal,row,minute))continue;
  if(knownNames.has(proof.elixirName)){
   if(['Poison','Mindsalve'].includes(proof.elixirName)){
    if(journal.some(entry=>relevant(entry,campaignId)&&entry.campaignMinute<=minute&&
     entry.calendarAlchemyExtendedRecovery?.useId===row.id))continue;
   }else if(!additionalTemporary.includes(proof.elixirName)||typeof proof.finishId==='string')continue;
  } // Their AS/expiry is replayed above.
  throw Error('Physic: nelze ověřit trvání účinku '+proof.elixirName+
   ' (včetně elixírů vyňatých z Profusion); není bezpečné odečíst AS všech účinků');
 }
 return live;
}
/** HMK p.274: persistent illusion detection. */
export function activeVerity(journal=[],campaignId,targetId,minute=1e9){
 return journal.filter(row=>relevant(row,campaignId)&&
  row.calendarAlchemyImbibing?.targetId===targetId&&row.calendarAlchemyImbibing?.elixirName==='Verity'&&row.campaignMinute<=minute)
  .map(row=>({useId:row.id,...row.calendarAlchemyImbibing,
   state:alchemyElixirStrength(journal,campaignId,row.calendarAlchemyImbibing.finishId,minute)}))
  .filter(source=>source.state.activeTemporary&&source.state.imbibingId===source.useId);
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
 const others=activeAlchemyProfusionCohort(journal,campaignId,targetId,minute);
 ok(others.every(x=>decayCurrent(x,minute)),'Footpad: nejdříve vyřešte splatný Decay');
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
/** HMK 269–271: Egosight shares the original Imbibing/Profusion/Decay/vial routine.
 * Artefact lore is recorded SEPARATELY by the GM after touching an artefact.
 */
export function createAlchemyEgosightImbibing(input){return createSensoryImbibing('Egosight',271,input)}
export function createAlchemyVerityImbibing(input){return createSensoryImbibing('Verity',274,input)}
function createSensoryImbibing(elixirName,sourcePage,{journal=[],inventory=[],campaignId,minute,actorId,targetId,finishId,
 testSkill,ml,d100,origin,emptyId,gmConfirmed=false}={}){
 ok(gmConfirmed===true,elixirName+': GM musí potvrdit úplné podání do jednoho kola');
 ok(typeof campaignId==='string'&&campaignId&&whole(minute,0,1e9)&&typeof actorId==='string'&&actorId&&
  typeof targetId==='string'&&targetId&&typeof emptyId==='string'&&emptyId,
  elixirName+': neplatná kampaň, čas nebo postava');
 ok(['Aura','Alchemy'].includes(testSkill)&&whole(ml,1,1000)&&whole(d100,1,100)&&originOK(origin),
  elixirName+': povinný skutečný Aura/Alchemy d100 a jeho původ');
 const state=alchemyElixirStrength(journal,campaignId,finishId,minute);
 ok(state.elixirName===elixirName&&state.currentAS>0&&!state.dispersed&&!state.activeTemporary&&!state.expires&&
  state.nextDueMinute>minute,elixirName+': chybí nepoužitá dávka nebo je splatný Decay');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 ok(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot)&&
  inventory.some(x=>x.id===vial.vialId&&x.characterId===actorId&&x.slot===vial.slot&&x.quantity===1),
  elixirName+': chybí fyzická lahvička příslušného vlastníka');
 const others=activeAlchemyProfusionCohort(journal,campaignId,targetId,minute);
 ok(others.every(x=>decayCurrent(x,minute)),elixirName+': nejprve vyhodnoťte splatný Decay');
 const profusion=classifyProfusionImbibing(d100,ml,others.length);
 const level=profusion.adjusted,delta={CF:-2,F:-1,S:0,CS:1}[level];
 const finalAS=Math.max(0,state.currentAS+delta);
 const affected=level==='CF'&&finalAS>0?concurrentAlchemyIllEffects(others):[];
 return {format:ALCHEMY_IMBIBING_FORMAT,campaignId,minute,actorId,targetId,finishId,emptyId,
  vialId:vial.vialId,elixirName,consumptionAction:actorId===targetId?'self-1-turn':'administered-1-round',
  testSkill,ml,d100,origin,otherActiveElixirs:others.length,profusionCF:profusion.profusionCF,
  sl:level,asBefore:state.currentAS,modifier:delta,finalAS,temporary:finalAS>0,
  ...(affected.length?{profusionIllEffects:affected}:{}),
  illEffect:level==='CF'&&finalAS>0?{kind:'aural-shock',levels:1,weakness:5,recoveryPending:true}:null,
  consumedWithinRoundConfirmed:true,gmConfirmed:true,sourcePages:[269,270,sourcePage]};
}
/** Use existing shared Aural Shock and Combat State; do not create a health subsystem. */
export function applyAlchemyFootpadAural({state=null,arcane=null,proof,eventId}={}){
 ok(proof?.format===ALCHEMY_IMBIBING_FORMAT&&proof.elixirName==='Footpad'&&proof.sl==='CF'&&
  whole(proof.ml,1,1000)&&whole(proof.d100,1,100)&&originOK(proof.origin)&&
  classifyProfusionImbibing(proof.d100,proof.ml,proof.otherActiveElixirs).adjusted==='CF'&&
  whole(proof.otherActiveElixirs,0,100)&&whole(proof.asBefore,1,11)&&proof.modifier===-2&&
  proof.finalAS===Math.max(0,proof.asBefore-2)&&proof.finalAS>0&&
  proof.illEffect?.kind==='aural-shock'&&proof.illEffect.levels===planAlchemyIllEffect({elixirName:proof.elixirName,baseAS:proof.asBefore}).levels&&proof.illEffect.weakness===5&&
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
 const cohort=activeAlchemyProfusionCohort(journal,campaignId,targetId,minute);
 const otherCount=cohort.length;
 const profusion=classifyProfusionImbibing(d100,ml,otherCount);
 const level=profusion.adjusted,delta={CF:-2,F:-1,S:0,CS:1}[level];
 const finalAS=Math.max(0,state.currentAS+delta);

 // A CF affects the newly swallowed Erudition AND every already active
 // enchantment. Each secondary effect gets an independently replayable proof.
 const affected=level==='CF'&&finalAS>0?concurrentAlchemyIllEffects(cohort):[];
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
 const cohort=activeAlchemyProfusionCohort(journal,campaignId,targetId,minute);
 const others=cohort.length;
 const profusion=classifyProfusionImbibing(d100,ml,others);
 const level=profusion.adjusted,delta={CF:-2,F:-1,S:0,CS:1}[level];
 const finalAS=Math.max(0,state.currentAS+delta);

 return {format:ALCHEMY_IMBIBING_FORMAT,campaignId,minute,actorId,targetId,finishId,
  emptyId,vialId:vial.vialId,elixirName:'Darkvision',consumptionAction:actorId===targetId?'self-1-turn':'administered-1-round',testSkill,ml,d100,origin,
  otherActiveElixirs:others,profusionCF:profusion.profusionCF,
  ...(others>0?{profusionIllEffects:level==='CF'&&finalAS>0?[
   ...concurrentAlchemyIllEffects(cohort)]:[]}:{}),
  sl:level,asBefore:state.currentAS,modifier:delta,finalAS,
  temporary:finalAS>0,darkvisionFeet:finalAS*5,
  // CF light sensitivity is a real adverse effect; do not invent a recovery roll.
  illEffect:level==='CF'&&finalAS>0?{kind:'vision-light-penalty',penalty:Math.round(state.currentAS*2.5),
    healingPeriodDays:'d6',healingRate:5,recoveryPending:true}:null,
  consumedWithinRoundConfirmed:true,gmConfirmed:true,sourcePages:[269,270,271]};
}
/** HMK v1.2 pp.269-270, 273: Physic never contributes to Profusion.
 * Only currently implemented temporary target lifecycles may be disenchanted.
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
 const affected=activeAlchemyPhysicTargets(journal,campaignId,targetId,minute);
 ok(affected.every(x=>decayCurrent(x,minute)),
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
  proof.illEffect.levels===planAlchemyIllEffect({elixirName:proof.elixirName,baseAS:proof.asBefore}).levels&&proof.illEffect.weakness===5&&
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
  proof.illEffect?.kind==='aural-shock'&&proof.illEffect.levels===planAlchemyIllEffect({elixirName:proof.elixirName,baseAS:proof.asBefore}).levels&&proof.illEffect.weakness===5&&
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
/** Original Combat State remains authoritative (no invented combat round). */
export function applyAlchemyEgosightAural(input){return applySensoryImbibingAural('Egosight',271,input)}
export function applyAlchemyVerityAural(input){return applySensoryImbibingAural('Verity',274,input)}
function applySensoryImbibingAural(elixirName,sourcePage,{state=null,arcane=null,proof,eventId}={}){
 ok(proof?.format===ALCHEMY_IMBIBING_FORMAT&&proof.elixirName===elixirName&&proof.sl==='CF'&&
  whole(proof.ml,1,1000)&&whole(proof.d100,1,100)&&originOK(proof.origin)&&
  classifyProfusionImbibing(proof.d100,proof.ml,proof.otherActiveElixirs).adjusted==='CF'&&
  whole(proof.otherActiveElixirs,0,100)&&whole(proof.asBefore,1,11)&&proof.modifier===-2&&
  proof.finalAS===Math.max(0,proof.asBefore-2)&&proof.finalAS>0&&
  proof.illEffect?.kind==='aural-shock'&&proof.illEffect.levels===planAlchemyIllEffect({elixirName:proof.elixirName,baseAS:proof.asBefore}).levels&&proof.illEffect.weakness===5&&
  typeof eventId==='string'&&eventId.length>=3,elixirName+' CF: nedoložený původní hod');
 const s=structuredClone(state??initialCombatState()),a=structuredClone(arcane??{});
 validateCombatState(s);
 ok(s.shock!=='KIA'&&!s.events.some(e=>e.id===eventId),elixirName+' CF: KIA nebo zdvojený zdravotní důkaz');
 const before=a.auralShockLevels??0;
 ok(whole(before,0,98)&&whole(s.fatigue.otherWeakness,0,99994),elixirName+' CF: překročené hodnoty');
 a.auralShockLevels=before+1;s.fatigue.otherWeakness+=5;
 s.events.push({id:eventId,type:'hmk-alchemy-'+elixirName.toLowerCase()+'-aural',round:Math.max(1,s.lastRound||1),
  details:{sourceEventId:eventId,finishId:proof.finishId,targetId:proof.targetId,
   calendarCampaignId:proof.campaignId,calendarMinute:proof.minute,imbibingD100:proof.d100,
   diceOrigin:proof.origin,auralShock:1,weaknessAdded:5,auralBefore:before,
   auralAfter:a.auralShockLevels,sourcePage,nonCombat:true}});
 validateCombatState(s);return {state:s,arcane:a,auralShockAdded:1,weaknessAdded:5};
}
export function createAlchemyHealingImbibing({journal=[],inventory=[],campaignId,minute,actorId,targetId,finishId,
 testSkill,ml,d100,origin,emptyId,gmConfirmed=false}={}){
 ok(gmConfirmed===true&&typeof campaignId==='string'&&campaignId&&whole(minute,0,1e9)&&actorId&&targetId&&emptyId,
  'Healing: chybí čas, účastníci nebo potvrzení GM');
 ok(['Aura','Alchemy'].includes(testSkill)&&whole(ml,1,1000)&&whole(d100,1,100)&&originOK(origin),
  'Healing: nutný skutečný Aura nebo Alchemy d100 příjemce');
 const dose=alchemyElixirStrength(journal,campaignId,finishId,minute);
 ok(dose.elixirName==='Healing'&&dose.currentAS>0&&!dose.imbibingId&&!dose.expires&&dose.nextDueMinute>minute,
  'Healing: dávka Healing není dostupná nebo má splatný Decay');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 ok(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot)&&
  inventory.some(item=>item.id===vial.vialId&&item.characterId===actorId&&item.slot===vial.slot&&item.quantity===1),
  'Healing: chybí skutečná nádoba v držení podávajícího');
 const active=activeAlchemyProfusionCohort(journal,campaignId,targetId,minute);
 ok(active.every(source=>decayCurrent(source,minute)),'Healing: nejprve vyhodnoťte splatný Decay');
 const {adjusted:sl,profusionCF}=classifyProfusionImbibing(d100,ml,active.length);
 const modifier={CF:-2,F:-1,S:0,CS:1}[sl],finalAS=Math.max(0,dose.currentAS+modifier);
 const illEffects=sl==='CF'&&finalAS>0?concurrentAlchemyIllEffects(active):[];
 return {format:ALCHEMY_IMBIBING_FORMAT,campaignId,minute,actorId,targetId,finishId,emptyId,vialId:vial.vialId,
  elixirName:'Healing',consumptionAction:actorId===targetId?'self-1-turn':'administered-1-round',testSkill,ml,d100,
  origin,otherActiveElixirs:active.length,profusionCF,sl,baseAS:dose.initialAS,asBefore:dose.currentAS,
  modifier,finalAS,temporary:false,...(illEffects.length?{profusionIllEffects:illEffects}:{}),
  illEffect:sl==='CF'&&finalAS>0?{kind:'healing-weakness',weakness:dose.initialAS*5}:null,
  consumedWithinRoundConfirmed:true,gmConfirmed:true,sourcePages:[269,270,272]};
}

export function createExtendedAlchemyImbibing({journal=[],inventory=[],campaignId,minute,actorId,targetId,finishId,
 testSkill,ml,d100,origin,emptyId,gmConfirmed=false}={}){
 ok(gmConfirmed===true&&typeof campaignId==='string'&&campaignId&&whole(minute,0,1e9)&&actorId&&targetId&&emptyId&&
  ['Aura','Alchemy'].includes(testSkill)&&whole(ml,1,1000)&&whole(d100,1,100)&&originOK(origin),
  'Alchemy: chybí ověřený příjemce, Aura/Alchemy ML, d100 nebo potvrzení podání.');
 const dose=alchemyElixirStrength(journal,campaignId,finishId,minute),elixirName=dose.elixirName;
 ok(newElixirNames.includes(elixirName)&&dose.currentAS>0&&!dose.imbibingId&&!dose.expires&&dose.nextDueMinute>minute,
  'Alchemy: dávka není dostupná nebo má splatný Decay.');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 ok(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot)&&
  inventory.some(item=>item.id===vial.vialId&&item.characterId===actorId&&item.quantity===1&&item.slot===vial.slot),
  'Alchemy: nutná skutečná nesená lahvička podávajícího.');
 const exempt=canonicalProfusionProfile(elixirName).exempt;
 const others=exempt?[]:activeAlchemyProfusionCohort(journal,campaignId,targetId,minute);
 ok(others.every(source=>decayCurrent(source,minute)),'Alchemy: nejprve vyhodnoťte splatný Decay.');
 const roll=classifyProfusionImbibing(d100,ml,others.length),sl=roll.adjusted;
 const modifier={CF:-2,F:-1,S:0,CS:1}[sl]*(exempt?-1:1)||0,finalAS=Math.max(0,dose.currentAS+modifier);
 const critical=sl==='CF'&&finalAS>0&&!exempt;
 const illEffect=critical?{
  kind:elixirName==='Mindsalve'?'mindsalve-weakness':elixirName.toLowerCase()+'-weariness',
  amount:dose.currentAS*5
 }:null;
 return {format:ALCHEMY_IMBIBING_FORMAT,campaignId,minute,actorId,targetId,finishId,emptyId,vialId:vial.vialId,
  elixirName,consumptionAction:actorId===targetId?'self-1-turn':'administered-1-round',
  testSkill,ml,d100,origin,otherActiveElixirs:others.length,profusionCF:roll.profusionCF,sl,
  asBefore:dose.currentAS,modifier,finalAS,temporary:finalAS>0&&additionalTemporary.includes(elixirName),
  ...(critical&&others.length?{profusionIllEffects:concurrentAlchemyIllEffects(others)}:{}),
  illEffect,consumedWithinRoundConfirmed:true,gmConfirmed:true,sourcePages:[269,270,elixirName==='Fireshield'?272:['Warmth','Soulcloak'].includes(elixirName)?274:273]};
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
   const create=p.elixirName==='Healing'?createAlchemyHealingImbibing:p.elixirName==='Physic'?createAlchemyPhysicImbibing:p.elixirName==='Erudition'?createAlchemyEruditionImbibing:p.elixirName==='Footpad'?createAlchemyFootpadImbibing:p.elixirName==='Egosight'?createAlchemyEgosightImbibing:p.elixirName==='Verity'?createAlchemyVerityImbibing:newElixirNames.includes(p.elixirName)?createExtendedAlchemyImbibing:createAlchemyDarkvisionImbibing;
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
 ok(fullImbibingNames.includes(p?.elixirName)&&p.targetId===targetId&&p.sl==='CF'&&p.finalAS>0,
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
 ok(fullImbibingNames.includes(p?.elixirName)&&p.targetId===targetId&&
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
/** Profusion requires one auditable Aural Shock proof per older Egosight dose. */
const sensoryProfusionTypes={Egosight:{active:activeEgosight,sourcePage:271},Verity:{active:activeVerity,sourcePage:274}};
const sensoryProfusionField=name=>'calendarAlchemy'+name+'ProfusionIll';
export function createEgosightProfusionIll(input){return createSensoryProfusionIll('Egosight',input)}
export function createVerityProfusionIll(input){return createSensoryProfusionIll('Verity',input)}
function createSensoryProfusionIll(elixirName,{journal=[],campaignId,minute,triggerUseId,sourceUseId,targetId}={}){
 const {active,sourcePage}=sensoryProfusionTypes[elixirName];
 const field=sensoryProfusionField(elixirName);
 const trigger=journal.find(j=>j.id===triggerUseId&&j.calendarCampaignId===campaignId&&j.campaignMinute===minute);
 const p=trigger?.calendarAlchemyImbibing;
 ok(fullImbibingNames.includes(p?.elixirName)&&
  p.targetId===targetId&&p.sl==='CF'&&p.finalAS>0,elixirName+' Profusion: chybí účinné spouštěcí CF');
 const known=p.profusionIllEffects?.filter(x=>x.sourceUseId===sourceUseId&&x.kind==='aural-shock'&&x.sourceElixir===elixirName)||[];
 ok(known.length===1&&known[0].levels===1&&known[0].weakness===5&&sourceUseId!==triggerUseId,
  elixirName+' Profusion: neexistuje jednoznačný původ');
 const earlier=journal.slice(0,journal.indexOf(trigger));
 ok(!!active(earlier,campaignId,targetId,minute).find(x=>x.useId===sourceUseId),
  elixirName+' Profusion: předchozí dávka již není aktivní');
 ok(!journal.some(j=>j.calendarCampaignId===campaignId&&j[field]?.triggerUseId===triggerUseId&&
  j[field].sourceUseId===sourceUseId),elixirName+' Profusion: duplicitní důkaz');
 return {format:'hmk-'+elixirName.toLowerCase()+'-profusion-ill-v1',campaignId,minute,triggerUseId,sourceUseId,targetId,
  elixirName,illEffect:{kind:'aural-shock',levels:1,weakness:5,recoveryPending:true},sourcePages:[269,270,sourcePage]};
}
export function applyEgosightProfusionAural(input){return applySensoryProfusionAural('Egosight',input)}
export function applyVerityProfusionAural(input){return applySensoryProfusionAural('Verity',input)}
function applySensoryProfusionAural(elixirName,{journal=[],state=null,arcane=null,proof,eventId}={}){
 const expected=createSensoryProfusionIll(elixirName,{...proof,journal});
 ok(JSON.stringify(expected)===JSON.stringify(proof)&&typeof eventId==='string'&&eventId.length>=3,
  elixirName+' Profusion: pozměněný historický důkaz');
 return appendSecondaryAlchemyAural({state,arcane,proof,eventId,sourcePage:sensoryProfusionTypes[elixirName].sourcePage});
}
export function validateEgosightProfusionJournal(journal){return validateSensoryProfusionJournal('Egosight',journal)}
export function validateVerityProfusionJournal(journal){return validateSensoryProfusionJournal('Verity',journal)}
function validateSensoryProfusionJournal(elixirName,journal=[]){
 const field=sensoryProfusionField(elixirName);
 const prior=[];
 for(const row of journal){const p=row[field];
  if(p){ok(p.campaignId===row.calendarCampaignId&&p.minute===row.campaignMinute&&p.targetId===row.characterId,
   elixirName+' Profusion: chybný kontext');
   ok(JSON.stringify(createSensoryProfusionIll(elixirName,{...p,journal:prior}))===JSON.stringify(p),
   elixirName+' Profusion: pozměněný důkaz');}
  prior.push(row);
 }
 for(const row of journal){const p=row.calendarAlchemyImbibing;
  for(const x of (p?.profusionIllEffects||[]).filter(x=>x.sourceElixir===elixirName)){
   const hits=journal.filter(j=>j.calendarCampaignId===row.calendarCampaignId&&j.campaignMinute===row.campaignMinute&&
    j[field]?.triggerUseId===row.id&&
    j[field].sourceUseId===x.sourceUseId);
   ok(hits.length===1,elixirName+' Profusion: chybí důkaz každého dříve aktivního zdroje');
  }
 }
 return true;
}
export function assertEgosightProfusionAppendOnly(before,after){return assertSensoryProfusionAppendOnly('Egosight',before,after)}
export function assertVerityProfusionAppendOnly(before,after){return assertSensoryProfusionAppendOnly('Verity',before,after)}
function assertSensoryProfusionAppendOnly(elixirName,before=[],after=[]){
 const field=sensoryProfusionField(elixirName);
 const byId=new Map(after.map(j=>[j.id,j]));
 for(const row of before)if(row[field])
  ok(JSON.stringify(byId.get(row.id))===JSON.stringify(row),elixirName+' Profusion: důkaz nelze změnit');
 return true;
}
/** HMK pp.269, 272: independent, immutable Footpad secondary CF evidence. */
export function createFootpadProfusionIll({journal=[],campaignId,minute,triggerUseId,sourceUseId,targetId}={}){
 const trigger=journal.find(j=>j.id===triggerUseId&&j.calendarCampaignId===campaignId&&j.campaignMinute===minute);
 const p=trigger?.calendarAlchemyImbibing;
 ok(fullImbibingNames.includes(p?.elixirName)&&p.targetId===targetId&&
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
  for(const x of p.profusionIllEffects.filter(x=>x.kind==='aural-shock'&&x.sourceElixir===undefined)){
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
