"""Browser v93.400: replay-valid prepared Mild Paralytic -> Patient -> due END d100.
Test's clock jump is a prepared fixture, not an app-authorized GM transition.
"""
from pathlib import Path
import json,re,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
base=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",base,re.S).group(1).replace('stimulant','paralytic').replace('potencyRoll:10','potencyRoll:2')
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
actor='herbal-actor';target='patient';camp='A'
chars=[{'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[]}},
 {'id':target,'name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[]}}]
def fixture(rows,minute):
 return {'schemaVersion':1,'characters':chars,'items':[],'inventory':[],'trash':[],'journal':rows,
  'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':camp,'minute':minute,'label':'Paralytic','characterIds':[actor,target],
   'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'gm','type':'advance','minute':minute,'reason':'GM'}]}}
def setup(browser,fix):
 page=browser.new_page(viewport={'width':1500,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fix)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(220)
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(125)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(125)
 return page,errors,dialogs
def saved(page):return page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=setup(browser,fixture(journal,11));admin=page.locator('[data-herb-admin]')
 assert admin.count()==1,('admin form missing',dialogs,errors,page.locator('#app').inner_text()[-1500:])
 admin.locator('[name="targetRef"]').select_option(target);admin.locator('[name="gmConfirmed"]').check();admin.locator('[type="submit"]').click();page.wait_for_timeout(350)
 data=saved(page);admins=[j for j in data['journal'] if j.get('calendarHerbPotionAdminister')]
 assert len(admins)==1,(len(admins),dialogs,errors)
 assert admins[0]['calendarHerbPotionAdminister']['herbType']=='paralytic'
 assert admins[0]['calendarHerbPotionAdminister']['potency']==1
 assert data['campaignClock']['minute']==11 and not dialogs and not errors,(dialogs,errors)
 print('PASS Chromium: actual Mild Paralytic administration, one audited application, clock unchanged')
 page.close()
 # Preparing a fixture at minute 21 simulates the independently GM-confirmed
 # 10-minute progression and tests the real UI END test commit at exact due minute.
 page,errors,dialogs=setup(browser,fixture(data['journal'],21))
 form=page.locator('[data-herb-paralytic-endurance]')
 assert form.count()==1,('due END form missing',dialogs,errors,page.locator('#app').inner_text()[-1500:])
 form.locator('[name="d100"]').fill('90');form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(400)
 out=saved(page);proofs=[j for j in out['journal'] if j.get('calendarHerbParalyticEndurance')]
 assert len(proofs)==1,('END proof missing',dialogs,errors)
 assert proofs[0]['calendarHerbParalyticEndurance']['paralyzed'] is True
 assert proofs[0]['calendarHerbParalyticEndurance']['untilMinute']==81
 assert out['characters'][1]['hmk']['combatState']['herbalParalysis']['endMinute']==81
 assert out['characters'][1]['hmk']['combatState']['posture']['prone'] is True
 assert out['campaignClock']['minute']==21
 assert page.locator('[data-herb-paralytic-endurance]').count()==0
 assert not dialogs and not errors,(dialogs,errors)
 page.screenshot(path=str(root/'browser_paralytic_400.png'))
 print('PASS Chromium: original END d100=90 -> full paralysis 60 min + prone, persistent state, one journal proof, clock unchanged')
 browser.close()
