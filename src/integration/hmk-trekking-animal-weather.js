/** HMK 1.2 pp.149,185,354-355. Explicit GM-approved extension of the
 * CHARACTER Cold / Heat procedure to registered trekking animals.
 * The printed p.355 F-impact AV is their Area AV. Neither a horse's Survival
 * EML nor species-specific skin/frostbite severity is supplied by the book.
 * Never invent either. The GM supplies an explicitly confirmed test EML,
 * supported environmental conditions and actual d100; both physical dice
 * and the derived SL/health consequence are retained as immutable evidence.
 */
import {evaluateTrekkingWeatherRoll} from './hmk-trekking-weather-roll.js';
import {trekRegisteredAnimalHealth,validateTrekAnimalHealthProof} from './hmk-trekking-animal-health.js';
import {prepareTrekkingWeatherTest} from './hmk-weather-hazard-aftermath.js';
import {successLevel} from '../rules/tests.js';
import {ailmentOutcome} from '../rules/ailments.js';
const requireIt=(v,m)=>{if(!v)throw Error(m)};
const valid=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export const ANIMAL_WEATHER_FORMAT='hmk-trek-animal-weather-analogy-v1';
// HMK 355: the *F impact Armour Value is the animal Area AV (Shock 6).
// Values for these seven verified mounted breeds only. No human garments.
export const ANIMAL_AREA_AV=Object.freeze({donkey:3,pony:3,mule:3,palfrey:4,courser:4,charger:4,destrier:5});
const label={0:'CF',1:'F',2:'S',3:'CS'};
export function weatherAnimalCandidates({journal=[],characters=[],clock}={}){
 if(!clock)return [];
 const roster=new Set(clock.characterIds??[]),animals=new Map(characters.filter(c=>roster.has(c.id)&&
  Object.hasOwn(ANIMAL_AREA_AV,c.hmk?.verifiedMountedBreed)).map(c=>[c.id,c]));
 const done=new Set(journal.filter(j=>j.calendarTrekAnimalWeatherProof?.format===ANIMAL_WEATHER_FORMAT&&
  j.calendarCampaignId===clock.campaignId).map(j=>j.calendarTrekAnimalWeatherProof.sourceId+'|'+j.characterId));
 const out=[];
 for(const source of journal){const p=source.calendarTrekProof;if(!p||source.calendarCampaignId!==clock.campaignId||
   source.campaignMinute!==clock.minute||p.weatherWatch?.requiresWeatherHazardRoll!==true)continue;
  for(const a of p.partyModes?.animals??[]){const animal=animals.get(a.id);
   if(!animal||!a.health||done.has(source.id+'|'+a.id))continue;
   out.push({source,animal,areaAV:ANIMAL_AREA_AV[animal.hmk.verifiedMountedBreed],
    kind:p.weatherWatch.hazard});
  }
 }
 return out;
}
export function animalWeatherRecord(journal=[],sourceId,actorId,campaignId){
 return journal.find(j=>j.calendarTrekAnimalWeatherProof?.format===ANIMAL_WEATHER_FORMAT&&
  j.calendarTrekAnimalWeatherProof.sourceId===sourceId&&j.characterId===actorId&&
  j.calendarCampaignId===campaignId)??null;
}
function sourceCheck({journal,source,actor,campaignId,minute}){
 const w=source?.calendarTrekProof?.weatherWatch;
 requireIt(w?.requiresWeatherHazardRoll&&['cold','heat'].includes(w.hazard)&&
  source.calendarCampaignId===campaignId&&source.campaignMinute===minute&&
  source.calendarTrekProof.partyModes?.animals?.some(a=>a.id===actor?.id&&a.health)&&
  typeof actor?.id==='string','Zvířecí Weather Hazard vyžaduje skutečnou současnou hlídku a její registrované zvíře.');
 requireIt(!animalWeatherRecord(journal,source.id,actor.id,campaignId),
  'Cold/Heat zvířete pro tuto hlídku již byl jednou doložen.');
 // A weather procedure for the prepared watch must not be committed while
 // the animal is already scheduled to rest or travel in a different watch.
 for(const row of journal){const a=row.calendarActivityProof;if(!a||row.calendarCampaignId!==campaignId||
  a.startMinute>minute||a.endMinute<=minute)continue;
  const stop=journal.find(j=>j.calendarActivityInterruptProof?.activityId===row.id)?.campaignMinute;
  if(stop!==undefined&&stop<=minute)continue;
  const travelAnimals=journal.find(j=>j.id===a.plan?.trekSourceId)?.calendarTrekProof?.partyModes?.animals??[];
  requireIt(a.characterId!==actor.id&&!travelAnimals.some(x=>x.id===actor.id),
   'Zvíře má již aktivní cestu či odpočinek. GM musí nejprve vyřešit přesný časový překryv.');
 }
 const before=trekRegisteredAnimalHealth(actor),snapshot=source.calendarTrekProof.partyModes.animals.find(a=>a.id===actor.id).health;
 requireIt(JSON.stringify(before)===JSON.stringify(snapshot),
  'Zdraví zvířete se od přípravy hlídky změnilo; přehodnoťte čas a situaci s GM.');
 return {w,before};
}
function computed({kind,breed,risk,endEML,endD100,coldCondition}){
 requireIt(Object.hasOwn(ANIMAL_AREA_AV,breed),'Ochrana zvířete není ověřená z HMK 355.');
 requireIt(risk?.kind===kind&&risk.areaAV===ANIMAL_AREA_AV[breed],
  'Zvířecí Area AV musí být odvozeno z ověřeného plemene, ne z lidské zbroje.');
 const outcome=evaluateTrekkingWeatherRoll(risk);
 if(!outcome.exposed){requireIt(endEML===null&&endD100===null,
  'Bez expozice se nemá házet Endurance (Survival).');return {hazard:outcome,sl:null};}
 requireIt(valid(endEML,1,200)&&valid(endD100,1,100),
  'Pro exponované zvíře musí GM určit EML a doložit skutečný d100.');
 const sl=label[successLevel(endD100,endEML)];
 requireIt(kind==='heat'||['dry','damp'].includes(coldCondition),
  'Voda vyžaduje samostatný Cold Shock; nelze ji obejít tímto trekkingovým formulářem.');
 return {hazard:outcome,sl};
}
/** Pure preview. Callers commit proposed state and journal row atomically. */
export function prepareAnimalTrekkingWeather({journal=[],source,actor,campaignId,minute,
 risk,endEML=null,endD100=null,endOrigin='manual',coldCondition='dry',gmConfirmed=false,entryId,createdAt,round=1}={}){
 requireIt(gmConfirmed===true,'GM musí potvrdit odvozené zvířecí použití pravidel pro postavy.');
 requireIt(typeof entryId==='string'&&entryId&&valid(minute,0,1000000000)&&
  valid(round,1,9999),'Chybí identita nebo čas zvířecího Weather Hazard.');
 const {w,before}=sourceCheck({journal,source,actor,campaignId,minute});
 const kind=w.hazard,breed=actor.hmk.verifiedMountedBreed;
 requireIt(risk?.kind===kind,'Cold/Heat musí přesně odpovídat počasí této hlídky.');
 if(kind==='cold')requireIt(risk.continuousSleet===(w.precipitation==='sleet'&&w.continuous===true),
  'Cold die musí odpovídat skutečnému Continuous Sleet.');
 if(kind==='heat')requireIt(risk.resting===false&&risk.shadedRest===false,
  'Cestující zvíře se zároveň nemůže chladit klidem a stínem jako při odpočinku.');
 const {hazard,sl}=computed({kind,breed,risk,endEML,endD100,coldCondition});
 requireIt(['manual','cryptographic-software-die'].includes(endOrigin),
  'Nedoložený původ zvířecího Endurance d100.');
 let state=structuredClone(actor.hmk.combatState),report=null;
 const medicalSourceId='animal:'+source.id+':'+actor.id;
 if(sl!==null){const result=prepareTrekkingWeatherTest({state,sourceId:medicalSourceId,
  round:Math.max(round,state.lastRound),kind,originalSL:sl,coldCondition,
  weatherHazardConfirmed:true,gmConfirmed:true});state=result.state;report=result.report;}
 const after=trekRegisteredAnimalHealth({...actor,hmk:{...actor.hmk,combatState:state}});
 const proof={format:ANIMAL_WEATHER_FORMAT,sourceId:source.id,sourceMinute:source.campaignMinute,
  campaignId,actorId:actor.id,breed,kind,risk:hazard,endEML,endD100,endOrigin:sl===null?null:endOrigin,sl,
  coldCondition,medicalSourceId,healthBefore:before,healthAfter:after,
  report,gmConfirmed:true,sourcePages:[149,176,185,354,355],
  policy:'GM-approved character weather analogy for animal; not a printed animal Survival test'};
 const entry={id:entryId,characterId:actor.id,calendarCampaignId:campaignId,campaignMinute:minute,
  createdAt,title:(kind==='cold'?'Cold':'Heat')+' Hazard · zvíře · GM rozšíření',
  body:`${breed}: d${hazard.sides} ${hazard.roll} / AV ${hazard.av} → ${hazard.exposed?'EML '+endEML+', d100 '+endD100+', '+sl:'bez expozice'}`+
   (report?.skinPending?' · GM: vyhodnotit '+report.skinPending+' na zvířecí anatomii':'')+
   (report?.hr?' · Exposure HR '+report.hr:'')+(report?.addedWeariness?' · Weariness +'+report.addedWeariness:''),
  calendarTrekAnimalWeatherProof:proof};
 return {state,entry,report,hazard,proof};
}
/** No retroactive edits to legacy watches. Validate even cloud-imported proof. */
export function validateAnimalWeatherJournal(journal=[]){
 const sources=new Map(journal.map(j=>[j.id,j])),seen=new Set();
 for(const row of journal){const p=row.calendarTrekAnimalWeatherProof;if(!p)continue;
  requireIt(p.format===ANIMAL_WEATHER_FORMAT&&p.gmConfirmed===true&&
   p.policy==='GM-approved character weather analogy for animal; not a printed animal Survival test'&&
   JSON.stringify(p.sourcePages)==='[149,176,185,354,355]'&&
   row.characterId===p.actorId&&row.calendarCampaignId===p.campaignId&&
   row.campaignMinute===p.sourceMinute&&valid(row.campaignMinute,0,1000000000),
   'Neplatný zvířecí Cold/Heat doklad a čas.');
  const src=sources.get(p.sourceId),w=src?.calendarTrekProof?.weatherWatch;
  requireIt(src?.calendarCampaignId===p.campaignId&&src.campaignMinute===p.sourceMinute&&
   w?.requiresWeatherHazardRoll&&w.hazard===p.kind&&
   src.calendarTrekProof.partyModes?.animals?.some(a=>a.id===p.actorId&&
    JSON.stringify(a.health)===JSON.stringify(p.healthBefore)&&a.health?.breed===p.breed),
   'Zvířecí Weather Hazard nemá původ v této hlídce, plemeni a kampani.');
  const key=[p.campaignId,p.sourceId,p.actorId].join('|');requireIt(!seen.has(key),'Duplicitní zvířecí Weather Hazard.');seen.add(key);
  const {hazard,sl}=computed({kind:p.kind,breed:p.breed,risk:p.risk,endEML:p.endEML,endD100:p.endD100,coldCondition:p.coldCondition});
  requireIt(JSON.stringify(hazard)===JSON.stringify(p.risk)&&sl===p.sl&&
   (p.sl===null?p.endOrigin===null:['manual','cryptographic-software-die'].includes(p.endOrigin))&&
   p.medicalSourceId==='animal:'+p.sourceId+':'+p.actorId&&
   (!p.sl||p.report&&p.report.kind===p.kind&&p.report.originalSL===p.sl)&&
   (!p.sl||p.report.addedWeariness===(p.kind==='cold'?(p.sl==='S'?5:0):p.sl==='S'?10:p.sl==='CS'?5:0))&&
   validateTrekAnimalHealthProof(p.healthBefore,p.actorId)&&validateTrekAnimalHealthProof(p.healthAfter,p.actorId),
   'Zvířecí Weather Hazard obsahuje změněný hod nebo zdravotní závěr.');
  if(p.sl===null)requireIt(p.report===null&&
   JSON.stringify(p.healthBefore)===JSON.stringify(p.healthAfter),
   'Bez expozice nesmí vzniknout žádná zdravotní změna.');
  else {
   const expectedHR=p.sl==='CF'||p.sl==='F'?(p.kind==='heat'?(p.sl==='CF'?4:5):p.coldCondition==='damp'?4:5):null;
   const expectedSkin=p.sl==='CF'?(p.kind==='heat'?'sunburn':'frostbite'):null;
   const expectedWear=p.kind==='cold'?(p.sl==='S'?5:0):p.sl==='S'?10:p.sl==='CS'?5:0;
   requireIt(p.report.hr===expectedHR&&p.report.skinPending===expectedSkin&&
    p.report.addedWeariness===expectedWear&&
    p.healthAfter.fatigue===p.healthBefore.fatigue+expectedWear+
     (expectedHR===null?0:ailmentOutcome(expectedHR).weaknessFatigue),
    'Zvířecí zdravotní následky Cold/Heat neodpovídají potvrzenému výsledku.');
  }
  if(p.kind==='cold')requireIt(p.risk.continuousSleet===(w.precipitation==='sleet'&&w.continuous===true),
   'Zvířecí Cold die nesouhlasí s počasím.');
  if(p.kind==='heat')requireIt(p.risk.resting===false&&p.risk.shadedRest===false,
   'Během cesty zvíře nesmí požadovat kostku za stínový odpočinek.');
 }
 return true;
}
export function certifiedAnimalWeatherHealth(journal,sourceId,animalId,campaignId){
 return animalWeatherRecord(journal,sourceId,animalId,campaignId)?.calendarTrekAnimalWeatherProof??null;
}
/** Certified changes between initial watch snapshot and departure: tolerate
 * ONLY this watch's original, immutable animal Weather Hazard proof. */
