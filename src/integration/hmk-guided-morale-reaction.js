/** HMK World of Kèthîra p.162: routed / withdrawing Reaction.
 * A documented interval and safety condition precede one physical Initiative
 * d100. Neither EML nor Success Level is entered by the GM. */
import {validateCombatState,applyConfirmedMoraleReaction,combatFatigueTotals} from './persistent-combat-state.js';
const requireFact=(ok,message)=>{if(!ok)throw Error(message)};
const whole=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export function guidedMoraleReactionReadiness({character,state,round,timelineId,
 elapsedSafeMinutes,safeOutOfLOS=false,unthreatened=false}={}){
 validateCombatState(state);
 requireFact(character?.id&&character.hmk,'Reaction vyžaduje uloženou postavu');
 requireFact(whole(round,1,9999)&&round>=state.lastRound,'Neplatné kolo Reaction');
 requireFact(typeof timelineId==='string'&&timelineId,'Chybí doložená časová osa');
 const kind=state.morale?.state;
 requireFact(['routed','withdrawing'].includes(kind),'Postava není Routed ani Withdrawing');
 const duration=kind==='routed'?5:1;
 requireFact(whole(elapsedSafeMinutes,duration,100000),
  `Reaction vyžaduje nejméně ${duration} skutečně uplynulých bezpečných minut`);
 requireFact(kind==='routed'?safeOutOfLOS===true:unthreatened===true,
  kind==='routed'?'Routed: skutečné bezpečí mimo dohled nepřítele nebylo potvrzeno':
   'Withdrawing: nebyla potvrzena minuta bez ohrožení');
 const last=state.morale.lastReactionRound,lastTimeline=state.morale.lastReactionTimelineId;
 if(last!==null&&last!==undefined&&lastTimeline===timelineId){
  requireFact(round>=last+duration*12,'Po předchozí Reaction ještě neuplynul požadovaný počet kol');
 }
 const initiative=(character.hmk.skills??[]).find(s=>String(s.name??s.key??'').trim().toLowerCase()==='initiative')?.ml;
 requireFact(whole(initiative,0,200),'Chybí skutečný Initiative ML v uložené postavě');
 const fatigue=combatFatigueTotals(state).total;
 return {kind,initiativeML:initiative,fatigue,eml:initiative-fatigue,duration,
  elapsedSafeMinutes,safeOutOfLOS,unthreatened};
}
export function resolveGuidedMoraleReaction({character,state,round,eventId,timelineId,
 elapsedSafeMinutes,safeOutOfLOS=false,unthreatened=false,roll}={}){
 const ctx=guidedMoraleReactionReadiness({character,state,round,timelineId,
  elapsedSafeMinutes,safeOutOfLOS,unthreatened});
 requireFact(whole(roll,1,100),'Zadejte jeden skutečný d100 v rozsahu 1–100');
 requireFact(typeof eventId==='string'&&eventId,'Chybí ID trvalé události');
 const transition=applyConfirmedMoraleReaction({state,round,eventId,
  characterId:character.id,actorId:null,turnEnded:false,initiativeML:ctx.initiativeML,
  roll,elapsedSafeMinutes,safeOutOfLOS,unthreatened,timelineId,gmConfirmed:true});
 const event=transition.state.events.at(-1);
 requireFact(event?.id===eventId,'Chybí trvalý výsledek Reaction');
 event.details={...event.details,physicalDice:{format:'hmk-manual-dice-proof-v1',
  source:'HMK World of Kèthîra p.162',rolls:[{id:'reactionD100',faces:100,
   actorId:character.id,value:roll,source:'GM-entered-physical-die'}]},
  guided:{sourceState:ctx.kind,verifiedSafeMinutes:elapsedSafeMinutes,
   condition:ctx.kind==='routed'?'safe-out-of-los':'unthreatened',eml:ctx.eml}};
 return {state:transition.state,event,context:ctx};
}
