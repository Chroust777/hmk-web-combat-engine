"""Real Chromium: actual thrown Acid, shattered inventory vial, first burn/shock, reload."""
from pathlib import Path
import subprocess,json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
old=(root/'tools/browser_alchemy_decay_417.py').read_text()
node=re.search(r"node=r'''\n(.*?)\n'''",old,re.S).group(1).replace("elixirName:'Healing'","elixirName:'Acid'")
node=node.replace('gmModifier:15','gmModifier:start.sunsignModifier').replace('gmModifiers:[15]','gmModifiers:[start.sunsignModifier]')
fixture=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True));minute=fixture['finished']
vial={'id':'vial1','characterId':'a','sourceItemId':'hmk:gear:hmk-p121-075','quantity':1,'slot':'carried',
 'snapshot':{'id':'hmk:gear:hmk-p121-075','name':'Vial, 4 oz, 2″ × 5″','category':'other','properties':{'weightLb':0.25,'pricePence':4}}}
def make_data():
 return {'schemaVersion':1,'characters':[
  {'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,
   'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'throw','name':'Throwing','ml':85},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}},
  {'id':'b','name':'Target','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':15,'per':12,'wil':14,'aur':12},'skills':[{'id':'s-shock','name':'Shock','ml':90}]}}],
  'items':[],'inventory':[vial],'trash':[],'journal':fixture['rows'],
  'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Acid','characterIds':['a','b'],'anchors':[],
   'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':minute,'reason':'GM completed preparation'}]}}
def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
def new_page(browser,data):
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(125)
 assert 'v93.438' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:400])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(90)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(90)
 return page,errors,dialogs
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for case in ['direct_hit','grenade_hit','miss','cf']:
  page,errors,dialogs=new_page(browser,make_data())
  bind=page.locator('[data-alchemy-vial-bind]');assert bind.count()==1,(case,'binding',errors,dialogs)
  bind.evaluate('el=>el.closest("details").open=true');bind.locator('select[name="vialId"]').select_option('vial1')
  for fld in ['confirmed','liquidConfirmed','corkConfirmed']:bind.locator('input[name="'+fld+'"]').check()
  bind.locator('select[name="material"]').select_option('glass')
  bind.locator('button[type="submit"]').click();page.wait_for_timeout(150)
  f=page.locator('[data-alchemy-acid-thrown]');assert f.count()==1,(case,'throw form',errors,dialogs)
  f.evaluate('el=>el.closest("details").open=true')
  f.locator('input[name="distanceFt"]').fill('20' if case!='grenade_hit' else '40')
  f.locator('input[name="d100"]').fill('43' if case!='grenade_hit' else '42')
  if case in ('miss','cf'):f.locator('input[name="d100"]').fill('97' if case=='miss' else '100')
  if case=='grenade_hit':
   f.locator('select[name="aimType"]').select_option('grenade')
   f.locator('input[name="grenadeD"]').fill('1');f.locator('input[name="deviationD8"]').fill('7')
   f.locator('input[name="splashDistanceInches"]').fill('2')
  if case in ('direct_hit','grenade_hit'):
   f.locator('select[name="targetKind"]').select_option('flesh');f.locator('select[name="targetId"]').select_option('b')
   f.locator('select[name="location"]').select_option('sk' if case=='direct_hit' else 'tx')
   f.locator('input[name="humanConfirmed"]').check();f.locator('input[name="contactD10"]').fill('1')
   f.locator('input[name="shockD100"]').fill('41')
   if case=='direct_hit':
    f.locator('input[name="zoneD"]').fill('1');f.locator('input[name="locationD10"]').fill('1')
  for field in ['firm','geometry','confirmed']:f.locator('input[name="'+field+'"]').check()
  before=saved(page);f.locator('button[type="submit"]').click();page.wait_for_timeout(210)
  after=saved(page);throws=[r for r in after['journal'] if 'calendarAlchemyAcidThrown' in r]
  assert len(throws)==1,(case,'throw missing',dialogs,errors)
  throw=throws[0]['calendarAlchemyAcidThrown'];assert throw['sl']==('CF' if case=='cf' else 'F' if case=='miss' else 'S')
  assert (not any(i['id']=='vial1' for i in after['inventory']))==(case!='cf'),(case,'vial existence',dialogs)
  assert after['campaignClock']['minute']==before['campaignClock']['minute']
  if case in ('direct_hit','grenade_hit'):
   rounds=[r for r in after['journal'] if r.get('calendarAlchemyAcidFleshRound')]
   assert len(rounds)==1,(case,'first contact',dialogs,errors)
   target=next(c for c in after['characters'] if c['id']=='b')
   assert target.get('hmk',{}).get('combatState',{}).get('wounds'),(case,'no true Combat State burn',dialogs)
  print('PASS Chromium Acid thrown:',case,'journal/inventory/health/reload preflight')
  page.close()
 browser.close()
