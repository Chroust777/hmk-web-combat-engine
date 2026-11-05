'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(process.argv[2]||path.resolve(__dirname,'..'));const original=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):original(m,f);
const {initialCombatState,validateCombatState}=require(path.join(root,'src/integration/persistent-combat-state.js'));
const {prepareTrekkingWeatherTest}=require(path.join(root,'src/integration/hmk-weather-hazard-aftermath.js'));
let c=0;for(const order of [['cold-1','cold-2'],['cold-2','cold-1']]){
 let s=initialCombatState();let r=1;
 for(const src of order){s=prepareTrekkingWeatherTest({state:s,sourceId:src,round:r++,kind:'cold',originalSL:'F',coldCondition:'damp',weatherHazardConfirmed:true,gmConfirmed:true}).state;c++}
 assert.deepEqual(s.environmentalHazards.map(x=>x.sourceId).sort(),['cold-1','cold-2']);c++;
 assert.equal(s.fatigue.otherWeakness,20);c++;
 assert.equal(s.shock,'NONE');c++;
 assert.equal(validateCombatState(s),s);c++;
 assert.throws(()=>prepareTrekkingWeatherTest({state:s,sourceId:'cold-1',round:3,kind:'cold',originalSL:'F',coldCondition:'damp',weatherHazardConfirmed:true,gmConfirmed:true}),/jednou použit/);c++;
}
console.log('PASS '+c+' assertions for two simultaneous damp Cold exposures, both orders, accumulated Weakness, preserved source events');
