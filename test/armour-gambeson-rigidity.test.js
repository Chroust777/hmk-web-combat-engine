import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_ARTICLES_P118} from '../src/rules/armour-articles-printed.js';
test('HMK p118 gambeson rigid coverage is confined to torso locations',()=>{
 const gambesons=PRINTED_ARMOUR_ARTICLES_P118.filter(a=>a.material==='gambeson');
 assert.equal(gambesons.length,6);
 for(const article of gambesons)for(const [loc,marker] of Object.entries(article.coverageMarkers)){
  if(['tx','ab','pv'].includes(loc))assert.equal(marker,'rigid',article.name+':'+loc);
  else assert.equal(marker,'standard',article.name+':'+loc);
 }
});
