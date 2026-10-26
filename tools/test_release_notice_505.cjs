'use strict';
// Regression: a deployed build must never report itself as a newer release.
// Simulates the release checker in the actual index.html without network access.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const bundle=fs.readFileSync(path.join(root,'hmk-app.bundle.js'),'utf8');
const pageVersion=index.match(/<title>[^<]*v(\d+\.\d+)<\/title>/)?.[1];
const appVersion=app.match(/const APP_VERSION='(\d+\.\d+)'/)?.[1];
assert.equal(pageVersion,'93.505');
assert.equal(appVersion,pageVersion,'Title and app must be the same release');
assert.ok(bundle.includes("APP_VERSION = '93.505'" )||bundle.includes("APP_VERSION='93.505'"),'Bundle must contain current application version');
assert.ok(index.includes('hmk-app.bundle.js?v=93.505-'),'Entry bundle must use current cache key');
const scripts=[...index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const script=scripts.find(s=>s.includes('hmk_release_check'));
assert.ok(script,'Release script found');
assert.match(script,/document\.title\.match/,'Version must derive from current page, not stale hard-coded string');
async function scenario(remote,expected,hidden=false){
 const listeners={},nodes=[],elements={};let polls=0,reloads=0;
 const document={title:'HMK Keeper’s Ledger · v'+pageVersion,visibilityState:hidden?'hidden':'visible',
   addEventListener(type,fn){listeners[type]=fn},
   querySelector(sel){return elements[sel]||null},
   createElement(tag){return {tagName:tag,style:{},setAttribute(){},append(...children){this.children=children}}},
   body:{appendChild(node){nodes.push(node);elements['#'+node.id]=node}}
 };
 const window={addEventListener(type,fn){listeners[type]=fn},location:{reload(){reloads++}}};
 let interval;
 const fetch=async function(url,options){polls++;assert.match(url,/hmk_release_check/);assert.equal(options.cache,'no-store');return {ok:true,text:async()=>`<title>HMK Keeper’s Ledger · v${remote}</title>`}};
 vm.runInNewContext(script,{document,window,fetch,Date,setInterval:fn=>{interval=fn}}, {timeout:1000});
 assert.equal(typeof interval,'function');
 for(let n=0;n<3;n++){await interval()}
 await Promise.resolve();await Promise.resolve();
 assert.equal(nodes.length,expected,'Expected notice count for remote '+remote);
 assert.equal(Boolean(window.__hmkOutdatedBuild),Boolean(expected));
 if(expected){assert.ok(nodes[0].children[0].textContent.includes(remote));nodes[0].children[1].onclick();assert.equal(reloads,1)}
 if(hidden)assert.equal(polls,0);
 return polls;
}
(async()=>{
 assert.equal(await scenario('93.505',0),3,'Same release continues monitoring but never warns');
 await scenario('93.504',0);
 await scenario('93.506',1);
 await scenario('94.001',1);
 await scenario('93.505',0,true);
 console.log('OK: 5 simulated release scenarios, one warning only for truly newer builds, version + bundle + cache parity');
})().catch(e=>{console.error(e);process.exitCode=1});
