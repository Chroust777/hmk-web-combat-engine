/** HMK 149, 185–186, 189, 269–274. Source-linked recovery for the
 * Mindsalve and Poison doses, with thermal shields and Quiescence projections. */
import {DAY_MINUTES} from './hmk-campaign-calendar.js';
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
import {activeAdditionalTemporary} from './hmk-alchemy-imbibing.js?v=94.174';
import {activeFearSources,updateFearSource} from './hmk-concurrent-fear.js';
import {preparePoisonStart,preparePoisonOnset,preparePoisonCourse,endAlchemicalPoison} from './hmk-poison-course.js?v=94.158';
import {psycheStressRecovery} from '../rules/mental-trauma.js';
import {successLevel} from '../rules/tests.js';
const check=(condition,message)=>{if(!condition)throw Error('Alchemy: '+message);};
const whole=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const latest=(journal,campaignId,useId)=>journal.findLast(row=>row.calendarCampaignId===campaignId&&
 row.calendarAlchemyExtendedRecovery?.useId===useId)?.calendarAlchemyExtendedRecovery;
const cases=arcane=>(arcane?.psycheTraumas??[]).filter(trauma=>!trauma.recovered&&trauma.psycheLevels>0);
const names=['CF','F','S','CS'];
const toxin=(state,useId)=>state?.toxinCourses?.find(course=>course.alchemicalSource?.useId===useId);
const livingCourse=course=>['incubating','active'].includes(course?.status);

export function fireshieldProtection(context){return thermalShieldProtection('Fireshield',context);}
export function iceshieldProtection(context){return thermalShieldProtection('Iceshield',context);}
function thermalShieldProtection(elixir,{journal=[],campaignId,minute,actorId,auralShockLevels=0}){

 if(auralShockLevels>0)return {av:0,advanceBonus:0,sources:[]};
 const candidates=activeAdditionalTemporary(journal,campaignId,actorId,minute,elixir)
  .filter(source=>source.state.nextDueMinute>minute);
 const as=Math.max(0,...candidates.map(source=>source.state.currentAS));
 const av=Math.round(as/2);
 return {av,advanceBonus:av*5,sources:candidates.map(source=>({useId:source.useId,as:source.state.currentAS}))};
}

export function actorFireshieldAV(document,actorId){
 const clock=document?.campaignClock,actor=document?.characters?.find(c=>c.id===actorId);
 if(!clock||!actor||!clock.characterIds?.includes(actorId))return 0;
 return fireshieldProtection({journal:document.journal,campaignId:clock.campaignId||'legacy:'+(clock.events?.[0]?.id||''),
  minute:clock.minute,actorId,auralShockLevels:actor.hmk?.arcane?.auralShockLevels??0}).av;
}

export function quiescenceUses(journal,campaignId,actorId,minute){
 return activeAdditionalTemporary(journal,campaignId,actorId,minute,'Quiescence').map(source=>source.useId);
}

export function projectAlchemyDormancy(document){
 const clock=document.campaignClock;
 if(!clock)return;
 const campaignId=clock.campaignId||'legacy:'+(clock.events?.[0]?.id||'');
 for(const actor of document.characters){
  const state=actor.hmk?.healthState;
  if(!state||!clock.characterIds?.includes(actor.id))continue;
  const uses=quiescenceUses(document.journal,campaignId,actor.id,clock.minute);
  if(uses.length)state.alchemyDormancy=uses;
  else if(state.alchemyDormancy)delete state.alchemyDormancy;
 }
}

