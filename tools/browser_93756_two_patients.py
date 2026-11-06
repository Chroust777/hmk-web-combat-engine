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
 // Isolated GM-documented old immobility, no invented test during this episode.
 patient.hmk.healthState.wounds.push({id:'wagon-immobile-755',location:'th',severity:'G',level:4,aspect:'b',bleeding:false,nextAdvanceRound:null,
 healing:{treated:true,healingRate:4,nextHealingDay:5,infectionPossible:false}});
 synchronizeCombatInjuries(patient,patient.hmk.healthState);
 const patient2={id:'pc-patient2',name:'Druhý nepohyblivý pacient',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[],healthState:health.initialCombatState()}};
 patient2.hmk.healthState.wounds.push({id:'wagon-immobile-2-756',location:'th',severity:'G',level:4,aspect:'b',bleeding:false,nextAdvanceRound:null,
 healing:{treated:true,healingRate:4,nextHealingDay:5,infectionPossible:false}});
 synchronizeCombatInjuries(patient2,patient2.hmk.healthState);
 // Real stable-owned cart, with GM-acquired horse and one harness.
 guide.hmk.livestock=[{id:'stable-horse-756',name:'Cart horse',ownerId:guide.id,campaignId:'audit755',beastId:'hmk-p122-beast-10',minute:450,mode:'free',priceD:180,maxMB:1,transactionId:'tx-horse-756'}];
 const stableEvents=[
  {id:'acquire-756',body:'GM-confirmed free horse acquisition',createdAt:'2026-11-06T08:00:00Z',characterId:guide.id,calendarCampaignId:'audit755',campaignMinute:450,
   livestockAcquisition:{animalId:'stable-horse-756',ownerId:guide.id,beastId:'hmk-p122-beast-10',name:'Cart horse',priceD:180,mode:'free',transactionId:'tx-horse-756'}},
  {id:'vehicle-756',body:'GM-confirmed cart possession',createdAt:'2026-11-06T08:00:00Z',characterId:guide.id,calendarCampaignId:'audit755',campaignMinute:455,
   stableHub574:{format:'hmk-stable-hub-574',type:'vehicle-add',animalId:'stable-horse-756',ownerId:guide.id,entryId:'cart-756',itemId:'hmk-p122-tack-03',weightLb:200,priceD:84,mode:'gift',transactionId:'tx-cart-gift-756',reason:'GM documented cart possession'}},
  {id:'harness-756',body:'GM-confirmed harness possession',createdAt:'2026-11-06T08:00:00Z',characterId:guide.id,calendarCampaignId:'audit755',campaignMinute:456,
   stableHub574:{format:'hmk-stable-hub-574',type:'tack-add',animalId:'stable-horse-756',ownerId:guide.id,entryId:'harness-756',itemId:'hmk-p122-tack-05',weightLb:8,priceD:20,mode:'gift',transactionId:'tx-harness-gift-756',reason:'GM documented harness possession'}}];
 let clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Transport 755',eventId:'seed755',gmConfirmed:true,campaignId:'audit755',characterIds:[guide.id,patient.id,patient2.id]});
 clock=C.anchorCampaignOrigin(clock,{kind:'wound',characterId:'pc-patient',woundId:'wagon-immobile-755',eventId:'documented-wound-755',gmConfirmed:true});
 clock=C.anchorCampaignOrigin(clock,{kind:'wound',characterId:'pc-patient2',woundId:'wagon-immobile-2-756',eventId:'documented-wound-2-756',gmConfirmed:true});
 data=clean();data.characters=[guide,patient,patient2];data.inventory=[];data.campaignClock=clock;data.journal=stableEvents;
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__auditState755=()=>({minute:data.campaignClock.minute,history:data.journal.length,combat:JSON.stringify(data.combatRuntime||{}),
 patientState:JSON.stringify(persistentStateOf(character('pc-patient'))),patient2State:JSON.stringify(persistentStateOf(character('pc-patient2'))),entries:data.journal.map(j=>({episode:!!j.calendarTimeEpisode,weather:!!j.calendarTrekDayWeather,reason:Object.keys(j).filter(k=>k.endsWith('Proof')||k.startsWith('calendar'))})),form:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblem});
