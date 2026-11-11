import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {stableGearFit93838} from '../src/integration/hmk-stable-hub-574.js';
import {resolveTravelMount93837,isRidingAnimal93837} from '../src/integration/hmk-travel-equipment-guide-93812.js';
import {stableHauling575} from '../src/integration/hmk-stable-operations-575.js';
import {mountLoadENC} from '../src/rules/gear-load.js';
import {CONVEYANCE_RULES_P122,BEASTS_P122} from '../src/rules/conveyance-printed-p122.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
let count=0;const t=(check,msg)=>{assert.ok(check,msg);count++;};
const animal=(id,name,breed)=>({id,name,spec:{name,breed}});
const donkey=animal('donkey','Osel','donkey');
const mule=animal('mule','Mezek','mule');
const camel=animal('camel','Velbloud','camel');
const ox=animal('ox','Vůl','bovine');
const horse=animal('horse','Palfrey, riding horse','palfrey');
for(const a of [donkey,mule,camel,horse]){
 t(isRidingAnimal93837(a),`missing mount eligibility: ${a.spec.name}`);
 for(const gear of ['Bit & bridle','Blanket, horse','Saddle, riding'])
  t(stableGearFit93838({name:gear},a).ok,`missing riding tack: ${a.spec.name}/${gear}`);
}
t(!isRidingAnimal93837(ox),'ox must not be a riding animal');
t(!stableGearFit93838({name:'Saddle, riding'},ox).ok,'ox must not accept riding saddle');
t(stableGearFit93838({name:'Harness, ox'},ox).ok,'ox harness');
t(!stableGearFit93838({name:'Harness, ox'},horse).ok,'horse cannot take ox harness');
const picked=resolveTravelMount93837([ox,donkey],['ox','donkey'],'');
t(picked.animal?.id==='donkey','must skip ox and auto-select donkey');
t(resolveTravelMount93837([ox,donkey],['ox','donkey'],'ox').animal===null,'explicit ox must fail');
t(resolveTravelMount93837([ox,donkey],['ox','donkey'],'donkey').animal?.id==='donkey','explicit donkey');
const cart=animal('cart','Tažný kůň','palfrey');cart.spec.name='Palfrey, cart horse';
t(stableHauling575({vehicleName:'Cart, 2-wheel',team:[ox]}).capacityLb===2500,'cart ox 2500');
t(stableHauling575({vehicleName:'Cart, 2-wheel',team:[cart]}).capacityLb===2000,'cart horse 2000');
t(stableHauling575({vehicleName:'Wagon, 4-wheel',team:[ox,animal('ox2','Vůl 2','bovine')]}).capacityLb===8000,'wagon ox 8000');
t(stableHauling575({vehicleName:'Wagon, 4-wheel',team:[cart,animal('cart2','Tažný kůň 2','palfrey')]}).capacityLb===null,'wagon requires exact printed cart-horse type');
const cart2=animal('cart2','Tažný kůň 2','palfrey');cart2.spec.name='Palfrey, cart horse';
t(stableHauling575({vehicleName:'Wagon, 4-wheel',team:[cart,cart2]}).capacityLb===6400,'wagon cart horses 6400');
t(mountLoadENC(80,{kind:'elephant'})===5,'elephant: 5 ENC /80lb');
t(mountLoadENC(40,{kind:'camel'})===5,'camel: 5 ENC /40lb');
t(BEASTS_P122.length===16,'16 species');
t(CONVEYANCE_RULES_P122.elephantPlatform.weightLb===200&&CONVEYANCE_RULES_P122.elephantPlatform.priceD===480,'elephant platform from HMK');
const app=readFileSync(resolve(root,'app.js'),'utf8');const css=readFileSync(resolve(root,'styles.css'),'utf8');const html=readFileSync(resolve(root,'index.html'),'utf8');
t(app.includes("const APP_VERSION='93.841';")&&html.includes('v93.841'),'version in JS and HTML');
t(css.includes('.hmk-stable-logistics-card{background:linear-gradient')&&css.includes('parchment_dynamic_texture.png'),'parchment applied to Stable');
for(const outdated of ['Tah vozu: v aplikaci nepovolen','Tah vozu: bez automatického režimu','Aplikace nemá potvrzenou standardní nosnost'])
 t(!app.includes(outdated),'outdated message: '+outdated);
console.log('PASS v93.841 source/rule tests: '+count+' assertions');
