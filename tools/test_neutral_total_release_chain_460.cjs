'use strict';
/** Canonical, read-only Neutral Total Release spellstart => Spirit => tick 0. */
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return old(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const preflight=require('../src/integration/hmk-neutral-total-release-chain.js').preflightNeutralTotalReleaseChain;
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
seq.spatialUnits=[{id:'Mage',x:0,y:0},{id:'B',x:5,y:6},{id:'A1',x:8,y:9}];
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
 ...(x.dossier.targetId==='B'?{x:5,y:6}:{x:8,y:9})}));
const a={document,id:'fire-460',casterId:'Mage',finishId:'finish1',spell:'Detect',
 distanceFeet:13,castingD100:95,misfireD100:100,
 spiritD100:81,spiritLossD6:[1,2,3,4,5,6],verifiedSpiritOtherModifiers:0,
 gmSpiritModifiersVerified:true,gmOrdinaryConditionsConfirmed:true,
 gmWardAbsentConfirmed:true,gmConcentrationConfirmed:true,
 origin:{x:0,y:0},sourceCensus:sources,gmFullSourceHistoryConfirmed:true,
 ticks:[{roundOffset:0,sources:structuredClone(sources),selectedSourceId:null,
  physicalSelectionDie:null,rolls:[]}]};
let count=0;const eq=(x,y)=>{assert.deepEqual(x,y);count++};
const bad=(f,re)=>{assert.throws(f,re);count++};
const saved=JSON.stringify(document);
const proof=preflight(a);
eq(proof.format,'hmk-neutral-total-release-first-tick-proof-v1');
eq(proof.casting.castingSL,'CF');eq(proof.casting.misfireD100,100);
eq(proof.spirit.spiritSL,'F');eq(proof.spirit.spiritMLLoss,21);
eq(proof.spirit.auralShock,6);eq(proof.spirit.psycheStress,3);
eq(proof.spiritMLAfter,39);
eq(proof.storm.processedTicks,1);eq(proof.storm.originalCasterOriginProof.round,3);
eq(proof.storm.campaignCensusAudit.verifiedAlchemy.length,2);
eq(proof.firstTickOnly,true);eq(proof.mayCommit,false);
eq(JSON.stringify(document),saved);
const tamper=(edit,re)=>{const v=structuredClone(a);edit(v);bad(()=>preflight(v),re)};
// All four Spirit outcomes must use their OWN physical-dice count, never
// synthesize a result from just a declared SL.
for(const [d100,loss,level,shock,shade] of [
 [100,[],'CF',0,true],[81,[1,2,3,4,5,6],'F',6,false],
 [21,[1,2,3,4],'S',4,false],[5,[4,6],'CS',2,false]]){
 const variant=structuredClone(a);variant.spiritD100=d100;variant.spiritLossD6=loss;
 const actual=preflight(variant);
 eq(actual.spirit.spiritSL,level);eq(actual.spirit.auralShock,shock);
 eq(actual.spirit.shade,shade);eq(actual.mayCommit,false);
}
const external=structuredClone(a);
const rune={id:'GM:rune-not-native',category:'Rune object',runecraftSI:3,
 x:100,y:100,verified:true};
external.sourceCensus.push(rune);external.ticks[0].sources.push(structuredClone(rune));
const externalProof=preflight(external);
eq(externalProof.storm.campaignCensusAudit.externalArcaneSourceIds,['GM:rune-not-native']);
eq(externalProof.storm.campaignCensusAudit.allSixCategoriesHistoricallyVerified,false);
eq(externalProof.mayCommit,false);
tamper(v=>v.misfireD100=99,/Misfire 100/);
tamper(v=>v.castingD100=15,/Casting CF/);
tamper(v=>v.gmSpiritModifiersVerified=false,/GM potvrzení/);
tamper(v=>v.gmConcentrationConfirmed=false,/GM potvrzení/);
tamper(v=>v.spiritLossD6=[1],/fyzické d6/);
tamper(v=>v.spiritD100=0,/Spirit d100/);
tamper(v=>v.document.characters[0].hmk.skills[1].ml=200,/fyzické d6/);
tamper(v=>v.document.combatRuntime.timelineId='Other',/časová osa/);
tamper(v=>v.origin.x=1,/poloha sesilatele/);
tamper(v=>v.ticks[0].roundOffset=1,/první.*tick/);
tamper(v=>v.ticks.push(structuredClone(v.ticks[0])),/první.*tick/);
tamper(v=>v.sourceCensus.pop(),/chybí elixír/);
tamper(v=>v.distanceFeet=1,/skutečná poloha/);
tamper(v=>v.document.combatRuntime.sequence.spatialUnits.pop(),/úplné původní prostorové pozice/);
tamper(v=>v.ticks[0].sources[0].x=15,/první tick změnil původní polohu/);
tamper(v=>v.document.journal=v.document.journal.filter(x=>x.id!=='neutral-spellstart:start-460'),/Spellstart důkaz/);
tamper(v=>v.document.combatRuntime.sequence.commitments.Mage.completionRound+=1,/spellfire|koncentrace/);
tamper(v=>v.document.characters[0].hmk.combatState.shock='KIA',/Shock|neplatný|koncentraci/);
tamper(v=>v.document.characters[0].hmk.skills=v.document.characters[0].hmk.skills.filter(x=>x.name!=='Spirit'),/Spirit ML/);
tamper(v=>v.id='a',/povolen/);
tamper(v=>v.spell='Dispel',/povolen/);
tamper(v=>v.document.journal.push({id:'neutral-spellfire:fire-460'}),/duplicitní/);
console.log('PASS Neutral Total Release authenticated first-tick bridge 460:',count,'checks');
