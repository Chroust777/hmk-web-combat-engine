/**
 * HârnMaster: Roleplaying in the World of Kèthîra, printed pp.59–60,
 * 161–162, 169–170, 177–178. A headless, deterministic mandatory-event runner.
 *
 * NO dice are generated here. Given a real persistent state and verified
 * character values, the runner requests *only* physically rolled dice, computes
 * all applicable success levels and commits one atomic rules transition.
 * Unknown attributes/conditions are blockers, never default zeroes or invented
 * decisions. The public runner has no direct access to persistent storage.
 */
import {SL,successLevel} from '../rules/tests.js';
import {validateCombatState,combatFatigueTotals,
 dueBloodLoss,unresolvedInjuryMishaps,dueInjuryMorale,shockFollowupReadiness,
 applyConfirmedBloodLoss,applyConfirmedInjuryMishap,applyConfirmedInjuryMorale,
 applyConfirmedShockRecovery} from './persistent-combat-state.js';
import {createManualDiceQueue,recordManualDie,nextManualDie,completedManualDice} from './hmk-manual-dice-queue.js';
import {projectLiveInjuries} from './live-injury-impairment.js';

const assert=(x,msg)=>{if(!x)throw Error(msg)};
const integer=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const nameSL=sl=>Object.keys(SL).find(x=>SL[x]===sl);
const stateSignature=state=>JSON.stringify(state);

/** Mandatory events are presented in enforceable order. The caller supplies
 * actor/time information from the real scheduler; an unproved UNC deadline is
 * NOT marked due. A delayed event is never automatically consumed. */
export function guidedMandatoryEvents({state,characterId,round,actorId=null,turnEnded=false,
 timelineId=null,elapsedMinutesSinceOriginal=null}={}){
 validateCombatState(state);
 assert(typeof characterId==='string'&&characterId&&integer(round,1,9999),'Chybí účastník nebo číslo kola');
 if(state.shock==='KIA')return [];
 const events=[];
 for(const m of unresolvedInjuryMishaps(state))events.push({kind:'injury-mishap',id:m.id,priority:0,
  label:`Mishap ${m.kind}`,source:'HMK pp.161,170'});
 for(const w of dueBloodLoss(state,round))events.push({kind:'blood-loss',id:w.woundId,priority:1,
  label:`Blood Loss: ${w.location} (splatné kolo ${w.dueRound})`,source:'HMK p.178'});
 const readiness=shockFollowupReadiness({state,round,characterId,actorId,turnEnded,timelineId,elapsedMinutesSinceOriginal});
 if(readiness.due)events.push({kind:'shock-recovery',id:state.shockFollowup?.kind??state.shock,priority:2,
  label:`Shock ${state.shock} Reroll`,source:'HMK p.169'});
 for(const w of dueInjuryMorale(state))events.push({kind:'injury-morale',id:w.woundId,priority:3,
  label:`Morale: ${w.location} ${w.severity}`,source:'HMK p.162'});
 return events.sort((a,b)=>a.priority-b.priority);
}

const skillML=(character,key)=>{
 const arr=character?.hmk?.skills;
 const s=Array.isArray(arr)?arr.find(x=>String(x?.name??x?.key??'').trim().toLowerCase()===key):null;
 return s?.ml;
};
const attrML=(character,key)=>{
 const v=character?.hmk?.attributes?.[key];
 return integer(v,1,40)?5*v:null;
};
/** No anonymous 'true' anatomy flags: identify human anatomy from the
 * saved Folk or accept a verified creature-specific anatomy record. An
 * active action supplies whether DEX was actually employed. */
function verifiedMishapAnatomy(character,mishapContext={},state=null){
 const h=character.hmk??{},a=h.anatomy??{},human=String(h.folk??'').trim().toLowerCase()==='human';
 const flag=(name,derived)=>typeof mishapContext?.[name]==='boolean'?mishapContext[name]:
  typeof a[name]==='boolean'?a[name]:derived;
 const hasDEX=flag('hasDEX',human&&integer(h.attributes?.dex,1,40)?true:null);
 const legAmputations=new Set((state?.wounds??[]).filter(w=>w.amputation?.severed===true&&
  ['th','kn','ca','ft','thigh','knee','calf','foot'].includes(String(w.location).trim().toLowerCase())&&
  ['left','right'].includes(w.side)).map(w=>w.side));
 const hasLegs=legAmputations.size===2?false:flag('hasLegs',human?true:null);
 const actionUsesDEX=flag('actionUsesDEX',null);
 assert(typeof hasDEX==='boolean'&&typeof hasLegs==='boolean'&&typeof actionUsesDEX==='boolean',
  'Mishap: chybí doložená anatomie (DEX/nohy) nebo potvrzení, zda konkrétní akce používá DEX');
 return {hasDEX,hasLegs,actionUsesDEX,usedArms:mishapContext?.usedArms??null};
}
function mishapTestKind(mishap,profile){
 if(!mishap?.kind)return null;
 return mishap.kind.includes('fumble')&&profile.hasDEX&&profile.actionUsesDEX?'dexterity':'agility';
}
/** Resolve ML from the recorded character sheet, never from a GM rules guess.
 * A missing skill stays missing, except attribute tests (attribute x 5, p.60). */
