/** HMK v1.2 pp.269-271: auditable elixir imbibing on the existing journal.
 * First implemented canonical effect: Darkvision. Other elixirs stay disabled
 * until their specific health/astral/skill consequences are integrated.
 */
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';
import {classifyProfusionImbibing} from './hmk-alchemy-profusion.js';
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
 const others=activeDarkvision(journal,campaignId,targetId,minute).length;
 const profusion=classifyProfusionImbibing(d100,ml,others);
 const level=profusion.adjusted,delta={CF:-2,F:-1,S:0,CS:1}[level];
 const finalAS=Math.max(0,state.currentAS+delta);
 return {format:ALCHEMY_IMBIBING_FORMAT,campaignId,minute,actorId,targetId,finishId,
  emptyId,vialId:vial.vialId,elixirName:'Darkvision',consumptionAction:actorId===targetId?'self-1-turn':'administered-1-round',testSkill,ml,d100,origin,
  otherActiveElixirs:others,profusionCF:profusion.profusionCF,
  ...(others>0?{profusionIllEffects:level==='CF'&&finalAS>0?activeDarkvision(journal,campaignId,targetId,minute).map(a=>({sourceUseId:a.useId,kind:'vision-light-penalty',baseAS:a.asBefore,penalty:Math.round(a.asBefore*2.5)})):[]}:{}),
  sl:level,asBefore:state.currentAS,modifier:delta,finalAS,
  temporary:finalAS>0,darkvisionFeet:finalAS*5,
  // CF light sensitivity is a real adverse effect; do not invent a recovery roll.
  illEffect:level==='CF'&&finalAS>0?{kind:'vision-light-penalty',penalty:Math.round(state.currentAS*2.5),
    healingPeriodDays:'d6',healingRate:5,recoveryPending:true}:null,
  consumedWithinRoundConfirmed:true,gmConfirmed:true,sourcePages:[269,270,271]};
}
/** HMK v1.2 pp.269, 270, 273: Physic is an instantaneous imbibed
 * elixir, exempt from Profusion. It lowers the current AS of every elixir
 * presently affecting the recipient. Only mechanically implemented effects
 * (Darkvision) can be resolved; CF is explicitly gated until its mandatory
 * Aural Shock and simultaneous Ill Effects can be committed atomically.
 * This is a genuine, safely bounded stage, not a simulated outcome.
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
 // Physic never induces or contributes to Profusion, but a real ordinary CF
 // has mandatory Aural Shock 1. Until that health bridge is complete, fail
 // without consuming any dose or pretending a different roll took place.
 const level=classifyProfusionImbibing(d100,ml,0).adjusted;
 ok(level!=='CF','Physic: CF vyžaduje Aural Shock 1 a společný Combat State; tato větev není ještě bezpečně uzavřena');
 const delta={F:-1,S:0,CS:1}[level],finalAS=Math.max(0,state.currentAS+delta);
 const affected=activeDarkvision(journal,campaignId,targetId,minute);
 ok(affected.every(x=>x.state.nextDueMinute>minute),
  'Physic: nejprve vyhodnoťte všechny splatné Darkvision Decay Rolls');
 const physicEffects=finalAS>0?affected
  .map(x=>({finishId:x.finishId,sourceUseId:x.useId,asBefore:x.state.currentAS,
   asAfter:Math.max(0,x.state.currentAS-finalAS)})) : [];
 ok(new Set(physicEffects.map(x=>x.finishId)).size===physicEffects.length,
  'Physic: nelze použít stejný aktivní zdroj dvakrát');
 return {format:ALCHEMY_IMBIBING_FORMAT,campaignId,minute,actorId,targetId,finishId,
  emptyId,vialId:vial.vialId,elixirName:'Physic',consumptionAction:actorId===targetId?'self-1-turn':'administered-1-round',
  testSkill,ml,d100,origin,otherActiveElixirs:0,profusionCF:false,
  sl:level,asBefore:state.currentAS,modifier:delta,finalAS,temporary:false,
  physicEffects,illEffect:null,consumedWithinRoundConfirmed:true,gmConfirmed:true,sourcePages:[269,270,273]};
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
   const create=p.elixirName==='Physic'?createAlchemyPhysicImbibing:createAlchemyDarkvisionImbibing;
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

/** On a CF with Profusion, EACH previously active Darkvision also induces
 * its own Ill Effect (p.269). One auditable proof per source; recovery remains
 * in the existing Darkvision Exposure Healing mechanism.
 */
export function createDarkvisionProfusionIll({journal=[],campaignId,minute,triggerUseId,sourceUseId,targetId}={}){
 const trigger=journal.find(j=>j.id===triggerUseId&&j.calendarCampaignId===campaignId&&j.campaignMinute===minute);
 const p=trigger?.calendarAlchemyImbibing;
 ok(p?.elixirName==='Darkvision'&&p.targetId===targetId&&p.sl==='CF'&&p.finalAS>0,
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
  for(const x of p.profusionIllEffects){
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
