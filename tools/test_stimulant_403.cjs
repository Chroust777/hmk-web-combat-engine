const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const Module=require('node:module'),original=Module._extensions['.js'];
Module._extensions['.js']=function(m,p){if(!p.includes('/src/'))return original(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHerbPotionAdministration}=require('../src/integration/hmk-herbal-administration.js');
const {stimulantEvidence,stimulantInitiativeValues,verifyStimulantInitiativeSnapshot,validateStimulantInitiativeJournal,assertStimulantInitiativeAppendOnly,validateStimulantEncounterCheckpoint}=require('../src/integration/hmk-herbal-stimulant.js');
const {resolveSkillTest}=require('../src/integration/hmk-skill-test-engine.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=x=>{assert.ok(x);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const camp='campaign-A',maker='alchemist',actor='hero';
function dose(potency=3,sv=8,id='one',when=10,recipient=actor){
 const made={id:'made-'+id,characterId:maker,calendarCampaignId:camp,campaignMinute:1,
  calendarHerbPotionComplete:{format:'hmk-herb-potion-complete-v1',campaignId:camp,minute:1,actorId:maker,herbType:'stimulant',potency,sv,usable:true,expiryMinute:99999}};
 const administration=createHerbPotionAdministration({journal:[made],campaignId:camp,minute:when,actorId:maker,completeId:made.id,
  targetId:recipient,method:'ingested',gmConfirmed:true,memberIds:[maker,recipient]});
 const given={id:'given-'+id,characterId:maker,calendarCampaignId:camp,campaignMinute:when,calendarHerbPotionAdminister:administration};
 return [made,given];
}
const journal=dose();const E=(minute=10,extra={})=>stimulantEvidence({journal,campaignId:camp,minute,targetId:actor,...extra});
for(const [t,stage,bonus] of [[9,0,0],[10,3,32],[69,3,32],[70,2,16],[129,2,16],[130,1,8],[189,1,8],[190,0,0],[999,0,0]]){
 const r=E(t);eq(r.stage,stage);eq(r.bonus,bonus);eq(r.sourceIds,bonus?['given-one']:[]);
}
eq(E(11,{targetId:'someone-else'}).bonus,0);eq(E(11,{campaignId:'campaign-B'}).bonus,0);eq(E(11,{journal:[]}).bonus,0);
for(const [potency,sv,bonus] of [[1,7,7],[2,9,18],[3,4,16]]){
 const x=stimulantEvidence({journal:dose(potency,sv,'p'+potency),campaignId:camp,minute:10,targetId:actor});
 eq(x.bonus,bonus);eq(x.stage,potency);
}
const prepared=stimulantInitiativeValues({baseInitiativeML:52,baseAwarenessEML:63,evidence:E(10)});
eq(prepared.initiativeML,84);eq(prepared.awarenessEML,95);eq(prepared.baseInitiativeML,52);eq(prepared.sourceIds,['given-one']);
const noBonus=stimulantInitiativeValues({baseInitiativeML:52,baseAwarenessEML:63,evidence:E(190)});
eq(noBonus.initiativeML,52);eq(noBonus.awarenessEML,63);
bad(()=>stimulantInitiativeValues({baseInitiativeML:199,baseAwarenessEML:100,evidence:E()}),/přesahuje/);
bad(()=>stimulantInitiativeValues({baseInitiativeML:40,baseAwarenessEML:NaN,evidence:E()}),/základní/);
bad(()=>E(-1),/Stimulant/);bad(()=>E(1.5),/Stimulant/);
const altered=structuredClone(journal);altered[1].calendarHerbPotionAdminister.bonus=99;
bad(()=>stimulantEvidence({journal:altered,campaignId:camp,minute:10,targetId:actor}),/neodpovídá/);
const other=dose(2,6,'two',15);bad(()=>stimulantEvidence({journal:[...journal,...other],campaignId:camp,minute:20,targetId:actor}),/více současně/);
const evidenceEntry={id:'initiative-proof',characterId:actor,calendarCampaignId:camp,campaignMinute:11,
 calendarHerbStimulantInitiative:{...prepared,targetId:actor,campaignId:camp,minute:11,timelineId:'fight'}};
const history=[...journal,evidenceEntry];ok(validateStimulantInitiativeJournal(history));
ok(verifyStimulantInitiativeSnapshot({journal:history,campaignId:camp,minute:11,proofs:[{...prepared,targetId:actor}]}));
bad(()=>verifyStimulantInitiativeSnapshot({journal:history,campaignId:camp,minute:70,proofs:[{...prepared,targetId:actor}]}),/zeslábl/);
const changeProof=structuredClone(history);changeProof[2].calendarHerbStimulantInitiative.bonus=99;
bad(()=>validateStimulantInitiativeJournal(changeProof),/historický bonus/);
const badTime=structuredClone(history);badTime[2].campaignMinute=12;bad(()=>validateStimulantInitiativeJournal(badTime),/časové osy/);
ok(assertStimulantInitiativeAppendOnly(history,[...history,{id:'extra'}]));
bad(()=>assertStimulantInitiativeAppendOnly(history,journal),/měnit ani mazat/);
bad(()=>assertStimulantInitiativeAppendOnly(history,changeProof),/měnit ani mazat/);
const sequence={timelineId:'fight',roster:[{id:actor,rank:84,awarenessEML:95,baseInitiativeML:52}],
 stimulantInitiativeSnapshot:{campaignId:camp,minute:11,proofs:[{...prepared,targetId:actor}]}};
ok(validateStimulantEncounterCheckpoint({sequence,journal:history}));
const changedRank=structuredClone(sequence);changedRank.roster[0].rank=999;
bad(()=>validateStimulantEncounterCheckpoint({sequence:changedRank,journal:history}),/IR\/Awareness/);
bad(()=>validateStimulantEncounterCheckpoint({sequence,journal}),/deníku/);
const fakeSource=structuredClone(sequence);fakeSource.stimulantInitiativeSnapshot.proofs[0].sourceIds=['fabricated'];
bad(()=>validateStimulantEncounterCheckpoint({sequence:fakeSource,journal:history}),/snapshot/);
for(const [minute,expected] of [[10,32],[70,16],[130,8],[190,0]]){
 const med=E(minute),base=52,r=resolveSkillTest({ml:base,roll:68,gmModifier:med.bonus});
 eq(r.rawEML,base+expected);eq(r.ml,base); // skill Index is from unchanged primary ML
}
console.log('PASS',n,'Stimulant p75: one-hour staged Initiative/Awareness; source, chronology, no stacking, actual skill test, frozen IR provenance');
