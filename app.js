import {auditArmourLibraryConsistency} from './src/integration/armour-library-consistency.js';
import {suitLibraryModes} from './src/integration/armour-suit-library-mode.js';
import { EXPEDITION_EFFECTS_P120 } from './src/rules/expedition-effects.js';
import {parseSetupTASelection} from './src/integration/setup-ta-selection.js';
import {meleeTAAwardOptions,allocateMeleeTACredit} from './src/integration/melee-ta-awards.js';
import {emptyTALedger,validateTALedger,awardTACredit,spendTACredit,availableTACredits,prepareSetupSpend} from './src/integration/tactical-advantage-ledger.js';
import {validateInCloseTransition} from './src/integration/in-close-transition.js';
import {resolveCharacterReachSizeModifier} from './src/integration/character-reach-size.js';
import {validateStrikeReachSelection} from './src/integration/melee-reach-consistency.js';
import {reachFromSelectedEquipment} from './src/integration/melee-auto-reach.js';
import {verifiedReachEMLModifiers} from './src/integration/melee-reach.js';
import {outnumberedEMLModifier} from './src/integration/melee-outnumbered.js';
import {proneMeleeEMLModifier} from './src/integration/melee-position-modifiers.js';
import {fatigueEMLModifier} from './src/integration/melee-fatigue.js';
import {verifiedImpactTA,verifiedMeleeModifiers} from './src/integration/melee-verified-modifiers.js';
import {assembleMeleeEML} from './src/integration/melee-eml.js';
import {projectLiveInjuries,projectInjuredMovement,liveMeleeInjuryConsequence} from './src/integration/live-injury-impairment.js';
import {resolveMeleeAttackGate} from './src/integration/melee-attack-gate.js';
import {resolveWeaponStrikeImpact} from './src/integration/weapon-strike-impact.js';
import {specialStrikeFromSnapshot} from './src/integration/special-strike-preview.js';
import {missingPrintedArmourCatalogEntries} from './src/integration/armour-article-catalog.js';
import {identifyWornPrintedSuit,resolvePrintedSuitProtection,selectPrintedSuitRigidStatus} from './src/integration/printed-suit-combat.js';
import {auditPrintedSuitLayers} from './src/integration/armour-suit-layer-audit.js';
import {auditArmourCoverage} from './src/integration/armour-coverage-readiness.js';
import {reconcileSuitArticles} from './src/integration/armour-suit-article-crosswalk.js';
import { PRINTED_ARMOUR_ARTICLES_P118 } from './src/rules/armour-articles-printed.js';
import { PRINTED_ARMOUR_SUITS_P113_116 } from './src/rules/armour-suit-printed.js';
import { HMK_ARMOUR_SUIT_NAMES, auditSuitDefinitions } from './src/rules/armour-suit-reference.js';
import { catalogCoverage } from './src/integration/catalog-coverage.js';
import { calculateGearLoad, estimatedStowedSuitWeight, mountLoadENC } from './src/rules/gear-load.js';
import { WORKSHOP_SKILLS_P121, workshopQuality, occupationalWorkshop, waterWeightLb, mundaneFireImpact, fireGrowthSteps } from './src/rules/craft-workshop-p121.js';
import { EXPEDITION_EQUIPMENT_P120, CRAFT_ITEMS_TOOLS_P121, WORKSHOP_QUALITY_P121, WATER_WEIGHT_P121, MUNDANE_FIRE_P121 } from './src/rules/possessions-printed.js';
import { BEASTS_P122, VEHICLES_TACK_P122, CONVEYANCE_RULES_P122 } from './src/rules/conveyance-printed-p122.js';
import { ARMOUR_LAYER_COLUMNS, ARMOUR_LAYER_NOTES } from './src/rules/armour-layer-reference.js';
import { auditArmourLoadout } from './src/integration/armour-loadout-audit.js';
import { projectCombatState } from './src/integration/combat-state-projection.js';
import {resolveLiveCombatArmour} from './src/integration/live-combat-armour.js';
import {resolveCombatantLoad,bulkForTest} from './src/integration/combatant-load.js';
import {initialCombatState,validateCombatState,combatFatigueTotals,applyConfirmedHit,applyConfirmedBloodLoss,applyConfirmedBloodStoppage,applyConfirmedShockRecovery,applyConfirmedFatigue,dueBloodLoss,applyConfirmedWoundContext} from './src/integration/persistent-combat-state.js';
// v60: Bundled domain contract constructors; the 3-file deployment is self-contained.
/** HMK domain contracts. Runtime objects are plain JSON-serialisable data. */
const SCHEMA_VERSION = 1;
const kernelUUID = () => crypto.randomUUID();

function KernelCharacter({id=kernelUUID(), name, attributes={}, skills={}, handedness='right', notes=''}) {
  return {schemaVersion:SCHEMA_VERSION,id,name,attributes,skills,handedness,notes};
}
function KernelSkill({id=kernelUUID(), key, name, ml=0, sb=null, group=null}) {
  return {id,key,name,ml,sb,group};
}
function WeaponDefinition({id=kernelUUID(),name,modes=[],baseWQ=null,weightLb=0,traits=[]}) {
  return {id,name,modes,baseWQ,weightLb,traits};
}
function WeaponInstance({id=kernelUUID(),definitionId,currentWQ=null,baseWQ=null,ownerId=null,custom={}}) {
  return {id,definitionId,currentWQ,baseWQ,ownerId,custom};
}
function Shield({id=kernelUUID(),definitionId,currentWQ,baseWQ,shieldMod=0,deflect=0,ownerId=null}) {
  return {id,definitionId,currentWQ,baseWQ,shieldMod,deflect,ownerId};
}
function ArmourArticle({id=kernelUUID(),definitionId,ownerId=null,locations={},aq=null,destroyed=false}) {
  return {id,definitionId,ownerId,locations,aq,destroyed};
}

