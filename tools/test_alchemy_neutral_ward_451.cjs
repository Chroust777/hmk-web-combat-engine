'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const before=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return before(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);};
const Start=require('../src/integration/hmk-alchemy-neutral-spellstart.js');
const Fire=require('../src/integration/hmk-alchemy-neutral-spellfire-commit.js');
const C=require('../src/integration/encounter-turn-sequence.js');
const CS=require('../src/integration/persistent-combat-state.js');
const P=require('../src/integration/hmk-creation-starting-pvar.js');
const W=require('../src/integration/hmk-neutral-ward-lifecycle.js');
const Det=require('../src/integration/hmk-alchemy-neutral-detection.js');
const H=require('../src/integration/hmk-alchemy-neutral-history.js');
const fixture=JSON.parse(cp.execFileSync(process.execPath,[require.resolve('./test_alchemy_physic_425.cjs')],{encoding:'utf8',env:{...process.env,HMK_PHYSIC_FIXTURE:'1'}}));
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},yes=v=>{assert.ok(v);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const starting=P.validateStartingPvarSpells({occupation:'Shèk-Pvâr (Fývria)',pvarismML:70,primary:'Fývria',chantryStars:5,chantryConvocation:'Fývria',homeChantry:'Known chantry',startingARP:350,choices:[{id:'Neutral::Ward',assisted:true}],artefacts:[],naturalAttunement:false});
const mage={id:'Mage',name:'Mage',occupation:'Shèk-Pvâr (Fývria)',hmk:{startingPvarSpells:starting,skills:[{name:'Pvârism',ml:70}],arcane:{verifiedGestureEncumbrance:0,auralShockLevels:0},combatState:CS.initialCombatState()}};
const document={characters:[mage],inventory:fixture.inventory,journal:fixture.journal,campaignClock:{campaignId:'C',minute:fixture.minute},combatRuntime:{}};
let seq=C.createEncounterSequence({timelineId:'C:battle',roster:[{id:'Mage',initiativeML:80,awarenessEML:60}]});
seq=C.startEncounterTurn(seq,{Mage:mage.hmk.combatState});document.combatRuntime.sequence=seq;
Object.assign(document.combatRuntime,{version:1,participants:['Mage'],timelineId:seq.timelineId,clock:{round:seq.round,actorId:'Mage'}});
if(process.env.HMK_WARD_PRECAST==='1'){console.log(JSON.stringify(document));process.exit(0)}
const startArgs={document,id:'ward-start-451',casterId:'Mage',finishId:'finish1',spell:'Ward',distanceFeet:0,gmCantGestureConfirmed:true,gmOrdinaryConditionsConfirmed:true,gmTouchConfirmed:true,gmConfirmed:true};
const beforeStart=JSON.stringify(document);const plan=Start.prepareNeutralAlchemySpellstart(startArgs);
eq(JSON.stringify(document),beforeStart);eq(plan.nextDocument.combatRuntime.sequence.commitments.Mage.durationRounds,60);
eq(plan.nextDocument.journal.at(-1).combatProof.touchConfirmed,true);
bad(()=>Start.prepareNeutralAlchemySpellstart({...startArgs,gmTouchConfirmed:false}),/dotyk/);
bad(()=>Start.prepareNeutralAlchemySpellstart({...startArgs,distanceFeet:1}),/dosah|dotyk/);
let next=plan.nextDocument;
for(let k=0;k<59;k++){
 let state={Mage:next.characters[0].hmk.combatState};
 let q=C.nextEncounterRound(next.combatRuntime.sequence,state);
 q=C.startEncounterTurn(q,state);
 q=C.finishEncounterTurn(q,state,{action:'concentrate-hold',gmConfirmed:true});
 next.combatRuntime.sequence=q;
}
const state={Mage:next.characters[0].hmk.combatState};
next.combatRuntime.sequence=C.nextEncounterRound(next.combatRuntime.sequence,state);
eq(next.combatRuntime.sequence.round,seq.round+60);
const args={document:next,id:'ward-fire-451',casterId:'Mage',finishId:'finish1',spell:'Ward',distanceFeet:0,castingD100:40,
 gmTouchConfirmed:true,gmOrdinaryConditionsConfirmed:true,gmConcentrationConfirmed:true,gmConfirmed:true};
const snapshot=JSON.stringify(next);
const fire=Fire.prepareSuccessfulNeutralSpellfire(args);
eq(JSON.stringify(next),snapshot);
const row=fire.nextDocument.journal.at(-1);
eq(row.calendarAlchemyNeutralCast.spell,'Ward');eq(row.calendarAlchemyNeutralCast.castingSL,'CS');
eq(row.calendarAlchemyNeutralCast.ward.level,5); // ML=62 -> SI 6 -> half 3 + CS2
const protectedId=row.calendarAlchemyNeutralCast.sourceId;
eq(W.activeAlchemyWard({journal:fire.nextDocument.journal,campaignId:'C',finishId:'finish1',sourceId:protectedId}).wardLevel,5);
yes(H.validateNeutralAlchemyHistory(fire.nextDocument));yes(H.validateNeutralAlchemyCombatLinks(fire.nextDocument));
const storage={db:new Map([['d',snapshot]]),getItem(k){return this.db.get(k)??null},setItem(k,v){this.db.set(k,v)}};
eq(Fire.persistSuccessfulNeutralSpellfire({stage:fire,document:next,storage,key:'d',baseline:snapshot}).ok,true);
const reloaded=JSON.parse(storage.db.get('d'));
yes(H.validateNeutralAlchemyHistory(reloaded));yes(H.validateNeutralAlchemyCombatLinks(reloaded));
const detected=Det.buildNeutralDetectCensus({journal:reloaded.journal,inventory:reloaded.inventory,campaignId:'C',minute:fixture.minute,
 distancesByFinishId:{finish0:40,finish1:5},otherSources:[],maxRangeFeet:30,gmAllSourcesConfirmed:true});
eq(detected.length,1);eq(detected[0].spell,'Ward');eq(detected[0].sourceId,row.id);
yes(!detected.some(x=>x.sourceId===protectedId));
const fake=structuredClone(reloaded);fake.journal.at(-1).calendarAlchemyNeutralCast.ward.level=99;
bad(()=>H.validateNeutralAlchemyHistory(fake),/Ward/);
const removed=structuredClone(reloaded);removed.journal.splice(removed.journal.findIndex(x=>x.id===row.id),1);
bad(()=>H.assertNeutralAlchemyHistoryAppendOnly(reloaded.journal,removed.journal),/neměnný/);
const repeat={...startArgs,document:reloaded,id:'repeat-ward-451'};
// Finished round is no longer an actor's active IR; even if it were, existing Ward blocks.
bad(()=>Start.prepareNeutralAlchemySpellstart(repeat),/vlastním aktivním|překrytí/);
// Original campaign and GM time have never been modified by the stage.
eq(reloaded.campaignClock.minute,fixture.minute);eq(reloaded.inventory,document.inventory);
// A new turn must still reject the original vial even with a GM 'no Ward' checkbox.
const guarded=structuredClone(reloaded);
let sq=C.nextEncounterRound(guarded.combatRuntime.sequence,{Mage:guarded.characters[0].hmk.combatState});
sq=C.startEncounterTurn(sq,{Mage:guarded.characters[0].hmk.combatState});
guarded.combatRuntime.sequence=sq;
bad(()=>Start.prepareNeutralAlchemySpellstart({...startArgs,document:guarded,id:'blocked-detect-451',spell:'Detect',distanceFeet:5,gmWardAbsentConfirmed:true}),/Ward/);
bad(()=>Start.prepareNeutralAlchemySpellstart({...startArgs,document:guarded,id:'blocked-dispel-451',spell:'Dispel',distanceFeet:5,gmWardAbsentConfirmed:true}),/Ward|Detect/);
bad(()=>Start.prepareNeutralAlchemySpellstart({...startArgs,document:guarded,id:'blocked-second-ward-451'}),/překrytí/);
const torn=structuredClone(reloaded);torn.journal.at(-1).calendarAlchemyNeutralCast.ward.protectedSourceId='forged';
bad(()=>H.validateNeutralAlchemyHistory(torn),/Ward/);
if(process.env.HMK_WARD_POSTCAST==='1')console.log(JSON.stringify(reloaded));
else console.log('PASS bounded physical Ward Spellstart/Spellfire/history/detection:',n,'checks');
