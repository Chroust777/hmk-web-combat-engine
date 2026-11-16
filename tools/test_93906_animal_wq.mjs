import assert from 'node:assert/strict';
import {initialCombatState} from '../src/integration/persistent-combat-state.js';
import {survivalAccidentVictimPool93846 as pool} from '../src/integration/hmk-survival-accident-pool-93846.js';
import {previewStableAnimalAccident93862 as preview} from '../src/integration/hmk-animal-accident-anatomy-93862.js';
import {applyEquipmentDamage93845 as damage} from '../src/integration/hmk-equipment-gm-93845.js';
import {applyInventoryItemEdit} from '../src/integration/hmk-inventory-edit.js';
import {equipmentUnusable} from '../src/integration/hmk-equipment-serviceability.js';
let n=0;const ok=(a)=>{assert.ok(a);++n};const eq=(a,b)=>{assert.deepEqual(a,b);++n};const bad=(fn)=>{assert.throws(fn);++n};
const actor=(id,name,breed)=>({id,name,kind:'NPC',hmk:{verifiedMountedBreed:breed,healthState:initialCombatState(),attributes:{str:26,end:10,agl:11,per:17,aur:4,wil:10,rea:4,cre:4}}});
const horse=actor('horse','Tažný kůň','palfrey'),ox=actor('ox','Vůl','bovine'),human={id:'guide',name:'Průvodce',kind:'PC',hmk:{healthState:initialCombatState()}};
for(const ordering of [['guide','horse','ox'],['horse','ox','guide'],['ox','guide','horse']]){
 const r=pool({memberIds:['guide'],stableAnimalIds:ordering.filter(x=>x!=='guide'),characters:[human,horse,ox],activeIds:['guide','horse','ox']});eq(r.ok,true);eq(new Set(r.expectedIds),new Set(['guide','horse','ox']));eq(r.eligible.length,3);
}
for(const missing of ['horse','ox']){
 const r=pool({memberIds:['guide'],stableAnimalIds:['horse','ox'],characters:[human,horse,ox].filter(x=>x.id!==missing),activeIds:['guide','horse','ox']});eq(r.ok,false);ok(r.missingAnimals.includes(missing));
}
for(const a of [horse,ox]){
 for(const agilitySL of ['F','CF']){
  for(const zoneD10 of [1,2,5,8,10]){
   const r=preview({actor:a,state:a.hmk.healthState,impactDie:6,zoneD10,locationD10:3,agilitySL});eq(r.bodyTable,'C');eq(r.strikeImpact,agilitySL==='CF'?15:10);eq(r.naturalBluntAV,a===horse?5:6);eq(r.miss,false);
  }
 }
 bad(()=>preview({actor:a,state:a.hmk.healthState,impactDie:7,zoneD10:1,locationD10:1,agilitySL:'F'}));
}
// Horse and ox survive shared state without guessing an anatomy table or inventing wounds.
eq(horse.hmk.healthState.wounds.length,0);eq(ox.hmk.healthState.wounds.length,0);
const sword={id:'sword',characterId:'guide',snapshot:{category:'weapon',name:'Test sword',properties:{quality:4}},slot:'main_hand',quantity:1,currentWQ:3,condition:''};
damage(sword,{result:'ignored',sourceEpisodeId:'hazard-1'});eq(sword.currentWQ,0);eq(sword.hmkEquipmentRepair.originalWQ,3);eq(sword.slot,'carried');ok(equipmentUnusable(sword));
const doc={characters:[human],inventory:[sword]};
bad(()=>applyInventoryItemEdit(doc,{ownerId:'guide',itemId:'sword',slot:'main_hand',quantity:1,currentWQ:0,condition:sword.condition}));
bad(()=>applyInventoryItemEdit(doc,{ownerId:'guide',itemId:'sword',slot:'carried',quantity:1,currentWQ:3,condition:sword.condition}));
bad(()=>applyInventoryItemEdit(doc,{ownerId:'guide',itemId:'sword',slot:'carried',quantity:1,currentWQ:0,gmEquipmentState:'usable',condition:sword.condition}));
const repaired=applyInventoryItemEdit(doc,{ownerId:'guide',itemId:'sword',slot:'carried',quantity:1,currentWQ:3,gmEquipmentState:'usable',condition:sword.condition});eq(repaired.inventory[0].currentWQ,3);eq(repaired.inventory[0].hmkEquipmentRepair.status,'repaired');ok(!equipmentUnusable(repaired.inventory[0]));
const doomed={...structuredClone(sword),id:'doomed',hmkEquipmentRepair:undefined,condition:'',slot:'main_hand',currentWQ:4};damage(doomed,{result:'irreparable',sourceEpisodeId:'hazard-2'});eq(doomed.currentWQ,0);eq(doomed.hmkEquipmentRepair.status,'irreparable');bad(()=>applyInventoryItemEdit({characters:[human],inventory:[doomed]},{ownerId:'guide',itemId:'doomed',slot:'carried',quantity:1,currentWQ:4,gmEquipmentState:'usable',condition:doomed.condition}));
console.log('PASS actual ox+horse + WQ transitions',n,'assertions');
