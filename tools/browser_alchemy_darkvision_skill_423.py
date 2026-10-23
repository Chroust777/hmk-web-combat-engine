"""Real Chromium: Darkvision imbibing, physical vial, persistent monthly Decay."""
from pathlib import Path
import re,subprocess,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
old=(root/'tools/browser_alchemy_decay_417.py').read_text()
node=re.search(r"node=r'''\n(.*?)\n'''",old,re.S).group(1)
node=node.replace("elixirName:'Healing'","elixirName:'Darkvision'")
node=node.replace('gmModifier:15','gmModifier:-15').replace('gmModifiers:[15]','gmModifiers:[-15]')
fixture=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
minute=fixture['finished']
item={'id':'vial1','characterId':'a','sourceItemId':'hmk:gear:hmk-p121-075','quantity':1,'slot':'carried',
 'snapshot':{'id':'hmk:gear:hmk-p121-075','name':'Vial, 4 oz, 2″ × 5″','category':'other','properties':{'weightLb':0.25,'pricePence':4}}}
def make_data():
 return {'schemaVersion':1,'characters':[
  {'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,
   'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}},
  {'id':'b','name':'Recipient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'skills':[]}}],
  'items':[],'inventory':[item],'trash':[],'journal':fixture['rows'],
  'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Darkvision','characterIds':['a','b'],'anchors':[],
   'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':minute,'reason':'GM completed preparation'}]}}
def new_page(browser,data):
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(120)
 assert 'v93.437' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:650])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(80)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
 return page,errors,dialogs
