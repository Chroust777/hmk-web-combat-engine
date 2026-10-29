/** HMK 1.2 skill descriptions pp.66,76,80-81,86.
 * Reference-only production catalog. Prices/costs never create physical items.
 * A scheduled project needs a separate confirmed result and/or inventory proof.
 */
const item=(name,hours,costD,extra={})=>Object.freeze({name,hours,costD,...extra});
export const CRAFT_WORK_600=Object.freeze({
 brewing:Object.freeze({
  ale:item('Ale · 5 gal',20,2,{agingBaseDays:0,agingDice:2,agingFaces:2,salePriceD:8}),
  mead:item('Mead · 5 gal',10,10,{agingBaseDays:24,agingDice:6,agingFaces:6,salePriceD:15}),
  spirits:item('Spirits · 5 gal',20,92,{agingBaseDays:4,agingDice:2,agingFaces:2,salePriceD:120}),
  wine:item('Wine · 5 gal',30,18,{agingBaseDays:76,agingDice:4,agingFaces:10,salePriceD:20})
 }),
 ceramics:Object.freeze({
  beads:item('Beads, 12',24,3,{salePriceD:6,weightLb:2}),
  brick:item('Brick',24,3,{salePriceD:6,weightLb:3}),
  bowl:item('Bowl, 8×4 in',24,3,{salePriceD:6,weightLb:3}),
  urn:item('Urn, 5 gallons',48,6,{salePriceD:12,weightLb:9}),
  plate:item('Plate, 8 in',12,1.5,{salePriceD:3,weightLb:2}),
  jug:item('Jug, 1 gallon',36,4.5,{salePriceD:9,weightLb:5}),
  vase:item('Vase',16,2,{salePriceD:4,weightLb:2})
 }),
 hideworking:Object.freeze({
  backpack:item('Backpack, 30 lb',30,18),bag:item('Bag, 15 lb',10,8),
  beltPouch:item('Belt pouch, 5 lb',5,2.5),binding:item('Book binding',40,5),
  bowCase:item('Bow case',20,10),waterskin:item('Waterskin, 2 qt',50,9),
  quiver24:item('Quiver, 24 arrows',15,7),quiver12:item('Quiver, 12 arrows',10,4),
  saddleRiding:item('Saddle, riding',150,18),saddleWar:item('Saddle, war',300,36),
  sling:item('Sling',5,0.5),whip:item('Whip',25,4)
 }),
 textilecraft:Object.freeze({
  arrowBag:item('Arrow bag',20,36),bedroll:item('Bedroll',16,72),
  bedrollHeavy:item('Bedroll, heavy',20,108),blanket:item('Blanket',12,60),
  horseBlanket:item('Blanket, horse',10,24),carpet:item('Carpet, wool 3×3 ft',60,36),
  carpetDecorated:item('Heavily decorated carpet, wool 3×3 ft',120,36,{decorated:true}),
  cloakCloth:item('Cloak, cloth',13,53),cloakPadded:item('Cloak, padded',20,99),
  pouch:item('Pouch, buckram',1,5),purseSilk:item('Purse, silk',0.5,48),
  sack50:item('Sack, canvas, 50 lb',4,20),sack20:item('Sack, canvas, 20 lb',2,10),
  tarpaulin:item('Tarpaulin',6,84),tent1:item('Tent, 1-man',10,288),
  tent2:item('Tent, 2-man',15,432),tent3:item('Tent, 3-man',20,518)
 }),
 metalcraft:Object.freeze({
  wagonAxle:item('Axle, wagon',15,6),brandingIron:item('Branding iron',15,4),
  cauldron:item('Cauldron, 10 gal',50,13),chain:item('Chain, 3 ft (500 lb)',10,2),
  crowbar:item('Crowbar',10,5),fetters:item('Fetters',15,3),
  goblet:item('Goblet, pewter',5,1.25),grapplingHook:item('Grappling hook',40,5),
  hammer:item('Hammer',10,2),pan:item('Pan, copper',20,10),
  pitons:item('Pitons, iron, 6',10,3),platePewter:item('Plate, pewter',10,1.75),
  plateTin:item('Plate, tin',10,2.5),ploughshare:item('Ploughshare',60,15),
  spade:item('Spade/Shovel',15,3),nails:item('Spikes/Nails, 24',5,1.25)
 }),
 mineralogy:Object.freeze({
  firePot:item('Fire Pot · 1 pt',24,12,{mineralMix:'fire'}),
  quicklimePot:item('Quicklime Pot · 2 qt',24,24,{mineralMix:'quicklime'})
 })
});
export const CRAFT_LABELS_600=Object.freeze({brewing:'Brewing · HMK 66',ceramics:'Ceramics · HMK 66',hideworking:'Hideworking · HMK 76',textilecraft:'Textilecraft · HMK 86',metalcraft:'Metalcraft · HMK 80',mineralogy:'Mineralogy · HMK 81'});
export const CRAFT_SKILL_600=Object.freeze(Object.fromEntries(Object.keys(CRAFT_WORK_600).map(x=>[x,x.charAt(0).toUpperCase()+x.slice(1)])));
export const DAY_MINUTES_600=1440;
export const calendarDayStart600=minute=>Math.floor(minute/DAY_MINUTES_600)*DAY_MINUTES_600;
export function projectTiming600(kind,scope,startMinute,options={}){
 const item=CRAFT_WORK_600[kind]?.[scope];if(!item||!Number.isSafeInteger(startMinute)||startMinute<0)return null;
 const baseMinutes=item.hours*60;
 // Only an integral, explicitly day-sized rule is date-gated. Hour-based
 // work is never rounded to a calendar day, even when longer than 24h.
 const dayResolution=['ceramics','mineralogy'].includes(kind)&&Number.isInteger(item.hours/24);
 const dueMinute=dayResolution?calendarDayStart600(startMinute+baseMinutes):startMinute+baseMinutes;
 let aging=null;
 if(kind==='brewing'){
  const dice=options.agingRolls;
  if(!Array.isArray(dice)||dice.length!==item.agingDice||!dice.every(d=>Number.isInteger(d)&&d>=1&&d<=item.agingFaces))return null;
  const days=item.agingBaseDays+dice.reduce((sum,d)=>sum+d,0);
  aging={rolls:[...dice],days,readyMinute:calendarDayStart600(startMinute+baseMinutes+days*DAY_MINUTES_600)};
 }
 return {baseMinutes,dueMinute,mode:dayResolution?'day':'minute',aging};
}
export function confirmCraftStart600(kind,scope,startMinute,agingRolls){
 const entry=CRAFT_WORK_600[kind]?.[scope],schedule=projectTiming600(kind,scope,startMinute,{agingRolls});
 if(!entry||!schedule)throw Error('Nedoložený výrobek, čas nebo skutečné zrací kostky.');
 return Object.freeze({craftItemName:entry.name,craftItemCostD:entry.costD,
   craftSourcePage:({brewing:66,ceramics:66,hideworking:76,textilecraft:86,metalcraft:80,mineralogy:81})[kind],
   craftDayResolution:schedule.mode,craftAgingRolls:schedule.aging?.rolls||[],
   craftAgingDays:schedule.aging?.days??null,craftReadyMinute:schedule.aging?.readyMinute??null});
}
