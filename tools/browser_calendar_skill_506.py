from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];raw=(root/'hmk-app.bundle.js').read_text();mark='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(mark):])
mods['app.js']+='''
window.__goCalendar506=()=>{view='calendar';calendarLanding=false;activeCalendarSection='overview';calendarUI={mode:'month',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};render();};
window.__seed506skill=()=>{
 const attrs={str:12,end:12,dex:12,agl:12,per:12,cml:12,aur:12,wil:12,rea:12,cre:12,emp:12,elo:12};
 const ch={id:'a506skill',name:'Karel',kind:'PC',occupation:'Hunter',hmk:{attributes:attrs,skills:[{id:'awareness-test',name:'Awareness',ml:45}],combatState:require('./src/integration/persistent-combat-state.js').initialCombatState(),expedition:{claims:{}}}};
 data=clean();data.characters=[ch];
 const clock=require('./src/integration/hmk-campaign-calendar.js').createCampaignCalendar({day:1,hour:8,minute:0,label:'Test',eventId:'init506',gmConfirmed:true,campaignId:'c506skill',characterIds:[ch.id]});
 data.campaignClock=clock;view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='overview';provisionScope='person';provisionGuideActorId=ch.id;storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'month',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};
 const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
'''
bundle=mark+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1700,'height':970});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept('Test' if d.type=='prompt' else None)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for style in ['styles.css','book-templates.css','skill-workbench.css']:page.add_style_tag(content=(root/style).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed506skill()')
 assert '08:00' in page.locator('.hc-clock-heading').inner_text()
 top=page.locator('.hc-calendar-tabs').bounding_box()['y'];assert page.locator('.hc-clock-heading').count()==1
 plan=page.locator('#campaign-plan-form')
 print('form?',plan.count(),'options actor',plan.locator('select[name=characterId] option').all_text_contents())
 plan.locator('select[name=characterId]').select_option('a506skill')
 plan.locator('select[name=destination]').select_option('skills')
 print('skills',plan.locator('select[name=skill] option').all_text_contents()[:8])
 assert 'Awareness' in plan.locator('select[name=skill]').inner_text()
 plan.locator('select[name=skill]').select_option('Awareness')
 plan.locator('[name=title]').fill('Povinný test Awareness')
 plan.locator('[name=requiresAction]').check()
 plan.locator('[name=gmConfirmed]').check()
 plan.locator('button[type=submit]').click()
 page.wait_for_timeout(150)
 state=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 print('plans',state['campaignClock'].get('plans'), 'dialogs',dialogs,'errors',errors, 'inputs',plan.locator('input').evaluate_all('(els)=>els.map(e=>[e.name,e.value,e.validity.valid])'))
 assert state['campaignClock']['plans'][0]['skill']=='Awareness',(state['campaignClock'].get('plans'),dialogs,errors)
 page.locator('.hc-calendar-tabs [data-calendar-section=overview]').click()
 assert abs(page.locator('.hc-calendar-tabs').bounding_box()['y']-top)<3,'calendar navigation moved'
 print('preclick',page.locator('[data-cal-skill]').count())
 plan_id=state['campaignClock']['plans'][0]['id']
 page.locator('[data-cal-resolve="'+plan_id+'"]').first.click();page.wait_for_timeout(80)
 before=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 assert not before['campaignClock'].get('planResolutions'),(dialogs,before['campaignClock'])
 assert any('Skill Test ještě není doložen' in x for x in dialogs),dialogs
 link=page.locator('[data-cal-skill="Awareness"]').first
 print('link',link.get_attribute('data-cal-kind'),link.get_attribute('data-cal-plan'))
 link.click();page.wait_for_timeout(120)
 form=page.locator('#skill-secondary-form');print('skill form',form.count(), 'value', form.locator('[name=primary]').input_value() if form.count() else '')
 assert form.count()==1
 assert form.locator('[name=primary]').input_value()=='Awareness'
 # Before a saved skill test, the GM event must not be allowed to become complete.
 page.evaluate("document.querySelector('#skill-secondary-form [name=rollA]').value='32'")
 # Try normal form submission and inspect authoritative proof.
 print('required',form.locator('input:required').evaluate_all('(els)=>els.map(x=>[x.name,x.value,x.checked])'))
 form.locator('button[type=submit]').first.click();page.wait_for_timeout(220)
 state=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 print('proofs',[(x.get('calendarGMTestPlanId'),x.get('skillTestProof',{}).get('type')) for x in state.get('journal',[]) if x.get('skillTestProof')])
 print('errors',errors,'dialogs',dialogs)
 assert any(j.get('calendarGMTestPlanId')==state['campaignClock']['plans'][0]['id'] for j in state['journal'])
 # After documented test, completion is permitted, no fake roll.
 page.evaluate('window.__goCalendar506()');page.wait_for_timeout(100)
 page.locator('[data-cal-resolve="'+plan_id+'"]').first.click();page.wait_for_timeout(150)
 after=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 assert any(x.get('planId')==plan_id and x.get('kind')=='resolved' for x in after['campaignClock'].get('planResolutions',[])),(dialogs,after['campaignClock'].get('planResolutions'))
 if page.locator('[data-calendar-start]').count():print('calendar landing')
 page.screenshot(path='/mnt/data/HMK_v93.506_skill_test.png',full_page=True)
 print('PASS actual GM Skill Test handoff and evidence')
 b.close()
