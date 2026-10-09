import {identifyWornPrintedSuit,resolvePrintedSuitProtection} from './printed-suit-combat.js';
import {resolveMeleeStrikeHit} from '../rules/melee.js';

const LOCATIONS=new Set(['sk','fa','nk','sh','ua','el','fo','ha','tx','ab','pv','th','kn','ca','ft']);
const ASPECTS={b:'b',e:'e',p:'p',f:'f',blunt:'b',edge:'e',point:'p',fire:'f',frost:'f'};
/** Fail-closed bridge from the independently audited printed suit tables to melee injury.
 * No generic article layering is inferred. Does not modify inventory or saved combat state.
 */
export function resolvePrintedSuitMeleeHit({inventory,characterId,location,aspect,armourReduction=0,metalArmour,...hit}={}){
 if(!LOCATIONS.has(location)||!Object.hasOwn(ASPECTS,aspect))return {ready:false,reason:'Invalid HMK location or impact aspect'};
 if(!Number.isFinite(armourReduction)||armourReduction<0)return {ready:false,reason:'Invalid armour reduction'};
 if(typeof metalArmour!=='boolean')return {ready:false,reason:'Metal armour status must be explicitly resolved before injury',requiresGMResolution:true};
 const match=identifyWornPrintedSuit(inventory,characterId);
 if(!match.ok)return {ready:false,reason:match.reason,requiresGMResolution:true};
 const protection=resolvePrintedSuitProtection(match.name,location,ASPECTS[aspect]);
 if(!protection.ok||!protection.complete)return {ready:false,reason:protection.reason||'Protection unavailable'};
 const armourValue=protection.av[ASPECTS[aspect]];
 if(!Number.isFinite(armourValue)||armourValue<0)return {ready:false,reason:'Invalid printed armour value'};
 const result=resolveMeleeStrikeHit({...hit,location,aspect:ASPECTS[aspect],armourValue,armourReduction,rigidArmour:protection.rigid,metalArmour});
 return {ready:true,source:'HMK printed suit p.113–116',suitName:match.name,location,aspect:ASPECTS[aspect],armourValue,rigidArmour:protection.rigid,metalArmour,result};
}
