import test from 'node:test';import assert from 'node:assert/strict';import {PRINTED_ARMOUR_ARTICLES_P118 as A,auditPrintedArmourArticles} from '../src/rules/armour-articles-printed.js';
test('all nine printed material groups present',()=>assert.deepEqual([...new Set(A.map(x=>x.material))].sort(),['cloth','gambeson','kurbul','leather','mail','padded','plate','quilted','scale']));
test('all articles and unique IDs',()=>{assert.equal(A.length,92);assert.equal(auditPrintedArmourArticles().valid,true)});
test('printed non-numeric markers retained',()=>{assert.equal(A.find(x=>x.id==='hmk118-kurbul-spaulders').enc,'a');assert.equal(A.find(x=>x.id==='hmk118-plate-three-quarter-helm').enc,'p')});
test('no invented coverage',()=>assert.ok(A.every(x=>!('coverage' in x))));
