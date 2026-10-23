"""Chromium: mixed Darkvision + Erudition CF, required secondary health and one atomic commit."""
from pathlib import Path
import re,subprocess,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'tools/test_alchemy_profusion_424.cjs').read_text()
node=source[:source.index("const a=make('alpha'")].replace("require('../src/", "require('./src/")
node=node.replace("function make(suffix,actor='A',c='C'){", "function make(suffix,actor='A',c='C',kind='Darkvision'){")
node=node.replace("elixirName:'Darkvision'", "elixirName:kind")
node+="\nconst a=make('alpha','a','C',process.argv[1]),b=make('bravo','d','C',process.argv[2]);console.log(JSON.stringify({rows:[...a.j,...b.j],vials:[a.vial,b.vial],minute:a.minute}));"

def fixture(older,newer):
 f=json.loads(subprocess.check_output(['node','-e',node,older,newer],cwd=root,text=True))
 data={'schemaVersion':1,'characters':[
  {'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}},
  {'id':'b','name':'Recipient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'skills':[]}},
  {'id':'d','name':'Other Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80}]}}],
  'items':[],'inventory':[{**v,'snapshot':{**v['snapshot'],'category':'other'}} for v in f['vials']],'trash':[],
  'journal':[{**r,'createdAt':'2026-10-22T00:00:00Z'} for r in sorted(f['rows'],key=lambda x:x['campaignMinute'])],
  'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':f['minute'],'label':'Mixed CF', 'characterIds':['a','b','d'], 'anchors':[],
    'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':f['minute'],'reason':'GM preparation done'}]}}
 return data

def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))

def submit(page,name,finish,die,with_hp=None):
 f=page.locator('[data-alchemy-'+name.lower()+']').filter(has=page.locator(f'input[name="finishId"][value="{finish}"]')).filter(has=page.locator('input[name="targetId"][value="b"]'))
 assert f.count()==1,('missing form',name,finish)
 f.evaluate('el=>el.closest("details").open=true');f.locator('select[name="testSkill"]').select_option('Aura')
 f.locator('input[name="d100"]').fill(str(die))
 if name=='Darkvision' and die in (83,85):f.locator('input[name="healingD6"]').fill('2')
 if with_hp is not None:
  el=f.locator('input[name^="eruditionHp_"]' if name=='Erudition' else 'input[name^="profusionHp_"]')
  assert el.count()==1,('missing secondary HP d6',name)
  if with_hp>0:el.fill(str(with_hp))
 f.locator('input[name="confirmed"]').check();f.locator('button[type="submit"]').click();page.wait_for_timeout(160)

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for old,new,die in [('Erudition','Darkvision',83),('Darkvision','Erudition',85),('Erudition','Physic',85)]:
  page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
  page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture(old,new))
  page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(150)
  assert 'v93.438' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:300])
  page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
  if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(90)
  submit(page,old,'alpha-finish',42)
  assert not dialogs and not errors,('initial',old,dialogs,errors)
  before=saved(page);assert len([j for j in before['journal'] if j.get('calendarAlchemyImbibing')])==1
  if new=='Erudition':
   submit(page,new,'bravo-finish',die,with_hp=0)
   assert dialogs and ('d6' in dialogs[-1] or 'HP' in dialogs[-1]),('missing rejection',dialogs)
   assert len([j for j in saved(page)['journal'] if j.get('calendarAlchemyImbibing')])==1,'partial commit after rejected d6'
   dialogs.clear()
  submit(page,new,'bravo-finish',die,with_hp=3 if new=='Erudition' else None)
  assert not dialogs and not errors,('second',old,new,dialogs,errors)
  data=saved(page);uses=[j for j in data['journal'] if j.get('calendarAlchemyImbibing')]
  assert len(uses)==2 and uses[-1]['calendarAlchemyImbibing']['sl']=='CF',uses
  assert len([j for j in data['journal'] if j.get('calendarAlchemyVialEmpty')])==2,'missing vial consumption'
  target=next(c for c in data['characters'] if c['id']=='b')
  if old=='Erudition':
   assert len([j for j in data['journal'] if j.get('calendarAlchemyEruditionProfusionIll')])==1,'Erudition secondary evidence absent'
   expected_levels=2 if new=='Physic' else 1
   assert target['hmk']['arcane']['auralShockLevels']==expected_levels and target['hmk']['combatState']['fatigue']['otherWeakness']==5*expected_levels,target
  else:
   assert len([j for j in data['journal'] if j.get('calendarAlchemyDarkvisionProfusionIll')])==1,'Darkvision secondary evidence absent'
   assert len([j for j in data['journal'] if j.get('calendarAlchemyDarkvisionHealingStart')])==1,'missing mandatory source HP'
   assert target['hmk']['arcane']['auralShockLevels']==1,target
  assert data['campaignClock']['minute']==fixture(old,new)['campaignClock']['minute'],'GM time advanced'
  print('PASS Chromium mixed CF',old,'→',new,'atomic health + inventory + history',flush=True)
  page.close()
 browser.close()
