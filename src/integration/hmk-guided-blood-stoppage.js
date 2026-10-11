/**
 * HMK World of Kèthîra, printed p.178: one five-minute Blood Stoppage
 * treatment and its corresponding Blood Loss Advance form a single transaction.
 * No random generation. Dice, treatment resources and elapsed time are explicit.
 */
import {SL,successLevel} from '../rules/tests.js';
import {bloodStoppageResult,multipleBleederStaunchModifier} from '../rules/bleeding.js';
import {applyConfirmedBloodStoppage,combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {createManualDiceQueue,recordManualDie,nextManualDie,completedManualDice} from './hmk-manual-dice-queue.js';

const insist=(ok,msg)=>{if(!ok)throw Error(msg)};
const whole=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const signature=x=>JSON.stringify(x);
const slName=x=>Object.keys(SL).find(k=>SL[k]===x);
const LIMB=new Set(['sh','shoulder','ua','upper arm','el','elbow','fo','forearm','ha','hand',
 'th','thigh','kn','knee','ca','calf','ft','foot']);
const folkNames=new Set(['human','ænarin','aenarin','kúzhai','kuzhai','malákta','malakta',
 'nâdi','nadi','sinái','sinai','sidhé','sidhe']);
function physicianML(healer){
 const value=(healer?.hmk?.skills??[]).find(s=>String(s?.name??s?.key??'').trim().toLowerCase()==='physician')?.ml;
 insist(whole(value,0,200),'Léčitel potřebuje uložený Physician ML, nikoli odhadovaný výsledek');return value;
}
function bleedingML(patient){
 const h=patient?.hmk??{};
 const isFolk=typeof h.isFolk==='boolean'?h.isFolk:folkNames.has(String(h.folk??'').trim().toLowerCase())?true:null;
 insist(typeof isFolk==='boolean','Chybí doložená klasifikace Folk / jiné zvíře pro Blood Loss');
 if(!isFolk)return 50; // HMK p.178: beasts other than Folk
 const str=h.attributes?.str;
 insist(whole(str,1,40),'Folk: chybí uložená Strength pro Blood Loss');return str*5;
}
function queueFor({session,id,label,actorId}){
 return createManualDiceQueue({id:session.id+':'+id,source:'HMK World of Kèthîra p.178 Blood Stoppage',
  round:session.round,actorId,requests:[{id,faces:100,label}]});
}
/**
 * Start only when the recorded bleeding interval has actually elapsed.
 * plannedBleeders is the VERIFIED number treated by the healer in this period,
 * not the number of all wounds or an implicit 1 for several simultaneous ones.
 */
export function createGuidedBloodStoppage({id,round,timelineId=null,healer,healerState,
 patient,patientState,woundId,method,hasBandage=null,hasWater=null,hasNeedleThread=null,hasHeatedTool=null,
 tourniquet=false,plannedBleeders=null}={}){
 insist(typeof id==='string'&&id&&whole(round,1,9999),'Chybí identita ošetření nebo skutečné kolo');
 insist(healer?.id&&patient?.id&&healer?.hmk&&patient?.hmk,'Nejsou doloženi léčitel a pacient');
 validateCombatState(patientState);validateCombatState(healerState);
 insist(patientState.shock!=='KIA','Mrtvého pacienta nelze ošetřovat tímto krokem');
 insist(healerState.shock==='NONE'||healerState.shock==='STN','Bezvládný léčitel nemůže ošetřovat');
 const wound=patientState.wounds.find(w=>w.id===woundId);
 insist(wound?.bleeding===true&&whole(wound.nextAdvanceRound,1,9999),'Není doložen aktivní Bleeder');
 insist(round>=wound.nextAdvanceRound,'Pětiminutový interval léčby ještě neuplynul; předčasný hod se neprovádí');
 insist(round<wound.nextAdvanceRound+60,
  'Blood Stoppage: před léčbou vyhodnoťte všechny dřívější splatné pětiminutové intervaly Blood Loss');
 insist(!patientState.wounds.some(w=>w.bleeding&&w.nextAdvanceRound!==null&&w.nextAdvanceRound<wound.nextAdvanceRound),
  'Blood Stoppage: starší splatné krvácení jiné rány musí být nejdříve vyhodnoceno');
 insist(round>=patientState.lastRound&&round>=healerState.lastRound,'Čas léčby je starší než trvalý stav');
 insist(['sta','cau'].includes(method),'HMK p.178 umožňuje Staunch nebo Cauterisation');
 if(method==='sta'){
  insist(hasBandage===true&&hasWater===true,'Staunch zahrnuje clean & dress: vyžaduje doložený obvaz a vodu');
  if(wound.severity==='S'&&['edge','point','e','p'].includes(String(wound.aspect).toLowerCase()))
   insist(hasNeedleThread===true,'Serious Edge/Point: clean & dress vyžaduje jehlu a nit');
 }
 if(method==='cau')insist(hasHeatedTool===true,'Cauterisation vyžaduje doložený rozžhavený kovový nástroj');
 insist(typeof tourniquet==='boolean','Turniket musí být výslovně ověřen');
 insist(!tourniquet||(method==='sta'&&LIMB.has(String(wound.location).toLowerCase())),
  'Turniket lze použít jen při Staunch končetiny');
 insist(whole(plannedBleeders,1,100),'Chybí skutečný počet Bleederů léčených tímto léčitelem během 5 minut');
 const base=physicianML(healer),bloodML=bleedingML(patient);
 const fatigue=combatFatigueTotals(healerState).total;
 const methodModifier=method==='cau'?30:tourniquet?20:0;
 const repeatingBonus=method==='sta'?(wound.staunchBonus??0):0;
 insist(whole(repeatingBonus,0,10),'Neplatný bonus po předchozím Staunch');
 const multiModifier=multipleBleederStaunchModifier(plannedBleeders);
 const eml=base-fatigue+methodModifier+repeatingBonus+multiModifier;
 const session={format:'hmk-guided-blood-stoppage-v1',id,round,timelineId,patientId:patient.id,healerId:healer.id,
  woundId,method,hasBandage,hasWater,hasNeedleThread,hasHeatedTool,tourniquet,plannedBleeders,
  context:{physicianML:base,healerFatigue:fatigue,methodModifier,repeatingBonus,multiModifier,
   physicianEML:eml,bloodLossML:bloodML,dueRound:wound.nextAdvanceRound},
  patientWitness:signature(patientState),healerWitness:signature(healerState),
  patientSheetWitness:signature(patient.hmk),healerSheetWitness:signature(healer.hmk),
  queue:null,rolls:[],phase:'waiting-treatment',stoppageSL:null};
 session.queue=queueFor({session,id:'physicianD100',actorId:healer.id,
  label:`${healer.name??'Léčitel'}: Physician d100, Blood Stoppage (${method})`});
 return session;
}
export function guidedBloodStoppageRequirement(session){
 insist(session?.format==='hmk-guided-blood-stoppage-v1','Neplatný průvodce ošetřením');
 if(session.phase==='ready')return {kind:'automatic',id:'commit-blood-stoppage'};
 insist(['waiting-treatment','waiting-blood-loss'].includes(session.phase),'Průvodce nemá platný krok');
 return {kind:'die',...nextManualDie(session.queue)};
}
export function submitGuidedBloodStoppageDie(session,value){
 insist(['waiting-treatment','waiting-blood-loss'].includes(session?.phase),'Žádný hod se neočekává');
 const request=nextManualDie(session.queue);
 insist(request,'Neplatné pořadí hodů');
 const queue=recordManualDie(session.queue,{requestId:request.id,value});
 const roll=completedManualDice(queue).proof.rolls;
 const next={...session,rolls:[...session.rolls,...roll],queue};
 if(session.phase==='waiting-treatment'){
  const level=successLevel(roll[0].value,session.context.physicianEML);
  next.stoppageSL=slName(level);
  if(bloodStoppageResult(level).advanceRoll){
   next.phase='waiting-blood-loss';
   next.queue=queueFor({session,id:'strengthD100',actorId:session.patientId,
    label:'Pacient: Blood Loss Advance – Strength d100 (bez Fatigue a impairment)'});
  }else next.phase='ready';
 }else next.phase='ready';
 return next;
}
export function commitGuidedBloodStoppage({session,round,timelineId=null,healer,healerState,patient,patientState}={}){
 insist(session?.phase==='ready'&&session.format==='hmk-guided-blood-stoppage-v1',
  'Před trvalým zápisem chybí povinný fyzický hod');
 insist(session.round===round&&session.timelineId===timelineId&&healer?.id===session.healerId&&
  patient?.id===session.patientId,'Účastník, kolo nebo časová osa se změnili');
 validateCombatState(patientState);validateCombatState(healerState);
 insist(signature(patientState)===session.patientWitness&&signature(healerState)===session.healerWitness&&
  signature(patient.hmk)===session.patientSheetWitness&&signature(healer.hmk)===session.healerSheetWitness,
  'Léčitel, pacient nebo jejich stav se po fyzickém hodu změnili');
 const pDie=session.rolls.find(r=>r.id==='physicianD100')?.value;
 insist(whole(pDie,1,100)&&session.stoppageSL===slName(successLevel(pDie,session.context.physicianEML)),
  'Pravidlový výsledek ošetření neodpovídá uloženému fyzickému hodu');
 const stop=bloodStoppageResult(SL[session.stoppageSL]);
 const bDie=session.rolls.find(r=>r.id==='strengthD100')?.value;
 insist((stop.advanceRoll&&whole(bDie,1,100))||(!stop.advanceRoll&&bDie===undefined),
  'Chybí jeden povinný Blood Loss hod, nebo byl zadán nadbytečný');
 const advanceSL=stop.advanceRoll?slName(successLevel(bDie,session.context.bloodLossML)):null;
 const transition=applyConfirmedBloodStoppage({state:patientState,round,eventId:session.id,
  woundId:session.woundId,sl:session.stoppageSL,advanceSL});
 if(session.method==='cau'){
  const treated=transition.state.wounds.find(w=>w.id===session.woundId);
  if(treated){treated.cauterised=true;if(treated.healing)treated.healing.cauterised=true;}
 }
 const evidence=transition.state.events.at(-1);
 insist(evidence?.id===session.id,'Ošetření nemá doložený trvalý výsledek');
 evidence.details={...evidence.details,healerId:session.healerId,patientId:session.patientId,
  method:session.method,tourniquet:session.tourniquet,plannedBleeders:session.plannedBleeders,
  physicianEML:session.context.physicianEML,physicianML:session.context.physicianML,
  healerFatigue:session.context.healerFatigue,methodModifier:session.context.methodModifier,
  multipleBleederModifier:session.context.multiModifier,staunchRepeatBonus:session.context.repeatingBonus,
  bloodLossML:session.context.bloodLossML,originalDueRound:session.context.dueRound,
  physicalDice:{format:'hmk-manual-dice-proof-v1',source:'HMK World of Kèthîra p.178',rolls:session.rolls.map(r=>({...r}))}};
 return {state:transition.state,event:evidence,stopped:transition.stopped,dead:transition.dead,
  proof:evidence.details.physicalDice};
}
