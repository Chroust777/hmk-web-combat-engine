"""Real Chromium, v93.430: consume Physic against an active Darkvision with no independent clock."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,subprocess
root=Path(__file__).resolve().parents[1]
source=subprocess.check_output(['node','tools/test_alchemy_physic_425.cjs'],cwd=root,env={**os.environ,'HMK_PHYSIC_FIXTURE':'1'},text=True)
fixture=json.loads(source)
minute=fixture['minute']
characters=[{'id':i,'name':i,'kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},
 'skills':[{'id':'al'+i,'name':'Alchemy','ml':80},{'id':'h'+i,'name':'Herblore','ml':70},{'id':'m'+i,'name':'Mineralogy','ml':65},{'id':'mt'+i,'name':'Mathematics','ml':50}],
 'sunsign':'Ùlándus','wealth':30}} for i in ['A0','A1']]
characters.append({'id':'B','name':'B','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'skills':[]}})
data={'schemaVersion':1,'characters':characters,'items':[],'inventory':fixture['inventory'],'trash':[],'journal':fixture['journal'],
 'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Alchemy Physic',
  'characterIds':[x['id'] for x in characters],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},
   {'id':'advance','type':'advance','minute':minute,'reason':'GM completed preparation'}]}}

def new_page(browser,record):
 page=browser.new_page(viewport={'width':1440,'height':1100});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None)
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',record)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(180)
 assert 'v93.430' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:650])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(100)
 return page,errors,dialogs

def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for roll,expected in [(42,'S'),(84,'F'),(40,'CS')]:
  page,errors,dialogs=new_page(browser,data)
  # Both real containers are already bound in the verified fixture.
  assert page.locator('[data-alchemy-vial-bind]').count()==0,'unexpected missing vial binding'
  f=page.locator('[data-alchemy-physic]').filter(has=page.locator('input[name="targetId"][value="B"]'))
  assert f.count()==1,('physic form missing',page.locator('[data-alchemy-physic]').count(),dialogs,errors,page.locator('#app').inner_text()[-6500:])
  f.evaluate('el=>el.closest("details").open=true')
  f.locator('select[name="testSkill"]').select_option('Aura');f.locator('input[name="d100"]').fill(str(roll))
  f.locator('input[name="confirmed"]').check();f.locator('button[type="submit"]').click();page.wait_for_timeout(250)
  assert not dialogs and not errors,('physic submit failed',dialogs,errors)
  out=saved(page)
  physic=[j['calendarAlchemyImbibing'] for j in out['journal'] if j.get('calendarAlchemyImbibing',{}).get('elixirName')=='Physic']
  assert len(physic)==1 and physic[0]['sl']==expected,('physic receipt',physic)
  assert len(physic[0]['physicEffects'])==1,physic
  assert physic[0]['physicEffects'][0]['asAfter']==max(0,physic[0]['physicEffects'][0]['asBefore']-physic[0]['finalAS'])
  assert len(out['inventory'])==2,'original inventory mutated'
  assert out['campaignClock']['minute']==minute,'GM clock changed'
  assert len([r for r in out['journal'] if r.get('calendarAlchemyVialEmpty')])==2,'physic vial not physically emptied'
  assert not page.locator('[data-alchemy-physic]').count(),'duplicate used Physic offered'
  print('PASS Chromium v93.430:',expected,'Physic, physical vial, AS reduction, immutable receipt, unchanged GM clock')
  page.close()
 # CF now commits its real Aural Shock and Weakness into the existing Combat State.
 page,errors,dialogs=new_page(browser,data)
 before=saved(page)
 f=page.locator('[data-alchemy-physic]').filter(has=page.locator('input[name="targetId"][value="B"]'))
 f.evaluate('el=>el.closest("details").open=true');f.locator('input[name="d100"]').fill('85');f.locator('input[name="confirmed"]').check()
 # CF must NOT consume dose without independent d6 HP for Darkvision.
 f.locator('button[type="submit"]').click();page.wait_for_timeout(130)
 assert dialogs and 'd6' in dialogs[-1],('missing HP accepted',dialogs)
 assert saved(page)==before,'partial CF commit without HP'
 dialogs.clear()
 f.locator('input[name="physicHp_dark"]').fill('3')
 f.locator('button[type="submit"]').click();page.wait_for_timeout(250)
 after=saved(page)
 assert not dialogs and not errors,('CF unexpectedly rejected',dialogs,errors)
 proofrows=[j for j in after['journal'] if j.get('calendarAlchemyImbibing',{}).get('elixirName')=='Physic']
 assert len(proofrows)==1 and proofrows[0]['calendarAlchemyImbibing']['sl']=='CF',proofrows
 assert proofrows[0]['calendarAlchemyImbibing']['illEffect']['levels']==1,proofrows
 target=next(c for c in after['characters'] if c['id']=='B')
 assert target['hmk']['arcane']['auralShockLevels']==1,target['hmk'].get('arcane')
 assert target['hmk']['combatState']['fatigue']['otherWeakness']==5,target['hmk']['combatState']['fatigue']
 assert any(e['id']==proofrows[0]['id'] and e['type']=='hmk-alchemy-physic-aural' for e in target['hmk']['combatState']['events'])
 assert after['campaignClock']['minute']==minute and len(after['inventory'])==2,'clock/inventory mutated'
 assert len([j for j in after['journal'] if j.get('calendarAlchemyVialEmpty')])==2,'missing physical use proof'
 assert len(after['journal'])==len(before['journal'])+4,'atomic CF + Ill Effect + HP receipt missing'
 ill=[j for j in after['journal'] if j.get('calendarAlchemyDarkvisionProfusionIll')]
 hp=[j for j in after['journal'] if j.get('calendarAlchemyDarkvisionHealingStart')]
 assert len(ill)==1 and len(hp)==1,(ill,hp)
 assert ill[0]['calendarAlchemyDarkvisionProfusionIll']['sourceUseId']=='dark'
 assert hp[0]['calendarAlchemyDarkvisionHealingStart']['useId']==ill[0]['id']
 assert hp[0]['calendarAlchemyDarkvisionHealingStart']['hpD6']==3
 # A fresh Chrome document must reconstruct the same immutable combat proof.
 page.close()
 reloaded,reload_errors,reload_dialogs=new_page(browser,after)
 assert not reload_errors and not reload_dialogs,('CF persisted state rejected on load',reload_errors,reload_dialogs)
 restored=saved(reloaded)
 assert restored['characters'][2]['hmk']['arcane']['auralShockLevels']==1
 assert not reloaded.locator('[data-alchemy-physic]').count(),'consumed bottle offered after reload'
 print('PASS Chromium v93.430: Physic CF, Aural Shock 1, Weakness +5, persisted reload, no duplicate')
 reloaded.close();browser.close()
