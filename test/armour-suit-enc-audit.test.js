import test from 'node:test';
import assert from 'node:assert/strict';
import {auditSuitEnc} from '../src/integration/armour-suit-enc-audit.js';
test('all 12 printed suits reconcile ENC including p.118 arm condition',()=>{
 const r=auditSuitEnc();assert.equal(r.count,12);assert.equal(r.allMatched,true);
 assert.equal(r.allEncMatched,true,r.results.filter(x=>!x.encMatches).map(x=>x.name).join(','));
});
test('three or more conditional arm articles add ENC5 once',()=>{
 for(const name of ['Kûrbúl & Mail','Plate & Mail']){
  const suit=auditSuitEnc().results.find(x=>x.name===name);
  assert.ok(suit.conditionalArmCount>=3);
  assert.equal(suit.conditionalArmEnc,5);
  assert.equal(suit.computedEnc,40);
 }
});
test('two conditional arm articles do not trigger ENC5',()=>{
 const suit=auditSuitEnc().results.find(x=>x.name==='Kûrbúl Cuirass');
 assert.equal(suit.conditionalArmCount,2);assert.equal(suit.conditionalArmEnc,0);
});
test('precise article weight is not silently substituted for printed suit estimate',()=>{
 const suit=auditSuitEnc().results.find(x=>x.name==='Mail Byrnie');
 assert.equal(suit.printedEstimatedSuitWeightLb,20);
 assert.equal(suit.preciseArticleWeightLb,27.7);
 assert.equal(suit.weightIsEstimate,true);
});
test('unknown article fails ENC reconciliation closed',()=>{
 const r=auditSuitEnc({suits:[{name:'Synthetic',articles:['Not printed'],enc:0,weightLb:0}]});
 assert.equal(r.allEncMatched,false);assert.equal(r.results[0].encMatches,false);
});
test('all 12 printed suits reconcile Perception penalties (-5 and -10 p markers)',()=>{
 const r=auditSuitEnc();assert.equal(r.allPerceptionMatched,true,r.results.filter(x=>!x.perceptionMatches).map(x=>x.name).join(','));
 const plate=r.results.find(x=>x.name==='Plate & Mail');
 assert.equal(plate.computedPerceptionPenalty,20);
 assert.equal(plate.printedPerceptionPenalty,20);
});
