import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_ARTICLES_P118} from '../src/rules/armour-articles-printed.js';
const expected={
 'hmk118-cloth-breeches':['pv','th','kn'],
 'hmk118-cloth-trousers':['pv','th','kn','ca'],
 'hmk118-cloth-leggings':['th','kn','ca','ft'],
 'hmk118-cloth-swaddle':['ca','ft'],
 'hmk118-padded-cuisses':['th','kn'],
 'hmk118-padded-trousers':['pv','th','kn','ca'],
 'hmk118-padded-leggings':['th','kn','ca','ft'],
 'hmk118-quilted-cuisses':['th','kn'],
};
for(const [id,locations] of Object.entries(expected)){
 test(`HMK p118 lower-body coverage: ${id}`,()=>{
  const row=PRINTED_ARMOUR_ARTICLES_P118.find(a=>a.id===id);
  assert.ok(row);assert.deepEqual(row.coveredLocations,locations);
  assert.deepEqual(row.bodyZones,['legs']);assert.equal(row.directionRestriction,'none');
 });
}
test('all catalogue identities remain unique',()=>{
 assert.equal(PRINTED_ARMOUR_ARTICLES_P118.length,92);
 assert.equal(new Set(PRINTED_ARMOUR_ARTICLES_P118.map(x=>x.id)).size,92);
});
