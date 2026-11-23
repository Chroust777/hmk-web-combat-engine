import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {chatServer} from '../chat/server.mjs';
const pages=new Map();
const store={read:async n=>structuredClone(pages.get(n)||null),write:async(n,p)=>{assert.equal(p.sha,pages.get(n)?.sha);pages.set(n,{rows:structuredClone(p.rows),sha:randomUUID()})}};
const users=['gm','a','b'].map(id=>({id,name:id==='a'?'Pepa':id==='b'?'Michal':'Vypravěč',hash:createHash('sha256').update('test-'+id).digest('hex'),role:id==='gm'?'gm':'player'}));
const server=chatServer(store,users);await new Promise(done=>server.listen(0,'127.0.0.1',done));const url='http://127.0.0.1:'+server.address().port;
const req=(id,m,query='')=>fetch(url+'/messages'+query,{method:m?'POST':'GET',headers:{authorization:'Bearer test-'+id,'content-type':'application/json'},body:m?JSON.stringify(m):undefined});
try{
 const msgs=Array.from({length:54},(_,i)=>({op:'send',id:randomUUID(),start:0,text:'Zpráva '+i}));
 const rs=await Promise.all(msgs.map((m,i)=>req(i%2?'gm':'a',m)));assert(rs.every(r=>r.ok));
 const first=await(await req('b')).json();assert.equal(first.rows.length,50);assert.equal(first.before,4);
 const archive=await(await req('a',null,'?before=4')).json();assert.equal(archive.rows.length,4);
 const msg=archive.rows.find(m=>m.author==='a');const edit={op:'edit',pos:msg.pos,rev:1,text:'Opraveno',role:'gm'};
 assert.equal((await req('b',edit)).status,403);assert((await req('a',edit)).ok);
 assert.equal((await req('gm',edit)).status,409);
 assert.equal((await(await req('a',null,'?before=4')).json()).rows.find(r=>r.pos===msg.pos).text,'Opraveno');
 assert((await req('gm',{op:'delete',pos:msg.pos,rev:2})).ok);
 assert((await req('a',msgs.find(m=>m.id===msg.id))).ok);assert.equal(pages.get(0).rows.length+pages.get(1).rows.length,54);
 assert.equal((await(await req('a',null,'?before=4')).json()).rows.length,3);
 assert.equal((await req('unknown')).status,401);
 console.log('PASS 54 concurrent requests, pagination, archive edit/delete, owner/GM authorization, stale revision, tombstone retry');
 if(process.argv.includes('--serve')){console.log(url);await new Promise(()=>{})}
}finally{server.close()}
