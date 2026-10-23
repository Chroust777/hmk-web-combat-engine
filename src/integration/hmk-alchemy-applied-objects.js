/** HMK v1.2 pp.269,273. Applied (non-imbibed) Mending and Object Aegis.
 * Physical vial emptying is committed IN THE SAME journal entry as application.
 * Objects remain the same inventory identities; catalog snapshots are immutable.
 * Object Aegis is an instantaneous application with an AS reserve on the object;
 * only a witnessed actual Attunement/Psychometry attempt can consume its AS.
 */
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';
export const MENDING_FORMAT='hmk-alchemy-mending-applied-v1';
export const AEGIS_FORMAT='hmk-alchemy-object-aegis-applied-v1';
export const AEGIS_TEST_FORMAT='hmk-alchemy-object-aegis-test-v1';
const check=(v,msg)=>{if(!v)throw Error('Alchemy Applied: '+msg)};
const minuteOK=v=>Number.isSafeInteger(v)&&v>=0&&v<=1e9;
const valWeight=v=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=100000;
const values=v=>v&&typeof v==='object'&&!Array.isArray(v);
const levels=['CF','F','S','CS'];
const originOK=x=>x==='manual'||x==='cryptographic-software-die';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const itemWeight=item=>{
 const lb=Number(item?.snapshot?.properties?.weightLb);
 return valWeight(lb)&&Number.isSafeInteger(item?.quantity)&&item.quantity===1?lb:null;
};
const itemById=(inventory,id)=>inventory.find(x=>x.id===id&&x.quantity===1&&x.snapshot&&x.slot!=='chest');
function doseFor({journal,inventory,campaignId,minute,actorId,finishId,name}){
 check(typeof campaignId==='string'&&campaignId&&minuteOK(minute)&&typeof actorId==='string'&&actorId,'missing campaign/time/actor');
 const dose=alchemyElixirStrength(journal,campaignId,finishId,minute);
 check(dose.elixirName===name&&dose.currentAS>0&&!dose.dispersed&&!dose.imbibingId,'need finished effective '+name);
 check(minute>=dose.completedMinute&&(!dose.nextDueMinute||minute<dose.nextDueMinute),'unresolved elixir Decay Roll');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 check(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot),'original full physical vial is required');
 const iv=inventory.find(x=>x.id===vial.vialId&&x.characterId===actorId&&x.quantity===1&&x.slot===vial.slot);
 check(iv,'physical vial missing from inventory');
 return {dose,vial};
}
function activeAcidOnItem(journal,campaignId,itemId,minute){
 for(const row of journal){
  if(row.calendarCampaignId!==campaignId||row.campaignMinute>minute)continue;
  for(const [applyKey,roundKey] of [
   ['calendarAlchemyAcidWeaponApply','calendarAlchemyAcidWeaponRound'],
   ['calendarAlchemyAcidArmourApply','calendarAlchemyAcidArmourRound'],
   ['calendarAlchemyAcidApply','calendarAlchemyAcidRound']]){
   const a=row[applyKey];if(!a||a.targetItemId!==itemId)continue;
   let as=a.asAtApplication,done=false;
   const max=a.maximumAV??a.destroyAtSuccesses??a.initialWQ;
   let progress=a.initialDamage??0;
   let q=a.initialWQ??0;
   let s=0;
   for(const rrow of journal.slice(journal.indexOf(row)+1)){
    const r=rrow[roundKey];if(!r||r.applicationId!==row.id||rrow.calendarCampaignId!==campaignId||rrow.campaignMinute>minute)continue;
    as=r.asAfter;
    if(roundKey==='calendarAlchemyAcidWeaponRound')q=r.wqAfter;
    if(roundKey==='calendarAlchemyAcidArmourRound')progress=r.damageAfter;
    if(roundKey==='calendarAlchemyAcidRound')s=r.successesAfter;
   }
   done=as<=0||(roundKey==='calendarAlchemyAcidWeaponRound'&&q<=0)||
    (roundKey==='calendarAlchemyAcidArmourRound'&&progress>=max)||
    (roundKey==='calendarAlchemyAcidRound'&&s>=max);
   if(!done)return true;
  }
 }
 return false;
}
/** Read-only real six-inch object Acid contact. The original immutable Acid
 * receipts are never edited by Mending; a later Mending begins a new baseline.
 */
