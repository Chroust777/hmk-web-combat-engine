from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];fixture=json.loads((root/'generated_foraging_browser_fixture.json').read_text())
donor=fixture['characters'][0]['id'];receiver='ration-receiver-389'
fixture['characters'].append({**json.loads(json.dumps(fixture['characters'][0])), 'id':receiver, 'name':'Příjemce jídla'})
fixture['campaignClock']['characterIds'].append(receiver)
food={'id':'hmk:gear:hmk-p120-027','name':'Rations, standard','category':'other','properties':{'weightLb':3}}
fixture['inventory'].append({'id':'ration-original-389','characterId':donor,'sourceItemId':food['id'],'snapshot':food,'quantity':3,'slot':'carried','condition':''})
campaign=fixture['campaignClock']['campaignId'];minute=fixture['campaignClock']['minute']
fixture['journal'].append({'id':'ration-stock-389','characterId':donor,'calendarCampaignId':campaign,'campaignMinute':minute,'createdAt':'now','title':'Testový doložený příděl','body':'Potvrzené dávky, původ GM','calendarInventoryRationStock':{'format':'hmk-physical-ration-stock-v1','campaignId':campaign,'actorId':donor,'itemId':'ration-original-389','sourceItemId':food['id'],'name':food['name'],'quantity':3,'unitWeightLb':3,'minute':minute,'expiresAt':minute+14400,'sourcePages':[120,186],'freshnessAttestedByGM':True}})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,timeout=15000,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1480,'height':920});errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture => {const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(300)
 assert page.locator(f'[data-open="{donor}"]').count(),(errors,alerts,page.locator('#app').inner_text()[:650])
 page.locator(f'[data-open="{donor}"]').first.click();page.locator('[data-sheet-section="inventory"]').first.click()
 assert page.locator('[data-transfer-ration="ration-stock-389"]').count(),page.locator('#app').inner_text()[-800:]
 page.locator('[data-transfer-ration="ration-stock-389"]').click()
 f=page.locator('#ration-transfer-form');assert f.count(),alerts
 f.locator('[name="recipientId"]').select_option(receiver)
 f.locator('[name="quantity"]').fill('1.5');f.locator('[name="reason"]').fill('Potvrzene fyzicke predani')
 f.locator('[name="confirmedByGM"]').check();f.locator('button[type="submit"]').click();page.wait_for_timeout(300)
 db=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 receipts=[j for j in db['journal'] if 'calendarInventoryRationTransfer' in j]
 assert len(receipts)==1,(len(receipts),alerts,errors)
 proof=receipts[0]['calendarInventoryRationTransfer'];assert proof['quantity']==1.5 and proof['recipientId']==receiver
 assert db['campaignClock']['minute']==minute
 # Recipient has a projected stack, not a duplicate editable baseline.
 assert not any(i['id']==proof['receivedItemId'] for i in db['inventory'])
 assert not errors,(errors,alerts)
 # Fresh browser form render: the transferred portion must belong exclusively to recipient.
 recipientPage=b.new_page(viewport={'width':1480,'height':920})
 recipientPage.on('pageerror',lambda e:errors.append(str(e)))
 recipientPage.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 recipientPage.evaluate('''data => {const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(data)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',db)
 recipientPage.add_script_tag(content=(root/'hmk-app.bundle.js').read_text())
 assert recipientPage.locator(f'[data-open="{receiver}"]').count(),(errors,recipientPage.locator('#app').inner_text()[:500])
 recipientPage.locator(f'[data-open="{receiver}"]').first.click()
 recipientPage.locator('[data-sheet-section="inventory"]').first.click()
 assert recipientPage.locator(f'[data-transfer-ration="{receipts[0]["id"]}"]').count()==1,('Recipient stack missing',recipientPage.locator('#app').inner_text()[-1200:])
 assert recipientPage.locator(f'[data-edit-inv="{proof["receivedItemId"]}"]').count()==0
 assert not errors,errors
 recipientPage.close()
 page.screenshot(path=str(root/'browser_ration_transfer_389.png'))
 print('PASS Chromium: 1.5/3 physical food-days transferred; recipient projection, immutable original, 0 GM time shift, errors 0')
 b.close()
