"""Real Chromium UI purchase/free acquisition of a Bandages, 32 packet."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8')
marker='(()=>{const MOD='
assert raw.startswith(marker)
modules,end=json.JSONDecoder().raw_decode(raw[len(marker):])
modules['app.js']+='''
window.__auditBandageShopSeed=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const actor={id:'shop-a',name:'Léčitel',kind:'PC',hmk:{wealth:10,coinsPence:100,cashLedger:[],coinAdjustments:[]}};
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Library bag test',eventId:'seed',gmConfirmed:true,campaignId:'shop-audit',characterIds:[actor.id]});
 data=clean();data.characters=[actor];data.inventory=[];data.journal=[];data.campaignClock=clock;
 selected='shop-a';libraryRecipientId='shop-a';view='library';libraryTab='other';
 storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);
 document.getElementById('app').innerHTML=libraryAssignForm('hmk:gear:hmk-p120-004','item',true,hmk_library_economy_js_1.libraryPurchaseOffer(item('hmk:gear:hmk-p120-004')));
};
window.__auditBandageShopForm=()=>document.getElementById('app').innerHTML=libraryAssignForm('hmk:gear:hmk-p120-004','item',true,hmk_library_economy_js_1.libraryPurchaseOffer(item('hmk:gear:hmk-p120-004')));
window.__auditBandageShopState=()=>({cash:cashForCharacter(character('shop-a')),inventory:data.inventory.map(x=>({qty:x.quantity,id:x.id,owner:x.characterId,name:x.snapshot.name})),mass:hmk_bandage_stock_93778_js_1.physicalInventoryWeightLb(data.inventory[0]),storedCash:JSON.parse(localStorage.getItem(STORAGE)).characters[0].hmk,storedInventory:JSON.parse(localStorage.getItem(STORAGE)).inventory.length});
window.__auditBandageShopReload=()=>{data=normalizeLegacyCustomPrices(validate(JSON.parse(localStorage.getItem(STORAGE))));return data.inventory.map(x=>[x.quantity,x.hmkBandageUnits]);};
window.__auditBandageShopLegacySave=()=>{
 const old=JSON.parse(localStorage.getItem(STORAGE));old.inventory[0].quantity=1;delete old.inventory[0].hmkBandageUnits;
 const raw=JSON.stringify(old);localStorage.setItem(STORAGE,raw);storageBaseline=raw;
 data=normalizeLegacyCustomPrices(validate(JSON.parse(raw)));
 const migrated=data.inventory[0].quantity;
 const saved=mutate(()=>data.journal.push({id:uuid(),characterId:'shop-a',title:'Audit migrace obvazů',body:'Potvrzení GM při prvním uložení',createdAt:stamp()}));
 return {migrated,saved,stored:JSON.parse(localStorage.getItem(STORAGE)).inventory.map(x=>[x.quantity,x.hmkBandageUnits])};
};
'''
modulestr=marker+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=browser.new_page();errs=[];alerts=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 page.add_script_tag(content=modulestr)
 page.evaluate('window.__auditBandageShopSeed()')
 buy=page.locator('form[data-library-form="item"] button[value="buy"]');assert buy.count()==1
 assert '32 ks' in buy.inner_text() and '24d' in buy.inner_text(),buy.inner_text()
 buy.click();s=page.evaluate('window.__auditBandageShopState()')
 assert len(s['inventory'])==1 and s['inventory'][0]['qty']==32,s
 assert s['mass']==3 and s['cash']['ok'] and s['cash']['balance']==76,s
 assert s['storedInventory']==1
 page.evaluate('window.__auditBandageShopForm()')
 page.locator('form[data-library-form="item"] button[value="free"]').click()
 s=page.evaluate('window.__auditBandageShopState()')
 assert len(s['inventory'])==2 and [r['qty'] for r in s['inventory']]==[32,32],s
 assert s['cash']['balance']==76,s
 reload=page.evaluate('window.__auditBandageShopReload()')
 assert reload==[[32,'pieces-v93.778'],[32,'pieces-v93.778']],reload
 legacy=page.evaluate('window.__auditBandageShopLegacySave()')
 assert legacy['migrated']==32 and legacy['saved'] and legacy['stored']==[[32,'pieces-v93.778'],[32,'pieces-v93.778']],legacy
 assert not errs,errs
 print('PASS Chromium: Library BUY Bandages, 32 for 24d/3lb; FREE assignment 32; idempotent reload + legacy 1-packet migration save; no JS exceptions')
 browser.close()