export function alchemyAcidObjectDamage(journal=[],campaignId,itemId,minute=1e9){
 let damage=0;const applicationIds=new Set();
 for(const r of journal){
  if(r.calendarCampaignId!==campaignId||r.campaignMinute>minute)continue;
  if(r.calendarAlchemyMending?.targetItemIds?.includes(itemId)){damage=0;applicationIds.clear();}
  if(r.calendarAlchemyAcidApply?.targetItemId===itemId)applicationIds.add(r.id);
  const t=r.calendarAlchemyAcidRound;
  if(t?.targetItemId===itemId&&applicationIds.has(t.applicationId)&&t.success)damage++;
 }
 return damage;
}
const plainCondition=c=>typeof c==='string'&&c.trim().length>0;
function repairLine(item,acidObjectDamage=0){
 const category=item.snapshot.category;
 const currentWQ=Number.isSafeInteger(item.currentWQ)?item.currentWQ:null;
 const catalogWQ=item.snapshot.properties?.quality;
 const validQuality=Number.isSafeInteger(catalogWQ)&&catalogWQ>=0;
 const armourDamage=item.acidAVDamageByLocation??{};
 check(values(armourDamage)&&Object.values(armourDamage).every(x=>Number.isSafeInteger(x)&&x>=0),'invalid armour damage');
 const armourDamaged=Object.values(armourDamage).some(x=>x>0);
 const weaponDamaged=category==='weapon'&&validQuality&&currentWQ!==null&&currentWQ<catalogWQ;
 const notedDamage=plainCondition(item.condition);
 check(weaponDamaged||armourDamaged||notedDamage,'object is not demonstrably damaged/broken');
 if(category==='weapon'&&currentWQ!==null)check(validQuality&&currentWQ<=catalogWQ,'unverified catalog WQ baseline');
 return {itemId:item.id,ownerId:item.characterId,itemName:item.snapshot.name,category,weightLb:itemWeight(item),
  conditionBefore:item.condition??'',conditionAfter:'',
  ...(acidObjectDamage>0?{acidObjectDamageBefore:acidObjectDamage,acidObjectDamageAfter:0}:{}),
  ...(category==='weapon'&&currentWQ!==null?{wqBefore:currentWQ,wqAfter:catalogWQ}:{}),
  ...(armourDamaged?{armourDamageBefore:structuredClone(armourDamage),armourDamageAfter:{}}:{})};
}
/** One poured Mending repairs many *distinct* whole objects (not 1 item per dose).
 * There is no proportional saving of the vial: HMK p269 prohibits partial use.
 */
