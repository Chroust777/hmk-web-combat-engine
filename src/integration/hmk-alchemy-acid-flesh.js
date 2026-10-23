/** HMK v1.2 p.271: direct Acid contact with living flesh. A separate proof
 * exists for each witnessed round. A fresh Burn IL is a DIRECT fire injury;
 * never substitute Impact or a fabricated armour save. Existing Combat State
 * remains the only writer for wounds, compound, Shock and follow-ups.
 * Thrown splash is deliberately NOT inferred by this direct-contact routine.
 */
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';
import {hmkHumanLocationSymbols} from './injury-special-hmk.js';
import {verifiedHumanLocationShock} from './hmk-weather-trauma-completion.js';
import {validateCombatState,applyConfirmedHit,applyConfirmedAcidBurnAdvance,combatFatigueTotals} from './persistent-combat-state.js';
import {compoundCompatible,compoundInjury} from '../rules/injury.js';
import {successLevel,SL} from '../rules/tests.js';
import {calculateShockState,applyShockState,SHOCK_STATE} from '../rules/shock.js';

export const ACID_FLESH_APPLY='hmk-acid-flesh-application-v1';
export const ACID_FLESH_ROUND='hmk-acid-flesh-burn-round-v1';
const need=(b,msg)=>{if(!b)throw Error('Acid Flesh: '+msg);};
const whole=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const slName=v=>Object.keys(SL).find(k=>SL[k]===v);
const shockName=Object.fromEntries(Object.entries({NONE:SHOCK_STATE.NONE,STN:SHOCK_STATE.STN,INC:SHOCK_STATE.INC,UNC:SHOCK_STATE.UNC,KIA:SHOCK_STATE.KIA}).map(([k,v])=>[v,k]));
const shockEnum={NONE:SHOCK_STATE.NONE,STN:SHOCK_STATE.STN,INC:SHOCK_STATE.INC,UNC:SHOCK_STATE.UNC,KIA:SHOCK_STATE.KIA};
const sided=new Set(['sh','ua','el','fo','ha','th','kn','ca','ft']);
const isOrigin=o=>['manual','cryptographic-software-die'].includes(o);
const skillShock=a=>{
 const ss=a?.hmk?.skills?.filter(x=>String(x.name||'').trim().toLowerCase()==='shock');
 need(ss?.length===1&&whole(ss[0].ml,0,200),'cílová postava nemá doloženou Shock ML');return ss[0].ml;
};
function anatomicallyValid(location,side){
 const a=hmkHumanLocationSymbols(location);
 need(a&&(!sided.has(location)?side===null:['left','right'].includes(side)),
  'nedoložená lidská anatomická lokace nebo strana končetiny');return a;
}
export function createAcidFleshApplication({journal=[],inventory=[],campaignId,minute,actorId,finishId,
 targetId,targetLocation,targetSide=null,mode='skin',skinContactConfirmed=false,ingestedConfirmed=false,humanConfirmed=false,
 gmConfirmed=false}={}){
 need(['skin','ingested'].includes(mode)&&humanConfirmed===true&&gmConfirmed===true&&
  (mode==='skin'?skinContactConfirmed===true:ingestedConfirmed===true),
  'GM musí potvrdit přímý kontakt s kůží nebo skutečné požití Acid');
 need(typeof campaignId==='string'&&campaignId&&whole(minute,0,1e9)&&actorId&&targetId,
  'chybí kampaň, příjemce nebo čas');
 anatomicallyValid(targetLocation,targetSide);
 if(mode==='ingested')need(targetLocation==='ab'&&targetSide===null,
  'požití u člověka vyhodnocujeme jako vnitřní zranění břicha');
 const dose=alchemyElixirStrength(journal,campaignId,finishId,minute);
 need(dose.elixirName==='Acid'&&dose.currentAS>0&&!dose.dispersed&&!dose.imbibingId,
  'chybí účinný dokončený Acid');
 need(minute>=dose.completedMinute&&(!dose.nextDueMinute||dose.nextDueMinute>minute),
  'dříve musí být vyhodnocen splatný Decay');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 need(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot)&&
   inventory.some(x=>x.id===vial.vialId&&x.characterId===actorId),
  'chybí fyzická plná lahvička v inventáři');
 return {format:ACID_FLESH_APPLY,campaignId,minute,actorId,targetId,finishId,vialId:vial.vialId,
  bindingId:vial.bindingId,targetLocation,targetSide,asAtApplication:dose.currentAS,
  noImbibingRoll:true,profusionExempt:true,mode,skinContactConfirmed:mode==='skin',
  ingestedConfirmed:mode==='ingested',bodyZonesTotal:mode==='ingested'?10:null,
  lethalIL:mode==='ingested'?2:null,humanConfirmed:true,
  gmConfirmed:true,sourcePages:[269,270,271]};
}
export function acidFleshState(journal=[],campaignId,applicationId,minute=1e9){
 need(whole(minute,0,1e9),'neplatný čas');
 const idx=journal.findIndex(x=>x.id===applicationId&&x.calendarCampaignId===campaignId&&x.calendarAlchemyAcidFleshApply&&x.campaignMinute<=minute);
 need(idx>=0,'chybí původní aplikace');const a=journal[idx].calendarAlchemyAcidFleshApply;
 let as=a.asAtApplication,rounds=0,burnIL=0,woundIL=0,lastCombatRound=null;
 for(const j of journal.slice(idx+1)){
  const r=j.calendarAlchemyAcidFleshRound;
  if(!r||r.applicationId!==applicationId||j.calendarCampaignId!==campaignId||j.campaignMinute>minute)continue;
  need(as>0&&r.round===rounds+1&&r.asBefore===as&&r.burnILBefore===burnIL&&
   whole(r.combatRound,1,9999)&&(lastCombatRound===null||r.combatRound===lastCombatRound+1),
   'změněné pořadí, AS nebo Burn IL');
  const success=r.d10<=as;
  need(r.success===success&&r.asAfter===as-1&&r.burnILAfter===Math.min(5,burnIL+(success?1:0))&&
   r.targetId===a.targetId&&r.targetLocation===a.targetLocation&&r.targetSide===a.targetSide&&
   r.minute===j.campaignMinute&&r.minute>=a.minute,'poškozený kontaktní hod');
  if(r.health){
   need(success&&Number.isSafeInteger(r.health.woundIL)&&r.health.woundIL>=1&&r.health.woundIL<=5&&
    r.health.woundIL>woundIL&&(!woundIL||r.health.woundIL===woundIL+1),
    'nezákonný růst skutečného Injury Level původní Acid rány');
   woundIL=r.health.woundIL;
  }
  as--;rounds++;burnIL=Math.min(5,burnIL+(success?1:0));lastCombatRound=r.combatRound;
 }
 return {campaignId,applicationId,actorId:a.actorId,targetId:a.targetId,targetLocation:a.targetLocation,
  targetSide:a.targetSide,mode:a.mode,lethalIL:a.lethalIL,as,rounds,burnIL,woundIL,lastCombatRound,spent:as<=0||(a.lethalIL!==null&&burnIL>=a.lethalIL)};
}
/** Preview direct burn with the already authoritative injury reducer.
 * The caller atomically writes the returned state and the proof in one mutate.
 * Each NEW IL requires its own genuine Shock d100. Repeated injuries also
 * require genuine Compound d10, as in the existing weather-trauma routine.
 */
