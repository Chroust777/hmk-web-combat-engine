"""Chromium: two physical Darkvision doses, Profusion CF, linked adverse effects."""
from pathlib import Path
import subprocess,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'tools/test_alchemy_profusion_424.cjs').read_text()
node=source[:source.index("const a=make('alpha'")].replace("require('../src/", "require('./src/")+"\nconst a=make('alpha','a'),b=make('bravo','d');console.log(JSON.stringify({rows:[...a.j,...b.j],vials:[a.vial,b.vial],minute:a.minute}));"
fixture=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
data={'schemaVersion':1,'characters':[
 {'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}},
 {'id':'b','name':'Recipient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'skills':[]}},
 {'id':'d','name':'Other Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80}]}}],
 'items':[],'inventory':[{**v,'snapshot':{**v['snapshot'],'category':'other'}} for v in fixture['vials']],'trash':[],'journal':[{**r,'createdAt':'2026-10-22T00:00:00Z'} for r in sorted(fixture['rows'],key=lambda x:x['campaignMinute'])],
 'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':fixture['minute'],'label':'Profusion','characterIds':['a','b','d'],'anchors':[],
 'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':fixture['minute'],'reason':'GM preparation done'}]}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append('console:'+m.text) if m.type=='error' else None)
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(120)
 assert 'v93.438' in page.locator('#app').inner_text(),('boot',errors,dialogs)
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
 def reload():return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
 assert page.locator('[data-alchemy-vial-bind]').count()==0, 'fixture already contains both original binding proofs'
 print('PASS Chromium 424: two separate existing vials preserved from prior proofs')
 for prefix,die in [('alpha',42),('bravo',83)]:
  f=page.locator('[data-alchemy-darkvision]').filter(has=page.locator(f'input[name="finishId"][value="{prefix}-finish"]')).filter(has=page.locator('input[name="targetId"][value="b"]'))
  assert f.count()==1,('missing imbibing',prefix,errors,dialogs,page.locator('#app').inner_text()[:2000])
  f.evaluate('el=>el.closest("details").open=true')
  f.locator('select[name="testSkill"]').select_option('Aura');f.locator('input[name="d100"]').fill(str(die));
  if die==83:
   f.locator('input[name="healingD6"]').fill('2')
   assert f.locator('input[name^="profusionHp_"]').count()==1,'missing prior source HP'
   f.locator('input[name^="profusionHp_"]').fill('3')
  f.locator('input[name="confirmed"]').check();f.locator('button[type="submit"]').click();page.wait_for_timeout(180)
  assert not errors and not dialogs,('imbibing failure',prefix,errors,dialogs)
  saved=reload();uses=[x['calendarAlchemyImbibing'] for x in saved['journal'] if x.get('calendarAlchemyImbibing')]
  assert uses[-1]['sl']==('S' if die==42 else 'CF'),('wrong SL',uses)
  if die==83:
   assert uses[-1]['otherActiveElixirs']==1 and uses[-1]['profusionCF'] is True,uses[-1]
   assert len([x for x in saved['journal'] if x.get('calendarAlchemyDarkvisionProfusionIll')])==1,'old dose Ill Effect absent'
   assert len([x for x in saved['journal'] if x.get('calendarAlchemyDarkvisionHealingStart')])==2,'separate healing starts absent'
   assert len([x for x in saved['journal'] if x.get('calendarAlchemyVialEmpty')])==2,'old physical vial not empty'
   assert saved['campaignClock']['minute']==fixture['minute'],'time modified'
  print(f'PASS Chromium 424: {prefix} roll {die}, persisted SL={uses[-1]["sl"]}, concurrent Ill Effects')
 browser.close()
