'use strict';
const assert=require('node:assert/strict');
(async()=>{
const B=await import('../src/integration/hmk-bandage-stock-93778.js');
const P=await import('../src/integration/hmk-inventory-overview.js');
const L=await import('../src/integration/hmk-library-economy.js');
const E=await import('../src/integration/hmk-inventory-edit.js');
const S=await import('../src/integration/hmk-equipment-serviceability.js');
let tests=0;function ok(cond,why){assert.ok(cond,why);tests++}
const def={id:B.BANDAGE_CATALOG_ID,name:'Bandages, 32',category:'other',properties:{pricePence:24,weightLb:3}};
const item=(id,qty,characterId='healer')=>({id,characterId,sourceItemId:def.id,snapshot:structuredClone(def),quantity:qty,slot:'carried'});
const offer=L.libraryPurchaseOffer(def);ok(offer.pricePence===24&&offer.quantity===32,'catalogue 32 pcs 24d');
const legacy={inventory:[item('old-1',1),item('old-2',2)]};
B.migrateLegacyBandageQuantities(legacy);ok(legacy.inventory[0].quantity===32&&legacy.inventory[1].quantity===64,'pre-93778 packets converted to pieces');
ok(legacy.inventory.every(x=>x.hmkBandageUnits===B.BANDAGE_UNITS),'migration marks every converted stock');
B.migrateLegacyBandageQuantities(legacy);ok(legacy.inventory[0].quantity===32&&legacy.inventory[1].quantity===64,'idempotent old-stock migration');
const newStock={inventory:[{...item('new-32',32),hmkBandageUnits:B.BANDAGE_UNITS}]};B.migrateLegacyBandageQuantities(newStock);ok(newStock.inventory[0].quantity===32,'new stock never multiplied');
for(const [qty,w] of [[0,0],[1,1],[10,1],[11,2],[20,2],[21,3],[32,3],[33,4],[42,4],[52,5],[64,6]])ok(B.bandageWeightLb(qty)===w,`weight ${qty}`);
for(const q of [10,20,21,32]){let row=P.projectInventoryRows([item('p',q)])[0];ok(row.qty===q&&row.totalWeight===B.bandageWeightLb(q),`inventory projection ${q}`)}
const row=P.projectInventoryRows([item('p',32)])[0];ok(row.totalPrice===24&&row.priceLabel==='24 d / 32 ks','price and label');
for(const [aspect,level,expected] of [['e',1,1],['e',3,3],['p',5,5],['b',1,0],['b',4,4],['f',1,0],['f',3,3],['frost',4,0]])ok(B.bandagesNeededForTreatment({aspect,level})===expected,`${aspect}${level}`);
ok(B.bandagesNeededForStaunch(2,[3,5])===8,'two real d6');
assert.throws(()=>B.bandagesNeededForStaunch(2,[3]),/d6/);tests++;
const doc={characters:[{id:'healer'},{id:'patient'}],inventory:[item('b1',13),item('b2',32),item('alien',32,'patient')],journal:[]};
const plan=B.planBandageConsumption(doc.inventory,'healer',16);ok(plan.rows.length===2&&plan.rows[0].used===13&&plan.rows[1].used===3,'owner-bounded FIFO plan');
B.commitBandageConsumption(doc,plan,{eventId:'health-1',patientId:'patient',woundId:'wound',kind:'Clean & Dress',minute:500,campaignId:'c'});
ok(doc.inventory.length===2&&doc.inventory.find(x=>x.id==='b2').quantity===29,'atomic stock decrement');
ok(B.bandageWeightLb(doc.inventory.find(x=>x.id==='b2').quantity)===3,'post-spend mass');
ok(doc.journal.length===1&&doc.journal[0].hmkBandageUse.quantity===16,'receipt');
assert.throws(()=>B.commitBandageConsumption(doc,plan,{eventId:'health-1',patientId:'patient'}));tests++;
assert.throws(()=>B.planBandageConsumption(doc.inventory,'healer',30));tests++;
const d={characters:[{id:'healer'}],inventory:[{id:'broken',characterId:'healer',snapshot:{id:'hand',name:'Hammer',category:'weapon',properties:{weightLb:2}},quantity:1,slot:'carried',condition:'HMK Equipment Hazard: čeká na opravu',hmkEquipmentRepair:{status:'damaged',remainingMinutes:240}}],journal:[]};
const restored=E.applyInventoryItemEdit(d,{ownerId:'healer',itemId:'broken',quantity:1,slot:'carried',currentWQ:null,gmEquipmentState:'usable',condition:d.inventory[0].condition});
ok(!S.equipmentUnusable(restored.inventory[0])&&restored.inventory[0].hmkEquipmentRepair.remainingMinutes===0,'GM can restore serviceability');
ok(S.equipmentUnusable(d.inventory[0]),'source unchanged');
console.log(`PASS v93.778 bandage and GM repair: ${tests} assertions`);
})().catch(e=>{console.error(e);process.exitCode=1});
