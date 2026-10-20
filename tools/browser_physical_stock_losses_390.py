from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
fixture=json.loads((root/'generated_foraging_browser_fixture.json').read_text())
actor=fixture['characters'][0]['id'];campaign=fixture['campaignClock']['campaignId'];minute=fixture['campaignClock']['minute']
food={'id':'hmk:gear:hmk-p120-027','name':'Rations, standard','category':'other','properties':{'weightLb':3}}
jug={'id':'hmk:gear:hmk-p121-043','name':'Jug, 1 gallon','category':'other','properties':{'weightLb':5}}
fixture['inventory'].extend([
 {'id':'stock-item-390','characterId':actor,'sourceItemId':food['id'],'snapshot':food,'quantity':3,'slot':'carried','condition':''},
 {'id':'water-item-390','characterId':actor,'sourceItemId':jug['id'],'snapshot':jug,'quantity':1,'slot':'carried','condition':''}])
fixture['journal'].extend([
 {'id':'stock-390','characterId':actor,'calendarCampaignId':campaign,'campaignMinute':minute,'createdAt':'now','title':'Rations test','body':'GM confirmed stock','calendarInventoryRationStock':{'format':'hmk-physical-ration-stock-v1','campaignId':campaign,'actorId':actor,'itemId':'stock-item-390','sourceItemId':food['id'],'name':food['name'],'quantity':3,'unitWeightLb':3,'minute':minute,'expiresAt':minute+14400,'sourcePages':[120,186],'freshnessAttestedByGM':True}},
 {'id':'fill-390','characterId':actor,'calendarCampaignId':campaign,'campaignMinute':minute,'createdAt':'now','title':'Water test','body':'GM confirmed water','calendarInventoryWaterFill':{'format':'hmk-physical-water-fill-v1','campaignId':campaign,'actorId':actor,'itemId':'water-item-390','minute':minute,'quantity':1,'unit':'waterDays','weightLb':10,'potableAndFilledConfirmedByGM':True,'waterSource':'Studna u hostince','sourcePages':[120,121,186]}}])
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,timeout=15000,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1480,'height':920});errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture => {const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(200)
 assert page.locator(f'[data-open="{actor}"]').count(),(errors,alerts,page.locator('#app').inner_text()[:800])
 page.locator(f'[data-open="{actor}"]').first.click();page.locator('[data-sheet-section="inventory"]').first.click()
 assert page.locator('[data-loss-ration="stock-390"]').count(),page.locator('#app').inner_text()[-2000:]
 page.locator('[data-loss-ration="stock-390"]').first.click()
 frm=page.locator('#ration-loss-form');assert frm.count(),errors
 frm.locator('[name="quantity"]').fill('1.5');frm.locator('[name="reason"]').fill('Prokazana ztrata proviantu')
 frm.locator('[name="confirmedByGM"]').check();frm.locator('[type="submit"]').click();page.wait_for_timeout(200)
 stored=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 slips=[j for j in stored['journal'] if 'calendarInventoryRationLoss' in j]
 assert len(slips)==1,(errors,alerts,[(j.get('title')) for j in stored['journal'][-3:]])
 assert slips[0]['calendarInventoryRationLoss']['quantity']==1.5
 assert page.locator('[data-loss-water="water-item-390"]').count(),(alerts,page.locator('#app').inner_text()[-1000:])
 page.locator('[data-loss-water="water-item-390"]').first.click()
 frm=page.locator('#water-loss-form');assert frm.count(),errors
 frm.locator('[name="fillId"]').select_option('fill-390');frm.locator('[name="quantity"]').select_option('0.5')
 frm.locator('[name="reason"]').fill('Prokazane rozliti vody')
 frm.locator('[name="confirmedByGM"]').check();frm.locator('[type="submit"]').click();page.wait_for_timeout(200)
 final=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 slips=[j for j in final['journal'] if 'calendarInventoryWaterLoss' in j]
 assert len(slips)==1,(errors,alerts,final['journal'][-2:]);assert slips[0]['calendarInventoryWaterLoss']['quantity']==0.5
 assert final['campaignClock']['minute']==minute
 assert final['inventory']==fixture['inventory']
 assert not errors,(errors,alerts)
 page.screenshot(path=str(root/'browser_physical_stock_losses_390.png'))
 print('PASS Chromium: food loss 1.5, water loss 0.5, immutable inventory, 0 GM minute shift, 0 JS errors')
 browser.close()