export function mindsalveRollPlan(actor,receipt=null){
 const traumas=cases(actor.hmk?.arcane);
 if(!receipt)return traumas.map(t=>({trait:t.trait,levels:t.psycheLevels}));
 const events=actor.hmk?.healthState?.events??[];
 const start=events.findIndex(event=>event.id===receipt.healthEventId);
 const since=start<0?[]:events.slice(start+1);
 return receipt.cases.flatMap(original=>{
  const trauma=traumas.find(item=>item.trait===original.trait&&item.sourceEventIds?.some(id=>original.sourceIds.includes(id)));
  const recovered=since.reduce((sum,event)=>{
   const detail=event.details;
   if(event.type==='hmk-psyche-recovery-roll'&&detail.trait===original.trait&&
    detail.sourceEventIds?.some(id=>original.sourceIds.includes(id)))
    return sum+Math.max(0,detail.beforePsyche-detail.afterPsyche);
   if(event.type==='alchemy-extended-recovery'&&detail.elixirName==='Mindsalve')
    return sum+(detail.rolls??[]).filter(roll=>roll.trait===original.trait&&
     detail.cases?.find(item=>item.trait===roll.trait)?.sourceIds.some(id=>original.sourceIds.includes(id)))
     .reduce((n,roll)=>n+Math.max(0,roll.before-roll.after),0);
   return sum;
  },0);
  const levels=Math.min(trauma?.psycheLevels??0,Math.max(0,original.levels-recovered));
  return levels?[{trait:original.trait,levels}]:[];
 });
}
function applyMindRolls({actor,state,arcane,original,plan,rolls}){
 check(rolls.length===plan.length,'Mindsalve vyžaduje samostatný Will d100 pro každou původní aktivní instanci PSY.');
 const will=actor.hmk?.attributes?.wil;
 check(!plan.length||whole(will,1,40),'Mindsalve vyžaduje ověřený Will.');
 return plan.map(({trait,levels},index)=>{
  const t=cases(arcane).find(item=>item.trait===trait),d100=rolls[index];
  check(whole(d100,1,100),'Mindsalve vyžaduje skutečný Will d100.');
  const sl=successLevel(d100,will*5);
  const result=psycheStressRecovery({psycheLevels:levels,intensity:t.intensity,permanent:t.permanent,sl});
  const removed=levels-result.psycheLevels;
  check(!t.manifested||state.fatigue.otherWeakness>=removed*5,'Mindsalve: stres nemá odpovídající Weakness.');
  check(state.morale.psycheStress>=removed,'Mindsalve: stres nemá odpovídající PSY.');
  if(t.manifested)state.fatigue.otherWeakness-=removed*5;
  state.morale.psycheStress-=removed;
  t.psycheLevels-=removed;
  t.intensity=result.intensity;t.permanent=result.permanent;
  if(t.psycheLevels===0){
   t.recovered=true;t.inactive=!t.permanent;t.recoverySchedulePending=false;t.psycheRecoveryPlan=null;
   t.manifestationPending=false;t.psycheExpressionActive=null;
  }
  if(t.recovered&&arcane.activeMisfireWarp&&t.sourceEventIds.includes(arcane.activeMisfireWarp.sourceEventId)&&
   !cases(arcane).some(other=>other.sourceEventIds?.includes(arcane.activeMisfireWarp.sourceEventId)))arcane.activeMisfireWarp=null;
  original.find(item=>item.trait===trait).levels=result.psycheLevels;
  return {trait,d100,willEML:will*5,sl:names[sl],before:levels,after:result.psycheLevels};
 });
}
function clearMindStates(state){
 if(['withdrawing','routed','catatonic'].includes(state.morale?.state)){
  state.morale.state='steady';state.morale.rallyPending=null;
 }
 for(const source of activeFearSources(state))
  if(['catatonic','terrified','afraid'].includes(source.state))updateFearSource(state,source.sourceEventId,{state:'steady'});
}
function snapshot(actor){
 return {state:structuredClone(actor.hmk?.healthState??initialCombatState()),arcane:structuredClone(actor.hmk?.arcane??{})};
}
function receiptRow(actor,out,receipt,id){
 const round=Math.max(1,out.state.lastRound);
 check(!out.state.events.some(e=>e.id===id),'duplicitní zdravotní doklad.');
 receipt.healthEventId=id;
 out.state.events.push({id,type:'alchemy-extended-recovery',round,details:receipt});
 out.state.lastRound=round;validateCombatState(out.state);
 return {id,characterId:actor.id,calendarCampaignId:receipt.campaignId,campaignMinute:receipt.minute,
  calendarAlchemyExtendedRecovery:receipt};
}
function carryMindCases(actor,last,receipt){
 const plan=mindsalveRollPlan(actor,last);
 for(const item of receipt.cases??[])item.levels=plan.find(entry=>entry.trait===item.trait)?.levels??0;
 return plan;
}
function releaseMindWeakness(state,receipt){
 state.fatigue.otherWeakness-=Math.min(state.fatigue.otherWeakness,receipt.weakness);
 receipt.weakness=0;
}

