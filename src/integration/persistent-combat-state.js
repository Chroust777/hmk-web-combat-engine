/** HârnMaster: Roleplaying in the World of Kèthîra, printed pp.168–169, 176–178.
 * Pure, deliberately conservative persistent transitions. No inferred dice,
 * missing special-injury rulings, elapsed turns or unattended blood-loss rolls.
 */
import {SHOCK_STATE,applyShockState,resolveStunnedRecovery,resolveShockReroll} from '../rules/shock.js';
import {bloodLossAdvanceTransition,bloodStoppageResult,BLOOD_LOSS_PERIOD_ROUNDS} from '../rules/bleeding.js';
import {SL,successLevel,effectiveMasteryLevel} from '../rules/tests.js';
import {compoundInjury} from '../rules/injury.js';
import {hmkHumanLocationSymbols,hmkAmputationAssessment,hmkInjuryMishaps,hmkMoraleTransition,hmkMishapTransition} from './injury-special-hmk.js';
import {moraleActionPolicy} from '../rules/morale.js';
import {projectileImpalement} from '../rules/injury-effects.js';
const SHOCK={NONE:SHOCK_STATE.NONE,STN:SHOCK_STATE.STN,INC:SHOCK_STATE.INC,UNC:SHOCK_STATE.UNC,KIA:SHOCK_STATE.KIA};
const REVERSE=Object.fromEntries(Object.entries(SHOCK).map(([k,v])=>[v,k]));
const slValues=new Set([SL.CF,SL.F,SL.S,SL.CS]);
function parsedSL(value){const sl=typeof value==='string'&&Object.prototype.hasOwnProperty.call(SL,value)?SL[value]:value;requireCond(slValues.has(sl),'Neplatný výsledek CF/F/S/CS');return sl;}
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const whole=(n,min=0,max=999999)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
function requireCond(cond,message){if(!cond)throw Error(message);}
const RECHECK_ROUNDS=120; // p169: ten minutes × twelve five-second rounds
const EXTENDED_HOURS=4; // p179: one Course Roll per 4 hours
function pendingShock(state,round,timelineId=null){
 if(!['STN','INC','UNC'].includes(state))return null;
 return {kind:state,originRound:round,timelineId:timelineId??null,dueRound:round+(state==='UNC'?RECHECK_ROUNDS:1),phase:state==='UNC'?'after-ten-minutes':'end-next-turn'};
}
function installShockFollowup(s,{round,timelineId=null}={}){
 s.shockFollowup=pendingShock(s.shock,round,timelineId);
 // A new Shock State does not silently resolve pre-existing Extended Shock/Coma.
}
function fatigueTotalUnsafe(s){return s.fatigue.windedness+s.fatigue.weariness+s.fatigue.otherWeakness+s.bloodLoss.weaknessFatigue;}
function applyShockProne(s){if(['INC','UNC'].includes(s.shock)){s.posture??={prone:false,dropPending:false,passNextTurn:false};s.posture.prone=true;}}

const copy=x=>structuredClone(x);
export function initialCombatState(){return {format:'hmk-persistent-combat-v1',shock:'NONE',bloodLoss:{bp:0,weaknessFatigue:0},fatigue:{windedness:0,weariness:0,otherWeakness:0},wounds:[],events:[],lastRound:0,shockOriginRound:null,shockFollowup:null,extendedShock:null,coma:null,bloodShockPending:false,morale:{state:'steady',psycheStress:0,braveSince:null,braveTimelineId:null},mishaps:[],posture:{prone:false,dropPending:false,passNextTurn:false}};}
export function combatFatigueTotals(state){validateCombatState(state);return {windedness:state.fatigue.windedness,weariness:state.fatigue.weariness,weakness:state.fatigue.otherWeakness+state.bloodLoss.weaknessFatigue,total:state.fatigue.windedness+state.fatigue.weariness+state.fatigue.otherWeakness+state.bloodLoss.weaknessFatigue};}
export function validateCombatState(s){
 requireCond(s&&s.format==='hmk-persistent-combat-v1'&&!Array.isArray(s),'Neznámý formát bojového stavu');
 requireCond(own(SHOCK,s.shock),'Neznámý Shock State');
 requireCond(s.bloodLoss&&whole(s.bloodLoss.bp,0,4)&&s.bloodLoss.weaknessFatigue===s.bloodLoss.bp*5,'Neplatné Blood Loss Points / weakness');
 requireCond(s.bloodShockPending===undefined||typeof s.bloodShockPending==='boolean','Neplatný příznak Blood Shock');
 requireCond(s.fatigue&&['windedness','weariness','otherWeakness'].every(k=>whole(s.fatigue[k],0,99999)),'Neplatný trvalý Fatigue');
 requireCond(Array.isArray(s.wounds)&&s.wounds.length<=1000&&Array.isArray(s.events)&&s.events.length<=5000,'Neplatný seznam ran nebo událostí');
 if(s.morale!==undefined){requireCond(s.morale&&['steady','brave','withdrawing','routed','catatonic'].includes(s.morale.state)&&whole(s.morale.psycheStress,0,99999)&&
  (s.morale.braveSince==null||whole(s.morale.braveSince,1,9999))&&(s.morale.braveTimelineId==null||typeof s.morale.braveTimelineId==='string')&&(s.morale.lastReactionRound==null||whole(s.morale.lastReactionRound,1,9999))&&(s.morale.lastReactionTimelineId==null||typeof s.morale.lastReactionTimelineId==='string'),'Neplatný Morale State');}
 if(s.posture!==undefined){requireCond(s.posture&&['prone','dropPending','passNextTurn'].every(k=>typeof s.posture[k]==='boolean'),'Neplatná evidence Mishap');}
 if(s.mishaps!==undefined){requireCond(Array.isArray(s.mishaps)&&s.mishaps.length<=2000,'Neplatný seznam Injury Mishaps');
  for(const m of s.mishaps)requireCond(m&&typeof m.id==='string'&&typeof m.woundId==='string'&&['fumble-roll','stumble-roll','automatic-fumble','automatic-stumble'].includes(m.kind)&&typeof m.resolved==='boolean','Neplatný Injury Mishap');}

 requireCond(s.encounterTimelineId===undefined||s.encounterTimelineId===null||(typeof s.encounterTimelineId==='string'&&s.encounterTimelineId.length>0&&s.encounterTimelineId.length<=100),'Neplatná identifikace střetnutí');
 requireCond(whole(s.lastRound,0,9999)&&(s.shockOriginRound===null||whole(s.shockOriginRound,1,9999)),'Neplatná časová značka');
 const ids=new Set(),events=new Set();
 for(const w of s.wounds){requireCond(w&&typeof w.id==='string'&&w.id&&!ids.has(w.id)&&typeof w.location==='string'&&w.location&&['M','S','G'].includes(w.severity)&&whole(w.level,1,5)&&typeof w.aspect==='string'&&typeof w.bleeding==='boolean'&&(w.nextAdvanceRound===null||whole(w.nextAdvanceRound,1,9999)),'Poškozená nebo duplicitní rána');ids.add(w.id);requireCond(!w.bleeding||s.shock==='KIA'||whole(w.nextAdvanceRound,1,9999),'Krvácející rána nemá termín Advance');requireCond(w.side===undefined||w.side===null||['left','right'].includes(w.side),'Neplatná strana zraněné končetiny');requireCond(w.shockSL===undefined||w.shockSL===null||['CS','S','F','CF'].includes(w.shockSL),'Neplatný Shock Roll u rány');requireCond(w.timelineId===undefined||w.timelineId===null||(typeof w.timelineId==='string'&&w.timelineId.length>0&&w.timelineId.length<=100),'Neplatná časová osa rány');requireCond(w.minorOnsetGM===undefined||typeof w.minorOnsetGM==='boolean','Neplatné rozhodnutí GM o nástupu impairment');requireCond(w.impaled===undefined||typeof w.impaled==='boolean','Neplatný příznak impalement');requireCond(w.amputation===undefined||w.amputation===null||typeof w.amputation.severed==='boolean','Neplatný stav amputace');requireCond(w.moralePending===undefined||typeof w.moralePending==='boolean','Neplatný závazek Morale po zranění');}
 if(s.shockFollowup!==undefined&&s.shockFollowup!==null){
  const q=s.shockFollowup;
  requireCond(q&&['STN','INC','UNC'].includes(q.kind)&&whole(q.originRound,1,9999)&&whole(q.dueRound,1,9999)
   &&q.dueRound===(q.phase==='after-all-bleeding-stopped'?q.originRound:q.originRound+(q.kind==='UNC'?RECHECK_ROUNDS:1))
   &&(q.timelineId===null||(typeof q.timelineId==='string'&&q.timelineId.length>0&&q.timelineId.length<=100))
   &&(q.phase==='after-all-bleeding-stopped'||q.phase===(q.kind==='UNC'?'after-ten-minutes':'end-next-turn')),'Neplatný plán Shock Recovery');
  requireCond(s.shock===q.kind&&!s.extendedShock,'Shock Recovery neodpovídá aktivnímu stavu');
 }
 if(s.extendedShock!==undefined&&s.extendedShock!==null){
  const x=s.extendedShock;
  requireCond(x&&['INC','UNC'].includes(x.originState)&&s.shock===x.originState&&whole(x.hr,1,5)
   &&whole(x.elapsedHours,0,100000)&&x.elapsedHours%EXTENDED_HOURS===0
   &&s.shockFollowup==null,'Neplatný Extended Shock (HR / časování / stav)');
 }
 if(s.coma!==undefined&&s.coma!==null){
  const c=s.coma;
  requireCond(c&&c.active===true&&whole(c.hr,1,20)&&whole(c.elapsedDays,0,100000)
   &&(c.nextCourseDays===null||whole(c.nextCourseDays,1,10))
   &&(s.extendedShock!==null&&s.extendedShock!==undefined||s.shock==='NONE'), 'Neplatný stav Coma');
 }
 for(const e of s.events){requireCond(e&&typeof e.id==='string'&&e.id&&!events.has(e.id)&&typeof e.type==='string'&&whole(e.round,1,9999),'Neplatná nebo duplicitní bojová událost');events.add(e.id);}
 return s;
}
/** Explicit GM handoff between encounters. The displayed round number is
 * encounter-local, while the persistent character wounds and fatigue survive.
 * No calendar time or bleeding/shock resolution can be silently inferred.
 * HMK World of Kèthîra: p.169, pp.176–179.
 */
