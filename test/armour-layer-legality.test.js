import test from 'node:test';import assert from 'node:assert/strict';
import {checkArmourLayering} from '../src/integration/armour-layer-legality.js';
const a=(id,material,coveredLocations,layerOrder,name='Vest')=>({id,material,coveredLocations,layerOrder,name});
test('empty outfit is compatible',()=>assert.equal(checkArmourLayering([]).status,'compatible'));
test('mail over padded on thorax permitted',()=>assert.equal(checkArmourLayering([a('d','padded',['tx'],1),a('m','mail',['tx'],2)]).status,'compatible'));
test('no invented layer order',()=>assert.equal(checkArmourLayering([a('d','padded',['tx']),a('m','mail',['tx'])]).status,'unresolved'));
test('more than five overlapping articles rejected',()=>assert.equal(checkArmourLayering(Array.from({length:6},(_,i)=>a(String(i),'cloth',['tx'],i))).status,'violation'));
test('two padded articles in same zone rejected even disjoint locations',()=>assert.equal(checkArmourLayering([a('a','padded',['tx'],1),a('b','quilted',['ab'],2)]).status,'violation'));
test('unknown material rejected',()=>assert.equal(checkArmourLayering([a('x','mithril',['tx'],1)]).status,'violation'));
test('cloth below mail permitted',()=>assert.equal(checkArmourLayering([a('c','cloth',['tx'],1),a('m','mail',['tx'],2)]).status,'compatible'));
test('mail under gambeson is not a permitted column',()=>assert.equal(checkArmourLayering([a('m','mail',['tx'],1),a('g','gambeson',['tx'],2)]).status,'violation'));

test('explicit body zone excludes coat thigh from legs D/Q count',()=>{
 const coat={...a('coat','padded',['tx','th'],1,'Coat'),bodyZones:['torso']};
 const leg={...a('leg','quilted',['th'],2,'Cuisses'),bodyZones:['legs']};
 const result=checkArmourLayering([coat,leg]);
 assert.equal(result.zones.find(z=>z.zone==='legs').issues.some(i=>i.reason.includes('D/Q')),false);
 assert.equal(result.zones.find(z=>z.zone==='torso').issues.some(i=>i.reason.includes('D/Q')),false);
});
test('explicit body zone still checks physical thigh overlap',()=>{
 const coat={...a('coat','padded',['tx','th'],1,'Coat'),bodyZones:['torso']};
 const leg={...a('leg','quilted',['th'],2,'Cuisses'),bodyZones:['legs']};
 assert.ok(checkArmourLayering([coat,leg]).locations.some(l=>l.location==='th'&&l.articleIds.length===2));
});
test('invalid explicit zones are rejected',()=>assert.equal(checkArmourLayering([{...a('x','cloth',['th'],1),bodyZones:['nonsense']}]).status,'violation'));
test('duplicate article ids are rejected',()=>assert.equal(checkArmourLayering([a('same','cloth',['sk'],1),a('same','mail',['tx'],1)]).status,'violation'));

test('malformed coverage fails closed without throwing',()=>assert.equal(checkArmourLayering([{id:'x',material:'cloth',coveredLocations:'tx',layerOrder:1}]).status,'violation'));
test('duplicate coverage location fails closed',()=>assert.equal(checkArmourLayering([a('x','cloth',['tx','tx'],1)]).status,'violation'));
test('non-array outfit fails closed',()=>assert.equal(checkArmourLayering(null).status,'violation'));

test('missing article identifier is invalid, not auto-generated',()=>assert.equal(checkArmourLayering([{material:'cloth',coveredLocations:['tx'],layerOrder:1}]).status,'violation'));
test('blank article identifier is invalid',()=>assert.equal(checkArmourLayering([a('  ','cloth',['tx'],1)]).status,'violation'));
test('duplicate explicit body zones are invalid',()=>assert.equal(checkArmourLayering([{...a('x','cloth',['tx'],1),bodyZones:['torso','torso']}]).status,'violation'));
