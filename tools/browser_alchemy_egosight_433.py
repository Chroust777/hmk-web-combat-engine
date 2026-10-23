"""Real Chromium: Egosight drinking, GM touch facts, CF Aural, reload."""
from pathlib import Path
import subprocess,json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
old=(root/'tools/browser_alchemy_decay_417.py').read_text()
node=re.search(r"node=r'''\n(.*?)\n'''",old,re.S).group(1)
node=node.replace("elixirName:'Healing'","elixirName:'Egosight'")
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
  'items':[],'inventory':[vial],'trash':[],'journal':fixture['rows'],
  'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Egosight','characterIds':['a','b'],'anchors':[],
   'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':minute,'reason':'GM completed preparation'}]}}
def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
def new_page(browser,data):
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(110)
 assert 'v93.437' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:700])
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
def drink(page,roll):
 f=page.locator('[data-alchemy-egosight]').filter(has=page.locator('input[name="targetId"][value="b"]'))
 assert f.count()==1,('missing form',page.locator('#app').inner_text()[-1500:])
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('select[name="testSkill"]').select_option('Aura');f.locator('input[name="d100"]').fill(str(roll))
 f.locator('input[name="confirmed"]').check();f.locator('button[type="submit"]').click();page.wait_for_timeout(160)
 def proofs():return [r for r in saved(page)['journal'] if r.get('calendarAlchemyImbibing',{}).get('elixirName')=='Egosight']
 assert len(proofs())==1,('imbibing failed',roll,page.locator('#app').inner_text()[-2000:])
 return proofs()[0]['calendarAlchemyImbibing']
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=new_page(browser,make_data());bind(page)
 proof=drink(page,42);assert proof['sl']=='S',proof
 previous=saved(page);beforeMinute=previous['campaignClock']['minute'];beforeInventory=previous['inventory']
 for ref,classification,ego,sub in [('Copper Charm','minor',None,None),('Gold Aegis','major-ego','13','no'),('Singing Blade','major-will',None,None)]:
  f=page.locator('[data-alchemy-egosight-touch]');assert f.count()==1,(ref,errors,dialogs)
  f.evaluate('el=>el.closest("details").open=true')
  f.locator('input[name="artefactReference"]').fill(ref)
  f.locator('select[name="gmClassification"]').select_option(classification)
  if ego is not None:f.locator('input[name="ego"]').fill(ego)
  if sub is not None:f.locator('select[name="egoSubversion"]').select_option(sub)
  f.locator('input[name="touchedConfirmed"]').check();f.locator('input[name="confirmed"]').check()
  f.locator('button[type="submit"]').click();page.wait_for_timeout(160)
  facts=[r['calendarAlchemyEgosightTouch'] for r in saved(page)['journal'] if r.get('calendarAlchemyEgosightTouch')]
  assert len(facts)==['minor','major-ego','major-will'].index(classification)+1,(ref,errors,dialogs)
  assert facts[-1]['gmClassification']==classification
  assert saved(page)['campaignClock']['minute']==beforeMinute
  assert saved(page)['inventory']==beforeInventory
  print('PASS Egosight Touch',ref,classification)
 assert not errors and not dialogs,(errors,dialogs)
 reload,errors2,dialogs2=new_page(browser,saved(page))
 assert not errors2 and not dialogs2,(errors2,dialogs2)
 assert len([r for r in saved(reload)['journal'] if r.get('calendarAlchemyEgosightTouch')])==3
 reload.close();page.close()
 page,errors,dialogs=new_page(browser,make_data());bind(page)
 cf=drink(page,95);assert cf['sl']=='CF' and cf['illEffect']['kind']=='aural-shock',cf
 state=saved(page);target=next(x for x in state['characters'] if x['id']=='b')
 assert target['hmk']['arcane']['auralShockLevels']==1
 assert target['hmk']['combatState']['fatigue']['otherWeakness']==5
 assert state['campaignClock']['minute']==minute
 assert page.locator('[data-alchemy-egosight-touch]').count()==1
 f=page.locator('[data-alchemy-egosight-touch]');assert f.locator('button[type="submit"]').is_disabled()
 print('PASS Egosight CF Aural Shock and benefit suspension')
 reload,errors2,dialogs2=new_page(browser,saved(page))
 assert not errors2 and not dialogs2,(errors2,dialogs2)
 print('PASS Egosight reload, complete immutable proof and original GM time')
 reload.close();page.close();browser.close()
