/** Regression for GM episode closure: source-linked Foraging → recipient →
 * carried food/water → weight/ENC, with finite, non-duplicating balances. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {availableSupplyLots,validateSupplyJournal,assertSupplyJournalAppendOnly}=require('../src/integration/hmk-foraging-supply-ledger.js');
const {createForagingCarry,projectForagedFoodInventory,foragedCarriedFood,createForagingCarryEat,validateForagingCarriedJournal}=require('../src/integration/hmk-foraging-carried-food.js');
const {createForagingWaterStorage,validateForagingWaterStorageJournal}=require('../src/integration/hmk-foraging-water-storage.js');
const {projectCampaignWaterInventory,filledWaterForItem,validatePhysicalWaterJournal}=require('../src/integration/hmk-physical-water-ledger.js');
const {resolveCombatantLoad}=require('../src/integration/combatant-load.js');
const {assertGMOnlyCampaignTime}=require('../src/integration/hmk-gm-clock-authority.js');
const {trekWatchfulness}=require('../src/integration/hmk-trekking-wilderness-tasks.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},yes=(x)=>{assert.ok(x);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const cid='episode-734',at=180;
const guide={id:'guide',name:'Guide',hmk:{attributes:{str:14}}},scout={id:'scout',name:'Scout',hmk:{attributes:{str:12}}};
const skin={id:'hmk:gear:hmk-p120-040',name:'Waterskin, 2 quart',category:'other',properties:{weightLb:2}};
const inventory=[{id:'skin-a',characterId:'scout',sourceItemId:skin.id,snapshot:skin,quantity:1,slot:'carried'},
{id:'skin-b',characterId:'guide',sourceItemId:skin.id,snapshot:skin,quantity:1,slot:'carried'}];
const foraging={roll:10,results:[{foodDays:2,waterDays:1,herbDoses:0,target:'food-water'},{foodDays:1,waterDays:0,herbDoses:0,target:'food-water'}]};
const source={id:'episode-source',characterId:'guide',calendarCampaignId:cid,campaignMinute:at,calendarTimeEpisode:{format:'hmk-time-episode-v1',startMinute:0,endMinute:at,kind:'forage',foraging}};
const journal=[source],clock={format:'hmk-campaign-calendar-v1',campaignId:cid,minute:at,characterIds:['guide','scout'],anchors:[],events:[{id:'init',type:'init',minute:0,reason:'GM start'},{id:'advanced',type:'advance',minute:at,reason:'GM completed episode'}]};
const before={characters:[guide,scout],inventory,journal:structuredClone(journal),campaignClock:structuredClone(clock)};
const remaining=(unit,idx=0)=>availableSupplyLots(journal,cid).find(l=>l.unit===unit&&l.resultIndex===idx)?.remaining??0;
eq(remaining('foodDays'),2);eq(remaining('foodDays',1),1);eq(remaining('waterDays'),1);
const baseLoad=resolveCombatantLoad({character:scout,inventory});
const packed=createForagingCarry({journal,campaignId:cid,minute:at,actorId:'scout',sourceId:source.id,resultIndex:0,quantity:1,itemName:'dried berries',totalWeightLb:3,itemId:'berries-1'});
eq(packed.supplyUse.disposition,'packed-in-inventory');eq(packed.carry.confirmedByGM,true);
journal.push({id:'food-1',characterId:'scout',calendarCampaignId:cid,campaignMinute:at,calendarForagingSupplyUse:packed.supplyUse,calendarForagingCarry:packed.carry});
eq(remaining('foodDays'),1);eq(remaining('waterDays'),1);eq(validateSupplyJournal(journal),true);eq(validateForagingCarriedJournal(journal),true);
const projected=projectForagedFoodInventory(inventory,journal,cid,at);
eq(projected.find(i=>i.id==='berries-1').quantity,1);
const foodLoad=resolveCombatantLoad({character:scout,inventory:projected});
eq(foodLoad.gearLoad.physicalLb-baseLoad.gearLoad.physicalLb,3);
bad(()=>createForagingCarry({journal,campaignId:cid,minute:at,actorId:'guide',sourceId:source.id,resultIndex:0,quantity:1.5,itemName:'fish',totalWeightLb:5,itemId:'fish-five'}),/nestačí/);
bad(()=>createForagingCarry({journal,campaignId:cid,minute:at,actorId:'guide',sourceId:source.id,resultIndex:0,quantity:1,itemName:'fish',totalWeightLb:5,itemId:'berries-1'}),/jedinečný/);
bad(()=>createForagingCarry({journal,campaignId:cid,minute:at,actorId:'guide',sourceId:source.id,resultIndex:0,quantity:1,itemName:'fish',totalWeightLb:0,itemId:'fish-zero'}),/hmotnost/);
bad(()=>createForagingCarry({journal,campaignId:'other',minute:at,actorId:'guide',sourceId:source.id,resultIndex:0,quantity:1,itemName:'fish',totalWeightLb:2,itemId:'fish-other'}),/nestačí/);
const packingGuide=createForagingCarry({journal,campaignId:cid,minute:at,actorId:'guide',sourceId:source.id,resultIndex:0,quantity:1,itemName:'fresh fish',totalWeightLb:2,itemId:'fish-two'});
journal.push({id:'food-2',characterId:'guide',calendarCampaignId:cid,campaignMinute:at,calendarForagingSupplyUse:packingGuide.supplyUse,calendarForagingCarry:packingGuide.carry});
eq(remaining('foodDays'),0);eq(remaining('foodDays',1),1);
bad(()=>createForagingCarry({journal,campaignId:cid,minute:at,actorId:'guide',sourceId:source.id,resultIndex:0,quantity:0.5,itemName:'fish',totalWeightLb:1,itemId:'fish-extra'}),/nestačí|vydán/);
const store=createForagingWaterStorage({inventory,journal,campaignId:cid,minute:at,actorId:'scout',itemId:'skin-a',sourceId:source.id,resultIndex:0,fillId:'water-fill-a',useId:'water-use-a',gmConfirmed:true});
eq(store.use.quantity,0.5);eq(store.fill.weightLb,5);
journal.push({id:'water-use-a',characterId:'scout',calendarCampaignId:cid,campaignMinute:at,calendarForagingSupplyUse:store.use},
{id:'water-fill-a',characterId:'scout',calendarCampaignId:cid,campaignMinute:at,calendarInventoryWaterFill:store.fill});
eq(remaining('waterDays'),0.5);eq(filledWaterForItem(journal,cid,'scout','skin-a'),0.5);
eq(validateForagingWaterStorageJournal(journal),true);eq(validateSupplyJournal(journal),true);eq(validatePhysicalWaterJournal(journal,inventory),true);
const withWater=projectCampaignWaterInventory(projectForagedFoodInventory(inventory,journal,cid,at),journal,cid,at);
const loaded=resolveCombatantLoad({character:scout,inventory:withWater});
eq(loaded.gearLoad.physicalLb-baseLoad.gearLoad.physicalLb,8);
bad(()=>createForagingWaterStorage({inventory,journal,campaignId:cid,minute:at,actorId:'scout',itemId:'skin-a',sourceId:source.id,resultIndex:0,fillId:'another-fill',useId:'another-use',gmConfirmed:true}),/obsahuje doloženou vodu/);
const store2=createForagingWaterStorage({inventory,journal,campaignId:cid,minute:at,actorId:'guide',itemId:'skin-b',sourceId:source.id,resultIndex:0,fillId:'water-fill-b',useId:'water-use-b',gmConfirmed:true});
journal.push({id:'water-use-b',characterId:'guide',calendarCampaignId:cid,campaignMinute:at,calendarForagingSupplyUse:store2.use},
{id:'water-fill-b',characterId:'guide',calendarCampaignId:cid,campaignMinute:at,calendarInventoryWaterFill:store2.fill});
eq(remaining('waterDays'),0);
bad(()=>createForagingWaterStorage({inventory,journal,campaignId:cid,minute:at,actorId:'guide',itemId:'skin-b',sourceId:source.id,resultIndex:0,fillId:'bad-fill',useId:'bad-use',gmConfirmed:true}),/dostatek|obsahuje/);
const ate=createForagingCarryEat({journal,campaignId:cid,minute:at,actorId:'scout',carryId:'food-1',quantity:0.5});
journal.push({id:'eat-1',characterId:'scout',calendarCampaignId:cid,campaignMinute:at,calendarForagingCarryEat:ate});
eq(foragedCarriedFood(journal,cid,at).find(l=>l.itemId==='berries-1').remaining,0.5);
const afterEating=projectCampaignWaterInventory(projectForagedFoodInventory(inventory,journal,cid,at),journal,cid,at);
eq(resolveCombatantLoad({character:scout,inventory:afterEating}).gearLoad.physicalLb-baseLoad.gearLoad.physicalLb,6.5);
eq(validateForagingCarriedJournal(journal),true);eq(validateForagingWaterStorageJournal(journal),true);eq(validatePhysicalWaterJournal(journal,inventory),true);eq(validateSupplyJournal(journal),true);
eq(assertGMOnlyCampaignTime(before,{...before,journal,campaignClock:clock}),true);
const altered=structuredClone(journal);altered.find(r=>r.id==='water-use-a').calendarForagingSupplyUse.quantity=1;
bad(()=>validateSupplyJournal(altered),/vydána|vydán|Nedostatek|Zásoba|Nepodložený/);
const orphan=structuredClone(journal).filter(r=>r.id!=='water-use-b');bad(()=>validateForagingWaterStorageJournal(orphan),/Nepárový/);
const substituted=structuredClone(journal);substituted.find(r=>r.id==='food-1').calendarForagingCarry.totalWeightLb=300;
// A genuine GM-attested mass is not inferable from rules; protect the original source as append-only.
bad(()=>assertSupplyJournalAppendOnly(journal,substituted),/změnit ani smazat/);
const watch=trekWatchfulness({modes:{stalking:1,vigilance:1},conveyance:'foot'});
yes(!!watch.effective);yes(Array.isArray(watch.skills));
const sourceText=fs.readFileSync(path.join(root,'app.js'),'utf8');
yes(sourceText.includes('data-episode-foraging-water'));yes(sourceText.includes('latestSuppliesHTML'));yes(sourceText.includes('data-trek-leave-animal'));
console.log('PASS',n,'episode allocation: finder-source, recipients, finite food/water, true carried weight, spent portions, watch modes, GM clock');
