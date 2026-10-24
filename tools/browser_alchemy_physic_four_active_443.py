"""Physical Physic against 4 active elixirs, CF secondary health, zero partial commit and Chromium reload."""
"""HMK 269: four simultaneously active imbibed sources -> every failing d100 is CF.
Actual Chromium form, missed mandatory secondary die rollback, one atomic commit,
existing health/inventory/calendar, and new-page history rehydration.
"""
from pathlib import Path
import subprocess,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s=(root/'tools/test_alchemy_profusion_424.cjs').read_text()
node=s[:s.index("const a=make('alpha'")].replace("require('../src/","require('./src/")
node=node.replace("function make(suffix,actor='A',c='C'){", "function make(suffix,actor='A',c='C',kind='Darkvision'){")
node=node.replace("elixirName:'Darkvision'", "elixirName:kind")
node+='''
const specs=[['alpha','a','Darkvision'],['bravo','d','Erudition'],['charlie','e','Footpad'],['delta','f','Egosight'],['echo','g','Physic']];
const doses=specs.map(([id,actor,name])=>make(id,actor,'C',name));
console.log(JSON.stringify({specs,rows:doses.flatMap(d=>d.j),vials:doses.map(d=>d.vial),minute:doses[0].minute}));
'''
fx=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
characters=[]
for id in ['a','b','d','e','f','g']:
 characters.append({'id':id,'name':id,'kind':'PC','hmk':{
  'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},
  'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80}]}})
data={'schemaVersion':1,'characters':characters,'items':[],
 'inventory':[{**v,'snapshot':{**v['snapshot'],'category':'other'}} for v in fx['vials']],
 'trash':[],'journal':[{**r,'createdAt':'2026-10-23T00:00:00Z'} for r in sorted(fx['rows'],key=lambda x:x['campaignMinute'])],
 'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':fx['minute'],
 'label':'Four simultaneous Imbibed doses','characterIds':[c['id'] for c in characters],
 'anchors':[], 'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},
 {'id':'advance','type':'advance','minute':fx['minute'],'reason':'Alchemy prep finished'}]}}

def boot(browser,data):
 page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(100)
 assert page.locator('[data-nav="calendar"]').count()>0 and not errors,('boot',errors)
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(90)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
 return page,errors,dialogs

def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
def submit(page,name,finish,die,hp=None):
 f=page.locator('[data-alchemy-'+name.lower()+']').filter(has=page.locator(f'input[name="finishId"][value="{finish}"]')).filter(has=page.locator('input[name="targetId"][value="b"]'))
 assert f.count()==1,('missing form',name,finish,f.count())
 f.evaluate('el=>el.closest("details").open=true');f.locator('select[name="testSkill"]').select_option('Aura')
 f.locator('input[name="d100"]').fill(str(die))
 if hp is not None:
  el=f.locator('input[name^="physicHp_"]')
  assert el.count()==1,('expected one Darkvision Healing d6',el.count())
  if hp>0:el.fill(str(hp))
 f.locator('input[name="confirmed"]').check();f.locator('button[type="submit"]').click();page.wait_for_timeout(200)

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=boot(browser,data)
 for n,(finish,actor,name) in enumerate(fx['specs'][:4],1):
  submit(page,name,finish+'-finish',42)
  assert not errors and not dialogs,('early dose',name,errors,dialogs)
  assert len([r for r in saved(page)['journal'] if r.get('calendarAlchemyImbibing')])==n
 baseline=saved(page)
 assert len([r for r in baseline['journal'] if r.get('calendarAlchemyImbibing')])==4
 submit(page,'Physic','echo-finish',85,hp=0)
 assert dialogs and ('d6' in dialogs[-1] or 'HP' in dialogs[-1]),('missing required d6 not rejected',dialogs,errors)
 assert saved(page)==baseline,'Physic CF missing HP caused partial commit'
 dialogs.clear()
 submit(page,'Physic','echo-finish',85,hp=3)
 assert not errors and not dialogs,('Physic CF rejected',errors,dialogs)
 state=saved(page);uses=[r for r in state['journal'] if r.get('calendarAlchemyImbibing')]
 assert len(uses)==5,uses
 proof=uses[-1]['calendarAlchemyImbibing']
 assert proof['elixirName']=='Physic' and proof['sl']=='CF' and proof['profusionCF'] is False,proof
 assert proof['otherActiveElixirs']==0 and len(proof['physicEffects'])==4,proof
 assert {x['finishId'] for x in proof['physicEffects']}=={f'{id}-finish' for id,_,_ in fx['specs'][:4]}
 assert all(x['asAfter']==max(0,x['asBefore']-proof['finalAS']) for x in proof['physicEffects'])
 assert len([r for r in state['journal'] if r.get('calendarAlchemyVialEmpty')])==5
 assert state['inventory']==baseline['inventory'],'original container inventory was rewritten'
 for key in ['calendarAlchemyDarkvisionProfusionIll','calendarAlchemyEruditionProfusionIll','calendarAlchemyFootpadProfusionIll','calendarAlchemyEgosightProfusionIll']:
  assert len([r for r in state['journal'] if r.get(key)])==1,key
 target=next(c for c in state['characters'] if c['id']=='b')
 assert target['hmk']['arcane']['auralShockLevels']==4,target['hmk']['arcane']
 assert target['hmk']['combatState']['fatigue']['otherWeakness']==20
 assert state['campaignClock']['minute']==baseline['campaignClock']['minute']
 print('PASS Chromium Physic 443: 4 supported active elixirs, all AS reduced, CF 4 Ill Effects, actual bottle, atomic missing d6 rollback',flush=True)
 page.close()
 replay,errors,dialogs=boot(browser,state)
 assert not errors and not dialogs,(errors,dialogs)
 restored=saved(replay)
 assert restored['journal']==state['journal'],'history rewritten on replay'
 assert restored['campaignClock']['minute']==state['campaignClock']['minute']
 assert len([j for j in restored['journal'] if j.get('calendarAlchemyImbibing')])==5
 assert next(c for c in restored['characters'] if c['id']=='b')['hmk']['arcane']['auralShockLevels']==4
 print('PASS Chromium Physic 443: fresh campaign rehydration, immutable history and GM clock',flush=True)
 replay.close();browser.close()
