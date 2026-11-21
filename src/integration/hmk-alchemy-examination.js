/** HMK 266–267: examination of a concrete sample. Each task records its own
 * mastery threshold for retries and exposes only the information earned. */
import {effectiveMasteryLevel,secondaryModifier,SL,successLevel,successValue} from '../rules/tests.js';
import {CANONICAL_ALCHEMY_ELIXIRS} from './hmk-alchemy-preparation.js';
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';

const FORMAT='hmk-alchemy-examination-v1';
const fields=['calendarAlchemyExaminationStart','calendarAlchemyExamination'];
const check=(condition,message)=>{if(!condition)throw Error(message);};
const whole=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const text=v=>typeof v==='string'&&v.length>0;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const getRows=(journal,campaignId)=>journal.filter(row=>row.calendarCampaignId===campaignId);
const sameTarget=(a,b)=>a.kind===b.kind&&a.id===b.id;

export function pendingAlchemyExaminations(journal,campaignId,actorId){
 const rows=getRows(journal,campaignId);
 const resolved=new Set(rows.map(row=>row.calendarAlchemyExamination?.startId).filter(Boolean));
 return rows.filter(row=>row.characterId===actorId&&row.calendarAlchemyExaminationStart&&!resolved.has(row.id));
}

function origin({journal,campaignId,actorId,minute,target}){
 check(text(campaignId)&&text(actorId)&&whole(minute,0,1e9)&&text(target?.id)&&
  ['vial','sample'].includes(target.kind),'Vyberte skutečný vzorek v aktivní kampani.');
 return getRows(journal,campaignId);
}
function requireRetry(rows,actorId,target,task,alchemyML){
 check(!rows.some(row=>{
  const p=row.calendarAlchemyExamination;
  return row.characterId===actorId&&p?.task===task&&sameTarget(p.target,target)&&alchemyML<=p.alchemyML;
 }),'Stejný vzorek lze touto metodou znovu zkoumat až po zvýšení Alchemy ML.');
}

export function startAlchemyIdentification({journal=[],campaignId,actorId,minute,target,alchemyML,workshopConfirmed}){
 const rows=origin({journal,campaignId,actorId,minute,target});
 check(whole(alchemyML,20,1000)&&workshopConfirmed===true,
  'Identify vyžaduje Alchemy ML 20+ a přístup do alchymistické dílny.');
 requireRetry(rows,actorId,target,'identify',alchemyML);
 check(rows.some(row=>row.characterId===actorId&&row.calendarAlchemyExamination?.task==='recognise'&&
  sameTarget(row.calendarAlchemyExamination.target,target)),'Před Identify proveďte Recognise stejného vzorku.');
 check(!pendingAlchemyExaminations(rows,campaignId,actorId).length,'Nejprve dokončete nebo ukončete rozpracované Identify.');
 check(minute<=1e9-60,'Termín Identify je mimo kalendář.');
 return {format:FORMAT,campaignId,actorId,minute,target,alchemyML,workshopConfirmed:true,dueMinute:minute+60};
}

function alchemyExaminationTruth({journal,campaignId,minute,target,classification}){
 if(target.kind==='sample'){
  check(['mundane','exotic'].includes(classification),'GM určí skutečný typ směsi, běžná nebo exotická.');
  return {classification};
 }
 const finish=getRows(journal,campaignId).find(row=>row.id===target.id)?.calendarAlchemyFinish;
 check(finish?.result==='completed','Chybí původní vyrobený elixír.');
 const vial=alchemyVialState(journal,campaignId,target.id,minute);
 const strength=alchemyElixirStrength(journal,campaignId,target.id,minute);
 check(vial?.full&&strength.currentAS>0&&strength.nextDueMinute>minute,'Vyžaduje dostupný elixír s vyhodnocenými hody Decay.');
 const unique=finish.uniqueElixir;
 const canonical=CANONICAL_ALCHEMY_ELIXIRS.find(x=>x.name===finish.elixirName||unique?.principle===x.principle);
 check(canonical,'Chybí doložený princip elixíru.');
 return {classification:'esoteric',unique:!!unique,convocation:canonical.convocation,
  principle:unique?.principle??canonical.principle,effect:unique?.effect??canonical.name,as:strength.currentAS};
}

