/** HârnMaster: Roleplaying in the World of Kèthîra, printed pp.168–169, 176–178.
 * Pure, deliberately conservative persistent transitions. No inferred dice,
 * missing special-injury rulings, elapsed turns or unattended blood-loss rolls.
 */
import {SHOCK_STATE,applyShockState,resolveStunnedRecovery,resolveShockReroll} from '../rules/shock.js';
import {bloodLossAdvanceTransition,bloodStoppageResult,BLOOD_LOSS_PERIOD_ROUNDS} from '../rules/bleeding.js';
import {SL} from '../rules/tests.js';
import {compoundInjury} from '../rules/injury.js';
const SHOCK={NONE:SHOCK_STATE.NONE,STN:SHOCK_STATE.STN,INC:SHOCK_STATE.INC,UNC:SHOCK_STATE.UNC,KIA:SHOCK_STATE.KIA};
const REVERSE=Object.fromEntries(Object.entries(SHOCK).map(([k,v])=>[v,k]));
const slValues=new Set([SL.CF,SL.F,SL.S,SL.CS]);
function parsedSL(value){const sl=typeof value==='string'&&Object.prototype.hasOwnProperty.call(SL,value)?SL[value]:value;requireCond(slValues.has(sl),'Neplatný výsledek CF/F/S/CS');return sl;}
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const whole=(n,min=0,max=999999)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
function requireCond(cond,message){if(!cond)throw Error(message);}
const copy=x=>structuredClone(x);
export function initialCombatState(){return {format:'hmk-persistent-combat-v1',shock:'NONE',bloodLoss:{bp:0,weaknessFatigue:0},fatigue:{windedness:0,weariness:0,otherWeakness:0},wounds:[],events:[],lastRound:0,shockOriginRound:null};}
export function combatFatigueTotals(state){validateCombatState(state);return {windedness:state.fatigue.windedness,weariness:state.fatigue.weariness,weakness:state.fatigue.otherWeakness+state.bloodLoss.weaknessFatigue,total:state.fatigue.windedness+state.fatigue.weariness+state.fatigue.otherWeakness+state.bloodLoss.weaknessFatigue};}
export function validateCombatState(s){
 requireCond(s&&s.format==='hmk-persistent-combat-v1'&&!Array.isArray(s),'Neznámý formát bojového stavu');
 requireCond(own(SHOCK,s.shock),'Neznámý Shock State');
 requireCond(s.bloodLoss&&whole(s.bloodLoss.bp,0,4)&&s.bloodLoss.weaknessFatigue===s.bloodLoss.bp*5,'Neplatné Blood Loss Points / weakness');
 requireCond(s.fatigue&&['windedness','weariness','otherWeakness'].every(k=>whole(s.fatigue[k],0,99999)),'Neplatný trvalý Fatigue');
 requireCond(Array.isArray(s.wounds)&&s.wounds.length<=1000&&Array.isArray(s.events)&&s.events.length<=5000,'Neplatný seznam ran nebo událostí');
 requireCond(whole(s.lastRound,0,9999)&&(s.shockOriginRound===null||whole(s.shockOriginRound,1,9999)),'Neplatná časová značka');
 const ids=new Set(),events=new Set();
 for(const w of s.wounds){requireCond(w&&typeof w.id==='string'&&w.id&&!ids.has(w.id)&&typeof w.location==='string'&&w.location&&['M','S','G'].includes(w.severity)&&whole(w.level,1,5)&&typeof w.aspect==='string'&&typeof w.bleeding==='boolean'&&(w.nextAdvanceRound===null||whole(w.nextAdvanceRound,1,9999)),'Poškozená nebo duplicitní rána');ids.add(w.id);requireCond(!w.bleeding||s.shock==='KIA'||whole(w.nextAdvanceRound,1,9999),'Krvácející rána nemá termín Advance');requireCond(w.side===undefined||w.side===null||['left','right'].includes(w.side),'Neplatná strana zraněné končetiny');requireCond(w.shockSL===undefined||w.shockSL===null||['CS','S','F','CF'].includes(w.shockSL),'Neplatný Shock Roll u rány');requireCond(w.timelineId===undefined||w.timelineId===null||(typeof w.timelineId==='string'&&w.timelineId.length>0&&w.timelineId.length<=100),'Neplatná časová osa rány');requireCond(w.minorOnsetGM===undefined||typeof w.minorOnsetGM==='boolean','Neplatné rozhodnutí GM o nástupu impairment');}
 for(const e of s.events){requireCond(e&&typeof e.id==='string'&&e.id&&!events.has(e.id)&&typeof e.type==='string'&&whole(e.round,1,9999),'Neplatná nebo duplicitní bojová událost');events.add(e.id);}
 return s;
}
function ready(s,round,id){const n=copy(s??initialCombatState());validateCombatState(n);requireCond(whole(round,1,9999)&&round>=n.lastRound,'Bojovou událost nelze zapsat do minulého kola');requireCond(typeof id==='string'&&id&&!n.events.some(e=>e.id===id),'Událost byla již zpracována');return n;}
function record(s,id,type,round,details){s.events.push({id,type,round,details});s.lastRound=round;validateCombatState(s);return s;}
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
 if(inj.kind==='injury')requireCond(typeof adjudication.bleeding==='boolean','GM musí potvrdit výsledek Bleeding podle Body Location table');
 const wound=inj.kind==='injury'?(()=>{
  requireCond(/^[MSG][1-5]$/.test(inj.injury),'Neplatná závažnost a úroveň zranění');
  const level=Number(inj.injury.slice(1)),severity=inj.injury[0];
  requireCond((level===1&&severity==='M')||([2,3].includes(level)&&severity==='S')||([4,5].includes(level)&&severity==='G'),'Nesouhlasí Severity a Injury Level');
  const fixedLevel=compound?.injury?.level??level;const fixedSeverity=compound?.injury?.severity??severity;
  return {id:`wound:${eventId}`,location:draft.location,severity:fixedSeverity,level:fixedLevel,aspect:draft.aspect,bleeding:adjudication.bleeding,nextAdvanceRound:adjudication.bleeding?round+BLOOD_LOSS_PERIOD_ROUNDS:null,recordedRound:round,originEventId:eventId,compoundReviewed:!!adjudication.compoundReviewed,shockSL:draft.inputs?.shockLevel??null,side:adjudication.side??null,timelineId:adjudication.timelineId??null};
 })():null;
 if(wound)requireCond(!s.wounds.some(w=>w.id===wound.id),'Tato rána již byla potvrzena');
 if(compound?.compoundedExisting){const prior=s.wounds.find(w=>w.id===compound.compoundedExisting.id);requireCond(!!prior,'Nenalezená původní rána Compound Injury');prior.level=compound.compoundedExisting.level;prior.severity=compound.compoundedExisting.severity;}
 if(wound){if(calculated==='KIA')wound.nextAdvanceRound=null;s.wounds.push(wound);}
 if(calculated!==s.shock) s.shockOriginRound=round;
 s.shock=calculated;
 record(s,eventId,'confirmed-hit',round,{targetId:characterId,location:draft.location,aspect:draft.aspect,kind:inj.kind,injury:inj.injury??null,woundId:wound?.id??null,shock:s.shock,bleeding:wound?.bleeding??false,compound:compound?{d10:adjudication.compoundD10,success:compound.success,affectedId:compound.compoundedInjuryId??null}:null,impact:draft.impactResult?.effectiveImpact??null,proposalId:draft.proposalId??null,source:'HMK 167–169; special effects adjudicated by GM'});
 return {state:s,wound};
}
export function dueBloodLoss(state,round){validateCombatState(state);return state.wounds.filter(w=>w.bleeding&&w.nextAdvanceRound!==null&&w.nextAdvanceRound<=round).map(w=>({woundId:w.id,location:w.location,dueRound:w.nextAdvanceRound,overdue:round>w.nextAdvanceRound}));}
export function applyConfirmedBloodLoss({state,round,eventId,woundId,sl}={}){
 const s=ready(state,round,eventId);
 sl=parsedSL(sl);
 requireCond(s.shock!=='KIA','Zemřelá postava už nepokračuje v Blood Loss Advance');
 const wound=s.wounds.find(w=>w.id===woundId);
 requireCond(wound?.bleeding===true&&whole(wound.nextAdvanceRound,1,9999),'Rána není aktivní Bleeder');
 requireCond(round>=wound.nextAdvanceRound,'Blood Loss Advance ještě není splatný');
 const was=s.shock;
 const r=bloodLossAdvanceTransition({bloodLoss:s.bloodLoss,sl,currentShockState:SHOCK[was]});
 s.bloodLoss=r.bloodLoss;s.shock=REVERSE[r.shockState];
 if(was!==s.shock)s.shockOriginRound=round;
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
 if(stop.advanceRoll){const r=bloodLossAdvanceTransition({bloodLoss:s.bloodLoss,sl:advanceSL,currentShockState:SHOCK[s.shock]});s.bloodLoss=r.bloodLoss;const was=s.shock;s.shock=REVERSE[r.shockState];if(was!==s.shock)s.shockOriginRound=round;}
 if(stop.stopped){wound.bleeding=false;wound.nextAdvanceRound=null;wound.staunchBonus=0;}
 else {wound.nextAdvanceRound=s.shock==='KIA'?null:round+BLOOD_LOSS_PERIOD_ROUNDS;wound.staunchBonus=stop.nextStaunchBonus;}
 record(s,eventId,'blood-stoppage',round,{woundId,sl:Object.keys(SL).find(k=>SL[k]===sl),advanceSL:stop.advanceRoll?Object.keys(SL).find(k=>SL[k]===advanceSL):null,stopped:stop.stopped,shock:s.shock,bp:s.bloodLoss.bp,nextStaunchBonus:stop.nextStaunchBonus});
 return {state:s,stopped:stop.stopped,dead:s.shock==='KIA',nextStaunchBonus:stop.nextStaunchBonus};
}
export function applyConfirmedShockRecovery({state,round,eventId,sl,timingConfirmed=false}={}){
 const s=ready(state,round,eventId);
 requireCond(timingConfirmed===true,'GM musí potvrdit přípustný čas Shock recovery / reroll');
 sl=parsedSL(sl);
 requireCond(['STN','INC','UNC'].includes(s.shock),'Postava nemá zotavitelný Shock State');
 requireCond(!(s.bloodLoss.bp>0&&s.wounds.some(w=>w.bleeding)),'Krvácením podmíněný Shock State nelze odstranit před zastavením všech Bleederů (HMK str.178)');
 requireCond(s.shockOriginRound===null||round>s.shockOriginRound,'Shock recovery nelze potvrdit ve stejném kole jako vznik stavu');
 const before=s.shock;
 if(before==='STN')s.shock=REVERSE[resolveStunnedRecovery(sl)];
 else {const result=resolveShockReroll({state:SHOCK[before],sl});s.shock=REVERSE[result.state];}
 if(s.shock!==before)s.shockOriginRound=round;
 record(s,eventId,'shock-recovery',round,{before,after:s.shock,sl:Object.keys(SL).find(k=>SL[k]===sl),timingConfirmed,warning:'UNC timing and extended shock need GM verification'});
 return {state:s};
}
export function applyConfirmedFatigue({state,round,eventId,kind,delta}={}){
 const s=ready(state,round,eventId);
 requireCond(['windedness','weariness','otherWeakness'].includes(kind),'Zvolte druh únavy');
 requireCond(whole(delta,-9999,9999),'Fatigue delta musí být celé číslo');
 requireCond(whole(s.fatigue[kind]+delta,0,99999),'Únava by byla záporná nebo mimo rozsah');
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
