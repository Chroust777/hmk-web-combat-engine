import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_SUITS_P113_116} from '../src/rules/armour-suit-printed.js';
import {PRINTED_SUIT_PROTECTION,SUIT_LOCATION_CODES} from '../src/rules/armour-all-suits-fixed.js';
import {resolvePrintedSuitProtection,selectPrintedSuitRigidStatus} from '../src/integration/printed-suit-combat.js';
// Independently transcribed location/aspect cells with printed boxes, pp.113–116.
const BOXES = {"Clothing": [], "Heavy Clothing": [], "Quilted Coat": ["sk:e", "sk:p"], "Kûrbúl Cuirass": ["sk:e", "sk:p", "sh:e", "sh:p", "ua:e", "ua:p", "tx:e", "tx:p", "ab:e", "ab:p"], "Scale Byrnie": ["sk:e", "sk:p", "sh:e", "sh:p", "ua:e", "ua:p", "tx:e", "tx:p", "ab:e", "ab:p"], "Mail Byrnie": ["sk:e", "sk:p", "sh:e", "sh:p", "ua:e", "ua:p", "tx:e", "tx:p", "ab:e", "ab:p"], "Gambeson": ["sk:e", "sk:p", "tx:e", "tx:p", "ab:e", "ab:p", "pv:e", "pv:p", "th:e", "th:p", "kn:e", "kn:p"], "Scale Habergeon": ["sk:e", "sk:p", "fa:e", "fa:p", "sh:e", "sh:p", "ua:e", "ua:p", "el:e", "el:p", "tx:e", "tx:p", "ab:e", "ab:p", "pv:e", "pv:p", "kn:e", "kn:p"], "Mail Habergeon": ["sk:e", "sk:p", "sh:e", "sh:p", "ua:e", "ua:p", "el:e", "el:p", "tx:e", "tx:p", "ab:e", "ab:p", "pv:e", "pv:p", "kn:e", "kn:p"], "Mail Hauberk": ["sk:e", "sk:p", "nk:e", "nk:p", "sh:e", "sh:p", "ua:e", "ua:p", "el:e", "el:p", "fo:e", "fo:p", "ha:e", "ha:p", "tx:e", "tx:p", "ab:e", "ab:p", "pv:e", "pv:p", "th:e", "th:p", "kn:e", "kn:p", "ca:e", "ca:p", "ft:e", "ft:p"], "Kûrbúl & Mail": ["sk:e", "sk:p", "fa:e", "fa:p", "nk:e", "nk:p", "sh:e", "sh:p", "ua:e", "ua:p", "el:e", "el:p", "fo:e", "fo:p", "ha:e", "ha:p", "tx:e", "tx:p", "ab:e", "ab:p", "pv:e", "pv:p", "th:e", "th:p", "kn:e", "kn:p", "ca:e", "ca:p", "ft:e", "ft:p"], "Plate & Mail": ["sk:e", "sk:p", "fa:e", "fa:p", "nk:e", "nk:p", "sh:e", "sh:p", "ua:e", "ua:p", "el:e", "el:p", "fo:e", "fo:p", "ha:e", "ha:p", "tx:e", "tx:p", "ab:e", "ab:p", "pv:e", "pv:p", "th:e", "th:p", "kn:e", "kn:p", "ca:e", "ca:p", "ft:e", "ft:p"]};
test('all 12 printed suits: independent graphical Rigid comparison for every AV cell',()=>{
 assert.equal(PRINTED_ARMOUR_SUITS_P113_116.length,12);
 let checked=0;
 for(const suit of PRINTED_ARMOUR_SUITS_P113_116){
  assert.ok(Object.hasOwn(BOXES,suit.name));
  for(const loc of SUIT_LOCATION_CODES)for(const [i,aspect] of ['b','e','p','f'].entries()){
   const r=resolvePrintedSuitProtection(suit.name,loc,aspect);
   assert.equal(r.ok,true);
   const printed=PRINTED_SUIT_PROTECTION[suit.name][loc][i];
   assert.equal(r.av[aspect],printed??0);
   assert.equal(r.rigid,printed!==null && BOXES[suit.name].includes(`${loc}:${aspect}`),`${suit.name} ${loc}/${aspect}`);
   checked++;
  }
 }
 assert.equal(checked,720);
});
test('boxed and unboxed values within same printed location are distinct',()=>{
 const edge=resolvePrintedSuitProtection('Plate & Mail','tx','e');
 const blunt=resolvePrintedSuitProtection('Plate & Mail','tx','b');
 assert.equal(edge.rigid,true);assert.equal(blunt.rigid,false);
 assert.equal(resolvePrintedSuitProtection('Clothing','tx','e').rigid,false);
 assert.equal(resolvePrintedSuitProtection('Clothing','sk','e').covered,false);
});

test('printed Rigid feeds combat injury input automatically, GM override is explicit',()=>{
 const edge=resolvePrintedSuitProtection('Plate & Mail','tx','e');
 const blunt=resolvePrintedSuitProtection('Plate & Mail','tx','b');
 assert.deepEqual(selectPrintedSuitRigidStatus(edge),{ok:true,status:'yes',source:'printed-boxed-AV-p113-116'});
 assert.deepEqual(selectPrintedSuitRigidStatus(blunt),{ok:true,status:'no',source:'printed-boxed-AV-p113-116'});
 assert.deepEqual(selectPrintedSuitRigidStatus(edge,'no'),{ok:true,status:'no',source:'gm-override'});
 assert.equal(selectPrintedSuitRigidStatus(null).ok,false);
});
