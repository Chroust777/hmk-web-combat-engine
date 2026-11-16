/** Physical transfer of ACTUALLY witnessed fishing/trapping yield to the
 * existing carried-foraging-food overlay. Unlike a communal food-day receipt,
 * this needs an explicit GM-confirmed mass and freshness limit. Meat/fish
 * spoilage itself remains governed by HMK p.85 and the GM, not an invented die.
 */
import {foragedCarriedFood} from './hmk-foraging-carried-food.js';
import {WILD_FRESH_CARRY_93912} from './hmk-wild-freshness-93912.js';
import {trappingResult93908} from './hmk-trapping-93908.js?v=93.909';
import {resolveFishingCatch} from './hmk-fishing-catch-548.js';
const check=(ok,msg)=>{if(!ok)throw Error('Úlovek: '+msg)};
export const WILD_CARRY_FORMAT='hmk-wild-catch-carry-93908-v1';
const safeMinute=n=>Number.isSafeInteger(n)&&n>=0;
const half=n=>Number.isFinite(n)&&n>=0.5&&n<=999999&&Number.isSafeInteger(n*2);
export function catchSource93908(journal=[],campaignId,sourceId){
 const row=journal.find(j=>j.id===sourceId&&j.calendarCampaignId===campaignId),p=row?.skillTestProof;
 if(!row||!safeMinute(row.campaignMinute))return null;
 if(p?.type==='fishing-catch'&&p.format==='hmk-fishing-catch-p71-v1'){
  const origin=journal.find(j=>j.id===p.originId&&j.calendarCampaignId===campaignId&&j.characterId===row.characterId);
  if(!origin||p.actorId!==row.characterId||origin.campaignMinute>row.campaignMinute)return null;
  // A pure replay: reject fabricated catch quantities/conditions/dice.
  const reconstructed=resolveFishingCatch({proof:origin.skillTestProof,originId:p.originId,actorId:p.actorId,
   technique:p.technique,conditionsMode:p.conditions.source==='gm-selected'?'gm':'roll',
   conditionsD100:p.conditions.source==='physical-d100'?p.conditions.roll:null,
   gmCondition:p.conditions.source==='gm-selected'?p.conditions.condition:null,
   gmSaturationPenalty:p.conditions.gmSaturationPenalty,foodD10:p.physicalFoodDice,
   saltWater:p.saltWater,offshore:p.offshore,periodConfirmed:true,baseSVNotPreAdjusted:true});
  check(JSON.stringify(p)===JSON.stringify(reconstructed),'rybí nález neodpovídá původním hodům.');
  return {row,kind:'fishing',foodDays:p.foodDays,weightLb:p.totalFishPounds,sourceMinute:row.campaignMinute};
 }
 if(p?.type==='trapping-result'&&['hmk-trapping-result-93908-v1','hmk-trapping-result-93909-v2'].includes(p.format)){
  const expected=trappingResult93908({journal:journal.slice(0,journal.indexOf(row)),campaignId,actorId:row.characterId,
   minute:row.campaignMinute,originId:p.originId,secondary:p.secondary,
   secondaryNotAlreadyCounted:p.secondaryNotAlreadyCounted,periodConfirmed:true});
  check(JSON.stringify(p)===JSON.stringify(expected),'úlovek pastí neodpovídá původnímu Survival SV.');
  return {row,kind:'trapping',foodDays:p.foodDays,sourceMinute:row.campaignMinute};
 }
 return null;
}
export function createCatchCarry93908({journal=[],campaignId,minute,sourceId,actorId,quantity,
 itemId,itemName,totalWeightLb,freshUntilMinute,gmConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&safeMinute(minute)&&typeof actorId==='string'&&actorId&&
  typeof sourceId==='string'&&sourceId&&half(quantity)&&gmConfirmed===true,'vyberte kampaň, příjemce a skutečný úlovek; potvrďte GM.');
 const source=catchSource93908(journal,campaignId,sourceId);
 check(source&&source.sourceMinute<=minute&&source.foodDays>0,'úlovek nebyl potvrzen nebo ještě nevznikl.');
 check(typeof itemId==='string'&&itemId.length>=5&&itemId.length<=120&&
  !journal.some(r=>r.id===itemId||r.calendarForagingCarry?.itemId===itemId),
  'je potřeba nové jedinečné inventární ID.');
 const name=String(itemName||'').trim();
 check(name.length>=2&&name.length<=100&&Number.isFinite(totalWeightLb)&&totalWeightLb>0&&totalWeightLb<=20000,
  'GM musí určit skutečnou hmotnost a druh potravy.');
 check(safeMinute(freshUntilMinute)&&freshUntilMinute>=minute&&freshUntilMinute<=1e9,
  'GM musí určit skutečně doloženou trvanlivost; samotný úlovek neznamená konzervaci.');
 const issued=journal.filter(j=>j.calendarCampaignId===campaignId&&j.calendarForagingCarry?.sourceKind===source.kind&&
  j.calendarForagingCarry?.sourceId===sourceId).reduce((s,j)=>s+j.calendarForagingCarry.quantity,0);
 check(issued+quantity<=source.foodDays,'úlovek již byl částečně nebo zcela vydán.');
 if(source.kind==='fishing')check(totalWeightLb<=source.weightLb*(quantity/source.foodDays),
  'hmotnost ryb nesmí překročit doložený úlovek.');
 return {format:WILD_CARRY_FORMAT,campaignId,minute,actorId,sourceId,sourceKind:source.kind,
  resultIndex:0,quantity,itemId,itemName:name,totalWeightLb,freshUntilMinute,
  sourcePages:source.kind==='fishing'?[71,85,186]:[85,186],confirmedByGM:true};
}
/** New food parcels use real HMK p.85 daily checks instead of a guessed expiry.
 * The historical 93908 function and ALL v1 receipts remain unchanged.
 */
