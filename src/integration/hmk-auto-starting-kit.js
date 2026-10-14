/**
 * Optional starting possessions for the one-click character generator.
 * HMK v1.2 p.51: initial possessions value <= Wealth * 100 silver pennies.
 * Printed items/prices: pp.99–121. Selection of a particular kit is an
 * application convenience, NOT an HMK-mandated profession equipment table.
 * Never change coins (Wealth * 10) or the original Wealth proof.
 */
import {EXPEDITION_EQUIPMENT_P120, CRAFT_ITEMS_TOOLS_P121} from '../rules/possessions-printed.js';

const printedRows=[...EXPEDITION_EQUIPMENT_P120,...CRAFT_ITEMS_TOOLS_P121];
const money=row=>/^\d+d$/.test(row.pricePrinted||'')?Number(row.pricePrinted.slice(0,-1)):null;
export const PRINTED_STARTER_GEAR_P120=Object.freeze(printedRows.filter(row=>money(row)!==null && !['Cloak (Cloth)','Cloak (Padded)'].includes(row.name)).map(row=>Object.freeze({
 id:`hmk:gear:${row.id}`,name:row.name,category:'other',builtin:true,
 description:`Tištěná položka vybavení HMK, str. ${row.page}; výběr do počáteční výbavy je orientační, nikoli povinný.`,
 source:`HârnMaster v1.2, printed p.${row.page}`,
 properties:Object.freeze({pricePence:money(row),weightLb:row.weightLb,referencePage:row.page,craftSkill:row.skill})
})));

const MONEY=it=>Number.isSafeInteger(it?.properties?.pricePence)?it.properties.pricePence:null;
const isMartial=occupation=>/man.at.arms|knight|soldier|mercenary|gladiator|swordmaster|guard|warrior|fighter|hunter|archer|ranger|cavalry|marine|footman|huscarl|berserker|weaponmaster|pavisier|militiaman/i.test(occupation);
const byName=(catalog,category,name)=>catalog.find(x=>x.category===category&&x.name===name&&MONEY(x)!==null);
const gear=(catalog,name)=>byName(catalog,'other',name);
const clothing=(catalog,name)=>byName(catalog,'armor',name);
const weapon=(catalog,name)=>byName(catalog,'weapon',name);

/** Pure planner. Does not write the character or allocate cash. */
export function prepareStartingKit(character,catalog,idFactory){
 if(!character||!Array.isArray(catalog)||typeof idFactory!=='function')throw Error('Neplatný vstup počáteční výbavy');
 const h=character.hmk||{};
 const budget=h.possessionsBudgetPence;
 if(!Number.isSafeInteger(budget)||budget<0||budget>99999999||!Number.isSafeInteger(h.wealth)||budget!==h.wealth*100)
  throw Error('Počáteční výbavu lze pořídit až po platném Wealth podle HMK p.51');
 const profession=String(h.occupation||character.occupation||'');
 const martial=isMartial(profession);
 let remaining=budget;
 const items=[];const chosen=new Set();let basicCount=0,combatCount=0;
 const add=(source,slot='carried',kind='basic')=>{
  if(!source||chosen.has(source.id)||MONEY(source)>remaining)return false;
  if(['main_hand','off_hand'].includes(slot)&&items.some(x=>x.slot===slot))return false;
  const entry={id:idFactory(),characterId:character.id,sourceItemId:source.id,snapshot:structuredClone(source),quantity:1,
   condition:'Počáteční výbava (automatický návrh)',slot,currentWQ:source.category==='weapon'?Number(source.properties?.quality)||null:null,
   gearStowage:'normal',startingKitSource:'HMK v1.2 p.51, p.99–121; orientační výběr'};
  if(source.category==='armor'&&slot==='worn'){
   entry.layerOrder=source.name==='Cloth Tunic'?0:1;
   entry.layerSlot=source.name==='Cloth Tunic'?'base':'overNear';
   entry.bulkExceptionZones=[];
  }
  chosen.add(source.id);items.push(entry);remaining-=MONEY(source);
  if(kind==='basic')basicCount++;else combatCount++;
  return true;
 };
 // One ordinary outfit and three everyday belongings are preferred; even
 // poor professions receive no fabricated free gear if Wealth is zero.
 add(clothing(catalog,'Cloth Tunic'),'worn');
 add(clothing(catalog,'Cloth Breeches'),'worn');
 add(gear(catalog,'Belt pouch, 5 lb'));
 add(gear(catalog,'Rations, standard'));
 if(martial){
  // Prefer an actual weapon plus a protective article, but ONLY if the
  // remaining Wealth budget covers the printed prices. No guaranteed sword.
  const pairs=[
   [weapon(catalog,'Broadsword'),clothing(catalog,'Leather Vest')],
   [weapon(catalog,'Shortsword'),clothing(catalog,'Leather Vest')],
   [weapon(catalog,'Shortsword'),clothing(catalog,'Padded Vest')],
   [weapon(catalog,'Knife'),clothing(catalog,'Padded Vest')],
   [weapon(catalog,'Knife'),clothing(catalog,'Padded Cap')]
  ];
  const pair=pairs.find(([w,a])=>w&&a&&MONEY(w)+MONEY(a)<=remaining);
  if(pair){add(pair[0],'main_hand','combat');add(pair[1],'worn','combat');}
  else add(weapon(catalog,'Knife'),'main_hand','combat');
 }
 if(basicCount<5){
  // Profession-sensitive ordinary provisions, not rule-granted skills.
  const addOns=/scholar|scribe|alchemist|arcanist|cleric|priest/i.test(profession)?['Flask, 1 pint','Waterskin, 2 quart','Bag, leather, 15 lb']
   :/hunter|explorer|ranger|pilot|sailor/i.test(profession)?['Waterskin, 2 quart','Rope, hemp, ½″, 50′','Bag, leather, 15 lb']
   :['Waterskin, 2 quart','Bag, leather, 15 lb','Flask, 1 pint'];
  for(const name of addOns){if(basicCount>=5)break;add(gear(catalog,name));}
 }
 const costPence=budget-remaining;
 const startingCoinsPence=h.coinsPence;
 if(!Number.isSafeInteger(startingCoinsPence)||startingCoinsPence!==h.wealth*10)throw Error('Nesoulad mince/Wealth (HMK p.51)');
 if(costPence<0||costPence>budget||items.some(x=>!x.sourceItemId))throw Error('Počáteční vybavení překračuje povolený Wealth rozpočet');
 return {items,summary:{profession,martial,basicCount,combatCount,itemCount:items.length,costPence,budgetPence:budget,unspentPossessionsAllowancePence:remaining,startingCoinsPence,
  note:budget===0?'Wealth 0: pravidla nepovolují nákup počátečních předmětů; oblečení se řídí životní úrovní, nikoli fiktivními bezplatnými položkami.':'Výbava je automaticky navržená, ceny podle originálního katalogu; nejde o předepsaný balíček HMK.'}};
}
