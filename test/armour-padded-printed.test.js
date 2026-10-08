import test from 'node:test';import assert from 'node:assert/strict';import {PRINTED_ARMOUR_ARTICLES_P118,auditPrintedArmourArticles} from '../src/rules/armour-articles-printed.js';
test('p118 padded 14 reference articles',()=>{assert.equal(PRINTED_ARMOUR_ARTICLES_P118.filter(x=>x.material==='padded').length,14);assert.equal(PRINTED_ARMOUR_ARTICLES_P118.length,92);assert.equal(auditPrintedArmourArticles().valid,true)});
test('padded cowl keeps printed p ENC marker',()=>assert.equal(PRINTED_ARMOUR_ARTICLES_P118.find(x=>x.id==='hmk118-padded-cowl').enc,'p'));
test('padded coat retains printed values',()=>{const a=PRINTED_ARMOUR_ARTICLES_P118.find(x=>x.id==='hmk118-padded-coat');assert.deepEqual([a.priceD,a.weightLb,a.enc],[128,5.1,0])});
