import test from 'node:test';
import assert from 'node:assert/strict';
import {ARMOUR_LAYER_COLUMNS,ARMOUR_LAYER_NOTES} from '../src/rules/armour-layer-reference.js';
test('all nine printed materials in fixed order',()=>assert.deepEqual(ARMOUR_LAYER_COLUMNS.map(x=>x.code),['C','L','D','Q','G','K','S','M','P']));
test('mail permits padded under and KP immediately over',()=>{const m=ARMOUR_LAYER_COLUMNS.find(x=>x.code==='M');assert.equal(m.underNear,'CD');assert.equal(m.overNear,'KP')});
test('plate permits CD below and no immediate over layer',()=>{const p=ARMOUR_LAYER_COLUMNS.find(x=>x.code==='P');assert.equal(p.underNear,'CD');assert.equal(p.overNear,'•')});
test('restricted second over column is documented',()=>assert.ok(ARMOUR_LAYER_NOTES.some(x=>x.includes('5 ENC'))));
test('all reference rows contain exactly five printed columns',()=>{for(const x of ARMOUR_LAYER_COLUMNS)assert.deepEqual(Object.keys(x),['code','underFar','underNear','base','overNear','overFar'])});
