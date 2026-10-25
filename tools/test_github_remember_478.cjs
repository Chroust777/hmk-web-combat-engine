'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const src=fs.readFileSync(__dirname+'/../src/integration/hmk-github-cloud-sync.js','utf8');
const code=ts.transpileModule(src,{fileName:'hmk-github-cloud-sync.js',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('require','module','exports',code)(require,mod,mod.exports);
const {createGitHubDeviceTokenVault,createGitHubCloudSync,CLOUD_DEVICE_TOKEN_KEY,CLOUD_CONFIG_KEY,CLOUD_SESSION_KEY}=mod.exports;
class Storage{constructor(){this.map=new Map()}getItem(k){return this.map.has(k)?this.map.get(k):null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}}
// A realistic async IndexedDB contract for the exact get/put/upgrade operations the vault performs.
function mockIndexedDB(){
 const stores=new Map();let exists=false;
 function db(){return {objectStoreNames:{contains:k=>stores.has(k)},createObjectStore(k){stores.set(k,new Map())},close(){},transaction(k){const store=stores.get(k);const tx={oncomplete:null,onerror:null,onabort:null,objectStore(){return {get(name){const r={onsuccess:null,onerror:null,result:undefined};queueMicrotask(()=>{r.result=store.get(name);r.onsuccess?.({target:r})});return r},put(v,name){store.set(name,v);queueMicrotask(()=>tx.oncomplete?.({target:tx}));return {}}}}};return tx}}}
 return {open(){const r={result:null,onupgradeneeded:null,onsuccess:null,onerror:null};queueMicrotask(()=>{r.result=db();if(!exists){exists=true;r.onupgradeneeded?.({target:r})}r.onsuccess?.({target:r})});return r}};
}
const ls=new Storage(),db=mockIndexedDB(),webcrypto=require('node:crypto').webcrypto;
const vault=()=>createGitHubDeviceTokenVault({localStorage:ls,indexedDBImpl:db,cryptoImpl:webcrypto});
let n=0;function ok(cond,msg){assert(cond,msg);n++}
const owner='Chroust777',repo='hmk-campaign-private',path='campaigns/hmk-ledger-cloud.json';let authorized='github_pat_old',raw=null,sha=null,calls=0,attempts=0;
const resp=(code,body)=>({ok:code>=200&&code<300,status:code,json:async()=>body});
const fetchImpl=async(url,options)=>{calls++;if(options.headers.Authorization!=='Bearer '+authorized){attempts++;return resp(401,{message:'Bad credentials'})}
 if(url.endsWith('/repos/'+owner+'/'+repo))return resp(200,{private:true});
 if(url.endsWith('/contents/'+path)){
  if(options.method==='GET')return raw===null?resp(404,{message:'Not Found'}):resp(200,{sha,encoding:'base64',content:Buffer.from(raw).toString('base64')});
  if(options.method==='PUT'){const doc=JSON.parse(options.body);if((doc.sha||null)!==sha)return resp(409,{message:'conflict'});raw=Buffer.from(doc.content,'base64').toString('utf8');sha='sha1';return resp(200,{content:{sha}})}
 }
 return resp(404,{});
};
const DATA='hmk-data-test';ls.setItem(DATA,JSON.stringify({characters:[]}));
function client(){const ss=new Storage();const sync=createGitHubCloudSync({localStorage:ls,sessionStorage:ss,storageKey:DATA,deviceVault:vault(),fetchImpl,readLocal:()=>ls.getItem(DATA),validate:d=>{assert(Array.isArray(d.characters));return d},applyRemote:data=>ls.setItem(DATA,data),approveReplace:()=>true});return {sync,ss}}
(async()=>{
 const v=vault();await v.save({owner,repo,token:authorized});const cipher=ls.getItem(CLOUD_DEVICE_TOKEN_KEY);
 ok(cipher!==null&&!cipher.includes(authorized),'credential encrypted at rest');
 ok((await v.restore(owner,repo))===authorized,'can decrypt with persisted key');
 ok((await v.restore(owner,'other'))===null,'repository bound');
 ls.removeItem(CLOUD_DEVICE_TOKEN_KEY);
 let {sync,ss}=client();let result=await sync.connect({owner,repo,accessToken:authorized,createIfMissing:true,rememberDevice:true});ok(result.ready,'first cloud connect');
 ok(sync.remembered,'remembered enabled');ok(!ls.getItem(CLOUD_DEVICE_TOKEN_KEY).includes(authorized),'token never in plaintext');
 ok(!raw.includes(authorized),'token not in cloud snapshot');
 ({sync,ss}=client());await sync.startup();ok(sync.status==='ready','automatic startup with new session');
 ok(ss.getItem(CLOUD_SESSION_KEY)?.includes(authorized),'new session authenticated after restart');
 authorized='github_pat_new';({sync,ss}=client());await sync.startup();ok(sync.status==='locked','expired token locked');
 ok(!sync.remembered,'expired token removed');ok(attempts===1,'no repeated bad-token polls');
 result=await sync.connect({owner,repo,accessToken:authorized,rememberDevice:true});ok(result.ready,'manual token rotation');ok(sync.remembered,'new token remembered');
 ({sync}=client());await sync.startup();ok(sync.status==='ready','new token auto reconnect');
 sync.forgetDeviceToken();ok(!sync.remembered,'manual forget');
 ({sync}=client());await sync.startup();ok(sync.status==='locked','forgotten token never reconnected');
 result=await sync.connect({owner,repo,accessToken:authorized,rememberDevice:false});ok(result.ready,'connect without remember');ok(!sync.remembered,'opt-out persists no token');
 await sync.rememberCurrentDevice();ok(sync.remembered,'one-click upgrade from existing active session');sync.forgetDeviceToken();
 ({sync}=client());await sync.startup();ok(sync.status==='locked','session-only connection requires manual reentry');
 await sync.connect({owner,repo,accessToken:authorized,rememberDevice:true});sync.disconnect();ok(!sync.remembered&&!ls.getItem(CLOUD_CONFIG_KEY),'disconnect forgets persisted credential');
 console.log('PASS',n,'device-token cases: encrypted storage, restart, expiry, rotation, opt-out, deletion, no cloud leak');
})().catch(e=>{console.error(e);process.exit(1)});
