'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {missingPrintedArmourCatalogEntries}=await import('../src/integration/armour-article-catalog.js');
 const {PRINTED_ARMOUR_SUITS_P113_116}=await import('../src/rules/armour-suit-printed.js');
 const {previewOptimalOutfit,applyOptimalOutfit}=await import('../src/integration/hmk-outfit-optimizer.js');
 const {previewChestOutfit}=await import('../src/integration/hmk-inventory-batch-522.js');
 const cat=missingPrintedArmourCatalogEntries([]);
 let i=0;
 const make=(name,slot='carried',receipt='')=>{
  const source=cat.find(x=>x.name.toLowerCase()===(name.toLowerCase()==='great helm'?'plate great helm':name.toLowerCase()));
  assert.ok(source,name+' missing');
  return {id:'rigid-526-'+(++i),characterId:'P',sourceItemId:source.id,snapshot:structuredClone(source),quantity:1,slot,
   ...(slot==='chest'?{chestLocation:'Tashal chest'}:{}),
   ...(receipt?{printedSuitName:'Plate & Mail',acquisition:{mode:'buy',transactionId:receipt}}:{})};
 };
 // White-box padded lacks rigid/metal. Grey Mail is rigid and qualifies for
 // optional p133 Edge; Black Plate is rigid and qualifies for both Edge/Point.
 const padded=make('Padded Leggings'),mail=make('Mail Leggings'),plate=make('Plate Greaves');
 assert.deepEqual(padded.snapshot.properties.coverageMarkers,{th:'standard',kn:'standard',ca:'standard',ft:'standard'});
 for(const z of ['th','kn','ca','ft'])assert.equal(mail.snapshot.properties.coverageMarkers[z],'rigid');
 assert.equal(plate.snapshot.properties.coverageMarkers.ca,'rigid');
 const input=[padded,mail],before=JSON.stringify(input);
 const preview=previewOptimalOutfit(input,'P','armour');
 assert.equal(preview.ready,true,preview.reason);
 assert.deepEqual(new Set(preview.names),new Set(['Padded Leggings','Mail Leggings']));
 assert.equal(preview.totalAV,108);
 assert.equal(preview.rigidLocations,4);
 assert.equal(preview.metalEdgeLocations,4);
 assert.equal(preview.metalPointLocations,0);
 assert.equal(JSON.stringify(input),before);
 const result=applyOptimalOutfit(input,'P',preview);
 assert.equal(result.filter(x=>x.slot==='worn').length,2);
 const mailOnly=previewOptimalOutfit([mail],'P','armour'),paddedOnly=previewOptimalOutfit([padded],'P','armour');
 assert.equal(mailOnly.totalAV>paddedOnly.totalAV,true);
 assert.equal(mailOnly.rigidLocations>paddedOnly.rigidLocations,true);
 assert.equal(mailOnly.metalEdgeLocations,4);
 assert.equal(paddedOnly.metalEdgeLocations,0);
 const black=previewOptimalOutfit([plate],'P','armour');
 assert.equal(black.metalPointLocations,1);
 assert.equal(black.metalEdgeLocations,1);
 // Two mail garments overlapping the same leg zone need a layer audit;
 // a single piece's higher numbers do not override actual HMK legality.
 const mix=[make('Padded Leggings'),make('Mail Leggings'),make('Mail Hauberk'),make('Padded Coat'),make('Cloth Breeches'),make('Plate Greaves'),make('Plate Kneecops')];
 const mixResult=previewOptimalOutfit(mix,'P','armour');
 assert.equal(mixResult.ready,true,mixResult.reason);
 assert.equal(mixResult.optimal,true);
 const wornMix=applyOptimalOutfit(mix,'P',mixResult);
 assert.equal(wornMix.filter(x=>x.slot==='worn').length,mixResult.placements.length);
 // All 17 articles of a verified purchased Plate & Mail MUST remain eligible,
 // even though a generic mixed-set zone test may not reproduce the printed suit.
 const suit=PRINTED_ARMOUR_SUITS_P113_116.find(x=>x.name==='Plate & Mail');
 assert.ok(suit);
 const suitItems=suit.articles.map((n,j)=>make(n,j%3===0?'worn':j%3===1?'carried':'chest','receipt-526'));
 const chestPreview=previewChestOutfit({characters:[{id:'P'}],inventory:suitItems,journal:[],campaignClock:{campaignId:'campaign',minute:0,characterIds:['P']}},{ownerId:'P',location:'Tashal chest',mode:'armour'});
 assert.equal(chestPreview.ready,true,chestPreview.reason);
 assert.equal(chestPreview.preview.printedSuit,'Plate & Mail');
 assert.equal(chestPreview.preview.placements.length,17);
 assert.equal(chestPreview.preview.names.includes('Mail Leggings'),true);
 assert.equal(chestPreview.preview.names.includes('Padded Leggings'),true);
 assert.equal(chestPreview.preview.metalPointLocations>0,true);
 assert.equal(chestPreview.preview.metalEdgeLocations>0,true);
 console.log('PASS 526: padded vs mail, p111/p133 white-grey-black effects, legal layers, full purchased Plate & Mail with both leggings, no mutation');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
