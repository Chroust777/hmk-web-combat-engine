'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),cp=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const before=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return before(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{
  fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const Audit=require('../src/integration/hmk-neutral-vortex-census-audit.js');
const Ar=require('../src/integration/hmk-alchemy-arcane-targets.js');
const Sequence=require('../src/integration/hmk-neutral-vortex-sequence.js');
const fixture=JSON.parse(cp.execFileSync(process.execPath,[require.resolve('./test_alchemy_physic_425.cjs')],
 {encoding:'utf8',env:{...process.env,HMK_PHYSIC_FIXTURE:'1'}}));
let count=0;const eq=(a,b)=>{assert.deepEqual(a,b);count++};
const bad=(fn,re)=>{assert.throws(fn,re);count++};
const document={campaignClock:{campaignId:'C',minute:fixture.minute},
 journal:fixture.journal,inventory:fixture.inventory,
 combatRuntime:{sequence:{spatialUnits:[{id:'B',x:5,y:6},{id:'A1',x:8,y:9}]}}};
const register=Ar.alchemyArcaneTargetRegister({journal:document.journal,
 inventory:document.inventory,campaignId:'C',minute:fixture.minute});
const active=register.filter(x=>x.dossier?.targetable);
eq(active.length,2);
const sources=active.map(x=>({id:x.dossier.sourceId,category:'Elixir',
 currentAS:x.dossier.currentAS,verified:true,
 ...(x.dossier.targetId==='B'?{x:5,y:6}:{x:8,y:9})}));
const saved=JSON.stringify(document);
const r=Audit.auditNeutralVortexAlchemyCensus({document,sourceCensus:sources});
eq(r.verifiedAlchemy.length,2);eq(r.allAlchemySourcesAccountedFor,true);
eq(r.mayCommit,false);eq(r.externalArcaneSourceIds,[]);
eq(JSON.stringify(document),saved);
const mutate=(fn,re)=>{const s=structuredClone(sources);const doc=structuredClone(document);
 fn(s,doc);bad(()=>Audit.auditNeutralVortexAlchemyCensus({document:doc,sourceCensus:s}),re);};
mutate(s=>s.pop(),/chybí elixír/);
mutate(s=>s[0].currentAS++,/originální AS/);
mutate(s=>s[1].id='fake',/chybí elixír/);
mutate(s=>s[0].x+=1,/fyzickou polohu/);
mutate(s=>s[0].protectedByWardId='ward-that-never-existed',/Ward bez historického/);
mutate(s=>s.push({...s[0]}),/duplicitní/);
mutate(s=>s.push({id:'rogue',category:'Elixir',currentAS:6,x:1,y:1,verified:true}),/neznámý elixír/);
mutate(s=>s.push({id:'rogueWard',category:'Active spell',spell:'Ward',wardLevel:4,duration:'Indefinite',
 protectsSourceId:s[0].id,x:1,y:1,verified:true}),/neznámý Ward/);
mutate((s,d)=>d.combatRuntime.sequence.spatialUnits=[] ,/původní Initiative/);
mutate((s,d)=>d.inventory=[] ,/historický elixír/);
const extra={id:'external-rune',category:'Rune object',runecraftSI:4,x:12,y:2,verified:true};
const x=Audit.auditNeutralVortexAlchemyCensus({document,sourceCensus:[...sources,extra]});
eq(x.externalArcaneSourceIds,['external-rune']);eq(x.mayCommit,false);
const pre=Sequence.replayNeutralVortexSequence({document,spellCL:2,origin:{x:5,y:6},
 sourceCensus:sources,gmFullSourceHistoryConfirmed:true,ticks:[{roundOffset:0,
 sources,physicalSelectionDie:{faces:2,value:2,origin:'GM-physical-die'},
 selectedSourceId:'dark',rolls:[{sourceId:'dark',d100:11}]}]});
eq(pre.campaignCensusAudit.verifiedAlchemy.length,2);eq(pre.mayCommit,false);
// The historical Ward witness is taken from the ORIGINAL spellfire fixture.
const historicalWard=JSON.parse(cp.execFileSync(process.execPath,
 [require.resolve('./test_alchemy_neutral_ward_451.cjs')],{encoding:'utf8',
 env:{...process.env,HMK_WARD_POSTCAST:'1'}}));
historicalWard.combatRuntime.sequence.spatialUnits=[
 {id:'A1',x:8,y:9},{id:'B',x:5,y:6},{id:'Mage',x:0,y:0}];
const liveWard=Ar.alchemyArcaneTargetRegister({journal:historicalWard.journal,
 inventory:historicalWard.inventory,campaignId:'C',minute:fixture.minute})
 .filter(r=>r.dossier?.targetable);
const withWard=liveWard.map(row=>({id:row.dossier.sourceId,category:'Elixir',
 currentAS:row.dossier.currentAS,verified:true,
 ...(row.dossier.targetId==='B'?{x:5,y:6}:{x:8,y:9})}));
const wardOriginal=historicalWard.journal.find(x=>x.calendarAlchemyNeutralCast?.ward);
assert.ok(wardOriginal);
const bonded=withWard.find(x=>x.id===wardOriginal.calendarAlchemyNeutralCast.ward.protectedSourceId);
bonded.protectedByWardId=wardOriginal.id;
withWard.push({id:wardOriginal.id,category:'Active spell',spell:'Ward',
 wardLevel:wardOriginal.calendarAlchemyNeutralCast.ward.level,duration:'Indefinite',
 protectsSourceId:bonded.id,x:bonded.x,y:bonded.y,verified:true});
const verified=Audit.auditNeutralVortexAlchemyCensus({document:historicalWard,sourceCensus:withWard});
eq(verified.verifiedAlchemy.find(x=>x.sourceId===bonded.id).wardProofId,wardOriginal.id);
const tamperedWard=structuredClone(withWard);
tamperedWard.at(-1).wardLevel++;
bad(()=>Audit.auditNeutralVortexAlchemyCensus({document:historicalWard,sourceCensus:tamperedWard}),/aktivní Ward/);
console.log('PASS Neutral Vortex original Alchemy/Ward source census audit 454:',count,'checks');
