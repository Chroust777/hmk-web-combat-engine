"""Chromium E2E: Alchemy HMK p268 assistant planning and original SV Workbench proof."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
def actor(char_id,name,alchemy):
 return {'id':char_id,'name':name,'kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':alchemy},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}}
roster=[actor('A','Alchemist',100),actor('B','Half Competent',50),actor('C','Novice',40)]
def fixture(journal=None,minute=0):
 return {'schemaVersion':1,'characters':roster,'items':[],'inventory':[],'trash':[],'journal':journal or [],'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Assistance v420','characterIds':['A','B','C'],'anchors':[], 'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'}]+([{'id':'advance','type':'advance','minute':minute,'reason':'GM advance'}] if minute else [])}}
def launch(page,data):
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(180)
 assert 'v93.425' in page.locator('#app').inner_text(),page.locator('#app').inner_text()[:220]
def get_data(page):return page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append('console '+m.text) if m.type=='error' else None)
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 launch(page,fixture());page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(90)
 forms=page.locator('[data-alchemy-start]:not([data-alchemy-invent]):not([data-alchemy-known])')
 assert forms.count()==1,('start forms',forms.count(),errors,dialogs)
 f=forms.first;f.evaluate('el=>el.closest("details").open=true')
 assert f.locator('[name="alchemyAssist1"]').count()==1
 f.locator('[name="alchemyAssist1"]').select_option('B')
 f.locator('[name="alchemyAssist2"]').select_option('C')
 f.locator('[data-alchemy-roll-time]').click()
 f.locator('[name="workshopConfirmed"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(170)
 assert not errors and not dialogs,('alchemy assistant start failed',errors,dialogs)
 data=get_data(page);starts=[j for j in data['journal'] if j.get('calendarAlchemyStart')];assert len(starts)==1,starts
 start=starts[0]['calendarAlchemyStart']
 assert start['assistantPlan']==[{'actorId':'B','ml':50},{'actorId':'C','ml':40}],start
 assert data['campaignClock']['minute']==0 and not data['inventory']
 print('PASS Chromium planned assistants: real ML 50+40, immutable journal, no clock/inventory mutation')
 # Original Skill Workbench, not a second Alchemy roller.
 page.close();page=browser.new_page(viewport={'width':1440,'height':1050})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 launch(page,fixture(starts,start['dueMinute']))
 # The nav may present the Workbench under Skills.
 navs=page.locator('[data-nav]');names=[(e.get_attribute('data-nav'),e.inner_text()[:60]) for e in navs.all()]
 work=page.locator('[data-nav="skills"]')
 if work.count():work.first.click()
 else:
  targets=page.locator('[data-nav="skill-workbench"],[data-nav="skill"]')
  assert targets.count(),('workbench nav not found',names)
  targets.first.click()
 page.wait_for_timeout(120)
 tabs=page.locator('[data-skill-tab="value"]')
 assert tabs.count(),('value tab not found',names,page.locator('#app').inner_text()[:800])
 tabs.first.click();page.wait_for_timeout(60)
 form=page.locator('#skill-value-form');assert form.count()==1
 form.locator('[name="primary"]').select_option('Alchemy')
 form.locator('[name="srActivityA"]').select_option('alchemy-elixir')
 page.wait_for_timeout(70)
 helper=form.locator('[data-alchemy-sv-helpers]')
 assert not helper.is_hidden(),('SV Alchemy assistance controls hidden',errors,dialogs)
 helper.locator('[name="assist1"]').select_option('B')
 helper.locator('[name="assist2"]').select_option('C')
 form.locator('[name="rollA"]').fill('41')
 form.locator('[name="roll10A"]').fill('9')
 # Use the exact immutable preparation Sunsign modifier, not an assumed principle.
 form.locator('[name="gmModifierA"]').fill(str(start['sunsignModifier']))
 form.locator('button[type="submit"]').click();page.wait_for_timeout(160)
 assert not errors and not dialogs,('workbench assistance submission',errors,dialogs)
 saved=get_data(page);proofs=[j for j in saved['journal'] if j.get('skillTestProof',{}).get('secondaryRollResult',{}).get('routineId')=='alchemy-elixir']
 assert len(proofs)==1,('missing actual workbench proof',errors,dialogs,saved['journal'][-1] if saved['journal'] else '')
 q=proofs[0]['skillTestProof'];assert [h['actorId'] for h in q['helpers']]==['B','C'],q
 assert q['a']['assistance']==5 and q['a']['assistantChecks'][1]['eligible']==False,q['a']
 assert saved['campaignClock']['minute']==start['dueMinute'] and not saved['inventory']
 print('PASS Chromium Skill Workbench SV: real helpers +5 EML, second below half primary ML +0, single original d100 provenance, unchanged GM clock')
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(130)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
 finish=page.locator('[data-alchemy-finish]');assert finish.count()==1,('finish form not found',errors,dialogs,finish.count(),page.locator('[data-alchemy-start]').count(),page.locator('#app').inner_text().find('Alchemy · Create'),page.locator('#app').inner_text()[-600:],[(x.get('calendarAlchemyStart',{}).get('dueMinute'),x.get('campaignMinute')) for x in saved['journal'] if x.get('calendarAlchemyStart')],[(x.get('skillTestProof',{}).get('type'),x.get('skillTestProof',{}).get('skills'),x.get('skillTestProof',{}).get('secondarySkills'),x.get('skillTestProof',{}).get('gmModifiers'),x.get('characterId'),x.get('calendarCampaignId'),x.get('campaignMinute')) for x in saved['journal'] if x.get('skillTestProof')],start['sunsignModifier'])
 finish.evaluate('el=>el.closest("details").open=true')
 for inp in finish.locator('input[name^="aug"]').all():inp.fill('1')
 finish.locator('[name="gmContinuityConfirmed"]').check()
 finish.locator('button[type="submit"]').click();page.wait_for_timeout(180)
 assert not errors and not dialogs,('alchemy assisted finish',errors,dialogs)
 saved=get_data(page);completed=[x['calendarAlchemyFinish'] for x in saved['journal'] if x.get('calendarAlchemyFinish')]
 assert len(completed)==1,('finish not stored',completed,dialogs)
 assert completed[0]['assistantPlan']==[{'actorId':'B','ml':50},{'actorId':'C','ml':40}],completed[0]
 assert completed[0]['assistanceBonus']==5,completed[0]
 assert saved['campaignClock']['minute']==start['dueMinute'] and not saved['inventory']
 print('PASS Chromium assisted finish: single original workbench roll, +5 EML assistant proof, unchanged GM time/inventory')
 browser.close()
