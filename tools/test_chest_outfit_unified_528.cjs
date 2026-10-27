'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {missingPrintedArmourCatalogEntries}=await import('../src/integration/armour-article-catalog.js');
 const {PRINTED_ARMOUR_SUITS_P113_116}=await import('../src/rules/armour-suit-printed.js');
 const {previewChestOutfit,applyChestOutfit}=await import('../src/integration/hmk-inventory-batch-522.js');
 const {previewOptimalOutfit}=await import('../src/integration/hmk-outfit-optimizer.js');
 const {resolveCombatantLoad}=await import('../src/integration/combatant-load.js');
 const catalog=missingPrintedArmourCatalogEntries([]);
 let sequence=0;const nextId=()=>`proof-528-${++sequence}`;
 const make=(name,slot='carried',receipt='',actor='P1',location='Castle')=>{
  const item=catalog.find(x=>x.name.toLowerCase()===(name.toLowerCase()==='great helm'?'plate great helm':name.toLowerCase()));
  assert(item,'catalog '+name);
  return {id:nextId(),characterId:actor,sourceItemId:item.id,snapshot:structuredClone(item),
   quantity:1,slot,gearStowage:'normal',layerOrder:slot==='worn'?0:null,
   layerSlot:null,bulkExceptionZones:[],
   ...(slot==='chest'?{chestLocation:location}:{}),
   ...(receipt?{printedSuitName:'Plate & Mail',acquisition:{transactionId:receipt,mode:'buy'}}:{})};
 };
 const actors=[{id:'P1',name:'Pepa',hmk:{attributes:{str:14},coinsPence:1000}},
   {id:'P2',name:'Další',hmk:{attributes:{str:14},coinsPence:500}}];
 const create=items=>({characters:structuredClone(actors),inventory:items,journal:[],
   campaignClock:{campaignId:'test-campaign',minute:240,characterIds:['P1','P2']}});
 const args={ownerId:'P1',location:'Castle',mode:'armour'};
 // Regression for original issue: the chest is ONE of THREE sources.
 const items=[make('Cloth Tunic','worn'),make('Leather Vest','carried'),
  make('Cloth Breeches','chest'),make('Mail Cowl','chest'),make('Padded Coat','carried'),
  make('Plate Cuirass','chest','','P2'),make('Plate Greaves','chest','','P1','Other Castle')];
 const db=create(items),original=JSON.stringify(db);
 const preview=previewChestOutfit(db,args);
 assert(preview.ready,preview.reason);
 assert.deepEqual(preview.preview.names,
   previewOptimalOutfit(preview.virtual,'P1','armour').names,
   'same certified choice from chest+carried+worn');
 assert(preview.preview.names.includes('Cloth Tunic')||preview.preview.names.includes('Leather Vest')||
  preview.preview.names.includes('Padded Coat'),'can use an article not from the chest');
 const result=applyChestOutfit(db,{...args,confirmed:true,idFactory:nextId,createdAt:'2026-10-27T12:00:00Z'});
 const chosen=new Set(preview.preview.placements.map(x=>x.id));
 assert.deepEqual(new Set(result.inventory.filter(x=>x.characterId==='P1'&&x.slot==='worn'&&x.snapshot?.category==='armor').map(x=>x.id)),chosen);
 assert.equal(result.journal.length,preview.ids.length,'one physical chest receipt per withdrawn article');
 for(const item of items.filter(i=>i.slot==='chest'&&!preview.ids.includes(i.id))){
  assert.deepEqual(result.inventory.find(x=>x.id===item.id),item,'unchosen chest stays unmodified');
 }
 for(const item of items.filter(i=>i.characterId==='P2')){
  assert.deepEqual(result.inventory.find(x=>x.id===item.id),item,'other actor unchanged');
 }
 assert.equal(JSON.stringify(db),original,'original world read-only until commit');
 // All 17 Plate & Mail purchased at once, but split among 3 sources.
 const suit=PRINTED_ARMOUR_SUITS_P113_116.find(s=>s.name==='Plate & Mail');
 assert(suit);
 const full=suit.articles.map((name,i)=>make(name,['worn','carried','chest'][i%3],'single-receipt'));
 const fullDB=create(full);
 const planned=previewChestOutfit(fullDB,args);
 assert.equal(planned.ready,true,planned.reason);
 assert.equal(planned.preview.printedSuit,'Plate & Mail');
 assert.equal(planned.preview.placements.length,17);
 const clothed=applyChestOutfit(fullDB,{...args,confirmed:true,idFactory:nextId,createdAt:'2026-10-27T12:05:00Z'});
 assert.equal(clothed.inventory.filter(x=>x.characterId==='P1'&&x.slot==='worn').length,17);
 assert.equal(clothed.inventory.filter(x=>x.characterId==='P1'&&x.slot==='chest').length,0);
 assert.equal(clothed.journal.length,planned.ids.length);
 const load=resolveCombatantLoad({character:actors[0],inventory:clothed.inventory});
 assert.equal(load.armourENC,40,'printed Armour ENC (HMK p.116)');
 // A worn duplicate already beats the chest copy; it should be a safe no-op.
 const same=create([make('Cloth Breeches','worn'),make('Cloth Breeches','chest')]);
 const samePlan=previewChestOutfit(same,{...args,mode:'clothing'});
 assert.equal(samePlan.ready,true,samePlan.reason);
 assert.equal(samePlan.ids.length,0);
 const noop=applyChestOutfit(same,{...args,mode:'clothing',confirmed:true,idFactory:nextId,createdAt:'2026-10-27T12:06:00Z'});
 assert.equal(noop.changed,false);
 assert.deepEqual(noop.inventory,same.inventory);
 assert.deepEqual(noop.journal,same.journal);
 // Failed transfers must never leak partial writes.
 const failed=create([make('Cloth Tunic','chest'),make('Cloth Breeches','chest')]);
 const before=JSON.stringify(failed);
 assert.throws(()=>applyChestOutfit(failed,{...args,mode:'clothing',confirmed:true,idFactory:()=> 'repeated-id',createdAt:'2026-10-27T12:07:00Z'}));
 assert.equal(JSON.stringify(failed),before);
 console.log('PASS v93.528: unified 3-source outfit; 17-piece suit; no-op; other location/actor untouched; atomic failure');
})().catch(e=>{console.error(e);process.exitCode=1});
