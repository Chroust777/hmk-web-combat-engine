/** HMK v1.2 pp.86, 183 and 182. Confirmed, source-linked skill aftermath.
 * Never substitute an ordinary Swimming EML for the special wet ENC calculation.
 * No dice are rolled in the pure reducer and no original result is rewritten.
 */
import {resolveCombatantLoad} from './combatant-load.js';
import {availableMasteries} from './hmk-skill-test-engine.js';
import {validateCombatState,combatFatigueTotals} from './persistent-combat-state.js';
import {asphyxiaCapacity,asphyxiaDeathCountdown,asphyxiaAfterRelease} from '../rules/ailments.js';
import {successLevel,successValue,SL,indexOf} from '../rules/tests.js';
import {applyAggravationShockSR,aggravationChecksForAction} from '../rules/healing.js';
const req=(yes,reason)=>{if(!yes)throw Error(reason)};
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const outcomes=['CF','F','S','CS'];
const seas={inland:[0,-1,-2,-3,-4],near:[0,-1,-3,-4,-6],mid:[0,-1,-4,-6,-8],far:[0,-1,-6,-8,-8]};
const skillML=(actor,name)=>{const xs=actor?.hmk?.skills??[];
 const entry=xs.find(x=>String(x.name).toLowerCase()===name.toLowerCase())??availableMasteries(actor).find(x=>String(x.name).toLowerCase()===name.toLowerCase());
 if(entry&&integer(entry.ml,1,1000))return entry.ml;
 const labels={will:'wil',endurance:'end'};
 const val=actor?.hmk?.attributes?.[labels[name.toLowerCase()]];
 req(integer(val,1,200),'Chybí živé ML '+name+' cílové postavy');return val*5;};
function base(state,actor,sourceId,round,kind,gmConfirmed){
 req(gmConfirmed===true&&actor?.id&&typeof sourceId==='string'&&sourceId&&state&&integer(round,1,9999),
 'Doložte postavu, zdroj uloženého testu, kolo a potvrzení GM');
 validateCombatState(state);
 req(round>=state.lastRound,'Není dovoleno zapisovat následek do minulého kola');
 req(state.shock!=='KIA','Nelze měnit následky mrtvé postavy');
 const id=`skill-${kind}:${sourceId}`;
 req(!state.events.some(e=>e.id===id),'Tento následek už je trvale zapsán');
 return {id,state:structuredClone(state)};
}
const append=(s,id,round,type,details)=>{s.events.push({id,type,round,details});s.lastRound=round;validateCombatState(s);return s};
/** Re-evaluates the *same original physical d100* using the p.86 swimming ENC.
 * Clothing allowance is an explicit witnessed choice: no undocumented wet mass is guessed.
 * All other original modifiers remain, using its recorded unclamped rawEML.
 */
export function previewSwimmingDanger({actor,inventory,original,water='inland',windForce=0,soakedClothingENC=null}={}){
 req(actor?.id&&Array.isArray(inventory)&&original&&integer(original.roll,1,100)&&
  integer(original.rawEML,-1000,1000)&&integer(original.ml,1,1000),'Chybí původní fyzický Swimming d100 a raw EML');
 req(Object.hasOwn(seas,water)&&integer(windForce,0,4),'Neznámá voda nebo vítr');
 req([0,10,20].includes(soakedClothingENC),'GM musí doložit zvláštní ENC mokrého oděvu 0 / 10 / 20');
 const load=resolveCombatantLoad({character:actor,inventory});
 req(load.encReady&&load.bulkReady&&load.ready&&!load.prohibitedOutfit&&Number.isInteger(load.baseENC)&&
  Number.isInteger(load.modifiedENC),'Pro Swimming nelze určit přesné ENC: ověřte vrstvy a váhu');
 const swimmerENC=Math.max(0,load.baseENC*4+soakedClothingENC+load.strengthModifier);
 const swimRawEML=original.rawEML+load.modifiedENC-swimmerENC;
 // p.86: Swimming EML below zero means automatic sinking, even without a d100.
 const automaticSink=swimRawEML<0;
 const sl=automaticSink?null:successLevel(original.roll,swimRawEML);
 const actualSV=automaticSink?null:successValue({ml:original.ml,sl,extra:original.svExtra??0});
 const adjustedSV=automaticSink?null:actualSV+seas[water][windForce];
 return {sourcePage:86,swimRawEML,ordinaryRawEML:original.rawEML,ordinaryENC:load.modifiedENC,
  swimmingENC:swimmerENC,baseENC:load.baseENC,soakedClothingENC,water,windForce,
  actualSV,adjustedSV,level:sl===null?'automatic-sink':outcomes[sl],automaticSink,
  sinks:automaticSink||adjustedSV<0,treads:!automaticSink&&adjustedSV===0,
  swimFeet:automaticSink||adjustedSV<=0?0:adjustedSV>=10?300:[0,80,100,120,140,160,180,200,230,260][adjustedSV]};
}
/** An observed submerged/rescue interval must close before committing. More than
 * 5-second rounds of capacity requires actual Will d100, and the lethal grace
 * period requires the *real* death d10. Never automatically invent drowning.
 */
