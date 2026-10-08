import test from 'node:test';
import assert from 'node:assert/strict';
import {auditArmourCoverage,validateArmourCoverage,requireVerifiedArmourCoverage} from '../src/integration/armour-coverage-readiness.js';
import {PRINTED_ARMOUR_ARTICLES_P118} from '../src/rules/armour-articles-printed.js';
test('verified anatomical rows are counted while remaining rows stay blocked',()=>{const a=auditArmourCoverage();assert.equal(a.total,92);assert.equal(a.ready,92);assert.equal(a.pending,0);assert.equal(a.matched,113);});
test('missing coverage cannot silently enter combat',()=>assert.throws(()=>requireVerifiedArmourCoverage({...PRINTED_ARMOUR_ARTICLES_P118.find(a=>a.id==='hmk118-plate-helm'),coverageMarkers:null}),/unverified/));
test('unknown anatomical code is rejected',()=>{const a={coverageSource:'HMK-p118-visual-verified',coveredLocations:['fake'],bodyZones:['head'],directionRestriction:'none',rigid:false};assert.equal(validateArmourCoverage(a).ready,false);});
test('duplicate locations are rejected',()=>{const a={coverageSource:'HMK-p118-visual-verified',coveredLocations:['sk','sk'],bodyZones:['head'],directionRestriction:'none',rigid:false};assert.equal(validateArmourCoverage(a).ready,false);});
test('complete explicitly verified row is accepted',()=>{const a={coverageSource:'HMK-p118-visual-verified',coveredLocations:['sk'],bodyZones:['head'],directionRestriction:'none',rigid:false,coverageMarkers:{sk:'standard'}};assert.equal(validateArmourCoverage(a).ready,true);});