export function beginConfirmedEncounter({state,eventId,timelineId,gmConfirmed=false}={}){
 const s=copy(state??initialCombatState());validateCombatState(s);
 requireCond(gmConfirmed===true,'Začátek nového střetnutí musí výslovně potvrdit GM');
 requireCond(typeof timelineId==='string'&&timelineId.length>0&&timelineId.length<=100,'Nové střetnutí potřebuje platné ID časové osy');
 requireCond(s.encounterTimelineId!==timelineId,'Časová osa už byla aktivována; opakovaný začátek střetnutí je zakázán');
 requireCond(typeof eventId==='string'&&eventId.length>0&&!s.events.some(e=>e.id===eventId),'Duplicitní nebo prázdné ID nového střetnutí');
 requireCond(!s.wounds.some(w=>w.bleeding),'Před resetem kol je nutné vyřešit všechna aktivní krvácení a jejich časování');
 requireCond(s.shock==='NONE'&&!s.shockFollowup&&!s.extendedShock&&!s.coma?.active&&!s.bloodShockPending,
  'Před resetem kol musí být vyřešen Shock, Extended Shock, Coma a Blood Shock');
 requireCond(!(s.mishaps??[]).some(m=>!m.resolved)&&!s.wounds.some(w=>w.moralePending),
  'Před novým střetnutím musí být vyřešeny povinné Mishaps a Morale po zranění');
 requireCond(!s.posture?.passNextTurn,'Nevyřízený Pass z minulého tahu musí potvrdit GM před resetem kol');
 const oldRound=s.lastRound,oldTimeline=s.encounterTimelineId??null;
 s.encounterTimelineId=timelineId;s.lastRound=1;
 s.events.push({id:eventId,type:'encounter-start',round:1,details:{timelineId,previousTimelineId:oldTimeline,previousLastRound:oldRound,source:'explicit GM encounter boundary, HMK p169/176–179',noAutomaticTimeAdvance:true}});
 validateCombatState(s);
 return {state:s,started:true,previousLastRound:oldRound};
}
function ready(s,round,id){const n=copy(s??initialCombatState());validateCombatState(n);requireCond(whole(round,1,9999)&&round>=n.lastRound,'Bojovou událost nelze zapsat do minulého kola');requireCond(typeof id==='string'&&id&&!n.events.some(e=>e.id===id),'Událost byla již zpracována');return n;}
/** Fatal state is terminal across ALL pending injury/bleeding/healing streams.
 * Preserve wounds and history; only future rolls cease to be scheduled.
 * HMK World of Kèthîra, pp.168–169,177–179.
 */
