/** HMK pp.183, 269–270, 272. Healing recovery for anatomical wounds and anaemia.
 * Both the original trauma list and every daily result are recorded in the
 * character's health events. No natural recovery timer is advanced here.
 */
import {DAY_MINUTES,getCampaignAnchor,getCampaignEpisodeAnchor} from './hmk-campaign-calendar.js';
import {openConcurrentProcedures} from './hmk-concurrent-procedures.js';
import {createAlchemyHealingImbibing} from './hmk-alchemy-imbibing.js?v=94.170';
import {createAlchemyVialEmpty} from './hmk-alchemy-vial-ledger.js';
import {availableMasteries} from './hmk-skill-test-engine.js';
import {initialCombatState,validateCombatState,applyExtendedShockCourse,applyComaCourse} from './persistent-combat-state.js';
import {applyConfirmedBloodLossHealing,applyConfirmedInjuryHealing,applyConfirmedInfectionCourse,infectionResumptionRequirements,injuryArcaneHealingRate} from './hmk-healing-persistence.js?v=94.151';
import {concurrentShockSources,initializeConcurrentShock,projectConcurrentShock} from './hmk-concurrent-shock-projection.js';

import {healingBase} from '../rules/healing.js';
import {resolveElixirExposureRecovery} from './hmk-weather-hazard-aftermath.js?v=94.151';

import {prepareDiseaseCourse} from './hmk-disease-course.js?v=94.153';
import {preparePoisonCourse} from './hmk-poison-course.js?v=94.153';

import {alchemyNutritionContext,resolveAlchemyNutritionRecovery} from './hmk-malnutrition-medical.js?v=94.154';

const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const check=(condition,message)=>{if(!condition)throw Error('Healing: '+message);};
const die=(proof,faces)=>integer(proof?.value,1,faces)&&['manual','cryptographic-software-die'].includes(proof.origin);
const eventType='alchemy-healing-recovery';
const interactionType='alchemy-healing-interaction';
const key=({kind,sourceId})=>kind+'::'+sourceId;
const rowsFor=(state,campaignId,useId)=>state.events.filter(event=>(event.type===eventType||event.type===interactionType)&&
 event.details.campaignId===campaignId&&event.details.useId===useId);

