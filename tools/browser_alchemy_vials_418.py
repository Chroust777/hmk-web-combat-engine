"""Chromium end-to-end: physical alchemy vial, inventory/ENC, append-only journal, return to empty."""
from pathlib import Path
import re,json,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'tools/browser_alchemy_decay_417.py').read_text()
node=re.search(r"node=r'''\n(.*?)\n'''",source,re.S).group(1)
fixture=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
minute=fixture['finished']
item={'id':'vial1','characterId':'a','sourceItemId':'hmk:gear:hmk-p121-075','quantity':1,'slot':'carried',
'snapshot':{'id':'hmk:gear:hmk-p121-075','name':'Vial, 4 oz, 2″ × 5″','category':'other','properties':{'weightLb':0.25,'pricePence':4}}}
data={'schemaVersion':1,'characters':[{'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,
'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}}],
'items':[],'inventory':[item],'trash':[],'journal':fixture['rows'],
'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Alchemy Vial','characterIds':['a'],'anchors':[],
'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':minute,'reason':'GM completed preparation'}]}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(100)
 assert 'v93.418' in page.locator('#app').inner_text(),('boot',errors,page.locator('#app').inner_text()[:600])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(75)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(70)
 f=page.locator('[data-alchemy-vial-bind]');assert f.count()==1,('bind form',errors,dialogs,page.locator('#app').inner_text()[-1000:])
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('select[name="vialId"]').select_option('vial1')
 f.locator('input[name="confirmed"]').check()
 f.locator('input[name="liquidConfirmed"]').check()
 f.locator('input[name="corkConfirmed"]').check()
 f.locator('select[name="material"]').select_option('glass')
 f.locator('button[type="submit"]').click();page.wait_for_timeout(140)
 assert not errors and not dialogs,('binding',errors,dialogs)
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 binding=[j['calendarAlchemyVialBinding'] for j in saved['journal'] if j.get('calendarAlchemyVialBinding')]
 assert len(binding)==1 and binding[0]['vialId']=='vial1',('binding absent',saved['journal'][-2:])
 assert len(saved['inventory'])==1 and saved['inventory'][0]['snapshot']['properties']['weightLb']==0.25,'raw catalogue vial must remain empty-mass source'
 assert saved['campaignClock']['minute']==minute,'GM time changed'
 page.locator('[data-alchemy-vial-empty]').first.evaluate('el=>el.closest("details").open=true')
 assert 'plná 0,5 lb' in page.locator('#app').inner_text(),('filled projection label absent',errors)
 print('PASS Chromium Alchemy Vial bind: 1 original inventory ID, 0.5 lb display, immutable journal, GM clock unchanged')
 f=page.locator('[data-alchemy-vial-empty]');assert f.count()==1,('empty form',dialogs,errors)
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('input[name="reason"]').fill('Accidental spill witnessed by GM')
 f.locator('input[name="confirmed"]').check();f.locator('button[type="submit"]').click();page.wait_for_timeout(150)
 assert not errors and not dialogs,('empty',errors,dialogs)
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 empty=[j['calendarAlchemyVialEmpty'] for j in saved['journal'] if j.get('calendarAlchemyVialEmpty')]
 assert len(empty)==1 and empty[0]['vialId']=='vial1' and len(saved['inventory'])==1,('empty absent',empty)
 assert saved['campaignClock']['minute']==minute,'GM clock moved'
 assert page.locator('[data-alchemy-vial-empty]').count()==0,'duplicate empty allowed'
 print('PASS Chromium Alchemy Vial empty: original vial retained, time unchanged, history immutable')
 page.close();browser.close()
