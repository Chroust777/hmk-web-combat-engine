"""Real Chromium: Darkvision imbibing, physical vial, persistent monthly Decay."""
from pathlib import Path
import re,subprocess,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
old=(root/'tools/browser_alchemy_decay_417.py').read_text()
node=re.search(r"node=r'''\n(.*?)\n'''",old,re.S).group(1)
node=node.replace("elixirName:'Healing'","elixirName:'Darkvision'")
node=node.replace('gmModifier:15','gmModifier:-15').replace('gmModifiers:[15]','gmModifiers:[-15]')
fixture=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
minute=fixture['finished']
item={'id':'vial1','characterId':'a','sourceItemId':'hmk:gear:hmk-p121-075','quantity':1,'slot':'carried',
 'snapshot':{'id':'hmk:gear:hmk-p121-075','name':'Vial, 4 oz, 2″ × 5″','category':'other','properties':{'weightLb':0.25,'pricePence':4}}}
def make_data():
 return {'schemaVersion':1,'characters':[
  {'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,
   'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}},
  {'id':'b','name':'Recipient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'skills':[]}}],
  'items':[],'inventory':[item],'trash':[],'journal':fixture['rows'],
  'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Darkvision','characterIds':['a','b'],'anchors':[],
   'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':minute,'reason':'GM completed preparation'}]}}
def new_page(browser,data):
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(120)
 assert 'v93.425' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:650])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(80)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
 return page,errors,dialogs
def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for die,expected_level in [(42,'S'),(85,'CF')]:
  page,errors,dialogs=new_page(browser,make_data())
  f=page.locator('[data-alchemy-vial-bind]');assert f.count()==1,('binding',errors,dialogs)
  f.evaluate('el=>el.closest("details").open=true')
  f.locator('select[name="vialId"]').select_option('vial1');f.locator('input[name="confirmed"]').check()
  f.locator('input[name="liquidConfirmed"]').check();f.locator('input[name="corkConfirmed"]').check()
  f.locator('select[name="material"]').select_option('glass');f.locator('button[type="submit"]').click();page.wait_for_timeout(130)
  assert not errors and not dialogs,('binding failure',errors,dialogs)
  f=page.locator('[data-alchemy-darkvision]').filter(has=page.locator('input[name="targetId"][value="b"]'))
  assert f.count()==1,('imbibing target',page.locator('[data-alchemy-darkvision]').count(),errors,dialogs,page.locator('#app').inner_text()[-1200:])
  f.evaluate('el=>el.closest("details").open=true')
  f.locator('select[name="testSkill"]').select_option('Aura')
  f.locator('input[name="d100"]').fill(str(die));
  if expected_level=='CF':f.locator('input[name="healingD6"]').fill('2')
  f.locator('input[name="confirmed"]').check()
  f.locator('button[type="submit"]').click();page.wait_for_timeout(155)
  assert not errors and not dialogs,('imbibing failure',errors,dialogs)
  data=saved(page)
  uses=[x['calendarAlchemyImbibing'] for x in data['journal'] if x.get('calendarAlchemyImbibing')]
  assert len(uses)==1 and uses[0]['sl']==expected_level,('missing proof',uses,dialogs)
  assert len([x for x in data['journal'] if x.get('calendarAlchemyVialEmpty')])==1,'physical vial not emptied'
  assert len(data['inventory'])==1 and data['inventory'][0]['snapshot']['properties']['weightLb']==0.25,'source mass modified'
  assert data['campaignClock']['minute']==minute,'GM clock moved'
  assert page.locator('[data-alchemy-darkvision]').count()==0,'duplicate use available'
  assert 'Darkvision AS' in page.locator('#app').text_content(),'active duration not visible'
  if expected_level=='CF':
   assert uses[0]['illEffect']['recoveryPending'] and uses[0]['illEffect']['healingRate']==5,uses
  print('PASS Chromium v93.425: '+expected_level+' Imbibing Roll, physical empty vial, active Darkvision, immutable journal')
  page.close()
  if expected_level=='S':
   data['campaignClock']['minute']=minute+30*1440
   data['campaignClock']['events'].append({'id':'gm-decay','type':'advance','minute':minute+30*1440,'reason':'GM approved Decay date'})
   page,errors,dialogs=new_page(browser,data)
   d=page.locator('[data-alchemy-decay]');assert d.count()==1,('missing active monthly Decay',errors,dialogs)
   d.evaluate('el=>el.closest("details").open=true');d.locator('input[name="d10"]').fill('1')
   d.locator('input[name="gmConfirmed"]').check();d.locator('button[type="submit"]').click();page.wait_for_timeout(145)
   assert not errors and not dialogs,('decay failure',errors,dialogs)
   updated=saved(page)
   decay=[x['calendarAlchemyDecay'] for x in updated['journal'] if x.get('calendarAlchemyDecay')]
   assert len(decay)==1 and decay[0]['asBefore']==uses[0]['finalAS'] and decay[0]['asAfter']==uses[0]['finalAS']-1,decay
   print('PASS Chromium v93.425: 30-day Decay continues AFTER imbibing at current effective AS')
   page.close()
 browser.close()