function finalizeFatalState(s){
 if(s.shock!=='KIA')return;
 s.shockFollowup=null;s.extendedShock=null;s.coma=null;s.bloodShockPending=false;
 for(const w of s.wounds)w.nextAdvanceRound=null;
}
function record(s,id,type,round,details){finalizeFatalState(s);s.events.push({id,type,round,details});s.lastRound=round;validateCombatState(s);return s;}
export function applyConfirmedHit({state,characterId,draft,round,eventId,adjudication={}}={}){
 const s=ready(state,round,eventId);
 requireCond(draft?.ok===true&&draft.format==='hmk-combat-event-draft-v1'&&draft.status==='preview-only'&&draft.mutatesCharacter===false,'Lze potvrdit jen původní ověřený návrh zásahu');
 requireCond(typeof characterId==='string'&&draft.target?.id===characterId,'Zásah patří jiné postavě');
 requireCond(draft.inputs?.previousState===s.shock,'Předchozí Shock v návrhu nesouhlasí s trvalým stavem; zásah přepočítejte');
 requireCond(s.shock!=='KIA','Mrtvé postavě nelze potvrdit další zásah');
 if(draft.proposalId!==undefined){requireCond(typeof draft.proposalId==='string'&&draft.proposalId&&!s.events.some(e=>e.details?.proposalId===draft.proposalId),'Tentýž návrh zásahu byl již potvrzen');}
 const inj=draft.injuryResult;
 requireCond(inj&&['injury','glancing','none'].includes(inj.kind)&&own(SHOCK,draft.shockResult?.state)&&own(SHOCK,draft.carryover?.state),'Chybí jednoznačné vyhodnocení zranění a Shock');
 const calculated=REVERSE[applyShockState(SHOCK[s.shock],SHOCK[draft.shockResult.state])];
 requireCond(calculated===draft.carryover.state,'Shock Carryover nesouhlasí s pravidly HMK');
 requireCond(!s.extendedShock||calculated===s.shock||calculated==='KIA','Změna Shock State během Extended Shock vyžaduje samostatné potvrzení GM; nelze přepsat léčebný průběh');
 requireCond(adjudication?.gmReviewed===true,'GM musí potvrdit zvláštní podmínky zranění dle HMK str.168');
 const limbLocations=['sh','ua','el','fo','ha','th','kn','ca','ft','shoulder','upper arm','elbow','forearm','hand','thigh','knee','calf','foot'];
 const isLimb=limbLocations.includes(String(draft.location).toLowerCase());
 if(inj.kind==='injury'&&isLimb)requireCond(['left','right'].includes(adjudication.side),'HMK str.167: zásah do končetiny vyžaduje potvrzení strany left/right');
 const sameLoc=s.wounds.filter(w=>w.location.toLowerCase()===String(draft.location).toLowerCase());
 if(inj.kind==='injury'&&isLimb)requireCond(!sameLoc.some(w=>!['left','right'].includes(w.side)),'Před Compound Injury je nutné doplnit stranu starší rány stejné končetiny');
 const existing=sameLoc.filter(w=>!isLimb||w.side===adjudication.side);
 if(inj.kind==='none')requireCond(draft.shockResult.state==='NONE','Zásah bez účinku nemůže vyvolat nový Shock State');
 let compound=null;
 if(inj.kind==='injury'&&existing.length){
  requireCond(adjudication.compoundReviewed===true&&whole(adjudication.compoundD10,1,10),'Opakovaný zásah do stejné lokace vyžaduje Compound Injury d10 (HMK str.168)');
  const baseLevel=Number(String(inj.injury).slice(1));
  compound=compoundInjury({existing:existing.map(w=>({...w,location:draft.location})),incoming:{id:`wound:${eventId}`,location:draft.location,level:baseLevel,severity:String(inj.injury)[0],aspect:draft.aspect},d10:adjudication.compoundD10});
  requireCond(compound.injuryShock===draft.shockResult.injuryShock,'Compound Injury Shock neodpovídá zadanému d10 – upravte náhled zásahu');
 }
 if(inj.kind==='injury'){requireCond(typeof adjudication.bleeding==='boolean','GM musí potvrdit výsledek Bleeding podle Body Location table');requireCond(typeof adjudication.arrowOrBolt==='boolean','GM musí potvrdit, zda zásah způsobil šíp nebo šipka kuše (impalement HMK str.170)');}
 // Human p167 triangle symbols are checked directly against the HMK body diagram.
 const priorCompounded=compound?.compoundedExisting??null;
 const oldPreCompound=priorCompounded?s.wounds.find(w=>w.id===priorCompounded.id):null;
 // If an EXISTING G4 Edge is compounded to G5, that newly sustained
 // G5 is the amputation candidate; do not reroll old pre-existing G5s.
 const ampFromOld=!!(priorCompounded?.level===5&&oldPreCompound?.level===4&&['e','edge'].includes(String(priorCompounded.aspect).toLowerCase()));
 const severityForSpecial=ampFromOld?'G':compound?.injury?.severity??String(inj.injury??'')[0];
 const levelForSpecial=ampFromOld?5:compound?.injury?.level??Number(String(inj.injury??'').slice(1));
 const aspectForSpecial=ampFromOld?priorCompounded.aspect:draft.aspect;
 let amp=null;
 if(inj.kind==='injury'){
  const symbols=hmkHumanLocationSymbols(draft.location);
  requireCond(!!symbols,'Speciální účinky nelze ověřit bez anatomické lokace HMK str.167');
  if(severityForSpecial==='G'&&levelForSpecial===5&&['e','edge'].includes(String(aspectForSpecial).toLowerCase())&&symbols.triangle!==null){
   amp=hmkAmputationAssessment({location:draft.location,aspect:aspectForSpecial,severity:severityForSpecial,level:levelForSpecial,
    strengthML:adjudication.amputationStrengthML,roll:adjudication.amputationRoll,isFolk:adjudication.amputationIsFolk!==false});
   if(amp.forceBleeder&&!ampFromOld)requireCond(adjudication.bleeding===true,'Amputation CF/F: povinný Bleeder podle HMK str.168');
   if(amp.shockTestModifier===-20){
    requireCond(whole(adjudication.shockML,0,200)&&whole(adjudication.shockRoll,1,100),'Amputation S: Shock Roll musí být znovu doložen s postihem −20');
    requireCond(draft.inputs?.shockLevel!==undefined,'Amputation S: chybí Shock SL v původním náhledu');
    const verified=successLevel(adjudication.shockRoll,adjudication.shockML-fatigueTotalUnsafe(s)-20);
    requireCond(verified===parsedSL(draft.inputs.shockLevel),'Amputation S: náhled Shock nesouhlasí s d100 po −20; přepočítejte náhled');
   }
  }
 }
 const wound=inj.kind==='injury'?(()=>{
  requireCond(/^[MSG][1-5]$/.test(inj.injury),'Neplatná závažnost a úroveň zranění');
  const level=Number(inj.injury.slice(1)),severity=inj.injury[0];
  requireCond((level===1&&severity==='M')||([2,3].includes(level)&&severity==='S')||([4,5].includes(level)&&severity==='G'),'Nesouhlasí Severity a Injury Level');
  const fixedLevel=compound?.injury?.level??level;const fixedSeverity=compound?.injury?.severity??severity;
  return {id:`wound:${eventId}`,location:draft.location,severity:fixedSeverity,level:fixedLevel,aspect:draft.aspect,bleeding:adjudication.bleeding,nextAdvanceRound:adjudication.bleeding?round+BLOOD_LOSS_PERIOD_ROUNDS:null,recordedRound:round,originEventId:eventId,compoundReviewed:!!adjudication.compoundReviewed,shockSL:draft.inputs?.shockLevel??null,side:adjudication.side??null,timelineId:adjudication.timelineId??null,amputation:amp&&!ampFromOld?{severed:amp.severed,triangleModifier:amp.triangleModifier,sl:amp.slName,roll:amp.roll,strengthML:amp.strengthML,shockTestModifier:amp.shockTestModifier}:null,moralePending:['S','G'].includes(fixedSeverity),impaled:projectileImpalement({projectile:adjudication.arrowOrBolt===true,severity:fixedSeverity,injuryLevel:fixedLevel})};
 })():null;
 if(wound)requireCond(!s.wounds.some(w=>w.id===wound.id),'Tato rána již byla potvrzena');
 if(compound?.compoundedExisting){
  const prior=s.wounds.find(w=>w.id===compound.compoundedExisting.id);
  requireCond(!!prior,'Nenalezená původní rána Compound Injury');
  const formerSeverity=prior.severity;
  prior.level=compound.compoundedExisting.level;prior.severity=compound.compoundedExisting.severity;
  if(formerSeverity==='M'&&['S','G'].includes(prior.severity))prior.moralePending=true;
  if(prior.severity==='G'&&formerSeverity!=='G'&&calculated!=='KIA'&&!amp?.dead){
   s.mishaps??=[];
   for(const kind of hmkInjuryMishaps(prior.location,'G'))s.mishaps.push({id:`mishap:${eventId}:compound:${kind}`,woundId:prior.id,kind,resolved:false});
  }
  if(ampFromOld&&amp){
   prior.amputation={severed:amp.severed,triangleModifier:amp.triangleModifier,sl:amp.slName,roll:amp.roll,strengthML:amp.strengthML,shockTestModifier:amp.shockTestModifier};
   if(amp.forceBleeder&&!prior.bleeding){prior.bleeding=true;prior.nextAdvanceRound=round+BLOOD_LOSS_PERIOD_ROUNDS;}
  }
 }
 if(wound){if(calculated==='KIA'||amp?.dead)wound.nextAdvanceRound=null;s.wounds.push(wound);}
 if(wound&&calculated!=='KIA'&&!amp?.dead){
  s.mishaps??=[];
  for(const kind of hmkInjuryMishaps(wound.location,wound.severity))s.mishaps.push({id:`mishap:${eventId}:${kind}`,woundId:wound.id,kind,resolved:false});
 }
 const previousShock=s.shock; s.shock=amp?.dead?'KIA':calculated;applyShockProne(s);
 if(s.shock!==previousShock)s.shockOriginRound=round;
 if(s.shock==='KIA'){s.extendedShock=null;s.coma=null;s.shockFollowup=null;for(const w of s.wounds)w.nextAdvanceRound=null;}
 else if(s.shock!==previousShock)installShockFollowup(s,{round,timelineId:adjudication.timelineId??null});
 record(s,eventId,'confirmed-hit',round,{targetId:characterId,location:draft.location,aspect:draft.aspect,kind:inj.kind,injury:inj.injury??null,woundId:wound?.id??null,shock:s.shock,bleeding:wound?.bleeding??false,compound:compound?{d10:adjudication.compoundD10,success:compound.success,affectedId:compound.compoundedInjuryId??null}:null,impact:draft.impactResult?.effectiveImpact??null,proposalId:draft.proposalId??null,amputation:amp?{affectedWoundId:ampFromOld?priorCompounded.id:wound?.id??null,severed:amp.severed,dead:amp.dead,sl:amp.slName,roll:amp.roll,forcedBleeder:amp.forceBleeder,shockTestModifier:amp.shockTestModifier}:null,injuryMishaps:wound?hmkInjuryMishaps(wound.location,wound.severity):[],moralePending:wound?.moralePending??false,impaled:wound?.impaled??false,source:'HMK 161–162, 167–170; verified special consequences'});
 return {state:s,wound};
}
export function dueBloodLoss(state,round){validateCombatState(state);if(state.shock==='KIA')return [];return state.wounds.filter(w=>w.bleeding&&w.nextAdvanceRound!==null&&w.nextAdvanceRound<=round).map(w=>({woundId:w.id,location:w.location,dueRound:w.nextAdvanceRound,overdue:round>w.nextAdvanceRound}));}
export function applyConfirmedBloodLoss({state,round,eventId,woundId,sl}={}){
 const s=ready(state,round,eventId);
 sl=parsedSL(sl);
 requireCond(s.shock!=='KIA','Zemřelá postava už nepokračuje v Blood Loss Advance');
 const wound=s.wounds.find(w=>w.id===woundId);
 requireCond(wound?.bleeding===true&&whole(wound.nextAdvanceRound,1,9999),'Rána není aktivní Bleeder');
 requireCond(round>=wound.nextAdvanceRound,'Blood Loss Advance ještě není splatný');
 const was=s.shock;
 const r=bloodLossAdvanceTransition({bloodLoss:s.bloodLoss,sl,currentShockState:SHOCK[was]});
 requireCond(!s.extendedShock||REVERSE[r.shockState]===was||REVERSE[r.shockState]==='KIA','Změna Shock během Extended Shock vyžaduje zvláštní rozhodnutí GM (BP)');
 s.bloodLoss=r.bloodLoss;s.shock=REVERSE[r.shockState];applyShockProne(s);
 if(r.gainedBP>0&&s.shock!==was&&s.shock!=='KIA')s.bloodShockPending=true;
 if(s.shock==='KIA'){s.extendedShock=null;s.coma=null;s.bloodShockPending=false;for(const w of s.wounds)w.nextAdvanceRound=null;}
 if(was!==s.shock){s.shockOriginRound=round;installShockFollowup(s,{round});}
 // A late GM roll resolves one period only. Never silently advance several periods.
 wound.nextAdvanceRound=s.shock==='KIA'?null:round+BLOOD_LOSS_PERIOD_ROUNDS;
 record(s,eventId,'blood-loss-advance',round,{woundId,sl:Object.keys(SL).find(k=>SL[k]===sl),gainedBP:r.gainedBP,totalBP:s.bloodLoss.bp,shock:s.shock});
 return {state:s,gainedBP:r.gainedBP,dead:r.dead};
}
export function applyConfirmedBloodStoppage({state,round,eventId,woundId,sl,advanceSL=null}={}){
 const s=ready(state,round,eventId);
 sl=parsedSL(sl);if(advanceSL!==null&&advanceSL!=='')advanceSL=parsedSL(advanceSL);
 requireCond(s.shock!=='KIA','KIA nelze léčit tímto bojovým krokem');
 const wound=s.wounds.find(w=>w.id===woundId);
 requireCond(wound?.bleeding===true,'Rána již nekrvácí');
 const previousAttempt=[...s.events].reverse().find(e=>e.type==='blood-stoppage'&&e.details?.woundId===woundId);
 requireCond(!previousAttempt||round>=previousAttempt.round+BLOOD_LOSS_PERIOD_ROUNDS,'Blood Stoppage lze u stejného Bleederu opakovat až po 5 minutách (60 kol)');
 const stop=bloodStoppageResult(sl);
 requireCond(!stop.advanceRoll||slValues.has(advanceSL),'HMK str.178: po CF/F/S je nutný i závěrečný Blood Loss Advance');
 if(stop.advanceRoll){const r=bloodLossAdvanceTransition({bloodLoss:s.bloodLoss,sl:advanceSL,currentShockState:SHOCK[s.shock]});const was=s.shock;requireCond(!s.extendedShock||REVERSE[r.shockState]===was||REVERSE[r.shockState]==='KIA','Změna Shock během Extended Shock vyžaduje zvláštní rozhodnutí GM (BP)');s.bloodLoss=r.bloodLoss;s.shock=REVERSE[r.shockState];applyShockProne(s);if(r.gainedBP>0&&s.shock!==was&&s.shock!=='KIA')s.bloodShockPending=true;if(s.shock==='KIA'){s.extendedShock=null;s.coma=null;s.bloodShockPending=false;for(const w of s.wounds)w.nextAdvanceRound=null;}if(was!==s.shock){s.shockOriginRound=round;installShockFollowup(s,{round});}}
 if(stop.stopped){wound.bleeding=false;wound.nextAdvanceRound=null;wound.staunchBonus=0;}
 else {wound.nextAdvanceRound=s.shock==='KIA'?null:round+BLOOD_LOSS_PERIOD_ROUNDS;wound.staunchBonus=stop.nextStaunchBonus;}
 // p178: once ALL bleeders stop, Blood Shock STN disappears automatically;
 // Blood Shock INC/UNC immediately requires Shock Reroll (not the usual wait).
 if(stop.stopped&&s.bloodShockPending&&s.shock!=='KIA'&&!s.wounds.some(w=>w.bleeding)){
  requireCond(!s.extendedShock,'Blood Shock při Extended Shock vyžaduje pravidlové rozhodnutí GM');
  s.bloodShockPending=false;
  if(s.shock==='STN'){s.shock='NONE';s.shockFollowup=null;s.shockOriginRound=round;}
  else if(['INC','UNC'].includes(s.shock)){
   s.shockFollowup={kind:s.shock,originRound:round,timelineId:null,dueRound:round,phase:'after-all-bleeding-stopped'};
  }
 }

 record(s,eventId,'blood-stoppage',round,{woundId,sl:Object.keys(SL).find(k=>SL[k]===sl),advanceSL:stop.advanceRoll?Object.keys(SL).find(k=>SL[k]===advanceSL):null,stopped:stop.stopped,shock:s.shock,bp:s.bloodLoss.bp,nextStaunchBonus:stop.nextStaunchBonus});
 return {state:s,stopped:stop.stopped,dead:s.shock==='KIA',nextStaunchBonus:stop.nextStaunchBonus};
}
/** p169: a real actor end-of-turn is required for STN/INC; UNC is ten
 * minutes after the original roll. No inferred passage between encounters. */
