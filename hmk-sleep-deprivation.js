/** HMK v1.2 pp.62,176,186,188: one confirmed 24-hour sleepless period.
 * A pure transition, never infers elapsed time, dice, rest, or Psyche traits.
 * PSY derived from sleep-loss is committed as a pending character trait by
 * the caller in the same transaction; it is not manifested before p.188.
 */
import {indexOf,secondaryRoll} from '../rules/tests.js';
import {sleepDeprivationAccrual,sleepDeprivationPsyche} from '../rules/ailments.js';
import {validateCombatState} from './persistent-combat-state.js';
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const whole=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export function prepareSleeplessDay({actor,state,episodeId,hoursAwake,enduranceD10,round=1,gmConfirmed=false}={}){
 check(gmConfirmed===true&&typeof episodeId==='string'&&episodeId.trim().length>=3&&episodeId.trim().length<=120,
  'Sleep Deprivation: GM musí potvrdit skutečný den a jednoznačnou epizodu');
 check(whole(hoursAwake,24,2400)&&whole(enduranceD10,1,10)&&whole(round,1,9999),
  'Sleep Deprivation: požadováno 24 hodin beze spánku a skutečný Endurance SR d10');
 const end=actor?.hmk?.attributes?.end;
 check(actor?.id&&whole(end,1,99),'Sleep Deprivation: chybí doložené END postavy');
 const s=structuredClone(state);validateCombatState(s);
 check(s.shock!=='KIA'&&round>=s.lastRound,'Sleep Deprivation: mrtvá postava nebo vrácení kola');
 const id='sleep-deprivation:'+episodeId.trim();
 const p=s.sleepDeprivation;
 const active=p?.status==='awake';
 check(!active||p.id===id,'Sleep Deprivation: jiná aktivní epizoda, nejprve potvrďte spánek');
 check(!p||active||p.status==='slept','Sleep Deprivation: neznámý stav epizody');
 const previousSource=p?.id+':day:'+p?.hoursAwake;
 const linkedPsyche=!!p?.psychePending && (actor.hmk?.arcane?.psycheTraumas||[]).some(t=>t.sourceEventIds?.includes(previousSource));
 check(!p||!p.psychePending||linkedPsyche,'Sleep Deprivation: nové PSY musí nejdříve dostat Trait a následnou proceduru');
 check(!active||s.fatigue.weariness>=p.activeWeariness,
  'Sleep Deprivation: mezitím se změnila Weariness; další období vyžaduje dořešení ostatního odpočinku GM');
 check(active||!p||p.id!==id,'Sleep Deprivation: pro nový den po spánku použijte nový jednoznačný klíč epizody');
 const elapsed=active?p.hoursAwake:0;
 check(hoursAwake===elapsed+24,'Sleep Deprivation: další přesné období je '+(elapsed+24)+' hodin, nelze přeskočit nebo opakovat den');
 const srTN=indexOf(end*5),srSuccess=secondaryRoll(enduranceD10,srTN);
 const added=sleepDeprivationAccrual({enduranceSRSuccess:srSuccess}).wearinessFatigue;
 const accrued=(active?p.totalAccrued:0)+added;
 const stressTotal=sleepDeprivationPsyche({sleepDeprivationFatigue:accrued}).psycheLevels;
 const psycheAdded=stressTotal-(active?p.psycheLevelsAccrued:0);
 check(psycheAdded>=0&&psycheAdded<=1,'Sleep Deprivation: nezachycené předchozí psychické trauma');
 check(s.fatigue.weariness+added<=99999&&s.morale.psycheStress+psycheAdded<=99999,'Překročení dovoleného stavu únavy/PSY');
 check(!psycheAdded||(!actor.hmk?.arcane?.pendingPsycheTraitChoice),
  'Sleep Deprivation: existuje dřívější nevyřešená volba Psyche Traitu');
 const proofId=id+':day:'+hoursAwake;
 check(!s.events.some(x=>x.id===proofId),'Sleep Deprivation: stejný den je již doložen');
 s.fatigue.weariness+=added;
 s.morale.psycheStress+=psycheAdded;
 s.sleepDeprivation={id,episodeId:episodeId.trim(),status:'awake',hoursAwake,
  totalAccrued:accrued,activeWeariness:(active?p.activeWeariness:0)+added,
  restRecords:active?[...(p.restRecords??[])]:[],
  psycheLevelsAccrued:stressTotal,psychePending:psycheAdded>0};
 const report={episodeId:episodeId.trim(),hoursAwake,enduranceD10,enduranceSR_TN:srTN,
  enduranceSRSuccess:srSuccess,wearinessAdded:added,totalSleepWearinessAccrued:accrued,
  psycheAdded,psycheChoicePending:psycheAdded>0,sourceEventId:proofId,sourcePages:[62,176,186,188]};
 s.events.push({id:proofId,type:'hmk-sleep-deprivation-day',round,details:report});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report};
}

/** HMK p.176: confirmed eight hours of actual sleep reduces weariness by 15.
 * Only safely attribute recovery if ALL current weariness is proven to come
 * from this single sleepless episode. External fatigue needs a GM-reviewed
 * split rather than an invented allocation. PSY persists independently.
 */
