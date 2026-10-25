/** HMK private GitHub repository cloud snapshot adapter.
 * Only the canonical localStorage database is synced. Never upload API credentials,
 * per-tab UI drafts or software code. All writes use GitHub Contents SHA compare-and-swap.
 * Source of truth after connection: validated remote document, not last opened browser.
 */
export const CLOUD_CONFIG_KEY='hmk-cloud-github-config-v1';
export const CLOUD_PENDING_KEY='hmk-cloud-github-pending-v1';
export const CLOUD_SESSION_KEY='hmk-cloud-github-session-v1';
export const CLOUD_PATH='campaigns/hmk-ledger-cloud.json';
const MAX_FILE_SIZE=900000;
function parse(raw){try{return JSON.parse(raw)}catch{return null}}
function validRepo(owner,repo){return /^[A-Za-z0-9-]{1,39}$/.test(owner)&&/^[A-Za-z0-9_.-]{1,100}$/.test(repo)&&repo!=='.'&&repo!=='..'}
function toBase64(u8){let parts=[];for(let i=0;i<u8.length;i+=16384)parts.push(String.fromCharCode(...u8.slice(i,i+16384)));return btoa(parts.join(''))}
function fromBase64(b64){const s=atob(b64.replace(/\s/g,''));return Uint8Array.from(s,c=>c.charCodeAt(0))}
async function compressBytes(bytes){if(typeof CompressionStream!=='function')return {encoding:'utf8-base64',value:toBase64(bytes)};
 const writer=new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
 return {encoding:'gzip-base64',value:toBase64(new Uint8Array(await new Response(writer).arrayBuffer()))};}
async function decompressBytes(envelope){if(envelope.encoding==='utf8-base64')return fromBase64(envelope.payload);
 if(envelope.encoding!=='gzip-base64'||typeof DecompressionStream!=='function')throw Error('Nepodporovaný komprimovaný cloudový formát');
 const stream=new Blob([fromBase64(envelope.payload)]).stream().pipeThrough(new DecompressionStream('gzip'));
 return new Uint8Array(await new Response(stream).arrayBuffer());}
