'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'book-templates.css'),'utf8');
let tests=0;
function ok(value,msg){assert.ok(value,msg);tests++}function eq(a,b,msg){assert.equal(a,b,msg);tests++}
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const actor={id:'actor1',name:'Test'},price='4 d / ks';
const food={id:'food1',characterId:actor.id,slot:'carried',snapshot:{name:'Rations, standard',category:'other',properties:{pricePence:4,weightLb:3},description:'Tištěná položka vybavení HMK, str. 120; výběr do počáteční výbavy je orientační, nikoli povinný.'}};
const water={id:'water1',characterId:actor.id,slot:'carried',snapshot:{name:'Waterskin, 2 quart',category:'other',properties:{pricePence:24,weightLb:2}}};
const weapon={id:'weapon1',characterId:actor.id,slot:'main_hand',snapshot:{name:'Dagger',category:'weapon',properties:{pricePence:5,weightLb:1}}};
const journal=[];
const data={campaignClock:{minute:720,characterIds:[actor.id]},journal,characters:[actor,{id:'actor2',name:'Other'}],inventory:[food,water,weapon]};
const ctx={esc,data,activeRationInventory:()=>data.inventory,
 projectInventoryRows:()=>[food,water,weapon].map(x=>({item:x,kind:x.slot==='main_hand'?'equipped':'carried',qty:1,wq:12,priceLabel:price,totalPrice:4,weight:3,totalWeight:3,armourENC:'—',keyFields:x===food?[x.snapshot.description,'Řemeslo CK']:['Speciální detail'],protection:[]})),
 inventoryTotals:rows=>({knownValue:rows.length*4,knownWeightLb:rows.length*3,unknownValue:0,unknownWeight:0}),
 resolveCombatantLoad:()=>({armourENC:0,gearENC:0,modifiedENC:0,encReady:true,gearLoad:{effectiveLb:8},bulkReady:true,bulkByZone:{head:0,arms:0,torso:0,legs:0},meleeBulkPenalty:0}),
 cashForCharacter:()=>({ok:true,balance:96}),
 availableRationLots:()=>[{itemId:food.id,sourceId:'ration-proof',remaining:1}],
 rationStockBalances:()=>[{itemId:food.id,sourceId:'ration-proof',remaining:1,minute:100,name:'Rations, standard'}],
 waterskinBalances:()=>[{itemId:water.id,fillId:'water-proof',remaining:0.5,minute:100}],
 campaignKey:()=>'campaign1',
 PRINTED_VIAL:'vial-not-present',gripOf:()=>"one",visibleInventoryNote:()=>'',slotLabel:x=>x,number:x=>x,
 };
const readFunction=(name,next)=>vm.runInNewContext('('+code.slice(code.indexOf(`function ${name}(`),code.indexOf(`\nfunction ${next}(`)).trim()+')',ctx);
const overview=readFunction('characterInventoryOverview','inventoryPartialDropForm');
const html=overview(actor,data.inventory);
const count=(needle,haystack=html)=>haystack.split(needle).length-1;
eq(count('data-inv-action-menu'),3,'one action picker for each item');
eq(count('data-inv-action-confirm'),3,'one OK for each item');
eq(count('data-inv-action-select'),3,'one dropdown for each item');
eq(count('<option value="partial">'),2,'partial discard only for physical food and filled water');
ok(html.includes('value="ration-transfer"'),'existing ration transfer preserved');
ok(html.includes('value="ration-loss"'),'existing ration write-off preserved');
ok(html.includes('value="chest"'),'existing chest transfer preserved');
ok(html.includes('value="edit"'),'existing item edit preserved');
ok(html.includes('value="remove"'),'existing loss action preserved');
ok(html.includes('value="transfer"'),'existing item transfer preserved');
ok(!html.includes('data-remove-inv='),'old visible direct action buttons removed');
ok(!html.includes('data-edit-inv='),'old visible edit buttons removed');
ok(html.includes('Celkem 4 d</span>'),'unit d stays inside total price span');
ok(!html.includes('Tištěná položka vybavení HMK'),'generic auto kit note removed');
ok(html.includes('Řemeslo CK'),'non-generic specialty retained');
ok(html.includes('class="inv-item-kind inv-money-total"'),'price line marked non-breaking');
ok(html.includes('<colgroup>'),'consistent aligned columns');
const partial=readFunction('inventoryPartialDropForm','physicalWaterPanel');
let form=partial(food);
ok(form.includes('ration-proof'),'food lot offers exact evidenced source');
ok(form.includes('data-inv-partial-quantity'),'partial amount tied to proof');
ok(form.includes('value="0.5"'),'half unit permitted');
form=partial(water);
ok(form.includes('water-proof'),'water lot offers exact fill source');
ok(form.includes('Odložit část · Waterskin, 2 quart'),'dialog scoped to the item');
eq(partial(weapon),'','non-provision item cannot use partial proof disposal');
const getFunction=code.slice(code.indexOf('function provisionCardHTML('),code.indexOf('\nfunction partyProvisionCardsHTML('));
ok(!getFunction.includes('data-provision-manage'),'Chronicle Spread and Calendar no duplicate buttons');
const quick=code.slice(code.indexOf('function personalProvisionQuickActionsHTML('),code.indexOf('\nfunction partyProvisionLedgerHTML('));
ok(!quick.includes('data-provision-drop'),'Provisions no duplicate partial disposal form');
ok(!quick.includes('Odložit část nesených zásob'),'old large drop table absent');
ok(quick.includes('data-provision-single-ration'),'shared Foraging issue preserved');
ok(!css.includes('NO_EXISTENT_COLOR'),'CSS retained');
ok(css.includes('min-width:1090px!important;table-layout:fixed'),'aligned fixed inventory columns');
ok(css.includes('.inv-money-total{white-space:nowrap!important;}'),'price totals never wrap');
ok(code.includes('const APP_VERSION=\'93.494\''),'release version');
console.log('PASS',tests,'inventory UI v93.494: actions, evidence, proof-backed partial disposal, price/alignment, omitted generic notes');
if(process.env.HMK_PREVIEW_PATH){fs.writeFileSync(process.env.HMK_PREVIEW_PATH,html);}
