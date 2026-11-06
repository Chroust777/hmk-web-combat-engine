'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {episodeEncounterSurprise:surprise}=require('../src/integration/hmk-episode-travel-detail.js');
let checks=0;const test=(x,m)=>{assert.ok(x,m);checks++},fail=(f,re)=>{assert.throws(f,re);checks++};
const partyModes=[{}, {lax:1},{stalking:1},{vigilance:1}];
const witnesses=[{roll:31,eml:65,level:'S'},{roll:95,eml:65,level:'CF'},{roll:20,eml:65,level:'CS'},{roll:81,eml:65,level:'F'}];
for(const modes of partyModes)for(const conveyance of ['foot','cart','mount','wagon'])for(const foeWatchfulness of ['lax','normal','alert']){
 const o={partyModes:modes,conveyance,foeWatchfulness,requireWitness:true};
 const p=surprise(o);test(['automatic','unopposed','opposed'].includes(p.procedure));
 if(p.procedure==='automatic'){
  const done=surprise({...o,decision:'observe'});test(done.verified&&done.partyEvidence===undefined&&done.foeEvidence===undefined);
  fail(()=>surprise({...o,partySkill:'Awareness',decision:'observe'}),/automatick|dovednost/i);
  fail(()=>surprise({...o,partyRoll:25,partyEML:65,decision:'observe'}),/automatick|dovednost/i);
 }else{
  const required=p.procedure==='opposed'?['party','foe']:[p.preferred];
  const sideArgs={};for(const side of required){const skill=side==='party'&&(modes.stalking&&conveyance==='foot')?'Stealth':'Awareness';
   Object.assign(sideArgs,side==='party'?{partySkill:skill,partyRoll:31,partyEML:65}:{foeSkill:skill,foeRoll:81,foeEML:65});}
  const done=surprise({...o,...sideArgs,decision:'parlay'});
  test(done.verified);test(done.partyLevel===(required.includes('party')?'S':null));test(done.foeLevel===(required.includes('foe')?'F':null));
  if(required.includes('party')){test(done.partyEvidence.roll===31&&done.partyEvidence.eml===65);
   fail(()=>surprise({...o,...sideArgs,partyLevel:'CS'}),/neodpovídá/i);}
  if(required.includes('foe'))test(done.foeEvidence.roll===81&&done.foeEvidence.eml===65);
  if(p.procedure==='unopposed'){
   const extra=required.includes('party')?{foeRoll:42}:{partyRoll:42};
   fail(()=>surprise({...o,...sideArgs,...extra}),/Unopposed/i);
  }
 }
}
for(const [roll,expected] of [[5,'CS'],[15,'CS'],[65,'CS'],[70,'CF'],[75,'CF'],[55,'CS'],[60,'CS'],[66,'F'],[1,'S'],[100,'CF']]){
 const got=surprise({partyModes:{},conveyance:'foot',foeWatchfulness:'lax',partySkill:'Awareness',partyRoll:roll,partyEML:65,requireWitness:true});
 test(got.partyLevel===expected,`d100 ${roll} / EML 65: ${got.partyLevel} not ${expected}`);
}
// Exhaust all 4 x 4 opposed outcomes; only a successful higher SL surprises.
const opposedDice={CF:95,F:81,S:31,CS:20};
const rank={CF:0,F:1,S:2,CS:3};
for(const [pSL,pDie] of Object.entries(opposedDice))for(const [fSL,fDie] of Object.entries(opposedDice)){
 const r=surprise({foeWatchfulness:'normal',conveyance:'foot',partyModes:{},
  partySkill:'Awareness',partyRoll:pDie,partyEML:65,
  foeSkill:'Awareness',foeRoll:fDie,foeEML:65,requireWitness:true});
 const winner=rank[pSL]>rank[fSL]&&rank[pSL]>=2?'party':rank[fSL]>rank[pSL]&&rank[fSL]>=2?'foe':null;
 test(r.procedure==='opposed'&&r.verified&&r.winner===winner,
  `Opposed ${pSL}/${fSL} must surprise ${winner}, got ${r.winner}`);
 test(r.alertness===(winner==='party'?'foe-confused':winner==='foe'?'party-confused':rank[pSL]>=2?'both-aware':'both-confused'),
  `Opposed alertness ${pSL}/${fSL} => ${r.alertness}`);
}
const beast=surprise({partyModes:{lax:1},foeIsBeast:true,foeWatchfulness:'',requireWitness:true,decision:'observe'});
test(beast.procedure==='automatic'&&beast.winner==='foe');
fail(()=>surprise({partyModes:{lax:1},foeIsBeast:true,foeWatchfulness:'',partySkill:'Awareness',requireWitness:true}),/automatick|dovednost/i);
fail(()=>surprise({foeWatchfulness:'lax',partySkill:'Awareness',partyRoll:0,partyEML:50,requireWitness:true}),/d100/i);
fail(()=>surprise({foeWatchfulness:'lax',partySkill:'Awareness',partyRoll:31,partyEML:300,requireWitness:true}),/EML/i);
console.log('PASS',checks,'surprise witnessed d100/EML, auto/unopposed/opposed and invalid extra tests');
