'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const before=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return before(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);};
const Start=require('../src/integration/hmk-alchemy-neutral-spellstart.js'),Fire=require('../src/integration/hmk-alchemy-neutral-spellfire-commit.js');
const C=require('../src/integration/encounter-turn-sequence.js'),W=require('../src/integration/hmk-neutral-ward-lifecycle.js'),H=require('../src/integration/hmk-alchemy-neutral-history.js'),D=require('../src/integration/hmk-alchemy-decay.js');
let document=JSON.parse(cp.execFileSync(process.execPath,[require.resolve('./test_alchemy_neutral_ward_451.cjs')],{encoding:'utf8',env:{...process.env,HMK_WARD_POSTCAST:'1'}}));
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},yes=x=>{assert.ok(x);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const originalWard=document.journal.at(-1),wardId=originalWard.id,sourceId=originalWard.calendarAlchemyNeutralCast.sourceId;
const beforeOriginal=JSON.stringify(document);
function moveToOwnIR(){const state={Mage:document.characters[0].hmk.combatState};let q=C.nextEncounterRound(document.combatRuntime.sequence,state);q=C.startEncounterTurn(q,state);document.combatRuntime.sequence=q;document.combatRuntime.clock={round:q.round,actorId:'Mage'}}
function start(spell,suffix){moveToOwnIR();const stage=Start.prepareNeutralAlchemySpellstart({document,id:'ward-target-start-'+suffix,casterId:'Mage',finishId:'finish1',spell,targetKind:'Ward',gmWardTargetConfirmed:true,distanceFeet:spell==='Reveal'?5:5,gmCantGestureConfirmed:true,gmOrdinaryConditionsConfirmed:true,gmConfirmed:true});document=stage.nextDocument;eq(document.journal.at(-1).combatProof.sourceId,wardId);eq(document.journal.at(-1).combatProof.targetKind,'Ward');return stage}
function concentrate(rounds){for(let k=0;k<rounds-1;k++){const state={Mage:document.characters[0].hmk.combatState};let q=C.nextEncounterRound(document.combatRuntime.sequence,state);q=C.startEncounterTurn(q,state);q=C.finishEncounterTurn(q,state,{action:'concentrate-hold',gmConfirmed:true});document.combatRuntime.sequence=q}const state={Mage:document.characters[0].hmk.combatState};document.combatRuntime.sequence=C.nextEncounterRound(document.combatRuntime.sequence,state)}
function cast(spell,id,roll,opts={}){const snap=JSON.stringify(document);const stage=Fire.prepareSuccessfulNeutralSpellfire({document,id,casterId:'Mage',finishId:'finish1',spell,targetKind:'Ward',gmWardTargetConfirmed:true,distanceFeet:5,castingD100:roll,gmOrdinaryConditionsConfirmed:true,gmConcentrationConfirmed:true,gmLOSConfirmed:spell==='Dispel',gmConfirmed:true,...opts});eq(JSON.stringify(document),snap);const memory={db:new Map([['d',snap]]),getItem(k){return this.db.get(k)??null},setItem(k,v){this.db.set(k,v)}};eq(Fire.persistSuccessfulNeutralSpellfire({stage,document,storage:memory,key:'d',baseline:snap}).ok,true);document=JSON.parse(memory.db.get('d'));yes(H.validateNeutralAlchemyHistory(document));yes(H.validateNeutralAlchemyCombatLinks(document));return document.journal.at(-1).calendarAlchemyNeutralCast}
// Active Ward cannot be silently ignored just because the GM clicked "absent".
moveToOwnIR();bad(()=>Start.prepareNeutralAlchemySpellstart({document,id:'bypass-ward-451',casterId:'Mage',finishId:'finish1',spell:'Detect',distanceFeet:5,gmWardAbsentConfirmed:true,gmCantGestureConfirmed:true,gmOrdinaryConditionsConfirmed:true,gmConfirmed:true}),/Ward/);
// Restore closed turn for normal helper's next round.
document.combatRuntime.sequence=C.finishEncounterTurn(document.combatRuntime.sequence,{Mage:document.characters[0].hmk.combatState},{action:'pass',gmConfirmed:true});
start('Detect','detect');concentrate(2);
let detected=cast('Detect','ward-detect-451',20,{gmAllSourcesConfirmed:true,distancesByFinishId:{finish0:40,finish1:5},otherSources:[]});
eq(detected.castingSL,'CS');eq(detected.detectedSources.length,1);eq(detected.detectedSources[0].sourceId,wardId);
start('Reveal','reveal');concentrate(6);const reveal=cast('Reveal','ward-reveal-451',76);
eq(reveal.castingSL,'S');eq(reveal.detectCSBonus,20);eq(reveal.revealed.wardProofId,wardId);eq(reveal.revealed.wardLevel,5);
start('Dispel','dispel');concentrate(6);const dispel=cast('Dispel','ward-dispel-451',23);
eq(dispel.castingSL,'S');eq(dispel.castingEML,27);eq(dispel.dispel.wardLevel,5);eq(dispel.dispel.removed,true);
eq(W.activeAlchemyWard({journal:document.journal,campaignId:'C',finishId:'finish1',sourceId}),null);
eq(D.alchemyElixirStrength(document.journal,'C','finish1',document.campaignClock.minute).currentAS,6);
eq(document.inventory.length,2); // original physical vial still untouched
// Historical Ward and its removal remain append-only and cannot be falsified.
const corrupt=structuredClone(document);corrupt.journal.at(-1).calendarAlchemyNeutralCast.dispel.wardLevel=77;
bad(()=>H.validateNeutralAlchemyHistory(corrupt),/Ward/);
const deleted=structuredClone(document);deleted.journal=deleted.journal.filter(x=>x.id!==wardId);
bad(()=>H.validateNeutralAlchemyHistory(deleted),/Ward|Detect/);
eq(document.campaignClock.minute,JSON.parse(beforeOriginal).campaignClock.minute);
// Once the Ward itself is really dispelled, the original elixir can be
// targeted again without losing its previous AS or vial identity.
moveToOwnIR();
const unguarded=Start.prepareNeutralAlchemySpellstart({document,id:'post-ward-detect-451',
 casterId:'Mage',finishId:'finish1',spell:'Detect',targetKind:'Elixir',distanceFeet:5,
 gmCantGestureConfirmed:true,gmOrdinaryConditionsConfirmed:true,
 gmWardAbsentConfirmed:true,gmConfirmed:true});
eq(unguarded.nextDocument.journal.at(-1).combatProof.sourceId,sourceId);
eq(unguarded.nextDocument.journal.at(-1).combatProof.spell,'Detect');
console.log('PASS Neutral Ward Detect CS → Reveal S → Dispel S, WL penalty, physical vial, history:',n,'checks');
