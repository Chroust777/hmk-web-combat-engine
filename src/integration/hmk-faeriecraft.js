import {missingPrintedArmourCatalogEntries} from './armour-article-catalog.js';
import {FLETCHING_ITEMS} from './hmk-fletching-work.js?v=94.009';
import {resolveSkillTest,testSecondaryRoll} from './hmk-skill-test-engine.js';

export const FAERIE_SPAN=5*1440;
export const FAERIE_TOTAL=20*60;
const BLOCK=4*60;
export const FAERIE_CRAFTS=Object.freeze({
 Jewelcraft:'singular',Textilecraft:'singular',Woodworking:'singular',Masonry:'singular',
 Glassworking:'singular',Ceramics:'singular',Hideworking:'singular',Metalcraft:'singular',
 Fletching:'hartbow',Weaponcraft:'longknife'
});
const productKind=plan=>plan.skill==='Weaponcraft'&&plan.armour?'metal-armour':FAERIE_CRAFTS[plan.skill];
export const isFaerieCrafter=person=>['Sinái','Sidhé','Hwæthârwyn','Ælrhin'].includes(person?.hmk?.folk);
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const require=(ok,message)=>{if(!ok)throw Error(message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export const FAERIE_ARMOUR_ARTICLES=Object.freeze(missingPrintedArmourCatalogEntries().filter(item=>
 ['mail','scale','plate'].includes(item.properties.material)&&item.properties.coverageVerified));
const armourById=new Map(FAERIE_ARMOUR_ARTICLES.map(item=>[item.id,item]));
export function faerieArmourItem(plan,result,projectId,actorId){
 const source=armourById.get(plan?.armourArticleId);
 if(!source||!Number.isSafeInteger(result?.craft?.sv)||result.craft.sv<3)return null;
 const snapshot=structuredClone(source);
 if(result.trait?.kind==='metal-armour'){
  snapshot.properties.faeriecraft='metal-armour';
  snapshot.properties.weightLb=result.trait.weightLb;
 }
 return {id:'workshop-faerie:'+projectId,characterId:actorId,sourceItemId:source.id,snapshot,
  workshopCraftId:projectId,quantity:1,currentWQ:null,
  condition:result.trait?.kind==='metal-armour'?'Faeriecraft · −5 ENC':'',slot:'carried'};
}

export function faerieWorkshopKind(project){
 const recipe=FLETCHING_ITEMS[project?.scope];
 if(project?.kind==='fletching'&&recipe?.bow)return 'hartbow';
 if(project?.kind==='weaponcraft'&&recipe?.name==='Longknife')return 'longknife';
 return null;
}
export function faerieWorkshopState(journal,workshopId){
 const start=journal.find(row=>row.calendarFaeriecraft?.stage==='start'&&row.calendarFaeriecraft.input.workshopId===workshopId);
 return start?faerieState(journal,start.id):null;
}
export function faerieWorkshopPlan(row){
 const project=row.calendarSkillProjectStart591,recipe=FLETCHING_ITEMS[project.scope],hartbow=faerieWorkshopKind(project)==='hartbow';
 return {workshopId:row.id,item:project.projectName,skill:hartbow?'Fletching':'Weaponcraft',
  durationMinutes:project.baseDueMinute-project.startMinute,
  ...(hartbow?{bow:project.scope.includes(':compositeBow:')?'composite':'longbow',baseDraw:recipe.draw}:{})};
}
export function faerieWorkshopItem(catalog,allocation,spirit,startId,actorId){
 const snapshot=structuredClone(catalog),p=snapshot.properties;
 const isBow=p.missileType==='bow'||Number.isFinite(p.draw);
 if(isBow){
  p.quality=Math.max(0,p.quality+allocation.qualityDelta);
  p.baseRangeFt=Math.max(0,p.baseRangeFt+allocation.rangeDeltaFt);
  if(spirit?.success){
   p.draw/=2;
   snapshot.name='Hartbow · '+catalog.name.replace(/Draw [0-9.]+/,'Draw '+p.draw);
  }
 }else{
  p.quality=Math.max(0,allocation.finalWQ);
  for(const mode of [...p.verifiedModes,...(p.alternateStrikeModes||[])]){
   if(Number.isFinite(allocation.impactDelta)&&Number.isFinite(mode.impactModifier))mode.impactModifier+=allocation.impactDelta;
  }
  p.verifiedModes[0].traits={...p.verifiedModes[0].traits,block:p.blockModifier??0,melee:spirit?.success?5:0};
 }
 if(spirit?.success)p.faeriecraft=isBow?'hartbow':'longknife';
 return {id:'workshop-faerie:'+startId,characterId:actorId,sourceItemId:catalog.id,snapshot,
  workshopCraftId:startId,quantity:1,currentWQ:p.quality,condition:spirit?.success?(isBow?'Faeriecraft · Draw '+p.draw:'Faeriecraft · +5 Melee'):'',slot:'carried'};
}

export function faerieState(journal,projectId){
 let project,entry,minutes=0,done,expired;
 for(const row of journal){
  const step=row.calendarFaeriecraft;
  if(!step||step.projectId!==projectId)continue;
  if(step.stage==='start'){project=row;entry=row;}
  if(step.stage==='enter')entry=row;
  if(step.stage==='leave'||step.stage==='interrupt'||step.stage==='disturbance'&&!step.result.maintained){
   minutes+=step.result.credited;entry=null;
  }
  if(step.stage==='finish'||step.stage==='workshop')done=row;
  if(step.stage==='expire')expired=row;
 }
 if(!project)return null;
 const deadline=project.campaignMinute+FAERIE_SPAN;
 const blockDue=entry?entry.campaignMinute+Math.max(BLOCK,FAERIE_TOTAL-minutes):null;
 return {project,entry,minutes,done,expired,deadline,blockDue,
  readyMinute:minutes>=FAERIE_TOTAL?project.campaignMinute: blockDue!==null&&blockDue<=deadline?blockDue:null};
}

export function faerieNext(state,now){
 if(state.done||state.expired)return null;
 const plan=state.project.calendarFaeriecraft.input;
 const craftDue=state.project.campaignMinute+plan.durationMinutes;
 if(plan.workshopId&&(state.minutes>=FAERIE_TOTAL||state.readyMinute!==null&&now>=state.readyMinute))return null;
 if(state.minutes>=FAERIE_TOTAL)return {stage:'finish',minute:craftDue};
 if(state.readyMinute!==null&&now>=state.readyMinute)
  return {stage:'finish',minute:Math.max(craftDue,state.readyMinute)};
 if(now>=state.deadline||!state.entry&&now+BLOCK>state.deadline)return {stage:'expire',minute:state.deadline};
 return {stage:state.entry?'leave':'enter',minute:state.entry?Math.min(state.readyMinute??state.deadline,state.deadline):now};
}

function spiritEntry(input){
 require(typeof input.location==='string'&&input.location.trim().length>=2&&input.location.length<=120&&
  integer(input.consecration,0,5),'Uveďte skutečné klidné místo a případné hvězdy posvěcení Siemist.');
 require(input.consecration?integer(input.sacredRoll,1,10):input.sacredRoll===null,'Na posvěcené půdě potvrďte samostatný d10.');
 const sacredSuccess=input.consecration>0&&input.sacredRoll<=input.consecration;
 const spirit=resolveSkillTest({ml:input.spiritML,roll:input.spiritRoll,gmModifier:input.modifier,svExtra:sacredSuccess?1:0});
 return {spirit,sacredSuccess,awarenessAndVeil:spirit.sv<=2?-20:Math.min(5,Math.max(0,spirit.sv-4))*5,
  spiritWorldActions:Math.max(0,Math.min(5,spirit.sv-4)-3)*5,astralRounds:Math.max(0,Math.min(5,spirit.sv-4)-3)};
}
function closeBlock(state,now){
 const elapsed=Math.max(0,Math.min(now,state.deadline)-state.entry.campaignMinute);
 return elapsed<BLOCK?0:elapsed;
}
function craftResult(plan,input){
 const craft=resolveSkillTest({ml:input.craftML,roll:input.craftRoll,gmModifier:input.modifier,secondaryMLs:input.secondaryMLs});
 const spirit=testSecondaryRoll({ml:input.spiritML,roll:input.spiritDie});
 const kind=productKind(plan);
 const increasesSv=kind==='singular'&&spirit.success;
 const sv=craft.sv+(increasesSv?1:0);
 let trait=null;
 if(spirit.success&&craft.sv>0){
  if(kind==='hartbow')trait={kind,draw:plan.baseDraw/2};
  if(kind==='longknife')trait={kind,meleeModifier:5};
  if(kind==='metal-armour')trait={kind,encAdjustment:-5,weightLb:plan.baseWeight/2};
 }
 return {craft,spirit,sv,stars:Math.min(increasesSv?6:5,Math.max(0,sv-4)),trait};
}

export function resolveFaerieStep(journal,row){
 const {calendarFaeriecraft:step,campaignMinute:now,characterId,calendarCampaignId}=row;
 const {stage,projectId,input}=step;
 require(integer(now,0,1000000000)&&!!characterId&&!!calendarCampaignId&&!!projectId,'Faeriecraft vyžaduje postavu a přesný čas kampaně.');
 if(stage==='start'){
  require(projectId===row.id&&!journal.some(x=>x.id===projectId)&&Object.hasOwn(FAERIE_CRAFTS,input.skill)&&
   typeof input.item==='string'&&input.item.trim().length>=2&&input.item.length<=120&&
   integer(input.durationMinutes,1,10000000),'Vyberte dovednost, jeden konkrétní výrobek a doloženou dobu práce.');
  require(!journal.some(x=>x.characterId===characterId&&x.calendarCampaignId===calendarCampaignId&&
   x.calendarFaeriecraft?.stage==='start'&&faerieNext(faerieState(journal,x.id),now)),
   'Nejprve uzavřete rozpracované Faeriecraft.');
  if(input.workshopId){
   const work=journal.find(x=>x.id===input.workshopId);
   require(work?.calendarSkillProjectStart591?.faerieLinked===true&&faerieWorkshopKind(work.calendarSkillProjectStart591)&&
    work.characterId===characterId&&work.calendarCampaignId===calendarCampaignId&&work.campaignMinute===now&&
    Object.entries(faerieWorkshopPlan(work)).every(([key,v])=>input[key]===v)&&!faerieWorkshopState(journal,work.id),
    'Reverie musí začít s původní zakázkou stejného výrobce ve stejné minutě.');
  }
  const kind=productKind(input);
  if(kind==='hartbow')require(['composite','longbow'].includes(input.bow)&&integer(input.baseDraw,1,500),'Hartbow vyžaduje kompozitní luk nebo longbow a jeho základní Draw.');
  if(kind==='metal-armour')require(['mail','scale','plate'].includes(input.armour)&&Number.isFinite(input.baseWeight)&&input.baseWeight>0,'Vyberte kovovou zbroj a zadejte její základní hmotnost.');
  if(input.armourArticleId!==undefined){
   const selected=armourById.get(input.armourArticleId);
   require(kind==='metal-armour'&&selected?.properties.material===input.armour&&
    selected.properties.weightLb===input.baseWeight,'Výrobek musí odpovídat tištěnému kusu zbroje HMK 118.');
  }
  return spiritEntry(input);
 }
 const state=faerieState(journal,projectId);
 require(state&&state.project.characterId===characterId&&state.project.calendarCampaignId===calendarCampaignId&&
  !state.done&&!state.expired&&now>=Math.max(...journal.filter(x=>x.calendarFaeriecraft?.projectId===projectId).map(x=>x.campaignMinute)),
 'Faeriecraft patří jiné postavě či kampani, nebo už byl uzavřen.');
 if(stage==='enter'){
  require(!state.entry&&state.minutes<FAERIE_TOTAL&&now+BLOCK<=state.deadline,'Do konce pětidenní lhůty musí zbývat alespoň čtyři hodiny.');
  return spiritEntry(input);
 }
 if(stage==='leave'||stage==='interrupt'||stage==='disturbance'){
  require(state.entry&&now<=state.deadline,'Vyberte probíhající úsek reverie.');
  const will=stage==='disturbance'?resolveSkillTest({ml:input.willML,roll:input.willRoll,gmModifier:input.modifier}):null;
  const maintained=!!will&&will.sl>=2;
  return {maintained,credited:maintained?0:closeBlock(state,now),will};
 }
 if(stage==='expire'){
  require(now>=state.deadline&&(state.readyMinute===null||state.readyMinute>state.deadline),'Pětidenní lhůta ještě běží nebo reverie byla dokončena.');
  return {credited:state.minutes+(state.entry?closeBlock(state,now):0)};
 }
 const plan=state.project.calendarFaeriecraft.input;
 if(stage==='workshop'){
  const allocation=journal.find(x=>x.id===input.allocationId),proof=allocation?.calendarSkillFletchingAllocation996;
  require(plan.workshopId&&proof?.startId===plan.workshopId&&allocation.campaignMinute<=now&&proof.outcome.dueMinute<=now&&
   state.readyMinute!==null&&now>=state.readyMinute,'Nejprve dokončete reverie i skutečnou dílenskou zakázku.');
  require(integer(input.spiritML,0,1000)&&(input.spiritML===0?input.spiritDie===null:integer(input.spiritDie,1,10)),'Potvrďte skutečný Spirit d10.');
  return {spirit:testSecondaryRoll({ml:input.spiritML,roll:input.spiritDie})};
 }
 require(!plan.workshopId&&stage==='finish'&&state.readyMinute!==null&&now>=state.readyMinute&&
  now>=state.project.campaignMinute+state.project.calendarFaeriecraft.input.durationMinutes,
 'Nejprve doložte 20 hodin reverie a dokončete dobu výroby.');
 return craftResult(state.project.calendarFaeriecraft.input,input);
}

export function validateFaeriecraft(journal){
 const prior=[],ids=new Set();
 for(const row of journal){
  if(!row.calendarFaeriecraft){
   if(row.calendarSkillProjectStart591||row.calendarSkillFletchingAllocation996)prior.push(row);
   continue;
  }
  require(typeof row.id==='string'&&row.id&&!ids.has(row.id)&&
   same(resolveFaerieStep(prior,row),row.calendarFaeriecraft.result),'Faeriecraft: hody, návaznost nebo čas nesouhlasí s dokladem.');
  if(row.calendarFaeriecraft.stage==='finish'){
   const project=prior.find(x=>x.id===row.calendarFaeriecraft.projectId);
   if(project?.calendarFaeriecraft?.input.armourArticleId){
    const item=faerieArmourItem(project.calendarFaeriecraft.input,row.calendarFaeriecraft.result,project.id,row.characterId);
    require(row.calendarFaeriecraft.inventoryId===(item?.id??null),'Faeriecraft: doklad musí označit právě jeden hotový kus zbroje.');
   }
  }
  prior.push(row);ids.add(row.id);
 }
}
export function assertFaerieAppendOnly(before,after){
 const next=new Map(after.filter(row=>row.calendarFaeriecraft).map(row=>[row.id,row]));
 for(const old of before)if(old.calendarFaeriecraft)require(same(old,next.get(old.id)),'Doložený průběh Faeriecraft nelze přepsat.');
}