export function prepareSwimmingConsequence({actor,inventory,state,sourceId,round=1,original,water,windForce,
 soakedClothingENC,roundsWithoutAir=0,rescued=true,willD100=null,deathD10=null,
 enduranceD100=null,gmConfirmed=false}={}){
 const {id,state:s}=base(state,actor,sourceId,round,'swimming',gmConfirmed);
 const swim=previewSwimmingDanger({actor,inventory,original,water,windForce,soakedClothingENC});
 req(integer(roundsWithoutAir,0,20000),'Doba bez vzduchu musí být doložena v pětisekundových kolech');
 req(rescued===true||rescued===false,'Doložte, zda postava získala přístup ke vzduchu');
 let winded=0,capacity=null,deathAfter=null,recovery=null,will=null,asphyxia='none';
 if(swim.sinks)req(s.shock==='NONE'&&!s.extendedShock&&!s.coma?.active,'Aktivní Shock/Coma vyžaduje samostatnou autoritativní proceduru; nelze jej přepsat Asphyxia');
 if(!swim.sinks){req(roundsWithoutAir===0&&willD100===null&&deathD10===null&&enduranceD100===null,
  'Bez potopení nelze vytvářet umělý interval bez vzduchu');}
 else{
  req(integer(willD100,1,100),'Potopení vyžaduje původní Will SV d100 pro délku zadržení dechu');
  const ml=skillML(actor,'Will'),eml=ml-combatFatigueTotals(s).total;
  const sl=successLevel(willD100,eml);
  will={ml,eml,roll:willD100,level:outcomes[sl],sv:successValue({ml,sl})};
  const end=actor.hmk?.attributes?.end;
  req(integer(end,1,200),'Chybí Endurance atribut pro Asphyxia');
  capacity=asphyxiaCapacity({endurance:end,willSV:will.sv,swimmingML:skillML(actor,'Swimming')}).maximumRounds;
  capacity=Math.max(0,capacity);
  winded=roundsWithoutAir>capacity/2?5:0;
  if(roundsWithoutAir>capacity){
   req(integer(deathD10,1,10),'Po vyčerpání dechu je povinný skutečný d10 pro smrtelnou lhůtu');
   deathAfter=capacity+asphyxiaDeathCountdown({endurance:end,d10:deathD10});
   if(roundsWithoutAir>=deathAfter){
    asphyxia='dead';s.shock='KIA';s.shockFollowup=null;s.extendedShock=null;s.coma=null;
    for(const w of s.wounds)w.nextAdvanceRound=null;
   }else{
    req(rescued===true,'Submersion dosud pokračuje. Neuzavírejte událost jako zachráněnou.');
    req(integer(enduranceD100,1,100),'Zachráněný bezvědomý potřebuje následný Endurance d100');
    const endEML=end*5-combatFatigueTotals(s).total;
    const rsl=successLevel(enduranceD100,endEML),level=outcomes[rsl];
    // p.183: use p.169 Shock Reroll table WITHOUT the standard −20 penalty.
    // CF coma has a location/injury-based initial HR, which drowning itself
    // does not specify; it must not be manufactured as a valid closed state.
    if(rsl===SL.CF)throw Error('Endurance CF po utonutí: podle str.169 následuje Coma; bez určeného počátečního Coma HR nelze bezpečně uzavřít stav. Vyžaduje samostatný GM postup.');
    recovery={roll:enduranceD100,eml:endEML,level};
    if(rsl===SL.CS){asphyxia='recovered';}
    else if(rsl===SL.S){asphyxia='stunned';s.shock='STN';s.shockOriginRound=round;
     s.shockFollowup={kind:'STN',originRound:round,dueRound:round+1,phase:'end-next-turn',timelineId:null};}
    else{asphyxia='extended-shock';s.shock='UNC';s.shockOriginRound=round;s.posture.prone=true;
     s.shockFollowup=null;s.extendedShock={originState:'UNC',hr:5,elapsedHours:0};}
   }
  }else{
   req(deathD10===null&&enduranceD100===null,'Před vyčerpáním dechu nenastává Death Countdown ani END test');
   req(rescued===true,'Potopení stále pokračuje; nelze uzavřít bez skutečného vynoření');
   asphyxia='rescued-conscious';
  }
 }
 if(winded)s.fatigue.windedness+=winded;
 const report={swim,asphyxia,roundsWithoutAir,capacity,deathAfter,will,recovery,windednessAdded:winded,
  proof:{originalRoll:original.roll,willD100,deathD10,enduranceD100},rulePages:[86,183,169]};
 return {state:append(s,id,round,'skill-swimming-consequence',{sourceId,...report}),report};
}
/** p.182 OPTIONAL: every affected serious/grievous injury earns an independently
 * rolled Shock SR on CF. Untreated reductions survive later treatment.
 */
