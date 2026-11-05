'use strict';
/** v93.738 regression: inactive rule rolls lock all three controls.
 * Source contract test supplements (not replaces) the Chromium click test. */
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const book=fs.readFileSync(path.join(root,'book-templates.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const docs=fs.readFileSync(path.join(root,'docs/PRAVIDLO_POTVRZOVANI_GM.md'),'utf8');
let count=0;
const has=(src,expr,label)=>{assert.match(src,expr,label);count++};
has(app,/const APP_VERSION='93\.742'/,'version');
has(app,/data-malnutrition-course class="hc-party-health-row"[\s\S]{0,1400}input name="roll" type="number"[^>]*\$\{clock\.minute<t\.dueMinute\|\|t\.mode==='pending'/,'party roll disabled at blocked term');
has(app,/data-malnutrition-course><strong[\s\S]{0,1500}<input name="roll" type="number"[^>]*\$\{clock\.minute<t\.dueMinute\|\|t\.mode==='pending'/,'personal roll disabled at blocked term');
has(app,/data-malnutrition-die="yes"[^>]*\$\{clock\.minute<t\.dueMinute\|\|t\.mode==='pending'/,'dice generator locked');
has(app,/if\(!form\|\|button\.disabled\|\|input\?\.disabled\|\|form\.querySelector\('button\[type="submit"\]'\)\?\.disabled\)return/,'stale click guarded');
has(app,/if\(form\.querySelector\('button\[type="submit"\]'\)\?\.disabled\|\|form\.elements\.namedItem\('roll'\)\?\.disabled\)return/,'synthetic submit guarded');
has(app,/dice\.disabled=expected===0/,'zero training dice lock');
has(app,/minute!==w\.grimDueMinute\?'disabled title="Hod až v termínu"'/,'animal grim term');
has(app,/minute!==health\.comaDueMinute\?'disabled title="Hod až v termínu"'/,'animal coma term');
has(styles,/--hmk-font-heading:var\(--hmk-book-title-font/,'heading token');
has(styles,/--hmk-font-body:var\(--hmk-book-body-font/,'body token');
has(styles,/#app :is\(p,span,div,li,dt,dd,td,th,label/,'site-wide body family');
has(book,/journal-fatigue-inline-edit[\s\S]*?background:rgba\(251,242,222,\.38\)!important/,'fatigue parchment');
has(book,/journal-inline-skills :is\(\.hsk-edit-detail,\.catalog-spec\) :is\(th:first-child,td:first-child\)/,'sticky skills parchment');
has(html,/93\.742/,'cache busting');
has(docs,/Globální zásady UI od v93\.738/,'durable contract');
console.log('PASS v93.738 static UI contract '+count+' checks');
