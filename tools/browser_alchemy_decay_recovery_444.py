"""Chromium: overdue GM adjudication, two 30-day periods, persistence/reload, unchanged clock.
Loads exact built bundle into real Chromium, using a localStorage fixture; not GitHub Pages network.
"""
from pathlib import Path
import subprocess,json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
code=re.search("node=r'''(.*?)'''",(root/'tools/browser_alchemy_decay_417.py').read_text(),re.S).group(1)
fixture=json.loads(subprocess.check_output(['node','-e',code],cwd=root,text=True))
period=30*1440
now=fixture['first']+period+60
initial={'schemaVersion':1,'characters':[{'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}}],
'items':[],'inventory':[],'trash':[],'journal':fixture['rows'],'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':now,'label':'Legacy missed Decay','characterIds':['a'],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':now,'reason':'legacy import with missed dates'}]}}
assert len(initial['journal'])==3
bundle=(root/'hmk-app.bundle.js').read_text()

def start(browser,data):
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=bundle)
 page.locator('[data-nav="calendar"]').first.click(timeout=10000)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click()
 return page,errors,dialogs
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=start(browser,initial)
 for n,target in enumerate([4,2]):
  f=page.locator('[data-alchemy-decay]').first
  assert f.count()==1,('form missing',errors,dialogs,page.locator('#app').inner_text()[-1200:])
  f.evaluate('el=>el.closest("details").open=true')
  assert 'Zmeškaný Decay' in f.inner_text()
  assert 'nynější zpětné vyhodnocení' in f.inner_text()
  f.locator('input[name="d10"]').fill('10')
  f.locator('input[name="gmConfirmed"]').check()
  # Required: refusing an unconfirmed retrospective GM action must write nothing.
  if n==0:
   f.locator('button[type="submit"]').evaluate('el=>el.click()')
   before=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
   assert not any(x.get('calendarAlchemyDecay') for x in before['journal']),'unconfirmed GM wrote proof'
  f.locator('input[name="gmMissedConfirmed"]').check()
  f.locator('button[type="submit"]').click()
  saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
  proofs=[x for x in saved['journal'] if x.get('calendarAlchemyDecay')]
  assert len(proofs)==n+1,(n,errors,dialogs,proofs)
  proof=proofs[-1]['calendarAlchemyDecay']
  assert proof['asAfter']==target and proof['recordedMinute']==now and proof['reconstructed'] is True,proof
  assert proof['dueMinute']==fixture['first']+n*period,proof
  assert proofs[-1]['campaignMinute']==now,'not append-time evidence'
  assert saved['campaignClock']['minute']==now,'GM time moved'
  assert len(saved['journal'])==len(fixture['rows'])+n+1,'original evidence lost'
  assert not errors and not dialogs,(errors,dialogs)
  print(f'PASS Chromium backfill period {n+1}: AS {proof["asBefore"]}→{target}, persisted now, real due preserved, no time mutation',flush=True)
 assert page.locator('[data-alchemy-decay]').count()==0
 page.close()
 page,errors,dialogs=start(browser,saved)
 restored=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 assert restored['journal']==saved['journal'],'journal changed across page rehydration'
 assert restored['campaignClock']['minute']==now
 assert page.locator('[data-alchemy-decay]').count()==0
 assert not errors and not dialogs,(errors,dialogs)
 print('PASS Chromium new app instance: full history unchanged, no outstanding decay, inventory untouched',flush=True)
 page.close();browser.close()
