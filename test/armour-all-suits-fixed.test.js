import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_SUIT_PROTECTION,printedSuitAV,SUIT_LOCATION_CODES} from '../src/rules/armour-all-suits-fixed.js';
import {PRINTED_ARMOUR_SUITS_P113_116} from '../src/rules/armour-suit-printed.js';
const expected = {
  "Clothing": ".,.,.,.;.,.,.,.;.,.,.,.;.,1,.,1;.,1,.,1;.,1,.,1;.,.,.,.;.,.,.,.;.,2,.,2;.,2,.,2;.,2,.,2;.,1,.,1;.,1,.,1;.,1,.,1;.,1,.,1",
  "Heavy Clothing": "1,2,1,3;.,.,.,.;.,.,.,.;2,4,1,4;2,3,1,3;.,1,.,1;.,1,.,1;.,.,.,.;2,4,1,4;2,4,1,4;.,3,.,3;.,2,.,2;.,2,.,2;.,1,.,1;1,3,1,4",
  "Quilted Coat": "6,8,6,6;.,.,.,.;.,.,.,.;4,4,2,4;4,4,2,4;4,4,2,4;4,3,2,3;.,.,.,.;4,4,2,4;4,4,2,4;4,5,2,5;4,5,2,5;.,2,.,2;.,1,.,1;1,3,1,4",
  "Kûrbúl Cuirass": "8,13,10,7;.,.,.,.;.,.,.,.;6,8,6,6;6,8,6,6;2,2,1,2;2,2,1,2;.,.,.,.;6,8,6,6;6,8,6,6;2,3,1,3;.,1,.,1;.,1,.,1;1,4,1,5;1,3,1,4",
  "Scale Byrnie": "8,13,10,7;.,.,.,.;.,.,.,.;6,10,6,7;6,10,6,7;2,2,1,2;2,2,1,2;.,.,.,.;6,10,6,7;6,10,6,7;2,3,1,3;2,3,1,3;.,1,.,1;1,4,1,5;1,3,1,4",
  "Mail Byrnie": "8,13,10,7;.,.,.,.;.,.,.,.;4,10,8,5;4,10,8,5;2,2,1,2;.,.,.,.;.,.,.,.;4,10,8,5;4,10,8,5;2,3,1,3;.,1,.,1;.,1,.,1;1,4,1,5;1,3,1,4",
  "Gambeson": "8,13,10,7;.,.,.,.;6,5,4,5;6,5,4,5;6,5,4,5;6,5,4,5;6,5,4,5;.,.,.,.;6,6,4,6;6,6,4,6;6,6,4,6;8,8,5,8;6,9,6,7;1,3,1,4;1,3,1,4",
  "Scale Habergeon": "8,13,10,7;6,11,9,5;.,.,.,.;10,16,11,11;6,10,6,7;10,16,11,11;2,2,1,2;1,2,1,3;6,10,6,7;6,10,6,7;6,11,6,8;4,5,2,5;6,9,6,7;3,4,2,5;3,4,2,5",
  "Mail Habergeon": "8,13,10,7;.,.,.,.;.,.,.,.;4,10,8,5;4,10,8,5;4,10,8,5;2,2,1,2;.,.,.,.;4,10,8,5;4,10,8,5;4,11,8,6;4,5,2,5;6,9,6,7;3,4,2,5;3,4,2,5",
  "Mail Hauberk": "4,10,8,5;.,.,.,.;4,10,8,5;4,10,8,5;4,10,8,5;10,21,17,10;4,10,8,5;4,10,8,5;4,10,8,5;4,10,8,5;4,11,8,6;8,21,16,11;10,22,17,11;4,10,8,5;4,10,8,5",
  "Kûrbúl & Mail": "10,21,17,10;6,11,9,5;4,10,8,5;8,16,13,9;8,16,13,9;8,16,13,9;4,10,8,5;4,10,8,5;8,16,13,9;8,16,13,9;4,11,8,6;8,21,16,11;8,17,13,10;10,21,17,10;4,10,8,5",
  "Plate & Mail": "10,21,17,10;6,11,9,5;10,21,17,10;10,21,17,10;10,21,17,10;10,21,17,10;10,21,17,10;4,10,8,5;10,21,17,10;10,21,17,10;4,11,8,6;8,21,16,11;10,22,17,11;10,21,17,10;4,10,8,5"
};
test('twelve printed suits, 180 locations and 720 cells, including uncovered dots',()=>{
 assert.deepEqual(Object.keys(PRINTED_SUIT_PROTECTION),PRINTED_ARMOUR_SUITS_P113_116.map(x=>x.name));
 assert.equal(Object.keys(expected).length,12);
 for(const [name,encoded] of Object.entries(expected)){
  const rows=encoded.split(';');assert.equal(rows.length,15);
  for(const [i,loc] of SUIT_LOCATION_CODES.entries()){
   const values=rows[i].split(',').map(x=>x==='.'?null:Number(x));
   assert.deepEqual(PRINTED_SUIT_PROTECTION[name][loc],values,`${name} ${loc}`);
   for(const [j,a] of ['b','e','p','f'].entries()){
    const result=printedSuitAV(name,loc,a);assert.equal(result.ok,true);
    assert.equal(result.av,values[j]);assert.equal(result.rigid,null);
   }
  }
 }
});
test('unknowns and printed dots do not become zero or fabricated rigid',()=>{
 assert.equal(printedSuitAV('Clothing','sk','e').av,null);
 assert.equal(printedSuitAV('Clothing','sh','e').av,1);
 assert.equal(printedSuitAV('Clothing','sh','e').rigid,null);
 assert.equal(printedSuitAV('bogus','sh','e').ok,false);
});
