'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const V=require('../src/integration/hmk-alchemy-vial-ledger.js'),A=require('../src/integration/hmk-alchemy-preparation.js'),S=require('../src/integration/hmk-skill-test-engine.js'),D=require('../src/integration/hmk-alchemy-decay.js'),R=require('../src/integration/combatant-load.js');
const {PRINTED_VIAL}=require('../src/integration/hmk-herbal-vial-ledger.js');
const {projectInventoryRows}=require('../src/integration/hmk-inventory-overview.js');
const {recordInventoryDisposition,validateInventoryDispositionJournal}=require('../src/integration/hmk-inventory-disposition.js');
const {moveInventoryChest,validateChestTransferJournal}=require('../src/integration/hmk-inventory-chest.js');
const {historicalHMKCalendarEntries}=require('../src/integration/hmk-calendar-history.js');
let tests=0;const eq=(a,b)=>{assert.deepEqual(a,b);tests++},ok=x=>{assert.ok(x);tests++},fail=(fn,re)=>{assert.throws(fn,re);tests++};
const row=(id,c,t,a,k,p)=>({id,calendarCampaignId:c,campaignMinute:t,characterId:a,[k]:p,title:id,body:id,createdAt:'2026-10-22T00:00:00Z'});
const make=(elixir='Healing',c='C')=>{
 const st=A.createAlchemyStart({journal:[],campaignId:c,minute:0,actorId:'A',alchemyML:80,elixirName:elixir,sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[2,3,4],timeOrigins:['manual','manual','manual']});
 const r=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:st.sunsignModifier,svExtra:1});r.secondarySVBonus=1;
 const skill={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:r,gmModifiers:[st.sunsignModifier],helpers:[]};
 const j=[row('start'+c,c,0,'A','calendarAlchemyStart',st),row('skill'+c,c,st.dueMinute,'A','skillTestProof',skill)];
 const n=Math.min(5,Math.max(0,r.sv-4));const f=A.createAlchemyFinish({journal:j,campaignId:c,minute:st.dueMinute,actorId:'A',startId:'start'+c,skillId:'skill'+c,gmContinuityConfirmed:true,augmentationD10:Array(n).fill(10),augmentationOrigins:Array(n).fill('manual')});
 j.push(row('finish'+c,c,st.dueMinute,'A','calendarAlchemyFinish',f));return {j,minute:st.dueMinute};
};
const inv=[{id:'vial1',characterId:'A',sourceItemId:PRINTED_VIAL,slot:'carried',quantity:1,
 snapshot:{id:PRINTED_VIAL,name:'Vial, 4 oz',category:'other',properties:{weightLb:0.25,pricePence:4}}}];
