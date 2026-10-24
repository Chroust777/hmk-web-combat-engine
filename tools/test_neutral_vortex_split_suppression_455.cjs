'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const before=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return before(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{
  fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const {replayNeutralVortexSequence}=require('../src/integration/hmk-neutral-vortex-sequence.js');
const {neutralVortexRoundPreflight}=require('../src/integration/hmk-neutral-vortex-round-preflight.js');
const elixir={id:'elixir',category:'Elixir',currentAS:6,protectedByWardId:'ward',x:3,y:0,verified:true};
const ward={id:'ward',category:'Active spell',spell:'Ward',wardLevel:3,duration:'Indefinite',protectsSourceId:'elixir',x:3,y:0,verified:true};
const census=[elixir,ward],die={faces:2,value:2,origin:'GM-physical-die'};
const ticks=[
 {roundOffset:0,sources:structuredClone(census),physicalSelectionDie:die,selectedSourceId:'ward',
  rolls:[{sourceId:'ward',d100:86,d20:2},{sourceId:'elixir',d100:96,d20:3}]},
 {roundOffset:1,sources:structuredClone(census),physicalSelectionDie:null,selectedSourceId:null,rolls:[]},
 {roundOffset:2,sources:structuredClone(census),physicalSelectionDie:null,selectedSourceId:'ward',rolls:[{sourceId:'ward',d100:11}]},
 {roundOffset:3,sources:structuredClone(census),physicalSelectionDie:die,selectedSourceId:'ward',rolls:[{sourceId:'ward',d100:11}]}
];
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++};const bad=(f,re)=>{assert.throws(f,re);n++};
const input={spellCL:4,origin:{x:0,y:0},sourceCensus:census,ticks,gmFullSourceHistoryConfirmed:true};
const prior=JSON.stringify(input),result=replayNeutralVortexSequence(input);
eq(JSON.stringify(input),prior);eq(result.mayCommit,false);eq(result.processedTicks,4);
eq(result.ticks[0].outcome.outcomes.filter(x=>x.suppressed).map(x=>x.sourceId),['ward','elixir']);
eq(result.ticks[1].suppressedAtStart,['elixir','ward']);
eq(result.ticks[1].outcome.outcomes,[]);
eq(result.ticks[2].suppressedAtStart,['elixir']);
eq(result.ticks[2].outcome.suppressedProtectedSourceIds,['elixir']);
eq(result.ticks[2].outcome.outcomes.map(x=>x.sourceId),['ward']);
eq(result.ticks[2].outcome.wardBlockedSourceIds,[]);
eq(result.ticks[3].suppressedAtStart,[]);eq(result.ticks[3].outcome.wardBlockedSourceIds,['elixir']);
eq(result.ticks[3].outcome.outcomes.map(x=>x.sourceId),['ward']);
eq(result.ticks[3].outcome.outcomes[0].successLevel,'S');
eq(result.suppressions,{ward:2,elixir:3});
// No ordinary one-round caller may remove a target without separately declaring
// suppression; every declaration must be disjoint from the active-source list.
bad(()=>neutralVortexRoundPreflight({spellCL:4,roundOffset:2,origin:{x:0,y:0},
 radiusFeet:7.5,sources:[ward],gmCompleteCensusConfirmed:true,
 selectedSourceId:'ward',rolls:[{sourceId:'ward',d100:11}]}),/Ward bez/);
bad(()=>neutralVortexRoundPreflight({spellCL:4,roundOffset:2,origin:{x:0,y:0},
 radiusFeet:7.5,sources:census,suppressedProtectedSourceIds:['elixir'],gmCompleteCensusConfirmed:true,
 selectedSourceId:'ward',rolls:[{sourceId:'ward',d100:11}]}),/nesmí současně/);
for(const mutation of [a=>a.ticks[2].sources[0].x=5,a=>a.ticks[2].sources[0].protectedByWardId=null,
 a=>a.ticks[2].sources[1].protectsSourceId='another']){
 const changed=structuredClone(input);mutation(changed);
 bad(()=>replayNeutralVortexSequence(changed),/změněný|Ward|původní/);
}
console.log('PASS Neutral Vortex differing Ward/elixir suppression 455:',n,'checks');
