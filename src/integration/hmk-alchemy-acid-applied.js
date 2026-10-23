/** HârnMaster v1.2 pp.269,271: Acid, Applied/Instantaneous. This is the
 * non-combat six-inch object-damage branch ONLY. Living targets, weapon WQ,
 * armour AV, thrown-vial targeting and disposition of destroyed items need
 * their own integrated combat/inventory transitions; no implied mutation here.
 * Application and physical emptying share ONE immutable journal event.
 */
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';
export const ACID_APPLICATION_FORMAT='hmk-alchemy-acid-application-v1';
export const ACID_ROUND_FORMAT='hmk-alchemy-acid-object-round-v1';
const fail=(ok,msg)=>{if(!ok)throw Error('Alchemy Acid: '+msg)};
const minuteOK=v=>Number.isSafeInteger(v)&&v>=0&&v<=1e9;
const threshold={wood:5,metal:7,stone:9}; // HMK 271, six-inch object guides
const dieOrigin=o=>o==='manual'||o==='cryptographic-software-die';
function physicalTarget(inventory,targetItemId){
 return inventory.find(x=>x.id===targetItemId&&x.quantity===1&&x.snapshot&&
  typeof x.characterId==='string'&&x.characterId&&typeof x.snapshot.name==='string'&&
  x.snapshot.name.trim().length>=2)||null;
}
export function createAlchemyAcidApplication({journal=[],inventory=[],campaignId,minute,actorId,finishId,
 targetItemId,material,sixInchConfirmed=false,objectConfirmed=false,accessConfirmed=false,
 gmConfirmed=false}={}){
 fail(gmConfirmed===true&&sixInchConfirmed===true&&objectConfirmed===true&&accessConfirmed===true,
  'GM musí potvrdit neživý šestipalcový předmět, jeho dostupnost a skutečné vylití do jednoho kola');
 fail(typeof campaignId==='string'&&campaignId&&minuteOK(minute)&&typeof actorId==='string'&&actorId,
  'chybí kampaň, čas nebo provádějící postava');
 fail(Object.hasOwn(threshold,material),'podporován je pouze šestipalcový dřevěný, kovový či kamenný objekt');
 const dose=alchemyElixirStrength(journal,campaignId,finishId,minute);
 fail(dose.elixirName==='Acid'&&dose.currentAS>0&&!dose.dispersed&&!dose.imbibingId,
  'chybí účinný skutečně dokončený Acid');
 fail(minute>=dose.completedMinute&&(!dose.nextDueMinute||dose.nextDueMinute>minute),
  'splatný či přeskočený Decay Roll musí být nejprve doložen');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 fail(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot),
  'Acid musí být ve skutečné nesené lahvičce svého vlastníka');
 const item=physicalTarget(inventory,targetItemId);
 fail(item&&item.id!==vial.vialId&&item.sourceItemId!==dose.finishId,
  'nutný existující jednotlivý inventární předmět odlišný od lahvičky');
 fail(item.slot!=='chest','předmět uložený v truhlici nelze přímo zasáhnout bez vyzvednutí');
 return {format:ACID_APPLICATION_FORMAT,campaignId,minute,actorId,finishId,vialId:vial.vialId,
  bindingId:vial.bindingId,targetItemId:item.id,targetOwnerId:item.characterId,
  targetName:item.snapshot.name,material,sixInchConfirmed:true,objectConfirmed:true,
  accessConfirmed:true,asAtApplication:dose.currentAS,destroyAtSuccesses:threshold[material],
  noImbibingRoll:true,profusionExempt:true,gmConfirmed:true,sourcePages:[269,270,271]};
}
/** Reconstruct actual contact rounds strictly in journal append order. */
export function alchemyAcidContactState(journal=[],campaignId,applicationId,minute=1e9){
 fail(minuteOK(minute),'neplatná hranice kampaně');
 const row=journal.find(r=>r.id===applicationId&&r.calendarCampaignId===campaignId&&
  r.calendarAlchemyAcidApply&&r.campaignMinute<=minute);
 fail(row,'chybí doložená aplikace');
 const p=row.calendarAlchemyAcidApply;
 let as=p.asAtApplication,successes=0,round=0;
 for(const entry of journal.slice(journal.indexOf(row)+1)){
  const r=entry.calendarAlchemyAcidRound;
  if(!r||r.applicationId!==applicationId||entry.calendarCampaignId!==campaignId||entry.campaignMinute>minute)continue;
  fail(as>0&&successes<p.destroyAtSuccesses,'kolo následuje po konci kontaktu');
  fail(r.round===round+1&&r.asBefore===as&&r.successesBefore===successes,
   'neplatné pořadí nebo původní AS');
  const success=r.d10<=as;
  fail(r.success===success&&r.damage===(success?1:0)&&r.asAfter===as-1&&
   r.successesAfter===successes+(success?1:0), 'neplatný výsledek skutečného d10');
  fail(r.minute===entry.campaignMinute&&r.minute>=p.minute&&r.campaignId===campaignId,
   'poškozený čas nebo kampaň');
  round++;as--;successes+=success?1:0;
 }
 return {applicationId,finishId:p.finishId,campaignId,actorId:p.actorId,targetItemId:p.targetItemId,
  targetName:p.targetName,material:p.material,rounds:round,as,successes,
  destroyAtSuccesses:p.destroyAtSuccesses,guideReached:successes>=p.destroyAtSuccesses,
  spent:as<=0||successes>=p.destroyAtSuccesses};
}
export function createAlchemyAcidRound({journal=[],campaignId,minute,applicationId,d10,origin,
 gmConfirmed=false,continuousContactConfirmed=false}={}){
 fail(gmConfirmed===true&&continuousContactConfirmed===true,
  'GM musí doložit jeden konkrétní další round kontaktu Acid s týmž předmětem');
 fail(typeof applicationId==='string'&&applicationId&&minuteOK(minute)&&
  Number.isInteger(d10)&&d10>=1&&d10<=10&&dieOrigin(origin),
  'nutný původ skutečného d10, jedna celá hodnota 1–10 a čas');
 const prev=alchemyAcidContactState(journal,campaignId,applicationId,minute);
 fail(!prev.spent,'AS 0 nebo již dosažená referenční hranice zničení; další zásah nelze automatizovat');
 const success=d10<=prev.as;
 return {format:ACID_ROUND_FORMAT,campaignId,minute,applicationId,
  round:prev.rounds+1,asBefore:prev.as,d10,origin,success,damage:success?1:0,
  asAfter:prev.as-1,successesBefore:prev.successes,successesAfter:prev.successes+(success?1:0),
  targetItemId:prev.targetItemId,continuousContactConfirmed:true,gmConfirmed:true,
  sourcePage:271};
}
export function validateAlchemyAcidJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const p=row.calendarAlchemyAcidApply,r=row.calendarAlchemyAcidRound;
  if(p){
   fail(row.characterId===p.actorId&&row.campaignMinute===p.minute&&row.calendarCampaignId===p.campaignId,
    'neplatný kontext aplikace');
   fail(row.calendarAlchemyVialEmpty?.finishId===p.finishId&&
    row.calendarAlchemyVialEmpty?.vialId===p.vialId&&row.calendarAlchemyVialEmpty?.actorId===p.actorId,
    'aplikace musí být v jediném atomickém záznamu s vyprázdněním lahvičky');
   const inventory=[{id:p.targetItemId,characterId:p.targetOwnerId,quantity:1,slot:'carried',
    snapshot:{name:p.targetName}}, {id:p.vialId,characterId:p.actorId,quantity:1,slot:'carried',
    snapshot:{name:'Vial'}}];
   const recreated=createAlchemyAcidApplication({journal:prior,inventory,campaignId:p.campaignId,
    minute:p.minute,actorId:p.actorId,finishId:p.finishId,targetItemId:p.targetItemId,
    material:p.material,sixInchConfirmed:p.sixInchConfirmed,objectConfirmed:p.objectConfirmed,
    accessConfirmed:p.accessConfirmed,gmConfirmed:p.gmConfirmed});
   fail(JSON.stringify(recreated)===JSON.stringify(p),'přepsaný důkaz aplikace');
  }
  if(r){
   fail(row.characterId===alchemyAcidContactState(prior,r.campaignId,r.applicationId,r.minute).actorId&&
    row.calendarCampaignId===r.campaignId&&row.campaignMinute===r.minute,'neplatný kontext dalšího kola');
   const recreated=createAlchemyAcidRound({journal:prior,campaignId:r.campaignId,minute:r.minute,
    applicationId:r.applicationId,d10:r.d10,origin:r.origin,gmConfirmed:r.gmConfirmed,
    continuousContactConfirmed:r.continuousContactConfirmed});
   fail(JSON.stringify(recreated)===JSON.stringify(r),'přepsaný důkaz kola Acid');
  }
  prior.push(row);
 }
 return true;
}
export function assertAlchemyAcidAppendOnly(before=[],after=[]){
 const rows=new Map(after.map(x=>[x.id,x]));
 for(const x of before)if(x.calendarAlchemyAcidApply||x.calendarAlchemyAcidRound)
  fail(JSON.stringify(x)===JSON.stringify(rows.get(x.id)),'neměnný důkaz Acid nelze odstranit ani upravit');
 return true;
}
