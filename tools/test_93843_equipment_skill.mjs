import assert from 'node:assert/strict';
import {equipmentHazardSkill93843 as resolve} from '../src/integration/hmk-equipment-hazard-skill-93843.js';
const sample=(name,{category='other',properties={}}={})=>({id:'i-'+name,snapshot:{name,category,properties}});
const cases=[
 ['Cloth Tunic',{category:'armor',properties:{material:'cloth'}},'Textilecraft'],
 ['Cloth Tunic',{category:'other'},'Textilecraft'],
 ['Leather Vest',{category:'armor',properties:{material:'leather'}},'Hideworking'],
 ['Padded Cap',{category:'armor',properties:{material:'padded'}},'Textilecraft'],
 ['Rope, hemp, 50′',{},'Textilecraft'],
 ['Waterskin, 2 quart',{},'Hideworking'],
 ['Harness, horse',{},'Hideworking'],
 ['Saddle bag',{properties:{craftSkill:'H'}},'Hideworking'],
 ['Wheel, cart',{},'Woodworking'],
 ['Cart axle',{},'Woodworking'],
 ['Horseshoes, 4',{},'Metalcraft'],
 ['Iron nails',{properties:{material:'iron'}},'Metalcraft'],
 ['Wooden spoon',{properties:{craftSkill:'W'}},'Woodworking'],
 ['Cloth shirt',{properties:{craftSkill:'T'}},'Textilecraft'],
 ['Copper pot',{properties:{craftSkill:'M'}},'Metalcraft'],
 ['Leather flask',{properties:{craftSkill:'H'}},'Hideworking'],
 ['Unknown widget',{},null],
 ['Broadsword',{category:'weapon',properties:{material:'steel'}},null],
 ['Kite Shield',{category:'shield'},null],
];
let checks=0;
for(const [name,opts,expected] of cases){const r=resolve(sample(name,opts));assert.equal(r.skill,expected,name);checks++;
 assert.ok(r.reason&&typeof r.reason==='string',name+' explanation');checks++;
 if(expected)assert.ok(['catalog','material','hmk-148-example'].includes(r.source));else assert.ok(['special','unknown'].includes(r.source));checks++;
}
assert.equal(resolve(null).skill,null);checks++;
console.log('PASS HMK 148 equipment skill selection',checks,'assertions');
