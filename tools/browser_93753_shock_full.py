"""Confirmed accident branch from real Chromium UI; synthetic deterministic physical dice in isolated data."""
from pathlib import Path
import re,json,traceback,sys
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');marker='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(marker):]);mod=modules['app.js']
mod+='''
window.__auditAnimal750=()=>{
    const inj=require('./src/integration/hmk-skill-physical-consequences.js');
    const health=require('./src/integration/persistent-combat-state.js');
    const horse={id:'animal-pony-750',name:'Poník',kind:'Animal',hmk:{verifiedMountedBreed:'pony',
      attributes:{agl:12,str:20,end:12},healthState:health.initialCombatState()}};
    const proof=inj.prepareSkillPhysicalInjury({kind:'survival-accident',actor:horse,state:horse.hmk.healthState,
      inventory:[],sourceId:'independent-pony-provenance-750',round:1,gmConfirmed:true,originMinute:540,
      hazardD10:5,agilityD100:81,randomVictimConfirmed:true,impactDie:6,
      zoneD10:4,locationD10:2,shockD100:10});
    if(proof.injury?.location!=='flg')throw Error('Expected real anatomical foreleg wound');
    horse.hmk.healthState=proof.state;
    data.characters.push(horse);data.campaignClock.characterIds.push(horse.id);
    view='calendar';activeCalendarSection='travel';calendarLanding=false;render();
  };
window.__auditRequire750=require;
window.__auditSeed750=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),health=require('./src/integration/persistent-combat-state.js');
 const actor={id:'pc-a',name:'Průvodce',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{id:'skill-sur',name:'Survival',ml:70},{id:'skill-end',name:'Endurance',ml:60},{id:'skill-shock',name:'Shock',ml:65},{id:'skill-init',name:'Initiative',ml:65}],healthState:health.initialCombatState()}};
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Accident 750 E2E',eventId:'seed',gmConfirmed:true,campaignId:'audit750',characterIds:[actor.id]});
 data=clean();data.characters=[actor];data.inventory=[];data.campaignClock=clock;data.journal=[];
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__auditState750=()=>({clock:data.campaignClock.minute,storedClock:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute,
 journal:data.journal.map(x=>({id:x.id,minute:x.campaignMinute,travel:x.calendarTimeEpisode?.hazardDetails?.map(z=>({hazard:z.hazard,externalMedicalPending:z.externalMedicalPending,hazardD10:z.hazardD10})),injury:x.skillTestProof?.type==='skill-physical-consequence'?{kind:x.skillTestProof.kind,actorId:x.skillTestProof.actorId,injury:x.skillTestProof.report?.injury}:null})),
 storedCount:JSON.parse(localStorage.getItem(STORAGE)).journal.length,
 health:JSON.parse(JSON.stringify(persistentStateOf(character('pc-a')))),combat:JSON.stringify(data.combatRuntime||{})});
window.__auditNavigateSkills750=()=>{view='skills';selected='pc-a';render();};
window.__auditRenderHealth752=()=>{selected='pc-a';view='sheet';activeSheetSection='hazards';document.getElementById('app').innerHTML=hskWeatherHealthConsequences('pc-a')+hskEnvironmentalWoundCarePanel(character('pc-a'));document.querySelectorAll('#hmk-treatment-form,#hmk-healing-roll-form').forEach(f=>refreshCalendarHealingFields(f));};
window.__auditProvision753=()=>{view='calendar';calendarLanding=false;activeCalendarSection='provisions';provisionScope='person';provisionGuideActorId='pc-a';render();};
window.__auditTravel753=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';episodeEvaluationRequested=false;timeEpisodeDraft={...episodeFreshDraft()};render();};
window.__auditFullHealth752=()=>({minute:data.campaignClock.minute,agenda:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory),state:structuredClone(persistentStateOf(character('pc-a')))});
'''
modules['app.js']=mod
bundle=marker+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
log=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1450,'height':940});errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(errs.append('ERROR DIALOG: '+d.message) if ('nebyl uložen' in d.message or 'Změna nebyla uložena' in d.message) else None,d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 print('DEBUG: injecting application',flush=True);page.add_script_tag(content=bundle);print('DEBUG: seeding isolated campaign',flush=True);page.evaluate('window.__auditSeed750()');print('DEBUG: application ready',flush=True)
 def state():return page.evaluate('window.__auditState750()')
 def f():return page.locator('#hmk-time-episode-form')
 def field():return f().get_attribute('data-episode-problem-field') or ''
 def issue():return f().get_attribute('data-episode-problem') or ''
 def fill(n,v):
  x=f().locator('[name="'+n+'"]')
  if n=='hazardAtMinute':
   jump=page.locator('[data-episode-jump="hazardAtMinute"]');assert jump.count(), 'missing GM corrective navigation button'
   jump.first.click(timeout=12000)
   assert x.is_visible(), 'Accident target did not become visible after GM jump'
   assert x.locator('xpath=ancestor::label[1]').get_attribute('class') and 'hc-episode-needs-input' in x.locator('xpath=ancestor::label[1]').get_attribute('class'),'Red required-field highlight missing'
  x.fill(str(v),timeout=12000)
 def skill(roll):
  task=page.locator('[data-episode-skill-task]').first;role=task.get_attribute('data-episode-skill-task');print('SKILL',role,'roll',roll,flush=True)
  task.click(timeout=12000);sf=page.locator('#skill-value-form');assert sf.count(),(role,field(),issue())
  sf.locator('[name="rollA"]').fill(str(roll));pre=state();sf.locator('[type="submit"]').click(timeout=12000)
  assert pre['clock']==state()['clock'],'preliminary skill shifted time'
  page.locator('[data-episode-return]').first.click(timeout=12000)
  return role
 try:
  page.evaluate('window.__auditProvision753()')
  assure=page.locator('[data-provision-assure="yes"][data-actor-id="pc-a"]')
  assert assure.count() and assure.is_enabled(), 'GM provisioning switch absent at starting minute'
  assure.click(timeout=12000)
  assert state()['clock']==480, 'GM food source evidence advanced time'
  print('PASS GM-provisioned food/water (isolated test condition) at campaign onset',flush=True)
  page.evaluate('window.__auditTravel753()')
  f().locator('[name="kind"]').select_option('travel');f().locator('[name="minutes"]').fill('60')
  f().locator('[name="memberIds"][value="pc-a"]').check()
  f().locator('[name="weatherSource"]').select_option('local');f().locator('[name="area"]').fill('Accident Valley');f().locator('[name="climate"]').select_option('subtropical')
  # Keep the default Encounter rule active; use a genuine low d100 to test the no-Encounter branch.
  f().locator('[data-episode-evaluate]').click();before=state()
  for i in range(55):
   fi=field();problem=issue();fin=page.locator('[data-episode-finalize]')
   print('STEP',i,fi,problem[:140],flush=True)
   log.append([i,fi,problem[:240]])
   if fin.is_enabled():break
   if fi in ['orientationProofId','trackingProofId'] or fi.startswith('whProof_'):
    role=page.locator('[data-episode-skill-task]').first.get_attribute('data-episode-skill-task')
    skill(100 if role=='Survival' else 31);continue
   if fi=='encounterD100':val=100
   elif fi=='temperatureD10':val=5
   elif fi=='precipitationD10':val=10
   elif fi=='precipitationD6':val=6
   elif fi=='survivalD10':val=5
   elif fi=='hazardAtMinute':val=60
   elif fi=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',problem);val=','.join('1' for _ in range(int(m.group(1)) if m else 1))
   elif fi=='directionD10':val=6
   elif fi.startswith('end_'):val=5
   elif fi.startswith('whRoll_cold_'):val=1
   elif fi.startswith('whRoll_heat_'):val=1
   elif fi=='confirmed':f().locator('[name="confirmed"]').check();continue
   elif not fi and 'Potvrzení GM' in page.locator('[data-episode-checklist]').inner_text():f().locator('[name="confirmed"]').check();continue
   else:raise AssertionError(f'UNKNOWN STEP field {fi!r} issue {problem!r}, checklist {page.locator("[data-episode-checklist]").inner_text()[:900]}')
   fill(fi,val)
  else:raise AssertionError('exceeded 55 steps')
  assert fin.is_enabled(),(field(),issue())
  pre=state();assert pre['clock']==before['clock']==480
  assert pre['health']['wounds']==[]
  fin.click(timeout=12000);after=state()
  assert after['clock']==after['storedClock']==540,after
  assert after['health']['wounds']==[],'injury before its original Skill Test'
  assert len([x for x in after['journal'] if x['travel']])==1,after['journal']
  print('DEBUG committed journal',json.dumps(after['journal'],ensure_ascii=False)[:2400],flush=True)
  assert any(h.get('externalMedicalPending') is True for row in after['journal'] for h in (row.get('travel') or [])),after['journal']
  print('PASS confirmed accident episode and isolated clock 480->540',flush=True)
  # Navigate by the GM-facing original Accident button, not by creating any Combat.
  go=page.locator('[data-episode-open-accident]');assert go.count(),page.locator('body').inner_text()[-900:]
  go.first.click(timeout=12000)
  medical=page.locator('form[data-skill-physical-impact]');assert medical.count()==1,(page.locator('body').inner_text()[-1000:])
  print('DEBUG MEDICAL NAV',page.evaluate("""()=>({medicalVisible:!!document.querySelector('form[data-skill-physical-impact]')?.getClientRects().length,sourceHidden:document.querySelector('[data-hmk-followup-source-598]')?.hidden,picker:document.querySelector('[data-hmk-followup-choice-598]')?.value,options:[...document.querySelectorAll('[data-hmk-followup-choice-598] option')].map(x=>[x.value,x.textContent?.slice(0,50)]),formEntry:document.querySelector('form[data-skill-physical-impact]')?.dataset.hmkFollowupEntry598,insideSource:!!document.querySelector('[data-hmk-followup-source-598] form[data-skill-physical-impact]'),allMedicalForms:document.querySelectorAll('form[data-skill-physical-impact]').length,path:(()=>{let n=document.querySelector('form[data-skill-physical-impact]');return [...Array(6)].map(()=>{const x=n?.tagName+' '+(n?.id||'')+' '+(n?.className||'')+' '+(n?.getAttribute('data-skill-section')||'');n=n?.parentElement;return x})})(),displayHTML:document.querySelector('[data-hmk-followup-display-598]')?.innerHTML.slice(0,100)})"""),flush=True)
  assert medical.is_visible(), 'Health form did not become visible directly on clicking Travel Accident link'

  assert medical.locator('[name="hazardD10"]').input_value()=='5'
  target=medical.locator('[name="targetId"]');target.select_option('pc-a')
  medical.locator('[name="agilityD100"]').fill('100')
  assert not medical.locator('[data-hsk-hazard-impact]').is_hidden(),'Impact fields not enabled for failed Agility'
  for name,value in [('impactDie',1),('zoneD10',1),('locationD10',6),('shockD100',100)]:medical.locator('[name="'+name+'"]').fill(str(value))
  beforeHealth=state()
  assert beforeHealth['clock']==540 and not beforeHealth['health']['wounds']
  medical.locator('[type="submit"]').click(timeout=12000)
  following=state()
  print('DEBUG HEALTH OUT',medical.locator('output').all_inner_texts(),flush=True)
  print('DEBUG HEALTH JOURNAL',json.dumps(following['journal'],ensure_ascii=False)[:3600],flush=True)
  assert following['clock']==following['storedClock']==540,'accident health followup incorrectly shifts time'
  print('SHOCK EVIDENCE',json.dumps({'shock':following['health']['shock'],'shockFollowup':following['health'].get('shockFollowup'),'extendedShock':following['health'].get('extendedShock'),'coma':following['health'].get('coma')},ensure_ascii=False),flush=True)
  assert following['health']['shock']!='NONE','Shock CF must not be reported as no shock when injury is severe'
  assert len(following['health']['wounds'])==1,'confirmed wound missing'
  assert len([x for x in following['journal'] if x['injury']])==1,'no unique injury proof'
  assert following['combat']==beforeHealth['combat'],'Accident auto spawned Combat!'
  print('PASS accident AGILITY CF: health saved once, no additional minutes and no combat',flush=True)
  page.screenshot(path=str(root/'docs/AUDIT_v93.752_accident_healing_confirmed.png'),full_page=False)
  # Exercise the original Travel Health component and its actual delegated submit handler.
  page.evaluate('window.__auditRenderHealth752()')
  # Serious (S3) non-bleeding injury: no automatic Mishap is owed.
  assert page.locator('form[data-weather-injury-mishap]').count()==0
  assert state()['clock']==540
  print('PASS: no fictitious Mishap for S3, actual UNC +10 due',flush=True)
  # Required original GM Treatment decision before moving campaign clock.
  page.evaluate('window.__auditRenderHealth752()')
  care=page.locator('form#hmk-treatment-form')
  assert care.count()==1
  entries=[x.get_attribute('value') or '' for x in care.locator('[name="wound"] option').all()]
  choice=next(v for v in entries if '::' in v)
  care.locator('[name="wound"]').select_option(choice)
  care.locator('[name="untreated"]').check()
  original=state();care.locator('[type="submit"]').click(timeout=12000)
  assert state()['clock']==original['clock']==540
  print('PASS: original GM untreated decision confirmed, no time',flush=True)
  # Phase 753: actual GM-confirmed 10-minute calendar advance through original Travel UI.
  page.evaluate('window.__auditTravel753()')
  ff=page.locator('#hmk-time-episode-form')
  ff.locator('[name="kind"]').select_option('rest')
  ff.locator('[name="minutes"]').fill('10')
  m=ff.locator('[name="memberIds"][value="pc-a"]')
  if not m.is_checked():m.check()
  ss=ff.locator('[name="weatherSafeShelter"]')
  if ss.count() and not ss.is_checked():ss.check()
  print('PRE-10 AGENDA',str(page.evaluate('window.__auditFullHealth752()')['agenda'])[:1500],flush=True)
  ff.locator('[data-episode-evaluate]').click(timeout=12000)
  for i in range(20):
   ff=page.locator('#hmk-time-episode-form');fld=ff.get_attribute('data-episode-problem-field') or '';problem=ff.get_attribute('data-episode-problem') or ''
   if page.locator('[data-episode-finalize]').is_enabled():break
   print('REST10',i,fld,problem[:180],flush=True)
   if fld=='confirmed':ff.locator('[name="confirmed"]').check();continue
   if fld=='temperatureD10':ff.locator('[name="temperatureD10"]').fill('5');continue
   if fld=='precipitationD10':ff.locator('[name="precipitationD10"]').fill('10');continue
   if fld=='precipitationD6':ff.locator('[name="precipitationD6"]').fill('6');continue
   if not fld and 'Potvrzení GM' in page.locator('[data-episode-checklist]').inner_text():ff.locator('[name="confirmed"]').check();continue
   raise AssertionError('REST 10 blocker: '+fld+' '+problem)
  assert page.locator('[data-episode-finalize]').is_enabled(),'10m rest not ready'
  assert state()['clock']==540
  page.locator('[data-episode-finalize]').click(timeout=12000)
  assert state()['clock']==550 and state()['storedClock']==550,'GM-confirmed +10m failed'
  print('PASS +10 actual GM Travel rest at Shock deadline',flush=True)
  page.evaluate('window.__auditRenderHealth752()')
  shock=page.locator('form[data-weather-shock-followup]')
  assert shock.count() and shock.is_visible(),'due UNC Shock form hidden'
  print('SHOCK EML',page.locator('section.hmk-weather-shock-followup').inner_text()[:300],flush=True)
  assert shock.locator('[name="roll"]').is_enabled(),'UNC +10 d100 still disabled'
  # CF outcome requires physical first Coma d10. Use the real original UI.
  shock.locator('[name="roll"]').fill('100')
  assert shock.locator('[name="comaLocationShock"]').input_value()=='4', 'Location Shock not derived from actual face'
  assert shock.locator('[name="comaInjuryLevel"]').input_value()=='3', 'IL not derived from original S3 wound'
  print('PASS Coma anatomy read-only: face LS4 and injury IL3, Coma HR5',flush=True)
  shock.locator('[name="initialComaD10"]').fill('1')
  prior=state();shock.locator('[type="submit"]').click(timeout=12000);aft=state()
  print('POST SHOCK',aft['clock'],aft['health']['shock'],aft['health'].get('extendedShock'),aft['health'].get('coma'),flush=True)
  assert aft['clock']==prior['clock']==550,'health reroll moved calendar'
  assert aft['health'].get('extendedShock') and aft['health'].get('coma'),'CF did not result in Extended and Coma'
  def rest_to(target):
   previous=state()['clock'];assert target>previous,(target,previous)
   page.evaluate('window.__auditTravel753()')
   ff=page.locator('#hmk-time-episode-form')
   ff.locator('[name="kind"]').select_option('rest')
   ff.locator('[name="minutes"]').fill(str(target-previous))
   m=ff.locator('[name="memberIds"][value="pc-a"]')
   if not m.is_checked():m.check()
   ss=ff.locator('[name="weatherSafeShelter"]')
   if ss.count() and not ss.is_checked():ss.check()
   ff.locator('[data-episode-evaluate]').click(timeout=12000)
   for j in range(25):
    ff=page.locator('#hmk-time-episode-form')
    if page.locator('[data-episode-finalize]').is_enabled():break
    fld=ff.get_attribute('data-episode-problem-field') or '';problem=ff.get_attribute('data-episode-problem') or ''
    print('REST',previous,'->',target,j,repr(fld),repr(problem[:190]),flush=True)
    if fld=='confirmed':ff.locator('[name="confirmed"]').check();continue
    if fld=='temperatureD10':ff.locator('[name="temperatureD10"]').fill('5');continue
    if fld=='precipitationD10':ff.locator('[name="precipitationD10"]').fill('10');continue
    if fld=='precipitationD6':ff.locator('[name="precipitationD6"]').fill('6');continue
    if not fld and 'Potvrzení GM' in page.locator('[data-episode-checklist]').inner_text():ff.locator('[name="confirmed"]').check();continue
    raise AssertionError('REST blocked: '+str((previous,target,fld,problem,page.locator('[data-episode-independent-due]').all_inner_texts()[:3])))
   else:raise AssertionError('REST input loop overflow')
   assert page.locator('[data-episode-finalize]').is_enabled(),(previous,target)
   assert state()['clock']==previous,'Time changed before GM confirmation'
   page.locator('[data-episode-finalize]').click(timeout=12000)
   after=state();
   if after['clock']!=target:
    print('COMMIT FAILURE',previous,target,'NOTICE',page.locator('body').inner_text()[-1800:],'ERRS',errs,'FORM',page.locator('#hmk-time-episode-form').get_attribute('data-episode-problem'),flush=True)
   assert after['clock']==after['storedClock']==target,(previous,target,after['clock'])
   print('PASS GM REST',previous,'->',target,flush=True)
  def course(kind,roll,period=None):
   page.evaluate('window.__auditRenderHealth752()')
   el=page.locator('form[data-weather-trauma-course]')
   assert el.count()==1 and el.is_visible(),('Missing due form',kind,state()['clock'],page.locator('body').inner_text()[-1000:])
   assert el.locator('[name="kind"]').input_value()==kind,('wrong due course',el.locator('[name="kind"]').input_value(),kind)
   el.locator('[name="roll"]').fill(str(roll))
   if kind=='coma':
    el.locator('[name="restfulShelter"]').select_option('yes')
    if period is not None:el.locator('[name="periodD10"]').fill(str(period))
   original=state();el.locator('[type="submit"]').click(timeout=12000)
   final=state(); assert final['clock']==original['clock'],'Course advanced time'
   assert len(final['health']['events'])==len(original['health']['events'])+1,(kind,original['clock'])
   print('PASS COURSE',kind,'roll',roll,'minute',final['clock'],'Ext',final['health'].get('extendedShock'),'Coma',final['health'].get('coma'),flush=True)
  # Cure Extended Shock at its first due +4h with a genuine CS, then observe
  # separate Coma Course one d10 day later; no fabricated extra 4h tests.
  rest_to(790);course('extended-shock',5)
  assert state()['health'].get('extendedShock') is None,'Extended Shock should close after CS at HR4'
  # Incapacitated actor still needs GM-assisted actual intake for the first 24h.
  # The input is independent of source availability: GM marked continuing care
  # at campaign start, and now attests actual delivery on this day.
  page.evaluate('window.__auditProvision753()')
  intake=page.locator('form[data-provision-assisted-intake]')
  assert intake.count()==1 and intake.is_visible(), 'Assisted nutrition proof missing'
  print('INTAKE',intake.locator('[name="startMinute"]').input_value(),flush=True)
  intake.locator('[name="foodAccepted"]').check()
  intake.locator('[name="waterAccepted"]').check()
  intake.locator('[name="caregiver"]').fill('Zkušený člen testovací družiny')
  intake.locator('[name="reason"]').fill('GM v izolovaném scénáři potvrdil skutečné podání jídla a vody během bezvědomí z předem zajištěného zdroje.')
  prior=state();intake.locator('[type="submit"]').click(timeout=12000)
  assert state()['clock']==prior['clock']==790,'Assisted care erroneously advanced campaign time'
  print('PASS witnessed nutrition aid for the original 24h day, no phantom supplies',flush=True)
  rest_to(1990)
  page.evaluate('window.__auditRenderHealth752()')
  print('HEALTH AT COMA',page.locator('body').inner_text()[-1800:],flush=True)
  course('coma',5,period=1)
  final=state(); assert final['health'].get('extendedShock') is None and final['health'].get('coma') is None, 'No full coma recovery'
  # The serious S3 wound carries a post-Shock Injury Morale: resolve it now,
  # not through a simulated Combat round or a skipped due obligation.
  page.evaluate('window.__auditRenderHealth752()')
  morale=page.locator('form[data-weather-injury-morale]')
  assert morale.count() and morale.is_visible(),'Missing mandatory post-Shock Injury Morale'
  morale.locator('[name="aberrance"]').fill('0')  # GM explicitly attests no current aberrance source
  morale.locator('[name="roll"]').fill('31')
  premorale=state();morale.locator('[type="submit"]').click(timeout=12000)
  assert state()['clock']==premorale['clock']==1990,'Morale advanced time'
  assert len(state()['health']['events'])==len(premorale['health']['events'])+1,'Morale not saved'
  print('PASS independent Injury Morale after Coma recovery, no Combat',flush=True)
  # Reach original 5-day Healing appointment and finish original wound-roll.
  print('AFTER COMA AGENDA',str(page.evaluate('window.__auditFullHealth752()')['agenda'])[:1300],flush=True)
  # Individual GM-confirmed intervals retain the real date of each action.
  for target in (3430,4870,6310,7740):
   rest_to(target)
  page.evaluate('window.__auditRenderHealth752()')
  print('HEALING READY',page.locator('body').inner_text()[-1400:],flush=True)
  form=page.locator('#hmk-healing-roll-form')
  assert form.count() and form.is_visible(), 'Original due Healing form not available'
  print('HEALING ELAPSED',form.locator('[name="daySinceInjury"]').input_value(),flush=True)
  assert form.locator('[name="daySinceInjury"]').input_value()=='5','Calendar did not derive real Healing day 5'
  assert form.locator('[name="endurance"]').input_value()=='12' and form.locator('[name="endurance"]').get_attribute('readonly') is not None, 'END must be read-only live Character State'
  assert form.locator('[name="will"]').input_value()=='12' and form.locator('[name="will"]').get_attribute('readonly') is not None, 'WIL must be read-only live Character State'
  form.locator('[name="roll"]').fill('20')
  prior=state();form.locator('[type="submit"]').click(timeout=12000)
  after=state()
  print('HEALING EVENTS',after['health']['events'][-2:],flush=True)
  assert after['clock']==prior['clock']==7740,'Healing roll moved time'
  assert len(after['health']['events'])==len(prior['health']['events'])+1,'Healing event did not save once'
  assert any(e.get('type')=='healing-roll' or 'healing' in e.get('type','') for e in after['health']['events'][-2:]),'Expected native Healing receipt'
  print('PASS original day 5 Healing Roll completed and saved once, no time change',flush=True)
  # A further Travel/Calendar GM episode must still be possible after all
  # serious course obligations and healing were resolved.
  rest_to(7800)
  assert state()['clock']==7800 and state()['storedClock']==7800, 'Next travel episode blocked'
  print('PASS next GM-confirmed travel rest episode 7740->7800 after Healing',flush=True)
  assert not errs,errs
 except Exception as e:
  print('FAIL',type(e).__name__,str(e)[:1200],flush=True);traceback.print_exc()
  try:page.screenshot(path=str(root/'docs/AUDIT_v93.753_shock_e2e_fail.png'),full_page=False)
  except:pass
  sys.exit(1)
 finally:
  (root/'docs/AUDIT_v93.752_accident_healing_trace.json').write_text(json.dumps({'steps':log,'errors':errs},ensure_ascii=False,indent=2),encoding='utf8')
  b.close()
