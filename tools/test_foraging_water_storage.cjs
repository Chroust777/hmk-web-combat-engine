/** Regression: HMK p.147 Foraging water is a REAL finite resource; storing in a
 * carried waterskin must not also count as drinking it. Never moves the GM clock. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),ext=require.extensions['.js'];
require.extensions['.js']=function(mod,file){if(!file.startsWith(path.join(root,'src')+path.sep))return ext(mod,file);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file)};
const {createForagingWaterStorage,validateForagingWaterStorageJournal}=require('../src/integration/hmk-foraging-water-storage.js');
const {availableSupplyLots,validateSupplyJournal,createSupplyUse}=require('../src/integration/hmk-foraging-supply-ledger.js');
const {createPhysicalWaterUse,validatePhysicalWaterJournal,filledWaterForItem,projectCampaignWaterInventory,assertWaterAppendOnly}=require('../src/integration/hmk-physical-water-ledger.js');
const {createNutritionPolicy,finishDueNutritionDays,validateNutritionJournal}=require('../src/integration/hmk-nutrition-days.js');
const {assertGMOnlyCampaignTime}=require('../src/integration/hmk-gm-clock-authority.js');
const {historicalHMKCalendarEntries}=require('../src/integration/hmk-calendar-history.js');
const {resolveCombatantLoad}=require('../src/integration/combatant-load.js');
let passed=0;const eq=(a,b)=>{assert.deepEqual(a,b);passed++},ok=x=>{assert.ok(x);passed++},no=(f,r)=>{assert.throws(f,r);passed++};
const campaignId='c-A',actorId='actor-1',minute=120;
const snap={id:'hmk:gear:hmk-p120-040',name:'Waterskin, 2 quart',category:'other',properties:{weightLb:2}};
const inventory=[1,2].map(n=>({id:'skin-'+n,characterId:actorId,sourceItemId:snap.id,snapshot:snap,quantity:1,slot:'carried'}));
const found={id:'found',characterId:actorId,calendarCampaignId:campaignId,campaignMinute:60,calendarTrekWildernessProof:{results:[{foodDays:0,waterDays:1,herbDoses:0}]}};
const db={characters:[{id:actorId,name:'Scout',hmk:{attributes:{str:12}}}],inventory,journal:[found],
 campaignClock:{format:'hmk-campaign-calendar-v1',campaignId,minute,characterIds:[actorId],anchors:[],events:[{id:'init',type:'init',minute:0,reason:'GM start'},{id:'advance',type:'advance',minute,reason:'GM confirmed time'}]}};
const created=createForagingWaterStorage({inventory:db.inventory,journal:db.journal,campaignId,actorId,minute,
 itemId:'skin-1',sourceId:'found',resultIndex:0,fillId:'fill-1',useId:'stored-1',gmConfirmed:true});
eq(created.use.quantity,0.5);eq(created.use.disposition,'stored-in-container');eq(created.use.containerFillId,'fill-1');
eq(created.fill.foragingSupplyUseId,'stored-1');eq(created.fill.waterSource.includes('Foraging'),true);
const beforeClock=structuredClone(db.campaignClock);
db.journal.push({id:'stored-1',characterId:actorId,calendarCampaignId:campaignId,campaignMinute:minute,calendarForagingSupplyUse:created.use},
 {id:'fill-1',characterId:actorId,calendarCampaignId:campaignId,campaignMinute:minute,calendarInventoryWaterFill:created.fill});
eq(validateSupplyJournal(db.journal),true);eq(validatePhysicalWaterJournal(db.journal,db.inventory),true);
eq(validateForagingWaterStorageJournal(db.journal),true);
eq(availableSupplyLots(db.journal,campaignId).find(l=>l.unit==='waterDays').remaining,0.5);
eq(filledWaterForItem(db.journal,campaignId,actorId,'skin-1'),0.5);
eq(projectCampaignWaterInventory(db.inventory,db.journal,campaignId)[0].waterContentsLb,5);
const loadEmpty=resolveCombatantLoad({character:db.characters[0],inventory:db.inventory});
const loadFull=resolveCombatantLoad({character:db.characters[0],inventory:projectCampaignWaterInventory(db.inventory,db.journal,campaignId)});
eq(loadFull.gearLoad.physicalLb-loadEmpty.gearLoad.physicalLb,5);
eq(assertGMOnlyCampaignTime({campaignClock:beforeClock},db),true);
no(()=>createForagingWaterStorage({...created,inventory, journal:db.journal,campaignId,actorId,minute,itemId:'skin-1',sourceId:'found',resultIndex:0,fillId:'f2',useId:'u2',gmConfirmed:true}),/obsahuje doloženou vodu/);
no(()=>createForagingWaterStorage({inventory,journal:db.journal,campaignId:'other',actorId,minute,itemId:'skin-2',sourceId:'found',resultIndex:0,fillId:'f2',useId:'u2',gmConfirmed:true}),/Foraging/);
no(()=>createForagingWaterStorage({inventory,journal:db.journal,campaignId,actorId,minute:10,itemId:'skin-2',sourceId:'found',resultIndex:0,fillId:'f2',useId:'u2',gmConfirmed:true}),/Foraging/);
no(()=>createForagingWaterStorage({inventory,journal:db.journal,campaignId,actorId,minute,itemId:'skin-2',sourceId:'found',resultIndex:0,fillId:'f2',useId:'u2'}),/GM musí/);
no(()=>createSupplyUse({journal:db.journal,campaignId,minute,sourceId:'found',resultIndex:0,unit:'waterDays',quantity:1,actorId,disposition:'stored-in-container',containerFillId:'f2'}),/půl galonu/);
const orphan=structuredClone(db.journal).filter(j=>j.id!=='fill-1');no(()=>validateForagingWaterStorageJournal(orphan),/odpovídající/);
const missingDebit=structuredClone(db.journal).filter(j=>j.id!=='stored-1');no(()=>validateForagingWaterStorageJournal(missingDebit),/Nepárový/);
const wrongActor=structuredClone(db.journal);wrongActor.at(-1).characterId='somebody';no(()=>validateForagingWaterStorageJournal(wrongActor),/Nepárový/);
const wrongTime=structuredClone(db.journal);wrongTime.at(-1).campaignMinute=121;no(()=>validateForagingWaterStorageJournal(wrongTime),/Nepárový/);
const wrongCampaign=structuredClone(db.journal);wrongCampaign.at(-1).calendarCampaignId='other';no(()=>validateForagingWaterStorageJournal(wrongCampaign),/Nepárový/);
const flipped=structuredClone(db.journal);flipped.reverse();no(()=>validateForagingWaterStorageJournal(flipped),/Nepárový/);
no(()=>assertWaterAppendOnly(db.journal,db.journal.slice(0,2)),/nesmějí/);
// Now use the remaining half-day Foraging water in a next-day nutrition period:
// the stored half is NOT consumed at the moment it enters the bottle.
const policy=createNutritionPolicy({campaignId,minute,actorId,inventoryRations:true,inventoryWater:true,foodNeed:1,waterNeed:1});
db.journal.push({id:'policy',characterId:actorId,calendarCampaignId:campaignId,campaignMinute:minute,calendarNutritionPolicy:policy});
db.campaignClock.minute=minute+1440;
const result=finishDueNutritionDays(db,{idFactory:(()=>{let n=0;return()=>`auto-${++n}`})(),stamp:()=> 'now'});
eq(result.length,1);eq(result[0].calendarNutritionDay.waterReceived,1);eq(result[0].calendarNutritionDay.waterShortfall,0);
eq(db.journal.filter(j=>j.calendarInventoryWaterUse).length,1);
eq(db.journal.filter(j=>j.calendarForagingSupplyUse?.disposition==='consumed').length,1);
eq(db.journal.filter(j=>j.calendarForagingSupplyUse?.disposition==='stored-in-container').length,1);
eq(filledWaterForItem(db.journal,campaignId,actorId,'skin-1'),0);
eq(availableSupplyLots(db.journal,campaignId).find(l=>l.unit==='waterDays'),undefined);
eq(validateSupplyJournal(db.journal),true);eq(validatePhysicalWaterJournal(db.journal,inventory),true);
eq(validateForagingWaterStorageJournal(db.journal),true);eq(validateNutritionJournal(db.journal),true);
const history=historicalHMKCalendarEntries(db.campaignClock,db.characters,db.journal);
ok(history.some(x=>x.kind==='physical-water-fill'&&x.note.includes('Foraging')));
ok(history.some(x=>x.kind==='physical-water-use'&&x.note.includes('vypití')));
ok(history.some(x=>x.kind==='foraging-supply-use'&&x.note.includes('Nejde o vypití')));
no(()=>{const hijacked=structuredClone(db.journal);hijacked.at(-1).calendarNutritionDay.waterReceived=2;validateNutritionJournal(hijacked)},/Neplatná nebo duplicitní/);
eq(finishDueNutritionDays(db,{idFactory:()=> 'never',stamp:()=> 'now'}).length,0);
// After actual consumption the same vessel can receive a new independently evidenced finding.
const found2={...found,id:'found2',campaignMinute:minute+1440,calendarTrekWildernessProof:{results:[{foodDays:0,waterDays:1,herbDoses:0}]}};
db.journal.push(found2);const refilled=createForagingWaterStorage({inventory,journal:db.journal,campaignId,actorId,minute:db.campaignClock.minute,itemId:'skin-1',sourceId:'found2',resultIndex:0,fillId:'fill-2',useId:'store-2',gmConfirmed:true});
ok(refilled.fill);db.journal.push({id:'store-2',characterId:actorId,calendarCampaignId:campaignId,campaignMinute:db.campaignClock.minute,calendarForagingSupplyUse:refilled.use},{id:'fill-2',characterId:actorId,calendarCampaignId:campaignId,campaignMinute:db.campaignClock.minute,calendarInventoryWaterFill:refilled.fill});
eq(filledWaterForItem(db.journal,campaignId,actorId,'skin-1'),0.5);eq(validateForagingWaterStorageJournal(db.journal),true);
console.log('PASS:',passed,'Foraging → waterskin / half-gallon debit / medical input / replay / GM clock checks');
