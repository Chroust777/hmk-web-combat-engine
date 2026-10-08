import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_ARTICLES_P118 as articles} from '../src/rules/armour-articles-printed.js';
import {auditArmourCoverage,validateArmourCoverage} from '../src/integration/armour-coverage-readiness.js';
test('all 92 have per-location coverage data',()=>{assert.equal(articles.length,92);assert.equal(auditArmourCoverage().ready,92);});
test('all markers correspond to valid locations',()=>{for(const a of articles)assert.equal(validateArmourCoverage(a).ready,true,a.id);});
test('directional and rigid flags are not discarded',()=>{for(const id of ['hmk118-cloth-cloak','hmk118-padded-cloak'])assert.equal(articles.find(a=>a.id===id).directionRestriction,'special');for(const id of ['hmk118-kurbul-breastplate','hmk118-plate-breastplate'])assert.equal(articles.find(a=>a.id===id).directionRestriction,'front-only');assert.equal(articles.find(a=>a.id==='hmk118-mail-hauberk').rigid,true);});
