/** HMK v1.2 p.75, p.169: Emetic d6 combat rounds -> Shock Index 7.
 * The source is a real completed dose, a real application and one attested
 * encounter timeline. This is NOT another clock, and never generates dice.
 */
import {successLevel,SL} from '../rules/tests.js';
import {shockRollModifier,shockStateFromIndex} from '../rules/shock.js';
import {initialCombatState,validateCombatState,combatFatigueTotals} from './persistent-combat-state.js';
const need=(x,m)=>{if(!x)throw Error('Emetic: '+m)};
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const SHOCK={none:'NONE',stunned:'STN',incapacitated:'INC',unconscious:'UNC',killed:'KIA'};
export const EMETIC_SHOCK_FORMAT='hmk-emetic-shock-v1';
export function pendingEmeticShocks(journal=[],campaignId='',timelineId=''){
 const done=new Set(journal.filter(j=>j.calendarHerbEmeticShock&&j.calendarCampaignId===campaignId).map(j=>j.calendarHerbEmeticShock.applicationId));
 return journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarHerbPotionAdminister?.herbType==='emetic'&&
  j.calendarHerbPotionAdminister.emeticOnsetD6!==undefined&&j.calendarHerbPotionAdminister.combatAnchor?.timelineId===timelineId&&!done.has(j.id))
  .map(j=>({applicationId:j.id,targetId:j.calendarHerbPotionAdminister.targetId,
   timelineId,originRound:j.calendarHerbPotionAdminister.combatAnchor.round,
   dueRound:j.calendarHerbPotionAdminister.combatAnchor.round+j.calendarHerbPotionAdminister.emeticOnsetD6,
   originMinute:j.campaignMinute,source:j}));
}
export function requireEmeticRoundMayAdvance({journal,campaignId,timelineId,currentRound,nextRound=currentRound+1}={}){
 need(int(currentRound,1,9999)&&int(nextRound,currentRound+1,9999),'neplatný postup bojových kol');
 // Crossing the due round in one jump is just as dangerous as leaving it unresolved.
 const missed=pendingEmeticShocks(journal,campaignId,timelineId).find(p=>nextRound>p.dueRound);
 if(missed)need(false,'nelze přeskočit povinný Shock Roll '+missed.applicationId+' v bojovém kole '+missed.dueRound);
 return true;
}
export function requireEmeticGMTimeMayAdvance({journal,campaignId,beforeMinute,afterMinute}={}){
 if(afterMinute<=beforeMinute)return true;
 const pending=journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarHerbPotionAdminister?.herbType==='emetic'&&
   j.calendarHerbPotionAdminister.emeticOnsetD6!==undefined&&j.campaignMinute<afterMinute&&
   !journal.some(q=>q.calendarCampaignId===campaignId&&q.calendarHerbEmeticShock?.applicationId===j.id));
 if(pending.length)need(false,'GM čas nesmí přeskočit nevyřešený Emetic Shock Roll ('+pending[0].id+')');
 return true;
}
function emeticContext({journal,campaignId,applicationId,minute,round,timelineId,targetId}={}){
 need(Array.isArray(journal)&&typeof applicationId==='string'&&applicationId&&typeof campaignId==='string'&&campaignId&&
  int(minute,0,1e9)&&int(round,1,9999)&&typeof timelineId==='string'&&timelineId&&typeof targetId==='string'&&targetId,
  'chybí přesná kampaň, příjemce, čas či bojová osa');
 const source=journal.find(j=>j.id===applicationId&&j.calendarCampaignId===campaignId&&j.calendarHerbPotionAdminister?.herbType==='emetic');
 need(source&&source.campaignMinute<=minute,'neexistuje doložené předchozí podání');
 const p=source.calendarHerbPotionAdminister,a=p.combatAnchor;
 need(p.targetId===targetId&&a?.confirmedByGM===true&&a.timelineId===timelineId&&a.campaignMinute===source.campaignMinute&&
  a.round>=1&&int(p.emeticOnsetD6,1,6)&&['manual','cryptographic-software-die'].includes(p.emeticOnsetOrigin),
  'neplatný původ skutečného d6 nebo časové osy');
 const dueRound=a.round+p.emeticOnsetD6;
 need(round===dueRound,'Shock Roll je splatný přesně v bojovém kole '+dueRound+'; nelze jej předčasně ani zpětně odhadovat');
 need(minute>=source.campaignMinute&&minute<=source.campaignMinute+1,
  'chybí časově odpovídající GM minuta pro d6 bojových kol');
 need(!journal.some(j=>j.calendarCampaignId===campaignId&&j.calendarHerbEmeticShock?.applicationId===applicationId),
  'toto podání již má uložený Shock Roll');
 return {source,p,dueRound};
}
function shockCalculation({shockML,fatiguePenalty,penalty,d100}={}){
 need(int(shockML,0,200)&&int(fatiguePenalty,0,10000)&&int(penalty,1,800)&&int(d100,1,100),
  'vyžaduje skutečný Shock ML, Fatigue a d100');
 const rawEML=shockML-fatiguePenalty-penalty,eml=Math.min(95,Math.max(5,rawEML));
 const sl=successLevel(d100,rawEML),slName=Object.keys(SL).find(x=>SL[x]===sl);
 const shockIndex=7+shockRollModifier(sl),resultShock=SHOCK[shockStateFromIndex(shockIndex)];
 return {shockML,fatiguePenalty,penalty,d100,rawEML,eml,sl:slName,shockIndex,resultShock};
}
export function applyConfirmedEmeticShock({journal=[],campaignId,applicationId,minute,round,timelineId,targetId,
 state=null,shockML,d100,eventId,gmConfirmed=false}={}){
 need(gmConfirmed===true&&typeof eventId==='string'&&eventId.length>=3,'chybí potvrzení GM a jedinečné ID výsledku');
 const {p,dueRound}=emeticContext({journal,campaignId,applicationId,minute,round,timelineId,targetId});
 const s=structuredClone(state??initialCombatState());validateCombatState(s);
 need(round>=s.lastRound&&!s.events.some(e=>e.id===eventId),'starší kolo či duplicitní bojový důkaz');
 // An existing Shock/Extended Shock has its own mandatory follow-up and may
 // stack in ways not safely decided by an unqualified potion roll.
 need(s.shock==='NONE'&&!s.extendedShock&&!s.coma&&!s.shockFollowup,
  'příjemce již má Shock/Extended Shock: nutné individuální pravidlové rozhodnutí GM');
 const fatiguePenalty=combatFatigueTotals(s).total;
 const result=shockCalculation({shockML,fatiguePenalty,penalty:p.bonus,d100});
 s.shock=result.resultShock;s.shockOriginRound=round;
 if(['STN','INC','UNC'].includes(s.shock)){
  const due=s.shock==='UNC'?round+120:round+1;
  need(due<=9999,'Shock Recovery přesahuje rozsah kol');
  s.shockFollowup={kind:s.shock,originRound:round,timelineId,dueRound:due,
   phase:s.shock==='UNC'?'after-ten-minutes':'end-next-turn'};
 }
 if(['INC','UNC'].includes(s.shock))s.posture.prone=true;
 if(s.shock==='KIA'){s.shockFollowup=null;for(const w of s.wounds)w.nextAdvanceRound=null;}
 const proof={format:EMETIC_SHOCK_FORMAT,campaignId,minute,applicationId,targetId,timelineId,round,dueRound,
  ...result,priorShock:'NONE',newShock:s.shock,gmConfirmed:true,sourcePage:75};
 s.events.push({id:eventId,type:'herb-emetic-shock',round,details:structuredClone(proof)});
 s.lastRound=round;
 validateCombatState(s);
 return {state:s,proof};
}
export function validateEmeticShockJournal(journal=[]){
 const seen=new Set(),prior=[];
 for(const j of journal){
  if(j.calendarHerbEmeticShock){
   const p=j.calendarHerbEmeticShock;
   need(p?.format===EMETIC_SHOCK_FORMAT&&j.calendarCampaignId===p.campaignId&&j.campaignMinute===p.minute&&
    j.characterId===p.targetId&&p.gmConfirmed===true&&!seen.has(p.applicationId),
    'neplatný nebo opakovaný důkaz Shock Roll');
   const context=emeticContext({journal:prior,campaignId:p.campaignId,applicationId:p.applicationId,
    minute:p.minute,round:p.round,timelineId:p.timelineId,targetId:p.targetId});
   const expected=shockCalculation({shockML:p.shockML,fatiguePenalty:p.fatiguePenalty,
    penalty:context.p.bonus,d100:p.d100});
   need(JSON.stringify(p)===JSON.stringify({format:EMETIC_SHOCK_FORMAT,campaignId:p.campaignId,
    minute:p.minute,applicationId:p.applicationId,targetId:p.targetId,timelineId:p.timelineId,
    round:p.round,dueRound:context.dueRound,...expected,priorShock:'NONE',newShock:expected.resultShock,
    gmConfirmed:true,sourcePage:75}),'výsledek Shock nebyl odvozen z původních hodů');
   seen.add(p.applicationId);
  }
  prior.push(j);
 }
 return true;
}
export function assertEmeticShockAppendOnly(before=[],after=[]){
 const byId=new Map(after.map(j=>[j.id,j]));
 for(const j of before)if(j.calendarHerbEmeticShock)
  need(byId.has(j.id)&&JSON.stringify(byId.get(j.id))===JSON.stringify(j),'historický Emetic Shock důkaz nelze změnit');
 return true;
}
