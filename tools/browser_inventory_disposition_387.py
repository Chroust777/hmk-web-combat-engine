from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
fixture=json.loads((root/'generated_foraging_browser_fixture.json').read_text())
actor=fixture['characters'][0]['id']
fixture['characters'].append({'id':'recipient-387','name':'Prijemce 387','kind':'PC','hmk':{}})
fixture['campaignClock']['characterIds'].append('recipient-387')
rope={'id':'audit-rope-387','characterId':actor,'sourceItemId':'custom:rope-387',
      'snapshot':{'id':'custom:rope-387','name':'Auditní lano','category':'other','properties':{'weightLb':12}},
      'quantity':4,'slot':'carried','currentWQ':None,'condition':''}
fixture['inventory'].append(rope)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,timeout=15000,
  args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':960})
 errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''data => { const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(data)]]);const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(400)
 assert page.locator(f'[data-open="{actor}"]').count(),f'Character missing: {page.locator("#app").inner_text()[:300]}'
 page.locator(f'[data-open="{actor}"]').first.click()
 page.locator('[data-sheet-section="inventory"]').first.click()
 assert page.locator('[data-transfer-inv="audit-rope-387"]').count(),page.locator('#app').inner_text()[-500:]
 page.locator('[data-transfer-inv="audit-rope-387"]').first.click()
 transfer=page.locator('#inventory-transfer-form');assert transfer.count()
 transfer.locator('[name="recipientId"]').select_option('recipient-387')
 transfer.locator('[name="quantity"]').fill('2')
 transfer.locator('[name="reason"]').fill('Fyzicky predano pri setkani')
 transfer.locator('[name="confirmedByGM"]').check()
 transfer.locator('button[type="submit"]').click();page.wait_for_timeout(350)
 first=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 rows=[x for x in first['journal'] if x.get('calendarInventoryDisposition')]
 assert len(rows)==1,('wrong disposition',len(rows),alerts,errors)
 assert rows[0]['calendarInventoryDisposition']['kind']=='transfer'
 assert first['inventory'][next(i for i,r in enumerate(first['inventory']) if r['id']=='audit-rope-387')]['quantity']==2
 assert len([i for i in first['inventory'] if i['characterId']=='recipient-387' and i['snapshot']['name']=='Auditní lano'])==1
 assert first['campaignClock']['minute']==fixture['campaignClock']['minute']
 # Record a real loss of one remaining rope, do not silently remove it.
 assert page.locator('[data-remove-inv="audit-rope-387"]').count(),alerts
 page.locator('[data-remove-inv="audit-rope-387"]').first.click()
 loss=page.locator('#inventory-loss-form');assert loss.count()
 loss.locator('[name="quantity"]').fill('1')
 loss.locator('[name="reason"]').fill('Ztraceno ve vode')
 loss.locator('[name="confirmedByGM"]').check()
 loss.locator('button[type="submit"]').click();page.wait_for_timeout(400)
 second=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 receipts=[x for x in second['journal'] if x.get('calendarInventoryDisposition')]
 assert len(receipts)==2,(len(receipts),alerts,errors)
 assert receipts[-1]['calendarInventoryDisposition']['kind']=='loss'
 assert next(i for i in second['inventory'] if i['id']=='audit-rope-387')['quantity']==1
 assert second['campaignClock']['minute']==fixture['campaignClock']['minute']
 assert not errors,(errors,alerts)
 page.screenshot(path=str(root/'browser_inventory_disposition_387.png'))
 print('PASS Chromium: partial transfer and witnessed partial loss, two receipts, cross-character carry weight, GM clock unchanged; page errors:',len(errors))
 browser.close()