export function shockFollowupReadiness({state,round,characterId=null,actorId=null,turnEnded=false,timelineId=null,elapsedMinutesSinceOriginal=null}={}){
 validateCombatState(state);
 if(!['STN','INC','UNC'].includes(state.shock))return {due:false,reason:'no-recoverable-shock'};
 if(state.extendedShock)return {due:false,reason:'extended-shock-course-only'};
 const q=state.shockFollowup??null;
 if(!q)return {due:false,reason:'legacy-state-needs-gm-timing-evidence'};
 if(!whole(round,1,9999))return {due:false,reason:'invalid-round'};
 if(q.phase==='after-all-bleeding-stopped'){
  return !state.wounds.some(w=>w.bleeding)&&round>=q.dueRound?{due:true,kind:q.kind,requirement:'after-all-bleeding-stopped'}:{due:false,reason:'bleeding-not-stopped'};
 }
 if(q.kind==='UNC'){
  const sameTimeline=!!q.timelineId&&q.timelineId===timelineId;
  const continuous=sameTimeline&&round>=q.dueRound;
  const verified=!sameTimeline&&Number.isSafeInteger(elapsedMinutesSinceOriginal)&&elapsedMinutesSinceOriginal>=10;
  return continuous||verified?{due:true,kind:'UNC',requirement:'ten-minutes'}:{due:false,reason:'unc-ten-minutes-not-proven'};
 }
 if(round<q.dueRound)return {due:false,reason:'next-turn-not-reached'};
 if(q.timelineId&&q.timelineId!==timelineId)return {due:false,reason:'different-encounter-timeline'};
 if(!characterId||actorId!==characterId||turnEnded!==true)return {due:false,reason:'actor-end-turn-not-confirmed'};
 return {due:true,kind:q.kind,requirement:'end-next-turn'};
}
export function applyConfirmedShockRecovery({state,round,eventId,sl,timingConfirmed=false,characterId=null,actorId=null,turnEnded=false,timelineId=null,elapsedMinutesSinceOriginal=null,comaLocationShock=null,comaInjuryLevel=null,initialComaD10=null,shockML=null,roll=null}={}){
 const s=ready(state,round,eventId);
 requireCond(timingConfirmed===true,'GM musí potvrdit přípustný čas Shock recovery / reroll');
 sl=parsedSL(sl);
 requireCond(['STN','INC','UNC'].includes(s.shock),'Postava nemá zotavitelný Shock State');
 requireCond(!s.extendedShock,'Během Extended Shock se provádějí pouze Course Rolls (HMK str.179)');
 let verifiedRoll=null;
 if(shockML!==null||roll!==null){
  requireCond(whole(shockML,0,200)&&whole(roll,1,100),'Vyžadován platný Shock ML a skutečný d100');
  const fatigue=fatigueTotalUnsafe(s),rawEML=shockML-fatigue-(s.shock==='STN'?0:20);
  const calculated=successLevel(roll,rawEML);
  requireCond(calculated===sl,'Zadané Shock SL nesouhlasí se skutečným d100 a EML podle HMK str.169');
  verifiedRoll={shockML,roll,fatigue,rawEML,effectiveEML:effectiveMasteryLevel(rawEML)};
 }
 requireCond(!(s.bloodLoss.bp>0&&s.wounds.some(w=>w.bleeding)),'Krvácením podmíněný Shock State nelze odstranit před zastavením všech Bleederů (HMK str.178)');
 const q=s.shockFollowup;
 if(q){
  const due=shockFollowupReadiness({state:s,round,characterId,actorId,turnEnded,timelineId,elapsedMinutesSinceOriginal});
  requireCond(due.due,'Není doložen správný okamžik Shock testu: '+due.reason);
 }else requireCond(s.shockOriginRound===null||round>s.shockOriginRound,'Starší Shock nelze potvrdit ve stejném kole jako jeho vznik');
 const before=s.shock;
 if(before==='STN'){
  s.shock=REVERSE[resolveStunnedRecovery(sl)];
  s.shockFollowup=s.shock==='STN'?pendingShock('STN',round,timelineId):null;
 }else{
  const requireComa=before==='UNC'&&sl===SL.CF;
  if(requireComa)requireCond(whole(initialComaD10,1,10)&&whole(comaLocationShock,0,15)&&whole(comaInjuryLevel,1,5)&&12-comaLocationShock-comaInjuryLevel>0,
   'UNC+CF: doložte Location Shock a Injury Level zranění, které vyvolalo Coma');
  const result=resolveShockReroll({state:SHOCK[before],sl,locationShock:comaLocationShock,injuryLevel:comaInjuryLevel});
  s.shock=REVERSE[result.state];applyShockProne(s);
  s.shockFollowup=s.shock==='STN'?pendingShock('STN',round,timelineId):null;
  if(result.extendedShock){
   s.extendedShock={originState:before,hr:result.extendedShock.hr,elapsedHours:0};
   if(requireComa)s.coma={active:true,hr:result.coma.initialHR,elapsedDays:0,nextCourseDays:initialComaD10};
  }
 }
 if(s.shock!==before)s.shockOriginRound=round;
 record(s,eventId,'shock-recovery',round,{before,after:s.shock,sl:Object.keys(SL).find(k=>SL[k]===sl),
  extendedShockHR:s.extendedShock?.hr??null,comaHR:s.coma?.hr??null,
  verifiedRoll,evidence:q?{dueRound:q.dueRound,phase:q.phase,timelineId:q.timelineId,actorId,turnEnded,elapsedMinutesSinceOriginal}:'legacy GM timing confirmed'});
 return {state:s};
}
/** p179: four hours must explicitly elapse per Course Roll. HB×HR minus
 * recorded fatigue; only GM-confirmed Physician SV stars and arcane bonus. */
