/** HMK v1.2 p.271, Acid on a real weapon: 1 WQ damage on each successful
 * contact-round d10 vs AS; every round reduces AS by one. Non-combat direct
 * application only. No invented area hit, attack, armour AV or living wound.
 * WQ is written into the EXISTING inventory item as the round is committed.
 */
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';
export const ACID_WEAPON_APPLY='hmk-alchemy-acid-weapon-application-v1';
export const ACID_WEAPON_ROUND='hmk-alchemy-acid-weapon-round-v1';
const check=(ok,msg)=>{if(!ok)throw Error('Alchemy Acid WQ: '+msg)};
const time=m=>Number.isSafeInteger(m)&&m>=0&&m<=1e9;
const validWQ=q=>Number.isSafeInteger(q)&&q>=0&&q<=999;
const originOK=o=>o==='manual'||o==='cryptographic-software-die';
export function acidWeaponInitialWQ(item){
 if(!item||item.snapshot?.category!=='weapon'||item.quantity!==1)return null;
 if(validWQ(item.currentWQ))return item.currentWQ;
 const q=item.snapshot?.properties?.quality;
 return validWQ(q)?q:null;
}
export function createAcidWeaponApplication({journal=[],inventory=[],campaignId,minute,actorId,finishId,
 targetItemId,weaponConfirmed=false,contactConfirmed=false,gmConfirmed=false}={}){
 check(weaponConfirmed&&contactConfirmed&&gmConfirmed,'GM musí doložit skutečnou zbraň a přímé nanesení Acid');
 check(typeof campaignId==='string'&&campaignId&&time(minute)&&typeof actorId==='string'&&actorId,'chybí kampaň, postava nebo čas');
 const dose=alchemyElixirStrength(journal,campaignId,finishId,minute);
 check(dose.elixirName==='Acid'&&dose.currentAS>0&&!dose.dispersed&&!dose.imbibingId,'chybí dostupný účinný Acid');
 check(minute>=dose.completedMinute&&(!dose.nextDueMinute||dose.nextDueMinute>minute),'splatný Decay Roll musí být doložen');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 check(vial?.full&&vial.ownerId===actorId&&['carried','none'].includes(vial.slot),'nutná skutečná fyzická lahvička vlastníka');
 const target=inventory.find(x=>x.id===targetItemId);
 check(target&&target.id!==vial.vialId&&target.slot!=='chest'&&target.snapshot?.category==='weapon'&&target.quantity===1,
  'nutná jediná dostupná skutečná zbraň mimo truhlici');
 const q=acidWeaponInitialWQ(target);
 check(q!==null&&q>0,'zbraň vyžaduje doložené kladné WQ');
 return {format:ACID_WEAPON_APPLY,campaignId,minute,actorId,finishId,vialId:vial.vialId,
  bindingId:vial.bindingId,targetItemId,targetOwnerId:target.characterId,targetName:target.snapshot.name,
  initialWQ:q,asAtApplication:dose.currentAS,noImbibingRoll:true,profusionExempt:true,
  weaponConfirmed:true,contactConfirmed:true,gmConfirmed:true,sourcePages:[269,270,271]};
}
export function acidWeaponState(journal=[],campaignId,applicationId,minute=1e9){
 check(time(minute),'neplatný čas');
 const i=journal.findIndex(r=>r.id===applicationId&&r.calendarCampaignId===campaignId&&r.calendarAlchemyAcidWeaponApply&&r.campaignMinute<=minute);
 check(i>=0,'chybí původní aplikace Acid na zbraň');
 const a=journal[i].calendarAlchemyAcidWeaponApply;
 let as=a.asAtApplication,wq=a.initialWQ,rounds=0;
 for(const row of journal.slice(i+1)){
  const r=row.calendarAlchemyAcidWeaponRound;
  if(!r||r.applicationId!==applicationId||row.calendarCampaignId!==campaignId||row.campaignMinute>minute)continue;
  check(as>0&&wq>0,'další kolo po skončení působení Acid');
  check(r.round===rounds+1&&r.asBefore===as&&r.wqBefore===wq,'změněné pořadí nebo základ WQ/AS');
  const success=r.d10<=as;
  check(r.success===success&&r.damage===(success?1:0)&&r.asAfter===as-1&&r.wqAfter===wq-(success?1:0),'neplatný průběh Acid na WQ');
  check(r.targetItemId===a.targetItemId&&r.minute===row.campaignMinute&&r.minute>=a.minute,'změněná zbraň nebo čas');
  as--;wq-=success?1:0;rounds++;
 }
 return {applicationId,campaignId,actorId:a.actorId,targetItemId:a.targetItemId,targetName:a.targetName,
  as,wq,rounds,initialWQ:a.initialWQ,asAtApplication:a.asAtApplication,spent:as<=0||wq<=0};
}
export function createAcidWeaponRound({journal=[],inventory=[],campaignId,minute,applicationId,d10,origin,
 continuousContactConfirmed=false,gmConfirmed=false}={}){
 check(time(minute)&&Number.isSafeInteger(d10)&&d10>=1&&d10<=10&&originOK(origin),'neplatný čas či doložený d10');
 check(continuousContactConfirmed&&gmConfirmed,'GM musí potvrdit další kolo kontaktu');
 const prev=acidWeaponState(journal,campaignId,applicationId,minute);
 check(!prev.spent,'AS 0 nebo WQ 0: Acid již nepůsobí');
 const item=inventory.find(x=>x.id===prev.targetItemId);
 check(item?.snapshot?.category==='weapon'&&item.quantity===1&&item.slot!=='chest'&&item.currentWQ===prev.wq,
  'zbraň musí stále existovat a skutečné WQ musí odpovídat poslednímu důkazu');
 const success=d10<=prev.as;
 return {format:ACID_WEAPON_ROUND,campaignId,minute,applicationId,targetItemId:prev.targetItemId,
  round:prev.rounds+1,d10,origin,asBefore:prev.as,asAfter:prev.as-1,
  wqBefore:prev.wq,wqAfter:prev.wq-(success?1:0),success,damage:success?1:0,
  continuousContactConfirmed:true,gmConfirmed:true,sourcePage:271};
}
export function validateAcidWeaponJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const a=row.calendarAlchemyAcidWeaponApply,r=row.calendarAlchemyAcidWeaponRound;
  if(a){
   check(row.characterId===a.actorId&&row.calendarCampaignId===a.campaignId&&row.campaignMinute===a.minute,'poškozený kontext aplikace');
   check(row.calendarAlchemyVialEmpty?.finishId===a.finishId&&row.calendarAlchemyVialEmpty?.vialId===a.vialId,'chybí atomické vyprázdnění lahvičky');
   const inventory=[{id:a.targetItemId,characterId:a.targetOwnerId,quantity:1,slot:'carried',currentWQ:a.initialWQ,
    snapshot:{name:a.targetName,category:'weapon',properties:{quality:a.initialWQ}}}];
   const rebuilt=createAcidWeaponApplication({journal:prior,inventory,campaignId:a.campaignId,minute:a.minute,
    actorId:a.actorId,finishId:a.finishId,targetItemId:a.targetItemId,weaponConfirmed:a.weaponConfirmed,
    contactConfirmed:a.contactConfirmed,gmConfirmed:a.gmConfirmed});
   check(JSON.stringify(rebuilt)===JSON.stringify(a),'poškozený důkaz aplikace');
  }
  if(r){
   const prev=acidWeaponState(prior,r.campaignId,r.applicationId,r.minute);
   check(row.characterId===prev.actorId&&row.calendarCampaignId===r.campaignId&&row.campaignMinute===r.minute,'neplatný kontext kontaktního kola');
   const inventory=[{id:r.targetItemId,quantity:1,slot:'carried',currentWQ:prev.wq,snapshot:{category:'weapon'}}];
   const rebuilt=createAcidWeaponRound({journal:prior,inventory,campaignId:r.campaignId,minute:r.minute,
    applicationId:r.applicationId,d10:r.d10,origin:r.origin,
    continuousContactConfirmed:r.continuousContactConfirmed,gmConfirmed:r.gmConfirmed});
   check(JSON.stringify(rebuilt)===JSON.stringify(r),'poškozený důkaz WQ kola');
  }
  prior.push(row);
 }
 return true;
}
export function validateAcidWeaponInventory(database){
 const targets=new Map();
 for(const row of database.journal){
  if(row.calendarAlchemyAcidWeaponApply)targets.set(row.calendarAlchemyAcidWeaponApply.targetItemId,row.calendarAlchemyAcidWeaponApply.initialWQ);
  if(row.calendarAlchemyAcidWeaponRound)targets.set(row.calendarAlchemyAcidWeaponRound.targetItemId,row.calendarAlchemyAcidWeaponRound.wqAfter);
 }
 for(const [id,wq] of targets){const item=database.inventory.find(x=>x.id===id);
  if(item)check(item.snapshot?.category==='weapon'&&item.currentWQ===wq,'inventární WQ nesouhlasí s doloženým Acid (předmět '+id+')');
 }
 return true;
}
export function assertAcidWeaponAppendOnly(before=[],after=[]){
 const rows=new Map(after.map(x=>[x.id,x]));
 for(const x of before)if(x.calendarAlchemyAcidWeaponApply||x.calendarAlchemyAcidWeaponRound)
  check(JSON.stringify(rows.get(x.id))===JSON.stringify(x),'neměnný důkaz nelze změnit nebo odstranit');
 return true;
}
