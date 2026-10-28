/** HMK v1.2 pp. 122, 354–355. Catalogue/purchase metadata, no invented
 * combat proficiency, training, wounds or animal health state.
 * Owned livestock is NOT carried equipment. Stable/receipt are separate.
 */
import {BEASTS_P122} from '../rules/conveyance-printed-p122.js';
const stats=Object.freeze({
 'Bovine (Oxen)':{breed:'bovine',bodyWeightLb:1500,str:32,move:80,role:'Vůl · náklad / tah'},
 Camel:{breed:'camel',bodyWeightLb:1100,str:28,move:120,role:'Velbloud · náklad / jízda'},
 Donkey:{breed:'donkey',bodyWeightLb:600,str:24,move:110,role:'Osel · náklad'},
 Mule:{breed:'mule',bodyWeightLb:900,str:25,move:120,role:'Mezek · náklad / jízda'},
 'Palfrey, cart horse':{breed:'palfrey',bodyWeightLb:1000,str:26,move:110,role:'Tažný kůň · kára'},
 'Palfrey, plough horse':{breed:'palfrey',bodyWeightLb:1000,str:26,move:110,role:'Tažný kůň · pluh'},
 'Palfrey, riding horse':{breed:'palfrey',bodyWeightLb:1000,str:26,move:130,role:'Jezdecký kůň'},
 'Warhorse, courser':{breed:'courser',bodyWeightLb:1100,str:27,move:150,role:'Lehký válečný kůň'},
 'Warhorse, charger':{breed:'charger',bodyWeightLb:1200,str:28,move:140,role:'Válečný kůň'},
 'Warhorse, destrier':{breed:'destrier',bodyWeightLb:1400,str:30,move:120,role:'Těžký válečný kůň'},
 Warpony:{breed:'pony',bodyWeightLb:700,str:24,move:130,role:'Válečný poník'},
 Elephant:{breed:'elephant',bodyWeightLb:null,str:null,move:null,role:'Slon · bez doložených atributů v tabulce 355'},
 'Dog, guard':{breed:null,bodyWeightLb:110,str:11,move:120,role:'Strážní pes'},
 'Dog, hunter':{breed:null,bodyWeightLb:60,str:8,move:110,role:'Lovecký pes'},
 'Dog, ratter':{breed:null,bodyWeightLb:20,str:4,move:90,role:'Pes krysař'},
 'Hawk • Falcon':{breed:null,bodyWeightLb:null,str:null,move:null,role:'Dravý pták · ne tažné zvíře'}
});
// Page 355 baseline domesticated abilities (not advanced Animal Training).
// Full health, wounds and combat actions still require a verified live actor.
export const DOMESTICATED_BEAST_BASE_P355=Object.freeze({
 bovine:{size:'b',end:18,agl:8,per:14,aur:3,wil:10,rea:3,cre:2,aware:60,scent:3,stealth:33,spirit:18,initiative:21,attack:'Kick · ATK/DEF 45/45 · d6+6b · low aim / trample'},
 camel:{size:'b',end:14,agl:8,per:18,aur:4,wil:14,rea:5,cre:6,aware:80,scent:5,stealth:52,spirit:27,initiative:30,attack:'Kick · 55/70 · d6+6b; Bite · 44/70 · d4+4p'},
 donkey:{size:'l',end:13,agl:12,per:18,aur:4,wil:12,rea:4,cre:5,aware:75,scent:3,stealth:60,spirit:24,initiative:24,attack:'Kick · 60/60 · d6+4b; Bite · 48/48 · d4+3p'},
 pony:{size:'l',end:10,agl:12,per:17,aur:4,wil:11,rea:4,cre:4,aware:70,scent:3,stealth:56,spirit:21,initiative:24,attack:'Kick · 60/60 · d6+4b; Bite · 48/48 · d4+3p'},
 mule:{size:'b',end:12,agl:12,per:17,aur:4,wil:12,rea:5,cre:6,aware:75,scent:3,stealth:56,spirit:24,initiative:27,attack:'Kick · 60/60 · d6+4b; Bite · 48/48 · d4+3p'},
 palfrey:{size:'b',end:10,agl:11,per:17,aur:4,wil:10,rea:4,cre:4,aware:70,scent:4,stealth:56,spirit:21,initiative:21,attack:'Kick · 55/55 · d6+5b; Bite · 44/44 · d4+4p'},
 courser:{size:'b',end:10,agl:12,per:17,aur:4,wil:11,rea:4,cre:4,aware:70,scent:4,stealth:56,spirit:21,initiative:32,attack:'Kick · 60/60 · d6+5b; Bite · 48/48 · d4+4p'},
 charger:{size:'b',end:11,agl:11,per:17,aur:4,wil:11,rea:4,cre:4,aware:70,scent:4,stealth:56,spirit:21,initiative:40,attack:'Kick · 62/62 · d6+6b; Bite · 55/55 · d4+4p'},
 destrier:{size:'b',end:12,agl:10,per:17,aur:4,wil:12,rea:5,cre:5,aware:70,scent:4,stealth:52,spirit:24,initiative:53,attack:'Kick · 68/68 · d6+7b; Bite · 62/62 · d4+5p'}
});
export function livestockOffer(beastId){const b=BEASTS_P122.find(x=>x.id===beastId);return b&&stats[b.name]?{...stats[b.name],...(DOMESTICATED_BEAST_BASE_P355[stats[b.name].breed]||{}),name:b.name,priceD:b.priceD,maxMB:b.maxMasteryBoosts,id:b.id}:null}
export function verifiedLivestock(data,campaignId){
 if(!campaignId)return [];
 const out=[];
 for(const owner of data?.characters||[]){
  if(owner.archived)continue;
  for(const r of owner.hmk?.livestock||[]){
   const spec=livestockOffer(r.beastId);
   if(r.campaignId===campaignId&&spec&&r.ownerId===owner.id&&typeof r.name==='string'&&r.name)
    out.push({...r,spec});
  }
 }
 return out;
}
export function livestockTravelActors(records){return records.filter(r=>r.spec.breed&&r.spec.str).map(r=>({
 id:r.id,name:r.name,kind:'NPC',hmk:{livestockBreed:r.spec.breed,attributes:{str:r.spec.str},livestockBodyWeightLb:r.spec.bodyWeightLb,
  // No combatState: this record is NOT a certified persistent animal actor.
  livestockSourceId:r.beastId,livestockOwnerId:r.ownerId}
}));}

