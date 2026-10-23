'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const prev=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return prev(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),{PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const U=require('../src/integration/hmk-alchemy-area-thrown-source.js'),T=require('../src/integration/hmk-alchemy-acid-thrown.js');
const TX=require('../src/integration/hmk-alchemy-area-atomic-plan.js');
const C=require('../src/integration/encounter-turn-sequence.js'),CS=require('../src/integration/persistent-combat-state.js');
let n=0;const ok=x=>{assert.ok(x);n++},eq=(a,b)=>{assert.deepStrictEqual(a,b);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const row=(id,t,who,key,value)=>({id,characterId:who,calendarCampaignId:'C',campaignMinute:t,[key]:value});
function fixture(name){
 const start=A.createAlchemyStart({campaignId:'C',minute:0,actorId:'A',alchemyML:80,elixirName:name,sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,2,3],timeOrigins:['manual','manual','manual']});
 const r=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:start.sunsignModifier,svExtra:1});r.secondarySVBonus=1;
 const sp={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:r,gmModifiers:[start.sunsignModifier],helpers:[]};
 const t=start.dueMinute,j=[row('start',0,'A','calendarAlchemyStart',start),row('skill',t,'A','skillTestProof',sp)];
 const finish=A.createAlchemyFinish({journal:j,campaignId:'C',minute:t,actorId:'A',startId:'start',skillId:'skill',gmContinuityConfirmed:true,augmentationD10:Array(Math.max(0,Math.min(5,r.sv-4))).fill(10),augmentationOrigins:Array(Math.max(0,Math.min(5,r.sv-4))).fill('manual')});
 j.push(row('finish',t,'A','calendarAlchemyFinish',finish));
 const inv=[{id:'vial',characterId:'A',sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,snapshot:{name:'Vial, 4 oz',properties:{weightLb:.25}}}];
 const b=V.createAlchemyVialBinding({journal:j,inventory:inv,campaignId:'C',minute:t,actorId:'A',finishId:'finish',vialId:'vial',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:name!=='Fumebomb',gasConfirmed:name==='Fumebomb',material:'glass',corkConfirmed:true});
 j.push(row('bind',t,'A','calendarAlchemyVialBinding',b));
 const chars=['A','B','C'].map((id,k)=>({id,hmk:{attributes:{str:12+k},skills:[{name:'Shock',ml:75-k*10},{name:'Initiative',ml:80},{name:'Throwing',ml:80}],combatState:CS.initialCombatState()}}));
 let seq=C.createEncounterSequence({timelineId:'battle',roster:chars.map((c,k)=>({id:c.id,initiativeML:100-k*10,awarenessEML:60}))});
 seq.spatialUnits=[{id:'A',x:0,y:0},{id:'B',x:4,y:0},{id:'C',x:15,y:0}];
 seq=C.startEncounterTurn(seq,Object.fromEntries(chars.map(x=>[x.id,x.hmk.combatState])));
 const base={sequence:seq,characters:chars,inventory:inv,journal:j,campaignId:'C',minute:t,actorId:'A',finishId:'finish',sourceId:'blast-event',aimPoint:{x:15,y:0},center:{x:15,y:0},gmConfirmed:true};
 return base;
}

const thrown={aimType:'grenade',distanceFt:15,throwingML:80,str:12,d100:44,rollOrigin:'manual',targetMovement:'still'};
for(const name of ['Fumebomb','Weakness','Eruption']){
 const f=fixture(name),snapshot=JSON.stringify(f);
 const areaDice=name==='Fumebomb'?{rollsByTarget:{C:{shockD100:70,origin:'manual'}}}:
  name==='Weakness'?{rollsByTarget:{C:{}}}:
  {rollsByTarget:{C:{shockD100:29}},impactD4:3,impactOrigin:'manual',threatenedOpponentIds:['B'],threatGeometryConfirmed:true,moraleByOpponent:{B:{initiativeD100:39,origin:'manual',aberrance:0}}};
 try {
 const plan=TX.prepareAlchemyAreaAtomicBattle({...f,throwDice:thrown,areaDice});
 eq(plan.status,'prepared-no-write');eq(plan.saved,false);eq(plan.historyRow.calendarAlchemyAreaThrown.kind,name);
 eq(plan.nextInventory.length,f.inventory.length-1);ok(plan.nextSequence.log.some(e=>e.type==='hit-confirmed'));
 eq(JSON.stringify(f),snapshot);ok(V.validateAlchemyVialJournal([...f.journal,plan.historyRow]));
 eq(plan.historyRow.calendarAlchemyVialEmpty.vialShattered,true);
 ok(TX.validateAlchemyAreaJournal([...f.journal,plan.historyRow]));
 const tampered=structuredClone(plan.historyRow);tampered.calendarAlchemyAreaThrown.throw.d100=99;
 bad(()=>TX.validateAlchemyAreaJournal([...f.journal,tampered]),/změněná Area/);
 } catch(e){console.error('ATOMIC PREP ERROR '+name+':',e.message);throw e}
 bad(()=>TX.prepareAlchemyAreaAtomicBattle({...f,throwDice:thrown,areaDice:{rollsByTarget:{}}}),/přesně všem/);
 bad(()=>TX.prepareAlchemyAreaAtomicBattle({...f,throwDice:{...thrown,throwingML:99},areaDice}),/Throwing ML/);
 eq(JSON.stringify(f),snapshot);
}
const f=fixture('Fumebomb'),cf=TX.prepareAlchemyAreaAtomicBattle({...f,throwDice:{...thrown,d100:95},areaDice:{}});
eq(cf.historyRow.calendarAlchemyVialEmpty,undefined);eq(cf.nextInventory.length,f.inventory.length);
eq(cf.historyRow.calendarAlchemyAreaThrown.affectedIds,[]);ok(cf.nextSequence.log.some(e=>e.type==='hit-confirmed'));
 ok(TX.validateAlchemyAreaJournal([...f.journal,cf.historyRow]));
