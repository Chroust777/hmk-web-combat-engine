'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const E=require('../src/integration/hmk-time-episodes.js');let n=0;
const cfg={minute:480,minutes:60,kind:'forage',memberIds:['a'],terrain:'mixed-forest',encounterEnviron:'rural'};
for(let die=1;die<=10;die++){
 const e=E.calculateTimeEpisode({...cfg,survivalCriticalFailure:true,survivalD10:die});
 const type=die<=3?'equipment':die<=6?'accident':'complication';
 assert.equal(e.survivalHazard,type);n++;
 assert.equal(e.distanceMeters,0);n++;
 assert.equal(e.direction,null);n++;
 assert.equal(e.minutes,60);n++;
}
for(const wrong of [0,11,-1,1.5,null]){assert.throws(()=>E.calculateTimeEpisode({...cfg,survivalCriticalFailure:true,survivalD10:wrong}));n++}
const safe=E.calculateTimeEpisode(cfg);assert.equal(safe.survivalHazard,null);n++;
assert.throws(()=>E.calculateTimeEpisode({...cfg,survivalCriticalFailure:false,survivalD10:4}));n++;
assert.throws(()=>E.calculateTimeEpisode({...cfg,kind:'rest',survivalCriticalFailure:true,survivalD10:4}));n++;
console.log('PASS',n,'stationary CF dice outcomes, no movement, required evidence, nontravel guard');