window.__auditMarkTransport755=()=>episodeMarkField(document.querySelector('#hmk-time-episode-form'),'transportedMemberIds',{focus:true});
window.__auditFresh755=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';timeEpisodeDraft={...episodeFreshDraft()};episodeEvaluationRequested=false;render();};
'''
modules['app.js']=mod; bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
print('two: bundle prepared',flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':960});errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(print('DIALOG',d.message[:200],flush=True),d.accept()))
 page.set_content('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 print('two: CSS loaded',flush=True)
 page.add_script_tag(content=bundle)
 print('two: bundle loaded',flush=True)
 print('two: seeding...',flush=True)
 page.evaluate('window.__auditSeed755()')
 print('two: seeded',flush=True)
 form=page.locator('#hmk-time-episode-form'); assert form.count(), 'Travel form failed to load'
 before=page.evaluate('window.__auditState755()')
 print('seed ready',before['minute'],len(errs),flush=True)
 # Deliberately select the unconscious patient in foot travel, observe that rule cannot silently pass.
 form.locator('[name="memberIds"][value="pc-patient"]').check()
 form.locator('[name="memberIds"][value="pc-patient2"]').check()
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
 form.locator('[name="transportedMemberIds"][value="pc-patient2"]').check()
 form.locator('[name="stableAnimalIds"][value="stable-horse-756"]').check()
 form.locator('[name="transportVehicleKey"]').select_option('stable-horse-756::cart-756')
 form.locator('[name="transportTeamIds"][value="stable-horse-756"]').check()
 form.locator('[name="transportPatientLb_pc-patient"]').fill('170')
 form.locator('[name="transportPatientLb_pc-patient2"]').fill('180')
 form.locator('[name="transportOtherLb"]').fill('200')
 form.locator('[name="transportCoLocated"]').check()
 assert page.evaluate('window.__auditState755()')['minute']==before['minute'],'Changing transport mode changed clock without GM confirmation'
 assert page.evaluate('window.__auditState755()')['history']==before['history'],'Draft wrote campaign history'
 # Physical cart must not force the patient to roll END as if walking.
 panel=page.locator('[data-episode-end-person="pc-patient"]')
 print('PATIENT END',panel.is_visible(),[(x.get_attribute('disabled')) for x in panel.locator('input,button').all()],flush=True)
 assert not panel.is_visible() and all(x.get_attribute('disabled') is not None for x in panel.locator('input,button').all()),'Transported patient END d10 still available'
 panel2=page.locator('[data-episode-end-person="pc-patient2"]')
 assert not panel2.is_visible() and all(x.get_attribute('disabled') is not None for x in panel2.locator('input,button').all()),'Second patient END d10 still available'
 assert not errs,'Browser errors '+str(errs)
 page.screenshot(path=str(root/'docs/AUDIT_v93.756_two_patients_transport_UI.png'),full_page=True)
 print('PASS Chromium transport UI/no premature commit/no phantom END/no page errors',flush=True)

 # Genuine cart episode: roll weather, original Survival and Riding proof,
 # original END only for active guide; then confirm once through GM UI.
 form.locator('[name="area"]').fill('Road 755')
 form.locator('[name="climate"]').select_option('subtropical')
 form.locator('[name="minutes"]').fill('5')
 form.locator('[data-episode-evaluate]').click(timeout=12000)
 from re import search
 for i in range(65):
  final=page.locator('[data-episode-finalize]')
  if final.is_enabled():break
  fld=form.get_attribute('data-episode-problem-field') or ''
  problem=form.get_attribute('data-episode-problem') or ''
  checklist=page.locator('[data-episode-checklist]').inner_text() if page.locator('[data-episode-checklist]').count() else ''
  print('CART TEST',i,repr(fld),problem[:185],checklist[-220:],flush=True)
  if fld=='confirmed' or (not fld and 'Potvrzení GM' in checklist):
   form.locator('[name="confirmed"]').check();continue
  if fld in ('orientationProofId','droverProofId'):
   task=page.locator('[data-episode-skill-task]').first
   if not task.count():raise AssertionError('No legal skill task for '+fld)
   role=task.get_attribute('data-episode-skill-task')
   task.click(timeout=5000)
   sf=page.locator('#skill-value-form' if fld=='orientationProofId' else '#skill-secondary-form')
   assert sf.count(),(fld,role)
   print('SKILL FORM',fld,'VIEW',page.evaluate("({primary:document.querySelector('#skill-secondary-form [name=primary]')?.value, visible:!!document.querySelector('#skill-secondary-form')?.offsetParent, role:document.querySelector('#skill-secondary-form [name=rollA]')?.outerHTML})"),flush=True)
   sf.locator('[name="rollA"]').fill('31',timeout=6000)
   sf.locator('[type="submit"]').click(timeout=5000)
   page.locator('[data-episode-return]').first.click(timeout=5000)
   form=page.locator('#hmk-time-episode-form')
   continue
  if not fld and 'Encounter · rozhodnutí GM' in checklist:
   form.locator('[name="encounterResolution"]').select_option('no-consequence');continue
  val={
   'temperatureD10':'5','precipitationD10':'10','precipitationD6':'6',
   'encounterD100':'100','encounterD100Sub':'100',
   'end_pc-guide':'5',
  }.get(fld)
  if fld=='progressD10':
   n=search(r'vyžaduje (\d+) skutečných d10',problem);val=','.join('1' for _ in range(int(n.group(1)) if n else 1))
  if fld=='directionD10':val='6'
  if val is not None:
   form.locator('[name="'+fld+'"]').fill(val,timeout=5000);continue
  raise AssertionError('Unexpected real cart blocker '+repr((fld,problem,checklist[-350:])))
 else:raise AssertionError('Cart did not progress in 65 steps')
 assert page.locator('[data-episode-finalize]').is_enabled()
 original=page.evaluate('window.__auditState755()')
 assert original['minute']==480
 page.locator('[data-episode-finalize]').click(timeout=12000)
 after=page.evaluate('window.__auditState755()')
 print('CART END',after['minute'],after['entries'],flush=True)
 assert after['minute']==485
 assert sum(row['episode'] for row in after['entries'])==1
 assert after['patientState']==original['patientState']
 assert after['patient2State']==original['patient2State']
 assert after['combat']==original['combat']
 assert not errs,errs
 page.screenshot(path=str(root/'docs/AUDIT_v93.756_two_patients_confirmed_cart.png'),full_page=True)
 print('PASS full Chromium stable-owned cart with TWO immobile patients, real skill proof, GM approval, +5 minutes, one episode, no second END or Combat',flush=True)
 b.close()
