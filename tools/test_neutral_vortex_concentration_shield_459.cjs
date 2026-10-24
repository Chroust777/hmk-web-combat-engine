'use strict';
/** HMK Kethira p.255: a concentrating caster hides a source from being
 * CHOSEN as Vortex centre for this tick, not from area tests if reached
 * by a different centre. GM attestations are not authoritative persisted
 * Initiative actions. This remains a noncommitting rule replay.
 */
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const original=require.extensions['.js'];require.extensions['.js']=(mod,path)=>{
 if(!path.includes('/src/'))return original(mod,path);
 mod._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{fileName:path,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,path);
};
const {neutralVortexSourceSelection:pick,replayNeutralVortexSequence:replay}=require('../src/integration/hmk-neutral-vortex-sequence.js');
const {neutralVortexRoundPreflight:round}=require('../src/integration/hmk-neutral-vortex-round-preflight.js');
const {neutralChaosStormGeometry}=require('../src/integration/hmk-neutral-arcane-exceptions.js');
let count=0;
const eq=(actual,expected)=>{assert.deepEqual(actual,expected);count++};
const bad=(fn,pattern)=>{assert.throws(fn,pattern);count++};
const origin={x:0,y:0};
const rune={id:'rune',category:'Rune object',runecraftSI:8,x:1,y:0,verified:true};
const talent={id:'talent',category:'Active talent',talentIndex:10,duration:'Temporary',x:2,y:0,verified:true};
const both=[rune,talent];
const selection={sources:both,origin,radiusFeet:2.5,spellCL:2,physicalSelectionDie:null};
const before=JSON.stringify(both);
eq(pick({...selection,hiddenSourceIds:['rune']}).choices,['talent']);
eq(pick({...selection,hiddenSourceIds:['rune']}).selectedSourceId,'talent');
eq(pick({...selection,hiddenSourceIds:['rune','talent']}).choices,[]);
eq(pick({...selection,hiddenSourceIds:['rune','talent']}).selectedSourceId,null);
eq(JSON.stringify(both),before);
for(const badIds of [['missing'],['rune','rune'],[5],null,'rune',[null]]){
 bad(()=>pick({...selection,hiddenSourceIds:badIds}),/skryté zdroje/);
}
bad(()=>pick({...selection,hiddenSourceIds:['rune'],physicalSelectionDie:{faces:1,value:1,origin:'GM-physical-die'}}),/jediný možný/);
bad(()=>pick({...selection,hiddenSourceIds:['rune'],physicalSelectionDie:{faces:2,value:1,origin:'GM-physical-die'}}),/jediný možný/);
const rolls=[{sourceId:'rune',d100:2},{sourceId:'talent',d100:2}];
const turn={spellCL:2,roundOffset:0,origin,radiusFeet:2.5,sources:both,
 gmCompleteCensusConfirmed:true,selectedSourceId:'talent',rolls,hiddenSourceIds:['rune']};
const preview=round(turn);
eq(preview.selectedSourceId,'talent');
eq(preview.hiddenFromCentreSelectionIds,['rune']);
// Hiding only prevents destination selection: an area effect around the
// other source still tests the hidden source (it was never made immune).
eq(preview.inRadiusSourceIds,['rune','talent']);
eq(preview.outcomes.map(x=>x.sourceId),['rune','talent']);
eq(preview.mayCommit,false);
bad(()=>round({...turn,selectedSourceId:'rune'}),/jediný dostupný/);
bad(()=>round({...turn,hiddenSourceIds:['rune','rune']}),/skrytý zdroj/);
bad(()=>round({...turn,hiddenSourceIds:['missing']}),/skrytý zdroj/);
bad(()=>round({...turn,rolls:[{sourceId:'talent',d100:2}]}),/chybí povinný/);
const document={campaignClock:{campaignId:'C',minute:5},journal:[],inventory:[],
 characters:[{id:'Mage',hmk:{}}],combatRuntime:{timelineId:'T',sequence:{timelineId:'T',
  order:['Mage'],round:11,spatialUnits:[{id:'Mage',x:0,y:0}],log:[]}}};
