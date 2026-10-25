const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');let passed=0;
const check=(a,b,label)=>{assert.deepEqual(a,b,label);passed++};
(async()=>{
 const {characterCarryProjection,partyCarryProjection,rationEquivalentMinutes,supplyDurationText}=await import('file://'+path.join(root,'src/integration/hmk-provisions-simple-view.js'));
 for(const [v,need,want] of [[1,1,1440],[.5,1,720],[.5,.5,1440],[2,2,1440],[1,2,720],[0,1,0],[-1,1,null],[3,0,null]])check(rationEquivalentMinutes(v,need),want,'duration');
 check(supplyDurationText(720),'12 h');check(supplyDurationText(1501),'1 d 1 h 1 min');check(supplyDurationText(0),'0 h');
 const db={campaignClock:{campaignId:'c',characterIds:['a','b'],minute:0},characters:[{id:'a',name:'A',hmk:{}},{id:'b',name:'B',hmk:{}}],inventory:[],journal:[
 {id:'food-a',characterId:'a',calendarCampaignId:'c',campaignMinute:0,calendarInventoryRationStock:{format:'hmk-physical-ration-stock-v1',campaignId:'c',actorId:'a',itemId:'r-a',sourceItemId:'hmk:gear:hmk-p120-027',name:'Rations, standard',minute:0,quantity:2,expiresAt:14400}},
 {id:'water-a',characterId:'a',calendarCampaignId:'c',campaignMinute:0,calendarInventoryWaterFill:{format:'hmk-physical-water-fill-v1',campaignId:'c',actorId:'a',itemId:'w-a',minute:0,quantity:1}},
 {id:'food-b',characterId:'b',calendarCampaignId:'c',campaignMinute:0,calendarInventoryRationStock:{format:'hmk-physical-ration-stock-v1',campaignId:'c',actorId:'b',itemId:'r-b',sourceItemId:'hmk:gear:hmk-p120-026',name:'Rations, iron',minute:0,quantity:.5,expiresAt:43200}},
 ]};
 const a=characterCarryProjection(db,'a'),b=characterCarryProjection(db,'b');
 check(a.edibleFood,2);check(a.carriedWater,1);check(a.physicalFoodLb,6);check(a.physicalWaterLb,10);check(a.totalPhysicalLb,16);
 check(a.foodMinutes,2880);check(a.waterMinutes,1440);
 check(b.carriedFood,.5);check(b.physicalFoodLb,1.5);check(b.foodMinutes,720);
 check(partyCarryProjection(db,db.characters).totalCarriedLb,17.5);
 check(characterCarryProjection(db,'someone').available,false);
 db.journal.push({id:'drop-a',characterId:'a',calendarCampaignId:'c',campaignMinute:0,calendarInventoryRationLoss:{sourceId:'food-a',quantity:.5}});
 db.journal.push({id:'drop-water',characterId:'a',calendarCampaignId:'c',campaignMinute:0,calendarInventoryWaterLoss:{fillId:'water-a',quantity:.5}});
 check(characterCarryProjection(db,'a').physicalFoodLb,4.5);check(characterCarryProjection(db,'a').physicalWaterLb,5);check(characterCarryProjection(db,'a').totalPhysicalLb,9.5);
 check(characterCarryProjection(db,'b').totalPhysicalLb,1.5);
 check(partyCarryProjection(db,db.characters).totalCarriedLb,11);
 db.campaignClock.minute=20000;
 check(characterCarryProjection(db,'a').edibleFood,0);
 check(characterCarryProjection(db,'a').spoiledFood,1.5);
 check(characterCarryProjection(db,'a').physicalFoodLb,4.5);
 db.campaignClock.campaignId='other';
 check(characterCarryProjection(db,'a').physicalFoodLb,0);
 const {allocateForagingRations}=await import('file://'+path.join(root,'src/integration/hmk-foraging-supply-ledger.js'));
 const shared=[{id:'forage',characterId:'a',calendarCampaignId:'c',campaignMinute:0,calendarTrekWildernessProof:{results:[{foodDays:2,waterDays:2,herbDoses:0}]}}];
 const portions=allocateForagingRations({journal:shared,campaignId:'c',minute:0,actorIds:['a'],foodEach:0.5,waterEach:0.5});
 check(portions.length,2);check(portions.map(x=>x.actorId),['a','a']);
 check(portions.map(x=>x.quantity),[0.5,0.5]);
 check(portions.map(x=>x.disposition),['consumed','consumed']);
 check(shared.length,1); // original receipts not modified by allocator
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');const css=fs.readFileSync(path.join(root,'book-templates.css'),'utf8');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const str of ["const APP_VERSION='93.479'",'function partyProvisionLedgerHTML(participants)','function personalProvisionQuickActionsHTML(actor)',
 'data-provision-single-ration','data-provision-drop','allocateForagingRations','recordPhysicalRationLoss','recordPhysicalWaterLoss',
 'data-foraging-batch-rations','data-nutrition-policy-form']){assert.ok(app.includes(str),str);passed++}
 for(const str of ['.hc-provision-table','.hc-provision-carry-summary','.hc-provision-metrics','.hc-provision-compact-extra']){assert.ok(css.includes(str),str);passed++}
 check(html.includes('v93.479'),true);check(html.includes('hmk-app.bundle.js?v=93.479'),true);
 check(app.includes('Přidělení je denní spotřeba ze společných nálezů'),true); // no synthetic carried item
 console.log('PASS',passed,'provisions 472 calculations, physical mass, expiry, ownership and UI guards');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