export function guidedMandatoryMastery({kind,character,mishapKind=null,abe=null,technique='attribute',mishapProfile=null}={}){
 assert(character?.id&&character.hmk,'Chybí uložená postava HMK');
 let ml=null;
 if(kind==='blood-loss'){
  ml=attrML(character,'str');
  // Beasts with special ML50 require an explicit creature classification.
  assert(ml!==null,'Blood Loss: chybí Strength; zvířata potřebují ověřený druh');
 }else if(kind==='shock-recovery'){
  ml=skillML(character,'shock');
  assert(integer(ml,0,200),'Shock: postava nemá doloženou dovednost Shock ML');
 }else if(kind==='injury-morale'){
  ml=skillML(character,'initiative');
  assert(integer(ml,0,200),'Morale: postava nemá doloženou dovednost Initiative ML');
  assert(integer(abe,0,200),'Morale: chybí skutečně známá Aberrance protivníka (0 jen pokud je doloženo)');
 }else if(kind==='injury-mishap'){
  if(mishapKind==='automatic-fumble'||mishapKind==='automatic-stumble')return {ml:null,rollRequired:false};
  assert(['fumble-roll','stumble-roll'].includes(mishapKind),'Neznámý Injury Mishap');
  const test=mishapTestKind({kind:mishapKind},mishapProfile);
  assert(test,'Mishap: chybí ověřený typ testu');
  if(technique==='attribute')ml=attrML(character,test==='dexterity'?'dex':'agl');
  else if(technique===(test==='dexterity'?'legerdemain':'acrobatics'))ml=skillML(character,technique);
  else throw Error('Nelze nahradit požadovaný test jiným neověřeným testem');
  assert(integer(ml,0,200),'Mishap: chybí příslušný atribut nebo ověřená dovednost');
 }else throw Error('Tato událost nemá automatický resolver');
 return {ml,rollRequired:true};
}

export function createGuidedMandatory({state,character,round,eventId,actorId=null,turnEnded=false,
 timelineId=null,elapsedMinutesSinceOriginal=null,kind=null,mishapTechnique='attribute',
 abe=null,comaLocationShock=null,comaInjuryLevel=null,mishapContext=null}={}){
 validateCombatState(state);
 assert(integer(round,1,9999)&&round>=state.lastRound&&typeof eventId==='string'&&eventId.length>0,
  'Chybí skutečné kolo nebo ID události');
 assert(character?.id&&character.hmk,'Chybí skutečná postava z boje');
 const events=guidedMandatoryEvents({state,characterId:character.id,round,actorId,turnEnded,timelineId,elapsedMinutesSinceOriginal});
 assert(events.length,'Není splatná žádná známá povinná událost');
 const event=events[0];
 assert(kind===null||event.kind===kind,'Dřívější povinnou událost nelze přeskočit');
 const mishap=event.kind==='injury-mishap'?(state.mishaps??[]).find(x=>x.id===event.id):null;
 let profile=null,impaired=null;
 if(event.kind==='injury-mishap'){
  profile=verifiedMishapAnatomy(character,mishapContext??{},state);
  const effectiveTest=mishapTestKind(mishap,profile);
  const test=mishapTechnique==='attribute'?effectiveTest:mishapTechnique;
  const wound=state.wounds.find(w=>w.id===mishap?.woundId);
  const usedArms=profile.usedArms??(effectiveTest==='dexterity'&&['sh','ua','el','fo','ha','shoulder','upper arm','elbow','forearm','hand'].includes(String(wound?.location).toLowerCase())
   &&['left','right'].includes(wound?.side)?[wound.side]:null);
  impaired=projectLiveInjuries({state,round,test,usedArms,timelineId});
  assert(impaired.ready,'Mishap: nelze doložit aktuální impairment: '+impaired.reason);
 }
 const {ml,rollRequired}=guidedMandatoryMastery({kind:event.kind,character,mishapKind:mishap?.kind,abe,technique:mishapTechnique,mishapProfile:profile});
 if(event.kind==='shock-recovery'&&state.shock==='UNC'){
  assert(integer(comaLocationShock,0,15)&&integer(comaInjuryLevel,1,5)
   &&12-comaLocationShock-comaInjuryLevel>0,
   'UNC Reroll: před hodem je nutné znát Location Shock a Injury Level původní rány pro případ Coma');
 }

 const fatigue=combatFatigueTotals(state).total;
 const proofId=`${eventId}:${event.kind}:${event.id}`;
 const queue=rollRequired?createManualDiceQueue({id:proofId,source:event.source,round,
  actorId:character.id,requests:[{id:'resultD100',faces:100,label:`${event.label}: skutečný d100`}]}):null;
 return {format:'hmk-guided-mandatory-v1',event,characterId:character.id,round,eventId,actorId,turnEnded,
  timelineId,elapsedMinutesSinceOriginal,context:{ml,abe,technique:mishapTechnique,comaLocationShock,comaInjuryLevel,fatigue,
   mishapProfile:profile,injuryImpairment:impaired?.impairment??null,impairedTest:impaired?.test??null,usedArms:impaired?.usedArms??null},
  stateWitness:stateSignature(state),characterWitness:stateSignature(character.hmk),queue,rolls:[],phase:queue?'waiting-die':'ready',outcome:null};
}

