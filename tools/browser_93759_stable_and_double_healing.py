"""93.759 Chromium: stable-only GM health registration + two-patient transport and both due Healing clicks."""
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
 patient2.hmk.healthState.wounds.push({id:'wagon-immobile-two-758',location:'th',severity:'G',level:4,aspect:'b',bleeding:false,nextAdvanceRound:null,
 healing:{treated:true,healingRate:4,nextHealingDay:5,infectionPossible:false}});
 synchronizeCombatInjuries(patient2,patient2.hmk.healthState);
 // Real stable-owned cart, with GM-acquired horse and one harness.
 guide.hmk.livestock=[{id:'stable-horse-756',name:'Cart horse',ownerId:guide.id,campaignId:'audit755',beastId:'hmk-p122-beast-10',minute:450,mode:'free',priceD:180,maxMB:1,transactionId:'tx-horse-756'}, {id:'stable-horse-b-759',name:'Wagon horse',ownerId:guide.id,campaignId:'audit755',beastId:'hmk-p122-beast-10',minute:445,mode:'free',priceD:180,maxMB:1,transactionId:'tx-horse-b-759'}];
 const stableEvents=[
  {id:'acquire-b-759',body:'GM-confirmed previously owned spare horse',createdAt:'2026-11-06T08:00:00Z',characterId:guide.id,calendarCampaignId:'audit755',campaignMinute:445,livestockAcquisition:{animalId:'stable-horse-b-759',ownerId:guide.id,beastId:'hmk-p122-beast-10',name:'Wagon horse',priceD:180,mode:'free',transactionId:'tx-horse-b-759'}},
  {id:'acquire-756',body:'GM-confirmed free horse acquisition',createdAt:'2026-11-06T08:00:00Z',characterId:guide.id,calendarCampaignId:'audit755',campaignMinute:450,
   livestockAcquisition:{animalId:'stable-horse-756',ownerId:guide.id,beastId:'hmk-p122-beast-10',name:'Cart horse',priceD:180,mode:'free',transactionId:'tx-horse-756'}},
  {id:'vehicle-756',body:'GM-confirmed cart possession',createdAt:'2026-11-06T08:00:00Z',characterId:guide.id,calendarCampaignId:'audit755',campaignMinute:455,
   stableHub574:{format:'hmk-stable-hub-574',type:'vehicle-add',animalId:'stable-horse-756',ownerId:guide.id,entryId:'cart-756',itemId:'hmk-p122-tack-03',weightLb:200,priceD:84,mode:'gift',transactionId:'tx-cart-gift-756',reason:'GM documented cart possession'}},
  {id:'harness-756',body:'GM-confirmed harness possession',createdAt:'2026-11-06T08:00:00Z',characterId:guide.id,calendarCampaignId:'audit755',campaignMinute:456,
   stableHub574:{format:'hmk-stable-hub-574',type:'tack-add',animalId:'stable-horse-756',ownerId:guide.id,entryId:'harness-756',itemId:'hmk-p122-tack-05',weightLb:8,priceD:20,mode:'gift',transactionId:'tx-harness-gift-756',reason:'GM documented harness possession'}}];
 let clock=C.createCampaignCalendar({day:1,hour:8,minute:10,label:'Transport 755',eventId:'seed755',gmConfirmed:true,campaignId:'audit755',characterIds:[guide.id,patient.id,patient2.id]});
 clock=C.anchorCampaignOrigin(clock,{kind:'wound',characterId:'pc-patient',woundId:'wagon-immobile-755',eventId:'documented-wound-755',gmConfirmed:true});
 clock=C.anchorCampaignOrigin(clock,{kind:'wound',characterId:'pc-patient2',woundId:'wagon-immobile-two-758',eventId:'documented-wound-two-758',gmConfirmed:true});
 clock=C.advanceCampaignCalendar(clock,{deltaMinutes:7190,eventId:'gm-previous-wait-756',reason:'GM confirmed previous 7190 minutes of independent campaign time',gmConfirmed:true,characters:[guide,patient,patient2]});
 data=clean();data.characters=[guide,patient,patient2];data.inventory=[];data.campaignClock=clock;data.journal=stableEvents;
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__auditState755=()=>({minute:data.campaignClock.minute,history:data.journal.length,combat:JSON.stringify(data.combatRuntime||{}),
 patientState:JSON.stringify(persistentStateOf(character('pc-patient'))),patient2State:JSON.stringify(persistentStateOf(character('pc-patient2'))),entries:data.journal.map(j=>({episode:!!j.calendarTimeEpisode,weather:!!j.calendarTrekDayWeather,reason:Object.keys(j).filter(k=>k.endsWith('Proof')||k.startsWith('calendar'))})),form:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblem});