export function createFreshCatchCarry93912(args={}){
 const base=createCatchCarry93908({...args,freshUntilMinute:1e9});
 const {freshUntilMinute,...withoutManualExpiry}=base;
 return {...withoutManualExpiry,format:WILD_FRESH_CARRY_93912};
}
/** GM-confirmed abandonment of real carried fish/meat. Spoilage does not
 * magically remove ENC; the physical parcel leaves only on this receipt.
 */
export function discardWildCatch93908({journal=[],campaignId,minute,actorId,carryId,quantity,
 gmConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&safeMinute(minute)&&typeof actorId==='string'&&actorId&&
  typeof carryId==='string'&&carryId&&half(quantity)&&gmConfirmed===true,
  'odložení nebo zkažení úlovku musí výslovně potvrdit GM.');
 const lot=foragedCarriedFood(journal,campaignId,minute).find(x=>
  x.sourceJournalId===carryId&&x.actorId===actorId&&[WILD_CARRY_FORMAT,WILD_FRESH_CARRY_93912].includes(x.format));
 check(lot&&lot.remaining>=quantity,'daná nesená potrava už není k dispozici.');
 return {format:'hmk-wild-catch-discard-93908-v1',campaignId,minute,actorId,
  carryId,itemId:lot.itemId,quantity,weightLb:Math.round(lot.totalWeightLb*quantity/lot.quantity*100)/100,
  confirmedByGM:true,sourcePage:85};
}
export function validateCatchCarry93908(journal=[]){
 const prior=[];
 for(const row of journal){
  const c=row.calendarForagingCarry;
  if([WILD_CARRY_FORMAT,WILD_FRESH_CARRY_93912].includes(c?.format)){
   const maker=c.format===WILD_CARRY_FORMAT?createCatchCarry93908:createFreshCatchCarry93912;
   const expected=maker({journal:prior,campaignId:row.calendarCampaignId,
    minute:row.campaignMinute,sourceId:c.sourceId,actorId:row.characterId,quantity:c.quantity,
    itemId:c.itemId,itemName:c.itemName,totalWeightLb:c.totalWeightLb,
    freshUntilMinute:c.freshUntilMinute,gmConfirmed:c.confirmedByGM});
   check(JSON.stringify(expected)===JSON.stringify(c)&&!row.calendarForagingSupplyUse,
    'inventární převod nebo vlastnictví není doložené.');
  }
  const d=row.calendarForagingCarryDiscard;
  if(d){
   const expected=discardWildCatch93908({journal:prior,campaignId:row.calendarCampaignId,
    minute:row.campaignMinute,actorId:row.characterId,carryId:d.carryId,quantity:d.quantity,
    gmConfirmed:d.confirmedByGM});
   check(JSON.stringify(expected)===JSON.stringify(d),'neplatný doklad odložení úlovku.');
  }
  prior.push(row);
 }
 return true;
}