export async function encodeCloudSnapshot(serialized){
 const bytes=new TextEncoder().encode(serialized);
 const compressed=await compressBytes(bytes);
 const envelope=JSON.stringify({format:'hmk-ledger-github-cloud-v1',encoding:compressed.encoding,payload:compressed.value});
 const file=new TextEncoder().encode(envelope);
 if(file.byteLength>MAX_FILE_SIZE)throw Error('Kampaň je pro tento režim GitHub Contents příliš velká (limit 900 KB komprimovaného souboru). Zápis neproběhl.');
 return toBase64(file);
}
export async function decodeCloudSnapshot(githubContent){
 const envelope=parse(new TextDecoder().decode(fromBase64(githubContent)));
 if(envelope?.format!=='hmk-ledger-github-cloud-v1'||typeof envelope.payload!=='string')throw Error('Soubor na GitHubu není databáze HMK.');
 return new TextDecoder().decode(await decompressBytes(envelope));
}
export function createGitHubCloudSync({localStorage,sessionStorage,storageKey,validate,applyRemote,readLocal,fetchImpl=fetch,onStatus=()=>{},approveReplace=()=>false,clock=()=>new Date().toISOString()}){
 let config=parse(localStorage.getItem(CLOUD_CONFIG_KEY));
 if(!config||!validRepo(config.owner||'',config.repo||''))config=null;
 let token='';
 let status=config?'locked':'local',error='',sha=null,pending=false,working=false,dirty=null,scheduled=null;
 const pendingKey=()=>config?.owner+'/'+config?.repo;
 const savedPending=()=>parse(localStorage.getItem(CLOUD_PENDING_KEY));
 const isPending=()=>savedPending()?.repository===pendingKey();
 function notify(){onStatus({status,error,configured:!!config,owner:config?.owner||'',repo:config?.repo||'',pending:pending||isPending()});}
 function setStatus(s,e=''){status=s;error=e;notify();}
 function api(path){return 'https://api.github.com/repos/'+encodeURIComponent(config.owner)+'/'+encodeURIComponent(config.repo)+path;}
 async function request(method,url,body){
  const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'};
  if(body!==undefined)headers['Content-Type']='application/json';
  let response;
  try{response=await fetchImpl(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});}catch(err){throw Error('GitHub není dostupný: '+err.message)}
  let result;try{result=await response.json()}catch{result={}};
  if(!response.ok){const e=new Error('GitHub HTTP '+response.status+(result.message?': '+String(result.message).slice(0,160):''));e.httpStatus=response.status;throw e;}
  return result;
 }
 async function verifyPrivateRepository(){const r=await request('GET',api(''));if(r.private!==true)throw Error('Pro ukládání kampaní musí být vybraný GitHub repozitář SOUKROMÝ.');}
 async function getCloud(){
  try{const r=await request('GET',api('/contents/'+CLOUD_PATH));
   if(typeof r.sha!=='string'||typeof r.content!=='string'||r.encoding!=='base64')throw Error('Nepodporovaný cloudový soubor nebo překročený limit GitHub Contents.');
   const raw=await decodeCloudSnapshot(r.content);validate(JSON.parse(raw));return {sha:r.sha,raw};
  }catch(err){if(err.httpStatus===404)return null;throw err}
 }
 function flagPending(serialized){localStorage.setItem(CLOUD_PENDING_KEY,JSON.stringify({repository:pendingKey(),sha,at:clock()}));pending=true;dirty=serialized;}
 function clearPending(){localStorage.removeItem(CLOUD_PENDING_KEY);pending=false;dirty=null;}
 function canWrite(){return !config||['ready','syncing','pending','error-pending'].includes(status);}
 function onLocalWrite(serialized){if(!config)return;
  if(!canWrite())throw Error('GitHub cloud není bezpečně připojen. Zápis je zablokován.');
  flagPending(serialized);setStatus('pending');
  if(scheduled!==null)clearTimeout(scheduled);
  scheduled=setTimeout(()=>{scheduled=null;void flush();},650);
 }
 async function connect({owner,repo,accessToken,createIfMissing=false}={}){
  if(!validRepo(owner||'',repo||''))throw Error('Zadejte vlastníka a název GitHub repozitáře.');
  if(typeof accessToken!=='string'||!accessToken.trim())throw Error('Zadejte fine-grained GitHub token pro soukromý repozitář.');
  if(working)throw Error('Synchronizace právě probíhá.');
  if(config&&(config.owner!==owner||config.repo!==repo)&&isPending())throw Error('Na tomto zařízení čekají neodeslané změny z jiné databáze.');
  const old={config,token,status,sha};
  config={owner,repo};token=accessToken.trim();setStatus('connecting');working=true;
  try{
   await verifyPrivateRepository();const remote=await getCloud();
   if(!remote){
    if(!createIfMissing){setStatus('needs-create');return {needsCreate:true};}
    sha=null;
    // Publishing is explicit. Even an empty local document is a real source state.
    const raw=readLocal();validate(JSON.parse(raw));
    const payload=await encodeCloudSnapshot(raw);
    const result=await request('PUT',api('/contents/'+CLOUD_PATH),{message:'HMK: initial private campaign checkpoint',content:payload});
    sha=result.content?.sha;if(!sha)throw Error('GitHub nepotvrdil SHA počátečního zápisu.');
    clearPending();
   }else{
    sha=remote.sha;
    const local=readLocal(),hasPending=isPending();
    if(hasPending&&local!==remote.raw){
     if(savedPending().sha!==sha){setStatus('conflict','Cloud má novější změny než neodeslaný místní zápis. Zvolte, kterou verzi zachovat.');return {conflict:true};}
     dirty=local;pending=true;
    }else if(local!==remote.raw){
     // All incoming snapshots are validated before replacing any local bytes.
     if(!approveReplace('Na GitHubu je jiný stav kampaní. Načíst jej do tohoto zařízení? Místní data se nahradí.')){
      localStorage.setItem(CLOUD_CONFIG_KEY,JSON.stringify(config));sessionStorage.setItem(CLOUD_SESSION_KEY,JSON.stringify({owner,repo,token}));setStatus('needs-choice','Načtení cloudu bylo odmítnuto. Místní data se nezměnila.');return {needsChoice:true};}
     applyRemote(remote.raw);clearPending();
    }else clearPending();
   }
   localStorage.setItem(CLOUD_CONFIG_KEY,JSON.stringify(config));
   sessionStorage.setItem(CLOUD_SESSION_KEY,JSON.stringify({owner,repo,token}));
   setStatus(pending?'pending':'ready');
  }catch(err){config=old.config;token=old.token;sha=old.sha;setStatus(old.config?'locked':'local',err.message);throw err}
  finally{working=false;}
  if(pending)void flush();
  return {ready:true};
 }
 async function flush(){
  if(!config||!token||!['pending','ready','error-pending','syncing'].includes(status)||working)return;
  working=true;
  try{
   while(pending){
    const snapshot=dirty||readLocal();setStatus('syncing');
    const remote=await getCloud();
    if(remote&&remote.raw===snapshot){sha=remote.sha;if(dirty===snapshot)clearPending();else continue;break;}
    if((remote?.sha||null)!==sha){setStatus('conflict','Jiné zařízení změnilo data. Místní neodeslané změny byly zachovány.');return;}
    const result=await request('PUT',api('/contents/'+CLOUD_PATH),{message:'HMK: saved campaign '+clock(),content:await encodeCloudSnapshot(snapshot),...(sha?{sha}:{})});
    if(!result.content?.sha)throw Error('GitHub nevrátil SHA potvrzeného zápisu.');
    sha=result.content.sha;
    if(dirty===snapshot)clearPending();
   }
   setStatus('ready');
  }catch(e){if(e.httpStatus===409||e.httpStatus===422)setStatus('conflict','Konflikt verzí na GitHubu – místní změny jsou zachované.');
   else setStatus('error-pending','Cloudový zápis se nepodařil: '+e.message+'; místní změny zůstávají uložené.');
  }finally{working=false;}
 }
 async function refresh(){
  if(!config||!token||working||pending||isPending()||status!=='ready')return;
  working=true;
  try{const remote=await getCloud();if(!remote){setStatus('conflict','Cloudový soubor byl odstraněn.');return;}
   if(remote.sha!==sha){
    const local=readLocal();
    if(local!==remote.raw)applyRemote(remote.raw);
    sha=remote.sha;setStatus('ready');
   }
  }catch(e){setStatus('error-pending','Nelze ověřit GitHub: '+e.message);}
  finally{working=false;}
 }
 async function replaceWithCloud(){
  if(!config||!token)throw Error('Nejprve připojte GitHub.');
  if(working)throw Error('Synchronizace právě probíhá.');
  working=true;
  try{const remote=await getCloud();if(!remote)throw Error('Cloudový soubor neexistuje.');
   applyRemote(remote.raw);sha=remote.sha;clearPending();setStatus('ready');}
  finally{working=false;}
 }
 function disconnect(){
  if(working||pending||isPending())throw Error('Nejprve bezpečně dokončete synchronizaci nebo vyřešte neodeslané změny.');
  if(scheduled!==null)clearTimeout(scheduled);scheduled=null;
  localStorage.removeItem(CLOUD_CONFIG_KEY);sessionStorage.removeItem(CLOUD_SESSION_KEY);
  // Disconnection cannot silently remove unsynced snapshot protection.
  config=null;token='';sha=null;pending=false;dirty=null;localStorage.removeItem(CLOUD_PENDING_KEY);setStatus('local');
 }
 function startup(){const active=parse(sessionStorage.getItem(CLOUD_SESSION_KEY));
  if(!config)return;
  if(active?.owner===config.owner&&active?.repo===config.repo&&typeof active.token==='string'){
   void connect({owner:config.owner,repo:config.repo,accessToken:active.token}).catch(()=>{});
  }else setStatus('locked','Připojte tento prohlížeč ke GitHubu; místní zápisy jsou do té doby zablokované.');
 }
 function configView(){return {...config};}
 notify();
 return {get status(){return status},get issue(){return error},get config(){return configView()},get pending(){return pending||isPending()},get enabled(){return !!config},canWrite,onLocalWrite,connect,flush,refresh,replaceWithCloud,disconnect,startup};
}
