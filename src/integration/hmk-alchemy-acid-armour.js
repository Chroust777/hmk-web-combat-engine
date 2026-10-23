/** HMK 1.2 p.271: directly applied Acid against the AV of an actual verified
 * p118 armour article.  Immutable snapshots remain canonical; accumulated
 * physical acid damage lives on the SAME inventory item as acidAVDamage.
 * Only out-of-combat direct contact is supported; no splash, injury or clock
 * progression is inferred.  Every d10 is witnessed by the GM.
 */
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';
import {resolveOwnedArmourArticle} from './live-combat-armour.js';
export const ACID_ARMOUR_APPLY='hmk-alchemy-acid-armour-application-v1';
export const ACID_ARMOUR_ROUND='hmk-alchemy-acid-armour-round-v1';
const check=(v,msg)=>{if(!v)throw Error('Alchemy Acid AV: '+msg)};
const time=v=>Number.isSafeInteger(v)&&v>=0&&v<=1e9;
const safeDamage=v=>Number.isSafeInteger(v)&&v>=0&&v<=999;
const originOK=v=>v==='manual'||v==='cryptographic-software-die';
/** Damage is tied to the specific covered body location of the garment.
 * No blanket AV reduction of unrelated locations may be inferred from HMK 271.
 */
export const acidArmourDamage=(item,location)=>{
 const map=item?.acidAVDamageByLocation;
 if(map===undefined)return 0;
 if(!map||typeof map!=='object'||Array.isArray(map)||Object.values(map).some(x=>!safeDamage(x)))return null;
 return location===undefined?null:(map[location]===undefined?0:map[location]);
};
export function acidArmourMaximumAV(item,location){
 const verified=resolveOwnedArmourArticle(item,{allowCarried:item?.slot==='carried'});
 if(!verified.ready)return null;
 const pp=item.snapshot.properties.locationProtection;
 const vals=['b','e','p','f'].map(k=>pp[location]?.[k]);
 return vals.length&&vals.every(v=>Number.isSafeInteger(v)&&v>=0)?Math.max(...vals):null;
}
function availableArticle(inventory,id,location){
 const item=inventory.find(x=>x.id===id);
 check(item&&item.quantity===1&&['worn','carried'].includes(item.slot)&&item.snapshot?.category==='armor','nutný skutečný nesený nebo oblečený jediný článek zbroje p118');
 const verified=resolveOwnedArmourArticle(item,{allowCarried:item.slot==='carried'});
 check(verified.ready,'neověřený originální článek zbroje: '+verified.reason);
 check(typeof location==='string'&&verified.article.coveredLocations.includes(location),'GM musí určit skutečnou pokrytou tělesnou lokaci');
 const cap=acidArmourMaximumAV(item,location),damage=acidArmourDamage(item,location);
 check(cap!==null&&cap>0&&damage!==null&&damage<cap,'chybí kladná zbývající AV článku zbroje');
 return {item,article:verified.article,cap,damage};
}
export function createAcidArmourApplication({journal=[],inventory=[],campaignId,minute,actorId,finishId,targetItemId,targetLocation,
 armourConfirmed=false,contactConfirmed=false,gmConfirmed=false}={}){
 check(armourConfirmed&&contactConfirmed&&gmConfirmed,'GM musí potvrdit ověřený článek zbroje a přímé nanesení');
 check(typeof campaignId==='string'&&campaignId&&time(minute)&&typeof actorId==='string'&&actorId,'chybí kampaň/čas/postava');
 const dose=alchemyElixirStrength(journal,campaignId,finishId,minute);
 check(dose.elixirName==='Acid'&&dose.currentAS>0&&!dose.dispersed&&!dose.imbibingId,'chybí účinný Acid');
 check(minute>=dose.completedMinute&&(!dose.nextDueMinute||dose.nextDueMinute>minute),'splatný Decay Roll');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 check(vial?.full&&vial.ownerId===actorId&&['carried','none'].includes(vial.slot),'chybí původní plná lahvička');
 const {item,article,cap,damage}=availableArticle(inventory,targetItemId,targetLocation);
 check(item.id!==vial.vialId,'lahvička není článkem zbroje');
 for(const row of journal){const prev=row.calendarAlchemyAcidArmourApply;
  if(prev?.targetItemId===targetItemId&&prev.targetLocation===targetLocation&&row.calendarCampaignId===campaignId){
   const state=acidArmourState(journal,campaignId,row.id,minute);
   check(state.spent,'na stejném článku ještě působí předchozí Acid');
  }
 }
 return {format:ACID_ARMOUR_APPLY,campaignId,minute,actorId,finishId,vialId:vial.vialId,bindingId:vial.bindingId,
  targetItemId:item.id,targetLocation,targetOwnerId:item.characterId,targetName:item.snapshot.name,
  targetSourceItemId:item.sourceItemId,targetSlot:item.slot,targetSnapshot:structuredClone(item.snapshot),
  sourceArticleId:article.id,initialDamage:damage,maximumAV:cap,asAtApplication:dose.currentAS,
  noImbibingRoll:true,profusionExempt:true,armourConfirmed:true,contactConfirmed:true,gmConfirmed:true,sourcePages:[269,270,271]};
}
export function acidArmourState(journal=[],campaignId,applicationId,minute=1e9){
 check(time(minute),'neplatný čas');
 const i=journal.findIndex(r=>r.id===applicationId&&r.calendarCampaignId===campaignId&&r.calendarAlchemyAcidArmourApply&&r.campaignMinute<=minute);
 check(i>=0,'chybí původní aplikace na zbroj');
 const a=journal[i].calendarAlchemyAcidArmourApply;
 let as=a.asAtApplication,damage=a.initialDamage,rounds=0;
 for(const row of journal.slice(i+1)){
  const r=row.calendarAlchemyAcidArmourRound;
  if(!r||r.applicationId!==applicationId||row.calendarCampaignId!==campaignId||row.campaignMinute>minute)continue;
  check(as>0&&damage<a.maximumAV,'kolo po skončení Acid');
  check(r.round===rounds+1&&r.asBefore===as&&r.damageBefore===damage,'změněné pořadí nebo AS/AV');
  const success=r.d10<=as,after=damage+(success?1:0);
  check(r.success===success&&r.damageInflicted===(success?1:0)&&r.asAfter===as-1&&r.damageAfter===after,'neplatné d10/AV');
  check(r.targetItemId===a.targetItemId&&r.targetLocation===a.targetLocation&&r.minute===row.campaignMinute&&r.minute>=a.minute,'změněný předmět nebo čas');
  as--;damage=after;rounds++;
 }
 return {campaignId,applicationId,actorId:a.actorId,targetItemId:a.targetItemId,targetName:a.targetName,
  targetLocation:a.targetLocation,as,rounds,damage,initialDamage:a.initialDamage,maximumAV:a.maximumAV,asAtApplication:a.asAtApplication,
  spent:as<=0||damage>=a.maximumAV};
}
export function createAcidArmourRound({journal=[],inventory=[],campaignId,minute,applicationId,d10,origin,
 continuousContactConfirmed=false,gmConfirmed=false}={}){
 check(time(minute)&&Number.isSafeInteger(d10)&&d10>=1&&d10<=10&&originOK(origin),'neplatný čas nebo doložený d10');
 check(continuousContactConfirmed&&gmConfirmed,'GM musí potvrdit další kontaktní kolo');
 const prev=acidArmourState(journal,campaignId,applicationId,minute);
 check(!prev.spent,'AS 0 nebo žádná zbývající AV: Acid již nepůsobí');
 const {damage}=availableArticle(inventory,prev.targetItemId,prev.targetLocation);
 check(damage===prev.damage,'skutečné inventární AV poškození se liší od posledního důkazu');
 const success=d10<=prev.as;
 return {format:ACID_ARMOUR_ROUND,campaignId,minute,applicationId,targetItemId:prev.targetItemId,targetLocation:prev.targetLocation,
  round:prev.rounds+1,d10,origin,success,damageInflicted:success?1:0,
  asBefore:prev.as,asAfter:prev.as-1,damageBefore:prev.damage,damageAfter:prev.damage+(success?1:0),
  continuousContactConfirmed:true,gmConfirmed:true,sourcePage:271};
}
export function validateAcidArmourJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const a=row.calendarAlchemyAcidArmourApply,r=row.calendarAlchemyAcidArmourRound;
  if(a){
   check(row.characterId===a.actorId&&row.calendarCampaignId===a.campaignId&&row.campaignMinute===a.minute,'kontext aplikace');
   check(row.calendarAlchemyVialEmpty?.finishId===a.finishId&&row.calendarAlchemyVialEmpty?.vialId===a.vialId,'chybí společné vyprázdnění lahvičky');
   const inventory=[{id:a.targetItemId,characterId:a.targetOwnerId,quantity:1,slot:a.targetSlot,sourceItemId:a.targetSourceItemId,
    snapshot:a.targetSnapshot,acidAVDamageByLocation:{[a.targetLocation]:a.initialDamage}}];
   const rebuilt=createAcidArmourApplication({journal:prior,inventory,campaignId:a.campaignId,minute:a.minute,
    actorId:a.actorId,finishId:a.finishId,targetItemId:a.targetItemId,targetLocation:a.targetLocation,armourConfirmed:a.armourConfirmed,
    contactConfirmed:a.contactConfirmed,gmConfirmed:a.gmConfirmed});
   check(JSON.stringify(rebuilt)===JSON.stringify(a),'poškozený důkaz aplikace');
  }
  if(r){
   const prev=acidArmourState(prior,r.campaignId,r.applicationId,r.minute);
   const original=prior.find(x=>x.id===r.applicationId)?.calendarAlchemyAcidArmourApply;
   check(original&&row.characterId===prev.actorId&&row.calendarCampaignId===r.campaignId&&row.campaignMinute===r.minute,'kontext kola');
   const inventory=[{id:r.targetItemId,characterId:original.targetOwnerId,quantity:1,slot:original.targetSlot,
    sourceItemId:original.targetSourceItemId,snapshot:original.targetSnapshot,acidAVDamageByLocation:{[original.targetLocation]:prev.damage}}];
   const rebuilt=createAcidArmourRound({journal:prior,inventory,campaignId:r.campaignId,minute:r.minute,
    applicationId:r.applicationId,d10:r.d10,origin:r.origin,
    continuousContactConfirmed:r.continuousContactConfirmed,gmConfirmed:r.gmConfirmed});
   check(JSON.stringify(rebuilt)===JSON.stringify(r),'poškozený důkaz AV kola');
  }
  prior.push(row);
 }
 return true;
}
export function validateAcidArmourInventory(database){
 const expected=new Map();
 const put=(id,location,damage)=>{
  let found=expected.get(id);if(!found){found={};expected.set(id,found);}
  found[location]=damage;
 };
 for(const row of database.journal){
  if(row.calendarAlchemyAcidArmourApply){const a=row.calendarAlchemyAcidArmourApply;put(a.targetItemId,a.targetLocation,a.initialDamage);}
  if(row.calendarAlchemyAcidArmourRound){const r=row.calendarAlchemyAcidArmourRound;put(r.targetItemId,r.targetLocation,r.damageAfter);}
  if(row.calendarAlchemyMending)for(const t of row.calendarAlchemyMending.targets)if(t.armourDamageAfter)expected.set(t.itemId,{});
 }
 for(const item of database.inventory){
  const actual=item.acidAVDamageByLocation;
  const backed=expected.get(item.id);
  if(actual===undefined){check(!backed,'inventární AV poškození musí odpovídat doloženému Acid: '+item.id);continue;}
  check(item.snapshot?.category==='armor'&&actual&&typeof actual==='object'&&!Array.isArray(actual),
   'poškození Acid smí být jen na skutečné zbroji');
  check(backed&&Object.values(actual).every(safeDamage),
   'inventární AV poškození bez původního alchymistického důkazu: '+item.id);
  check(JSON.stringify(Object.entries(actual).sort())===JSON.stringify(Object.entries(backed).sort()),
   'inventární AV poškození nesouhlasí s doloženým Acid: '+item.id);
 }
 return true;
}
export function assertAcidArmourAppendOnly(before=[],after=[]){
 const afterIds=new Map(after.map(r=>[r.id,r]));
 for(const row of before)if(row.calendarAlchemyAcidArmourApply||row.calendarAlchemyAcidArmourRound)
  check(JSON.stringify(afterIds.get(row.id))===JSON.stringify(row),'neměnný Acid AV důkaz nelze upravit či odstranit');
 return true;
}
