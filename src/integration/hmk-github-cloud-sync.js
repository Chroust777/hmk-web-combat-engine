/** HMK private GitHub repository cloud snapshot adapter.
 * Only the canonical localStorage database is synced. Never upload API credentials,
 * per-tab UI drafts or software code. All writes use GitHub Contents SHA compare-and-swap.
 * Source of truth after connection: validated remote document, not last opened browser.
 */
export const CLOUD_CONFIG_KEY='hmk-cloud-github-config-v1';
export const CLOUD_PENDING_KEY='hmk-cloud-github-pending-v1';
export const CLOUD_SESSION_KEY='hmk-cloud-github-session-v1';
export const CLOUD_DEVICE_TOKEN_KEY='hmk-cloud-github-device-token-v1';
// An in-memory armed page notices when F12 clears its localStorage. This marker
// is not a credential and is never written to GitHub.
export const CLOUD_LIVE_STORAGE_MARKER='hmk-cloud-github-live-storage-v1';
const DEVICE_KEY_DB='hmk-github-device-token-key-v1';
/**
 * Browser-only, opt-in device credential. The ciphertext is in localStorage;
 * a non-extractable AES-GCM CryptoKey is structured-cloned into IndexedDB.
 * This prevents a localStorage export from exposing the token. Any malicious
 * script executing on this origin could still use the key: this is NOT a
 * replacement for secure origin, XSS prevention, or OAuth with a backend.
 */
