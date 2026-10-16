/** HMK 1.2, p.67: deterministic character fall, independent of any horse.
 * Pure proposal only. The caller atomically commits the returned state via the
 * existing synchronized Combat State boundary. Each injury requires the exact
 * falling dice and documented armour, with no default zero protection.
 */
import {humanLocation,woundFromFall} from './hmk-mounted-fall-injury-join.js';
import {resolveLiveCombatArmour} from './live-combat-armour.js';
import {resolveCombatantLoad} from './combatant-load.js';
import {projectLiveInjuries} from './live-injury-impairment.js';
import {combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';
import {successLevel,SL} from '../rules/tests.js';
const must=(condition,message)=>{if(!condition)throw Error(message)};
const die=(n,max)=>Number.isSafeInteger(n)&&n>=1&&n<=max;
const surfaces=Object.freeze({water:-16,mud:-12,snow:-8,earth:-4,paving:-2,rock:0});
const levelNames=['CF','F','S','CS'];
const skillML=(actor,skill)=>{
 const a=(actor.hmk?.skills||[]).filter(x=>String(x.name||'').toLowerCase()===skill.toLowerCase());
 must(a.length===1&&Number.isSafeInteger(a[0].ml)&&a[0].ml>0,`Postava nemá ověřenou dovednost ${skill}`);
 return a[0].ml;
};
function heightImpact(ft){
 must(Number.isSafeInteger(ft)&&ft>=6&&ft<=1000,'Falling Routine p.67 vyžaduje doložený pád vyšší než 5 stop');
 if(ft<=10)return -2;if(ft<=20)return 2;if(ft<=30)return 4;
 if(ft<=40)return 8;if(ft<=50)return 12;
 return 12+4*Math.ceil((ft-50)/10);
}
const adjustment={Jumping:{CF:4,F:0,S:-2,CS:-4},Acrobatics:{CF:2,F:0,S:-4,CS:-6},Swimming:{CF:4,F:0,S:-2,CS:-4}};
const limbs=new Set(['sh','ua','el','fo','ha','th','kn','ca','ft']);
export function prepareClimbingFallingSequence({actor,inventory,state,fallHeightFt,surface,originSkill='Climbing',slope='sheer',direction='front',rows,round=1,timelineId,eventId,gmConfirmed=false}={}){
 must(gmConfirmed===true&&actor?.id&&Array.isArray(inventory)&&state&&typeof eventId==='string'&&eventId&&typeof timelineId==='string'&&timelineId&&die(round,9999),
  'Pád vyžaduje živou postavu, Combat State, totožnost události a potvrzení GM');
 validateCombatState(state);
 must(Array.isArray(rows)&&rows.length>=1&&rows.length<=20,'Vyplňte jeden nebo více úplných pádových zásahů (nejvýše 20)');
 must(Object.hasOwn(surfaces,surface),'Povrch dopadu musí být ověřen GM');
 must(['Climbing','Acrobatics','Jumping'].includes(originSkill),'Nepovolený původ Falling Routine');
 must(originSkill==='Climbing'||slope==='sheer','Jiná činnost než Climbing nemá doloženou úpravu sklonu svahu');
 must(['sheer','steep','very-steep'].includes(slope),'Uveďte skutečný svah podle pravidla str.67');
 must(['front','rear','side'].includes(direction),'Chybí doložený směr dopadu pro výpočet zbroje');
 const distanceModifier=heightImpact(fallHeightFt);
 const load=resolveCombatantLoad({character:actor,inventory});
 must(load.ready&&load.encReady&&load.bulkReady,
  'Zbroj/ENC/Bulk není pravidlově ověřeno. Nejprve opravte vrstvení; zranění nelze počítat s fiktivní AV.');
 let current=structuredClone(state),proofs=[];
 for(let i=0;i<rows.length;i++){
  const r=rows[i];
  must(die(r.impactD10,10)&&die(r.zoneD10,10)&&die(r.locationD10,10)&&die(r.fallingD100,100),
   'Zásah '+(i+1)+': chybí d10 Impact, ZD, LD nebo Falling d100');
  must(Object.hasOwn(adjustment,r.technique),
   'Zásah '+(i+1)+': vyberte Jumping, Acrobatics nebo u dopadu do vody Swimming');
  must(r.technique!=='Swimming'||surface==='water', 'Swimming je volitelné pouze pro dopad do vody');
  const injury=projectLiveInjuries({state:current,round,test:r.technique.toLowerCase(),usedArms:['left','right'],timelineId});
  must(injury.ready&&!injury.unusable&&!injury.stunned,
   'Zásah '+(i+1)+': nelze bezpečně doložit EML Falling Test při aktuálním zranění / Shock');
  must(current.shock==='NONE','Před dalším Falling Test je nutné řešit aktuální Shock stav');
  const eml=skillML(actor,r.technique)-combatFatigueTotals(current).total+load.agilityAndMeleePenalty+injury.modifier;
  const sl=levelNames[successLevel(r.fallingD100,eml)];
  const loc=humanLocation(r.zoneD10,r.locationD10);
  const armour=resolveLiveCombatArmour({inventory,targetId:actor.id,location:loc.location,aspect:'b',direction,mode:'auto',rigidStatus:'unknown'});
  must(armour.ready,'Zásah '+(i+1)+': chybí ověřená skutečná ochrana zbroje: '+(armour.reason||'neznámý důvod'));
  const fullImpact=r.impactD10+distanceModifier+surfaces[surface]+adjustment[r.technique][sl];
  // p.67: modifiers from less-than-sheer climbing apply BEFORE armour.
  const strikeImpact=slope==='steep'&&['S','CS'].includes(sl)?0:
   slope==='sheer'?fullImpact:Math.floor(fullImpact/2);
  const physicalDice=[{faces:10,value:r.impactD10,source:'GM-entered-physical-die'},
   {faces:10,value:r.zoneD10,source:'GM-entered-physical-die'},
   {faces:10,value:r.locationD10,source:'GM-entered-physical-die'},
   {faces:100,value:r.fallingD100,source:'GM-entered-physical-die'},
   ...(r.shockD100==null?[]:[{faces:100,value:r.shockD100,source:'GM-entered-physical-die'}]),
   ...(r.compoundD10==null?[]:[{faces:10,value:r.compoundD10,source:'GM-entered-physical-die'}])];
  const result=woundFromFall({state:current,character:actor,round,timelineId,eventId:eventId+':impact:'+i,
   bodyKind:'human',location:loc.location,side:loc.side,locationShock:loc.locationShock,
   strikeImpact,AV:armour.armourValue,shockRoll:r.shockD100??null,compoundD10:r.compoundD10??null,
   physicalDice});
  current=result.state;
  proofs.push({index:i,location:loc.location,side:loc.side,impact:strikeImpact,effectiveImpact:result.effectiveImpact,
   armourValue:armour.armourValue,fallingTechnique:r.technique,fallingD100:r.fallingD100,fallingEML:eml,
   level:sl,injury:result.injury,shock:result.shockSL,physicalDice});
  if(sl==='CF')must(i+1<rows.length,'CF v testu dopadu: HMK str.67 vyžaduje opakovat kroky 1–4 pro DALŠÍ zranění');
  else must(i===rows.length-1,'Dodatečné zranění po Falling Test bez CF není přípustné');
 }
 const last=proofs.at(-1);const standing=limbs.has(last.location)&&fallHeightFt<=(last.fallingTechnique==='Acrobatics'?20:10);
 current=structuredClone(current);current.posture.prone=current.posture.prone||(surface!=='water'&&!standing);
 // Even when impact is fully absorbed, the fall and posture are durable events.
 current.events.push({id:eventId+':complete',type:'skill-physical-fall',round,details:{
  sourceEventId:eventId,timelineId,originSkill,fallHeightFt,surface,slope,direction,
  impactEventIds:proofs.map((_,i)=>eventId+':impact:'+i),prone:current.posture.prone,
  physicalDice:proofs.flatMap(p=>p.physicalDice),rulePage:67}});
 current.lastRound=Math.max(current.lastRound,round);
 validateCombatState(current);
 return {format:'hmk-climbing-falling-confirmed-plan-v1',actorId:actor.id,originId:eventId,
  state:current,proofs,fallHeightFt,surface,slope,direction,originSkill,prone:current.posture.prone,
  physicalDice:proofs.flatMap(p=>p.physicalDice)};
}

/** HMK p.67 requires an Injury Sequence only when falling more than 5 ft.
 * For shorter falls only the GM-observed postural outcome is recorded. */
export function prepareShortClimbingFall({actor,state,fallHeightFt,prone,round,eventId,timelineId,originSkill='Climbing',gmConfirmed=false}={}){
 must(gmConfirmed===true&&actor?.id&&state&&die(round,9999)&&typeof eventId==='string'&&eventId&&
  typeof timelineId==='string'&&timelineId&&Number.isSafeInteger(fallHeightFt)&&fallHeightFt>=0&&fallHeightFt<=5&&typeof prone==='boolean',
  'Krátký pád musí mít skutečnou výšku do 5 stop a potvrzený postoj GM');
 must(['Climbing','Acrobatics','Jumping'].includes(originSkill),'Neplatná činnost krátkého pádu');
 validateCombatState(state);
 const current=structuredClone(state);current.posture.prone=current.posture.prone||prone;
 must(!current.events.some(e=>e.id===eventId+':complete'),'Pád už je potvrzen');
 current.events.push({id:eventId+':complete',type:'skill-physical-short-fall',round,details:{
  sourceEventId:eventId,timelineId,originSkill,fallHeightFt,prone:current.posture.prone,rulePage:67,
  noInjurySequenceReason:'HMK p.67 Falling Routine requires greater than 5 feet'}});
 current.lastRound=Math.max(current.lastRound,round);validateCombatState(current);
 return {format:'hmk-climbing-short-fall-v1',actorId:actor.id,state:current,proofs:[],fallHeightFt,
  shortFall:true,prone:current.posture.prone,physicalDice:[]};
}
