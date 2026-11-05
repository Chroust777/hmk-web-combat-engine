import {strict as assert} from 'node:assert';
import {PRINTED_ARMOUR_ARTICLES_P118 as A} from '../src/rules/armour-articles-printed.js';
import {missingPrintedArmourCatalogEntries} from '../src/integration/armour-article-catalog.js';
import {evaluateOrderedArmour} from '../src/integration/armour-layer-evaluation.js';
import {resolveLiveCombatArmour} from '../src/integration/live-combat-armour.js';
import {resolveVerifiedAreaProtection} from '../src/integration/hmk-verified-area-protection.js';
import {evaluateTrekkingWeatherRoll} from '../src/integration/hmk-trekking-weather-roll.js';
import {previewOptimalOutfit} from '../src/integration/hmk-outfit-optimizer.js';
let n=0;const ok=(cond,msg)=>{assert.ok(cond,msg);n++};
const slugs=['plate-spaulders','plate-rerebraces','plate-coudes','plate-vambraces','scale-gauntlets','cloth-surcoat'];
const article=slugs.map((slug,i)=>({...A.find(a=>a.id==='hmk118-'+slug),layerOrder:i}));
let r=evaluateOrderedArmour(article);ok(r.status==='compatible','six disjointly layered arm articles');ok(r.extraEnc===0&&r.bulkPenalty===0,'no invented enc or bulk');
const catalog=missingPrintedArmourCatalogEntries([]);
const worn=slugs.map((slug,i)=>{const s=catalog.find(x=>x.id.endsWith(slug));assert.ok(s);return {id:'part-'+i,sourceItemId:s.id,characterId:'pc',snapshot:structuredClone(s),slot:'worn',quantity:1,layerOrder:i,layerSlot:null,bulkExceptionZones:[],condition:''}});
for(const loc of ['sh','ua','el','fo','ha']){const rr=resolveLiveCombatArmour({inventory:worn,targetId:'pc',location:loc,aspect:'f',direction:'front'});ok(rr.ready,`combat ready ${loc}`);ok(rr.armourValue>0,`combat armour ${loc}`);}
const av=resolveVerifiedAreaProtection({inventory:worn,targetId:'pc'});ok(av.ready,'Area protection ready');ok(av.areaAV===2,'Area AV 2 observed from six pieces');
let cold=evaluateTrekkingWeatherRoll({kind:'cold',areaAV:av.areaAV,roll:4});ok(cold.av===2&&cold.exposed,'cold correctly tests area AV');
let hot=evaluateTrekkingWeatherRoll({kind:'heat',areaAV:av.areaAV,roll:2});ok(hot.av===2&&hot.exposed,'heat correctly tests area AV');
const removed=worn.filter(x=>x.id!=='part-5');const less=resolveVerifiedAreaProtection({inventory:removed,targetId:'pc'});ok(less.ready,'recalculate after removing an armour piece');ok(less.unroundedAreaAV<av.unroundedAreaAV,'removing surcoat lowers f AV');
const portable=worn.map(x=>({...x,slot:'carried',layerOrder:null}));const optim=previewOptimalOutfit(portable,'pc','armour');ok(optim.ready&&optim.optimal,'optimizer does not prune six disjoint arm articles');ok(optim.placements.length===6,'optimizer found all six articles');
// The p117 Obris example: outer D coat over M and D undercoat, cumulatively
// -5 Bulk per affected arm/torso Zone but extra ENC +5 only once per coat.
const p=(id,material,name,layerOrder)=>({id,material,name,layerOrder,coveredLocations:['sh','tx'],bodyZones:['arms','torso'],layerZoneByLocation:{sh:'arms',tx:'torso'}});
const obris=evaluateOrderedArmour([p('d-under','padded','Shirt',0),p('mail','mail','Byrnie',1),p('d-over','padded','Coat',2)]);
ok(obris.status==='compatible'&&obris.bulkPenalty===-10&&obris.extraEnc===5,'Obris Bulk -10 and extra ENC +5');
console.log('PASS '+n+' p117 Obris, six independent arm articles, live Combat and weather Cold/Heat and exact outfit');
