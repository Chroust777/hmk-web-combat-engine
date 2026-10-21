"""Chromium integration v93.401: ordinary Mild Soporific (SV timing), not a simulation of unperformed GM time advance."""
from pathlib import Path
import json,re,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
base=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",base,re.S).group(1).replace('stimulant','soporific').replace('potencyRoll:10','potencyRoll:2')
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
actor='herbal-actor';target='patient';camp='A'
chars=[{'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[]}},
 {'id':target,'name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[]}}]
def fixture(rows,minute,characters=chars):
 return {'schemaVersion':1,'characters':characters,'items':[],'inventory':[],'trash':[],'journal':rows,
  'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':camp,'minute':minute,'label':'Soporific',
   'characterIds':[actor,target],'anchors':[],
   'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'gm','type':'advance','minute':minute,'reason':'GM'}]}}
def setup(browser,fix):
 page=browser.new_page(viewport={'width':1500,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fix)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(170)
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(125)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(125)
 return page,errors,dialogs
def saved(page):return page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=setup(browser,fixture(journal,11))
 admin=page.locator('[data-herb-admin]')
 assert admin.count()==1,('Soporific administration form missing',errors,dialogs)
 admin.locator('[name="targetRef"]').select_option(target);admin.locator('[name="gmConfirmed"]').check();admin.locator('[type="submit"]').click();page.wait_for_timeout(230)
 mid=saved(page)
 assert len([j for j in mid['journal'] if j.get('calendarHerbPotionAdminister')])==1,(errors,dialogs)
 end=page.locator('[data-herb-soporific-end]')
 assert end.count()==1,('Soporific END form missing',errors,dialogs,page.locator('#app').inner_text()[-1800:])
 end.locator('[name="d100"]').fill('33');end.locator('[name="gmConfirmed"]').check();end.locator('[type="submit"]').click();page.wait_for_timeout(230)
 out=saved(page);ends=[j for j in out['journal'] if j.get('calendarHerbSoporificEnd')]
 assert len(ends)==1,('END proof missing',errors,dialogs)
 assert ends[0]['calendarHerbSoporificEnd']['endSV']==6
 assert out['characters'][1]['hmk']['combatState']['fatigue']['weariness']==0
 assert out['campaignClock']['minute']==11
 assert not dialogs and not errors,(dialogs,errors)
 print('PASS Chromium: genuine Soporific ingestion -> END d100=33 -> SV6, no premature fatigue or GM clock advance')
 page.close()
 # Separate fixture at minute 17 represents a GM-authorized progression, not an implicit app time skip.
 page,errors,dialogs=setup(browser,fixture(out['journal'],17,out['characters']))
 forms=page.locator('[data-herb-soporific-effect]')
 assert forms.count()==1,('Due Soporific weariness form missing',errors,dialogs,page.locator('#app').inner_text()[-2000:])
 forms.locator('[name="gmConfirmed"]').check();forms.locator('[type="submit"]').click();page.wait_for_timeout(250)
 final=saved(page);effects=[j for j in final['journal'] if j.get('calendarHerbSoporificEffect')]
 assert len(effects)==1,('Missing committed weariness proof',errors,dialogs)
 assert effects[0]['calendarHerbSoporificEffect']['wearinessAmount']==16
 assert effects[0]['calendarHerbSoporificEffect']['inducedState']=='NONE'
 assert final['characters'][1]['hmk']['combatState']['fatigue']['weariness']==16
 assert final['campaignClock']['minute']==17
 assert page.locator('[data-herb-soporific-effect]').count()==0
 assert not dialogs and not errors,(dialogs,errors)
 page.screenshot(path=str(root/'browser_soporific_401.png'))
 print('PASS Chromium: exact due minute -> audited weariness +16, no false INC/UNC, original clock unchanged')
 browser.close()
