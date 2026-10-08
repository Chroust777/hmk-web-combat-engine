import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_SUITS_P113,auditPrintedSuits} from '../src/rules/armour-suit-printed.js';
test('printed p113 includes three named suits',()=>assert.deepEqual(PRINTED_ARMOUR_SUITS_P113.map(x=>x.name),['Clothing','Heavy Clothing','Quilted Coat']));
test('printed p113 summaries pass structural checks',()=>assert.equal(auditPrintedSuits().valid,true));
test('printed p113 contains original component lists',()=>assert.deepEqual(PRINTED_ARMOUR_SUITS_P113.map(x=>x.articles.length),[4,7,7]));
test('duplicate suit is rejected',()=>assert.equal(auditPrintedSuits([PRINTED_ARMOUR_SUITS_P113[0],PRINTED_ARMOUR_SUITS_P113[0]]).valid,false));