function anchorFor(clock,actorId,{kind,sourceId},state){
 if(kind==='exposure'){
  const hazard=state?.environmentalHazards?.find(item=>item.sourceId===sourceId);
  return getCampaignEpisodeAnchor(clock,'weather',actorId,hazard?.id??sourceId)??getCampaignEpisodeAnchor(clock,'weather',actorId,sourceId);
 }
 if(kind==='starvation'||kind==='thirst'){
  const episode=state?.malnutritionEpisodes?.find(item=>item.id===sourceId);
  return episode?{minute:episode.originMinute}:null;
 }
 if(kind==='disease'||kind==='poison')return getCampaignEpisodeAnchor(clock,kind,actorId,kind+':'+sourceId);
 if(kind==='injury'||kind==='infection')return getCampaignAnchor(clock,'wound',actorId,sourceId);
 return getCampaignAnchor(clock,kind,actorId);
}
function activeTraumas(state,clock,actorId,initial){
 const extendedId=state.extendedShock?.sourceId??getCampaignAnchor(clock,'extended-shock',actorId)?.eventId;
 const comaId=state.coma?.sourceId??getCampaignAnchor(clock,'coma',actorId)?.eventId;
 const campaignId=clock.campaignId||`legacy:${clock.events?.[0]?.id||''}`;
 const nutrition=(state.malnutritionEpisodes??[]).filter(item=>item.campaignId===campaignId&&item.status==='active');
 const current=initial??[
  ...state.wounds.filter(wound=>!wound.healed).map(wound=>({kind:'injury',sourceId:wound.id})),
  ...(state.bloodLoss.bp?[{kind:'blood-loss',sourceId:getCampaignAnchor(clock,'blood-loss',actorId)?.eventId}]:[]),
  ...state.wounds.filter(wound=>wound.healing?.infected).map(wound=>({kind:'infection',sourceId:wound.id})),
  ...(state.extendedShock?[{kind:'extended-shock',sourceId:extendedId}]:[]),
  ...(state.coma?.active?[{kind:'coma',sourceId:comaId}]:[]),
  ...(state.environmentalHazards??[]).filter(hazard=>hazard.active).map(hazard=>({kind:'exposure',sourceId:hazard.sourceId})),
  ...(state.diseaseCourses??[]).filter(course=>course.status==='active').map(course=>({kind:'disease',sourceId:course.sourceId})),
  ...(state.toxinCourses??[]).filter(course=>course.status==='active').map(course=>({kind:'poison',sourceId:course.sourceId})),
  ...nutrition.map(item=>({kind:item.kind,sourceId:item.id}))
 ];
 return current.filter(trauma=>{
  switch(trauma.kind){
   case 'starvation':
   case 'thirst':return nutrition.some(item=>item.id===trauma.sourceId&&item.kind===trauma.kind);
   case 'injury':return state.wounds.some(wound=>wound.id===trauma.sourceId&&!wound.healed);
   case 'infection':return state.wounds.some(wound=>wound.id===trauma.sourceId&&wound.healing?.infected);
   case 'extended-shock':return !!state.extendedShock&&extendedId===trauma.sourceId;
   case 'coma':return state.coma?.active&&comaId===trauma.sourceId;
   case 'disease':return state.diseaseCourses?.some(course=>course.status==='active'&&course.sourceId===trauma.sourceId);
   case 'poison':return state.toxinCourses?.some(course=>course.status==='active'&&course.sourceId===trauma.sourceId);
   case 'exposure':return state.environmentalHazards?.some(hazard=>hazard.active&&hazard.sourceId===trauma.sourceId);
   case 'blood-loss':return state.bloodLoss.bp>0&&(!initial||anchorFor(clock,actorId,trauma)?.eventId===trauma.sourceId);
   default:return false;
  }
 });
}
function requireHandledTrauma(state){
 check(!state.asphyxiaComaPending&&!state.sleepDeprivation?.activeWeariness&&!state.herbalSoporific&&!state.herbalParalysis&&
  concurrentShockSources(state).every(source=>['weather','disease','poison','malnutrition'].includes(source.kind))&&
  !(state.environmentalHazards??[]).some(hazard=>hazard.active&&hazard.skinPending),
  'tento krok zatím neumí vyhodnotit všechny přítomné druhy traumatu.');
}
function overlapRows(journal,campaignId,actorId,minute,state){
 const keys=new Set();
 for(const row of journal){
  const proof=row.skillTestProof;
  if(row.calendarCampaignId!==campaignId||row.characterId!==actorId||row.campaignMinute!==minute)continue;
  const kind=({'arcane-balm-injury':'injury','arcane-balm-blood-loss':'blood-loss',
   'arcane-balm-exposure':'exposure','arcane-balm-course':proof?.report?.kind})[proof?.type];
  if(kind&&state.events.some(event=>{
   const recorded=event.details?.arcaneRecovery??event.details;
   return event.id===proof.report?.eventId&&recorded?.sourceId===proof.sourceId&&recorded.minute===minute;
  }))keys.add(key({kind,sourceId:proof.sourceId}));
 }
 for(const event of state.events){
  const p=event.details;
  if(event.type===eventType&&p.campaignId===campaignId&&p.minute===minute)
   for(const trauma of p.rolled)keys.add(key(trauma));
 }
 return keys;
}
function eligibleTraumaRolls(traumas,state,clock,actorId){
 const infected=state.wounds.some(wound=>wound.healing?.infected);
 const procedures=openConcurrentProcedures(clock);
 return traumas.filter(trauma=>trauma.kind!=='injury'||!infected&&!procedures.some(proc=>
  proc.characterId===actorId&&proc.woundId===trauma.sourceId));
}
function recoverTraumas({actor,state,clock,campaignId,traumas,rolls,id,round,journal,physicianStars,restfulShelter}){
 let next=state;
 const overlap=overlapRows(journal,campaignId,actor.id,clock.minute,state);
 const eligible=eligibleTraumaRolls(traumas,state,clock,actor.id);
 const needed=eligible.filter(trauma=>!overlap.has(key(trauma)));
 check(Array.isArray(rolls)&&rolls.length===needed.length&&
  needed.every(trauma=>rolls.filter(roll=>key(roll)===key(trauma)&&die(roll,100)).length===1),
  'doložte právě jeden d100 pro každé trauma bez souběžného magického hodu.');
 const {end:endurance,wil:will}=actor.hmk?.attributes??{};
 const applied=[];
 for(const trauma of needed){
  const anchor=anchorFor(clock,actor.id,trauma,next);
  check(anchor&&anchor.minute<=clock.minute,'chybí časový počátek traumatu.');
  const day=Math.floor((clock.minute-anchor.minute)/DAY_MINUTES);
  const dice=rolls.find(roll=>key(roll)===key(trauma));
  const common={state:next,round,eventId:id+':'+(applied.length+1),endurance,roll:dice.value,
   arcaneFreeRoll:true,gmConfirmed:true};
  const woundContext={...common,woundId:trauma.sourceId,daySinceInjury:day,will,
   herbalContext:{journal,campaignId,minute:clock.minute,targetId:actor.id,woundOnsetMinute:anchor.minute}};
  let action;
  switch(trauma.kind){
   case 'starvation':
   case 'thirst':action=resolveAlchemyNutritionRecovery({...common,actor,clock,campaignId,journal,episodeId:trauma.sourceId});break;
   case 'injury':action=applyConfirmedInjuryHealing(woundContext);break;
   case 'blood-loss':action=applyConfirmedBloodLossHealing({...common,daySinceBloodLoss:day});break;
   case 'infection':{
    const otherWoundDays=Object.fromEntries(infectionResumptionRequirements(next,trauma.sourceId).flatMap(({woundId})=>{
     const woundAnchor=getCampaignAnchor(clock,'wound',actor.id,woundId);
     return woundAnchor?[[woundId,Math.floor((clock.minute-woundAnchor.minute)/DAY_MINUTES)]]:[];
    }));
    action=applyConfirmedInfectionCourse({...woundContext,otherWoundDays});break;
   }
   case 'disease':
   case 'poison':{
    const poison=trauma.kind==='poison';
    const prepare=poison?preparePoisonCourse:prepareDiseaseCourse;
    action=prepare({...common,actor,sourceId:trauma.sourceId,arcaneEventId:common.eventId,courseD100:dice.value,
     elapsedMinutes:clock.minute-anchor.minute,
     ...(poison?{herbalContext:{journal,campaignId,minute:clock.minute,poisonOriginMinute:anchor.minute}}:{})});
    break;
   }
   case 'exposure':action=resolveElixirExposureRecovery({...common,actor,sourceId:trauma.sourceId,recoveryD100:dice.value});break;
   case 'extended-shock':action=applyExtendedShockCourse({...common,healingBase:healingBase({endurance,will}),physicianStars});break;
   case 'coma':
    check(typeof restfulShelter==='boolean','doložte klidné chráněné prostředí pro Coma Course.');
    action=applyComaCourse({...common,healingBase:healingBase({endurance,will}),restfulShelter,
     daysElapsed:day-next.coma.elapsedDays});break;
  }
  next=action.state;
  const evidence=next.events.at(-1);
  evidence.details.alchemyHealing={recoveryId:id,minute:clock.minute,origin:dice.origin,sourcePage:272};
  applied.push({...trauma,d100:dice.value,origin:dice.origin,sl:evidence.details.sl,
   ...(['starvation','thirst'].includes(trauma.kind)?{nutritionMode:evidence.details.mode,ration:evidence.details.ration}:{})});
 }
 return {state:next,rolled:applied,overlapped:eligible.filter(trauma=>overlap.has(key(trauma)))};
}
function requireContext({state,actor,clock,campaignId,useId,gmConfirmed}){
 validateCombatState(state);
 check((clock?.campaignId??'legacy:'+clock?.events?.[0]?.id)===campaignId&&Number.isSafeInteger(clock?.minute)&&clock?.characterIds?.includes(actor?.id)&&
  typeof useId==='string'&&useId&&state.shock!=='KIA'&&gmConfirmed===true,
  'chybí živý příjemce, kampaň nebo potvrzení GM.');
}
function record(state,round,id,details){
 check(!state.events.some(event=>event.id===id),'tato kontrola je již zapsaná.');
 state.events.push({id,type:eventType,round,details});state.lastRound=round;
 validateCombatState(state);
 return {state,receipt:details};
}

