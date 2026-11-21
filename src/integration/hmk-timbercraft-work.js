import {effectiveMasteryLevel, SL, successLevel, successValue} from '../rules/tests.js';

export const TIMBER_SPECIES=Object.freeze({
 Ash:[18,5,9,40], Birch:[3,2,7,15], Cherry:[1,1,6,80], 'Elm (hard)':[6,3,8,35], Maple:[7,3,9,45], Oak:[20,5,7,60],
 Cedar:[3,2,2,25], 'Elm (soft)':[20,5,5,30], Fir:[15,4,2,40], Larch:[8,3,4,20], Pine:[3,2,3,25], Spruce:[19,4,2,20]
});

export const TIMBER_PHASES=Object.freeze({felling:'Kácení',limbing:'Odvětvování',bucking:'Řezání na klády'});
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};
const whole=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const die=(value,faces)=>whole(value,1,faces);
const originOK=origin=>origin==='manual'||origin==='cryptographic-software-die';
const format='hmk-timbercraft-work-v1';
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

export function timberTree(species,diameter=null){
 requireValue(Object.hasOwn(TIMBER_SPECIES,species),'Vyberte doložený druh stromu (HMK str. 87).');
 const [vol,typicalDiameter,hardness,value]=TIMBER_SPECIES[species];
 const actual=diameter??typicalDiameter;
 requireValue(Number.isFinite(actual)&&actual>0&&actual<=100,'Průměr kmene musí být kladná hodnota ve stopách, nejvýše 100.');
 return {species,diameter:actual,typicalDiameter,hardness,referenceVol:vol,wholesalePerVol:value,retailPerVol:value*3};
}

export function startTimberWork({campaignId,actorId,minute,species,diameter=null,label,condition='standing'}){
 requireValue(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
  whole(minute,0,1e9)&&typeof label==='string'&&label.trim()&&label.trim().length<=100&&
  ['standing','felled','limbed'].includes(condition),'Zadejte strom a stav kmene v aktivní kampani.');
 return {format,stage:'start',campaignId,actorId,minute,label:label.trim(),tree:timberTree(species,diameter),condition};
}

export function timberWork(journal,campaignId,startId){
 const start=journal.find(row=>row.calendarCampaignId===campaignId&&row.id===startId)?.calendarTimbercraft;
 if(start?.stage!=='start')return null;
 const completed=new Set(start.condition==='limbed'?['felling','limbing']:start.condition==='felled'?['felling']:[]);
 let pending=null,closed=false;
 const totals={felling:0,limbing:0,bucking:0};
 for(const row of journal){
  const proof=row.calendarTimbercraft;
  if(row.calendarCampaignId!==campaignId||proof?.startId!==startId)continue;
  if(proof.stage==='plan')pending={id:row.id,...proof};
  if(proof.stage==='round'){
   pending=null;totals[proof.phase]=proof.total;
   if(proof.complete)completed.add(proof.phase);
  }
  if(proof.stage==='cancel'){pending=null;closed=true;}
 }
 return {start,pending,closed:closed||completed.size===3,completed,totals};
}

export function planTimberRound({journal,campaignId,actorId,startId,minute,phase,workers,limit}){
 const state=timberWork(journal,campaignId,startId);
 requireValue(state&&!state.closed&&!state.pending&&state.start.actorId===actorId&&whole(minute,state.start.minute,1e9-10)&&
  Object.hasOwn(TIMBER_PHASES,phase)&&!state.completed.has(phase)&&
  (phase==='felling'||state.completed.has('felling')),'Tuto fázi teď nelze zahájit.');
 const latest=journal.filter(row=>row.calendarCampaignId===campaignId&&row.calendarTimbercraft?.startId===startId).at(-1);
 requireValue(!latest||minute>=latest.campaignMinute,'Další interval nemůže začít před potvrzeným krokem.');
 const capacity=phase==='felling'?2:limit;
 requireValue(whole(capacity,2,6)&&Array.isArray(workers)&&workers.length>=1&&workers.length<=capacity&&
  workers.every(id=>typeof id==='string'&&id)&&new Set(workers).size===workers.length,'Zvolte přípustný počet různých pracovníků.');
 const busy=new Set(journal.filter(row=>row.calendarCampaignId===campaignId&&row.calendarTimbercraft?.stage==='start')
  .flatMap(row=>timberWork(journal,campaignId,row.id)?.pending?.workers??[]));
 requireValue(workers.every(id=>!busy.has(id)),'Některý pracovník už má otevřený interval Timbercraft.');
 return {format,stage:'plan',campaignId,actorId,startId,minute,phase,workers:[...workers],limit:capacity,dueMinute:minute+10};
}