export function startExtendedAlchemy({actor,proof,useId,journal,mindRolls=[],symptomD10s=[]}){
 const out=snapshot(actor),{state,arcane}=out;
 const {campaignId,minute,elixirName,finalAS}=proof;
 const receipt={campaignId,minute,useId,elixirName,actorId:actor.id,phase:'start',
  asBefore:finalAS,asAfter:finalAS,weakness:0,nextMinute:null,active:false};
 if(finalAS>0&&elixirName==='Mindsalve'){
  clearMindStates(state);
  receipt.weakness=proof.illEffect?.amount??0;state.fatigue.otherWeakness+=receipt.weakness;
  receipt.cases=cases(arcane).map(t=>({trait:t.trait,levels:t.psycheLevels,sourceIds:[...(t.sourceEventIds??[])]}));
  check(receipt.cases.every(t=>t.sourceIds.length)&&new Set(receipt.cases.map(t=>t.trait)).size===receipt.cases.length,
   'Mindsalve vyžaduje dohledatelné zdroje všech přiřazených PSY instancí.');
  check(receipt.cases.reduce((sum,t)=>sum+t.levels,0)===(state.morale?.psycheStress??0),
   'Mindsalve: před dokončením přiřaďte dosud nepřiřazený PSY jeho Psyche Traitu.');
  receipt.rolls=applyMindRolls({actor,state,arcane,original:receipt.cases,plan:mindsalveRollPlan(actor),rolls:mindRolls});
  receipt.active=receipt.cases.some(t=>t.levels>0);
  if(receipt.active)receipt.nextMinute=minute+DAY_MINUTES;
  else if(receipt.cases.length)releaseMindWeakness(state,receipt);
 }else if(finalAS>0&&elixirName==='Poison'){
  const rounds=preparePoisonStart({actor,state,round:Math.max(1,state.lastRound),sourceId:'alchemy:'+useId,
   onsetMinutes:0,periodMinutes:0,initialHR:Math.max(0,Math.min(6,10-finalAS)),symptomD10s,
   transmission:'digested',gmConfirmed:true,actualExposureConfirmed:true,alchemicalSource:{useId,as:finalAS}});
  out.state=rounds.state;receipt.active=true;receipt.elapsedRounds=0;receipt.hr=rounds.course.hr;
 }else if(finalAS>0&&['Fireshield','Iceshield','Warmth','Soulcloak','Shadowbreath','Airtap'].includes(elixirName)){
  receipt.weariness=proof.illEffect?.amount??0;state.fatigue.weariness+=receipt.weariness;
 }
 return {...out,rows:[receiptRow(actor,out,receipt,useId+':extended:start')]};
}

export function pendingExtendedAlchemy(actor,clock,journal,campaignId){
 if(!clock?.characterIds?.includes(actor.id)||actor.hmk?.healthState?.shock==='KIA')return [];
 return journal.flatMap(row=>{
  const p=row.calendarAlchemyImbibing;
  if(row.calendarCampaignId!==campaignId||p?.targetId!==actor.id||!['Mindsalve','Poison'].includes(p.elixirName))return [];
  const receipt=latest(journal,campaignId,row.id);
  if(!receipt?.active)return [];
  const course=p.elixirName==='Poison'?toxin(actor.hmk?.healthState,row.id):null;
  return [{...receipt,course}];
 });
}

