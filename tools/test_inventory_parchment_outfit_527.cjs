'use strict';
// UI-regression guard for v93.527. Validates DOM template and final CSS source;
// visual/computed-style behaviour is tested separately in a browser fixture.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'book-templates.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const checks = [
  ['Version matches release', () => assert.match(html, /HMK Keeper’s Ledger · v93\.530/)],
  ['Two established fieldset groups remain', () => {
    assert.match(app, /<fieldset class="hmk-outfit-action-group"><legend>Výbava u postavy<\/legend>/);
    assert.match(app, /<fieldset class="hmk-outfit-action-group"><legend>Převlékání z \/ do truhly<\/legend>/);
  }],
  ['Eight existing outfit actions remain connected', () => {
    for (const action of [
      'data-outfit-action="armour"', 'data-outfit-action="undress-armour"',
      'data-outfit-action="clothing"', 'data-outfit-action="undress-clothing"',
      'data-chest-outfit="armour"', 'data-outfit-action="undress-chest-armour"',
      'data-chest-outfit="clothing"', 'data-outfit-action="undress-chest-clothing"'
    ]) assert.ok(app.includes(action), action);
  }],
  ['Outfit actions are vertical, unframed and two-column', () => {
    const start = css.indexOf('/* v93.527 — restore the proven four-button vertical wardrobe layout.');
    const end = css.indexOf('/* v93.525 — Arsenal inventory tables align', start);
    assert.ok(start >= 0 && end > start);
    const rule = css.slice(start, end);
    for (const expected of ['grid-template-columns:repeat(2,minmax(0,1fr))',
      'flex-direction:column!important', 'border:0!important', 'background:transparent!important'])
      assert.ok(rule.includes(expected), expected);
  }],
  ['Pinned item names share identical parchment with other cells', () => {
    const marker = css.indexOf('/* v93.530 — Shared parchment surface');
    assert.ok(marker >= 0);
    const last = css.slice(marker,css.indexOf('.hsk-saved-proof',marker));
    assert.match(last,/inv-ledger-section \.inv-table-scroll\{[\s\S]*?vellum_master\.png/);
    assert.match(last,/tbody tr > th:first-child\{[\s\S]*?vellum_master\.png/);
    assert.match(last,/background-attachment:fixed!important/);
    assert.doesNotMatch(last,/background:var\(--ill-paper\)/);
  }],
  ['Inventory retains table scroll and fixed item names', () => {
    assert.match(css, /\.inv-ledger-table tbody th:first-child\{position:sticky!important;left:0!important/);
    assert.match(app, /class="inv-table-scroll inv-15-rows"/);
  }],
];
for (const [name, check] of checks) {check(); process.stdout.write(`OK ${name}\n`);}
process.stdout.write(`${checks.length} UI regression checks passed\n`);
