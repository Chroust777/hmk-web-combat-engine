from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
fixture=json.loads((root/'generated_foraging_browser_fixture.json').read_text())
actor=fixture['characters'][0]['id']
fixture['inventory'].append({'id':'jug-browser-388','characterId':actor,'sourceItemId':'hmk:gear:hmk-p121-043',
 'snapshot':{'id':'hmk:gear:hmk-p121-043','name':'Jug, 1 gallon','category':'other','properties':{'weightLb':5}},
 'quantity':1,'slot':'carried','condition':''})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,timeout=15000,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1520,'height':950});errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append('console '+m.text) if m.type=='error' else None)
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture => {const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(300)
 assert page.locator(f'[data-open="{actor}"]').count(),page.locator('#app').inner_text()[:600]
 page.locator(f'[data-open="{actor}"]').first.click();page.locator('[data-sheet-section="inventory"]').first.click();page.wait_for_timeout(180)
 assert page.locator('[data-fill-water="jug-browser-388"]').count(),page.locator('#app').inner_text()[-800:]
 page.locator('[data-fill-water="jug-browser-388"]').click()
 f=page.locator('#water-fill-form');assert f.count()
 assert '1 gal' in page.locator('.editor-dialog').inner_text(),page.locator('.editor-dialog').inner_text()
 opts=f.locator('[name="foragingLot"] option').all_text_contents()
 assert len(opts)==2,opts
 f.locator('[name="foragingLot"]').select_option('found-water|0')
 f.locator('[name="gmConfirmed"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(350)
 result=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 fills=[j for j in result['journal'] if 'calendarInventoryWaterFill' in j]
 debits=[j for j in result['journal'] if j.get('calendarForagingSupplyUse',{}).get('disposition')=='stored-in-container']
 assert len(fills)==1 and len(debits)==1,(fills,debits,alerts,errors)
 assert fills[0]['calendarInventoryWaterFill']['quantity']==1 and fills[0]['calendarInventoryWaterFill']['weightLb']==10
 assert debits[0]['calendarForagingSupplyUse']['quantity']==1
 assert result['campaignClock']['minute']==0
 assert not page.locator('[data-fill-water="jug-browser-388"]').count()
 assert not errors,(errors,alerts)
 page.screenshot(path=str(root/'browser_water_jug_388.png'))
 print('PASS CHROMIUM: true 1-gallon jug + Foraging debit 1 + audited fill + 0 GM time mutation; page errors',errors)
 b.close()