export function guidedMandatoryRequirement(session){
 assert(session?.format==='hmk-guided-mandatory-v1','Neplatný HMK průvodce');
 if(session.phase==='waiting-die')return {kind:'die',...nextManualDie(session.queue)};
 if(session.phase==='ready')return {kind:'automatic',event:session.event};
 return {kind:'complete'};
}

/** A second d10 is demanded only after physical d100 proves UNC+CF;
 * the original PDF p179 requires a new d10 for Coma Course interval. */
export function submitGuidedMandatoryDie(session,value){
 assert(session?.phase==='waiting-die','Systém nyní nečeká na hod');
 const request=nextManualDie(session.queue);
 assert(request,'Není vyžádaná kostka');
 const queue=recordManualDie(session.queue,{requestId:request.id,value});
 const next={...session,queue};
 if(queue.status!=='complete')return next;
 const proof=completedManualDice(queue).proof;
 next.rolls=[...next.rolls,...proof.rolls];
 if(request.id==='resultD100'&&session.event.kind==='shock-recovery'&&session.event.id==='UNC'){
  const sl=successLevel(proof.rolls[0].value,session.context.ml-session.context.fatigue-20);
  if(sl===SL.CF){
   assert(integer(session.context.comaLocationShock,0,15)&&integer(session.context.comaInjuryLevel,1,5)
    &&12-session.context.comaLocationShock-session.context.comaInjuryLevel>0,
    'UNC + CF: chybí ověřená původní rána pro Coma HR, výsledek se nesmí odhadnout');
   next.queue=createManualDiceQueue({id:session.eventId+':coma-period',source:'HMK World of Kèthîra p.179 Coma',
    round:session.round,actorId:session.characterId,requests:[
     {id:'comaIntervalD10',faces:10,label:'Coma: d10 dní do prvního Course Roll'}]});
   return next;
  }
 }
 next.phase='ready';return next;
}

/** One atomic transition; any failure leaves the source state untouched.
 * Caller persists ONLY the returned state. The proof is stored in the event. */
