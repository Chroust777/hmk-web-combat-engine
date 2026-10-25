'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const src=fs.readFileSync(__dirname+'/../src/integration/hmk-github-cloud-sync.js','utf8');
const commonJS=ts.transpileModule(src,{fileName:'cloud.js',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const factory=new Function('require','module','exports',commonJS);const mod={exports:{}};factory(require,mod,mod.exports);
const {createGitHubCloudSync,encodeCloudSnapshot,decodeCloudSnapshot,CLOUD_PENDING_KEY,CLOUD_SESSION_KEY,CLOUD_CONFIG_KEY}=mod.exports;
class Storage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const tick=()=>new Promise(r=>setTimeout(r,1));
let passed=0;function eq(a,b,reason){assert.deepEqual(a,b,reason);passed++}
const base=(id)=>JSON.stringify({schemaVersion:1,characters:id?[{id,name:id}]:[],items:[],inventory:[],trash:[],journal:[]});
function server({privateRepo=true}={}){
 let raw=null,sha=null,revision=0,offline=false,failWrite=false,requests=[];
 const fetchImpl=async(url,options)=>{
  requests.push({url,options});if(offline)throw Error('offline');
  if(url.endsWith('/repos/Owner/data'))return response(200,{private:privateRepo,default_branch:'main'});
  const file=url.endsWith('/contents/campaigns/hmk-ledger-cloud.json');if(!file)return response(404,{message:'not found'});
  if(options.method==='GET')return raw===null?response(404,{message:'Not Found'}):response(200,{content:Buffer.from(raw).toString('base64'),encoding:'base64',sha});
  if(options.method==='PUT'){
   if(failWrite)return response(500,{message:'fault'});
   const payload=JSON.parse(options.body);if((payload.sha||null)!==sha)return response(409,{message:'SHA mismatch'});
   raw=Buffer.from(payload.content,'base64').toString('utf8');sha='sha-'+(++revision);
   return response(200,{content:{sha}});
  }
  return response(400,{});
 };
 function response(status,v){return {ok:status>=200&&status<300,status,json:async()=>v}}
 return {fetchImpl,get sha(){return sha},get raw(){return raw},set offline(v){offline=v},set failWrite(v){failWrite=v},requests};
}
function client(api,{localStorage=new Storage(),sessionStorage=new Storage(),initial=base(),approve=true}={}){
 localStorage.setItem('DATA',initial);let changed=0,applied=[];
 const cloud=createGitHubCloudSync({localStorage,sessionStorage,storageKey:'DATA',fetchImpl:api.fetchImpl,
  validate:o=>{assert(Array.isArray(o.characters));return o},
  readLocal:()=>localStorage.getItem('DATA'),
  applyRemote:raw=>{localStorage.setItem('DATA',raw);applied.push(raw)},approveReplace:()=>approve,onStatus:()=>{changed++}});
 return {cloud,localStorage,sessionStorage,applied,get changed(){return changed},connect:(createIfMissing=false)=>cloud.connect({owner:'Owner',repo:'data',accessToken:'github_pat_example',createIfMissing})};
}
(async()=>{
 const a=server(),c1=client(a),c2=client(a,{initial:base()});
 let r=await c1.connect();eq(r.needsCreate,true,'new repo requires explicit initialization');eq(a.raw,null);
 await c1.connect(true);eq(c1.cloud.status,'ready');eq(c1.localStorage.getItem(CLOUD_CONFIG_KEY)!==null,true);
 eq(c1.localStorage.getItem(CLOUD_SESSION_KEY),null,'token never persisted in localStorage');
 eq(c1.sessionStorage.getItem(CLOUD_SESSION_KEY).includes('github_pat_example'),true,'session-scoped token');
 const snap=await decodeCloudSnapshot(Buffer.from(a.raw,'utf8').toString('base64'));eq(snap,base());
 r=await c2.connect();eq(r.ready,true);eq(c2.cloud.status,'ready');
 const fresh=base('Arel');c1.localStorage.setItem('DATA',fresh);c1.cloud.onLocalWrite(fresh);eq(c1.cloud.pending,true);
 await c1.cloud.flush();eq(c1.cloud.status,'ready');eq(c1.cloud.pending,false);
 await c2.cloud.refresh();eq(c2.applied.at(-1),fresh,'new device receives remote update');
 const older=base('Old');c2.localStorage.setItem('DATA',older);c2.cloud.onLocalWrite(older);
 const newer=base('New');c1.localStorage.setItem('DATA',newer);c1.cloud.onLocalWrite(newer);await c1.cloud.flush();
 await c2.cloud.flush();eq(c2.cloud.status,'conflict');eq(c2.localStorage.getItem('DATA'),older,'conflict keeps local unsynced changes');
 eq(c2.cloud.pending,true);await c2.cloud.replaceWithCloud();eq(c2.cloud.status,'ready');eq(c2.localStorage.getItem('DATA'),newer);
 eq(c2.localStorage.getItem(CLOUD_PENDING_KEY),null);
 a.offline=true;c1.localStorage.setItem('DATA',base('Off'));c1.cloud.onLocalWrite(base('Off'));await c1.cloud.flush();
 eq(c1.cloud.status,'error-pending');eq(c1.cloud.pending,true);eq(c1.localStorage.getItem('DATA'),base('Off'));
 a.offline=false;await c1.cloud.flush();eq(c1.cloud.status,'ready');eq(c1.cloud.pending,false);
 // second device still has stale sha; stale commit fails closed
 const privateServer=server({privateRepo:false}),blocked=client(privateServer);
 await assert.rejects(blocked.connect(true),/SOUKROMÝ/);passed++;eq(blocked.cloud.status,'local');eq(privateServer.raw,null);
 // empty local vs populated remote must explicitly ask
 const denied=client(a,{initial:base(),approve:false});await denied.connect();eq(denied.cloud.status,'needs-choice');eq(denied.localStorage.getItem('DATA'),base());
 const accepted=client(a,{initial:base()});await accepted.connect();eq(accepted.localStorage.getItem('DATA'),base('Off'));
 // Any stale local data can safely be replaced by validated cloud evidence.
 const broken=client(a,{initial:'{"characters":{}}'});await broken.connect();eq(broken.localStorage.getItem('DATA'),base('Off'));
 const raw='Žlutý kůň – Há​rn 🐴';eq(await decodeCloudSnapshot(await encodeCloudSnapshot(raw)),raw);
 const huge='a'.repeat(150000);eq(await decodeCloudSnapshot(await encodeCloudSnapshot(huge)),huge);
 console.log('GitHub Cloud adapter:',passed,'assertions PASS');
})().catch(e=>{console.error(e);process.exit(1)});