export function prepareSleeplessNight({actor,state,episodeId,sleepHours,round=1,gmConfirmed=false}={}){
 check(gmConfirmed===true&&sleepHours===8&&whole(round,1,9999),
  'Sleep Deprivation: dokončení vyžaduje GM potvrzených osm hodin skutečného spánku');
 const s=structuredClone(state);validateCombatState(s);
 const p=s.sleepDeprivation;
 check(actor?.id&&p?.status==='awake'&&p.episodeId===episodeId,
  'Sleep Deprivation: chybí otevřená epizoda této postavy');
 check(s.shock!=='KIA'&&round>=s.lastRound,'Sleep Deprivation: neplatné kolo nebo mrtvá postava');
 check(s.fatigue.weariness===p.activeWeariness,
  'Sleep Deprivation: souběžná Weariness z dalších zdrojů nemá doložené rozdělení; spánek vyhodnoťte GM zvlášť');
 const id=p.id+':sleep';check(!s.events.some(e=>e.id===id),'Sleep Deprivation: spánek již byl zapsán');
 const remove=Math.min(s.fatigue.weariness,15);
 s.fatigue.weariness-=remove;
 p.activeWeariness-=remove;
 p.status='slept';
 const report={episodeId,sleepHours,wearinessRemoved:remove,wearinessRemaining:s.fatigue.weariness,
  psycheLevelsUnchanged:p.psycheLevelsAccrued,psycheChoicePending:p.psychePending,sourcePages:[176,186,188]};
 s.events.push({id,type:'hmk-sleep-deprivation-sleep',round,details:report});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report};
}

/** HMK p.176: precisely four GM-attested hours of rest restore 5 Weariness,
 * at most once per in-game day, separately from the eight-hour sleep.
 * This transition never advances the campaign clock or attributes other fatigue.
 * Ambiguous rest crossing midnight requires a GM ruling outside the automatic
 * branch. No PSY reduction and no episode closure are implied.
 */
export function prepareSleeplessFourHourRest({actor,state,episodeId,startMinute,endMinute,
 round=1,gmConfirmed=false}={}){
 check(gmConfirmed===true&&whole(round,1,9999),
  'Sleep Deprivation: GM musí potvrdit skutečně dokončené čtyři hodiny odpočinku');
 check(whole(startMinute,0,1000000000)&&whole(endMinute,0,1000000000)&&
  endMinute-startMinute===240,
  'Sleep Deprivation: doložte přesně 240 minut odpočinku podle kalendáře kampaně');
 const dayIndex=Math.floor(startMinute/1440);
 check(dayIndex===Math.floor(endMinute/1440),
  'Sleep Deprivation: odpočinek přes půlnoc vyžaduje samostatné rozhodnutí GM');
 const s=structuredClone(state);validateCombatState(s);
 const p=s.sleepDeprivation;
 check(actor?.id&&p?.status==='awake'&&p.episodeId===episodeId,
  'Sleep Deprivation: není otevřená odpovídající epizoda');
 check(s.shock!=='KIA'&&round>=s.lastRound,'Sleep Deprivation: neplatné kolo nebo mrtvá postava');
 check(s.fatigue.weariness===p.activeWeariness,
  'Sleep Deprivation: souběžná Weariness z jiných zdrojů není pro bezpečné automatické odečtení rozlišena');
 check(p.activeWeariness>0,'Sleep Deprivation: v této epizodě není co obnovovat');
 check(!p.restRecords?.some(r=>r.dayIndex===dayIndex),
  'Sleep Deprivation: čtyřhodinový odpočinek už byl v tomto herním dni započten');
 check(!s.events.some(e=>e.type==='hmk-sleep-deprivation-rest'&&e.details?.dayIndex===dayIndex),
  'Sleep Deprivation: čtyřhodinový odpočinek už byl v tomto dni zapsán i z předchozí epizody');
 check(!p.restRecords?.length||startMinute>=p.restRecords.at(-1).endMinute,
  'Sleep Deprivation: čas odpočinku nesmí předcházet staršímu záznamu');
 const id=p.id+':rest:'+dayIndex;
 check(!s.events.some(e=>e.id===id),'Sleep Deprivation: duplicitní odpočinek v tomto dni');
 const removed=Math.min(p.activeWeariness,5);
 p.activeWeariness-=removed;
 s.fatigue.weariness-=removed;
 p.restRecords??=[];
 p.restRecords.push({dayIndex,startMinute,endMinute,amount:removed});
 const report={episodeId,sourceEventId:id,dayIndex,startMinute,endMinute,
  restHours:4,wearinessRemoved:removed,wearinessRemaining:s.fatigue.weariness,
  psycheLevelsUnchanged:p.psycheLevelsAccrued,sourcePages:[176,186]};
 s.events.push({id,type:'hmk-sleep-deprivation-rest',round,details:report});
 s.lastRound=round;validateCombatState(s);
 return {state:s,report};
}
