/** HMK 1.2 printed pp.145,147: certified watch wilderness tasks.
 * Foraging consumes each allotted mode; every die remains source-linked and
 * correctly distinguishes NO RESULT from a ZERO RESULT (one water-day).
 * Tracking, Stalking and Vigilance effects are preserved without fabricating
 * surprise rolls, treasure or physical inventory objects.
 */
import {effectiveTrekSource,certifyTrekOrienteering} from './hmk-trekking-correction.js';
import {assertOrienteeringModes} from './hmk-trekking-orienteering.js';
const test=(yes,msg)=>{if(!yes)throw Error(msg);};
const d10=n=>Number.isSafeInteger(n)&&n>=1&&n<=10;
const QUALITIES=['trace','poor','fair','average','good','excellent'];
const HABITATS={
 'alpine-vegetation':['poor','fair','poor','trace'],
 'cropland-pasture':['fair','good','excellent','poor'],
 desert:['poor','trace','trace','trace'],
 grassland:['poor','fair','fair','poor'],
 'heath-moor':['poor','fair','fair','poor'],
 'ice-snow-rockfield':['trace','poor','trace','trace'],
 'mixed-forest':['fair','good','average','poor'],
 'mixed-cold-woodland':['fair','average','average','poor'],
 'needleleaf-forest':['fair','average','fair','poor']
};
export const FORAGING_HABITATS=Object.freeze(Object.keys(HABITATS));
const SEASONS=['spring','summer','autumn','winter'];
// HMK printed p.147: rows d10 1-2,3-4,5-7,8-9,10;
// null = NONE, zero = 0 (water only when searching food).
const RESULTS=[
 [null,null,null,0,1,1],
 [null,null,0,0,1,1],
 [null,0,1,1,1,2],
 [0,1,1,2,2,3],
 [1,2,2,3,3,4]
];
export function foragingQuality({habitat,season}={}){
 test(Object.hasOwn(HABITATS,habitat)&&SEASONS.includes(season),'Nedoložený biotop nebo období pro Foraging; Wetlands vyžaduje okolní dominantní biotop');
 return HABITATS[habitat][SEASONS.indexOf(season)];
}
export function foragingDie({habitat,season,roll,target,herbName=''}={}){
 test(d10(roll),'Foraging vyžaduje skutečný d10 1–10');
 test(['food-water','herbs'].includes(target),'Každý Foraging Mode musí před hodem určit jídlo/vodu nebo byliny');
 const herb=String(herbName).trim();
 test(target!=='herbs'||herb.length>0&&herb.length<=100,'Při sběru bylin určete před hodem konkrétní druh (HMK 147)');
 const quality=foragingQuality({habitat,season});
 const tier=roll<=2?0:roll<=4?1:roll<=7?2:roll<=9?3:4;
 const found=RESULTS[tier][QUALITIES.indexOf(quality)];
 return {roll,target,herbName:target==='herbs'?herb:null,quality,found,
  foodDays:target==='food-water'?Math.max(0,found??0):0,
  waterDays:target==='food-water'?(found===null?0:Math.max(1,found)):0,
  herbDoses:target==='herbs'?Math.max(0,found??0):0,sourcePage:147};
}
export const WILDERNESS_FORMAT='hmk-trekking-wilderness-tasks-v1';
export function requiredWildernessWatch({source,journal=[],campaignId,minute}={}){
 test(source?.calendarTrekProof?.format==='hmk-trekking-watch-evidence-v1','Chybí původní Trekking Routine');
 test(source.calendarCampaignId===campaignId&&source.campaignMinute===minute,
  'Cizí kampaň nebo čas cestovní hlídky');
 const actual=effectiveTrekSource(source,journal),p=actual.calendarTrekProof;
 const linked=journal.filter(j=>j.calendarTrekSkillSource?.sourceId===source.id&&
  j.calendarTrekSkillSource.hazard==='survival'&&j.characterId===source.characterId&&
  j.calendarCampaignId===campaignId);
 test(linked.length===1,'Nejprve doložte jeden skutečný Orienteering / Survival SV');
 const modes=p.modes??{};
 const certified=certifyTrekOrienteering(source,journal);
 assertOrienteeringModes({adjustment:certified.adjustment,modes});
 test(Number.isSafeInteger(modes.foraging??0)&&(modes.foraging??0)>=0&&(modes.foraging??0)<=5&&
  [0,1].includes(modes.stalking??0)&&[0,1].includes(modes.vigilance??0),
  'Neplatný doložený počet Wilderness Modes');
 return {sourceId:source.id,sourceMinute:source.campaignMinute,season:p.season,
  foraging:modes.foraging??0,stalking:modes.stalking??0,vigilance:modes.vigilance??0,
  guideId:source.characterId,orienteeringId:linked[0].id,
  groupIds:p.partyModes?.memberIds??[source.characterId],
  originalTerrain:p.terrain};
}
export function createWildernessProof({source,journal=[],campaignId,minute,habitat,
 rolls=[],targets=[],origin='manual',origins=null}={}){
 const req=requiredWildernessWatch({source,journal,campaignId,minute});
 test(req.foraging>0,'Tato hlídka nemá žádné skutečné Foraging Modes');
 const dieOrigins=origins??rolls.map(()=>origin);
 test(dieOrigins.length===rolls.length&&dieOrigins.every(o=>['manual','cryptographic-software-die'].includes(o)),'Neplatný původ jednotlivých hodů');
 test(rolls.length===req.foraging&&targets.length===req.foraging&&rolls.every(d10),
  'Každý přidělený Foraging Mode vyžaduje právě jeden d10');
 const results=rolls.map((roll,i)=>foragingDie({habitat,season:req.season,roll,
  target:targets[i]?.target,herbName:targets[i]?.herbName}));
 return {format:WILDERNESS_FORMAT,sourceId:req.sourceId,sourceMinute:req.sourceMinute,
  orienteeringId:req.orienteeringId,habitat,season:req.season,
  results,totals:{foodDays:results.reduce((s,r)=>s+r.foodDays,0),
   waterDays:results.reduce((s,r)=>s+r.waterDays,0),
   herbDoses:results.reduce((s,r)=>s+r.herbDoses,0)},
  stalking:req.stalking===1,vigilance:req.vigilance===1,
  dice:rolls.map((value,i)=>({faces:10,label:'Foraging '+(i+1),value,origin:dieOrigins[i]})),sourcePage:147};
}
export function validateWildernessJournal(journal=[]){
 const byId=new Map(journal.map(j=>[j.id,j])),seen=new Set();
 for(const row of journal){const p=row.calendarTrekWildernessProof;if(!p)continue;
  const source=byId.get(p.sourceId),k=p.sourceId;
  test(source?.calendarTrekProof&&!seen.has(k),'Neplatný nebo duplicitní výsledek Foraging');seen.add(k);
  const expected=createWildernessProof({source,journal,campaignId:row.calendarCampaignId,
   minute:source.campaignMinute,habitat:p.habitat,
   rolls:(p.dice??[]).map(d=>d.value),targets:(p.results??[]).map(r=>({target:r.target,herbName:r.herbName})),
   origins:p.dice?.map(d=>d.origin)});
  test(row.characterId===source.characterId&&row.campaignMinute===source.campaignMinute&&
   JSON.stringify(expected)===JSON.stringify(p),'Pozměněný Foraging výsledek nebo chybný čas kampaně');
 }
 return true;
}
export function foragingResources(journal=[],campaignId){
 const sums={foodDays:0,waterDays:0,herbDoses:0,herbs:{}};
 for(const j of journal)if(j.calendarCampaignId===campaignId&&
  (j.calendarTrekWildernessProof||j.calendarTimeEpisode?.foraging)){
  const p=j.calendarTrekWildernessProof||j.calendarTimeEpisode.foraging;
  for(const k of ['foodDays','waterDays','herbDoses'])sums[k]+=p.totals?.[k]??p.results.reduce((a,r)=>a+(r[k]||0),0);
  for(const r of p.results)if(r.herbDoses)sums.herbs[r.herbName]=(sums.herbs[r.herbName]||0)+r.herbDoses;
 }
 return sums;
}
// Tracking p.147 is a separate authoritative Skill Test, not a new die here.
export function trackingModifiers({continuousSnow=false,continuousRain=false,partyTracked=0,
 twilight=false,night=false,alpine=false,road='none'}={}){
 test(Number.isSafeInteger(partyTracked)&&partyTracked>=0&&partyTracked<=10000&&
  ['none','unpaved','paved'].includes(road)&&
  [continuousSnow,continuousRain,twilight,night,alpine].every(x=>typeof x==='boolean'),
  'Tracking vyžaduje doložené podmínky, nikoli domněnku');
 const delta=4*Number(continuousSnow)-Number(continuousRain)+Math.floor(partyTracked/5)-
  Number(twilight)-3*Number(night)-Number(alpine)-(road==='paved'?4:road==='unpaved'?2:0);
 return {delta,sourcePage:147};
}
export function trackingOutcome(adjustedSV,{criticalFailure=false}={}){
 test(Number.isSafeInteger(adjustedSV)&&adjustedSV>=-100&&adjustedSV<=100,'Tracking vyžaduje skutečný SV');
 return {adjustedSV,spoorStars:adjustedSV>=5?adjustedSV-4:0,
  awarenessNeeded:adjustedSV>=3&&adjustedSV<=4,
  nextWatchBearingOnCF:criticalFailure,sourcePage:147};
}

