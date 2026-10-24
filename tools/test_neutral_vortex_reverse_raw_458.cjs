'use strict';
/** v93.458: every historical Raw Pèleáhn source must still have its original
 * Total Release event, even after its own effect has expired. Neither a
 * deleted registry entry nor an orphan logged event may hide in the census.
 * HMK v1.2 pp.203-204,255. The preflight still cannot commit changes.
 */
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const prev=require.extensions['.js'];require.extensions['.js']=(module,path)=>{
 if(!path.includes('/src/'))return prev(module,path);
 module._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{fileName:path,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,path);
};
const {auditNeutralVortexAlchemyCensus:audit}=require('../src/integration/hmk-neutral-vortex-census-audit.js');
let n=0;const eq=(actual,expected)=>{assert.deepEqual(actual,expected);n++};
const bad=(f,re)=>{assert.throws(f,re);n++};
const center={x:3,y:4},id='active-raw';
const burst=(identity,start,spell,complexity)=>({format:'hmk-pelahn-burst-source-v1',
 id:identity,casterId:'Mage',spell,complexity,durationRounds:complexity,
 startRound:start,endRound:start+complexity-1,center:{...center}});
const old=burst('expired-raw',10,'Doom Flame',6),active=burst(id,20,'Pyre',3);
const dice=[{faces:100,value:95,source:'GM-entered-physical-die'},
 {faces:100,value:100,source:'GM-entered-physical-die'},
 {faces:100,value:45,source:'GM-entered-physical-die'},
 {faces:6,value:3,source:'GM-entered-physical-die'},
 {faces:6,value:4,source:'GM-entered-physical-die'}];
const makeEvent=b=>({type:'pelahn-total-release-source',eventId:b.id,actorId:b.casterId,
 round:b.startRound,spell:b.spell,complexity:b.complexity,
 startRound:b.startRound,endRound:b.endRound,center:{...center},
 gmEnteredDice:true,physicalDice:structuredClone(dice)});
const doc={campaignClock:{campaignId:'C',minute:25},inventory:[],
 journal:[{id:'total-release:'+id,characterId:'Mage',combatProof:{
  actionKind:'pelahn-total-release',sourceEventId:id,spell:'Pyre',
  complexity:3,physicalDice:structuredClone(dice)}}],
 characters:[{id:'Mage',hmk:{combatState:{events:[{id:id+':total-release',
  type:'hmk-spell-total-release',details:{sourceEventId:id,spell:'Pyre',
  complexity:3,castingD100:95,spiritD100:45}}]}}}],
 combatRuntime:{sequence:{round:20,spatialUnits:[{id:'Mage',x:3,y:4}],
  pelahnBursts:[old,active],pelahnBurst:structuredClone(active),
  log:[makeEvent(old),makeEvent(active)]}}};
const source={id,category:'Raw Principle',x:3,y:4,verified:true};
const witness=JSON.stringify(doc);
const valid=audit({document:doc,sourceCensus:[source]});
eq(valid.verifiedRawPelahn.length,1);
eq(valid.verifiedRawPelahn[0].sourceId,id);
eq(valid.externalArcaneSourceIds,[]);
eq(valid.allNativeRawPelahnSourcesAccountedFor,true);
eq(valid.mayCommit,false);
eq(JSON.stringify(doc),witness);
const mutate=(edit,re)=>{const d=structuredClone(doc);edit(d);
 bad(()=>audit({document:d,sourceCensus:[source]}),re);};
mutate(d=>{d.combatRuntime.sequence.pelahnBursts.shift();},/registr neodpovídá Initiative/);
mutate(d=>{d.combatRuntime.sequence.log.shift();},/registr neodpovídá Initiative/);
mutate(d=>{d.combatRuntime.sequence.log.push(structuredClone(d.combatRuntime.sequence.log[0]));},/registr neodpovídá Initiative/);
mutate(d=>{d.combatRuntime.sequence.log[0].endRound+=1;},/pozměněný původní Initiative/);
mutate(d=>{d.combatRuntime.sequence.log[0].center.x+=1;},/pozměněný původní Initiative/);
mutate(d=>{d.combatRuntime.sequence.log[0].actorId='Other';},/pozměněný původní Initiative/);
mutate(d=>{d.combatRuntime.sequence.log[1].startRound++;},/pozměněný původní Initiative/);
mutate(d=>{d.combatRuntime.sequence.log[1].spell='Doom Flame';},/pozměněný původní Initiative/);
// An expired source must remain in the native ledger even when absent from
// the active census. An expired source is NOT resurrected by its old log.
const ended=structuredClone(doc);ended.combatRuntime.sequence.round=24;
const oldSources=audit({document:ended,sourceCensus:[]});
eq(oldSources.verifiedRawPelahn.length,0);
eq(oldSources.allNativeRawPelahnSourcesAccountedFor,true);
bad(()=>audit({document:ended,sourceCensus:[source]}),/vypršelý Raw/);
const lost=structuredClone(ended);
lost.combatRuntime.sequence.pelahnBursts=[];
lost.combatRuntime.sequence.pelahnBurst=null;
bad(()=>audit({document:lost,sourceCensus:[]}),/registr neodpovídá Initiative/);
console.log('PASS Neutral Vortex reverse Raw Pèleáhn Initiative ↔ registry v93.458:',n,'checks');
