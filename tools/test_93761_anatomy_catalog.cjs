'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {BESTIARY_ENTRIES_564}=require('../src/integration/hmk-bestiary-runtime-564.js');
const {creatureVisibleAnatomy93761}=require('../src/integration/hmk-bestiary-visible-anatomy-93761.js');
const {renderFullCreatureStats565}=require('../src/integration/hmk-bestiary-native-ui-565.js');
let checks=0;const ok=(a,b)=>{assert.ok(a,b);checks++};const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
const ids=new Set();const groups={};
for(const e of BESTIARY_ENTRIES_564){
 ok(!ids.has(e.id),'duplicate creature '+e.id);ids.add(e.id);
 const r=creatureVisibleAnatomy93761(e);ok(r&&['table','conditional','special'].includes(r.kind),'no anatomy output '+e.id);
 ok(Number.isInteger(r.page)&&r.page>=167&&r.page<=401,'missing HMK source '+e.id);
 const html=renderFullCreatureStats565(e);ok(html.includes('Anatomické zóny · zásahová tabulka'),'visible anatomy missing '+e.id);
 ok(html.includes('HMK str.'),'source page missing '+e.id);
 if(r.kind==='table'){
  ok(r.rows.length>0,'empty table '+e.id);ok(html.includes('<table class="hmk-native-data-table">'),'missing visible table '+e.id);
  const zones=new Set();for(const [zn,locations] of r.rows){
   ok(typeof zn==='string'&&typeof locations==='string'&&locations.length>0,'invalid row '+e.id);
   const match=zn.match(/^(\d+)(?:–(\d+))?$/);ok(match,'invalid zone interval '+e.id+' '+zn);
   const start=Number(match[1]),end=Number(match[2]??start);ok(end>=start,'bad zone order');
   for(let i=start;i<=end;i++){if(!e.group.startsWith('Animals'))ok(!zones.has(i),'overlapping ZN '+e.id+' '+i);zones.add(i)}
  }
  const highest=Math.max(...zones);eq(zones.size,highest);
  ok(!html.includes('bestiaryAnatomyMissing'),'render missing sentinel');
 }else ok(!html.includes('Anatomie · tabulka a (') ,'fabricated animal anatomy '+e.id);
 groups[r.kind]=(groups[r.kind]||0)+1;
}
eq(ids.size,94);eq(groups.table,79);eq(groups.special,2);eq(groups.conditional,13);
// Representative source-table identity checks and explicit absence of fabricated anatomy.
const by=id=>creatureVisibleAnatomy93761(BESTIARY_ENTRIES_564.find(x=>x.id===id));
eq(by('bovine').page,355);eq(by('wolf').page,355);eq(by('gargu-arak-370').page,371);
eq(by('malak-368').page,368);eq(by('mature-dragon-388').rows.at(-1)[0],'45–50');
eq(by('old-dragon-388').rows.at(-1)[0],'89–100');eq(by('vii-8th-order-400').page,400);eq(by('rural-farmer-364')?.rows?.[0]?.[1], '1–5 Skull; 6–8 Face; 9–10 Neck');eq(by('vii-8th-order-400').rows.find(r=>r[0]==='6')[1], '9–10 Wing (LN 1–8 not assigned in printed table)');
ok(by('ghost-396').kind==='conditional');ok(by('ivashu-generated-species-376').kind==='conditional');
ok(by('savir-s-aura-362').kind==='conditional');
console.log('PASS',checks,'assertions; all',ids.size,'Bestiary entries have an immediate source-anchored anatomy block; physical tables',groups.table,'special bodies',groups.special,'conditional/unformed',groups.conditional);