export function createAlchemyMending({journal=[],inventory=[],campaignId,minute,actorId,finishId,targetItemIds=[],
 accessConfirmed=false,gmConfirmed=false}={}){
 check(accessConfirmed===true&&gmConfirmed===true,'GM must confirm access and entire pouring within one round');
 const {dose,vial}=doseFor({journal,inventory,campaignId,minute,actorId,finishId,name:'Mending'});
 check(Array.isArray(targetItemIds)&&targetItemIds.length>0&&targetItemIds.length<=80&&new Set(targetItemIds).size===targetItemIds.length,
  'choose actual distinct damaged objects');
 const targets=targetItemIds.map(id=>{
  const item=itemById(inventory,id);
  check(item&&item.id!==vial.vialId&&typeof item.snapshot.name==='string'&&item.snapshot.name.trim(),
   'target missing/unavailable/stacked or the vial itself');
  check(itemWeight(item)!==null,'target must have attested positive weight in lb');
  check(!activeAcidOnItem(journal,campaignId,id,minute),'active Acid must finish before the repair');
  return repairLine(item,alchemyAcidObjectDamage(journal,campaignId,item.id,minute));
 });
 const weightLb=Math.round(targets.reduce((v,r)=>v+r.weightLb,0)*1e6)/1e6;
 check(weightLb<=dose.currentAS*2+1e-9,'combined object mass exceeds AS×2 lb');
 return {format:MENDING_FORMAT,campaignId,minute,actorId,finishId,vialId:vial.vialId,bindingId:vial.bindingId,
  asAtApplication:dose.currentAS,maximumWeightLb:dose.currentAS*2,totalWeightLb:weightLb,
  targetItemIds:[...targetItemIds],targets,noImbibingRoll:true,profusionExempt:true,
  accessConfirmed:true,gmConfirmed:true,sourcePages:[269,273]};
}
/** Apply effects to SAME inventory identities; caller wraps with vial-empty in mutate(). */
export function applyAlchemyMending(inventory=[],proof){
 for(const t of proof.targets){
  const item=inventory.find(x=>x.id===t.itemId);
  check(item&&item.characterId===t.ownerId&&item.quantity===1&&
   itemWeight(item)===t.weightLb&&item.snapshot.name===t.itemName&&
   item.snapshot.category===t.category&&
   (item.condition??'')===t.conditionBefore,'inventory object was changed before Mending commit');
  if(Object.hasOwn(t,'wqBefore'))check(item.currentWQ===t.wqBefore,'weapon WQ drift');
  if(Object.hasOwn(t,'armourDamageBefore'))check(same(item.acidAVDamageByLocation,t.armourDamageBefore),'armour AV drift');
 }
 for(const t of proof.targets){
  const item=inventory.find(x=>x.id===t.itemId);
  item.condition=t.conditionAfter;
  if(Object.hasOwn(t,'wqAfter'))item.currentWQ=t.wqAfter;
  if(Object.hasOwn(t,'armourDamageAfter'))item.acidAVDamageByLocation=structuredClone(t.armourDamageAfter);
 }
 return inventory;
}
export function createAlchemyObjectAegis({journal=[],inventory=[],campaignId,minute,actorId,finishId,
 targetItemId,accessConfirmed=false,gmConfirmed=false}={}){
 check(accessConfirmed===true&&gmConfirmed===true,'GM must confirm entire application within one round');
 const {dose,vial}=doseFor({journal,inventory,campaignId,minute,actorId,finishId,name:'Object Aegis'});
 const item=itemById(inventory,targetItemId);
 check(item&&item.id!==vial.vialId&&itemWeight(item)!==null,'one physical weighted object is required');
 check(itemWeight(item)<=dose.currentAS*5+1e-9,'object exceeds AS×5 lb');
 for(const row of journal){
  const a=row.calendarAlchemyObjectAegis;
  if(a?.targetItemId===targetItemId&&row.calendarCampaignId===campaignId&&row.campaignMinute<=minute){
   check(alchemyObjectAegisState(journal,campaignId,row.id,minute).remainingAS===0,
    'an existing Object Aegis is still active on this object');
  }
 }
 return {format:AEGIS_FORMAT,campaignId,minute,actorId,finishId,vialId:vial.vialId,bindingId:vial.bindingId,
  targetItemId:item.id,targetOwnerId:item.characterId,targetName:item.snapshot.name,weightLb:itemWeight(item),
  asAtApplication:dose.currentAS,maximumWeightLb:dose.currentAS*5,
  noImbibingRoll:true,profusionExempt:true,accessConfirmed:true,gmConfirmed:true,sourcePages:[269,273]};
}
export function alchemyObjectAegisState(journal=[],campaignId,applicationId,minute=1e9){
 check(minuteOK(minute),'invalid time');
 const index=journal.findIndex(r=>r.id===applicationId&&r.calendarCampaignId===campaignId&&r.campaignMinute<=minute&&r.calendarAlchemyObjectAegis);
 check(index>=0,'original Object Aegis application missing');
 const a=journal[index].calendarAlchemyObjectAegis;
 let as=a.asAtApplication,rolls=0;
 for(const row of journal.slice(index+1)){
  const t=row.calendarAlchemyObjectAegisTest;
  if(!t||t.applicationId!==applicationId||row.calendarCampaignId!==campaignId||row.campaignMinute>minute)continue;
  check(as>0&&t.asBefore===as&&t.rollNumber===rolls+1,'invalid Aegis sequence');
  const success=t.d10<=as;
  check(t.success===success&&t.asAfter===as-(success?1:0),'invalid Aegis d10/AS');
  as=t.asAfter;rolls++;
 }
 return {applicationId,campaignId,targetItemId:a.targetItemId,actorId:a.actorId,remainingAS:as,initialAS:a.asAtApplication,
  rolls,active:as>0};
}
/** Only a REAL existing skill test can be protected: reference its original immutable receipt.
 * The original test remains untouched; the effective final level is a separate proof.
 */
