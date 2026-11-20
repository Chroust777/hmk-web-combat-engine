import {isWorkshopCraft,workshopCraftItem,WORKSHOP_CRAFT_PROJECTS,fletchingPlan,fletchingDue,fletchingOutcome,validFletchingProof} from './hmk-fletching-work.js?v=94.001';
/** HârnMaster 1.2 pp.70,132: prospective scheduling of actual skill work.
 * Read-only arithmetic/validation. Never invents a roll or a project.
 * Existing unscheduled historical skill tests are unchanged.
 */
import {ENGINEERING_DESIGN_DAYS} from './hmk-engineering-design-548.js';
import {CRAFT_WORK_600,projectTiming600,confirmCraftStart600,brewingPrice995} from './hmk-skill-crafts-600.js?v=93.995';
import {validWritingPlan,writingFixedSubject,writingRollSkills,rewriteBaseline,rewriteAllowed,writingDictationFactor,writingIsText,resolveAuthoredScribing} from './hmk-scribing-work.js?v=94.005';
import {jewelcraftWork994} from './hmk-jewelcraft-work.js?v=93.994';
const assert=(condition,message)=>{if(!condition)throw Error(message)};
export const WRITING_WORK_MINUTES_591=Object.freeze({missive:10,tract:5*1440,treatise:30*1440,disquisition:120*1440});
export const SKILL_TIMED_WORK_FORMAT_591='hmk-skill-timed-work-591-v1';

// HMK 1.2 pp. 73, 91. Printed, non-weapon, individually priced items only.
// The cost is a reference for a prospective work period, NOT an automatic
// acquisition, workshop confirmation, or material expense.
export const TIMED_CRAFT_ITEMS_599=Object.freeze({
 glassworking:Object.freeze({
  beads12:Object.freeze({name:'Beads, 12',priceD:12,weightLb:1}),
  bottle2p:Object.freeze({name:'Bottle, 2 pints',priceD:6,weightLb:2}),
  jar1p:Object.freeze({name:'Jar, 1 pint',priceD:6,weightLb:0.75}),
  flask1p:Object.freeze({name:'Flask, 1 pint',priceD:6,weightLb:1}),
  hourglass:Object.freeze({name:'Hourglass',priceD:150,weightLb:0.3}),
  inkwell:Object.freeze({name:'Inkwell, 2 oz',priceD:30,weightLb:1}),
  lenses:Object.freeze({name:'Lenses',priceD:120,weightLb:0.1}),
  vial4oz:Object.freeze({name:'Vial, 4 oz',priceD:4,weightLb:0.25}),
  clearWindow:Object.freeze({name:'Window, plain, ft²',priceD:2,weightLb:3}),
  stainedWindow:Object.freeze({name:'Window, stained, ft²',priceD:12,weightLb:4})
 }),
 woodworking:Object.freeze({
  barrel10:Object.freeze({name:'Barrel, 10 gal',priceD:12,weightLb:30}),
  barrel50:Object.freeze({name:'Barrel, 50 gal',priceD:36,weightLb:90}),
  bedSingle:Object.freeze({name:'Bed, single',priceD:48,weightLb:85}),
  bench:Object.freeze({name:'Bench',priceD:18,weightLb:22}),
  cup:Object.freeze({name:'Cup',priceD:3,weightLb:1}),
  ladder8:Object.freeze({name:'Ladder, 8 ft',priceD:6,weightLb:19}),
  chair:Object.freeze({name:'Chair',priceD:12,weightLb:7}),
  chest:Object.freeze({name:'Chest, 1×2×2 ft',priceD:18,weightLb:24}),
  table:Object.freeze({name:'Table, 4×2×6 ft',priceD:36,weightLb:47}),
  wheelbarrow:Object.freeze({name:'Wheelbarrow',priceD:10,weightLb:24}),
  decoratedBox:Object.freeze({name:'Box, 12×8×6 in',priceD:2,weightLb:3}),
  bucket3:Object.freeze({name:'Bucket, 3 gal',priceD:8,weightLb:10}),
  cabinet:Object.freeze({name:'Cabinet',priceD:144,weightLb:60}),
  cage27:Object.freeze({name:'Cage, 27 ft³',priceD:15,weightLb:40}),
  cage1:Object.freeze({name:'Cage, 1 ft³',priceD:7,weightLb:4}),
  trunk:Object.freeze({name:'Trunk, 1½×2×3½ ft',priceD:12,weightLb:40}),
  wagon:Object.freeze({name:'Wagon, 4-wheel',priceD:220,weightLb:800}),
  cartSled:Object.freeze({name:'Cart/Sled',priceD:80,weightLb:200}),
  wheel:Object.freeze({name:'Wheel',priceD:18,weightLb:20}),
  oxYoke:Object.freeze({name:'Yoke, Ox',priceD:3,weightLb:2})
 })
});
export const TIMED_CRAFT_LABELS_599=Object.freeze({glassworking:'Glassworking · HMK 73',woodworking:'Woodworking · HMK 91'});

