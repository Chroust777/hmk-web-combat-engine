"""Real Chromium: v93.432 mixed Footpad critical failures and single atomic commit."""
from pathlib import Path
import re, subprocess, json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
old=(root/'tools/test_alchemy_profusion_424.cjs').read_text()
node=old[:old.index("const a=make('alpha'")].replace("require('../src/","require('./src/")
node=node.replace("function make(suffix,actor='A',c='C'){", "function make(suffix,actor='A',c='C',kind='Darkvision'){")
node=node.replace("elixirName:'Darkvision'", "elixirName:kind")
node+="\nconst a=make('alpha','a','C',process.argv[1]),b=make('bravo','d','C',process.argv[2]);console.log(JSON.stringify({rows:[...a.j,...b.j],vials:[a.vial,b.vial],minute:a.minute}));"
def fixture(older,newer):
 f=json.loads(subprocess.check_output(['node','-e',node,older,newer],cwd=root,text=True))
 return {'schemaVersion':1,'characters':[
  {'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}},
  {'id':'b','name':'Recipient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'skills':[]}},
  {'id':'d','name':'Other Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80}]}}],
  'items':[],'inventory':[{**v,'snapshot':{**v['snapshot'],'category':'other'}} for v in f['vials']],'trash':[],
  'journal':[{**r,'createdAt':'2026-10-22T00:00:00Z'} for r in sorted(f['rows'],key=lambda x:x['campaignMinute'])],
  'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':f['minute'],'label':'Footpad mixed CF','characterIds':['a','b','d'],'anchors':[],
   'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':f['minute'],'reason':'GM preparation completed'}]}}
def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
def submit(page,name,finish,die,hp=None):
 f=page.locator('[data-alchemy-'+name.lower()+']').filter(has=page.locator(f'input[name="finishId"][value="{finish}"]')).filter(has=page.locator('input[name="targetId"][value="b"]'))
 assert f.count()==1,('missing imbibing form',name,finish)
 f.evaluate('el=>el.closest("details").open=true');f.locator('select[name="testSkill"]').select_option('Aura')
 f.locator('input[name="d100"]').fill(str(die))
 if name=='Darkvision' and die in (83,85):f.locator('input[name="healingD6"]').fill('2')
 if hp is not None:
  prefix={'Footpad':'footpadHp_','Darkvision':'profusionHp_','Erudition':'eruditionHp_','Physic':'physicHp_'}[name]
  el=f.locator('input[name^="'+prefix+'"]');assert el.count()==1,('mandatory Darkvision HP missing',name,el.count())
  if hp>0:el.fill(str(hp))
 f.locator('input[name="confirmed"]').check();f.locator('button[type="submit"]').click();page.wait_for_timeout(180)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for older,newer,die in [('Footpad','Darkvision',83),('Footpad','Erudition',83),('Footpad','Physic',85),('Darkvision','Footpad',83),('Erudition','Footpad',83),('Footpad','Footpad',83)]:
  original=fixture(older,newer)
  page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
  page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',original)
  page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(120)
  assert 'v93.432' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:300])
  page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
  if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(100)
  submit(page,older,'alpha-finish',42)
  assert not errors and not dialogs,('older',older,dialogs,errors)
  before=saved(page);assert len([j for j in before['journal'] if j.get('calendarAlchemyImbibing')])==1
  if older=='Darkvision':
   submit(page,newer,'bravo-finish',die,hp=0)
   assert dialogs and ('d6' in dialogs[-1] or 'HP' in dialogs[-1]),('missing HP not rejected',dialogs)
   current=saved(page)
   assert len([j for j in current['journal'] if j.get('calendarAlchemyImbibing')])==1,'partial second use'
   assert len([j for j in current['journal'] if j.get('calendarAlchemyVialEmpty')])==1,'partially emptied vial'
   dialogs.clear()
  submit(page,newer,'bravo-finish',die,hp=3 if older=='Darkvision' else None)
  assert not dialogs and not errors,('new CF',older,newer,dialogs,errors)
  result=saved(page);uses=[j for j in result['journal'] if j.get('calendarAlchemyImbibing')]
  assert len(uses)==2 and uses[-1]['calendarAlchemyImbibing']['sl']=='CF',(older,newer,uses)
  assert len([j for j in result['journal'] if j.get('calendarAlchemyVialEmpty')])==2,'both real vials required'
  assert len(result['inventory'])==2,'vials must remain'
  footproof=[j for j in result['journal'] if j.get('calendarAlchemyFootpadProfusionIll')]
  if older=='Footpad':
   assert len(footproof)==1,(older,newer,footproof,dialogs)
   assert footproof[0]['calendarAlchemyFootpadProfusionIll']['sourceUseId']==uses[0]['id'],'source mismatch'
  else: assert not footproof,'no pre-existing Footpad'
  if older=='Darkvision':
   assert len([j for j in result['journal'] if j.get('calendarAlchemyDarkvisionProfusionIll')])==1,'missing Darkvision secondary'
   assert len([j for j in result['journal'] if j.get('calendarAlchemyDarkvisionHealingStart')])==1,'missing mandatory HP d6'
  target=next(x for x in result['characters'] if x['id']=='b')
  levels=2 if (newer=='Footpad' and older in ('Erudition','Footpad')) or (newer in ('Physic','Erudition') and older=='Footpad') else 1
  assert target['hmk']['arcane']['auralShockLevels']==levels,(older,newer,levels,target['hmk'].get('arcane'))
  assert target['hmk']['combatState']['fatigue']['otherWeakness']==levels*5,(older,newer,target['hmk']['combatState'])
  assert result['campaignClock']['minute']==original['campaignClock']['minute'],'GM time changed'
  # Reopen saved campaign in a fresh Chrome page; immutable secondary receipts must replay.
  if older=='Footpad' and newer=='Erudition':
   reload=browser.new_page(viewport={'width':1280,'height':900});reload_errors=[]
   reload.on('pageerror',lambda e:reload_errors.append(str(e)))
   reload.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
   reload.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',result)
   reload.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());reload.wait_for_timeout(120)
   assert not reload_errors and 'v93.432' in reload.locator('#app').inner_text(),('reloaded',reload_errors)
   assert len(saved(reload)['journal'])==len(result['journal']),'reload altered permanent evidence'
   reload.close()
  print('PASS Chromium Footpad mixed CF',older,'→',newer,'Aural +'+str(levels),flush=True)
  page.close()
 browser.close()