// v1 capped Spoor stars at 5; preserve old proofs without rewriting history.
export const TRACKING_FORMAT='hmk-trekking-tracking-outcome-v2';
export function createTrackingProof({source,journal=[],campaignId,skillId,conditions}={}){
 test(source?.calendarTrekProof?.format==='hmk-trekking-watch-evidence-v1'&&source.calendarCampaignId===campaignId,
  'Tracking musí patřit ke konkrétní cestovní hlídce');
 const effective=effectiveTrekSource(source,journal);
 test(effective.calendarTrekProof.modes.stalking===1,'Tracking v Trekking vyžaduje doložený Stalking Mode');
 const skill=journal.find(j=>j.id===skillId);
 test(skill?.calendarTrekSkillSource?.hazard==='tracking'&&skill.calendarTrekSkillSource.sourceId===source.id&&
  skill.calendarCampaignId===campaignId&&skill.campaignMinute>=source.campaignMinute&&
  (source.calendarTrekProof.partyModes?.memberIds??[source.characterId]).includes(skill.characterId),
  'Tracking nelze doložit výsledkem jiné hlídky, postavy nebo kampaně');
 const result=skill.skillTestProof?.a??skill.skillTestProof?.result;
 test(Number.isSafeInteger(result?.sv)&&['CF','F','S','CS'].includes(result?.level),
  'Tracking potřebuje autoritativní SV z původního Skill Workbench');
 const context=trackingModifiers(conditions);
 const score=trackingOutcome(result.sv+context.delta,{criticalFailure:result.level==='CF'});
 return {format:TRACKING_FORMAT,sourceId:source.id,skillId,sourceMinute:source.campaignMinute,
  trackerId:skill.characterId,rawSV:result.sv,level:result.level,conditions:{...conditions},
  modifier:context,score,sourcePage:147};
}
export function validateTrackingJournal(journal=[]){
 const byId=new Map(journal.map(j=>[j.id,j])),seen=new Set();
 for(const row of journal){const p=row.calendarTrekTrackingProof;if(!p)continue;
  test(!seen.has(p.sourceId),'Jedna hlídka nemůže mít dva různě potvrzené Tracking výsledky');seen.add(p.sourceId);
  const source=byId.get(p.sourceId),expected=createTrackingProof({source,journal,campaignId:row.calendarCampaignId,
   skillId:p.skillId,conditions:p.conditions});
  // Original v1 had a 5-star ceiling even for SV >9. Never retroactively
  // rewrite historical records: only NEW v2 results use printed unlimited
  // beyond-9 Spoor stars (HMK 147).
  if(p.format==='hmk-trekking-tracking-outcome-v1'){
   expected.format=p.format;
   expected.score.spoorStars=Math.min(5,expected.score.spoorStars);
  }
  test(row.characterId===p.trackerId&&row.campaignMinute===source.campaignMinute&&
   JSON.stringify(expected)===JSON.stringify(p),'Poškozený nebo cizí Tracking důkaz');
 }
 return true;
}

