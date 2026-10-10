/** HMK World of Kèthîra, p.106 and p.161. Staged and fail-closed:
 * an opposed Melee victory must be independently confirmed by the GM;
 * real d6 on each side determines the special effect.
 */
import {grabRoll,pressRoll,tripRoll,pressEffect,tripEffect,heldSlotInGrabZone} from '../rules/melee.js';
import {SL,successLevel} from '../rules/tests.js';
import {shockStateFromIndex,shockRollModifier,applyShockState,SHOCK_STATE} from '../rules/shock.js';
import {validateCombatState,initialCombatState,combatFatigueTotals} from './persistent-combat-state.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
const ok=(v,msg)=>{if(!v)throw Error(msg);};
const whole=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const clone=x=>structuredClone(x);
function ready(state,round,eventId,confirmed){const s=clone(state??initialCombatState());validateCombatState(s);ok(confirmed===true,'GM musí potvrdit vítězství v původním Melee testu a konkrétní situaci');ok(whole(round,1,9999)&&round>=s.lastRound,'Nesprávné kolo');ok(typeof eventId==='string'&&eventId&&!s.events.some(e=>e.id===eventId),'Duplicitní událost');ok(s.shock!=='KIA','KIA');return s;}
function log(s,round,id,type,details){s.events.push({id,type,round,details});s.lastRound=round;validateCombatState(s);return s;}
export function applyConfirmedHMKManeuver({state,round,eventId,kind,attackerId,targetId,attackerSTR,targetSTR,attackerD6,targetD6,impactTA=0,charge=false,oneHanded=false,offHanded=false,grabAction='hold',zone=null,confirmedMeleeVictory=false,gmConfirmed=false}={}){
 const s=ready(state,round,eventId,gmConfirmed);ok(confirmedMeleeVictory===true,'Původní vítězství v Melee nebylo doloženo');
 ok(['press','trip','grab'].includes(kind),'Neznámý HMK manévr');ok(typeof attackerId==='string'&&attackerId&&typeof targetId==='string'&&targetId&&attackerId!==targetId,'Neplatní protivníci');
 ok(whole(attackerSTR,1,40)&&whole(targetSTR,1,40)&&whole(attackerD6,1,6)&&whole(targetD6,1,6)&&whole(impactTA,0,4),'Neplatný STR, d6 nebo Impact TA');
 ok(!s.pendingManeuver,'Nejdříve vyřešte dřívější Stumble/Shock z manévru');
 ok(!(s.grabHold?.active),'Cíl je již v držení; zopakujte Grab Roll podle pravidla Hold');
 let attackerScore,defenderScore,effect=null;
 if(kind==='press'){attackerScore=pressRoll({str:attackerSTR,d6:attackerD6,impactTA,charge});defenderScore=targetSTR+targetD6;effect=pressEffect(attackerScore-defenderScore);}
 if(kind==='trip'){attackerScore=tripRoll({str:attackerSTR,d6:attackerD6,impactTA});defenderScore=targetSTR+targetD6;effect=tripEffect(attackerScore-defenderScore);}
 if(kind==='grab'){
  ok(['hold','take'].includes(grabAction)&&typeof zone==='string'&&zone.length>0,'Grab vyžaduje Hold/Take a cílovou zónu');
  attackerScore=grabRoll({str:attackerSTR,d6:attackerD6,impactTA,oneHanded,offHanded});defenderScore=targetSTR+targetD6;
  if(attackerScore>defenderScore){effect=grabAction==='hold'?{held:true,zone}:{takePending:true,zone};}
 }
 const margin=attackerScore-defenderScore;
 if(effect?.prone){s.posture??={prone:false,dropPending:false,passNextTurn:false};s.posture.prone=true;}
 if(effect?.stumble||effect?.shockIndex){s.pendingManeuver={kind:effect.stumble?'stumble':'shock',shockIndex:effect.shockIndex??null,sourceId:eventId,attackerId,createdRound:round};}
 if(effect?.automaticGrabChoice){s.pendingAutomaticGrab={grabberId:attackerId,targetId,sourceId:eventId,createdRound:round};}
 if(effect?.held){s.grabHold={active:true,grabberId:attackerId,targetId,zone,createdRound:round};}
 if(effect?.takePending){s.pendingGrabTake={fromActorId:targetId,toActorId:attackerId,zone,sourceId:eventId};}
 return {state:log(s,round,eventId,'hmk-'+kind,{attackerId,targetId,attackerD6,targetD6,attackerSTR,targetSTR,impactTA,attackerScore,defenderScore,margin,effect}),margin,effect,won:margin>0};
}
/** Explicit next-grabber-turn retest. A tied or lost roll breaks the hold. */
export function applyConfirmedGrabRetest({state,round,eventId,attackerId,targetSTR,attackerSTR,attackerD6,targetD6,impactTA=0,oneHanded=false,offHanded=false,gmConfirmed=false}={}){
 const s=ready(state,round,eventId,gmConfirmed);const hold=s.grabHold;ok(hold?.active&&hold.grabberId===attackerId,'Neexistuje aktivní Hold této postavy');
 ok(round>hold.createdRound,'Hold se opakuje až v následujícím tahu grabbera');
 ok(whole(attackerSTR,1,40)&&whole(targetSTR,1,40)&&whole(attackerD6,1,6)&&whole(targetD6,1,6)&&whole(impactTA,0,4),'Neplatné reálné hody d6/STR');
 const score=grabRoll({str:attackerSTR,d6:attackerD6,impactTA,oneHanded,offHanded});const victim=targetSTR+targetD6;
 if(score<=victim)hold.active=false;
 else hold.createdRound=round;
 return {state:log(s,round,eventId,'hmk-grab-retest',{attackerId,score,victim,continued:hold.active}),continued:hold.active};
}
/** Verify the actual defender's Shock or Agility against the current persistent
 * injury, Fatigue, and Stunned state; no guessed anatomy or raw ML. HMK pp.161,170. */
