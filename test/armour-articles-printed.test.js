import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_ARTICLES_P118,auditPrintedArmourArticles} from '../src/rules/armour-articles-printed.js';
test('23 printed cloth and leather articles',()=>assert.deepEqual([PRINTED_ARMOUR_ARTICLES_P118.filter(x=>x.material==='cloth').length,PRINTED_ARMOUR_ARTICLES_P118.filter(x=>x.material==='leather').length],[16,7]));
test('printed reference records structurally valid',()=>assert.equal(auditPrintedArmourArticles().valid,true));
test('sample rows retain printed values',()=>{assert.deepEqual(PRINTED_ARMOUR_ARTICLES_P118.filter(x=>x.name==='Cap'&&['cloth','leather','padded'].includes(x.material)).map(x=>[x.material,x.priceD,x.weightLb]),[['cloth',4,.2],['leather',16,.6],['padded',8,.3]]);});
test('duplicate IDs rejected',()=>assert.equal(auditPrintedArmourArticles([PRINTED_ARMOUR_ARTICLES_P118[0],PRINTED_ARMOUR_ARTICLES_P118[0]]).valid,false));
test('no unverified anatomical coverage',()=>assert.ok(PRINTED_ARMOUR_ARTICLES_P118.every(x=>!('coverage' in x)&&!('locationProtection' in x))));
