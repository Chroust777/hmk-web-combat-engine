import assert from 'node:assert/strict';
import {episodeHazardFollowup} from '../src/integration/hmk-episode-travel-detail.js';
let cases=0;
const verify=(hazard,roll,turn,defer=false)=>episodeHazardFollowup({hazard,directionD10:roll,directionTurn:turn,directionObservationDeferred:defer});
for(const hazard of ['misdirection','lost']){
 for(const turn of ['left','right']){
  assert.throws(()=>verify(hazard,null,turn,hazard==='misdirection'),/d10/);cases++;
 }
 // No dice: a genuine PENDING unresolved form is allowed and never finalized.
 const pending=verify(hazard,null,null);
 assert.equal(pending.result,'pending-direction');
 assert.equal(pending.requiresGMCompletion,true);cases++;
 for(let d10=1;d10<=10;d10++){
  const expected=d10%2?'left':'right';
  const other=expected==='left'?'right':'left';
  const legal=verify(hazard,d10,expected,hazard==='misdirection');
  assert.equal(legal.directionTurn,expected);cases++;
  assert.equal(legal.directionD10,d10);cases++;
  assert.equal(legal.requiresGMCompletion,false);cases++;
  assert.throws(()=>verify(hazard,d10,other),/lichému\/sudému/);cases++;
  assert.throws(()=>verify(hazard,d10,null),/lichému\/sudému/);cases++;
 }
 for(const die of [-1,0,11,1.5,NaN,'4']){
  assert.throws(()=>verify(hazard,die,'left'),/d10/);cases++;
 }
}
console.log('PASS v93.785 Direction Hazard dice/turn provenance, 2 branches, '+cases+' assertions');