export function commitGuidedMandatory({session,state,character,round,actorId=null,turnEnded=false,
 timelineId=null,elapsedMinutesSinceOriginal=null}={}){
 assert(session?.format==='hmk-guided-mandatory-v1'&&session.phase==='ready','Hody ještě nejsou úplné');
 validateCombatState(state);
 assert(stateSignature(state)===session.stateWitness,'Stav postavy se změnil; před hodem je nutné obnovit pravidlový krok');
 assert(character?.id===session.characterId&&stateSignature(character.hmk)===session.characterWitness,
  'Atributy, dovednosti, Folk nebo anatomie postavy se změnily; před hodem je nutné obnovit pravidlový krok');
 assert(round===session.round&&actorId===session.actorId&&turnEnded===session.turnEnded&&
  timelineId===session.timelineId&&elapsedMinutesSinceOriginal===session.elapsedMinutesSinceOriginal,
  'Změnil se tah, časová osa nebo účastník');
 const all=guidedMandatoryEvents({state,characterId:character.id,round,actorId,turnEnded,timelineId,elapsedMinutesSinceOriginal});
 assert(all[0]?.kind===session.event.kind&&all[0]?.id===session.event.id,'Povinná událost se změnila');
 const ctx=session.context,roll=session.rolls.find(x=>x.id==='resultD100')?.value;
 let transition=null;
 if(session.event.kind==='blood-loss'){
  assert(integer(roll,1,100),'Blood Loss vyžaduje skutečný Strength d100');
  transition=applyConfirmedBloodLoss({state,round,eventId:session.eventId,woundId:session.event.id,
   sl:nameSL(successLevel(roll,ctx.ml))});
 }else if(session.event.kind==='injury-mishap'){
  assert(ctx.mishapProfile&&integer(ctx.injuryImpairment,0,9999),'Mishap: neověřená anatomie nebo impairment');
  transition=applyConfirmedInjuryMishap({state,round,eventId:session.eventId,mishapId:session.event.id,
   baseML:ctx.ml,roll:roll??null,gmConfirmed:true,...ctx.mishapProfile,injuryImpairment:ctx.injuryImpairment});
 }else if(session.event.kind==='injury-morale'){
  assert(integer(roll,1,100),'Morale vyžaduje skutečný d100');
  transition=applyConfirmedInjuryMorale({state,round,eventId:session.eventId,woundId:session.event.id,
   initiativeML:ctx.ml,roll,aberrance:ctx.abe,timelineId,gmConfirmed:true});
 }else if(session.event.kind==='shock-recovery'){
  assert(integer(roll,1,100),'Shock Recovery vyžaduje skutečný d100');
  const fatigue=combatFatigueTotals(state).total;
  const sl=nameSL(successLevel(roll,ctx.ml-fatigue-(state.shock==='STN'?0:20)));
  const comaNeeded=state.shock==='UNC'&&sl==='CF';
  const comaD10=session.rolls.find(x=>x.id==='comaIntervalD10')?.value??null;
  assert(!comaNeeded||integer(comaD10,1,10),'UNC + CF vyžaduje další skutečný d10 pro Coma; výsledek se nesmí domyslet');
  transition=applyConfirmedShockRecovery({state,round,eventId:session.eventId,sl,
   timingConfirmed:true,characterId:character.id,actorId,turnEnded,timelineId,elapsedMinutesSinceOriginal,
   shockML:ctx.ml,roll,comaLocationShock:comaNeeded?ctx.comaLocationShock:null,
   comaInjuryLevel:comaNeeded?ctx.comaInjuryLevel:null,initialComaD10:comaD10});
 }else throw Error('Neznámá událost');
 const finished=transition.state;
 const last=finished.events.at(-1);
 assert(last?.id===session.eventId,'Nepodařilo se doložit automatický přechod');
 last.details.physicalDice={format:'hmk-manual-dice-proof-v1',source:session.event.source,
  rolls:session.rolls.map(x=>({...x}))};
 last.details.guidedResolution={kind:session.event.kind,ml:ctx.ml,abe:ctx.abe,derivedSL:roll==null?null:
  nameSL(successLevel(roll,session.event.kind==='blood-loss'?ctx.ml:session.event.kind==='injury-mishap'?
  ctx.ml-ctx.fatigue-ctx.injuryImpairment:session.event.kind==='shock-recovery'?
  ctx.ml-combatFatigueTotals(state).total-(state.shock==='STN'?0:20):session.event.kind==='injury-morale'?
  ctx.ml-5*ctx.abe-combatFatigueTotals(state).total+(state.morale?.state==='brave'?20:0):ctx.ml)),
  source:'HMK World of Kèthîra',ruleChoice:'automatic-verified-event'};
 if(session.event.kind==='injury-mishap'){
  last.details.guidedResolution.derivedSL=transition.result.slName;
  last.details.guidedResolution.injuryImpairment=ctx.injuryImpairment;
  last.details.guidedResolution.mishapTest=ctx.impairedTest;
  last.details.guidedResolution.anatomy=ctx.mishapProfile;
 }
 return {state:finished,transition,event:session.event,proof:last.details.physicalDice};
}
