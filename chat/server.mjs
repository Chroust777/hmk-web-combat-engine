// One process serves one campaign. Only the fixed chat directory is accessible.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const problem=(status,message)=>Object.assign(new Error(message),{status});
export function githubStore({repo,room,token},fetchImpl=fetch){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!/^[-\w]+$/.test(room)||!token)throw Error('Zkontrolujte konfiguraci repozitáře a místnosti.');
 const base='https://api.github.com/repos/'+repo;
 async function api(url,options={}){
  const r=await fetchImpl(url,{...options,redirect:'error',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw problem(r.status,'GitHub nepotvrdil operaci.');
  return r.json();
 }
 const url=n=>base+'/contents/chat/'+room+'/page-'+n+'.json';
 return {
  async init(){if((await api(base)).private!==true)throw Error('Chat vyžaduje soukromý repozitář.')},
  async read(n){try{const f=await api(url(n));const rows=JSON.parse(Buffer.from(f.content,'base64'));if(!Array.isArray(rows)||rows.length>50)throw Error('Poškozená stránka chatu');return {rows,sha:f.sha}}
   catch(e){if(e.status===404)return null;throw e}},
  async write(n,page){await api(url(n),{method:'PUT',body:JSON.stringify({message:'HMK chat',content:Buffer.from(JSON.stringify(page.rows)).toString('base64'),...(page.sha?{sha:page.sha}:{})})})}
 };
}
export function chatServer(store,accounts){
 const names=new Set(),hashes=new Set();
 for(const a of accounts){
  if(!/^[a-f0-9]{64}$/.test(a.hash)||!a.name||!a.id||names.has(a.id)||hashes.has(a.hash)||!['player','gm'].includes(a.role))throw Error('Neplatný účet chatu.');
  names.add(a.id);hashes.add(a.hash);
 }
 // Pages are permanent, including tombstones. A message's address never moves.
 let latest=0,serial=Promise.resolve(),cached=null;
 async function head(){
  let low=latest,step=1;
  while(await store.read(low+step)){low+=step;step*=2}
  let high=low+step;
  while(high-low>1){const mid=Math.floor((high+low)/2);if(await store.read(mid))low=mid;else high=mid}
  return latest=low;
 }
 async function list(before){
  const h=await head(), rows=[];let cursor=before??((h+1)*50);
  if(!Number.isSafeInteger(cursor)||cursor<0||cursor>(h+1)*50)throw problem(400,'Neplatná stránka.');
  while(cursor>0&&rows.length<50){
   const n=Math.floor((cursor-1)/50),page=await store.read(n);
   for(let i=Math.min((cursor-1)%50,(page?.rows.length??0)-1);i>=0&&rows.length<50;i--){
    cursor=n*50+i;const row=page.rows[i];if(!row.deleted)rows.push({...row,pos:cursor});
   }
   if(rows.length<50)cursor=n*50;
  }
  return {rows:rows.reverse(),before:cursor||null,head:h};
 }
 async function mutate(a,m){
  const text=String(m.text??'').trim();
  if(!['send','edit','delete'].includes(m.op)||m.op!=='delete'&&(!text||text.length>2000))throw problem(400,'Zadejte zprávu do 2 000 znaků.');
  if(m.op==='send'&&!/^[0-9a-f-]{36}$/.test(m.id))throw problem(400,'Neplatný doklad zprávy.');
  let n=m.op==='send'?m.start:Math.floor(m.pos/50);
  if(!Number.isSafeInteger(n)||n<0||n>await head()||m.op!=='send'&&!Number.isSafeInteger(m.pos))throw problem(400,'Neplatná adresa zprávy.');
  for(let conflicts=0;conflicts<8;){
   const page=(await store.read(n))??{rows:[]};
   if(m.op==='send'){
    if(page.rows.some(r=>r.id===m.id&&r.author===a.id))return;
    if(page.rows.length===50){n++;continue}
    page.rows.push({author:a.id,name:a.name,role:a.role,id:m.id,at:new Date().toISOString(),rev:1,text});
   }else{
    const r=page.rows[m.pos%50];if(!r||r.deleted)throw problem(404,'Zpráva už není dostupná.');
    if(a.role!=='gm'&&r.author!==a.id)throw problem(403,'Cizí zprávu může změnit pouze GM.');
    if(m.rev!==r.rev)throw problem(409,'Zprávu mezitím někdo změnil. Obnovte ji.');
    r.rev++;if(m.op==='delete'){delete r.text;r.deleted=true}else r.text=text;
   }
   try{await store.write(n,page);latest=Math.max(latest,n);cached=null;return}
   catch(e){cached=null;if(![409,422].includes(e.status))throw e;conflicts++}
  }
  throw problem(503,'Chat je zaneprázdněný. Opakujte odeslání.');
 }
 return http.createServer(async(req,res)=>{
  const reply=(status,type,body)=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});res.end(body)};
  try{
   const url=new URL(req.url,'http://localhost');
   const asset=new Map([['/','chat.html'],['/chat.js','chat.js'],['/chat.css','chat.css']]).get(url.pathname);
   if(req.method==='GET'&&asset)return reply(200,asset.endsWith('js')?'text/javascript':asset.endsWith('css')?'text/css':'text/html; charset=utf-8',await readFile(new URL(asset,import.meta.url)));
   if(url.pathname!=='/messages')throw problem(404,'Nenalezeno.');
   const digest=createHash('sha256').update((req.headers.authorization||'').replace(/^Bearer /,'')).digest();
   const a=accounts.find(u=>timingSafeEqual(Buffer.from(u.hash,'hex'),digest));
   if(!a)throw problem(401,'Neplatný osobní klíč.');
   if(req.method==='GET'){
    const old=url.searchParams.get('before');
    if(old===null&&(!cached||cached.until<Date.now()))cached={until:Date.now()+4000,page:list(null)};
    const result=await (old===null?cached.page:list(Number(old)));
    return reply(200,'application/json',JSON.stringify({...result,me:{id:a.id,name:a.name,role:a.role}}));
   }
   if(req.method!=='POST'||req.headers['content-type']!=='application/json')throw problem(400,'Neplatný požadavek.');
   let body='';for await(const chunk of req){body+=chunk.toString('binary');if(body.length>16000)throw problem(413,'Zpráva je příliš velká.')}
   const m=JSON.parse(Buffer.from(body,'binary').toString());
   const pending=serial.then(()=>mutate(a,m));serial=pending.catch(()=>{});await pending;reply(200,'application/json','{}');
  }catch(e){reply(e.status??503,'application/json',JSON.stringify({error:e.status&&e.status<500?e.message:'Chat právě nemůže potvrdit zápis nebo načíst zprávy.'}))}
 });
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
 const c=JSON.parse(await readFile(process.env.HMK_CHAT_CONFIG,'utf8'));
 const store=githubStore({...c,token:process.env.HMK_CHAT_GITHUB_TOKEN});await store.init();
 chatServer(store,c.accounts).listen(Number(process.env.PORT||8787),'127.0.0.1');
}