export function applyExtendedShockCourse({state,round,eventId,healingBase,roll,physicianStars=0,arcaneBonus=0,elapsedHoursSinceOnset=null,gmConfirmed=false}={}){
 const s=ready(state,round,eventId);
 requireCond(gmConfirmed===true,'GM musí potvrdit pravidlové podmínky a čas Extended Shock');
 requireCond(!!s.extendedShock&&['INC','UNC'].includes(s.shock),'Postava není v Extended Shock');
 requireCond(whole(elapsedHoursSinceOnset,4,100000)&&elapsedHoursSinceOnset===s.extendedShock.elapsedHours+EXTENDED_HOURS,'Course Roll musí následovat po doložených 4 hodinách: celkem '+(s.extendedShock.elapsedHours+4)+' h');
 requireCond(whole(healingBase,1,100)&&whole(roll,1,100)&&whole(physicianStars,0,10)&&whole(arcaneBonus,0,100),'Neplatné údaje Healing Base, d100 či bonusů');
 const oldHR=s.extendedShock.hr, fatigue=fatigueTotalUnsafe(s);
 const eml=healingBase*oldHR-fatigue+5*physicianStars+arcaneBonus;
 const sl=successLevel(roll,eml),delta=[-2,-1,1,2][sl];
 const nextHR=oldHR+delta;
 s.extendedShock.elapsedHours=elapsedHoursSinceOnset;
 if(nextHR<=0){s.shock='KIA';s.shockOriginRound=round;s.extendedShock=null;s.shockFollowup=null;s.coma=null;}
 else if(nextHR>=6){s.shock='NONE';s.shockOriginRound=round;s.extendedShock=null;s.shockFollowup=null;}
 else s.extendedShock.hr=nextHR;
 record(s,eventId,'extended-shock-course',round,{oldHR,nextHR,healingBase,fatigue,physicianStars,arcaneBonus,rawEML:eml,eml:effectiveMasteryLevel(eml),roll,sl:Object.keys(SL).find(k=>SL[k]===sl),after:s.shock,comaActive:!!s.coma});
 return {state:s,oldHR,nextHR,rawEML:eml,sl,comaActive:!!s.coma};
}
/** p179: a separate coma course persists after recovery from Extended Shock.
 * The d10 interval for each course is recorded, not silently rolled. */
