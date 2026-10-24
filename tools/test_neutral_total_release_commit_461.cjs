'use strict';
/** Canonical, read-only Neutral Total Release spellstart => Spirit => tick 0. */
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return old(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const {prepareNeutralTotalReleaseCommit,persistNeutralTotalReleaseCommit}=require('../src/integration/hmk-neutral-total-release-writer.js');
const Start=require('../src/integration/hmk-alchemy-neutral-spellstart.js');
const C=require('../src/integration/encounter-turn-sequence.js');
const CS=require('../src/integration/persistent-combat-state.js');
const P=require('../src/integration/hmk-creation-starting-pvar.js');
const {alchemyArcaneTargetRegister}=require('../src/integration/hmk-alchemy-arcane-targets.js');
const fixture=JSON.parse(cp.execFileSync(process.execPath,[require.resolve('./test_alchemy_physic_425.cjs')],
 {encoding:'utf8',env:{...process.env,HMK_PHYSIC_FIXTURE:'1'}}));
const starting=P.validateStartingPvarSpells({occupation:'Shèk-Pvâr (Fývria)',pvarismML:70,
 primary:'Fývria',chantryStars:5,chantryConvocation:'Fývria',
 homeChantry:'Known chantry',startingARP:350,choices:[],artefacts:[],naturalAttunement:false});
const makeState=()=>CS.initialCombatState();
const mage={id:'Mage',name:'Mage',occupation:'Shèk-Pvâr (Fývria)',hmk:{startingPvarSpells:starting,
 skills:[{name:'Pvârism',ml:70},{name:'Spirit',ml:60}],
 arcane:{verifiedGestureEncumbrance:0,auralShockLevels:0},combatState:makeState()}};
let document={characters:[mage,{id:'B',hmk:{combatState:makeState()}},
 {id:'A1',hmk:{combatState:makeState()}}],inventory:fixture.inventory,
 journal:fixture.journal,campaignClock:{campaignId:'C',minute:fixture.minute},combatRuntime:{}};
let seq=C.createEncounterSequence({timelineId:'C:battle',roster:[
 {id:'Mage',initiativeML:100,awarenessEML:90},
 {id:'B',initiativeML:60,awarenessEML:50},
 {id:'A1',initiativeML:30,awarenessEML:40}]});
seq.spatialUnits=[{id:'Mage',x:0,y:0},{id:'B',x:5,y:5},{id:'A1',x:8,y:9}];
const states=()=>Object.fromEntries(document.characters.map(x=>[x.id,x.hmk.combatState]));
seq=C.startEncounterTurn(seq,states());document.combatRuntime={version:1,participants:['Mage','B','A1'],
 timelineId:seq.timelineId,sequence:seq,clock:{round:seq.round,actorId:'Mage'}};
const start=Start.prepareNeutralAlchemySpellstart({document,id:'start-460',casterId:'Mage',
 finishId:'finish1',spell:'Detect',distanceFeet:13,gmCantGestureConfirmed:true,
 gmOrdinaryConditionsConfirmed:true,gmWardAbsentConfirmed:true,gmConfirmed:true});
document=start.nextDocument;seq=document.combatRuntime.sequence;
// Finish original first-round IRs, then whole second round of concentration.
for(const id of ['B','A1']){seq=C.startEncounterTurn(seq,states());
 assert.equal(C.currentEncounterActor(seq),id);
 seq=C.finishEncounterTurn(seq,states(),{action:'pass',gmConfirmed:true});}
seq=C.nextEncounterRound(seq,states());
for(const id of ['Mage','B','A1']){seq=C.startEncounterTurn(seq,states());
 assert.equal(C.currentEncounterActor(seq),id);
 seq=C.finishEncounterTurn(seq,states(),{action:id==='Mage'?'concentrate-hold':'pass',gmConfirmed:true});}
seq=C.nextEncounterRound(seq,states());
document.combatRuntime.sequence=seq;
document.combatRuntime.clock={round:seq.round,actorId:'Mage'};
const targetable=alchemyArcaneTargetRegister({journal:document.journal,
 inventory:document.inventory,campaignId:'C',minute:fixture.minute}).filter(x=>x.dossier?.targetable);
assert.equal(targetable.length,2);
const sources=targetable.map(x=>({id:x.dossier.sourceId,category:'Elixir',
 currentAS:x.dossier.currentAS,verified:true,
 ...(x.dossier.targetId==='B'?{x:5,y:5}:{x:8,y:9})}));
const a={document,id:'fire-460',casterId:'Mage',finishId:'finish1',spell:'Detect',
 distanceFeet:13,castingD100:95,misfireD100:100,
 spiritD100:81,spiritLossD6:[1,2,3,4,5,6],verifiedSpiritOtherModifiers:0,
 gmSpiritModifiersVerified:true,gmOrdinaryConditionsConfirmed:true,
 gmWardAbsentConfirmed:true,gmConcentrationConfirmed:true,
 origin:{x:0,y:0},sourceCensus:sources,gmFullSourceHistoryConfirmed:true,
 ticks:[{roundOffset:0,sources:structuredClone(sources),selectedSourceId:null,
  physicalSelectionDie:null,rolls:[]}]};

const eq=assert.deepEqual;let checks=0;
const same=(x,y)=>{eq(x,y);checks++};
const bad=(f,p)=>{assert.throws(f,p);checks++};
// Native category fixture contains one in-radius elixir and a second out-of-radius elixir.
const live=JSON.stringify(document);
const ids=sources.map(s=>s.id);
const a2={...a,gmNoOtherArcaneSourcesConfirmed:true};
const inRange=sources.filter(s=>Math.hypot(s.x,s.y)<=7.5+1e-8);

a2.ticks[0].selectedSourceId=inRange.length===1?inRange[0].id:null;
a2.ticks[0].rolls=inRange.length===1?[{sourceId:inRange[0].id,d100:21}]:[];
if(process.env.HMK_TOTAL_RELEASE_UI_FIXTURE==='1'){console.log(JSON.stringify({document,a2}));process.exit(0);}
const stage=prepareNeutralTotalReleaseCommit(a2);
same(stage.bounded,true);
same(stage.nextDocument.journal.at(-1).calendarNeutralTotalRelease.vortex.ended,true);

const actor0=document.characters.find(c=>c.id==='Mage'),actor1=stage.nextDocument.characters.find(c=>c.id==='Mage');
same(actor1.hmk.skills.find(s=>s.name==='Spirit').ml,39);
same(actor1.hmk.combatState.fatigue.windedness,10);
same(actor1.hmk.combatState.morale.psycheStress,3);
same(actor1.hmk.arcane.auralShockLevels,6);
same(actor1.hmk.combatState.fatigue.otherWeakness,30);
same(actor1.hmk.arcane.pendingPsycheTraitChoice.levels,3);
same(stage.nextDocument.combatRuntime.sequence.cursor,1);
same(stage.nextDocument.journal.at(-1).combatProof.physicalDice.length,9);
same(JSON.stringify(document),live);
const store={db:new Map([['campaign',live]]),getItem(k){return this.db.get(k)??null},setItem(k,v){this.db.set(k,v)}};
const persisted=persistNeutralTotalReleaseCommit({stage,document,storage:store,key:'campaign',baseline:live});
same(persisted.ok,true);
same(persisted.code,'verified');
same(JSON.stringify(persisted.document),persisted.serialized);
same(JSON.parse(store.db.get('campaign')).journal.at(-1).calendarNeutralTotalRelease.vortex.outcomes[0].successLevel,'S');
const duplicate=persistNeutralTotalReleaseCommit({stage,document,storage:store,key:'campaign',baseline:live});
same(duplicate.ok,false);same(duplicate.code,'concurrent-change');
const changed=structuredClone(stage);changed.nextDocument.characters[0].hmk.skills[1].ml=99;
bad(()=>persistNeutralTotalReleaseCommit({stage:changed,document,storage:store,key:'campaign',baseline:live}),/podvržený/);
const failStore={getItem(){return live},setItem(){throw Error('write denied')}};
same(persistNeutralTotalReleaseCommit({stage,document,storage:failStore,key:'campaign',baseline:live}).code,'not-saved');
const edit=(fn,re)=>{const v=structuredClone(a2);fn(v);bad(()=>prepareNeutralTotalReleaseCommit(v),re)};
edit(v=>v.gmNoOtherArcaneSourcesConfirmed=false,/historicky doložené|historicky doložené|zdroje a jejich pozice/);
edit(v=>v.ticks[0].rolls[0].d100=55,/potlačení|d20/);
edit(v=>{v.ticks[0].rolls[0].d100=55;v.ticks[0].rolls[0].d20=3},/potlačení/);
edit(v=>{v.ticks[0].rolls[0].d100=5;v.ticks[0].rolls[0].d20=6},/d20 trvání/);
edit(v=>{v.spiritD100=100;v.spiritLossD6=[]},/Spirit CF/);
edit(v=>v.ticks[0].sources[0].x=100,/první tick/);
edit(v=>v.ticks[0].physicalSelectionDie={faces:2,value:1,origin:'GM-physical-die'},/výběrový hod|jediný/);
const {validateNeutralTotalReleaseHistory,assertCommittedNeutralTotalRelease}=require('../src/integration/hmk-neutral-total-release-invariant.js');
same(validateNeutralTotalReleaseHistory(persisted.document),true);
const {persistVerifiedCombatSnapshot}=require('../src/integration/verified-combat-storage.js');
const altered=structuredClone(stage.nextDocument);altered.characters.find(c=>c.id==='Mage').hmk.skills[1].ml=999;
const altStore={getItem(){return live},setItem(){throw Error('should not write')}};
const invalidDirect=persistVerifiedCombatSnapshot({storage:altStore,key:'campaign',baseline:live,serialized:JSON.stringify(altered)});
same(invalidDirect.ok,false);same(invalidDirect.code,'invalid-neutral-total-release');
const forgedVortex=structuredClone(persisted.document);
forgedVortex.journal.at(-1).calendarNeutralTotalRelease.vortex.physicalRolls[0].d100=25;
bad(()=>validateNeutralTotalReleaseHistory(forgedVortex),/Vortex/);
const forgedCensus=structuredClone(persisted.document);
forgedCensus.journal.at(-1).calendarNeutralTotalRelease.vortex.sourceCensus[0].currentAS=100;
bad(()=>validateNeutralTotalReleaseHistory(forgedCensus),/soupis/);

bad(()=>{const bad=structuredClone(persisted.document);bad.journal.pop();assertCommittedNeutralTotalRelease(persisted.document,bad)},/nelze odstranit|transakce/);
bad(()=>{const bad=structuredClone(persisted.document);bad.characters[0].hmk.skills[1].ml=99;assertCommittedNeutralTotalRelease(document,bad)},/Spirit ML/);
bad(()=>{const bad=structuredClone(persisted.document);bad.combatRuntime.sequence.log=bad.combatRuntime.sequence.log.filter(x=>x.type!=='neutral-incant-spellfire-total-release');validateNeutralTotalReleaseHistory(bad)},/Initiative/);
bad(()=>{const bad=structuredClone(persisted.document);bad.journal.at(-1).calendarNeutralTotalRelease.spirit.spiritMLLoss=90;assertCommittedNeutralTotalRelease(document,bad)},/Spirit ML|Combat State/);
const both=structuredClone(persisted.document);both.journal.push(structuredClone(both.journal.at(-1)));
bad(()=>validateNeutralTotalReleaseHistory(both),/duplicitní/);
const already=structuredClone(persisted.document);already.combatRuntime.sequence=structuredClone(document.combatRuntime.sequence);already.combatRuntime.clock=structuredClone(document.combatRuntime.clock);
bad(()=>prepareNeutralTotalReleaseCommit({...a2,document:already}),/Spellfire důkaz|Spellstart|již využity/);
console.log('PASS Native Neutral Total Release CL1 CAS & invariant 461:',checks,'checks');