export function startAlchemyHealingRecovery({actor,clock,campaignId,useId,
 state=actor?.hmk?.healthState??initialCombatState(),imbibing,rolls=[],journal=[],physicianStars=0,restfulShelter,gmConfirmed=false}={}){
 requireContext({state,actor,clock,campaignId,useId,gmConfirmed});
 check(rowsFor(state,campaignId,useId).length===0,'tato dávka již působila.');
 const delta={CF:-2,F:-1,S:0,CS:1}[imbibing?.sl];
 check(imbibing?.elixirName==='Healing'&&imbibing.campaignId===campaignId&&imbibing.minute===clock.minute&&
  imbibing.targetId===actor.id&&integer(imbibing.baseAS,1,11)&&integer(imbibing.asBefore,1,imbibing.baseAS)&&
  imbibing.finalAS===Math.max(0,imbibing.asBefore+delta),
  'chybí odpovídající výsledek vypití.');
 check(Array.isArray(rolls),'chybí seznam léčebných hodů.');
 const id=useId+':healing:0',round=Math.max(1,state.lastRound);
 const result={campaignId,useId,actorId:actor.id,minute:clock.minute,day:0,asBefore:imbibing.finalAS,
  asAfter:imbibing.finalAS,weakness:0,traumas:[],rolled:[],overlapped:[],nextMinute:null};
 let next=structuredClone(state);
 if(!imbibing.finalAS){
  check(rolls.length===0,'neúčinná dávka nemá žádné léčebné hody.');
  return record(next,round,id,result);
 }
 requireHandledTrauma(state);
 result.traumas=activeTraumas(state,clock,actor.id,null);
 check(result.traumas.every(trauma=>trauma.sourceId&&anchorFor(clock,actor.id,trauma,state)),'chybí kalendářový počátek traumatu.');
 check(!openConcurrentProcedures(clock).some(proc=>proc.characterId===actor.id&&result.traumas.some(t=>t.kind==='injury'&&t.sourceId===proc.woundId)),
  'nejdřív dokončete probíhající ošetření rány.');
 check(state.wounds.every(wound=>wound.healed||injuryArcaneHealingRate(wound)!==null),
  'přítomná rána potřebuje jiný postup než Injury Healing Roll.');
 result.removed={windedness:next.fatigue.windedness,weariness:next.fatigue.weariness,
  bleeding:next.wounds.filter(wound=>wound.bleeding).map(wound=>wound.id),shock:next.shock};
 next.fatigue.windedness=0;next.fatigue.weariness=0;
 for(const wound of next.wounds){
  if(wound.bleeding){wound.bleeding=false;wound.nextAdvanceRound=null;}
 }
 if(!next.extendedShock&&!next.coma?.active){
  const projection=initializeConcurrentShock(next);
  projection.baseShock='NONE';
  next.shockOriginRound=null;next.shockFollowup=null;next.bloodShockPending=false;
  projectConcurrentShock(next);
 }
 if(imbibing.sl==='CF'){
  result.weakness=imbibing.baseAS*5;
  next.fatigue.otherWeakness+=result.weakness;
 }
 const recovered=recoverTraumas({actor,state:next,clock,campaignId,traumas:result.traumas,rolls,id,round,journal,physicianStars,restfulShelter});
 next=recovered.state;result.rolled=recovered.rolled;result.overlapped=recovered.overlapped;
 result.removed.shockAfter=next.shock;
 const remaining=activeTraumas(next,clock,actor.id,result.traumas);
 if(remaining.length)result.nextMinute=clock.minute+DAY_MINUTES;
 else if(result.traumas.length&&result.weakness){
  next.fatigue.otherWeakness-=result.weakness;result.weakness=0;
 }
 return record(next,round,id,result);
}