console.log('PASS Alchemy Area atomic plan:',n,'assertions, NO-WRITE');
// Two victims must both succeed before ANY simulated write can be staged.
for(const name of ['Fumebomb','Weakness','Eruption']){
 const f=fixture(name);
 f.sequence.spatialUnits.find(x=>x.id==='B').x=14;
 const expected=name==='Fumebomb'?{B:{shockD100:42,origin:'manual'},C:{shockD100:71,origin:'manual'}}:
  name==='Weakness'?{B:{},C:{}}:
  {B:{shockD100:10},C:{shockD100:10}};
 const areaDice=name==='Eruption'?{rollsByTarget:expected,impactD4:2,impactOrigin:'manual',
  threatenedOpponentIds:['B','C'],threatGeometryConfirmed:true,moraleByOpponent:{B:{initiativeD100:39,origin:'manual',aberrance:0},C:{initiativeD100:29,origin:'manual',aberrance:0}}}:
  {rollsByTarget:expected};
 const old=JSON.stringify(f);
 const p=TX.prepareAlchemyAreaAtomicBattle({...f,throwDice:thrown,areaDice});
 eq(p.historyRow.calendarAlchemyAreaThrown.affectedIds.length,2);
 ok(TX.validateAlchemyAreaJournal([...f.journal,p.historyRow]));
 const incomplete={...areaDice,rollsByTarget:{B:expected.B}};
 bad(()=>TX.prepareAlchemyAreaAtomicBattle({...f,throwDice:thrown,areaDice:incomplete}),/přesně všem/);
 eq(JSON.stringify(f),old);
}
console.log('PASS alchemy two-victim and incomplete-last-die atomicity: 12 assertions');
// In-memory replay of the SINGLE proposed commit must satisfy bidirectional
// links: every native Combat State event and STR overlay has a journal source.
for(const name of ['Fumebomb','Weakness','Eruption']){
 const f=fixture(name);
 const areaDice=name==='Fumebomb'?{rollsByTarget:{C:{shockD100:70,origin:'manual'}}}:
  name==='Weakness'?{rollsByTarget:{C:{}}}:
  {rollsByTarget:{C:{shockD100:10}},impactD4:1,impactOrigin:'manual',threatenedOpponentIds:['B'],threatGeometryConfirmed:true,moraleByOpponent:{B:{initiativeD100:39,origin:'manual',aberrance:0}}};
 const p=TX.prepareAlchemyAreaAtomicBattle({...f,throwDice:thrown,areaDice});
 const db={characters:structuredClone(f.characters),inventory:structuredClone(p.nextInventory),
  journal:[...structuredClone(f.journal),structuredClone(p.historyRow)]};
 for(const [id,state] of Object.entries(p.stage.blast.stagedStates)){
  const target=db.characters.find(c=>c.id===id);target.hmk.combatState=structuredClone(state);
  if(p.attributesById[id]){
   target.hmk.attributes=structuredClone(p.attributesById[id]);
   target.hmk.alchemyWeaknessLosses=structuredClone(p.weaknessLossesById[id]);
  }
 }
 ok(TX.validateAlchemyAreaCombatLinks(db));
 if(name==='Weakness'){
  const withForeign=structuredClone(db);
  withForeign.characters.find(c=>c.id==='C').hmk.alchemyWeaknessLosses.push({...withForeign.characters.find(c=>c.id==='C').hmk.alchemyWeaknessLosses[0],sourceId:'fake'});
  bad(()=>TX.validateAlchemyAreaCombatLinks(withForeign),/nemá jednoznačný původní/);
 }else{
  const withoutEvent=structuredClone(db);
  const id=Object.keys(p.stage.blast.stagedStates)[0];withoutEvent.characters.find(c=>c.id===id).hmk.combatState.events=[];
  bad(()=>TX.validateAlchemyAreaCombatLinks(withoutEvent),/chybí neměnný/);
 }
}
console.log('PASS native Combat State / Weakness history bidirectional links: 6 assertions');

// A history proof must not recursively embed the previous full journal.
// The prior ledger prefix is already available to independent replay.
for(const name of ['Eruption','Fumebomb','Weakness']){
 const f=fixture(name);
 const areaDice=name==='Eruption'?{rollsByTarget:{C:{shockD100:10}},impactD4:1,impactOrigin:'manual',threatenedOpponentIds:['B'],threatGeometryConfirmed:true,moraleByOpponent:{B:{initiativeD100:39,origin:'manual',aberrance:0}}}:
 name==='Fumebomb'?{rollsByTarget:{C:{shockD100:70,origin:'manual'}}}:{rollsByTarget:{C:{}}};
 const proposal=TX.prepareAlchemyAreaAtomicBattle({...f,throwDice:thrown,areaDice});
 ok(!Object.hasOwn(JSON.parse(proposal.originalWitness),'journal'));
 ok(TX.validateAlchemyAreaJournal([...f.journal,proposal.historyRow]));
}
console.log('PASS alchemy replay without recursive journal snapshots: 6 assertions');
