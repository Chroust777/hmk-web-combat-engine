import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_SUITS_P115,PRINTED_ARMOUR_SUITS_P113_115,auditPrintedSuits} from '../src/rules/armour-suit-printed.js';
test('page 115 suit names',()=>assert.deepEqual(PRINTED_ARMOUR_SUITS_P115.map(s=>s.name),['Gambeson','Scale Habergeon','Mail Habergeon']));
test('page 115 summary columns',()=>assert.deepEqual(PRINTED_ARMOUR_SUITS_P115.map(s=>[s.price,s.enc,s.per,s.area,s.weightLb]),[[800,10,0,'f6',30],[950,15,5,'f6',40],[1100,10,0,'f5',30]]));
test('page 115 item counts',()=>assert.deepEqual(PRINTED_ARMOUR_SUITS_P115.map(s=>s.articles.length),[9,11,8]));
test('nine printed suits pass structural audit',()=>assert.deepEqual([PRINTED_ARMOUR_SUITS_P113_115.length,auditPrintedSuits(PRINTED_ARMOUR_SUITS_P113_115).valid],[9,true]));
test('no duplicate suit names or missing page provenance',()=>{assert.equal(new Set(PRINTED_ARMOUR_SUITS_P113_115.map(s=>s.name)).size,9);assert.ok(PRINTED_ARMOUR_SUITS_P115.every(s=>s.page===115));});