// HMK Keeper's Ledger v47 — visible release identification and cache-busted entry assets; user storage unchanged.
const APP_VERSION='93.79';
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
 for(const i of d.items){if(typeof i.id==='string'&&i.id.startsWith('hmk:'))throw Error('Kolize s vestavěnou definicí HMK');if(typeof i.name!=='string'||!['weapon','shield','armor','other'].includes(i.category)||!i.properties||typeof i.properties!=='object'||Array.isArray(i.properties))throw Error('Neplatná položka knihovny')}
 for(const c of [...d.characters,...d.trash]){if(c.hmk!==undefined){if(!c.hmk||typeof c.hmk!=='object'||Array.isArray(c.hmk))throw Error('Neplatný HMK profil');for(const k of ['skills','injuries']){if(c.hmk[k]!==undefined){if(!Array.isArray(c.hmk[k]))throw Error('Neplatný seznam '+k);const unique=new Set();for(const r of c.hmk[k]){if(!r||typeof r.id!=='string'||!r.id||unique.has(r.id))throw Error('Duplicitní HMK ID: '+k);unique.add(r.id)}}}if(c.hmk.combatState){validateCombatState(c.hmk.combatState);for(const w of c.hmk.combatState.wounds){const i=c.hmk.injuries?.find(i=>i.id===w.id&&i.combatRecord===true);if(!i||i.location!==w.location||i.severity!==w.severity||i.bleeding!==w.bleeding)throw Error('Nesoulad evidované rány a trvalého bojového stavu');}}}}
 if(d.inventory.some(x=>!ids.has(x.characterId)||!x.snapshot||typeof x.snapshot.name!=='string'||!['weapon','shield','armor','other'].includes(x.snapshot.category)||!Number.isSafeInteger(x.quantity)||x.quantity<1||x.quantity>999999||(x.slot!==undefined&&!SLOTS.some(s=>s[0]===x.slot)))||d.journal.some(x=>!ids.has(x.characterId)||typeof x.body!=='string'))throw Error('Záloha obsahuje osiřelé nebo poškozené záznamy');
 for(const x of d.inventory){if(x.sourceItemId!==undefined&&x.sourceItemId!==null&&typeof x.sourceItemId!=='string')throw Error('Neplatný odkaz na knihovnu');if(x.condition!==undefined&&typeof x.condition!=='string')throw Error('Neplatný stav předmětu');if(x.currentWQ!==undefined&&x.currentWQ!==null&&(!Number.isSafeInteger(x.currentWQ)||x.currentWQ<0||x.currentWQ>999))throw Error('Neplatná aktuální kvalita WQ předmětu');if(x.slot!==undefined&&!validSlotForCategory(x.slot,x.snapshot.category))throw Error('Neplatná kombinace slotu a kategorie předmětu');if(['main_hand','off_hand','worn'].includes(x.slot)&&x.quantity!==1)throw Error('Vybavený předmět musí představovat právě jeden kus');if(x.layerOrder!==undefined&&x.layerOrder!==null&&(!Number.isSafeInteger(x.layerOrder)||x.layerOrder<0||x.layerOrder>99||x.snapshot.category!=='armor'))throw Error('Neplatné pořadí vrstvy');if(x.layerSlot!==undefined&&x.layerSlot!==null&&(!['underFar','underNear','base','overNear','overFar'].includes(x.layerSlot)||x.snapshot.category!=='armor'))throw Error('Neplatný sloupec vrstvy')}
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
function item(id){return findCatalogItem(id)}
function main(){let body='';if(view==='characters')body=charactersView();if(view==='sheet')body=sheetView();if(view==='library')body=libraryView();if(view==='trash')body=trashView();if(view==='backup')body=backupView();if(view==='encounter')body=encounterView();return `<div class="shell"><header class="mast"><div class="mast-top"><div class="eyebrow">HÂRNMASTER · GAME MASTER CONSOLE</div><div class="release-marker" aria-label="Aktuální verze webové aplikace">VERZE ${APP_VERSION}</div></div><h1>The Keeper's Ledger <span class="app-version" aria-label="Verze aplikace">v${APP_VERSION}</span></h1><p>Registr postav · osobní deníky · knihovna vybavení</p></header><div class="layout"><nav class="nav" aria-label="Hlavní navigace">${[['characters','⚜ Postavy'],['library','⚔ Knihovna'],['trash','♻ Archiv'],['backup','▣ Zálohy'],['encounter','⚔ Příprava boje']].map(([v,l])=>`<button class="${view===v?'':'secondary'}" data-nav="${v}">${l}</button>`).join('')}</nav><main class="content">${notice?`<div class="notice error">${esc(notice)}</div>`:''}${body}</main></div><footer class="footer">HMK UI v${APP_VERSION} · samostatně nasaditelné doménové kontrakty + export do jádra · pravidlový Shock bridge · plný combat resolver zatím není připojen</footer></div>`}
function charactersView(){const list=data.characters.filter(c=>(c.name+' '+c.occupation+' '+c.kind).toLowerCase().includes(query.toLowerCase()));return `<div class="topline"><h2>Registr postav (${data.characters.length})</h2>${button('+ Nová postava','new-character')}</div><div class="toolbar"><input id="search" placeholder="Hledat postavu…" value="${esc(query)}"></div>${list.length?`<div class="cards">${list.map(c=>`<article class="card character-card"><button type="button" class="character-delete" data-delete-character="${esc(c.id)}" aria-label="Smazat postavu ${esc(c.name)}" title="Smazat postavu ${esc(c.name)}">×</button><span class="pill">${esc(c.kind)}</span><h3>${esc(c.name)}</h3><div class="muted">${esc(c.occupation||'Bez povolání')}</div><div class="muted">${esc(c.description||'')}</div><div class="actions"><button data-open="${esc(c.id)}">Otevřít deník</button><button class="secondary" data-copy="${esc(c.id)}">Kopírovat</button><button class="secondary" data-export-character="${esc(c.id)}">Záloha postavy</button><button class="danger" data-archive="${esc(c.id)}">Archivovat</button></div></article>`).join('')}</div>`:'<div class="empty">Žádné odpovídající postavy.</div>'}`}
function armourLoadoutPanel(inv){
 const report=auditArmourLoadout(inv);
 const rows=report.rows.map(r=>`<tr><td>${esc(r.location)}</td><td>${r.count}</td><td>${r.protection.b}</td><td>${r.protection.e}</td><td>${r.protection.p}</td><td>${r.protection.f}</td></tr>`).join('');
 return `<section class="panel wide"><h3>Kontrola nasazené zbroje · anatomická ochrana</h3><p class="muted">Pouze informativní součet doložených hodnot. Nejde o potvrzení platnosti vrstev, kompletu ani výpočtu ENC. ${report.complete?'':'<strong> POZOR: neúplný nebo problematický soupis – zobrazené hodnoty nesmějí být použity jako konečná ochrana v boji.</strong>'}</p>${rows?`<div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Lokace</th><th>Vrstvy</th><th>B</th><th>E</th><th>P</th><th>F</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="muted">Žádné nasazené kusy s úplným anatomickým mapováním.</p>'}${report.skipped.length?`<p class="muted">Nezapočtené položky: ${report.skipped.length}. ${esc(report.skipped.map(x=>x.name+' ('+x.reason+')').join('; '))}.</p>`:''}${report.warnings.length?`<p class="muted">Varování vrstvení: ${esc(report.warnings.map(w=>(w.zone||w.location)+': '+w.reason).join('; '))}. Pravidlovou platnost musí ověřit GM.</p>`:''}</section>`;
}
// HMK pp.112,117,122: live non-persistent load derived from owned items.
// GM-confirmed Bulk is only entered during melee (printed suit articles have
// no independent certified physical layer order). No speculative value shown.
function combatantLoadPanel(c){
 const r=resolveCombatantLoad({character:c,inventory:data.inventory});
 const val=x=>x===null||x===undefined?'neurčeno':esc(String(x));
 const summary=r.encReady?`Zbroj ENC ${r.armourENC} + výbava ENC ${r.gearENC} = ${r.baseENC}; STR ${r.str} (${r.strengthModifier>=0?'+':''}${r.strengthModifier}) → <strong>upravené ENC ${r.modifiedENC}</strong>; PF / období ${r.personalFatiguePerPeriod}.`:'Zatížení ENC nelze bezpečně dopočítat ze současných údajů.';
 const bulk=r.bulkReady?`Bulk podle zón (H/A/T/L): ${['head','arms','torso','legs'].map(z=>r.bulkByZone[z]).join(' / ')}.`:'Bulk není ověřen (u tištěných kompletů vyžaduje potvrzení GM; u vlastní sestavy přesné vrstvy).';
 return `<section class="panel wide"><h3>HMK · zatížení postavy (str. 112, 117, 122)</h3><p>${summary}</p><p class="tiny">${bulk} Upravené ENC se odečítá od Move, Agility a dovedností s Agility v SB. PF zde znamená nově získanou únavu za období námahy, ne současný stav Fatigue. Zatím počítáno jako pěší postava; jízdní stav potvrzuje GM při boji.</p>${r.issues.length?`<ul class="audit-list">${r.issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</section>`;
}
function sheetView(){const c=character(selected);if(!c){view='characters';return charactersView()}const inv=data.inventory.filter(x=>x.characterId===c.id);const logs=data.journal.filter(x=>x.characterId===c.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return `<div class="topline"><h2>Osobní deník: ${esc(c.name)}</h2>${button('← Registr','go-characters')}${button('Export HMK profilu','export-kernel-character')}</div><div class="columns"><section class="panel"><h3>Identita</h3><form id="character-form">${field('name','Jméno',c.name)}${field('occupation','Povolání',c.occupation)}<label>Typ<select name="kind"><option ${c.kind==='PC'?'selected':''}>PC</option><option ${c.kind==='NPC'?'selected':''}>NPC</option></select></label>${field('portrait','URL portrétu (nepovinné)',c.portrait)}${area('description','Popis a historie',c.description)}<div class="actions"><button type="submit">Uložit postavu</button></div></form></section><section class="panel"><h3>Vybavení postavy</h3><div class="equipment-summary">${[['main_hand','Hlavní ruka'],['off_hand','Vedlejší ruka'],['worn','Nasazená zbroj']].map(([slot,label])=>`<div><strong>${label}</strong><span>${esc(inv.filter(x=>x.slot===slot).map(x=>x.snapshot.name).join(', ')||'—')}</span></div>`).join('')}</div>${inv.length?inv.map(x=>`<div class="list-row"><div><b>${esc(x.snapshot.name)}</b><div class="muted">${esc(x.snapshot.category)} · ${esc(x.condition||'Bez stavu')} · ${esc(x.quantity)} ks · ${esc(slotLabel(x.slot))}${x.currentWQ!==undefined&&x.currentWQ!==null?' · WQ '+esc(x.currentWQ):''}</div></div><div class="actions"><button class="secondary" data-edit-inv="${esc(x.id)}">Upravit</button><button class="danger" data-remove-inv="${esc(x.id)}">Odebrat</button></div></div>`).join(''):'<p class="muted">Zatím bez vybavení.</p>'}<form id="add-inventory"><label>Předmět z knihovny<select name="itemId" required><option value="">Vyberte…</option>${allCatalogItems().map(i=>`<option value="${esc(i.id)}">${esc(i.name)} (${esc(i.category)})</option>`).join('')}</select></label>${field('quantity','Počet',1,'number')}${field('condition','Stav / poznámka','')}${field('currentWQ','Aktuální WQ kusu (nepovinné)','', 'number')}${slotSelect('slot','none')}<button type="submit" ${allCatalogItems().length?'':'disabled'}>Přiřadit předmět</button></form><div class="notice tiny">Při přiřazení vzniká samostatná kopie parametrů. Úprava knihovny nezmění již přidělené předměty.</div></section>${armourLoadoutPanel(inv)}${combatantLoadPanel(c)}${hmkSheet(c)}${readinessPanel(c)}<section class="panel wide"><h3>Osobní zápisník</h3><form id="journal-form">${field('title','Nadpis záznamu')}${area('body','Zápis')}<button type="submit">Přidat záznam</button></form>${logs.map(l=>`<div class="list-row"><div><b>${esc(l.title)}</b><div class="muted">${esc(new Date(l.createdAt).toLocaleString('cs-CZ'))}</div><p>${esc(l.body).replace(/\n/g,'<br>')}</p></div><div class="actions"><button class="secondary" data-edit-log="${esc(l.id)}">Upravit</button><button class="danger" data-delete-log="${esc(l.id)}">Smazat</button></div></div>`).join('')}</section></div>`}
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
function catalogAuditReport(){const entries=allCatalogItems().map(catalogAuditEntry);return {format:'hmk-catalog-readiness-v1',appVersion:APP_VERSION,generatedAt:stamp(),note:'Pouze kontrola úplnosti evidence, nikoliv pravidlové správnosti HMK.',total:entries.length,ready:entries.filter(x=>x.ready).length,missing:entries.filter(x=>!x.ready).length,entries};}
function catalogAuditPanel(){const report=catalogAuditReport();const counts=['weapon','shield','armor','other'].map(cat=>{const a=report.entries.filter(x=>x.category===cat);return {cat,total:a.length,ready:a.filter(x=>x.ready).length}});return `<section class="panel catalog-audit"><h3>Audit úplnosti katalogu</h3><p class="muted">Kontroluje pouze přítomnost strukturovaných údajů a zdrojů. Neověřuje jejich správnost proti PDF HMK.</p><div class="equipment-summary"><div><strong>Celkem položek</strong><span>${report.total}</span></div><div><strong>Bez evidenčních upozornění</strong><span>${report.ready}</span></div><div><strong>K doplnění</strong><span>${report.missing}</span></div></div><div class="catalog-audit-grid">${counts.map(x=>`<div><b>${esc(({weapon:'Zbraně',shield:'Štíty',armor:'Zbroje',other:'Ostatní'})[x.cat])}</b><span>${x.ready} / ${x.total}</span></div>`).join('')}</div><div class="actions">${button('Stáhnout audit katalogu JSON','export-catalog-audit')}${button('Stáhnout audit CSV pro Excel','export-catalog-audit-csv')}</div></section>`;}
// Read-only provenance audit: library edits never silently overwrite owned item snapshots.
// Ignore JSON object-key ordering, but preserve array ordering and all actual values.
// A snapshot may intentionally differ from the library; this remains advisory only.
function sameCatalogProperties(a,b){return JSON.stringify(canonicalCatalogValue(a))===JSON.stringify(canonicalCatalogValue(b));}
function inventoryProvenanceReport(){
 const catalog=new Map(allCatalogItems().map(i=>[i.id,i]));
 const people=new Map([...data.characters,...data.trash].map(c=>[c.id,c.name]));
 const entries=data.inventory.map(x=>{
  const original=x.sourceItemId?catalog.get(x.sourceItemId):null;
  const issues=[];
  if(!people.has(x.characterId))issues.push('Chybí vlastník');
  if(!x.sourceItemId)issues.push('Bez odkazu na knihovnu');
  else if(!original)issues.push('Původní definice byla odstraněna');
  else if(original.category!==x.snapshot.category)issues.push('Kategorie se liší od knihovny');
  else if(original.name!==x.snapshot.name||!sameCatalogProperties(original.properties,x.snapshot.properties))issues.push('Knihovna a kopie se liší');
  return {inventoryId:x.id,characterId:x.characterId,characterName:people.get(x.characterId)||null,
   itemName:x.snapshot.name,sourceItemId:x.sourceItemId||null,issues};
 });
 return {format:'hmk-inventory-provenance-v1',appVersion:APP_VERSION,generatedAt:stamp(),
  note:'Pouze informační audit. Rozdíl oproti knihovně může být záměrný; žádné kopie nejsou automaticky přepsány.',
  total:entries.length,flagged:entries.filter(x=>x.issues.length).length,entries};
}
// Explicit per-item reconciliation. No silent migration, including on backup import.
function inventoryReconciliationCandidate(id){
 const x=data.inventory.find(v=>v.id===id);
 if(!x||!x.sourceItemId||!x.snapshot)return null;
 const source=findCatalogItem(x.sourceItemId);
 if(!source||source.category!==x.snapshot.category)return null;
 if(source.name===x.snapshot.name&&sameCatalogProperties(source.properties,x.snapshot.properties)&&source.description===x.snapshot.description&&source.source===x.snapshot.source)return null;
 return {x,source,oldSnapshot:structuredClone(x.snapshot),newSnapshot:structuredClone(source)};
}
// v93.54: explicitly selected property-level reconciliation; unchanged fields remain untouched.
function reconciliationFieldChanges(oldSnapshot,newSnapshot){
 const fields=['name','description','source',...new Set([...Object.keys(oldSnapshot.properties||{}),...Object.keys(newSnapshot.properties||{})].map(k=>'properties.'+k))];
 return fields.filter(path=>{
  const key=path.startsWith('properties.')?path.slice(11):null;
  const oldValue=key===null?oldSnapshot[path]:oldSnapshot.properties?.[key];
  const newValue=key===null?newSnapshot[path]:newSnapshot.properties?.[key];
  return !sameCatalogProperties(oldValue,newValue);
 });
}
function reconcileInventoryItem(id){
 if(storageReadOnly)return alert('Úložiště je pouze pro čtení.');
 const candidate=inventoryReconciliationCandidate(id);
 if(!candidate)return alert('Položku nelze bezpečně aktualizovat. Ověřte její původ, kategorii a případné změny.');
 const {x,source,oldSnapshot,newSnapshot}=candidate;
 if(!source.builtin)return alert('Aktualizace je povolena pouze pro vestavěné pravidlové definice.');
 const fields=reconciliationFieldChanges(oldSnapshot,newSnapshot);
 if(!fields.length)return alert('Žádné rozdílné pravidlové pole k aktualizaci.');
 const format=v=>JSON.stringify(v)===undefined?'(chybí)':JSON.stringify(v);
 const lines=fields.map((path,i)=>{
  const key=path.startsWith('properties.')?path.slice(11):null;
  const before=key===null?oldSnapshot[path]:oldSnapshot.properties?.[key];
  const after=key===null?newSnapshot[path]:newSnapshot.properties?.[key];
  return `${i+1}. ${path}\n   PŮVODNÍ: ${format(before)}\n   KNIHOVNA: ${format(after)}`;
 });
 const response=window.prompt(`VYBERTE POUZE POLE, KTERÁ CHCETE ZMĚNIT\n\n${lines.join('\n')}\n\nZadejte čísla oddělená čárkou (např. 1,3).\nPrázdné = bez změny. Změny uživatele se nesmí přepsat omylem.`, '');
 if(response===null||!response.trim())return;
 const tokens=response.split(',').map(t=>t.trim());
 if(tokens.some(t=>!/^\d+$/.test(t)))return alert('Neplatný výběr. Použijte čísla oddělená čárkou.');
 const indexes=[...new Set(tokens.map(Number))];
 if(indexes.some(n=>!Number.isSafeInteger(n)||n<1||n>fields.length))return alert('Výběr obsahuje neexistující pole.');
 const selectedFields=indexes.map(n=>fields[n-1]);
 const fingerprint=JSON.stringify(canonicalCatalogValue(oldSnapshot));
 const sourceFingerprint=JSON.stringify(canonicalCatalogValue(newSnapshot));
 const recordFingerprint=JSON.stringify(canonicalCatalogValue({characterId:x.characterId,quantity:x.quantity,slot:x.slot,condition:x.condition,currentWQ:x.currentWQ}));
 // Export must be requested before confirmations; browser download completion cannot be verified.
 if(!ask('Před aktualizací bude zahájen export úplné JSON zálohy. Zkontrolujte, že se soubor skutečně uložil. Pokračovat k exportu?'))return;
 try{downloadJSON(structuredClone(data),'hmk-before-inventory-update-'+new Date().toISOString().slice(0,10)+'.json')}catch(err){return alert('Export zálohy selhal: '+err.message)}
 if(!ask('Ověřili jste, že byla záloha JSON skutečně uložena a je dostupná? Pokud ne, zvolte Zrušit.'))return;
 if(!ask(`POTVRDIT AKTUALIZACI JEDNOHO KUSU\n\n${x.snapshot.name}\nPouze tato pole:\n${selectedFields.join('\n')}\n\nVšechna ostatní pole snapshotu, WQ, stav, vlastník, slot a počet zůstanou beze změny.`))return;
 mutate(()=>{
  const current=data.inventory.find(v=>v.id===id);
  if(!current||JSON.stringify(canonicalCatalogValue(current.snapshot))!==fingerprint||current.sourceItemId!==source.id||JSON.stringify(canonicalCatalogValue({characterId:current.characterId,quantity:current.quantity,slot:current.slot,condition:current.condition,currentWQ:current.currentWQ}))!==recordFingerprint)throw Error('Položka se mezitím změnila.');
  const latest=findCatalogItem(source.id);
  if(!latest||!latest.builtin||latest.category!==current.snapshot.category||JSON.stringify(canonicalCatalogValue(latest))!==sourceFingerprint)throw Error('Zdrojová definice se mezitím změnila.');
  const updated=structuredClone(current.snapshot);
  for(const path of selectedFields){
   const property=path.startsWith('properties.');const key=property?path.slice(11):path;
   const from=property?latest.properties||{}:latest;
   const into=property?(updated.properties??={}):updated;
   if(Object.prototype.hasOwnProperty.call(from,key))into[key]=structuredClone(from[key]);
   else delete into[key];
  }
  current.snapshot=updated;
 });
}
function inventoryProvenancePanel(){const r=inventoryProvenanceReport();const flagged=r.entries.filter(x=>x.issues.length);
 return `<section class="panel"><h3>Kontrola původu inventáře</h3><p class="muted">Porovnává samostatné kopie předmětů s aktuální knihovnou. Rozdíly mohou být záměrné. Aktualizace vestavěné položky je vždy jednotlivá a selektivní. Výchozí volba nemění nic. Před potvrzením se nabídne export úplné zálohy; její skutečné uložení musí ověřit uživatel.</p><div class="equipment-summary"><div><strong>Inventární záznamy</strong><span>${r.total}</span></div><div><strong>K prověření</strong><span>${r.flagged}</span></div></div>${flagged.length?`<details><summary>Zobrazit upozornění (${flagged.length})</summary>${flagged.slice(0,50).map(x=>`<p class="tiny"><strong>${esc(x.characterName||'Neznámá postava')} · ${esc(x.itemName)}</strong>: ${esc(x.issues.join(', '))}${inventoryReconciliationCandidate(x.inventoryId)?.source?.builtin?` <button type="button" class="secondary" data-reconcile-inv="${esc(x.inventoryId)}">Posoudit aktualizaci</button>`:''}</p>`).join('')}${flagged.length>50?'<p class="muted">Další upozornění jsou v JSON reportu.</p>':''}</details>`:'<p class="muted">Bez upozornění na původ inventáře.</p>'}<div class="actions">${button('Stáhnout kontrolu inventáře JSON','export-inventory-audit')}</div></section>`;
}
const HMK_AXES_P99={"format":"hmk-equipment-catalog-v1","items":[{"name":"Battleaxe","category":"weapon","description":"HMK axes; chivalric. Primary strike from printed page 99.","source":"HârnMaster Kèthîra, Possessions / Weapons / Axes, printed p. 99","properties":{"quality":12,"heft":17,"length":"6|5","zoneDie":"d6","weightLb":6,"pricePence":108,"weaponClass":"chivalric","defenceModifier":-10,"verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":7,"aspect":"e","zoneDie":"d6","length":"6|5"}],"impactTAModifier":6}},{"name":"Handaxe","category":"weapon","description":"HMK axes; simple. Primary strike from printed page 99.","source":"HârnMaster Kèthîra, Possessions / Weapons / Axes, printed p. 99","properties":{"quality":11,"heft":13,"length":"5","zoneDie":"d6","weightLb":4,"pricePence":84,"weaponClass":"simple","defenceModifier":-10,"verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":5,"aspect":"e","zoneDie":"d6","length":"5"}],"impactTAModifier":6}},{"name":"Hatchet","category":"weapon","description":"HMK axes; common. Primary strike from printed page 99.","source":"HârnMaster Kèthîra, Possessions / Weapons / Axes, printed p. 99","properties":{"quality":9,"heft":10,"length":"4","zoneDie":"d6","weightLb":3,"pricePence":6,"weaponClass":"common","defenceModifier":-5,"verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":4,"aspect":"e","zoneDie":"d6","length":"4"}],"impactTAModifier":6}},{"name":"Pickaxe","category":"weapon","description":"HMK axes; common. Primary strike from printed page 99.","source":"HârnMaster Kèthîra, Possessions / Weapons / Axes, printed p. 99","properties":{"quality":9,"heft":18,"length":"5","zoneDie":"d6","weightLb":5,"pricePence":18,"weaponClass":"common","defenceModifier":-15,"verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":5,"aspect":"p","zoneDie":"d6","length":"5"}],"armourReduction":{"p":3},"impactTAModifier":5}},{"name":"Shôrkána","category":"weapon","description":"HMK axes; simple. Primary strike from printed page 99.","source":"HârnMaster Kèthîra, Possessions / Weapons / Axes, printed p. 99","properties":{"quality":10,"heft":10,"length":"5","zoneDie":"d6","weightLb":2,"pricePence":48,"weaponClass":"simple","defenceModifier":-5,"verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":4,"aspect":"e","zoneDie":"d6","length":"5"}],"baseRangeFt":40,"impactTAModifier":6}},{"name":"Sickle","category":"weapon","description":"HMK axes; common. Primary strike from printed page 99.","source":"HârnMaster Kèthîra, Possessions / Weapons / Axes, printed p. 99","properties":{"quality":9,"heft":9,"length":"3","zoneDie":"d6","weightLb":2,"pricePence":10,"weaponClass":"common","defenceModifier":-5,"verifiedModes":[{"name":"Primary","impactDie":"d10","impactModifier":2,"aspect":"e","zoneDie":"d6","length":"3"}]}},{"name":"Warhammer","category":"weapon","description":"HMK axes; chivalric. Primary strike from printed page 99.","source":"HârnMaster Kèthîra, Possessions / Weapons / Axes, printed p. 99","properties":{"quality":11,"heft":13,"length":"5","zoneDie":"d6","weightLb":4,"pricePence":84,"weaponClass":"chivalric","defenceModifier":-10,"verifiedModes":[{"name":"Primary","impactDie":"d6","impactModifier":4,"aspect":"b","zoneDie":"d6","length":"5"}],"alternateStrikeModes":[{"name":"Spike","impactDie":"d8","impactModifier":3,"aspect":"p","armourReduction":2}]}},{"name":"Wood Axe","category":"weapon","description":"HMK axes; common. Primary strike from printed page 99.","source":"HârnMaster Kèthîra, Possessions / Weapons / Axes, printed p. 99","properties":{"quality":9,"heft":16,"length":"5","zoneDie":"d6","weightLb":5,"pricePence":12,"weaponClass":"common","defenceModifier":-10,"verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":6,"aspect":"e","zoneDie":"d6","length":"5"}],"impactTAModifier":6}}]};
const HMK_POLEARMS_P102={"format":"hmk-equipment-catalog-v1","items":[{"name":"Falcastra","category":"weapon","description":"HMK polearms; common. Primary strike from printed page 102.","source":"HârnMaster Kèthîra, Possessions / Weapons / Polearms, printed p. 102","properties":{"quality":9,"heft":18,"length":"7","zoneDie":"d8","weightLb":6,"pricePence":42,"weaponClass":"common","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":4,"aspect":"p","zoneDie":"d8","length":"7"}],"defenceModifier":-5,"slowOneHand":true}},{"name":"Glaive","category":"weapon","description":"HMK polearms; simple. Primary strike from printed page 102.","source":"HârnMaster Kèthîra, Possessions / Weapons / Polearms, printed p. 102","properties":{"quality":11,"heft":18,"length":"7","zoneDie":"d8","weightLb":6,"pricePence":60,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d10","impactModifier":4,"aspect":"e","zoneDie":"d8","length":"7"}],"slowOneHand":true,"alternateStrikeModes":[{"name":"Tip thrust","length":"7t","impactDie":"d8","impactModifier":3,"aspect":"p"}]}},{"name":"Javelin","category":"weapon","description":"HMK polearms; simple. Primary strike from printed page 102.","source":"HârnMaster Kèthîra, Possessions / Weapons / Polearms, printed p. 102","properties":{"quality":10,"heft":11,"length":"5t","zoneDie":"d6","weightLb":3,"pricePence":36,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":4,"aspect":"p","zoneDie":"d6","length":"5t"}],"baseRangeFt":60,"slowOneHand":true,"alternateStrikeModes":[{"name":"Narrow head","impactDie":"d8","impactModifier":3,"aspect":"p","armourReduction":2}]}},{"name":"Jousting Pole","category":"weapon","description":"HMK polearms; chivalric. Primary strike from printed page 102.","source":"HârnMaster Kèthîra, Possessions / Weapons / Polearms, printed p. 102","properties":{"quality":8,"heft":16,"length":"8t","zoneDie":"d8","weightLb":6,"pricePence":40,"weaponClass":"chivalric","verifiedModes":[{"name":"Primary","impactDie":"d6","impactModifier":2,"aspect":"b","zoneDie":"d8","length":"8t"}],"couched":true,"long":true,"slow":true,"shieldDamageImpactBonus":2}},{"name":"Lance","category":"weapon","description":"HMK polearms; chivalric. Primary strike from printed page 102.","source":"HârnMaster Kèthîra, Possessions / Weapons / Polearms, printed p. 102","properties":{"quality":11,"heft":17,"length":"8t","zoneDie":"d8","weightLb":7,"pricePence":120,"weaponClass":"chivalric","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":6,"aspect":"p","zoneDie":"d8","length":"8t"}],"couched":true,"long":true,"slow":true}},{"name":"Pike","category":"weapon","description":"HMK polearms; simple. Primary strike from printed page 102.","source":"HârnMaster Kèthîra, Possessions / Weapons / Polearms, printed p. 102","properties":{"quality":12,"heft":19,"length":"9t","zoneDie":"d8","weightLb":10,"pricePence":96,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":6,"aspect":"p","zoneDie":"d8","length":"9t"}],"couched":true,"long":true,"slow":true}},{"name":"Pitchfork","category":"weapon","description":"HMK polearms; common. Primary strike from printed page 102.","source":"HârnMaster Kèthîra, Possessions / Weapons / Polearms, printed p. 102","properties":{"quality":9,"heft":12,"length":"5t","zoneDie":"d6","weightLb":4,"pricePence":9,"weaponClass":"common","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":3,"aspect":"p","zoneDie":"d6","length":"5t"}],"slowOneHand":true}},{"name":"Poleaxe","category":"weapon","description":"HMK polearms; chivalric. Primary strike from printed page 102.","source":"HârnMaster Kèthîra, Possessions / Weapons / Polearms, printed p. 102","properties":{"quality":11,"heft":18,"length":"6","zoneDie":"d6","weightLb":7,"pricePence":96,"weaponClass":"chivalric","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":7,"aspect":"e","zoneDie":"d6","length":"6"}],"defenceModifier":-10,"impactTAModifier":6,"alternateStrikeModes":[{"name":"Hammer head","length":"6","zoneDie":"d6","impactDie":"d6","impactModifier":5,"aspect":"b","defenceModifier":-10},{"name":"Top spike","length":"6t","zoneDie":"d8","impactDie":"d8","impactModifier":4,"aspect":"p","impactTAModifier":4,"slowOneHand":true}]}},{"name":"Spear","category":"weapon","description":"HMK polearms; simple. Primary strike from printed page 102.","source":"HârnMaster Kèthîra, Possessions / Weapons / Polearms, printed p. 102","properties":{"quality":11,"heft":13,"length":"7t","zoneDie":"d8","weightLb":4,"pricePence":60,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":5,"aspect":"p","zoneDie":"d8","length":"7t"}],"couched":true,"baseRangeFt":40,"slowOneHand":true}},{"name":"Staff","category":"weapon","description":"HMK polearms; common. Primary strike from printed page 102.","source":"HârnMaster Kèthîra, Possessions / Weapons / Polearms, printed p. 102","properties":{"quality":11,"heft":12,"length":"5","zoneDie":"d6","weightLb":3,"pricePence":24,"weaponClass":"common","verifiedModes":[{"name":"Primary","impactDie":"d6","impactModifier":2,"aspect":"b","zoneDie":"d6","length":"5"}],"tripUsesWeaponLength":true}},{"name":"Trident","category":"weapon","description":"HMK polearms; simple. Primary strike from printed page 102.","source":"HârnMaster Kèthîra, Possessions / Weapons / Polearms, printed p. 102","properties":{"quality":12,"heft":14,"length":"6t","zoneDie":"d8","weightLb":6,"pricePence":72,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":5,"aspect":"p","zoneDie":"d8","length":"6t"}],"blockModifier":5,"slowOneHand":true}}]};
const HMK_CLUBS_P100={"format":"hmk-equipment-catalog-v1","items":[{"name":"Club","category":"weapon","description":"HMK clubs; common. Printed page 100; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Clubs, printed p. 100","properties":{"quality":9,"heft":11,"length":"4","zoneDie":"d6","weightLb":3,"pricePence":12,"weaponClass":"common","verifiedModes":[{"name":"Primary","impactDie":"d6","impactModifier":1,"aspect":"b","zoneDie":"d6","length":"4"}],"variants":[{"name":"Improvised club","quality":8},{"name":"Crowbar","quality":11,"heft":13,"length":"4","zoneDie":"d6","impactDie":"d6","impactModifier":3,"aspect":"b","weightLb":4,"pricePence":9},{"name":"Large crafted club","quality":9,"heft":14,"length":"5","zoneDie":"d6","impactDie":"d6","impactModifier":2,"aspect":"b","weightLb":5,"pricePence":18}]}},{"name":"Mace","category":"weapon","description":"HMK clubs; chivalric. Printed page 100; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Clubs, printed p. 100","properties":{"quality":12,"heft":13,"length":"4","zoneDie":"d6","weightLb":4,"pricePence":108,"weaponClass":"chivalric","verifiedModes":[{"name":"Primary","impactDie":"d6","impactModifier":4,"aspect":"b","zoneDie":"d6","length":"4"}],"defenceModifier":-5,"variants":[{"name":"Wooden shaft","quality":11,"heft":11,"impactDie":"d6","impactModifier":3,"aspect":"b","weightLb":3,"pricePence":84}]}},{"name":"Maul","category":"weapon","description":"HMK clubs; simple • common. Printed page 100; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Clubs, printed p. 100","properties":{"quality":12,"heft":18,"length":"5","zoneDie":"d6","weightLb":7,"pricePence":96,"weaponClass":"simple • common","verifiedModes":[{"name":"Primary","impactDie":"d6","impactModifier":6,"aspect":"b","zoneDie":"d6","length":"5"}],"defenceModifier":-15,"variants":[{"name":"Wooden head","quality":10,"heft":17,"impactDie":"d6","impactModifier":5,"aspect":"b","weightLb":9,"pricePence":24}]}},{"name":"Morningstar","category":"weapon","description":"HMK clubs; simple. Printed page 100; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Clubs, printed p. 100","properties":{"quality":11,"heft":15,"length":"5","zoneDie":"d6","weightLb":5,"pricePence":48,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":4,"aspect":"p","zoneDie":"d6","length":"5"}],"armourReduction":{"p":1},"defenceModifier":-10,"impactTAModifier":{"p":3}}},{"name":"Stick","category":"weapon","description":"HMK clubs; common. Printed page 100; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Clubs, printed p. 100","properties":{"quality":8,"heft":9,"length":"3","zoneDie":"d6","weightLb":1,"pricePence":6,"weaponClass":"common","verifiedModes":[{"name":"Primary","impactDie":"d6","impactModifier":0,"aspect":"b","zoneDie":"d6","length":"3"}]}}]};
const HMK_FLAILS_P100_101={"format":"hmk-equipment-catalog-v1","items":[{"name":"Ball & Chain","category":"weapon","description":"HMK flails; chivalric. Printed page 100; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Flails, printed p. 100","properties":{"quality":12,"heft":14,"length":"5","zoneDie":"d6","weightLb":4,"pricePence":72,"weaponClass":"chivalric","verifiedModes":[{"name":"Primary","impactDie":"d6","impactModifier":5,"aspect":"b","zoneDie":"d6","length":"5"}],"defenceModifier":-10,"opponentDefenceModifier":-10}},{"name":"Grainflail","category":"weapon","description":"HMK flails; common. Printed page 100; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Flails, printed p. 100","properties":{"quality":9,"heft":11,"length":"5","zoneDie":"d6","weightLb":3,"pricePence":16,"weaponClass":"common","verifiedModes":[{"name":"Primary","impactDie":"d6","impactModifier":2,"aspect":"b","zoneDie":"d6","length":"5"}],"defenceModifier":-10,"opponentDefenceModifier":-10}},{"name":"Warflail","category":"weapon","description":"HMK flails; simple. Printed page 101; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Flails, printed p. 101","properties":{"quality":11,"heft":17,"length":"6","zoneDie":"d6","weightLb":5,"pricePence":60,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d6","impactModifier":6,"aspect":"b","zoneDie":"d6","length":"6"}],"defenceModifier":-10,"opponentDefenceModifier":-10}},{"name":"Whip","category":"weapon","description":"HMK flails; common. Printed page 101; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Flails, printed p. 101","properties":{"quality":9,"heft":9,"length":"8","zoneDie":"d8","weightLb":2,"pricePence":12,"weaponClass":"common","verifiedModes":[{"name":"Primary","impactDie":"d6","impactModifier":0,"aspect":"e","zoneDie":"d8","length":"8"}],"defenceModifier":-20,"entangle":true,"impactTAModifier":{"e":2},"long":true,"variants":[{"name":"Drover’s whip","heft":8,"length":"4","zoneDie":"d6","weightLb":1,"pricePence":6,"removeTrait":"long"},{"name":"Reksyni Isagâra","quality":10,"heft":10,"impactDie":"d8","impactModifier":1,"aspect":"e","impactTAModifier":{"e":4},"weightLb":3,"pricePence":24}]}}]};
const HMK_KNIVES_P101={"format":"hmk-equipment-catalog-v1","items":[{"name":"Dagger","category":"weapon","description":"HMK knives; simple. Printed page 101; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Knives, printed p. 101","properties":{"quality":11,"heft":7,"length":"3t","zoneDie":"d6","weightLb":1,"pricePence":24,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":2,"aspect":"p","zoneDie":"d6","length":"3t"}],"alternateStrikeModes":[{"name":"Edge","length":"3","impactDie":"d10","impactModifier":1,"aspect":"e"}]}},{"name":"Kéltan","category":"weapon","description":"HMK knives; simple. Printed page 101; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Knives, printed p. 101","properties":{"quality":12,"heft":7,"length":"3t","zoneDie":"d6","weightLb":2,"pricePence":36,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":1,"aspect":"p","zoneDie":"d6","length":"3t"}],"blockModifier":5,"impactTAModifier":{"p":3,"e":4},"alternateStrikeModes":[{"name":"Edge","length":"3","impactDie":"d10","impactModifier":0,"aspect":"e"}]}},{"name":"Knife","category":"weapon","description":"HMK knives; common. Printed page 101; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Knives, printed p. 101","properties":{"quality":10,"heft":6,"length":"2t","zoneDie":"d6","weightLb":1,"pricePence":6,"weaponClass":"common","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":1,"aspect":"p","zoneDie":"d6","length":"2t"}],"blockModifier":-10,"impactTAModifier":{"p":3,"e":4},"alternateStrikeModes":[{"name":"Edge","length":"2","impactDie":"d10","impactModifier":0,"aspect":"e"}]}},{"name":"Longknife","category":"weapon","description":"HMK knives; simple. Printed page 101; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Knives, printed p. 101","properties":{"quality":13,"heft":7,"length":"4t","zoneDie":"d6","weightLb":2,"pricePence":96,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":3,"aspect":"p","zoneDie":"d6","length":"4t"}],"blockModifier":5,"alternateStrikeModes":[{"name":"Edge","length":"4","impactDie":"d10","impactModifier":2,"aspect":"e"}],"possibleFaeriecraftMeleeBonus":5}},{"name":"Tabûri","category":"weapon","description":"HMK knives; simple. Printed page 101; primary table row.","source":"HârnMaster Kèthîra, Possessions / Weapons / Knives, printed p. 101","properties":{"quality":10,"heft":7,"length":"2t","zoneDie":"d6","weightLb":1,"pricePence":20,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":2,"aspect":"p","zoneDie":"d6","length":"2t"}],"baseRangeFt":30,"blockModifier":-10}}]};
const HMK_SWORDS_P105={"format":"hmk-equipment-catalog-v1","items":[{"name":"Bastard Sword","category":"weapon","description":"HMK swords; chivalric. Printed page 105.","source":"HârnMaster Kèthîra, Possessions / Weapons / Swords, printed p. 105","properties":{"quality":12,"heft":14,"length":"6|5","zoneDie":"d6","weightLb":5,"pricePence":184,"weaponClass":"chivalric","verifiedModes":[{"name":"Primary","impactDie":"d10","impactModifier":4,"aspect":"e","zoneDie":"d6","length":"6|5"}],"alternateStrikeModes":[{"name":"Thrust","impactDie":"d8","impactModifier":2,"aspect":"p"}]}},{"name":"Battlesword","category":"weapon","description":"HMK swords; chivalric. Printed page 105.","source":"HârnMaster Kèthîra, Possessions / Weapons / Swords, printed p. 105","properties":{"quality":13,"heft":18,"length":"6","zoneDie":"d6","weightLb":7,"pricePence":240,"weaponClass":"chivalric","verifiedModes":[{"name":"Primary","impactDie":"d10","impactModifier":5,"aspect":"e","zoneDie":"d6","length":"6"}],"alternateStrikeModes":[{"name":"Thrust","impactDie":"d8","impactModifier":2,"aspect":"p"}]}},{"name":"Broadsword","category":"weapon","description":"HMK swords; chivalric. Printed page 105.","source":"HârnMaster Kèthîra, Possessions / Weapons / Swords, printed p. 105","properties":{"quality":12,"heft":10,"length":"5","zoneDie":"d6","weightLb":3,"pricePence":156,"weaponClass":"chivalric","verifiedModes":[{"name":"Primary","impactDie":"d10","impactModifier":3,"aspect":"e","zoneDie":"d6","length":"5"}],"alternateStrikeModes":[{"name":"Thrust","impactDie":"d8","impactModifier":1,"aspect":"p"}]}},{"name":"Estoc","category":"weapon","description":"HMK swords; chivalric. Printed page 105.","source":"HârnMaster Kèthîra, Possessions / Weapons / Swords, printed p. 105","properties":{"quality":12,"heft":14,"length":"5t","zoneDie":"d6","weightLb":3,"pricePence":168,"weaponClass":"chivalric","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":3,"aspect":"p","zoneDie":"d6","length":"5t"}],"armourReduction":{"p":1},"armourReductionCondition":"two-handed","impactTAModifier":{"p":3},"halfSwordNoSharpEdge":true}},{"name":"Falchion","category":"weapon","description":"HMK swords; chivalric. Printed page 105.","source":"HârnMaster Kèthîra, Possessions / Weapons / Swords, printed p. 105","properties":{"quality":12,"heft":12,"length":"4","zoneDie":"d6","weightLb":3,"pricePence":120,"weaponClass":"chivalric","verifiedModes":[{"name":"Primary","impactDie":"d8","impactModifier":4,"aspect":"e","zoneDie":"d6","length":"4"}],"impactTAModifier":{"e":6}}},{"name":"Scimitar","category":"weapon","description":"HMK swords; simple. Printed page 105.","source":"HârnMaster Kèthîra, Possessions / Weapons / Swords, printed p. 105","properties":{"quality":12,"heft":10,"length":"5","zoneDie":"d6","weightLb":3,"pricePence":184,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d10","impactModifier":2,"aspect":"e","zoneDie":"d6","length":"5"}],"alternateStrikeModes":[{"name":"Thrust","impactDie":"d8","impactModifier":1,"aspect":"p"}],"impactTAModifier":{"e":6}}},{"name":"Shortsword","category":"weapon","description":"HMK swords; simple. Printed page 105.","source":"HârnMaster Kèthîra, Possessions / Weapons / Swords, printed p. 105","properties":{"quality":12,"heft":8,"length":"4","zoneDie":"d6","weightLb":2,"pricePence":96,"weaponClass":"simple","verifiedModes":[{"name":"Primary","impactDie":"d10","impactModifier":2,"aspect":"e","zoneDie":"d6","length":"4"}],"alternateStrikeModes":[{"name":"Thrust","impactDie":"d8","impactModifier":1,"aspect":"p"}]}}]};
const HMK_SHIELDS_P104={"format":"hmk-equipment-catalog-v1","items":[{"name":"Buckler","category":"shield","description":"HMK shields; common. Printed page 104.","source":"HârnMaster Kèthîra, Possessions / Weapons / Shields, printed p. 104","properties":{"quality":9,"heft":8,"length":"1","zoneDie":"d6","weightLb":3,"pricePence":30,"weaponClass":"common","shieldModifier":5,"deflect":1,"verifiedModes":[{"name":"Shield strike","impactDie":"d6","impactModifier":0,"aspect":"b","zoneDie":"d6","length":"1"}]}},{"name":"Kite Shield","category":"shield","description":"HMK shields; chivalric. Printed page 104.","source":"HârnMaster Kèthîra, Possessions / Weapons / Shields, printed p. 104","properties":{"quality":11,"heft":11,"length":"1","zoneDie":"d8","weightLb":7,"pricePence":72,"weaponClass":"chivalric","shieldModifier":15,"deflect":4,"verifiedModes":[{"name":"Shield strike","impactDie":"d6","impactModifier":1,"aspect":"b","zoneDie":"d8","length":"1"}]}},{"name":"Knight’s Shield","category":"shield","description":"HMK shields; chivalric. Printed page 104.","source":"HârnMaster Kèthîra, Possessions / Weapons / Shields, printed p. 104","properties":{"quality":11,"heft":10,"length":"1","zoneDie":"d6","weightLb":5,"pricePence":60,"weaponClass":"chivalric","shieldModifier":10,"deflect":3,"verifiedModes":[{"name":"Shield strike","impactDie":"d6","impactModifier":1,"aspect":"b","zoneDie":"d6","length":"1"}]}},{"name":"Roundshield","category":"shield","description":"HMK shields; simple. Printed page 104.","source":"HârnMaster Kèthîra, Possessions / Weapons / Shields, printed p. 104","properties":{"quality":10,"heft":10,"length":"1","zoneDie":"d6","weightLb":6,"pricePence":48,"weaponClass":"simple","shieldModifier":10,"deflect":3,"verifiedModes":[{"name":"Shield strike","impactDie":"d6","impactModifier":1,"aspect":"b","zoneDie":"d6","length":"1"}]}},{"name":"Tower Shield","category":"shield","description":"HMK shields; simple. Printed page 104.","source":"HârnMaster Kèthîra, Possessions / Weapons / Shields, printed p. 104","properties":{"quality":11,"heft":12,"length":"1","zoneDie":"d8","weightLb":8,"pricePence":96,"weaponClass":"simple","shieldModifier":20,"deflect":5,"verifiedModes":[{"name":"Shield strike","impactDie":"d6","impactModifier":1,"aspect":"b","zoneDie":"d8","length":"1"}]}}]};
// Immutable starter armour articles from printed HMK p118; material AV p117.
const HMK_ARMOUR_ARTICLES_P118=[{"id":"hmk:armour:p118:cloth-cap","name":"Cloth Cap","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"C","pricePence":4,"weightLb":0.2,"coveredLocations":["sk"],"locationProtection":{"sk":{"b":0,"e":1,"p":0,"f":1}},"coverageNote":"Location codes from p.118; layering, Bulk, ENC and armour totals not calculated."}},{"id":"hmk:armour:p118:leather-cap","name":"Leather Cap","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"L","pricePence":16,"weightLb":0.6,"coveredLocations":["sk"],"locationProtection":{"sk":{"b":1,"e":2,"p":1,"f":3}},"coverageNote":"Location codes from p.118; layering, Bulk, ENC and armour totals not calculated."}},{"id":"hmk:armour:p118:padded-cap","name":"Padded Cap","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"D","pricePence":8,"weightLb":0.3,"coveredLocations":["sk"],"locationProtection":{"sk":{"b":2,"e":2,"p":1,"f":2}},"coverageNote":"Location codes from p.118; layering, Bulk, ENC and armour totals not calculated."}},{"id":"hmk:armour:p118:plate-helm","name":"Plate Helm","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"P","pricePence":80,"weightLb":3.0,"coveredLocations":["sk"],"locationProtection":{"sk":{"b":6,"e":11,"p":9,"f":5}},"coverageNote":"Location codes from p.118; layering, Bulk, ENC and armour totals not calculated."}},{"id":"hmk:armour:p118:leather-shoes","name":"Leather Shoes","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"L","pricePence":28,"weightLb":1.1,"coveredLocations":["ft"],"locationProtection":{"ft":{"b":1,"e":2,"p":1,"f":3}},"coverageNote":"Location codes from p.118; layering, Bulk, ENC and armour totals not calculated."}}];
// Further verified armour articles (printed HMK p.118).
const HMK_ARMOUR_ARTICLES_P118_MORE=[{"id":"hmk:armour:p118:leather-bracers","name":"Leather Bracers","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"L","pricePence":20,"weightLb":0.8,"coveredLocations":["fo"],"locationProtection":{"fo":{"b":1,"e":2,"p":1,"f":3}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:leather-gauntlets","name":"Leather Gauntlets","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"L","pricePence":20,"weightLb":0.8,"coveredLocations":["ha"],"locationProtection":{"ha":{"b":1,"e":2,"p":1,"f":3}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:leather-vest","name":"Leather Vest","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"L","pricePence":96,"weightLb":3.6,"coveredLocations":["tx","ab"],"locationProtection":{"tx":{"b":1,"e":2,"p":1,"f":3},"ab":{"b":1,"e":2,"p":1,"f":3}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:padded-mittens","name":"Padded Mittens","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"D","pricePence":10,"weightLb":0.4,"coveredLocations":["ha"],"locationProtection":{"ha":{"b":2,"e":2,"p":1,"f":2}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:padded-vest","name":"Padded Vest","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"D","pricePence":48,"weightLb":1.9,"coveredLocations":["tx","ab"],"locationProtection":{"tx":{"b":2,"e":2,"p":1,"f":2},"ab":{"b":2,"e":2,"p":1,"f":2}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:mail-cowl","name":"Mail Cowl","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"M","pricePence":90,"weightLb":2.7,"coveredLocations":["sk","nk"],"locationProtection":{"sk":{"b":2,"e":8,"p":7,"f":3},"nk":{"b":2,"e":8,"p":7,"f":3}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:mail-mittens","name":"Mail Mittens","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"M","pricePence":75,"weightLb":2.3,"coveredLocations":["ha"],"locationProtection":{"ha":{"b":2,"e":8,"p":7,"f":3}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:mail-vest","name":"Mail Vest","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"M","pricePence":360,"weightLb":10.8,"coveredLocations":["tx","ab"],"locationProtection":{"tx":{"b":2,"e":8,"p":7,"f":3},"ab":{"b":2,"e":8,"p":7,"f":3}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:plate-great-helm","name":"Plate Great Helm","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"P","pricePence":180,"weightLb":6.8,"coveredLocations":["sk","fa","nk"],"locationProtection":{"sk":{"b":6,"e":11,"p":9,"f":5},"fa":{"b":6,"e":11,"p":9,"f":5},"nk":{"b":6,"e":11,"p":9,"f":5}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:plate-breastplate","name":"Plate Breastplate","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"P","pricePence":240,"weightLb":4.5,"coveredLocations":["tx","ab"],"locationProtection":{"tx":{"b":6,"e":11,"p":9,"f":5},"ab":{"b":6,"e":11,"p":9,"f":5}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:plate-greaves","name":"Plate Greaves","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"P","pricePence":240,"weightLb":4.6,"coveredLocations":["ca"],"locationProtection":{"ca":{"b":6,"e":11,"p":9,"f":5}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:plate-kneecops","name":"Plate Kneecops","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"P","pricePence":60,"weightLb":1.1,"coveredLocations":["kn"],"locationProtection":{"kn":{"b":6,"e":11,"p":9,"f":5}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:plate-spaulders","name":"Plate Spaulders","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"P","pricePence":60,"weightLb":1.1,"coveredLocations":["sh"],"locationProtection":{"sh":{"b":6,"e":11,"p":9,"f":5}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:plate-vambraces","name":"Plate Vambraces","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"P","pricePence":100,"weightLb":1.9,"coveredLocations":["fo"],"locationProtection":{"fo":{"b":6,"e":11,"p":9,"f":5}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:plate-rerebraces","name":"Plate Rerebraces","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"P","pricePence":160,"weightLb":3.0,"coveredLocations":["ua"],"locationProtection":{"ua":{"b":6,"e":11,"p":9,"f":5}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}},{"id":"hmk:armour:p118:plate-coudes","name":"Plate Coudes","category":"armor","description":"HMK Armour & Clothing Articles; fixed reference definition.","source":"HârnMaster Kèthîra, Armour & Clothing Articles, printed p. 118; material AV printed p. 117","properties":{"material":"P","pricePence":40,"weightLb":0.8,"coveredLocations":["el"],"locationProtection":{"el":{"b":6,"e":11,"p":9,"f":5}},"coverageNote":"Anatomical dots from p.118; rigid coverage, ENC, layering and suit totals not calculated."}}];
// Resolve legacy built-in armour IDs against the independently audited p.118 source.
// Keep the IDs and existing inventory snapshots unchanged; no implicit migration.
const ARMOUR_MATERIAL_NAMES=Object.freeze({C:'cloth',L:'leather',D:'padded',Q:'quilted',G:'gambeson',K:'kurbul',S:'scale',M:'mail',P:'plate'});
function withArmourAnnotations(entry){
 const legacy=structuredClone(entry);
 const material=ARMOUR_MATERIAL_NAMES[legacy.properties?.material]||String(legacy.properties?.material||'').toLowerCase();
 const articleName=String(legacy.name||'').replace(/^(Cloth|Leather|Padded|Quilted|Gambeson|Kurbul|Kûrbúl|Scale|Mail|Plate)\s+/i,'').trim().toLowerCase();
 const matches=PRINTED_ARMOUR_ARTICLES_P118.filter(a=>a.material===material&&a.name.toLowerCase()===articleName);
 if(matches.length!==1){
  // Unverified legacy entries must not be silently assigned a fabricated ENC 0.
  return deepFreeze({...legacy,properties:{...legacy.properties,encumbrance:null,armourReferenceStatus:'unresolved'},builtin:true});
 }
 const ref=matches[0];
 const {encumbrance:_oldEnc,perceptionPenalty:_oldPerception,armArticleEncGroup:_oldArm,printedEncCode:_oldCode,...other}=legacy.properties;
 return deepFreeze({...legacy,properties:{...other,
  encumbrance:typeof ref.enc==='number'?ref.enc:null,printedEncCode:ref.enc,
  ...(ref.enc==='a'?{armArticleEncGroup:true}:{}),
  ...(ref.enc==='p'?{perceptionPenalty:-ref.perceptionPenalty}:{}),
  coveredLocations:[...ref.coveredLocations],bodyZones:[...ref.bodyZones],layerZoneByLocation:{...ref.layerZoneByLocation},
  armourReferenceStatus:'matched-p118'},builtin:true});
}
// Rules definitions are bundled with the application, never written into localStorage.
// Stable IDs are version-independent; user-owned items remain snapshots with independent WQ.
const BUILTIN_ITEMS=Object.freeze([
 ...HMK_AXES_P99.items.map((entry,index)=>deepFreeze({...structuredClone(entry),id:'hmk:axes:p99:'+String(index+1).padStart(2,'0'),builtin:true})),
 ...HMK_POLEARMS_P102.items.map((entry,index)=>deepFreeze({...structuredClone(entry),id:'hmk:polearms:p102:'+String(index+1).padStart(2,'0'),builtin:true})),
 ...HMK_CLUBS_P100.items.map((entry,index)=>deepFreeze({...structuredClone(entry),id:'hmk:clubs:p100:'+String(index+1).padStart(2,'0'),builtin:true})),
 ...HMK_FLAILS_P100_101.items.map((entry,index)=>deepFreeze({...structuredClone(entry),id:'hmk:flails:p100-101:'+String(index+1).padStart(2,'0'),builtin:true})),
 ...HMK_KNIVES_P101.items.map((entry,index)=>deepFreeze({...structuredClone(entry),id:'hmk:knives:p101:'+String(index+1).padStart(2,'0'),builtin:true})),
 ...HMK_SWORDS_P105.items.map((entry,index)=>deepFreeze({...structuredClone(entry),id:'hmk:swords:p105:'+String(index+1).padStart(2,'0'),builtin:true})),
 ...HMK_SHIELDS_P104.items.map((entry,index)=>deepFreeze({...structuredClone(entry),id:'hmk:shields:p104:'+String(index+1).padStart(2,'0'),builtin:true})),
 ...HMK_ARMOUR_ARTICLES_P118.map(withArmourAnnotations),
 ...HMK_ARMOUR_ARTICLES_P118_MORE.map(withArmourAnnotations)
]);
function deepFreeze(obj){if(obj&&typeof obj==='object'){Object.values(obj).forEach(deepFreeze);Object.freeze(obj)}return obj}
const PRINTED_ARMOUR_CATALOG_ADDITIONS=Object.freeze(missingPrintedArmourCatalogEntries(BUILTIN_ITEMS));
function allCatalogItems(){return [...BUILTIN_ITEMS,...PRINTED_ARMOUR_CATALOG_ADDITIONS,...data.items]}
function findCatalogItem(id){return BUILTIN_ITEMS.find(i=>i.id===id)||PRINTED_ARMOUR_CATALOG_ADDITIONS.find(i=>i.id===id)||data.items.find(i=>i.id===id)}
function isKnownCatalogId(id){return !!findCatalogItem(id)}
// Immutable armour MATERIAL reference (printed p.117). This is not an equipable article.
// AV order is b=blunt, e=edge, p=point, f=fire/frost per the HMK table.
const HMK_ARMOUR_MATERIALS=Object.freeze([
 ['C','Cloth',0,1,0,1],['L','Leather',1,2,1,3],
 ['D','Padded',2,2,1,2],['Q','Quilted',4,3,2,3],
 ['G','Gambeson',6,5,4,5],['K','Kûrbúl',4,6,5,4],
 ['S','Scale',4,8,5,5],['M','Mail',2,8,7,3],
 ['P','Plate',6,11,9,5]
].map(([code,name,b,e,p,f])=>Object.freeze({code,name,b,e,p,f})));
function armourLayerReferencePanel(){return `<section class="panel wide"><h3>HMK · povolené vrstvy (referenční tabulka, str. 117)</h3><p class="muted">Doslovné kódy sloupců tabulky Armour Layers. Nejde o automatické schválení kombinace: rozhoduje i anatomické pokrytí, pořadí, typ oděvu a výjimky.</p><div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Materiál</th><th>Pod 2</th><th>Pod 1</th><th>Základ</th><th>Nad 1</th><th>Nad 2</th></tr></thead><tbody>${ARMOUR_LAYER_COLUMNS.map(x=>`<tr><td>${esc(x.code)}</td><td>${esc(x.underFar)}</td><td>${esc(x.underNear)}</td><td>${esc(x.base)}</td><td>${esc(x.overNear)}</td><td>${esc(x.overFar)}</td></tr>`).join('')}</tbody></table></div><p class="muted">${esc(ARMOUR_LAYER_NOTES.join(' · '))}</p></section>`;}
function armourMaterialsPanel(){return `<section class="panel" aria-label="Referenční hodnoty materiálů zbroje"><h3>HMK · ochranné hodnoty materiálů zbroje</h3><p class="muted">Pevná referenční tabulka podle Armour Articles, tištěná strana 117. Hodnoty AV pro b (blunt), e (edge), p (point), f (fire/frost). Nejde o konkrétní kusy zbroje: jejich anatomické pokrytí, vrstvení a ENC se musí vyhodnotit zvlášť.</p><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;text-align:left"><thead><tr><th>Materiál</th><th>Kód</th><th>b</th><th>e</th><th>p</th><th>f</th></tr></thead><tbody>${HMK_ARMOUR_MATERIALS.map(m=>`<tr><td>${esc(m.name)}</td><td>${m.code}</td><td>${m.b}</td><td>${m.e}</td><td>${m.p}</td><td>${m.f}</td></tr>`).join('')}</tbody></table></div><p class="tiny">Tyto hodnoty se nezapisují do localStorage a zatím se automaticky nepřičítají k ochraně postavy. U 21 vestavěných kusů zbroje je nově evidováno ENC podle tabulky str. 118 (včetně podmínky pro tři a více plátových dílů paží a postihu vnímání u Great Helm). Výpočet vrstvení, ENC a Bulk se nyní provádí z aktuálního inventáře; u tištěných kompletů je nutné potvrzení GM.</p></section>`}
// v49: Human-readable rule data; never expose raw JSON or internal object keys.
// The source objects remain untouched for the future combat engine.
function catalogParameters(item){
 const p=item.properties||{};
 const labels={quality:'Základní WQ',heft:'Heft',length:'Délka',zoneDie:'Kostka zóny',weightLb:'Hmotnost (lb)',pricePence:'Cena (d)',weaponClass:'Třída zbraně',defenceModifier:'Obranný modifikátor',impactTAModifier:'Modifikátor Impact TA',shieldModifier:'Modifikátor štítu',deflect:'Odklonění (Deflect)',material:'Materiál',encumbrance:'ENC',perceptionPenalty:'Postih vnímání',armArticleEncGroup:'Skupina podmíněného ENC',coverage:'Pokryté lokace',protection:'Ochrana',baseRangeFt:'Základní dostřel (ft)',traits:'Vlastnosti',notes:'Poznámky',use:'Použití',value:'Hodnota',defense:'Obrana',attack:'Útok',impact:'Impact',layers:'Vrstvy',alternateStrikeModes:'Alternativní útoky',verifiedModes:'Útočné režimy',verifiedTraits:'Ověřené vlastnosti',armourReduction:'Snížení ochrany zbroje',armourReductionCondition:'Podmínka snížení ochrany',blockModifier:'Modifikátor blokování',opponentDefenceModifier:'Modifikátor obrany protivníka',shieldDamageImpactBonus:'Bonus Impact proti štítu',possibleFaeriecraftMeleeBonus:'Možný bonus Faeriecraft v boji',slowOneHand:'Pomalé použití jednou rukou',halfSwordNoSharpEdge:'Poloviční meč bez ostrého ostří',tripUsesWeaponLength:'Podražení využívá délku zbraně',coveredLocations:'Pokryté anatomické lokace',coverageNote:'Poznámka k pokrytí',variants:'Varianty',couched:'Založená kopí (couched)',entangle:'Zapletení / zachycení',slow:'Pomalá zbraň',removeTrait:'Odebraná vlastnost',locationProtection:'Ochrana anatomických lokací',b:'Blunt',e:'Edge',p:'Point',f:'Fire/Frost',B:'Blunt',E:'Edge',P:'Point',F:'Fire/Frost',impactDie:'Kostka Impact',impactModifier:'Modifikátor Impact',aspect:'Typ poškození',name:'Název',modifier:'Modifikátor'};
 const human=v=>v===null||v===undefined?'—':typeof v==='boolean'?(v?'Ano':'Ne'):String(v);
 const niceKey=k=>labels[k]||String(k).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
 const table=(headers,rows)=>`<div class="catalog-scroll"><table class="catalog-spec"><thead><tr>${headers.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(human(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 const modeText=m=>String(m.impactDie||'—')+(Number.isFinite(m.impactModifier)?(m.impactModifier>=0?'+':'')+m.impactModifier:'');
 const primary=Array.isArray(p.verifiedModes)?p.verifiedModes:[];
 const alternate=Array.isArray(p.alternateStrikeModes)?p.alternateStrikeModes:[];
 const modes=[...primary.map(m=>({...m,displayName:m.name==='Primary'?'Základní útok':m.name||'Základní útok'})),...alternate.map(m=>({...m,displayName:m.name||'Alternativní útok'}))];
 const modeTable=modes.length?`<h4>Útočné režimy</h4>${table(['Režim','Impact','Typ','Zóna','Délka','Další vlastnosti'],modes.map(m=>[m.displayName,modeText(m),({b:'Blunt',e:'Edge',p:'Point',f:'Fire/Frost'})[m.aspect]||m.aspect||'—',m.zoneDie||p.zoneDie||'—',m.length||p.length||'—',Object.entries(m).filter(([k])=>!['name','displayName','impactDie','impactModifier','aspect','zoneDie','length'].includes(k)).map(([k,v])=>niceKey(k)+': '+(v&&typeof v==='object'?'viz podrobnosti':human(v))).join('; ')||'—']))}`:'';
 const protection=p.locationProtection;
 const locRows=protection&&typeof protection==='object'&&!Array.isArray(protection)?Object.entries(protection).filter(([,v])=>v&&typeof v==='object'&&!Array.isArray(v)).map(([loc,v])=>[loc,v.b??v.B??'—',v.e??v.E??'—',v.p??v.P??'—',v.f??v.F??'—']):[];
 const locTable=locRows.length?`<h4>Ochrana anatomických lokací</h4>${table(['Lokace','Blunt','Edge','Point','Fire/Frost'],locRows)}`:'';
 const scalar=Object.entries(p).filter(([,v])=>v!==null&&v!==undefined&&typeof v!=='object');
 const scalarTable=scalar.length?table(['Parametr','Hodnota'],scalar.map(([k,v])=>[niceKey(k),v])):'';
 // Recursive structured-data renderer for custom equipment: text and tables only.
 // Bound depth avoids infinite recursion for malformed user-provided objects.
 const describe=(v,depth=0)=>{
  if(depth>7)return '<span class="muted">Příliš hluboká struktura – podrobnosti nejsou zobrazeny.</span>';
  if(v===null||typeof v!=='object')return `<span>${esc(human(v))}</span>`;
  if(Array.isArray(v)){
   if(!v.length)return '<span class="muted">Bez záznamů</span>';
   return `<ol class="catalog-data-list">${v.map(x=>`<li>${describe(x,depth+1)}</li>`).join('')}</ol>`;
  }
  const entries=Object.entries(v);
  if(!entries.length)return '<span class="muted">Bez údajů</span>';
  if(entries.every(([,x])=>x===null||typeof x!=='object'))return table(['Parametr','Hodnota'],entries.map(([k,x])=>[niceKey(k),human(x)]));
  return `<div class="catalog-data-nested">${entries.map(([k,x])=>`<div class="catalog-complex"><strong>${esc(niceKey(k))}</strong>${describe(x,depth+1)}</div>`).join('')}</div>`;
 };
 const skipped=new Set(['verifiedModes','alternateStrikeModes','locationProtection']);
 const complex=Object.entries(p).filter(([k,v])=>!skipped.has(k)&&v!==null&&typeof v==='object');
 const extras=complex.length?`<h4>Další vlastnosti a pravidla</h4>${complex.map(([k,v])=>`<div class="catalog-complex"><strong>${esc(niceKey(k))}</strong>${describe(v)}</div>`).join('')}`:'';
 const remainingProtection=protection!==undefined&&!locRows.length?`<h4>Ochrana</h4>${describe(protection)}`:'';
 const categoryLabel={weapon:'Zbraň',shield:'Štít',armor:'Zbroj',other:'Ostatní předmět'}[item.category]||'Předmět';
 const noData=!Object.keys(p).length?'<p class="muted">U této položky zatím nejsou evidovány parametry.</p>':'';
 return `<details class="catalog-parameters"><summary>⚙ Zobrazit parametry · ${esc(categoryLabel)}</summary><div class="catalog-parameters-inner">${scalarTable}${modeTable}${locTable}${extras}${remainingProtection}${noData}<p class="tiny muted">Zobrazeny jsou pouze evidované údaje, nikoliv vypočtené výsledky boje. Chybějící hodnoty se nedoplňují odhadem.</p></div></details>`;
}
function armourLibraryConsistencyPanel(){
 const a=auditArmourLibraryConsistency();
 return `<section class="panel wide" id="armour-consistency"><h3>Kontrola konzistence knihovny zbroje</h3><p><strong>${a.ok?'Strukturální kontrola prošla':'Nalezeny strukturální nesrovnalosti'}</strong> · ${a.suits} kompletů · ${a.articles} katalogových součástí · ${a.matchedParts}/${a.totalParts} propojených součástí · ${a.cells} polí B/E/P/F · ${a.rigidCells} rigidních příznaků.</p>${a.errors.length?`<details><summary>Chyby (${a.errors.length})</summary><ul>${a.errors.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:''}<p class="tiny muted">Strukturální kontrola dat a zobrazovacího API; neověřuje nezávisle originální PDF ani funkčnost prohlížeče. Tištěné matice kompletů jsou samostatná autorita a nesčítají se automaticky z katalogových součástí.</p></section>`;
}
function unifiedPrintedSuitsPanel(){
 const modes=new Map(suitLibraryModes().map(x=>[x.name,x]));
 return `<section class="panel wide" id="hmk-printed-suits"><h3>HMK · 12 originálních kompletů zbroje (str. 113–116)</h3><p class="muted">Jediná referenční tabulka převzatá z originálních kompletů. Tři přesné, nezměněné sestavy ze str. 116 mají výjimku pouze z přísné kontroly vrstvení v této aplikaci; nejde o výslovné pravidlo HMK. Upravené sestavy výjimku ztrácejí. Tištěné hodnoty ENC a ochrany se nepřepočítávají; Bulk není automaticky nulový. Tato tabulka neobléká postavu ani nepotvrzuje bojovou připravenost.</p><div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Komplet</th><th>Str.</th><th>Cena (d)</th><th>ENC</th><th>PER</th><th>Area</th><th>lb</th><th>Pravidlo vrstev</th><th>Součásti podle PDF</th></tr></thead><tbody>${PRINTED_ARMOUR_SUITS_P113_116.map(s=>{const m=modes.get(s.name);return `<tr><td>${esc(s.name)}</td><td>${s.page}</td><td>${s.price}</td><td>${s.enc}</td><td>${s.per}</td><td>${esc(s.area)}</td><td>${s.weightLb}</td><td>${m?.exception?'Přesný originál: výjimka aplikace':'Standardní diagnostika; pořadí neověřeno'}</td><td>${s.articles.map(esc).join(', ')}</td></tr>`}).join('')}</tbody></table></div><p class="tiny muted">Zdrojem je tištěná sestava, nikoli výpočet nově sestavené zbroje. Diagnostické konflikty jednotlivých článků nejsou chybou tištěného kompletu. Žádný záznam neuděluje automaticky nulový Bulk.</p></section>`;
}
function printedArmourArticlesPanel(){
 const markerLabel={standard:'● kryje',rigid:'▣ rigidní', 'front-only':'▣🔴 rigidní, pouze zepředu','rear-only':'🔴 pouze zezadu'};
 const encLabel=a=>a.enc==='a'?'Ⓐ podmíněné ENC (3+ články)':a.enc==='p'?`Ⓟ postih vnímání −${a.perceptionPenalty??'?'} (dle položky)`:String(a.enc);
 const markers=a=>Object.entries(a.coverageMarkers||{}).map(([loc,code])=>`${esc(loc)}: ${esc(markerLabel[code]||code)}`).join(' · ');
 const zones=a=>Object.entries(a.layerZoneByLocation||{}).map(([loc,zone])=>`${esc(loc)} → ${esc(zone)}`).join(' · ');
 return `<section class="panel wide"><h3>HMK · jednotlivé části zbroje a oděvu (str. 118)</h3><p class="muted">Značky podle tištěné tabulky: Ⓐ podmíněné ENC při třech či více příslušných částech; Ⓟ postih vnímání (hodnota dle položky); ▣ rigidní ochrana konkrétní lokace; 🔴 bez čtverečku chrání pouze zezadu, ▣🔴 chrání pouze zepředu. Uvedené značky jsou evidenční údaje, nikoli potvrzení automatického uplatnění v Combat.</p><div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Materiál</th><th>Položka</th><th>Cena (d)</th><th>Hmotnost (lb)</th><th>ENC / zvláštní pravidlo</th><th>Pokrytí a značky lokací</th><th>Body Zone dle lokace</th><th>Směr</th></tr></thead><tbody>${PRINTED_ARMOUR_ARTICLES_P118.map(a=>`<tr><td>${esc(a.material)}</td><td>${esc(a.name)}</td><td>${a.priceD}</td><td>${a.weightLb}</td><td>${esc(encLabel(a))}</td><td>${markers(a)}</td><td>${zones(a)}</td><td>${esc(a.directionRestriction||'none')}</td></tr>`).join('')}</tbody></table></div><p class="tiny muted">Údaje o pokrytí jsou referenční. Automatické vrstvení, podmíněné ENC, rigidita podle konkrétního zásahu a směrová ochrana nejsou dosud plně napojeny na výpočet Combat.</p></section>`;
}
function expeditionEffectsPanel(){return `<section class="panel wide"><h3>HMK · Expedition Equipment: pravidlové účinky (str. 120)</h3><p class="muted">Zdrojově podložená strojově čitelná pravidla. Nejde o automatické provádění akcí postav. Účinky nejsou připojené k Character Sheet ani Combat.</p><div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Předmět</th><th>Typ</th><th>Údaje pravidla (ověřitelný záznam)</th></tr></thead><tbody>${EXPEDITION_EFFECTS_P120.map(x=>`<tr><td>${esc(x.item)}</td><td>${esc(x.kind)}</td><td>${esc(Object.entries(x).filter(([k])=>k!=='item'&&k!=='kind').map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v}`).join(' · '))}</td></tr>`).join('')}</tbody></table></div><p class="tiny muted">Zdrojem je tištěná str. 120. U spánku s bedrollem zde není domyšlená hodnota regenerace; pravidlo pouze odstraňuje dodatečný END SR. Nejsou započteny efekty nevyjmenované v tištěném textu.</p></section>`;}
function printedGearRulesPanel(){
 const sample=calculateGearLoad([{id:'backpack',weightLb:4},{id:'contents',weightLb:20,stowage:'backpack'},{id:'hook',weightLb:4,stowage:'awkward'}]);
 return `<section class="panel wide"><h3>HMK · Gear Encumbrance (str. 120, 122)</h3><p>Za každých dokončených 20 lb efektivní hmotnosti výbavy vzniká 5 ENC. Nepohodlně nesená výbava se počítá dvojnásobně. Obsah správně sbaleného batohu do 30 lb se počítá poloviční hmotností; hmotnost samotného batohu se nesnižuje. Nošená zbroj se počítá jako zbroj, odložená zbroj jako výbava.</p><p><strong>Kontrolní příklad:</strong> batoh 4 lb + obsah 20 lb + nepohodlně nesený hák 4 lb → ${sample.physicalLb} lb skutečně, ${sample.effectiveLb} lb efektivně, ENC ${sample.gearENC}.</p><p><strong>Odložená zbroj:</strong> 10 + 2 × neupravené ENC; oděv ${estimatedStowedSuitWeight(0,{clothing:'normal'})} lb, těžký oděv ${estimatedStowedSuitWeight(0,{clothing:'heavy'})} lb. <strong>Zvířata:</strong> kůň/skot ${mountLoadENC(20,{kind:'horse'})} ENC / 20 lb, velbloud ${mountLoadENC(40,{kind:'camel'})} ENC / 40 lb, slon ${mountLoadENC(80,{kind:'elephant'})} ENC / 80 lb.</p><p class="tiny muted">Výpočet je nyní propojen s inventářem i Melee EML; neznámou hmotnost nelze automaticky dosadit. Obsah batohu a způsob nesení nastavíte u každé položky.</p></section>`;
}
function workshopMechanicsPanel(){
 const ordinary=[4,5,6,7,12,13,16,17].map(w=>`${w} → Q${workshopQuality(w).quality}`).join(' · ');
 const alchemy=[9,10,12,13,16,17,19,20,29,30].map(w=>`${w} → ${workshopQuality(w,{alchemy:true})?.quality??'—'}`).join(' · ');
 return `<section class="panel wide"><h3>HMK · Craft Workshops (str. 51, 121) – pravidlové vyhodnocení</h3><p>Postava s ML alespoň 50 v příslušné řemeslné dovednosti má podle str. 51 dílnu odpovídající Wealth. Výjimka: Alchemy používá vlastní vyšší Wealth hranice. Toto je referenční kalkulace bez zásahu do postav.</p><p><strong>Dovednosti vyžadující dílnu:</strong> ${WORKSHOP_SKILLS_P121.map(esc).join(' · ')}</p><p><strong>Běžné dílny, kontrolní hranice:</strong> ${ordinary}</p><p><strong>Alchemy, kontrolní hranice:</strong> ${alchemy} (nižší Wealth než 10 není v tabulce definován).</p><p><strong>Voda:</strong> ${waterWeightLb(1)} lb / gallon; ½ gallon = ${waterWeightLb(.5)} lb. <strong>Oheň:</strong> FS 1, plná expozice ${esc(mundaneFireImpact(1).dice)} + ${mundaneFireImpact(1).flatImpact}f, krátká expozice ${esc(mundaneFireImpact(1,{shortExposure:true}).dice)} + ${mundaneFireImpact(1,{shortExposure:true}).flatImpact}f; za dostatku suchého paliva +1 FS za 30 sekund (6 kol).</p><p class="tiny muted">Zdroj: HMK tištěné str. 51 a 121. Dílna neznamená automatický úspěch výroby; chybějící hodnota pro Alchemy Wealth pod 10 se nedopočítává. Oheň nad FS 4 se neextrapoluje. Kouř v uzavřeném prostoru odkazuje na Asphyxia (str. 183), zde bez automatického vyhodnocení.</p></section>`;
}
function printedPossessionsPanel(){const table=(title,rows)=>`<h4>${title} (${rows.length} položek)</h4><div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Předmět</th><th>Zdroj / dovednost</th><th>lb</th><th>Cena v originálu</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.skill)}</td><td>${x.weightLb}</td><td>${esc(x.pricePrinted)}</td></tr>`).join('')}</tbody></table></div>`;return `<section class="panel wide"><h3>HMK · Gear & Craft Items (str. 120–121)</h3><p class="muted">Strukturovaný přepis tištěných tabulek. Ceny včetně zvláštních symbolů zůstávají ve zdrojovém zápisu; pravidlové účinky zatím nejsou automaticky zapojeny do inventáře.</p>${table('Expedition Equipment · str. 120',EXPEDITION_EQUIPMENT_P120)}${table('Craft Items & Tools · str. 121',CRAFT_ITEMS_TOOLS_P121)}<h4>Beasts · str. 122 (${BEASTS_P122.length})</h4><div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Beast</th><th>Max MB</th><th>Price (d)</th></tr></thead><tbody>${BEASTS_P122.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.maxMasteryBoosts}</td><td>${x.priceD}d</td></tr>`).join('')}</tbody></table></div><h4>Vehicles &amp; Tack · str. 122 (${VEHICLES_TACK_P122.length})</h4><div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Item</th><th>Skill</th><th>lb</th><th>Price (d)</th></tr></thead><tbody>${VEHICLES_TACK_P122.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.skill)}</td><td>${x.weightLb}</td><td>${x.priceD}d</td></tr>`).join('')}</tbody></table></div><p class="tiny muted">Str. 122: horse/bovine +5 ENC per 20 full lb; camel per 40 lb; elephant per 80 lb. Training prices per MB: dog 12d, hawk 60d, horse/camel 80d, elephant 240d. Source reference only; mount fatigue, riding and hauling are not automatically executed.</p><h4>Workshops · str. 121</h4><div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Quality</th><th>State</th><th>Wealth</th><th>Alchemy Wealth</th></tr></thead><tbody>${WORKSHOP_QUALITY_P121.map(x=>`<tr><td>${x.quality}</td><td>${esc(x.state)}</td><td>${esc(x.wealth)}</td><td>${esc(x.alchemyWealth)}</td></tr>`).join('')}</tbody></table></div><h4>Water weight by volume</h4><p>${WATER_WEIGHT_P121.map(x=>`${esc(x[0])}: ${x[1]} lb`).join(' · ')}</p><h4>Mundane fire damage · str. 121</h4><div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>FS</th><th>Amount</th><th>Diameter</th><th>Target</th><th>Impact</th></tr></thead><tbody>${MUNDANE_FIRE_P121.map(x=>`<tr><td>${x.fs}</td><td>${esc(x.amount)}</td><td>${esc(x.diameter)}</td><td>${x.target}</td><td>${x.impact}</td></tr>`).join('')}</tbody></table></div><p class="tiny muted">Další pravidlové poznámky (balení, světlo, chlad, dílny a oheň) vyžadují samostatnou mechanickou implementaci a kontrolu.</p></section>`;}
function catalogCoveragePanel(){const coverage=catalogCoverage(allCatalogItems());return `<section class="panel wide"><h3>Pokrytí vybavení podle PDF HMK</h3><p class="muted">Tato kontrola nezaměňuje počet evidovaných položek za úplnost pravidlových tabulek. Hotové komplety vyžadují samostatnou strukturovanou definici; pouhý název nestačí.</p><div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Oblast</th><th>Strany HMK</th><th>Evidováno</th><th>Stav</th></tr></thead><tbody>${coverage.sections.map(x=>`<tr><td>${esc(x.label)}</td><td>${esc(x.pages)}</td><td>${x.count===null?'—':esc(x.count)}</td><td>${x.complete?'Strukturované minimum splněno':'Neověřeno / nedokončeno'}</td></tr>`).join('')}</tbody></table></div><p class="tiny muted">U kompletů je cílové minimum 12. U ostatních oblastí není celkový počet bezpečně stanoven; stav zůstává neověřený.</p><div class="actions">${button('Exportovat přehled pokrytí JSON','export-catalog-coverage')}</div></section>`;}
function armourCoverageReadinessPanel(){const a=auditArmourCoverage();return `<section class="panel wide"><h3>HMK · ověření anatomického pokrytí</h3><p><b>${a.ready} / ${a.total}</b> položek připravených pro pravidlový výpočet · ${a.pending} vyžaduje vizuální přepis pokrytí z PDF.</p><p class="muted">Bez ověřených míst zásahu, zón, směrových omezení a příznaku pevné zbroje je výpočet zablokován. Propojení ${a.matched}/${a.suitParts} součástí kompletů potvrzuje pouze identitu položek, nikoli ochranu.</p></section>`;}
function suitArticleCrosswalkPanel(){const r=reconcileSuitArticles();return `<section class="panel wide"><h3>HMK · propojení součástí 12 kompletů s katalogem</h3><p class="muted">Kontrola názvů jednotlivých součástí proti 92 referenčním položkám. Shoda názvu neznamená ověřené anatomické pokrytí ani povolení automatického oblékání.</p><p><b>${r.matched} / ${r.parts}</b> jednoznačně přiřazených součástí · ${r.unmatched.length} bez shody · ${r.ambiguous.length} nejednoznačných.</p>${r.unmatched.length||r.ambiguous.length?`<div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Komplet</th><th>Součást</th><th>Stav</th></tr></thead><tbody>${[...r.unmatched,...r.ambiguous].map(e=>`<tr><td>${esc(e.suit)}</td><td>${esc(e.label)}</td><td>${esc(e.status)}</td></tr>`).join('')}</tbody></table></div>`:'<p>Všechny názvy mají jednoznačnou shodu. Anatomické pokrytí je zapsáno; kontrola skutečného pořadí vrstev zatím není uzavřena.</p>'}</section>`;}
function libraryView(){
 const auditById=new Map(allCatalogItems().map(i=>[i.id,catalogAuditEntry(i)]));
 const filtered=allCatalogItems().filter(i=>(category==='all'||i.category===category)&&
  (i.name+' '+i.description+' '+(i.source||'')).toLocaleLowerCase('cs').includes(query.toLocaleLowerCase('cs'))&&
  (catalogStatus==='all'||(catalogStatus==='missing'?!auditById.get(i.id).ready:auditById.get(i.id).ready)))
  .sort((a,b)=>a.name.localeCompare(b.name,'cs'));
 return `<div class="topline"><h2>Knihovna vybavení</h2>${button('+ Nový předmět','new-item')}</div>
 <div class="toolbar catalog-filters"><label>Kategorie<select id="category"><option value="all" ${category==='all'?'selected':''}>Všechny kategorie</option>${[['weapon','Zbraně'],['shield','Štíty'],['armor','Zbroje'],['other','Ostatní předměty']].map(([k,v])=>`<option value="${k}" ${category===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Úplnost evidence<select id="catalog-status"><option value="all" ${catalogStatus==='all'?'selected':''}>Všechny položky</option><option value="missing" ${catalogStatus==='missing'?'selected':''}>Vyžadují doplnění</option><option value="ready" ${catalogStatus==='ready'?'selected':''}>Bez upozornění</option></select></label><label>Hledat<input id="search" placeholder="Název, popis nebo zdroj…" value="${esc(query)}"></label></div>
 <div class="actions"><button class="secondary" data-action="export-catalog">Exportovat vlastní katalog JSON</button><label>Importovat katalog (přidat nové položky)<input type="file" id="import-catalog-file" accept=".json,application/json"></label></div><nav class="armour-reference-nav" aria-label="Navigace v referenční knihovně zbroje"><a href="#hmk-printed-suits">12 originálních kompletů</a> · <a href="#armour-consistency">Kontrola konzistence</a></nav>${category==='armor'||category==='all'?armourMaterialsPanel():''}${armourLayerReferencePanel()}${unifiedPrintedSuitsPanel()}${armourLibraryConsistencyPanel()}${printedArmourArticlesPanel()}${suitArticleCrosswalkPanel()}${armourCoverageReadinessPanel()}${printedPossessionsPanel()}${workshopMechanicsPanel()}${expeditionEffectsPanel()}${printedGearRulesPanel()}${catalogCoveragePanel()}${catalogAuditPanel()}
 <div class="notice">Audit ověřuje pouze úplnost zadaných údajů, nikoli jejich pravidlovou správnost. Při importu se existující definice ani inventáře nepřepisují.</div>
 <p class="muted">Zobrazeno ${filtered.length} z ${allCatalogItems().length} položek (${BUILTIN_ITEMS.length} vestavěných HMK, ${data.items.length} vlastních). Vestavěné definice jsou pouze ke čtení a jsou dostupné automaticky.</p>
 ${filtered.length?`<div class="cards">${filtered.map(i=>{const audit=auditById.get(i.id);return `<article class="card"><h3>${esc(i.name)}${i.builtin?' <span class="pill">HMK · pevná definice</span>':''}</h3><p class="muted">${esc(i.description||'Bez popisu')}</p><p class="tiny">Zdroj: ${esc(i.source||'neuveden')}</p>${catalogParameters(i)}<p class="catalog-readiness ${audit.ready?'catalog-ready':'catalog-missing'}">${audit.ready?'Evidence bez upozornění':'Chybí: '+esc(audit.missing.join(' · '))}</p><div class="actions">${i.builtin?'<span class="muted tiny">Pravidlová definice · nelze upravit ani odstranit</span>':`<button data-edit-item="${esc(i.id)}">Upravit</button><button class="secondary" data-copy-item="${esc(i.id)}">Kopírovat</button><button class="danger" data-delete-item="${esc(i.id)}">Odstranit</button>`}</div></article>`}).join('')}</div>`:'<div class="empty">Žádné položky neodpovídají filtru.</div>'}`;
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
 for(const x of data.inventory){if(!referenced.has(x.characterId))anomalies.push('Inventář bez postavy: '+x.id);if(x.sourceItemId&&!isKnownCatalogId(x.sourceItemId))anomalies.push('Inventární kopie bez původní položky knihovny: '+x.id+' (může jít o záměrné odstranění z knihovny)')}
 for(const x of data.journal)if(!referenced.has(x.characterId))anomalies.push('Deník bez postavy: '+x.id);
 return {reportVersion:1,createdAt:stamp(),schemaVersion:data.schemaVersion,storageReadOnly,counts:{characters:data.characters.length,archived:data.trash.length,items:allCatalogItems().length,inventory:data.inventory.length,journal:data.journal.length},characters:entries,anomalies};
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
function backupView(){const summary={characters:data.characters.length,archived:data.trash.length,items:allCatalogItems().length,inventory:data.inventory.length,journal:data.journal.length};return `<h2>Zálohy a obnova</h2>${!storageReadOnly?inventoryProvenancePanel():''}${storageReadOnly?'<div class="notice error">Načtení úložiště selhalo. Standardní záloha je zablokována; nejdříve stáhněte nouzovou kopii původních dat.</div>':''}<div class="panel"><div class="equipment-summary"><strong>Kontrola místních záznamů</strong><div>Aktivní postavy: ${summary.characters} · archiv: ${summary.archived}</div><div>Celkem položek knihovny: ${summary.items} · vestavěné HMK: ${BUILTIN_ITEMS.length} · inventář: ${summary.inventory} · deník: ${summary.journal}</div><div>Stav zápisu: ${storageReadOnly?'ZABLOKOVÁN':'Připraven'}</div></div><p><strong>Datový formát:</strong> v1 (kompatibilní se staršími verzemi). Umístění vybavení je nepovinné pole; staré položky se zobrazí jako nezařazené.</p><p>Data se ukládají lokálně v tomto prohlížeči (localStorage). Pokud jsou otevřené dvě záložky, změna v druhé záložce zablokuje zápis, aby nedošlo k přepsání dat. Pro přenos mezi zařízeními je nutné exportovat a importovat JSON. Režim anonymního prohlížení, vymazání dat webu nebo změna zařízení mohou záznamy odstranit; pravidelně zálohujte.</p><div class="actions">${button('Stáhnout JSON zálohu','export')}${button('Export doménových dat HMK','export-kernel-all')}${button('Stáhnout diagnostiku','export-diagnostic')}${button('Nouzová kopie původního úložiště','export-raw')}<label>Importovat JSON zálohu<input type="file" id="import-file" accept=".json,application/json"></label><label>Přidat jednu postavu ze zálohy<input type="file" id="import-character-file" accept=".json,application/json"></label></div><div class="notice error">Import nahradí aktuální lokální data. Před importem si stáhněte zálohu.</div></div>`}
// Encounter preparation is deliberately non-destructive: no changes to character records or rules kernel.
function selectedEncounterCharacters(){return data.characters.filter(c=>encounterSelection.has(c.id))}
function encounterPayload(){
 const chars=selectedEncounterCharacters();
 if(!chars.length)throw Error('Vyberte alespoň jednu postavu.');
 const ids=new Set(chars.map(c=>c.id));
 const bridge=kernelExport(chars);
 return {format:'hmk-encounter-preparation-v1',exportedAt:stamp(),rulesCalculated:false,
  combatants:chars.map(c=>({characterId:c.id,name:c.name,kind:c.kind||'PC',
   readinessIssues:readinessReport(c),armourCoverage:armourCoverageReport(c),combatInputs:equippedCombatInputs(c),
   equipmentPreflight:encounterEquipmentPreflight(c),
   equipment:structuredClone(data.inventory.filter(x=>x.characterId===c.id)),
   recordedInjuries:structuredClone(c.hmk?.injuries||[])})),
  domainBridge:bridge,
  warnings:['Jde o evidenční podklady, nikoliv o výsledek bojového resolveru.',...bridge.warnings]};
}
// v48: Explicitly flag drift between a character-owned snapshot and its source definition.
// Snapshots are never rewritten silently: custom modifications may be intentional.
function inventoryDefinitionDrift(x){
 if(!x.sourceItemId)return null;
 const source=findCatalogItem(x.sourceItemId);
 if(!source)return null; // Missing definitions have their own preflight warning.
 const snap=x.snapshot||{};
 if(source.category!==snap.category)return 'kategorie se liší od pravidlové knihovny';
 if(source.name!==snap.name)return 'název se liší od pravidlové knihovny';
 if(!sameCatalogProperties(source.properties||{},snap.properties||{}))return 'parametry kopie se liší od pravidlové knihovny';
 return null;
}
// Read-only equipment preflight. These are inventory consistency checks, NOT HMK rules.
function encounterEquipmentPreflight(c){
 const owned=data.inventory.filter(x=>x.characterId===c.id);
 const slots=['main_hand','off_hand','worn','carried','none'];
 const issues=[];
 for(const slot of ['main_hand','off_hand']){
  const matches=owned.filter(x=>x.slot===slot);
  if(matches.length>1)issues.push(`Více předmětů ve slotu ${slot==='main_hand'?'hlavní ruka':'vedlejší ruka'}`);
 }
 for(const x of owned){
  const snap=x.snapshot||{};
  const name=String(snap.name||'Nepojmenovaný předmět');
  if(!slots.includes(x.slot||'none'))issues.push(`${name}: neznámý slot`);
  if(['main_hand','off_hand','worn'].includes(x.slot)&&x.quantity!==1)issues.push(`${name}: vybavený kus nemá množství 1`);
  if(['main_hand','off_hand'].includes(x.slot)&&!['weapon','shield'].includes(snap.category))issues.push(`${name}: neplatná kategorie pro ruku`);
  if(x.slot==='worn'&&snap.category!=='armor')issues.push(`${name}: neplatná kategorie nasazené zbroje`);
  if(['weapon','shield'].includes(snap.category)&&['main_hand','off_hand'].includes(x.slot)&&!Number.isInteger(x.currentWQ))issues.push(`${name}: nezadaná aktuální WQ`);
  if(x.sourceItemId&&!isKnownCatalogId(x.sourceItemId))issues.push(`${name}: původní definice není v knihovně`);
  const drift=inventoryDefinitionDrift(x);if(drift)issues.push(`${name}: ${drift}; bojové podklady používají uloženou kopii, nikoli aktuální definici`);
 }
 return {characterId:c.id,characterName:c.name,issues,equipment:owned.map(x=>({id:x.id,name:x.snapshot?.name||'',category:x.snapshot?.category||'',slot:x.slot||'none',quantity:x.quantity,currentWQ:x.currentWQ??null}))};
}
// v50: Normalize primary and alternative attack modes into one read-only combat input.
// No damage roll is made here. Original inventory snapshots remain authoritative.
function combatStrikeModes(properties){
 const p=properties&&typeof properties==='object'?properties:{};
 const primary=Array.isArray(p.verifiedModes)?p.verifiedModes:[];
 const alternate=Array.isArray(p.alternateStrikeModes)?p.alternateStrikeModes:[];
 const issues=[];
 const normalized=[];
 for(const [kind,source] of [['primary',primary],['alternate',alternate]]){
  source.forEach((raw,index)=>{
   if(!raw||typeof raw!=='object'||Array.isArray(raw)){issues.push(`${kind} #${index+1}: neplatná definice režimu`);return}
   const name=String(raw.name||'').trim();
   const die=String(raw.impactDie||'').trim();
   const aspect=String(raw.aspect||'').trim().toLowerCase();
   const modifier=raw.impactModifier;
   if(!name||!/^d(?:4|6|8|10|12|20|100)$/.test(die)||!['b','e','p','f'].includes(aspect)||!Number.isSafeInteger(modifier)){
    issues.push(`${kind} #${index+1}: chybí název nebo je neplatná kostka, modifikátor či typ poškození`);return;
   }
   normalized.push({kind,name,impactDie:die,impactModifier:modifier,aspect,
    zoneDie:raw.zoneDie??p.zoneDie??null,length:raw.length??p.length??null,
    additionalProperties:Object.fromEntries(Object.entries(raw).filter(([k])=>!['name','impactDie','impactModifier','aspect','zoneDie','length'].includes(k)))});
  });
 }
 return {modes:normalized,issues};
}
// v51: Shield inputs are validated independently from weapon strike modes.
// The values below are *inputs*; no shield defence or deflection is calculated.
function combatShieldInputs(properties){
 const p=properties&&typeof properties==='object'&&!Array.isArray(properties)?properties:{};
 const issues=[];
 const numberField=(key,label)=>{
  const v=p[key];
  if(!Number.isSafeInteger(v)){issues.push(`chybí nebo je neplatný ${label}`);return null;}
  return v;
 };
 const shieldModifier=numberField('shieldModifier','Shield Modifier');
 const deflect=numberField('deflect','Deflect');
 const quality=numberField('quality','základní WQ');
 const heft=numberField('heft','Heft');
 const strike=combatStrikeModes(p);
 for(const issue of strike.issues)issues.push(`útok štítem: ${issue}`);
 if(!strike.modes.some(m=>m.kind==='primary'))issues.push('chybí platný základní útok štítem');
 return {shieldModifier,deflect,baseWQ:quality,heft,modes:strike.modes,issues};
}
// v46: combat input inspection; no HMK combat calculations or inventory mutation.
function equippedCombatInputs(c){
 const entries=data.inventory.filter(x=>x.characterId===c.id&&['main_hand','off_hand'].includes(x.slot));
 const issues=[];
 const hands=entries.map(x=>{
  const p=x.snapshot?.properties||{};const name=x.snapshot?.name||'Nepojmenovaný předmět';
  const isWeapon=x.snapshot?.category==='weapon';const isShield=x.snapshot?.category==='shield';
  const normalized=isWeapon?combatStrikeModes(p):isShield?combatShieldInputs(p):{modes:[],issues:[]};
  const modes=normalized.modes;
  for(const issue of normalized.issues)issues.push(`${name}: ${issue}`);
  const baseWQ=asNumber(p.quality),currentWQ=asNumber(x.currentWQ);
  const slot=x.slot;
  const drift=inventoryDefinitionDrift(x);if(drift)issues.push(`${name}: ${drift}; bojové vstupy používají uloženou kopii`);
  if(isWeapon&&!modes.length)issues.push(`${name}: chybí strukturované útočné režimy pro combat`);
  if(isWeapon&&!modes.some(m=>m.kind==='primary'))issues.push(`${name}: chybí platný základní útočný režim`);
  if((isWeapon||isShield)&&baseWQ===null)issues.push(`${name}: chybí základní WQ`);
  if((isWeapon||isShield)&&currentWQ===null)issues.push(`${name}: chybí aktuální WQ`);
  
  return {inventoryId:x.id,slot,name,category:x.snapshot?.category||'',definitionId:x.sourceItemId||x.snapshot?.id||null,baseWQ,currentWQ,
   modes,shieldModifier:isShield?normalized.shieldModifier:null,deflect:isShield?normalized.deflect:null,heft:isShield?normalized.heft:null,
   definitionDrift:drift,definitionSource:drift?'inventory-snapshot-diverges':'inventory-snapshot',
   note:'Hodnoty jsou ze snapshotu inventáře; nejsou výpočtem combat resolveru.'};
 });
 return {characterId:c.id,hands,issues,rulesCalculated:false};
}
function equippedCombatInputsPanel(c){
 const r=equippedCombatInputs(c);
 return `<details class="encounter-details"><summary>Bojové vstupy · ${r.hands.length} předmětů v rukou · ${r.issues.length} upozornění</summary><p class="muted">Kontrola údajů pro budoucí combat. Zobrazuje uložené kopie konkrétních předmětů; pokud se liší od katalogu, zobrazí upozornění. Neprovádí útoky ani obranu.</p>${r.hands.length?`<div class="catalog-scroll"><table class="catalog-spec"><thead><tr><th>Ruka</th><th>Předmět</th><th>WQ základní / aktuální</th><th>Útočné režimy / štít</th></tr></thead><tbody>${r.hands.map(h=>`<tr><td>${h.slot==='main_hand'?'Hlavní':'Vedlejší'}</td><td>${esc(h.name)}</td><td>${esc(String(h.baseWQ??'—'))} / ${esc(String(h.currentWQ??'—'))}</td><td>${h.category==='weapon'?(h.modes.length?h.modes.map(m=>esc([m.kind==='alternate'?'Alternativní: '+m.name:m.name,m.impactDie+(m.impactModifier>=0?'+':'')+m.impactModifier,({b:'Blunt',e:'Edge',p:'Point',f:'Fire/Frost'})[m.aspect]].join(' · '))).join('<br>'):'Nejsou ověřené režimy'):h.category==='shield'?`Shield Modifier: ${esc(String(h.shieldModifier??'—'))}; Deflect: ${esc(String(h.deflect??'—'))}; Heft: ${esc(String(h.heft??'—'))}${h.modes.length?'<br>'+h.modes.map(m=>esc([m.name,m.impactDie+(m.impactModifier>=0?'+':'')+m.impactModifier,({b:'Blunt',e:'Edge',p:'Point',f:'Fire/Frost'})[m.aspect]].join(' · '))).join('<br>'):''}`:'Nepodporovaná kategorie'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">V rukou nejsou evidovány žádné předměty.</p>'}${r.issues.length?`<ul class="audit-list">${r.issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</details>`;
}
// v52: Strict, read-only armour-input contract. No inferred AV and no layer summation.
// Invalid location data must be reported, not silently treated as valid protection.
function combatArmourInputs(properties){
 const p=properties&&typeof properties==='object'&&!Array.isArray(properties)?properties:{};
 const issues=[];const raw=p.locationProtection;
 const validCode=/^(?:sk|fa|nk|sh|ua|el|fo|ha|tx|ab|hp|gr|th|kn|ca|ft)$/;
 const protection={};
 if(!raw||typeof raw!=='object'||Array.isArray(raw))issues.push('chybí mapa ochrany anatomických lokací');
 else for(const [location,av] of Object.entries(raw)){
  if(!validCode.test(location)){issues.push(`neznámá anatomická lokace ${location}`);continue;}
  if(!av||typeof av!=='object'||Array.isArray(av)||!['b','e','p','f'].every(k=>Number.isSafeInteger(av[k])&&av[k]>=0)){
   issues.push(`lokace ${location}: chybí platné nezáporné celočíselné AV b/e/p/f`);continue;
  }
  protection[location]={b:av.b,e:av.e,p:av.p,f:av.f};
 }
 const claimed=Array.isArray(p.coveredLocations)?p.coveredLocations:null;
 if(claimed){
  for(const loc of claimed)if(typeof loc!=='string'||!validCode.test(loc)||!Object.hasOwn(protection,loc))issues.push(`deklarovaná lokace ${String(loc)} nemá platné AV`);
  for(const loc of Object.keys(protection))if(!claimed.includes(loc))issues.push(`lokace ${loc} má AV, ale není uvedena v pokrytí`);
 }
 if(!Object.keys(protection).length)issues.push('žádná použitelná ochrana anatomických lokací');
 return {protection,coveredLocations:Object.keys(protection),issues,rulesCalculated:false};
}
// HMK printed p.117: overlapping material AV is summed independently per aspect.
// This is location AV only, not impact, glancing blow, rigid quality, Bulk or ENC.
function sumArmourLocationAV(layers,invalid=false){
 if(invalid||!Array.isArray(layers)||!layers.length)return {av:null,complete:false};
 const av={b:0,e:0,p:0,f:0};
 for(const layer of layers){
  if(!layer||!['b','e','p','f'].every(k=>Number.isSafeInteger(layer[k])&&layer[k]>=0))return {av:null,complete:false};
  for(const k of ['b','e','p','f']){av[k]+=layer[k];if(!Number.isSafeInteger(av[k]))return {av:null,complete:false};}
 }
 return {av,complete:true};
}
// HMK p.167: effective impact = strike impact minus aspect AV, never below zero.
// This intentionally does NOT resolve rigid-armour glancing blows, injury, shock or traits.
function previewEffectiveImpact(strikeImpact,aspect,locationResult,armourReduction=0){
 if(!Number.isSafeInteger(strikeImpact)||strikeImpact<0||strikeImpact>100000)return {ok:false,reason:'Neplatný Impact zásahu'};
 if(!['b','e','p','f'].includes(aspect))return {ok:false,reason:'Neznámý typ poškození'};
 if(!Number.isSafeInteger(armourReduction)||armourReduction<0||armourReduction>100000)return {ok:false,reason:'Neplatné snížení ochrany'};
 if(armourReduction>0&&aspect!=='p')return {ok:false,reason:'Armour Reduction z pravidel se vztahuje pouze na Point (p)'};
 if(!locationResult||locationResult.complete!==true||!locationResult.av||!Number.isSafeInteger(locationResult.av[aspect]))return {ok:false,reason:'Pro lokaci chybí spolehlivá ochrana AV'};
 const baseAV=locationResult.av[aspect];const effectiveAV=Math.max(0,baseAV-armourReduction);
 const effectiveImpact=Math.max(0,strikeImpact-effectiveAV);
 return {ok:true,baseAV,armourReduction,effectiveAV,strikeImpact,effectiveImpact,aspect,requiresGlancingReview:(aspect==='e'||aspect==='p')&&effectiveImpact>=1&&effectiveImpact<=4,
  note:'Předběžný výpočet AV a efektivního Impact podle HMK str. 111, 167. Glancing Blow (str. 168) není automaticky rozhodnut: chybí ověřená rigid kvalita konkrétních vrstev.'};
}
// HMK printed p.168: injury threshold and rigid-armour glancing exception.
// Rigid status is explicitly confirmed by the GM; it is not guessed from AV or material.
function classifyImpactInjury(preview,rigidStatus){
 if(!preview||preview.ok!==true)return {ok:false,reason:'Chybí platný výpočet efektivního Impact'};
 if(!['yes','no','unknown'].includes(rigidStatus))return {ok:false,reason:'Neplatný stav Rigid Armour'};
 const n=preview.effectiveImpact;
 if(!Number.isSafeInteger(n)||n<0)return {ok:false,reason:'Neplatný efektivní Impact'};
 if(n===0)return {ok:true,kind:'none',injury:null,injuryShock:0,shockRollBonus:0,needsRigidReview:false};
 const possibleGlance=(preview.aspect==='e'||preview.aspect==='p')&&n>=1&&n<=4;
 if(possibleGlance&&rigidStatus==='unknown')return {ok:true,kind:'undetermined',injury:null,injuryShock:null,shockRollBonus:null,needsRigidReview:true};
 if(possibleGlance&&rigidStatus==='yes')return {ok:true,kind:'glancing',injury:null,injuryShock:1,shockRollBonus:10,needsRigidReview:false};
 const injury=n>=20?'G5':n>=15?'G4':n>=10?'S3':n>=5?'S2':'M1';
 return {ok:true,kind:'injury',injury,injuryShock:Number(injury.slice(1)),shockRollBonus:0,needsRigidReview:false};
}
// Pure, read-only pipeline for an already successful strike; no rolls, bleeding, or state changes.
function previewInjurySequence(strikeImpact,aspect,locationResult,armourReduction,rigidStatus){
 const impact=previewEffectiveImpact(strikeImpact,aspect,locationResult,armourReduction);
 if(!impact.ok)return {ok:false,reason:impact.reason};
 const injury=classifyImpactInjury(impact,rigidStatus);
 if(!injury.ok)return injury;
 return {ok:true,impact,injury,rulePages:[111,167,168],mutatesCharacter:false};
}
// HMK printed p.169, Shock step 4: location + injury + roll SL.
// Location Shock is entered from the printed Body Location table; no inferred anatomy mapping.
function previewShockState(injury,locationShock,shockLevel){
 if(!injury||injury.ok!==true||injury.kind==='undetermined')return {ok:false,reason:'Nejprve musí být jednoznačně určeno zranění / Glancing Blow'};
 if(!Number.isSafeInteger(locationShock)||locationShock<0||locationShock>20)return {ok:false,reason:'Location Shock musí být celé číslo 0–20 opsané z tabulky lokací'};
 if(!['CF','F','S','CS'].includes(shockLevel))return {ok:false,reason:'Neplatná úroveň výsledku Shock testu'};
 const rollModifier={CF:2,F:1,S:0,CS:-1}[shockLevel];
 const injuryShock=injury.injuryShock;
 const shk=locationShock+injuryShock+rollModifier;
 const state=shk<=6?'NONE':shk===7?'STN':shk===8?'INC':shk===9?'UNC':'KIA';
 return {ok:true,locationShock,injuryShock,rollModifier,shockLevel,shk,state,glancingBonus:injury.shockRollBonus||0,mutatesCharacter:false};
}
// The roll is supplied as an already adjudicated SL. The GM must include Fatigue and
// glancing +10 in the roll's EML; Injury impairment must not be included (p.169).
function previewShockSequence(strikeImpact,aspect,locationResult,armourReduction,rigidStatus,locationShock,shockLevel){
 const sequence=previewInjurySequence(strikeImpact,aspect,locationResult,armourReduction,rigidStatus);
 if(!sequence.ok)return sequence;
 const shock=previewShockState(sequence.injury,locationShock,shockLevel);
 if(!shock.ok)return {ok:false,reason:shock.reason,sequence};
 return {ok:true,...sequence,shock,rulePages:[111,117,167,168,169],mutatesCharacter:false};
}
// HMK printed pp.168–169. Explicitly adjudicated compound injury level, never guessed.
function previewCompoundShock(injury,compoundLevel){
 if(!injury||injury.ok!==true||injury.kind==='undetermined')return {ok:false,reason:'Zranění není jednoznačné'};
 if(compoundLevel===null||compoundLevel===undefined||compoundLevel==='')return {ok:true,injuryShock:injury.injuryShock,compoundApplied:false};
 if(injury.kind!=='injury')return {ok:false,reason:'Compound Injury nelze přiřadit Glancing Blow ani zásahu bez zranění'};
 if(!Number.isSafeInteger(compoundLevel)||compoundLevel<1||compoundLevel>6)return {ok:false,reason:'Compound Injury Shock musí být celé číslo 1–6'};
 if(compoundLevel<injury.injuryShock)return {ok:false,reason:'Compound Injury nemůže snížit Injury Shock'};
 if(compoundLevel===6&&injury.injury!=='G5')return {ok:false,reason:'Injury Shock 6 náleží pouze compound G5 (str. 168)'};
 return {ok:true,injuryShock:compoundLevel,compoundApplied:true};
}
// HMK p.169: repeat STN while STN -> INC; repeat INC while INC -> UNC.
// Otherwise only the most severe Shock State applies. KIA is terminal.
function previewShockCarryover(previous,incoming){
 const states=['NONE','STN','INC','UNC','KIA'];
 if(!states.includes(previous)||!states.includes(incoming))return {ok:false,reason:'Neznámý Shock State'};
 if(previous==='KIA')return {ok:true,state:'KIA',escalated:false};
 if(previous==='STN'&&incoming==='STN')return {ok:true,state:'INC',escalated:true};
 if(previous==='INC'&&incoming==='INC')return {ok:true,state:'UNC',escalated:true};
 return {ok:true,state:states[Math.max(states.indexOf(previous),states.indexOf(incoming))],escalated:false};
}
// HMK p.169: INC/UNC reroll, shock -20 - fatigue; STN recovery is a separate test.
function previewShockRecovery(previous,level){
 if(!['STN','INC','UNC'].includes(previous)||!['CF','F','S','CS'].includes(level))return {ok:false,reason:'Neplatný stav nebo výsledek testu'};
 if(previous==='STN')return {ok:true,state:['S','CS'].includes(level)?'NONE':'STN',extendedShock:null,coma:false,penalty:0,timing:'end-next-turn',test:'Shock test'};
 if(level==='CF')return {ok:true,state:previous,extendedShock:'HR4',coma:previous==='UNC',penalty:-20,timing:previous==='INC'?'end-next-turn':'after-ten-minutes',test:'Shock Reroll'};
 if(level==='F')return {ok:true,state:previous,extendedShock:'HR5',coma:false,penalty:-20,timing:previous==='INC'?'end-next-turn':'after-ten-minutes',test:'Shock Reroll'};
 return {ok:true,state:level==='S'?'STN':'NONE',extendedShock:null,coma:false,penalty:-20,timing:previous==='INC'?'end-next-turn':'after-ten-minutes',test:'Shock Reroll'};
}
// HMK pp.60–61: deterministic d100 success test. 00 is represented as 100.
// EML is already adjusted by the GM; usual limits 05–95 apply unless a rule overrides them.
function hmkD100Test(roll,eml,exceptional=false){
 if(!Number.isSafeInteger(roll)||roll<1||roll>100)return {ok:false,reason:'d100 musí být celé číslo 1–100 (00 = 100).'};
 if(!Number.isSafeInteger(eml)||eml<0||eml>200)return {ok:false,reason:'EML musí být celé číslo 0–200.'};
 if(typeof exceptional!=='boolean')return {ok:false,reason:'Neplatná výjimka z limitu EML.'};
 const effectiveEML=exceptional?eml:Math.max(5,Math.min(95,eml));
 const success=roll<=effectiveEML;
 const critical=roll%5===0;
 const level=success?(critical?'CS':'S'):(critical?'CF':'F');
 return {ok:true,roll,enteredEML:eml,effectiveEML,clamped:eml!==effectiveEML,critical,level,success,exceptional,rulePages:[60,61]};
}
// A read-only reroll helper: caller supplies EML after all applicable penalties.
function hmkShockRecoveryD100(previous,roll,finalEML){
 if(!['STN','INC','UNC'].includes(previous))return {ok:false,reason:'Neplatný Shock State.'};
 const test=hmkD100Test(roll,finalEML);
 if(!test.ok)return test;
 const recovery=previewShockRecovery(previous,test.level);
 return {ok:recovery.ok,test,recovery,rulePages:[60,61,169],mutatesCharacter:false};
}
// HMK p.169: Shock tests exclude Injury impairment; rerolls additionally take -20.
// EML bounds are applied by hmkD100Test only AFTER all applicable modifiers.
function hmkShockEML(baseML,fatiguePenalty,glancingBonus=0,reroll=false){
 if(!Number.isSafeInteger(baseML)||baseML<0||baseML>200)return {ok:false,reason:'Shock ML musí být celé číslo 0–200.'};
 if(!Number.isSafeInteger(fatiguePenalty)||fatiguePenalty<0||fatiguePenalty>200)return {ok:false,reason:'Fatigue penalty musí být nezáporné celé číslo 0–200.'};
 if(![0,10].includes(glancingBonus))return {ok:false,reason:'Glancing bonus může být pouze 0 nebo +10.'};
 if(typeof reroll!=='boolean')return {ok:false,reason:'Neplatný typ Shock testu.'};
 if(reroll&&glancingBonus!==0)return {ok:false,reason:'Glancing bonus +10 náleží původnímu Shock testu, ne Shock Reroll.'};
 const modifier= -fatiguePenalty+glancingBonus-(reroll?20:0);
 const rawEML=baseML+modifier;
 const effectiveEML=Math.max(5,Math.min(95,rawEML));
 return {ok:true,baseML,fatiguePenalty,glancingBonus,reroll,rerollPenalty:reroll?-20:0,injuryImpairmentApplied:false,rawEML,effectiveEML,clamped:rawEML!==effectiveEML,rulePages:[60,61,169]};
}
function hmkShockRollFromML(baseML,fatiguePenalty,glancingBonus,roll){
 const eml=hmkShockEML(baseML,fatiguePenalty,glancingBonus,false);
 if(!eml.ok)return eml;
 const test=hmkD100Test(roll,eml.effectiveEML);
 if(!test.ok)return test;
 return {ok:true,eml,test,shockModifier:{CF:2,F:1,S:0,CS:-1}[test.level],rulePages:[60,61,169],mutatesCharacter:false};
}
function hmkShockRerollFromML(previous,baseML,fatiguePenalty,roll){
 if(!['INC','UNC'].includes(previous))return {ok:false,reason:'Shock Reroll s −20 je určen pouze pro INC/UNC.'};
 const eml=hmkShockEML(baseML,fatiguePenalty,0,true);
 if(!eml.ok)return eml;
 const test=hmkD100Test(roll,eml.effectiveEML);
 if(!test.ok)return test;
 const recovery=previewShockRecovery(previous,test.level);
 return {ok:true,eml,test,recovery,rulePages:[60,61,169],mutatesCharacter:false};
}
function encounterShockMLPanel(){
 return `<section class="panel"><h3>Shock ML → EML → d100 · automatický výpočet</h3><p class="muted">HMK str. 60–61 a 169. Zadejte Shock ML, nezápornou velikost postihu Fatigue a skutečný hod. Zranění (Injury impairment) se do Shock testu nezapočítává. Shock Reroll pro INC/UNC má navíc −20; bonus +10 za Glancing Blow patří pouze původnímu Shock testu. Standardní omezení EML 05–95 se uplatní až po modifikátorech. Bez zápisu do postavy.</p><form id="shock-ml-form"><div class="field-grid"><label>Typ testu<select name="kind"><option value="initial">Nový Shock Roll</option><option value="INC">Shock Reroll – INC</option><option value="UNC">Shock Reroll – UNC</option></select></label><label>Shock ML<input name="ml" type="number" min="0" max="200" step="1" value="65" required></label><label>Fatigue penalty (kladná velikost postihu)<input name="fatigue" type="number" min="0" max="200" step="1" value="0" required></label><label>Glancing Blow (+10, jen nový Shock Roll)<select name="glancing"><option value="0">Ne</option><option value="10">Ano</option></select></label><label>Hod d100 (00 = 100)<input name="roll" type="number" min="1" max="100" step="1" value="75" required></label></div><button type="submit">Spočítat EML a Shock test</button></form><div id="shock-ml-result" class="notice" role="status" aria-live="polite">Náhled bez změny postavy.</div></section>`;
}
function encounterD100Panel(){
 return `<section class="panel"><h3>d100 · pravidlový test a Shock Reroll</h3><p class="muted">HMK str. 60–61, 169. Zadejte skutečný hod (00 jako 100) a konečné EML. U INC/UNC musí GM do konečného EML zahrnout postih −20 a Fatigue; u STN příslušné modifikátory běžného testu. EML se standardně omezuje na 05–95, pokud konkrétní pravidlo neurčí výjimku. Výsledek se nikam neukládá.</p><form id="d100-shock-form"><div class="field-grid"><label>Stav před zotavením<select name="previous"><option>STN</option><option>INC</option><option>UNC</option></select></label><label>d100 (00 = 100)<input type="number" name="roll" min="1" max="100" required value="50"></label><label>Konečné EML (po všech modifikátorech)<input type="number" name="eml" min="0" max="200" required value="50"></label></div><button type="submit">Vyhodnotit d100 a zotavení</button></form><div id="d100-shock-result" class="notice" role="status" aria-live="polite">Pouze náhled, bez zápisu.</div></section>`;
}
function encounterShockFollowupPanel(){
 return `<section class="panel"><h3>Shock · přenos stavu a zotavení (HMK str. 169)</h3><p class="muted">Samostatné kontrolní výpočty. Výsledky testů CF/F/S/CS zadává GM po vyhodnocení d100. Při INC/UNC zahrňte do EML postih −20 a Fatigue, nikoliv Injury impairment. Nezapisuje se do postavy.</p><form id="shock-followup-form"><div class="field-grid"><label>Dosavadní stav<select name="previous"><option>NONE</option><option>STN</option><option>INC</option><option>UNC</option><option>KIA</option></select></label><label>Nově utrpěný stav<select name="incoming"><option>NONE</option><option>STN</option><option>INC</option><option>UNC</option><option>KIA</option></select></label></div><button type="submit">Vyhodnotit přenos stavu</button></form><div class="notice" id="shock-followup-result" role="status">Bez zápisu do postavy.</div><form id="shock-recovery-form"><div class="field-grid"><label>Stav před testem<select name="previous"><option>STN</option><option>INC</option><option>UNC</option></select></label><label>Výsledek Shock testu<select name="level"><option>S</option><option>CS</option><option>F</option><option>CF</option></select></label></div><button type="submit">Vyhodnotit zotavení / reroll</button></form><div class="notice" id="shock-recovery-result" role="status">Bez zápisu do postavy.</div></section>`;
}
// v64: manual encounter chronology. Round and acting character are GM annotations,
// not inferred HMK initiative or turn-resolution rules. Stored separately from characters.
const COMBAT_CLOCK_KEY='hmk-combat-manual-clock-v1';
const COMBAT_INJURY_TIMELINE_KEY='hmk-injury-timeline-instance-v1';
let combatInjuryTimelineId=(()=>{try{let id=sessionStorage.getItem(COMBAT_INJURY_TIMELINE_KEY);if(!id){id=uuid();sessionStorage.setItem(COMBAT_INJURY_TIMELINE_KEY,id);}return id;}catch{return uuid();}})();
function validateCombatClock(x,ids){
 if(!x||typeof x!=='object'||Array.isArray(x)||!Number.isInteger(x.round)||x.round<1||x.round>9999||typeof x.actorId!=='string'||(x.actorId!==''&&!ids.includes(x.actorId)))throw Error('Neplatné číslo kola nebo účastník.');
 return {round:x.round,actorId:x.actorId};
}
function readCombatClock(){
 try{const raw=sessionStorage.getItem(COMBAT_CLOCK_KEY);return raw?validateCombatClock(JSON.parse(raw),data.characters.map(c=>c.id)):{round:1,actorId:''};}
 catch{return {round:1,actorId:''}}
}
let combatClock=readCombatClock();
// In Close is an explicit GM-confirmed, pair-specific encounter state (not inferred from attacks).
const IN_CLOSE_KEY='hmk-in-close-pairs-v1';
function inClosePairKey(a,b){return [a,b].sort().join('::')}
function validInClosePairs(pairs,ids){
 if(!Array.isArray(pairs)||pairs.length>10000)throw Error('Neplatná evidence In Close.');
 const allowed=new Set(ids),out=new Set();
 for(const pair of pairs){if(!Array.isArray(pair)||pair.length!==2||pair.some(id=>typeof id!=='string'||!allowed.has(id))||pair[0]===pair[1])throw Error('Neplatná dvojice In Close.');out.add(inClosePairKey(pair[0],pair[1]));}
 return out;
}
function readInClosePairs(){try{return validInClosePairs(JSON.parse(sessionStorage.getItem(IN_CLOSE_KEY)||'[]'),data.characters.map(c=>c.id))}catch{return new Set()}}
let inClosePairs=readInClosePairs();
const TA_LEDGER_KEY='hmk-ta-ledger-v1';
function readTALedger(){try{return validateTALedger(JSON.parse(sessionStorage.getItem(TA_LEDGER_KEY)||'null'))}catch{return emptyTALedger()}}
let taLedger=readTALedger();
let pendingMeleeTA=null;
function persistTALedger(next){validateTALedger(next);sessionStorage.setItem(TA_LEDGER_KEY,JSON.stringify(next));taLedger=next;}
function taLedgerPanel(chars){
 const options=chars.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
 return `<section class="panel"><h3>Tactical Advantages · evidence (HMK p.171)</h3><p class="muted">Pouze GM ověřené Action/Setup TA. Získání se zatím automaticky nepřenáší z výsledku hodu. Impact a Precision se neskladují.</p><form id="ta-award-form"><label>Postava<select name="ownerId">${options}</select></label><label>Typ<select name="type"><option value="action">Action</option><option value="setup">Setup</option></select></label>${field('round','Kolo získání',combatClock.round,'number')}${field('ir','Initiative Rank získání',0,'number')}<label>Zdroj Action TA<select name="weaponSlot"><option value="">Neurčeno</option><option value="main_hand">Hlavní zbraň</option><option value="off_hand">Vedlejší zbraň</option></select></label><label><input type="checkbox" name="verified" value="yes" required> GM ověřil získání TA z pravidlového výsledku</label><button type="submit">Zapsat získanou TA</button></form><p class="tiny">Po ověření Attack/Defence lze uložit Action/Setup TA z posledního výsledku: <button type="button" data-action="award-last-melee-ta">Vybrat TA z výsledku</button>. GM musí potvrdit volbu; Impact/Precision se do evidence neukládají.</p><p class="tiny">Aktivní záznamy: ${taLedger.credits.filter(c=>!c.used).map(c=>`${esc(chars.find(x=>x.id===c.ownerId)?.name||c.ownerId)}: ${esc(c.type)} (${c.round}/IR${c.ir}; ${esc(c.id)})`).join('; ')||'žádné'}</p></section>`;
}

function saveInClosePair(a,b,active,transition){
 const check=validateInCloseTransition({active,...transition});if(!check.ok)return {ok:false,reason:check.reason};
 const allowed=new Set(selectedEncounterCharacters().map(c=>c.id));
 if(!allowed.has(a)||!allowed.has(b)||a===b)return {ok:false,reason:'Vyberte dvě různé postavy ze střetnutí.'};
 let nextLedger=null;
 if(active&&transition.reason==='action-ta'){
  try{nextLedger=spendTACredit(taLedger,{id:transition.actionCreditId,ownerId:a,round:combatClock.round,ir:transition.currentIR,turnKey:transition.turnKey,weaponSlot:transition.weaponSlot});}
  catch(err){return {ok:false,reason:'Action TA: '+err.message}}
 }
 const next=new Set(inClosePairs),key=inClosePairKey(a,b);if(active)next.add(key);else next.delete(key);
 try{const pairs=[...next].map(key=>key.split('::'));validInClosePairs(pairs,data.characters.map(c=>c.id));if(nextLedger)persistTALedger(nextLedger);sessionStorage.setItem(IN_CLOSE_KEY,JSON.stringify(pairs));inClosePairs=next;lastCombatEvent=null;return {ok:true}}
 catch(e){return {ok:false,reason:'Nepodařilo se uložit In Close: '+e.message}}
}
function inClosePanel(chars){
 return `<section class="panel"><h3>In Close · potvrzené dvojice</h3><p class="muted">GM potvrzuje vznik nebo ukončení In Close mezi dvěma účastníky. Stav platí pro tuto dvojici, nikoli pro celou skupinu. Automaticky se použije při Reach Effect. Přechod stavu vyžaduje pravidlový důvod a GM potvrzené podmínky podle HMK str. 171; samotné hody Grab a získání TA neprovádí.</p><form id="in-close-pair-form"><div class="field-grid"><label>První postava<select name="first" required>${chars.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><label>Druhá postava<select name="second" required>${chars.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><label>Stav<select name="active"><option value="yes">In Close aktivní</option><option value="no">In Close ukončeno</option></select></label><label>Pravidlový důvod<select name="reason"><option value="free-condition">Volně: cíl je bezbranný / prone (do 5 stop)</option><option value="grab">Po úspěšném Grab</option><option value="action-ta">Action TA: Get In Close</option><option value="tight-quarters">Stísněný prostor (GM)</option><option value="separation">Ukončení: odstup alespoň 5 stop</option><option value="tight-quarters-ended">Ukončení stísněného prostoru (GM)</option></select></label><label>Stav cíle<select name="targetCondition"><option value="">Neuveden</option><option value="prone">Prone</option><option value="confused">Confused</option><option value="stunned">Stunned</option><option value="unaware">Unaware</option><option value="helpless">Helpless</option></select></label><label><input type="checkbox" name="withinFiveFeet" value="yes"> Do 5 stop</label><label><input type="checkbox" name="successfulGrab" value="yes"> Grab úspěšný (GM potvrzeno)</label><label>Action TA z evidence (při vstupu přes Action TA)<select name="actionCreditId"><option value="">Nevybrána</option>${taLedger.credits.filter(c=>c.type==='action'&&!c.used).map(c=>`<option value="${esc(c.id)}">${esc(chars.find(x=>x.id===c.ownerId)?.name||c.ownerId)} · kolo ${c.round} · ${esc(c.id)}</option>`).join('')}</select></label><label><input type="checkbox" name="actionTA" value="yes"> Action TA potvrzena GM (vyžaduje kredit)</label><label><input type="checkbox" name="gmTightQuarters" value="yes"> GM potvrzuje stísněný prostor / jeho konec</label>${field('currentIR','Aktuální IR pro použití Action TA',0,'number')}${field('turnKey','Identifikátor aktuálního tahu (např. 2:a:1)','')}<label>Slot použité zbraně<select name="weaponSlot"><option value="main_hand">Hlavní</option><option value="off_hand">Vedlejší</option></select></label><label>Odstup po pohybu (stopy)<input type="number" name="separationFeet" min="0" step="1" value="0"></label></div><button type="submit">Uložit stav dvojice</button></form><p class="tiny">Aktivní dvojice: ${[...inClosePairs].filter(key=>key.split('::').every(id=>chars.some(c=>c.id===id))).map(key=>key.split('::').map(id=>esc(chars.find(c=>c.id===id)?.name||id)).join(' ↔ ')).join('; ')||'žádné'}</p></section>`;
}

function persistCombatClock(next){
 try{const valid=validateCombatClock(next,data.characters.map(c=>c.id));sessionStorage.setItem(COMBAT_CLOCK_KEY,JSON.stringify(valid));if(valid.round<combatClock.round){combatInjuryTimelineId=uuid();sessionStorage.setItem(COMBAT_INJURY_TIMELINE_KEY,combatInjuryTimelineId);}combatClock=valid;lastCombatEvent=null;return {ok:true}}
 catch(e){return {ok:false,reason:e.message}}
}
function combatClockPanel(chars){
 const actors=chars.filter(c=>encounterSelection.has(c.id));
 return `<section class="panel"><h3>Časová osa střetnutí · ruční řízení</h3><p class="muted">GM ručně nastavuje číslo kola a jednající postavu. Nejde o automatické pořadí iniciativy, časování Shock Reroll, krvácení ani regeneraci. Uložené návrhy dostanou pouze časovou značku kola a jednajícího účastníka.</p><form id="combat-clock-form"><div class="field-grid"><label>Kolo<input name="round" type="number" min="1" max="9999" step="1" required value="${combatClock.round}"></label><label>Jednající postava<select name="actorId"><option value="">Neurčeno</option>${actors.map(c=>`<option value="${esc(c.id)}" ${combatClock.actorId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label></div><div class="actions"><button type="submit">Nastavit kolo a účastníka</button><button type="button" class="secondary" data-action="combat-next-round">Další kolo (+1)</button><button type="button" class="secondary" data-action="combat-clock-export">Exportovat pracovní stav střetnutí</button></div></form><p class="tiny">Aktuální označení: kolo ${combatClock.round} · ${esc(actors.find(c=>c.id===combatClock.actorId)?.name||'jednající neurčen')}. Přepnutí kola nepřepisuje uložené návrhy.</p></section>`;
}
function combatSessionExport(){
 return {format:'hmk-combat-session-preview-v1',status:'preview-only',mutatesCharacter:false,exportedAt:stamp(),clock:structuredClone(combatClock),participants:[...encounterSelection].filter(id=>data.characters.some(c=>c.id===id)),history:structuredClone(combatDraftHistory),limitations:['Manual round and actor only','No authoritative initiative or turn advancement','No character mutation or automated bleeding/shock recovery']};
}
// v66: deterministic replay of saved previews from their recorded AV snapshot.
// A replay proves internal arithmetic consistency, NOT current equipment or PDF compliance.
function replayCombatDraft(d){
 const issues=[];
 if(!d||d.format!=='hmk-combat-event-draft-v1'||d.status!=='preview-only'||d.mutatesCharacter!==false)return {ok:false,issues:['Neplatný formát návrhu.']};
 const v=d.inputs||{},baseAV=d.impactResult?.baseAV;
 if(!Number.isSafeInteger(baseAV)||baseAV<0)return {ok:false,issues:['Chybí platná původní AV; událost nelze přepočítat.']};
 const loc={complete:true,av:{[d.aspect]:baseAV}};
 const seq=previewShockSequence(v.impact,d.aspect,loc,v.armourReduction,v.rigidStatus,v.locationShock,v.shockLevel);
 if(!seq.ok)return {ok:false,issues:['Opakovaný výpočet selhal: '+seq.reason]};
 if(v.compoundShock!==null&&v.compoundShock!==undefined){
  const compound=previewCompoundShock(seq.injury,v.compoundShock);
  if(!compound.ok)return {ok:false,issues:['Compound Injury: '+compound.reason]};
  seq.shock=previewShockState({...seq.injury,injuryShock:compound.injuryShock},v.locationShock,v.shockLevel);
  if(!seq.shock.ok)return {ok:false,issues:['Shock: '+seq.shock.reason]};
 }
 const carry=previewShockCarryover(v.previousState,seq.shock.state);
 if(!carry.ok)return {ok:false,issues:['Přenos stavu: '+carry.reason]};
 const fields=[['impactResult',seq.impact,['baseAV','effectiveAV','effectiveImpact','strikeImpact','armourReduction','aspect']],['injuryResult',seq.injury,['kind','injury','injuryShock','shockRollBonus']],['shockResult',seq.shock,['locationShock','injuryShock','rollModifier','shockLevel','shk','state']],['carryover',carry,['state','escalated']]];
 for(const [name,expected,keys] of fields)for(const key of keys)if(d[name]?.[key]!==expected[key])issues.push(name+'.'+key+': uložená a přepočítaná hodnota se liší.');
 return {ok:issues.length===0,issues};
}
function auditCombatReplay(entries){
 const issues=[];let passed=0;
 for(let i=0;i<entries.length;i++){
  const r=replayCombatDraft(entries[i]?.draft);
  if(r.ok)passed++;else for(const message of r.issues)issues.push({index:i+1,message});
 }
 return {format:'hmk-combat-replay-audit-v1',status:'advisory-only',mutatesCharacter:false,events:entries.length,passed,issues,limitations:['Uses saved base AV, not current equipment','Does not independently verify PDF rules','Does not adjudicate missing attack, defence or bleeding']};
}
// v67: read-only projection backed by the canonical shock rules module.
// The projection is intentionally non-authoritative until the complete resolver is validated.
function combatStateProjectionReport(){
 return projectCombatState({participants:[...encounterSelection].map(id=>({id,name:data.characters.find(c=>c.id===id)?.name||id})),entries:combatDraftHistory,validateDraft:replayCombatDraft});
}
function combatStateProjectionPanel(){
 const r=combatStateProjectionReport();
 return `<section class="panel"><h3>Stav účastníků · pravidlové jádro (v68)</h3><p class="muted">Konzervativní pracovní pohled nad historií. Při chybě návaznosti zastaví další výpočet dotčené postavy. Shock carryover počítá přímo modul jádra src/rules/shock.js. Nejde o potvrzený bojový stav: události jsou návrhy, mezi nimi může nastat zotavení, chybí krvácení a plný resolver. Žádné údaje postav se nemění.</p><p>Zpracováno ${r.applied}/${r.events} návrhů · upozornění ${r.issues.length}</p><div class="table-scroll"><table><thead><tr><th>Účastník</th><th>Shock</th><th>Návrhy</th><th>Stav důvěry</th></tr></thead><tbody>${r.combatants.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.shockState)}</td><td>${c.eventCount}</td><td>${esc(c.confidence)}</td></tr>`).join('')}</tbody></table></div>${r.issues.length?`<ul class="audit-list">${r.issues.map(x=>`<li>#${x.index}: ${esc(x.message)}</li>`).join('')}</ul>`:''}<button type="button" class="secondary" data-action="export-state-projection">Exportovat pracovní stav JSON</button></section>`;
}
function combatReplayPanel(){
 const r=auditCombatReplay(combatDraftHistory);
 return `<section class="panel"><h3>Kontrolní přepočet historie</h3><p class="muted">Znovu přepočítá Impact, zranění, Compound Injury, Shock a přenos stavu ze zaznamenaných vstupů a původní AV. Odhaluje změněné či nekonzistentní výsledky. Neověřuje aktuální vybavení ani úplnou správnost pravidel PDF.</p><p>Shodné: <strong>${r.passed}/${r.events}</strong> · nesrovnalosti: <strong>${r.issues.length}</strong></p>${r.issues.length?`<ul class="audit-list">${r.issues.map(x=>`<li>#${x.index}: ${esc(x.message)}</li>`).join('')}</ul>`:'<p class="muted">V uložených výpočtech nebyl nalezen rozpor; jde pouze o kontrolu aritmetické konzistence.</p>'}<button type="button" class="secondary" data-action="export-replay-audit">Exportovat kontrolní přepočet JSON</button></section>`;
}
// v65: conservative read-only continuity audit. Never infer recovery or damage between events.
function auditCombatContinuity(entries,knownIds){
 const issues=[],lastByTarget=new Map();let checked=0;
 for(let i=0;i<entries.length;i++){
  const x=entries[i],d=x.draft,t=d.target.id,round=x.chronology?.round;
  if(!knownIds.includes(t))issues.push({index:i+1,kind:'missing-target',message:'Cíl není v aktuálním registru postav.'});
  if(x.chronology?.actorId&&!knownIds.includes(x.chronology.actorId))issues.push({index:i+1,kind:'missing-actor',message:'Jednající postava není v aktuálním registru.'});
  const previous=lastByTarget.get(t);
  if(previous&&Number.isInteger(round)&&Number.isInteger(previous.round)&&round<previous.round)issues.push({index:i+1,kind:'round-order',message:'Kolo je nižší než u předchozí události stejného cíle.'});
  if(previous&&round===previous.round){
   checked++;
   if(d.inputs.previousState!==previous.state)issues.push({index:i+1,kind:'same-round-shock-mismatch',message:`V témže kole je předchozí stav ${d.inputs.previousState}, ale předchozí návrh skončil ${previous.state}. Mohla nastat samostatná změna stavu; ověřte ručně.`});
  }
  lastByTarget.set(t,{round,state:d.carryover.state});
 }
 return {format:'hmk-combat-continuity-audit-v1',status:'advisory-only',mutatesCharacter:false,events:entries.length,sameRoundComparisons:checked,issues};
}
function combatContinuityPanel(){
 const report=auditCombatContinuity(combatDraftHistory,data.characters.map(c=>c.id));
 return `<section class="panel"><h3>Audit návaznosti bojových událostí</h3><p class="muted">Kontrola pouze upozorňuje na nesrovnalosti. Nepředpokládá automatické zotavení, krvácení ani pravidlový přechod mezi koly. Záznamy se kontrolují v pořadí historie, nikoliv podle času v souboru.</p><p>Události: <strong>${report.events}</strong> · porovnání v témže kole: <strong>${report.sameRoundComparisons}</strong> · upozornění: <strong>${report.issues.length}</strong></p>${report.issues.length?`<ul class="audit-list">${report.issues.map(x=>`<li>#${x.index}: ${esc(x.message)}</li>`).join('')}</ul>`:'<p class="muted">Audit nenašel nesrovnalost v kontrolovaných vazbách; nejde o potvrzení správnosti HMK výpočtů.</p>'}<button type="button" class="secondary" data-action="export-continuity-audit">Exportovat audit JSON</button></section>`;
}
// Import of a full session remains preview-only and never touches character localStorage.
function parseCombatSessionImport(pkg,knownIds){
 if(!pkg||typeof pkg!=='object'||Array.isArray(pkg)||pkg.format!=='hmk-combat-session-preview-v1'||pkg.status!=='preview-only'||pkg.mutatesCharacter!==false)throw Error('Neplatný formát pracovního střetnutí.');
 if(!Array.isArray(pkg.participants)||pkg.participants.length>100||new Set(pkg.participants).size!==pkg.participants.length||pkg.participants.some(id=>typeof id!=='string'||!knownIds.includes(id)))throw Error('Soubor odkazuje na neexistující nebo duplicitní účastníky.');
 const clock=validateCombatClock(pkg.clock,knownIds);
 if(clock.actorId&&!pkg.participants.includes(clock.actorId))throw Error('Jednající postava není mezi účastníky.');
 const history=parseCombatHistoryImport({format:'hmk-combat-draft-history-v1',status:'preview-only',mutatesCharacter:false,entries:pkg.history});
 for(const x of history){if(x.chronology?.actorId&&!knownIds.includes(x.chronology.actorId))throw Error('Historie obsahuje neznámého jednajícího.');}
 return {participants:[...pkg.participants],clock,history};
}
function restoreCombatSession(pkg){
 const parsed=parseCombatSessionImport(pkg,data.characters.map(c=>c.id));
 const old={selection:new Set(encounterSelection),clock:structuredClone(combatClock),history:structuredClone(combatDraftHistory)};
 const keys=[ENCOUNTER_DRAFT_KEY,COMBAT_CLOCK_KEY,COMBAT_DRAFT_HISTORY_KEY];
 const before=keys.map(k=>sessionStorage.getItem(k));
 try{
  sessionStorage.setItem(ENCOUNTER_DRAFT_KEY,JSON.stringify(parsed.participants));
  sessionStorage.setItem(COMBAT_CLOCK_KEY,JSON.stringify(parsed.clock));
  sessionStorage.setItem(COMBAT_DRAFT_HISTORY_KEY,JSON.stringify(parsed.history));
  encounterSelection=new Set(parsed.participants);combatClock=parsed.clock;combatDraftHistory=parsed.history;lastCombatEvent=null;combatInjuryTimelineId=uuid();sessionStorage.setItem(COMBAT_INJURY_TIMELINE_KEY,combatInjuryTimelineId);
  return {ok:true,restored:parsed.history.length};
 }catch(err){
  keys.forEach((k,i)=>{try{if(before[i]===null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,before[i])}catch{}});
  encounterSelection=old.selection;combatClock=old.clock;combatDraftHistory=old.history;
  return {ok:false,reason:'Obnova pracovní relace selhala: '+err.message};
 }
}
// v61: a non-mutating, validated event envelope for a future combat resolver.
// Never persist preview results as actual wounds or shock states.
// v62: per-tab event history. It is NOT the authoritative combat state and never mutates characters.
const COMBAT_DRAFT_HISTORY_KEY='hmk-combat-draft-history-v1';
const COMBAT_DRAFT_HISTORY_LIMIT=100;
function validateCombatDraftHistory(records){
 // Old v62/v63 records have no chronology; both forms remain readable.
 for(const x of Array.isArray(records)?records:[]){if(x?.chronology!==undefined){const t=x.chronology;if(!t||!Number.isInteger(t.round)||t.round<1||t.round>9999||typeof t.actorId!=='string')throw Error('Neplatná časová značka bojové události.')}}
 if(!Array.isArray(records)||records.length>COMBAT_DRAFT_HISTORY_LIMIT)throw Error('Neplatná délka historie');
 const ids=new Set();
 for(const entry of records){
  if(!entry||typeof entry!=='object'||typeof entry.id!=='string'||!entry.id||ids.has(entry.id)||typeof entry.savedAt!=='string'||!entry.draft||entry.draft.ok!==true||entry.draft.format!=='hmk-combat-event-draft-v1'||entry.draft.status!=='preview-only'||entry.draft.mutatesCharacter!==false||typeof entry.draft.target?.id!=='string')throw Error('Neplatný návrh události');
  ids.add(entry.id);
 }
 return records;
}
// v63: verify the complete export envelope before any session import.
// The preview-only contract is deliberately immutable: imported records never update characters.
function parseCombatHistoryImport(pkg){
 if(!pkg||typeof pkg!=='object'||Array.isArray(pkg)||pkg.format!=='hmk-combat-draft-history-v1'||pkg.status!=='preview-only'||pkg.mutatesCharacter!==false)throw Error('Soubor není export historie pracovních návrhů HMK.');
 const records=validateCombatDraftHistory(pkg.entries);
 for(const entry of records){
  const d=entry.draft;
  if(!d.target.name||typeof d.target.name!=='string'||typeof d.location!=='string'||!d.location||!['b','e','p','f'].includes(d.aspect)||!d.inputs||!Number.isInteger(d.inputs.impact)||d.inputs.impact<0||!d.impactResult||!d.injuryResult||!d.shockResult||!d.carryover||!['NONE','STN','INC','UNC','KIA'].includes(d.carryover.state))throw Error('Historie obsahuje neúplnou bojovou událost.');
 }
 return structuredClone(records);
}
function mergeCombatHistoryImport(pkg,mode='merge'){
 const incoming=parseCombatHistoryImport(pkg);
 if(!['merge','replace'].includes(mode))return {ok:false,reason:'Neplatný režim importu.'};
 const current=readCombatDraftHistory();
 if(JSON.stringify(current)!==JSON.stringify(combatDraftHistory))return {ok:false,reason:'Historie se změnila; obnovte stránku.'};
 if(mode==='replace')return persistCombatDraftHistory(incoming);
 const known=new Map(current.map(x=>[x.id,x]));
 let added=0,skipped=0;
 for(const item of incoming){
  if(known.has(item.id)){
   if(JSON.stringify(known.get(item.id))!==JSON.stringify(item))return {ok:false,reason:'Konflikt ID: stejné ID označuje odlišné události.'};
   skipped++;continue;
  }
  known.set(item.id,item);added++;
 }
 if(known.size>COMBAT_DRAFT_HISTORY_LIMIT)return {ok:false,reason:'Historie by překročila limit 100 událostí; exportujte ji a zvolte nahrazení.'};
 const result=persistCombatDraftHistory([...known.values()]);
 return result.ok?{ok:true,added,skipped}:result;
}
function readCombatDraftHistory(){try{const raw=sessionStorage.getItem(COMBAT_DRAFT_HISTORY_KEY);return raw?validateCombatDraftHistory(JSON.parse(raw)):[]}catch{return []}}
let combatDraftHistory=readCombatDraftHistory();
function persistCombatDraftHistory(next){
 validateCombatDraftHistory(next);
 try{sessionStorage.setItem(COMBAT_DRAFT_HISTORY_KEY,JSON.stringify(next));combatDraftHistory=next;return {ok:true}}
 catch(e){return {ok:false,reason:'Nepodařilo se uložit historii do sessionStorage: '+e.message}}
}
function saveCombatDraftToHistory(draft){
 if(!draft||draft.ok!==true||draft.status!=='preview-only'||draft.mutatesCharacter!==false)return {ok:false,reason:'Pouze ověřený nezapisující návrh lze uložit.'};
 const current=readCombatDraftHistory();
 // Refuse stale-tab overwrite of a history changed by another component.
 if(JSON.stringify(current)!==JSON.stringify(combatDraftHistory))return {ok:false,reason:'Historie se změnila. Obnovte stránku.'};
 return persistCombatDraftHistory([...current,{id:uuid(),savedAt:stamp(),chronology:{round:combatClock.round,actorId:combatClock.actorId},draft:structuredClone(draft)}].slice(-COMBAT_DRAFT_HISTORY_LIMIT));
}
// Persistent source of truth: c.hmk.combatState in localStorage-backed character records.
// Preview-only session history remains independent; never replay it as committed wounds.
function persistentStateOf(c){return c?.hmk?.combatState??initialCombatState();}
function combatInjurySignature(id){const c=character(id);if(!c)return null;const s=persistentStateOf(c);return JSON.stringify({wounds:s.wounds,shock:s.shock});}
function synchronizeCombatInjuries(c,state){
 c.hmk=c.hmk||{};c.hmk.injuries=c.hmk.injuries||[];
 for(const wound of state.wounds){
  let record=c.hmk.injuries.find(i=>i.id===wound.id);
  if(!record){record={id:wound.id,location:wound.location,severity:wound.severity,description:`HMK ${wound.severity}${wound.level} · ${wound.aspect} · kolo ${wound.recordedRound}`,combatRecord:true};c.hmk.injuries.push(record);}
  if(record.combatRecord!==true)throw Error('Kolize ID s ručně evidovanou ranou');
  record.location=wound.location;record.severity=wound.severity;record.bleeding=wound.bleeding;record.injuryLevel=wound.level;record.description=`HMK ${wound.severity}${wound.level} · ${wound.aspect} · kolo ${wound.recordedRound}${wound.bleeding?' · Bleeder':''}`;
 }
 c.hmk.combatState=state;
}
function confirmableCombatDraft(d){
 if(!d?.ok||!character(d.target?.id)||!encounterSelection.has(d.target.id))throw Error('Neplatný nebo neaktuální návrh cíle');
 const c=character(d.target.id);
 if(c.hmk?.injuries?.some(i=>!i.combatRecord&&String(i.location).toLowerCase()===String(d.location).toLowerCase()))throw Error('V této lokaci je ruční záznam starší rány bez Injury Level. Nejdříve jej pravidlově sjednoťte pro Compound Injury.');
 if(d.armourSource?.inventorySignature!==combatArmourInventorySignature(d.target.id)||d.loadEvidence?.signatures?.some(x=>combatLoadInputSignature(x.id)!==x.signature))throw Error('Výbava nebo STR se změnily, nejprve přepočítejte zásah');
 if(d.injuryEvidence){if(d.injuryEvidence.round!==combatClock.round||d.injuryEvidence.signatures?.some(x=>combatInjurySignature(x.id)!==x.signature))throw Error('Zranění, Shock nebo kolo se změnily; nejprve přepočítejte Melee');}
 const check=replayCombatDraft(d);if(!check.ok)throw Error('Návrh zásahu neprošel nezávislým kontrolním přepočtem');
 return d;
}
function combatPersistentStatePanel(chars){
 const opts=chars.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
 const rows=chars.map(c=>{
  const s=persistentStateOf(c);let valid=true;try{validateCombatState(s)}catch{valid=false;}
  if(!valid)return `<tr><td>${esc(c.name)}</td><td colspan="5">Neplatný bojový stav – zápisy blokovány</td></tr>`;
  const fatigue=combatFatigueTotals(s),due=dueBloodLoss(s,combatClock.round);
  const move=projectInjuredMovement({state:s,round:combatClock.round,timelineId:combatInjuryTimelineId});const injurySummary=move.ready?(move.blocked?' · <strong>Move nepoužitelné</strong>':move.impairment?' · Move −'+move.impairment:''): ' · <strong>Impairment neúplné</strong>'; 
  return `<tr><td>${esc(c.name)}</td><td>${s.shock}</td><td>${s.wounds.length} (${s.wounds.filter(w=>w.bleeding).length} krvácí)${injurySummary}</td><td>${s.bloodLoss.bp}/4</td><td>${fatigue.total}</td><td>${due.length?`<strong>${due.length} čeká na hod</strong>`:'—'}</td></tr>`;
 }).join('');
 const active=chars.flatMap(c=>persistentStateOf(c).wounds.filter(w=>w.bleeding).map(w=>`<option value="${esc(c.id+'::'+w.id)}">${esc(c.name)} · ${esc(w.location)}${w.staunchBonus?` · další Staunch +${w.staunchBonus}`:''} · ${esc(w.id)}</option>`)).join('');
 return `<section class="panel"><h3>Potvrzený bojový stav · trvale v postavách (HMK 168–169, 176–178)</h3><p class="muted">Odděleno od pracovní historie. Zásah se zapíše pouze po potvrzení GM; zranění a Shock se uloží do zálohovaných dat postavy. Fatigue potvrzeného bojového stavu se použije do dalšího Melee EML místo ručního pole Fatigue. Přepnutí kola automaticky nehází Blood Loss ani nezotavuje Shock. Special effects, časování a všechny potřebné hody zůstávají výslovnými rozhodnutími GM.</p><div class="table-scroll"><table><thead><tr><th>Postava</th><th>Shock</th><th>Rány</th><th>BP</th><th>Fatigue</th><th>Splatné Advance</th></tr></thead><tbody>${rows}</tbody></table></div>
 <form id="confirm-combat-hit-form"><h4>Potvrdit právě vypočtený zásah</h4><p class="muted">Vyžaduje aktuální náhled výše. GM před potvrzením rozhodne Compound Injury, Bleeding, případnou amputaci, přeměnu poranění kovovou zbrojí a další zvláštní účinky. Samotný náhled je neumí všechny rozhodnout.</p><div class="field-grid"><label>Bleeding podle Body Location / výsledku zvláštních testů<select name="bleeding" required><option value="">GM musí určit</option><option value="yes">Ano – aktivní Bleeder</option><option value="no">Ne – rána nekrvácí</option></select></label><label>Compound Injury d10 při opakování rány v lokaci (1–10)<input type="number" name="compoundD10" min="1" max="10" step="1" placeholder="Nevyplňovat, pokud není Compound"></label><label><input type="checkbox" name="compoundReviewed" value="yes"> GM ověřil výsledek Compound Injury; Injury Shock musí odpovídat hodu</label><label>Strana zasažené končetiny (paže nebo nohy)<select name="injuredSide"><option value="">Neurčeno / jiná zóna</option><option value="left">Levá</option><option value="right">Pravá</option></select></label><label><input type="checkbox" name="gmReviewed" value="yes" required> GM ověřil všechny zvláštní podmínky zranění podle HMK</label></div><button type="submit">Potvrdit zásah a trvale zapsat</button></form>
 <div class="field-grid"><form id="combat-blood-loss-form"><h4>Blood Loss Advance · každých 60 kol</h4><label>Aktivní rána<select name="wound" required>${active||'<option value="">Žádný Bleeder</option>'}</select></label><label>Výsledek Blood Loss Roll<select name="sl"><option>CS</option><option>S</option><option>F</option><option>CF</option></select></label><button type="submit" ${active?'':'disabled'}>Zapsat jeden splatný Advance</button></form>
 <form id="combat-blood-stoppage-form"><h4>Blood Stoppage · GM provede ošetření</h4><label>Aktivní rána<select name="wound" required>${active||'<option value="">Žádný Bleeder</option>'}</select></label><label>Blood Stoppage SL<select name="sl"><option>CS</option><option>S</option><option>F</option><option>CF</option></select></label><label>Navazující Blood Loss Roll (u CS není)<select name="advanceSL"><option value="">Bez dalšího hodu (pouze CS)</option><option>CS</option><option>S</option><option>F</option><option>CF</option></select></label><button type="submit" ${active?'':'disabled'}>Zapsat výsledek ošetření</button></form></div>
 <div class="field-grid"><form id="combat-recovery-persistent-form"><h4>Shock Recovery / Reroll</h4><label>Účastník<select name="characterId" required>${opts}</select></label><label>Skutečný Shock Roll SL<select name="sl"><option>CS</option><option>S</option><option>F</option><option>CF</option></select></label><label><input type="checkbox" name="timingConfirmed" value="yes" required> GM ověřil správný okamžik, EML a Fatigue</label><button type="submit">Trvale zapsat zotavení</button></form>
 <form id="combat-fatigue-persistent-form"><h4>Fatigue – potvrzená úprava</h4><label>Účastník<select name="characterId" required>${opts}</select></label><label>Typ<select name="kind"><option value="windedness">Windedness</option><option value="weariness">Weariness</option><option value="otherWeakness">Jiná Weakness (ne BP)</option></select></label><label>Změna bodů (+/−)<input type="number" name="delta" step="1" value="5" required></label><button type="submit">Trvale zapsat změnu Fatigue</button></form></div>
 <form id="combat-wound-context-form"><h4>Starší potvrzená rána – doplnit stranu končetiny / Shock</h4><p class="muted">Pouze pro starší záznamy bez strany paže nebo výsledku původního Shock Roll. GM rozhodne podle herních záznamů; systém neodhaduje.</p><div class="field-grid"><label>Rána<select name="wound" required>${chars.flatMap(c=>persistentStateOf(c).wounds.map(w=>`<option value="${esc(c.id+'::'+w.id)}">${esc(c.name)} · ${esc(w.id)} · ${esc(w.location)}</option>`)).join('')}</select></label><label>Strana (pro paži)<select name="side"><option value="">Beze změny</option><option value="left">Levá</option><option value="right">Pravá</option></select></label><label>Původní Shock Roll SL (pro Minor)<select name="shockSL"><option value="">Beze změny</option><option>CS</option><option>S</option><option>F</option><option>CF</option></select></label><label><input type="checkbox" name="minorOnsetGM" value="yes"> GM potvrzuje, že od Minor uplynulo alespoň 10 minut (např. v jiné bitvě)</label><label><input type="checkbox" name="gmReviewed" value="yes" required> Ověřeno GM podle původního HMK a záznamu hodů</label></div><button type="submit">Zapsat chybějící kontext rány</button></form><button type="button" class="secondary" data-action="export-confirmed-combat">Exportovat potvrzené stavy JSON</button><p class="tiny">Při chybě pravidlové návaznosti se nic nezapíše. Trvalá historie událostí se ukládá s postavou a je součástí její zálohy. Nejde zatím o plně automatický systém vedení kol a všech léčebných pravidel.</p></section>`;
}
function combatDraftHistoryPanel(){
 return `<section class="panel"><h3>Historie návrhů bojových událostí (${combatDraftHistory.length})</h3><p class="muted">Pouze pracovní historie této záložky (sessionStorage). Nejde o skutečný bojový deník, potvrzená zranění ani trvalý stav postav. Před zavřením záložky exportujte JSON, pokud chcete historii uchovat.</p><div class="actions"><button type="button" class="secondary" data-action="export-combat-history" ${combatDraftHistory.length?'':'disabled'}>Exportovat historii JSON</button><button type="button" class="secondary" data-action="clear-combat-history" ${combatDraftHistory.length?'':'disabled'}>Vymazat historii návrhů</button></div><div class="field-grid"><label>Obnovit celé pracovní střetnutí JSON<input type="file" id="import-combat-session-file" accept=".json,application/json"></label></div><div class="field-grid"><label>Import historie JSON<input type="file" id="import-combat-history-file" accept=".json,application/json"></label><label>Režim importu<select id="import-combat-history-mode"><option value="merge">Sloučit bez duplicit</option><option value="replace">Nahradit pracovní historii</option></select></label></div><p class="muted">Import kontroluje formát, unikátní ID a strukturu návrhů. Neprovádí opětovný pravidlový výpočet a nikdy nemění postavy. Limit 100 záznamů.</p>${combatDraftHistory.slice().reverse().map(x=>`<details class="encounter-details"><summary>${x.chronology?`Kolo ${esc(x.chronology.round)} · `:""}${esc(x.savedAt)} · ${esc(x.draft.target.name)} · ${esc(x.draft.location)} · ${esc(x.draft.carryover.state)}</summary><p class="muted">${esc(x.draft.aspect)} · Impact ${esc(x.draft.inputs.impact)} · ${esc(x.draft.injuryResult.kind)} · stav ${esc(x.draft.carryover.state)} · preview-only</p><button type="button" class="secondary" data-export-combat-history-entry="${esc(x.id)}">Exportovat tento návrh JSON</button></details>`).join('')}</section>`;
}
let lastCombatEvent=null;
// Equipment-specific provenance: a completed preview may not be saved after its
// target's worn inventory (including layer order and owned snapshot) has changed.
function combatArmourInventorySignature(characterId){
 return JSON.stringify(data.inventory.filter(x=>x.characterId===characterId&&x.slot==='worn')
  .map(x=>({id:x.id,sourceItemId:x.sourceItemId,quantity:x.quantity,slot:x.slot,
   layerOrder:x.layerOrder??null,layerSlot:x.layerSlot??null,bulkExceptionZones:x.bulkExceptionZones??null,snapshot:x.snapshot}))
  .sort((a,b)=>a.id.localeCompare(b.id)));
}
function parsePrintedBulkConfirmation(text){
 const v=String(text??'').trim().toLowerCase();
 if(!v)return null;
 if(v==='none')return {assessed:true,violatingZones:[]};
 return {assessed:true,violatingZones:v.split(',').map(x=>x.trim())};
}
// Revalidate the entire equipment/STR calculation when saving a preview,
// not only the defender's worn armour. No inventory mutation occurs.
function combatLoadInputSignature(id){
 const c=data.characters.find(c=>c.id===id);
 return JSON.stringify({str:c?.hmk?.attributes?.str??null,
  inventory:data.inventory.filter(x=>x.characterId===id).map(x=>({id:x.id,slot:x.slot,gearStowage:x.gearStowage??null,
    quantity:x.quantity,sourceItemId:x.sourceItemId,layerOrder:x.layerOrder??null,layerSlot:x.layerSlot??null,bulkExceptionZones:x.bulkExceptionZones??null,snapshot:x.snapshot}))
   .sort((a,b)=>a.id.localeCompare(b.id))});
}
function buildCombatEventDraft(target,location,aspect,impact,ar,rigid,locationShock,shockLevel,compoundShock,previousState,coverage){
 if(!target||!target.id||!target.name)return {ok:false,reason:'Chybí platný cíl.'};
 if(typeof location!=='string'||!location||!coverage||!Object.prototype.hasOwnProperty.call(coverage,location))return {ok:false,reason:'Lokace nemá ověřené pokrytí zbroje.'};
 if(!['NONE','STN','INC','UNC','KIA'].includes(previousState))return {ok:false,reason:'Neplatný předchozí Shock State.'};
 const sequence=previewShockSequence(impact,aspect,coverage[location],ar,rigid,locationShock,shockLevel);
 if(!sequence.ok)return sequence;
 if(compoundShock!==null){
  const c=previewCompoundShock(sequence.injury,compoundShock);
  if(!c.ok)return c;
  const corrected=previewShockState({...sequence.injury,injuryShock:c.injuryShock},locationShock,shockLevel);
  if(!corrected.ok)return corrected;
  sequence.shock=corrected;
 }
 const carry=previewShockCarryover(previousState,sequence.shock.state);
 if(!carry.ok)return carry;
 return {ok:true,format:'hmk-combat-event-draft-v1',status:'preview-only',mutatesCharacter:false,
  target:{id:target.id,name:target.name},location,aspect,
  inputs:{impact,armourReduction:ar,rigidStatus:rigid,locationShock,shockLevel,compoundShock,previousState},
  impactResult:sequence.impact,injuryResult:sequence.injury,shockResult:sequence.shock,
  carryover:carry,limitations:['Attack and defense rolls not resolved','No wounds, bleeding, amputation or character mutations','Rigid armour must be verified manually','Compound injury must be verified manually']};
}
function specialStrikePreviewPanel(chars){
 const weapons=chars.flatMap(c=>data.inventory.filter(x=>x.characterId===c.id&&['main_hand','off_hand'].includes(x.slot)&&x.snapshot?.category==='weapon').map(x=>({id:x.id,label:c.name+' · '+x.snapshot.name})));
 return `<section class="panel"><h3>Speciální Strike Modes · náhled</h3><p class="muted">Skutečná nasazená zbraň. Náhled bez hodu, bez zápisu do postavy. Chybějící parametry se neodhadují.</p><form id="special-strike-preview-form"><div class="field-grid"><label>Zbraň<select name="inventoryId" required>${weapons.map(w=>`<option value="${esc(w.id)}">${esc(w.label)}</option>`).join('')}</select></label><label>Režim<select name="mode"><option value="half-sword">Half-sword</option><option value="handle">Handle</option><option value="shaft">Shaft</option></select></label><label><input type="checkbox" name="gauntlets" value="yes"> Gauntlets (potvrzené GM)</label></div><button type="submit" ${weapons.length?'':'disabled'}>Ověřit režim</button></form><div id="special-strike-preview-result" class="notice" role="status">Pravidlový náhled, nikoli provedený útok.</div></section>`;
}
function encounterImpactPreviewPanel(chars){
 if(!chars.length)return '';
 return `<section class="panel"><h3>Ověření zásahu · AV, Impact, zranění a Shock</h3><p class="muted">Předběžný výpočet podle HMK str. 111, 117–119 a 167. Ochrana se načítá z aktuálně nasazených kusů cílové postavy; vlastní sestava vyžaduje ověřené články a pořadí vrstev z jejího inventáře. Směr zásahu je povinný. Pro směrovou ochranu proti více protivníkům je nutný d10 podle HMK p.118 (TN5/TN7). Zadejte již určený Impact zásahu, anatomickou lokaci a typ poškození. AR lze použít pouze pro bodný aspekt (p). Úroveň zranění a Glancing Blow se určí podle str. 168 pouze při potvrzeném stavu Rigid Armour. Shock Roll zadejte jako již vyhodnocený výsledek CF/F/S/CS; systém spočítá SHK a stav. Compound Injury Shock lze převzít až po samostatném vyhodnocení d10 a pravidel str. 168. U Melee se automaticky uplatní upravené ENC a Body Zone Bulk obou postav, pokud jsou zdrojově ověřené. Základní ML zadávejte před těmito postihy; nikdy je nezapočítejte dvakrát. Tištěný komplet vyžaduje výslovné posouzení Bulk od GM. Neprovádí hody, krvácení ani změny postavy.</p><form id="impact-preview-form"><div class="field-grid"><label>Cíl<select name="characterId" required>${chars.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><label>Anatomická lokace<select name="location" required><option value="">Vyberte lokaci…</option>${['sk','fa','nk','sh','ua','el','fo','ha','tx','ab','pv','th','kn','ca','ft'].map(loc=>`<option value="${esc(loc)}">${esc(loc)}</option>`).join('')}</select></label><label>Směr zásahu vzhledem k zasažené postavě<select name="direction" required><option value="">Určete směr…</option><option value="front">Zepředu</option><option value="rear">Zezadu</option><option value="side">Z boku</option></select></label>${field('directionalOpponents','Počet protivníků pro směrovou ochranu (HMK p.118)',1,'number')}${field('directionalD10','Směrová ochrana: d10 proti TN5/TN7 při více protivnících (jinak prázdné)','','number')}<label>Typ poškození<select name="aspect"><option value="b">Blunt (b)</option><option value="e">Edge (e)</option><option value="p">Point (p)</option><option value="f">Fire/Frost (f)</option></select></label><label>Zdroj Impact<select name="impactSource"><option value="manual">Ručně zadaný Impact</option><option value="weapon">Vypočítat z nasazené zbraně a hodu</option><option value="melee">Attack/Defence → Impact zbraně (včetně Counterstrike)</option></select></label><label>Útočník<select name="attackerId"><option value="">Vyberte útočníka…</option>${chars.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><label>Obrana<select name="defence"><option value="block">Block</option><option value="dodge">Dodge</option><option value="counterstrike">Counterstrike</option><option value="ignore">Ignore</option></select></label>${field('attackerEML','Útok základní ML (před modifikátory)',50,'number')}${field('attackerModifier','Útok: součet situačních modifikátorů (GM)',0,'number')}${field('attackerFatigue','Útočník: aktuální Fatigue (násobky 5; odečítá se automaticky)',0,'number')}<label><input type="checkbox" name="attackerMounted" value="yes"> Útočník je na koni (−15 ke STR ENC modifikátoru, HMK p.112)</label>${field('attackerBulkZones','Bulk pro tištěný komplet ÚTOČNÍKA: none = GM potvrdil 0; nebo head,arms,torso,legs (prázdné = neověřeno)','','text')}<label><input type="checkbox" name="attackerProne" value="yes"> Útočník leží (Prone; −20 EML)</label>${field('attackerRoll','Útok d100',1,'number')}${field('defenderEML','Obrana základní ML (před modifikátory)',50,'number')}${field('defenderModifier','Obrana: součet situačních modifikátorů (GM)',0,'number')}${field('defenderFatigue','Obránce: aktuální Fatigue (násobky 5; odečítá se automaticky)',0,'number')}<label><input type="checkbox" name="defenderMounted" value="yes"> Obránce je na koni (HMK p.112)</label>${field('defenderBulkZones','Bulk pro tištěný komplet OBRÁNCE: none nebo head,arms,torso,legs','','text')}${field('defenderThreateningFoes','Outnumbered: skutečně ohrožující protivníci obránce (bez Prone / Ignored; GM)',1,'number')}<label><input type="checkbox" name="autoReachFromEquipment" value="yes"> Odvodit RCH z vybraných nasazených zbraní a Strike Modes (velikost zadává GM)</label><label>Dosah: zbraň útočníka<select name="attackerReachWeaponId"><option value="">Vyberte…</option>${data.inventory.filter(x=>selectedEncounterCharacters().some(c=>c.id===x.characterId)&&['main_hand','off_hand'].includes(x.slot)&&x.snapshot?.category==='weapon').map(x=>`<option value="${esc(x.id)}">${esc(selectedEncounterCharacters().find(c=>c.id===x.characterId)?.name||'')} · ${esc(x.snapshot.name)}</option>`).join('')}</select></label><label>Dosah: režim útočníka<select name="attackerReachMode"><option value="primary">Primary</option><option value="half-sword">Half-sword</option><option value="handle">Handle</option><option value="shaft">Shaft</option></select></label><label>Dosah: zbraň obránce<select name="defenderReachWeaponId"><option value="">Vyberte…</option>${data.inventory.filter(x=>selectedEncounterCharacters().some(c=>c.id===x.characterId)&&['main_hand','off_hand'].includes(x.slot)&&x.snapshot?.category==='weapon').map(x=>`<option value="${esc(x.id)}">${esc(selectedEncounterCharacters().find(c=>c.id===x.characterId)?.name||'')} · ${esc(x.snapshot.name)}</option>`).join('')}</select></label><label>Dosah: režim obránce<select name="defenderReachMode"><option value="primary">Primary</option><option value="half-sword">Half-sword</option><option value="handle">Handle</option><option value="shaft">Shaft</option></select></label><label><input type="checkbox" name="reachSizeFromProfiles" value="yes"> Převzít ověřené modifikátory velikosti z profilů obou postav</label>${field('attackerSizeReachModifier','Útočník: reach modifier velikosti (HMK p.401; GM)',0,'number')}${field('defenderSizeReachModifier','Obránce: reach modifier velikosti (HMK p.401)',0,'number')}<label><input type="checkbox" name="useReachEffect" value="yes"> Reach Effect – použít ověřené RCH obou bojovníků</label>${field('attackerReach','Útočník RCH (LNG + velikost; GM)',0,'number')}${field('defenderReach','Obránce RCH (LNG + velikost; GM)',0,'number')}<label><input type="checkbox" name="useRecordedInClose" value="yes" checked> In Close: použít potvrzený stav dvojice (vypnout pouze pro ruční test)</label><label><input type="checkbox" name="inClose" value="yes"> Ruční In Close (jen při vypnuté evidenci)</label><label><input type="checkbox" name="defenderProne" value="yes"> Obránce leží (Prone; −20 EML)</label><label>Použitá paže útočníka (HMK str.167/170)<select name="attackerUsedArms"><option value="unknown">Nerozhodnuto</option><option value="left">Levá</option><option value="right">Pravá</option><option value="both">Obě</option></select></label><label>Použitá paže obránce při Block/Counterstrike<select name="defenderUsedArms"><option value="unknown">Nerozhodnuto</option><option value="left">Levá</option><option value="right">Pravá</option><option value="both">Obě</option></select></label>${field('defenderRoll','Obrana d100',1,'number')}<label><input type="checkbox" name="useVerifiedWeaponTraits" value="yes"> Automaticky zahrnout ověřené Traits nasazené zbraně (Primary Mode)</label>${field('defenderFoeCount','Počet ohrožujících protivníků obránce (Slow)',1,'number')}${field('attackerSetupCreditIds','Setup TA útočníka: ID kreditů oddělená čárkou (max. 3)','')}${field('defenderSetupCreditIds','Setup TA obránce: ID kreditů oddělená čárkou (max. 3)','')}${field('setupCurrentIR','Aktuální Initiative Rank pro Setup TA',0,'number')}${field('finalD10Attacker','Rozhodovací d10 útočníka (jen úplná remíza; jinak prázdné)','','number')}${field('finalD10Defender','Rozhodovací d10 obránce (jen úplná remíza; jinak prázdné)','','number')}<label>Impact TA (potvrzené GM)<select name="impactTA"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label><label>Útočníkova zbraň<select name="weaponInventoryId"><option value="">Vyberte zbraň…</option>${data.inventory.filter(x=>selectedEncounterCharacters().some(c=>c.id===x.characterId)&&['main_hand','off_hand'].includes(x.slot)&&x.snapshot?.category==='weapon').map(x=>`<option value="${esc(x.id)}">${esc(selectedEncounterCharacters().find(c=>c.id===x.characterId)?.name||'')} · ${esc(x.snapshot.name)}</option>`).join('')}</select></label><label>Strike Mode<select name="weaponStrikeMode"><option value="primary">Primary</option><option value="half-sword">Half-sword</option><option value="handle">Handle</option><option value="shaft">Shaft</option></select></label>${field('weaponImpactRoll','Hod kostkou Impact (1 až maximum kostky)',1,'number')}${field('weaponExtraModifier','Další ověřené modifikátory Impact (GM)',0,'number')}<label><input type="checkbox" name="weaponGauntlets" value="yes"> Rukavice pro Half-sword (GM)</label>${field('strikeImpact','Impact zásahu',0,'number')}${field('armourReduction','Armour Reduction (p)',0,'number')}<label>Ochrana podle tištěného kompletu<select name="printedSuit"><option value="auto">Automaticky – komplet, jinak nasazené vrstvy</option><option value="manual">Nasazené jednotlivé kusy – ověřit vrstvy HMK</option>${PRINTED_ARMOUR_SUITS_P113_116.map(s=>`<option value="${esc(s.name)}">${esc(s.name)} (GM – referenční výběr)</option>`).join('')}</select></label><label>Rigid Armour na zasažené lokaci<select name="rigidStatus"><option value="unknown">Automaticky podle ověřených značek HMK</option><option value="yes">Ano – potvrzeno podle pravidel</option><option value="no">Ne – potvrzeno podle pravidel</option></select></label>${field('locationShock','Location Shock (z Body Location table, str. 167)',0,'number')}<label>Compound Injury Shock (volitelné, až po d10 a vyhodnocení Compound Injury)<input name="compoundShock" type="number" min="1" max="6" placeholder="Nevyplňovat, pokud nenastalo"></label><label>Předchozí Shock State cíle<select name="previousState"><option>NONE</option><option>STN</option><option>INC</option><option>UNC</option><option>KIA</option></select></label><label>Výsledek Shock Roll (po zohlednění Fatigue a případného +10 za Glancing Blow)<select name="shockLevel"><option value="S">Success (S)</option><option value="CS">Critical Success (CS)</option><option value="F">Failure (F)</option><option value="CF">Critical Failure (CF)</option></select></label></div><button type="submit">Vyhodnotit Impact, zranění a Shock</button></form><div id="impact-preview-result" class="notice" role="status" aria-live="polite">Výpočet je pouze orientační; nic nezapisuje do postavy ani inventáře.</div><div class="actions"><button type="button" class="secondary" data-action="export-combat-draft" disabled id="export-combat-draft">Exportovat poslední ověřený návrh události JSON</button><button type="button" class="secondary" data-action="save-combat-draft" disabled id="save-combat-draft">Přidat návrh do historie</button></div></section>`;
}
// Read-only armour coverage and rules-backed summed location AV (p.117).

// Inventory snapshots remain authoritative for owned equipment, even if a built-in definition changes.
function armourCoverageReport(c){
 const worn=data.inventory.filter(x=>x.characterId===c.id&&x.slot==='worn'&&x.snapshot?.category==='armor');
 const locations={};const warnings=[];const invalidLocations=new Set();let knownEnc=0,groupPieces=0,unknownEnc=0;
 for(const item of worn){
  const p=item.snapshot.properties||{};const normalized=combatArmourInputs(p);const protection=normalized.protection;
  for(const issue of normalized.issues)warnings.push(`${item.snapshot.name}: ${issue}`);
  if(normalized.issues.length){for(const loc of (Array.isArray(p.coveredLocations)?p.coveredLocations:[]))if(typeof loc==='string')invalidLocations.add(loc);}
  const count=item.quantity;
  if(count!==1){warnings.push(`${item.snapshot.name}: množství nasazeného kusu není 1`);for(const loc of Object.keys(protection))invalidLocations.add(loc);}
  if(!Object.keys(protection).length)warnings.push(`${item.snapshot.name}: chybí ověřené anatomické pokrytí`);
  for(const [loc,av] of Object.entries(protection)){
   (locations[loc]??=[]).push({inventoryId:item.id,name:item.snapshot.name,b:av.b,e:av.e,p:av.p,f:av.f});
  }
  if(p.printedEncCode==='a'||p.printedEncCode==='p'){
   // Symbolic p.118 ENC is not a numeric zero; 'a' and 'p' have separate effects.
   if(p.printedEncCode==='a')groupPieces++;
   if(p.encumbrance!==null&&p.encumbrance!==undefined)warnings.push(`${item.snapshot.name}: symbolické ENC ${p.printedEncCode} má nesprávnou číselnou hodnotu; nelze je považovat za ověřené.`);
  }else if(Number.isSafeInteger(p.encumbrance)&&p.encumbrance>=0)knownEnc+=p.encumbrance;
  else unknownEnc++;
  if(Number.isFinite(p.perceptionPenalty)&&p.perceptionPenalty!==0)warnings.push(`${item.snapshot.name}: postih k vnímání ${p.perceptionPenalty}`);
 }
 const conditionalArmENC=groupPieces>=3?5:0;
 if(conditionalArmENC)warnings.push('Tři nebo více označených zbrojních dílů paží: podmíněné ENC +5 (p. 118), oddělené od ostatních hodnot.');
 if(unknownEnc)warnings.push(`${unknownEnc} kusů nemá ověřenou hodnotu ENC; uvedený součet je neúplný.`);
 const locationAV={};for(const [loc,layers] of Object.entries(locations))locationAV[loc]=sumArmourLocationAV(layers,invalidLocations.has(loc));
 return {characterId:c.id,wornCount:worn.length,locations,locationAV,knownArticleEnc:knownEnc,unknownEncCount:unknownEnc,markedArmArticles:groupPieces,conditionalArmENC,knownENCIncludingArmCondition:knownEnc+conditionalArmENC,warnings,invalidProtectionCount:worn.reduce((n,item)=>n+combatArmourInputs(item.snapshot?.properties).issues.length,0),
  note:'Součet AV vrstev pro jednotlivé lokace a aspekty dle HMK str. 117. Nejde o výpočet zásahu, rigid armour, glancing blow, Bulk ani celkového ENC. Neplatné či neúplné lokace nemají vypočtené AV.'};
}
function armourCoveragePanel(c){
 const r=armourCoverageReport(c);const codes=Object.keys(r.locations).sort();
 return `<details class="encounter-details"><summary>Zbroj · ${r.wornCount} nasazených kusů · ${codes.length} lokací</summary><p class="muted">Vrstvy a <strong>součet ochrany AV pro každou lokaci (b/e/p/f)</strong> podle HMK str. 117. Nejde o vyhodnocení zásahu, rigid armour, Bulk ani celkového ENC. Neplatné nebo neúplné lokace se nesčítají.</p>${codes.length?`<div style="overflow-x:auto"><table style="width:100%;text-align:left"><thead><tr><th>Lokace</th><th>Kus zbroje</th><th>b/e/p/f</th></tr></thead><tbody>${codes.flatMap(loc=>[...r.locations[loc].map(a=>`<tr><td>${esc(loc)}</td><td>${esc(a.name)}</td><td>${[a.b,a.e,a.p,a.f].map(x=>esc(String(x))).join(' / ')}</td></tr>`),`<tr><td><strong>${esc(loc)}</strong></td><td><strong>Celkem AV</strong></td><td><strong>${r.locationAV[loc].complete?['b','e','p','f'].map(k=>r.locationAV[loc].av[k]).join(' / '):'Nelze spolehlivě určit'}</strong></td></tr>`]).join('')}</tbody></table></div>`:'<p class="muted">Žádná nasazená zbroj s evidovaným pokrytím.</p>'}<p class="tiny">Dílčí ENC (nikoli konečné): ${r.knownArticleEnc} + podmíněné ENC paží ${r.conditionalArmENC} = ${r.knownENCIncludingArmCondition}${r.unknownEncCount?' (neúplné)':''}. Nezahrnuje Bulk ani další postihy; není to výsledné ENC postavy.</p>${r.warnings.length?`<ul class="audit-list">${r.warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</details>`;
}
function encounterView(){
 const chars=data.characters;
 const selectedChars=selectedEncounterCharacters();
 const count=selectedChars.length;
 const issues=selectedChars.reduce((sum,c)=>sum+readinessReport(c).length+encounterEquipmentPreflight(c).issues.length+equippedCombatInputs(c).issues.length,0);
 return `<div class="topline"><h2>Příprava bojového střetnutí</h2></div>
 <div class="notice">Tato obrazovka připravuje výběr účastníků a jejich evidované HMK údaje. Nově lze exportovat ověřený návrh jedné bojové události bez změny postavy. Neprovádí hody, útoky ani obranu. Nabízí samostatný výpočet Impact, úrovně zranění a Shock State z ručně zadaného výsledku Shock Roll, bez změn stavu postavy. Výběr se obnoví po obnovení stránky v této záložce; neukládá se do databáze postav ani do exportu zálohy.</div>
 <section class="panel"><h3>Účastníci (${count})</h3>
 ${chars.length?`<div class="encounter-roster">${chars.map(c=>{const warnings=[...readinessReport(c),...encounterEquipmentPreflight(c).issues,...equippedCombatInputs(c).issues];return `<label class="encounter-entry"><input type="checkbox" data-encounter-character="${esc(c.id)}" ${encounterSelection.has(c.id)?'checked':''}><span><strong>${esc(c.name)}</strong><small>${esc(c.kind||'PC')} · ${warnings.length?warnings.length+' upozornění k údajům':'bez upozornění k úplnosti údajů'}</small></span></label>`}).join('')}</div>`:'<p class="muted">Nejprve vytvořte postavy v registru.</p>'}
 <div class="equipment-summary"><div><strong>Vybráno</strong><span>${count} postav</span></div><div><strong>Chybějící evidenční údaje</strong><span>${issues} upozornění</span></div></div>
 <div class="actions"><button type="button" data-action="encounter-all" ${chars.length?'':'disabled'}>Vybrat všechny</button><button type="button" class="secondary" data-action="encounter-clear" ${count?'':'disabled'}>Zrušit výběr</button><button type="button" data-action="encounter-export" ${count?'':'disabled'}>Exportovat podklady JSON</button></div></section>
 ${selectedChars.length?`<section class="panel"><h3>Kontrola účastníků</h3>${selectedChars.map(c=>{const warnings=[...readinessReport(c),...encounterEquipmentPreflight(c).issues.map(x=>'Výbava: '+x),...equippedCombatInputs(c).issues.map(x=>'Combat: '+x)];return `<details class="encounter-details"><summary>${esc(c.name)} · ${warnings.length} upozornění</summary>${warnings.length?`<ul class="audit-list">${warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="muted">Evidenční kontrola bez upozornění; pravidlová správnost není potvrzena.</p>'}</details>${armourCoveragePanel(c)}${combatantLoadPanel(c)}${equippedCombatInputsPanel(c)}`}).join('')}</section>`:''}${combatClockPanel(selectedChars)}${taLedgerPanel(selectedChars)}${inClosePanel(selectedChars)}${specialStrikePreviewPanel(selectedChars)}${encounterImpactPreviewPanel(selectedChars)}${combatPersistentStatePanel(selectedChars)}${combatDraftHistoryPanel()}${combatContinuityPanel()}${combatReplayPanel()}${combatStateProjectionPanel()}${encounterShockFollowupPanel()}${encounterD100Panel()}${encounterShockMLPanel()}`;
}
function editor(title,obj,kind){return `<div class="panel"><h2>${esc(title)}</h2><form id="${kind}-editor">${field('name','Název / jméno',obj.name||'')}${kind==='character'?`${field('occupation','Povolání',obj.occupation||'')}<label>Typ<select name="kind"><option>PC</option><option>NPC</option></select></label>${area('description','Popis',obj.description||'')}`:`<label>Kategorie<select name="category">${[['weapon','Zbraň'],['shield','Štít'],['armor','Zbroj'],['other','Ostatní předmět']].map(([v,l])=>`<option value="${v}" ${obj.category===v?'selected':''}>${l}</option>`).join('')}</select></label>${area('description','Popis',obj.description||'')}${field('source','Odkaz na zdroj (např. kapitola/strana)',obj.source||'')}${area('properties','Vlastní parametry JSON',JSON.stringify(obj.properties||{},null,2))}`}<div class="actions"><button type="submit">Uložit</button>${button('Zrušit','cancel-editor')}</div></form></div>`}
let overlay=null;
function render(){document.getElementById('app').innerHTML=main()+(overlay||'');}
function ask(msg){return window.confirm(msg)}

document.addEventListener('click',e=>{
 const button=e.target.closest?.('[data-action="award-last-melee-ta"]');if(!button)return;
 if(!pendingMeleeTA?.ok||!pendingMeleeTA.ownerId||pendingMeleeTA.remaining<1){alert('Neexistuje ověřený výsledek s nevyužitou TA. Nejprve vyhodnoťte Attack/Defence.');return;}
 const allowed=pendingMeleeTA.allowed.filter(t=>t==='action'||t==='setup');
 if(!allowed.length){alert('Tento výsledek dovoluje jen Impact/Precision, nikoli uložitelnou Action/Setup TA.');return;}
 const type=prompt('Typ TA ('+allowed.join(' / ')+'):',allowed[0]);if(type===null)return;
 const countText=prompt('Počet TA (nejvýše '+pendingMeleeTA.remaining+'):','1');if(countText===null)return;
 const irText=prompt('Initiative Rank získání (0–100):','0');if(irText===null)return;
 const count=Number(countText),ir=Number(irText);
 if(!/^\d+$/.test(countText)||!/^\d+$/.test(irText)||ir>100){alert('Počet a IR musí být platná celá čísla.');return;}
 try{
  const choice=allocateMeleeTACredit(pendingMeleeTA,{type,count});
  if(!confirm('Uložit '+count+'× '+type+' TA pro '+(data.characters.find(c=>c.id===choice.ownerId)?.name||choice.ownerId)+'? Zbývající TA se tímto výběrem neuloží.'))return;
  let next=taLedger;
  for(let i=0;i<count;i++)next=awardTACredit(next,{id:crypto.randomUUID(),ownerId:choice.ownerId,type:choice.type,round:combatClock.round,ir,verified:true});
  persistTALedger(next);pendingMeleeTA=null;render();
 }catch(err){alert('TA: '+err.message)}
});
document.addEventListener('click',e=>{const t=e.target.closest('[data-action],[data-nav],[data-open],[data-copy],[data-archive],[data-remove-inv],[data-delete-log],[data-edit-item],[data-copy-item],[data-delete-item],[data-restore],[data-purge],[data-delete-character],[data-export-character]');if(!t)return;
if(t.dataset.exportCharacter){if(storageReadOnly)return alert('Nečitelná data: použijte nouzovou zálohu.');try{const pkg=characterPackage(t.dataset.exportCharacter);downloadJSON(pkg,'hmk-postava-'+safeFilename(pkg.character.name)+'.json')}catch(err){alert(err.message)}return}
if(t.dataset.action==='export-confirmed-combat'){downloadJSON({format:'hmk-confirmed-combat-export-v1',exportedAt:stamp(),participants:selectedEncounterCharacters().map(c=>({characterId:c.id,name:c.name,state:structuredClone(persistentStateOf(c))}))},'hmk-confirmed-combat-state.json');return}
if(t.dataset.action==='combat-next-round'){const r=persistCombatClock({round:combatClock.round+1,actorId:''});if(!r.ok)return alert(r.reason);render();return}
if(t.dataset.action==='export-state-projection'){downloadJSON(combatStateProjectionReport(),'hmk-combat-state-projection-v68.json');return}
if(t.dataset.action==='export-replay-audit'){downloadJSON(auditCombatReplay(combatDraftHistory),'hmk-combat-replay-audit.json');return}
if(t.dataset.action==='export-continuity-audit'){downloadJSON(auditCombatContinuity(combatDraftHistory,data.characters.map(c=>c.id)),'hmk-combat-continuity-audit.json');return}
if(t.dataset.action==='combat-clock-export'){downloadJSON(combatSessionExport(),'hmk-combat-session-preview.json');return}
if(t.dataset.action==='encounter-all'){lastCombatEvent=null;encounterSelection=new Set(data.characters.map(c=>c.id));persistEncounterDraft();render();return}
if(t.dataset.action==='encounter-clear'){lastCombatEvent=null;encounterSelection.clear();persistEncounterDraft();render();return}
if(t.dataset.exportCombatHistoryEntry){const entry=combatDraftHistory.find(x=>x.id===t.dataset.exportCombatHistoryEntry);if(entry)downloadJSON(entry,'hmk-combat-event-'+safeFilename(entry.id)+'.json');return}
if(t.dataset.action==='save-combat-draft'){
 if(!lastCombatEvent?.ok)return alert('Nejprve vyhodnoťte platný návrh události.');
 if(lastCombatEvent.armourSource?.inventorySignature!==combatArmourInventorySignature(lastCombatEvent.target.id))return alert('Nasazená zbroj se od výpočtu změnila. Zásah přepočítejte.');
 if(lastCombatEvent.loadEvidence?.signatures?.some(x=>combatLoadInputSignature(x.id)!==x.signature))return alert('STR nebo nesené/nasazené vybavení se od výpočtu změnilo. Zásah přepočítejte.');
 const r=saveCombatDraftToHistory(lastCombatEvent);if(!r.ok)return alert(r.reason);
 lastCombatEvent=null;render();return;
}
if(t.dataset.action==='export-combat-history'){if(combatDraftHistory.length)downloadJSON({format:'hmk-combat-draft-history-v1',status:'preview-only',mutatesCharacter:false,entries:combatDraftHistory},'hmk-combat-draft-history.json');return}
if(t.dataset.action==='clear-combat-history'){if(!combatDraftHistory.length||!ask('Smazat pracovní historii návrhů v této záložce? Postavy ani inventáře se nezmění.'))return;const r=persistCombatDraftHistory([]);if(!r.ok)return alert(r.reason);render();return}
if(t.dataset.action==='export-combat-draft'){if(!lastCombatEvent||!lastCombatEvent.ok)return alert('Nejprve úspěšně vyhodnoťte zásah.');if(lastCombatEvent.armourSource?.inventorySignature!==combatArmourInventorySignature(lastCombatEvent.target.id)||lastCombatEvent.loadEvidence?.signatures?.some(x=>combatLoadInputSignature(x.id)!==x.signature))return alert('Vybavení nebo STR se změnily: návrh zásahu je neaktuální. Přepočítejte jej.');downloadJSON(lastCombatEvent,'hmk-combat-event-draft.json');return}
if(t.dataset.action==='encounter-export'){try{downloadJSON(encounterPayload(),'hmk-encounter-preparation.json')}catch(err){alert(err.message)}return}
if(t.dataset.action==='export-inventory-audit'){if(storageReadOnly)return alert('Nečitelná data: audit inventáře není dostupný.');downloadJSON(inventoryProvenanceReport(),'hmk-audit-inventare-v26.json');return}
if(t.dataset.action==='export-catalog-coverage'){if(storageReadOnly)return alert('Nečitelná data: export není dostupný.');downloadJSON(catalogCoverage(allCatalogItems()),'hmk-pokryti-katalogu-v73.json');return}
if(t.dataset.action==='export-catalog-audit-csv'){if(storageReadOnly)return alert('Nečitelná data: audit katalogu není dostupný.');downloadCatalogAuditCSV();return}
if(t.dataset.action==='export-catalog-audit'){if(storageReadOnly)return alert('Nečitelná data: audit katalogu není dostupný.');downloadJSON(catalogAuditReport(),'hmk-audit-katalogu-v25.json');return}
if(t.dataset.action==='export-catalog'){if(storageReadOnly)return alert('Nečitelná data: export katalogu není dostupný.');downloadJSON({format:'hmk-equipment-catalog-v1',exportedAt:stamp(),items:structuredClone(data.items)},'hmk-katalog-vybaveni.json');return}
if(t.dataset.action==='export-diagnostic'){downloadJSON(diagnosticReport(),'hmk-diagnostic-'+new Date().toISOString().slice(0,10)+'.json');return}
if(t.dataset.action==='export-raw'){downloadRawStorage();return}
if(t.dataset.action==='export-kernel-character'){const c=character(selected);if(c)downloadJSON(kernelExport([c]),'hmk-character-'+safeFilename(c.name)+'.json');return}
if(t.dataset.action==='export-kernel-all'){downloadJSON(kernelExport(data.characters),'hmk-domain-export.json');return}
if(t.dataset.nav){lastCombatEvent=null;view=t.dataset.nav;query='';overlay=null;render();return}if(t.dataset.open){selected=t.dataset.open;view='sheet';overlay=null;render();return}
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
if(t.dataset.reconcileInv){reconcileInventoryItem(t.dataset.reconcileInv);return}
if(t.dataset.removeInv){if(ask('Odebrat předmět z inventáře?'))mutate(()=>data.inventory=data.inventory.filter(x=>x.id!==t.dataset.removeInv));return}
if(t.dataset.deleteLog){if(ask('Smazat zápis?'))mutate(()=>data.journal=data.journal.filter(x=>x.id!==t.dataset.deleteLog));return}
if(t.dataset.editItem){if(item(t.dataset.editItem)?.builtin)return alert('Vestavěné pravidlové definice nelze upravit.');editItem=t.dataset.editItem;const i=item(editItem);overlay=equipmentEditor('Upravit předmět',i);render();return}
if(t.dataset.copyItem){const i=item(t.dataset.copyItem);if(i?.builtin)return alert('Vestavěné definice se nekopírují; vytvořte vlastní předmět.');mutate(()=>data.items.push({...structuredClone(i),id:uuid(),name:i.name+' (kopie)'}));return}
if(t.dataset.deleteItem){if(item(t.dataset.deleteItem)?.builtin)return alert('Vestavěné pravidlové definice nelze odstranit.');if(ask('Odstranit předmět z knihovny? Existující inventáře zůstanou beze změny.'))mutate(()=>data.items=data.items.filter(x=>x.id!==t.dataset.deleteItem));return}
const a=t.dataset.action;if(a==='new-character'){overlay=editor('Nová postava',{},'character');render()}if(a==='new-item'){editItem=null;overlay=equipmentEditor('Nový předmět',{category});render()}if(a==='cancel-editor'){overlay=null;render()}if(a==='go-characters'){view='characters';query='';render()}if(a==='export'){if(storageReadOnly){alert('Původní data se nepodařilo načíst. Použijte nouzovou kopii původního úložiště, nikoliv standardní zálohu.');return}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`hmk-ledger-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
});
document.addEventListener('submit',e=>{
 if(e.target.id!=='special-strike-preview-form')return;
 e.preventDefault();
 const v=Object.fromEntries(new FormData(e.target));const out=document.getElementById('special-strike-preview-result');if(!out)return;
 const x=data.inventory.find(i=>i.id===v.inventoryId&&['main_hand','off_hand'].includes(i.slot)&&selectedEncounterCharacters().some(c=>c.id===i.characterId));
 if(!x){out.textContent='Zbraň již není nasazena vybraným účastníkem.';return;}
 const r=specialStrikeFromSnapshot(x.snapshot,v.mode,{gauntlets:v.gauntlets==='yes'});
 out.textContent=r.ok?`Režim ${r.mode}: LNG ${r.length}; ZD ${r.zd}; Impact ${r.impact?.die===undefined?'původní':`d${r.impact.die}${r.impact.modifier>=0?'+':''}${r.impact.modifier}`}; aspekt ${r.aspect}; obouruč ${r.twoHanded?'ano':'ne'}; CF poranění ruky ${r.cfGripInjury?'ano':'ne'}. Pouze náhled.`:`Nelze bezpečně vyhodnotit: ${r.reason}. Doplňte ověřené parametry zbraně.`;
});
document.addEventListener('submit',e=>{
 const f=e.target;
 if(!['confirm-combat-hit-form','combat-blood-loss-form','combat-blood-stoppage-form','combat-recovery-persistent-form','combat-fatigue-persistent-form','combat-wound-context-form'].includes(f.id))return;
 e.preventDefault();e.stopImmediatePropagation();
 const v=Object.fromEntries(new FormData(f)),round=combatClock.round,eventId=uuid();
 let c=null,transition=null;
 try{
  if(f.id==='confirm-combat-hit-form'){
   const draft=confirmableCombatDraft(lastCombatEvent);c=character(draft.target.id);
   transition=applyConfirmedHit({state:persistentStateOf(c),characterId:c.id,draft,round,eventId,
    adjudication:{gmReviewed:v.gmReviewed==='yes',compoundReviewed:v.compoundReviewed==='yes',compoundD10:v.compoundD10===''?null:Number(v.compoundD10),bleeding:v.bleeding==='yes'?true:v.bleeding==='no'?false:null,side:v.injuredSide||null,timelineId:combatInjuryTimelineId}});
  }else if(f.id==='combat-wound-context-form'){
   const raw=String(v.wound||''),separator=raw.indexOf('::');if(separator<1)throw Error('Neplatné ID rány');
   c=character(raw.slice(0,separator));if(!c||!encounterSelection.has(c.id))throw Error('Postava není v tomto střetnutí');
   transition=applyConfirmedWoundContext({state:persistentStateOf(c),round,eventId,woundId:raw.slice(separator+2),side:v.side||null,shockSL:v.shockSL||null,minorOnsetGM:v.minorOnsetGM==='yes',gmReviewed:v.gmReviewed==='yes'});
  }else if(f.id==='combat-blood-loss-form'||f.id==='combat-blood-stoppage-form'){
   const raw=String(v.wound||'');const separator=raw.indexOf('::');if(separator<1)throw Error('Neplatné ID krvácení');
   c=character(raw.slice(0,separator));if(!c||!encounterSelection.has(c.id))throw Error('Postava není účastníkem střetnutí');
   const woundId=raw.slice(separator+2);
   transition=f.id==='combat-blood-loss-form'?applyConfirmedBloodLoss({state:persistentStateOf(c),round,eventId,woundId,sl:v.sl}):applyConfirmedBloodStoppage({state:persistentStateOf(c),round,eventId,woundId,sl:v.sl,advanceSL:v.advanceSL||null});
  }else{
   c=character(v.characterId);if(!c||!encounterSelection.has(c.id))throw Error('Postava není účastníkem střetnutí');
   transition=f.id==='combat-recovery-persistent-form'?applyConfirmedShockRecovery({state:persistentStateOf(c),round,eventId,sl:v.sl,timingConfirmed:v.timingConfirmed==='yes'}):applyConfirmedFatigue({state:persistentStateOf(c),round,eventId,kind:v.kind,delta:Number(v.delta)});
  }
  if(!window.confirm(`Opravdu trvale zapsat ${f.id==='confirm-combat-hit-form'?'zásah':f.id==='combat-blood-loss-form'?'ztrátu krve':f.id==='combat-blood-stoppage-form'?'ošetření':f.id==='combat-recovery-persistent-form'?'zotavení':'únavu'} postavě ${c.name} v kole ${round}?`))return;
  if(mutate(()=>synchronizeCombatInjuries(c,transition.state)))lastCombatEvent=null;
 }catch(err){alert('Bojový stav nebyl změněn: '+err.message)}
},true);
document.addEventListener('submit',e=>{
 if(e.target.id==='combat-clock-form'){
 e.preventDefault();const v=Object.fromEntries(new FormData(e.target));const n=Number(v.round);
 const actors=[...encounterSelection];if(v.actorId&&!actors.includes(v.actorId))return alert('Jednající postava není účastníkem střetnutí.');
 const r=persistCombatClock({round:n,actorId:v.actorId});if(!r.ok)return alert(r.reason);render();return;
}
if(e.target.id==='shock-ml-form'){
 e.preventDefault();const v=Object.fromEntries(new FormData(e.target));const el=document.getElementById('shock-ml-result');
 if(!['ml','fatigue','glancing','roll'].every(k=>/^\d+$/.test(String(v[k]??'').trim()))){el.textContent='Všechny číselné vstupy musí být celá nezáporná čísla (d100 od 1).';return;}
 const ml=Number(v.ml),fatigue=Number(v.fatigue),bonus=Number(v.glancing),roll=Number(v.roll);
 const r=v.kind==='initial'?hmkShockRollFromML(ml,fatigue,bonus,roll):hmkShockRerollFromML(v.kind,ml,fatigue,roll);
 if(!r.ok){el.textContent=r.reason;return;}
 el.textContent=`Shock ML ${ml} − Fatigue ${fatigue}${r.eml.reroll?' − Reroll 20':''}${r.eml.glancingBonus?' + Glancing 10':''} = EML ${r.eml.rawEML} → použito ${r.eml.effectiveEML}${r.eml.clamped?' (limit 05–95)':''}; d100 ${roll} → ${r.test.level}.${r.recovery?` Zotavení ${v.kind} → ${r.recovery.state}${r.recovery.extendedShock?' / Extended Shock '+r.recovery.extendedShock:''}${r.recovery.coma?' / Coma':''}.`:` Shock modifier ${r.shockModifier>=0?'+':''}${r.shockModifier} SHK.`} Injury impairment se nepoužívá. Bez zápisu.`;return;
 }
 if(e.target.id==='d100-shock-form'){
 e.preventDefault();const v=Object.fromEntries(new FormData(e.target));const el=document.getElementById('d100-shock-result');
 const roll=String(v.roll??'').trim(),eml=String(v.eml??'').trim();
 if(!/^\d+$/.test(roll)||!/^\d+$/.test(eml)){el.textContent='d100 i EML musí být celá čísla.';return;}
 const r=hmkShockRecoveryD100(v.previous,Number(roll),Number(eml));
 if(!r.ok){el.textContent=r.reason;return;}
 el.textContent=`d100 ${r.test.roll} proti EML ${r.test.effectiveEML}${r.test.clamped?` (zadáno ${r.test.enteredEML}, použito standardní omezení 05–95)`:''} → ${r.test.level}. Zotavení: ${v.previous} → ${r.recovery.state}.${r.recovery.extendedShock?' Extended Shock '+r.recovery.extendedShock+'.':''}${r.recovery.coma?' Coma.':''} Konečné EML musí již obsahovat příslušné modifikátory včetně Fatigue a případného −20; bez zápisu do postavy.`;return;
 }
 if(e.target.id==='shock-followup-form'){
 e.preventDefault();const v=Object.fromEntries(new FormData(e.target));const r=previewShockCarryover(v.previous,v.incoming);
 document.getElementById('shock-followup-result').textContent=r.ok?`Výsledný stav: ${r.state}${r.escalated?' (eskalace opakovaného stavu podle str. 169)':''}. Bez zápisu do postavy.`:r.reason;return;
 }
 if(e.target.id==='shock-recovery-form'){
 e.preventDefault();const v=Object.fromEntries(new FormData(e.target));const r=previewShockRecovery(v.previous,v.level);
 document.getElementById('shock-recovery-result').textContent=r.ok?`Výsledek: ${r.state}. ${r.test}; ${r.timing==='after-ten-minutes'?'po 10 minutách':'na konci dalšího tahu'}. ${r.penalty?'Postih −20 a Fatigue. ':'Fatigue podle pravidel. '}${r.extendedShock?'Extended Shock '+r.extendedShock+'. ':''}${r.coma?'Coma při UNC a CF. ':''}Bez zápisu do postavy.`:r.reason;return;
 }
 if(e.target.id==='ta-award-form'){
 e.preventDefault();const v=Object.fromEntries(new FormData(e.target));
 if(!selectedEncounterCharacters().some(c=>c.id===v.ownerId))return alert('Postava není ve střetnutí.');
 try{const next=awardTACredit(taLedger,{id:crypto.randomUUID(),ownerId:v.ownerId,type:v.type,round:Number(v.round),ir:Number(v.ir),weaponSlot:v.weaponSlot||null,verified:v.verified==='yes'});persistTALedger(next);render();}catch(err){alert(err.message)}return;
 }
 if(e.target.id==='in-close-pair-form'){
 e.preventDefault();const v=Object.fromEntries(new FormData(e.target));const r=saveInClosePair(v.first,v.second,v.active==='yes',{reason:v.reason,targetCondition:v.targetCondition,withinFiveFeet:v.withinFiveFeet==='yes',successfulGrab:v.successfulGrab==='yes',actionTA:v.actionTA==='yes',actionCreditId:v.actionCreditId,currentIR:Number(v.currentIR),turnKey:v.turnKey,weaponSlot:v.weaponSlot,gmTightQuarters:v.gmTightQuarters==='yes',separationFeet:Number(v.separationFeet)});if(!r.ok)return alert(r.reason);render();return;
 }
 if(e.target.id!=='impact-preview-form')return;
 e.preventDefault();
 lastCombatEvent=null;pendingMeleeTA=null;const oldExport=document.getElementById('export-combat-draft');if(oldExport)oldExport.disabled=true;const oldSave=document.getElementById('save-combat-draft');if(oldSave)oldSave.disabled=true;
 const v=Object.fromEntries(new FormData(e.target));let target=selectedEncounterCharacters().find(c=>c.id===v.characterId);
 const output=document.getElementById('impact-preview-result');if(!output)return;
 if(!target){output.textContent='Zvolený účastník již není ve střetnutí.';return;}
 if(target.hmk?.combatState&&v.previousState!==target.hmk.combatState.shock){output.textContent='Předchozí Shock musí odpovídat potvrzenému stavu '+target.hmk.combatState.shock+'. Přepněte volbu a proveďte nový výpočet.';return;}
 if(target.hmk?.combatState?.shock==='KIA'){output.textContent='Cíl již má potvrzený KIA stav.';return;}
 let weaponStrike=null;let meleeGate=null;let actualStriker=null;let originalDefenderId=target.id;let preparedSetupLedger=null;let attackerLoad=null;let defenderLoad=null;
 if(v.impactSource==='melee'){
  const attacker=selectedEncounterCharacters().find(c=>c.id===v.attackerId);
  if(!attacker||attacker.id===target.id){output.textContent='Vyberte odlišného útočníka ze střetnutí.';return;}
  if(['INC','UNC','KIA'].includes(attacker.hmk?.combatState?.shock)){output.textContent='Útočník je podle potvrzeného stavu '+attacker.hmk.combatState.shock+' a nemůže provést samostatnou Melee akci.';return;}
  if(v.defence!=='ignore'&&['INC','UNC','KIA'].includes(target.hmk?.combatState?.shock)){output.textContent='Obránce je podle potvrzeného stavu '+target.hmk.combatState.shock+' a nemůže provést aktivní obrannou akci. Zvolte odpovídající řešení podle HMK.';return;}
  attackerLoad=resolveCombatantLoad({character:attacker,inventory:data.inventory,mounted:v.attackerMounted==='yes',bulkConfirmation:parsePrintedBulkConfirmation(v.attackerBulkZones)});
  defenderLoad=resolveCombatantLoad({character:target,inventory:data.inventory,mounted:v.defenderMounted==='yes',bulkConfirmation:parsePrintedBulkConfirmation(v.defenderBulkZones)});
  if(!attackerLoad.ready||(v.defence!=='ignore'&&!defenderLoad.ready)){
   const failed=!attackerLoad.ready?attackerLoad:defenderLoad;
   output.textContent='ENC/Bulk postavy nelze použít do Melee: '+(failed.issues.join(' · ')||(!failed.encReady?'Neúplné ENC':'Bulk tištěného kompletu musí výslovně ověřit GM (none nebo zóny).'));
   return;
  }
  const integerField=name=>/^-?\d+$/.test(String(v[name]??''))?Number(v[name]):NaN;
  const attackMods=[{label:'GM situační modifikátory útoku',value:integerField('attackerModifier')}];
  const defendMods=[{label:'GM situační modifikátory obrany',value:integerField('defenderModifier')}];
  const attackerFatigue=fatigueEMLModifier(attacker.hmk?.combatState?combatFatigueTotals(persistentStateOf(attacker)).total:integerField('attackerFatigue'));
  const defenderFatigue=fatigueEMLModifier(target.hmk?.combatState?combatFatigueTotals(persistentStateOf(target)).total:integerField('defenderFatigue'));
  if(!attackerFatigue.ok||(v.defence!=='ignore'&&!defenderFatigue.ok)){output.textContent='Fatigue: '+(!attackerFatigue.ok?attackerFatigue.reason:defenderFatigue.reason);return;}
  attackMods.push({label:attackerFatigue.label,value:attackerFatigue.value});
  attackMods.push({label:'HMK p112 upravené ENC (Melee SB obsahuje AGL)',value:attackerLoad.agilityAndMeleePenalty});
  attackMods.push({label:'HMK p117/170 Bulk (H/A/T/L)',value:attackerLoad.meleeBulkPenalty});
  if(v.defence!=='ignore'){defendMods.push({label:defenderFatigue.label,value:defenderFatigue.value});
   defendMods.push({label:'HMK p112 upravené ENC (Melee SB obsahuje AGL)',value:defenderLoad.agilityAndMeleePenalty});
   defendMods.push({label:'HMK p117/170 Bulk (H/A/T/L)',value:defenderLoad.meleeBulkPenalty});}
  if(v.defence!=='ignore'){const outnumbered=outnumberedEMLModifier(integerField('defenderThreateningFoes'));if(!outnumbered.ok){output.textContent='Outnumbered: '+outnumbered.reason;return;}defendMods.push({label:outnumbered.label,value:outnumbered.value});}
  if(v.useReachEffect==='yes'){
   let attackerRCH=integerField('attackerReach'),defenderRCH=integerField('defenderReach');
   if(v.autoReachFromEquipment==='yes'){
    // The actual striker is known only after Attack/Defence resolves; validate after the gate.
    const a=reachFromSelectedEquipment(data.inventory,attacker.id,v.attackerReachWeaponId,{mode:v.attackerReachMode,sizeReachModifier:v.reachSizeFromProfiles==='yes'?resolveCharacterReachSizeModifier(attacker).value:integerField('attackerSizeReachModifier')});
    const d=reachFromSelectedEquipment(data.inventory,target.id,v.defenderReachWeaponId,{mode:v.defenderReachMode,sizeReachModifier:v.reachSizeFromProfiles==='yes'?resolveCharacterReachSizeModifier(target).value:integerField('defenderSizeReachModifier')});
    if(!a.ok||!d.ok){output.textContent='Automatický RCH vyžaduje platnou zbraň a režim pro každou postavu: '+(!a.ok?a.reason:d.reason);return;}
    attackerRCH=a.rch;defenderRCH=d.rch;
   }
   const reach=verifiedReachEMLModifiers({attackerRCH,defenderRCH,inClose:v.useRecordedInClose==='yes'?inClosePairs.has(inClosePairKey(attacker.id,target.id)):v.inClose==='yes'});if(!reach.ok){output.textContent='Reach Effect: '+reach.reason;return;}attackMods.push({label:'Reach Effect (HMK p.159/171)',value:reach.attacker});if(v.defence!=='ignore')defendMods.push({label:'Reach Effect (HMK p.159/171)',value:reach.defender});}
  const attackProne=proneMeleeEMLModifier({prone:v.attackerProne==='yes'});
  const defendProne=proneMeleeEMLModifier({prone:v.defenderProne==='yes'});
  if(!attackProne.ok||!defendProne.ok){output.textContent='Prone: '+(!attackProne.ok?attackProne.reason:defendProne.reason);return;}
  attackMods.push({label:attackProne.label,value:attackProne.value});
  if(v.defence!=='ignore')defendMods.push({label:defendProne.label,value:defendProne.value});
  if(v.useVerifiedWeaponTraits==='yes'){
   if(v.weaponStrikeMode!=='primary'){output.textContent='Automatické Traits zatím podporují pouze Primary Mode.';return;}
   const equipped=data.inventory.find(x=>x.id===v.weaponInventoryId&&x.characterId===attacker.id&&['main_hand','off_hand'].includes(x.slot)&&x.snapshot?.category==='weapon');
   if(!equipped){output.textContent='Pro automatické Traits vyberte nasazenou zbraň útočníka.';return;}
   const automaticAttack=verifiedMeleeModifiers(equipped.snapshot,{role:'attack'});
   if(!automaticAttack.ok){output.textContent='Útočné Traits: '+automaticAttack.reason;return;}
   attackMods.push(...automaticAttack.modifiers);
   if(v.defence==='block'||v.defence==='counterstrike'){
    const defendingWeapons=data.inventory.filter(x=>x.characterId===target.id&&['main_hand','off_hand'].includes(x.slot)&&x.snapshot?.category==='weapon');
    if(defendingWeapons.length!==1){output.textContent='Pro automatické obranné Traits musí mít obránce právě jednu nasazenou zbraň; jinak vypněte automatiku.';return;}
    const automaticDefence=verifiedMeleeModifiers(defendingWeapons[0].snapshot,{role:'defence',defence:v.defence,threateningFoeCount:integerField('defenderFoeCount')});
    if(!automaticDefence.ok){output.textContent='Obranné Traits: '+automaticDefence.reason;return;}
    defendMods.push(...automaticDefence.modifiers);
   }
  }
  for(const c of [attacker,target]){
   const manual=c.hmk?.injuries?.filter(x=>x.combatRecord!==true)??[];
   if(manual.length){output.textContent=`${c.name}: ${manual.length} ručně evidovaných zranění nemá ověřenou Severity/Side/Shock přímo v bojovém stavu. HMK str.170: před Melee je musí GM sjednotit; nelze je tiše ignorovat.`;return;}
  }
  const armPick=value=>value==='left'?['left']:value==='right'?['right']:value==='both'?['left','right']:null;
  const attackInjury=projectLiveInjuries({state:persistentStateOf(attacker),round:combatClock.round,test:'melee',usedArms:armPick(v.attackerUsedArms),timelineId:combatInjuryTimelineId});
  const defenceInjury=v.defence==='ignore'?null:projectLiveInjuries({state:persistentStateOf(target),round:combatClock.round,test:v.defence==='dodge'?'dodge':'melee',usedArms:v.defence==='dodge'?[]:armPick(v.defenderUsedArms),timelineId:combatInjuryTimelineId});
  if(!attackInjury.ready||(defenceInjury&&!defenceInjury.ready)){output.textContent='Injury Impairment / unusable zone: '+(!attackInjury.ready?attackInjury.reason:defenceInjury.reason);return;}
  const aInjuryEffect=liveMeleeInjuryConsequence({projection:attackInjury,role:'attack'});
  const dInjuryEffect=defenceInjury?liveMeleeInjuryConsequence({projection:defenceInjury,role:'defence',defence:v.defence}):null;
  attackMods.push({label:'HMK p170 potvrzená zranění – Injury Impairment',value:aInjuryEffect.modifier});
  if(dInjuryEffect)defendMods.push({label:'HMK p170 potvrzená zranění – Injury Impairment',value:dInjuryEffect.modifier});
  const attackEML=assembleMeleeEML({baseML:integerField('attackerEML'),modifiers:attackMods});
  const defendEML=assembleMeleeEML({baseML:integerField('defenderEML'),modifiers:defendMods});
  if(!attackEML.ok||(v.defence!=='ignore'&&!defendEML.ok)){output.textContent='Nelze sestavit EML: '+(!attackEML.ok?attackEML.reason:defendEML.reason);return;}
  let attackerSetup=0,defenderSetup=0;
  try{
   const round=combatClock.round,ir=integerField('setupCurrentIR');
   const a=prepareSetupSpend(taLedger,{ids:parseSetupTASelection(v.attackerSetupCreditIds||''),ownerId:attacker.id,round,ir});
   const d=prepareSetupSpend(a.next,{ids:parseSetupTASelection(v.defenderSetupCreditIds||''),ownerId:target.id,round,ir});
   if(v.defence==='ignore'&&d.count)throw Error('Ignore nemá obranný test pro Setup TA');
   attackerSetup=a.count;defenderSetup=d.count;preparedSetupLedger=d.next;
  }catch(err){output.textContent='Setup TA: '+err.message;return;}
  meleeGate=resolveMeleeAttackGate({defence:v.defence,attackerSetup,defenderSetup,attackerEML:attackEML.effectiveEML,attackerRoll:Number(v.attackerRoll),defenderEML:defendEML.ok?defendEML.effectiveEML:0,defenderRoll:Number(v.defenderRoll),impactTA:Number(v.impactTA),finalD10Attacker:v.finalD10Attacker===''?null:Number(v.finalD10Attacker),finalD10Defender:v.finalD10Defender===''?null:Number(v.finalD10Defender),attackerSLPenalty:aInjuryEffect.slPenalty,defenderSLPenalty:dInjuryEffect?.slPenalty??0,attackerForcedCF:aInjuryEffect.forcedCF,defenderForcedCF:dInjuryEffect?.forcedCF??false});
  meleeGate.injuryAudit={attacker:attackInjury,defender:defenceInjury,forcedCFMishapGM:!!dInjuryEffect?.defenceMishapForced};
  meleeGate.emlAudit={attacker:attackEML,defender:v.defence==='ignore'?null:defendEML};
  if(!meleeGate.ok){output.textContent='Attack/Defence: '+meleeGate.reason;return;}
  pendingMeleeTA=meleeTAAwardOptions(meleeGate,{attackerId:attacker.id,defenderId:target.id});
  if(!meleeGate.attackerStrike&&!meleeGate.counterStrike){if(preparedSetupLedger)persistTALedger(preparedSetupLedger);output.textContent='Attack/Defence neudělil zásah. '+meleeGate.summary+' Návrh zranění nevznikl.';return;}
  actualStriker=meleeGate.counterStrike?target:attacker;
  if(v.useReachEffect==='yes'&&v.autoReachFromEquipment==='yes'){
   const reachWeaponId=meleeGate.counterStrike?v.defenderReachWeaponId:v.attackerReachWeaponId;
   const reachMode=meleeGate.counterStrike?v.defenderReachMode:v.attackerReachMode;
   const match=validateStrikeReachSelection({strikeWeaponId:v.weaponInventoryId,strikeMode:v.weaponStrikeMode,reachWeaponId,reachMode});
   if(!match.ok){output.textContent='Reach / Strike Mode: '+match.reason+' — zbraň a režim skutečného původce zásahu se musí shodovat s výpočtem dosahu.';return;}
  }
  if(meleeGate.counterStrike)target=attacker;
  const chosen=data.inventory.find(x=>x.id===v.weaponInventoryId&&x.characterId===actualStriker.id&&['main_hand','off_hand'].includes(x.slot)&&x.snapshot?.category==='weapon');
  if(!chosen){output.textContent='Zbraň musí být nasazena skutečným původcem zásahu (při Counterstrike obráncem).';return;}
 }
 if(v.impactSource==='weapon'||v.impactSource==='melee'){
  const equipped=data.inventory.find(x=>x.id===v.weaponInventoryId&&['main_hand','off_hand'].includes(x.slot)&&x.snapshot?.category==='weapon'&&selectedEncounterCharacters().some(c=>c.id===x.characterId));
  if(!equipped){output.textContent='Vybraná zbraň není nasazena účastníkem střetnutí.';return;}
  if(!/^-?\d+$/.test(String(v.weaponImpactRoll??''))||!/^-?\d+$/.test(String(v.weaponExtraModifier??''))){output.textContent='Hod a modifikátor musí být celá čísla.';return;}
  weaponStrike=resolveWeaponStrikeImpact(equipped.snapshot,v.weaponStrikeMode,Number(v.weaponImpactRoll),{gauntlets:v.weaponGauntlets==='yes',additionalModifier:Number(v.weaponExtraModifier)});
  if(!weaponStrike.ok){output.textContent='Nelze vypočítat Impact zbraně: '+weaponStrike.reason;return;}
  const taOverride=equipped.snapshot.properties?.impactTAModifier??null;
  const ta=verifiedImpactTA({aspect:weaponStrike.aspect,count:meleeGate?.impactTA??0,override:taOverride});
  if(!ta.ok){output.textContent='Impact TA: '+ta.reason;return;}
  if(meleeGate){meleeGate.impactBonus=ta.bonus;meleeGate.impactTAAspect=weaponStrike.aspect;}
  v.strikeImpact=String(weaponStrike.impact+ta.bonus);v.aspect=weaponStrike.aspect;
 }
 const rawImpact=String(v.strikeImpact??'');const rawAR=String(v.armourReduction??'');const rawLocationShock=String(v.locationShock??'');
 if(!/^\d+$/.test(rawImpact)||!/^\d+$/.test(rawAR)||!/^\d+$/.test(rawLocationShock)){output.textContent='Impact, AR i Location Shock musí být nezáporná celá čísla.';return;}
 const compoundRaw=String(v.compoundShock??'').trim();
 if(compoundRaw&&!/^\d+$/.test(compoundRaw)){output.textContent='Compound Injury Shock musí být celé číslo.';return;}
 const inputMode=v.printedSuit==='auto'?'auto':v.printedSuit==='manual'?'custom':'reference';
 if(v.impactSource==='melee'&&inputMode==='reference'){output.textContent='Pro skutečný Melee výpočet nelze použít fiktivní referenční komplet, který není nasazen v inventáři cíle. Zvolte Auto nebo jednotlivé kusy.';return;}
 const resolved=resolveLiveCombatArmour({inventory:data.inventory,targetId:target.id,location:v.location,aspect:v.aspect,
  direction:v.direction,mode:inputMode,suitName:inputMode==='reference'?v.printedSuit:null,rigidStatus:v.rigidStatus,
  directionalContext:{opponents:Number(v.directionalOpponents),d10:v.directionalD10===''?null:Number(v.directionalD10)}});
 if(!resolved.ready){output.textContent='Nasazená zbroj: '+resolved.reason+(resolved.detail?' · '+JSON.stringify(resolved.detail):'')+'. Opravte nasazené kusy, jejich vrstvy nebo směr útoku. AV se nesmí odhadnout.';return;}
 const coverage={[v.location]:{complete:true,av:{[v.aspect]:resolved.armourValue}}};
 const draft=buildCombatEventDraft(target,v.location,v.aspect,Number(rawImpact),Number(rawAR),resolved.rigidStatus,
  Number(rawLocationShock),v.shockLevel,compoundRaw?Number(compoundRaw):null,v.previousState,coverage);
 if(draft.ok&&weaponStrike)draft.weaponStrike={...weaponStrike,inventoryId:v.weaponInventoryId};
 if(draft.ok&&meleeGate)draft.attackDefence={...meleeGate,attackerId:v.attackerId,defenderId:originalDefenderId,actualStrikerId:actualStriker.id,actualTargetId:target.id};
 if(draft.ok){
  const targetLoad=meleeGate?(target.id===v.attackerId?attackerLoad:defenderLoad):resolveCombatantLoad({character:target,inventory:data.inventory});
  const evidence=meleeGate?[attackerLoad,defenderLoad]:[targetLoad];
  draft.loadEvidence={source:'HMK pp112,117-118,122,170',mutatesCharacter:false,
   loadouts:evidence.map(r=>({characterId:r.characterId,encReady:r.encReady,bulkReady:r.bulkReady,mode:r.mode,
    armourENC:r.armourENC,gearENC:r.gearENC,baseENC:r.baseENC,strengthModifier:r.strengthModifier,modifiedENC:r.modifiedENC,
    personalFatiguePerPeriod:r.personalFatiguePerPeriod,bulkByZone:r.bulkByZone,meleeBulkPenalty:r.meleeBulkPenalty,issues:r.issues})),
   signatures:evidence.map(r=>({id:r.characterId,signature:combatLoadInputSignature(r.characterId)}))};
 }
 if(draft.ok&&meleeGate){draft.injuryEvidence={round:combatClock.round,
   signatures:[v.attackerId,originalDefenderId].map(id=>({id,signature:combatInjurySignature(id)}))};}
 if(draft.ok){draft.armourSource={type:resolved.mode,inputMode,source:resolved.source,suitName:resolved.suitName||null,
  direction:resolved.direction,inventoryIds:resolved.inventoryIds,articleIds:resolved.articleIds||[],
  armourValue:resolved.armourValue,rigidStatus:resolved.rigidStatus,rigidSource:resolved.rigidSource,
  extraEnc:resolved.extraEnc,bulkPenalty:resolved.bulkPenalty,directionalContext:resolved.directionalContext||null,
  inventorySignature:combatArmourInventorySignature(target.id)};}
 if(!draft.ok){lastCombatEvent=null;output.textContent=draft.reason;return;}
 if(preparedSetupLedger)persistTALedger(preparedSetupLedger);
 draft.proposalId=uuid();
 lastCombatEvent=draft;
 const exportButton=document.getElementById('export-combat-draft');if(exportButton)exportButton.disabled=false;const saveButton=document.getElementById('save-combat-draft');if(saveButton)saveButton.disabled=false;
 const sequence={impact:draft.impactResult,injury:draft.injuryResult,shock:draft.shockResult};
 const result=sequence.impact;const injury=sequence.injury;
 const outcome=injury.kind==='none'?'Žádné zranění (Impact 0).':injury.kind==='undetermined'?'Úroveň zranění nerozhodnuta: nejprve ověřte Rigid Armour na zasažené lokaci.':injury.kind==='glancing'?'GLANCING BLOW: žádné M1; Injury Shock 1; bonus +10 k Shock Roll.':`Zranění ${injury.injury} (${v.aspect}); Injury Shock ${injury.injuryShock}.`;
 output.textContent=`Zbroj: ${resolved.mode==='custom-worn'?'skutečně nasazené články':'tištěný komplet'} · směr ${v.direction} · ${resolved.inventoryIds.length} položek · Rigid ${resolved.rigidStatus}${resolved.extraEnc!==null?' · vrstvy Extra ENC '+resolved.extraEnc:''}. ${meleeGate?`Melee ENC útočník/obránce ${attackerLoad.modifiedENC}/${defenderLoad.modifiedENC}; Bulk ${attackerLoad.meleeBulkPenalty}/${defenderLoad.meleeBulkPenalty}; Injury p170 ${meleeGate.injuryAudit.attacker.impairment}/${meleeGate.injuryAudit.defender?.impairment??0}${meleeGate.attackerForcedCF||meleeGate.defenderForcedCF?' (Grievous: nucený CF; GM vyhodnotí Mishap)':''}; výsledné EML ${meleeGate.emlAudit.attacker.effectiveEML}/${meleeGate.emlAudit.defender?.effectiveEML??'—'}. `:`ENC cíl: ${draft.loadEvidence.loadouts[0].encReady?draft.loadEvidence.loadouts[0].modifiedENC:'neúplné údaje'}. `}${target.name} · ${v.location} · ${v.aspect}: Impact ${result.strikeImpact} − AV ${result.effectiveAV}${result.armourReduction?` (základ ${result.baseAV}, AR ${result.armourReduction})`:''} = efektivní Impact ${result.effectiveImpact}. ${outcome} Shock: Location ${sequence.shock.locationShock} + Injury ${sequence.shock.injuryShock} + ${sequence.shock.shockLevel} (${sequence.shock.rollModifier>=0?'+':''}${sequence.shock.rollModifier}) = SHK ${sequence.shock.shk} → ${sequence.shock.state}. ${sequence.shock.glancingBonus?'Pro Shock Roll platí +10 za Glancing Blow. ':''}Výsledek Shock Roll je převzat od GM (včetně Fatigue, bez Injury impairment). Přenos stavu: ${v.previousState} → ${draft.carryover.state}. Návrh lze po GM kontrole zapsat do trvalého bojového stavu v sekci níže. Samotné vyhodnocení náhledu stav nemění.`;
});
document.addEventListener('submit',e=>{const f=e.target;if(!['character-editor','item-editor','character-form','add-inventory','journal-form'].includes(f.id))return;e.preventDefault();const v=Object.fromEntries(new FormData(f));if(f.id==='character-editor'){if(!v.name.trim())return alert('Zadejte jméno');if(mutate(()=>data.characters.push({id:uuid(),name:v.name.trim(),occupation:v.occupation||'',kind:v.kind,description:v.description||'',portrait:''}))) {overlay=null;render()}return}if(f.id==='character-form'){if(!v.name.trim())return alert('Zadejte jméno');mutate(()=>Object.assign(character(selected),{name:v.name.trim(),occupation:v.occupation,kind:v.kind,description:v.description,portrait:v.portrait}));return}if(f.id==='item-editor'){if(editItem&&item(editItem)?.builtin)return alert('Vestavěné definice nelze upravit.');if(!v.name.trim())return alert('Zadejte název');let properties;try{properties=JSON.parse(v.properties||'{}');if(!properties||Array.isArray(properties)||typeof properties!=='object')throw Error()}catch{return alert('Parametry musí být platný JSON objekt')}if(mutate(()=>{const record={id:editItem||uuid(),name:v.name.trim(),category:v.category,description:v.description||'',source:v.source||'',properties};if(editItem)Object.assign(item(editItem),record);else data.items.push(record)})){overlay=null;render()}return}if(f.id==='add-inventory'){const i=item(v.itemId);const quantity=Number(v.quantity);if(!i||!Number.isSafeInteger(quantity)||quantity<1||quantity>999999)return alert('Vyberte předmět a platný počet');if(!validSlotForCategory(v.slot,i.category))return alert('Tento slot neodpovídá kategorii předmětu');if(['main_hand','off_hand','worn'].includes(v.slot)&&quantity!==1)return alert('Vybavený předmět musí představovat jeden kus. Další kusy evidujte samostatně jako nesené.');if(!handSlotAvailable(selected,v.slot))return alert('Ruka je již obsazena. Nejprve přesuňte stávající předmět.');const currentWQ=v.currentWQ===''?null:Number(v.currentWQ);if(currentWQ!==null&&(!Number.isSafeInteger(currentWQ)||currentWQ<0||currentWQ>999))return alert('Neplatná aktuální WQ');mutate(()=>data.inventory.push({id:uuid(),currentWQ,characterId:selected,sourceItemId:i.id,snapshot:structuredClone(i),quantity,condition:v.condition||'',slot:v.slot||'none'}));return}if(f.id==='journal-form'){if(!v.title.trim()&&!v.body.trim())return;mutate(()=>data.journal.push({id:uuid(),characterId:selected,title:v.title.trim()||'Bez názvu',body:v.body,createdAt:stamp()}))}});
document.addEventListener('input',e=>{if(e.target.closest?.('#impact-preview-form')){lastCombatEvent=null;for(const id of ['export-combat-draft','save-combat-draft']){const b=document.getElementById(id);if(b)b.disabled=true;}}if(e.target.id==='search'){query=e.target.value;const pos=e.target.selectionStart;render();const input=document.getElementById('search');input.focus();input.setSelectionRange(pos,pos)}});
document.addEventListener('change',async e=>{if(e.target.closest?.('#impact-preview-form')){lastCombatEvent=null;for(const id of ['export-combat-draft','save-combat-draft']){const b=document.getElementById(id);if(b)b.disabled=true;}}if(e.target.id==='import-combat-session-file'){
 const f=e.target.files?.[0];if(!f)return;
 try{if(f.size>2_000_000)throw Error('Soubor je příliš velký (max. 2 MB).');const pkg=JSON.parse(await f.text());const parsed=parseCombatSessionImport(pkg,data.characters.map(c=>c.id));if(!ask(`Nahradit aktuální pracovní střetnutí (${parsed.history.length} událostí, ${parsed.participants.length} účastníků)? Postavy ani inventáře se nezmění.`))return;const r=restoreCombatSession(pkg);if(!r.ok)throw Error(r.reason);render();alert('Pracovní střetnutí bylo obnoveno.');}catch(err){alert('Obnova střetnutí odmítnuta: '+err.message)}finally{e.target.value=''}return;
 }if(e.target.id==='import-combat-history-file'){
 const f=e.target.files?.[0];if(!f)return;
 try{
  if(f.size>2_000_000)throw Error('Soubor je příliš velký (max. 2 MB).');
  const pkg=JSON.parse(await f.text());const mode=document.getElementById('import-combat-history-mode')?.value||'merge';
  const records=parseCombatHistoryImport(pkg);
  if(!ask(`Importovat ${records.length} návrhů (${mode==='replace'?'nahradit':'sloučit'})? Postavy se nezmění.`))return;
  const result=mergeCombatHistoryImport(pkg,mode);
  if(!result.ok)throw Error(result.reason);
  alert(`Import dokončen. ${mode==='merge'?`Přidáno ${result.added}, již existovalo ${result.skipped}.`:'Pracovní historie byla nahrazena.'}`);render();
 }catch(err){alert('Import historie odmítnut: '+err.message)}return;
 }if(e.target.id==='category'){category=e.target.value;render()}if(e.target.id==='catalog-status'){catalogStatus=e.target.value;render()}if(e.target.id==='import-character-file'){
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
function hmkSheet(c){const h=c.hmk||{};const a=h.attributes||{};const skills=h.skills||[];return `<section class="panel wide"><h3>HMK · Charakteristika a původ</h3><p class="muted">Struktura podle listu postavy HMK. Prázdné hodnoty znamenají nezadané; aplikace nic nehází ani nedopočítává.</p><form id="hmk-profile-form"><div class="field-grid">${HMK_IDENTITY.map(([k,l])=>field('bio_'+k,l,h[k]??'')).join('')}${field('bio_creatureSizeReachModifier','Creature Size: ověřený RCH modifikátor (HMK p.401; celé číslo, prázdné = neověřeno)',h.creatureSizeReachModifier??'','number')}</div><h3>Physical Attributes</h3><div class="field-grid">${HMK_ATTRIBUTES.PHYSICAL.map(([k,l])=>numericField('attr_'+k,l,a[k])).join('')}</div><h3>Mental Attributes</h3><div class="field-grid">${HMK_ATTRIBUTES.MENTAL.map(([k,l])=>numericField('attr_'+k,l,a[k])).join('')}</div><div class="actions"><button type="submit">Uložit HMK profil</button></div></form></section><section class="panel wide"><h3>Dovednosti · Skills</h3><p class="muted">SB/ML se zadávají ručně podle HMK; automatický výpočet bude připojen až k ověřenému pravidlovému resolveru.</p><div class="table-scroll"><table><thead><tr><th>Skupina</th><th>Dovednost</th><th>SB</th><th>ML</th><th></th></tr></thead><tbody>${skills.map(x=>`<tr><td>${esc(x.group)}</td><td>${esc(x.name)}</td><td>${esc(x.sb??'')}</td><td>${esc(x.ml??'')}</td><td><button class="secondary" data-edit-skill="${esc(x.id)}">Upravit</button> <button class="danger" data-remove-skill="${esc(x.id)}">×</button></td></tr>`).join('')}</tbody></table></div><form id="hmk-skill-form"><div class="field-grid"><label>Skupina<select name="group"><option>Social</option><option>Lore</option><option>Physical</option><option>Esoterica</option><option>Combat</option><option>Craft</option><option>Other</option></select></label>${field('name','Název dovednosti')}${numericField('sb','SB','')}${numericField('ml','ML','')}</div><button type="submit">Přidat dovednost</button></form></section><section class="panel wide"><h3>Zranění a stav postavy</h3><p class="muted">Záznamy jsou evidenční, nikoli výpočet šoku, krvácení nebo léčby. Ty musí zůstat pod kontrolou HMK jádra.</p>${(h.injuries||[]).map(x=>`<div class="list-row"><div><b>${esc(x.location)}</b> · ${esc(x.description)} <span class="muted">${esc(x.severity)}</span></div><div class="actions"><button class="secondary" data-edit-injury="${esc(x.id)}">Upravit</button><button class="danger" data-remove-injury="${esc(x.id)}">Odstranit</button></div></div>`).join('')}<form id="hmk-injury-form"><div class="field-grid">${field('location','Lokalita zásahu')}${field('severity','Závažnost / označení')}${field('description','Popis poranění')}</div><button type="submit">Zapsat zranění</button></form></section>`}
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
// v32: spreadsheet-friendly, read-only audit. Escape delimiters and prevent CSV formula execution.
function safeCSVCell(value){
 const raw=String(value??'');
 // Excel may interpret leading =, +, -, @, tab or control whitespace as a formula.
 const safe=/^[\s\u0000-\u001f]*[=+\-@]/u.test(raw)?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
}
function catalogAuditCSV(){
 const rows=[['ID','Název','Kategorie','Zdroj HMK','Stav evidence','Chybějící údaje']];
 for(const e of catalogAuditReport().entries)rows.push([e.id,e.name,e.category,e.source||'',e.ready?'Bez upozornění':'K doplnění',e.missing.join('; ')]);
 return '\uFEFF'+rows.map(row=>row.map(safeCSVCell).join(';')).join('\r\n')+'\r\n';
}
function downloadCatalogAuditCSV(){
 const blob=new Blob([catalogAuditCSV()],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);const link=document.createElement('a');
 link.href=url;link.download='hmk-audit-katalogu-v32.csv';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function downloadJSON(value,filename){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function kernelExport(chars){
 const characterIds=new Set(chars.map(c=>c.id));
 const definitions=[];const instances=[];const used=new Set();const warnings=[];
 const characters=chars.map(c=>{
  const skills={};for(const skill of c.hmk?.skills||[]){const key=skill.id||kernelUUID();skills[key]=KernelSkill({id:key,key:skill.name,name:skill.name,ml:skill.ml??null,sb:skill.sb??null,group:skill.group||null});if(skill.ml===null||skill.ml===undefined)warnings.push('Dovednost '+skill.name+' u postavy '+c.name+' nemá ML.');}
  const attributes={...(c.hmk?.attributes||{})};
  if(!Object.keys(attributes).length)warnings.push('Postava '+c.name+' nemá zadané atributy.');
  return KernelCharacter({id:c.id,name:c.name,attributes,skills,handedness:c.hmk?.handedness==='left'?'left':'right',notes:c.description||''});
 });
 for(const inv of data.inventory.filter(x=>characterIds.has(x.characterId))){
  const src=inv.snapshot||{};const p=src.properties||{};const defId=src.id||inv.sourceItemId||inv.id;
  if(src.category==='weapon'){
   const normalized=combatStrikeModes(p);for(const issue of normalized.issues)warnings.push('Zbraň '+src.name+': '+issue);
   if(!used.has(defId)){definitions.push(WeaponDefinition({id:defId,name:src.name||'Unnamed',modes:normalized.modes,baseWQ:asNumber(p.quality),weightLb:asNonNegativeNumber(p.weightLb),traits:verifiedTraits(p)}));used.add(defId);}
   instances.push(WeaponInstance({id:inv.id,definitionId:defId,currentWQ:inv.currentWQ??asNumber(p.quality),baseWQ:asNumber(p.quality),ownerId:inv.characterId,custom:{quantity:inv.quantity,condition:inv.condition,unverifiedProperties:p}}));
   if(!normalized.modes.some(m=>m.kind==='primary'))warnings.push('Zbraň '+src.name+': chybí platný základní útočný režim.');
   if(p.traits&&!verifiedTraits(p).length)warnings.push('Zbraň '+src.name+': textové traits se nepřevádějí automaticky.');
  }else if(src.category==='shield'){
   const normalized=combatShieldInputs(p);for(const issue of normalized.issues)warnings.push('Štít '+src.name+': '+issue);
   instances.push(Shield({id:inv.id,definitionId:defId,currentWQ:inv.currentWQ??asNumber(p.quality),baseWQ:asNumber(p.quality),shieldMod:normalized.shieldModifier,deflect:normalized.deflect,ownerId:inv.characterId}));
   if(!normalized.modes.length)warnings.push('Štít '+src.name+': chybí platný útočný režim.');
  }else if(src.category==='armor'){
   const normalized=combatArmourInputs(p);
   for(const issue of normalized.issues)warnings.push('Zbroj '+src.name+': '+issue);
   instances.push(ArmourArticle({id:inv.id,definitionId:defId,ownerId:inv.characterId,locations:normalized.protection}));
  }
 }
 return {schemaVersion:SCHEMA_VERSION,format:'hmk-domain-bridge-v2',exportedAt:stamp(),characters,weaponDefinitions:definitions,equipmentInstances:instances,warnings};
}
function validatedProtection(raw){if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};try{return parseLocationProtection(JSON.stringify(raw))}catch{return {}}}
function verifiedModes(p){return Array.isArray(p.verifiedModes)?p.verifiedModes.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).map(x=>structuredClone(x)):[]}
function verifiedTraits(p){return Array.isArray(p.verifiedTraits)?p.verifiedTraits.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()):[]}
function asNonNegativeNumber(v){if(v===null||v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null}
function asNumber(v){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isSafeInteger(n)&&n>=0?n:null}

// v11: Form-based inventory editing with explicit category and slot validation.
function inventoryEditForm(x){return `<div class="editor-backdrop"><section class="panel editor-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-inv-title"><h2 id="edit-inv-title">Upravit vybavení: ${esc(x.snapshot.name)}</h2><p class="muted">${esc(x.snapshot.category)} · Změny se projeví až po uložení.</p><form id="inventory-edit-form"><input type="hidden" name="id" value="${esc(x.id)}">${numericField('quantity','Počet kusů',x.quantity)}${field('condition','Stav / poznámka',x.condition||'')}${numericField('currentWQ','Aktuální WQ (neznámá = prázdné)',x.currentWQ??'')}${slotSelect('slot',x.slot||'none')}<label>Způsob nesení (pro výbavu mimo zbroj na těle)<select name="gearStowage">${[['normal','Běžně'],['awkward','Nepohodlně (dvojnásobná hmotnost)'],['backpack','Uvnitř správně sbaleného batohu (poloviční hmotnost)']].map(([k,v])=>`<option value="${k}" ${x.gearStowage===k?'selected':''}>${v}</option>`).join('')}</select></label>${x.snapshot.category==='armor'?`${field('layerOrder','Pořadí vrstvy zevnitř ven (0–99, pouze pro vlastní sestavy)',x.layerOrder??'','number')}${field('bulkExceptionZones','GM Bulk výjimka: head,arms,torso,legs (pouze doložená výjimka HMK)',(x.bulkExceptionZones||[]).join(','))}<label>Sloupec vrstvy podle HMK p.117 (volitelný)<select name="layerSlot">${[['','Neurčen'],['underFar','Under far'],['underNear','Under near'],['base','Base'],['overNear','Over near'],['overFar','Over far']].map(([k,v])=>`<option value="${k}" ${x.layerSlot===k?'selected':''}>${v}</option>`).join('')}</select></label>`:''}<div class="actions"><button type="submit">Uložit změny</button><button type="button" class="secondary" data-action="cancel-editor">Zrušit</button></div></form></section></div>`}

document.addEventListener('click',e=>{const t=e.target.closest('[data-edit-inv]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();const x=data.inventory.find(x=>x.id===t.dataset.editInv&&x.characterId===selected);if(!x)return;overlay=inventoryEditForm(x);render()},true);
document.addEventListener('submit',e=>{if(e.target.id!=='inventory-edit-form')return;e.preventDefault();e.stopImmediatePropagation();const v=Object.fromEntries(new FormData(e.target));const x=data.inventory.find(x=>x.id===v.id&&x.characterId===selected);if(!x)return alert('Předmět již neexistuje');const quantity=Number(v.quantity);const currentWQ=v.currentWQ.trim()===''?null:Number(v.currentWQ);if(!Number.isSafeInteger(quantity)||quantity<1||quantity>999999)return alert('Počet musí být celé číslo 1–999999');if(currentWQ!==null&&(!Number.isSafeInteger(currentWQ)||currentWQ<0||currentWQ>999))return alert('WQ musí být celé číslo 0–999');if(!validSlotForCategory(v.slot,x.snapshot.category))return alert('Neplatný slot pro tento typ předmětu');if(['main_hand','off_hand','worn'].includes(v.slot)&&quantity!==1)return alert('Nasazený předmět musí mít počet 1');if(!handSlotAvailable(x.characterId,v.slot,x.id))return alert('Ruka je již obsazena');const layerOrder=x.snapshot.category==='armor'&&String(v.layerOrder??'').trim()!==''?Number(v.layerOrder):null;const layerSlot=x.snapshot.category==='armor'?(v.layerSlot||null):null;const bulkExceptionZones=x.snapshot.category==='armor'&&String(v.bulkExceptionZones??'').trim()?String(v.bulkExceptionZones).split(',').map(z=>z.trim().toLowerCase()):[];if(new Set(bulkExceptionZones).size!==bulkExceptionZones.length||bulkExceptionZones.some(z=>!['head','arms','torso','legs'].includes(z)))return alert('Bulk: neplatné nebo opakované tělesné zóny');const gearStowage=v.gearStowage||'normal';if(!['normal','awkward','backpack'].includes(gearStowage))return alert('Neplatný způsob nesení');if(gearStowage==='backpack'&&v.slot!=='carried')return alert('Obsah batohu musí být ve slotu Neseno');if(layerOrder!==null&&(!Number.isSafeInteger(layerOrder)||layerOrder<0||layerOrder>99))return alert('Pořadí zbrojní vrstvy musí být celé číslo 0–99');if(mutate(()=>{const target=data.inventory.find(row=>row.id===v.id&&row.characterId===selected);if(!target)throw Error('Předmět již neexistuje');target.quantity=quantity;target.currentWQ=currentWQ;target.condition=v.condition;target.slot=v.slot;target.gearStowage=gearStowage;if(target.snapshot.category==='armor'){target.layerOrder=layerOrder;target.layerSlot=layerSlot;target.bulkExceptionZones=bulkExceptionZones}})){overlay=null;render()}},true);

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
 if(t.dataset.editInjury){const x=(c.hmk?.injuries||[]).find(x=>x.id===id);if(!x)return;if(x.combatRecord===true)return alert('Potvrzenou bojovou ránu lze upravit jen pravidlovým přechodem, ne ručně v deníku.');const location=prompt('Lokalita zásahu',x.location);if(location===null)return;if(!location.trim())return alert('Lokalita je povinná');const severity=prompt('Závažnost',x.severity||'');if(severity===null)return;const description=prompt('Popis poranění',x.description||'');if(description===null)return;mutate(()=>{x.location=location.trim();x.severity=severity;x.description=description})}
},true);
// Capture phase handles new forms before the legacy form dispatcher.
document.addEventListener('submit',e=>{const f=e.target;if(!['hmk-profile-form','hmk-skill-form','hmk-injury-form','hmk-item-form'].includes(f.id))return;e.preventDefault();e.stopImmediatePropagation();const v=Object.fromEntries(new FormData(f));if(f.id==='hmk-item-form'){if(!String(v.name||'').trim())return alert('Zadejte název');const current=editItem?item(editItem):null;if(current&&current.category!==v.category)return alert('Změna kategorie existujícího předmětu není podporována. Založte nový předmět.');const props={...(current?.properties||{})};for(const [k,val] of Object.entries(v))if(k.startsWith('spec_'))props[k.slice(5)]=val;if(v.category==='weapon'){
  try{props.verifiedModes=parseStructuredModes(v.verifiedModes);props.verifiedTraits=parseStructuredTraits(v.verifiedTraits)}catch(err){return alert(err.message)}
 }else if(v.category==='armor'){
  try{props.locationProtection=parseLocationProtection(v.locationProtection)}catch(err){return alert(err.message)}
 }
 const record={id:editItem||uuid(),name:v.name.trim(),category:v.category,description:v.description||'',source:v.source||'',properties:props};if(mutate(()=>{if(current)Object.assign(current,record);else data.items.push(record)})){overlay=null;render()}return}const c=character(selected);if(!c)return;const h=structuredClone(c.hmk||{});if(f.id==='hmk-profile-form'){const a={...(h.attributes||{})};for(const [k,val] of Object.entries(v)){if(k==='bio_creatureSizeReachModifier'){if(val==='')delete h.creatureSizeReachModifier;else if(!/^-?\d+$/.test(String(val))||!Number.isSafeInteger(Number(val)))return alert('Neplatný modifikátor Creature Size');else h.creatureSizeReachModifier=Number(val);}else if(k.startsWith('bio_'))h[k.slice(4)]=val;if(k.startsWith('attr_')){if(val==='')delete a[k.slice(5)];else{const n=Number(val);if(!Number.isSafeInteger(n)||n<0||n>999)return alert('Neplatná charakteristika');a[k.slice(5)]=n}}}mutate(()=>{c.hmk={...h,attributes:a}});return}if(f.id==='hmk-skill-form'){if(!String(v.name||'').trim())return alert('Zadejte název dovednosti');const skill={id:uuid(),group:v.group,name:v.name.trim(),sb:v.sb===''?null:Number(v.sb),ml:v.ml===''?null:Number(v.ml)};if([skill.sb,skill.ml].some(n=>n!==null&&(!Number.isSafeInteger(n)||n<0||n>999)))return alert('Neplatné SB/ML');mutate(()=>{c.hmk={...h,skills:[...(h.skills||[]),skill]}});return}if(f.id==='hmk-injury-form'){if(!String(v.location||'').trim())return alert('Zadejte lokalitu');mutate(()=>{c.hmk={...h,injuries:[...(h.injuries||[]),{id:uuid(),location:v.location,description:v.description||'',severity:v.severity||''}]}})}},true);
document.addEventListener('change',e=>{const id=e.target?.dataset?.encounterCharacter;if(!id)return;if(!data.characters.some(c=>c.id===id))return;if(e.target.checked)encounterSelection.add(id);else encounterSelection.delete(id);persistEncounterDraft();render()});
document.addEventListener('click',e=>{const t=e.target.closest('[data-remove-skill],[data-remove-injury]');if(!t)return;const c=character(selected);if(!c||!window.confirm('Odstranit tento záznam?'))return;const key=t.dataset.removeSkill?'skills':'injuries';const id=t.dataset.removeSkill||t.dataset.removeInjury;if(key==='injuries'&&c.hmk?.combatState?.wounds?.some(w=>w.id===id))return alert('Potvrzenou bojovou ránu nelze vymazat mimo pravidlové zotavení.');mutate(()=>{c.hmk=c.hmk||{};c.hmk[key]=(c.hmk[key]||[]).filter(x=>x.id!==id)})});

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
