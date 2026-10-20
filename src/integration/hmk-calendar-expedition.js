/** HMK v1.2 pp.62, 145–150, 176: certified travel fatigue / rest timing.
 * NOT a substitute for Orienteering, Weather, Survival or Encounter procedures.
 * A watch is four hours; Double Time uses four separately rolled hourly SRs.
 */
import {windednessRecovery,wearinessRecovery} from '../rules/fatigue.js';
const whole=(v,min=0,max=100000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const assert=(v,msg)=>{if(!v)throw Error(msg);};
const DAY=1440;
export function secureHMKDie(sides){
 assert(whole(sides,2,100),'Neplatná kostka');
 if(!globalThis.crypto?.getRandomValues)throw Error('Bezpečný generátor není dostupný');
 const max=2**32,top=Math.floor(max/sides)*sides,a=new Uint32Array(1);
 do{globalThis.crypto.getRandomValues(a);}while(a[0]>=top);
 return a[0]%sides+1;
}
export function expeditionSecondaryRoll({endurance,roll,riding=false}={}){
 assert(whole(endurance,0,50)&&whole(roll,1,10),'END SR vyžaduje potvrzené END a hod d10');
 const tn=Math.floor(endurance/2)+(riding?2:0);
 return {tn,roll,success:roll<=tn,sourcePage:62};
}
export function expeditionWatchFatigue({mode='walk',endurance,rolls,modifiedENC=0,ignoreLoaded=false,weatherExtra=0}={}){
 assert(['walk','ride','drive','double-walk','double-drover'].includes(mode),'Neznámý cestovní režim');
 assert(whole(modifiedENC,0,10000)&&[0,5,10].includes(weatherExtra),'ENC nebo weather hazard nemá doloženou hodnotu');
 assert(typeof ignoreLoaded==='boolean','Neplatná volba Loaded Mode');
 assert(Array.isArray(rolls)&&rolls.length===(mode.startsWith('double-')?4:1),'Počet hodů END SR neodpovídá počtu časových intervalů');
 const riding=mode==='ride'||mode==='drive',double=mode.startsWith('double-');
 const base=double?(mode==='double-drover'?5:10):5;
 const extraLoad=!double&&mode==='walk'&&ignoreLoaded?Math.floor(modifiedENC/10)*10:0;
 const results=rolls.map(roll=>expeditionSecondaryRoll({endurance,roll,riding}));
 const accrual=results.reduce((a,r)=>a+Math.max(0,base+extraLoad-(r.success?5:0)),0)+weatherExtra;
 return {durationMinutes:240,mode,accrual,rolls:results,base,extraLoad,weatherExtra,
  sourcePages:[62,149,150,176],requiresHazardResolution:true};
}
export function expeditionRestRecovery({minute,current,kind,startedMinutesAgo=0,claims={}}={}){
 assert(whole(minute,0,1e9)&&whole(current,0,10000)&&whole(startedMinutesAgo,0,1440),'Neplatný čas nebo Fatigue');
 assert(['winded','rest','sleep'].includes(kind),'Neznámý druh odpočinku');
 const duration=kind==='winded'?10:kind==='rest'?240:480;
 const last=kind==='winded'?claims.lastWinded:kind==='rest'?claims.lastFourHour:claims.lastEightHour;
 const period=kind==='winded'?60:DAY;
 // Eligibility is based on the start of the new rest, not a day reset at midnight.
 assert(!whole(last,0,1e9)||minute-last>=period,'Tento druh odpočinku lze využít pouze jednou za příslušné časové období');
 const result=kind==='winded'?windednessRecovery({current,restMinutes:10}):
  wearinessRecovery({current,restHours:kind==='rest'?4:0,sleepHours:kind==='sleep'?8:0});
 return {kind,durationMinutes:duration,remaining:result.remaining,recovered:result.recovered,
  claimKey:kind==='winded'?'lastWinded':kind==='rest'?'lastFourHour':'lastEightHour',sourcePages:[150,176]};
}
/** Builds a durable, human-readable certified result; the existing combat
 * state remains the ONE authoritative fatigue calculator. */
export function commitExpeditionFatigue(actor,plan,minute,origin,sourceId){
 assert(actor&&actor.id&&actor.hmk?.combatState?.fatigue,'Postava nemá založený trvalý HMK stav');
 assert(whole(minute,0,1e9)&&typeof sourceId==='string'&&sourceId,'Chybí čas či identita události');
 const current=actor.hmk.combatState, expedition=actor.hmk.expedition??={claims:{}};
 const target=plan.kind==='winded'?'windedness':'weariness';
 const before=current.fatigue[target];assert(whole(before,0,10000),'Neplatná výchozí únava');
 const delta=plan.kind==='travel'?plan.accrual:-plan.recovered;
 const after=Math.max(0,before+delta);current.fatigue[target]=after;
 if(plan.claimKey&&plan.recovered>0)expedition.claims[plan.claimKey]=minute-plan.durationMinutes;
 const evidence={format:'hmk-expedition-time-v1',kind:plan.kind,sourceId,campaignMinute:minute,
  durationMinutes:plan.durationMinutes,origin,priorFatigue:before,finalFatigue:after,
  ...(plan.trekSourceId?{trekSourceId:plan.trekSourceId,travelledLeagues:plan.travelledLeagues,travelledKilometres:plan.travelledKilometres}:{}),
  delta,sourcePages:plan.sourcePages,physicalDice:(plan.rolls??[]).map(r=>({faces:10,value:r.roll,origin})),
  ...(plan.mode?{travelMode:plan.mode,endSR:plan.rolls.map(r=>({tn:r.tn,roll:r.roll,success:r.success}))}:{})};
 return evidence;
}
