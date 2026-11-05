/** HMK v1.2 p.133: Area AV is the rounded sum of F-aspect location AV
 * multiplied by printed anatomical coverage coefficients. Never accept a
 * manually entered override or silently treat a failed armour audit as AV 0.
 * Unarmoured characters have AV 0 (Heat Hazard itself floors the target at 1).
 */
import {resolveLiveCombatArmour} from './live-combat-armour.js';
const COV=Object.freeze({sk:0.04,fa:0.03,nk:0.02,sh:0.03,ua:0.06,el:0.02,
 fo:0.05,ha:0.05,tx:0.12,ab:0.12,pv:0.10,th:0.14,kn:0.03,ca:0.12,ft:0.07});
export const AREA_WEIGHTS=COV;
export function calculateWeatherAreaAV({inventory,actorId,resolveArmour=resolveLiveCombatArmour}={}){
 if(!Array.isArray(inventory)||typeof actorId!=='string'||!actorId)return {ready:false,reason:'Neplatný inventář nebo postava'};
 const worn=inventory.filter(x=>x.characterId===actorId&&x.slot==='worn');
 if(worn.length===0)return {ready:true,value:0,raw:0,locations:Object.fromEntries(Object.keys(COV).map(k=>[k,0])),method:'weighted-p133',wornCount:0};
 const locations={};let raw=0;
 for(const [location,weight] of Object.entries(COV)){
  const r=resolveArmour({inventory,targetId:actorId,location,aspect:'f',direction:'front',mode:'auto',rigidStatus:'unknown'});
  if(!r?.ready||!Number.isSafeInteger(r.armourValue)||r.armourValue<0)
   return {ready:false,reason:`${location}: ${r?.reason||'ochrana AV není ověřena'}`};
  locations[location]=r.armourValue;raw+=r.armourValue*weight;
 }
 return {ready:true,value:Math.round(raw+1e-10),raw,locations,method:'weighted-p133',wornCount:worn.length};
}
