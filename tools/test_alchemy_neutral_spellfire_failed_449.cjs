'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const before=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return before(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);};
const Start=require('../src/integration/hmk-alchemy-neutral-spellstart.js');
const Fire=require('../src/integration/hmk-alchemy-neutral-spellfire-commit.js');
const C=require('../src/integration/encounter-turn-sequence.js');
const CS=require('../src/integration/persistent-combat-state.js');
const P=require('../src/integration/hmk-creation-starting-pvar.js');
const fixture=JSON.parse(cp.execFileSync(process.execPath,[require.resolve('./test_alchemy_physic_425.cjs')],{encoding:'utf8',env:{...process.env,HMK_PHYSIC_FIXTURE:'1'}}));
const starting=P.validateStartingPvarSpells({occupation:'Shèk-Pvâr (Fývria)',pvarismML:70,primary:'Fývria',chantryStars:5,chantryConvocation:'Fývria',homeChantry:'Known chantry',startingARP:350,choices:[],artefacts:[],naturalAttunement:false});
const mage={id:'Mage',name:'Mage',occupation:'Shèk-Pvâr (Fývria)',hmk:{startingPvarSpells:starting,skills:[{name:'Pvârism',ml:70}],arcane:{verifiedGestureEncumbrance:0,auralShockLevels:0},combatState:CS.initialCombatState()}};
let document={characters:[mage],inventory:fixture.inventory,journal:fixture.journal,campaignClock:{campaignId:'C',minute:fixture.minute},combatRuntime:{}};
let seq=C.createEncounterSequence({timelineId:'C:battle',roster:[{id:'Mage',initiativeML:80,awarenessEML:60}]});
seq=C.startEncounterTurn(seq,{Mage:mage.hmk.combatState});document.combatRuntime.sequence=seq;document.combatRuntime.version=1;document.combatRuntime.participants=['Mage'];document.combatRuntime.timelineId=seq.timelineId;document.combatRuntime.clock={round:seq.round,actorId:'Mage'};if(process.env.HMK_NEUTRAL_PRECAST==='1'){console.log(JSON.stringify(document));process.exit(0)}
const start=Start.prepareNeutralAlchemySpellstart({document,id:'start-449',casterId:'Mage',finishId:'finish1',spell:'Detect',distanceFeet:5,gmCantGestureConfirmed:true,gmOrdinaryConditionsConfirmed:true,gmWardAbsentConfirmed:true,gmConfirmed:true});
document=start.nextDocument;
let counts=0;const eq=(a,b)=>{assert.deepEqual(a,b);counts++},yes=x=>{assert.ok(x);counts++},bad=(f,re)=>{assert.throws(f,re);counts++};
const init={Mage:document.characters[0].hmk.combatState};
let q=C.nextEncounterRound(document.combatRuntime.sequence,init);
q=C.startEncounterTurn(q,init);q=C.finishEncounterTurn(q,init,{action:'concentrate-hold',gmConfirmed:true});
q=C.nextEncounterRound(q,init);
document.combatRuntime.sequence=q;
const preserved=JSON.stringify(document);
const args={document,id:'fire-449',casterId:'Mage',finishId:'finish1',spell:'Detect',distanceFeet:5,castingD100:77,gmOrdinaryConditionsConfirmed:true,gmWardAbsentConfirmed:true,gmConcentrationConfirmed:true,gmConfirmed:true};
const prepared=Fire.prepareFailedNeutralSpellfire(args);
eq(JSON.stringify(document),preserved);eq(prepared.nextDocument.journal.length,document.journal.length+1);
eq(prepared.nextDocument.characters[0].hmk.combatState.fatigue.windedness,5);
eq(prepared.nextDocument.combatRuntime.sequence.active,false);
eq(prepared.nextDocument.combatRuntime.sequence.cursor,1);
eq(prepared.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.castingSL,'F');
yes(prepared.nextDocument.combatRuntime.sequence.log.some(x=>x.type==='concentration-complete'));
yes(prepared.nextDocument.combatRuntime.sequence.log.some(x=>x.type==='neutral-incant-spellfire-failed'));
const storage={db:new Map([['test',preserved]]),getItem(k){return this.db.get(k)??null},setItem(k,v){this.db.set(k,v)}};
const done=Fire.persistFailedNeutralSpellfire({stage:prepared,document,storage,key:'test',baseline:preserved});
eq(done.ok,true);eq(JSON.parse(storage.db.get('test')).journal.at(-1).calendarAlchemyNeutralCast.effect,false);
eq(JSON.stringify(document),preserved);
const duplicate=Fire.persistFailedNeutralSpellfire({stage:prepared,document,storage,key:'test',baseline:preserved});
eq(duplicate.ok,false);eq(duplicate.code,'concurrent-change');
bad(()=>Fire.prepareFailedNeutralSpellfire({...args,castingD100:20}),/jen zvolený neúspěch F/);
bad(()=>Fire.prepareFailedNeutralSpellfire({...args,castingD100:55}),/jen zvolený neúspěch F/);
bad(()=>Fire.prepareFailedNeutralSpellfire({...args,distanceFeet:31}),/mimo ověřený dosah/);
const incompleteCheckpoint=structuredClone(document);delete incompleteCheckpoint.combatRuntime.version;
bad(()=>Fire.prepareFailedNeutralSpellfire({...args,document:incompleteCheckpoint}),/úplný originální Initiative checkpoint/);
bad(()=>Fire.prepareFailedNeutralSpellfire({...args,gmWardAbsentConfirmed:false}),/Ward/);
const spoof=structuredClone(prepared);spoof.nextDocument.characters[0].hmk.combatState.fatigue.windedness=0;
bad(()=>Fire.persistFailedNeutralSpellfire({stage:spoof,document,storage,key:'test',baseline:preserved}),/podvržený/);
const badSequence=structuredClone(document);badSequence.combatRuntime.sequence.commitments.Mage.startRound=100;
bad(()=>Fire.prepareFailedNeutralSpellfire({...args,document:badSequence}),/Spellstart důkaz|koncentrace/);
const notsaved={getItem(){return preserved},setItem(){throw Error('write denied')}};
const rejected=Fire.persistFailedNeutralSpellfire({stage:prepared,document,storage:notsaved,key:'test',baseline:preserved});
eq(rejected.ok,false);eq(rejected.code,'not-saved');
for(const [misfire,kind,fatigue,psyche,shock,lost] of [
 [15,'minor',15,0,0,true],
 [36,'distortion',10,1,0,false],
 [55,'confusion',10,2,0,true],
 [70,'minor-principle-leak',10,0,1,true],
 [87,'serious-principle-leak',10,0,3,false],
 [95,'grievous-principle-leak',10,0,5,true],
]){
 const st=Fire.prepareCriticalNeutralSpellfire({...args,id:'critical-'+misfire,
  castingD100:95,misfireD100:misfire});
 const next=st.nextDocument,cs=next.characters[0].hmk.combatState,arc=next.characters[0].hmk.arcane;
 eq(st.format,'hmk-neutral-spellfire-misfire-plan-v1');
 eq(cs.fatigue.windedness,fatigue);eq(cs.fatigue.otherWeakness,5*shock);
 eq(cs.morale.psycheStress,psyche);eq(arc.auralShockLevels,shock);
 eq(arc.misfireLostSpells?.includes('Neutral::Detect')??false,lost);
 eq(next.journal.at(-1).calendarAlchemyNeutralCast.misfireKind,kind);
 eq(next.combatRuntime.sequence.cursor,1);
 const mem={db:new Map([['test',preserved]]),getItem(k){return this.db.get(k)??null},setItem(k,v){this.db.set(k,v)}};
 eq(Fire.persistCriticalNeutralSpellfire({stage:st,document,storage:mem,key:'test',baseline:preserved}).ok,true);
 eq(JSON.parse(mem.db.get('test')).characters[0].hmk.arcane.auralShockLevels,shock);
}
bad(()=>Fire.prepareCriticalNeutralSpellfire({...args,castingD100:95}),/Misfire|zvolený neúspěch/);
bad(()=>Fire.prepareCriticalNeutralSpellfire({...args,castingD100:95,misfireD100:100}),/Misfire 100/);
bad(()=>Fire.prepareCriticalNeutralSpellfire({...args,castingD100:22,misfireD100:15}),/Misfire d100|zvolený neúspěch/);

