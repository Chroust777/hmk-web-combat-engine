const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const {execFileSync}=require('node:child_process');
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hmk-place-'));
 const src=fs.readFileSync(path.join(__dirname,'../src/integration/hmk-trek-positions-93764.js'),'utf8');
 const target=path.join(tmp,'positions.mjs');fs.writeFileSync(target,src);
 const {confirmTravelPosition93764:confirm,validateTravelPositions93764:validate,
  travelPositionAt93764:at,travelPositionSubjects93764:subjects}=await import('file://'+target);
 let checks=0;const eq=(a,b)=>{checks++;assert.deepEqual(a,b)};
 const rejects=(f,why)=>{checks++;assert.throws(f,why)};
 const cid='campaign-alpha';const journal=[];
 const add=({from,to,minute,duration,members,animals=[],stable=[],vehicleKey=null,campaignId=cid})=>{
  const proof=confirm({journal,campaignId,minute,fromLocation:from,toLocation:to,memberIds:members,
   animalIds:animals,stableAnimalIds:stable,vehicleKey,gmConfirmed:true});
  const ep={kind:'travel',startMinute:minute,endMinute:minute+duration,memberIds:members,
   settings:{animalIds:animals,stableAnimalIds:stable},transportProof:vehicleKey?{vehicle:{vehicleKey}}:undefined,
   travelPositionProof:proof};
  journal.push({id:'ep-'+journal.length,calendarCampaignId:campaignId,campaignMinute:minute,calendarTimeEpisode:ep});
  return proof;
 };
 rejects(()=>confirm({journal,campaignId:cid,minute:0,memberIds:['A'],fromLocation:'Brod',toLocation:'Tábor'}),/GM/);
 rejects(()=>confirm({journal,campaignId:cid,minute:0,memberIds:['A'],fromLocation:' ',toLocation:'Tábor',gmConfirmed:true}),/místo/);
 rejects(()=>confirm({journal,campaignId:cid,minute:0,memberIds:['A','A'],fromLocation:'Brod',toLocation:'Tábor',gmConfirmed:true}),/duplicitní/);
 eq(subjects({memberIds:['B','A'],animalIds:['h'],stableAnimalIds:['h'],vehicleKey:'w'}),['actor:A','actor:B','actor:h','vehicle:w']);
 const first=add({from:'Jižní brod',to:'Severní tábor',minute:100,duration:10,members:['A','B'],stable:['horse-1'],vehicleKey:'horse-1::wagon-1'});
 eq(first.fromLocation,'Jižní brod');eq(at(journal,cid,110).get('actor:A').location,'Severní tábor');
 eq(at(journal,cid,110).get('vehicle:horse-1::wagon-1').location,'Severní tábor');
 eq(at(journal,cid,110).get('actor:horse-1').location,'Severní tábor');
 // Split. B and wagon and horse remain at northern camp while A leaves.
 add({from:'Severní tábor',to:'Východní les',minute:110,duration:12,members:['A']});
 eq(at(journal,cid,122).get('actor:A').location,'Východní les');
 eq(at(journal,cid,122).get('actor:B').location,'Severní tábor');
 eq(at(journal,cid,122).get('vehicle:horse-1::wagon-1').location,'Severní tábor');
 rejects(()=>add({from:'Východní les',to:'Paseka',minute:122,duration:4,members:['B']}),/B.*Severní tábor/);
 rejects(()=>add({from:'Východní les',to:'Paseka',minute:122,duration:4,members:['A'],stable:['horse-1']}),/horse-1/);
 rejects(()=>add({from:'Východní les',to:'Paseka',minute:122,duration:4,members:['A'],vehicleKey:'horse-1::wagon-1'}),/vehicle/);
 rejects(()=>add({from:'Severní tábor',to:'Paseka',minute:122,duration:4,members:['A','B']}),/A.*Východní les/);
 // Another group can travel separately in same campaign.
 add({from:'Most',to:'Trh',minute:122,duration:8,members:['C']});
 eq(at(journal,cid,130).get('actor:C').location,'Trh');
 eq(at(journal,cid,130).get('actor:A').location,'Východní les');
 // GM can return A to camp and legally merge with B only then.
 add({from:'Východní les',to:'Severní tábor',minute:130,duration:10,members:['A']});
 add({from:'Severní tábor',to:'Údolí',minute:140,duration:15,members:['A','B'],stable:['horse-1'],vehicleKey:'horse-1::wagon-1'});
 eq(at(journal,cid,155).get('actor:A').location,'Údolí');
 eq(at(journal,cid,155).get('actor:B').location,'Údolí');
 eq(at(journal,cid,155).get('actor:C').location,'Trh');
 eq(validate(journal),true);
 // Separate campaign does not inherit any physical site.
 add({from:'Jih',to:'Sever',minute:155,duration:1,members:['A'],campaignId:'campaign-beta'});
 eq(at(journal,'campaign-beta',156).get('actor:A').location,'Sever');
 eq(at(journal,cid,156).get('actor:A').location,'Údolí');
 eq(validate(journal),true);
 // Changing historical participants or from location must invalidate replay.
 const cloned=structuredClone(journal);
 cloned[0].calendarTimeEpisode.travelPositionProof.subjects.pop();
 rejects(()=>validate(cloned),/byl změněn/);
 const tamper2=structuredClone(journal);
 tamper2[1].calendarTimeEpisode.travelPositionProof.fromLocation='Trh';
 rejects(()=>validate(tamper2),/Poloha pochodu/);
 const tamper3=structuredClone(journal);
 tamper3[0].calendarTimeEpisode.travelPositionProof.gmConfirmed=false;
 rejects(()=>validate(tamper3),/GM/);
 // Legacy records without location proof do not fabricate one.
 const legacy={id:'old',calendarCampaignId:'legacy',campaignMinute:0,
  calendarTimeEpisode:{kind:'travel',startMinute:0,endMinute:5,memberIds:['A']}};
 eq(validate([legacy]),true);eq(at([legacy],'legacy',5).size,0);
 // Movement can only be committed with a named destination and per-subject proof.
 rejects(()=>confirm({journal,campaignId:cid,minute:155,memberIds:['A'],fromLocation:'Údolí',toLocation:' ',gmConfirmed:true}),/místo/);
 // User-entered spelling normalization cannot create artificial location conflicts.
 eq(confirm({journal,campaignId:cid,minute:155,memberIds:['A'],fromLocation:'  údolí ',toLocation:'Údolí',gmConfirmed:true}).fromLocation,'údolí');
 console.log('PASS '+checks+' explicit-geometry checks (split, merge, parked vehicle, draft guard, legacy, replay)');
})().catch(e=>{console.error(e);process.exit(1)});
