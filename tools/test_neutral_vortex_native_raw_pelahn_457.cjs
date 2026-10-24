'use strict';
/** Native Raw Pèleáhn witness is from original Total Release (HMK pp.203-204),
 * with independent Vortex Raw Principle special ML 60 (p.255).
 * Other magic and storage remain unverified, and mayCommit is always false.
 */
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const old=require.extensions['.js'];require.extensions['.js']=(mod,p)=>{
 if(!p.includes('/src/'))return old(mod,p);
 mod._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const {auditNeutralVortexAlchemyCensus:audit}=require('../src/integration/hmk-neutral-vortex-census-audit.js');
const {replayNeutralVortexSequence:replay}=require('../src/integration/hmk-neutral-vortex-sequence.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++};
const bad=(f,re)=>{assert.throws(f,re);n++};
const id='physical-pyre-total-release',center={x:3,y:4};
const burst={format:'hmk-pelahn-burst-source-v1',id,casterId:'Mage',spell:'Pyre',
 complexity:3,durationRounds:3,startRound:20,endRound:22,center};
const dice=[{faces:100,value:95,source:'GM-entered-physical-die'},
 {faces:100,value:100,source:'GM-entered-physical-die'},
 {faces:100,value:45,source:'GM-entered-physical-die'},
 {faces:6,value:3,source:'GM-entered-physical-die'},
 {faces:6,value:4,source:'GM-entered-physical-die'}];
const source={id,category:'Raw Principle',x:3,y:4,verified:true};
const document={campaignClock:{campaignId:'C',minute:25},inventory:[],
 journal:[{id:'total-release:'+id,characterId:'Mage',combatProof:{
  actionKind:'pelahn-total-release',sourceEventId:id,spell:'Pyre',
  complexity:3,physicalDice:dice}}],
 characters:[{id:'Mage',hmk:{combatState:{events:[{id:id+':total-release',
  type:'hmk-spell-total-release',details:{sourceEventId:id,spell:'Pyre',
  complexity:3,castingD100:95,spiritD100:45}}]}}}],
 combatRuntime:{sequence:{round:20,spatialUnits:[{id:'Mage',x:7,y:8}],
  pelahnBursts:[burst],pelahnBurst:burst,
  log:[{type:'pelahn-total-release-source',eventId:id,actorId:'Mage',
   round:20,spell:'Pyre',complexity:3,startRound:20,endRound:22,
   center,gmEnteredDice:true,physicalDice:dice}]}}};
const saved=JSON.stringify(document);
const first=audit({document,sourceCensus:[source]});
eq(first.verifiedRawPelahn.length,1);
eq(first.verifiedRawPelahn[0].sourceId,id);
eq(first.verifiedRawPelahn[0].endRound,22);
eq(first.externalArcaneSourceIds,[]);
eq(first.allNativeRawPelahnSourcesAccountedFor,true);
eq(first.allSixCategoriesHistoricallyVerified,false);
eq(first.mayCommit,false);
eq(JSON.stringify(document),saved);
const args={document,sourceCensus:[source],gmFullSourceHistoryConfirmed:true,
 spellCL:3,origin:{x:3,y:4},ticks:[{roundOffset:0,sources:[{...source}],
  selectedSourceId:id,physicalSelectionDie:null,rolls:[{sourceId:id,d100:15}]}]};
const resolved=replay(args);
eq(resolved.ticks[0].outcome.outcomes[0].targetML,60);
eq(resolved.ticks[0].originalCampaignPositionProofSourceIds,[id]);
eq(resolved.ticks[0].gmOnlyPositionSourceIds,[]);
eq(resolved.mayCommit,false);
const mutate=(cb,re)=>{const args2=structuredClone(args);cb(args2);
 bad(()=>replay(args2),re);};
mutate(a=>a.sourceCensus=[],/chybí originální Raw Pèleáhn/);
mutate(a=>a.sourceCensus[0].x=99,/nesouhlasí poloha/);
mutate(a=>a.sourceCensus[0].category='Rune object',/chybí originální Raw Pèleáhn/);
mutate(a=>a.sourceCensus[0].protectedByWardId='something',/chybí originální Raw Pèleáhn/);
mutate(a=>a.ticks[0].sources[0].x+=1,/první tick změnil původní polohu/);
mutate(a=>a.ticks[0].sources[0].y+=1,/první tick změnil původní polohu/);
mutate(a=>a.document.combatRuntime.sequence.log=[],/nemá původní Total Release/);
mutate(a=>a.document.journal=[],/nemá původní Total Release/);
mutate(a=>a.document.characters=[],/nemá původní Total Release/);
mutate(a=>a.document.characters[0].hmk.combatState.events=[],/nemá původní Total Release/);
mutate(a=>a.document.combatRuntime.sequence.log[0].physicalDice[1].value=99,/nemá původní Total Release/);
mutate(a=>a.document.journal[0].combatProof.physicalDice[1].value=99,/nemá původní Total Release/);
mutate(a=>a.document.combatRuntime.sequence.pelahnBursts[0].center.x+=1,/poslední zdroj|neplatný|nesouhlasí poloha/);
mutate(a=>a.document.combatRuntime.sequence.round=23,/vypršelý/);
// Other raw energy is not fabricated as a native Pèleáhn source. Such a
// source remains marked GM-only even when mechanically plausible.
const extra={id:'other-raw',category:'Raw Principle',x:50,y:0,verified:true};
const added=structuredClone(args);added.sourceCensus.push(extra);
added.ticks[0].sources.push(extra);
const all=replay(added);
eq(all.ticks[0].gmOnlyPositionSourceIds,['other-raw']);
eq(all.campaignCensusAudit.externalArcaneSourceIds,['other-raw']);
eq(all.mayCommit,false);
console.log('PASS original Raw Pèleáhn Total Release → Vortex census 457:',n,'checks');
