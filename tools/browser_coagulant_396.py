"""Chromium form smoke: real herbal completion -> GM-confirmed Coagulant combat timestamp."""
from pathlib import Path
import re,subprocess,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
text=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",text,re.S).group(1).replace('stimulant','coagulant')
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
combat={'format':'hmk-persistent-combat-v1','shock':'NONE','bloodLoss':{'bp':0,'weaknessFatigue':0},'fatigue':{'windedness':0,'weariness':0,'otherWeakness':0},'wounds':[{'id':'bleeder-1','location':'sh','severity':'S','level':2,'aspect':'e','bleeding':True,'nextAdvanceRound':61,'healed':False,'recordedRound':1}],'events':[],'lastRound':0,'shockOriginRound':None,'shockFollowup':None,'extendedShock':None,'coma':None,'bloodShockPending':False,'morale':{'state':'steady','psycheStress':0,'braveSince':None,'braveTimelineId':None},'mishaps':[],'posture':{'prone':False,'dropPending':False,'passNextTurn':False}}
fixture={'schemaVersion':1,'characters':[{'id':'herbal-actor','name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[]}},{'id':'patient','name':'Patient','kind':'PC','hmk':{'attributes':{'str':10,'end':12},'combatState':combat,'injuries':[{'id':'bleeder-1','location':'sh','severity':'S','level':2,'bleeding':True,'combatRecord':True}],'skills':[]}}],
'items':[],'inventory':[],'trash':[],'journal':journal,'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'A','minute':11,'label':'Coagulant','characterIds':['herbal-actor','patient'],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':11,'reason':'GM'}]}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1500,'height':950});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(250)
 page.locator('[data-nav="encounter"]').first.click();page.wait_for_timeout(150)
 page.locator('[data-action="encounter-all"]').first.click();page.wait_for_timeout(250)
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(200)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(100)
 admin=page.locator('[data-herb-admin]');assert admin.count()==1,('missing form',page.locator('#app').inner_text()[-1300:],dialogs,errors)
 admin.locator('[name="targetRef"]').select_option('patient::bleeder-1')
 admin.locator('[name="gmConfirmed"]').check();admin.locator('[name="combatAnchorConfirmed"]').check()
 admin.locator('button[type="submit"]').click();page.wait_for_timeout(350)
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 rows=[j for j in saved['journal'] if j.get('calendarHerbPotionAdminister')]
 assert len(rows)==1,('missing application',dialogs,errors)
 anchor=rows[0]['calendarHerbPotionAdminister']['combatAnchor'];assert anchor['campaignMinute']==11 and anchor['round']==1,anchor
 assert rows[0]['calendarHerbPotionAdminister']['woundId']=='bleeder-1'
 assert saved['campaignClock']['minute']==11
 assert not errors,(errors,dialogs)
 page.screenshot(path=str(root/'browser_coagulant_396.png'))
 print('PASS Chromium Coagulant: GM-confirmed patient wound, combat round+campaign minute, no clock shift, no JS errors')
 browser.close()
