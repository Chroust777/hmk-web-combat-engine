'use strict';
/** HMK v1.2 pp.203–204,255: one campaign-verified FIRST Vortex centre
 * must belong to the same original caster and Initiative timeline.
 * The read-only adjudication must not turn an arbitrary GM x/y into history.
 */
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const prev=require.extensions['.js'];require.extensions['.js']=(module,path)=>{
 if(!path.includes('/src/'))return prev(module,path);
 module._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{fileName:path,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,path);
};
const {replayNeutralVortexSequence:replay}=require('../src/integration/hmk-neutral-vortex-sequence.js');
let count=0;const eq=(a,b)=>{assert.deepEqual(a,b);count++};
const bad=(fn,re)=>{assert.throws(fn,re);count++};
const document={campaignClock:{campaignId:'C',minute:20},inventory:[],journal:[],
 characters:[{id:'Mage',hmk:{}}],combatRuntime:{timelineId:'T',sequence:{timelineId:'T',
 round:21,order:['Mage'],spatialUnits:[{id:'Mage',x:1,y:2}],log:[]}}};
const args={document,originCasterId:'Mage',origin:{x:1,y:2},spellCL:3,sourceCensus:[],
 gmFullSourceHistoryConfirmed:true,ticks:[{roundOffset:0,sources:[],
  selectedSourceId:null,rolls:[]}]};
const saved=JSON.stringify(args),out=replay(args);
eq(out.originalCasterOriginProof,{casterId:'Mage',timelineId:'T',round:21,x:1,y:2});
eq(out.processedTicks,1);
eq(out.mayCommit,false);
eq(JSON.stringify(args),saved);
const edited=(mutate,re)=>{const a=structuredClone(args);mutate(a);bad(()=>replay(a),re)};
edited(a=>a.origin.x=2,/poloha sesilatele/);
edited(a=>a.origin.y=2.5,/poloha sesilatele/);
edited(a=>a.originCasterId='Other',/poloha sesilatele/);
edited(a=>a.document.characters=[],/poloha sesilatele/);
edited(a=>a.document.characters.push(structuredClone(a.document.characters[0])),/poloha sesilatele/);
edited(a=>a.document.combatRuntime.sequence.spatialUnits=[],/poloha sesilatele/);
edited(a=>a.document.combatRuntime.sequence.spatialUnits.push({id:'Mage',x:1,y:2}),/poloha sesilatele/);
edited(a=>a.document.combatRuntime.sequence.order=['Other'],/poloha sesilatele/);
edited(a=>a.document.combatRuntime.timelineId='Other',/poloha sesilatele/);
edited(a=>a.document.combatRuntime.sequence.timelineId='',/poloha sesilatele/);
edited(a=>a.document=null,/poloha sesilatele/);
// Legacy GM-only simulations still work but must never claim a native
// caster-position witness or become writable.
const gmOnly=structuredClone(args);gmOnly.originCasterId=null;
const legacy=replay(gmOnly);
eq(legacy.originalCasterOriginProof,null);
eq(legacy.mayCommit,false);
console.log('PASS Neutral Vortex historical original caster-centre v93.458:',count,'checks');
