'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const before=require.extensions['.js'];
require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return before(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{
  fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const V=require('../src/integration/hmk-neutral-vortex-sequence.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++};
const yes=x=>{assert.ok(x);n++};const bad=(f,re)=>{assert.throws(f,re);n++};
const origin={x:0,y:0};
const ward={id:'ward',category:'Active spell',spell:'Ward',wardLevel:3,
 duration:'Indefinite',protectsSourceId:'elixir',x:5,y:0,verified:true};
const elixir={id:'elixir',category:'Elixir',currentAS:6,
 protectedByWardId:'ward',x:5,y:0,verified:true};
const census=[elixir,ward];
const die=(faces,value)=>({faces,value,origin:'GM-physical-die'});
const tick0={roundOffset:0,sources:structuredClone(census),physicalSelectionDie:die(2,2),
 selectedSourceId:'ward',rolls:[{sourceId:'ward',d100:86,d20:2},{sourceId:'elixir',d100:24}]};
const tick1={roundOffset:1,sources:structuredClone(census),physicalSelectionDie:null,
 selectedSourceId:'elixir',rolls:[{sourceId:'elixir',d100:94,d20:1}]};
const tick2={roundOffset:2,sources:structuredClone(census),physicalSelectionDie:die(2,2),
 selectedSourceId:'ward',rolls:[{sourceId:'ward',d100:10}]};
const args={spellCL:3,origin,sourceCensus:census,
 ticks:[tick0,tick1,tick2],gmFullSourceHistoryConfirmed:true};
const snap=JSON.stringify(args),res=V.replayNeutralVortexSequence(args);
eq(JSON.stringify(args),snap);
eq(res.processedTicks,3);eq(res.mayCommit,false);
eq(res.ticks[0].outcome.radiusNextFeet,7.5);
eq(res.ticks[0].outcome.outcomes.map(x=>x.successLevel),['F','S']);
eq(res.ticks[1].suppressedAtStart,['ward']);
eq(res.ticks[1].outcome.outcomes.map(x=>x.sourceId),['elixir']);
eq(res.ticks[1].outcome.outcomes[0].duration,1);
eq(res.ticks[2].suppressedAtStart,[]);
eq(res.ticks[2].outcome.wardBlockedSourceIds,['elixir']);
eq(res.ticks[2].outcome.radiusBeforeFeet,12.5);
eq(res.suppressions,{ward:2,elixir:2});
eq(res.ticks[0].sourceSelection.choices,['elixir','ward']);
for(const [change,re] of [
 [a=>a.ticks[1].roundOffset=2,/nepřerušený/],
 [a=>a.ticks[0].physicalSelectionDie.value=1,/střed/],
 [a=>a.ticks[0].physicalSelectionDie.faces=3,/fyzický dN/],
 [a=>a.ticks[1].physicalSelectionDie=die(1,1),/jediný možný/],
 [a=>a.ticks[1].sources.pop(),/úplný soupis/],
 [a=>a.ticks[1].sources[0].currentAS=3,/změněný/],
 [a=>a.ticks[2].sources[0].id='imposter',/změněný/],
 [a=>a.ticks[0].rolls.splice(1,1),/chybí povinný/],
 [a=>a.ticks[1].rolls.push({sourceId:'ward',d100:5}),/skutečně zasaženému/],
 [a=>a.ticks[2].rolls.push({sourceId:'elixir',d100:88,d20:2}),/nejprve/],
 [a=>a.gmFullSourceHistoryConfirmed=false,/GM historie/],
 [a=>a.ticks.push(structuredClone(tick2)),/aspoň první tick/]
]){const data=structuredClone(args);change(data);bad(()=>V.replayNeutralVortexSequence(data),re);}
// Long CF: d20 hours = d20*360 combat rounds, not d20 minutes. No
// magic strength is damaged and no expiry can be fabricated mid-round.
const unwarded={id:'potion',category:'Elixir',currentAS:4,x:2,y:0,verified:true};
const h=V.replayNeutralVortexSequence({spellCL:2,origin,sourceCensus:[unwarded],
 gmFullSourceHistoryConfirmed:true,ticks:[
 {roundOffset:0,sources:[unwarded],selectedSourceId:'potion',physicalSelectionDie:null,
  rolls:[{sourceId:'potion',d100:80,d20:3}]},
 {roundOffset:1,sources:[unwarded],selectedSourceId:null,physicalSelectionDie:null,rolls:[]}]});
eq(h.ticks[1].suppressedAtStart,['potion']);
eq(h.suppressions.potion,1080);
eq(h.ticks[0].outcome.outcomes[0].permanentASLoss,0);
// A no-source turn cannot invent a selection die.
bad(()=>V.neutralVortexSourceSelection({sources:[],origin,radiusFeet:2.5,
 spellCL:1,physicalSelectionDie:die(1,1)}),/bez zdrojů/);
console.log('PASS Neutral Vortex chronological sequence replay 454:',n,'checks');