const actor={id:'A',hmk:{attributes:{str:12}}};
const {j,minute}=make();
eq(V.alchemyVialBinding(j,'C','finishC'),null);eq(V.alchemyVialState(j,'C','finishC',minute),null);
const binding=V.createAlchemyVialBinding({journal:j,inventory:inv,campaignId:'C',minute,actorId:'A',finishId:'finishC',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
eq(binding.format,V.ALCHEMY_VIAL_FORMAT);eq(binding.fullWeightLb,0.5);eq(binding.emptyWeightLb,0.25);
eq(binding.quantity,1);eq(binding.sealedAtCompletionConfirmed,true);eq(binding.sourcePage,268);
fail(()=>V.createAlchemyVialBinding({journal:j,inventory:inv,campaignId:'C',minute,actorId:'A',finishId:'finishC',vialId:'vial1',confirmedByGM:true}),/GM musí potvrdit/);
fail(()=>V.createAlchemyVialBinding({journal:j,inventory:inv,campaignId:'C',minute,actorId:'A',finishId:'finishC',vialId:'vial1',storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true}),/GM musí potvrdit/);
fail(()=>V.createAlchemyVialBinding({journal:j,inventory:[],campaignId:'C',minute,actorId:'A',finishId:'finishC',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true}),/Vial/);
fail(()=>V.createAlchemyVialBinding({journal:j,inventory:inv,campaignId:'C',minute:minute-1,actorId:'A',finishId:'finishC',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true}),/zatím nebyl dokončen/);
fail(()=>V.createAlchemyVialBinding({journal:j,inventory:inv,campaignId:'D',minute,actorId:'A',finishId:'finishC',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true}),/chybí skutečně/);
fail(()=>V.createAlchemyVialBinding({journal:j,inventory:inv,campaignId:'C',minute,actorId:'B',finishId:'finishC',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true}),/nepatří postavě/);
for(const bad of [0,2,-1,1.5]){
 const changed=structuredClone(inv);changed[0].quantity=bad;
 fail(()=>V.createAlchemyVialBinding({journal:j,inventory:changed,campaignId:'C',minute,actorId:'A',finishId:'finishC',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true}),/Vial/);
}
for(const bad of ['chest','main_hand','off_hand','worn']){
 const changed=structuredClone(inv);changed[0].slot=bad;
 fail(()=>V.createAlchemyVialBinding({journal:j,inventory:changed,campaignId:'C',minute,actorId:'A',finishId:'finishC',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true}),/Vial/);
}
for(const bad of [0,0.5,null]){
 const changed=structuredClone(inv);changed[0].snapshot.properties.weightLb=bad;
 fail(()=>V.createAlchemyVialBinding({journal:j,inventory:changed,campaignId:'C',minute,actorId:'A',finishId:'finishC',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true}),/Vial/);
}
for(const bad of [{material:'wood',liquidConfirmed:true,corkConfirmed:true},{material:'glass',liquidConfirmed:false,corkConfirmed:true},{material:'glass',liquidConfirmed:true,corkConfirmed:false}]){
 fail(()=>V.createAlchemyVialBinding({journal:j,inventory:inv,campaignId:'C',minute,actorId:'A',finishId:'finishC',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,...bad}),/HMK 268/);
}
const gas=make('Fumebomb','F');
fail(()=>V.createAlchemyVialBinding({journal:gas.j,inventory:inv,campaignId:'F',minute:gas.minute,actorId:'A',finishId:'finishF',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true}),/Fumebomb/);
const journal=[...j,row('binding','C',minute,'A','calendarAlchemyVialBinding',binding)];
ok(V.validateAlchemyVialJournal(journal));ok(V.assertAlchemyVialAppendOnly(journal,structuredClone(journal)));
const projected=V.projectAlchemyVialInventory(inv,journal,'C',minute),empty=V.projectAlchemyVialInventory(inv,journal,'D',minute);
eq(inv[0].snapshot.properties.weightLb,0.25);eq(projected[0].snapshot.properties.weightLb,0.5);eq(empty[0].snapshot.properties.weightLb,0.25);
eq(projectInventoryRows(projected)[0].totalWeight,0.5);eq(projectInventoryRows(inv)[0].totalWeight,0.25);
const gearFull=R.resolveCombatantLoad({character:actor,inventory:projected});const gearEmpty=R.resolveCombatantLoad({character:actor,inventory:inv});
ok(gearFull.gearWeightLb===undefined||gearFull.gearWeightLb>=0);ok(gearFull.gearENC!==null&&gearEmpty.gearENC!==null); // ENC may quantize at low weights
const before=V.alchemyVialState(journal,'C','finishC',minute);
eq(before.ownerId,'A');eq(before.slot,'carried');eq(before.full,true);eq(before.bindingId,'binding');
fail(()=>V.createAlchemyVialBinding({journal,inventory:inv,campaignId:'C',minute,actorId:'A',finishId:'finishC',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true}),/již má/);
const transfer={kind:'transfer',sourceItemId:'vial1',resultItemId:'vial1',quantity:1,actorId:'A',recipientId:'B'};
journal.push(row('handoff','C',minute+1,'A','calendarInventoryDisposition',transfer));
let state=V.alchemyVialState(journal,'C','finishC',minute+1);eq(state.ownerId,'B');eq(state.slot,'carried');
const ownedB=structuredClone(inv);ownedB[0].characterId='B';
ok(V.assertActiveAlchemyVials({campaignClock:{campaignId:'C',minute:minute+1},journal,inventory:ownedB}));
fail(()=>V.assertActiveAlchemyVials({campaignClock:{campaignId:'C',minute:minute+1},journal,inventory:inv}),/naplněný předmět/);
const chest={sourceItemId:'vial1',movedItemId:'vial1',quantity:1,actorId:'B',fromSlot:'carried',toSlot:'chest',split:false};
journal.push(row('chest','C',minute+2,'B','calendarChestTransfer',chest));state=V.alchemyVialState(journal,'C','finishC',minute+2);
eq(state.ownerId,'B');eq(state.slot,'chest');
const chestInv=structuredClone(ownedB);chestInv[0].slot='chest';
ok(V.assertActiveAlchemyVials({campaignClock:{campaignId:'C',minute:minute+2},journal,inventory:chestInv}));
fail(()=>V.createAlchemyVialEmpty({journal,inventory:chestInv,campaignId:'C',minute:minute+2,actorId:'B',finishId:'finishC',reason:'Spilled',confirmedByGM:true}),/mimo Truhlici/);
const retrieve={sourceItemId:'vial1',movedItemId:'vial1',quantity:1,actorId:'B',fromSlot:'chest',toSlot:'carried',split:false};
journal.push(row('retrieve','C',minute+3,'B','calendarChestTransfer',retrieve));
fail(()=>V.createAlchemyVialEmpty({journal,inventory:ownedB,campaignId:'C',minute:minute+3,actorId:'A',finishId:'finishC',reason:'Spilled',confirmedByGM:true}),/aktuální vlastník/);
fail(()=>V.createAlchemyVialEmpty({journal,inventory:ownedB,campaignId:'C',minute:minute+3,actorId:'B',finishId:'finishC',reason:'x',confirmedByGM:true}),/doložený důvod/);
fail(()=>V.createAlchemyVialEmpty({journal,inventory:ownedB,campaignId:'C',minute:minute+3,actorId:'B',finishId:'finishC',reason:'Spilled'}),/GM musí potvrdit/);
const disp=V.createAlchemyVialEmpty({journal,inventory:ownedB,campaignId:'C',minute:minute+3,actorId:'B',finishId:'finishC',reason:'Bottle spilled',confirmedByGM:true});
eq(disp.vialId,'vial1');eq(disp.emptyVialRetained,true);journal.push(row('emptied','C',minute+3,'B','calendarAlchemyVialEmpty',disp));
ok(V.validateAlchemyVialJournal(journal));eq(V.alchemyVialState(journal,'C','finishC',minute+3).full,false);
eq(V.projectAlchemyVialInventory(ownedB,journal,'C',minute+3)[0].snapshot.properties.weightLb,0.25);
fail(()=>V.createAlchemyVialEmpty({journal,inventory:ownedB,campaignId:'C',minute:minute+3,actorId:'B',finishId:'finishC',reason:'Double spill',confirmedByGM:true}),/obsah smí/);
ok(V.assertActiveAlchemyVials({campaignClock:{campaignId:'C',minute:minute+3},journal,inventory:ownedB}));
const bad=structuredClone(journal);bad.find(x=>x.id==='binding').calendarAlchemyVialBinding.fullWeightLb=0.4;
fail(()=>V.validateAlchemyVialJournal(bad),/přepsaný/);fail(()=>V.assertAlchemyVialAppendOnly(journal,bad),/nesmí měnit/);
const bad2=structuredClone(journal);bad2.find(x=>x.id==='emptied').calendarAlchemyVialEmpty.reason='different';
fail(()=>V.assertAlchemyVialAppendOnly(journal,bad2),/nesmí měnit/);
fail(()=>V.assertAlchemyVialAppendOnly(journal,journal.filter(x=>x.id!=='binding')),/nesmí měnit/);
const double=[...journal,row('double','C',minute+4,'B','calendarAlchemyVialEmpty',disp)];
fail(()=>V.validateAlchemyVialJournal(double),/obsah smí|dvojí|poškozený kontext/);
const early=V.projectAlchemyVialInventory(ownedB,journal,'C',minute+1);
eq(early[0].snapshot.properties.weightLb,0.5);
const past=V.projectAlchemyVialInventory(inv,journal,'C',minute-1);
eq(past[0].snapshot.properties.weightLb,0.25);
// Healing elixir remains subject to 30-day natural decay even when unbound/emptied.
eq(D.alchemyElixirStrength(journal,'C','finishC').initialAS,6);
eq(D.alchemyElixirStrength(journal,'C','finishC').dispersed,true);
eq(D.alchemyElixirStrength(journal,'C','finishC').nextDueMinute,null);
eq(D.pendingAlchemyDecay(journal,'C',minute+100*1440).length,0);
fail(()=>D.createAlchemyDecay({journal,campaignId:'C',minute:minute+30*1440,actorId:'A',finishId:'finishC',d10:7,origin:'manual',gmConfirmed:true}),/přesně v termínu/);
const ledger=historicalHMKCalendarEntries({campaignId:'C',minute:minute+4,characterIds:['A','B']},[{id:'A',name:'Maker'},{id:'B',name:'Owner'}],journal);
eq(ledger.filter(x=>x.kind==='alchemy-vial-binding').length,1);
eq(ledger.filter(x=>x.kind==='alchemy-vial-empty').length,1);
// Real, existing inventory mutation routines: no parallel container transfers.
let db={schemaVersion:1,characters:[{id:'A',name:'Maker'},{id:'B',name:'Owner'}],
 inventory:structuredClone(inv),journal:[...j,row('realBind','C',minute,'A','calendarAlchemyVialBinding',binding)],
 campaignClock:{campaignId:'C',minute,characterIds:['A','B'],events:[{id:'base',minute:0}]}};
// A loss is prohibited by the post-mutation physical backing check.
const lost=recordInventoryDisposition(db,{kind:'loss',actorId:'A',itemId:'vial1',quantity:1,
 eventId:'lost',reason:'Claimed missing',confirmedByGM:true,campaignId:'C',minute,createdAt:'2026-10-22T00:00:00Z'});
fail(()=>V.assertActiveAlchemyVials(lost),/naplněná nádoba|naplněný předmět/);
db=recordInventoryDisposition(db,{kind:'transfer',actorId:'A',itemId:'vial1',recipientId:'B',quantity:1,
 eventId:'realTransfer',reason:'Handed to companion',confirmedByGM:true,campaignId:'C',minute,createdAt:'2026-10-22T00:00:00Z'});
ok(validateInventoryDispositionJournal(db.journal));ok(V.validateAlchemyVialJournal(db.journal));ok(V.assertActiveAlchemyVials(db));
eq(db.inventory[0].characterId,'B');eq(db.inventory.length,1);
eq(V.projectAlchemyVialInventory(db.inventory,db.journal,'C',minute)[0].snapshot.properties.weightLb,0.5);
db=moveInventoryChest(db,{actorId:'B',itemId:'vial1',quantity:1,newItemId:'unused1',eventId:'realChest',
 campaignId:'C',minute,location:'Belveron keep',accessConfirmed:true,createdAt:'2026-10-22T00:00:00Z'});
ok(validateChestTransferJournal(db.journal));ok(V.assertActiveAlchemyVials(db));
eq(db.inventory[0].slot,'chest');eq(V.alchemyVialState(db.journal,'C','finishC',minute).slot,'chest');
eq(V.projectAlchemyVialInventory(db.inventory,db.journal,'C',minute)[0].snapshot.properties.weightLb,0.5);
db=moveInventoryChest(db,{actorId:'B',itemId:'vial1',quantity:1,newItemId:'unused2',eventId:'realRetrieve',
 campaignId:'C',minute,location:'Belveron keep',accessConfirmed:true,createdAt:'2026-10-22T00:00:00Z'});
ok(validateChestTransferJournal(db.journal));ok(V.assertActiveAlchemyVials(db));
eq(db.inventory[0].slot,'carried');eq(V.alchemyVialState(db.journal,'C','finishC',minute).slot,'carried');
// Same physical 4 oz vial cannot be used by a still-active herbal potion.
const herbConflict=[...j,row('herbDone','C',minute-10,'A','calendarHerbPotionComplete',{expiryMinute:minute+300}),
 row('herbVial','C',minute-5,'A','calendarHerbVialBinding',{vialId:'vial1',completeId:'herbDone',minute:minute-5})];
fail(()=>V.createAlchemyVialBinding({journal:herbConflict,inventory:inv,campaignId:'C',minute,actorId:'A',finishId:'finishC',vialId:'vial1',confirmedByGM:true,storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true}),/jiný elixír nebo bylinnou/);
console.log('PASS',tests,'Alchemy HMK 268 physical vial, 0.5 lb ENC projection, real inventory transfer + chest, GM proof, discard/Decay cancellation, campaign and herbal isolation');
