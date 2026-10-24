'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const before=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return before(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{
  fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const {replayNeutralVortexSequence}=require('../src/integration/hmk-neutral-vortex-sequence.js');
const {projectNeutralVortexSuppressionLifecycle,neutralVortexSourceSuppressionAtRound:at}=
 require('../src/integration/hmk-neutral-vortex-suppression-lifecycle.js');
let count=0;const eq=(a,b)=>{assert.deepEqual(a,b);count++},fail=(f,r)=>{assert.throws(f,r);count++};
const ward={id:'ward',category:'Active spell',spell:'Ward',wardLevel:3,
 duration:'Indefinite',protectsSourceId:'elixir',x:3,y:0,verified:true};
const elixir={id:'elixir',category:'Elixir',currentAS:6,
 protectedByWardId:'ward',x:3,y:0,verified:true};
const sources=[elixir,ward],die={faces:2,value:2,origin:'GM-physical-die'};
const base={spellCL:4,origin:{x:0,y:0},sourceCensus:sources,gmFullSourceHistoryConfirmed:true,ticks:[
 {roundOffset:0,sources:structuredClone(sources),physicalSelectionDie:die,selectedSourceId:'ward',
  rolls:[{sourceId:'ward',d100:86,d20:2},{sourceId:'elixir',d100:96,d20:3}]},
 {roundOffset:1,sources:structuredClone(sources),selectedSourceId:null,rolls:[]},
 {roundOffset:2,sources:structuredClone(sources),selectedSourceId:'ward',rolls:[{sourceId:'ward',d100:11}]},
 {roundOffset:3,sources:structuredClone(sources),physicalSelectionDie:die,selectedSourceId:'ward',
  rolls:[{sourceId:'ward',d100:11}]}
]};
const original=JSON.stringify(base),storm=replayNeutralVortexSequence(base);
eq(JSON.stringify(base),original);
const p=projectNeutralVortexSuppressionLifecycle({storm,startingRound:400});
eq(p.format,'hmk-neutral-vortex-suppression-projection-v1');eq(p.mayCommit,false);
eq(p.startingRound,400);eq(p.finalRoundExclusive,404);
eq(storm.suppressionLifecycle.startingRound,0);eq(storm.suppressionLifecycle.mayCommit,false);
eq(p.intervals.map(x=>[x.sourceId,x.startingRound,x.endRoundExclusive,x.unit]),
 [['ward',400,402,'rounds'],['elixir',400,403,'rounds']]);
eq(p.ticks.map(x=>x.suppressedSourceIds),[[],['elixir','ward'],['elixir'],[]]);
eq(p.continuing.length,0);
eq(at({projection:p,sourceId:'ward',round:400}).suppressed,true);
eq(at({projection:p,sourceId:'ward',round:401}).remainingRounds,1);
eq(at({projection:p,sourceId:'ward',round:402}).suppressed,false);
eq(at({projection:p,sourceId:'elixir',round:402}).suppressed,true);
eq(at({projection:p,sourceId:'elixir',round:402}).restoreAtRound,403);
eq(at({projection:p,sourceId:'elixir',round:403}).suppressed,false);
eq(at({projection:p,sourceId:'elixir',round:399}).suppressed,false);
eq(at({projection:p,sourceId:'elixir',round:399}).nextSuppressionRound,400);
eq(p.intervals.every(x=>x.permanentASLoss===0),true);
eq(Object.isFrozen(p)&&Object.isFrozen(p.intervals)&&Object.isFrozen(p.ticks),true);
fail(()=>at({projection:p,sourceId:'invented',round:400}),/neznámý/);
fail(()=>at({projection:p,sourceId:'ward',round:-1}),/neznámý/);
fail(()=>projectNeutralVortexSuppressionLifecycle({storm,startingRound:-1}),/čas/);
fail(()=>projectNeutralVortexSuppressionLifecycle({storm,startingRound:999999999}),/přetečení/);
for(const mut of [
 x=>x.ticks[1].suppressedAtStart=[],
 x=>x.ticks[2].suppressedAtStart.push('ward'),
 x=>x.ticks[0].outcome.outcomes[0].duration=0,
 x=>x.ticks[0].outcome.outcomes[1].unit='hours',
 x=>x.ticks[0].outcome.outcomes[0].successLevel='CS',
 x=>x.ticks[0].outcome.outcomes[0].suppressed=false,
 x=>x.ticks[0].outcome.outcomes[0].sourceId='foreign',
 x=>x.sourceIds.push('ward'),
 x=>x.ticks.pop()
]){const copied=structuredClone(storm);mut(copied);
 fail(()=>projectNeutralVortexSuppressionLifecycle({storm:copied,startingRound:400}),/potlačení|Vortex|originální|identity|d20|původní|zdroj|kolo/);
}
const lone={id:'rune',category:'Rune object',runecraftSI:1,x:1,y:0,verified:true};
const cf=replayNeutralVortexSequence({spellCL:1,origin:{x:0,y:0},sourceCensus:[lone],
 gmFullSourceHistoryConfirmed:true,ticks:[{roundOffset:0,sources:[lone],selectedSourceId:'rune',
 rolls:[{sourceId:'rune',d100:100,d20:20}]}]});
const long=projectNeutralVortexSuppressionLifecycle({storm:cf,startingRound:800});
eq(long.intervals[0].durationRounds,7200);
eq(long.intervals[0].unit,'hours');eq(long.intervals[0].endRoundExclusive,8000);
eq(at({projection:long,sourceId:'rune',round:7999}).suppressed,true);
eq(at({projection:long,sourceId:'rune',round:8000}).suppressed,false);
eq(long.continuing.map(x=>x.sourceId),['rune']);
eq(cf.suppressions.rune,7200);
const noSources=replayNeutralVortexSequence({spellCL:1,origin:{x:0,y:0},sourceCensus:[],
 gmFullSourceHistoryConfirmed:true,ticks:[{roundOffset:0,sources:[],selectedSourceId:null,rolls:[]}]});
eq(noSources.suppressionLifecycle.intervals,[]);eq(noSources.suppressionLifecycle.mayCommit,false);
console.log('PASS Neutral Vortex suppression lifecycle 463:',count,'checks');
