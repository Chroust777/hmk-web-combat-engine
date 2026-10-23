"""Real Chromium: Acid drinking, GM touch facts, CF Aural, reload."""
from pathlib import Path
import subprocess,json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
old=(root/'tools/browser_alchemy_decay_417.py').read_text()
node=re.search(r"node=r'''\n(.*?)\n'''",old,re.S).group(1)
node=node.replace("elixirName:'Healing'","elixirName:'Acid'")
node=node.replace('gmModifier:15','gmModifier:start.sunsignModifier').replace('gmModifiers:[15]','gmModifiers:[start.sunsignModifier]')
fixture=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
minute=fixture['finished']
vial={'id':'vial1','characterId':'a','sourceItemId':'hmk:gear:hmk-p121-075','quantity':1,'slot':'carried',
 'snapshot':{'id':'hmk:gear:hmk-p121-075','name':'Vial, 4 oz, 2″ × 5″','category':'other','properties':{'weightLb':0.25,'pricePence':4}}}
def make_data():
 return {'schemaVersion':1,'characters':[
  {'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,
   'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}},
  {'id':'b','name':'Recipient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':15,'per':12,'wil':14,'aur':12},'skills':[]}}],
  'items':[],'inventory':[vial,{'id':'oakpeg','characterId':'a','sourceItemId':'fixture:peg','quantity':1,'slot':'carried','snapshot':{'name':'Oak peg, six inches','category':'other','properties':{'weightLb':0.3}}}],'trash':[],'journal':fixture['rows'],
  'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Acid','characterIds':['a','b'],'anchors':[],
   'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':minute,'reason':'GM completed preparation'}]}}
def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
def new_page(browser,data):
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(110)
 assert 'v93.438' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:700])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(80)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
 return page,errors,dialogs
def bind(page):
 f=page.locator('[data-alchemy-vial-bind]');assert f.count()==1
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('select[name="vialId"]').select_option('vial1')
 f.locator('input[name="confirmed"]').check();f.locator('input[name="liquidConfirmed"]').check()
 f.locator('input[name="corkConfirmed"]').check();f.locator('select[name="material"]').select_option('glass')
 f.locator('button[type="submit"]').click();page.wait_for_timeout(120)

ARMOUR={'id':'cuirass','characterId':'b','quantity':1,'slot':'worn','layerOrder':0,
 'sourceItemId':'hmk:armour:p118:verified:hmk118-kurbul-cuirass',
 'snapshot':{'id':'hmk:armour:p118:verified:hmk118-kurbul-cuirass','name':'Cuirass','category':'armor',
  'properties':{'coverageVerified':True,'material':'K','coveredLocations':['tx','ab'],
   'locationProtection':{'tx':{'b':4,'e':6,'p':5,'f':4},'ab':{'b':4,'e':6,'p':5,'f':4}},
   'coverageMarkers':{'tx':'rigid','ab':'rigid'},'directionRestriction':'none','rigid':True,
   'layerZoneByLocation':{'tx':'torso','ab':'torso'},'weightLb':9.1}}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 data=make_data();data['inventory'].append(ARMOUR)
 page,errors,dialogs=new_page(browser,data);bind(page)
 f=page.locator('[data-alchemy-acid-armour-apply]')
 assert f.count()==1,('Acid armour form missing',errors,dialogs)
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('select[name="targetItemRef"]').select_option('cuirass::tx')
 for k in ['armourConfirmed','contactConfirmed','confirmed']:f.locator(f'input[name="{k}"]').check()
 before=saved(page);oldminute=before['campaignClock']['minute']
 f.locator('button[type="submit"]').click();page.wait_for_timeout(120)
 state=saved(page);applied=[x for x in state['journal'] if x.get('calendarAlchemyAcidArmourApply')]
 assert len(applied)==1,(dialogs,errors,'not applied');assert applied[0]['calendarAlchemyVialEmpty']['vialId']=='vial1'
 assert state['campaignClock']['minute']==oldminute
 assert next(x for x in state['inventory'] if x['id']=='cuirass')['acidAVDamageByLocation']['tx']==0
 print('PASS Chromium Acid armour: true vial and source-verified armour')
 for i,d10,expected in [(1,1,1),(2,10,1),(3,2,2),(4,1,3),(5,1,4),(6,10,4)]:
  f=page.locator('[data-alchemy-acid-armour-round]')
  assert f.count()==1,('no AV round',i,dialogs,errors)
  f.evaluate('el=>el.closest("details").open=true')
  f.locator('input[name="d10"]').fill(str(d10))
  f.locator('input[name="contactConfirmed"]').check();f.locator('input[name="confirmed"]').check()
  f.locator('button[type="submit"]').click();page.wait_for_timeout(115)
  state=saved(page);rows=[x for x in state['journal'] if x.get('calendarAlchemyAcidArmourRound')]
  assert len(rows)==i,('AV round missing',i,dialogs,errors)
  assert next(x for x in state['inventory'] if x['id']=='cuirass')['acidAVDamageByLocation']['tx']==expected,('AV damage',i,dialogs)
  assert state['campaignClock']['minute']==oldminute
  print('PASS Chromium Acid armour round',i,'AV damage',expected)
 assert page.locator('[data-alchemy-acid-armour-round]').count()==0
 assert not errors and not dialogs,(errors,dialogs)
 reload,e2,d2=new_page(browser,saved(page))
 assert len([x for x in saved(reload)['journal'] if x.get('calendarAlchemyAcidArmourRound')])==6
 assert next(x for x in saved(reload)['inventory'] if x['id']=='cuirass')['acidAVDamageByLocation']['tx']==4
 assert not e2 and not d2,(e2,d2)
 print('PASS Chromium reload: 6-round Acid AV, no invented time or inventory')
 reload.close();page.close();browser.close()
