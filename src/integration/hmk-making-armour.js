/** HMK pp.89–90, named Armour & Clothing projects. */
import {missingPrintedArmourCatalogEntries} from './armour-article-catalog.js';

const recipes=[
 ['hmk118-leather-boots',46,23],
 ['hmk118-leather-bracers',12,6],
 ['hmk118-kurbul-breastplate',24,96],
 ['hmk118-plate-breastplate',29,288],
 ['hmk118-cloth-breeches',14,3],
 ['hmk118-scale-byrnie',116,363],
 ['hmk118-mail-byrnie',248,297],
 ['hmk118-scale-byrnie-sleeved',140,440],
 ['hmk118-mail-byrnie-sleeved',300,360],
 ['hmk118-cloth-cap',3,1],
 ['hmk118-leather-cap',10,5],
 ['hmk118-padded-cap',6,1],
 ['hmk118-quilted-cap',12,5],
 ['hmk118-cloth-cloak',53,13],
 ['hmk118-padded-cloak',99,20],
 ['hmk118-cloth-coat',51,13],
 ['hmk118-padded-coat',96,19],
 ['hmk118-quilted-coat',192,77],
 ['hmk118-gambeson-coat',396,198],
 ['hmk118-kurbul-coudes',4,16],
 ['hmk118-plate-coudes',5,48],
 ['hmk118-cloth-cowl',5,1],
 ['hmk118-padded-cowl',9,2],
 ['hmk118-quilted-cowl',18,7],
 ['hmk118-scale-cowl',21,66],
 ['hmk118-mail-cowl',45,54],
 ['hmk118-kurbul-cuirass',48,192],
 ['hmk118-plate-cuirass',58,576],
 ['hmk118-padded-cuisses',26,5],
 ['hmk118-quilted-cuisses',51,20],
 ['hmk118-scale-cuisses',60,187],
 ['hmk118-mail-cuisses',128,153],
 ['hmk118-cloth-gauntlets',4,1],
 ['hmk118-leather-gauntlets',12,6],
 ['hmk118-scale-gauntlets',18,55],
 ['hmk118-kurbul-greaves',24,96],
 ['hmk118-plate-greaves',29,288],
 ['hmk118-scale-habergeon',158,495],
 ['hmk118-mail-habergeon',338,405],
 ['hmk118-scale-hauberk',224,704],
 ['hmk118-mail-hauberk',480,576],
 ['hmk118-kurbul-helm',8,32],
 ['hmk118-plate-helm',10,96],
 ['hmk118-kurbul-three-quarter-helm',14,56],
 ['hmk118-plate-three-quarter-helm',17,168],
 ['hmk118-plate-great-helm',22,216],
 ['hmk118-kurbul-kneecops',6,24],
 ['hmk118-plate-kneecops',7,72],
 ['hmk118-cloth-leggings',29,7],
 ['hmk118-padded-leggings',54,11],
 ['hmk118-scale-leggings',126,396],
 ['hmk118-mail-leggings',270,324],
 ['hmk118-cloth-mantle',17,4],
 ['hmk118-padded-mantle',32,7],
 ['hmk118-quilted-mantle',63,25],
 ['hmk118-padded-mittens',8,2],
 ['hmk118-mail-mittens',38,45],
 ['hmk118-kurbul-rerebraces',16,64],
 ['hmk118-plate-rerebraces',19,192],
 ['hmk118-cloth-robe',63,16],
 ['hmk118-cloth-shirt',26,7],
 ['hmk118-padded-shirt',50,10],
 ['hmk118-quilted-shirt',99,40],
 ['hmk118-gambeson-shirt',210,105],
 ['hmk118-leather-shoes',17,8],
 ['hmk118-kurbul-spaulders',6,24],
 ['hmk118-plate-spaulders',7,72],
 ['hmk118-cloth-surcoat',43,11],
 ['hmk118-padded-surcoat',81,16],
 ['hmk118-cloth-swaddle',15,4],
 ['hmk90-padded-swaddle',29,6],
 ['hmk118-cloth-trousers',31,8],
 ['hmk118-padded-trousers',59,12],
 ['hmk118-cloth-tunic',36,9],
 ['hmk118-padded-tunic',68,14],
 ['hmk118-quilted-tunic',135,54],
 ['hmk118-gambeson-tunic',282,141],
 ['hmk118-cloth-tunic-sleeved',40,10],
 ['hmk118-padded-tunic-sleeved',75,15],
 ['hmk118-quilted-tunic-sleeved',150,60],
 ['hmk118-gambeson-tunic-sleeved',312,156],
 ['hmk118-kurbul-vambraces',10,40],
 ['hmk118-plate-vambraces',12,120],
 ['hmk118-cloth-vest',19,5],
 ['hmk118-leather-vest',58,29],
 ['hmk118-padded-vest',36,7],
 ['hmk118-quilted-vest',72,29],
 ['hmk118-gambeson-vest',156,78],
 ['hmk118-leather-long-vest',108,54],
 ['hmk118-gambeson-long-vest',234,117],
];

