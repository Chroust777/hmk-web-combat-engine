"""Real local Chromium checks transport GM UI and independent calendar authoring."""
from pathlib import Path
import json,traceback
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]; raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8')
prefix='(()=>{const MOD=';modules,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);mod=modules['app.js']
mod+='''
window.__auditSeed755=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),health=require('./src/integration/persistent-combat-state.js');
 const guide={id:'pc-guide',name:'Aktivní průvodce',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{id:'s755',name:'Survival',ml:70},{id:'e755',name:'Endurance',ml:60},{id:'a755',name:'Animalcraft',ml:55}],healthState:health.initialCombatState()}};
 const patient={id:'pc-patient',name:'Bezvědomý pacient',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[],healthState:health.initialCombatState()}};
 patient.hmk.healthState.shock='UNC';
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Transport 755',eventId:'seed755',gmConfirmed:true,campaignId:'audit755',characterIds:[guide.id,patient.id]});
 data=clean();data.characters=[guide,patient];data.inventory=[];data.campaignClock=clock;data.journal=[];
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__auditState755=()=>({minute:data.campaignClock.minute,history:data.journal.length,combat:JSON.stringify(data.combatRuntime||{}),
 patientState:JSON.stringify(persistentStateOf(character('pc-patient'))),entries:data.journal.map(j=>({episode:!!j.calendarTimeEpisode,weather:!!j.calendarTrekDayWeather,reason:Object.keys(j).filter(k=>k.endsWith('Proof')||k.startsWith('calendar'))})),form:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblem});
window.__auditMarkTransport755=()=>episodeMarkField(document.querySelector('#hmk-time-episode-form'),'transportedMemberIds',{focus:true});
window.__auditFresh755=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';timeEpisodeDraft={...episodeFreshDraft()};episodeEvaluationRequested=false;render();};
'''
modules['app.js']=mod; bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':960});errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(print('DIALOG',d.message[:200],flush=True),d.accept()))
 page.set_content('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__auditSeed755()')
 form=page.locator('#hmk-time-episode-form'); assert form.count(), 'Travel form failed to load'
 before=page.evaluate('window.__auditState755()')
 print('seed ready',before['minute'],len(errs),flush=True)
 # Deliberately select the unconscious patient in foot travel, observe that rule cannot silently pass.
 form.locator('[name="memberIds"][value="pc-patient"]').check()
 form.locator('[name="conveyance"]').select_option('foot')
 form.locator('[data-episode-evaluate]').click()
 print('FOOT ERROR',form.get_attribute('data-episode-problem'),flush=True)
 # Switch to cart: only the actual, selected, nonambulatory patient becomes a required checkbox.
 form.locator('[name="conveyance"]').select_option('cart')
 patient=form.locator('[name="transportedMemberIds"][value="pc-patient"]')
 container=patient.locator('xpath=ancestor::label[1]')
 assert container.is_visible(),'Actual patient GM declaration not shown for cart'
 assert not patient.is_checked(), 'Transport not permitted to auto-confirm'
 healthy=form.locator('[name="transportedMemberIds"][value="pc-guide"]')
 assert not healthy.is_visible(),'Healthy guide cannot be misclassified as a transported patient'
 form.locator('[data-episode-evaluate]').click()
 print('CART ERROR',form.get_attribute('data-episode-problem'), 'FIELD',form.get_attribute('data-episode-problem-field'),flush=True)
 jump=page.locator('[data-episode-jump="transportedMemberIds"]')
 if jump.count():
  jump.first.click()
 else:
  # Other mandatory dice/Survival evidence precede transport. Independently
  # invoke the actual field navigator against the rendered DOM, not fake CSS.
  assert page.evaluate('window.__auditMarkTransport755()'),'Actual transport jump cannot locate required patient'
 assert 'hc-episode-needs-input' in (container.get_attribute('class') or ''),'Red marker misses patient declaration'
 print('PASS visible patient red navigation (isolated UI helper)',flush=True)
 patient.check()
 assert page.evaluate('window.__auditState755()')['minute']==before['minute'],'Changing transport mode changed clock without GM confirmation'
 assert page.evaluate('window.__auditState755()')['history']==before['history'],'Draft wrote campaign history'
 # Physical cart must not force the patient to roll END as if walking.
 panel=page.locator('[data-episode-end-person="pc-patient"]')
 print('PATIENT END',panel.is_visible(),[(x.get_attribute('disabled')) for x in panel.locator('input,button').all()],flush=True)
 assert not panel.is_visible() and all(x.get_attribute('disabled') is not None for x in panel.locator('input,button').all()),'Transported patient END d10 still available'
 patient.uncheck()
 assert not patient.is_checked() and panel.get_attribute('hidden') is None and all(x.get_attribute('disabled') is None for x in panel.locator('input,button').all()),'After unchecking GM transport, real END controls must become accessible'
 patient.check()
 assert not panel.is_visible() and all(x.get_attribute('disabled') is not None for x in panel.locator('input,button').all()),'Restoring GM transport must suppress both END controls'
 assert not errs,'Browser errors '+str(errs)
 page.screenshot(path=str(root/'docs/AUDIT_v93.755_transport_GM_UI.png'),full_page=True)
 print('PASS Chromium transport UI/no premature commit/no phantom END/no page errors',flush=True)
 # Now verify a different activity with only the healthy actor, not a phantom
 # requirement that every member of the campaign must accompany them.
 page.evaluate('window.__auditFresh755()')
 form=page.locator('#hmk-time-episode-form')
 form.locator('[name="kind"]').select_option('other')
 form.locator('[name="minutes"]').fill('5')
 form.locator('[name="area"]').fill('Testovací tábor')
 form.locator('[name="weatherSafeShelter"]').check()
 for pentry in form.locator('[name="memberIds"]').all():
  if pentry.get_attribute('value')=='pc-guide':
   if not pentry.is_checked():pentry.check()
  elif pentry.is_checked():pentry.uncheck()
 assert form.locator('[name="memberIds"]:checked').evaluate_all('(xs)=>xs.map(x=>x.value)')==['pc-guide']
 form.locator('[data-episode-evaluate]').click(timeout=12000)
 for i in range(15):
  final=page.locator('[data-episode-finalize]')
  if final.is_enabled():break
  f=form.get_attribute('data-episode-problem-field') or ''
  error=form.get_attribute('data-episode-problem') or ''
  print('OTHER',i,repr(f),error[:170],page.locator('[data-episode-checklist]').inner_text()[-700:] if page.locator('[data-episode-checklist]').count() else page.locator('body').inner_text()[-500:],flush=True)
  if f=='confirmed' or (not f and 'Potvrzení GM' in page.locator('[data-episode-checklist]').inner_text()):
   form.locator('[name="confirmed"]').check();continue
  raise AssertionError('Independent other blocked: '+repr((f,error[:220])))
 assert page.locator('[data-episode-finalize]').is_enabled()
 pre=page.evaluate('window.__auditState755()')
 page.locator('[data-episode-finalize]').click(timeout=12000)
 after=page.evaluate('window.__auditState755()')
 print('AFTER OTHER',pre['minute'],after['minute'],pre['history'],after['history'],after['entries'],flush=True)
 assert after['minute']==pre['minute']+5 and sum(x['episode'] for x in after['entries'])==sum(x['episode'] for x in pre['entries'])+1
 assert after['patientState']==pre['patientState']
 assert after['combat']==pre['combat']
 assert not errs,errs
 print('PASS Chromium other independent actor GM commit, exactly five minutes, patient unchanged and no Combat',flush=True)
 b.close()
