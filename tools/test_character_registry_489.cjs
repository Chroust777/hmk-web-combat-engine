'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const r=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(r,p),'utf8');
let n=0;const eq=(a,b,message)=>{assert.deepEqual(a,b,message);n++};
(async()=>{
 const {removeCharacterWithEvidence,assertOnlyCharacterWasDeleted}=await import('../src/integration/hmk-character-removal.js');
 const person=(id,kind)=>({id,name:id,kind,hmk:{skills:[],injuries:[]}});
 const doc={characters:[person('pc','PC'),person('npc','NPC')],trash:[],inventory:[{id:'bottle-pc',characterId:'pc'},{id:'bottle-npc',characterId:'npc'}],journal:[
 {id:'fill-pc',characterId:'pc',calendarInventoryWaterFill:{actorId:'pc',itemId:'bottle-pc'}},
 {id:'drink-pc',characterId:'pc',calendarInventoryWaterUse:{actorId:'pc',fillId:'fill-pc'}},
 {id:'transfer-pc',characterId:'pc',calendarInventoryWaterTransfer:{donorId:'pc',recipientId:'npc',donorFillId:'fill-pc',targetFillId:'fill-npc'}},
 {id:'fill-npc',characterId:'npc',calendarInventoryWaterFill:{actorId:'npc',itemId:'bottle-npc',waterTransferId:'transfer-pc'}},
 {id:'drink-npc',characterId:'npc',calendarInventoryWaterUse:{actorId:'npc',fillId:'fill-npc'}},
 {id:'note-npc',characterId:'npc',body:'keep',title:'Keep'}
 ],campaignClock:{characterIds:['pc','npc']},campaignClocks:[{characterIds:['pc','npc']}],campaignActorBranches:{one:{pc:{},npc:{}}}};
 const before=structuredClone(doc),out=removeCharacterWithEvidence(doc,'pc');
 eq(out.characters.map(c=>c.id),['npc'],'remaining character');
 eq(out.inventory.map(i=>i.id),['bottle-npc'],'remaining inventory');
 eq(out.journal.map(j=>j.id),['note-npc'],'transitive transfer receipts all removed');
 eq(out.campaignClock.characterIds,['npc'],'current campaign');
 eq(out.campaignClocks[0].characterIds,['npc'],'other campaign');
 eq(Object.keys(out.campaignActorBranches.one),['npc'],'temporal branch');
 eq(doc,before,'pure operation leaves input intact');
 eq(assertOnlyCharacterWasDeleted(doc,out,'pc'),true,'scoped removal invariant');
 assert.throws(()=>removeCharacterWithEvidence(out,'pc'),/neexistuje/);n++;
 assert.throws(()=>assertOnlyCharacterWasDeleted(doc,{...out,journal:[]},'pc'),/nesouvisející/);n++;
 const app=read('app.js'),css=read('book-templates.css'),html=read('index.html'),bundle=read('hmk-app.bundle.js');
 for(const p of [app,html,bundle]){assert.match(p,/93\.489/);n++}
 for(const text of ['Čistě vygenerovaná postava','Vygenerovaná postava podle rysů','character-registry-group','removeCharacterWithEvidence','assertOnlyCharacterWasDeleted']){assert.ok(app.includes(text),text);n++}
 assert.ok(css.includes('v93.489'), 'CSS');n++;
 assert.ok(!app.includes("'Doložená naplnění a spotřeba vody se nesmějí změnit ani smazat'"));n++;
 eq(read('src/integration/hmk-physical-water-ledger.js').includes('Doložená naplnění a spotřeba vody se nesmějí změnit ani smazat'),true,'immutability unchanged for individual transactions');
 console.log('PASS',n,'v93.489 scoped deletion/PC NPC groups/immutable evidence regression');
})().catch(e=>{console.error(e);process.exitCode=1});