export function applyComaCourse({state,round,eventId,healingBase,roll,periodD10,daysElapsed,restfulShelter=true,arcaneBonus=0,gmConfirmed=false}={}){
 const s=ready(state,round,eventId);
 requireCond(gmConfirmed===true&&!!s.coma&&s.coma.active,'Chybí potvrzený aktivní Coma Course Roll');
 requireCond(whole(healingBase,1,100)&&whole(roll,1,100)&&whole(periodD10,1,10)&&whole(daysElapsed,1,10000)&&whole(arcaneBonus,0,100),'Neplatné údaje Coma Course Roll');
 requireCond(daysElapsed===s.coma.nextCourseDays,'Musí uplynout přesně předchozí d10denní interval Coma');
 const before=s.coma.hr,fatigue=fatigueTotalUnsafe(s);
 const rawEML=healingBase*before-fatigue+(restfulShelter?0:-20)+arcaneBonus;
 const sl=successLevel(roll,rawEML),hr=before+[-2,-1,1,2][sl];
 const duration=s.coma.elapsedDays+daysElapsed;
 let wearinessAdded=0;
 if(hr<=0){s.shock='KIA';s.shockOriginRound=round;s.coma=null;s.shockFollowup=null;}
 else if(hr>=6){wearinessAdded=Math.floor(duration/5)*5;s.fatigue.weariness+=wearinessAdded;s.coma=null;}
 else {s.coma.hr=hr;s.coma.elapsedDays=duration;s.coma.nextCourseDays=periodD10;}
 record(s,eventId,'coma-course',round,{before,afterHR:hr,daysElapsed,duration,periodD10,healingBase,fatigue,arcaneBonus,restfulShelter,rawEML,roll,sl:Object.keys(SL).find(k=>SL[k]===sl),wearinessAdded,dead:s.shock==='KIA'});
 return {state:s,hr,wearinessAdded};
}
export function applyConfirmedFatigue({state,round,eventId,kind,delta}={}){
 const s=ready(state,round,eventId);
 requireCond(['windedness','weariness','otherWeakness'].includes(kind),'Zvolte druh únavy');
 requireCond(whole(delta,-9999,9999),'Fatigue delta musí být celé číslo');
 requireCond(whole(s.fatigue[kind]+delta,0,99999),'Únava by byla záporná nebo mimo rozsah');
 requireCond(!(s.extendedShock&&delta<0),'Během Extended Shock nelze obnovovat Fatigue (HMK str.179)');
 s.fatigue[kind]+=delta;
 record(s,eventId,'gm-fatigue-adjustment',round,{kind,delta,totalFatigue:s.fatigue.windedness+s.fatigue.weariness+s.fatigue.otherWeakness+s.bloodLoss.weaknessFatigue});
 return {state:s};
}

