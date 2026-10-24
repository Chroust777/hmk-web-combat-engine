'use strict';
/** v93.457: a GM first tick cannot displace an original campaign elixir/Ward
 * while preserving the appearance of original Initiative positional proof.
 * HMK v1.2 pp.203-204, 251, 255, 269-270. All results remain READ-ONLY.
 */
const fs=require('node:fs'),assert=require('node:assert/strict'),cp=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const before=require.extensions['.js'];require.extensions['.js']=(mod,p)=>{
 if(!p.includes('/src/'))return before(mod,p);
 mod._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const {replayNeutralVortexSequence:replay}=require('../src/integration/hmk-neutral-vortex-sequence.js');
const {alchemyArcaneTargetRegister:register}=require('../src/integration/hmk-alchemy-arcane-targets.js');
let tests=0;
const eq=(a,b)=>{assert.deepEqual(a,b);tests++};
const bad=(f,re)=>{assert.throws(f,re);tests++};
const fixture=JSON.parse(cp.execFileSync(process.execPath,[require.resolve('./test_alchemy_physic_425.cjs')],
 {encoding:'utf8',env:{...process.env,HMK_PHYSIC_FIXTURE:'1'}}));
const document={campaignClock:{campaignId:'C',minute:fixture.minute},
 journal:fixture.journal,inventory:fixture.inventory,
 combatRuntime:{sequence:{spatialUnits:[{id:'B',x:5,y:6},{id:'A1',x:8,y:9}]}}};
const targetable=register({journal:fixture.journal,inventory:fixture.inventory,
 campaignId:'C',minute:fixture.minute}).filter(x=>x.dossier?.targetable);
eq(targetable.length,2);
const sources=targetable.map(row=>({id:row.dossier.sourceId,category:'Elixir',
 currentAS:row.dossier.currentAS,verified:true,
 ...(row.dossier.targetId==='B'?{x:5,y:6}:{x:8,y:9})}));
const selected=[...sources].map(x=>x.id).sort()[0];
const initialTick={roundOffset:0,sources:structuredClone(sources),
 physicalSelectionDie:{faces:2,value:1,origin:'GM-physical-die'},
 selectedSourceId:selected,rolls:[{sourceId:selected,d100:10}]};
const args={document,spellCL:2,origin:{x:5,y:6},sourceCensus:sources,
 gmFullSourceHistoryConfirmed:true,ticks:[initialTick]};
const snapshot=JSON.stringify(args);
const result=replay(args);
eq(result.processedTicks,1);
eq(result.ticks[0].originalCampaignPositionProofSourceIds,[...sources.map(x=>x.id)].sort());
eq(result.ticks[0].gmOnlyPositionSourceIds,[]);
eq(result.campaignCensusAudit.allAlchemySourcesAccountedFor,true);
eq(result.mayCommit,false);
eq(JSON.stringify(args),snapshot);
for(const edit of [a=>a.ticks[0].sources[0].x+=0.5,
 a=>a.ticks[0].sources[1].y-=0.25,
 a=>{a.ticks[0].sources[0].x+=1;a.ticks[0].sources[1].x+=1;}]){
 const mutated=structuredClone(args);edit(mutated);
 bad(()=>replay(mutated),/první tick změnil původní polohu/);
}
const external={id:'rune-from-gm',category:'Rune object',runecraftSI:3,
 x:90,y:90,verified:true};
const withRune=structuredClone(args);
withRune.sourceCensus.push(external);
withRune.ticks[0].sources.push({...external,x:95,y:95});
const other=replay(withRune);
eq(other.ticks[0].originalCampaignPositionProofSourceIds,[...sources.map(x=>x.id)].sort());
eq(other.ticks[0].gmOnlyPositionSourceIds,['rune-from-gm']);
eq(other.campaignCensusAudit.externalArcaneSourceIds,['rune-from-gm']);
eq(other.mayCommit,false);
const round2=structuredClone(args);
round2.ticks.push({roundOffset:1,sources:round2.sourceCensus.map(x=>({...x,x:100,y:100})),
 physicalSelectionDie:null,selectedSourceId:null,rolls:[]});
const later=replay(round2);
eq(later.processedTicks,2);
eq(later.ticks[1].originalCampaignPositionProofSourceIds,[]);
eq(later.ticks[1].gmOnlyPositionSourceIds,[...sources.map(x=>x.id)].sort());
eq(later.mayCommit,false);
// A Ward is historically authenticated via a real original spellfire in the
// original neutral Ward fixture and must share the protected elixir's point.
const historicalWard=JSON.parse(cp.execFileSync(process.execPath,
 [require.resolve('./test_alchemy_neutral_ward_451.cjs')],{encoding:'utf8',
 env:{...process.env,HMK_WARD_POSTCAST:'1'}}));
historicalWard.combatRuntime.sequence.spatialUnits=[
 {id:'A1',x:8,y:9},{id:'B',x:5,y:6},{id:'Mage',x:0,y:0}];
const live=register({journal:historicalWard.journal,inventory:historicalWard.inventory,
 campaignId:'C',minute:fixture.minute}).filter(x=>x.dossier?.targetable);
const wSources=live.map(row=>({id:row.dossier.sourceId,category:'Elixir',
 currentAS:row.dossier.currentAS,verified:true,
 ...(row.dossier.targetId==='B'?{x:5,y:6}:{x:8,y:9})}));
const wardProof=historicalWard.journal.find(row=>row.calendarAlchemyNeutralCast?.ward);
assert.ok(wardProof);
const target=wSources.find(x=>x.id===wardProof.calendarAlchemyNeutralCast.ward.protectedSourceId);
target.protectedByWardId=wardProof.id;
wSources.push({id:wardProof.id,category:'Active spell',spell:'Ward',
 wardLevel:wardProof.calendarAlchemyNeutralCast.ward.level,duration:'Indefinite',
 protectsSourceId:target.id,x:target.x,y:target.y,verified:true});
const selectedWard=[...wSources].map(x=>x.id).sort()[0];
// Without a known result the check may fail farther down in the round
// resolver; we only assert that fraud is rejected at the original first-tick
// authority gate, before any d100/d20 adjudication.
const wardInput={document:historicalWard,spellCL:3,origin:{x:5,y:6},
 sourceCensus:wSources,gmFullSourceHistoryConfirmed:true,ticks:[{
 roundOffset:0,sources:structuredClone(wSources),selectedSourceId:selectedWard,
 physicalSelectionDie:{faces:3,value:1,origin:'GM-physical-die'},rolls:[]}]};
// Move both Ward + protected source in the first tick: mere co-location
// does not prove their location in the ORIGINAL Initiative encounter.
for(const move of [a=>a.ticks[0].sources.find(x=>x.id===wardProof.id).x+=1,
 a=>{a.ticks[0].sources.find(x=>x.id===wardProof.id).y+=2;
     a.ticks[0].sources.find(x=>x.id===target.id).y+=2;}]){
 const mutated=structuredClone(wardInput);move(mutated);
 bad(()=>replay(mutated),/první tick změnil původní polohu/);
}
console.log('PASS Neutral Vortex authoritative first-tick source positions 457:',tests,'checks');
