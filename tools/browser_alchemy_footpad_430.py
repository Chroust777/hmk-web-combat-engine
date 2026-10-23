"""Chromium end-to-end: physical Footpad, Stealth/quiet Legerdemain ML and CF Aural."""
from pathlib import Path
import re,subprocess,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
old=(root/'tools/browser_alchemy_decay_417.py').read_text()
node=re.search(r"node=r'''\n(.*?)\n'''",old,re.S).group(1)
node=node.replace("elixirName:'Healing'","elixirName:'Footpad'")
node=node.replace('gmModifier:15','gmModifier:5').replace('gmModifiers:[15]','gmModifiers:[5]')
fixture=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
minute=fixture['finished']
item={'id':'vial1','characterId':'a','sourceItemId':'hmk:gear:hmk-p121-075','quantity':1,'slot':'carried',
 'snapshot':{'id':'hmk:gear:hmk-p121-075','name':'Vial, 4 oz, 2″ × 5″','category':'other','properties':{'weightLb':0.25,'pricePence':4}}}
def make_data():
 return {'schemaVersion':1,'characters':[
  {'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,
   'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}},
  {'id':'b','name':'Recipient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':15,'per':12,'wil':14,'aur':12},'skills':[{'id':'stl','name':'Stealth','ml':60},{'id':'leg','name':'Legerdemain','ml':60}]}}],
  'items':[],'inventory':[item],'trash':[],'journal':fixture['rows'],
  'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Footpad','characterIds':['a','b'],'anchors':[],
   'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':minute,'reason':'GM completed preparation'}]}}
def new_page(browser,data):
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(110)
 assert 'v93.435' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:650])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(70)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
 return page,errors,dialogs
def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for roll,sl in [(42,'S'),(85,'CF')]:
  page,errors,dialogs=new_page(browser,make_data())
  f=page.locator('[data-alchemy-vial-bind]');assert f.count()==1,('bind',errors,dialogs)
  f.evaluate('el=>el.closest("details").open=true')
  f.locator('select[name="vialId"]').select_option('vial1');f.locator('input[name="confirmed"]').check()
  f.locator('input[name="liquidConfirmed"]').check();f.locator('input[name="corkConfirmed"]').check();f.locator('select[name="material"]').select_option('glass')
  f.locator('button[type="submit"]').click();page.wait_for_timeout(120)
  f=page.locator('[data-alchemy-footpad]').filter(has=page.locator('input[name="targetId"][value="b"]'))
  assert f.count()==1,('footpad form',errors,dialogs,page.locator('#app').inner_text()[-1000:])
  f.evaluate('el=>el.closest("details").open=true');f.locator('select[name="testSkill"]').select_option('Aura')
  f.locator('input[name="d100"]').fill(str(roll));f.locator('input[name="confirmed"]').check();f.locator('button[type="submit"]').click();page.wait_for_timeout(150)
  assert not errors and not dialogs,('imbibing',errors,dialogs)
  got=saved(page);use=[r['calendarAlchemyImbibing'] for r in got['journal'] if r.get('calendarAlchemyImbibing')]
  assert len(use)==1 and use[0]['sl']==sl and use[0]['elixirName']=='Footpad',(sl,use,dialogs)
  assert len([r for r in got['journal'] if r.get('calendarAlchemyVialEmpty')])==1,'no physical empty receipt'
  assert len(got['inventory'])==1 and got['inventory'][0]['id']=='vial1','vial replaced'
  assert got['campaignClock']['minute']==minute,'time advanced'
  if sl=='CF':
   c=next(x for x in got['characters'] if x['id']=='b')
   assert c['hmk']['arcane']['auralShockLevels']==1,c
   assert c['hmk']['combatState']['fatigue']['otherWeakness']==5,c
   assert any(e['type']=='hmk-alchemy-footpad-aural' for e in c['hmk']['combatState']['events']),c
  print('PASS Chromium Footpad',sl,'inventory, Aural history and clock')
  if sl=='S':
   page.locator('[data-nav="skills"]').first.click();page.wait_for_timeout(140)
   if page.locator('[data-skill-actor]').count():page.locator('[data-skill-actor]').first.select_option('b');page.wait_for_timeout(120)
   f=page.locator('#skill-secondary-form');assert f.count()==1,'missing Skill Workbench'
   f.locator('[name="primary"]').select_option('Stealth');f.locator('[name="rollA"]').fill('82')
   f.locator('button[type="submit"]').first.click();page.wait_for_timeout(150)
   assert not errors and not dialogs,('workbench',errors,dialogs)
   tests=[r['skillTestProof'] for r in saved(page)['journal'] if r.get('skillTestProof',{}).get('footpadA')]
   assert tests and tests[-1]['a']['level']=='S' and tests[-1]['a']['roll']==82,tests
   assert tests[-1]['a']['footpadSourceIds'] and tests[-1]['footpadA']['modifier']>0,tests[-1]
   print('PASS Chromium Footpad Skill Workbench: d100 82 originally F, final S by Footpad ML, immutable origin')
   f=page.locator('#skill-secondary-form')
   f.locator('[name="primary"]').select_option('Legerdemain')
   f.locator('[name="rollA"]').fill('82')
   f.locator('button[type="submit"]').first.click();page.wait_for_timeout(110)
   leg=[r['skillTestProof'] for r in saved(page)['journal'] if r.get('skillTestProof',{}).get('skills')==['Legerdemain']]
   assert leg and leg[-1]['a']['level']=='F' and leg[-1]['footpadA']['modifier']==0,(leg,errors,dialogs)
   f=page.locator('#skill-secondary-form')
   f.locator('[name="primary"]').select_option('Legerdemain')
   f.locator('[name="footpadQuietA"]').check()
   f.locator('[name="rollA"]').fill('83')
   f.locator('[name="footpadQuietA"]').evaluate('el=>el.checked=true')
   f.locator('button[type="submit"]').first.click();page.wait_for_timeout(110)
   leg=[r['skillTestProof'] for r in saved(page)['journal'] if r.get('skillTestProof',{}).get('skills')==['Legerdemain']]
   assert leg[-1]['a']['level']=='S' and leg[-1]['footpadA']['modifier']>0,(leg[-1],errors,dialogs)
   assert not errors and not dialogs,(errors,dialogs)
   print('PASS Chromium Footpad: Legerdemain d100 82 fails without GM sound confirmation, succeeds when confirmed')
  page.close()
 browser.close()