export function advanceAlchemyHealingRecovery({actor,clock,campaignId,useId,
 state=actor?.hmk?.healthState??initialCombatState(),dailyRoll=null,rolls=[],journal=[],physicianStars=0,restfulShelter,gmConfirmed=false}={}){
 requireContext({state,actor,clock,campaignId,useId,gmConfirmed});
 check(Array.isArray(rolls),'chybí seznam léčebných hodů.');
 const history=rowsFor(state,campaignId,useId),previous=history.at(-1)?.details;
 check(previous?.nextMinute===clock.minute&&previous.actorId===actor.id,'denní kontrola není právě splatná.');
 const traumas=history[0].details.traumas,remaining=activeTraumas(state,clock,actor.id,traumas);
 const day=previous.day+1,id=useId+':healing:'+day,round=Math.max(1,state.lastRound);
 const result={campaignId,useId,actorId:actor.id,minute:clock.minute,day,asBefore:previous.asAfter,
  asAfter:previous.asAfter,weakness:previous.weakness,dailyRoll,rolled:[],overlapped:[],nextMinute:null};
 let next=structuredClone(state);
 if(!remaining.length){
  check(dailyRoll===null&&rolls.length===0,'původní traumata už jsou zahojená, žádný hod se neprovádí.');
  next.fatigue.otherWeakness-=Math.min(result.weakness,next.fatigue.otherWeakness);
  result.weakness=0;
  return record(next,round,id,result);
 }
 check(die(dailyRoll,10),'vyžaduje se skutečný denní d10.');
 result.asAfter--;
 result.success=dailyRoll.value<=result.asBefore;
 if(result.success){
  const released=Math.min(5,result.weakness,next.fatigue.otherWeakness);
  result.weakness-=released;next.fatigue.otherWeakness-=released;
  const recovered=recoverTraumas({actor,state:next,clock,campaignId,traumas:remaining,rolls,id,round,journal,physicianStars,restfulShelter});
  next=recovered.state;result.rolled=recovered.rolled;result.overlapped=recovered.overlapped;
 }else check(rolls.length===0,'neúspěšný denní d10 nevytváří léčebné hody.');
 if(activeTraumas(next,clock,actor.id,traumas).length){
  if(result.asAfter>0)result.nextMinute=clock.minute+DAY_MINUTES;
 }else{
  next.fatigue.otherWeakness-=Math.min(result.weakness,next.fatigue.otherWeakness);
  result.weakness=0;
 }
 return record(next,round,id,result);
}

