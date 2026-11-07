"""Isolated real Chromium: Equipment F item remains unusable, no minute form, GM repairs via Inventory edit; no clock advance."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');marker='(()=>{const MOD='
assert raw.startswith(marker)
modules,end=json.JSONDecoder().raw_decode(raw[len(marker):])
modules['app.js']+='''
window.__auditRepair779Seed=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const H=require('./src/integration/persistent-combat-state.js');
 const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 const a={id:'repair-pc',name:'Opravář',kind:'PC',hmk:{attributes:attrs,skills:[],healthState:H.initialCombatState()}};
 const item={id:'equipment-f',characterId:a.id,sourceItemId:'repair-tool',snapshot:{id:'repair-tool',name:'Testovací provaz',category:'other',properties:{weightLb:3,pricePence:10}},quantity:1,slot:'carried',condition:'HMK Equipment Hazard: čeká na opravu',hmkEquipmentRepair:{format:'hmk-inventory-equipment-repair-v1',status:'damaged',sourceEpisodeId:'episode-f',repairProofId:'actual-skill-test'}};
 data=clean();data.characters=[a];data.inventory=[item];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Equipment F',eventId:'initial',gmConfirmed:true,campaignId:'repair-779',characterIds:[a.id]});
 storageReadOnly=false;cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 selected=a.id;view='sheet';activeSheetSection='inventory';storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);document.getElementById('app').innerHTML=characterInventoryOverview(a,data.inventory);
};
window.__auditRepair779State=()=>({version:APP_VERSION,minute:data.campaignClock.minute,stored:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute,repair:data.inventory[0]?.hmkEquipmentRepair,condition:data.inventory[0]?.condition,usable:!require('./src/integration/hmk-equipment-serviceability.js').equipmentUnusable(data.inventory[0]),journal:data.journal.length,storedRepair:JSON.parse(localStorage.getItem(STORAGE)).inventory[0]?.hmkEquipmentRepair});
window.__auditRepair779Open=()=>document.getElementById('app').innerHTML=inventoryEditForm(data.inventory[0]);
window.__auditRepair779Reload=()=>{data=normalizeLegacyCustomPrices(validate(JSON.parse(localStorage.getItem(STORAGE))));render();return window.__auditRepair779State()};
'''
bundle=marker+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1280,'height':900});errs=[];dialogs=[]
 page.on('pageerror',lambda e:errs.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for name in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/name).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__auditRepair779Seed()');st=page.evaluate('window.__auditRepair779State()')
 assert st['version']=='93.779' and st['minute']==480 and st['stored']==480,st
 assert not st['usable'] and st['repair']['status']=='damaged',st
 assert 'remainingMinutes' not in st['repair'] and 'totalMinutes' not in st['repair'],st
 assert page.locator('[data-hmk-item-repair], [data-hmk-item-repair-legacy], #hmk-item-repair-progress-form, #hmk-item-repair-legacy-form').count()==0
 assert 'Poškozený · GM určí stav v Upravit' in page.locator('body').inner_text()
 assert page.locator('[data-edit-inv="equipment-f"]').is_visible()
 page.evaluate('window.__auditRepair779Open()');assert page.locator('#inventory-edit-form').is_visible()
 page.locator('#inventory-edit-form [name="gmEquipmentState"]').select_option('usable')
 # Still pending until explicit user submission.
 st=page.evaluate('window.__auditRepair779State()');assert not st['usable'] and st['journal']==0 and st['minute']==480,st
 page.locator('#inventory-edit-form [type="submit"]').click();st=page.evaluate('window.__auditRepair779State()')
 assert st['usable'] and st['repair']['status']=='repaired' and 'remainingMinutes' not in st['repair'],st
 assert st['minute']==480 and st['stored']==480 and st['journal']==0,st
 assert page.evaluate('window.__auditRepair779Reload()')['usable']
 assert not errs and not dialogs,(errs,dialogs)
 print('PASS real Chromium v93.779: F damaged/blocked, no repair counters or work forms, explicit GM item edit, persisted reload, one clock (unchanged), no extra test/journal; no JS errors')
 b.close()
