/** HMK v1.2 pp.190,291: a Critical Failure on Transcendence requires a
 * separate Will test. F -> Aural Shock 1, CF -> Aural Shock 2, S/CS -> none.
 * Each resulting Aural Shock level creates five otherWeakness. This module
 * never rolls dice, invents a past deadline or advances the GM clock.
 */
import {successLevel} from '../rules/tests.js';
import {initialCombatState,validateCombatState} from './persistent-combat-state.js';
export const TRANSCENDENCE_WILL_FORMAT='hmk-transcendence-cf-will-v1';
const check=(ok,message)=>{if(!ok)throw Error('Transcendence Will: '+message)};
const whole=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const ORIGINS=['manual','cryptographic-software-die'];
const clone=x=>structuredClone(x);
function getSource(journal,campaignId,transcendenceId){
 const row=journal.find(x=>x.id===transcendenceId&&x.calendarCampaignId===campaignId&&x.calendarHerbTranscendence);
 check(row&&row.calendarHerbTranscendence.sl==='CF'&&row.calendarHerbTranscendence.willTracked===true,
  'chybí nově doložený kritický neúspěch Transcendence');
 return row;
}
export function pendingTranscendenceWill(journal=[],campaignId=''){
 const done=new Set(journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarHerbTranscendenceWill)
  .map(x=>x.calendarHerbTranscendenceWill.transcendenceId));
 return journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarHerbTranscendence?.willTracked===true&&
  x.calendarHerbTranscendence.sl==='CF'&&!done.has(x.id)).map(x=>({transcendenceId:x.id,
   targetId:x.calendarHerbTranscendence.targetId,dueMinute:x.campaignMinute}));
}
export function createTranscendenceWill({journal=[],campaignId,transcendenceId,targetId,minute,
 willAttribute,fatiguePenalty=0,d100,dieOrigin='manual',gmConfirmed=false}={}){
 check(gmConfirmed===true&&ORIGINS.includes(dieOrigin)&&whole(d100,1,100)&&whole(willAttribute,1,40)&&whole(fatiguePenalty,0,99999),
  'vyžaduje skutečný Will attribute, d100, původ hodu a GM potvrzení');
 const row=getSource(journal,campaignId,transcendenceId),trans=row.calendarHerbTranscendence;
 check(targetId===trans.targetId&&minute===row.campaignMinute,
  'Will test musí vycházet ze stejné postavy a minuty jako kritický neúspěch');
 check(!journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarHerbTranscendenceWill?.transcendenceId===transcendenceId),
  'Will test byl již doložen');
 const willEML=willAttribute*5-fatiguePenalty,sl=['CF','F','S','CS'][successLevel(d100,willEML)];
 const auralShockAdded=sl==='CF'?2:sl==='F'?1:0;
 return {format:TRANSCENDENCE_WILL_FORMAT,campaignId,minute,targetId,transcendenceId,willAttribute,
  willEML,fatiguePenalty,d100,dieOrigin,sl,auralShockAdded,weaknessAdded:auralShockAdded*5,
  gmConfirmed:true,sourcePages:[190,291]};
}
/** Atomic candidate for the original combat fatigue and arcane aural state. */
export function applyTranscendenceWill({state,arcane,round,eventId,proof}={}){
 check(proof?.format===TRANSCENDENCE_WILL_FORMAT&&proof.gmConfirmed===true&&
  ['CF','F','S','CS'].includes(proof.sl)&&
  proof.auralShockAdded===(proof.sl==='CF'?2:proof.sl==='F'?1:0)&&
  proof.weaknessAdded===proof.auralShockAdded*5,'neplatný Will důkaz');
 const s=clone(state??initialCombatState()),a=clone(arcane??{});
 validateCombatState(s);
 check(whole(round,1,9999)&&round>=s.lastRound&&typeof eventId==='string'&&eventId.length>=3&&
  !s.events.some(x=>x.id===eventId),'neplatný nebo duplicitní event');
 check(s.shock!=='KIA','zemřelá postava nemůže vyhodnotit astrální Will');
 const currentFatigue=s.fatigue.windedness+s.fatigue.weariness+s.fatigue.otherWeakness+s.bloodLoss.weaknessFatigue;
 check(proof.fatiguePenalty===currentFatigue,'Will EML nesouhlasí s aktuálním Fatigue');
 const oldLevels=a.auralShockLevels??0;
 check(whole(oldLevels,0,99)&&whole(oldLevels+proof.auralShockAdded,0,99)&&
  whole(s.fatigue.otherWeakness+proof.weaknessAdded,0,99999),'Aural Shock nebo Weakness mimo rozsah');
 a.auralShockLevels=oldLevels+proof.auralShockAdded;
 s.fatigue.otherWeakness+=proof.weaknessAdded;
 s.events.push({id:eventId,round,type:'hmk-astral-transcendence-aural',details:{
  transcendenceId:proof.transcendenceId,willD100:proof.d100,willEML:proof.willEML,sl:proof.sl,
  auralShock:proof.auralShockAdded,auralBefore:oldLevels,auralAfter:a.auralShockLevels,
  weaknessAdded:proof.weaknessAdded,sourcePage:291,noClockAdvance:true}});
 s.lastRound=Math.max(s.lastRound,round);
 validateCombatState(s);
 return {state:s,arcane:a,levelsAdded:proof.auralShockAdded};
}
export function requireTranscendenceWillGMTimeMayAdvance({journal=[],campaignId,beforeMinute,afterMinute}={}){
 if(afterMinute<=beforeMinute)return true;
 const p=pendingTranscendenceWill(journal,campaignId).find(x=>x.dueMinute<afterMinute);
 check(!p,'nesmíte přeskočit povinný Will test v minutě '+p?.dueMinute);
 return true;
}
export function validateTranscendenceWillJournal(journal=[]){
 const earlier=[];
 for(const row of journal){
  if(row.calendarHerbTranscendenceWill){
   const proof=row.calendarHerbTranscendenceWill;
   check(proof.targetId===row.characterId&&proof.campaignId===row.calendarCampaignId&&proof.minute===row.campaignMinute,
    'nesouhlasí kampaň, čas nebo postava');
   const expected=createTranscendenceWill({journal:earlier,...proof});
   check(JSON.stringify(proof)===JSON.stringify(expected),'historický Will důkaz neodpovídá hodu');
  }
  earlier.push(row);
 }
 return true;
}
export function assertTranscendenceWillAppendOnly(before=[],after=[]){
 const map=new Map(after.map(x=>[x.id,x]));
 for(const row of before)if(row.calendarHerbTranscendenceWill)
  check(map.has(row.id)&&JSON.stringify(map.get(row.id))===JSON.stringify(row),'nelze přepsat či smazat historický Will důkaz');
 return true;
}
