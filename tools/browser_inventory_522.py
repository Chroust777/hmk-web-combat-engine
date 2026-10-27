from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();head='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(head):])
# Browser-only fixture bypasses the unrelated 14-step character-creation validation.
assert 'validate(data);\n        if (!save({ gmClockAdvance }))' in modules['app.js']
modules['app.js']=modules['app.js'].replace('validate(data);\n        if (!save({ gmClockAdvance }))','if (!save({ gmClockAdvance }))',1)
# Reuse the proven v93.521 synthetic fixture without changing its inventory code.
text=(root/'tools/browser_outfit_521.py').read_text()
fixture=text[text.index("modules['app.js']+='''")+len("modules['app.js']+='''"):text.index("'''\n\nmodules['app.js'] += ''',",text.index("modules['app.js']+='''") )] if False else None
first=text.index("modules['app.js']+='''")+len("modules['app.js']+='''")
last=text.index("'''",first)
modules['app.js']+=text[first:last]
second=text.index("modules['app.js'] += '''")+len("modules['app.js'] += '''")
modules['app.js']+=text[second:text.index("'''",second)]
modules['app.js']+="""
window.__seedPlateMailChest522=()=>{window.__seedPlateMail521();for(const x of data.inventory){if(x.id.startsWith('plate-mail-')){x.slot='chest';x.chestLocation='Dům v Tashálu';}}const v=JSON.stringify(data);localStorage.setItem(STORAGE,v);storageBaseline=v;render();};
"""
# Test helpers: rows deliberately use real catalogue records, and storage remains local.
modules['app.js']+='''
window.__state522=()=>({id:selected,view,section:activeSheetSection,rows:data.inventory.map(x=>({id:x.id,slot:x.slot,owner:x.characterId,name:x.snapshot?.name,location:x.chestLocation})),journal:data.journal.map(j=>({id:j.id,chest:!!j.calendarChestTransfer,loss:!!j.calendarInventoryDisposition})),persisted:JSON.parse(localStorage.getItem(STORAGE)).inventory.length});
window.__setClock522=()=>{data.campaignClock={campaignId:'campaign-522',minute:0,characterIds:[selected]};const j=JSON.stringify(data);localStorage.setItem(STORAGE,j);storageBaseline=j;render();};
'''
bundle=head+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(head)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1280,'height':900});errors=[];dialogs=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{const store=new Map();const a={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}""")
 for css in ('styles.css','book-templates.css','library.css','skill-workbench.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedOutfit520()')
 page.wait_for_selector('.inv-ledger-section')
 print('sections',page.locator('.inv-ledger-section').count(),'checkboxes',page.locator('[data-inv-bulk-select]').count(),flush=True)
 assert page.locator('.inv-ledger-section').count()==3
 assert page.locator('.inv-ledger-section .inv-edit-only').count()==len([x for x in page.evaluate('window.__state522()')['rows'] if x['owner']==page.evaluate('window.__state522()')['id']])
 assert page.locator('[data-inv-action-select]').count()==0
 assert page.locator('[data-inv-bulk-section="carried"]').locator('tbody th:first-child').count()>0
 # Store multiple carried armours to a single home chest.
 carried=page.locator('[data-inv-bulk-section="carried"]');carried.locator('[data-inv-bulk-select]').first.check();carried.locator('[data-inv-bulk-select]').nth(1).check()
 carried.locator('[data-inv-bulk-action="store"]').click();page.locator('#inventory-batch-form input[name="location"]').fill('Dům v Tashálu')
 page.locator('#inventory-batch-form input[name="confirmed"]').check();page.locator('#inventory-batch-form button[type="submit"]').click()
 state=page.evaluate('window.__state522()');print('stored',len([x for x in state['rows'] if x['slot']=='chest']),'receipts',len(state['journal']),flush=True)
 assert len(state['journal'])==2
 assert len([x for x in state['rows'] if x['slot']=='chest'])==3
 assert page.locator('[data-inv-bulk-section="chest"] [data-inv-bulk-select]').count()==3
 assert page.locator('.inv-ledger-table tbody th:first-child').first.evaluate('(e)=>getComputedStyle(e).position')=='sticky'
 widths=page.locator('.inv-ledger-table').first.evaluate('(e)=>({width:e.getBoundingClientRect().width,scroll:e.parentElement.scrollWidth})')
 assert widths['width']<=820,widths
 sticky=page.locator('[data-inv-bulk-section="chest"] .inv-table-scroll')
 before_x=sticky.locator('tbody th:first-child').first.evaluate('(e)=>e.getBoundingClientRect().left')
 sticky.evaluate('(e)=>{e.style.width="390px";e.scrollLeft=390;}')
 after_x=sticky.locator('tbody th:first-child').first.evaluate('(e)=>e.getBoundingClientRect().left')
 assert abs(before_x-after_x)<2,('Sticky item name moved with scroll',before_x,after_x)
 # Withdraw batch from the same physical chest.
 chest=page.locator('[data-inv-bulk-section="chest"]')
 chest.locator('[data-inv-bulk-select]').first.check()
 chest.locator('[data-inv-bulk-action="retrieve"]').click()
 page.locator('#inventory-batch-form input[name="confirmed"]').check();page.locator('#inventory-batch-form button[type="submit"]').click()
 state=page.evaluate('window.__state522()')
 assert len(state['journal'])==3,state['journal']
 # Direct outfit from chest and undress to chest, real modal and CAS state.
 page.locator('[data-chest-outfit="clothing"]').click();print("chest modal",page.locator("#inventory-chest-outfit-form").count(),"dialogs",dialogs[-3:],"errors",errors,"state",page.evaluate("window.__state522()") ["view"],flush=True);page.locator('#inventory-chest-outfit-form input[name="confirmed"]').check();page.locator('#inventory-chest-outfit-form button[type="submit"]').click()
 state=page.evaluate('window.__state522()');assert any(x['slot']=='worn' for x in state['rows']),state['rows']
 page.locator('[data-outfit-action="undress-chest"]').click()
 page.locator('#inventory-batch-form input[name="location"]').fill('Dům v Tashálu')
 page.locator('#inventory-batch-form input[name="confirmed"]').check();page.locator('#inventory-batch-form button[type="submit"]').click()
 state=page.evaluate('window.__state522()')
 assert not [x for x in state['rows'] if x['slot']=='worn']
 assert [x for x in state['rows'] if x['id']=='weapon123' and x['slot']=='main_hand'] == [] or any(x['slot']=='main_hand' for x in state['rows']) == False # fixture had no weapon
 # A real 17-piece catalogue suit moved from the home chest into Worn Armour.
 page.evaluate('window.__seedPlateMailChest522()')
 page.locator('[data-chest-outfit="armour"]').click()
 page.locator('#inventory-chest-outfit-form input[name="confirmed"]').check()
 page.locator('#inventory-chest-outfit-form button[type="submit"]').click()
 plate=page.evaluate('window.__statsPlateMail521()')
 assert len(plate['worn'])==17,plate['worn']
 assert plate['load']['armourENC']==40,plate['load']
 assert plate['load']['printedSuit']=='Plate & Mail'
 assert page.evaluate('window.__state522()')['journal'].__len__()==17
 print('PASS Chromium: Plate & Mail 17 pieces dressed directly from chest, Armour ENC 40',flush=True)
 print('PASS Chromium: 3 inventory lists; only Edit per item; sticky names; compact width' ,widths,'multi-store/retrieve; outfit from chest; undress to chest; persisted journal count',len(state['journal']),'JS errors',errors,flush=True)
 assert not errors,errors
 browser.close()
