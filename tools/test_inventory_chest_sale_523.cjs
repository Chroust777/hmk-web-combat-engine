'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {previewChestOutfit,applyChestOutfit}=await import('../src/integration/hmk-inventory-batch-522.js');
 const {applyInventorySale}=await import('../src/integration/hmk-inventory-sale-523.js');
 const {previewUndressOutfit,undressOutfit}=await import('../src/integration/hmk-outfit-optimizer.js');
 const {coinBalance,validateCampaignCashAccounts}=await import('../src/integration/hmk-library-economy.js');
 const {validateChestTransferJournal}=await import('../src/integration/hmk-inventory-chest.js');
 const {validateInventoryDispositionJournal}=await import('../src/integration/hmk-inventory-disposition.js');
 const {missingPrintedArmourCatalogEntries}=await import('../src/integration/armour-article-catalog.js');
 const {PRINTED_ARMOUR_SUITS_P113_116}=await import('../src/rules/armour-suit-printed.js');
 const {resolveCombatantLoad}=await import('../src/integration/combatant-load.js');
 let serial=0,checks=0;const id=()=>`test-523-${++serial}`;const eq=(a,b)=>{assert.deepEqual(a,b);checks++};const yes=x=>{assert.ok(x);checks++};
 const catalog=missingPrintedArmourCatalogEntries([]);
 const make=(name,slot='chest',suit=null)=>{
  const c=catalog.find(x=>x.name.toLowerCase()===(name.toLowerCase()==='great helm'?'plate great helm':name.toLowerCase()));
  yes(c);return {id:id(),characterId:'P1',sourceItemId:c.id,snapshot:structuredClone(c),slot,quantity:1,
  gearStowage:'normal',layerOrder:slot==='worn'?0:null,layerSlot:null,bulkExceptionZones:[],
  ...(slot==='chest'?{chestLocation:'Sklad'}:{}),...(suit?{printedSuitName:suit,acquisition:{mode:'buy',transactionId:'suit-A'}}:{})};
 };
 const p={id:'P1',name:'Pepa',hmk:{coinsPence:500,wealth:50,attributes:{str:14}}};
 const db=inventory=>({characters:[structuredClone(p)],inventory,journal:[],campaignClock:{campaignId:'A',minute:240,characterIds:['P1']}});
 const cloth=make('Cloth Tunic','worn'),pants=make('Cloth Breeches','worn');
 const chestCloth=make('Cloth Shirt','chest'),chestPants=make('Cloth Breeches','chest');
 // Bug from screenshot: a stronger outfit on body/carried CANNOT veto wardrobe from chest.
 const setup=db([cloth,pants,chestCloth,chestPants]);
 const before=JSON.stringify(setup);
 const candidate=previewChestOutfit(setup,{ownerId:'P1',location:'Sklad',mode:'clothing'});
 yes(candidate.ready);yes(candidate.ids.length>0);
 yes(candidate.ids.every(x=>[chestCloth.id,chestPants.id].includes(x)));
 eq(JSON.stringify(setup),before);
 const dressed=applyChestOutfit(setup,{ownerId:'P1',location:'Sklad',mode:'clothing',confirmed:true,idFactory:id,createdAt:'2026-10-27T12:00Z'});
 yes(dressed.inventory.some(x=>x.id===chestCloth.id&&x.slot==='worn'));
 yes(dressed.inventory.every(x=>x.characterId==='P1'));
 validateChestTransferJournal(dressed.journal);
 // Separate undress actions: plate set cloth foundation belongs to armour.
 const suit=PRINTED_ARMOUR_SUITS_P113_116.find(s=>s.name==='Plate & Mail');yes(suit);
 const suitItems=suit.articles.map(a=>make(a,'chest',suit.name));
 // A partial 16-piece suit is NOT an authoritative printed set. The solver
 // must still produce a rules-checked wearable proposal instead of the old
 // generic 'more than 12 items' error, without falsely claiming a proof.
 const partial=db(suitItems.slice(0,16));
 const partialOffer=previewChestOutfit(partial,{ownerId:'P1',location:'Sklad',mode:'armour'});
 yes(partialOffer.ready);yes(partialOffer.preview.verifiedAlternative===true||partialOffer.preview.optimal===true);
 yes(partialOffer.ids.length>=1);
 const full=db([cloth,pants,...suitItems]);
 const plan=previewChestOutfit(full,{ownerId:'P1',location:'Sklad',mode:'armour'});
 yes(plan.ready);eq(plan.ids.length,17);eq(plan.preview.printedSuit,'Plate & Mail');
 const equipped=applyChestOutfit(full,{ownerId:'P1',location:'Sklad',mode:'armour',confirmed:true,idFactory:id,createdAt:'2026-10-27T12:00Z'});
 eq(equipped.inventory.filter(x=>x.slot==='worn').length,17);
 eq(resolveCombatantLoad({character:equipped.characters[0],inventory:equipped.inventory}).armourENC,40);
 yes(previewUndressOutfit(equipped.inventory,'P1','armour').length>0);
 eq(previewUndressOutfit(equipped.inventory,'P1','clothing').length,0);
 const bare=undressOutfit(equipped.inventory,'P1','armour');eq(bare.filter(x=>x.slot==='worn').length,0);
 const cc=undressOutfit(setup.inventory,'P1','clothing');eq(cc.filter(x=>x.slot==='worn').length,0);
 // Atomic sale: actual GM-agreed proceeds, existing cash account and source item loss.
 const saleInput=db([cloth,pants,chestCloth]);
 const saleBefore=JSON.stringify(saleInput),opts={ownerId:'P1',itemIds:[cloth.id,chestCloth.id],location:'Sklad',buyer:'Kupec',proceedsPence:73,confirmed:true,idFactory:id,createdAt:'2026-10-27T13:00Z'};
 const sold=applyInventorySale(saleInput,opts);
 eq(JSON.stringify(saleInput),saleBefore);
 eq(sold.inventory.length,1);eq(sold.inventory[0].id,pants.id);
 eq(coinBalance(sold.characters[0],'A').balance,573);
 eq(sold.journal.filter(x=>x.calendarInventoryDisposition).length,2);
 validateCampaignCashAccounts(sold.characters[0]);validateInventoryDispositionJournal(sold.journal);validateChestTransferJournal(sold.journal);
 eq(sold.journal.filter(x=>x.calendarInventoryDisposition).every(x=>x.title==='Inventář · doložený prodej'),true);
 for(const changes of [
  {proceedsPence:0},{proceedsPence:1.5},{buyer:'X'},{location:'Jinde'},
  {itemIds:[cloth.id,'fake']},{itemIds:[cloth.id,cloth.id]},{confirmed:false}
 ]){
  assert.throws(()=>applyInventorySale(saleInput,{...opts,...changes}));checks++;
 }
 const corrupt=db([cloth,pants,chestCloth]);corrupt.combatRuntime={sequence:{active:true}};
 assert.throws(()=>applyInventorySale(corrupt,opts));checks++;
 console.log('PASS v93.523:',checks,'unit assertions; chest-constrained clothes & suit, independent undress, sale cash & chest journal, immutable failure guards');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
