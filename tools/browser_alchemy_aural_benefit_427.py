"""Real Chromium, v93.427: consume Physic against an active Darkvision with no independent clock."""
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
 assert 'v93.427' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:650])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(100)
 return page,errors,dialogs

def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=new_page(browser,data)
 f=page.locator('[data-alchemy-physic]').filter(has=page.locator('input[name="targetId"][value="B"]'))
 assert f.count()==1,(errors,dialogs)
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('select[name="testSkill"]').select_option('Aura')
 f.locator('input[name="d100"]').fill('85')
 f.locator('input[name="physicHp_dark"]').fill('3')
 f.locator('input[name="confirmed"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(200)
 assert not errors and not dialogs,(errors,dialogs)
 state=saved(page);B=next(x for x in state['characters'] if x['id']=='B')
 assert B['hmk']['arcane']['auralShockLevels']==1
 assert state['campaignClock']['minute']==minute
 # The magic remains, but is not usable until Aural Shock ends.
 page.locator('[data-nav="skills"]').first.click();page.wait_for_timeout(150)
 if page.locator('[data-skill-actor]').count():page.locator('[data-skill-actor]').first.select_option('B');page.wait_for_timeout(120)
 form=page.locator('#skill-secondary-form');assert form.count()==1,(errors,dialogs)
 form.locator('[name="primary"]').select_option('Perception')
 form.locator('[name="rollA"]').fill('41')
 form.locator('[name="darkvisionSenseA"]').evaluate('el=>el.closest("details").open=true')
 form.locator('[name="darkvisionSenseA"]').select_option('sight')
 form.locator('[name="darkvisionLightA"]').select_option('pitch-black')
 form.locator('[name="darkvisionDistanceA"]').fill('5')
 before=len(saved(page)['journal'])
 form.locator('button[type="submit"]').first.click();page.wait_for_timeout(100)
 assert len(saved(page)['journal'])==before,'Aural-shocked Darkvision improperly granted sight in darkness'
 assert any('Aural Shock' in d for d in dialogs) or 'Aural Shock' in page.locator('#hsk-result-secondary').inner_text(),(dialogs,errors)
 dialogs.clear()
 # CF light sensitivity must remain an adverse modifier while vision is suppressed.
 form.locator('[name="darkvisionLightA"]').select_option('bright')
 form.locator('button[type="submit"]').first.click();page.wait_for_timeout(150)
 assert not errors and not dialogs,(errors,dialogs)
 stored=saved(page);proofs=[j['skillTestProof'] for j in stored['journal'] if j.get('skillTestProof',{}).get('darkvisionA')]
 assert len(proofs)==1,proofs
 v=proofs[0]['darkvisionA']
 assert v['suspendedByAuralShock'] and v['auralShockLevels']==1 and v['rangeFeet']==0,v
 assert v['activeUseIds']==[] and v['suspendedUseIds']==['dark'] and v['modifier']<0,v
 assert stored['campaignClock']['minute']==minute,'GM clock mutated'
 print('PASS Chromium 427: Aural Shock suppresses Darkvision benefit, not CF Ill Effect; audit and GM time intact')
 # Read the same saved event after the existing Aural Shock recovery, not a fabricated edit.
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(110)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
 # Aural Recovery is allowed only at the next confirmed day; use the existing GM timeline proof.
 recoveredFixture=saved(page);recoveredFixture['campaignClock']['minute']=minute+1440
 recoveredFixture['campaignClock']['events'].append({'id':'gm-next-day','type':'advance','minute':minute+1440,'reason':'GM advanced to next calendar day'})
 page.close();page,errors,dialogs=new_page(browser,recoveredFixture)
 page.locator('[data-nav="encounter"]').first.click();page.wait_for_timeout(150)
 page.locator('[data-encounter-character="B"]').check();page.wait_for_timeout(150)
 recovery=page.locator('[data-hmk-calendar-aural-recovery]')
 assert recovery.count()==1,('Aural Recovery missing',errors,dialogs,page.locator('#app').inner_text()[-3000:])
 recovery.locator('select[name="diceOrigin"]').select_option('manual')
 recovery.locator('input[name="die"]').fill('40')
 recovery.locator('button[type="submit"]').click();page.wait_for_timeout(220)
 assert not errors and not dialogs,(errors,dialogs)
 done=saved(page);actor=next(x for x in done['characters'] if x['id']=='B')
 assert actor['hmk']['arcane']['auralShockLevels']==0,actor['hmk']['arcane']
 assert actor['hmk']['combatState']['fatigue']['otherWeakness']==0
 assert done['campaignClock']['minute']==minute+1440,'recovery advanced GM time'
 assert any(e.get('type')=='hmk-aural-shock-recovery' for e in actor['hmk']['combatState']['events'])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(140)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
 page_text=page.locator('#app').text_content()
 assert 'Darkvision AS 2' in page_text and '10 ft' in page_text and 'pozastaven' not in page_text.split('Darkvision AS 2')[1][:160],page_text[page_text.find('Darkvision AS 2')-100:page_text.find('Darkvision AS 2')+350]
 assert any(j.get('combatProof',{}).get('actionKind')=='aural-shock-recovery' for j in done['journal']), 'recovery proof missing'
 # Source and earlier Skill Workbench evidence stay immutable after recovery.
 historical=[j['skillTestProof']['darkvisionA'] for j in done['journal'] if j.get('skillTestProof',{}).get('darkvisionA')]
 assert len(historical)==1 and historical[0]['suspendedByAuralShock'] is True and historical[0]['rangeFeet']==0
 print('PASS Chromium 427: real existing Will Recovery returns Darkvision vision at reduced AS; earlier blocked test remains auditable')
 browser.close()
