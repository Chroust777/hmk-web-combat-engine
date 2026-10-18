/** HMK World of Kèthîra p.177,179. Guided physical trauma courses.
 * No random dice; verified elapsed time is required. Source state is never mutated.
 */
import {healingBase} from '../rules/healing.js';
import {SL,successLevel} from '../rules/tests.js';
import {validateCombatState,combatFatigueTotals,applyExtendedShockCourse,applyComaCourse} from './persistent-combat-state.js';
import {createManualDiceQueue,nextManualDie,recordManualDie,completedManualDice} from './hmk-manual-dice-queue.js';
const ensure=(test,reason)=>{if(!test)throw Error(reason)};
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const witness=value=>JSON.stringify(value);
const hbFromCharacter=character=>{
 const a=character?.hmk?.attributes??{};
 ensure(int(a.end,1,40)&&int(a.wil,1,40),'Healing Base vyžaduje ověřené END a WIL uložené postavy');
 return healingBase({endurance:a.end,will:a.wil});
};
export function guidedTraumaCourseReadiness({state,character}={}){
 validateCombatState(state);ensure(character?.id&&character.hmk,'Chybí uložená postava');
 if(state.shock==='KIA')return {available:false,reason:'KIA'};
 if(state.extendedShock)return {available:true,kind:'extended-shock',
  nextHours:state.extendedShock.elapsedHours+4,healingBase:hbFromCharacter(character),
  note:'Každé 4 hodiny od posledního Course Roll; čas musí být doložen (HMK p.179)'};
 if(state.coma?.active)return {available:true,kind:'coma',
  nextDays:state.coma.nextCourseDays,healingBase:hbFromCharacter(character),
  note:'Po skutečně uplynulém d10denním intervalu (HMK p.179)'};
 return {available:false,reason:'no-active-course'};
}
export function createGuidedTraumaCourse({state,character,round,eventId,timelineId=null,
 kind=null,elapsedHoursSinceOnset=null,daysElapsed=null,physicianStars=null,
 arcaneBonus=null,restfulShelter=null,timeConfirmed=false}={}){
 const r=guidedTraumaCourseReadiness({state,character});
 ensure(r.available,'Postava nemá otevřený Extended Shock ani Coma Course');
 ensure(kind===r.kind,'Nesouhlasí typ aktivního Course');
 ensure(int(round,1,9999)&&round>=state.lastRound&&typeof eventId==='string'&&eventId.length>0,
  'Chybí platné kolo / ID Course události');
 ensure(timeConfirmed===true,'Skutečné uplynutí požadovaného času musí být doloženo');
 ensure(int(arcaneBonus,0,100),'Arcane bonus musí být explicitně doložen (0 pokud nebyl)');
 if(kind==='extended-shock'){
  ensure(int(elapsedHoursSinceOnset,4,100000)&&elapsedHoursSinceOnset===r.nextHours,
   `Musí být doložen skutečný ${r.nextHours}. hodinový interval od začátku Extended Shock`);
  ensure(int(physicianStars,0,10),'Physician SV: zadejte doložený počet hvězd, 0 pokud není léčitel');
 }else{
  ensure(int(daysElapsed,1,10000)&&daysElapsed===r.nextDays,
   `Následující Coma Course vyžaduje skutečných ${r.nextDays} dní`);
  ensure(typeof restfulShelter==='boolean','Je nutné ověřit klidné a chráněné prostředí');
 }
 const queue=createManualDiceQueue({id:eventId+':course',source:'HMK World of Kèthîra p.179',
  round,actorId:character.id,requests:[{id:'courseD100',faces:100,
   label:`${kind==='extended-shock'?'Extended Shock':'Coma'}: skutečný Course d100`}]});
 return {format:'hmk-guided-trauma-course-v1',id:eventId,kind,round,eventId,timelineId,characterId:character.id,
  stateWitness:witness(state),characterWitness:witness(character.hmk),
  context:{comaHR:kind==='coma'?state.coma.hr:null,healingBase:r.healingBase,elapsedHoursSinceOnset,daysElapsed,physicianStars,
   arcaneBonus,restfulShelter,rawEML:kind==='extended-shock'?
    r.healingBase*state.extendedShock.hr-combatFatigueTotals(state).total+5*physicianStars+arcaneBonus:
    r.healingBase*state.coma.hr-combatFatigueTotals(state).total+(restfulShelter?0:-20)+arcaneBonus},
  queue,rolls:[],phase:'waiting-die'};
}
export function guidedTraumaCourseRequirement(session){
 ensure(session?.format==='hmk-guided-trauma-course-v1','Neplatný průvodce Course');
 if(session.phase==='waiting-die')return {kind:'die',...nextManualDie(session.queue)};
 return {kind:session.phase==='ready'?'automatic':'complete'};
}
export function submitGuidedTraumaCourseDie(session,value){
 ensure(session?.phase==='waiting-die','Course nyní nečeká na hod');
 const req=nextManualDie(session.queue);ensure(req,'Chybí očekávaný d100/d10');
 const queue=recordManualDie(session.queue,{requestId:req.id,value});
 const next={...session,queue};
 if(queue.status!=='complete')return next;
 next.rolls=[...session.rolls,...completedManualDice(queue).proof.rolls];
 if(req.id==='courseD100'&&session.kind==='coma'){
  const sl=successLevel(next.rolls[0].value,session.context.rawEML);
  const delta=[-2,-1,1,2][sl];
  // Next period is needed ONLY while the coma remains active.
  if(int(session.context.comaHR,1,5) && session.context.comaHR+delta>0 && session.context.comaHR+delta<6){
   next.queue=createManualDiceQueue({id:session.eventId+':next-period',source:'HMK World of Kèthîra p.179',
    round:session.round,actorId:session.characterId,requests:[{id:'nextComaD10',faces:10,
     label:'Coma pokračuje: skutečný d10 pro další Course interval'}]});
   return next;
  }
 }
 next.phase='ready';return next;
}
export function commitGuidedTraumaCourse({session,state,character,round,timelineId=null}={}){
 ensure(session?.phase==='ready','Course nemá zadané všechny fyzické hody');
 validateCombatState(state);
 ensure(character?.id===session.characterId&&session.round===round&&session.timelineId===timelineId,
  'Změnila se postava, kolo nebo časová osa');
 ensure(witness(state)===session.stateWitness&&witness(character.hmk)===session.characterWitness,
  'Postava nebo bojový stav se změnily: Course je zastaralý');
 const r=guidedTraumaCourseReadiness({state,character});
 ensure(r.available&&r.kind===session.kind,'Aktivní Course se změnil');
 const ctx=session.context,die=session.rolls.find(x=>x.id==='courseD100')?.value;
 ensure(int(die,1,100),'Chybí skutečný Course d100');
 const result=session.kind==='extended-shock'?applyExtendedShockCourse({state,round,
  eventId:session.eventId,healingBase:ctx.healingBase,roll:die,
  physicianStars:ctx.physicianStars,arcaneBonus:ctx.arcaneBonus,
  elapsedHoursSinceOnset:ctx.elapsedHoursSinceOnset,gmConfirmed:true}):
  applyComaCourse({state,round,eventId:session.eventId,healingBase:ctx.healingBase,
   roll:die,periodD10:session.rolls.find(x=>x.id==='nextComaD10')?.value??null,
   daysElapsed:ctx.daysElapsed,restfulShelter:ctx.restfulShelter,
   arcaneBonus:ctx.arcaneBonus,gmConfirmed:true});
 const final=result.state.events.at(-1);
 ensure(final?.id===session.eventId,'Course nemá potvrzenou pravidlovou událost');
 final.details.physicalDice={format:'hmk-manual-dice-proof-v1',source:'HMK World of Kèthîra p.179',rolls:session.rolls.map(x=>({...x}))};
 final.details.guidedResolution={kind:session.kind,healingBase:ctx.healingBase,rawEML:ctx.rawEML,
  derivedSL:Object.keys(SL).find(x=>SL[x]===successLevel(die,ctx.rawEML)),
  timeEvidence:session.kind==='extended-shock'?{elapsedHoursSinceOnset:ctx.elapsedHoursSinceOnset}:
   {daysElapsed:ctx.daysElapsed},physicianStars:session.kind==='extended-shock'?ctx.physicianStars:null,
  arcaneBonus:ctx.arcaneBonus,restfulShelter:session.kind==='coma'?ctx.restfulShelter:null};
 return {state:result.state,transition:result,event:final};
}