/** Prepare the health update and both vial receipts for one atomic commit. */
export function prepareAlchemyHealingUse({actor,maker,clock,campaignId,useId,emptyId,finishId,testSkill,imbibingRoll,
 journal=[],inventory=[],rolls=[],physicianStars=0,restfulShelter,gmConfirmed=false}={}){
 const state=actor?.hmk?.healthState??initialCombatState();
 requireContext({state,actor,clock,campaignId,useId,gmConfirmed});
 check(clock.characterIds.includes(maker?.id)&&!['KIA','INC','UNC','STN'].includes(maker.hmk?.healthState?.shock),
  'lahvičku musí podat člen kampaně schopný provést akci.');
 check(typeof emptyId==='string'&&emptyId&&emptyId!==useId&&!journal.some(row=>[emptyId,useId].includes(row.id)),
  'chybí nové identifikátory pro vypití a prázdnou lahvičku.');
 check(die(imbibingRoll,100)&&['Aura','Alchemy'].includes(testSkill),
  'nutný skutečný Aura nebo Alchemy d100 příjemce.');
 const ml=availableMasteries(actor).find(skill=>skill.name===testSkill)?.ml;
 check(ml,'příjemce nemá doložené Aura nebo Alchemy ML.');
 const {minute}=clock;
 const imbibing=createAlchemyHealingImbibing({journal,inventory,campaignId,minute,
  actorId:maker.id,targetId:actor.id,finishId,testSkill,ml,d100:imbibingRoll.value,
  origin:imbibingRoll.origin,emptyId,gmConfirmed});
 const empty=createAlchemyVialEmpty({journal,inventory,campaignId,minute,actorId:maker.id,finishId,
  reason:'Healing · vypití či podání',confirmedByGM:true});
 const recovery=startAlchemyHealingRecovery({actor,clock,campaignId,useId,state,imbibing,rolls,journal,physicianStars,restfulShelter,gmConfirmed});
 return {imbibing,empty,...recovery};
}