export function createGitHubDeviceTokenVault({localStorage,indexedDBImpl=globalThis.indexedDB,cryptoImpl=globalThis.crypto}={}){
 const format=1;
 function has(){return !!localStorage.getItem(CLOUD_DEVICE_TOKEN_KEY)}
 function clear(){localStorage.removeItem(CLOUD_DEVICE_TOKEN_KEY)}
 function bytesB64(bytes){let t='';for(const b of bytes)t+=String.fromCharCode(b);return btoa(t)}
 function b64Bytes(str){return Uint8Array.from(atob(str),ch=>ch.charCodeAt(0))}
 function openDB(){return new Promise((resolve,reject)=>{
  if(!indexedDBImpl||!cryptoImpl?.subtle||!cryptoImpl?.getRandomValues){reject(Error('Prohlížeč nepodporuje bezpečné uložení tokenu (IndexedDB / Web Crypto).'));return;}
  let req;try{req=indexedDBImpl.open(DEVICE_KEY_DB,1)}catch(e){reject(e);return;}
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('keys'))req.result.createObjectStore('keys');};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('IndexedDB nelze otevřít'));
 });}
 async function getKey(create){
  const db=await openDB();
  try{
   const key=await new Promise((resolve,reject)=>{const tx=db.transaction('keys','readonly');const r=tx.objectStore('keys').get('device');r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)});
   if(key||!create)return key;
   const fresh=await cryptoImpl.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
   await new Promise((resolve,reject)=>{const tx=db.transaction('keys','readwrite');tx.objectStore('keys').put(fresh,'device');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
   return fresh;
  }finally{db.close();}
 }
 async function save({owner,repo,token}){
  if(typeof token!=='string'||!token.trim()||!validRepo(owner,repo))throw Error('Neplatné údaje tokenu.');
  const key=await getKey(true),iv=cryptoImpl.getRandomValues(new Uint8Array(12));
  const data=new TextEncoder().encode(token.trim());
  const encrypted=new Uint8Array(await cryptoImpl.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(owner+'/'+repo)},key,data));
  localStorage.setItem(CLOUD_DEVICE_TOKEN_KEY,JSON.stringify({v:format,owner,repo,iv:bytesB64(iv),ciphertext:bytesB64(encrypted)}));
 }
 async function restore(owner,repo){
  const item=parse(localStorage.getItem(CLOUD_DEVICE_TOKEN_KEY));
  if(!item||item.v!==format||item.owner!==owner||item.repo!==repo||typeof item.iv!=='string'||typeof item.ciphertext!=='string')return null;
  try{
   const key=await getKey(false);if(!key){clear();return null;}
   const plaintext=await cryptoImpl.subtle.decrypt({name:'AES-GCM',iv:b64Bytes(item.iv),additionalData:new TextEncoder().encode(owner+'/'+repo)},key,b64Bytes(item.ciphertext));
   return new TextDecoder().decode(plaintext);
  }catch{clear();return null;}
 }
 return {has,save,restore,clear};
}
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
export async function encodeCloudSnapshot(serialized,{resetId=null}={}){
 const bytes=new TextEncoder().encode(serialized);
 const compressed=await compressBytes(bytes);
 const envelope=JSON.stringify({format:'hmk-ledger-github-cloud-v1',encoding:compressed.encoding,payload:compressed.value,...(resetId?{resetId}:{})});
 const file=new TextEncoder().encode(envelope);
 if(file.byteLength>MAX_FILE_SIZE)throw Error('Kampaň je pro tento režim GitHub Contents příliš velká (limit 900 KB komprimovaného souboru). Zápis neproběhl.');
 return toBase64(file);
}
export async function decodeCloudEnvelope(githubContent){
 const envelope=parse(new TextDecoder().decode(fromBase64(githubContent)));
 if(envelope?.format!=='hmk-ledger-github-cloud-v1'||typeof envelope.payload!=='string'||
    (envelope.resetId!==undefined&&(typeof envelope.resetId!=='string'||envelope.resetId.length>128)))throw Error('Soubor na GitHubu není databáze HMK.');
 return {raw:new TextDecoder().decode(await decompressBytes(envelope)),resetId:envelope.resetId||null};
}
export async function decodeCloudSnapshot(githubContent){return (await decodeCloudEnvelope(githubContent)).raw}
export function createGitHubCloudSync({localStorage,sessionStorage,storageKey,validate,applyRemote,readLocal,fetchImpl=fetch,onStatus=()=>{},approveReplace=()=>false,clock=()=>new Date().toISOString(),deviceVault=null}){
 const vault=deviceVault||createGitHubDeviceTokenVault({localStorage});
 let config=parse(localStorage.getItem(CLOUD_CONFIG_KEY));
 if(!config||!validRepo(config.owner||'',config.repo||''))config=null;
 let token='';
 let status=config?'locked':'local',error='',sha=null,pending=false,working=false,dirty=null,scheduled=null;
 let cloudResetId=null,watchArmed=false;
 const markerPresent=()=>localStorage.getItem(CLOUD_LIVE_STORAGE_MARKER)!==null;
 const armStorageWatch=()=>{localStorage.setItem(CLOUD_LIVE_STORAGE_MARKER,'connected');watchArmed=true;};
 const liveStorageWasCleared=()=>watchArmed&&!markerPresent();
 const freshResetId=()=>clock()+'-'+Math.random().toString(36).slice(2);
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
 async function getCloudReference(){
  try{const r=await request('GET',api('/contents/'+CLOUD_PATH));
   if(typeof r.sha!=='string'||!r.sha)throw Error('GitHub nevrátil platné SHA cloudového souboru.');
   return {sha:r.sha};
  }catch(err){if(err.httpStatus===404)return null;throw err}
 }
 async function getCloud(){
  try{const r=await request('GET',api('/contents/'+CLOUD_PATH));
   if(typeof r.sha!=='string'||typeof r.content!=='string'||r.encoding!=='base64')throw Error('Nepodporovaný cloudový soubor nebo překročený limit GitHub Contents.');
   const {raw,resetId}=await decodeCloudEnvelope(r.content);validate(JSON.parse(raw));return {sha:r.sha,raw,resetId};
  }catch(err){if(err.httpStatus===404)return null;throw err}
 }
 function flagPending(serialized){localStorage.setItem(CLOUD_PENDING_KEY,JSON.stringify({repository:pendingKey(),sha,at:clock()}));pending=true;dirty=serialized;}
 function clearPending(){localStorage.removeItem(CLOUD_PENDING_KEY);pending=false;dirty=null;}
 function canWrite(){return (!config||['ready','syncing','pending','error-pending'].includes(status))&&!liveStorageWasCleared();}
 function onLocalWrite(serialized){if(!config)return;
  if(!canWrite())throw Error('GitHub cloud není bezpečně připojen. Zápis je zablokován.');
  flagPending(serialized);setStatus('pending');
  if(scheduled!==null)clearTimeout(scheduled);
  scheduled=setTimeout(()=>{scheduled=null;void flush();},650);
 }
 async function connect({owner,repo,accessToken,createIfMissing=false,rememberDevice}={}){
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
    sha=remote.sha;cloudResetId=remote.resetId;
    const local=readLocal(),hasPending=isPending();
    if(hasPending&&local!==remote.raw){
     if(remote.resetId){
      // A deliberate shared reset has priority over an obsolete offline edit.
      applyRemote(remote.raw);clearPending();
     }else{
      if(savedPending().sha!==sha){setStatus('conflict','Cloud má novější změny než neodeslaný místní zápis. Zvolte, kterou verzi zachovat.');return {conflict:true};}
      dirty=local;pending=true;
     }
    }else if(local!==remote.raw){
     // All incoming snapshots are validated before replacing any local bytes.
     if(!approveReplace('Na GitHubu je jiný stav kampaní. Načíst jej do tohoto zařízení? Místní data se nahradí.')){
      localStorage.setItem(CLOUD_CONFIG_KEY,JSON.stringify(config));sessionStorage.setItem(CLOUD_SESSION_KEY,JSON.stringify({owner,repo,token}));
      if(rememberDevice===true){try{await vault.save({owner,repo,token})}catch(e){setStatus('needs-choice','Token zůstane jen pro tuto relaci: '+e.message);return {needsChoice:true};}}
      else if(rememberDevice===false)vault.clear();
      setStatus('needs-choice','Načtení cloudu bylo odmítnuto. Místní data se nezměnila.');return {needsChoice:true};}
     applyRemote(remote.raw);clearPending();
    }else clearPending();
   }
   localStorage.setItem(CLOUD_CONFIG_KEY,JSON.stringify(config));
   sessionStorage.setItem(CLOUD_SESSION_KEY,JSON.stringify({owner,repo,token}));
   let vaultError='';
   if(rememberDevice===true){try{await vault.save({owner,repo,token})}catch(e){vaultError='Připojeno, ale token nebylo možné zapamatovat na tomto zařízení: '+e.message;}}
   else if(rememberDevice===false)vault.clear();
   setStatus(pending?'pending':'ready',vaultError);
   armStorageWatch();
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
    if(remote?.resetId&&remote.resetId!==cloudResetId){
     applyRemote(remote.raw);sha=remote.sha;cloudResetId=remote.resetId;clearPending();break;
    }
    if(remote&&remote.raw===snapshot){sha=remote.sha;if(dirty===snapshot)clearPending();else continue;break;}
    if((remote?.sha||null)!==sha){setStatus('conflict','Jiné zařízení změnilo data. Místní neodeslané změny byly zachovány.');return;}
    const result=await request('PUT',api('/contents/'+CLOUD_PATH),{message:'HMK: saved campaign '+clock(),content:await encodeCloudSnapshot(snapshot,{resetId:cloudResetId}),...(sha?{sha}:{})});
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
  // A transient offline GET must not permanently disable updates from other devices.
  if(!config||!token||working||liveStorageWasCleared()||!['ready','error-pending','pending','conflict'].includes(status))return;
  working=true;
  try{const remote=await getCloud();if(!remote){setStatus('conflict','Cloudový soubor byl odstraněn.');return;}
   const isFreshReset=!!remote.resetId&&remote.resetId!==cloudResetId;
   if(isFreshReset){
    if(readLocal()!==remote.raw)applyRemote(remote.raw);
    sha=remote.sha;cloudResetId=remote.resetId;clearPending();setStatus('ready');
   }else if(!(pending||isPending())&&remote.sha!==sha){
    const local=readLocal();
    if(local!==remote.raw)applyRemote(remote.raw);
    sha=remote.sha;cloudResetId=remote.resetId;setStatus('ready');
   }
  }catch(e){setStatus('error-pending','Nelze ověřit GitHub: '+e.message);}
  finally{working=false;}
 }
 /** Explicit shared reset: replace the canonical cloud document, never DELETE the file.
  * An empty but valid snapshot is a new Git revision and GitHub SHA, so previously
  * connected devices pull the empty state; stale pending writes fail closed.
  * Local browser storage clearing never calls this operation.
  */
 async function resetSharedCampaign({owner,repo,accessToken,emptySnapshot,rememberDevice,developerMode=false,localStorageCleared=false}={}){
  if(!validRepo(owner||'',repo||''))throw Error('Vyberte platný soukromý repozitář.');
  if(working||(!developerMode&&(pending||savedPending())))throw Error('Existují neodeslané změny nebo běžící synchronizace. Nejdříve je vyřešte; reset je nemůže potichu zahodit.');
  if(typeof emptySnapshot!=='string'||!emptySnapshot.trim())throw Error('Chybí prázdná databáze aplikace.');
  const fresh=JSON.parse(emptySnapshot);
  validate(fresh);
  // Never accept an arbitrary campaign as a "reset"; only the canonical empty document.
  if(!Array.isArray(fresh.characters)||fresh.characters.length||
     !Array.isArray(fresh.items)||fresh.items.length||
     !Array.isArray(fresh.inventory)||fresh.inventory.length||
     !Array.isArray(fresh.trash)||fresh.trash.length||
     !Array.isArray(fresh.journal)||fresh.journal.length||
     Object.keys(fresh).some(k=>!['schemaVersion','characters','items','inventory','trash','journal'].includes(k)))
   throw Error('Reset může publikovat pouze novou prázdnou databázi.');
  const usingConnection=config?.owner===owner&&config?.repo===repo&&!!token&&(status==='ready'||(developerMode&&['pending','error-pending','conflict'].includes(status)));
  const nextToken=typeof accessToken==='string'&&accessToken.trim()?accessToken.trim():(usingConnection?token:'');
  if(!nextToken)throw Error('Pro reset cloudu musíte vložit platný GitHub token nebo být připojeni.');
  const original={config,token,status,sha};
  config={owner,repo};token=nextToken;working=true;setStatus('resetting');
  let uploaded=false;
  try{
   await verifyPrivateRepository();
   const current=await getCloudReference();
   // If the current device already tracks a cloud revision, do not erase someone
   // else's more recent revision without reconnecting and reviewing it first.
   if(!developerMode&&usingConnection&&(current?.sha||null)!==sha)throw Error('Repozitář se změnil na jiném zařízení. Nejprve načtěte aktuální stav a reset znovu potvrďte.');
   const resetId=freshResetId();
   const result=await request('PUT',api('/contents/'+CLOUD_PATH),{
    message:'HMK: shared campaign development reset '+clock(),
    content:await encodeCloudSnapshot(emptySnapshot,{resetId}),...(current?{sha:current.sha}:{})
   });
   if(!result.content?.sha)throw Error('GitHub nevrátil SHA potvrzeného resetu.');
   uploaded=true;sha=result.content.sha;cloudResetId=resetId;
   // Store credentials before applyRemote reloads the page.
   localStorage.setItem(CLOUD_CONFIG_KEY,JSON.stringify(config));
   sessionStorage.setItem(CLOUD_SESSION_KEY,JSON.stringify({owner,repo,token}));
   let vaultError='';
   if(rememberDevice===true){try{await vault.save({owner,repo,token})}catch(e){vaultError='Token se nepodařilo zapamatovat: '+e.message;}}
   else if(rememberDevice===false)vault.clear();
   applyRemote(emptySnapshot,{allowClearedStorage:localStorageCleared});
   clearPending();setStatus('ready',vaultError);armStorageWatch();
   return {ready:true,reset:true,sha};
  }catch(err){
   if(uploaded){setStatus('conflict','Cloud byl vyčištěn, ale místní zařízení nepotvrdilo nový stav. Neodesílejte starou kampaň; načtěte cloud znovu. '+err.message);}
   else{config=original.config;token=original.token;sha=original.sha;setStatus(original.status,err.message);}
   throw err;
  }finally{working=false;}
 }
 /** Development-only operation: one click, using the already connected token.
  * F12 cannot be detected after the page has reloaded or lost its credentials.
  */
 async function resetDevelopmentCampaign({emptySnapshot}={}){
  if(!config||!token||!['ready','pending','error-pending','conflict'].includes(status))throw Error('Cloud musí být připojen na tomto zařízení.');
  return resetSharedCampaign({owner:config.owner,repo:config.repo,emptySnapshot,rememberDevice:true,developerMode:true,localStorageCleared:liveStorageWasCleared()});
 }
 async function replaceWithCloud(){
  if(!config||!token)throw Error('Nejprve připojte GitHub.');
  if(working)throw Error('Synchronizace právě probíhá.');
  working=true;
  try{const remote=await getCloud();if(!remote)throw Error('Cloudový soubor neexistuje.');
   applyRemote(remote.raw);sha=remote.sha;cloudResetId=remote.resetId;clearPending();setStatus('ready');armStorageWatch();}
  finally{working=false;}
 }
 function disconnect(){
  if(working||pending||isPending())throw Error('Nejprve bezpečně dokončete synchronizaci nebo vyřešte neodeslané změny.');
  if(scheduled!==null)clearTimeout(scheduled);scheduled=null;
  localStorage.removeItem(CLOUD_CONFIG_KEY);sessionStorage.removeItem(CLOUD_SESSION_KEY);vault.clear();
  // Disconnection cannot silently remove unsynced snapshot protection.
  config=null;token='';sha=null;cloudResetId=null;watchArmed=false;pending=false;dirty=null;localStorage.removeItem(CLOUD_PENDING_KEY);localStorage.removeItem(CLOUD_LIVE_STORAGE_MARKER);setStatus('local');
 }
 async function startup(){
  if(!config)return;
  const owner=config.owner,repo=config.repo,active=parse(sessionStorage.getItem(CLOUD_SESSION_KEY));
  let saved=null;
  if(active?.owner===owner&&active?.repo===repo&&typeof active.token==='string'&&active.token.trim())saved=active.token;
  if(!saved){
   setStatus('connecting','Obnovuji zabezpečené připojení…');
   try{saved=await vault.restore(owner,repo);}catch{saved=null;}
  }
  if(!saved){setStatus('locked','Vložte nový GitHub token a připojte tento prohlížeč.');return;}
  try{await connect({owner,repo,accessToken:saved});}
  catch(e){
   if(e.httpStatus===401){vault.clear();sessionStorage.removeItem(CLOUD_SESSION_KEY);
    setStatus('locked','GitHub token vypršel nebo byl zrušen. Vytvořte nový token a vložte jej v Cloud a zálohy.');}
   else setStatus('locked','Automatické připojení se nezdařilo: '+e.message+'. Můžete jej obnovit ručně.');
  }
 }
 async function rememberCurrentDevice(){
  if(!config||!token||status!=='ready')throw Error('Nejdříve úspěšně připojte GitHub Cloud.');
  await vault.save({owner:config.owner,repo:config.repo,token});notify();
 }
 function forgetDeviceToken(){vault.clear();notify();}
 function configView(){return {...config};}
 notify();
 return {get localStorageCleared(){return liveStorageWasCleared()},get status(){return status},get issue(){return error},get config(){return configView()},get pending(){return pending||isPending()},get enabled(){return !!config},get remembered(){return vault.has()},canWrite,onLocalWrite,connect,flush,refresh,replaceWithCloud,resetSharedCampaign,resetDevelopmentCampaign,disconnect,rememberCurrentDevice,forgetDeviceToken,startup};
}
