'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {missingPrintedArmourCatalogEntries}=require('../src/integration/armour-article-catalog.js');
const {armourColdFValues,coldLibrarySummary,clothingColdText,coldCatalogRule}=require('../src/integration/hmk-cold-gear-93740.js');
const {EXPEDITION_EQUIPMENT_P120}=require('../src/rules/possessions-printed.js');
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
const legacy=[];for(const name of ['HMK_ARMOUR_ARTICLES_P118','HMK_ARMOUR_ARTICLES_P118_MORE']){
 const m=source.match(new RegExp('const '+name+'=(\\[.*?\\]);','s'));assert.ok(m,name);legacy.push(...JSON.parse(m[1]));
}
const printed=missingPrintedArmourCatalogEntries(legacy);
assert.equal(legacy.length,21);assert.equal(printed.length,71); // remaining printed variants after original 21
const materialF={C:1,L:3,D:2,Q:3,G:5,K:4,S:5,M:3,P:5,cloth:1,leather:3,padded:2,quilted:3,gambeson:5,kurbul:4,scale:5,mail:3,plate:5};
let checks=0;
for(const item of [...legacy,...printed]){
 assert.equal(item.category,'armor');const value=materialF[item.properties.material];assert.notEqual(value,undefined,item.name);
 const actual=armourColdFValues(item);assert.deepEqual(actual,[value],item.name);
 const concise=coldLibrarySummary(item),detail=clothingColdText(item);
 assert.ok(concise.startsWith('F AV +'+value),item.name+' '+concise);
 assert.ok(detail.startsWith('F AV +'+value),item.name+' '+detail);
 assert.ok(!detail.includes('se započte do Area AV'),item.name);
 checks+=3;
}
assert.equal(checks,276);
// For an attested, wearable printed cloak, material F and extra Cold Hazard bonus are distinct.
const all=missingPrintedArmourCatalogEntries([]);
for(const [name,f,bonus] of [['Cloth Cloak',1,1],['Padded Cloak',2,2]]){
 const x=all.find(i=>i.name===name);assert.ok(x,name);
 assert.equal(coldCatalogRule(x)?.av,bonus,name);assert.ok(coldLibrarySummary(x).includes('F AV +'+f+' · plášť +'+bonus),name);
 assert.ok(clothingColdText(x).includes('Cold Hazard +'+bonus),name);checks+=3;
}
for(const [name,v] of [['Bedroll',1],['Bedroll, heavy',2],['Blanket',1],['Cloak (Cloth)',1],['Cloak (Padded)',2]]){
 const g=EXPEDITION_EQUIPMENT_P120.find(i=>i.name===name);assert.ok(g,name);
 const x={id:'hmk:gear:'+g.id,name:g.name,category:'other',builtin:true,properties:{weightLb:g.weightLb}};
 assert.equal(coldCatalogRule(x)?.av,v,name);assert.equal(coldLibrarySummary(x),'Cold +'+v);checks+=2;
}
const custom={name:'Vlastní zbroj',category:'armor',builtin:false,properties:{locationProtection:{sk:{f:1},tx:{F:3}}}};
assert.deepEqual(armourColdFValues(custom),[1,3]);assert.ok(clothingColdText(custom).includes('+1 až +3'));
const missing={name:'Bez doložených zón',category:'armor',properties:{}};
assert.equal(coldLibrarySummary(missing),'F AV —');assert.ok(clothingColdText(missing).includes('nebyla doložena'));
assert.ok(source.includes('esc(coldLibrarySummary(i))'));assert.ok(source.includes("'Chlad AV':'F AV"));assert.ok(source.includes("const APP_VERSION='93.762'"));
console.log('PASS v93.762 '+(checks+7)+' checks: all 92 original+new armour article labels, exact p117 material F, cloak bonuses, gear, and unknown/custom values');