export function alchemyHealingRollPlan({actor,clock,campaignId,useId=null,journal=[],includeRolls=true}){
 const state=actor?.hmk?.healthState??initialCombatState();
 const history=useId?rowsFor(state,campaignId,useId):[];
 const previous=history.at(-1)?.details;
 const remaining=activeTraumas(state,clock,actor.id,history[0]?.details.traumas);
 const overlap=overlapRows(journal,campaignId,actor.id,clock.minute,state);
 if(!includeRolls)return {remaining};
 return {dailyTN:previous?.asAfter??null,remaining,
  rolls:eligibleTraumaRolls(remaining,state,clock,actor.id).filter(trauma=>!overlap.has(key(trauma))).map(trauma=>{
   if(!['starvation','thirst'].includes(trauma.kind))return trauma;
   const episode=state.malnutritionEpisodes.find(item=>item.id===trauma.sourceId);
   const context=alchemyNutritionContext({journal,campaignId,actorId:actor.id,minute:clock.minute,episode});
   return {...trauma,nutritionMode:context.mode,ration:context.ration};
  })};
}
export function pendingAlchemyHealing(characters,clock,campaignId){
 return characters.flatMap(actor=>{
  if(!clock.characterIds?.includes(actor.id)||actor.hmk?.healthState?.shock==='KIA')return [];
  const sources=new Map();
  for(const event of actor.hmk?.healthState?.events??[]){
   if((event.type===eventType||event.type===interactionType)&&event.details.campaignId===campaignId)
    sources.set(event.details.useId,event.details);
  }
  return [...sources.values()].filter(source=>source.nextMinute!==null).map(source=>({...source,actor}));
 });
}
/** Close the daily routine when another confirmed procedure heals its last
 * original trauma. Use the same recovery history as a scheduled daily check.
 */
export function closeResolvedAlchemyHealing({actor,clock,campaignId}){
 const state=actor.hmk?.healthState;
 if(!state||state.shock==='KIA'||!clock.characterIds?.includes(actor.id))return {state,rows:[]};
 const sources=new Map();
 for(const event of state.events){
  if((event.type!==eventType&&event.type!==interactionType)||event.details.campaignId!==campaignId)continue;
  const receipt=event.details;
  const source=sources.get(receipt.useId);
  sources.set(receipt.useId,{initial:source?.initial??receipt,last:receipt});
 }
 let next=state;
 const rows=[];
 for(const {initial,last} of sources.values()){
  if(last.nextMinute===null||clock.minute<last.minute||clock.minute>last.nextMinute||
   !initial.traumas?.length||activeTraumas(state,clock,actor.id,initial.traumas).length)continue;
  const day=last.day+1,id=last.useId+':healing:'+day;
  const receipt={campaignId,useId:last.useId,actorId:actor.id,minute:clock.minute,day,
   asBefore:last.asAfter,asAfter:last.asAfter,weakness:0,dailyRoll:null,rolled:[],overlapped:[],
   nextMinute:null,endedBy:'original-traumas-healed'};
  if(next===state)next=structuredClone(state);
  next.fatigue.otherWeakness-=Math.min(last.weakness,next.fatigue.otherWeakness);
  record(next,Math.max(1,next.lastRound),id,receipt);
  rows.push({id,characterId:actor.id,calendarCampaignId:campaignId,campaignMinute:clock.minute,
   calendarAlchemyHealingRecovery:receipt});
 }
 return {state:next,rows};
}