const detected=Fire.prepareSuccessfulNeutralSpellfire({...args,id:'success-detect-449',
 castingD100:20,gmAllSourcesConfirmed:true,
 distancesByFinishId:{finish0:40,finish1:5},
 otherSources:[{sourceId:'external-talisman',category:'Artefact enchantment',distanceFeet:4}]});
eq(detected.nextDocument.characters[0].hmk.combatState.fatigue.windedness,0);
eq(detected.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.castingSL,'CS');
eq(detected.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.detectedSources.map(x=>x.sourceId),
 ['external-talisman',detected.nextDocument.journal.find(x=>x.calendarAlchemyVialBinding?.finishId==='finish1').id].sort());
const safeStore={db:new Map([['test',preserved]]),getItem(k){return this.db.get(k)??null},setItem(k,v){this.db.set(k,v)}};
eq(Fire.persistSuccessfulNeutralSpellfire({stage:detected,document,storage:safeStore,key:'test',baseline:preserved}).ok,true);
bad(()=>Fire.prepareSuccessfulNeutralSpellfire({...args,id:'success-detect-449',castingD100:20,gmAllSourcesConfirmed:true,
 distancesByFinishId:{finish1:5}}),/každý živý elixír/);
bad(()=>Fire.prepareSuccessfulNeutralSpellfire({...args,id:'success-detect-449',castingD100:20,gmAllSourcesConfirmed:false,
 distancesByFinishId:{finish0:40,finish1:5}}),/všechny magické zdroje/);
