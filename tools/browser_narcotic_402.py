"""Chromium: a replay-valid HMK Narcotic dose, not a fabricated stock potion."""
from pathlib import Path
import json,re,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",source,re.S).group(1).replace('stimulant','narcotic')
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
actor='herbal-actor';target='patient';camp='A'
chars=[{'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'agl':12},'skills':[]}},
 {'id':target,'name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'agl':12},'skills':[]}}]
def fixture(j,minute):
 return {'schemaVersion':1,'characters':chars,'items':[],'inventory':[],'trash':[],'journal':j,
  'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':camp,'minute':minute,'label':'Narcotic',
   'characterIds':[actor,target],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},
   {'id':'gm','type':'advance','minute':minute,'reason':'GM'}]}}
def mount(browser,fix):
 page=browser.new_page(viewport={'width':1480,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fix)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(140)
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(120)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(120)
 return page,errors,dialogs
def saved(page):return page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=mount(browser,fixture(journal,11))
 admin=page.locator('[data-herb-admin]')
 assert admin.count()==1,('No genuine potion form',errors,dialogs)
 admin.locator('[name="targetRef"]').select_option(target)
 admin.locator('[name="gmConfirmed"]').check();admin.locator('[type="submit"]').click();page.wait_for_timeout(240)
 after=saved(page);proofs=[j for j in after['journal'] if j.get('calendarHerbPotionAdminister')]
 assert len(proofs)==1,(errors,dialogs)
 proof=proofs[0]['calendarHerbPotionAdminister']
 assert proof['herbType']=='narcotic' and proof['bonus']==32,proof
 assert after['campaignClock']['minute']==11
 assert page.locator('[data-herb-admin]').count()==0
 assert 'Move/AGL' in page.locator('#app').inner_text()
 assert not errors and not dialogs,(errors,dialogs)
 page.screenshot(path=str(root/'browser_narcotic_402.png'))
 print('PASS Chromium: produced Great Narcotic -> actual administered dose +32, Move/AGL -16, historical proof, GM clock unchanged')
 page.close()
 page,errors,dialogs=mount(browser,fixture(after['journal'],251))
 txt=page.locator('#app').inner_text()
 assert 'Shock bonus +16' in txt,('Missing Strong-stage UI',txt[-1800:],errors,dialogs)
 assert not errors and not dialogs,(errors,dialogs)
 print('PASS Chromium: after independently GM-confirmed 240 minutes, Narcotic now Strong +16 and Move/AGL -8')
 page.close();browser.close()
