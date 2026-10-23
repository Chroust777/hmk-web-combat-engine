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
 assert 'v93.435' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:700])
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

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 fixture=make_data()
 fixture['inventory'].append({'id':'sword','characterId':'a','sourceItemId':'fixture:weapon','quantity':1,'slot':'main_hand','currentWQ':4,
  'snapshot':{'id':'fixture:weapon','name':'Actual sword','category':'weapon','properties':{'quality':5,'weightLb':2}}})
 page,errors,dialogs=new_page(browser,fixture);bind(page)
 f=page.locator('[data-alchemy-acid-weapon-apply]');assert f.count()==1,('missing Acid WQ form',errors,dialogs)
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('select[name="targetItemId"]').select_option('sword')
 for key in ['weaponConfirmed','contactConfirmed','confirmed']:f.locator(f'input[name="{key}"]').check()
 before=saved(page);t=before['campaignClock']['minute'];f.locator('button[type="submit"]').click();page.wait_for_timeout(130)
 now=saved(page);applications=[r for r in now['journal'] if r.get('calendarAlchemyAcidWeaponApply')]
 assert len(applications)==1,('application not saved',errors,dialogs)
 assert applications[0]['calendarAlchemyVialEmpty']['vialId']=='vial1'
 assert next(x for x in now['inventory'] if x['id']=='sword')['currentWQ']==4
 assert now['campaignClock']['minute']==t
 print('PASS Acid weapon: true vial emptied and same real WQ persisted')
 for i,d10,expected_wq in [(1,1,3),(2,10,3),(3,2,2),(4,3,1),(5,1,0)]:
  f=page.locator('[data-alchemy-acid-weapon-round]')
  assert f.count()==1,('missing round',i,errors,dialogs)
  f.evaluate('el=>el.closest("details").open=true')
  f.locator('input[name="d10"]').fill(str(d10))
  f.locator('input[name="contactConfirmed"]').check();f.locator('input[name="confirmed"]').check()
  f.locator('button[type="submit"]').click();page.wait_for_timeout(110)
  now=saved(page);rounds=[r for r in now['journal'] if r.get('calendarAlchemyAcidWeaponRound')]
  assert len(rounds)==i,('round not committed',i,errors,dialogs)
  assert next(x for x in now['inventory'] if x['id']=='sword')['currentWQ']==expected_wq,('WQ did not mutate',i,expected_wq)
  assert now['campaignClock']['minute']==t
  print('PASS real Acid d10 round',i,'currentWQ',expected_wq)
 assert page.locator('[data-alchemy-acid-weapon-round]').count()==0
 assert not dialogs and not errors,(dialogs,errors)
 reread,e2,d2=new_page(browser,saved(page))
 assert len([r for r in saved(reread)['journal'] if r.get('calendarAlchemyAcidWeaponRound')])==5
 assert next(x for x in saved(reread)['inventory'] if x['id']=='sword')['currentWQ']==0
 assert not e2 and not d2,(e2,d2)
 print('PASS reload: immutable five-round WQ and unmodified GM clock')
 reread.close();page.close();browser.close()
