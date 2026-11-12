import assert from 'node:assert/strict';
import {equipmentTimeWorkReceipt93844,pendingEquipmentTimeWork93844,validateEquipmentTimeWork93844,
 validateEquipmentTimeInventory93844,EQUIPMENT_TIME_POLICY_93844} from '../src/integration/hmk-equipment-time-work-93844.js';
import {applyInventoryItemEdit} from '../src/integration/hmk-inventory-edit.js';
import {lastEquipmentSlowCarry} from '../src/integration/hmk-time-episodes.js';
let checks=0;const ok=(condition,msg)=>{assert(condition,msg);checks++};
const throws=(fn,msg)=>{assert.throws(fn,/Equipment|Povinný|oprav|doklad|předmětu|nemůže/i,msg);checks++};
function seed(result='long-delay',policy=true){
 const h={hazard:'equipment',itemId:'obj',itemOwnerId:'A',repairProofId:'skill-01',workerId:'B',result,
  ...(policy?{equipmentMinutePolicy:EQUIPMENT_TIME_POLICY_93844}:{})};
 const j={id:'source',calendarCampaignId:'c',campaignMinute:100,calendarTimeEpisode:{kind:'travel',startMinute:100,endMinute:160,minutes:60,
  memberIds:['A','B'],hazardDetails:[h]}};
 const status=result==='long-delay'?'damaged':'irreparable';
 const data={campaignClock:{campaignId:'c',minute:160},characters:[{id:'A'},{id:'B'}],journal:[j],inventory:[{id:'obj',characterId:'A',
  slot:'carried',quantity:1,snapshot:{name:'Rope',category:'other',properties:{weightLb:1}},
  hmkEquipmentRepair:{status,sourceEpisodeId:'source',workPolicy:EQUIPMENT_TIME_POLICY_93844}}]};
 return data;
}
for(const result of ['long-delay','irreparable']){
 const data=seed(result);const cid='c';
 ok(pendingEquipmentTimeWork93844(data.journal,cid,160,['A']).length===1,'party affected');
 ok(pendingEquipmentTimeWork93844(data.journal,cid,160,['C']).length===0,'unrelated party unaffected');
 ok(pendingEquipmentTimeWork93844(data.journal,cid,159,['A']).length===0,'not due before watch ends');
 ok(validateEquipmentTimeWork93844(data.journal),'valid new source');
 ok(validateEquipmentTimeInventory93844(data),'damaged source proper');
 throws(()=>equipmentTimeWorkReceipt93844({journal:data.journal,campaignId:cid,minute:160,minutes:241,memberIds:['B'],sourceEpisodeId:'source'}),'too many minutes');
 throws(()=>equipmentTimeWorkReceipt93844({journal:data.journal,campaignId:cid,minute:160,minutes:60,memberIds:['A'],sourceEpisodeId:'source'}),'nonworker');
 for(let i=0;i<4;i++){
  const minute=160+i*60;
  const r=equipmentTimeWorkReceipt93844({journal:data.journal,campaignId:cid,minute,minutes:60,memberIds:['B'],sourceEpisodeId:'source'});
  ok(r.beforeMinutes===60*i&&r.remainingMinutes===180-60*i,'progress exactly');
  ok(r.disposition===(i===3?(result==='long-delay'?'repaired':'abandoned'):'in-progress'),'disposition');
  const j={id:'work'+i,calendarCampaignId:cid,campaignMinute:minute,calendarTimeEpisode:{kind:'other',startMinute:minute,endMinute:minute+60,minutes:60,memberIds:['B'],equipmentTimeWork93844:r}};
  data.journal.push(j);
  ok(validateEquipmentTimeWork93844(data.journal),'replay work');
  if(i===0){
   const someoneElse={id:'other',calendarCampaignId:cid,campaignMinute:minute,calendarTimeEpisode:{kind:'rest',startMinute:minute,endMinute:minute+60,minutes:60,memberIds:['A']}};
   data.journal.push(someoneElse);ok(validateEquipmentTimeWork93844(data.journal),'other character can rest without forging work');
  }
  if(i===1){
   const bad={id:'bypass',calendarCampaignId:cid,campaignMinute:minute+60,calendarTimeEpisode:{kind:'travel',startMinute:minute+60,endMinute:minute+90,minutes:30,memberIds:['A']}};
   throws(()=>validateEquipmentTimeWork93844([...data.journal,bad]),'travel blocked for anyone in party');
  }
 }
 ok(pendingEquipmentTimeWork93844(data.journal,cid,400,['A']).length===0,'240 minutes accounted');
 ok(validateEquipmentTimeWork93844(data.journal),'completed proof valid');
 // Tampering and duplicate work produce replay errors.
 const bad=structuredClone(data.journal);bad.find(j=>j.id==='work1').calendarTimeEpisode.equipmentTimeWork93844.workedMinutes=59;
 throws(()=>validateEquipmentTimeWork93844(bad),'tamper');
 const bad2=structuredClone(data.journal);bad2.find(j=>j.id==='work2').calendarTimeEpisode.equipmentTimeWork93844.sourceEpisodeId='foreign';
 throws(()=>validateEquipmentTimeWork93844(bad2),'wrong source');
}
{
 const data=seed('long-delay');
 throws(()=>applyInventoryItemEdit(data,{ownerId:'A',itemId:'obj',slot:'carried',quantity:1,currentWQ:null,condition:'',gmEquipmentState:'usable'}),'cannot GM-resolve before minutes');
 const bad=structuredClone(data);bad.inventory[0].hmkEquipmentRepair.status='repaired';
 throws(()=>validateEquipmentTimeInventory93844(bad),'cannot tamper current status');
 const historical=seed('long-delay',false);
 ok(validateEquipmentTimeWork93844(historical.journal),'legacy sources remain compatible');
 ok(pendingEquipmentTimeWork93844(historical.journal,'c',160,['A']).length===0,'no fake legacy debt');
}
// A successful repair S is not another time-work job. Its single Slow Mode
// is carried across actual MOVING minutes, not reset on a short 60min window.
{
 const cid='slow-c',party=['A','B'];
 const source={id:'slow-source',calendarCampaignId:cid,campaignMinute:100,
  calendarTimeEpisode:{kind:'travel',startMinute:100,endMinute:160,minutes:60,memberIds:party,
   equipmentSlowCarryOut:240,equipmentSlowCarryIn:0,
   hazardDetails:[{hazard:'equipment',result:'short-delay',equipmentMinutePolicy:EQUIPMENT_TIME_POLICY_93844}]}};
 const journal=[source];
 ok(lastEquipmentSlowCarry(journal,cid,160,party)===240,'S slow starts at 240 moving minutes');
 for(let i=0;i<4;i++){
  const rem=180-i*60;
  journal.push({id:'slow-travel-'+i,calendarCampaignId:cid,campaignMinute:160+i*60,
   calendarTimeEpisode:{kind:'travel',startMinute:160+i*60,endMinute:220+i*60,minutes:60,memberIds:party,
    equipmentSlowCarryIn:240-i*60,equipmentSlowCarryOut:rem,movementMinutes:60}});
  ok(lastEquipmentSlowCarry(journal,cid,220+i*60,party)===rem,'S remaining moving minutes '+rem);
 }
 ok(lastEquipmentSlowCarry(journal,cid,400,party)===0,'S slow exhausted after 240 moving minutes');
}
console.log('PASS v93.844 Equipment time ledger:',checks,'assertions');