export function advanceExtendedAlchemy({actor,clock,journal,campaignId,useId,dailyRoll=null,mindRolls=[],courseD100=null,
 physicianSV=0,elapsedRounds=null,gmConfirmed=false}){
 const last=pendingExtendedAlchemy(actor,clock,journal,campaignId).find(row=>row.useId===useId);
 check(last&&gmConfirmed===true,'úkon nemá aktivní dávku nebo potvrzení GM.');
 const out=snapshot(actor),{state,arcane}=out;
 const {elixirName}=last,minute=clock.minute;
 const {course,...prior}=last;
 const receipt={...structuredClone(prior),minute,phase:elixirName==='Mindsalve'?'daily':'round',
  asBefore:last.asAfter};
 if(elixirName==='Mindsalve'){
  check(last.nextMinute===minute&&whole(dailyRoll,1,10),'Mindsalve vyžaduje d10 v přesném denním termínu.');
  const plan=carryMindCases(actor,last,receipt);
  receipt.dailyRoll=dailyRoll;receipt.asAfter--;receipt.success=dailyRoll<=last.asAfter;
  if(receipt.success){
   const released=Math.min(5,receipt.weakness,state.fatigue.otherWeakness);
   receipt.weakness-=released;state.fatigue.otherWeakness-=released;
   receipt.rolls=applyMindRolls({actor,state,arcane,original:receipt.cases,plan,rolls:mindRolls});
  }else{
   check(!mindRolls.length,'Po neúspěšném d10 se Will d100 neházejí.');
   receipt.rolls=[];
  }
  const remaining=mindsalveRollPlan({hmk:{arcane}},receipt).length>0;
  if(!remaining)releaseMindWeakness(state,receipt);
  receipt.active=remaining&&receipt.asAfter>0;receipt.nextMinute=receipt.active?minute+DAY_MINUTES:null;
 }else{
  check(livingCourse(course)&&elapsedRounds===course.elapsedRounds+1,'Poison: potvrďte právě následující pětisekundové kolo.');
  const args={actor,state,sourceId:course.sourceId,round:Math.max(1,state.lastRound),elapsedMinutes:0,elapsedRounds,gmConfirmed:true};
  const source=rowMinute(journal,useId);
  const result=course.status==='incubating'?preparePoisonOnset(args):
   preparePoisonCourse({...args,courseD100,physicianSV,physicianConfirmed:physicianSV>0,
    herbalContext:minute===source?{journal,campaignId,minute,poisonOriginMinute:source}:null});
  out.state=result.state;receipt.elapsedRounds=elapsedRounds;receipt.elapsedSeconds=elapsedRounds*5;receipt.hr=result.course.hr;
  receipt.rolls=course.status==='incubating'?[]:[{d100:courseD100,sl:result.report.sl,eml:result.report.rawEML}];
  receipt.active=livingCourse(result.course);
 }
 const id=useId+':extended:'+receipt.phase+':'+(elixirName==='Mindsalve'?minute:elapsedRounds);
 return {...out,rows:[receiptRow(actor,out,receipt,id)]};
}
const rowMinute=(journal,useId)=>journal.find(row=>row.id===useId)?.campaignMinute;

