import assert from 'node:assert/strict';
import {applyEquipmentDamage93845,equipmentCurrentWQ93845} from '../src/integration/hmk-equipment-gm-93845.js';
import {applyInventoryItemEdit} from '../src/integration/hmk-inventory-edit.js';
import {validateEquipmentTimeWork93844,pendingEquipmentTimeWork93844,EQUIPMENT_TIME_POLICY_93844,equipmentTimeWorkReceipt93844} from '../src/integration/hmk-equipment-time-work-93844.js';
import {equipmentUnusable} from '../src/integration/hmk-equipment-serviceability.js';
import {validateTimeEpisodes} from '../src/integration/hmk-time-episodes.js';
let tests=0;function ok(cond,label){assert.ok(cond,label);tests++}function eq(a,b,label){assert.deepEqual(a,b,label);tests++}function throws(fn,label){assert.throws(fn,label);tests++}
const item=(name='Rope',wq=3)=>({id:'original-item',characterId:'A',sourceItemId:'rope',slot:'worn',
 snapshot:{name,category:'armor',properties:{quality:wq,weightLb:2}},condition:'Starý popis',quantity:1,currentWQ:wq});
const actor={id:'A'};
for(const result of ['ignored','long-delay','irreparable']){
 const original=item(),saved=structuredClone(original);
 applyEquipmentDamage93845(original,{result,sourceEpisodeId:'original-episode',repairProofId:result==='ignored'?null:'real-skill-01',repairActorId:'B'});
 eq(original.id,saved.id,'physical ID retained');eq(original.currentWQ,0,'broken WQ 0');
 eq(original.hmkEquipmentRepair.originalWQ,3,'original quality retained');ok(original.condition.includes('HMK Equipment Hazard:'),'condition');
 ok(equipmentUnusable(original),'not usable');eq(original.slot,'carried','equipment removed from worn slot');
 ok(!Object.hasOwn(original.hmkEquipmentRepair,'workPolicy'),'no generated time policy');
 const data={characters:[actor],inventory:[original]};
 throws(()=>applyInventoryItemEdit(data,{ownerId:'A',itemId:original.id,slot:'carried',quantity:1,currentWQ:2,condition:original.condition,gmEquipmentState:'keep'}),'WQ cannot change while broken');
 if(result!=='irreparable'){
  const repaired=applyInventoryItemEdit(data,{ownerId:'A',itemId:original.id,slot:'carried',quantity:1,currentWQ:2,condition:original.condition,gmEquipmentState:'usable'});
  eq(repaired.inventory[0].currentWQ,2,'GM sets quality');
  ok(!equipmentUnusable(repaired.inventory[0]),'GM repairs no timer');
  eq(data.inventory[0].currentWQ,0,'no mutation before committing editor');
 }else throws(()=>applyInventoryItemEdit(data,{ownerId:'A',itemId:original.id,slot:'carried',quantity:1,currentWQ:2,condition:original.condition,gmEquipmentState:'usable'}),'CF is irreparable');
}
let withoutWq=item('Tunic',null);delete withoutWq.snapshot.properties.quality;
applyEquipmentDamage93845(withoutWq,{result:'long-delay',sourceEpisodeId:'original-episode'});
eq(withoutWq.currentWQ,null,'no invented WQ');ok(!Object.hasOwn(withoutWq.hmkEquipmentRepair,'originalWQ'),'no invented original quality');
eq(equipmentCurrentWQ93845(item('Knife',5)),5,'quality detection');
// Legacy version 93.844 saves are replayable; later travel is not forcibly blocked.
const old={id:'old-event',calendarCampaignId:'campaign',campaignMinute:100,calendarTimeEpisode:{kind:'travel',startMinute:100,endMinute:160,minutes:60,memberIds:['A','B'],hazardDetails:[{hazard:'equipment',result:'long-delay',itemId:'original-item',itemOwnerId:'A',repairProofId:'repair',workerId:'B',equipmentMinutePolicy:EQUIPMENT_TIME_POLICY_93844}]}};
const next={id:'ordinary-travel',calendarCampaignId:'campaign',campaignMinute:160,calendarTimeEpisode:{kind:'travel',startMinute:160,endMinute:220,minutes:60,memberIds:['A','B'],hazardDetails:[]}};
ok(validateEquipmentTimeWork93844([old,next]),'old obligation does not block future travel');
const oldWork=equipmentTimeWorkReceipt93844({journal:[old],campaignId:'campaign',minute:160,minutes:60,memberIds:['B'],sourceEpisodeId:'old-event'});
const work={id:'old-work',calendarCampaignId:'campaign',campaignMinute:160,calendarTimeEpisode:{kind:'other',startMinute:160,endMinute:220,minutes:60,memberIds:['B'],equipmentTimeWork93844:oldWork}};
ok(validateEquipmentTimeWork93844([old,work,next]),'old work receipts preserved and ordinary travel allowed');
const tampered=structuredClone(work);tampered.calendarTimeEpisode.equipmentTimeWork93844.workedMinutes=100;
throws(()=>validateEquipmentTimeWork93844([old,tampered,next]),'old work tampering still rejected');
ok(pendingEquipmentTimeWork93844([old],'campaign',160,['A']).length===1,'old metadata remains inspectable');
console.log('PASS v93.845 GM-managed equipment:',tests,'assertions');
