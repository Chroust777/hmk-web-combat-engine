'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=src.indexOf('   for(const hazard of result.hazardDetails||[]){');
 const end=src.indexOf('   let episodeWeatherSourceId=weather.sourceId;',start);
 assert.ok(start>0&&end>start,'Cannot find original production hazard-commit block');
 // Exercise the actual production inventory/journal branch, not a rewritten proxy.
 const commit=new Function('result','data','sourceId','clock','campaignKey','uuid','stamp',src.slice(start,end));
 const H=await import('../src/integration/hmk-episode-travel-detail.js');
 const S=await import('../src/integration/hmk-equipment-serviceability.js');
 const E=await import('../src/integration/hmk-inventory-edit.js');
 let checks=0,serial=0;const check=(v,m)=>{assert.ok(v,m);checks++};
 for(const [level,outcome,disposition] of [['CS','no-delay','repair'],['S','short-delay','repair'],['F','long-delay','repair'],['CF','irreparable','repair'],[null,'ignored','ignore'],[null,'abandoned','abandon']]){
  const skill=level===null?null:'Hideworking',h=H.episodeHazardFollowup({hazard:'equipment',equipmentDisposition:disposition,repairSkill:skill,repairLevel:level});
  check(h.result===outcome,'HMK p148 '+String(level));
  const actor={id:'repair-pc',name:'GM',kind:'PC'},item={id:'item-1',characterId:actor.id,snapshot:{id:'rope',name:'Provaz',category:'other',properties:{weightLb:2}},quantity:1,slot:'carried',condition:''};
  const data={characters:[actor],inventory:[item],journal:[]};
  const row={...h,itemId:item.id,itemOwnerId:actor.id,itemName:'Provaz',workerId:actor.id,repairProofId:level?'proof-123':null};
  commit({hazardDetails:[row]},data,'travel-episode',{minute:480},()=> 'campaign-1',()=>`generated-${++serial}`,()=> '2026-11-08T00:00:00Z');
  check(data.journal.length===1,'one and only one hazard receipt');
  const proof=data.journal[0].calendarEpisodeEquipmentHazard;
  check(proof.result===outcome&&proof.repairWork===null,'untimed receipt '+outcome);
  check(proof.repairProofId===(level?'proof-123':null),'original skill ID preserved');
  if(outcome==='abandoned'){check(data.inventory.length===0,'GM abandon removes original item');continue}
  check(data.inventory.length===1&&data.inventory[0].id==='item-1','same item ID preserved');
  const unusable=S.equipmentUnusable(data.inventory[0]);
  check(unusable===(outcome==='long-delay'||outcome==='irreparable'||outcome==='ignored'),outcome+' item serviceability');
  if(outcome==='long-delay'||outcome==='irreparable'){
   const r=data.inventory[0].hmkEquipmentRepair;
   check(!Object.hasOwn(r,'remainingMinutes')&&!Object.hasOwn(r,'totalMinutes'),'no artificial work time');
   if(outcome==='long-delay'){
    const restored=E.applyInventoryItemEdit(data,{ownerId:actor.id,itemId:item.id,slot:'carried',quantity:1,currentWQ:null,gmEquipmentState:'usable',condition:item.condition});
    check(S.equipmentUsable(restored.inventory[0])&&!Object.hasOwn(restored.inventory[0].hmkEquipmentRepair,'remainingMinutes'),'GM restores no-minute state');
   }
  }
 }
 check(!src.includes('data-hmk-item-repair-legacy]')&&!src.includes('data-hmk-item-repair]')&&!src.includes('hmk-item-repair-progress-form'),'dead timer user flows removed');
 check(src.includes("APP_VERSION='93.779'"),'release version');
 const bundle=fs.readFileSync(path.join(root,'hmk-app.bundle.js'),'utf8');
 check(bundle.includes("APP_VERSION = '93.779'"),'bundle sync');
 console.log('PASS v93.779 HMK p148 all 6 Equipment Hazard outcomes, original commit branch, receipts, item IDs, skill provenance, no work timer, GM restore: '+checks+' assertions');
})().catch(e=>{console.error(e);process.exitCode=1});
