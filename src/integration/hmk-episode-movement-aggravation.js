/** HMK v1.2 p.182 OPTIONAL Serious Injury Aggravation: real movement, original
 * wound IDs, chronological GM dice. Five seconds per combat turn (p.157).
 * All updates are applied to a private episode clone, never to live storage.
 */
import {INJURY_LOCATION_ZONES,projectLiveInjuries} from './live-injury-impairment.js';
import {combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {prepareSeriousInjuryAggravation} from './hmk-skill-environment-consequences.js';
import {successLevel,SL} from '../rules/tests.js';
import {campaignKey} from './hmk-calendar-multi-campaign.js';

const assert=(v,msg)=>{if(!v)throw Error(msg);};
const movementZones=new Set(['head','torso','legs','area']);
const stages=new Set(['half','full','charge','double']);
const liveSerious=s=>(s?.wounds||[]).filter(w=>!w.healed&&w.severity==='S'&&movementZones.has(INJURY_LOCATION_ZONES[String(w.location||'').toLowerCase()]));
export const movementActorAble=state=>state&&!['INC','UNC','KIA'].includes(state.shock)&&!state.coma?.active&&!state.asphyxiaComaPending?.active;
export const movementSeriousWounds=liveSerious;
const validD100=x=>Number.isSafeInteger(Number(x))&&String(x??'').trim()!==''&&Number(x)>=1&&Number(x)<=100;
const validD10=x=>Number.isSafeInteger(Number(x))&&String(x??'').trim()!==''&&Number(x)>=1&&Number(x)<=10;
const injuryLabel=w=>`${String(w.location).toUpperCase()} ${w.side==='left'?'L':w.side==='right'?'R':''} · ${w.severity}${w.level}${w.aspect||''}`;
/** The same four-hour clock continues across contiguous travel receipts, but
 * not through unrelated rest, an unproved gap or a different movement mode.
 */
export function movementAggravationCarry(database,{start,memberIds,mode}={}){
 const c=campaignKey(database.campaignClock);
 const rows=database.journal.filter(j=>j.calendarCampaignId===c&&j.calendarTimeEpisode&&j.calendarTimeEpisode.endMinute===start);
 const last=rows.at(-1)?.calendarTimeEpisode;
 if(!last||last.kind!=='travel'||last.movementAggravation?.enabled!==true||last.movementAggravation.mode!==mode||mode!=='half')return {};
 const carry={};for(const id of memberIds){const n=last.movementAggravation.carryOut?.[id];if(Number.isSafeInteger(n)&&n>=0&&n<240)carry[id]=n;}
 return carry;
}
export function movementAggravationPlan(database,{start,end,memberIds=[],enabled=false,mode='half',movementMinutes=null}={}){
 assert(Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&end>start&&end-start<=10080,'Neplatný čas pohybu');
 const span=movementMinutes===null?end-start:movementMinutes;
 assert(Number.isSafeInteger(span)&&span>=0&&span<=end-start,'Nedoložená délka skutečného pohybu');
 assert(stages.has(mode),'Neznámý režim Half / Full / Charge / Double Move');
 if(!enabled)return {enabled:false,mode,carryOut:{},checks:[]};
 const actors=memberIds.map(id=>database.characters.find(c=>c.id===id));
 assert(actors.every(Boolean)&&new Set(memberIds).size===memberIds.length,'Chybí původní účastník cestování');
 if(mode==='double'&&actors.some(c=>liveSerious(c.hmk?.combatState).length))throw Error('HMK 182: Double Move je při Serious zranění hlavy, trupu či nohy zakázán. Zvolte Half / Full Move.');
 // The current UI has minute resolution, but a Full Move or Charge is a
 // five-second TURN, not a whole minute. Every actual turn earns its own test.
 const turnCount=mode==='half'?0:span*12;
 assert(!actors.some(c=>movementActorAble(c.hmk?.combatState)&&liveSerious(c.hmk?.combatState).length)||turnCount<=1440,'Full Move / Charge: nejvýše 120 minut v jedné epizodě (1440 tahů). Rozdělte úsek na kratší epizody.');
 const carryIn=movementAggravationCarry(database,{start,memberIds,mode});
 const carryOut={},checks=[];
 for(const c of actors){
  const state=c.hmk?.combatState;const wounds=movementActorAble(state)?liveSerious(state):[];
  const prior=wounds.length&&mode==='half'?(carryIn[c.id]||0):0;
  carryOut[c.id]=wounds.length&&mode==='half'?(prior+span)%240:0;
  if(!wounds.length||span===0)continue;
  if(mode==='half'){
   let ordinal=0;
   for(let offset=240-prior;offset<=span;offset+=240){
    ordinal++;checks.push({characterId:c.id,minute:start+offset,ordinal,mode});
   }
  }else for(let i=1;i<=turnCount;i++)checks.push({characterId:c.id,minute:start+Math.ceil(i/12),ordinal:i,mode});
 }
 checks.sort((a,b)=>a.minute-b.minute||a.characterId.localeCompare(b.characterId)||a.ordinal-b.ordinal);
 return {enabled:true,mode,carryIn,carryOut,checks};
}
export const movementAggravationKey=e=>['movement-aggravation',e.characterId,e.minute,e.ordinal,e.mode].join('|');
/** Only a CF of THIS Agility test requires separate Shock SRs for all serious
 * movement zones. Never roll Shock for ordinary F, S, CS. */
export function movementAggravationStep(database,event,{rolls={},idFactory,stamp}={}){
 const actor=database.characters.find(c=>c.id===event.characterId);
 assert(actor?.hmk?.combatState,'Aggravation: chybí Combat State původní postavy');
 const state=actor.hmk.combatState;validateCombatState(state);
 const wounds=liveSerious(state),key=movementAggravationKey(event);
 if(state.shock==='KIA'||!wounds.length)return {key,event,skipped:true};
 if(!movementActorAble(state))return {key,event,skipped:true,incapacitated:true};
 const supplied=rolls[key]&&typeof rolls[key]==='object'?rolls[key]:{};
 const fields=[{name:'roll',label:'Agility · skutečný d100 ('+event.mode+', tah '+event.ordinal+')',min:1,max:100}];
 // HMK p.170: Agility is an impaired test of head, torso and legs. The
 // authoritative live projection includes separately identified wounds.
 const injury=projectLiveInjuries({state,round:Math.max(1,state.lastRound),test:'agility',usedArms:[]});
 assert(injury.ready&&!injury.unusable,'Agility / pohyb není možný bez ověřené anatomie: '+(injury.reason||'nepoužitelná zóna'));
 const attribute=Number(actor.hmk.attributes?.agl);
 assert(Number.isSafeInteger(attribute)&&attribute>=1,'Postava nemá doložené AGL pro povinný pohybový test');
 const load=resolveCombatantLoad({character:actor,inventory:database.inventory||[]});
 // An armour layering issue cannot be silently treated as zero ENC/Bulk.
 // A source-attested GM EML is allowed, but its provenance is mandatory.
 const automatic=load.ready&&load.encReady&&load.bulkReady&&Number.isFinite(load.agilityAndMeleePenalty);
 const raw=automatic?attribute*5-combatFatigueTotals(state).total+load.agilityAndMeleePenalty+injury.modifier:null;
 if(!automatic){fields.push({name:'eml',label:'GM ověřený Agility EML (−200 až 200)',min:-200,max:200,type:'number'},
  {name:'emlEvidence',label:'Původ EML včetně ENC / Bulk / Fatigue',type:'text',minLength:6,maxLength:500});}
 if(!validD100(supplied.roll)||!automatic&&(!Number.isSafeInteger(Number(supplied.eml))||
    String(supplied.eml??'').trim()===''||Number(supplied.eml)<-200||Number(supplied.eml)>200||
    typeof supplied.emlEvidence!=='string'||supplied.emlEvidence.trim().length<6)){
  return {key,event,fields,values:supplied,requirement:{key,kind:'movement-aggravation',characterId:actor.id,dueMinute:event.minute,
   reason:'HMK 182: '+event.mode+' – povinný Agility test; '+wounds.length+' aktivních Serious ran v pohybových zónách.',fields,values:supplied}};
 }
 const eml=automatic?raw:Number(supplied.eml),roll=Number(supplied.roll),level=['CF','F','S','CS'][successLevel(roll,eml)];
 if(level==='CF')for(const w of wounds)fields.push({name:'shock_'+w.id,label:'Shock SR d10 · '+injuryLabel(w),min:1,max:10});
 const missing=fields.filter(f=>f.name.startsWith('shock_')&&!validD10(supplied[f.name]));
 if(missing.length)return {key,event,fields,values:supplied,requirement:{key,kind:'movement-aggravation',characterId:actor.id,dueMinute:event.minute,
  reason:'Agility CF: HMK 182 vyžaduje SAMOSTATNÝ Shock SR pro každou použitou Serious ránu. Původní d100 zůstává zachován.',fields,values:supplied}};
 const sourceId='travel-move:'+key;let consequence=null;
 if(level==='CF'){
  const outcome=prepareSeriousInjuryAggravation({actor,state,sourceId,round:Math.max(1,state.lastRound),originalSL:'CF',ruleEnabled:true,
   woundRolls:wounds.map(w=>({woundId:w.id,d10:Number(supplied['shock_'+w.id])})),gmConfirmed:true});
  actor.hmk.combatState=outcome.state;consequence=outcome.report;
 }
 const inputs={roll,eml,emlSource:automatic?'live-combat-fatigue-armour-injury':'gm-attested',
  ...(automatic?{}:{emlEvidence:supplied.emlEvidence.trim()}),shockRolls:level==='CF'?wounds.map(w=>({woundId:w.id,roll:Number(supplied['shock_'+w.id])})):[]};
 const doc={id:idFactory(),characterId:actor.id,calendarCampaignId:campaignKey(database.campaignClock),campaignMinute:event.minute,
  createdAt:stamp(),title:'HMK · Serious Injury Aggravation · '+event.mode,
  body:'HMK 182 · '+event.mode+' · tah/interval '+event.ordinal+' · Agility '+roll+' vs EML '+eml+' = '+level+
   (consequence?' · samostatné Shock SR: '+consequence.consequences.map(x=>injuryLabel(wounds.find(w=>w.id===x.woundId))+' '+x.d10+'/'+x.tn+(x.passed?' úspěch':' HR sníženo')).join('; '):''),
  calendarEpisodeTimedMedical:{format:'hmk-episode-timed-medical-v1',type:'movement-aggravation',key,
   dueMinute:event.minute,sourceId,inputs,report:{level,consequence,woundIds:wounds.map(w=>w.id),
    woundDescriptions:wounds.map(w=>({id:w.id,location:w.location,side:w.side||null,severity:w.severity,level:w.level,aspect:w.aspect||null}))},
   combatStateEventId:level==='CF'?'skill-aggravation:'+sourceId:null}};
 database.journal.push(doc);
 return {key,event,fields,values:supplied,receipt:doc,change:{key,actorId:actor.id,kind:'movement-aggravation',dueMinute:event.minute,
  description:'Agility '+level+' (d100 '+roll+') · '+event.mode+(consequence?' · Shock SR '+consequence.consequences.length+' ran':''),
  roll,sl:level,report:{eml,consequence,woundIds:wounds.map(w=>w.id)}}};
}
