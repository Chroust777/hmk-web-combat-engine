'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const Start=require('../src/integration/hmk-alchemy-neutral-spellstart.js');
const Fire=require('../src/integration/hmk-alchemy-neutral-spellfire-commit.js');
const C=require('../src/integration/encounter-turn-sequence.js');
const CS=require('../src/integration/persistent-combat-state.js');
const P=require('../src/integration/hmk-creation-starting-pvar.js');
const W=require('../src/integration/hmk-neutral-ward-lifecycle.js');
const H=require('../src/integration/hmk-alchemy-neutral-history.js');
const fi=JSON.parse(cp.execFileSync(process.execPath,[require.resolve('./test_alchemy_physic_425.cjs')],{encoding:'utf8',env:{...process.env,HMK_PHYSIC_FIXTURE:'1'}}));
let tests=0;const eq=(a,b)=>{assert.deepEqual(a,b);tests++},ok=x=>{assert.ok(x);tests++},bad=(f,re)=>{assert.throws(f,re);tests++};
function mage(id,ml){const starting=P.validateStartingPvarSpells({occupation:'Shèk-Pvâr (Fývria)',pvarismML:ml,primary:'Fývria',chantryStars:5,chantryConvocation:'Fývria',homeChantry:'Known chantry',startingARP:350,choices:[{id:'Neutral::Ward',assisted:true}],artefacts:[],naturalAttunement:false});return {id,name:id,occupation:'Shèk-Pvâr (Fývria)',hmk:{startingPvarSpells:starting,skills:[{name:'Pvârism',ml}],arcane:{verifiedGestureEncumbrance:0,auralShockLevels:0},combatState:CS.initialCombatState()}}}
let document={characters:[mage('Low',70)],inventory:fi.inventory,journal:fi.journal,campaignClock:{campaignId:'C',minute:fi.minute},combatRuntime:{}};
function createInitiative(doc,who,timeline){let q=C.createEncounterSequence({timelineId:timeline,roster:[{id:who,initiativeML:80,awarenessEML:60}]});q=C.startEncounterTurn(q,{[who]:doc.characters.find(x=>x.id===who).hmk.combatState});doc.combatRuntime={version:1,participants:[who],timelineId:q.timelineId,sequence:q,clock:{round:q.round,actorId:who}};return doc}
function sixtyRounds(doc,who){let seq=doc.combatRuntime.sequence;for(let k=0;k<59;k++){const state={[who]:doc.characters.find(x=>x.id===who).hmk.combatState};seq=C.nextEncounterRound(seq,state);seq=C.startEncounterTurn(seq,state);seq=C.finishEncounterTurn(seq,state,{action:'concentrate-hold',gmConfirmed:true})}doc.combatRuntime.sequence=C.nextEncounterRound(seq,{[who]:doc.characters.find(x=>x.id===who).hmk.combatState});return doc}
const sourceStart=(doc,id,who,more={})=>Start.prepareNeutralAlchemySpellstart({document:doc,id,casterId:who,finishId:'finish1',spell:'Ward',distanceFeet:0,gmCantGestureConfirmed:true,gmOrdinaryConditionsConfirmed:true,gmTouchConfirmed:true,gmConfirmed:true,...more});
const sourceFire=(doc,id,who,die,more={})=>Fire.prepareSuccessfulNeutralSpellfire({document:doc,id,casterId:who,finishId:'finish1',spell:'Ward',distanceFeet:0,castingD100:die,gmOrdinaryConditionsConfirmed:true,gmConcentrationConfirmed:true,gmTouchConfirmed:true,gmConfirmed:true,...more});
document=createInitiative(document,'Low','C:one');
const firstStart=sourceStart(document,'first-start-452','Low');document=firstStart.nextDocument;
sixtyRounds(document,'Low');const first=sourceFire(document,'first-fire-452','Low',23);
eq(first.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.castingSL,'S');
document=first.nextDocument;const oldWard=document.journal.at(-1);const originalId=oldWard.calendarAlchemyNeutralCast.sourceId;
eq(W.activeAlchemyWard({journal:document.journal,campaignId:'C',finishId:'finish1',sourceId:originalId}).wardLevel,3);
ok(H.validateNeutralAlchemyHistory(document));
const prevJournal=JSON.stringify(document.journal),prevInventory=JSON.stringify(document.inventory),minute=document.campaignClock.minute;
document.characters.push(mage('High',100));document=createInitiative(document,'High','C:two');
if(process.env.HMK_SUPERSEDE_PRECAST==='1'){console.log(JSON.stringify(document));process.exit(0)}
bad(()=>sourceStart(document,'second-start-452','High'),/překrytí/);
// Existing Ward can be replaced only by a demonstrably higher Ward under S;
// this safe subset prevents a stranded spellstart that could only succeed on CS.
const secondStart=sourceStart(document,'second-start-452','High',{gmSupersedeWardConfirmed:true});
eq(secondStart.nextDocument.journal.at(-1).combatProof.priorWardProofId,oldWard.id);
eq(secondStart.nextDocument.journal.at(-1).combatProof.priorWardLevel,3);
document=secondStart.nextDocument;sixtyRounds(document,'High');
bad(()=>sourceFire(document,'second-fire-452','High',23),/přebíjené ochrany/);
const before=JSON.stringify(document);
const second=sourceFire(document,'second-fire-452','High',23,{gmSupersedeWardConfirmed:true});
eq(JSON.stringify(document),before);
const newWard=second.nextDocument.journal.at(-1);
eq(newWard.calendarAlchemyNeutralCast.castingSL,'S');
eq(newWard.calendarAlchemyNeutralCast.ward.level,5);
eq(newWard.calendarAlchemyNeutralCast.ward.supersedesWardProofId,oldWard.id);
eq(W.activeAlchemyWard({journal:second.nextDocument.journal,campaignId:'C',finishId:'finish1',sourceId:originalId}).wardProofId,newWard.id);
ok(H.validateNeutralAlchemyHistory(second.nextDocument));ok(H.validateNeutralAlchemyCombatLinks(second.nextDocument));
eq(JSON.stringify(second.nextDocument.journal.slice(0,-2)),prevJournal);eq(JSON.stringify(second.nextDocument.inventory),prevInventory);eq(second.nextDocument.campaignClock.minute,minute);
const db={db:new Map([['key',before]]),getItem(k){return this.db.get(k)??null},setItem(k,v){this.db.set(k,v)}};
ok(Fire.persistSuccessfulNeutralSpellfire({stage:second,document,storage:db,key:'key',baseline:before}).ok);
const replay=JSON.parse(db.getItem('key'));ok(H.validateNeutralAlchemyHistory(replay));ok(H.validateNeutralAlchemyCombatLinks(replay));
let fake=structuredClone(replay);fake.journal.at(-1).calendarAlchemyNeutralCast.ward.supersedesWardProofId='forged';bad(()=>H.validateNeutralAlchemyHistory(fake),/Ward/);
fake=structuredClone(replay);fake.journal.at(-1).calendarAlchemyNeutralCast.ward.level=2;bad(()=>H.validateNeutralAlchemyHistory(fake),/Ward/);
fake=structuredClone(replay);fake.journal.find(x=>x.id==='neutral-spellstart:second-start-452').combatProof.priorWardProofId='forged';bad(()=>H.validateNeutralAlchemyHistory(fake),/Ward/);
fake=structuredClone(replay);fake.journal.splice(fake.journal.findIndex(x=>x.id===oldWard.id),1);bad(()=>H.validateNeutralAlchemyHistory(fake),/Ward/);
console.log('PASS Ward supersession original 60+60 rounds, protected history, CAS:',tests,'checks');