export function assertAlchemyHealingMayAdvance(characters,clock,campaignId,targetMinute){
 const missed=pendingAlchemyHealing(characters,clock,campaignId).find(source=>source.nextMinute<targetMinute);
 check(!missed,'nejprve vyhodnoťte denní zotavení u postavy '+missed?.actor.name+' v minutě '+missed?.nextMinute+'.');
}

function healingInteraction(previous,trigger,use,triggerId){
 const effect=trigger.profusionIllEffects?.find(effect=>effect.sourceUseId===previous.useId&&effect.kind==='healing-weakness');
 const reduction=trigger.elixirName==='Physic'?trigger.physicEffects?.find(effect=>effect.sourceUseId===previous.useId):null;
 if(!effect&&!reduction)return null;
 check(previous.nextMinute!==null&&previous.nextMinute>=trigger.minute&&previous.asAfter>0&&
  previous.actorId===trigger.targetId&&previous.campaignId===trigger.campaignId&&use?.elixirName==='Healing',
  'souběh vyžaduje aktivní Healing tohoto příjemce.');
 if(effect)check(trigger.sl==='CF'&&trigger.finalAS>0&&effect.baseAS===use.asBefore&&effect.weakness===use.asBefore*5,
  'poškozený doklad Weakness ze souběhu.');
 if(reduction)check(reduction.finishId===use.finishId&&reduction.asBefore===previous.asAfter&&
  reduction.asAfter===Math.max(0,previous.asAfter-trigger.finalAS),'poškozený doklad snížení AS.');
 const asAfter=reduction?.asAfter??previous.asAfter;
 const weaknessAdded=effect?.weakness??0;
 return {campaignId:previous.campaignId,useId:previous.useId,actorId:previous.actorId,minute:trigger.minute,
  day:previous.day,asBefore:previous.asAfter,asAfter,weakness:previous.weakness+weaknessAdded,weaknessAdded,
  nextMinute:asAfter>0?previous.nextMinute:null,triggerId};
}

export function prepareAlchemyHealingInteractions({state,journal,trigger,triggerId}){
 const sourceIds=new Set([...(trigger.profusionIllEffects??[]).filter(effect=>effect.kind==='healing-weakness').map(effect=>effect.sourceUseId),
  ...(trigger.physicEffects??[]).map(effect=>effect.sourceUseId)]);
 const rows=[];
 let next=state;
 for(const useId of sourceIds){
  const use=journal.find(row=>row.id===useId)?.calendarAlchemyImbibing;
  if(use?.elixirName!=='Healing')continue;
  const previous=next&&rowsFor(next,trigger.campaignId,useId).at(-1)?.details;
  check(previous,'chybí zdravotní historie aktivního Healing.');
  const receipt=healingInteraction(previous,trigger,use,triggerId);
  const id=triggerId+':healing-interaction:'+useId;
  check(receipt&&!next.events.some(event=>event.id===id),'tento souběh již byl započítán.');
  next=structuredClone(next);
  next.fatigue.otherWeakness+=receipt.weaknessAdded;
  const round=Math.max(1,next.lastRound);
  next.events.push({id,type:interactionType,round,details:receipt});next.lastRound=round;
  validateCombatState(next);
  rows.push({id,characterId:receipt.actorId,calendarCampaignId:receipt.campaignId,campaignMinute:receipt.minute,
   calendarAlchemyHealingInteraction:receipt});
 }
 return {state:next,rows};
}

