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
import {successLevel,effectiveMasteryLevel} from '../rules/tests.js';
import {injuryFromEffectiveImpact,compoundCompatible} from '../rules/injury.js';
import {stunnedImpairedSL} from '../rules/injury-effects.js';
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
/** Read-only step inspection for an on-screen falling checklist.  No dice are rolled,
 * no state is written, and no optional roll is guessed or silently discarded.
 * This uses the same armour, fatigue, skill and Injury functions as the commit.
 */
export function inspectClimbingFallingStep({actor,inventory,state,fallHeightFt,surface,slope='sheer',
 direction='front',row,round=1,timelineId='skill-falling-preview'}={}){
 must(actor?.id&&Array.isArray(inventory)&&state,'Pro náhled chybí postava, inventář nebo stav');
 validateCombatState(state);
 must(Object.hasOwn(surfaces,surface)&&['sheer','steep','very-steep'].includes(slope),
  'Pro náhled nejprve vyberte doložený povrch a sklon');
 must(['front','rear','side'].includes(direction),'Pro náhled vyberte skutečný směr dopadu');
 const needed=[];
 const dice={impactD10:10,zoneD10:10,locationD10:10,fallingD100:100};
 for(const [field,faces] of Object.entries(dice)){
  if(row?.[field]===null||row?.[field]===undefined)needed.push(field);
  else must(die(row[field],faces),'Neplatný '+field+' (přípustné 1–'+faces+')');
 }
 must(Object.hasOwn(adjustment,row?.technique),'Zvolte Jumping, Acrobatics nebo Swimming');
 must(row.technique!=='Swimming'||surface==='water','Swimming lze použít pouze při dopadu do vody');
 const load=resolveCombatantLoad({character:actor,inventory});
 must(load.ready&&load.encReady&&load.bulkReady,'Nelze určit skutečné ENC/Bulk: '+(load.issues||[]).join('; '));
 const injury=projectLiveInjuries({state,round,test:row.technique.toLowerCase(),
  usedArms:['left','right'],timelineId});
 must(injury.ready,'Nelze ověřit oslabení z ran: '+(injury.reason||''));
 must(!injury.unusable&&!['INC','UNC','KIA'].includes(state.shock),
  'INC/UNC/KIA nebo nepoužitelná končetina vyžadují samostatné vyhodnocení dalšího Falling Test; nelze je označit za normální d100');
 const rawEML=skillML(actor,row.technique)-combatFatigueTotals(state).total+
  load.agilityAndMeleePenalty+injury.modifier;
 const eml=effectiveMasteryLevel(rawEML);
 if(needed.length)return {ready:false,needed,rawEML,eml,technique:row.technique};
 const rolledSL=successLevel(row.fallingD100,rawEML);
 const finalSL=stunnedImpairedSL(rolledSL,{stunned:state.shock==='STN',isImpairedTest:true});
 const sl=levelNames[finalSL];
 const loc=humanLocation(row.zoneD10,row.locationD10);
 const armour=resolveLiveCombatArmour({inventory,targetId:actor.id,location:loc.location,
  aspect:'b',direction,mode:'auto',rigidStatus:'unknown'});
 must(armour.ready,'Skutečná ochrana zbroje neověřena: '+(armour.reason||'?'));
 const fullImpact=row.impactD10+heightImpact(fallHeightFt)+surfaces[surface]+adjustment[row.technique][sl];
 const strikeImpact=slope==='steep'&&['S','CS'].includes(sl)?0:
  slope==='sheer'?fullImpact:Math.floor(fullImpact/2);
 const effectiveImpact=strikeImpact-armour.armourValue;
 const base=injuryFromEffectiveImpact({effectiveImpact,aspect:'b',rigidArmour:false});
 const limb=new Set(['sh','ua','el','fo','ha','th','kn','ca','ft']);
 const existing=state.wounds.filter(w=>!w.healed&&w.location===loc.location&&
  (!limb.has(loc.location)||w.side===loc.side)&&
  compoundCompatible(w,{location:loc.location,aspect:'b',area:false}));
 const needsCompound=!!base.injury&&existing.length>0;
 const needsShock=effectiveImpact>0;
 return {ready:true,needed:[],rawEML,eml,sl,rolledSL:levelNames[rolledSL],stunnedPenalty:state.shock==='STN'?1:0,repeatRequired:sl==='CF',
  location:loc.location,side:loc.side,locationShock:loc.locationShock,
  armourValue:armour.armourValue,strikeImpact,effectiveImpact,
  injury:base.injury?base.injury.severity+base.injury.level:null,
  needsShock,needsCompound,existingWounds:existing.length,technique:row.technique};
}