bad(()=>Fire.prepareSuccessfulNeutralSpellfire({...args,id:'success-detect-449',castingD100:20,gmAllSourcesConfirmed:true,
 distancesByFinishId:{finish0:40,finish1:5},otherSources:[{sourceId:'bad',category:'Elixir',distanceFeet:3}]}),/ostatní magické zdroje/);

// A genuine CS Detect from the same caster now grants +20 to future Reveal.
let follow=structuredClone(detected.nextDocument);
let rq=C.nextEncounterRound(follow.combatRuntime.sequence,{Mage:follow.characters[0].hmk.combatState});
rq=C.startEncounterTurn(rq,{Mage:follow.characters[0].hmk.combatState});
follow.combatRuntime.sequence=rq;
const secondStart=Start.prepareNeutralAlchemySpellstart({document:follow,id:'start-reveal-449',
 casterId:'Mage',finishId:'finish1',spell:'Reveal',distanceFeet:5,
 gmCantGestureConfirmed:true,gmOrdinaryConditionsConfirmed:true,
 gmWardAbsentConfirmed:true,gmConfirmed:true});
follow=secondStart.nextDocument;
for(let k=0;k<5;k++){
 const state={Mage:follow.characters[0].hmk.combatState};
 rq=C.nextEncounterRound(follow.combatRuntime.sequence,state);
 rq=C.startEncounterTurn(rq,state);
 rq=C.finishEncounterTurn(rq,state,{action:'concentrate-hold',gmConfirmed:true});
 follow.combatRuntime.sequence=rq;
}
rq=C.nextEncounterRound(follow.combatRuntime.sequence,{Mage:follow.characters[0].hmk.combatState});
follow.combatRuntime.sequence=rq;
const reveal=Fire.prepareSuccessfulNeutralSpellfire({document:follow,id:'fire-reveal-449',
 casterId:'Mage',spell:'Reveal',finishId:'finish1',distanceFeet:5,castingD100:76,
 gmOrdinaryConditionsConfirmed:true,gmConcentrationConfirmed:true,
 gmWardAbsentConfirmed:true,gmConfirmed:true});
