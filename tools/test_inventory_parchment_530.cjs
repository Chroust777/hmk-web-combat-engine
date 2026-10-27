'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const css=read('book-templates.css'),html=read('index.html'),app=read('app.js'),bundle=read('hmk-app.bundle.js');
const block=css.slice(css.indexOf('/* v93.530 — Shared parchment surface'),css.indexOf('.hsk-saved-proof'));
const checks=[
 ['v93.530 in index and app',()=>{
  assert.match(html,/HMK Keeper’s Ledger · v93\.530/);
  assert.match(app,/const APP_VERSION='93\.530'/);
 }],
 ['versioned stylesheets and bundle',()=>{
  assert.match(html,/book-templates\.css\?v=93\.530/);
  assert.match(html,/app\.js\?v=93\.530/);
  assert.match(bundle,/APP_VERSION = '93\.530'/);
 }],
 ['same original parchment asset on scrollport and sticky cells',()=>{
  assert.equal((block.match(/url\('\.\/assets\/ui\/components\/vellum_master\.png'\)/g)||[]).length,3);
 }],
 ['same fixed 1024px position for scrollport and item names',()=>{
  assert.match(block,/inv-ledger-section \.inv-table-scroll\{[\s\S]*?background-attachment:fixed!important;[\s\S]*?background-position:center center!important;/);
  assert.match(block,/tbody tr > th:first-child\{[\s\S]*?background-attachment:fixed!important;[\s\S]*?background-position:center center!important;/);
 }],
 ['no flat beige background survives in final sticky rule',()=>{
  const sticky=block.split('tbody tr > th:first-child{')[1].split('}')[0];
  assert.doesNotMatch(sticky,/--ill-paper|rgba\(86,60,29|background-image:none/);
  assert.match(sticky,/background-image:url/);
 }],
 ['sticky name still visible during horizontal scroll',()=>{
  assert.match(css,/\.inv-ledger-table tbody th:first-child\{position:sticky!important;left:0!important/);
 }],
 ['location-like table grid and 15 rows preserved',()=>{
  assert.match(css,/\.inv-ledger-section \.inv-table-scroll\.inv-15-rows\{max-height:650px!important/);
  assert.match(css,/\.folio-chapter-content \.inv-ledger-table tbody :is\(td,th\)\{[\s\S]*?border-bottom:1px solid rgba\(149,105,59,.25\)!important/);
 }],
 ['Skill Test evidence from v93.529 preserved',()=>{
  assert.match(bundle,/hsk-saved-proof/);
  assert.match(bundle,/skillReceipts/);
 }]
];
for(const [title,fn] of checks){fn();console.log('OK',title)}
console.log('PASS v93.530:',checks.length,'checks');
