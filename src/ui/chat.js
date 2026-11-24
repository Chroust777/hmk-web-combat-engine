import {CHAT_PALETTE,GM_COLOR,PC_COLOR,chatId,emptyChat,chatPages,chatGameDay,chronicleDays,LEGACY_CHRONICLE_DAY,createChatRepository} from '../integration/hmk-chat-store.js?v=94.103';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gm=()=>document.documentElement.dataset.hmkGm==='true';
const gmAuthor={kind:'gm',id:'gm',name:'GameMaster',color:GM_COLOR};
const when=s=>{try{return new Intl.DateTimeFormat('cs-CZ',{dateStyle:'short',timeStyle:'short'}).format(new Date(s));}catch{return '';}};
const DRAFT='hmk-chat-draft-v1:';
export function installChat({gameDate=()=>null,bookShell,connection,storage=localStorage,draftStorage=sessionStorage,pollMs=15000}){
 const repository=createChatRepository({storage,connection,stale:()=>!!window.__hmkOutdatedBuild});
 let dlg=null,doc=emptyChat(),scope=null,loaded=false,busy=false,reading=false,archivePage=null,editing=null,speakerEdit=null,sendId=null,sendOp=null,interval=null,requestEpoch=0,role=null,rendered='',draftAuthor='',chronicleEdit=null,chroniclePage=0,chronicleLayout=null,chronicleDay=null;
 let active=false,previousMain=null,previousShell=null,previousScene=null,previousScroll=0,previousNav=null,previousRole=null;
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
 function renderRole(){const active=gm();if(role!==active){role=active;$('details.hmk-chat-profile-panel').open=false;editing=null;speakerEdit=null;chronicleEdit=null;resetSpeaker();restoreDraft();}
  for(const el of dlg.querySelectorAll('[data-chat-gm]'))el.hidden=!active;
  for(const el of dlg.querySelectorAll('[data-chat-player]'))el.hidden=active;
 }
 function renderSpeakers(){const list=$('[data-chat-speakers]');list.innerHTML=doc.speakers.length?doc.speakers.map(s=>`<div class="hmk-chat-speaker"><span class="hmk-chat-swatch" style="background:${s.color}"></span><strong>${escape(s.name)}</strong><button type="button" data-chat-action="edit-speaker" data-id="${escape(s.id)}">Editovat</button><button type="button" data-chat-action="delete-speaker" data-id="${escape(s.id)}">Odstranit</button></div>`).join(''):'<p class="hmk-chat-empty">Zatím žádná jména.</p>';
  const b=$('[data-chat-action="save-speaker"]');b.textContent=speakerEdit?'Uložit změny':'Přidat jméno';$('[data-chat-action="cancel-speaker"]').hidden=!speakerEdit;
 }
 function renderMessages(scrollEnd=false){const pages=chatPages(doc),archiveCount=pages.archive.length,totalPages=Math.max(1,Math.ceil(archiveCount/50));if(archivePage!==null){archivePage=Math.min(archivePage,totalPages-1);if(!archiveCount)archivePage=null;}
  const items=(archivePage===null?pages.latest:pages.archive.slice(archivePage*50,(archivePage+1)*50)).slice().reverse();
  $('[data-chat-archive]').textContent=archivePage===null?`Archiv (${archiveCount})`:'Zpět na posledních 50';
  const pager=$('[data-chat-pager]');pager.hidden=archivePage===null;$('[data-chat-page]').textContent=archivePage===null?'':`Strana ${archivePage+1} / ${totalPages}`;$('[data-chat-action="archive-older"]').disabled=archivePage===null||archivePage===0;$('[data-chat-action="archive-newer"]').disabled=archivePage===null||archivePage===totalPages-1;
  const list=$('[data-chat-messages]'),oldScroll=list.scrollTop,atTop=oldScroll<12,top=list.getBoundingClientRect().top,anchor=[...list.querySelectorAll('[data-chat-message]')].find(el=>el.getBoundingClientRect().bottom>top),anchorId=anchor?.dataset.chatMessage,anchorOffset=anchor?anchor.getBoundingClientRect().top-top:0;
  list.innerHTML=items.length?items.map(m=>{const editable=gm()||m.author.kind!=='gm';return `<article class="hmk-chat-message" data-chat-message="${escape(m.id)}" style="background:${m.author.color}"><header><strong>${escape(m.author.name)} <span class="hmk-chat-game-date">(${escape(m.gameDate||'Herní datum nedoloženo')})</span></strong><time datetime="${escape(m.createdAt)}">${escape(when(m.createdAt))}${m.revision>1?' · upraveno':''}</time></header>${editing?.id===m.id&&editable?`<textarea data-chat-edit-text maxlength="12000" rows="1" aria-label="Upravit zprávu">${escape(editing.text)}</textarea><div class="hmk-chat-actions"><button type="button" data-chat-action="save-message">Uložit</button><button type="button" data-chat-action="cancel-message">Zrušit</button></div>`:`<p>${escape(m.text)}</p>${editable?`<div class="hmk-chat-actions"><button type="button" data-chat-action="edit-message" data-id="${escape(m.id)}">Editovat</button><button type="button" data-chat-action="delete-message" data-id="${escape(m.id)}">Odstranit</button></div>`:''}`}</article>`;}).join(''):'<p class="hmk-chat-empty">Zatím zde nejsou žádné zprávy.</p>';
  limitMessages();
  const kept=[...list.querySelectorAll('[data-chat-message]')].find(el=>el.dataset.chatMessage===anchorId);
  if(scrollEnd||atTop&&!editing)list.scrollTop=0;else if(kept)list.scrollTop+=kept.getBoundingClientRect().top-list.getBoundingClientRect().top-anchorOffset;else list.scrollTop=oldScroll;
 }
 function limitMessages(){const list=$('[data-chat-messages]');const heights=[...list.querySelectorAll('[data-chat-message]')].map(el=>el.getBoundingClientRect().height).filter(h=>h>0).sort((a,b)=>a-b);const gap=parseFloat(getComputedStyle(list).rowGap)||0;list.style.setProperty('--chat-seven-limit',heights.length>=7?Math.floor(heights.slice(0,7).reduce((a,b)=>a+b,0)+gap*6)+'px':'460px');}
 function fitTextareas(){for(const t of dlg.querySelectorAll('textarea')){if(t.offsetWidth===0)continue;t.style.height='auto';t.style.height=(t.scrollHeight+t.offsetHeight-t.clientHeight)+'px';}limitMessages();}
 function selectedChronicle(){const days=chronicleDays(doc),select=$('[data-chat-chronicle-day]');if(!days.some(d=>d.day===chronicleDay)){const today=chatGameDay(gameDate());chronicleDay=days.find(d=>d.day===today)?.day??days.findLast(d=>d.day!==LEGACY_CHRONICLE_DAY)?.day??days.at(-1)?.day??null;chroniclePage=0;chronicleLayout=null;}
  select.innerHTML=days.length?days.map(d=>`<option value="${escape(d.day)}">${escape(d.day)}</option>`).join(''):'<option value="">— Žádný herní den —</option>';select.value=chronicleDay??'';return days.find(d=>d.day===chronicleDay);}
 // Measure actual wrapped text against the available page instead of guessing a character count.
 function layoutChronicle(){if(!dlg?.isConnected||chronicleEdit&&gm())return;const body=$('[data-chat-chronicle]'),p=body.querySelector('[data-chat-prose]');if(!p)return;
  const text=chronicleDays(doc).find(d=>d.day===chronicleDay)?.text??'',w=body.clientWidth,h=body.clientHeight;if(!w||!h)return;
  const previous=chronicleLayout,offset=previous?.starts[chroniclePage]||0;
  if(!previous||previous.text!==text||previous.w!==w||previous.h!==h){const pages=[],starts=[];const style=getComputedStyle(body),limit=h-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);let start=0;
   const fits=end=>{p.textContent=text.slice(start,end);return p.getBoundingClientRect().height<=limit+0.5;};
   while(start<text.length){let low=start+1,high=Math.min(text.length,start+1024);while(high<text.length&&fits(high))high=Math.min(text.length,start+(high-start)*2);while(low<high){const mid=Math.ceil((low+high)/2);if(fits(mid))low=mid;else high=mid-1;}let end=low;if(end<text.length&&!/\s/u.test(text[end])){const part=text.slice(start,end),breakAt=part.search(/\s+\S*$/u);if(breakAt>=0){const boundary=start+breakAt+part.slice(breakAt).match(/^\s+/u)[0].length;if(boundary>start)end=boundary;}}if(/[\uD800-\uDBFF]/.test(text[end-1]))end=end>start+1?end-1:Math.min(text.length,start+2);starts.push(start);pages.push(text.slice(start,end));start=end;}
   chronicleLayout={text,w,h,pages:pages.length?pages:[''],starts:starts.length?starts:[0]};chroniclePage=Math.max(0,chronicleLayout.starts.findLastIndex(i=>i<=offset));
  }
  const count=chronicleLayout.pages.length;chroniclePage=Math.max(0,Math.min(chroniclePage,count-1));p.textContent=chronicleLayout.pages[chroniclePage];$('[data-chat-chronicle-page]').textContent=`Strana ${chroniclePage+1} / ${count}`;$('[data-chat-action="chronicle-prev"]').disabled=chroniclePage===0;$('[data-chat-action="chronicle-next"]').disabled=chroniclePage===count-1;
 }
 function renderChronicle(){const entries=doc.chronicle.entries,existing=new Map(entries.map(e=>[e.sourceId,e.revision])),live=new Set(doc.messages.map(m=>m.id)),pending=doc.messages.filter(m=>existing.get(m.id)!==m.revision).length+entries.filter(e=>!live.has(e.sourceId)).length;
  $('[data-chat-chronicle-info]').textContent=(doc.chronicle.generatedAt?'Naposledy vytvořeno: '+when(doc.chronicle.generatedAt)+' · ':'')+entries.length+' zpracovaných zpráv'+(pending?' · Čeká na zpracování: '+pending:'');
  const body=$('[data-chat-chronicle]'),scroll=body.scrollTop,content=selectedChronicle()?.text??'';$('[data-chat-chronicle-pager]').hidden=!!(chronicleEdit&&gm())||!content;body.innerHTML=chronicleEdit&&gm()?`<textarea data-chat-chronicle-edit rows="1" aria-label="Upravit kroniku" maxlength="400000">${escape(chronicleEdit.text)}</textarea><div class="hmk-chat-actions"><button type="button" data-chat-action="save-chronicle">Uložit změny</button><button type="button" data-chat-action="cancel-chronicle">Zrušit</button></div>`:content?'<p data-chat-prose></p>':'<p class="hmk-chat-empty">Kronika zatím nebyla vytvořena.</p>';body.scrollTop=scroll;fitTextareas();layoutChronicle();
 }

 function controls(){for(const b of dlg.querySelectorAll('button[data-chat-action]')){if(['close','refresh','archive','archive-older','archive-newer','cancel-message','cancel-speaker','cancel-chronicle','chronicle-prev','chronicle-next'].includes(b.dataset.chatAction))continue;b.disabled=busy||!loaded;}
  $('[data-chat-chronicle-day]').disabled=busy||!loaded||!!chronicleEdit||!chronicleDay;$('[data-chat-text]').readOnly=busy;$('[data-chat-author]').disabled=busy;$('[data-chat-speaker-name]').readOnly=busy;$('[data-chat-speaker-color]').disabled=busy;const e=$('[data-chat-edit-text]');if(e)e.readOnly=busy;const ce=$('[data-chat-chronicle-edit]');if(ce)ce.readOnly=busy;for(const a of ['chronicle','edit-chronicle','clear-chronicle'])$(`[data-chat-action="${a}"]`).disabled=busy||!loaded||!!chronicleEdit||(a==='edit-chronicle'&&!chronicleDay);
 }
 function paint(force=false,scrollEnd=false){renderRole();const snapshot=JSON.stringify(doc);if(force||snapshot!==rendered){rendered=snapshot;renderAuthors();renderMessages(scrollEnd);renderSpeakers();renderChronicle();}controls();fitTextareas();}
 async function sync({manual=false}={}){if(!active||busy||reading)return;const epoch=++requestEpoch;reading=true;const nextScope=currentScope();if(scope!==nextScope){scope=nextScope;doc=emptyChat();loaded=false;editing=null;speakerEdit=null;chronicleEdit=null;chronicleDay=null;chroniclePage=0;chronicleLayout=null;archivePage=null;restoreDraft();paint(true);}
  if(manual||!loaded)status('Načítám chat…');
  try{const r=await repository.read();if(epoch!==requestEpoch)return;if(r.scope!==currentScope())throw Error('Připojení se změnilo, obnovte chat.');scope=r.scope;doc=r.doc;loaded=true;status(scope==='local'?'Pouze toto zařízení · lokální chat':'');paint(false);if(manual)feedback('Chat obnoven.');}
  catch(e){if(epoch!==requestEpoch)return;loaded=false;status('Chat není připojen.');feedback(e.message,true);controls();}finally{if(epoch===requestEpoch)reading=false;}
 }
 function op(type,props={}){return {type,opId:chatId(),at:new Date().toISOString(),gm:gm(),...props};}
 async function commit(operation,done){if(busy||!loaded)return;busy=true;++requestEpoch;reading=false;const startedRole=gm(),startedScope=scope;feedback('');status('Ukládám…');controls();
  try{const r=await repository.commit(operation,scope);doc=r.doc;loaded=true;if(gm()===startedRole&&currentScope()===startedScope)done?.(r.result);else if(operation.type==='send'){try{const k=DRAFT+startedScope+':'+(startedRole?'gm':'player'),d=JSON.parse(draftStorage.getItem(k)||'{}');if(d.id===operation.id)draftStorage.removeItem(k);}catch{}}status(scope==='local'?'Pouze toto zařízení · uloženo':'');paint(true,operation.type==='send');}
  catch(e){feedback('Zápis nebyl potvrzen: '+e.message,true);status('Zápis nepotvrzen · můžete jej zkusit znovu.');}
  finally{busy=false;controls();}
 }
 function resetSpeaker(){speakerEdit=null;$('[data-chat-speaker-color] option[data-legacy-color]')?.remove();$('[data-chat-speaker-name]').value='';$('[data-chat-speaker-color]').value=CHAT_PALETTE[0][0];renderSpeakers();}
 function action(b){const a=b.dataset.chatAction,id=b.dataset.id;switch(a){
  case 'close':if(!busy)close();else feedback('Počkejte na potvrzení zápisu.',true);return;
  case 'refresh':void sync({manual:true});return;
  case 'archive':archivePage=archivePage===null?Math.max(0,Math.ceil(chatPages(doc).archive.length/50)-1):null;editing=null;renderMessages(true);controls();return;
  case 'archive-older':if(archivePage>0){archivePage--;editing=null;renderMessages(true);}return;
  case 'archive-newer':if(archivePage!==null){archivePage++;editing=null;renderMessages(true);}return;
  case 'chronicle-prev':if(chroniclePage>0){chroniclePage--;layoutChronicle();}return;
  case 'chronicle-next':if(chronicleLayout&&chroniclePage<chronicleLayout.pages.length-1){chroniclePage++;layoutChronicle();}return;
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
 if(a==='edit-speaker'){const s=doc.speakers.find(x=>x.id===id);if(!s)return;speakerEdit={id:s.id,revision:s.revision};$('[data-chat-speaker-name]').value=s.name;const palette=$('[data-chat-speaker-color]');palette.querySelector('[data-legacy-color]')?.remove();if(!CHAT_PALETTE.some(([c])=>c===s.color)){const opt=new Option('Původní barva',s.color);opt.dataset.legacyColor='';opt.style.background=s.color;palette.append(opt);}palette.value=s.color;renderSpeakers();controls();return;}
 if(a==='save-speaker'){const name=$('[data-chat-speaker-name]').value.trim(),color=$('[data-chat-speaker-color]').value;if(!name){feedback('Zadejte jméno.',true);return;}void commit(op('save-speaker',{id:chatId(),...speakerEdit,name,color}),()=>{resetSpeaker();feedback('Jméno uloženo.');});return;}
 if(a==='delete-speaker'){const s=doc.speakers.find(x=>x.id===id);if(s&&confirm('Odstranit jméno ze seznamu? Staré zprávy zůstanou zachovány.'))void commit(op('delete-speaker',{id:s.id,revision:s.revision}),()=>{if(speakerEdit?.id===s.id)resetSpeaker();feedback('Jméno odstraněno.');});return;}
 if(a==='edit-chronicle'){const day=selectedChronicle();if(!day)return;chronicleEdit={day:day.day,text:day.text,revision:doc.chronicle.revision||0};renderChronicle();controls();$('[data-chat-chronicle-edit]')?.focus();return;}
 if(a==='save-chronicle'&&chronicleEdit){void commit(op('edit-chronicle',chronicleEdit),()=>{chronicleEdit=null;feedback('Kronika uložena.');});return;}
 if(a==='clear-chronicle'){if(confirm('Smazat celou kroniku? Zprávy v chatu zůstanou. Příští vytvoření kroniky je zpracuje znovu.'))void commit(op('clear-chronicle',{revision:doc.chronicle.revision||0}),()=>{chronicleEdit=null;chronicleDay=null;chroniclePage=0;chronicleLayout=null;feedback('Kronika smazána.');});return;}
 if(a==='chronicle')void commit(op('chronicle'),r=>feedback(r.changed||r.removed?`Kronika aktualizována: ${r.changed} nových nebo změněných zápisů, ${r.removed} odstraněných.`:'Kronika je aktuální.'));
 }
 function createView(){dlg=document.createElement('main');dlg.className='content content-chat content-sheet hmk-chat-view';dlg.setAttribute('aria-labelledby','hmk-chat-title');dlg.innerHTML=`<div class="ledger-topline hmk-chat-toolbar"><h2 id="hmk-chat-title">Chat a kronika družiny</h2><span data-chat-status role="status"></span></div>`+bookShell(`<div class="hmk-chat-book journal-book-spread folio-chapter-spread"><section class="hmk-chat-page hmk-chat-left journal-book-page journal-book-page--left folio-chapter-page folio-chapter-page--left"><div class="hmk-chat-heading"><h3>Chat</h3><button type="button" data-chat-action="refresh">Obnovit</button><button type="button" data-chat-action="close">Zavřít chat</button></div><p data-chat-feedback role="status" aria-live="polite"></p><div class="hmk-chat-compose"><strong data-chat-gm class="hmk-chat-gm-label">GameMaster</strong><label data-chat-player>Jméno<select data-chat-author></select></label><textarea data-chat-text rows="1" maxlength="12000" placeholder="Napište zprávu…" aria-label="Text zprávy"></textarea><div class="hmk-chat-actions"><button type="button" data-chat-action="send">Odeslat</button></div></div><details data-chat-gm class="hmk-chat-profile-panel"><summary>Správa jmen a barev</summary><div class="hmk-chat-profile-form"><label>Jméno<input data-chat-speaker-name maxlength="120"></label><label>Barva z palety <select data-chat-speaker-color>${CHAT_PALETTE.map(([c,n])=>`<option value="${c}" style="background:${c};color:#30251c">${escape(n)}</option>`).join('')}</select></label><div class="hmk-chat-actions"><button type="button" data-chat-action="save-speaker">Přidat jméno</button><button type="button" data-chat-action="cancel-speaker" hidden>Zrušit</button></div></div><div data-chat-speakers></div></details><div class="hmk-chat-list-head"><strong>Zprávy</strong><button type="button" data-chat-action="archive" data-chat-archive>Archiv (0)</button></div><div data-chat-pager hidden class="hmk-chat-actions"><button type="button" data-chat-action="archive-older">Starší</button><span data-chat-page></span><button type="button" data-chat-action="archive-newer">Novější</button></div><div data-chat-messages class="hmk-chat-messages" aria-label="Zprávy chatu"></div></section><section class="hmk-chat-page hmk-chat-right journal-book-page journal-book-page--right folio-chapter-page folio-chapter-page--right"><h3>Kronika</h3><div class="hmk-chat-actions hmk-chat-chronicle-actions"><select data-chat-chronicle-day aria-label="Herní den kroniky"></select><button type="button" data-chat-action="chronicle" data-chat-gm>Vytvořit kroniku</button><button type="button" data-chat-action="edit-chronicle" data-chat-gm>Editovat</button><button type="button" data-chat-action="clear-chronicle" data-chat-gm>Smazat vše</button></div><p data-chat-chronicle-info class="hmk-chat-meta"></p><div data-chat-chronicle class="hmk-chat-chronicle" aria-label="Kronika družiny"></div><div data-chat-chronicle-pager class="hmk-chat-chronicle-pager" hidden><button type="button" data-chat-action="chronicle-prev" aria-label="Předchozí strana">←</button><span data-chat-chronicle-page></span><button type="button" data-chat-action="chronicle-next" aria-label="Další strana">→</button></div></section></div>`);
  const observer=new ResizeObserver(()=>{if(active&&dlg.isConnected){limitMessages();layoutChronicle();}});observer.observe($('[data-chat-chronicle]'));observer.observe($('[data-chat-messages]'));
  dlg.addEventListener('click',e=>{const b=e.target.closest('[data-chat-action]');if(!b)return;e.preventDefault();e.stopPropagation();action(b);});
  dlg.addEventListener('input',e=>{if(e.target.matches('[data-chat-text],[data-chat-author]')){if(e.target.matches('[data-chat-author]')){draftAuthor=e.target.value;renderAuthors();}sendId=sendOp=null;saveDraft();}if(e.target.matches('[data-chat-edit-text]')&&editing)editing.text=e.target.value;if(e.target.matches('[data-chat-chronicle-edit]')&&chronicleEdit)chronicleEdit.text=e.target.value;if(e.target.matches('textarea'))fitTextareas();});
  dlg.addEventListener('change',e=>{if(e.target.matches('[data-chat-chronicle-day]')&&!chronicleEdit){chronicleDay=e.target.value;chroniclePage=0;chronicleLayout=null;renderChronicle();controls();}if(e.target.matches('[data-chat-author]')){draftAuthor=e.target.value;renderAuthors();sendId=sendOp=null;saveDraft();}});
 }
 // Use the actual application content slot, never a dialog or a second overlay book.
 // Keep the original DOM intact for an ordinary chat visit, including draft fields.
 function remount(){if(!active||dlg.isConnected)return;const shell=document.querySelector('#app .shell'),main=shell?.querySelector('.layout > main.content');if(!main)return;
  previousMain=main;previousRole=gm();previousShell=shell;previousScene=shell.dataset.scene;previousNav=[...shell.querySelectorAll('.castle-nav-link.active')];
  previousNav.forEach(x=>x.classList.remove('active'));shell.querySelector('[data-hmk-chat-open]')?.classList.add('active');shell.classList.add('hmk-chat-active');shell.dataset.scene='study';main.replaceWith(dlg);fitTextareas();layoutChronicle();
 }
 function close({focus=true}={}){if(!active)return;saveDraft();active=false;++requestEpoch;reading=false;clearInterval(interval);interval=null;
  if(dlg.isConnected&&previousMain){dlg.replaceWith(previousMain);previousShell.classList.remove('hmk-chat-active');previousShell.dataset.scene=previousScene;previousShell.querySelector('[data-hmk-chat-open]')?.classList.remove('active');previousNav.forEach(x=>x.classList.add('active'));if(previousRole!==gm())for(const atlas of previousMain.querySelectorAll('.atlas-workspace'))atlas.dispatchEvent(new CustomEvent('hmk-gm-mode-change',{detail:{active:gm()}}));window.scrollTo(0,previousScroll);}
  previousMain=previousShell=previousNav=null;if(focus)document.querySelector('[data-hmk-chat-open]')?.focus({preventScroll:true});
 }
 function open(){if(active)return;if(!document.querySelector('#app .layout > main.content'))return;if(!dlg)createView();previousScroll=window.scrollY;scope=currentScope();doc=emptyChat();loaded=false;rendered='';archivePage=null;editing=null;speakerEdit=null;role=null;chronicleEdit=null;chronicleDay=null;chroniclePage=0;chronicleLayout=null;$('details.hmk-chat-profile-panel').open=false;resetSpeaker();feedback('');status('Načítám chat…');active=true;remount();paint(true);window.scrollTo(0,0);void sync();interval=setInterval(()=>{if(document.visibilityState==='visible')void sync();},pollMs);}
 document.addEventListener('click',e=>{const target=e.target.closest?.('[data-hmk-chat-open]');if(target){e.preventDefault();e.stopImmediatePropagation();open();return;}
  if(!active||!e.target.closest?.('#app .nav button'))return;
  if(e.target.closest('[data-hmk-gm-login],[data-hmk-gm-logout]'))return;
  if(busy){e.preventDefault();e.stopImmediatePropagation();feedback('Počkejte na potvrzení zápisu.',true);return;}close({focus:false});
 },true);
 // Escape belongs to the chat, not to the preserved underlying form or GM login.
 window.addEventListener('keydown',e=>{if(!active||e.key!=='Escape'||document.querySelector('[data-hmk-gm-dialog][open]'))return;e.preventDefault();e.stopImmediatePropagation();if(!busy)close();else feedback('Počkejte na potvrzení zápisu.',true);},true);
 new MutationObserver(()=>{if(active){paint(true);}}).observe(document.documentElement,{attributes:true,attributeFilter:['data-hmk-gm']});
 window.addEventListener('storage',e=>{if(active)void sync();});
 return {open,remount};
}