export function prepareSeriousInjuryAggravation({actor,state,sourceId,round=1,originalSL,
 woundRolls=[],ruleEnabled=false,gmConfirmed=false}={}){
 const {id,state:s}=base(state,actor,sourceId,round,'aggravation',gmConfirmed);
 req(ruleEnabled===true&&originalSL==='CF','Toto je volitelné pravidlo jen pro CF / vynucené kritické použití rány');
 req(Array.isArray(woundRolls)&&woundRolls.length>0&&woundRolls.length<=20,
  'Uveďte každou prokazatelně použitou vážnou/grievous ránu');
 const ids=new Set(),shock=skillML(actor,'Shock'),fatigue=combatFatigueTotals(s).total;
 const tn=indexOf(shock); // HMK p.176: Secondary Rolls do NOT take fatigue penalties.
 const consequences=[];
 for(const entry of woundRolls){
  req(entry&&typeof entry.woundId==='string'&&!ids.has(entry.woundId)&&integer(entry.d10,1,10),
   'Každá dotčená rána musí mít vlastní jedinečný skutečný Shock d10');
  ids.add(entry.woundId);
  const w=s.wounds.find(x=>x.id===entry.woundId&&!x.healed);
  req(w&&['S','G'].includes(w.severity),'Aggravation platí pouze pro živé S/G zranění');
  const valid=aggravationChecksForAction({enabled:true,testSL:SL.CF,
   seriousInjuryIdsUsed:w.severity==='S'?[w.id]:[],grievousInjuryIdsPlausible:w.severity==='G'?[w.id]:[]});
  req(valid.length===1,'Rána nespadá do potvrzené Aggravation procedury');
  const passed=entry.d10<=tn;
  const h=w.healing??{},oldHR=h.healingRate??null;
  const effect=applyAggravationShockSR({healingRate:oldHR,shockSRSuccess:passed,
   untreated:oldHR===null,carriedReduction:w.aggravationUntreatedReduction??0});
  if(!passed){if(oldHR===null)w.aggravationUntreatedReduction=effect.carriedReduction;
   else {w.healing.healingRate=effect.healingRate;}}
  consequences.push({woundId:w.id,d10:entry.d10,tn,passed,oldHR,newHR:effect.healingRate,
   carriedReduction:w.aggravationUntreatedReduction??0});
 }
 return {state:append(s,id,round,'skill-serious-injury-aggravation',{sourceId,rulePage:182,shockML:shock,fatigue,consequences}),
  report:{consequences,tn,shockML:shock}};
}
