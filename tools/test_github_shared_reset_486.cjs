'use strict';
/* v93.486: No real GitHub calls or campaign data. Two independent devices, mocked Contents CAS. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const src=fs.readFileSync(__dirname+'/../src/integration/hmk-github-cloud-sync.js','utf8');
const code=ts.transpileModule(src,{fileName:'cloud.js',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const moduleObj={exports:{}};new Function('require','module','exports',code)(require,moduleObj,moduleObj.exports);
const {createGitHubCloudSync,decodeCloudSnapshot,CLOUD_CONFIG_KEY,CLOUD_PENDING_KEY,CLOUD_SESSION_KEY}=moduleObj.exports;
class Store{constructor(){this.val=new Map()}getItem(k){return this.val.get(k)??null}setItem(k,v){this.val.set(k,String(v))}removeItem(k){this.val.delete(k)}clear(){this.val.clear()}}
const empty=JSON.stringify({schemaVersion:1,characters:[],items:[],inventory:[],trash:[],journal:[]});
const populated=JSON.stringify({schemaVersion:1,characters:[{id:'hero'}],items:[],inventory:[],trash:[],journal:[{id:'wound'}]});
let sha=null,revision=0,encoded=null,privateRepo=true,writeCount=0,failedWrite=false,clobberNext=false,networkOffline=false;
const reply=(n,b)=>({ok:n>=200&&n<300,status:n,json:async()=>b});
const fetchImpl=async(url,o)=>{
 if(networkOffline)throw Error('Simulated offline fetch');
 if(url.endsWith('/repos/Owner/hmk-campaign-private'))return reply(200,{private:privateRepo});
 assert(url.endsWith('/contents/campaigns/hmk-ledger-cloud.json'));
 if(o.method==='GET')return sha?reply(200,{sha,encoding:'base64',content:Buffer.from(encoded).toString('base64')}):reply(404,{message:'not found'});
 if(o.method==='PUT'){
  if(failedWrite)return reply(500,{message:'test error'});
  const req=JSON.parse(o.body);if(clobberNext){sha='revision-other';clobberNext=false;}
  if((req.sha||null)!==sha)return reply(409,{message:'conflict'});
  encoded=Buffer.from(req.content,'base64').toString('utf8');sha='revision-'+(++revision);writeCount++;
  return reply(200,{content:{sha}});
 }
 return reply(405,{});
};
function device(initial=populated,source=new Store(),session=new Store()){
 let applied=[];if(initial!==null)source.setItem('DATA',initial);
 const sync=createGitHubCloudSync({localStorage:source,sessionStorage:session,storageKey:'DATA',fetchImpl,
   validate:d=>{assert(Array.isArray(d.characters));return d},readLocal:()=>source.getItem('DATA')||empty,
   applyRemote:s=>{source.setItem('DATA',s);applied.push(s)},approveReplace:()=>true,
   deviceVault:{has:()=>false,save:async()=>{},restore:async()=>null,clear:()=>{}}});
 const credentials={owner:'Owner',repo:'hmk-campaign-private',accessToken:'github_pat_FAKE'};
 return {sync,source,session,applied,credentials,connect:(x={})=>sync.connect({...credentials,...x}),
  reset:(x={})=>sync.resetSharedCampaign({...credentials,emptySnapshot:empty,...x})};
}
let count=0;function eq(a,b,label){assert.deepEqual(a,b,label);count++}
(async()=>{
 const a=device();await a.connect({createIfMissing:true});eq(a.sync.status,'ready','initial creation');
 eq(await decodeCloudSnapshot(Buffer.from(encoded).toString('base64')),populated,'remote seeded');
 const b=device(empty);await b.connect();eq(b.source.getItem('DATA'),populated,'device B loads cloud');
 const oldSha=sha;
 await a.reset();eq(a.sync.status,'ready','reset completes');eq(a.source.getItem('DATA'),empty,'device A cleared');eq(sha!==oldSha,true,'new authoritative revision');
 eq(await decodeCloudSnapshot(Buffer.from(encoded).toString('base64')),empty,'cloud contains empty canonical db');
 await b.sync.refresh();eq(b.source.getItem('DATA'),empty,'other device refreshes empty state');
 // F12 local clearing cannot touch shared cloud; afterward the reset is available without saved config.
 a.source.clear();a.session.clear();eq(await decodeCloudSnapshot(Buffer.from(encoded).toString('base64')),empty,'F12 clear cannot trigger remote delete');
 const fresh=device(null,a.source,a.session);await fresh.reset();eq(fresh.source.getItem('DATA'),empty,'new device from empty storage can reset remote using credentials');
 eq(fresh.source.getItem(CLOUD_CONFIG_KEY)!==null,true,'repository retained after reset');
 eq(fresh.session.getItem(CLOUD_SESSION_KEY).includes('github_pat_FAKE'),true,'token confined to session');
 eq(fresh.source.getItem(CLOUD_SESSION_KEY),null,'token not stored in cleartext local');
 // Stale queued edits must never resurrect the old campaign after shared reset.
 const offline=device(empty);await offline.connect();
 offline.source.setItem('DATA',populated);offline.sync.onLocalWrite(populated);eq(offline.sync.pending,true,'unsynced local saved');
 const third=device(empty);await third.connect();await third.reset();
 await offline.sync.flush();eq(offline.sync.status,'conflict','old SHA cannot overwrite reset');
 eq(offline.source.getItem('DATA'),populated,'pending local stays for manual resolution');
 await offline.sync.replaceWithCloud();eq(offline.source.getItem('DATA'),empty,'explicit remote restore clears stale');
 // Previously a failed refresh became permanently stuck in error-pending.
 const recovering=device(empty);await recovering.connect();await third.reset();
 networkOffline=true;await recovering.sync.refresh();eq(recovering.sync.status,'error-pending','network outage reported');
 networkOffline=false;await recovering.sync.refresh();eq(recovering.sync.status,'ready','next poll recovers automatically');
 eq(recovering.source.getItem('DATA'),empty,'recovered poll applies cloud reset');
 // A pending edit on same device makes reset unavailable.
 const pending=device(empty);await pending.connect();pending.source.setItem('DATA',populated);pending.sync.onLocalWrite(populated);
 await assert.rejects(pending.reset(),/neodeslané/);count++;
 eq(pending.source.getItem('DATA'),populated,'pending edits preserved');
 // Strict empty proof: reset must not publish a "new" nonempty campaign.
 await assert.rejects(third.reset({emptySnapshot:populated}),/pouze novou prázdnou/);count++;
 // Reset fails securely if permission fails or repo becomes public.
 privateRepo=false;await assert.rejects(third.reset(),/SOUKROMÝ/);count++;privateRepo=true;
 // A freshly advanced remote SHA on another device is not reset using an old online connection.
 await assert.rejects(b.reset(),/změnil na jiném zařízení/);count++;
 // Even an untracked first-time device cannot win a race against a concurrent PUT.
 const newD=device(null);clobberNext=true;await assert.rejects(newD.reset(),/409/);count++;
 eq(newD.sync.status,'local','reset request rolls back if GitHub CAS fails');
 // A failing write must not replace local data.
 failedWrite=true;const before=fresh.source.getItem('DATA');
 const failing=device(null);await assert.rejects(failing.reset(),/500/);count++;
 eq(fresh.source.getItem('DATA'),before,'local state intact after network failure');
 console.log(`PASS ${count} shared-reset assertions, ${writeCount} mocked GitHub commits, no real network`);
})().catch(e=>{console.error(e);process.exit(1)});
