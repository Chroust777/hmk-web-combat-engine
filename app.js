import { Character as KernelCharacter, Skill as KernelSkill, WeaponDefinition, WeaponInstance, Shield, ArmourArticle, SCHEMA_VERSION } from './src/domain/contracts.js';
// HMK Keeper's Ledger v30 — bounded nested catalogue data and verified release lineage; v1 storage retained.
const APP_VERSION='30';
const STORAGE='hmk-keepers-ledger-v1';
const uuid=()=>globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clean=()=>({schemaVersion:1,characters:[],items:[],inventory:[],trash:[],journal:[]});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=()=>new Date().toISOString();
const SLOTS=[['none','Nezařazeno'],['main_hand','Hlavní ruka'],['off_hand','Vedlejší ruka'],['worn','Oblečeno / nasazeno'],['carried','Neseno']];
const slotLabel=v=>(SLOTS.find(s=>s[0]===(v||'none'))||SLOTS[0])[1];
const validSlotForCategory=(slot,cat)=>SLOTS.some(s=>s[0]===slot)&&(!(slot==='main_hand'||slot==='off_hand')||['weapon','shield'].includes(cat))&&(slot!=='worn'||cat==='armor');
function handSlotAvailable(characterId,slot,exceptId=null){return !['main_hand','off_hand'].includes(slot)||!data.inventory.some(x=>x.characterId===characterId&&x.slot===slot&&x.id!==exceptId)}
const slotSelect=(name,value)=>`<label>Umístění / slot<select name="${name}">${SLOTS.map(([id,label])=>`<option value="${id}" ${value===id?'selected':''}>${label}</option>`).join('')}</select></label>`;
let storageReadOnly=false;
let storageBaseline=null; // exact bytes last observed; prevents stale-tab overwrites
let data=clean(),view='characters',selected=null,editItem=null,query='',category='weapon',notice='';
// Encounter preparation is a per-tab draft, deliberately separate from the character database.
// sessionStorage may be unavailable (privacy settings); the page still works in memory.
const ENCOUNTER_DRAFT_KEY='hmk-keepers-ledger-encounter-draft-v1';
function readEncounterDraft(){
 try {const raw=sessionStorage.getItem(ENCOUNTER_DRAFT_KEY);if(!raw)return new Set();
  const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||parsed.length>10000)return new Set();
  const validIds=new Set(data.characters.map(c=>c.id));
  return new Set(parsed.filter(id=>typeof id==='string'&&validIds.has(id)));
 }catch{return new Set()}
}
function persistEncounterDraft(){
 try{const validIds=new Set(data.characters.map(c=>c.id));
  encounterSelection=new Set([...encounterSelection].filter(id=>validIds.has(id)));
  sessionStorage.setItem(ENCOUNTER_DRAFT_KEY,JSON.stringify([...encounterSelection]));
 }catch{/* Private browsing or storage quota: in-memory selection remains usable. */}
}
let encounterSelection=new Set(); // Hydrate only after loading the character database.
let catalogStatus='all'; // presentation-only; never persisted
try{const saved=localStorage.getItem(STORAGE);if(saved)data=validate(JSON.parse(saved));storageBaseline=saved;}catch(e){storageReadOnly=true;notice='POZOR: Původní data se nepodařilo načíst. Zápisy jsou zablokovány, aby se nepřepsala. Zálohujte data prohlížeče a opravte úložiště.';console.error(e)}
// Restore the encounter draft only after character IDs are available.
// On unreadable database data, do not rehydrate potentially stale selections.
if(!storageReadOnly)encounterSelection=readEncounterDraft();
function validate(d){
 if(!d||d.schemaVersion!==1||!['characters','items','inventory','trash','journal'].every(k=>Array.isArray(d[k])))throw Error('Neplatný formát zálohy');
 const ids=new Set();for(const c of [...d.characters,...d.trash]){if(!c||typeof c.id!=='string'||!c.id||typeof c.name!=='string'||ids.has(c.id))throw Error('Neplatná nebo duplicitní postava');if(c.kind!==undefined&&!['PC','NPC'].includes(c.kind))throw Error('Neplatný typ postavy');ids.add(c.id)}
 for(const k of ['items','inventory','journal']){const seen=new Set();for(const v of d[k]){if(!v||typeof v.id!=='string'||!v.id||seen.has(v.id))throw Error('Duplicitní nebo neplatné ID: '+k);seen.add(v.id)}}
 for(const i of d.items){if(typeof i.name!=='string'||!['weapon','shield','armor','other'].includes(i.category)||!i.properties||typeof i.properties!=='object'||Array.isArray(i.properties))throw Error('Neplatná položka knihovny')}
 for(const c of [...d.characters,...d.trash]){if(c.hmk!==undefined){if(!c.hmk||typeof c.hmk!=='object'||Array.isArray(c.hmk))throw Error('Neplatný HMK profil');for(const k of ['skills','injuries']){if(c.hmk[k]!==undefined){if(!Array.isArray(c.hmk[k]))throw Error('Neplatný seznam '+k);const unique=new Set();for(const r of c.hmk[k]){if(!r||typeof r.id!=='string'||!r.id||unique.has(r.id))throw Error('Duplicitní HMK ID: '+k);unique.add(r.id)}}}}}
 if(d.inventory.some(x=>!ids.has(x.characterId)||!x.snapshot||typeof x.snapshot.name!=='string'||!['weapon','shield','armor','other'].includes(x.snapshot.category)||!Number.isSafeInteger(x.quantity)||x.quantity<1||x.quantity>999999||(x.slot!==undefined&&!SLOTS.some(s=>s[0]===x.slot)))||d.journal.some(x=>!ids.has(x.characterId)||typeof x.body!=='string'))throw Error('Záloha obsahuje osiřelé nebo poškozené záznamy');
 for(const x of d.inventory){if(x.sourceItemId!==undefined&&x.sourceItemId!==null&&typeof x.sourceItemId!=='string')throw Error('Neplatný odkaz na knihovnu');if(x.condition!==undefined&&typeof x.condition!=='string')throw Error('Neplatný stav předmětu');if(x.currentWQ!==undefined&&x.currentWQ!==null&&(!Number.isSafeInteger(x.currentWQ)||x.currentWQ<0||x.currentWQ>999))throw Error('Neplatná aktuální kvalita WQ předmětu');if(x.slot!==undefined&&!validSlotForCategory(x.slot,x.snapshot.category))throw Error('Neplatná kombinace slotu a kategorie předmětu');if(['main_hand','off_hand','worn'].includes(x.slot)&&x.quantity!==1)throw Error('Vybavený předmět musí představovat právě jeden kus')}
 for(const j of d.journal){if(j.title!==undefined&&typeof j.title!=='string')throw Error('Neplatný nadpis deníku');if(typeof j.createdAt!=='string')throw Error('Chybí datum deníku')}
 for(const c of ids){for(const slot of ['main_hand','off_hand']){if(d.inventory.filter(x=>x.characterId===c&&x.slot===slot).length>1)throw Error('Více předmětů v jednom slotu ruky')}}
 return d
}
function save(){if(storageReadOnly){notice='Zápis je zablokován: původní úložiště se nepodařilo načíst.';return false}try{const current=localStorage.getItem(STORAGE);if(current!==storageBaseline){storageReadOnly=true;notice='Data byla změněna v jiné záložce nebo okně. Zápis je zablokován; obnovte stránku, aby se načetla aktuální verze.';return false}const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;notice='';return true}catch(e){notice='Uložení selhalo (kapacita nebo oprávnění prohlížeče). Ihned exportujte zálohu.';console.error(e);return false}}
window.addEventListener('storage',event=>{if(event.key===STORAGE&&event.newValue!==storageBaseline){storageReadOnly=true;notice='Data se změnila v jiné záložce. Zápisy jsou zablokovány, obnovte stránku.';render()}});
function mutate(fn){
 if(storageReadOnly){alert('Zápis zablokován kvůli chybě původních dat. Nejdříve je bezpečně obnovte.');return false}
 const previous=structuredClone(data);
 try {fn();validate(data);if(!save()){data=previous;render();alert('Uložení selhalo. Změna nebyla provedena. Exportujte zálohu.');return false}render();return true}
 catch(e){data=previous;render();alert('Změna nebyla uložena: '+e.message);return false}
}
function button(label,action,cls='secondary'){return `<button class="${cls}" data-action="${action}">${esc(label)}</button>`}
function field(name,label,value='',type='text'){return `<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}"></label>`}
function area(name,label,value=''){return `<label>${esc(label)}<textarea name="${name}">${esc(value)}</textarea></label>`}
function character(id){return data.characters.find(c=>c.id===id)}
function item(id){return data.items.find(i=>i.id===id)}
function main(){let body='';if(view==='characters')body=charactersView();if(view==='sheet')body=sheetView();if(view==='library')body=libraryView();if(view==='trash')body=trashView();if(view==='backup')body=backupView();if(view==='encounter')body=encounterView();return `<div class="shell"><header class="mast"><div class="eyebrow">HÂRNMASTER · GAME MASTER CONSOLE</div><h1>The Keeper's Ledger <span class="app-version" aria-label="Verze aplikace">v${APP_VERSION}</span></h1><p>Registr postav · osobní deníky · knihovna vybavení</p></header><div class="layout"><nav class="nav" aria-label="Hlavní navigace">${[['characters','⚜ Postavy'],['library','⚔ Knihovna'],['trash','♻ Archiv'],['backup','▣ Zálohy'],['encounter','⚔ Příprava boje']].map(([v,l])=>`<button class="${view===v?'':'secondary'}" data-nav="${v}">${l}</button>`).join('')}</nav><main class="content">${notice?`<div class="notice error">${esc(notice)}</div>`:''}${body}</main></div><footer class="footer">HMK UI v${APP_VERSION} · evidenční režim · pravidlové výpočty nejsou připojeny</footer></div>`}
function charactersView(){const list=data.characters.filter(c=>(c.name+' '+c.occupation+' '+c.kind).toLowerCase().includes(query.toLowerCase()));return `<div class="topline"><h2>Registr postav (${data.characters.length})</h2>${button('+ Nová postava','new-character')}</div><div class="toolbar"><input id="search" placeholder="Hledat postavu…" value="${esc(query)}"></div>${list.length?`<div class="cards">${list.map(c=>`<article class="card character-card"><button type="button" class="character-delete" data-delete-character="${esc(c.id)}" aria-label="Smazat postavu ${esc(c.name)}" title="Smazat postavu ${esc(c.name)}">×</button><span class="pill">${esc(c.kind)}</span><h3>${esc(c.name)}</h3><div class="muted">${esc(c.occupation||'Bez povolání')}</div><div class="muted">${esc(c.description||'')}</div><div class="actions"><button data-open="${esc(c.id)}">Otevřít deník</button><button class="secondary" data-copy="${esc(c.id)}">Kopírovat</button><button class="secondary" data-export-character="${esc(c.id)}">Záloha postavy</button><button class="danger" data-archive="${esc(c.id)}">Archivovat</button></div></article>`).join('')}</div>`:'<div class="empty">Žádné odpovídající postavy.</div>'}`}
function sheetView(){const c=character(selected);if(!c){view='characters';return charactersView()}const inv=data.inventory.filter(x=>x.characterId===c.id);const logs=data.journal.filter(x=>x.characterId===c.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return `<div class="topline"><h2>Osobní deník: ${esc(c.name)}</h2>${button('← Registr','go-characters')}${button('Export HMK profilu','export-kernel-character')}</div><div class="columns"><section class="panel"><h3>Identita</h3><form id="character-form">${field('name','Jméno',c.name)}${field('occupation','Povolání',c.occupation)}<label>Typ<select name="kind"><option ${c.kind==='PC'?'selected':''}>PC</option><option ${c.kind==='NPC'?'selected':''}>NPC</option></select></label>${field('portrait','URL portrétu (nepovinné)',c.portrait)}${area('description','Popis a historie',c.description)}<div class="actions"><button type="submit">Uložit postavu</button></div></form></section><section class="panel"><h3>Vybavení postavy</h3><div class="equipment-summary">${[['main_hand','Hlavní ruka'],['off_hand','Vedlejší ruka'],['worn','Nasazená zbroj']].map(([slot,label])=>`<div><strong>${label}</strong><span>${esc(inv.filter(x=>x.slot===slot).map(x=>x.snapshot.name).join(', ')||'—')}</span></div>`).join('')}</div>${inv.length?inv.map(x=>`<div class="list-row"><div><b>${esc(x.snapshot.name)}</b><div class="muted">${esc(x.snapshot.category)} · ${esc(x.condition||'Bez stavu')} · ${esc(x.quantity)} ks · ${esc(slotLabel(x.slot))}${x.currentWQ!==undefined&&x.currentWQ!==null?' · WQ '+esc(x.currentWQ):''}</div></div><div class="actions"><button class="secondary" data-edit-inv="${esc(x.id)}">Upravit</button><button class="danger" data-remove-inv="${esc(x.id)}">Odebrat</button></div></div>`).join(''):'<p class="muted">Zatím bez vybavení.</p>'}<form id="add-inventory"><label>Předmět z knihovny<select name="itemId" required><option value="">Vyberte…</option>${data.items.map(i=>`<option value="${esc(i.id)}">${esc(i.name)} (${esc(i.category)})</option>`).join('')}</select></label>${field('quantity','Počet',1,'number')}${field('condition','Stav / poznámka','')}${field('currentWQ','Aktuální WQ kusu (nepovinné)','', 'number')}${slotSelect('slot','none')}<button type="submit" ${data.items.length?'':'disabled'}>Přiřadit předmět</button></form><div class="notice tiny">Při přiřazení vzniká samostatná kopie parametrů. Úprava knihovny nezmění již přidělené předměty.</div></section>${hmkSheet(c)}${readinessPanel(c)}<section class="panel wide"><h3>Osobní zápisník</h3><form id="journal-form">${field('title','Nadpis záznamu')}${area('body','Zápis')}<button type="submit">Přidat záznam</button></form>${logs.map(l=>`<div class="list-row"><div><b>${esc(l.title)}</b><div class="muted">${esc(new Date(l.createdAt).toLocaleString('cs-CZ'))}</div><p>${esc(l.body).replace(/\n/g,'<br>')}</p></div><div class="actions"><button class="secondary" data-edit-log="${esc(l.id)}">Upravit</button><button class="danger" data-delete-log="${esc(l.id)}">Smazat</button></div></div>`).join('')}</section></div>`}
// Advisory-only catalog audit. Missing data are never silently fabricated or written to storage.
function catalogAuditEntry(i){
 const p=i.properties||{}, missing=[];
 if(!String(i.source||'').trim())missing.push('Zdroj pravidel');
 if(i.category==='weapon'){
  if(!verifiedModes(p).length)missing.push('Strukturované bojové režimy');
  if(asNumber(p.quality)==null)missing.push('Základní WQ');
 }else if(i.category==='shield'){
  if(asNumber(p.quality)==null)missing.push('Základní WQ');
 }else if(i.category==='armor'){
  if(!Object.keys(validatedProtection(p.locationProtection)).length)missing.push('Ochrana anatomických lokací');
 }
 return {id:i.id,name:i.name,category:i.category,source:i.source||null,missing,ready:missing.length===0};
}
function catalogAuditReport(){const entries=data.items.map(catalogAuditEntry);return {format:'hmk-catalog-readiness-v1',appVersion:APP_VERSION,generatedAt:stamp(),note:'Pouze kontrola úplnosti evidence, nikoliv pravidlové správnosti HMK.',total:entries.length,ready:entries.filter(x=>x.ready).length,missing:entries.filter(x=>!x.ready).length,entries};}
function catalogAuditPanel(){const report=catalogAuditReport();const counts=['weapon','shield','armor','other'].map(cat=>{const a=report.entries.filter(x=>x.category===cat);return {cat,total:a.length,ready:a.filter(x=>x.ready).length}});return `<section class="panel catalog-audit"><h3>Audit úplnosti katalogu</h3><p class="muted">Kontroluje pouze přítomnost strukturovaných údajů a zdrojů. Neověřuje jejich správnost proti PDF HMK.</p><div class="equipment-summary"><div><strong>Celkem položek</strong><span>${report.total}</span></div><div><strong>Bez evidenčních upozornění</strong><span>${report.ready}</span></div><div><strong>K doplnění</strong><span>${report.missing}</span></div></div><div class="catalog-audit-grid">${counts.map(x=>`<div><b>${esc(({weapon:'Zbraně',shield:'Štíty',armor:'Zbroje',other:'Ostatní'})[x.cat])}</b><span>${x.ready} / ${x.total}</span></div>`).join('')}</div><div class="actions">${button('Stáhnout audit katalogu JSON','export-catalog-audit')}</div></section>`;}
// Read-only provenance audit: library edits never silently overwrite owned item snapshots.
function inventoryProvenanceReport(){
 const catalog=new Map(data.items.map(i=>[i.id,i]));
 const people=new Map([...data.characters,...data.trash].map(c=>[c.id,c.name]));
 const entries=data.inventory.map(x=>{
  const original=x.sourceItemId?catalog.get(x.sourceItemId):null;
  const issues=[];
  if(!people.has(x.characterId))issues.push('Chybí vlastník');
  if(!x.sourceItemId)issues.push('Bez odkazu na knihovnu');
  else if(!original)issues.push('Původní definice byla odstraněna');
  else if(original.category!==x.snapshot.category)issues.push('Kategorie se liší od knihovny');
  else if(original.name!==x.snapshot.name||JSON.stringify(original.properties)!==JSON.stringify(x.snapshot.properties))issues.push('Knihovna a kopie se liší');
  return {inventoryId:x.id,characterId:x.characterId,characterName:people.get(x.characterId)||null,
   itemName:x.snapshot.name,sourceItemId:x.sourceItemId||null,issues};
 });
 return {format:'hmk-inventory-provenance-v1',appVersion:APP_VERSION,generatedAt:stamp(),
  note:'Pouze informační audit. Rozdíl oproti knihovně může být záměrný; žádné kopie nejsou automaticky přepsány.',
  total:entries.length,flagged:entries.filter(x=>x.issues.length).length,entries};
}
function inventoryProvenancePanel(){const r=inventoryProvenanceReport();const flagged=r.entries.filter(x=>x.issues.length);
 return `<section class="panel"><h3>Kontrola původu inventáře</h3><p class="muted">Porovnává samostatné kopie předmětů s aktuální knihovnou. Rozdíly mohou být záměrné a nejsou automaticky opravovány.</p><div class="equipment-summary"><div><strong>Inventární záznamy</strong><span>${r.total}</span></div><div><strong>K prověření</strong><span>${r.flagged}</span></div></div>${flagged.length?`<details><summary>Zobrazit upozornění (${flagged.length})</summary>${flagged.slice(0,50).map(x=>`<p class="tiny"><strong>${esc(x.characterName||'Neznámá postava')} · ${esc(x.itemName)}</strong>: ${esc(x.issues.join(', '))}</p>`).join('')}${flagged.length>50?'<p class="muted">Další upozornění jsou v JSON reportu.</p>':''}</details>`:'<p class="muted">Bez upozornění na původ inventáře.</p>'}<div class="actions">${button('Stáhnout kontrolu inventáře JSON','export-inventory-audit')}</div></section>`;
}
function libraryView(){
 const auditById=new Map(data.items.map(i=>[i.id,catalogAuditEntry(i)]));
 const filtered=data.items.filter(i=>(category==='all'||i.category===category)&&
  (i.name+' '+i.description+' '+(i.source||'')).toLocaleLowerCase('cs').includes(query.toLocaleLowerCase('cs'))&&
  (catalogStatus==='all'||(catalogStatus==='missing'?!auditById.get(i.id).ready:auditById.get(i.id).ready)))
  .sort((a,b)=>a.name.localeCompare(b.name,'cs'));
 return `<div class="topline"><h2>Knihovna vybavení</h2>${button('+ Nový předmět','new-item')}</div>
 <div class="toolbar catalog-filters"><label>Kategorie<select id="category"><option value="all" ${category==='all'?'selected':''}>Všechny kategorie</option>${[['weapon','Zbraně'],['shield','Štíty'],['armor','Zbroje'],['other','Ostatní předměty']].map(([k,v])=>`<option value="${k}" ${category===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Úplnost evidence<select id="catalog-status"><option value="all" ${catalogStatus==='all'?'selected':''}>Všechny položky</option><option value="missing" ${catalogStatus==='missing'?'selected':''}>Vyžadují doplnění</option><option value="ready" ${catalogStatus==='ready'?'selected':''}>Bez upozornění</option></select></label><label>Hledat<input id="search" placeholder="Název, popis nebo zdroj…" value="${esc(query)}"></label></div>
 <div class="actions"><button class="secondary" data-action="export-catalog">Exportovat katalog JSON</button><label>Importovat katalog (přidat nové položky)<input type="file" id="import-catalog-file" accept=".json,application/json"></label></div>${catalogAuditPanel()}
 <div class="notice">Audit ověřuje pouze úplnost zadaných údajů, nikoli jejich pravidlovou správnost. Při importu se existující definice ani inventáře nepřepisují.</div>
 <p class="muted">Zobrazeno ${filtered.length} z ${data.items.length} položek.</p>
 ${filtered.length?`<div class="cards">${filtered.map(i=>{const audit=auditById.get(i.id);return `<article class="card"><h3>${esc(i.name)}</h3><p class="muted">${esc(i.description||'Bez popisu')}</p><p class="tiny">Zdroj: ${esc(i.source||'neuveden')}</p><p class="catalog-readiness ${audit.ready?'catalog-ready':'catalog-missing'}">${audit.ready?'Evidence bez upozornění':'Chybí: '+esc(audit.missing.join(' · '))}</p><div class="actions"><button data-edit-item="${esc(i.id)}">Upravit</button><button class="secondary" data-copy-item="${esc(i.id)}">Kopírovat</button><button class="danger" data-delete-item="${esc(i.id)}">Odstranit</button></div></article>`}).join('')}</div>`:'<div class="empty">Žádné položky neodpovídají filtru.</div>'}`;
}
function trashView(){return `<h2>Archiv postav</h2><p class="muted">Archivace postavu skryje z registru, ale zachová její deník a vybavení.</p>${data.trash.length?data.trash.map(c=>`<div class="panel list-row"><div><b>${esc(c.name)}</b><div class="muted">${esc(c.occupation)}</div></div><div class="actions"><button data-restore="${esc(c.id)}">Obnovit</button><button class="secondary" data-export-character="${esc(c.id)}">Záloha postavy</button><button class="danger" data-purge="${esc(c.id)}">Definitivně smazat</button></div></div>`).join(''):'<div class="empty">Archiv je prázdný.</div>'}`}
function readinessReport(c){
 const issues=[];const h=c.hmk||{};const attrs=h.attributes||{};
 const required=[...HMK_ATTRIBUTES.PHYSICAL,...HMK_ATTRIBUTES.MENTAL];
 const missing=required.filter(([k])=>!Number.isSafeInteger(attrs[k]));
 if(missing.length)issues.push('Nezadané charakteristiky: '+missing.map(([,name])=>name).join(', '));
 if(!(h.skills||[]).length)issues.push('Postava nemá evidované dovednosti.');
 for(const sk of h.skills||[])if(!Number.isSafeInteger(sk.ml))issues.push('Dovednost '+sk.name+' nemá zadané ML.');
 const inv=data.inventory.filter(x=>x.characterId===c.id);
 if(!inv.some(x=>x.slot==='main_hand'||x.slot==='off_hand'))issues.push('Není evidována žádná výzbroj v rukou.');
 for(const x of inv){const p=x.snapshot.properties||{};
  if(x.snapshot.category==='weapon'&&!verifiedModes(p).length)issues.push('Zbraň '+x.snapshot.name+' nemá ověřené bojové režimy.');
  if(['weapon','shield'].includes(x.snapshot.category)&&x.currentWQ==null&&asNumber(p.quality)==null)issues.push('Předmět '+x.snapshot.name+' nemá zadanou WQ.');
  if(x.snapshot.category==='armor'&&!Object.keys(validatedProtection(p.locationProtection)).length)issues.push('Zbroj '+x.snapshot.name+' nemá ověřené ochrany anatomických lokací.');
 }
 return issues;
}
function readinessPanel(c){const issues=readinessReport(c);return `<section class="panel wide"><h3>Kontrola připravenosti HMK dat</h3><p class="muted">Diagnostika úplnosti evidence, nikoli potvrzení pravidlové správnosti ani bojový výpočet.</p>${issues.length?`<p><strong>${issues.length} položek k doplnění</strong></p><ul class="audit-list">${issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<div class="notice">Evidenční kontrola bez upozornění. Správnost hodnot vůči pravidlům HMK musí být ještě ověřena.</div>'}</section>`}
function diagnosticReport(){
 const entries=[...data.characters,...data.trash].map(c=>({id:c.id,name:c.name,archived:data.trash.some(x=>x.id===c.id),issues:readinessReport(c)}));
 const referenced=new Set([...data.characters,...data.trash].map(c=>c.id));
 const anomalies=[];
 for(const x of data.inventory){if(!referenced.has(x.characterId))anomalies.push('Inventář bez postavy: '+x.id);if(x.sourceItemId&&!data.items.some(i=>i.id===x.sourceItemId))anomalies.push('Inventární kopie bez původní položky knihovny: '+x.id+' (může jít o záměrné odstranění z knihovny)')}
 for(const x of data.journal)if(!referenced.has(x.characterId))anomalies.push('Deník bez postavy: '+x.id);
 return {reportVersion:1,createdAt:stamp(),schemaVersion:data.schemaVersion,storageReadOnly,counts:{characters:data.characters.length,archived:data.trash.length,items:data.items.length,inventory:data.inventory.length,journal:data.journal.length},characters:entries,anomalies};
}
// Portable character package. Independent of the global backup and HMK domain export.
function characterPackage(id){
 const c=[...data.characters,...data.trash].find(x=>x.id===id);
 if(!c)throw Error('Postava nebyla nalezena');
 return {format:'hmk-character-package-v1',schemaVersion:1,exportedAt:stamp(),character:structuredClone(c),archived:data.trash.some(x=>x.id===id),inventory:structuredClone(data.inventory.filter(x=>x.characterId===id)),journal:structuredClone(data.journal.filter(x=>x.characterId===id))};
}
function importCharacterPackage(pkg){
 if(!pkg||pkg.format!=='hmk-character-package-v1'||pkg.schemaVersion!==1||!pkg.character||!Array.isArray(pkg.inventory)||!Array.isArray(pkg.journal)||typeof pkg.archived!=='boolean')throw Error('Neplatný formát zálohy postavy');
 // Validate the original package using the same rules as a full Ledger backup.
 validate({...clean(),characters:[pkg.character],inventory:pkg.inventory,journal:pkg.journal});
 if(pkg.inventory.length>10000||pkg.journal.length>10000)throw Error('Příliš mnoho záznamů v balíčku');
 const id=uuid();const copy=structuredClone(pkg.character);copy.id=id;
 if(copy.hmk){for(const key of ['skills','injuries'])if(Array.isArray(copy.hmk[key]))copy.hmk[key]=copy.hmk[key].map(x=>({...x,id:uuid()}));}
 const inventory=pkg.inventory.map(x=>({...structuredClone(x),id:uuid(),characterId:id}));
 const journal=pkg.journal.map(x=>({...structuredClone(x),id:uuid(),characterId:id}));
 return {copy,inventory,journal,archived:pkg.archived};
}
function downloadRawStorage(){
 let raw;try{raw=localStorage.getItem(STORAGE)}catch(e){alert('Prohlížeč nedovolil přečíst původní data: '+e.message);return}
 if(raw===null){alert('V tomto prohlížeči není původní záznam.');return}
 const blob=new Blob([raw],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='hmk-raw-emergency-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function backupView(){const summary={characters:data.characters.length,archived:data.trash.length,items:data.items.length,inventory:data.inventory.length,journal:data.journal.length};return `<h2>Zálohy a obnova</h2>${!storageReadOnly?inventoryProvenancePanel():''}${storageReadOnly?'<div class="notice error">Načtení úložiště selhalo. Standardní záloha je zablokována; nejdříve stáhněte nouzovou kopii původních dat.</div>':''}<div class="panel"><div class="equipment-summary"><strong>Kontrola místních záznamů</strong><div>Aktivní postavy: ${summary.characters} · archiv: ${summary.archived}</div><div>Položky knihovny: ${summary.items} · inventář: ${summary.inventory} · deník: ${summary.journal}</div><div>Stav zápisu: ${storageReadOnly?'ZABLOKOVÁN':'Připraven'}</div></div><p><strong>Datový formát:</strong> v1 (kompatibilní se staršími verzemi). Umístění vybavení je nepovinné pole; staré položky se zobrazí jako nezařazené.</p><p>Data se ukládají lokálně v tomto prohlížeči (localStorage). Pokud jsou otevřené dvě záložky, změna v druhé záložce zablokuje zápis, aby nedošlo k přepsání dat. Pro přenos mezi zařízeními je nutné exportovat a importovat JSON. Režim anonymního prohlížení, vymazání dat webu nebo změna zařízení mohou záznamy odstranit; pravidelně zálohujte.</p><div class="actions">${button('Stáhnout JSON zálohu','export')}${button('Export doménových dat HMK','export-kernel-all')}${button('Stáhnout diagnostiku','export-diagnostic')}${button('Nouzová kopie původního úložiště','export-raw')}<label>Importovat JSON zálohu<input type="file" id="import-file" accept=".json,application/json"></label><label>Přidat jednu postavu ze zálohy<input type="file" id="import-character-file" accept=".json,application/json"></label></div><div class="notice error">Import nahradí aktuální lokální data. Před importem si stáhněte zálohu.</div></div>`}
// Encounter preparation is deliberately non-destructive: no changes to character records or rules kernel.
function selectedEncounterCharacters(){return data.characters.filter(c=>encounterSelection.has(c.id))}
function encounterPayload(){
 const chars=selectedEncounterCharacters();
 if(!chars.length)throw Error('Vyberte alespoň jednu postavu.');
 const ids=new Set(chars.map(c=>c.id));
 const bridge=kernelExport(chars);
 return {format:'hmk-encounter-preparation-v1',exportedAt:stamp(),rulesCalculated:false,
  combatants:chars.map(c=>({characterId:c.id,name:c.name,kind:c.kind||'PC',
   readinessIssues:readinessReport(c),
   equipment:structuredClone(data.inventory.filter(x=>x.characterId===c.id)),
   recordedInjuries:structuredClone(c.hmk?.injuries||[])})),
  domainBridge:bridge,
  warnings:['Jde o evidenční podklady, nikoliv o výsledek bojového resolveru.',...bridge.warnings]};
}
function encounterView(){
 const chars=data.characters;
 const selectedChars=selectedEncounterCharacters();
 const count=selectedChars.length;
 const issues=selectedChars.reduce((sum,c)=>sum+readinessReport(c).length,0);
 return `<div class="topline"><h2>Příprava bojového střetnutí</h2></div>
 <div class="notice">Tato obrazovka připravuje výběr účastníků a jejich evidované HMK údaje. Neprovádí hody, útoky, obranu ani výpočty zranění. Výběr se obnoví po obnovení stránky v této záložce; neukládá se do databáze postav ani do exportu zálohy.</div>
 <section class="panel"><h3>Účastníci (${count})</h3>
 ${chars.length?`<div class="encounter-roster">${chars.map(c=>{const warnings=readinessReport(c);return `<label class="encounter-entry"><input type="checkbox" data-encounter-character="${esc(c.id)}" ${encounterSelection.has(c.id)?'checked':''}><span><strong>${esc(c.name)}</strong><small>${esc(c.kind||'PC')} · ${warnings.length?warnings.length+' upozornění k údajům':'bez upozornění k úplnosti údajů'}</small></span></label>`}).join('')}</div>`:'<p class="muted">Nejprve vytvořte postavy v registru.</p>'}
 <div class="equipment-summary"><div><strong>Vybráno</strong><span>${count} postav</span></div><div><strong>Chybějící evidenční údaje</strong><span>${issues} upozornění</span></div></div>
 <div class="actions"><button type="button" data-action="encounter-all" ${chars.length?'':'disabled'}>Vybrat všechny</button><button type="button" class="secondary" data-action="encounter-clear" ${count?'':'disabled'}>Zrušit výběr</button><button type="button" data-action="encounter-export" ${count?'':'disabled'}>Exportovat podklady JSON</button></div></section>
 ${selectedChars.length?`<section class="panel"><h3>Kontrola účastníků</h3>${selectedChars.map(c=>{const warnings=readinessReport(c);return `<details class="encounter-details"><summary>${esc(c.name)} · ${warnings.length} upozornění</summary>${warnings.length?`<ul class="audit-list">${warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="muted">Evidenční kontrola bez upozornění; pravidlová správnost není potvrzena.</p>'}</details>`}).join('')}</section>`:''}`;
}
function editor(title,obj,kind){return `<div class="panel"><h2>${esc(title)}</h2><form id="${kind}-editor">${field('name','Název / jméno',obj.name||'')}${kind==='character'?`${field('occupation','Povolání',obj.occupation||'')}<label>Typ<select name="kind"><option>PC</option><option>NPC</option></select></label>${area('description','Popis',obj.description||'')}`:`<label>Kategorie<select name="category">${[['weapon','Zbraň'],['shield','Štít'],['armor','Zbroj'],['other','Ostatní předmět']].map(([v,l])=>`<option value="${v}" ${obj.category===v?'selected':''}>${l}</option>`).join('')}</select></label>${area('description','Popis',obj.description||'')}${field('source','Odkaz na zdroj (např. kapitola/strana)',obj.source||'')}${area('properties','Vlastní parametry JSON',JSON.stringify(obj.properties||{},null,2))}`}<div class="actions"><button type="submit">Uložit</button>${button('Zrušit','cancel-editor')}</div></form></div>`}
let overlay=null;
function render(){document.getElementById('app').innerHTML=main()+(overlay||'');}
function ask(msg){return window.confirm(msg)}

document.addEventListener('click',e=>{const t=e.target.closest('[data-action],[data-nav],[data-open],[data-copy],[data-archive],[data-remove-inv],[data-delete-log],[data-edit-item],[data-copy-item],[data-delete-item],[data-restore],[data-purge],[data-delete-character],[data-export-character]');if(!t)return;
if(t.dataset.exportCharacter){if(storageReadOnly)return alert('Nečitelná data: použijte nouzovou zálohu.');try{const pkg=characterPackage(t.dataset.exportCharacter);downloadJSON(pkg,'hmk-postava-'+safeFilename(pkg.character.name)+'.json')}catch(err){alert(err.message)}return}
if(t.dataset.action==='encounter-all'){encounterSelection=new Set(data.characters.map(c=>c.id));persistEncounterDraft();render();return}
if(t.dataset.action==='encounter-clear'){encounterSelection.clear();persistEncounterDraft();render();return}
if(t.dataset.action==='encounter-export'){try{downloadJSON(encounterPayload(),'hmk-encounter-preparation.json')}catch(err){alert(err.message)}return}
if(t.dataset.action==='export-inventory-audit'){if(storageReadOnly)return alert('Nečitelná data: audit inventáře není dostupný.');downloadJSON(inventoryProvenanceReport(),'hmk-audit-inventare-v26.json');return}
if(t.dataset.action==='export-catalog-audit'){if(storageReadOnly)return alert('Nečitelná data: audit katalogu není dostupný.');downloadJSON(catalogAuditReport(),'hmk-audit-katalogu-v25.json');return}
if(t.dataset.action==='export-catalog'){if(storageReadOnly)return alert('Nečitelná data: export katalogu není dostupný.');downloadJSON({format:'hmk-equipment-catalog-v1',exportedAt:stamp(),items:structuredClone(data.items)},'hmk-katalog-vybaveni.json');return}
if(t.dataset.action==='export-diagnostic'){downloadJSON(diagnosticReport(),'hmk-diagnostic-'+new Date().toISOString().slice(0,10)+'.json');return}
if(t.dataset.action==='export-raw'){downloadRawStorage();return}
if(t.dataset.action==='export-kernel-character'){const c=character(selected);if(c)downloadJSON(kernelExport([c]),'hmk-character-'+safeFilename(c.name)+'.json');return}
if(t.dataset.action==='export-kernel-all'){downloadJSON(kernelExport(data.characters),'hmk-domain-export.json');return}
if(t.dataset.nav){view=t.dataset.nav;query='';overlay=null;render();return}if(t.dataset.open){selected=t.dataset.open;view='sheet';overlay=null;render();return}
if(t.dataset.copy){const c=character(t.dataset.copy);mutate(()=>{const id=uuid();const copy={...structuredClone(c),id,name:c.name+' (kopie)'};if(copy.hmk){copy.hmk.skills=(copy.hmk.skills||[]).map(s=>({...s,id:uuid()}));copy.hmk.injuries=(copy.hmk.injuries||[]).map(i=>({...i,id:uuid()}))}data.characters.push(copy);for(const x of data.inventory.filter(x=>x.characterId===c.id))data.inventory.push({...structuredClone(x),id:uuid(),characterId:id});for(const x of data.journal.filter(x=>x.characterId===c.id))data.journal.push({...structuredClone(x),id:uuid(),characterId:id});});return}
if(t.dataset.deleteCharacter){
 const c=character(t.dataset.deleteCharacter);
 if(!c)return;
 if(!ask(`Opravdu si přejete DEFINITIVNĚ smazat postavu „${c.name}“?\n\nSpolu s postavou se smaže její osobní deník, inventář a všechny uložené údaje. Akci nelze vrátit.\n\nPokračovat?`))return;
 const id=c.id;
 mutate(()=>{
  data.characters=data.characters.filter(x=>x.id!==id);
  data.inventory=data.inventory.filter(x=>x.characterId!==id);
  data.journal=data.journal.filter(x=>x.characterId!==id);
  if(selected===id){selected=null;view='characters';overlay=null}
 });
 return;
}
if(t.dataset.archive){const c=character(t.dataset.archive);if(ask(`Archivovat postavu ${c.name}?`))mutate(()=>{data.characters=data.characters.filter(x=>x.id!==c.id);data.trash.push(c)});return}
if(t.dataset.restore){mutate(()=>{const c=data.trash.find(x=>x.id===t.dataset.restore);data.trash=data.trash.filter(x=>x.id!==c.id);data.characters.push(c)});return}
if(t.dataset.purge){if(ask('DEFINITIVNĚ odstranit postavu, její deník a inventář? Tuto akci nelze vrátit.'))mutate(()=>{const id=t.dataset.purge;data.trash=data.trash.filter(x=>x.id!==id);data.inventory=data.inventory.filter(x=>x.characterId!==id);data.journal=data.journal.filter(x=>x.characterId!==id)});return}
if(t.dataset.removeInv){if(ask('Odebrat předmět z inventáře?'))mutate(()=>data.inventory=data.inventory.filter(x=>x.id!==t.dataset.removeInv));return}
if(t.dataset.deleteLog){if(ask('Smazat zápis?'))mutate(()=>data.journal=data.journal.filter(x=>x.id!==t.dataset.deleteLog));return}
if(t.dataset.editItem){editItem=t.dataset.editItem;const i=item(editItem);overlay=equipmentEditor('Upravit předmět',i);render();return}
if(t.dataset.copyItem){const i=item(t.dataset.copyItem);mutate(()=>data.items.push({...structuredClone(i),id:uuid(),name:i.name+' (kopie)'}));return}
if(t.dataset.deleteItem){if(ask('Odstranit předmět z knihovny? Existující inventáře zůstanou beze změny.'))mutate(()=>data.items=data.items.filter(x=>x.id!==t.dataset.deleteItem));return}
const a=t.dataset.action;if(a==='new-character'){overlay=editor('Nová postava',{},'character');render()}if(a==='new-item'){editItem=null;overlay=equipmentEditor('Nový předmět',{category});render()}if(a==='cancel-editor'){overlay=null;render()}if(a==='go-characters'){view='characters';query='';render()}if(a==='export'){if(storageReadOnly){alert('Původní data se nepodařilo načíst. Použijte nouzovou kopii původního úložiště, nikoliv standardní zálohu.');return}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`hmk-ledger-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
});
document.addEventListener('submit',e=>{const f=e.target;if(!['character-editor','item-editor','character-form','add-inventory','journal-form'].includes(f.id))return;e.preventDefault();const v=Object.fromEntries(new FormData(f));if(f.id==='character-editor'){if(!v.name.trim())return alert('Zadejte jméno');if(mutate(()=>data.characters.push({id:uuid(),name:v.name.trim(),occupation:v.occupation||'',kind:v.kind,description:v.description||'',portrait:''}))) {overlay=null;render()}return}if(f.id==='character-form'){if(!v.name.trim())return alert('Zadejte jméno');mutate(()=>Object.assign(character(selected),{name:v.name.trim(),occupation:v.occupation,kind:v.kind,description:v.description,portrait:v.portrait}));return}if(f.id==='item-editor'){if(!v.name.trim())return alert('Zadejte název');let properties;try{properties=JSON.parse(v.properties||'{}');if(!properties||Array.isArray(properties)||typeof properties!=='object')throw Error()}catch{return alert('Parametry musí být platný JSON objekt')}if(mutate(()=>{const record={id:editItem||uuid(),name:v.name.trim(),category:v.category,description:v.description||'',source:v.source||'',properties};if(editItem)Object.assign(item(editItem),record);else data.items.push(record)})){overlay=null;render()}return}if(f.id==='add-inventory'){const i=item(v.itemId);const quantity=Number(v.quantity);if(!i||!Number.isSafeInteger(quantity)||quantity<1||quantity>999999)return alert('Vyberte předmět a platný počet');if(!validSlotForCategory(v.slot,i.category))return alert('Tento slot neodpovídá kategorii předmětu');if(['main_hand','off_hand','worn'].includes(v.slot)&&quantity!==1)return alert('Vybavený předmět musí představovat jeden kus. Další kusy evidujte samostatně jako nesené.');if(!handSlotAvailable(selected,v.slot))return alert('Ruka je již obsazena. Nejprve přesuňte stávající předmět.');const currentWQ=v.currentWQ===''?null:Number(v.currentWQ);if(currentWQ!==null&&(!Number.isSafeInteger(currentWQ)||currentWQ<0||currentWQ>999))return alert('Neplatná aktuální WQ');mutate(()=>data.inventory.push({id:uuid(),currentWQ,characterId:selected,sourceItemId:i.id,snapshot:structuredClone(i),quantity,condition:v.condition||'',slot:v.slot||'none'}));return}if(f.id==='journal-form'){if(!v.title.trim()&&!v.body.trim())return;mutate(()=>data.journal.push({id:uuid(),characterId:selected,title:v.title.trim()||'Bez názvu',body:v.body,createdAt:stamp()}))}});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;const pos=e.target.selectionStart;render();const input=document.getElementById('search');input.focus();input.setSelectionRange(pos,pos)}});
document.addEventListener('change',async e=>{if(e.target.id==='category'){category=e.target.value;render()}if(e.target.id==='catalog-status'){catalogStatus=e.target.value;render()}if(e.target.id==='import-character-file'){
 const f=e.target.files?.[0];if(!f)return;
 try{if(f.size>10*1024*1024)throw Error('Soubor přesahuje 10 MB');if(storageReadOnly)throw Error('Zápis je zablokován');const baselineBeforeImport=storageBaseline;const pkg=JSON.parse(await f.text());if(localStorage.getItem(STORAGE)!==baselineBeforeImport)throw Error('Data se mezitím změnila v jiné záložce. Obnovte stránku.');const incoming=importCharacterPackage(pkg);
 if(!ask(`Přidat postavu „${incoming.copy.name}“? Stávající postavy zůstanou zachovány. Importovaná postava dostane nové identifikátory.`))return;
 if(mutate(()=>{(incoming.archived?data.trash:data.characters).push(incoming.copy);data.inventory.push(...incoming.inventory);data.journal.push(...incoming.journal)})){view='characters';selected=null;notice='Postava byla přidána ze zálohy.';render()}
 }catch(err){alert('Import postavy selhal: '+err.message)}finally{e.target.value=''}return;
 }
 if(e.target.id==='import-catalog-file'){
  const file=e.target.files?.[0];if(!file)return;
  try{
   if(storageReadOnly)throw Error('Úložiště je pouze pro čtení');
   if(file.size>10*1024*1024)throw Error('Katalog přesahuje 10 MB');
   const baseline=storageBaseline;
   const incoming=JSON.parse(await file.text());
   const pending=prepareCatalogImport(incoming,data.items);
   const collisions=catalogNameConflicts(pending,data.items);
   if(localStorage.getItem(STORAGE)!==baseline)throw Error('Data se mezitím změnila v jiné záložce. Obnovte stránku.');
   if(!pending.length){alert('Všechny položky katalogu již existují. Nebylo nic změněno.');return}
   if(!ask(`Přidat ${pending.length} nových položek do knihovny?${collisions.length?'\n\nPOZOR: '+collisions.length+' nových definic má stejný název a kategorii jako existující položka, ale odlišné parametry. Budou přidány jako samostatné varianty.\n'+collisions.slice(0,12).map(x=>'• '+x).join('\n')+(collisions.length>12?'\n…':''):''}\n\nExistující položky ani inventáře se nezmění.`))return;
   if(mutate(()=>data.items.push(...pending))){notice=`Do knihovny bylo přidáno ${pending.length} položek.`;view='library';render()}
  }catch(err){alert('Import katalogu selhal: '+err.message)}finally{e.target.value=''}
  return;
 }
 if(e.target.id==='import-file'){const f=e.target.files?.[0];if(!f)return;try{if(f.size>10*1024*1024)throw Error('Záloha přesahuje limit 10 MB');const baselineBeforeImport=storageBaseline;const imported=validate(JSON.parse(await f.text()));if(localStorage.getItem(STORAGE)!==baselineBeforeImport)throw Error('Data se mezitím změnila v jiné záložce. Obnovte stránku.');if(storageReadOnly)throw Error('Import je zablokován kvůli nečitelným původním datům.');if(!ask('Import nahradí všechna současná data. Máte uloženou aktuální JSON zálohu? Pokračovat?'))return;const old=data;data=imported;if(!save()){data=old;render();throw Error('Úložiště odmítlo zápis; původní data zůstala zachována')}selected=null;encounterSelection.clear();persistEncounterDraft();view='characters';notice='Import byl dokončen.';render()}catch(err){alert('Neplatný soubor zálohy: '+err.message)}}});
render();


// HMK UI v2: source-grounded character attributes and editable equipment records.
// Rules PDF: Character sheet (Birth/Family/Persona/Standing/Attributes/Skills), pp. 38, 45.
const HMK_ATTRIBUTES={PHYSICAL:[['str','Strength'],['end','Endurance'],['dex','Dexterity'],['agl','Agility'],['per','Perception'],['cml','Comeliness']],MENTAL:[['aur','Aura'],['wil','Will'],['rea','Reasoning'],['cre','Creativity'],['emp','Empathy'],['elo','Eloquence']]};
const HMK_IDENTITY=[['folk','Folk'],['ageGroup','Age group'],['birthdate','Birthdate'],['sunsign','Sunsign'],['birthplace','Birthplace'],['society','Society'],['socialClass','Social class'],['familyOccupation','Parent occupation'],['background','Background'],['estrangement','Estrangement'],['morality','Morality'],['psyche','Psyche'],['home','Home'],['standing','Standing'],['complexion','Complexion'],['hair','Hair'],['eyes','Eyes'],['height','Height'],['weight','Weight'],['handedness','Handedness']];
function numericField(key,label,val){return `<label>${esc(label)}<input type="number" step="1" min="0" max="999" name="${esc(key)}" value="${esc(val??'')}"></label>`}
function hmkSheet(c){const h=c.hmk||{};const a=h.attributes||{};const skills=h.skills||[];return `<section class="panel wide"><h3>HMK · Charakteristika a původ</h3><p class="muted">Struktura podle listu postavy HMK. Prázdné hodnoty znamenají nezadané; aplikace nic nehází ani nedopočítává.</p><form id="hmk-profile-form"><div class="field-grid">${HMK_IDENTITY.map(([k,l])=>field('bio_'+k,l,h[k]??'')).join('')}</div><h3>Physical Attributes</h3><div class="field-grid">${HMK_ATTRIBUTES.PHYSICAL.map(([k,l])=>numericField('attr_'+k,l,a[k])).join('')}</div><h3>Mental Attributes</h3><div class="field-grid">${HMK_ATTRIBUTES.MENTAL.map(([k,l])=>numericField('attr_'+k,l,a[k])).join('')}</div><div class="actions"><button type="submit">Uložit HMK profil</button></div></form></section><section class="panel wide"><h3>Dovednosti · Skills</h3><p class="muted">SB/ML se zadávají ručně podle HMK; automatický výpočet bude připojen až k ověřenému pravidlovému resolveru.</p><div class="table-scroll"><table><thead><tr><th>Skupina</th><th>Dovednost</th><th>SB</th><th>ML</th><th></th></tr></thead><tbody>${skills.map(x=>`<tr><td>${esc(x.group)}</td><td>${esc(x.name)}</td><td>${esc(x.sb??'')}</td><td>${esc(x.ml??'')}</td><td><button class="secondary" data-edit-skill="${esc(x.id)}">Upravit</button> <button class="danger" data-remove-skill="${esc(x.id)}">×</button></td></tr>`).join('')}</tbody></table></div><form id="hmk-skill-form"><div class="field-grid"><label>Skupina<select name="group"><option>Social</option><option>Lore</option><option>Physical</option><option>Esoterica</option><option>Combat</option><option>Craft</option><option>Other</option></select></label>${field('name','Název dovednosti')}${numericField('sb','SB','')}${numericField('ml','ML','')}</div><button type="submit">Přidat dovednost</button></form></section><section class="panel wide"><h3>Zranění a stav postavy</h3><p class="muted">Záznamy jsou evidenční, nikoli výpočet šoku, krvácení nebo léčby. Ty musí zůstat pod kontrolou HMK jádra.</p>${(h.injuries||[]).map(x=>`<div class="list-row"><div><b>${esc(x.location)}</b> · ${esc(x.description)} <span class="muted">${esc(x.severity)}</span></div><div class="actions"><button class="secondary" data-edit-injury="${esc(x.id)}">Upravit</button><button class="danger" data-remove-injury="${esc(x.id)}">Odstranit</button></div></div>`).join('')}<form id="hmk-injury-form"><div class="field-grid">${field('location','Lokalita zásahu')}${field('severity','Závažnost / označení')}${field('description','Popis poranění')}</div><button type="submit">Zapsat zranění</button></form></section>`}
function parseStructuredModes(raw){
 if(!String(raw||'').trim())return [];
 let x;try{x=JSON.parse(raw)}catch{throw Error('Režimy zbraně: neplatný JSON')}
 if(!Array.isArray(x)||x.length>30||x.some(m=>!m||typeof m!=='object'||Array.isArray(m)||!Object.keys(m).length))throw Error('Režimy musí být pole nejvýše 30 neprázdných objektů.');
 return x;
}
function parseStructuredTraits(raw){
 if(!String(raw||'').trim())return [];
 let x;try{x=JSON.parse(raw)}catch{throw Error('Traits: neplatný JSON')}
 if(!Array.isArray(x)||x.length>60||x.some(t=>typeof t!=='string'||!t.trim()))throw Error('Traits musí být pole neprázdných textů.');return x.map(t=>t.trim());
}
function parseLocationProtection(raw){
 if(!String(raw||'').trim())return {};
 let x;try{x=JSON.parse(raw)}catch{throw Error('Ochrana lokací: neplatný JSON')}
 if(!x||Array.isArray(x)||typeof x!=='object'||Object.keys(x).length>100)throw Error('Ochrana lokací musí být JSON objekt.');for(const [location,protection] of Object.entries(x)){if(!location.trim()||location.length>120||!protection||typeof protection!=='object'||Array.isArray(protection))throw Error('Každá lokalita musí obsahovat objekt ochranných hodnot.');if(Object.keys(protection).length>30)throw Error('Příliš mnoho typů ochrany u lokality '+location);for(const [aspect,value] of Object.entries(protection)){if(!aspect.trim()||!Number.isSafeInteger(value)||value<0||value>999)throw Error('Ochrana '+location+' / '+aspect+' musí být celé číslo 0–999.')}}return x;
}
function equipmentEditor(title,obj){const prop=obj.properties||{};const cat=obj.category||category;const specs=cat==='weapon'?[['attack','Útočné parametry (text)'],['defense','Obranné parametry (text)'],['impact','Impact / damage (text)'],['quality','Weapon Quality (WQ)'],['weightLb','Hmotnost v librách (lb)'],['traits','Traits / vlastnosti']]:cat==='shield'?[['defense','Obranné parametry (text)'],['quality','Shield Quality (WQ)'],['coverage','Krytí / použití'],['traits','Vlastnosti']]:cat==='armor'?[['material','Materiál'],['coverage','Pokryté lokace'],['layers','Vrstvy / články'],['protection','Ochranné hodnoty dle typu zásahu'],['quality','Kvalita / stav']]:[['weightLb','Hmotnost v librách (lb)'],['value','Cena / hodnota (text)'],['use','Použití / účel'],['notes','Poznámky']];return `<div class="panel"><h2>${esc(title)}</h2><form id="hmk-item-form">${field('name','Název',obj.name||'')}<label>Kategorie<select name="category">${[['weapon','Zbraň'],['shield','Štít'],['armor','Zbroj'],['other','Ostatní předmět']].map(([v,l])=>`<option value="${v}" ${cat===v?'selected':''}>${l}</option>`).join('')}</select></label>${area('description','Popis',obj.description||'')}${field('source','Pravidlový zdroj (strana/tabulka)',obj.source||'')}<div class="field-grid">${specs.map(([k,l])=>field('spec_'+k,l,prop[k]??'')).join('')}</div>${cat==='weapon'?`<div class="notice">Strukturované režimy a traits vyplňujte pouze podle ověřených HMK zdrojů. Prázdné pole = žádná ověřená data.</div>${area('verifiedModes','Ověřené režimy (JSON pole objektů)',JSON.stringify(prop.verifiedModes||[],null,2))}${area('verifiedTraits','Ověřené traits (JSON pole textů)',JSON.stringify(prop.verifiedTraits||[],null,2))}`:cat==='armor'?`<p class="muted">Formát: {"lokalita":{"typ_zásahu":ochrana}}. Názvy lokalit a typů zásahu přepište přesně z ověřeného HMK zdroje. Příklad struktury (nikoli hodnot pravidel): {"Example":{"B":1}}.</p>${area('locationProtection','Ověřené ochrany dle lokací (JSON objekt)',JSON.stringify(prop.locationProtection||{},null,2))}`:''}<p class="muted">Změna kategorie při editaci nepřepočítává pole; pro jiný typ založte nový záznam. Parametry jsou textové, aby se neinterpretovaly neověřené hodnoty.</p><div class="actions"><button type="submit">Uložit předmět</button><button type="button" class="secondary" data-action="cancel-editor">Zrušit</button></div></form></div>`}
// Bridge v3: serialize into the EXISTING HMK domain contracts. No combat calculations here.
function safeFilename(s){return String(s).normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,50)||'character'}
function downloadJSON(value,filename){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function kernelExport(chars){
 const characterIds=new Set(chars.map(c=>c.id));
 const definitions=[];const instances=[];const used=new Set();const warnings=[];
 const characters=chars.map(c=>{
   const skills={};for(const s of c.hmk?.skills||[]){const key=s.id||uuid();skills[key]=KernelSkill({id:key,key:s.name,name:s.name,ml:s.ml??null,sb:s.sb??null,group:s.group||null});if(s.ml===null||s.ml===undefined)warnings.push('Dovednost '+s.name+' u postavy '+c.name+' nemá ML.')}
   const attributes={...c.hmk?.attributes||{}};
   if(!Object.keys(attributes).length)warnings.push('Postava '+c.name+' nemá zadané atributy.');
   return KernelCharacter({id:c.id,name:c.name,attributes,skills,handedness: c.hmk?.handedness==='left'?'left':'right',notes:c.description||''});
 });
 for(const inv of data.inventory.filter(x=>characterIds.has(x.characterId))){
   const src=inv.snapshot||{};const p=src.properties||{};const defId=src.id||inv.sourceItemId||inv.id;
   if(src.category==='weapon'){
     if(!used.has(defId)){definitions.push(WeaponDefinition({id:defId,name:src.name||'Unnamed',modes:verifiedModes(p),baseWQ:asNumber(p.quality),weightLb:asNonNegativeNumber(p.weightLb),traits:verifiedTraits(p)}));used.add(defId)}
     instances.push(WeaponInstance({id:inv.id,definitionId:defId,currentWQ:inv.currentWQ??asNumber(p.quality),baseWQ:asNumber(p.quality),ownerId:inv.characterId,custom:{quantity:inv.quantity,condition:inv.condition,unverifiedProperties:p}}));
     if(!verifiedModes(p).length)warnings.push('Zbraň '+src.name+': nejsou zadány ověřené strukturované režimy útoku.');if(p.traits&&!verifiedTraits(p).length)warnings.push('Zbraň '+src.name+': textové traits se nepřevádějí automaticky.');
   }else if(src.category==='shield'){
     instances.push(Shield({id:inv.id,definitionId:defId,currentWQ:inv.currentWQ??asNumber(p.quality),baseWQ:asNumber(p.quality),ownerId:inv.characterId}));
     warnings.push('Štít '+src.name+': obranné modifikátory nejsou automaticky převáděny z textových polí.');
   }else if(src.category==='armor'){
     const protection=validatedProtection(p.locationProtection);instances.push(ArmourArticle({id:inv.id,definitionId:defId,ownerId:inv.characterId,locations:protection}));
     if(!Object.keys(protection).length)warnings.push('Zbroj '+src.name+': chybí strukturované ochrany lokací.');
   }
 }
 return {schemaVersion:SCHEMA_VERSION,format:'hmk-domain-bridge-v1',exportedAt:stamp(),characters,weaponDefinitions:definitions,equipmentInstances:instances,warnings};
}
function validatedProtection(raw){if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};try{return parseLocationProtection(JSON.stringify(raw))}catch{return {}}}
function verifiedModes(p){return Array.isArray(p.verifiedModes)?p.verifiedModes.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).map(x=>structuredClone(x)):[]}
function verifiedTraits(p){return Array.isArray(p.verifiedTraits)?p.verifiedTraits.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()):[]}
function asNonNegativeNumber(v){if(v===null||v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null}
function asNumber(v){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isSafeInteger(n)&&n>=0?n:null}

// v11: Form-based inventory editing with explicit category and slot validation.
function inventoryEditForm(x){return `<div class="editor-backdrop"><section class="panel editor-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-inv-title"><h2 id="edit-inv-title">Upravit vybavení: ${esc(x.snapshot.name)}</h2><p class="muted">${esc(x.snapshot.category)} · Změny se projeví až po uložení.</p><form id="inventory-edit-form"><input type="hidden" name="id" value="${esc(x.id)}">${numericField('quantity','Počet kusů',x.quantity)}${field('condition','Stav / poznámka',x.condition||'')}${numericField('currentWQ','Aktuální WQ (neznámá = prázdné)',x.currentWQ??'')}${slotSelect('slot',x.slot||'none')}<div class="actions"><button type="submit">Uložit změny</button><button type="button" class="secondary" data-action="cancel-editor">Zrušit</button></div></form></section></div>`}

document.addEventListener('click',e=>{const t=e.target.closest('[data-edit-inv]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();const x=data.inventory.find(x=>x.id===t.dataset.editInv&&x.characterId===selected);if(!x)return;overlay=inventoryEditForm(x);render()},true);
document.addEventListener('submit',e=>{if(e.target.id!=='inventory-edit-form')return;e.preventDefault();e.stopImmediatePropagation();const v=Object.fromEntries(new FormData(e.target));const x=data.inventory.find(x=>x.id===v.id&&x.characterId===selected);if(!x)return alert('Předmět již neexistuje');const quantity=Number(v.quantity);const currentWQ=v.currentWQ.trim()===''?null:Number(v.currentWQ);if(!Number.isSafeInteger(quantity)||quantity<1||quantity>999999)return alert('Počet musí být celé číslo 1–999999');if(currentWQ!==null&&(!Number.isSafeInteger(currentWQ)||currentWQ<0||currentWQ>999))return alert('WQ musí být celé číslo 0–999');if(!validSlotForCategory(v.slot,x.snapshot.category))return alert('Neplatný slot pro tento typ předmětu');if(['main_hand','off_hand','worn'].includes(v.slot)&&quantity!==1)return alert('Nasazený předmět musí mít počet 1');if(!handSlotAvailable(x.characterId,v.slot,x.id))return alert('Ruka je již obsazena');if(mutate(()=>{const target=data.inventory.find(row=>row.id===v.id&&row.characterId===selected);if(!target)throw Error('Předmět již neexistuje');target.quantity=quantity;target.currentWQ=currentWQ;target.condition=v.condition;target.slot=v.slot})){overlay=null;render()}},true);

// v11: Multi-line journal editor preserves timestamps and record identity.
function journalEditForm(x){return `<div class="editor-backdrop"><section class="panel editor-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-log-title"><h2 id="edit-log-title">Upravit zápis deníku</h2><form id="journal-edit-form"><input type="hidden" name="id" value="${esc(x.id)}">${field('title','Nadpis',x.title||'')}${area('body','Text zápisu',x.body)}<div class="actions"><button type="submit">Uložit zápis</button><button type="button" class="secondary" data-action="cancel-editor">Zrušit</button></div></form></section></div>`}

document.addEventListener('click',e=>{const t=e.target.closest('[data-edit-log]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();const x=data.journal.find(x=>x.id===t.dataset.editLog&&x.characterId===selected);if(!x)return;overlay=journalEditForm(x);render()},true);
document.addEventListener('submit',e=>{if(e.target.id!=='journal-edit-form')return;e.preventDefault();e.stopImmediatePropagation();const v=Object.fromEntries(new FormData(e.target));const x=data.journal.find(x=>x.id===v.id&&x.characterId===selected);if(!x)return alert('Zápis již neexistuje');if(mutate(()=>{const target=data.journal.find(row=>row.id===v.id&&row.characterId===selected);if(!target)throw Error('Zápis již neexistuje');target.title=v.title.trim()||'Bez názvu';target.body=v.body;target.updatedAt=stamp()})){overlay=null;render()}},true);

// Edit existing records without destroying IDs or journal timestamps.

document.addEventListener('click',e=>{
 const t=e.target.closest('[data-edit-skill],[data-edit-injury]');if(!t)return;
 const id=t.dataset.editSkill||t.dataset.editInjury;
 const c=character(selected);if(!c)return;
 if(t.dataset.editSkill){const x=(c.hmk?.skills||[]).find(x=>x.id===id);if(!x)return;const name=prompt('Dovednost',x.name);if(name===null)return;if(!name.trim())return alert('Název je povinný');const sb=prompt('SB (prázdné = nezadáno)',x.sb??'');if(sb===null)return;const ml=prompt('ML (prázdné = nezadáno)',x.ml??'');if(ml===null)return;const parse=v=>v.trim()===''?null:Number(v);if([parse(sb),parse(ml)].some(n=>n!==null&&(!Number.isSafeInteger(n)||n<0||n>999)))return alert('SB a ML musí být celá nezáporná čísla');mutate(()=>{x.name=name.trim();x.sb=parse(sb);x.ml=parse(ml)});return}
 if(t.dataset.editInjury){const x=(c.hmk?.injuries||[]).find(x=>x.id===id);if(!x)return;const location=prompt('Lokalita zásahu',x.location);if(location===null)return;if(!location.trim())return alert('Lokalita je povinná');const severity=prompt('Závažnost',x.severity||'');if(severity===null)return;const description=prompt('Popis poranění',x.description||'');if(description===null)return;mutate(()=>{x.location=location.trim();x.severity=severity;x.description=description})}
},true);
// Capture phase handles new forms before the legacy form dispatcher.
document.addEventListener('submit',e=>{const f=e.target;if(!['hmk-profile-form','hmk-skill-form','hmk-injury-form','hmk-item-form'].includes(f.id))return;e.preventDefault();e.stopImmediatePropagation();const v=Object.fromEntries(new FormData(f));if(f.id==='hmk-item-form'){if(!String(v.name||'').trim())return alert('Zadejte název');const current=editItem?item(editItem):null;if(current&&current.category!==v.category)return alert('Změna kategorie existujícího předmětu není podporována. Založte nový předmět.');const props={...(current?.properties||{})};for(const [k,val] of Object.entries(v))if(k.startsWith('spec_'))props[k.slice(5)]=val;if(v.category==='weapon'){
  try{props.verifiedModes=parseStructuredModes(v.verifiedModes);props.verifiedTraits=parseStructuredTraits(v.verifiedTraits)}catch(err){return alert(err.message)}
 }else if(v.category==='armor'){
  try{props.locationProtection=parseLocationProtection(v.locationProtection)}catch(err){return alert(err.message)}
 }
 const record={id:editItem||uuid(),name:v.name.trim(),category:v.category,description:v.description||'',source:v.source||'',properties:props};if(mutate(()=>{if(current)Object.assign(current,record);else data.items.push(record)})){overlay=null;render()}return}const c=character(selected);if(!c)return;const h=structuredClone(c.hmk||{});if(f.id==='hmk-profile-form'){const a={...(h.attributes||{})};for(const [k,val] of Object.entries(v)){if(k.startsWith('bio_'))h[k.slice(4)]=val;if(k.startsWith('attr_')){if(val==='')delete a[k.slice(5)];else{const n=Number(val);if(!Number.isSafeInteger(n)||n<0||n>999)return alert('Neplatná charakteristika');a[k.slice(5)]=n}}}mutate(()=>{c.hmk={...h,attributes:a}});return}if(f.id==='hmk-skill-form'){if(!String(v.name||'').trim())return alert('Zadejte název dovednosti');const skill={id:uuid(),group:v.group,name:v.name.trim(),sb:v.sb===''?null:Number(v.sb),ml:v.ml===''?null:Number(v.ml)};if([skill.sb,skill.ml].some(n=>n!==null&&(!Number.isSafeInteger(n)||n<0||n>999)))return alert('Neplatné SB/ML');mutate(()=>{c.hmk={...h,skills:[...(h.skills||[]),skill]}});return}if(f.id==='hmk-injury-form'){if(!String(v.location||'').trim())return alert('Zadejte lokalitu');mutate(()=>{c.hmk={...h,injuries:[...(h.injuries||[]),{id:uuid(),location:v.location,description:v.description||'',severity:v.severity||''}]}})}},true);
document.addEventListener('change',e=>{const id=e.target?.dataset?.encounterCharacter;if(!id)return;if(!data.characters.some(c=>c.id===id))return;if(e.target.checked)encounterSelection.add(id);else encounterSelection.delete(id);persistEncounterDraft();render()});
document.addEventListener('click',e=>{const t=e.target.closest('[data-remove-skill],[data-remove-injury]');if(!t)return;const c=character(selected);if(!c||!window.confirm('Odstranit tento záznam?'))return;const key=t.dataset.removeSkill?'skills':'injuries';const id=t.dataset.removeSkill||t.dataset.removeInjury;mutate(()=>{c.hmk=c.hmk||{};c.hmk[key]=(c.hmk[key]||[]).filter(x=>x.id!==id)})});

// v21: independent catalogue exchange. Never import character data or overwrite definitions.
// Canonical fingerprint: JSON object key order does not change a definition's identity.
// Array order is deliberately retained (weapon modes and layers may be ordered).
function canonicalCatalogValue(value){
 if(Array.isArray(value))return value.map(canonicalCatalogValue);
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonicalCatalogValue(value[k])]));
 return value;
}
function catalogFingerprint(x){return JSON.stringify(canonicalCatalogValue([x.category,x.name.trim().toLocaleLowerCase('cs'),x.description||'',x.source||'',x.properties]));}
function catalogNameConflicts(pending,existing){
 const names=new Map();
 for(const x of existing){const key=x.category+'|'+x.name.trim().toLocaleLowerCase('cs');if(!names.has(key))names.set(key,new Set());names.get(key).add(catalogFingerprint(x));}
 const conflicts=[];
 for(const x of pending){const key=x.category+'|'+x.name.trim().toLocaleLowerCase('cs');const variants=names.get(key);if(variants&&!variants.has(catalogFingerprint(x)))conflicts.push(x.name+' ('+x.category+')');if(!variants)names.set(key,new Set([catalogFingerprint(x)]));else variants.add(catalogFingerprint(x));}
 return conflicts;
}
// Validate the entire imported parameter tree before cloning or persisting it.
// The catalogue is data, never executable code. Reject excessive nesting and
// prototype-sensitive keys even though JSON.parse itself does not execute them.
function validateCatalogTree(value,depth=0,budget={nodes:0}){
 if(++budget.nodes>20000)throw Error('Příliš složitá struktura parametrů katalogu');
 if(depth>24)throw Error('Parametry katalogu jsou příliš hluboce vnořené');
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'&&Number.isFinite(value))return;
 if(Array.isArray(value)){
  if(value.length>10000)throw Error('Příliš dlouhý seznam v parametrech katalogu');
  for(const entry of value)validateCatalogTree(entry,depth+1,budget);
  return;
 }
 if(typeof value==='object'&&value!==null&&Object.getPrototypeOf(value)===Object.prototype){
  const keys=Object.keys(value);
  if(keys.length>2000)throw Error('Příliš mnoho polí v parametrech katalogu');
  for(const key of keys){
   if(['__proto__','constructor','prototype'].includes(key))throw Error('Nepovolený název pole v katalogu');
   validateCatalogTree(value[key],depth+1,budget);
  }
  return;
 }
 throw Error('Nepovolená hodnota v parametrech katalogu');
}
function prepareCatalogImport(pkg,existing){
 if(!pkg||pkg.format!=='hmk-equipment-catalog-v1'||!Array.isArray(pkg.items))throw Error('Neplatný formát katalogu');
 if(pkg.items.length>10000)throw Error('Katalog obsahuje příliš mnoho položek');
 const fingerprints=new Set(existing.map(catalogFingerprint));const pending=[];
 for(const x of pkg.items){
  if(!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>250||!['weapon','shield','armor','other'].includes(x.category)||typeof x.description!=='string'||typeof x.source!=='string'||!x.properties||typeof x.properties!=='object'||Array.isArray(x.properties))throw Error('Katalog obsahuje neplatnou definici');
  // Reject unsafe/non-JSON nested values before touching the existing catalogue.
  validateCatalogTree(x.properties);
  if(JSON.stringify(x.properties).length>100000)throw Error('Parametry položky přesahují limit 100 kB');
  const fingerprint=catalogFingerprint(x);
  if(fingerprints.has(fingerprint))continue;
  fingerprints.add(fingerprint);
  pending.push({id:uuid(),name:x.name.trim(),category:x.category,description:x.description,source:x.source,properties:structuredClone(x.properties)});
 }
 return pending;
}
