/** HârnMaster Kèthîra v1.2 p.185: witnessed skin trauma and cold-water Shock.
 * Pure, atomic previews: caller saves returned Combat State and journal in one
 * storage transaction. Never substitutes impact dice for printed direct IL.
 */
import {validateCombatState,applyConfirmedHit,combatFatigueTotals} from './persistent-combat-state.js';
import {humanLocation} from './hmk-mounted-fall-injury-join.js';
import {compoundInjury,compoundCompatible} from '../rules/injury.js';
import {successLevel,SL} from '../rules/tests.js';
import {calculateShockState,shockStateFromIndex,applyShockState,SHOCK_STATE} from '../rules/shock.js';
import {resolveLiveCombatArmour} from './live-combat-armour.js';
import {appendParallelColdShock} from './hmk-parallel-cold-shock.js';

const requireIt=(v,message)=>{if(!v)throw Error(message)};
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const named=(sl)=>Object.keys(SL).find(k=>SL[k]===sl);
const external={NONE:SHOCK_STATE.NONE,STN:SHOCK_STATE.STN,INC:SHOCK_STATE.INC,UNC:SHOCK_STATE.UNC,KIA:SHOCK_STATE.KIA};
const reverse=Object.fromEntries(Object.entries(external).map(([k,v])=>[v,k]));
const isLimb=new Set(['sh','ua','el','fo','ha','th','kn','ca','ft']);
const bodyShock=(()=>{const out={};for(let z=1;z<=10;z++)for(let l=1;l<=10;l++){
 const t=humanLocation(z,l);if(out[t.location]!==undefined&&out[t.location]!==t.locationShock)throw Error('Nekonzistentní HMK anatomie');
 out[t.location]=t.locationShock; }return Object.freeze(out);})();
/** Verified HMK p167 human location's printed Shock factor (read-only). */
export function verifiedHumanLocationShock(location){return bodyShock[location]??null;}
const windMinutes=d=>d<=3?120:d<=17?60:30;
const durationMinutes=d=>d<=12?60:d<=17?120:d<=19?180:240;
const complexionTN=Object.freeze({'very-light':10,light:7,medium:4,dark:2,'very-dark':1});
const baseSkill=(actor,name)=>{
 const s=actor?.hmk?.skills?.filter(x=>String(x.name||'').toLowerCase()===name.toLowerCase());
 requireIt(s?.length===1&&integer(s[0].ml,1,200),'Není doložena dovednost '+name+' postavy');return s[0].ml;
};
function prepared({state,actor,sourceId,round,gmConfirmed}){
 requireIt(gmConfirmed===true&&actor?.id&&typeof sourceId==='string'&&sourceId&&integer(round,1,9999),'Potvrďte původ, postavu a herní kolo');
 validateCombatState(state);requireIt(round>=state.lastRound&&state.shock!=='KIA','Stav není způsobilý pro tento časový krok');
 return structuredClone(state);
}
/** One-time immersion shock, after actual 3d6 rounds. No silent Endurance die.
 * The caller must separately initiate the subsequent ongoing Cold Exposure.
 */
