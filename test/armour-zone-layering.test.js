import test from 'node:test';
import assert from 'node:assert/strict';
import {auditArmourLoadout} from '../src/integration/armour-loadout-audit.js';
const av={b:2,e:2,p:1,f:2};
const article=(id,material,locations)=>({id,slot:'worn',quantity:1,snapshot:{name:id,category:'armor',properties:{material,locationProtection:Object.fromEntries(locations.map(l=>[l,av]))}}});
test('p117 padded and quilted articles in same body zone flag manual review',()=>{
 const r=auditArmourLoadout([article('a','D',['tx']),article('b','Q',['ab'])]);
 assert.equal(r.complete,false);assert.ok(r.warnings.some(w=>w.zone==='torso'));
});
test('different body zones do not trigger padded/quilted warning',()=>{
 const r=auditArmourLoadout([article('a','D',['sk']),article('b','Q',['tx'])]);
 assert.equal(r.complete,true);assert.equal(r.zones.length,4);
});
test('material aliases resolve both single letter and full name',()=>{
 const r=auditArmourLoadout([article('a','padded',['sk']),article('b','D',['fa'])]);
 assert.ok(r.warnings.some(w=>w.zone==='head'));
});
test('unknown material makes armour subtotal non-final',()=>{
 const r=auditArmourLoadout([article('a','unknown',['ft'])]);
 assert.equal(r.complete,false);assert.ok(r.warnings.some(w=>w.zone==='legs'));
});