export function assertCertifiedAnimalWeatherTransition({journal=[],sourceId,campaignId,prepared=[],current=[],mandatory=false}={}){
 requireIt(Array.isArray(prepared)&&Array.isArray(current)&&prepared.length===current.length,
  'Zvíře nebo složení hlídky se po přípravě změnilo.');
 for(const a of current){
  const before=prepared.find(x=>x.id===a.id);
  requireIt(before&&a.enc===before.enc&&a.droverId===before.droverId&&
   a.loaded===before.loaded&&JSON.stringify(a.encCalculation??null)===JSON.stringify(before.encCalculation??null),
   'Zvířecí náklad nebo honák se po přípravě hlídky změnil.');
  const evidence=certifiedAnimalWeatherHealth(journal,sourceId,a.id,campaignId);
  if(mandatory&&before.health)requireIt(evidence,
   'Chybí povinný samostatný Cold/Heat Hazard doklad registrovaného zvířete.');
  if(evidence)requireIt(JSON.stringify(evidence.healthBefore)===JSON.stringify(before.health)&&
   JSON.stringify(evidence.healthAfter)===JSON.stringify(a.health),
   'Zdravotní stav zvířete neodpovídá doloženému Weather Hazard.');
  else requireIt(JSON.stringify(a.health??null)===JSON.stringify(before.health??null),
   'Zdraví zvířete se změnilo bez doloženého Cold/Heat.');
 }
 return true;
}
