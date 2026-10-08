import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_ARTICLES_P118} from '../src/rules/armour-articles-printed.js';
const find=(material,name)=>PRINTED_ARMOUR_ARTICLES_P118.find(x=>x.material===material&&x.name===name);
test('HMK p117 padded coat protects thigh but belongs only to arms and torso for layering',()=>{
 const coat=find('padded','Coat');
 assert.ok(coat.coveredLocations.includes('th'));
 assert.deepEqual(coat.bodyZones,['arms','torso']);
});
test('HMK p117 breeches protect pelvis but belong to legs for layering',()=>{
 const breeches=find('cloth','Breeches');
 assert.ok(breeches.coveredLocations.includes('pv'));
 assert.deepEqual(breeches.bodyZones,['legs']);
});
test('Long upper garments do not inherit leg layering zone from anatomical coverage',()=>{
 for(const a of PRINTED_ARMOUR_ARTICLES_P118.filter(x=>['Coat','Surcoat','Cloak','Robe'].includes(x.name))){
  assert.equal(a.bodyZones.includes('legs'),false,a.id);
 }
});
