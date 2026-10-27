const assert=require('node:assert/strict');
(async()=>{
 const {missingPrintedArmourCatalogEntries}=await import('../src/integration/armour-article-catalog.js');
 const {PRINTED_ARMOUR_SUITS_P113_116}=await import('../src/rules/armour-suit-printed.js');
 const {PRINTED_ARMOUR_ARTICLES_P118}=await import('../src/rules/armour-articles-printed.js');
 const {resolveSuitCatalogParts}=await import('../src/integration/hmk-library-tabs.js');
 const {reconcileSuitArticles}=await import('../src/integration/armour-suit-article-crosswalk.js');
 const {previewOptimalOutfit,applyOptimalOutfit}=await import('../src/integration/hmk-outfit-optimizer.js');
 const {identifyWornPrintedSuit}=await import('../src/integration/printed-suit-combat.js');
 const {resolveCombatantLoad}=await import('../src/integration/combatant-load.js');
 const catalog=missingPrintedArmourCatalogEntries([]),links=reconcileSuitArticles();
 let seq=0, successes=0;
 for(const suit of PRINTED_ARMOUR_SUITS_P113_116){
  const matched=resolveSuitCatalogParts(suit,links,PRINTED_ARMOUR_ARTICLES_P118,catalog);
  assert.ok(matched.ok,suit.name+': '+matched.reason);
  const parts=matched.parts.map(c=>({id:'id-'+(++seq),characterId:'P1',sourceItemId:c.id,snapshot:structuredClone(c),slot:'carried',quantity:1,condition:'',gearStowage:'normal',layerOrder:null,layerSlot:null,bulkExceptionZones:[],printedSuitName:suit.name,acquisition:{mode:'buy',transactionId:'tx-'+suit.name}}));
  const p=previewOptimalOutfit(parts,'P1','armour');
  assert.ok(p.ready,suit.name+' '+p.reason);
  if(p.authoritativePreset){
   const out=applyOptimalOutfit(parts,'P1',p),actual=identifyWornPrintedSuit(out,'P1');
   assert.equal(actual.name,suit.name);
   const load=resolveCombatantLoad({character:{id:'P1',hmk:{attributes:{str:12}}},inventory:out});
   assert.equal(load.armourENC,suit.enc,suit.name);
   assert.equal(load.bulkReady,true,suit.name);
   assert.equal(load.ready,true,suit.name+JSON.stringify(load.issues));
  }
  successes++;
 }
 console.log('PASS all '+successes+' printed suites catalog crosswalk & one-click equip; proper source / ENC');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
