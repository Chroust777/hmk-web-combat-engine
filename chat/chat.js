const $=s=>document.querySelector(s);
let key=sessionStorage.getItem('chat-key')||'',page,before=null,busy=false,reading=false;
async function api(path,body){
 const r=await fetch(path,{headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});
 const data=await r.json();if(!r.ok)throw Error(data.error);return data;
}
function button(label,action){const b=document.createElement('button');b.textContent=label;b.onclick=action;return b}
const prefix=()=> 'hmk-chat-send:'+page.me.id+':';
function pendingMessage(){
 const selected=sessionStorage.getItem(prefix());
 const key=selected&&localStorage.getItem(prefix()+selected)?prefix()+selected:Object.keys(localStorage).find(k=>k.startsWith(prefix()));
 if(!key)return null;
 const m=JSON.parse(localStorage.getItem(key));sessionStorage.setItem(prefix(),m.id);return m;
}
function show(data){
 page=data;$('#room').hidden=false;$('#login').hidden=true;$('#who').textContent=data.me.name;
 $('#archive').disabled=!data.before;$('#live').hidden=before===null;
 const list=$('#messages');list.replaceChildren();
 for(const m of data.rows){
  const li=document.createElement('li');li.className=m.role;
  const name=document.createElement('strong'),date=document.createElement('time'),p=document.createElement('p');
  name.textContent=m.name+(m.role==='gm'?' · GM':'');date.dateTime=m.at;date.textContent=new Date(m.at).toLocaleString('cs-CZ');p.textContent=m.text;
  li.append(name,' · ',date,p);
  if(data.me.role==='gm'||m.author===data.me.id){
   li.append(button('Upravit',()=>{const text=prompt('Upravit zprávu',m.text);if(text?.trim())write({op:'edit',pos:m.pos,rev:m.rev,text})}),
    button('Smazat',()=>{if(confirm('Smazat tuto zprávu?'))write({op:'delete',pos:m.pos,rev:m.rev})}));
  }
  list.append(li);
 }
 const pending=pendingMessage();if(pending){$('#draft').value=pending.text;$('#draft').readOnly=true}
}
async function refresh(){
 if(reading)return;reading=true;const cursor=before;
 try{const data=await api('/messages'+(cursor===null?'':'?before='+cursor));if(cursor===before){show(data);sessionStorage.setItem('chat-key',key)}}
 catch(e){$('#status').textContent=e.message}finally{reading=false}
}
async function write(m){
 if(busy)return;busy=true;$('#send').disabled=true;
 try{await api('/messages',m);if(m.op==='send'){localStorage.removeItem(prefix()+m.id);sessionStorage.removeItem(prefix());$('#draft').readOnly=false;$('#draft').value='';before=null}
 $('#status').textContent='Uloženo.';await refresh()}
 catch(e){$('#status').textContent=e.message+' Odeslání lze zopakovat.'}finally{busy=false;$('#send').disabled=false}
}
$('#login').onsubmit=e=>{e.preventDefault();key=$('#key').value.trim();refresh()};
$('#compose').onsubmit=e=>{e.preventDefault();if(busy)return;
 const m=pendingMessage()||{op:'send',id:crypto.randomUUID(),start:page.head,text:$('#draft').value.trim()};
 if(m.text){localStorage.setItem(prefix()+m.id,JSON.stringify(m));sessionStorage.setItem(prefix(),m.id);$('#draft').readOnly=true;write(m)}};
$('#archive').onclick=()=>{if(!reading&&page.before){before=page.before;refresh()}};
$('#live').onclick=()=>{if(!reading){before=null;refresh()}};
$('#exit').onclick=()=>{sessionStorage.removeItem('chat-key');location.reload()};
if(key)refresh();setInterval(()=>{if(page&&!busy&&!document.hidden)refresh()},6000);