/** HMK pp.167,170: explicitly reconcile missing historical adjudication only;
 * never change a previously confirmed side or Shock Roll through this helper. */
export function applyConfirmedWoundContext({state,round,eventId,woundId,side=null,shockSL=null,minorOnsetGM=false,gmReviewed=false}={}){
 // Administrative reconciliation may occur in a later encounter whose local round
 // counter restarted. It does not advance (or rewind) combat time for blood loss.
 const s=copy(state??initialCombatState());validateCombatState(s);
 requireCond(whole(round,1,9999)&&typeof eventId==='string'&&eventId&&!s.events.some(e=>e.id===eventId),'Neplatná či duplicitní potvrzovací událost');
 requireCond(gmReviewed===true,'GM musí potvrdit původní hod a určení strany');
 const w=s.wounds.find(row=>row.id===woundId);
 requireCond(!!w,'Rána nebyla nalezena');
 let changed=false;
 const limbs=['sh','ua','el','fo','ha','th','kn','ca','ft','shoulder','upper arm','elbow','forearm','hand','thigh','knee','calf','foot'];
 if(side!==null){
  requireCond(limbs.includes(String(w.location).toLowerCase())&&['left','right'].includes(side),'Strana platí pouze pro zásah do končetiny');
  requireCond(w.side===undefined||w.side===null,'Strana již byla pravidlově potvrzena');
  w.side=side;changed=true;
 }
 if(shockSL!==null){
  requireCond(w.severity==='M'&&['CS','S','F','CF'].includes(shockSL),'Původní Shock Roll se doplňuje jen pro Minor');
  requireCond(w.shockSL===undefined||w.shockSL===null,'Původní Shock Roll již je potvrzen');
  w.shockSL=shockSL;changed=true;
 }
 if(minorOnsetGM===true){requireCond(w.severity==='M'&&!w.minorOnsetGM,'Nástup impairment lze potvrdit jen jednou u Minor');w.minorOnsetGM=true;changed=true;}
 requireCond(changed,'Není co pravidlově doplnit');
 s.events.push({id:eventId,type:'gm-wound-context',round,details:{woundId,side,shockSL,minorOnsetGM,administrativeReconciliation:true,source:'HMK pp.167,170'}});
 validateCombatState(s); // Retain lastRound: a GM context correction is not a new combat turn.
 return {state:s,wound:w};
}

/** HMK p162: one separately rolled Morale test for EACH serious/grievous
 * injury, after Shock Roll and full recovery from any accompanying Shock. */
export function dueInjuryMorale(state){validateCombatState(state);return state.shock==='NONE'&&!state.extendedShock&&!state.coma?.active?
 state.wounds.filter(w=>w.moralePending===true).map(w=>({woundId:w.id,location:w.location,severity:w.severity})) : [];}