export function prepareClimbingFallingSequence({actor,inventory,state,fallHeightFt,surface,originSkill='Climbing',slope='sheer',direction='front',rows,round=1,timelineId,eventId,gmConfirmed=false}={}){
 must(gmConfirmed===true&&actor?.id&&Array.isArray(inventory)&&state&&typeof eventId==='string'&&eventId&&typeof timelineId==='string'&&timelineId&&die(round,9999),
  'Pád vyžaduje živou postavu, Combat State, totožnost události a potvrzení GM');
 validateCombatState(state);
 must(round>=state.lastRound,'Pád nelze zapsat do dřívějšího kola');
 must(!state.events.some(x=>x.id===eventId+':complete'),'Tento pád byl již zapsán');
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
  const step=inspectClimbingFallingStep({actor,inventory,state:current,fallHeightFt,
   surface,slope,direction,row:r,round,timelineId});
  must(step.ready,'Zásah '+(i+1)+': chybí fyzické hody '+step.needed.join(', '));
  must(step.needsShock?die(r.shockD100,100):r.shockD100==null,
   'Zásah '+(i+1)+': Shock d100 '+(step.needsShock?'je povinný po účinném Impact':'není povolen, protože účinný Impact ≤ 0'));
  must(step.needsCompound?die(r.compoundD10,10):r.compoundD10==null,
   'Zásah '+(i+1)+': Compound d10 '+(step.needsCompound?'je povinný pro novou ránu na již zraněné lokalitě':'se NESMÍ zadávat: nevzniká nové zranění na již zraněné lokalitě'));
  const sl=step.sl;
  const loc={location:step.location,side:step.side,locationShock:step.locationShock};
  const strikeImpact=step.strikeImpact;
  const armour={armourValue:step.armourValue};
  const eml=step.rawEML;
  const rollProof=(key,faces)=>({faces,value:r[key],source:r.rollOrigins?.[key]==='cryptographic-software-die'?'cryptographic-software-die':'GM-entered-physical-die',field:key});
  const physicalDice=[rollProof('impactD10',10),rollProof('zoneD10',10),rollProof('locationD10',10),rollProof('fallingD100',100),
   ...(r.shockD100==null?[]:[rollProof('shockD100',100)]),
   ...(r.compoundD10==null?[]:[rollProof('compoundD10',10)])];
  const result=woundFromFall({state:current,character:actor,round,timelineId,eventId:eventId+':impact:'+i,
   bodyKind:'human',location:loc.location,side:loc.side,locationShock:loc.locationShock,
   strikeImpact,AV:armour.armourValue,shockRoll:r.shockD100??null,compoundD10:r.compoundD10??null,
   physicalDice});
  current=result.state;
  proofs.push({index:i,location:loc.location,side:loc.side,impact:strikeImpact,effectiveImpact:result.effectiveImpact,
   armourValue:armour.armourValue,fallingTechnique:r.technique,fallingD100:r.fallingD100,fallingEML:eml,
   level:sl,rolledLevel:step.rolledSL,stunnedPenalty:step.stunnedPenalty,injury:result.injury,shock:result.shockSL,physicalDice});
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
