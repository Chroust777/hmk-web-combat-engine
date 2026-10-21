"""Offline Chromium with real Foraging/Herblore sources and Poison Course."""
from pathlib import Path
import json,re,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",source,re.S).group(1)
js=js.replace('stimulant','poison').replace('potencyRoll:10','potencyRoll:7')
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
actor='herbal-actor';target='patient';camp='A'
fixture={'schemaVersion':1,'characters':[
 {'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'wil':12},'skills':[]}},
 {'id':target,'name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'wil':12},'skills':[]}}],
 'items':[],'inventory':[],'trash':[],'journal':journal,
 'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':camp,'minute':11,'label':'Poison',
 'characterIds':[actor,target],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':11,'reason':'GM'}]}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m: errors.append('console: '+m.text) if m.type=='error' else None)
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(180)
 assert 'v93.404' in page.locator('#app').inner_text(),page.locator('#app').inner_text()[-600:]
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(120)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(130)
 admin=page.locator('[data-herb-admin]')
 assert admin.count()==1,('No valid Poison potion',errors,dialogs,page.locator('#app').inner_text()[-1300:])
 assert 'Strong HR3' in admin.inner_text(),admin.inner_text()
 admin.locator('[name="targetRef"]').select_option(target)
 admin.locator('[name="poisonPeriodMinutes"]').fill('20')
 for n,v in enumerate((1,2,3,4),1):admin.locator(f'[name="poisonSymptom{n}"]').fill(str(v))
 admin.locator('[name="poisonStandardConfirmed"]').check()
 admin.locator('[name="gmConfirmed"]').check()
 admin.locator('[type="submit"]').click();page.wait_for_timeout(240)
 assert not errors,errors
 assert not dialogs,(dialogs,page.locator('#app').inner_text()[-1500:])
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 administered=[x for x in saved['journal'] if x.get('calendarHerbPotionAdminister')]
 exposed=[x for x in saved['journal'] if x.get('calendarHerbPoisonExposure')]
 assert len(administered)==1 and len(exposed)==1,(administered,exposed,errors)
 app=administered[0];proof=exposed[0]['calendarHerbPoisonExposure']
 assert proof['applicationId']==app['id'] and proof['targetId']==target,proof
 assert proof['initialHR']==3 and proof['onsetMinutes']==7 and proof['periodMinutes']==20,proof
 course=saved['characters'][1]['hmk']['combatState']['toxinCourses'][0]
 assert course['status']=='incubating' and course['initialHR']==3 and course['onsetMinutes']==7,course
 assert saved['campaignClock']['minute']==11,'Administration advanced GM time'
 assert len(saved['campaignClock']['anchors'])==1,saved['campaignClock']['anchors']
 assert not page.locator('[data-herb-admin]').count(),'Potion remained available after ingestion'
 page.screenshot(path=str(root/'browser_herbal_poison_404.png'))
 print('PASS Chromium: Foraging/Herblore Strong Poison -> ingestion and real HR3 toxin episode, 7min onset, GM-confirmed 20min course and four symptom dice; one atomic journal; no time shift')
 browser.close()