export function applyExtendedAlchemyInteractions({actor,journal,trigger,triggerId}){
 const out=snapshot(actor),rows=[];
 const {campaignId,minute}=trigger;
 const effects=trigger.profusionIllEffects??[];
 const targets=trigger.physicEffects??[];
 for(const effect of effects.filter(effect=>['fireshield-weariness','iceshield-weariness','warmth-weariness','soulcloak-weariness','shadowbreath-weariness','airtap-weariness'].includes(effect.kind))){
  const use=journal.find(row=>row.id===effect.sourceUseId)?.calendarAlchemyImbibing;
  check(use?.elixirName?.toLowerCase()+'-weariness'===effect.kind&&effect.amount===use.asBefore*5,'nedoložený zdroj Weariness.');
  out.state.fatigue.weariness+=effect.amount;
  const receipt={campaignId,minute,useId:effect.sourceUseId,elixirName:use.elixirName,actorId:actor.id,
   phase:'interaction',triggerId,weariness:effect.amount,active:false};
  rows.push(receiptRow(actor,out,receipt,triggerId+':extended:'+effect.sourceUseId));
 }
 const ids=new Set([...effects.filter(x=>x.kind==='mindsalve-weakness').map(x=>x.sourceUseId),...targets.map(x=>x.sourceUseId)]);
 for(const useId of ids){
  const last=latest(journal,campaignId,useId);
  if(!last||!['Mindsalve','Poison'].includes(last.elixirName))continue;
  const effect=effects.find(x=>x.sourceUseId===useId&&x.kind==='mindsalve-weakness');
  const reduction=targets.find(x=>x.sourceUseId===useId);
  check(last.active&&(!reduction||reduction.asBefore===last.asAfter),'souběh neodpovídá aktivní dávce.');
  const receipt={...structuredClone(last),phase:'interaction',triggerId,minute,asBefore:last.asAfter,
   asAfter:reduction?.asAfter??last.asAfter,weakness:last.weakness+(effect?.amount??0),rolls:[]};
  if(last.elixirName==='Mindsalve')carryMindCases(actor,last,receipt);
  out.state.fatigue.otherWeakness+=effect?.amount??0;
  if(!receipt.asAfter){
   receipt.active=false;receipt.nextMinute=null;
   if(last.elixirName==='Poison')out.state=endAlchemicalPoison({actor,state:out.state,sourceId:'alchemy:'+useId,
    round:Math.max(1,out.state.lastRound),eventId:triggerId+':poison-dispelled:'+useId});
  }
  rows.push(receiptRow(actor,out,receipt,triggerId+':extended:'+useId));
 }
 return {...out,rows};
}

export function settleExtendedAlchemy({actor,clock,journal,campaignId}){
 let out=null;
 const rows=[];
 const lingering=journal.flatMap(row=>{
  const use=row.calendarAlchemyImbibing;
  if(row.calendarCampaignId!==campaignId||use?.elixirName!=='Mindsalve'||use.targetId!==actor.id)return [];
  const last=latest(journal,campaignId,row.id);
  return !last?.active&&last?.weakness>0&&last.cases?.length?[last]:[];
 });
 for(const last of [...pendingExtendedAlchemy(actor,clock,journal,campaignId),...lingering]){
  const {course,...prior}=last;
  const expired=last.elixirName==='Poison'?!livingCourse(course):
   (!last.active||clock.minute<=last.nextMinute)&&!mindsalveRollPlan(actor,last).length;
  if(!expired)continue;
  out??=snapshot(actor);
  const receipt={...structuredClone(prior),phase:'end',minute:clock.minute,
   asBefore:last.asAfter,active:false,nextMinute:null,rolls:[]};
  if(last.elixirName==='Mindsalve')releaseMindWeakness(out.state,receipt);
  rows.push(receiptRow(actor,out,receipt,last.useId+':extended:end'));
 }
 return {...out,rows};
}

export function requireExtendedAlchemyTime({actors,clock,journal,campaignId,afterMinute}){
 const pending=actors.flatMap(actor=>pendingExtendedAlchemy(actor,clock,journal,campaignId))
  .find(item=>item.elixirName==='Poison'?livingCourse(item.course):
   item.nextMinute<afterMinute&&item.active);
 check(!pending,'nejprve vyhodnoťte '+(pending?.elixirName==='Poison'?'zbývající kola Poison.':'denní Mindsalve.'));
}