export function verifiedManeuverConsequence({state,character,round,timelineId=null}={}){
 validateCombatState(state);
 const kind=state.pendingManeuver?.kind;
 ok(['shock','stumble'].includes(kind),'Žádný splatný Shock/Stumble po manévru');
 ok(character?.hmk?.attributes&&whole(round,1,9999),'Chybí skutečná postava a bojové kolo');
 const fatigue=combatFatigueTotals(state).total;
 let rawML,impairment=0,forcedCF=false,hasLegs=null;
 if(kind==='shock'){
  const skills=(character.hmk.skills||[]).filter(x=>String(x.name||'').trim().toLowerCase()==='shock');
  ok(skills.length===1&&whole(skills[0].ml,0,200),'Chybí jednoznačné skutečné Shock ML cíle');
  rawML=skills[0].ml; // HMK p.170: Shock is not an Impaired test.
 }else{
  const agl=character.hmk.attributes.agl;
  ok(whole(agl,1,40),'Chybí skutečné Agility cíle pro Stumble');
  rawML=agl*5;
  const projection=projectLiveInjuries({state,round,test:'agility',usedArms:[],timelineId});
  ok(projection.ready,'Stumble: chybí prokazatelný impairment: '+projection.reason);
  impairment=projection.impairment;forcedCF=projection.unusable;
  if(typeof character.hmk.anatomy?.hasLegs==='boolean')hasLegs=character.hmk.anatomy.hasLegs;
  else if(String(character.hmk.folk||'').trim().toLowerCase()==='human')hasLegs=true;
  const amputated=new Set(state.wounds.filter(w=>w.amputation?.severed===true&&
   ['th','kn','ca','ft','thigh','knee','calf','foot'].includes(String(w.location).trim().toLowerCase())&&
   ['left','right'].includes(w.side)).map(w=>w.side));
  if(amputated.size===2)hasLegs=false;
  ok(typeof hasLegs==='boolean','Stumble: chybí ověřená anatomie cíle – má nohy (hasLegs)?');
 }
 return {kind,rawML,ml:rawML-fatigue-impairment,fatigue,injuryImpairment:impairment,
  forcedCF,hasLegs,stunned:state.shock==='STN'};
}
/** Resolve the mandatory Press Shock / Stumble before another action. */
export function applyConfirmedManeuverConsequence({state,round,eventId,kind,roll=null,ml,hasLegs=null,forcedCF=false,gmConfirmed=false}={}){
 const s=ready(state,round,eventId,gmConfirmed),p=s.pendingManeuver;
 ok(p?.kind===kind,'Tento manévr nemá splatný následek daného druhu');
 ok(Number.isSafeInteger(ml)&&ml>=-200000&&ml<=200,'Chybí ověřená účinná Mastery Level');
 ok(typeof forcedCF==='boolean'&&(!forcedCF?whole(roll,1,100):(kind==='stumble'&&roll===null)),'Doložte skutečný d100 nebo Stumble automatické CF bez hodu');
 if(kind==='stumble')ok(typeof hasLegs==='boolean','Není potvrzena anatomie pro Stumble');
 const originalSL=forcedCF?SL.CF:successLevel(roll,ml);
 const sl=kind==='stumble'&&s.shock==='STN'?Math.max(SL.CF,originalSL-1):originalSL;
 let outcome;
 if(kind==='stumble'){
  if(sl<SL.S){
   s.posture??={prone:false,dropPending:false,passNextTurn:false};
   if(hasLegs)s.posture.prone=true;else s.posture.passNextTurn=true;
  }
  outcome={prone:s.posture?.prone===true,passNextTurn:s.posture?.passNextTurn===true,sl,originalSL,forcedCF};
 }else if(kind==='shock'){
  ok(whole(p.shockIndex,1,9),'Neplatný povinný Shock Index');
  const index=p.shockIndex+shockRollModifier(sl);
  const incoming=shockStateFromIndex(index);
  const reverse={none:'NONE',stunned:'STN',incapacitated:'INC',unconscious:'UNC',killed:'KIA'};
  const prior={NONE:'none',STN:'stunned',INC:'incapacitated',UNC:'unconscious',KIA:'killed'}[s.shock];
  s.shock=reverse[applyShockState(prior,incoming)];
  if(['INC','UNC'].includes(s.shock)){s.posture??={prone:false,dropPending:false,passNextTurn:false};s.posture.prone=true;}
  // Do not invent a Shock followup for a different timeline: preserve evidence and mark due for GM/scheduler.
  if(s.shock!=='NONE'&&s.shock!=='KIA')s.shockFollowup={kind:s.shock,originRound:round,dueRound:round+(s.shock==='UNC'?120:1),phase:s.shock==='UNC'?'after-ten-minutes':'end-next-turn',timelineId:s.encounterTimelineId??null};
  if(s.shock==='KIA'){s.shockFollowup=null;s.extendedShock=null;s.coma=null;for(const w of s.wounds)w.nextAdvanceRound=null;}
  outcome={shock:s.shock,index,sl};
 }else throw Error('Neznámý následek manévru');
 s.pendingManeuver=null;
 return {state:log(s,round,eventId,'hmk-maneuver-'+kind,{roll,ml,sl,originalSL,forcedCF,hasLegs,result:outcome}),outcome};
}
/** Take is not complete until the actual held object moves in inventory. */
export function applyConfirmedGrabTakeTransfer({state,inventory,round,eventId,attackerId,targetId,itemId,targetHandedness,gmConfirmed=false}={}){
 const s=ready(state,round,eventId,gmConfirmed);const t=s.pendingGrabTake;
 ok(t&&t.toActorId===attackerId&&t.fromActorId===targetId,'Není splatné Take mezi uvedenými postavami');
 ok(Array.isArray(inventory),'Inventář je povinný');const items=clone(inventory);
 const item=items.find(x=>x.id===itemId&&x.characterId===targetId&&['main_hand','off_hand'].includes(x.slot));
 ok(!!item,'Grab Take může převzít pouze skutečně držený předmět oběti');
 ok(item.slot===heldSlotInGrabZone(t.zone,targetHandedness),
  'Grab Take vyžaduje skutečný předmět držený v zasažené ruce HMK p.106');
 item.characterId=attackerId;item.slot='carried';
 s.pendingGrabTake=null;
 return {state:log(s,round,eventId,'hmk-grab-take',{itemId,attackerId,targetId,zone:t.zone}),inventory:items};
}
