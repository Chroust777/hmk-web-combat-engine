/** HMK World of Kèthîra, printed pp.167,169–170. Source-only live injury effects.
 * A projection never changes a wound, rolls dice, guesses a limb side, or grants healing.
 * 5 s combat rounds => 120 rounds per ten minutes; caller must supply current round.
 */
import {acuteInjuryEffect,injuryMishap,impairedTestZones} from '../rules/injury-effects.js';
import {SL} from '../rules/tests.js';
import {validateCombatState} from './persistent-combat-state.js';

const LOCATION_ZONES=Object.freeze({sk:'head',skull:'head',fa:'head',face:'head',nk:'head',neck:'head',
 sh:'arm',shoulder:'arm',ua:'arm','upper arm':'arm',el:'arm',elbow:'arm',fo:'arm',forearm:'arm',ha:'arm',hand:'arm',
 tx:'torso',thorax:'torso',ab:'torso',abdomen:'torso',pv:'torso',pelvis:'torso',
 th:'legs',thigh:'legs',kn:'legs',knee:'legs',ca:'legs',calf:'legs',ft:'legs',foot:'legs',area:'area'});
export const INJURY_LOCATION_ZONES=LOCATION_ZONES;
const SL_KEY={CF:SL.CF,F:SL.F,S:SL.S,CS:SL.CS};
const normalizeLocation=s=>String(s??'').trim().toLowerCase();
const applies=(zone,test,side,usedArms)=>zone==='area'||(impairedTestZones(test).includes(zone==='arm'?'arm':zone)&&(zone!=='arm'||usedArms.includes(side)));
function woundInfo(w,round,{needSide=true,needShock=true,timelineId=null}={}){
 const zone=LOCATION_ZONES[normalizeLocation(w.location)]??null;
 if(!zone)return {ok:false,reason:`Neznámá anatomická lokace rány ${w.id}: ${w.location}`};
 if(zone==='arm'&&needSide&&!['left','right'].includes(w.side))return {ok:false,reason:`Chybí potvrzená strana paže rány ${w.id}`};
 const sameTimeline=typeof timelineId==='string'&&timelineId&&w.timelineId===timelineId;
 const elapsed=sameTimeline&&round>=w.recordedRound?round-w.recordedRound:null;
 if(w.severity==='M'&&needShock&&!w.minorOnsetGM&&!['F','CF'].includes(w.shockSL)){
  if(elapsed===null)return {ok:false,reason:`Minor ${w.id}: časová osa není prokazatelně souvislá; GM potvrdí 10 minut nebo obnoví správné střetnutí`};
  if(elapsed<120&&!(w.shockSL in SL_KEY))return {ok:false,reason:`Minor ${w.id}: chybí potvrzený původní Shock Roll SL (HMK str.170)`};
 }
 const effect=w.severity==='M'&&w.minorOnsetGM?{impairment:5,unusable:false}:
  acuteInjuryEffect({severity:w.severity,shockSL:SL_KEY[w.shockSL]??null,minutesSinceInjury:elapsed===null?0:elapsed/12});
 const mishap=injuryMishap({severity:w.severity,zone:zone==='area'?'head':zone,location:normalizeLocation(w.location)==='pv'?'pelvis':null});
 return {ok:true,id:w.id,location:w.location,side:w.side??null,zone,level:w.level,severity:w.severity,impairment:effect.impairment,unusable:effect.unusable,recordedRound:w.recordedRound,elapsedRounds:elapsed,mishap};
}
/** Used arm(s) must be confirmed by the actor/GM for Melee, including weapon handling.
 * Missing side or shock result is a hard error rather than invented -5/0.
 */
export function projectLiveInjuries({state,round,test='melee',usedArms=null,timelineId=null}={}){
 try {validateCombatState(state);}catch(e){return {ready:false,reason:`Neplatný trvalý stav: ${e.message}`};}
 if(!Number.isSafeInteger(round)||round<1)return {ready:false,reason:'Neplatné bojové kolo'};
 const zones=impairedTestZones(test);
 if(!zones.length)return {ready:false,reason:`Neověřený druh impaired testu: ${test}`};
 const affectedArms=state.wounds.some(w=>LOCATION_ZONES[normalizeLocation(w.location)]==='arm');
 if(affectedArms&&zones.includes('arm')&&(!Array.isArray(usedArms)||usedArms.length===0||usedArms.some(s=>!['left','right','none'].includes(s))))return {ready:false,reason:'GM musí určit použitou paži: left/right/both nebo none'};
 const arms=usedArms?.includes('none')?[]:(usedArms??[]);
 const details=state.wounds.map(w=>{
  const zone=LOCATION_ZONES[normalizeLocation(w.location)];
  const relevant=zone==='area'||(zones.includes(zone)&& (zone!=='arm'||arms.length>0));
  return woundInfo(w,round,{needSide:relevant&&zone==='arm',needShock:relevant,timelineId});
 });
 const bad=details.find(x=>!x.ok);if(bad)return {ready:false,reason:bad.reason};
 const affected=details.filter(x=>applies(x.zone,test,x.side,arms));
 const totalPenalty=affected.reduce((sum,x)=>sum+(x.impairment??0),0);
 const unusable=affected.filter(x=>x.unusable);
 return {ready:true,source:'HMK pp.167,169–170',test,round,usedArms:arms,impairment:totalPenalty,
  modifier:-totalPenalty,unusable:unusable.length>0,unusableWoundIds:unusable.map(w=>w.id),wounds:details,affected,
  stunned:state.shock==='STN',successLevelPenalty:state.shock==='STN'?1:0,
  mishapProfiles:details.flatMap(x=>x.mishap.map(kind=>({woundId:x.id,kind}))),
  notes:['Serious/Grievous injuries require Morale as HMK p.162; this projection does not roll Morale',
   'Mishap profiles describe possible effects of the original injury event; they are not new rolls every turn']};
}
export function projectInjuredMovement({state,round,timelineId=null}={}){
 // Arms do not impair Move (HMK p.170); evaluate without requiring arm sides.
 try {validateCombatState(state);}catch(e){return {ready:false,reason:e.message};}
 if(!Number.isSafeInteger(round)||round<1)return {ready:false,reason:'Invalid round'};
 const all=state.wounds.map(w=>{const zone=LOCATION_ZONES[normalizeLocation(w.location)];return woundInfo(w,round,{needSide:false,needShock:['head','torso','legs','area'].includes(zone),timelineId});});const bad=all.find(w=>!w.ok);if(bad)return {ready:false,reason:bad.reason};
 const relevant=all.filter(w=>['head','torso','legs','area'].includes(w.zone));
 return {ready:true,impairment:relevant.reduce((n,w)=>n+(w.impairment??0),0),blocked:relevant.some(w=>w.unusable),
  unusableWoundIds:relevant.filter(w=>w.unusable).map(w=>w.id),sources:relevant};
}
/** A grievous required zone forces CF, not an invented high EML penalty (p.170). */
export function liveMeleeInjuryConsequence({projection,role='attack',defence='block'}={}){
 if(!projection?.ready)return {ready:false,reason:projection?.reason??'Missing injury projection'};
 if(role==='defence'&&defence==='ignore')return {ready:true,forcedCF:false,modifier:0,slPenalty:0,forcedIgnore:true};
 const forcedCF=projection.unusable;
 return {ready:true,modifier:projection.modifier,slPenalty:projection.successLevelPenalty,forcedCF,
  defenceMishapForced:role==='defence'&&forcedCF,
  reason:forcedCF?'Grievous: automatic CF with mandatory injury mishap adjudication (HMK p.170)':null};
}
