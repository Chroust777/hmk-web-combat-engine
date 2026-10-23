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
 assert 'v93.432' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:650])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(70)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
 return page,errors,dialogs
def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 data=make_data();data['characters'][1]['hmk']['skills'].append({'id':'spirit','name':'Spirit','ml':50})
 for id,w in [('blade',10),('shield',15),('extra',0.5)]:
  data['inventory'].append({'id':id,'characterId':'b','slot':'carried','quantity':1,'sourceItemId':'test:'+id,
   'snapshot':{'name':id,'category':'weapon','properties':{'weightLb':w}}})
 page,errors,dialogs=new_page(browser,data)
 f=page.locator('[data-alchemy-vial-bind]');assert f.count()==1,('vial bind',errors,dialogs,page.locator('#app').inner_text()[:2200],page.locator('[data-calendar-open]').count())
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('select[name="vialId"]').select_option('vial1');f.locator('input[name="confirmed"]').check()
 f.locator('input[name="liquidConfirmed"]').check();f.locator('input[name="corkConfirmed"]').check();f.locator('select[name="material"]').select_option('glass')
 f.locator('button[type="submit"]').click();page.wait_for_timeout(120)
 f=page.locator('[data-alchemy-footpad]').filter(has=page.locator('input[name="targetId"][value="b"]'))
 assert f.count()==1,('footpad submit form',errors,dialogs)
 f.evaluate('el=>el.closest("details").open=true');f.locator('select[name="testSkill"]').select_option('Aura')
 f.locator('input[name="d100"]').fill('42');f.locator('input[name="confirmed"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(150)
 assert not errors and not dialogs,('footpad imbibing',errors,dialogs)
 prior=saved(page);beforeMinute=prior['campaignClock']['minute'];originalInventory=prior['inventory']
 def log_acoustic(kind,selected,expected):
  f=page.locator('[data-alchemy-footpad-acoustic]');assert f.count()==1,('missing acoustics form',kind,errors,dialogs)
  f.evaluate('el=>el.closest("details").open=true')
  f.locator('select[name="kind"]').select_option(kind)
  for id in selected:f.locator('input[name="itemId"][value="'+id+'"]').check()
  f.locator('input[name="note"]').fill('Checked '+kind)
  f.locator('input[name="confirmed"]').check()
  f.locator('button[type="submit"]').click();page.wait_for_timeout(140)
  assert not errors and not dialogs,(kind,errors,dialogs)
  now=saved(page)
  proofs=[x['calendarAlchemyFootpadAcoustic'] for x in now['journal'] if x.get('calendarAlchemyFootpadAcoustic')]
  assert proofs[-1]['perceived']==expected,(kind,proofs[-1])
  assert proofs[-1]['sourceUseIds'] and proofs[-1]['hearingEMLModifier'] is None
  assert now['campaignClock']['minute']==beforeMinute,'GM clock advanced'
  assert now['inventory']==originalInventory,'inventory modified'
  print('PASS Chromium Footpad acoustic:',kind,expected)
  return proofs[-1]
 log_acoustic('ordinary-speech',[],'whisper')
 log_acoustic('shouting',[],'ordinary-speech')
 result=log_acoustic('wielded-objects',['blade','shield'],'muffled')
 assert result['weightLb']==25 and result['limitLb']==25 and result['spiritML']==50
 result=log_acoustic('wielded-objects',['blade','shield','extra'],'unmodified')
 assert result['weightLb']==25.5 and not result['affected']
 # Same campaign reload must replay acoustic evidence successfully.
 page2,errors2,dialogs2=new_page(browser,saved(page))
 assert not errors2 and not dialogs2,(errors2,dialogs2)
 assert page2.locator('[data-alchemy-footpad-acoustic]').count()==1
 assert len([r for r in saved(page2)['journal'] if r.get('calendarAlchemyFootpadAcoustic')])==4
 print('PASS Chromium Footpad acoustic: campaign reload and immutable ledger')
 page2.close();page.close();browser.close()
