import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {githubStore,chatServer} from '../chat/server.mjs';
const files=new Map(),campaign='campaigns/hmk-ledger-cloud.json';
files.set(campaign,{sha:'untouched',content:Buffer.from('isolated open travel').toString('base64')});
let dropAck=true,conflicts=0;
const api=async(url,o)=>{
 const key=new URL(url).pathname.split('/contents/')[1];
 const result=(status,obj)=>new Response(JSON.stringify(obj),{status});
 if(!key)return result(200,{private:true});
 assert(key.startsWith('chat/druzina/page-'));
 const old=files.get(key);
 if(!o.method)return result(old?200:404,old||{});
 await new Promise(done=>setTimeout(done,5));
 const m=JSON.parse(o.body);
 if(m.sha!==files.get(key)?.sha){conflicts++;return result(409,{})}
 const next={sha:randomUUID(),content:m.content};files.set(key,next);
 if(dropAck){dropAck=false;throw Error('Lost response')}
 return result(200,{content:{sha:next.sha}});
};
const secret='local-test-secret';
const accounts=[{id:'gm',name:'Vypravěč',role:'gm',hash:createHash('sha256').update(secret).digest('hex')}];
const servers=await Promise.all([1,2].map(async()=>{
 const store=githubStore({repo:'test/private',room:'druzina',token:'isolated'},api);await store.init();
 const server=chatServer(store,accounts);await new Promise(done=>server.listen(0,'127.0.0.1',done));return server;
}));
const req=(i,m)=>fetch('http://127.0.0.1:'+servers[i].address().port+'/messages',{method:m?'POST':'GET',headers:{authorization:'Bearer '+secret,'content-type':'application/json'},body:m?JSON.stringify(m):undefined});
const msg=text=>({op:'send',id:randomUUID(),start:0,text});
try{
 const first=msg('Zkouška při výpadku');
 assert.equal((await req(0,first)).status,503);assert((await req(1,first)).ok);
 const result=await Promise.all([req(0,msg('A')),req(1,msg('B'))]);
 assert(result.every(r=>r.ok));assert(conflicts>0);
 const items=(await(await req(0)).json()).rows;assert.equal(items.length,3);
 assert.equal(items.filter(x=>x.text===first.text).length,1);
 assert.equal(files.get(campaign).sha,'untouched');
 console.log('PASS two independent chat servers, shared simulated GitHub, lost success response, real HTTP retry, forced SHA conflict, three distinct messages, no campaign access.');
}finally{for(const s of servers)s.close()}
