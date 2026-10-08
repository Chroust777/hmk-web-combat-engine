import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPrintedSuitLayers} from '../src/integration/armour-suit-layer-audit.js';
test('all twelve printed suits are audited without automatic certification',()=>{
 const audit=auditPrintedSuitLayers();
 assert.equal(audit.suitCount,12);
 assert.equal(audit.allMatched,true);
 assert.equal(audit.results.reduce((sum,r)=>sum+r.articleCount,0),113);
 assert.ok(audit.results.every(r=>r.combatReady===false&&r.verifiedOrder===false));
});
test('unknown suit component is surfaced as an issue rather than silently equipped',()=>{
 const audit=auditPrintedSuitLayers({suits:[{name:'Synthetic',page:113,enc:0,weightLb:0,articles:['Missing mystery item']} ]});
 assert.equal(audit.allMatched,false);
 assert.match(audit.results[0].issues.join(' '),/unmatched/);
});