eq(reveal.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.detectCSBonus,20);
eq(reveal.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.castingEML,84);
eq(reveal.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.castingSL,'S');
eq(reveal.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.revealed.elixirName,'Physic');
eq(reveal.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.revealed.currentAS,6);
eq(reveal.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.originalDetectProofIds,[detected.nextDocument.journal.at(-1).id]);
eq(reveal.nextDocument.characters[0].hmk.combatState.fatigue.windedness,5);

let third=structuredClone(reveal.nextDocument);
let dq=C.nextEncounterRound(third.combatRuntime.sequence,{Mage:third.characters[0].hmk.combatState});
dq=C.startEncounterTurn(dq,{Mage:third.characters[0].hmk.combatState});third.combatRuntime.sequence=dq;
const thirdStart=Start.prepareNeutralAlchemySpellstart({document:third,id:'start-dispel-449',
 casterId:'Mage',finishId:'finish1',spell:'Dispel',distanceFeet:5,
 gmCantGestureConfirmed:true,gmOrdinaryConditionsConfirmed:true,
 gmWardAbsentConfirmed:true,gmConfirmed:true});
third=thirdStart.nextDocument;
for(let k=0;k<5;k++){
 const state={Mage:third.characters[0].hmk.combatState};
 dq=C.nextEncounterRound(third.combatRuntime.sequence,state);
 dq=C.startEncounterTurn(dq,state);
 dq=C.finishEncounterTurn(dq,state,{action:'concentrate-hold',gmConfirmed:true});
 third.combatRuntime.sequence=dq;
}
dq=C.nextEncounterRound(third.combatRuntime.sequence,{Mage:third.characters[0].hmk.combatState});
third.combatRuntime.sequence=dq;
const dispel=Fire.prepareSuccessfulNeutralSpellfire({document:third,id:'fire-dispel-449',
 casterId:'Mage',spell:'Dispel',finishId:'finish1',distanceFeet:5,castingD100:23,
 gmOrdinaryConditionsConfirmed:true,gmConcentrationConfirmed:true,
 gmLOSConfirmed:true,gmWardAbsentConfirmed:true,gmConfirmed:true});
// A real persisted Fumebomb occlusion must be checked, rather than trusting
// only the GM LOS checkbox. Missing target-map geometry is fail-closed.
const smoky=structuredClone(third);
smoky.journal.push({id:'smoke-neutral-449',characterId:'Mage',createdAt:new Date().toISOString(),
 calendarCampaignId:'C',campaignMinute:fixture.minute,body:'verified smoke geometry preflight',
 calendarAlchemyAreaThrown:{kind:'Fumebomb',timelineId:smoky.combatRuntime.sequence.timelineId,
  sourceRound:smoky.combatRuntime.sequence.round,sourceId:'smoke-original',throw:{discharged:true},
  smoke:{blocksLOS:true,center:{x:3,y:0},radiusFt:5,originRound:smoky.combatRuntime.sequence.round,
   throughRound:smoky.combatRuntime.sequence.round}}});
bad(()=>Fire.prepareSuccessfulNeutralSpellfire({document:smoky,id:'blocked-dispel-449',casterId:'Mage',
 spell:'Dispel',finishId:'finish1',distanceFeet:5,castingD100:23,gmOrdinaryConditionsConfirmed:true,
 gmConcentrationConfirmed:true,gmLOSConfirmed:true,gmWardAbsentConfirmed:true,gmConfirmed:true}),
 /Fumebomb LOS/);