export function resolveAlchemyExamination({journal=[],campaignId,actorId,minute,target,startId=null,
 task,alchemyML,perceptionML=null,fatigue,assistants=[],d100,origin:rollOrigin,classification}){
 const rows=origin({journal,campaignId,actorId,minute,target});
 check(['recognise','identify','cancel'].includes(task),'Neznámý alchymistický postup.');
 if(task!=='recognise'){
  const start=pendingAlchemyExaminations(rows,campaignId,actorId).find(row=>row.id===startId)?.calendarAlchemyExaminationStart;
  check(start&&sameTarget(start.target,target)&&minute>=start.minute,'Chybí původní rozpracované Identify stejného vzorku.');
  if(task==='cancel')return {format:FORMAT,campaignId,actorId,minute,target,task,startId};
  check(minute>=start.dueMinute,'Identify vyžaduje nejméně hodinu práce v dílně.');
 }else check(startId===null,'Recognise nepatří k rozpracovanému Identify.');
 check(whole(alchemyML,task==='identify'?20:10,1000)&&whole(fatigue,0,1e6)&&whole(d100,1,100)&&
  ['manual','cryptographic-software-die'].includes(rollOrigin),'Chybí doložená způsobilost, únava nebo d100.');
 requireRetry(rows,actorId,target,task,alchemyML);
 const truth=alchemyExaminationTruth({journal:rows,campaignId,minute,target,classification});
 const classInfo=truth.classification;
 if(target.kind==='sample')
  check(!rows.some(row=>{const p=row.calendarAlchemyExamination;
   return p?.classification&&sameTarget(p.target,target)&&p.classification!==classInfo;
  }),'Typ vzorku se liší od dříve doloženého původu.');
 let assisted=0;
 let use='Alchemy';
 let rawEML=alchemyML-fatigue;
 if(task==='recognise'){
  check(whole(perceptionML,5,500)&&assistants.length===0,'Recognise vyžaduje Perception a probíhá bez asistence.');
  const secondaryEML=perceptionML+secondaryModifier(alchemyML)-fatigue;
  if(secondaryEML>rawEML){rawEML=secondaryEML;use='Perception (Alchemy)';}
 }else{
  check(perceptionML===null&&Array.isArray(assistants)&&assistants.length<=2&&
   new Set(assistants.map(x=>x.actorId)).size===assistants.length&&
   assistants.every(x=>text(x.actorId)&&x.actorId!==actorId&&whole(x.ml,40,1000)&&x.ml*2>=alchemyML),
   'Identify dovoluje nejvýše dva pomocníky, každý s ML 40+ a alespoň polovinou ML alchymisty.');
  assisted=assistants.reduce((total,x)=>total+Math.floor(x.ml/10),0);
  rawEML+=assisted;
 }
 const level=successLevel(d100,rawEML);
 const sl=Object.keys(SL).find(name=>SL[name]===level);
 const sv=task==='identify'?successValue({ml:alchemyML,sl:level}):null;
 const revealed={};
 if(task==='recognise'){
  if(level===SL.F)revealed.mundane=classInfo==='mundane';
  if(level>=SL.S)revealed.classification=classInfo;
  if(level===SL.CS&&classInfo==='esoteric')revealed.convocation=truth.convocation;
 }else if(sv>0){
  revealed.classification=classInfo;
  if(classInfo==='esoteric'&&sv>=2){
   Object.assign(revealed,{convocation:truth.convocation,unique:truth.unique});
   if(sv>=(truth.unique?5:3))Object.assign(revealed,{principle:truth.principle,effect:truth.effect});
   if(sv>=(truth.unique?6:4))revealed.as=truth.as;
  }
 }
 return {format:FORMAT,campaignId,actorId,minute,target,task,startId,alchemyML,perceptionML,fatigue,assistants,
  assisted,d100,origin:rollOrigin,use,eml:effectiveMasteryLevel(rawEML),sl,sv,
  classification:target.kind==='sample'?classInfo:null,revealed};
}

export function validateAlchemyExaminations(journal){
 const prior=[];
 for(const row of journal){
  const [start,result]=fields.map(field=>row[field]);
  if(start||result){
   const proof=start??result;
   check(!(start&&result)&&row.characterId===proof.actorId&&row.calendarCampaignId===proof.campaignId&&
    row.campaignMinute===proof.minute,'Alchymistický průzkum nemá platný původ.');
   const expected=(start?startAlchemyIdentification:resolveAlchemyExamination)({...proof,journal:prior});
   check(equal(expected,proof),'Záznam Recognise / Identify neodpovídá původnímu hodu a vzorku.');
  }
  prior.push(row);
 }
}
export function assertAlchemyExaminationsAppendOnly(before,after){
 const next=new Map(after.map(row=>[row.id,row]));
 for(const row of before)if(fields.some(field=>row[field]))
  check(equal(row,next.get(row.id)),'Potvrzené Recognise / Identify nelze přepsat ani odstranit.');
}
