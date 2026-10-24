'use strict';
/** v93.456: fail-closed canonical source pool BEFORE physical random selection.
 * Source: HârnMaster v1.2 p.255. No persistence is authorised by this test.
 */
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const prior=require.extensions['.js'];require.extensions['.js']=(mod,p)=>{
 if(!p.includes('/src/'))return prior(mod,p);
 mod._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{
  fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const {neutralVortexSourceSelection:select,replayNeutralVortexSequence:replay}=require('../src/integration/hmk-neutral-vortex-sequence.js');
const a={id:'ward',category:'Active spell',spell:'Ward',wardLevel:2,duration:'Indefinite',protectsSourceId:'elixir',x:3,y:0,verified:true};
const b={id:'elixir',category:'Elixir',currentAS:4,protectedByWardId:'ward',x:3,y:0,verified:true};
const distant={id:'remote-rune',category:'Rune object',runecraftSI:5,x:300,y:300,verified:true};
const die={faces:2,value:2,origin:'GM-physical-die'};
const base={sources:[a,b,distant],origin:{x:0,y:0},radiusFeet:2.5,spellCL:3,
 physicalSelectionDie:die};
let n=0;const eq=(got,want)=>{assert.deepEqual(got,want);n++};
const bad=(f,re)=>{assert.throws(f,re);n++};
const snapshot=JSON.stringify(base);
const result=select(base);
eq(result.choices,['elixir','ward']);eq(result.selectedSourceId,'ward');
eq(result.selectionDie,die);eq(JSON.stringify(base),snapshot);
const mutate=(cb,re)=>{const x=structuredClone(base);cb(x);bad(()=>select(x),re)};
// Previously these returned a plausible-looking but incomplete random pool.
mutate(x=>x.sources.push({...distant,id:'fake',x:NaN}),/neověřený/);
mutate(x=>x.sources.push({...distant,id:'fake',verified:false}),/neověřený/);
mutate(x=>x.sources.push({...distant,id:'fake',category:'fake'}),/neověřená kategorie/);
mutate(x=>x.sources.push({...distant,id:'fake',runecraftSI:0}),/Runecraft SI/);
mutate(x=>x.sources.push({...distant}),/neunikátní/);
mutate(x=>x.sources.push(null),/neověřený/);
mutate(x=>x.sources.push({...distant,id:''}),/neověřený/);
mutate(x=>x.origin.x=Infinity,/geometrie/);
mutate(x=>x.origin.y=NaN,/geometrie/);
mutate(x=>x.radiusFeet=NaN,/geometrie/);
mutate(x=>x.radiusFeet=-20,/geometrie/);
mutate(x=>x.radiusFeet=6,/geometrie/);
mutate(x=>x.radiusFeet=50,/geometrie/);
mutate(x=>x.spellCL=7,/geometrie/);
mutate(x=>x.spellCL=0,/geometrie/);
mutate(x=>x.physicalSelectionDie.value=3,/fyzický dN/);
mutate(x=>x.physicalSelectionDie.faces=3,/fyzický dN/);
mutate(x=>x.sources[0].verified=false,/neověřený/);
mutate(x=>x.sources[1].currentAS=0,/aktuální AS/);
mutate(x=>x.sources[2].runecraftSI=0,/Runecraft SI/);
// Historical replay continues to derive the source choice in sorted order.
const only=[{id:'alchemy',category:'Elixir',currentAS:4,x:2,y:0,verified:true}];
const whole=replay({spellCL:1,origin:{x:0,y:0},sourceCensus:only,
 gmFullSourceHistoryConfirmed:true,ticks:[{roundOffset:0,sources:only,
 selectedSourceId:'alchemy',physicalSelectionDie:null,rolls:[{sourceId:'alchemy',d100:15}]}]});
eq(whole.ticks[0].sourceSelection.choices,['alchemy']);eq(whole.mayCommit,false);
console.log('PASS Neutral Vortex source selection provenance 456:',n,'checks');
