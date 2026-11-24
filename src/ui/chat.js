import {CHAT_PALETTE,GM_COLOR,PC_COLOR,chatId,emptyChat,chatPages,chronicleText,createChatRepository} from '../integration/hmk-chat-store.js?v=94.100';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gm=()=>document.documentElement.dataset.hmkGm==='true';
const gmAuthor={kind:'gm',id:'gm',name:'GameMaster',color:GM_COLOR};
const when=s=>{try{return new Intl.DateTimeFormat('cs-CZ',{dateStyle:'short',timeStyle:'short'}).format(new Date(s));}catch{return '';}};
const DRAFT='hmk-chat-draft-v1:';
export function installChat({gameDate=()=>null,bookShell,connection,storage=localStorage,draftStorage=sessionStorage,pollMs=15000}){
 const repository=createChatRepository({storage,connection,stale:()=>!!window.__hmkOutdatedBuild});
 let dlg=null,doc=emptyChat(),scope=null,loaded=false,busy=false,reading=false,archivePage=null,editing=null,speakerEdit=null,sendId=null,sendOp=null,interval=null,requestEpoch=0,role=null,rendered='',draftAuthor='',chronicleEdit=null;
 const $=sel=>dlg.querySelector(sel);
 const currentScope=()=>{const c=connection();return c?.configured?c.scope:'local';};
 const draftKey=()=>DRAFT+currentScope()+':'+(gm()?'gm':'player');
 function saveDraft(){if(!dlg)return;try{draftStorage.setItem(draftKey(),JSON.stringify({text:$('[data-chat-text]').value,author:draftAuthor,id:sendId,opId:sendOp}));}catch{/* draft remains in DOM */}}
 function restoreDraft(){let d={};try{d=JSON.parse(draftStorage.getItem(draftKey())||'{}')||{};}catch{}$('[data-chat-text]').value=typeof d.text==='string'?d.text:'';sendId=d.id||null;sendOp=d.opId||null;draftAuthor=d.author||'';renderAuthors(draftAuthor);}
 function feedback(text='',error=false){const n=$('[data-chat-feedback]');n.textContent=text;n.classList.toggle('is-error',error);}
 function status(text){$('[data-chat-status]').textContent=text;}
 function authors(){return doc.speakers.map(s=>({kind:'custom',id:s.id,name:s.name,color:s.color}));}
 const key=a=>a.kind+':'+a.id;
 function renderAuthors(preferred){const select=$('[data-chat-author]');const old=preferred??draftAuthor,all=authors();const options=()=>all.map(a=>`<option value="${escape(key(a))}">${escape(a.name)}</option>`).join('');
  select.innerHTML='<option value="">— Vyberte jméno —</option>'+options();
  if(all.some(a=>key(a)===old))select.value=old;
  const selected=all.find(a=>key(a)===select.value);$('[data-chat-text]').style.background=gm()?GM_COLOR:(selected?.color||PC_COLOR);
 }
 function renderRole(){const active=gm();if(role!==active){role=active;editing=null;speakerEdit=null;chronicleEdit=null;$('[data-chat-speaker-name]').value='';$('[data-chat-speaker-color]').value=CHAT_PALETTE[0][0];restoreDraft();}
  for(const el of dlg.querySelectorAll('[data-chat-gm]'))el.hidden=!active;
  for(const el of dlg.querySelectorAll('[data-chat-player]'))el.hidden=active;
 }
 function renderSpeakers(){const list=$('[data-chat-speakers]');list.innerHTML=doc.speakers.length?doc.speakers.map(s=>`<div class="hmk-chat-speaker"><span class="hmk-chat-swatch" style="background:${s.color}"></span><strong>${escape(s.name)}</strong><button type="button" data-chat-action="edit-speaker" data-id="${escape(s.id)}">Editovat</button><button type="button" data-chat-action="delete-speaker" data-id="${escape(s.id)}">Odstranit</button></div>`).join(''):'<p class="hmk-chat-empty">Zatím žádná jména.</p>';
  const b=$('[data-chat-action="save-speaker"]');b.textContent=speakerEdit?'Uložit změny':'Přidat jméno';$('[data-chat-action="cancel-speaker"]').hidden=!speakerEdit;
 }
 function renderMessages(scrollEnd=false){const pages=chatPages(doc),archiveCount=pages.archive.length,totalPages=Math.max(1,Math.ceil(archiveCount/50));if(archivePage!==null){archivePage=Math.min(archivePage,totalPages-1);if(!archiveCount)archivePage=null;}
  const items=archivePage===null?pages.latest:pages.archive.slice(archivePage*50,(archivePage+1)*50);
  $('[data-chat-archive]').textContent=archivePage===null?`Archiv (${archiveCount})`:'Zpět na posledních 50';
  const pager=$('[data-chat-pager]');pager.hidden=archivePage===null;$('[data-chat-page]').textContent=archivePage===null?'':`Strana ${archivePage+1} / ${totalPages}`;$('[data-chat-action="archive-older"]').disabled=archivePage===null||archivePage===0;$('[data-chat-action="archive-newer"]').disabled=archivePage===null||archivePage===totalPages-1;
  const list=$('[data-chat-messages]'),oldScroll=list.scrollTop,atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<45;
  list.innerHTML=items.length?items.map(m=>{const editable=gm()||m.author.kind!=='gm';return `<article class="hmk-chat-message" data-chat-message="${escape(m.id)}" style="background:${m.author.color}"><header><strong>${escape(m.author.name)} <span class="hmk-chat-game-date">(${escape(m.gameDate||'Herní datum nedoloženo')})</span></strong><time datetime="${escape(m.createdAt)}">${escape(when(m.createdAt))}${m.revision>1?' · upraveno':''}</time></header>${editing?.id===m.id&&editable?`<textarea data-chat-edit-text maxlength="12000" rows="1" aria-label="Upravit zprávu">${escape(editing.text)}</textarea><div class="hmk-chat-actions"><button type="button" data-chat-action="save-message">Uložit</button><button type="button" data-chat-action="cancel-message">Zrušit</button></div>`:`<p>${escape(m.text)}</p>${editable?`<div class="hmk-chat-actions"><button type="button" data-chat-action="edit-message" data-id="${escape(m.id)}">Editovat</button><button type="button" data-chat-action="delete-message" data-id="${escape(m.id)}">Odstranit</button></div>`:''}`}</article>`;}).join(''):'<p class="hmk-chat-empty">Zatím zde nejsou žádné zprávy.</p>';
  list.scrollTop=archivePage===null&&(scrollEnd||atBottom)&&!editing?list.scrollHeight:oldScroll;
 }
 function fitTextareas(){for(const t of dlg.querySelectorAll('textarea')){if(t.offsetWidth===0)continue;t.style.height='auto';t.style.height=(t.scrollHeight+t.offsetHeight-t.clientHeight)+'px';}}
 function renderChronicle(){const entries=doc.chronicle.entries,existing=new Map(entries.map(e=>[e.sourceId,e.revision])),live=new Set(doc.messages.map(m=>m.id)),pending=doc.messages.filter(m=>existing.get(m.id)!==m.revision).length+entries.filter(e=>!live.has(e.sourceId)).length;
  $('[data-chat-chronicle-info]').textContent=(doc.chronicle.generatedAt?'Naposledy vytvořeno: '+when(doc.chronicle.generatedAt)+' · ':'')+entries.length+' zpracovaných zpráv'+(pending?' · Čeká na zpracování: '+pending:'');
  const body=$('[data-chat-chronicle]'),scroll=body.scrollTop,content=chronicleText(doc.chronicle);body.innerHTML=chronicleEdit&&gm()?`<textarea data-chat-chronicle-edit rows="1" aria-label="Upravit kroniku" maxlength="400000">${escape(chronicleEdit.text)}</textarea><div class="hmk-chat-actions"><button type="button" data-chat-action="save-chronicle">Uložit změny</button><button type="button" data-chat-action="cancel-chronicle">Zrušit</button></div>`:content?content.split(/\n\s*\n/).map(t=>`<p>${escape(t)}</p>`).join(''):'<p class="hmk-chat-empty">Kronika zatím nebyla vytvořena.</p>';body.scrollTop=scroll;fitTextareas();
 }

 function controls(){for(const b of dlg.querySelectorAll('button[data-chat-action]')){if(['close','refresh','archive','archive-older','archive-newer','cancel-message','cancel-speaker','cancel-chronicle'].includes(b.dataset.chatAction))continue;b.disabled=busy||!loaded;}
  $('[data-chat-text]').readOnly=busy;$('[data-chat-author]').disabled=busy;$('[data-chat-speaker-name]').readOnly=busy;$('[data-chat-speaker-color]').disabled=busy;const e=$('[data-chat-edit-text]');if(e)e.readOnly=busy;const ce=$('[data-chat-chronicle-edit]');if(ce)ce.readOnly=busy;for(const a of ['chronicle','edit-chronicle','clear-chronicle'])$(`[data-chat-action="${a}"]`).disabled=busy||!loaded||!!chronicleEdit;
 }
 function paint(force=false,scrollEnd=false){renderRole();const snapshot=JSON.stringify(doc);if(force||snapshot!==rendered){rendered=snapshot;renderAuthors();renderMessages(scrollEnd);renderSpeakers();renderChronicle();}controls();fitTextareas();}
 async function sync({manual=false}={}){if(!dlg?.open||busy||reading)return;const epoch=++requestEpoch;reading=true;const nextScope=currentScope();if(scope!==nextScope){scope=nextScope;doc=emptyChat();loaded=false;editing=null;speakerEdit=null;chronicleEdit=null;archivePage=null;restoreDraft();paint(true);}
  if(manual||!loaded)status('Načítám chat…');
  try{const r=await repository.read();if(epoch!==requestEpoch)return;if(r.scope!==currentScope())throw Error('Připojení se změnilo, obnovte chat.');scope=r.scope;doc=r.doc;loaded=true;status(scope==='local'?'Pouze toto zařízení · lokální chat':'Soukromý GitHub Cloud · aktuální');paint(false);if(manual)feedback('Chat obnoven.');}
  catch(e){if(epoch!==requestEpoch)return;loaded=false;status('Chat není připojen.');feedback(e.message,true);controls();}finally{if(epoch===requestEpoch)reading=false;}
 }
 function op(type,props={}){return {type,opId:chatId(),at:new Date().toISOString(),gm:gm(),...props};}
 async function commit(operation,done){if(busy||!loaded)return;busy=true;++requestEpoch;reading=false;const startedRole=gm(),startedScope=scope;feedback('');status('Ukládám…');controls();
  try{const r=await repository.commit(operation,scope);doc=r.doc;loaded=true;if(gm()===startedRole&&currentScope()===startedScope)done?.(r.result);else if(operation.type==='send'){try{const k=DRAFT+startedScope+':'+(startedRole?'gm':'player'),d=JSON.parse(draftStorage.getItem(k)||'{}');if(d.id===operation.id)draftStorage.removeItem(k);}catch{}}status(scope==='local'?'Pouze toto zařízení · uloženo':'Soukromý GitHub Cloud · uloženo');paint(true,operation.type==='send');}
  catch(e){feedback('Zápis nebyl potvrzen: '+e.message,true);status('Zápis nepotvrzen · můžete jej zkusit znovu.');}
  finally{busy=false;controls();}
 }
 function resetSpeaker(){speakerEdit=null;$('[data-chat-speaker-name]').value='';$('[data-chat-speaker-color]').value=CHAT_PALETTE[0][0];updateSwatch();renderSpeakers();}
 function updateSwatch(){$('[data-chat-palette-preview]').style.background=$('[data-chat-speaker-color]').value;}
 function action(b){const a=b.dataset.chatAction,id=b.dataset.id;switch(a){
  case 'close':if(!busy)dlg.close();else feedback('Počkejte na potvrzení zápisu.',true);return;
  case 'refresh':void sync({manual:true});return;
  case 'archive':archivePage=archivePage===null?Math.max(0,Math.ceil(chatPages(doc).archive.length/50)-1):null;editing=null;renderMessages(true);controls();return;
  case 'archive-older':if(archivePage>0){archivePage--;editing=null;renderMessages();}return;
  case 'archive-newer':if(archivePage!==null){archivePage++;editing=null;renderMessages();}return;
  case 'cancel-chronicle':chronicleEdit=null;renderChronicle();controls();return;
  case 'cancel-message':editing=null;renderMessages();controls();return;
  case 'cancel-speaker':resetSpeaker();controls();return;
 }
 if(busy||!loaded)return;
 if(a==='send'){
  const author=gm()?gmAuthor:authors().find(x=>key(x)===$('[data-chat-author]').value),text=$('[data-chat-text]').value.trim();if(!author){feedback('Nejdříve vyberte jméno vytvořené GameMasterem.',true);return;}if(!text){feedback('Nejdříve napište zprávu.',true);return;}
  sendId=sendId||chatId();sendOp=sendOp||chatId();saveDraft();void commit(op('send',{id:sendId,opId:sendOp,author,text,gameDate:gameDate()}),()=>{$('[data-chat-text]').value='';sendId=sendOp=null;saveDraft();archivePage=null;feedback('Zpráva odeslána.');});return;
 }
 if(a==='edit-message'||a==='delete-message'){const m=doc.messages.find(x=>x.id===id);if(!m||(!gm()&&m.author.kind==='gm'))return;
  if(a==='edit-message'){editing={id:m.id,revision:m.revision,text:m.text};renderMessages();fitTextareas();$('[data-chat-edit-text]')?.focus();}
  else if(confirm('Odstranit tuto zprávu?'))void commit(op('delete-message',{id:m.id,revision:m.revision}),()=>{if(editing?.id===m.id)editing=null;feedback('Zpráva odstraněna.');});return;
 }
 if(a==='save-message'){if(!editing)return;const m=doc.messages.find(x=>x.id===editing.id);if(!m||(!gm()&&m.author.kind==='gm'))return;void commit(op('edit-message',{...editing}),()=>{editing=null;feedback('Zpráva upravena.');});return;}
 if(!gm())return;
 if(a==='edit-speaker'){const s=doc.speakers.find(x=>x.id===id);if(!s)return;speakerEdit={id:s.id,revision:s.revision};$('[data-chat-speaker-name]').value=s.name;$('[data-chat-speaker-color]').value=s.color;updateSwatch();renderSpeakers();controls();return;}
 if(a==='save-speaker'){const name=$('[data-chat-speaker-name]').value.trim(),color=$('[data-chat-speaker-color]').value;if(!name){feedback('Zadejte jméno.',true);return;}void commit(op('save-speaker',{id:chatId(),...speakerEdit,name,color}),()=>{resetSpeaker();feedback('Jméno uloženo.');});return;}
 if(a==='delete-speaker'){const s=doc.speakers.find(x=>x.id===id);if(s&&confirm('Odstranit jméno ze seznamu? Staré zprávy zůstanou zachovány.'))void commit(op('delete-speaker',{id:s.id,revision:s.revision}),()=>{if(speakerEdit?.id===s.id)resetSpeaker();feedback('Jméno odstraněno.');});return;}
 if(a==='edit-chronicle'){chronicleEdit={text:chronicleText(doc.chronicle),revision:doc.chronicle.revision||0};renderChronicle();controls();$('[data-chat-chronicle-edit]')?.focus();return;}
 if(a==='save-chronicle'&&chronicleEdit){void commit(op('edit-chronicle',chronicleEdit),()=>{chronicleEdit=null;feedback('Kronika uložena.');});return;}
 if(a==='clear-chronicle'){if(confirm('Smazat celou kroniku? Zprávy v chatu zůstanou. Příští vytvoření kroniky je zpracuje znovu.'))void commit(op('clear-chronicle',{revision:doc.chronicle.revision||0}),()=>{chronicleEdit=null;feedback('Kronika smazána.');});return;}
 if(a==='chronicle')void commit(op('chronicle'),r=>feedback(r.changed||r.removed?`Kronika aktualizována: ${r.changed} nových nebo změněných zápisů, ${r.removed} odstraněných.`:'Kronika je aktuální.'));
 }
 function createDialog(){dlg=document.createElement('dialog');dlg.className='hmk-chat-dialog content-sheet';dlg.setAttribute('aria-labelledby','hmk-chat-title');dlg.innerHTML=bookShell(`<div class="hmk-chat-toolbar"><h2 id="hmk-chat-title">Chat a kronika družiny</h2><span data-chat-status role="status"></span><button type="button" data-chat-action="refresh">Obnovit</button><button type="button" data-chat-action="close">Zavřít chat</button></div><p data-chat-feedback role="status" aria-live="polite"></p><div class="hmk-chat-book journal-book-spread"><section class="hmk-chat-page hmk-chat-left journal-book-page journal-book-page--left"><h3>Chat</h3><div class="hmk-chat-compose"><strong data-chat-gm class="hmk-chat-gm-label">GameMaster</strong><label data-chat-player>Jméno<select data-chat-author></select></label><textarea data-chat-text rows="1" maxlength="12000" placeholder="Napište zprávu…" aria-label="Text zprávy"></textarea><div class="hmk-chat-actions"><button type="button" data-chat-action="send">Odeslat</button></div></div><details data-chat-gm class="hmk-chat-profile-panel"><summary>Správa jmen a barev</summary><div class="hmk-chat-profile-form"><label>Jméno<input data-chat-speaker-name maxlength="120"></label><label>Barva z palety <span class="hmk-chat-swatch" data-chat-palette-preview></span><select data-chat-speaker-color>${CHAT_PALETTE.map(([c,n])=>`<option value="${c}" style="background:${c};color:#30251c">${escape(n)}</option>`).join('')}</select></label><div class="hmk-chat-actions"><button type="button" data-chat-action="save-speaker">Přidat jméno</button><button type="button" data-chat-action="cancel-speaker" hidden>Zrušit</button></div></div><div data-chat-speakers></div></details><div class="hmk-chat-list-head"><strong>Zprávy</strong><button type="button" data-chat-action="archive" data-chat-archive>Archiv (0)</button></div><div data-chat-pager hidden class="hmk-chat-actions"><button type="button" data-chat-action="archive-older">Starší</button><span data-chat-page></span><button type="button" data-chat-action="archive-newer">Novější</button></div><div data-chat-messages class="hmk-chat-messages" aria-label="Zprávy chatu"></div></section><section class="hmk-chat-page hmk-chat-right journal-book-page journal-book-page--right"><h3>Kronika</h3><div class="hmk-chat-actions hmk-chat-chronicle-actions" data-chat-gm><button type="button" data-chat-action="chronicle" data-chat-gm>Vytvořit kroniku</button><button type="button" data-chat-action="edit-chronicle" data-chat-gm>Editovat</button><button type="button" data-chat-action="clear-chronicle" data-chat-gm>Smazat vše</button></div><p data-chat-chronicle-info class="hmk-chat-meta"></p><div data-chat-chronicle class="hmk-chat-chronicle" aria-label="Kronika družiny"></div></section></div>`);
  document.body.appendChild(dlg);updateSwatch();
  dlg.addEventListener('click',e=>{const b=e.target.closest('[data-chat-action]');if(!b)return;e.preventDefault();e.stopPropagation();action(b);});
  dlg.addEventListener('input',e=>{if(e.target.matches('[data-chat-text],[data-chat-author]')){if(e.target.matches('[data-chat-author]')){draftAuthor=e.target.value;renderAuthors();}sendId=sendOp=null;saveDraft();}if(e.target.matches('[data-chat-edit-text]')&&editing)editing.text=e.target.value;if(e.target.matches('[data-chat-chronicle-edit]')&&chronicleEdit)chronicleEdit.text=e.target.value;if(e.target.matches('textarea'))fitTextareas();});
  dlg.addEventListener('change',e=>{if(e.target.matches('[data-chat-author]')){draftAuthor=e.target.value;renderAuthors();sendId=sendOp=null;saveDraft();}if(e.target.matches('[data-chat-speaker-color]'))updateSwatch();});
  dlg.addEventListener('cancel',e=>{e.preventDefault();if(!busy)dlg.close();});
  dlg.addEventListener('close',()=>{saveDraft();++requestEpoch;reading=false;clearInterval(interval);interval=null;document.querySelector('[data-hmk-chat-open]')?.focus({preventScroll:true});});
 }
 function open(){if(!dlg)createDialog();if(dlg.open)return;scope=currentScope();doc=emptyChat();loaded=false;rendered='';archivePage=null;editing=null;speakerEdit=null;role=null;chronicleEdit=null;resetSpeaker();feedback('');status('Načítám chat…');paint(true);dlg.showModal();fitTextareas();void sync();interval=setInterval(()=>{if(document.visibilityState==='visible')void sync();},pollMs);}
 document.addEventListener('click',e=>{if(!e.target.closest?.('[data-hmk-chat-open]'))return;e.preventDefault();e.stopImmediatePropagation();open();},true);
 // Escape belongs to the chat, never to an underlying Atlas or other editor.
 window.addEventListener('keydown',e=>{if(!dlg?.open||e.key!=='Escape')return;e.preventDefault();e.stopImmediatePropagation();if(!busy)dlg.close();else feedback('Počkejte na potvrzení zápisu.',true);},true);
 new MutationObserver(()=>{if(dlg?.open){paint(true);}}).observe(document.documentElement,{attributes:true,attributeFilter:['data-hmk-gm']});
 window.addEventListener('storage',e=>{if(dlg?.open)void sync();});
 return {open};
}