const shield=(mode,sourceIds)=>({casterId:'Mage',sourceIds,mode,
 gmConcentrationConfirmed:true,gmOnOrAffectingCasterConfirmed:true});
const ticks=[{roundOffset:0,sources:structuredClone(both),hiddenSourceIds:undefined,
 shielding:shield('continue-after-spellfire',['rune']),selectedSourceId:'talent',
 rolls,physicalSelectionDie:null},
 {roundOffset:1,sources:structuredClone(both),shielding:shield('one-round-action',['talent']),
 selectedSourceId:'rune',rolls,physicalSelectionDie:null}];
const args={spellCL:2,origin,sourceCensus:both,ticks,document,originCasterId:'Mage',
 gmFullSourceHistoryConfirmed:true};
const saved=JSON.stringify(args),out=replay(args);
eq(out.processedTicks,2);
eq(out.ticks[0].hiddenFromCentreSelectionIds,['rune']);
eq(out.ticks[1].hiddenFromCentreSelectionIds,['talent']);
eq(out.ticks[0].sourceSelection.choices,['talent']);
eq(out.ticks[1].sourceSelection.choices,['rune']);
eq(out.ticks[0].outcome.outcomes.length,2);
eq(out.ticks[1].outcome.outcomes.length,2);
eq(out.ticks[0].shieldingEvidence,'GM-attested-only');
eq(out.ticks[1].shieldingEvidence,'GM-attested-only');
eq(out.mayCommit,false);
eq(out.campaignCensusAudit.allSixCategoriesHistoricallyVerified,false);
eq(JSON.stringify(args),saved);
const edited=(fn,regex)=>{const x=structuredClone(args);fn(x);bad(()=>replay(x),regex)};
for(const [edit,pattern] of [
 [x=>{x.ticks[0].shielding.mode='one-round-action'},/soustředění/],
 [x=>{x.ticks[1].shielding.mode='continue-after-spellfire'},/soustředění/],
 [x=>{x.ticks[0].shielding.casterId='Imposter'},/soustředění/],
 [x=>{x.ticks[0].shielding.gmConcentrationConfirmed=false},/soustředění/],
 [x=>{x.ticks[0].shielding.gmOnOrAffectingCasterConfirmed=false},/soustředění/],
 [x=>{x.ticks[0].shielding.sourceIds=['missing']},/soustředění/],
 [x=>{x.ticks[0].shielding.sourceIds=['rune','rune']},/soustředění/],
 [x=>{x.ticks[0].shielding.sourceIds=[]},/soustředění/],
 [x=>{x.ticks[0].shielding.sourceIds=null},/soustředění/],
 [x=>{x.ticks[0].shielding=undefined;x.ticks[0].selectedSourceId='talent'},/fyzický dN/],
 [x=>{x.originCasterId=null},/soustředění/],
 [x=>{x.document.combatRuntime.sequence.spatialUnits=[]},/poloha sesilatele/],
 [x=>{x.ticks[0].shielding.sourceIds=['rune','talent'];x.ticks[0].selectedSourceId='talent'},/střed/],
 [x=>{x.ticks[1].shielding.sourceIds=['rune'];x.ticks[1].selectedSourceId='rune'},/střed/],
 ])edited(edit,pattern);
const bothHidden=structuredClone(args);
bothHidden.ticks[0].shielding.sourceIds=['rune','talent'];
bothHidden.ticks[0].selectedSourceId=null;
eq(replay(bothHidden).ticks[0].sourceSelection.choices,[]);
eq(neutralChaosStormGeometry(2).casterMayShieldSources,true);
console.log('PASS Neutral Vortex concentration targeting shield 459:',count,'checks');
