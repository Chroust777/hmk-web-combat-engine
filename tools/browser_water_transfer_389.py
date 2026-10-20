from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
fixture=json.loads((root/'generated_foraging_browser_fixture.json').read_text())
donor=fixture['characters'][0]['id']; receiver='water-recipient-389'
fixture['characters'].append({'id':receiver,'name':'Příjemce vody','kind':'PC','hmk':{}})
fixture['campaignClock']['characterIds'].append(receiver)
for ident,owner,source,name,weight in [('donor-jug-389',donor,'hmk:gear:hmk-p121-043','Jug, 1 gallon',5),('receiver-skin-389',receiver,'hmk:gear:hmk-p120-040','Waterskin, 2 quart',2)]:
 fixture['inventory'].append({'id':ident,'characterId':owner,'sourceItemId':source,'snapshot':{'id':source,'name':name,'category':'other','properties':{'weightLb':weight}},'quantity':1,'slot':'carried','condition':''})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,timeout=15000,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1500,'height':930});errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture => {const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(350)
 page.locator(f'[data-open="{donor}"]').first.click();page.locator('[data-sheet-section="inventory"]').first.click()
 page.locator('[data-fill-water="donor-jug-389"]').click()
 form=page.locator('#water-fill-form');assert form.count()
 form.locator('[name="foragingLot"]').select_option('found-water|0');form.locator('[name="gmConfirmed"]').check();form.locator('button[type="submit"]').click()
 page.wait_for_timeout(350)
 assert page.locator('[data-pour-water="donor-jug-389"]').count(),page.locator('#app').inner_text()[-800:]
 page.locator('[data-pour-water="donor-jug-389"]').click()
 f=page.locator('#water-transfer-form');assert f.count(),alerts
 f.locator('[name="recipientItemId"]').select_option('receiver-skin-389')
 f.locator('[name="reason"]').fill('Spolecna zastavka u cesty')
 f.locator('[name="gmConfirmed"]').check();f.locator('button[type="submit"]').click()
 page.wait_for_timeout(300)
 db=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 rows=[j for j in db['journal'] if j.get('calendarInventoryWaterTransfer')]
 assert len(rows)==1,(rows,alerts,errors)
 assert rows[0]['calendarInventoryWaterTransfer']['quantity']==0.5
 assert len([j for j in db['journal'] if j.get('calendarInventoryWaterFill',{}).get('waterTransferId')==rows[0]['id']])==1
 assert db['campaignClock']['minute']==fixture['campaignClock']['minute']==0
 assert not errors,(errors,alerts)
 page.screenshot(path=str(root/'browser_water_transfer_389.png'))
 print('PASS Chromium: Foraging 1 gal → jug, witnessed 0.5 gal → recipient waterskin, immutable paired receipts; no GM clock shift; page errors 0')
 b.close()