window.__auditMarkTransport755=()=>episodeMarkField(document.querySelector('#hmk-time-episode-form'),'transportedMemberIds',{focus:true});
window.__auditMedicalBoundary756=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const w=require('./src/integration/hmk-calendar-chronology.js');
 const agenda=C.campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory);
 const limit=w.mandatoryCalendarWindow({minute:data.campaignClock.minute,agenda});
 let blocked=null;try{C.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:1,eventId:'illegal-unresolved-heal-756',reason:'Attempt to skip a due Healing while transporting',gmConfirmed:true,characters:data.characters});}
 catch(e){blocked=e.message;}
 return {minute:data.campaignClock.minute,due:agenda.due.map(e=>({kind:e.kind,actor:e.characterId,at:e.minute})),limit:limit.maxAllowed,blocked};
};
window.__auditFresh755=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';timeEpisodeDraft={...episodeFreshDraft()};episodeEvaluationRequested=false;render();};
window.__auditToStable759=()=>{selected='pc-guide';view='sheet';activeSheetSection='stable';document.getElementById('app').innerHTML=characterStableView(character('pc-guide'));};
window.__auditToOverview759=()=>{view='calendar';calendarLanding=false;activeCalendarSection='overview';render();};
window.__auditToProvisions759=()=>{view='calendar';calendarLanding=false;activeCalendarSection='provisions';provisionScope='person';render();};
window.__auditToHealth759=(id)=>{selected=id;view='sheet';activeSheetSection='hazards';
 document.getElementById('app').innerHTML=hmkLongtermHealingPanel([character(id)])+hskWeatherHealthConsequences(id)+hskEnvironmentalWoundCarePanel(character(id));
 document.querySelectorAll('#hmk-treatment-form,#hmk-healing-roll-form').forEach(f=>refreshCalendarHealingFields(f));};
window.__auditStableJournal759=()=>data.journal.filter(j=>j.stableHub574).map(j=>({type:j.stableHub574.type,animalId:j.stableHub574.animalId,entryId:j.stableHub574.entryId,itemId:j.stableHub574.itemId}));
window.__auditFollowup759=()=>{const c=require('./src/integration/hmk-campaign-calendar.js'),w=require('./src/integration/hmk-calendar-chronology.js'),a=c.campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory);return {minute:data.campaignClock.minute,due:a.due.filter(x=>x.kind==='healing').map(x=>({actor:x.characterId,minute:x.minute})),maximum:w.mandatoryCalendarWindow({minute:data.campaignClock.minute,agenda:a}).maxAllowed,healings:data.journal.filter(x=>x.title?.includes('Healing')||x.body?.includes('Healing')).map(x=>({id:x.id,actor:x.characterId,minute:x.campaignMinute})),patients:['pc-patient','pc-patient2'].map(id=>({id,wounds:persistentStateOf(character(id)).wounds.map(w=>({id:w.id,severity:w.severity,level:w.level,healed:w.healed,next:w.healing?.nextHealingDay}))}))};};

