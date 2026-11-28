/** HMK 271. Airtap doubles held breath and halves movement fatigue. */
import {activeAdditionalTemporary} from './hmk-alchemy-imbibing.js?v=94.174';

export function airtapEvidence({journal,campaignId,minute,actorId,auralShockLevels=0}){
 if(auralShockLevels!==0)return null;
 const sources=activeAdditionalTemporary(journal,campaignId,actorId,minute,'Airtap')
  .filter(source=>source.state.nextDueMinute>minute);
 if(!sources.length)return null;
 const source=sources.reduce((best,dose)=>dose.state.nextDueMinute>best.state.nextDueMinute?dose:best);
 return {useId:source.useId,finishId:source.finishId,fromMinute:minute,untilMinute:source.state.nextDueMinute,sourcePage:271};
}

export function airtapTravelUnits(actor,{minutes,begin,onFoot,airtap}){
 const dice=actor.hourlyEndSR;
 const rate=(actor.extraFatigue??0)+(actor.duneFatigue??0);
 const protectedMinutes=airtap?Math.max(0,Math.min(minutes,airtap.untilMinute-begin)):0;
 const base=count=>dice?
  dice.reduce((units,roll,i)=>units+Math.min(60,Math.max(0,count-60*i))*4*
   Math.max(0,(onFoot?10:5)-(roll.success?5:0)),0):
  count*(actor.sr?.success?0:5);
 return base(minutes)+minutes*rate-(base(protectedMinutes)+protectedMinutes*rate)/2;
}
