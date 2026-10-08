import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_ARTICLES_P118 as articles} from '../src/rules/armour-articles-printed.js';
import {validateArmourCoverage} from '../src/integration/armour-coverage-readiness.js';
test('92 visually transcribed articles pass fail-closed readiness gate',()=>{assert.equal(articles.filter(a=>validateArmourCoverage(a).ready).length,92)});
test('cloth coat covers thigh but no knee',()=>{const a=articles.find(a=>a.id==='hmk118-cloth-coat');assert(a.coveredLocations.includes('th'));assert(!a.coveredLocations.includes('kn'))});
test('leather boots cover calves and feet',()=>{assert.deepEqual(articles.find(a=>a.id==='hmk118-leather-boots').coveredLocations,['ca','ft'])});
test('rigid and directional articles are validated',()=>{assert.equal(validateArmourCoverage(articles.find(a=>a.id==='hmk118-plate-breastplate')).ready,true)});
