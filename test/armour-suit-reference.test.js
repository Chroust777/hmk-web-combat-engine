import test from 'node:test';
import assert from 'node:assert/strict';
import {HMK_ARMOUR_SUIT_NAMES,auditSuitDefinitions} from '../src/rules/armour-suit-reference.js';
test('HMK printed armour suit index contains twelve distinct names',()=>{assert.equal(HMK_ARMOUR_SUIT_NAMES.length,12);assert.equal(new Set(HMK_ARMOUR_SUIT_NAMES).size,12)});
test('empty catalogue does not claim complete suits',()=>{const a=auditSuitDefinitions([]);assert.equal(a.complete,false);assert.equal(a.missing.length,12)});
test('names alone do not count as complete suit definitions',()=>{const a=auditSuitDefinitions(HMK_ARMOUR_SUIT_NAMES.map(name=>({name,category:'armor',properties:{equipmentKind:'suit'}})));assert.equal(a.complete,false);assert.equal(a.incomplete.length,12)});
test('all components must have positive integral quantities',()=>{const a=auditSuitDefinitions(HMK_ARMOUR_SUIT_NAMES.map(name=>({name,category:'armor',properties:{equipmentKind:'suit',components:[{articleId:'x',quantity:0}]}})));assert.equal(a.complete,false)});
test('fully structured definitions pass structural validation only',()=>{const a=auditSuitDefinitions(HMK_ARMOUR_SUIT_NAMES.map(name=>({name,category:'armor',properties:{equipmentKind:'suit',components:[{articleId:'x',quantity:1}]}})));assert.equal(a.complete,true)});
