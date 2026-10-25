'use strict';
/** v93.487; simulated GitHub Contents API only. No user data / live requests. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const src=fs.readFileSync(__dirname+'/../src/integration/hmk-github-cloud-sync.js','utf8');
const code=ts.transpileModule(src,{fileName:'cloud.js',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const m={exports:{}};new Function('require','module','exports',code)(require,m,m.exports);
const {createGitHubCloudSync,decodeCloudSnapshot,decodeCloudEnvelope,CLOUD_LIVE_STORAGE_MARKER}=m.exports;
class Store{constructor(){this.m=new Map()}getItem(k){return this.m.get(k)??null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}clear(){this.m.clear()}}
const empty=JSON.stringify({schemaVersion:1,characters:[],items:[],inventory:[],trash:[],journal:[]});
const old=JSON.stringify({...JSON.parse(empty),journal:[{id:'persisted-old-action'}]});
let cloud={sha:null,encoded:null,n:0,puts:0,fail:false};
const reply=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});
async function fakeFetch(url,opt){
 assert.equal(opt.headers.Authorization,'Bearer TEST-TOKEN');
 if(url.endsWith('/repos/Owner/hmk-campaign-private'))return reply(200,{private:true});
 assert(url.endsWith('/contents/campaigns/hmk-ledger-cloud.json'));
 if(opt.method==='GET')return cloud.sha?reply(200,{sha:cloud.sha,content:cloud.encoded,encoding:'base64'}):reply(404,{});
 if(opt.method==='PUT'){
  if(cloud.fail)return reply(503,{});
  const body=JSON.parse(opt.body);
  if((body.sha??null)!==cloud.sha)return reply(409,{});
  cloud.encoded=body.content;cloud.sha='sha-'+(++cloud.n);cloud.puts++;
  return reply(200,{content:{sha:cloud.sha}});
 }
 return reply(405,{});
}
const creds={owner:'Owner',repo:'hmk-campaign-private',accessToken:'TEST-TOKEN'};
const vault={has:()=>true,save:async()=>{},restore:async()=>null,clear:()=>{}};
function device(initial=old){
 const storage=new Store(),session=new Store(),applied=[];
 if(initial!==null)storage.setItem('DATA',initial);
 let sync;
 sync=createGitHubCloudSync({localStorage:storage,sessionStorage:session,storageKey:'DATA',fetchImpl:fakeFetch,
  validate:x=>assert(Array.isArray(x.characters)),readLocal:()=>storage.getItem('DATA')||empty,
  applyRemote:(raw,opts)=>{if(storage.getItem('DATA')!==null||opts?.allowClearedStorage){storage.setItem('DATA',raw);applied.push(raw)}else throw Error('Clear not authorized')},
  approveReplace:()=>true,deviceVault:vault});
 return {storage,session,sync,applied,connect:(x={})=>sync.connect({...creds,...x}),reset:()=>sync.resetDevelopmentCampaign({emptySnapshot:empty})};
}
let assertions=0;function eq(a,b,msg){assert.deepEqual(a,b,msg);assertions++}
(async()=>{
 const a=device();await a.connect({createIfMissing:true});
 eq(a.sync.status,'ready','A connected');eq(a.sync.localStorageCleared,false,'marker not missing');
 eq(a.storage.getItem(CLOUD_LIVE_STORAGE_MARKER)!==null,true,'watch armed');
 const b=device(empty);await b.connect();eq(b.storage.getItem('DATA'),old,'B synchronizes old campaign');
 const offline=device(empty);await offline.connect(); // Disconnected later, still knows the pre-reset revision.
 // Offline edit on B must NOT survive a shared reset.
 b.storage.setItem('DATA',old+' ');b.sync.onLocalWrite(old+' ');
 // The developer clears all F12 localStorage while A remains running/authenticated.
 a.storage.clear();a.session.clear();
 eq(a.sync.localStorageCleared,true,'F12 event detected without reload');
 eq(a.sync.canWrite(),false,'old game actions blocked when storage is gone');
 await a.reset();
 eq(a.storage.getItem('DATA'),empty,'A clean after F12');
 eq(a.sync.localStorageCleared,false,'watch rearmed');
 eq(a.sync.status,'ready','A ready without reentering token');
 eq(a.session.getItem('hmk-cloud-github-session-v1')!==null,true,'connection session restored');
 eq(await decodeCloudSnapshot(cloud.encoded),empty,'cloud empty after F12');
 eq((await decodeCloudEnvelope(cloud.encoded)).resetId!==null,true,'reset marker carried by same authoritative GitHub file');
 await b.sync.refresh();
 eq(b.storage.getItem('DATA'),empty,'B takes new reset even with pending changes');
 eq(b.sync.pending,false,'stale pending removed');eq(b.sync.status,'ready','B returns ready');
 // Subsequent edits must keep the reset generation on the SAME GitHub document,
 // or an offline device could accidentally resurrect a pre-reset campaign.
 const gen=(await decodeCloudEnvelope(cloud.encoded)).resetId;
 b.storage.setItem('DATA',old);b.sync.onLocalWrite(old);await b.sync.flush();
 eq((await decodeCloudEnvelope(cloud.encoded)).resetId,gen,'normal sync preserves shared reset generation');
 offline.storage.setItem('DATA',old+' ');offline.sync.onLocalWrite(old+' ');
 await offline.sync.refresh();
 eq(offline.storage.getItem('DATA'),old,'offline pre-reset changes replaced with current post-reset campaign');
 eq(offline.sync.pending,false,'post-reset generation supersedes stale offline pending');
 // Updating code itself must never alter cloud data.
 const writes=cloud.puts;await b.sync.refresh();eq(cloud.puts,writes,'refresh never writes');
 // One-click manual reset remains available without F12.
 const c=device();await c.connect();await c.reset();
 eq(c.storage.getItem('DATA'),empty,'one-click reset works with remembered credentials');
 eq(cloud.puts,writes+1,'one-click reset performed one GitHub CAS commit');
 // A browser which starts with empty storage & no token cannot reset private cloud.
 const blank=device(null);
 await assert.rejects(blank.reset(),/připojen/);assertions++;
 eq(await decodeCloudSnapshot(cloud.encoded),empty,'blank browser does not silently reset');
 // HTTP failure may not leave the tab believing reset succeeded.
 cloud.fail=true;a.storage.clear();await assert.rejects(a.reset(),/503/);assertions++;
 eq(a.sync.localStorageCleared,true,'failed remote reset leaves clear marker absent for retry');
 cloud.fail=false;await a.reset();eq(a.storage.getItem('DATA'),empty,'retry after network resumes succeeds');
 console.log(`PASS ${assertions} development cloud reset assertions, ${cloud.puts} mocked commits, zero live requests`);
})().catch(e=>{console.error(e);process.exit(1)});
