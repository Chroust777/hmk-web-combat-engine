'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {missingPrintedArmourCatalogEntries}=await import('../src/integration/armour-article-catalog.js');
 const {previewOptimalOutfit,applyOptimalOutfit,isCloth}=await import('../src/integration/hmk-outfit-optimizer.js');
 const {previewChestOutfit,applyChestOutfit}=await import('../src/integration/hmk-inventory-batch-522.js');
 const {resolveOwnedArmourArticle}=await import('../src/integration/live-combat-armour.js');
 const {evaluateOrderedArmour}=await import('../src/integration/armour-layer-evaluation.js');
 const {PRINTED_ARMOUR_SUITS_P113_116}=await import('../src/rules/armour-suit-printed.js');
 const catalog=missingPrintedArmourCatalogEntries([]);
 const id=(()=>{let i=0;return()=>`exact-524-${++i}`})();
 const owner={id:'P1',name:'Pepa',hmk:{coinsPence:500,wealth:50,attributes:{str:14}}};
 const make=(name,slot='carried',receipt='')=>{
  const c=catalog.find(x=>x.name.toLowerCase()===(name.toLowerCase()==='great helm'?'plate great helm':name.toLowerCase()));
  assert.ok(c,'catalog item '+name);
  return {id:id(),characterId:'P1',sourceItemId:c.id,snapshot:structuredClone(c),quantity:1,slot,gearStowage:'normal',layerOrder:slot==='worn'?0:null,layerSlot:null,bulkExceptionZones:[],...(slot==='chest'?{chestLocation:'Sklad'}:{}),...(receipt?{printedSuitName:'Plate & Mail',acquisition:{transactionId:receipt,mode:'buy'}}:{})};
 };
 const db=inventory=>({characters:[structuredClone(owner)],inventory,journal:[],campaignClock:{campaignId:'A',minute:240,characterIds:['P1']}});
 const gear=[make('Cloth Tunic','worn'),make('Leather Vest','carried'),make('Cloth Breeches','chest'),make('Mail Cowl','chest'),make('Padded Coat','carried')];
 assert.equal(isCloth(make('Cloth Tunic')),true);
 assert.equal(isCloth(make('Leather Vest')),true);
 assert.equal(isCloth(make('Leather Boots')),true);
 assert.equal(isCloth(make('Padded Shirt')),true);
 assert.equal(isCloth(make('Mail Cowl')),false);
 assert.equal(isCloth(make('Padded Coat')),false);
 const plan=previewChestOutfit(db(gear),{ownerId:'P1',location:'Sklad',mode:'armour'});
 assert.equal(plan.ready,true,plan.reason);
 assert.equal(plan.preview.optimal,true);
 assert.equal(plan.preview.examinedBranches>0,true);
 console.log('MIXED chosen:',plan.preview.names,'from chest:',plan.names);
 // All 3 sources present in solver's full candidate pool, not chest-exclusive.
 const world=gear.map(x=>x.slot==='chest'?{...x,slot:'carried'}:x);
 assert.deepEqual(plan.preview.names,previewOptimalOutfit(world,'P1','armour').names);
 const source=JSON.stringify(gear);
 if(plan.ids.length){const result=applyChestOutfit(db(gear),{ownerId:'P1',location:'Sklad',mode:'armour',confirmed:true,idFactory:id,createdAt:'2026-10-27T14:00Z'});
  assert.equal(result.inventory.filter(x=>x.slot==='worn').length,plan.preview.placements.length);
  assert.equal(result.inventory.some(x=>x.id===gear[1].id),true);
  assert.equal(result.journal.length,plan.ids.length);
 }
 assert.equal(JSON.stringify(gear),source,'read-only previews');
 // Direct proof against independent brute-force enumeration (all subsets,
 // all physical orders) for small unconstrained custom outfit sets.
 const exactRank=list=>{
  if(!list.length)return null;
  const articles=list.map((x,i)=>{const check=resolveOwnedArmourArticle({...x,slot:'carried'},{allowCarried:true});assert.ok(check.ready);return {...check.article,id:x.id,layerOrder:i};});
  const proof=evaluateOrderedArmour(articles);
  if(proof.status!=='compatible')return null;
  let av=0,rigid=new Set();for(let i=0;i<list.length;i++){
   const x=list[i],a=articles[i];for(const loc of a.coveredLocations){for(const as of ['b','e','p','f'])av+=x.snapshot.properties.locationProtection[loc][as]??0;
    if(a.coverageMarkers?.[loc]==='rigid'||a.rigid&&['front-only','rear-only'].includes(a.coverageMarkers?.[loc]))rigid.add(loc);}}
  return [av,rigid.size,proof.bulkPenalty,-proof.extraEnc,-Math.round(list.reduce((s,x)=>s+x.snapshot.properties.weightLb,0)*10),-list.length];
 };
 const compare=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
 const brute=items=>{
  let high=null;
  function perms(prefix,remaining){if(!remaining.length){const score=exactRank(prefix);if(score&&(!high||compare(score,high)>0))high=score;return;}
   for(let i=0;i<remaining.length;i++)perms([...prefix,remaining[i]],[...remaining.slice(0,i),...remaining.slice(i+1)]);
  }
  for(let mask=1;mask<(1<<items.length);mask++)perms([],items.filter((_,i)=>mask&(1<<i)));
  return high;
 };
 // Skip duplicate catalog article types; the automatic optimizer intentionally
 // never layers two identical shirts/trousers even when bought twice.
 const suites=[['Cloth Tunic','Leather Vest','Cloth Breeches','Mail Cowl'],
  ['Plate Helm','Padded Cap','Cloth Tunic','Mail Hauberk'],
  ['Leather Cap','Padded Shirt','Cloth Shirt','Cloth Surcoat']];
 for(const names of suites){const articles=names.map(n=>make(n));const solver=previewOptimalOutfit(articles,'P1','armour');const reference=brute(articles);
  assert.equal(solver.ready,true,solver.reason);
  assert.equal(solver.optimal,true,'must offer mathematical certificate');
  const worn=applyOptimalOutfit(articles,'P1',solver).filter(x=>x.slot==='worn').sort((a,b)=>a.layerOrder-b.layerOrder);
  const obtained=exactRank(worn);
  assert.deepEqual(obtained,reference,'solver optimum equals independent brute-force optimum: '+names.join(','));
 }
 // Two different sources with the same named garment: automatic outfit must
 // never wear two Cloth Breeches, but does not delete either inventory record.
 const double=db([make('Cloth Breeches'),make('Cloth Breeches','chest'),make('Cloth Tunic')]);
 const doublePlan=previewChestOutfit(double,{ownerId:'P1',location:'Sklad',mode:'clothing'});
 assert.equal(doublePlan.ready,true);
 assert.equal(doublePlan.preview.names.filter(n=>n==='Cloth Breeches').length,1);
 // Physical purchased suit split among worn, carried and chest articles must
 // still be detected as ONE printed receipt and equipped as a whole.
 const suit=PRINTED_ARMOUR_SUITS_P113_116.find(s=>s.name==='Plate & Mail');
 const full=suit.articles.map((n,i)=>make(n,i%3===0?'worn':i%3===1?'carried':'chest','one-buy'));
 const fullPlan=previewChestOutfit(db(full),{ownerId:'P1',location:'Sklad',mode:'armour'});
 assert.equal(fullPlan.ready,true,fullPlan.reason);
 assert.equal(fullPlan.preview.printedSuit,'Plate & Mail');
 assert.equal(fullPlan.preview.optimal,true);
 assert.equal(fullPlan.preview.placements.length,17);
 console.log('PASS v93.524: 3 independent exhaustive comparisons; mixed chest/carried/worn sources, split printed suit, ordinary clothing taxonomy, duplicate articles, immutable previews');
})().catch(err=>{console.error(err.stack);process.exitCode=1});