export function resolveTimberRound({journal,campaignId,actorId,startId,minute,rolls}){
 const state=timberWork(journal,campaignId,startId),plan=state?.pending;
 requireValue(plan&&plan.actorId===actorId&&whole(minute,plan.dueMinute,1e9)&&Array.isArray(rolls)&&
  rolls.length===plan.workers.length,'Nejdřív musí uplynout 10 minut a všichni pracovníci potřebují vlastní hod.');
 const felling=plan.phase==='felling';
 const results=rolls.map((row,index)=>{
  const {workerId,timberML,strength,penalty,d100,origin,endurance,enduranceDie,enduranceOrigin,pf}=row;
  requireValue(workerId===plan.workers[index]&&whole(timberML,0,1000)&&whole(strength,1,100)&&
   whole(penalty,0,300000)&&die(d100,100)&&originOK(origin),'Chybí platný hod, statistika nebo pořadí pracovníka.');
  if(felling)requireValue(whole(endurance,1,100)&&die(enduranceDie,10)&&originOK(enduranceOrigin)&&
   whole(pf,5,1000)&&pf%5===0,'Kácení vyžaduje samostatný Endurance SR a doloženou osobní únavu v násobcích pěti.');
  const ml=timberML||strength*5;
  const eml=effectiveMasteryLevel(ml-penalty);
  const level=successLevel(d100,eml),raw=successValue({ml,sl:level});
  const sv=timberML?raw:Math.max(1,raw-4);
  const tn=felling?Math.floor(endurance/2):null;
  const weariness=felling?pf-(enduranceDie<=tn?5:0):0;
  return {workerId,timberML,strength,penalty,d100,origin,...(felling?{endurance,enduranceDie,enduranceOrigin,pf}:{}),
   ml,eml,sl:Object.keys(SL).find(name=>SL[name]===level),sv,tn,weariness};
 });
 const total=state.totals[plan.phase]+results.reduce((sum,result)=>sum+result.sv,0);
 const target=state.start.tree.diameter*state.start.tree.hardness*(plan.phase==='bucking'?2:1);
 return {format,stage:'round',campaignId,actorId,startId,minute,planId:plan.id,phase:plan.phase,
  rolls:results,total,target,complete:felling?total>target:total>=target};
}

export function cancelTimberWork({journal,campaignId,actorId,startId,minute}){
 const state=timberWork(journal,campaignId,startId);
 const latest=journal.filter(row=>row.calendarCampaignId===campaignId&&row.calendarTimbercraft?.startId===startId).at(-1);
 requireValue(state&&!state.closed&&state.start.actorId===actorId&&whole(minute,latest?.campaignMinute??state.start.minute,1e9),
  'Tento strom už nelze uzavřít.');
 return {format,stage:'cancel',campaignId,actorId,startId,minute};
}

export function validateTimberWork(journal){
 const prior=[];
 for(const row of journal){
  const proof=row.calendarTimbercraft;
  if(proof){
   const {stage,actorId,minute,campaignId}=proof;
   requireValue(actorId===row.characterId&&minute===row.campaignMinute&&campaignId===row.calendarCampaignId,
    'Neplatný původ záznamu Timbercraft.');
   const stages={start:startTimberWork,plan:planTimberRound,round:resolveTimberRound,cancel:cancelTimberWork};
   requireValue(Object.hasOwn(stages,stage)&&same(stages[stage]({...proof,journal:prior,
    ...(stage==='start'?{species:proof.tree?.species,diameter:proof.tree?.diameter}:{})}),proof),
   'Záznam Timbercraft neodpovídá původním vstupům nebo hodům.');
  }
  prior.push(row);
 }
}

export function assertTimberWorkAppendOnly(before,after){
 const next=new Map(after.map(row=>[row.id,row]));
 for(const row of before){
  if(row.calendarTimbercraft||row.calendarTimberLore){
   requireValue(same(next.get(row.id),row),'Potvrzenou práci Timbercraft nelze změnit ani odstranit.');
  }
 }
}