'''
modules['app.js']=mod; bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':960});page.set_default_timeout(5500);errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(print('DIALOG',d.message[:200],flush=True),d.accept()))
 page.set_content('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__auditSeed755()')
 # GM clicks actual Stables registration in the local Chromium app.
 page.evaluate('window.__auditToStable759()')
 formHealth=page.locator('form[data-hmk-stable-health-register]:has(input[name=animalId][value="stable-horse-756"])')
 print('STABLE VIEW',page.locator('body').inner_text()[:1200], 'FORMS',page.locator('form').count(),'ERR',errs,flush=True)
 assert formHealth.count()==1,'Stable health registration UI missing'
 print('REG FORM',formHealth.inner_text()[-400:],flush=True)
 formHealth.locator('[name=examNote]').fill('GM verified no wound, fatigue, shock, coma or overdue medical events; horse examined at stable.')
 formHealth.locator('[name=examinedHealthy]').check()
 stateBefore=page.evaluate('window.__auditState755()')
 formHealth.locator('[type=submit]').click(timeout=10000)
 stateAfter=page.evaluate('window.__auditState755()')
 print('REG RESULT',stateBefore['minute'],stateAfter['minute'],stateBefore['history'],stateAfter['history'],page.locator('body').inner_text()[-230:],flush=True)
 assert stateBefore['minute']==stateAfter['minute'] and stateAfter['history']==stateBefore['history']+1
 assert page.locator('[data-hmk-stable-health-register]').count()==0,'Registration still offered after confirmed health actor'
 page.evaluate('window.__auditFresh755()')
 form=page.locator('#hmk-time-episode-form'); assert form.count(), 'Travel form failed to load'
 before=page.evaluate('window.__auditState755()')
 print('seed ready',before['minute'],len(errs),flush=True)
 assert before['minute']==7680
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
 form.locator('[name="memberIds"][value="pc-guide"]').check()
 assert page.evaluate('window.__auditState755()')['minute']==before['minute'],'Changing transport mode changed clock without GM confirmation'
 assert page.evaluate('window.__auditState755()')['history']==before['history'],'Draft wrote campaign history'
 # Physical cart must not force the patient to roll END as if walking.
 panel=page.locator('[data-episode-end-person="pc-patient"]')
 print('PATIENT END',panel.is_visible(),[(x.get_attribute('disabled')) for x in panel.locator('input,button').all()],flush=True)
 assert not panel.is_visible() and all(x.get_attribute('disabled') is not None for x in panel.locator('input,button').all()),'Transported patient END d10 still available'
 panel2=page.locator('[data-episode-end-person="pc-patient2"]')
 assert not panel2.is_visible() and all(x.get_attribute('disabled') is not None for x in panel2.locator('input,button').all()),'Second patient END d10 still available'
 assert not errs,'Browser errors '+str(errs)
 page.screenshot(path=str(root/'docs/AUDIT_v93.759_double_healing_precommit.png'),full_page=True)
 print('PASS Chromium transport UI/no premature commit/no phantom END/no page errors',flush=True)

 # Genuine cart episode: roll weather, original Survival and Riding proof,
 # original END only for active guide; then confirm once through GM UI.
 form.locator('[name="area"]').fill('Road 755')
 form.locator('[name="climate"]').select_option('subtropical')
 form.locator('[name="minutes"]').fill('15')
 form.locator('[data-episode-evaluate]').click()
 print('HEALING 15-MIN PREVIEW',form.get_attribute('data-episode-problem'),form.get_attribute('data-episode-problem-field'),flush=True)
 assert page.evaluate('window.__auditState755()')['minute']==7680
 form.locator('[data-episode-evaluate]').click(timeout=12000)
 from re import search
 for i in range(65):
  final=page.locator('[data-episode-finalize]')
  if final.is_enabled():break
  fld=form.get_attribute('data-episode-problem-field') or ''
  problem=form.get_attribute('data-episode-problem') or ''
  checklist=page.locator('[data-episode-checklist]').inner_text() if page.locator('[data-episode-checklist]').count() else ''
  print('CART TEST',i,repr(fld),problem[:185],checklist[-220:],flush=True)
  if i < 3:print('GUIDE DEBUG',page.evaluate("()=>({g:document.querySelector('#hmk-time-episode-form [name=guideId]')?.value,m:[...document.querySelectorAll('#hmk-time-episode-form [name=memberIds]')].map(x=>[x.value,x.checked]), draft:document.querySelector('#hmk-time-episode-form [name=conveyance]')?.value})"),flush=True)
  if 'Maximální délka aktivity je 10 minut' in checklist:
   print('PASS UI blocked 15-minute transport at upcoming Healing term; calendar unchanged',flush=True)
   assert page.evaluate('window.__auditState755()')['minute']==7680
   jump=page.locator('[data-episode-jump="minutes"]')
   if jump.count():jump.first.click()
   form.locator('[name="minutes"]').fill('10');form.locator('[data-episode-evaluate]').click();continue
  if fld in ('minutes','timeWindow','calendarWindow') or ('povinný termín' in problem.lower()) or ('zdravotní termín' in problem.lower()):
   print('MIDPOINT BLOCKED',fld,problem[:250],flush=True)
   form.locator('[name="minutes"]').fill('10');form.locator('[data-episode-evaluate]').click();continue
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
   jump=page.locator('[data-episode-jump="encounterResolution"]')
   if jump.count():jump.last.click()
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
 assert original['minute']==7680
 page.locator('[data-episode-finalize]').click(timeout=12000)
 after=page.evaluate('window.__auditState755()')
 print('CART END',after['minute'],after['entries'],flush=True)
 assert after['minute']==7690
 assert sum(row['episode'] for row in after['entries'])==1
 assert after['patientState']==original['patientState'] and after['patient2State']==original['patient2State']
 assert after['combat']==original['combat']
 assert not errs,errs
 page.screenshot(path=str(root/'docs/AUDIT_v93.759_double_healing_boundary.png'),full_page=True)
 print('PASS full Chromium confirmed transport ends exactly at patient Healing boundary',flush=True)
 page.evaluate('window.__auditFresh755()')
 next_form=page.locator('#hmk-time-episode-form')
 next_form.locator('[name="kind"]').select_option('rest')
 next_form.locator('[name="minutes"]').fill('1')
 next_form.locator('[data-episode-evaluate]').click()
 evidence=page.evaluate('window.__auditMedicalBoundary756()')
 print('AFTER HEALING DUE',evidence,flush=True)
 assert evidence['limit']==0 and set(e['actor'] for e in evidence['due'] if e['kind']=='healing')=={'pc-patient','pc-patient2'},evidence
 assert evidence['blocked'] and ('termín' in evidence['blocked'] or 'Nelze' in evidence['blocked']),evidence
 (root/'docs/AUDIT_v93.759_double_healing_agenda.json').write_text(json.dumps({'version':'93.759','test':'Two immobilized patients transported to simultaneous Healing deadline','beforeMinute':before['minute'],'afterMinute':after['minute'],'due':evidence['due'],'nextAllowedMinutes':evidence['limit'],'crossingBlocked':evidence['blocked'],'patientStatesUnchanged':after['patientState']==original['patientState'] and after['patient2State']==original['patient2State'],'episodeCount':sum(row['episode'] for row in after['entries']),'pageerrors':errs},ensure_ascii=False,indent=2),encoding='utf8')
 assert not page.locator('[data-episode-finalize]').is_enabled(),'Overdue healing was improperly bypassed'
 assert page.evaluate('window.__auditState755()')['minute']==7690
 print('PASS TWO transported patients BOTH due same-minute, no required medical test skipped before independent GM resolution',flush=True)
 # Real medical UI: individual confirmed Healing procedures in SAME minute,
 # no clock movement, each one with its own original wound evidence.
 for i,id in enumerate(['pc-patient','pc-patient2']):
  page.evaluate("window.__auditToOverview759()")
  link=page.locator('[data-cal-link="'+id+'"][data-cal-kind="healing"]').first
  print('CAL HEAL LINK',id,link.count(),flush=True)
  assert link.count()==1,('Calendar to Healing original linked action missing',id)
  link.click()
  heal=page.locator('#hmk-healing-roll-form')
  print('HEAL FORM',id,'exists',heal.count(),flush=True)
  assert heal.count()==1,('Medical form absent',id)
  print('HEAL HTML',heal.inner_text()[-350:],flush=True)
  for name,roll in [('endurance','12'),('will','12'),('roll','31' if i==0 else '99')]:
   inp=heal.locator('[name="'+name+'"]');print('FIELD',name,inp.input_value(),inp.is_enabled(),flush=True)
   if inp.is_enabled():inp.fill(roll)
  at=page.evaluate('window.__auditFollowup759()');print('PRE HEAL',i,at,flush=True)
  heal.locator('button[type=submit]').click(timeout=10000)
  aft=page.evaluate('window.__auditFollowup759()');print('POST HEAL',i,aft,flush=True)
  assert aft['minute']==7690,'Medical procedure unexpectedly advanced calendar'
  assert not any(v['actor']==id for v in aft['due']),'Already confirmed patient still has same due Healing'
  if i==0:assert any(v['actor']=='pc-patient2' for v in aft['due']),'Second simultaneous Healing disappeared'
  assert len(page.locator('body').inner_text())>100
 page.evaluate('window.__auditFresh755()')
 last=page.evaluate('window.__auditFollowup759()'); print('BOTH RESOLVED',last,flush=True)
 assert last['minute']==7690 and not last['due'],'Compulsory same-minute Healing not closed'
 page.screenshot(path=str(root/'docs/AUDIT_v93.759_double_healing_completed.png'),full_page=True)
 assert not errs,errs
 (root/'docs/AUDIT_v93.759_healing_complete.json').write_text(json.dumps({'version':'93.759','stablesHealthRegistration':'GM confirmed via visible form','transportConfirmed':True,'final':last,'pageerrors':errs},ensure_ascii=False,indent=2),encoding='utf8')
 print('PASS v93.759 real Chromium two individual Healing confirmations, same minute, verified no automatic clock advance',flush=True)
 # Follow-up UI episode: the first patient stays behind to recover, while
 # the second travels; GM actually loads extra cargo through Stables.
 page.evaluate('window.__auditToStable759()')
 cargo=page.locator('form[data-hmk-stable-event]:has(input[name="type"][value="vehicle-cargo-add"])')
 assert cargo.count()==1,'Real Stable cart cargo-add UI absent'
 cargo.locator('[name=name]').fill('Medical provisions')
 cargo.locator('[name=weightLb]').fill('40')
 cargo.locator('[name=reason]').fill('GM confirmed additional medical cargo loaded between journeys')
 cargoStart=page.evaluate('window.__auditState755()')
 cargo.locator('[type=submit]').click(timeout=10000)
 cargoEnd=page.evaluate('window.__auditState755()')
 print('CARGO',cargoStart['history'],cargoEnd['history'],cargoStart['minute'],cargoEnd['minute'],flush=True)
 assert cargoEnd['history']==cargoStart['history']+1 and cargoEnd['minute']==7690,'Stable cargo action must not advance time'
 print('FOLLOWUP OPEN TRAVEL',flush=True)
 page.evaluate('window.__auditFresh755()')
 print('FOLLOWUP TRAVEL READY',page.locator('#hmk-time-episode-form').count(),flush=True)
 form=page.locator('#hmk-time-episode-form')
 # Do NOT select the recovering first patient. The campaign still tracks his
 # medical deadlines, but no END is asked for someone not travelling.
 form.locator('[name="memberIds"][value="pc-guide"]').check()
 form.locator('[name="memberIds"][value="pc-patient2"]').check()
 assert not form.locator('[name="memberIds"][value="pc-patient"]').is_checked(),'Previously transported patient was auto-selected into next journey'
 print('FOLLOWUP MEMBERS', page.evaluate("()=>[...document.querySelectorAll('#hmk-time-episode-form [name=memberIds]')].map(x=>[x.value,x.checked])"),flush=True)
 form.locator('[name=conveyance]').select_option('cart')
 form.locator('[name=kind]').select_option('travel')
 form.locator('[name=area]').fill('Road 755')
 if form.locator('[name=climate]').is_enabled(): form.locator('[name=climate]').select_option('subtropical')
 form.locator('[name=minutes]').fill('5')
 print('FOLLOWUP CONFIGURED',flush=True)
 second= form.locator('[name="transportedMemberIds"][value="pc-patient2"]')
 assert second.is_visible(), 'Remaining immobilized patient no longer requires explicit cart transport'
 second.check()
 print('FOLLOWUP PATIENT TRANSPORT CHECKED',flush=True)
 form.locator('[name="stableAnimalIds"][value="stable-horse-756"]').check()
 form.locator('[name="transportVehicleKey"]').select_option('stable-horse-756::cart-756')
 form.locator('[name="transportTeamIds"][value="stable-horse-756"]').check()
 form.locator('[name="transportPatientLb_pc-patient2"]').fill('180')
 form.locator('[name="transportOtherLb"]').fill('200')
 form.locator('[name="transportCoLocated"]').check()
 assert page.evaluate('window.__auditState755()')['minute']==7690
 for attempt in range(65):
  final=page.locator('[data-episode-finalize]')
  if final.is_enabled():break
  if not form.locator('[data-episode-evaluate]').is_enabled():
   if form.locator('[name=confirmed]').is_enabled() and not form.locator('[name=confirmed]').is_checked():
    form.locator('[name=confirmed]').evaluate('(node)=>node.click()')
    assert form.locator('[name=confirmed]').is_checked(),'Native browser GM confirmation click failed'
    continue
   raise AssertionError('Evaluation disabled before GM confirmation without final readiness')
  form.locator('[data-episode-evaluate]').click(timeout=7000)
  fld=form.get_attribute('data-episode-problem-field') or ''
  problem=form.get_attribute('data-episode-problem') or ''
  checklist=page.locator('[data-episode-checklist]').inner_text() if page.locator('[data-episode-checklist]').count() else ''
  print('FOLLOWUP TEST',attempt,repr(fld),problem[:115],checklist[-100:],flush=True)
  if fld=='confirmed' or ('Potvrzení GM' in checklist and not fld):
   form.locator('[name=confirmed]').check();continue
  if fld in ('orientationProofId','droverProofId'):
   task=page.locator('[data-episode-skill-task]').first
   assert task.count(),('New real skill task absent',fld)
   task.click()
   sf=page.locator('#skill-value-form' if fld=='orientationProofId' else '#skill-secondary-form')
   assert sf.count(),('New real test UI absent',fld)
   sf.locator('[name=rollA]').fill('31')
   sf.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click()
   form=page.locator('#hmk-time-episode-form');continue
  val={'temperatureD10':'5','precipitationD10':'10','precipitationD6':'6','encounterD100':'100','encounterD100Sub':'100','end_pc-guide':'5','directionD10':'6'}.get(fld)
  if fld=='progressD10':
   m=search(r'vyžaduje (\d+) skutečných d10',problem)
   val=','.join('1' for _ in range(int(m.group(1)) if m else 1))
  if val is not None:
   form.locator('[name="'+fld+'"]').fill(val);continue
  if not fld and 'Encounter · rozhodnutí GM' in checklist:
   jump=page.locator('[data-episode-jump="encounterResolution"]')
   if jump.count():jump.last.click()
   form.locator('[name=encounterResolution]').select_option('no-consequence');continue
  raise AssertionError(('Unexpected follow-up blocker',fld,problem,checklist[-180:]))
 else:raise AssertionError('Follow-up travel 65-step limit')
 assert page.locator('[data-episode-finalize]').is_enabled()
 page.locator('[data-episode-finalize]').click()
 multi=page.evaluate('window.__auditState755()')
 print('FOLLOWUP COMMIT',multi['minute'],sum(j['episode'] for j in multi['entries']),flush=True)
 assert multi['minute']==7695 and sum(j['episode'] for j in multi['entries'])==2
 assert multi['patientState']==cargoEnd['patientState'], 'Excluded first patient unexpectedly modified during next journey'
 assert multi['combat']==cargoEnd['combat'], 'Starting a second travel created an unsolicited Combat'
 assert not errs,errs
 page.screenshot(path=str(root/'docs/AUDIT_v93.759_changed_patient_and_cargo.png'),full_page=True)
 (root/'docs/AUDIT_v93.759_chromium_followup.json').write_text(json.dumps({'version':'93.759','registeredAnimal':True,'twoPatientTransportMinute':7690,'twoSameMinuteHealingConfirmed':True,'cargoAddedLb':40,'followupMinute':multi['minute'],'episodeCount':sum(j['episode'] for j in multi['entries']),'firstPatientExcluded':True,'pageErrors':errs},ensure_ascii=False,indent=2),encoding='utf8')
 print('PASS Chromium GM-cart-cargo change, independent first patient, second cart journey, single clock, no Combat',flush=True)
 # A separate real GM UI sequence acquires/attaches new equipment and a
 # TWO-horse team to a NEW 4-wheel wagon; the old 2-wheel cart remains archived.
 page.evaluate('window.__auditToStable759()')
 page.locator('[data-hmk-stable-pick-animal="stable-horse-b-759"]').click()
 # Synthetic combat-ready fixtures lack full 14-step character creation; restore the real Stable folio in this isolated browser.
 page.evaluate('window.__auditToStable759()')
 h2=page.locator('form[data-hmk-stable-health-register]:has(input[name=animalId][value="stable-horse-b-759"])')
 print('SPARE APP',page.locator('#app').inner_text()[:1800], 'ERRS',errs[-3:],flush=True)
 print('SPARE TRACE',page.evaluate("()=>({forms:[...document.querySelectorAll('form[data-hmk-stable-health-register]')].map(x=>x.querySelector('[name=animalId]')?.value), horses:[...document.querySelectorAll('.hmk-stable-animal-card summary')].map(x=>x.innerText), hasWagon:document.body.innerText.includes('Wagon horse')})"),flush=True)
 assert h2.count()==1,'Spare stable-only horse has no health registration UI'
 h2.locator('[name=examNote]').fill('GM examined spare wagon horse: fit, healthy, no earlier trauma, fatigue or outstanding medical term')
 h2.locator('[name=examinedHealthy]').check()
 beforeSecondHorse=page.evaluate('window.__auditState755()')
 h2.locator('[type=submit]').click(timeout=7000)
 afterSecondHorse=page.evaluate('window.__auditState755()')
 assert afterSecondHorse['minute']==7695 and afterSecondHorse['history']==beforeSecondHorse['history']+1
 print('SECOND HORSE HEALTH REGISTERED',flush=True)
 page.evaluate('window.__auditToStable759()')
 harness=page.locator('form[data-hmk-stable-event]:has(input[name="type"][value="tack-add"]):has(input[name="animalId"][value="stable-horse-b-759"])')
 assert harness.count()==1,'Spare horse harness acquisition form absent'
 harness.locator('[name=itemId]').select_option('hmk-p122-tack-05')
 harness.locator('[name=mode]').select_option('gift')
 harness.locator('[name=reason]').fill('GM confirms original spare harness from stable stores')
 harness.locator('[type=submit]').click(timeout=7000)
 page.evaluate('window.__auditToStable759()')
 wagon=page.locator('form[data-hmk-stable-event]:has(input[name="type"][value="vehicle-add"]):has(input[name="animalId"][value="stable-horse-b-759"])')
 assert wagon.count()==1,'Actual wagon stable acquisition form absent'
 wagon.locator('[name=itemId]').select_option('hmk-p122-tack-13')
 wagon.locator('[name=mode]').select_option('gift')
 wagon.locator('[name=reason]').fill('GM confirms alternate four-wheel wagon with two horses available in same place')
 wagon.locator('[type=submit]').click(timeout=7000)
 journalWagons=page.evaluate('window.__auditStableJournal759()')
 proven=[j for j in journalWagons if j['type']=='vehicle-add' and j['animalId']=='stable-horse-b-759']
 assert len(proven)==1 and proven[0]['itemId']=='hmk-p122-tack-13',proven
 wagonKey='stable-horse-b-759::'+proven[0]['entryId']
 assert page.evaluate('window.__auditState755()')['minute']==7695,'Stable harness/vehicle acquisition changed global time'
 print('NEW GM WAGON KEY',wagonKey,flush=True)
 page.evaluate('window.__auditFresh755()')
 form=page.locator('#hmk-time-episode-form')
 form.locator('[name=memberIds][value=pc-guide]').check()
 form.locator('[name=memberIds][value=pc-patient2]').check()
 assert not form.locator('[name=memberIds][value=pc-patient]').is_checked()
 assert form.locator('[name=memberIds][value=stable-horse-b-759]').count()==0,'Animal entered human END participants'
 form.locator('[name=conveyance]').select_option('wagon')
 form.locator('[name=kind]').select_option('travel')
 form.locator('[name=area]').fill('Road 755')
 if form.locator('[name=climate]').is_enabled():form.locator('[name=climate]').select_option('subtropical')
 form.locator('[name=minutes]').fill('5')
 form.locator('[name=transportedMemberIds][value=pc-patient2]').check()
 for animalId in ('stable-horse-756','stable-horse-b-759'):
  form.locator('[name=stableAnimalIds][value="'+animalId+'"]').check()
 form.locator('[name=transportVehicleKey]').select_option(wagonKey)
 for animalId in ('stable-horse-756','stable-horse-b-759'):
  form.locator('[name=transportTeamIds][value="'+animalId+'"]').check()
 form.locator('[name=transportPatientLb_pc-patient2]').fill('180')
 form.locator('[name=transportOtherLb]').fill('200')
 form.locator('[name=transportCoLocated]').check()
 from re import search
 for attempt in range(55):
  if page.locator('[data-episode-finalize]').is_enabled():break
  if not form.locator('[data-episode-evaluate]').is_enabled():
   if not form.locator('[name=confirmed]').is_checked():
    form.locator('[name=confirmed]').evaluate('(node)=>node.click()');continue
   raise AssertionError('Wagon evaluation disabled before final receipt')
  form.locator('[data-episode-evaluate]').click(timeout=5000)
  fld=form.get_attribute('data-episode-problem-field') or ''
  problem=form.get_attribute('data-episode-problem') or ''
  checklist=page.locator('[data-episode-checklist]').inner_text() if page.locator('[data-episode-checklist]').count() else ''
  print('WAGON TEST',attempt,repr(fld),problem[:100],flush=True)
  if fld=='confirmed' or ('Potvrzení GM' in checklist and not fld):
   form.locator('[name=confirmed]').evaluate('(node)=>node.click()');continue
  if fld in ('orientationProofId','droverProofId'):
   page.locator('[data-episode-skill-task]').first.click()
   sf=page.locator('#skill-value-form' if fld=='orientationProofId' else '#skill-secondary-form')
   assert sf.count()==1,('No skill form',fld)
   sf.locator('[name=rollA]').fill('31')
   sf.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click()
   form=page.locator('#hmk-time-episode-form');continue
  val={'temperatureD10':'5','precipitationD10':'10','precipitationD6':'6','encounterD100':'100','encounterD100Sub':'100','end_pc-guide':'5','directionD10':'6'}.get(fld)
  if fld=='progressD10':
   m=search(r'vyžaduje (\d+) skutečných d10',problem)
   val=','.join('1' for _ in range(int(m.group(1)) if m else 1))
  if val is not None:
   form.locator('[name="'+fld+'"]').fill(val);continue
  if not fld and 'Encounter · rozhodnutí GM' in checklist:
   jump=page.locator('[data-episode-jump="encounterResolution"]')
   if jump.count():jump.last.click()
   form.locator('[name=encounterResolution]').select_option('no-consequence');continue
  raise AssertionError(('Wagon followup blocker',fld,problem,checklist[-200:]))
 else:raise AssertionError('Wagon following episode unfinished')
 beforeWagon=page.evaluate('window.__auditState755()')
 page.locator('[data-episode-finalize]').click()
 afterWagon=page.evaluate('window.__auditState755()')
 print('WAGON COMMIT',afterWagon['minute'],sum(j['episode'] for j in afterWagon['entries']),flush=True)
 assert afterWagon['minute']==7700 and sum(j['episode'] for j in afterWagon['entries'])==3
 assert afterWagon['patientState']==beforeWagon['patientState'] and afterWagon['combat']==beforeWagon['combat']
 assert not errs,errs
 page.screenshot(path=str(root/'docs/AUDIT_v93.759_wagon_two_horses.png'),full_page=True)
 (root/'docs/AUDIT_v93.759_chromium_wagon.json').write_text(json.dumps({'version':'93.759','newHealthRegisteredForSecondHorse':True,'harnessAcquiredViaUI':True,'wagonAcquiredViaUI':True,'wagonProofId':proven[0]['entryId'],'oldCartRemainsAvailable':True,'team':['stable-horse-756','stable-horse-b-759'],'priorCartEpisodeCount':2,'newWagonEpisodeCount':3,'minute':afterWagon['minute'],'pageErrors':errs},ensure_ascii=False,indent=2),encoding='utf8')
 print('PASS v93.759 real Chromium 2-wheel cart -> 4-wheel wagon, changed live 2-horse team, continued patient, independent clock and no Combat',flush=True)
 page.evaluate('window.__auditToProvisions759()')
 rationActors=page.locator('select[data-provision-actor] option').evaluate_all('(xs)=>xs.map(x=>x.value)')
 print('PERSON RATIONS ARE HUMANS',rationActors,flush=True)
 assert set(rationActors)=={'pc-guide','pc-patient','pc-patient2'},'Live draught beast incorrectly added to human personal ration controls'
 assert page.evaluate('window.__auditState755()')['minute']==7700,'Opening provision control changed clock'
 print('PASS v93.759 no draught animals in human ration UI, still in calendar health membership',flush=True)
 b.close()
