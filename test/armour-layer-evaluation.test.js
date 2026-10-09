import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateOrderedArmour as evaluate} from '../src/integration/armour-layer-evaluation.js';
const part=(id,material,location,layerOrder,name='Vest')=>({id,material,coveredLocations:[location],layerOrder,name});
test('padded underneath mail is compatible with physical order',()=>{
 const r=evaluate([part('d','padded','tx',0),part('m','mail','tx',1)]);
 assert.equal(r.status,'compatible');assert.equal(r.bulkPenalty,0);assert.equal(r.extraEnc,0);
});
test('mail underneath padded is not a free compatible arrangement',()=>{
 assert.equal(evaluate([part('m','mail','tx',0),part('d','padded','tx',1,'Cap')]).status,'violation');
});
test('missing physical order remains unresolved',()=>{
 assert.equal(evaluate([part('m','mail','tx',undefined)]).status,'unresolved');
});
test('two padded in torso violate D/Q zone restriction even at different locations',()=>{
 assert.equal(evaluate([part('d','padded','tx',0),part('q','quilted','ab',1)]).status,'violation');
});
test('GM-selected padded Bulk exception requires actual violation and charges -5',()=>{
 const r=evaluate([part('d','padded','tx',0),part('q','quilted','ab',1)],{bulkExceptionByZone:{torso:'d'}});
 assert.equal(r.status,'compatible');assert.equal(r.bulkPenalty,-5);
});
test('arbitrary Bulk exception is refused when no restriction was violated',()=>{
 assert.equal(evaluate([part('c','cloth','tx',0)],{bulkExceptionByZone:{torso:'c'}}).status,'violation');
});
test('invalid Bulk exception material cannot be nominated',()=>{
 assert.equal(evaluate([part('m','mail','tx',0)],{bulkExceptionByZone:{torso:'m'}}).status,'violation');
});
test('same exception may accumulate Bulk penalty across affected zones',()=>{
 const coat={...part('coat','padded','tx',2,'Coat'),coveredLocations:['tx','sh'],bodyZones:['torso','arms']};
 const under=[part('d1','padded','tx',0),part('d2','padded','sh',0)];
 const r=evaluate([...under,coat],{bulkExceptionByZone:{torso:'coat',arms:'coat'}});
 assert.equal(r.status,'compatible');assert.equal(r.bulkPenalty,-10);
});
test('last over padded coat requires additional ENC',()=>{
 const r=evaluate([part('m','mail','tx',0),part('coat','padded','tx',1,'Coat')]);
 assert.equal(r.status,'compatible');assert.equal(r.extraEnc,5);
});
test('duplicate article IDs rejected',()=>assert.equal(evaluate([part('a','cloth','tx',0),part('a','cloth','ab',0)]).status,'invalid'));

test('malformed article records are rejected without throwing',()=>{
 for(const value of [null,undefined,4,'invalid',[]]){
  assert.doesNotThrow(()=>evaluate([value]));
  assert.equal(evaluate([value]).status,'invalid');
 }
});
test('unknown Bulk zone cannot silently pass',()=>{
 const r=evaluate([part('c','cloth','tx',0)],{bulkExceptionByZone:{unknown:'c'}});
 assert.equal(r.status,'invalid');
 assert.match(r.errors.join(' '),/Unknown Bulk zone/);
});

test('a shared article must have at least one common table slot across anatomical locations',()=>{
 const shared={id:'shared',name:'Vest',material:'cloth',coveredLocations:['tx','ab'],layerOrder:1};
 const under={id:'under',name:'Vest',material:'cloth',coveredLocations:['tx'],layerOrder:0};
 const over={id:'over',name:'Vest',material:'cloth',coveredLocations:['ab'],layerOrder:2};
 const result=evaluate([under,shared,over]);
 assert.ok(['compatible','unresolved','violation'].includes(result.status));
 assert.equal(result.combatReady,false);
});

test('explicit slot for shared article is enforced across both anatomical locations',()=>{
 const shared={id:'shared',name:'Vest',material:'cloth',coveredLocations:['tx','ab'],layerOrder:0};
 const other={id:'mail',name:'Hauberk',material:'mail',coveredLocations:['tx','ab'],layerOrder:1};
 const r=evaluate([shared,other],{slotByArticleId:{shared:'underNear'}});
 assert.equal(r.status,'compatible');
 assert.equal(r.extraEnc,0);
});
test('incompatible explicitly requested shared slot is rejected',()=>{
 const shared={id:'shared',name:'Vest',material:'cloth',coveredLocations:['tx','ab'],layerOrder:0};
 const other={id:'mail',name:'Hauberk',material:'mail',coveredLocations:['tx','ab'],layerOrder:1};
 assert.equal(evaluate([shared,other],{slotByArticleId:{shared:'overFar'}}).status,'violation');
});

// A Bulk exemption must target the offending article, not a compliant bystander.
test('cloth bystander cannot waive a separate D/Q conflict',()=>{
 const items=[part('cloth','cloth','sh',0),part('padded','padded','tx',0),part('quilted','quilted','ab',1)];
 const r=evaluate(items,{bulkExceptionByZone:{torso:'cloth'}});
 assert.equal(r.status,'violation');
});
test('cloth in same zone but separate location cannot waive D/Q conflict',()=>{
 const items=[part('cloth','cloth','pv',0),part('padded','padded','tx',0),part('quilted','quilted','ab',1)];
 const r=evaluate(items,{bulkExceptionByZone:{torso:'cloth'}});
 assert.equal(r.status,'violation');
 assert.match(r.errors.join(' '),/not involved/);
});
test('padded participant may resolve a D/Q conflict',()=>{
 const items=[part('padded','padded','tx',0),part('quilted','quilted','ab',1)];
 assert.equal(evaluate(items,{bulkExceptionByZone:{torso:'padded'}}).status,'compatible');
});