export function createAlchemyObjectAegisTest({journal=[],inventory=[],campaignId,minute,applicationId,
 sourceTestId,kind,d10,origin,targetConfirmed=false,gmConfirmed=false}={}){
 check(targetConfirmed===true&&gmConfirmed===true,'GM must confirm that actual test targets this exact object');
 check(['Attunement','Psychometry'].includes(kind)&&Number.isSafeInteger(d10)&&d10>=1&&d10<=10&&originOK(origin)&&minuteOK(minute),
  'actual Attunement/Psychometry test and d10 are required');
 const state=alchemyObjectAegisState(journal,campaignId,applicationId,minute);
 check(state.active,'Object Aegis expired');
 const target=inventory.find(x=>x.id===state.targetItemId&&x.quantity===1);
 check(target,'original protected item no longer present');
 const s=journal.find(x=>x.id===sourceTestId&&x.calendarCampaignId===campaignId&&x.campaignMinute<=minute&&x.skillTestProof);
 check(s,'a real prior saved skill test receipt is required');
 check(journal.indexOf(s)>journal.findIndex(r=>r.id===applicationId),'Aegis cannot protect a test recorded before application');
 const p=s.skillTestProof;
 const names=[...(p.skills??[]),p.skill,p.primarySkill,p.name].filter(Boolean);
 check(names.some(x=>String(x).toLowerCase()===kind.toLowerCase()),'wrong skill test source for this protection');
 const originalLevel=p.a?.level??p.result?.level;
 check(levels.includes(originalLevel),'source test needs a canonical SL');
 check(!journal.some(x=>x.calendarAlchemyObjectAegisTest?.sourceTestId===sourceTestId),
  'one Aegis response per original skill test');
 const success=d10<=state.remainingAS;
 const finalLevel=success?levels[Math.max(0,levels.indexOf(originalLevel)-1)]:originalLevel;
 return {format:AEGIS_TEST_FORMAT,campaignId,minute,applicationId,sourceTestId,
  targetItemId:state.targetItemId,kind,originalLevel,finalLevel,d10,origin,rollNumber:state.rolls+1,
  asBefore:state.remainingAS,asAfter:state.remainingAS-(success?1:0),success,
  targetConfirmed:true,gmConfirmed:true,sourcePage:273};
}
export function validateAlchemyAppliedObjectJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const m=row.calendarAlchemyMending,a=row.calendarAlchemyObjectAegis,t=row.calendarAlchemyObjectAegisTest;
  if(m||a){
   const p=m??a;
   check(row.campaignMinute===p.minute&&row.characterId===p.actorId&&row.calendarCampaignId===p.campaignId,'application context altered');
   check(row.calendarAlchemyVialEmpty?.finishId===p.finishId&&row.calendarAlchemyVialEmpty?.vialId===p.vialId&&
    row.calendarAlchemyVialEmpty?.actorId===p.actorId&&!row.calendarAlchemyVialEmpty?.vialShattered,
    'application requires original vial emptied atomically, not shattered');
   const fakeVial={id:p.vialId,characterId:p.actorId,quantity:1,slot:'carried',snapshot:{name:'Vial'}};
   let expected;
   if(m){
    const inv=p.targets.map(x=>({id:x.itemId,characterId:x.ownerId,quantity:1,slot:'carried',condition:x.conditionBefore,
     currentWQ:x.wqBefore,acidAVDamageByLocation:x.armourDamageBefore,
     snapshot:{name:x.itemName,category:x.category,properties:{weightLb:x.weightLb,quality:x.wqAfter}}}));
    expected=createAlchemyMending({journal:prior,inventory:[fakeVial,...inv],campaignId:p.campaignId,minute:p.minute,
     actorId:p.actorId,finishId:p.finishId,targetItemIds:p.targetItemIds,accessConfirmed:p.accessConfirmed,gmConfirmed:p.gmConfirmed});
   }else{
    const inv={id:p.targetItemId,characterId:p.targetOwnerId,quantity:1,slot:'carried',
     snapshot:{name:p.targetName,properties:{weightLb:p.weightLb}}};
    expected=createAlchemyObjectAegis({journal:prior,inventory:[fakeVial,inv],campaignId:p.campaignId,minute:p.minute,
     actorId:p.actorId,finishId:p.finishId,targetItemId:p.targetItemId,accessConfirmed:p.accessConfirmed,gmConfirmed:p.gmConfirmed});
   }
   check(same(expected,p),'applied elixir proof modified');
  }
  if(t){
   check(row.calendarCampaignId===t.campaignId&&row.campaignMinute===t.minute,'Aegis test context altered');
   const state=alchemyObjectAegisState(prior,t.campaignId,t.applicationId,t.minute);
   const inv=[{id:state.targetItemId,quantity:1}];
   const rec=createAlchemyObjectAegisTest({journal:prior,inventory:inv,campaignId:t.campaignId,minute:t.minute,
    applicationId:t.applicationId,sourceTestId:t.sourceTestId,kind:t.kind,d10:t.d10,origin:t.origin,
    targetConfirmed:t.targetConfirmed,gmConfirmed:t.gmConfirmed});
   check(same(rec,t),'Aegis response proof modified');
  }
  prior.push(row);
 }
 return true;
}
export function assertAlchemyAppliedObjectAppendOnly(before=[],after=[]){
 const rows=new Map(after.map(r=>[r.id,r]));
 for(const r of before)if(r.calendarAlchemyMending||r.calendarAlchemyObjectAegis||r.calendarAlchemyObjectAegisTest)
  check(same(rows.get(r.id),r),'immutable Mending/Object Aegis receipt edited or removed');
 return true;
}
export function validateAlchemyMendingInventory(database){
 for(const row of database.journal){
  const m=row.calendarAlchemyMending;
  if(!m)continue;
  for(const t of m.targets){
   const item=database.inventory.find(x=>x.id===t.itemId);
   if(!item)continue; // later legal transfer/disposal handled by original inventory provenance
   // Last historical change to WQ/AV may be another Acid after Mending.
   const newer=database.journal.slice(database.journal.indexOf(row)+1).some(x=>
    x.calendarAlchemyAcidWeaponRound?.targetItemId===t.itemId||
    x.calendarAlchemyAcidArmourRound?.targetItemId===t.itemId||
    x.calendarAlchemyMending?.targetItemIds?.includes(t.itemId));
   if(newer)continue;
   if(Object.hasOwn(t,'wqAfter'))check(item.currentWQ===t.wqAfter,'repaired WQ was modified without proof');
   if(Object.hasOwn(t,'armourDamageAfter'))check(same(item.acidAVDamageByLocation,t.armourDamageAfter),'repaired AV was modified without proof');
  }
 }
 return true;
}
