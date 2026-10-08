import test from 'node:test';
import assert from 'node:assert/strict';
import {validateArmourLayers} from '../src/rules/armour-layer-validator.js';
const a=(material,name='Cap',zone='head')=>({id:material+name,material,name,bodyZones:[zone],coveredLocations:['sk']});
test('empty loadout is not a certified combat result',()=>assert.equal(validateArmourLayers([]).combatReady,false));
test('rejects unknown material',()=>assert.equal(validateArmourLayers([a('unknown')]).valid,false));
test('five layer ceiling',()=>assert.match(validateArmourLayers(Array.from({length:6},(_,i)=>a('cloth',`Cap${i}`))).errors.join(),/five layers/));
test('simple padded under plate plausible but not certified',()=>{const r=validateArmourLayers([a('padded'),a('plate')]);assert.equal(r.zoneResults.head.plausible,true);assert.equal(r.combatReady,false)});
test('D and Q coexistence requires review',()=>assert.match(validateArmourLayers([a('padded'),a('quilted')]).warnings.join(),/padded\/quilted/));
test('unresolved ordering is never combat ready',()=>assert.equal(validateArmourLayers([a('mail'),a('plate')]).combatReady,false));
test('six separate-location articles do not violate five layers per location',()=>{
 const loc=['sk','fa','nk','sh','ua','el'];
 const r=validateArmourLayers(loc.map((l,i)=>({...a('cloth',`Piece${i}`),id:`piece${i}`,coveredLocations:[l]})));
 assert.equal(r.errors.length,0);
 assert.equal(Object.keys(r.zoneResults.head.locations).length,6);
});
test('six overlapping articles exceed five layers at the shared location',()=>{
 const r=validateArmourLayers(Array.from({length:6},(_,i)=>({...a('cloth',`Piece${i}`),id:`piece${i}`})));
 assert.match(r.errors.join(),/head\/sk: exceeds five layers/);
});
test('padded and quilted on distinct locations are not automatically a violation',()=>{
 const r=validateArmourLayers([a('padded','Cap'),{...a('quilted','Cowl'),coveredLocations:['fa']}]);
 assert.equal(r.warnings.some(w=>w.includes('multiple padded/quilted')),false);
});
test('invalid anatomical location is rejected',()=>{
 assert.equal(validateArmourLayers([{...a('cloth'),coveredLocations:['bogus']}]).valid,false);
});

test('duplicate article IDs are rejected before layer evaluation',()=>{
 const r=validateArmourLayers([a('cloth'),a('cloth')]);
 assert.match(r.errors.join(),/Duplicate armour article ID/);
 assert.equal(r.combatReady,false);
});
test('duplicate anatomical locations in one article are rejected',()=>{
 const r=validateArmourLayers([{...a('cloth'),coveredLocations:['sk','sk']}]);
 assert.match(r.errors.join(),/Duplicate anatomical location/);
});
test('duplicate body zones in one article are rejected',()=>{
 const r=validateArmourLayers([{...a('cloth'),bodyZones:['head','head']}]);
 assert.match(r.errors.join(),/Duplicate body zone/);
});
test('article without stable ID is rejected',()=>{
 const {id,...article}=a('cloth');
 assert.match(validateArmourLayers([article]).errors.join(),/Missing armour article ID/);
});

test('whitespace-equivalent IDs are rejected as duplicates',()=>{
 const r=validateArmourLayers([a('cloth'),{...a('cloth'),id:' clothCap '}]);
 assert.match(r.errors.join(),/Duplicate armour article ID/);
});
test('missing or non-string names fail closed',()=>{
 for(const name of [undefined,42,'  ']){
  const r=validateArmourLayers([{...a('cloth'),name}]);
  assert.equal(r.valid,false);
  assert.match(r.errors.join(),/Invalid armour article name/);
 }
});