const materials={
 cloth:[1,'armourTextile',[]],leather:[1,'armourHide',[]],
 padded:[1,'armourTextile',[]],quilted:[1,'armourTextile',[]],gambeson:[2,'armourTextile',[]],
 kurbul:[3,'armourWeaponcraft',['Hideworking']],scale:[4,'armourWeaponcraft',['Hideworking','Metalcraft']],
 mail:[5,'armourWeaponcraft',['Metalcraft','Mineralogy']],plate:[5,'armourWeaponcraft',['Metalcraft','Mineralogy']]
};
export const ARMOUR_WORKSHOP_PROJECTS=Object.freeze({
 armourTextile:{label:'Výroba oděvů a zbrojí · Textilecraft · HMK 89–90',primary:'Textilecraft'},
 armourHide:{label:'Výroba kožených oděvů a zbrojí · Hideworking · HMK 89–90',primary:'Hideworking'},
 armourWeaponcraft:{label:'Výroba zbrojí · Weaponcraft · HMK 89–90',primary:'Weaponcraft'}
});
const catalog=new Map(missingPrintedArmourCatalogEntries().map(x=>[x.id.slice('hmk:armour:p118:verified:'.length),x]));
export const MAKING_ARMOUR_ITEMS=Object.freeze(Object.fromEntries(recipes.map(([key,costD,hours])=>{
 const article=catalog.get(key)??null;
 const material=article?.properties.material??'padded', [max,kind,secondary]=materials[material];
 return ['armour:'+key,Object.freeze({name:article?.name??'Padded Swaddle',costD,hours,kind,secondary,armour:true,material,max,article})];
})));

export function armourWorkResult(item,proof,timeStars,rolls,dueMinute,tn){
 const successes=rolls.filter(n=>n<=tn).length,applied=Math.min(item.max,successes);
 const flaw=proof.a.sv<=0?2:proof.a.sv<=2?1:0;
 const aqDelta=[0,1,1,2,2,3][applied]-flaw;
 const avDelta=[0,0,1,1,2,2][applied]-flaw;
 return {timeStars,rolls:[...rolls],successes,applied,flaw,aqDelta,avDelta,
  valueMultiplier:applied+1,salePriceD:flaw||!item.article?null:item.article.properties.pricePence*(applied+1),dueMinute};
}

export function armourWorkItem(item,result,spirit,startId,actorId){
 if(!item.article)return null;
 const snapshot=structuredClone(item.article),p=snapshot.properties;
 if(spirit?.success){
  p.faeriecraft='metal-armour';
  p.weightLb/=2;
 }
 p.armourWork={aqDelta:result.aqDelta,avDelta:result.avDelta};
 p.pricePence=result.salePriceD;
 for(const protection of Object.values(p.locationProtection)){
  for(const aspect of Object.keys(protection))protection[aspect]=Math.max(0,protection[aspect]+result.avDelta);
 }
 return {id:'workshop-faerie:'+startId,characterId:actorId,sourceItemId:snapshot.id,snapshot,
  workshopCraftId:startId,quantity:1,currentWQ:null,slot:'carried',aq:result.aqDelta,
  condition:spirit?.success?'Faeriecraft · −5 ENC':''};
}
