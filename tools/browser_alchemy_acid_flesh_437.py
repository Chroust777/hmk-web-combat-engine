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
  {'id':'b','name':'Recipient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':15,'per':12,'wil':14,'aur':12},'skills':[{'id':'s-shock','name':'Shock','ml':90}]}}],
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


def checked(f,*names):
 for name in names:f.locator(f'input[name="{name}"]').check()
def submit(f,page):
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('button[type="submit"]').click();page.wait_for_timeout(100)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for delivery in ['skin','ingested']:
  page,errors,dialogs=new_page(browser,make_data());bind(page)
  forms=page.locator('[data-alchemy-acid-flesh-apply]')
  assert forms.count()==2,('forms',forms.count(),errors,dialogs)
  form=forms.nth(1 if delivery=='skin' else 0)
  form.evaluate('el=>el.closest("details").open=true')
  form.locator('select[name="targetId"]').select_option('b')
  if delivery=='skin':
   form.locator('input[name="location"]').fill('tx')
   checked(form,'skinContactConfirmed','humanConfirmed','confirmed')
  else:checked(form,'ingestedConfirmed','humanConfirmed','confirmed')
  submit(form,page)
  j=saved(page)['journal'];proofs=[x for x in j if x.get('calendarAlchemyAcidFleshApply')]
  assert len(proofs)==1,(delivery,dialogs,errors)
  assert proofs[0]['calendarAlchemyVialEmpty']['vialId']=='vial1'
  oldminute=saved(page)['campaignClock']['minute']
  for i in range(1,3):
   form=page.locator('[data-alchemy-acid-flesh-round]');assert form.count()==1,(delivery,i,dialogs,errors)
   form.evaluate('el=>el.closest("details").open=true')
   form.locator('input[name="d10"]').fill('1')
   form.locator('input[name="combatRound"]').fill(str(i))
   form.locator('input[name="shockD100"]').fill('21')
   # Continuous same-site burn advances IL on the same wound: no Compound roll.
   checked(form,'contactConfirmed','confirmed')
   submit(form,page)
   dat=saved(page)
   rounds=[x for x in dat['journal'] if x.get('calendarAlchemyAcidFleshRound')]
   assert len(rounds)==i,(delivery,i,dialogs,errors)
   assert dat['campaignClock']['minute']==oldminute
   target=next(x for x in dat['characters'] if x['id']=='b')
   assert len(target['hmk']['combatState']['wounds'])==1,(delivery,i,target['hmk'].get('combatState'),dialogs)
   assert target['hmk']['combatState']['wounds'][0]['level']==i,(delivery,i,'IL not cumulative',dialogs)
   assert target['hmk']['combatState']['shock']==('KIA' if delivery=='ingested' and i==2 else 'NONE'),(delivery,i,target['hmk']['combatState']['shock'],dialogs)
  reload,e2,d2=new_page(browser,saved(page))
  assert len([x for x in saved(reload)['journal'] if x.get('calendarAlchemyAcidFleshRound')])==2
  assert not errors and not dialogs and not e2 and not d2,(delivery,errors,dialogs,e2,d2)
  print('PASS Chromium Acid Flesh',delivery,': two genuine burn/shock rolls and reload')
  reload.close();page.close()
 browser.close()
