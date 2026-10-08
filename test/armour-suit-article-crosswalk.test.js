import test from 'node:test';import assert from 'node:assert/strict';
import {reconcileSuitArticles} from '../src/integration/armour-suit-article-crosswalk.js';
test('all twelve printed suits are checked without inventing article coverage',()=>{const r=reconcileSuitArticles();assert.equal(r.suits,12);assert.ok(r.parts>80);assert.equal(r.parts,r.matched+r.unmatched.length+r.ambiguous.length);assert.ok(r.entries.every(e=>e.status==='matched'||e.articleId===null));});
test('unknown article is not silently mapped',()=>{const r=reconcileSuitArticles({suits:[{name:'test',page:113,articles:['Dragon Scale Crown']}],articles:[]});assert.equal(r.matched,0);assert.equal(r.unmatched.length,1);});
test('ambiguous matching is rejected',()=>{const article={material:'cloth',name:'Cap',id:'x'};const r=reconcileSuitArticles({suits:[{name:'test',page:113,articles:['Cloth Cap']}],articles:[article,{...article,id:'y'}]});assert.equal(r.ambiguous.length,1);assert.equal(r.entries[0].articleId,null);});
