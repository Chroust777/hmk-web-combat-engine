import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_ARTICLES_P118} from '../hmk93711_work/src/rules/armour-articles-printed.js';
import {locationArmourValue} from '../hmk93711_work/src/rules/armour-options.js';
import {weatherSkinCoverageProposal} from '../hmk93711_work/src/integration/hmk-weather-skin-coverage.js';
import {resolveLiveCombatArmour} from '../hmk93711_work/src/integration/live-combat-armour.js';
let checks=0; const equal=(a,b,msg)=>{assert.deepEqual(a,b,msg);checks++};
const codes={cloth:'C',leather:'L',padded:'D',quilted:'Q',gambison:'G',gambeson:'G',kurbul:'K',scale:'S',mail:'M',plate:'P'};
function article(id,name,slot='worn',characterId='P'){
 const a=PRINTED_ARMOUR_ARTICLES_P118.find(x=>x.id===name);
 assert.ok(a,name);
 const key='hmk:armour:p118:verified:'+a.id;
 return {id,characterId,slot,quantity:1,sourceItemId:key,layerOrder:0,layerSlot:'base',
 snapshot:{id:key,name:a.name,category:'armor',properties:{material:codes[a.material],coverageVerified:true,weightLb:a.weightLb,
 coveredLocations:a.coveredLocations,locationProtection:Object.fromEntries(a.coveredLocations.map(loc=>[loc,Object.fromEntries(['b','e','p','f'].map(aspect=>[aspect,locationArmourValue({layers:[{material:a.material}],zone:loc,aspect}).av]))])),
 coverageMarkers:a.coverageMarkers,directionRestriction:a.directionRestriction,rigid:a.rigid,layerZoneByLocation:a.layerZoneByLocation}}};
}
const ha=[{location:'ha',side:'left'},{location:'ha',side:'right'}],tx=[{location:'tx'}];
const carrying=article('carried','hmk118-cloth-gauntlets','carried');
const chest=article('chest','hmk118-cloth-gauntlets','chest');
const worn=article('worn','hmk118-cloth-gauntlets','worn');
const foreign=article('foreign','hmk118-cloth-gauntlets','worn','OTHER');
const none=weatherSkinCoverageProposal({inventory:[],characterId:'P',kind:'sunburn',locations:ha});
const onlyCarried=weatherSkinCoverageProposal({inventory:[carrying,chest,foreign],characterId:'P',kind:'sunburn',locations:ha});
equal(onlyCarried.sites,none.sites,'carried/stored/foreign clothes cannot cover exposed skin');
const wornSun=weatherSkinCoverageProposal({inventory:[carrying,chest,foreign,worn],characterId:'P',kind:'sunburn',locations:ha});
equal(wornSun.selected,0,'worn gloves cover both hands for sun exposure');
const carriedCold=weatherSkinCoverageProposal({inventory:[carrying],characterId:'P',kind:'frostbite',locations:ha});
equal(carriedCold.sites[0].av,0,'carried gloves must never contribute frost AV');
const wornCold=weatherSkinCoverageProposal({inventory:[worn],characterId:'P',kind:'frostbite',locations:ha});
equal(wornCold.sites[0].av,1,'worn gloves provide cloth frost AV1');
equal(wornCold.sites[1].av,1,'both sides receive same worn gloves frost AV');
const inactiveForeign=weatherSkinCoverageProposal({inventory:[foreign],characterId:'P',kind:'frostbite',locations:ha});
equal(inactiveForeign.sites[0].av,0,'another character clothing not shared');
const storedPlate=article('plate','hmk118-plate-breastplate','carried');
const noPlate=weatherSkinCoverageProposal({inventory:[storedPlate],characterId:'P',kind:'frostbite',locations:tx});
equal(noPlate.sites[0].av,0,'carried plate breastplate cannot protect torso');
const plate=article('plateworn','hmk118-plate-breastplate','worn');
const effectivePlate=weatherSkinCoverageProposal({inventory:[plate],characterId:'P',kind:'frostbite',locations:tx});
equal(effectivePlate.sites[0].selected,false,'worn plate breastplate protects torso (F AV >=4)');
// Independent combat protection resolver uses exactly the same worn-only source.
const combatCarried=resolveLiveCombatArmour({inventory:[carrying],targetId:'P',location:'ha',aspect:'f',direction:'front'});
equal(combatCarried.ready,true,'empty protection can be evaluated with carried gear');
equal(combatCarried.armourValue,0,'combat also ignores carried clothing');
console.log('PASS',checks,'worn/carried/chest/other-character, frost, sun, combat AV');
