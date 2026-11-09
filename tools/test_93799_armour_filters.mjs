import assert from 'node:assert/strict';
import {ARMOUR_FILTER_MATERIALS_93799 as MATERIALS,ARMOUR_FILTER_LOCATIONS_93799 as LOCATIONS,armourCatalogMatches93799 as matches,filterArmourCatalog93799 as filter} from '../src/integration/hmk-library-armour-filters-93799.js';
assert.equal(MATERIALS.length,9);assert.equal(LOCATIONS.length,15);
const items=[
 {id:'cloth-cap',category:'armor',properties:{material:'C',coveredLocations:['sk'],locationProtection:{sk:{f:1}}}},
 {id:'leather-cap',category:'armor',properties:{material:'L',coveredLocations:['sk']}},
 {id:'gambeson-sleeves',category:'armor',properties:{material:'G',coveredLocations:['sh','ua','el','fo']}},
 {id:'cloth-wrong-assumption',category:'armor',name:'Cloth Face Guard',properties:{material:'C'}},
 {id:'custom-face',category:'armor',name:'Custom Item',properties:{material:'Cloth',locationProtection:{fa:{f:1}}}},
 {id:'not-armour',category:'other',properties:{material:'C',coveredLocations:['sk']}}
];
const ids=(mat,loc)=>filter(items,mat,loc).map(i=>i.id);
assert.deepEqual(ids('all','all'),items.slice(0,5).map(i=>i.id));
assert.deepEqual(ids('C','sk'),['cloth-cap']);
assert.deepEqual(ids('C','fa'),['custom-face']);
assert.deepEqual(ids('L','sk'),['leather-cap']);
assert.deepEqual(ids('G','fo'),['gambeson-sleeves']);
assert.deepEqual(ids('G','fa'),[]);
assert.deepEqual(ids('all','fa'),['custom-face']);
assert.equal(matches(items[3],'C','fa'),false,'Cannot infer anatomical coverage from name');
console.log('PASS 93.799 unit: 9 materials, 15 locations, combined filtering, custom material, protected no-guessing, not armour excluded');