export function validateAlchemyHealingRecovery(journal,characters,branches={},activeCampaignId=null){
 const rows=new Map(journal.map(row=>[row.id,row]));
 const actors=new Map(characters.map(actor=>[actor.id,actor]));
 const starts=new Set();
 const previous=new Map(),interactions=new Set(),seenUses=new Set();
 for(const row of journal){
  if(row.calendarAlchemyImbibing)seenUses.add(row.id);
  const interaction=row.calendarAlchemyHealingInteraction;
  const receipt=interaction??row.calendarAlchemyHealingRecovery;
  if(!receipt)continue;
  const {campaignId,useId,actorId,minute,day,asBefore,asAfter,dailyRoll,success,nextMinute}=receipt;
  const use=rows.get(useId)?.calendarAlchemyImbibing;
  const old=previous.get(useId);
  check(seenUses.has(useId)&&use?.elixirName==='Healing'&&use.targetId===actorId&&use.campaignId===campaignId&&
   row.calendarCampaignId===campaignId&&row.characterId===actorId&&row.campaignMinute===minute&&
   row.id===(interaction?interaction.triggerId+':healing-interaction:'+useId:useId+':healing:'+day),'poškozený původ dokladu léčení.');
  if(interaction){
   const trigger=rows.get(interaction.triggerId)?.calendarAlchemyImbibing;
   check(seenUses.has(interaction.triggerId)&&trigger&&old&&JSON.stringify(healingInteraction(old,trigger,use,interaction.triggerId))===JSON.stringify(interaction)&&
    !interactions.has(row.id),'poškozený nebo duplicitní souběh Healing.');
   interactions.add(row.id);
  }else if(receipt.endedBy!==undefined){
   check(receipt.endedBy==='original-traumas-healed'&&old&&old.nextMinute!==null&&
    day===old.day+1&&minute>=old.minute&&minute<=old.nextMinute&&
    asBefore===old.asAfter&&asAfter===asBefore&&nextMinute===null&&dailyRoll===null&&
    receipt.weakness===0&&receipt.rolled?.length===0&&receipt.overlapped?.length===0,
    'poškozený doklad automatického ukončení Healing.');
  }else if(!old){
   check(day===0&&minute===use.minute&&asBefore===use.finalAS&&asAfter===asBefore,
    'poškozený počátek léčení.');
   starts.add(useId);
  }else{
   check(day===old.day+1&&minute===old.nextMinute&&asBefore===old.asAfter&&
    (dailyRoll===null?asAfter===asBefore&&nextMinute===null:
     die(dailyRoll,10)&&asAfter===asBefore-1&&success===(dailyRoll.value<=asBefore)),
    'poškozený denní hod nebo pokles AS.');
  }
  check(interaction||nextMinute===null||asAfter>0&&nextMinute===minute+DAY_MINUTES,'poškozený další termín léčení.');
  const actor=(campaignId!==activeCampaignId&&branches[campaignId]?.[actorId])||actors.get(actorId);
  const state=actor?.hmk?.healthState;
  const event=state?.events.find(entry=>entry.id===row.id&&entry.type===(interaction?interactionType:eventType));
  check(event&&JSON.stringify(event.details)===JSON.stringify(receipt),'doklad nesouhlasí s historií zdraví.');
  previous.set(useId,receipt);
 }
 for(const row of journal){
  const trigger=row.calendarAlchemyImbibing;
  if(trigger?.elixirName==='Healing')check(starts.has(row.id),'chybí počáteční doklad léčení.');
  if(!trigger)continue;
  for(const {sourceUseId} of [...(trigger.physicEffects??[]),...(trigger.profusionIllEffects??[])]){
   if(rows.get(sourceUseId)?.calendarAlchemyImbibing?.elixirName==='Healing')
    check(interactions.has(row.id+':healing-interaction:'+sourceUseId),'chybí doklad souběhu aktivního Healing.');
  }
 }
 return true;
}


export function assertAlchemyHealingRecoveryAppendOnly(before,after){
 const current=new Map(after.map(row=>[row.id,row]));
 for(const old of before){
  if(old.calendarAlchemyHealingRecovery||old.calendarAlchemyHealingInteraction)
   check(JSON.stringify(current.get(old.id))===JSON.stringify(old),'uložený doklad zotavení nelze změnit ani odstranit.');
 }
}

export function healingArcaneRollAlreadyUsed(state,campaignId,minute,trauma){
 return state.events.some(event=>event.type===eventType&&event.details.campaignId===campaignId&&
  event.details.minute===minute&&event.details.rolled.some(roll=>key(roll)===key(trauma)));
}