export function prepareAcidFleshRound({journal=[],campaignId,minute,applicationId,d10,origin,
 actor,state,round,shockD100=null,shockOrigin=null,compoundD10=null,compoundOrigin=null,
 eventId,continuousContactConfirmed=false,gmConfirmed=false}={}){
 need(whole(minute,0,1e9)&&whole(d10,1,10)&&isOrigin(origin)&&
   whole(round,1,9999)&&typeof eventId==='string'&&eventId.length>=3,
  'potřebný skutečný d10, čas, kolo, eventId a původ hodu');
 need(continuousContactConfirmed===true&&gmConfirmed===true,
  'GM musí potvrdit další přímý kontakt se stejnou kůží');
 const prior=acidFleshState(journal,campaignId,applicationId,minute);
 need(!prior.spent,'Acid AS je již nula');
 need(actor?.id===prior.targetId,'záměna příjemce');
 const anatomy=anatomicallyValid(prior.targetLocation,prior.targetSide);
 validateCombatState(state);
 need(round>=state.lastRound&&state.shock!=='KIA'&&
  (prior.lastCombatRound===null||round===prior.lastCombatRound+1),
  'neplatné navazující kolo či zemřelá postava');
 // A continuing physical burn is independent of the victim's scheduled
 // Shock Recovery. A stunned or unconscious target can still be burned.
 // The canonical injury reducers enforce any genuine Extended Shock conflict.

 need(!state.events.some(e=>e.id===eventId),'duplicitní zdravotní důkaz');
 const success=d10<=prior.as,asAfter=prior.as-1;
 // The printed HMK Injury table contains IL 1–5 only (p.167). Once G5
 // is reached, further Acid contact consumes AS but cannot create an IL6.
 // If the first burn Compounded an existing fire/frost wound, the
 // actual new wound may start at IL2. Its real IL, not the number of
 // Acid successes, determines each subsequent Shock and the G5 limit.
 const newIL=success&&prior.woundIL<5;
 const burnILAfter=Math.min(5,prior.burnIL+(success?1:0));
 const s=structuredClone(state);
 let health=null;
 if(newIL){
  need(whole(shockD100,1,100)&&isOrigin(shockOrigin),'každý nový Burn IL vyžaduje skutečný Shock d100');
  const old=s.wounds.filter(w=>!w.healed&&w.location===prior.targetLocation&&
   (!sided.has(prior.targetLocation)||w.side===prior.targetSide)&&
   compoundCompatible(w,{location:prior.targetLocation,aspect:'fire',area:false}));
  const root=old.find(w=>s.events.some(e=>e.id===w.originEventId&&e.details?.acidFlesh?.applicationId===applicationId));
  const other=old.filter(w=>w.id!==root?.id);
  const shockML=skillShock(actor),shockEML=shockML-combatFatigueTotals(s).total;
  const sl=successLevel(shockD100,shockEML);
  let woundId=null,shockIL;
  if(prior.burnIL>0){
   // Same continuous splash worsens one existing f Burn, not a fresh M1 wound.
   need(root&&!root.healed&&root.level===prior.woundIL,
    'původní kumulativní Fire Burn musí mít odpovídající IL 1–5');
   need(compoundD10===null&&compoundOrigin===null,
    'pokračující růst téže Acid rány nevyvolává nový Compound hod');
   const actualNewIL=root.level+1;
   const applied=applyConfirmedAcidBurnAdvance({state:s,characterId:actor.id,applicationId,
    woundId:root.id,round,eventId,newIL:actualNewIL,
    locationShock:verifiedHumanLocationShock(prior.targetLocation),shockD100,shockEML,gmConfirmed:true});
   Object.assign(s,applied.state);woundId=root.id;shockIL=actualNewIL;
  }else{
   need(other.length?whole(compoundD10,1,10)&&isOrigin(compoundOrigin):compoundD10===null&&compoundOrigin===null,
    'první kontakt se starší Fire ránou vyžaduje skutečný Compound d10; jinak se nehází');
   const incoming={id:'wound:'+eventId,location:prior.targetLocation,aspect:'fire',area:false,level:1,severity:'M'};
   const comp=other.length?compoundInjury({existing:other,incoming,d10:compoundD10}):null;
   shockIL=comp?.injuryShock??1;
   const calc=calculateShockState({locationShock:verifiedHumanLocationShock(prior.targetLocation),injuryShock:shockIL,shockSL:sl});
   const carrying=shockName[applyShockState(shockEnum[s.shock],calc.state)];
   need(carrying,'neplatný přenos Shock State');
   const draft={ok:true,format:'hmk-combat-event-draft-v1',status:'preview-only',mutatesCharacter:false,
    target:{id:actor.id},location:prior.targetLocation,aspect:'fire',proposalId:eventId,
    inputs:{previousState:s.shock,shockLevel:slName(sl)},
    impactResult:{effectiveImpact:null,strikeImpact:null,baseAV:null,effectiveAV:null,aspect:'fire',
     directInjuryLevel:1,source:'HMK p271 direct Acid f Burn IL'},
    injuryResult:{kind:'injury',injury:'M1'},
    shockResult:{state:shockName[calc.state],injuryShock:shockIL,locationShock:verifiedHumanLocationShock(prior.targetLocation)},
    carryover:{state:carrying}};
   const applied=applyConfirmedHit({state:s,characterId:actor.id,draft,round,eventId,
    adjudication:{gmReviewed:true,bodyKind:'human',compoundReviewed:!!comp,compoundD10,
     bleeding:false,arrowOrBolt:false,side:prior.targetSide,timelineId:'alchemy-acid:'+applicationId}});
   Object.assign(s,applied.state);woundId=applied.wound?.id??null;
  }
  const event=s.events.find(e=>e.id===eventId);
  if(prior.mode==='ingested'&&burnILAfter>=prior.lethalIL){
   // HMK p271: fatal once ingested IL equals one fifth of body zones.
   // Human p166 ZD has ten zones: 10/5 = 2 IL. Retain the real burn wound.
   s.shock='KIA';s.shockOriginRound=round;s.shockFollowup=null;s.extendedShock=null;s.coma=null;
   for(const wound of s.wounds)wound.nextAdvanceRound=null;
   event.details.acidIngestionLethal={bodyZonesTotal:10,lethalIL:2,observedIL:burnILAfter};
  }
  event.details.acidFlesh={applicationId,shockD100,shockOrigin,shockML,shockEML,
   compoundD10,compoundOrigin,contactD10:d10,contactOrigin:origin,burnILAfter,woundIL:s.wounds.find(w=>w.id===woundId)?.level};
  health={woundId,shockD100,shockOrigin,shockML,shockEML,
   shockSL:slName(sl),shockState:s.shock,compoundD10,compoundOrigin,shockIL,
  ingestionLethal:prior.mode==='ingested'&&burnILAfter>=prior.lethalIL,
   woundIL:s.wounds.find(w=>w.id===woundId)?.level};
 }else need(shockD100===null&&shockOrigin===null&&compoundD10===null&&compoundOrigin===null,
   'při neúspěchu nebo po dosažení G5 již nevzniká další Injury Level ani Shock');
 const proof={format:ACID_FLESH_ROUND,campaignId,minute,applicationId,targetId:prior.targetId,
  targetLocation:prior.targetLocation,targetSide:prior.targetSide,round:prior.rounds+1,combatRound:round,
  eventId,d10,origin,success,asBefore:prior.as,asAfter,burnILBefore:prior.burnIL,burnILAfter,
  health,continuousContactConfirmed:true,gmConfirmed:true,sourcePage:271};
 validateCombatState(s);return {proof,state:s};
}
export function validateAcidFleshJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const a=row.calendarAlchemyAcidFleshApply,r=row.calendarAlchemyAcidFleshRound;
  if(a){
   need(row.calendarCampaignId===a.campaignId&&row.campaignMinute===a.minute&&row.characterId===a.actorId&&
    row.calendarAlchemyVialEmpty?.finishId===a.finishId&&row.calendarAlchemyVialEmpty?.vialId===a.vialId,
    'aplikace nemá společné vyprázdnění lahvičky');
   anatomicallyValid(a.targetLocation,a.targetSide);
   need(a.format===ACID_FLESH_APPLY&&a.humanConfirmed&&a.gmConfirmed&&
    ((a.mode==='skin'&&a.skinContactConfirmed===true&&a.lethalIL===null)||
     (a.mode==='ingested'&&a.ingestedConfirmed===true&&a.targetLocation==='ab'&&a.bodyZonesTotal===10&&a.lethalIL===2)),
    'neplatná původní aplikace');
  }
  if(r){
   const prev=acidFleshState(prior,r.campaignId,r.applicationId,r.minute);
   need(row.calendarCampaignId===r.campaignId&&row.campaignMinute===r.minute&&row.characterId===prev.targetId&&
    r.format===ACID_FLESH_ROUND&&r.gmConfirmed===true&&r.continuousContactConfirmed===true,
    'neplatné okolnosti kola');
   need(r.targetId===prev.targetId&&r.targetLocation===prev.targetLocation&&r.targetSide===prev.targetSide&&
    r.round===prev.rounds+1&&(prev.lastCombatRound===null||r.combatRound===prev.lastCombatRound+1)&&r.asBefore===prev.as&&r.asAfter===prev.as-1&&
    r.success===(r.d10<=prev.as)&&isOrigin(r.origin)&&whole(r.d10,1,10)&&
    r.burnILBefore===prev.burnIL&&r.burnILAfter===Math.min(5,prev.burnIL+(r.success?1:0)),
    'změněný d10, AS nebo průběh Burn IL');
   need(r.success&&prev.woundIL<5?!!r.health&&whole(r.health.shockD100,1,100)&&isOrigin(r.health.shockOrigin)&&
   r.health.shockSL===slName(successLevel(r.health.shockD100,r.health.shockEML))&&
   whole(r.health.woundIL,1,5)&&(!prev.woundIL||r.health.woundIL===prev.woundIL+1)&&
   r.health.ingestionLethal===(prev.mode==='ingested'&&r.burnILAfter>=prev.lethalIL):r.health===null,
    'chybí doložený zdravotní výsledek');
  }
  prior.push(row);
 }
 return true;
}
export function validateAcidFleshCombatLinks(database){
 for(const row of database.journal){
  const r=row.calendarAlchemyAcidFleshRound;if(!r)continue;
  const target=database.characters.find(x=>x.id===r.targetId);
  need(target,'zdravotní důkaz odkazuje na neznámou postavu');
  const e=target.hmk?.combatState?.events?.find(x=>x.id===r.eventId);
  need(r.health?!!e&&['confirmed-hit','acid-burn-progression'].includes(e.type)&&e.details?.acidFlesh?.applicationId===r.applicationId&&
    e.details?.acidFlesh?.contactD10===r.d10&&e.details?.acidFlesh?.shockD100===r.health.shockD100&&
    e.details?.acidFlesh?.shockEML===r.health.shockEML&&
    e.details?.acidFlesh?.burnILAfter===r.burnILAfter&&
    e.details?.acidFlesh?.woundIL===r.health.woundIL&&
    !!target.hmk.combatState.wounds.find(w=>w.id===r.health.woundId&&w.aspect==='fire')&&
    (r.health.ingestionLethal?e.details?.acidIngestionLethal?.observedIL===r.burnILAfter:true):
    !e,'chybí skutečný odpovídající Combat State zápis');
 }
 return true;
}
export function assertAcidFleshAppendOnly(before=[],after=[]){
 const ids=new Map(after.map(r=>[r.id,r]));
 for(const r of before)if(r.calendarAlchemyAcidFleshApply||r.calendarAlchemyAcidFleshRound)
  need(JSON.stringify(ids.get(r.id))===JSON.stringify(r),'nelze upravit uložený Acid Flesh důkaz');
 return true;
}