/** Stable register must retain original acquisition evidence; these animals are
 * not inventory items and have no manufactured Combat State. */
export function validateLivestockEvidence(data){
 const ids=new Set();
 for(const owner of data?.characters||[]){
  const saved=owner.hmk?.livestock;
  if(saved===undefined)continue;
  if(!Array.isArray(saved))throw Error('Stáj: evidence zvířat musí být seznam.');
  for(const r of saved){
   const spec=livestockOffer(r?.beastId);
   if(!spec||typeof r.id!=='string'||!r.id||ids.has(r.id)||
    r.ownerId!==owner.id||typeof r.name!=='string'||r.name.trim().length<2||r.name.length>60||
    !['buy','free'].includes(r.mode)||!Number.isSafeInteger(r.minute)||r.minute<0||
    typeof r.campaignId!=='string'||!r.campaignId||
    r.priceD!==spec.priceD||r.maxMB!==spec.maxMB||typeof r.transactionId!=='string'||!r.transactionId)
    throw Error('Stáj: neplatný nebo změněný údaj o pořízeném zvířeti.');
   ids.add(r.id);
   const proofs=(data.journal||[]).filter(j=>j.livestockAcquisition?.animalId===r.id);
   if(proofs.length!==1)throw Error('Stáj: chybí jednoznačný doklad o pořízení zvířete '+r.name);
   const j=proofs[0],x=j.livestockAcquisition;
   if(j.characterId!==owner.id||j.calendarCampaignId!==r.campaignId||j.campaignMinute!==r.minute||
    x.ownerId!==owner.id||x.beastId!==r.beastId||x.name!==r.name||x.priceD!==r.priceD||
    x.mode!==r.mode||x.transactionId!==r.transactionId)
    throw Error('Stáj: pořízené zvíře se neshoduje s neměnným deníkovým dokladem.');
   const adjustments=owner.hmk?.campaignCashAccounts?.[r.campaignId]?.adjustments||[];
   const matches=adjustments.filter(a=>a.id===r.transactionId);
   if(r.mode==='buy'&&(matches.length!==1||matches[0].deltaPence!==-r.priceD||matches[0].campaignMinute!==r.minute))
    throw Error('Stáj: nákup zvířete nemá přesný finanční doklad.');
   if(r.mode==='free'&&matches.length)throw Error('Stáj: bezplatné převzetí nesmí měnit hotovost.');
  }
 }
 return true;
}
export function assertLivestockAppendOnly(before,after){
 const byId=new Map((after?.characters||[]).map(c=>[c.id,c]));
 for(const old of before?.characters||[]){
  const now=byId.get(old.id);if(!now)continue;
  const previous=old.hmk?.livestock||[],next=now.hmk?.livestock||[];
  if(!Array.isArray(previous)||!Array.isArray(next)||next.length<previous.length||
   JSON.stringify(next.slice(0,previous.length))!==JSON.stringify(previous))
   throw Error('Stáj: historii pořízených zvířat nelze měnit ani mazat.');
 }
 return true;
}
