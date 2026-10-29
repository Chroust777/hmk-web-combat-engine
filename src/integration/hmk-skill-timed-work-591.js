/** HârnMaster 1.2 pp.70,132: prospective scheduling of actual skill work.
 * Read-only arithmetic/validation. Never invents a roll or a project.
 * Existing unscheduled historical skill tests are unchanged.
 */
import {ENGINEERING_DESIGN_DAYS} from './hmk-engineering-design-548.js';
import {CRAFT_WORK_600,projectTiming600,confirmCraftStart600} from './hmk-skill-crafts-600.js';
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
  wheelbarrow:Object.freeze({name:'Wheelbarrow',priceD:10,weightLb:24})
 })
});
export const TIMED_CRAFT_LABELS_599=Object.freeze({glassworking:'Glassworking · HMK 73',woodworking:'Woodworking · HMK 91'});

export function timedSkillBaseMinutes591(kind,scope){
 if(CRAFT_WORK_600[kind])return CRAFT_WORK_600[kind][scope]?.hours*60??null;
 if(kind==='engineering')return Number.isFinite(ENGINEERING_DESIGN_DAYS[scope])?ENGINEERING_DESIGN_DAYS[scope]*1440:null;
 if(kind==='writing')return WRITING_WORK_MINUTES_591[scope]??null;
 if(kind==='drawing'){const area=Number(scope);return Number.isInteger(area*4)&&area>=0.25&&area<=10?area*240:null;}
 if(kind==='cookery'){const diners=Number(scope);return Number.isInteger(diners)&&diners>=5&&diners<=100&&diners%5===0?(diners/5)*60:null;}
 if(kind==='glassworking'||kind==='woodworking'){
  const item=TIMED_CRAFT_ITEMS_599[kind]?.[scope];
  if(!item)return null;
  // Glassworking: approximately one 24h day per 6d (only exact day
  // multiples are offered). Woodworking: 10 working hours per 3d.
  return kind==='glassworking'?(item.priceD/6)*1440:(item.priceD/3)*600;
 }
 return null;
}
export function skillTimedEarliest591(kind,baseMinutes){
 // Without optional randomization, up to 3 successful Maths dice AFTER the
 // first two reduce Engineering design time by 30%. Up to 5 SV stars may
 // reduce Writing Routine by 50%. This is only an earliest possible TEST,
 // not permission to claim the project is completed.
 return Math.ceil(baseMinutes*(kind==='engineering'?0.7:kind==='writing'?0.5:1));
}
export function validateSkillTimedWork591(data){
 const starts=new Map(),linked=new Set(),completed=new Set(),journal=data?.journal||[];
 const journalById=new Map(journal.map(j=>[j.id,j]));
 for(const row of journal){
  const p=row.calendarSkillProjectStart591;if(!p)continue;
  const base=timedSkillBaseMinutes591(p.kind,p.scope);
  assert(p.format===SKILL_TIMED_WORK_FORMAT_591&&base!==null&&
   typeof p.projectName==='string'&&p.projectName.trim().length>=2&&p.projectName.length<=120&&
   p.actorId===row.characterId&&data.characters?.some(c=>c.id===p.actorId)&&
   typeof row.calendarCampaignId==='string'&&row.calendarCampaignId.length>0&&
   Number.isSafeInteger(p.startMinute)&&p.startMinute>=0&&p.startMinute===row.campaignMinute&&
   p.baseMinutes===base&&
   (CRAFT_WORK_600[p.kind]?(()=>{
    const t=projectTiming600(p.kind,p.scope,p.startMinute,{agingRolls:p.craftAgingRolls});
    const reference=confirmCraftStart600(p.kind,p.scope,p.startMinute,p.craftAgingRolls);
    return t&&p.earliestMinute===t.dueMinute&&p.baseDueMinute===t.dueMinute&&
     p.craftItemName===reference.craftItemName&&p.craftItemCostD===reference.craftItemCostD&&
     p.craftSourcePage===reference.craftSourcePage&&p.craftDayResolution===reference.craftDayResolution&&
     JSON.stringify(p.craftAgingRolls)===JSON.stringify(reference.craftAgingRolls)&&
     p.craftAgingDays===reference.craftAgingDays&&p.craftReadyMinute===reference.craftReadyMinute&&
     p.materialSourceConfirmed===true;})():
    (p.calendarDayEligibility600===true?
     (p.kind==='glassworking'&&base%1440===0&&p.earliestMinute===Math.floor((p.startMinute+base)/1440)*1440&&p.baseDueMinute===p.earliestMinute):
     (p.earliestMinute===p.startMinute+skillTimedEarliest591(p.kind,base)&&p.baseDueMinute===p.startMinute+base)))&&
   !starts.has(row.id)&&
   (!TIMED_CRAFT_ITEMS_599[p.kind]||(
     p.craftItemPriceD===TIMED_CRAFT_ITEMS_599[p.kind][p.scope]?.priceD&&
     p.craftItemWeightLb===TIMED_CRAFT_ITEMS_599[p.kind][p.scope]?.weightLb&&
     p.craftItemName===TIMED_CRAFT_ITEMS_599[p.kind][p.scope]?.name&&
     p.materialSourceConfirmed===true)),
   'Časovaný Skill Test: začátek projektu nebo pravidlová doba byly pozměněny.');
  starts.set(row.id,{row,p});
 }
 for(const row of journal){
  const link=row.calendarSkillProjectSV591;if(!link)continue;
  const s=starts.get(link.startId),proof=row.skillTestProof;
  const skill=proof?.skills?.[0]||proof?.skill||'';
  assert(s&&!linked.has(link.startId)&&link.kind===s.p.kind&&
   row.characterId===s.p.actorId&&row.calendarCampaignId===s.row.calendarCampaignId&&
   Number.isSafeInteger(row.campaignMinute)&&row.campaignMinute>=s.p.earliestMinute&&
   proof?.type==='secondary-mastery-value-test'&&
   (s.p.kind==='writing'?/^Language(?:\s|\(|:|$)/.test(skill)||/\(Language\)$/.test(skill):
    skill===({engineering:'Engineering',drawing:'Drawing',cookery:'Cookery',glassworking:'Glassworking',woodworking:'Woodworking',brewing:'Brewing',ceramics:'Ceramics',hideworking:'Hideworking',textilecraft:'Textilecraft',metalcraft:'Metalcraft',mineralogy:'Mineralogy'})[s.p.kind])&&
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
   const willFollow=journal.find(j=>j.skillTestProof?.type==='critical-followup'&&
    j.skillTestProof.originId===source.id&&j.skillTestProof.activity==='writing-routine');
   const willFactor=originalLevel==='CF'?willFollow?.skillTestProof?.writingExtension?.completionTimeMultiplier:null;
   const factor=originalLevel==='CF'?willFactor:1;
   const insightDice=p.physicalInsightDice,required=s.p.scope==='missive'?0:stars-t;
   const subjectIndex=p.subjectIndex,successful=Array.isArray(insightDice)?insightDice.filter(d=>d<=subjectIndex).length:0;
   const insightLimit={missive:0,tract:1,treatise:3,disquisition:5}[s.p.scope];
   const expectedInsight=Math.min(successful,insightLimit,Math.max(0,subjectIndex-4));
   assert(Number.isSafeInteger(t)&&t>=0&&t<=stars&&
    p.scope===s.p.scope&&p.sourceSV===sourceSV&&p.sourceLevel===originalLevel&&
    Array.isArray(insightDice)&&insightDice.length===required&&insightDice.every(d=>Number.isSafeInteger(d)&&d>=1&&d<=10)&&
    Number.isSafeInteger(subjectIndex)&&subjectIndex>=0&&p.insightStars===expectedInsight&&
    (required===0||typeof p.subjectSkill==='string'&&p.subjectSkill.length>0)&&
    Number.isFinite(factor)&&
    (originalLevel!=='CF'||willFollow?.skillTestProof?.writingExtension?.scope===s.p.scope)&&
    done.workMinutes===Math.ceil(s.p.baseMinutes*(1-0.1*t)*factor),
    'Writing: nedoložené Insight d10, hvězdy, Will následek nebo zkrácení času.');
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
  ready.add(r.startId);
 }
 return true;
}
export function assertSkillTimedAppendOnly591(before,after){
 const next=new Map((after?.journal||[]).filter(j=>j.calendarSkillProjectStart591||j.calendarSkillProjectSV591||j.calendarSkillProjectComplete591||j.calendarSkillBrewReady600).map(j=>[j.id,j]));
 for(const old of before?.journal||[]){
  if(!(old.calendarSkillProjectStart591||old.calendarSkillProjectSV591||old.calendarSkillProjectComplete591||old.calendarSkillBrewReady600))continue;
  assert(next.has(old.id)&&JSON.stringify(next.get(old.id))===JSON.stringify(old),
   'Časovaný Skill Test: neměnný kalendářní doklad byl upraven nebo vymazán.');
 }
 return true;
}