export function timedSkillBaseMinutes591(kind,scope){
 if(CRAFT_WORK_600[kind])return CRAFT_WORK_600[kind][scope]?.hours*60??null;
 if(isWorkshopCraft(kind))return workshopCraftItem(kind,scope)?fletchingPlan(scope,1).workMinutes:null;
 if(kind==='jewelcraft'){const days=Number(scope);return Number.isSafeInteger(days)&&days>=1&&days<=10000?days*1440:null;}
 if(kind==='engineering')return Number.isFinite(ENGINEERING_DESIGN_DAYS[scope])?ENGINEERING_DESIGN_DAYS[scope]*1440:null;
 if(kind==='writing')return WRITING_WORK_MINUTES_591[scope]??null;
 if(kind==='drawing'){
  const area=Number(scope),minutes=Math.ceil(Number((area*240).toPrecision(12)));
  return area>0&&Number.isSafeInteger(minutes)?minutes:null;
 }
 if(kind==='cookery'){const diners=Number(scope);return Number.isSafeInteger(diners)&&diners>0&&Number.isSafeInteger(diners*12)?diners*12:null;}
 if(kind==='glassworking'||kind==='woodworking'){
  const item=TIMED_CRAFT_ITEMS_599[kind]?.[scope];
  if(!item)return null;
  // Glassworking: one 24-hour day per 6d. Woodworking: ten hours per 3d.
  return kind==='glassworking'?item.priceD*240:item.priceD*200;
 }
 return null;
}
export function printedCraftMaterialCost(kind,scope){
 const item=TIMED_CRAFT_ITEMS_599[kind]?.[scope];
 if(!item)return null;
 return kind==='glassworking'?item.priceD*5/12:item.weightLb/30;
}
export function skillTimedEarliest591(kind,baseMinutes){
 // Without optional randomization, up to 3 successful Maths dice AFTER the
 // first two reduce Engineering design time by 30%. Up to 5 SV stars may
 // reduce Writing Routine by 50%. This is only an earliest possible TEST,
 // not permission to claim the project is completed.
 return Math.ceil(baseMinutes*(kind==='engineering'?0.7:kind==='writing'?0.5:1));
}
/** Derive the active attempt from the original project and confirmed rolls. */
export function writingProjectState(journal,start){
 const project=start?.calendarSkillProjectStart591;
 if(project?.kind!=='writing')return null;
 const rows=journal.filter(row=>row.calendarCampaignId===start.calendarCampaignId&&row.characterId===start.characterId);
 let state={phase:'initial',readyMinute:project.earliestMinute,startMinute:project.startMinute,baseMinutes:project.baseMinutes*writingDictationFactor(project.writingPlan)};
 for(const row of rows){
  const link=row.calendarSkillProjectSV591;
  if(link?.startId!==start.id||link.kind!=='writing')continue;
  if(!['initial','retry'].includes(state.phase)||row.campaignMinute<state.readyMinute||
   (link.previousAttemptId??null)!==(state.attempt?.id??null))continue;
  const result=row.skillTestProof?.a??row.skillTestProof?.result;
  const follow=result?.level==='CF'?rows.find(next=>next.skillTestProof?.type==='critical-followup'&&
   next.skillTestProof.originId===row.id&&next.skillTestProof.activity==='writing-routine'&&
   next.skillTestProof.writingExtension?.scope===project.scope):null;
  const factor=result?.level==='CF'?follow?.skillTestProof.writingExtension.completionTimeMultiplier:1;
  const attempt={attempt:row,result,factor,startMinute:state.startMinute,baseMinutes:state.baseMinutes};
  if(![1,1.5,2].includes(factor)){state={...attempt,phase:'will'};continue;}
  const dueMinute=writingCompletionMinute(attempt);
  if(project.scope==='missive'||result?.sv>=5){state={...attempt,phase:'finish',dueMinute};continue;}
  const startMinute=Math.max(dueMinute,row.campaignMinute,follow?.campaignMinute??0);
  const baseMinutes=Math.ceil(project.baseMinutes*writingDictationFactor(project.writingPlan)*(result?.sv>=3?0.5:1));
  state={...attempt,phase:'retry',startMinute,baseMinutes,readyMinute:startMinute+baseMinutes};
 }
 if(state.phase==='finish'&&rows.some(row=>row.calendarSkillProjectComplete591?.startId===start.id&&
  row.calendarSkillProjectComplete591.sourceId===state.attempt?.id))return {...state,phase:'complete'};
 return state;
}
export function writingCompletionMinute(state,timeStars=0){
 return state.startMinute+Math.ceil(state.baseMinutes*(1-0.1*timeStars)*state.factor);
}
export function validateSkillTimedWork591(data){
 const starts=new Map(),linked=new Set(),completed=new Set(),journal=data?.journal||[];
 const journalById=new Map(journal.map(j=>[j.id,j]));
 for(const row of journal){
  const p=row.calendarSkillProjectStart591;if(!p)continue;
  const base=timedSkillBaseMinutes591(p.kind,p.scope);
  const plannedBase=base*writingDictationFactor(p.writingPlan);
  assert(p.format===SKILL_TIMED_WORK_FORMAT_591&&base!==null&&
   typeof p.projectName==='string'&&p.projectName.trim().length>=2&&p.projectName.length<=120&&
   p.actorId===row.characterId&&data.characters?.some(c=>c.id===p.actorId)&&
   typeof row.calendarCampaignId==='string'&&row.calendarCampaignId.length>0&&
   Number.isSafeInteger(p.startMinute)&&p.startMinute>=0&&p.startMinute===row.campaignMinute&&
   p.baseMinutes===base&&
   (p.kind!=='jewelcraft'||p.materialSourceConfirmed===true&&Number(p.scope)===p.jewelcraft994?.days&&
    JSON.stringify(jewelcraftWork994(p.jewelcraft994))===JSON.stringify(p.jewelcraft994))&&
   (!p.writingPlan||p.kind==='writing'&&validWritingPlan(p.writingPlan,p.actorId,p.scope))&&
   (isWorkshopCraft(p.kind)?(()=>{
    const f=p.fletching996,plan=fletchingPlan(p.scope,f?.workshop,f?.providerId,f?.hartbow,f?.toolQuality,f?.helperIds);
    return f.providerId!==p.actorId&&(!f.helperIds||f.helperIds.every(id=>id!==p.actorId&&data.characters.some(person=>person.id===id)))&&JSON.stringify(f)===JSON.stringify(plan)&&
     p.earliestMinute===fletchingDue(p.scope,p.startMinute,f,0.7)&&p.baseDueMinute===fletchingDue(p.scope,p.startMinute,f);
   })():CRAFT_WORK_600[p.kind]?(()=>{
    const exactCalendar=p.kind==='ceramics'&&p.craftExact994===true||p.kind==='brewing'&&p.brewing995===true;
    const options={exactCalendar,spiritMonths:p.brewing995===true?p.spiritMonths995:0};
    const t=projectTiming600(p.kind,p.scope,p.startMinute,{agingRolls:p.craftAgingRolls,...options});
    const reference=confirmCraftStart600(p.kind,p.scope,p.startMinute,p.craftAgingRolls,options);
    return t&&p.earliestMinute===t.dueMinute&&p.baseDueMinute===t.dueMinute&&
     p.craftItemName===reference.craftItemName&&p.craftItemCostD===reference.craftItemCostD&&
     p.craftSourcePage===reference.craftSourcePage&&p.craftDayResolution===reference.craftDayResolution&&
     JSON.stringify(p.craftAgingRolls)===JSON.stringify(reference.craftAgingRolls)&&
     p.craftAgingDays===reference.craftAgingDays&&p.craftReadyMinute===reference.craftReadyMinute&&
     p.materialSourceConfirmed===true;})():
    (p.calendarDayEligibility600===true?
     (p.kind==='glassworking'&&base%1440===0&&p.earliestMinute===Math.floor((p.startMinute+base)/1440)*1440&&p.baseDueMinute===p.earliestMinute):
     (p.earliestMinute===p.startMinute+skillTimedEarliest591(p.kind,plannedBase)&&p.baseDueMinute===p.startMinute+plannedBase)))&&
   !starts.has(row.id)&&
   (!TIMED_CRAFT_ITEMS_599[p.kind]||(
     p.craftItemPriceD===TIMED_CRAFT_ITEMS_599[p.kind][p.scope]?.priceD&&
     p.craftItemWeightLb===TIMED_CRAFT_ITEMS_599[p.kind][p.scope]?.weightLb&&
     p.craftItemName===TIMED_CRAFT_ITEMS_599[p.kind][p.scope]?.name&&
     (!Object.hasOwn(p,'printedMaterialCostD')||p.printedMaterialCostD===printedCraftMaterialCost(p.kind,p.scope))&&
     p.materialSourceConfirmed===true)),
   'Časovaný Skill Test: začátek projektu nebo pravidlová doba byly pozměněny.');
  if(p.writingPlan?.rewrite){
   const {sourceId,languageML,subjectML}=p.writingPlan.rewrite,source=journalById.get(sourceId);
   const baseline=rewriteBaseline(journal,source,row.characterId,row.calendarCampaignId);
   assert(baseline&&journal.indexOf(source)<journal.indexOf(row)&&source.campaignMinute<=row.campaignMinute&&
    ![...starts.values()].some(entry=>entry.p.writingPlan?.rewrite?.sourceId===sourceId)&&
    p.scope===baseline.start.scope&&p.writingPlan.language===baseline.start.writingPlan.language&&
    p.writingPlan.purpose===baseline.start.writingPlan.purpose&&rewriteAllowed(baseline,languageML,subjectML),
    'Přepis vyžaduje vlastní dokončený text a doložený nárůst Language nebo předmětu o 10 ML.');
  }
  starts.set(row.id,{row,p});
 }
 for(const [index,row] of journal.entries()){
  const link=row.calendarSkillProjectSV591;if(!link)continue;
  const s=starts.get(link.startId),proof=row.skillTestProof;
  const skill=proof?.skills?.[0]||proof?.skill||'';
  const writing=s?.p.kind==='writing';
  const retry=writing&&linked.has(link.startId)?writingProjectState(journal.slice(0,index),s.row):null;
  const validAttempt=retry?retry.phase==='retry'&&link.previousAttemptId===retry.attempt.id&&row.campaignMinute>=retry.readyMinute:
   !linked.has(link.startId)&&link.previousAttemptId==null;
  assert(s&&validAttempt&&link.kind===s.p.kind&&
   row.characterId===s.p.actorId&&row.calendarCampaignId===s.row.calendarCampaignId&&
   Number.isSafeInteger(row.campaignMinute)&&row.campaignMinute>=s.p.earliestMinute&&
   proof?.type==='secondary-mastery-value-test'&&
   (s.p.kind==='writing'?(s.p.writingPlan?skill===writingRollSkills(s.p.writingPlan).primary&&
    (skill!=='Creativity'||proof.secondaryRollResult?.routineId==='writing-poetics'&&proof.secondaryRollResult?.name==='Folklore'&&Number.isInteger(proof.secondaryRollResult.roll)):/^Language(?:\s|\(|:|$)/.test(skill)||/\(Language\)$/.test(skill)):
    skill===({ ...Object.fromEntries(Object.entries(WORKSHOP_CRAFT_PROJECTS).map(([key,value])=>[key,value.primary])),engineering:'Engineering',drawing:'Drawing',cookery:'Cookery',glassworking:'Glassworking',woodworking:'Woodworking',jewelcraft:'Jewelcraft',brewing:'Brewing',ceramics:'Ceramics',hideworking:'Hideworking',textilecraft:'Textilecraft',metalcraft:'Metalcraft',mineralogy:'Mineralogy'})[s.p.kind])&&
   (!isWorkshopCraft(s.p.kind)||validFletchingProof(s.p,proof))&&
   (!TIMED_CRAFT_ITEMS_599[s.p.kind]||row.campaignMinute>=s.p.baseDueMinute)&&
   (!CRAFT_WORK_600[s.p.kind]||row.campaignMinute>=s.p.earliestMinute),
   'Časovaný Skill Test: původní SV nesouhlasí s časem, postavou ani projektem.');
  linked.add(link.startId);
 }
 for(const row of journal){
  const done=row.calendarSkillProjectComplete591;if(!done)continue;
  const s=starts.get(done.startId),source=journalById.get(done.sourceId),sourceLink=source?.calendarSkillProjectSV591;
  const p=row.skillTestProof;
  assert(s&&source&&sourceLink?.startId===done.startId&&!completed.has(done.startId)&&
   done.kind===s.p.kind&&row.characterId===s.p.actorId&&
   row.calendarCampaignId===s.row.calendarCampaignId&&row.campaignMinute>=done.dueMinute&&
   Number.isSafeInteger(done.dueMinute)&&done.dueMinute>=s.p.startMinute&&
   Number.isSafeInteger(done.workMinutes)&&done.workMinutes>=0&&
   done.dueMinute===s.p.startMinute+done.workMinutes&&
   (done.kind==='engineering'?p?.type==='engineering-design'&&p.originId===done.sourceId:
    p?.type==='writing-work-complete-591'&&p.originId===done.sourceId),
   'Časovaný Skill Test: nesouhlasí dokončení, původní hod ani kalendář.');
  if(done.kind==='engineering'){
   assert(p.edifice===s.p.scope&&!p.randomizeTime&&!p.combinedTimeNeedsGM&&
    done.workMinutes===Math.ceil(p.timeAfterMathOnly*1440),
    'Engineering: dokončený čas neodpovídá skutečným Design Rolls.');
  }else{
   const sourceSV=source.skillTestProof?.a?.sv??source.skillTestProof?.result?.sv;
   const stars=Math.min(5,Math.max(0,sourceSV-4));
   const t=p.timeReductionStars;
   const originalLevel=source.skillTestProof?.a?.level??source.skillTestProof?.result?.level;
   const state=writingProjectState(journal,s.row);
   const insightDice=p.physicalInsightDice,required=writingIsText(s.p)?stars-t:0;
   const rewrite=s.p.writingPlan?.rewrite;
   const fixedSubject=writingFixedSubject(s.p.writingPlan)||(rewrite?journalById.get(rewrite.sourceId)?.skillTestProof?.subjectSkill:null);
   if(p.authorLanguageML!==undefined||p.subjectML!==undefined||rewrite||writingRollSkills(s.p.writingPlan).primary==='Creativity'){
    assert(Number.isSafeInteger(p.authorLanguageML)&&p.authorLanguageML>=1&&p.authorLanguageML<=1000&&
     Number.isSafeInteger(p.subjectML)&&p.subjectML>=0&&p.subjectML<=1000&&Math.floor(p.subjectML/10)===p.subjectIndex&&
     (p.subjectSkill||p.subjectML===0),'Writing: nedoložené ML autora nebo předmětu.');
   }
   const subjectIndex=p.subjectIndex,successful=Array.isArray(insightDice)?insightDice.filter(d=>d<=subjectIndex).length:0;
   const insightLimit={missive:0,tract:1,treatise:3,disquisition:5}[s.p.scope];
   const expectedInsight=Math.min(successful,insightLimit,Math.max(0,subjectIndex-4));
   assert(Number.isSafeInteger(t)&&t>=0&&t<=stars&&
    p.scope===s.p.scope&&p.sourceSV===sourceSV&&p.sourceLevel===originalLevel&&
    Array.isArray(insightDice)&&insightDice.length===required&&insightDice.every(d=>Number.isSafeInteger(d)&&d>=1&&d<=10)&&
    Number.isSafeInteger(subjectIndex)&&subjectIndex>=0&&p.insightStars===expectedInsight&&
    (!fixedSubject||p.subjectSkill===fixedSubject)&&
    (required===0||typeof p.subjectSkill==='string'&&p.subjectSkill.length>0)&&
    state?.phase==='complete'&&state.attempt.id===source.id&&
    done.dueMinute===writingCompletionMinute(state,t),
    'Writing: nedoložené Insight d10, hvězdy, Will následek nebo zkrácení času.');
   const plan=s.p.writingPlan,scribe=p.scribing;
   if(plan){
    assert(scribe?.scribeId===plan.scribeId&&scribe.script===plan.script&&scribe.language===plan.language&&
     typeof scribe.inputs?.forcedCF==='boolean'&&
     (scribe.inputs.forcedCF?scribe.inputs.roll===null&&scribe.rollOrigin==='rule-forced-no-die':
     ['manual','software'].includes(scribe.rollOrigin))&&
     Number.isSafeInteger(scribe.inputs.languageML)&&scribe.inputs.languageML>0&&
     Number.isSafeInteger(scribe.inputs.drawingML)&&scribe.inputs.drawingML>0,
     'Writing: chybí doložený Scribing správného písaře, jazyka a písma.');
    const expected=resolveAuthoredScribing({...scribe.inputs,mode:plan.mode,scope:s.p.scope,intent:plan.intent});
    assert(JSON.stringify(scribe.outcome)===JSON.stringify(expected),'Writing: výsledek Scribing nesouhlasí s doloženým hodem.');
   }
  }
  completed.add(done.startId);
 }
 // Brewing has two separate deadlines: the confirmed quality SV after work,
 // then the calendar DAY of consumption. Neither opens a new SV roll.
 const ready=new Set();
 for(const row of journal){
  const r=row.calendarSkillBrewReady600;if(!r)continue;
  const s=starts.get(r.startId),p=s?.p;
  assert(p?.kind==='brewing'&&!ready.has(r.startId)&&
   row.characterId===p.actorId&&row.calendarCampaignId===s.row.calendarCampaignId&&
   linked.has(r.startId)&&Number.isSafeInteger(row.campaignMinute)&&
   row.campaignMinute>=p.craftReadyMinute&&r.readyMinute===p.craftReadyMinute&&
   r.agingDays===p.craftAgingDays&&r.confirmed===true,
   'Brewing: zralost či čas neodpovídají původním kostkám a kalendáři.');
  if(p.brewing995===true||r.price995){
   const source=journalById.get(r.qualitySourceId);
   const sv=source?.skillTestProof?.a?.sv??source?.skillTestProof?.result?.sv;
   assert(source?.calendarSkillProjectSV591?.startId===r.startId&&source.campaignMinute<=row.campaignMinute&&
    r.price995&&JSON.stringify(r.price995)===JSON.stringify(brewingPrice995(p.scope,sv,r.price995.workshopTN,r.price995.rolls)),
    'Brewing: ocenění neodpovídá původnímu SV, dílně nebo kostkám.');
  }
  ready.add(r.startId);
 }
 const allocations=new Map(),finishedFletching=new Set();
 for(const [index,row] of journal.entries()){
  const draft=row.calendarSkillFletchingAllocation996,done=row.calendarSkillFletching996;
  if(!draft&&!done)continue;
  const startId=(draft||done).startId,start=starts.get(startId);
  assert(isWorkshopCraft(start?.p.kind)&&row.characterId===start.p.actorId&&row.calendarCampaignId===start.row.calendarCampaignId&&
   Number.isSafeInteger(row.campaignMinute),'Fletching: projekt nebo postava nesouhlasí.');
  if(draft){
   const source=journalById.get(draft.sourceId),out=draft.outcome;
   assert(!allocations.has(startId)&&source?.calendarSkillProjectSV591?.startId===startId&&
    journal.indexOf(source)<index&&row.campaignMinute>=source.campaignMinute&&
    JSON.stringify(out)===JSON.stringify(fletchingOutcome(start.p,source.skillTestProof,out?.timeStars,out?.rolls)),
    'Fletching: výsledek neodpovídá původnímu SV, hvězdám nebo potvrzeným kostkám.');
   allocations.set(startId,row);
  }else{
   const original=allocations.get(startId);
   assert(!finishedFletching.has(startId)&&original&&original.id===done.allocationId&&
    row.campaignMinute>=Math.max(original.campaignMinute,original.calendarSkillFletchingAllocation996.outcome.dueMinute),
    'Fletching: dokončení před termínem nebo bez původního výsledku.');
   finishedFletching.add(startId);
  }
 }
 return true;
}
export function assertSkillTimedAppendOnly591(before,after){
 const next=new Map((after?.journal||[]).filter(j=>j.calendarSkillProjectStart591||j.calendarSkillProjectSV591||j.calendarSkillProjectComplete591||j.calendarSkillBrewReady600||j.calendarSkillFletchingAllocation996||j.calendarSkillFletching996).map(j=>[j.id,j]));
 for(const old of before?.journal||[]){
  if(!(old.calendarSkillProjectStart591||old.calendarSkillProjectSV591||old.calendarSkillProjectComplete591||old.calendarSkillBrewReady600||old.calendarSkillFletchingAllocation996||old.calendarSkillFletching996))continue;
  assert(next.has(old.id)&&JSON.stringify(next.get(old.id))===JSON.stringify(old),
   'Časovaný Skill Test: neměnný kalendářní doklad byl upraven nebo vymazán.');
 }
 return true;
}