export function prepareColdWaterShock({actor,state,sourceId,round=1,condition,d6s,enduranceD100,
 gmConfirmed=false,originMinute=null}={}){
 const s=prepared({state,actor,sourceId,round,gmConfirmed}),id='skill-cold-shock:'+sourceId;
 requireIt(!s.events.some(e=>e.id===id),'Cold Shock tohoto ponoření už byl vyhodnocen');
 requireIt(['coolWater','coldWater','freezingWater'].includes(condition),'Studený šok vyžaduje doložené ponoření do chladné vody');
 requireIt(Array.isArray(d6s)&&d6s.length===3&&d6s.every(v=>integer(v,1,6))&&integer(enduranceD100,1,100),
  'Chybí skutečné 3d6 trvání a Endurance d100');
 // Existing Shock is NOT an automatic veto: the physical immersion roll
 // still occurs.  A weaker/equal new state never replaces an earlier Course.
 // Stronger simultaneous pending recoveries need a source-keyed scheduler;
 // do not silently erase that obligation.
 const end=actor.hmk?.attributes?.end;
 requireIt(integer(end,1,200),'Chybí doložený END atribut');
 const endEML=end*5-combatFatigueTotals(s).total;
 const sl=successLevel(enduranceD100,endEML),base={coolWater:5,coldWater:6,freezingWater:7}[condition];
 const modifier={CF:2,F:1,S:0,CS:-1}[named(sl)],index=base+modifier;
 const stateName=reverse[shockStateFromIndex(index)];
 requireIt(stateName,'Neznámý Cold Shock Index');
 const oldShock=s.shock;
 const carryShock=reverse[applyShockState(external[oldShock],external[stateName])];
 requireIt(carryShock,'Cold Shock Carryover neodpovídá HMK str.169');
 const ranks={NONE:0,STN:1,INC:2,UNC:3,KIA:4};
 const newIsStronger=ranks[carryShock]>ranks[oldShock];
 // The native HMK p169 followup covers the currently MOST severe Shock State;
 // when a stronger state replaces it, the old pending followup is recorded as
 // superseded, not left as a stale second recovery and not silently erased.
 // An already established 4-hour Extended Shock/Coma is DIFFERENT: its own
 // mandatory Course cannot be superseded by a fresh immersion Shock.
 const parallel=newIsStronger&&!!(s.extendedShock||s.coma?.active)&&carryShock!=='KIA';
 const supersededFollowup=newIsStronger&&s.shockFollowup?structuredClone(s.shockFollowup):null;
 if(parallel){appendParallelColdShock(s,{sourceId,originEventId:id,originMinute,originRound:round,shock:carryShock});}
 else if(newIsStronger){
  s.shock=carryShock;s.shockOriginRound=round;
  if(carryShock==='INC'||carryShock==='UNC')s.posture.prone=true;
  if(['STN','INC','UNC'].includes(carryShock)){
   requireIt(integer(originMinute,0,1000000000),'Cold Water Shock vyžaduje skutečnou kalendářovou minutu');
   s.shockFollowup={kind:carryShock,originRound:round,timelineId:null,
    dueRound:round+(carryShock==='UNC'?120:1),phase:carryShock==='UNC'?'after-ten-minutes':'end-next-turn',
    domain:'travel-weather',sourceId,originMinute};
  }
  if(carryShock==='KIA'){s.shockFollowup=null;s.extendedShock=null;s.coma=null;for(const w of s.wounds)w.nextAdvanceRound=null;}
 }
 const report={condition,immersionRounds:d6s.reduce((a,b)=>a+b,0),d6s,enduranceD100,endEML,
  sl:named(sl),base,index,modifier,shock:stateName,carryoverShock:carryShock,effectiveShock:s.shock,
  previousShock:oldShock,parallelCourseSource:parallel?sourceId:null,previousCoursePreserved:parallel||(!newIsStronger&&!!(s.shockFollowup||s.extendedShock||s.coma)),
  ...(supersededFollowup?{supersededFollowup,reason:'HMK p169: only the most severe current Shock State has a native Shock Reroll'}:{}),rulePage:185};
 s.events.push({id,type:'skill-cold-water-shock',round,details:{sourceId,report,gmConfirmed:true}});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report};
}
function injuriesFromExposure(h,{windD20,durationD20,complexion,rows,maximumExposureMinutes=null}){
 requireIt(Array.isArray(rows)&&rows.length<=30,'Doložte všechny exponované lokace, včetně lokací bez výsledné rány');
 requireIt(maximumExposureMinutes===null||integer(maximumExposureMinutes,1,10080),
  'Frostbite/Sunburn: chybí ověřená délka minutové epizody');
 if(rows.length===0)return {period:0,duration:0,sampledDuration:0,rows:[]}; // GM-confirmed fully covered skin; no unnecessary dice.
 if(h.skinPending==='frostbite'){
  requireIt(integer(windD20,1,20)&&integer(durationD20,1,20),'Frostbite vyžaduje fyzické d20 pro vítr a délku expozice');
  // HMK p185 samples a duration inside a FOUR-HOUR watch. In our approved
  // minute-based GM episodes, the d20 is preserved verbatim but cannot create
  // more actual minutes of frost injury than the certified episode contained.
  // A null bound is reserved for legacy/non-episode sources without such proof.
  const period=windMinutes(windD20),sampledDuration=durationMinutes(durationD20);
  const duration=maximumExposureMinutes===null?sampledDuration:Math.min(sampledDuration,maximumExposureMinutes);
  return {period,duration,sampledDuration,rows:rows.map(r=>{
    requireIt(integer(r.av,0,50),'Pro každou Frostbite lokaci je nutné AV0, AV1–3 nebo doložená vyšší ochrana');
    const il=r.av===0?Math.floor(duration/period):r.av<=3?Math.floor(duration/(period*2)):0;
    requireIt(il<=5,'Více než IL5 v jedné lokaci není touto tabulkou jednoznačně vyřešeno; musí rozhodnout GM');
    return {...r,il,sourceRoll:null};
  })};
 }
 requireIt(Object.hasOwn(complexionTN,complexion),'Sunburn vyžaduje skutečnou pleť postavy');
 // Sunburn keeps the HMK p185 discrete d10; 240 is the reference watch,
 // not a claim that a shorter minute episode has actually elapsed.
 return {period:240,duration:Math.min(240,maximumExposureMinutes??240),rows:rows.map(r=>{
   requireIt(integer(r.skinD10,1,10),'Každá slunci vystavená lokace vyžaduje vlastní d10');
   const il=r.skinD10<=complexionTN[complexion]?(r.skinD10<=6?1:2):0;
   return {...r,il,sourceRoll:r.skinD10};
 })};
}
/** UI-only read-only projection, backed by the EXACT printed injury function.
 * No dice generated and no character state modified. */
