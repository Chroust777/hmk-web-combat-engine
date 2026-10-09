import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTED_ARMOUR_SUITS_P113_116,auditPrintedSuits} from '../src/rules/armour-suit-printed.js';
import {auditSuitEnc} from '../src/integration/armour-suit-enc-audit.js';
import {reconcileSuitArticles} from '../src/integration/armour-suit-article-crosswalk.js';
import {PRINTED_ARMOUR_ARTICLES_P118} from '../src/rules/armour-articles-printed.js';

test('v92 checkpoint: all 12 official suit definitions are distinct and valid',()=>{
 const suits=PRINTED_ARMOUR_SUITS_P113_116;
 assert.equal(suits.length,12);
 assert.equal(auditPrintedSuits(suits).valid,true);
 assert.deepEqual([113,114,115,116].map(page=>suits.filter(s=>s.page===page).length),[3,3,3,3]);
});
test('v92 checkpoint: all 12 suits reconcile their printed ENC and Perception without auto-equipping',()=>{
 const report=auditSuitEnc();
 assert.equal(report.count,12);
 assert.equal(report.allMatched,true);
 assert.equal(report.allEncMatched,true);
 assert.equal(report.allPerceptionMatched,true);
});
test('v92 checkpoint: all printed suit components have catalog crosswalk',()=>{
 const crosswalk=reconcileSuitArticles({suits:PRINTED_ARMOUR_SUITS_P113_116,articles:PRINTED_ARMOUR_ARTICLES_P118});
 assert.equal(crosswalk.entries.filter(x=>x.status!=='matched').length,0);
 assert.equal(crosswalk.entries.length,PRINTED_ARMOUR_SUITS_P113_116.reduce((n,s)=>n+s.articles.length,0));
});
