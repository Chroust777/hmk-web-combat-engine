import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_SUITS_P114,PRINTED_ARMOUR_SUITS_P113_114,auditPrintedSuits} from '../src/rules/armour-suit-printed.js';
test('page 114 three printed suits',()=>assert.deepEqual(PRINTED_ARMOUR_SUITS_P114.map(s=>s.name),['Kûrbúl Cuirass','Scale Byrnie','Mail Byrnie']));
test('page 114 price, ENC, PER, area and weight',()=>assert.deepEqual(PRINTED_ARMOUR_SUITS_P114.map(s=>[s.price,s.enc,s.per,s.area,s.weightLb]),[[500,5,0,'f4',20],[700,10,0,'f5',30],[800,5,0,'f4',20]]));
test('page 114 components',()=>assert.deepEqual(PRINTED_ARMOUR_SUITS_P114.map(s=>s.articles.length),[9,7,7]));
test('combined p113-114 validates',()=>assert.deepEqual([PRINTED_ARMOUR_SUITS_P113_114.length,auditPrintedSuits(PRINTED_ARMOUR_SUITS_P113_114).valid],[6,true]));