def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=new_page(browser,make_data())
 f=page.locator('[data-alchemy-vial-bind]');assert f.count()==1,('binding',errors,dialogs)
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('select[name="vialId"]').select_option('vial1');f.locator('input[name="confirmed"]').check()
 f.locator('input[name="liquidConfirmed"]').check();f.locator('input[name="corkConfirmed"]').check();f.locator('select[name="material"]').select_option('glass')
 f.locator('button[type="submit"]').click();page.wait_for_timeout(110)
 f=page.locator('[data-alchemy-darkvision]').filter(has=page.locator('input[name="targetId"][value="b"]'))
 assert f.count()==1,(errors,dialogs)
 f.evaluate('el=>el.closest("details").open=true');f.locator('select[name="testSkill"]').select_option('Aura')
 f.locator('input[name="d100"]').fill('85');f.locator('input[name="healingD6"]').fill('1');f.locator('input[name="confirmed"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(150)
 assert not errors and not dialogs,(errors,dialogs)
 used=saved(page);proof=[j['calendarAlchemyImbibing'] for j in used['journal'] if j.get('calendarAlchemyImbibing')]
 assert len(proof)==1 and proof[0]['sl']=='CF',proof
 page.locator('[data-nav="skills"]').first.click();page.wait_for_timeout(140)
 assert page.locator('#skill-secondary-form').count()==1,('skill form missing',errors,dialogs,page.locator('#app').inner_text()[-600:])
 if page.locator('[data-skill-actor]').count():page.locator('[data-skill-actor]').first.select_option('b');page.wait_for_timeout(120)
 f=page.locator('#skill-secondary-form');f.locator('[name="primary"]').select_option('Perception');page.wait_for_timeout(100)
 assert 'Darkvision' in f.inner_text(),f.inner_text()[-500:]
 f.locator('input[name="rollA"]').fill('51')
 # Without GM optical classification, no test or evidence is allowed.
 before=len(saved(page)['journal']);f.locator('button[type="submit"]').first.click();page.wait_for_timeout(90)
 assert len(saved(page)['journal'])==before,'Unclassified vision test saved'
 assert 'Darkvision' in page.locator('#hsk-result-secondary').inner_text() or 'Darkvision' in f.inner_text(),('no classification error',errors,dialogs)
 f.locator('[name="darkvisionSenseA"]').evaluate('el=>el.closest("details").open=true')
 f.locator('[name="darkvisionSenseA"]').select_option('sight')
 f.locator('[name="darkvisionLightA"]').select_option('bright');page.wait_for_timeout(70)
 assert 'Darkvision' in f.locator('[data-auto-preview="a"]').inner_text()
 f.locator('button[type="submit"]').first.click();page.wait_for_timeout(135)
 assert not errors and not dialogs,(errors,dialogs)
 recorded=[j['skillTestProof'] for j in saved(page)['journal'] if j.get('skillTestProof') and j.get('skillTestProof',{}).get('darkvisionA')]
 assert len(recorded)==1,('Skill proof missing',errors,dialogs)
 vis=recorded[0]['darkvisionA'];assert vis['modifier']==-proof[0]['illEffect']['penalty'] and vis['light']=='bright',vis
 assert recorded[0]['a']['gmModifier']<=vis['modifier'],'Darkvision penalty absent from EML'
 print('PASS Chromium 423: missing optical context blocked, bright CF EML penalty committed with source provenance')
 # Non-sight activity should not get any penalty, but should still cite active source.
 f=page.locator('#skill-secondary-form');f.locator('[name="darkvisionSenseA"]').evaluate('el=>el.closest("details").open=true');f.locator('[name="darkvisionSenseA"]').select_option('non-sight');page.wait_for_timeout(70)
 f.locator('button[type="submit"]').first.click();page.wait_for_timeout(110)
 saved_proofs=[j['skillTestProof'] for j in saved(page)['journal'] if j.get('skillTestProof') and j.get('skillTestProof',{}).get('darkvisionA')]
 assert len(saved_proofs)==2 and saved_proofs[-1]['darkvisionA']['modifier']==0,saved_proofs
 print('PASS Chromium 423: non-sight tests exempt from Darkvision CF vision penalty')
 # Explicit darkness with target beyond range must NOT generate a roll.
 f.locator('[name="darkvisionSenseA"]').evaluate('el=>el.closest("details").open=true')
 f.locator('[name="darkvisionSenseA"]').select_option('sight');f.locator('[name="darkvisionLightA"]').select_option('pitch-black')
 f.locator('[name="darkvisionDistanceA"]').fill('1000');page.wait_for_timeout(50)
 count=len(saved(page)['journal']);f.locator('button[type="submit"]').first.click();page.wait_for_timeout(75)
 assert len(saved(page)['journal'])==count,'Out of range sight test saved'
 print('PASS Chromium 423: pitch-black sight outside current AS range blocked')
 assert saved(page)['campaignClock']['minute']==minute,'Workbench advanced GM time'
 # Heal the very same CF through the original calendar mechanism, then replay
 # the Workbench in a fresh browser document and check the penalty disappears.
 old=saved(page);old['campaignClock']['minute']=minute+1440
 old['campaignClock']['events'].append({'id':'gm-heal-time','type':'advance','minute':minute+1440,'reason':'GM arrived at due Healing Period'})
 page.close();page,errors,dialogs=new_page(browser,old)
 f=page.locator('[data-darkvision-healing-roll]');assert f.count()==1,('healing roll unavailable',errors,dialogs)
 f.evaluate('el=>el.closest("details").open=true');f.locator('input[name="d100"]').fill('42')
 f.locator('input[name="confirmed"]').check();f.locator('button[type="submit"]').click();page.wait_for_timeout(140)
 assert not errors and not dialogs,('healing failure',errors,dialogs)
 healed=[j['calendarAlchemyDarkvisionHealingRoll'] for j in saved(page)['journal'] if j.get('calendarAlchemyDarkvisionHealingRoll')]
 assert len(healed)==1 and healed[0]['recovered'],healed
 page.locator('[data-nav="skills"]').first.click();page.wait_for_timeout(110)
 if page.locator('[data-skill-actor]').count():page.locator('[data-skill-actor]').first.select_option('b');page.wait_for_timeout(110)
 f=page.locator('#skill-secondary-form');f.locator('[name="primary"]').select_option('Perception')
 f.locator('[name="darkvisionSenseA"]').evaluate('el=>el.closest("details").open=true')
 f.locator('[name="darkvisionSenseA"]').select_option('sight');f.locator('[name="darkvisionLightA"]').select_option('bright')
 f.locator('[name="rollA"]').fill('51');f.locator('button[type="submit"]').first.click();page.wait_for_timeout(125)
 assert not errors and not dialogs,(errors,dialogs)
 after=[j['skillTestProof'] for j in saved(page)['journal'] if j.get('skillTestProof',{}).get('darkvisionA')]
 assert after[-1]['darkvisionA']['modifier']==0 and after[-1]['darkvisionA']['illEffectIds']==[],after[-1]
 assert saved(page)['campaignClock']['minute']==minute+1440,'Skill Workbench advanced campaign clock'
 print('PASS Chromium 423: real Healing HR6 clears CF vision penalty in subsequent Skill Workbench test')
 browser.close()
