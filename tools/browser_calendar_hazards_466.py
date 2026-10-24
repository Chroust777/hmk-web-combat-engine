from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
bundle=(root/'hmk-app.bundle.js').read_text(encoding='utf8'); head='(()=>{const MOD='
assert bundle.startswith(head)
modules,end=json.JSONDecoder().raw_decode(bundle[len(head):]);modules['app.js']+='\nwindow.__hmkUITest466=function(d,mode){data=d;selected=d.characters[0].id;calendarLanding=false;calendarCreating=false;calendarUI=null;activeCalendarSection="overview";activeSheetSection="overview";const patch=d.characters[0].hmk.combatState||{};d.characters[0].hmk.combatState={...require("./src/integration/persistent-combat-state.js").initialCombatState(),...patch,morale:{...require("./src/integration/persistent-combat-state.js").initialCombatState().morale,...(patch.morale||{})}};hazardComposer={actorId:null,kind:null};view=mode||"sheet";render()};'
instrumented=head+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+bundle[len(head)+end:]
attrs={k:12 for k in 'str end agl aur emp cre elo rea per wil eye hrg sml dex'.split()};completed={str(i):True for i in range(1,15)}
actor={'id':'a','name':'Eldar','kind':'PC','occupation':'Farmer','hmk':{'attributes':attrs,'skills':[],'combatState':{},'creation':{'status':'complete','step':14,'completed':completed,'values':{}}}}
clock={'format':'hmk-campaign-calendar-v1','label':'Test','campaignId':'test','minute':480,'characterIds':['a'],'anchors':[],'events':[{'id':'start','type':'init','minute':480,'reason':'GM confirmation'}]}
def fixture(state=None):
 c=json.loads(json.dumps(actor));c['hmk']['combatState']=state or {}
 return {'schemaVersion':1,'characters':[c],'items':[],'inventory':[],'trash':[],'journal':[],'campaignClock':clock,'combatRuntime':None}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']);page=browser.new_page(viewport={'width':1450,'height':950});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>');page.add_script_tag(content=instrumented)
 page.evaluate('(d)=>window.__hmkUITest466(d,"calendar")',fixture())
 nav=page.locator('.journal-book--calendar .journal-book-frame > .journal-book-subnav')
 assert nav.count()==1
 assert nav.locator('button').count()==5
 assert page.locator('.folio-chapter-spread').count()==1
 nav.locator('[data-calendar-section="travel"]').click()
 assert page.locator('#campaign-trekking-context-form').count()==1
 assert page.locator('.journal-book--calendar .journal-book-frame > .journal-book-subnav').count()==1
 # Calendar GM action must explicitly select the affected party member.
 group=fixture();other=json.loads(json.dumps(actor));other['id']='b';other['name']='Bryn';group['characters'].append(other)
 group['campaignClock']=dict(clock,characterIds=['a','b'])
 page.evaluate('(d)=>window.__hmkUITest466(d,"calendar")',group)
 page.locator('[data-calendar-section="travel"]').click()
 page.locator('[data-calendar-hazard-actor]').select_option('b')
 page.locator('[data-calendar-hazard-open]').click()
 assert 'Bryn' in page.locator('.journal-book--hazards').inner_text()
 assert page.locator('[data-hazard-create]').count()==4
 page.evaluate('(d)=>window.__hmkUITest466(d,"sheet")',fixture())
 assert page.locator('[data-sheet-section="hazards"]').count()==0,'Healthy character must not see danger tab'
 page.locator('[data-sheet-section="status"]').click()
 assert page.locator('#hmk-ailment-summary').count()==0,'Healthy character should not see empty hazard form'
 # GM reaches new hazard via skills independent of skill, race or occupation.
 page.locator('[data-nav="skills"]').first.click()
 assert page.locator('[data-nav="hazards"]').count()>=1
 page.locator('[data-nav="hazards"]').last.click()
 assert page.locator('[data-sheet-section="hazards"]').count()==1
 assert page.locator('[data-hazard-create]').count()==4
 assert page.locator('#hmk-poison-panel').count()==0
 assert page.locator('#hmk-fire-smoke').count()==0
 page.locator('.hc-hazard-gm-trigger summary').click()
 page.locator('[data-hazard-create="fire"]').click()
 assert page.locator('#hmk-fire-smoke').count()==1
 assert page.locator('#hmk-poison-panel').count()==0
 page.locator('[data-hazard-create="poison"]').click()
 assert page.locator('#hmk-poison-panel').count()==1
 assert page.locator('#hmk-fire-smoke').count()==0
 # Existing open smoke event automatically reveals its relevant module.
 page.evaluate('(d)=>window.__hmkUITest466(d,"sheet")',fixture({'events':[{'id':'smk','type':'mundane-smoke-start','round':1,'details':{'sourceId':'smk'}}]}))
 assert page.locator('[data-sheet-section="hazards"]').count()==1
 page.locator('[data-sheet-section="hazards"]').click()
 assert page.locator('#hmk-fire-smoke').count()==1
 assert page.locator('#hmk-poison-panel').count()==0
 assert page.locator('#hmk-disease-panel').count()==0
 # Nonhazard Psyche Stress stays in Combat & Conditions without exposing environmental forms.
 page.evaluate('(d)=>window.__hmkUITest466(d,"sheet")',fixture({'morale':{'psycheStress':3}}))
 assert page.locator('[data-sheet-section="hazards"]').count()==0
 page.locator('[data-sheet-section="status"]').click()
 assert page.locator('#hmk-poison-panel').count()==0
 assert not errors,errors
 print('PASS Chromium: journal-style calendar bookmarks; conditional hazard tab; GM explicit incident; poison, unrelated panels hidden; no JS errors')
 browser.close()