/** HMK printed p.150, Encounter step [9], Watchfulness & Surprise.
 * Determine the type of original opposed/unopposed test, never roll new
 * skills here or invent the opposing party's watchfulness.
 */
export function trekWatchfulness({modes={},conveyance='foot'}={}){
 test(['foot','mount','cart','wagon'].includes(conveyance),'Neznámý cestovní prostředek');
 const level=modes.lax?'lax':(modes.stalking||modes.vigilance)?'alert':'normal';
 const afterAnimals=conveyance==='foot'?level:level==='alert'?'normal':'lax';
 const skills=level==='alert'&&conveyance==='foot'?
  [...(modes.stalking?['Stealth']:[]),...(modes.vigilance?['Awareness']:[])]:['Awareness'];
 return {original:level,effective:afterAnimals,skills:afterAnimals==='alert'?skills:['Awareness'],
  demoted:afterAnimals!==level,sourcePage:150};
}
export function trekSurpriseProcedure({party,foe,foeSkills=['Awareness']}={}){
 test(['lax','normal','alert'].includes(party?.effective)&&['lax','normal','alert'].includes(foe),
  'Surprise nelze určit bez doložené bdělosti obou skupin');
 const lv={lax:0,normal:1,alert:2},a=lv[party.effective],b=lv[foe];
 const winner=a>b?'party':b>a?'foe':null;
 return {kind:Math.abs(a-b)===2?'automatic':a===b?'opposed':'unopposed',
  preferred:winner,partySkills:party.skills,foeSkills,
  // In opposed/unopposed procedures the actual skill test outcome is still
  // required. No outcome is inferred from the mode alone.
  automaticWinner:Math.abs(a-b)===2?winner:null,sourcePage:150};
}
