"""Production bundle tested with an isolated, test-only in-memory campaign fixture."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
bundle=(root/'hmk-app.bundle.js').read_text(encoding='utf8')
head='(()=>{const MOD='
assert bundle.startswith(head)
modules,end=json.JSONDecoder().raw_decode(bundle[len(head):])
modules['app.js']+='\nwindow.__hmkUITestLoad=function(value,mode){data=value;selected=value.characters[0].id;calendarLanding=false;calendarCreating=false;calendarUI=null;activeCalendarSection="overview";view=mode||"calendar";activeSheetSection="overview";render()};\n'
instrumented=head+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+bundle[len(head)+end:]
completed={str(i):True for i in range(1,15)}
attrs={key:12 for key in 'str end agl aur emp cre elo rea per wil eye hrg sml dex'.split()}
c={'id':'a','name':'Eldar','kind':'PC','occupation':'Farmer','hmk':{'attributes':attrs,'skills':[], 'creation':{'status':'complete','step':14,'completed':completed,'values':{},'skillDP':{'Optional Skills':{'Herblore':1}}},'wealth':3,'coinsPence':30}}
clock={'format':'hmk-campaign-calendar-v1','label':'Test','campaignId':'test','minute':480,'characterIds':['a'], 'anchors':[],'events':[{'id':'start','type':'init','minute':480,'reason':'GM checked starting time'}]}
db={'schemaVersion':1,'characters':[c],'items':[],'inventory':[],'trash':[],'journal':[],'campaignClock':clock,'combatRuntime':None}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1450,'height':950});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.add_script_tag(content=instrumented)
 page.evaluate('(d)=>window.__hmkUITestLoad(d,"calendar")',db)
 nav=page.locator('.hc-calendar-tabs');assert nav.locator('button').count()==5
 assert page.locator('#campaign-advance-form').count()==1
 assert page.locator('.hc-provision-card').count()==1
 assert page.locator('[data-nutrition-policy-form]').count()==0
 nav.locator('[data-calendar-section="provisions"]').click()
 assert page.locator('[data-nutrition-policy-form]').count()==1
 assert page.locator('[data-foraging-batch-rations]').count()==1
 assert page.locator('#campaign-advance-form').count()==0
 assert page.locator('.hc-provision-card').count()==1
 nav.locator('[data-calendar-section="travel"]').click()
 assert page.locator('#campaign-trekking-context-form').count()==1
 assert page.locator('[data-nutrition-policy-form]').count()==0
 nav.locator('[data-calendar-section="craft"]').click()
 assert page.locator('[data-nutrition-policy-form]').count()==0
 assert page.locator('.hc-calendar-tabs [aria-current="page"]').get_attribute('data-calendar-section')=='craft'
 nav.locator('[data-calendar-section="administration"]').click()
 assert page.locator('#campaign-members-form').count()==1
 assert page.locator('#campaign-advance-form').count()==0
 nav.locator('[data-calendar-section="overview"]').click()
 assert page.locator('#campaign-advance-form').count()==1
 # Switching views never mutates this read-only fixture.
 page.evaluate('(d)=>window.__hmkUITestLoad(d,"sheet")',db)
 assert page.locator('[data-sheet-section="provisions"]').count()==1
 assert page.locator('.journal-book--overview .hc-provision-card').count()==1
 page.locator('[data-sheet-section="provisions"]').click()
 assert page.locator('.journal-book--provisions').count()==1
 assert 'Denní spotřeba není potvrzována GM' in page.locator('.journal-book--provisions').inner_text()
 assert not errors,errors
 print('PASS Chromium five calendar chapters, original nutrition/foraging forms, personal journal provisions, overview indicator; no JS errors')
 browser.close()
