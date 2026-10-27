'use strict';
const assert=require('node:assert/strict');
(async()=>{const {missingPrintedArmourCatalogEntries}=await import('../src/integration/armour-article-catalog.js');const {previewOptimalOutfit,applyOptimalOutfit}=await import('../src/integration/hmk-outfit-optimizer.js');const {resolveOwnedArmourArticle}=await import('../src/integration/live-combat-armour.js');const {evaluateOrderedArmour}=await import('../src/integration/armour-layer-evaluation.js');
const cat=missingPrintedArmourCatalogEntries([]).filter(x=>x.category==='armor'),choices=cat.filter(x=>/Cloth|Leather|Padded|Mail|Plate|Kurbul/i.test(x.name));let seed=5247;const next=()=>{seed=(seed*1664525+1013904223)>>>0;return seed%choices.length;};
const compare=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
function rank(items){if(!items.length)return null;const articles=items.map((x,i)=>{const t=resolveOwnedArmourArticle({...x,slot:'carried'},{allowCarried:true});if(!t.ready)throw Error(t.reason);return {...t.article,id:x.id,layerOrder:i};});const p=evaluateOrderedArmour(articles);if(p.status!=='compatible')return null;
 let av=0,rigid=new Set(),weight=0;for(let i=0;i<items.length;i++){const x=items[i],a=articles[i];weight+=a.weightLb;for(const loc of a.coveredLocations){for(const k of ['b','e','p','f'])av+=x.snapshot.properties.locationProtection?.[loc]?.[k]??0;if(a.coverageMarkers?.[loc]==='rigid'||a.rigid&&['front-only','rear-only'].includes(a.coverageMarkers?.[loc]))rigid.add(loc);}}return [av,rigid.size,p.bulkPenalty,-p.extraEnc,-Math.round(weight*10),-items.length];}
function brute(arr){let best=null;function orders(before,left){if(!left.length){const s=rank(before);if(s&&(!best||compare(s,best)>0))best=s;return;}for(let i=0;i<left.length;i++)orders([...before,left[i]],[...left.slice(0,i),...left.slice(i+1)]);}for(let mask=1;mask<(1<<arr.length);mask++)orders([],arr.filter((_,i)=>mask&(1<<i)));return best;}
let checks=0;for(let t=0;t<30;t++){
 const n=3+(t%3),items=[],seen=new Set();while(items.length<n){const c=choices[next()];const k=c.properties.material+'|'+c.name;if(seen.has(k))continue;seen.add(k);items.push({id:'case'+t+'-'+items.length,characterId:'P',sourceItemId:c.id,snapshot:structuredClone(c),slot:'carried',quantity:1});}
 const p=previewOptimalOutfit(items,'P','armour');assert.equal(p.ready,true,p.reason);assert.equal(p.optimal,true);
 const result=applyOptimalOutfit(items,'P',p).filter(x=>x.slot==='worn').sort((a,b)=>a.layerOrder-b.layerOrder);
 const obtained=rank(result),expected=brute(items);assert.deepEqual(obtained,expected,'Case '+t+': '+items.map(x=>x.snapshot.name));checks++;
}
console.log('PASS exact comparison of '+checks+' deterministic randomized 3–5-article ensembles versus exhaustive independent subset/permutation enumeration');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