export function unresolvedInjuryMishaps(state){validateCombatState(state);return state.shock==='KIA'?[]:(state.mishaps??[]).filter(m=>!m.resolved);}
export function specialActionReadiness(state,{role='attacker',defence='block'}={}){
 validateCombatState(state);
 if(state.shock==='KIA')return {ready:false,reason:'KIA: postava je mrtvá'};
 const pendingMishaps=unresolvedInjuryMishaps(state);
 const pendingMorale=dueInjuryMorale(state);
 if(pendingMishaps.length)return {ready:false,reason:'Nejdříve vyhodnoťte bezprostřední Injury Mishap podle HMK str.170'};
 if(pendingMorale.length)return {ready:false,reason:'Po zotavení ze Shock je splatný povinný Morale Roll (HMK str.162)'};
 const morale=state.morale?.state??'steady';
 const policy=moraleActionPolicy(morale);
 if(policy.action==='none')return {ready:false,reason:'Catatonic: postava nemůže jednat ani se bránit'};
 if(role==='attacker'&&policy.action!=='any')return {ready:false,reason:'Morale '+morale+': útok není dovolen'};
 if(role==='defender'&&state.posture?.dropPending&&['block','counterstrike'].includes(defence))return {ready:false,reason:'Fumble: upuštěná výzbroj nelze použít k aktivní obraně'};
 if(role==='defender'&&defence!=='ignore'&&morale==='routed')return {ready:false,reason:'Routed: musí prchat nebo Pass; GM musí vyhodnotit obranu'};
 if(role==='attacker'&&state.posture?.passNextTurn)return {ready:false,reason:'Mishap: postava musí další tah Pass'};
 if(role==='attacker'&&state.posture?.dropPending)return {ready:false,reason:'Fumble: upuštěný předmět – GM musí potvrdit stav vybavení před útokem'};
 return {ready:true,reason:null,posture:state.posture??null,morale};
}
export function applyConfirmedInjuryMishap({state,round,eventId,mishapId,baseML=null,roll=null,hasDEX=true,actionUsesDEX=true,hasLegs=true,gmConfirmed=false}={}){
 const s=ready(state,round,eventId);requireCond(s.shock!=='KIA','KIA: postavě nelze přidat další bojovou akci');
 requireCond(gmConfirmed===true,'GM musí potvrdit vyhodnocení Injury Mishap');
 const m=(s.mishaps??[]).find(x=>x.id===mishapId);
 requireCond(m&&!m.resolved,'Mishap nenalezen nebo již vyhodnocen');
 const r=hmkMishapTransition({kind:m.kind,baseML,roll,hasDEX,actionUsesDEX,hasLegs});
 m.resolved=true;m.result=r;
 s.posture??={prone:false,dropPending:false,passNextTurn:false};
 if(r.effect==='prone')s.posture.prone=true;
 if(r.effect==='drop-item')s.posture.dropPending=true;
 if(r.effect==='pass-next-turn')s.posture.passNextTurn=true;
 record(s,eventId,'injury-mishap',round,{mishapId,woundId:m.woundId,...r});
 return {state:s,result:r};
}
export function applyConfirmedInjuryMorale({state,round,eventId,woundId,initiativeML,roll,aberrance=0,timelineId=null,gmConfirmed=false}={}){
 const s=ready(state,round,eventId);requireCond(s.shock!=='KIA','KIA: postavě nelze přidat další bojovou akci');
 requireCond(gmConfirmed===true,'GM musí potvrdit Morale Roll');
 requireCond(s.shock==='NONE'&&!s.extendedShock&&!s.coma?.active,'Morale z rány následuje až po plném zotavení ze Shock');
 const w=s.wounds.find(x=>x.id===woundId&&x.moralePending===true);
 requireCond(!!w,'Žádný splatný Morale Roll pro tuto ránu');
 s.morale??={state:'steady',psycheStress:0,braveSince:null,braveTimelineId:null};
 const r=hmkMoraleTransition({initiativeML,fatigue:fatigueTotalUnsafe(s),aberrance,brave:s.morale.state==='brave',roll,current:s.morale.state});
 w.moralePending=false;
 s.morale.state=r.state;
 s.morale.psycheStress+=r.result.psycheStress;
 if(r.state==='brave'&&r.result.state==='brave'){s.morale.braveSince=round;s.morale.braveTimelineId=timelineId??null;}
 record(s,eventId,'injury-morale',round,{woundId,severity:w.severity,initiativeML,roll,aberrance,fatigue:fatigueTotalUnsafe(s),...r});
 return {state:s,result:r};
}
/** GM-confirmed physical aftermath or reaction (p161–162); not a free morale cure. */
export function applyConfirmedSpecialAftermath({state,round,eventId,kind,gmConfirmed=false,actualEndOfTurn=false,threatened=false,meleeML=null,meleeRoll=null}={}){
 const s=ready(state,round,eventId);requireCond(s.shock!=='KIA','KIA: postavě nelze přidat další bojovou akci');requireCond(gmConfirmed===true,'GM musí potvrdit pravidlové podmínky odstranění následku');
 s.posture??={prone:false,dropPending:false,passNextTurn:false};
 if(kind==='stand')requireCond(s.posture.prone,'Postava neleží');
 else if(kind==='retrieve-item'){
  requireCond(s.posture.dropPending,'Není evidován upuštěný předmět');
  if(threatened)requireCond(whole(meleeML,0,200)&&whole(meleeRoll,1,100),'Grope pod hrozbou vyžaduje skutečný Melee d100');
 }
 else if(kind==='pass-next-turn')requireCond(s.posture.passNextTurn&&actualEndOfTurn,'Nutný skutečný konec následujícího tahu');
 else throw Error('Neznámý následek Mishap');
 if(kind==='stand')s.posture.prone=false;
 if(kind==='retrieve-item'&&(!threatened||successLevel(meleeRoll,meleeML)>=SL.S))s.posture.dropPending=false;
 if(kind==='pass-next-turn')s.posture.passNextTurn=false;
 record(s,eventId,'special-aftermath',round,{kind,actualEndOfTurn,threatened,meleeML:threatened?meleeML:null,meleeRoll:threatened?meleeRoll:null,retrieved:kind==='retrieve-item'?!s.posture.dropPending:null});return {state:s};
}
/** HMK pp.159,162: Reaction is an actual Initiative test, not a free
 * state toggle. Catatonic tests at own end-turn; Routed after five minutes
 * safe/out of LOS; Withdrawing after one minute unthreatened. */
export function applyConfirmedMoraleReaction({state,round,eventId,characterId=null,actorId=null,turnEnded=false,initiativeML,roll,elapsedSafeMinutes=null,safeOutOfLOS=false,unthreatened=false,timelineId=null,gmConfirmed=false}={}){
 const s=ready(state,round,eventId);requireCond(s.shock!=='KIA','KIA: postavě nelze přidat další bojovou akci');requireCond(gmConfirmed===true,'GM musí potvrdit skutečný okamžik Reaction Roll');
 s.morale??={state:'steady',psycheStress:0,braveSince:null,braveTimelineId:null};
 const before=s.morale.state;
 requireCond(['catatonic','routed','withdrawing'].includes(before),'Postava nemá Morale Reaction Roll');
 if(before==='catatonic')requireCond(!!characterId&&actorId===characterId&&turnEnded===true,'Catatonic Reaction je na konci vlastního tahu');
 if(s.morale.lastReactionRound!=null&&timelineId&&s.morale.lastReactionTimelineId===timelineId){
  const needed=before==='routed'?60:before==='withdrawing'?12:1;
  requireCond(round>=s.morale.lastReactionRound+needed,'Další Morale Reaction ještě není časově splatný');
 }
 if(before==='routed')requireCond(safeOutOfLOS===true&&whole(elapsedSafeMinutes,5,100000),'Routed: vyžaduje 5 minut bezpečí mimo dohled protivníka');
 if(before==='withdrawing')requireCond(unthreatened===true&&whole(elapsedSafeMinutes,1,100000),'Withdrawing: vyžaduje jednu minutu bez ohrožení');
 requireCond(whole(initiativeML,0,200)&&whole(roll,1,100),'Reaction Roll vyžaduje skutečný Initiative ML a d100');
 const fatigue=fatigueTotalUnsafe(s),rawEML=initiativeML-fatigue;
 const sl=successLevel(roll,rawEML),success=sl>=SL.S;
 if(success)s.morale.state=before==='catatonic'?'routed':'steady';
 s.morale.lastReactionRound=round;s.morale.lastReactionTimelineId=timelineId??null;
 record(s,eventId,'morale-reaction',round,{before,after:s.morale.state,initiativeML,fatigue,rawEML,roll,sl:Object.keys(SL).find(k=>SL[k]===sl),elapsedSafeMinutes,safeOutOfLOS,unthreatened,actorId,turnEnded});
 return {state:s,success};
}
/** The Brave +20 lasts five minutes (p162). Do not infer elapsed time when
 * a new encounter restarts its local round counter. */
export function applyConfirmedBraveExpiry({state,round,eventId,gmConfirmed=false,elapsedMinutes=null,timelineId=null}={}){
 const s=ready(state,round,eventId);requireCond(s.shock!=='KIA','KIA: postavě nelze přidat další bojovou akci');requireCond(gmConfirmed===true,'GM musí potvrdit konec pětiminutového Brave bonusu');
 requireCond(s.morale?.state==='brave'&&s.morale.braveSince!=null,'Postava nemá aktivní Brave bonus');
 const continuous=!!timelineId&&timelineId===s.morale.braveTimelineId&&round>=s.morale.braveSince+60;
 requireCond(continuous||whole(elapsedMinutes,5,100000),'Brave trvá pět minut; časový přechod musí být doložen');
 s.morale.state='steady';s.morale.braveSince=null;s.morale.braveTimelineId=null;
 record(s,eventId,'morale-brave-expired',round,{elapsedMinutes,timelineId,continuous});return {state:s};
}
