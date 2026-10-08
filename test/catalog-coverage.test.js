import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogCoverage,HMK_EQUIPMENT_SECTIONS} from '../src/integration/catalog-coverage.js';
test('source coverage includes twelve armour suits as separate target',()=>{const s=HMK_EQUIPMENT_SECTIONS.find(x=>x.id==='suits');assert.equal(s.minimum,12);assert.equal(s.pages,'113–116')});
test('generic armour items are not misrepresented as suits',()=>{const r=catalogCoverage([{category:'armor',name:'Mail shirt'}]);assert.equal(r.sections.find(x=>x.id==='suits').count,0);assert.equal(r.sections.find(x=>x.id==='suits').complete,false)});
test('explicit twelve suit definitions satisfy structural minimum',()=>{const items=Array.from({length:12},(_,i)=>({category:'armor',properties:{equipmentKind:'suit'},name:`Suit ${i}`}));assert.equal(catalogCoverage(items).sections.find(x=>x.id==='suits').complete,true)});
test('unknown totals remain unverified, not fabricated',()=>{const r=catalogCoverage([{category:'weapon'}]);assert.equal(r.sections.find(x=>x.id==='weapons').complete,false);assert.equal(r.counts.weapon,1)});
test('invalid inputs fail closed',()=>assert.throws(()=>catalogCoverage({}),TypeError));
