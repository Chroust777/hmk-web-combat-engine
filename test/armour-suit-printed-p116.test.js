import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_SUITS_P116,PRINTED_ARMOUR_SUITS_P113_116,auditPrintedSuits} from '../src/rules/armour-suit-printed.js';
test('p116 contains all three named suits',()=>assert.deepEqual(PRINTED_ARMOUR_SUITS_P116.map(s=>s.name),['Mail Hauberk','Kûrbúl & Mail','Plate & Mail']));
test('p116 printed summary values',()=>assert.deepEqual(PRINTED_ARMOUR_SUITS_P116.map(s=>[s.price,s.enc,s.per,s.area,s.weightLb]),[[2000,25,10,'f6',60],[2500,40,15,'f8',80],[3200,40,20,'f9',90]]));
test('p116 printed component counts',()=>assert.deepEqual(PRINTED_ARMOUR_SUITS_P116.map(s=>s.articles.length),[11,16,17]));
test('all twelve suits structurally valid and unique',()=>assert.deepEqual([PRINTED_ARMOUR_SUITS_P113_116.length,auditPrintedSuits(PRINTED_ARMOUR_SUITS_P113_116).valid,new Set(PRINTED_ARMOUR_SUITS_P113_116.map(s=>s.name)).size],[12,true,12]));