export function previewExposureSkinLocation({kind,av=null,windD20=null,durationD20=null,skinD10=null,
 complexion=null,maximumExposureMinutes=null}={}){
 requireIt(kind==='frostbite'||kind==='sunburn','Neznámý kožní následek');
 const out=injuriesFromExposure({skinPending:kind},{windD20,durationD20,complexion,
  rows:[{av,skinD10}],maximumExposureMinutes});
 return {il:out.rows[0].il,periodMinutes:out.period,durationMinutes:out.duration,
  ...(kind==='frostbite'?{sampledDurationMinutes:out.sampledDuration}:{})};
}
/** Skin result uses the printed direct Injury Level, never a fabricated impact.
 * Each real wound must pass the existing Injury/Compound/Shock/Morale pipeline.
 * Whole collection commits together or not at all. */
export function prepareExposureSkinInjuries({actor,inventory,state,sourceId,round=1,
 windD20=null,durationD20=null,complexion=null,rows=[],maximumExposureMinutes=null,originMinute=null,gmConfirmed=false,
 allLocationsReviewed=false}={}){
 let s=prepared({actor,state,sourceId,round,gmConfirmed});
 requireIt(integer(originMinute,0,1000000000),'Kožní Weather následky vyžadují skutečnou kalendářovou minutu');
 requireIt(Array.isArray(inventory)&&allLocationsReviewed===true,
  'GM musí potvrdit kompletní seznam vystavených míst a aktuální zbroj');
 const hazard=s.environmentalHazards?.find(h=>h.sourceId===sourceId&&h.skinPending);
 requireIt(hazard&&['frostbite','sunburn'].includes(hazard.skinPending),
  'Nevyřešená Frostbite/Sunburn z původního Weather Hazard neexistuje');
 const id='skill-weather-skin:'+sourceId;
 requireIt(!s.events.some(e=>e.id===id),'Kožní následky tohoto Hazard už jsou vyřešeny');
 // Existing Shock does not prevent resolving zero-injury exposed locations.
 // Where an actual injury occurs the original applyConfirmedHit executor
 // validates Carryover, existing Shock and any Extended Shock/Coma itself.
 // The whole collection still commits atomically or not at all.
 const provided=injuriesFromExposure(hazard,{windD20,durationD20,complexion,rows,maximumExposureMinutes});
 const visited=new Set(),wounds=[],skippedAfterKIA=[];
 for(let n=0;n<provided.rows.length;n++){
  const r=provided.rows[n],where=r.location,side=r.side||null;
  requireIt(Object.hasOwn(bodyShock,where),'Neznámá lidská anatomická lokace: '+where);
  requireIt(isLimb.has(where)?['left','right'].includes(side):side===null,'Zadejte správnou stranu končetiny');
  const key=where+':'+(side||'-');requireIt(!visited.has(key),'Jedna lokace smí být uvedena jen jednou');visited.add(key);
  if(hazard.skinPending==='frostbite'){
   const armour=resolveLiveCombatArmour({inventory,targetId:actor.id,location:where,aspect:'f',direction:'front',mode:'auto',rigidStatus:'unknown'});
   requireIt(armour.ready&&armour.armourValue===r.av,
    'Frostbite AV pro '+key+' se musí shodovat s ověřenou skutečnou ochrannou hodnotou; bez toho nelze automaticky potvrdit ránu');
  }
  if(!r.il){requireIt(r.shockD100==null&&r.compoundD10==null,'Bez Injury Level není dovoleno házet Shock/Compound');continue;}
  const thermalAspect=hazard.skinPending==='frostbite'?'frost':'fire';
  const severity=r.il===1?'M':r.il<=3?'S':'G',eventId=id+':location:'+n;
  const existing=s.wounds.filter(w=>!w.healed&&w.location===where&&(!isLimb.has(where)||w.side===side)&&
   compoundCompatible(w,{location:where,aspect:thermalAspect,area:false}));
  requireIt(existing.length?integer(r.compoundD10,1,10):r.compoundD10==null,
   'Při opakované Frost/Fire ráně je povinný skutečný Compound d10; jinak se nehází');
  requireIt(integer(r.shockD100,1,100),'Každá nová kožní rána vyžaduje skutečný Shock d100');
  // Several exposed skin locations belong to one simultaneous weather event.
  // If an earlier location has already produced KIA, the original hit executor
  // correctly refuses any further post-mortem hits.  Do not discard the entire
  // already witnessed incident or silently invent subsequent injuries.  Check
  // every later location/die as before, and preserve its evidence as skipped.
  if(s.shock==='KIA'){
   skippedAfterKIA.push({location:where,side,il:r.il,severity,sourceD10:r.sourceRoll,
    shockD100:r.shockD100,compoundD10:r.compoundD10??null,
    reason:'KIA již vzniklo u dříve vyhodnocené lokace stejného Weather Incident; další zásah nebyl proveden'});
   continue;
  }
  const incoming={id:'wound:'+eventId,location:where,aspect:thermalAspect,area:false,severity,level:r.il};
  const compound=existing.length?compoundInjury({existing,incoming,d10:r.compoundD10}):null;
  const shockIL=compound?.injuryShock??r.il;
  const shockEML=baseSkill(actor,'Shock')-combatFatigueTotals(s).total;
  const shockSL=successLevel(r.shockD100,shockEML);
  const shock=calculateShockState({locationShock:bodyShock[where],injuryShock:shockIL,shockSL});
  const carry=reverse[applyShockState(external[s.shock],shock.state)];
  const draft={ok:true,format:'hmk-combat-event-draft-v1',status:'preview-only',mutatesCharacter:false,
   target:{id:actor.id},location:where,aspect:thermalAspect,proposalId:eventId,
   inputs:{previousState:s.shock,shockLevel:named(shockSL)},
   impactResult:{effectiveImpact:null,strikeImpact:null,baseAV:null,effectiveAV:null,aspect:thermalAspect,
    directInjuryLevel:r.il,source:'HMK p185 direct frostbite/sunburn IL'},
   injuryResult:{kind:'injury',injury:severity+r.il},
   shockResult:{state:reverse[shock.state],injuryShock:shockIL,locationShock:bodyShock[where]},
   carryover:{state:carry}};
  const applied=applyConfirmedHit({state:s,characterId:actor.id,draft,round,eventId,
   adjudication:{gmReviewed:true,bodyKind:'human',compoundReviewed:!!compound,compoundD10:r.compoundD10??null,
    bleeding:false,arrowOrBolt:false,side,timelineId:'skill:'+sourceId,
    injuryOrigin:'travel-weather',weatherSourceId:sourceId,originMinute}});
  s=applied.state;
  const evt=s.events.find(e=>e.id===eventId);evt.details.weatherTrauma={kind:hazard.skinPending,
   sourceId,windD20,durationD20,complexion,location:where,side,
   sourceD10:r.sourceRoll,il:r.il,shockD100:r.shockD100,shockEML,compoundD10:r.compoundD10??null};
  wounds.push({location:where,side,il:r.il,severity,woundId:applied.wound?.id,shock:s.shock});
 }
 const live=s.environmentalHazards.find(h=>h.sourceId===sourceId);
 const skinKind=live.skinPending;live.skinPending=null;live.skinResolved=true;live.skinWounds=wounds.map(x=>x.woundId);
 const report={kind:skinKind,sourceId,windD20,durationD20,complexion,
  periodMinutes:provided.period,durationMinutes:provided.duration,
  ...(maximumExposureMinutes!==null?{episodeMaxExposureMinutes:maximumExposureMinutes,
   ...(skinKind==='frostbite'?{sampledDurationMinutes:provided.sampledDuration}:{referenceWatchMinutes:240})}:{}),
  reviewedLocations:visited.size,wounds,skippedAfterKIA,
  terminalShock:s.shock==='KIA'?'KIA':null,rulePage:185};
 s.events.push({id,type:'skill-weather-skin-complete',round,details:report});s.lastRound=round;
 validateCombatState(s);return {state:s,report};
}
