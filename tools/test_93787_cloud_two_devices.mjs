import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=await fs.readFile(path.join(root,'src/integration/hmk-github-cloud-sync.js'),'utf8');
const {createGitHubCloudSync,encodeCloudSnapshot,decodeCloudSnapshot,CLOUD_PATH}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
function storage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
const base=JSON.stringify({characters:[{id:'p',name:'player'}],inventory:[],clock:0,journal:[]});
let remote={sha:'sha-1',content:await encodeCloudSnapshot(base)};let shaNum=1;const logs=[];
const api=async (url,{method='GET',body}={})=>{
 const path=new URL(url).pathname;
 if(method==='GET'&&path.endsWith('/hmk-sync-test-private'))return reply(200,{private:true});
 if(method==='GET'&&path.includes('/contents/'))return reply(200,{...remote,encoding:'base64'});
 if(method==='PUT'&&path.includes('/contents/')){
  const req=JSON.parse(body);if(req.sha!==remote.sha)return reply(409,{message:'SHA mismatch'});
  shaNum++;remote={sha:'sha-'+shaNum,content:req.content};logs.push({method,sha:remote.sha});return reply(200,{content:{sha:remote.sha}});
 }
 return reply(404,{message:'not found'});
};
function reply(status,json){return {ok:status>=200&&status<300,status,json:async()=>json};}
function client(id){let local=storage(),session=storage();local.setItem('campaign',base);let applied=[];
 let adapter=createGitHubCloudSync({localStorage:local,sessionStorage:session,storageKey:'campaign',validate:x=>x,
 readLocal:()=>local.getItem('campaign'),applyRemote:raw=>{local.setItem('campaign',raw);applied.push(raw)},fetchImpl:api,
 deviceVault:{has:()=>false,clear:()=>{},save:async()=>{},restore:async()=>null},clock:()=>new Date(2026,0,1).toISOString()});
 return {id,local,session,adapter,applied,edit(fn){const x=JSON.parse(local.getItem('campaign'));fn(x);const raw=JSON.stringify(x);local.setItem('campaign',raw);adapter.onLocalWrite(raw);}};
}
const A=client('GM'),B=client('Player');
for(const c of [A,B]){await c.adapter.connect({owner:'Tester',repo:'hmk-sync-test-private',accessToken:'test-token'});if(c.adapter.status!=='ready')throw Error('not ready '+c.id)}
// B changes inventory, saves remote; A still holds its old campaign.
B.edit(x=>x.inventory.push({id:'sword',characterId:'p',slot:'main_hand'}));await B.adapter.flush();
if(!(await decodeCloudSnapshot(remote.content)).includes('sword'))throw Error('B lost inventory');
// GM simultaneously confirms an action without refreshing.
A.edit(x=>{x.clock=30;x.journal.push({id:'travel-1'})});await A.adapter.flush();
const ret={statusA:A.adapter.status,statusB:B.adapter.status,canWriteA:A.adapter.canWrite(),pendingA:A.adapter.pending,
 remote:JSON.parse(await decodeCloudSnapshot(remote.content)),localA:JSON.parse(A.local.getItem('campaign')),
 localB:JSON.parse(B.local.getItem('campaign')),writes:logs,fetches:'stubbed HTTPS GitHub Contents API, no actual network'};
if(ret.statusA!=='conflict'||ret.canWriteA||!ret.pendingA||ret.remote.clock!==0||ret.remote.inventory.length!==1||ret.localA.clock!==30||ret.localA.inventory.length!==0)throw Error('bad conflict '+JSON.stringify(ret));
// No silent merge: manual replace discards conflict, so GM travel is lost; needs explicit recovery.
await A.adapter.replaceWithCloud();
const after=JSON.parse(A.local.getItem('campaign'));if(after.clock!==0||after.inventory.length!==1||A.adapter.status!=='ready')throw Error('bad replace');
console.log(JSON.stringify({test:'two-computers/cloud-SHA-conflict',result:'PASS',before:ret,after:{statusA:A.adapter.status,campaign:after},limitation:'isolated cloud adapter fake HTTP, not entire browser app or real GitHub'},null,2));