const strength=require('../src/integration/hmk-alchemy-decay.js').alchemyElixirStrength;
eq(dispel.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.detectCSBonus,20);
eq(dispel.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.castingEML,47);
eq(dispel.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.castingSL,'S');
eq(dispel.nextDocument.journal.at(-1).calendarAlchemyNeutralCast.dispel.asBefore,6);
eq(strength(dispel.nextDocument.journal,'C','finish1',fixture.minute).currentAS,0);
eq(dispel.nextDocument.characters[0].hmk.combatState.fatigue.windedness,10);
eq(dispel.nextDocument.inventory.length,third.inventory.length);
eq(dispel.nextDocument.combatRuntime.sequence.cursor,1);
const damaged=structuredClone(dispel.nextDocument);
damaged.journal.at(-1).calendarAlchemyNeutralCast.dispel.asBefore=100;
bad(()=>strength(damaged.journal,'C','finish1',fixture.minute),/Dispel/);

const hist=require('../src/integration/hmk-alchemy-neutral-history.js');
yes(hist.validateNeutralAlchemyHistory(dispel.nextDocument));
const dispelBefore=JSON.stringify(third);
const dispelStore={db:new Map([['test',dispelBefore]]),getItem(k){return this.db.get(k)??null},setItem(k,v){this.db.set(k,v)}};
const dispelCommit=Fire.persistSuccessfulNeutralSpellfire({stage:dispel,document:third,
 storage:dispelStore,key:'test',baseline:dispelBefore});
eq(dispelCommit.ok,true);
const reloaded=JSON.parse(dispelStore.db.get('test'));
yes(hist.validateNeutralAlchemyHistory(reloaded));
yes(hist.validateNeutralAlchemyCombatLinks(reloaded));
const noCombat=structuredClone(reloaded);noCombat.characters[0].hmk.combatState.events=noCombat.characters[0].hmk.combatState.events.filter(e=>e.id!=='fire-dispel-449:casting-fatigue');
bad(()=>hist.validateNeutralAlchemyCombatLinks(noCombat),/Combat Fatigue/);
const noInitiative=structuredClone(reloaded);noInitiative.combatRuntime.sequence.log=noInitiative.combatRuntime.sequence.log.filter(e=>e.eventId!=='fire-dispel-449');
bad(()=>hist.validateNeutralAlchemyCombatLinks(noInitiative),/Initiative Spellfire/);
eq(strength(reloaded.journal,'C','finish1',fixture.minute).currentAS,0);
eq(reloaded.campaignClock.minute,fixture.minute);
eq(reloaded.inventory,third.inventory);
const touched=structuredClone(reloaded);
touched.journal.find(x=>x.id==='neutral-spellfire:success-detect-449')
 .calendarAlchemyNeutralCast.castingD100=30;
bad(()=>hist.validateNeutralAlchemyHistory(touched),/bojový důkaz|Casting Roll/);
const replaced=structuredClone(reloaded);replaced.journal.find(x=>x.id==='neutral-spellfire:fire-dispel-449')
 .calendarAlchemyNeutralCast.dispel.asBefore=7;
bad(()=>hist.validateNeutralAlchemyHistory(replaced),/Dispel/);
const cut=structuredClone(reloaded);cut.journal=cut.journal.filter(x=>x.id!=='neutral-spellfire:success-detect-449');
bad(()=>hist.validateNeutralAlchemyHistory(cut),/historického Detect|Detect CS|bez historického Detect/);
bad(()=>hist.assertNeutralAlchemyHistoryAppendOnly(reloaded.journal,touched.journal),/neměnný/);
if(process.env.HMK_NEUTRAL_FIXTURE==='1')console.log(JSON.stringify(reloaded));
else console.log('PASS Neutral verified F, CF, Detect, Reveal, Dispel, replay:',counts,'checks');