export function validateExtendedAlchemy(journal,actors,branches,activeCampaign){
 const prior=[];
 const tracked=new Set(['Mindsalve','Poison','Fireshield','Quiescence','Iceshield','Warmth','Soulcloak','Exsiccation','Shadowbreath','Airtap']);
 for(const row of journal){
  const p=row.calendarAlchemyExtendedRecovery;
  if(p){
   const use=prior.find(x=>x.id===p.useId)?.calendarAlchemyImbibing;
   const earlier=latest(prior,p.campaignId,p.useId);
   check(use?.elixirName===p.elixirName&&use.targetId===p.actorId&&use.campaignId===p.campaignId&&
    p.campaignId===row.calendarCampaignId&&p.actorId===row.characterId&&p.minute===row.campaignMinute&&p.healthEventId===row.id&&
    (earlier?earlier.minute<=p.minute&&p.phase!=='start':p.phase==='start'&&p.minute===use.minute&&p.asAfter===use.finalAS),
    'poškozený doklad účinku elixíru.');
   const wearinessElixir=['Fireshield','Iceshield','Warmth','Soulcloak','Shadowbreath','Airtap'].includes(p.elixirName);
   if(earlier&&!wearinessElixir)check((earlier.active||p.phase==='end'&&earlier.weakness>0)&&p.asBefore===earlier.asAfter,'nesouhlasí předchozí stav dávky.');
   if(p.phase==='interaction'){
    const trigger=prior.find(x=>x.id===p.triggerId)?.calendarAlchemyImbibing;
    const effect=trigger?.profusionIllEffects?.find(x=>x.sourceUseId===p.useId);
    const reduction=trigger?.physicEffects?.find(x=>x.sourceUseId===p.useId);
    check(trigger?.targetId===p.actorId&&trigger.minute===p.minute&&
     ((wearinessElixir&&effect?.kind===p.elixirName.toLowerCase()+'-weariness'&&effect.amount===p.weariness)||
      (!wearinessElixir&&(effect||reduction)&&p.asAfter===(reduction?.asAfter??earlier?.asAfter))),
     'poškozený doklad souběhu.');
   }
   if(p.phase==='daily')check(p.minute===earlier.nextMinute&&whole(p.dailyRoll,1,10)&&
    p.asAfter===p.asBefore-1&&p.success===(p.dailyRoll<=p.asBefore),'poškozený denní Mindsalve.');
   if(p.phase==='round')check(p.elapsedRounds===earlier.elapsedRounds+1&&p.elapsedSeconds===p.elapsedRounds*5&&p.asAfter===p.asBefore,'poškozené pořadí Poison.');
   const actor=(p.campaignId===activeCampaign?null:branches?.[p.campaignId]?.[p.actorId])??actors.find(c=>c.id===p.actorId);
   check(actor?.hmk?.healthState?.events?.some(event=>event.id===row.id&&event.type==='alchemy-extended-recovery'&&
    JSON.stringify(event.details)===JSON.stringify(p)),'doklad elixíru nesouhlasí s historií zdraví.');
  }
  prior.push(row);
 }
 const rows=new Map(journal.map(row=>[row.id,row]));
 for(const row of journal){
  const use=row.calendarAlchemyImbibing;
  if(!use)continue;
  if(tracked.has(use.elixirName))check(rows.get(row.id+':extended:start')?.calendarAlchemyExtendedRecovery?.useId===row.id,
   'chybí počáteční doklad účinku elixíru.');
  for(const item of [...(use.profusionIllEffects??[]),...(use.physicEffects??[])]){
   const name=rows.get(item.sourceUseId)?.calendarAlchemyImbibing?.elixirName;
   if(['mindsalve-weakness','fireshield-weariness','iceshield-weariness','warmth-weariness','soulcloak-weariness','shadowbreath-weariness','airtap-weariness'].includes(item.kind)||['Mindsalve','Poison'].includes(name))
    check(rows.get(row.id+':extended:'+item.sourceUseId)?.calendarAlchemyExtendedRecovery?.triggerId===row.id,
     'chybí samostatný doklad souběhu elixíru.');
  }
 }
}
export function assertExtendedAlchemyAppendOnly(before,after){
 const rows=new Map(after.map(row=>[row.id,row]));
 for(const row of before)if(row.calendarAlchemyExtendedRecovery)
  check(JSON.stringify(row)===JSON.stringify(rows.get(row.id)),'doklad účinku nelze změnit ani odstranit.');
}
