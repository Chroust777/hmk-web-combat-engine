import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateOrderedArmour} from '../src/integration/armour-layer-evaluation.js';
const item=(id,material,layerOrder,name='Vest')=>({id,material,layerOrder,name,coveredLocations:['tx']});
test('invalid slot mapping is rejected rather than silently ignored',()=>{
 assert.equal(evaluateOrderedArmour([item('a','cloth',0)],{slotByArticleId:{missing:'base'}}).status,'invalid');
 assert.equal(evaluateOrderedArmour([item('a','cloth',0)],{slotByArticleId:{a:'unknown'}}).status,'invalid');
});
test('explicit slot assignment enforces physically compatible column',()=>{
 const articles=[item('d','padded',0),item('m','mail',1)];
 assert.equal(evaluateOrderedArmour(articles,{slotByArticleId:{d:'underNear',m:'base'}}).status,'compatible');
 assert.equal(evaluateOrderedArmour(articles,{slotByArticleId:{d:'overNear',m:'base'}}).status,'violation');
});
test('a D/Q far over assignment adds five ENC only with valid slot',()=>{
 const articles=[item('m','mail',0),item('d','padded',1,'Coat')];
 const result=evaluateOrderedArmour(articles,{slotByArticleId:{m:'base',d:'overFar'}});
 assert.equal(result.status,'compatible');assert.equal(result.extraEnc,5);
});
