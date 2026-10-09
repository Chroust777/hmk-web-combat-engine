// HMK printed pp. 51 and 121. Pure rules; no character/combat mutation.
import { WORKSHOP_QUALITY_P121, WATER_WEIGHT_P121, MUNDANE_FIRE_P121 } from './possessions-printed.js';
export const WORKSHOP_SKILLS_P121=Object.freeze(['Alchemy','Brewing','Ceramics','Fletching','Glassworking','Hideworking','Jewelcraft','Masonry','Metalcraft','Milling','Weaponcraft','Woodworking']);
export function workshopQuality(wealth,{alchemy=false}={}){
 if(!Number.isInteger(wealth)||wealth<0) throw new RangeError('Wealth must be a non-negative integer');
 const ranges=alchemy?[[10,12],[13,16],[17,19],[20,29],[30,Infinity]]:[[0,4],[5,6],[7,12],[13,16],[17,Infinity]];
 const i=ranges.findIndex(([lo,hi])=>wealth>=lo&&wealth<=hi);
 return i<0?null:Object.freeze({...WORKSHOP_QUALITY_P121[i],alchemy,wealth});
}
export function occupationalWorkshop({skill,masteryLevel,wealth}={}){
 if(typeof skill!=='string'||!Number.isInteger(masteryLevel)||masteryLevel<0||!Number.isInteger(wealth)||wealth<0) throw new TypeError('Valid skill, ML and Wealth required');
 const eligible=WORKSHOP_SKILLS_P121.includes(skill)&&masteryLevel>=50;
 return Object.freeze({eligible,skill,masteryLevel,workshop:eligible?workshopQuality(wealth,{alchemy:skill==='Alchemy'}):null,sourcePages:[51,121]});
}
export function waterWeightLb(gallons){if(!Number.isFinite(gallons)||gallons<0)throw new RangeError('Non-negative gallons required');return gallons*10;}
export function mundaneFireImpact(fireSize,{shortExposure=false}={}){
 if(!Number.isInteger(fireSize)||fireSize<0||fireSize>4)throw new RangeError('FS 0–4 required');
 const fire=MUNDANE_FIRE_P121[fireSize];return Object.freeze({...fire,dice:'d4',flatImpact:2+fireSize-(shortExposure?3:0),shortExposure,sourcePage:121});
}
export function fireGrowthSteps(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Non-negative seconds required');return Math.floor(seconds/30);}
export const WATER_REFERENCE_P121=WATER_WEIGHT_P121;
