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
    const horse={id:'animal-pony-750',name:'Poník',kind:'NPC',hmk:{verifiedMountedBreed:'pony',
      attributes:{agl:12,str:20,end:12},healthState:health.initialCombatState()}};
    const proof=inj.prepareSkillPhysicalInjury({kind:'survival-accident',actor:horse,state:horse.hmk.healthState,
      inventory:[],sourceId:'independent-pony-provenance-750',round:1,gmConfirmed:true,
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
 const actor={id:'pc-a',name:'Průvodce',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{id:'skill-sur',name:'Survival',ml:70},{id:'skill-end',name:'Endurance',ml:60},{id:'skill-shock',name:'Shock',ml:65}],healthState:health.initialCombatState()}};
 const horse={id:'animal-pony-750',name:'Poník',kind:'NPC',hmk:{verifiedMountedBreed:'pony',attributes:{agl:12,str:20,end:12,wil:12},skills:[{id:'skill-pony-initiative-753',name:'Initiative',ml:60}],healthState:health.initialCombatState()}};
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Accident 750 E2E',eventId:'seed',gmConfirmed:true,campaignId:'audit750',characterIds:[actor.id,horse.id]});
 data=clean();data.characters=[actor,horse];data.inventory=[];data.campaignClock=clock;data.journal=[];
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__auditState750=()=>({clock:data.campaignClock.minute,storedClock:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute,
 journal:data.journal.map(x=>({id:x.id,minute:x.campaignMinute,travel:x.calendarTimeEpisode?.hazardDetails?.map(z=>({hazard:z.hazard,externalMedicalPending:z.externalMedicalPending,hazardD10:z.hazardD10})),injury:x.skillTestProof?.type==='skill-physical-consequence'?{kind:x.skillTestProof.kind,actorId:x.skillTestProof.actorId,injury:x.skillTestProof.report?.injury}:null})),
 storedCount:JSON.parse(localStorage.getItem(STORAGE)).journal.length,
 health:JSON.parse(JSON.stringify(persistentStateOf(character('pc-a')))),animalHealth:JSON.parse(JSON.stringify(persistentStateOf(character('animal-pony-750')))),combat:JSON.stringify(data.combatRuntime||{})});
window.__auditNavigateSkills750=()=>{view='skills';selected='pc-a';render();};
window.__auditTravel753=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';timeEpisodeDraft={...episodeFreshDraft()};episodeEvaluationRequested=false;render();};
window.__auditAnimalHealth753=()=>{selected='animal-pony-750';view='sheet';activeSheetSection='hazards';document.getElementById('app').innerHTML=hskWeatherHealthConsequences('animal-pony-750')+hskEnvironmentalWoundCarePanel(character('animal-pony-750'));document.querySelectorAll('#hmk-treatment-form,#hmk-healing-roll-form').forEach(f=>refreshCalendarHealingFields(f));};
window.__auditAnimalProvision753=(actorId='animal-pony-750')=>{view='calendar';calendarLanding=false;activeCalendarSection='provisions';provisionScope='person';provisionGuideActorId=actorId;render();};
window.__auditAnimalAgenda753=()=>require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory);

'''
modules['app.js']=mod
bundle=marker+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
log=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1450,'height':940});errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(print('ANIMAL DIALOG:',d.message[:1300],flush=True), d.accept()))
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
   jump.first.click(timeout=3500)
   assert x.is_visible(), 'Accident target did not become visible after GM jump'
   assert x.locator('xpath=ancestor::label[1]').get_attribute('class') and 'hc-episode-needs-input' in x.locator('xpath=ancestor::label[1]').get_attribute('class'),'Red required-field highlight missing'
  x.fill(str(v),timeout=3500)
 def skill(roll):
  task=page.locator('[data-episode-skill-task]').first;role=task.get_attribute('data-episode-skill-task');print('SKILL',role,'roll',roll,flush=True)
  task.click(timeout=3500);sf=page.locator('#skill-value-form');assert sf.count(),(role,field(),issue())
  sf.locator('[name="rollA"]').fill(str(roll));pre=state();sf.locator('[type="submit"]').click(timeout=3500)
  print('DEBUG ANIMAL SKILL SAVE',page.evaluate('''()=>({journal:data.journal.length,error:document.querySelector('[role=alert]')?.textContent,txt:document.querySelector('#skill-value-form')?.innerText.slice(-350)})''') if False else page.locator('body').inner_text()[-450:],flush=True)
  assert pre['clock']==state()['clock'],'preliminary skill shifted time'
  page.locator('[data-episode-return]').first.click(timeout=3500)
  print('DEBUG RETURN',page.evaluate('''()=>({proof:document.querySelector('[name=orientationProofId]')?.value,issue:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblem,notes:document.querySelector('.hc-episode-spread-right')?.innerText.slice(0,350)})'''),flush=True)
  return role
 try:
  # GM explicitly registers verified sustained food/water source at the
  # beginning of this isolated scenario for all present participants.
  for recipient in ('pc-a','animal-pony-750'):
   page.evaluate("window.__auditAnimalProvision753",recipient)
   grant=page.locator('[data-provision-assure="yes"][data-actor-id="'+recipient+'"]')
   print('START PROVISION',recipient,grant.count(),grant.is_enabled() if grant.count() else 'missing',flush=True)
   assert grant.count() and grant.is_enabled(),'GM start source cannot be attested'
   grant.click(timeout=12000)
   assert state()['clock']==480,'GM food-source acknowledgement moved time'
  page.evaluate('window.__auditTravel753()')
  f().locator('[name="kind"]').select_option('travel');f().locator('[name="minutes"]').fill('60')
  f().locator('[name="memberIds"][value="pc-a"]').check()
  f().locator('[name="animalIds"][value="animal-pony-750"]').check()
  f().locator('[name="weatherSource"]').select_option('local');f().locator('[name="area"]').fill('Accident Valley');f().locator('[name="climate"]').select_option('subtropical')
  enc=f().locator('[name="encounterD100"]')
  if enc.count() and enc.is_visible() and enc.is_enabled():enc.fill('100')  # deterministic genuine test-die value, no GM encounter
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
   if not fi and 'Encounter · rozhodnutí GM' in page.locator('[data-episode-checklist]').inner_text():
    f().locator('[name="encounterResolution"]').select_option('no-consequence');continue
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
  fin.click(timeout=3500);after=state()
  assert after['clock']==after['storedClock']==540,after
  assert after['health']['wounds']==[],'injury before its original Skill Test'
  assert len([x for x in after['journal'] if x['travel']])==1,after['journal']
  print('DEBUG committed journal',json.dumps(after['journal'],ensure_ascii=False)[:2400],flush=True)
  assert any(h.get('externalMedicalPending') is True for row in after['journal'] for h in (row.get('travel') or [])),after['journal']
  print('PASS confirmed accident episode and isolated clock 480->540',flush=True)
  # Navigate by the GM-facing original Accident button, not by creating any Combat.
  go=page.locator('[data-episode-open-accident]');assert go.count(),page.locator('body').inner_text()[-900:]
  go.first.click(timeout=3500)
  medical=page.locator('form[data-skill-physical-impact]');assert medical.count()==1,(page.locator('body').inner_text()[-1000:])
  print('DEBUG MEDICAL NAV',page.evaluate("""()=>({medicalVisible:!!document.querySelector('form[data-skill-physical-impact]')?.getClientRects().length,sourceHidden:document.querySelector('[data-hmk-followup-source-598]')?.hidden,picker:document.querySelector('[data-hmk-followup-choice-598]')?.value,options:[...document.querySelectorAll('[data-hmk-followup-choice-598] option')].map(x=>[x.value,x.textContent?.slice(0,50)]),formEntry:document.querySelector('form[data-skill-physical-impact]')?.dataset.hmkFollowupEntry598,insideSource:!!document.querySelector('[data-hmk-followup-source-598] form[data-skill-physical-impact]'),allMedicalForms:document.querySelectorAll('form[data-skill-physical-impact]').length,path:(()=>{let n=document.querySelector('form[data-skill-physical-impact]');return [...Array(6)].map(()=>{const x=n?.tagName+' '+(n?.id||'')+' '+(n?.className||'')+' '+(n?.getAttribute('data-skill-section')||'');n=n?.parentElement;return x})})(),displayHTML:document.querySelector('[data-hmk-followup-display-598]')?.innerHTML.slice(0,100)})"""),flush=True)
  assert medical.is_visible(), 'Health form did not become visible directly on clicking Travel Accident link'

  assert medical.locator('[name="hazardD10"]').input_value()=='5'
  target=medical.locator('[name="targetId"]');target.select_option('animal-pony-750')
  medical.locator('[name="agilityD100"]').fill('100')
  assert not medical.locator('[data-hsk-hazard-impact]').is_hidden(),'Impact fields not enabled for failed Agility'
  for name,value in [('impactDie',1),('zoneD10',2),('locationD10',2),('shockD100',100)]:medical.locator('[name="'+name+'"]').fill(str(value))
  beforeHealth=state()
  assert beforeHealth['clock']==540 and not beforeHealth['health']['wounds']
  medical.locator('[type="submit"]').click(timeout=3500)
  following=state()
  print('DEBUG HEALTH OUT',medical.locator('output').all_inner_texts(),flush=True)
  print('DEBUG HEALTH JOURNAL',json.dumps(following['journal'],ensure_ascii=False)[:3600],flush=True)
  assert following['clock']==following['storedClock']==540,'accident health followup incorrectly shifts time'
  assert len(following['animalHealth']['wounds'])==1,'confirmed horse wound missing'
  assert len([x for x in following['journal'] if x['injury']])==1,'no unique injury proof'
  assert following['combat']==beforeHealth['combat'],'Accident auto spawned Combat!'
  assert following['health']['wounds']==[],'Accident changed the guide instead of the chosen animal'
  assert following['journal'][-1]['injury'] and following['journal'][-1]['injury']['actorId']=='animal-pony-750'
  print('PASS accident health saved once, no additional minutes and no combat',flush=True)
  page.screenshot(path=str(root/'docs/AUDIT_v93.753_animal_shock_confirmed.png'),full_page=False)
  assert following['animalHealth']['shock']=='UNC', 'Expected UNC from S2 neck/head and CF Shock'
  page.evaluate('window.__auditAnimalHealth753()')
  care=page.locator('#hmk-treatment-form');assert care.count() and care.is_visible(), 'Animal original Treatment form unavailable'
  w=care.locator('[name="wound"] option').first.get_attribute('value');care.locator('[name="wound"]').select_option(w)
  care.locator('[name="untreated"]').check();prior=state();care.locator('[type="submit"]').click(timeout=10000)
  assert state()['clock']==prior['clock']==540, 'Treatment affected clock'
  print('PASS pony original untreated decision, no time',flush=True)
  # A GM-confirmed rest episode advances ten minutes, exactly once.
  page.evaluate('window.__auditTravel753()')
  ff=page.locator('#hmk-time-episode-form');ff.locator('[name="kind"]').select_option('rest');ff.locator('[name="minutes"]').fill('10')
  member=ff.locator('[name="memberIds"][value="pc-a"]');
  if member.count() and not member.is_checked():member.check()
  safe=ff.locator('[name="weatherSafeShelter"]')
  if safe.count() and not safe.is_checked():safe.check()
  ff.locator('[data-episode-evaluate]').click(timeout=12000)
  for j in range(18):
   if page.locator('[data-episode-finalize]').is_enabled():break
   ffield=ff.get_attribute('data-episode-problem-field') or '';err=ff.get_attribute('data-episode-problem') or ''
   print('PONY REST 10',j,ffield,err[:180],flush=True)
   if ffield=='confirmed':ff.locator('[name="confirmed"]').check();continue
   if not ffield and 'Potvrzení GM' in page.locator('[data-episode-checklist]').inner_text():ff.locator('[name="confirmed"]').check();continue
   if ffield in ['temperatureD10','precipitationD10','precipitationD6']:
    ff.locator('[name="'+ffield+'"]').fill({'temperatureD10':'5','precipitationD10':'10','precipitationD6':'6'}[ffield]);continue
   raise AssertionError('Pony rest blocked '+ffield+' '+err)
  assert page.locator('[data-episode-finalize]').is_enabled(),'Pony +10 rest not ready'
  pre=state();page.locator('[data-episode-finalize]').click(timeout=12000)
  assert state()['clock']==state()['storedClock']==550 and pre['clock']==540,'Pony +10 calendar incorrect'
  page.evaluate('window.__auditAnimalHealth753()')
  sh=page.locator('form[data-weather-shock-followup]');assert sh.count() and sh.is_visible(), 'Pony due Shock form absent'
  print('PONY SHOCK FORM',page.locator('section.hmk-weather-shock-followup').inner_text()[:500],flush=True)
  assert sh.locator('[name="comaLocationShock"]').input_value() in ['5','2','4','3','1']
  assert sh.locator('[name="comaInjuryLevel"]').input_value()==str(state()['animalHealth']['wounds'][0]['level'])
  sh.locator('[name="roll"]').fill('100');sh.locator('[name="initialComaD10"]').fill('1')
  beforeShock=state();sh.locator('[type="submit"]').click(timeout=12000);afterShock=state()
  assert afterShock['clock']==beforeShock['clock']==550,'Pony Shock moved clock'
  assert afterShock['animalHealth']['coma'] and afterShock['animalHealth']['extendedShock'],'Pony CF did not create true Coma and Extended Shock'
  print('PASS pony Shock after 10 minutes with derived B-anatomy, Coma, Extended, original health, no Combat',flush=True)
  def pony_rest_to(target):
   previous=state()['clock'];assert target>previous
   page.evaluate('window.__auditTravel753()')
   ff=page.locator('#hmk-time-episode-form');ff.locator('[name="kind"]').select_option('rest');ff.locator('[name="minutes"]').fill(str(target-previous))
   member=ff.locator('[name="memberIds"][value="pc-a"]')
   if member.count() and not member.is_checked():member.check()
   shelter=ff.locator('[name="weatherSafeShelter"]')
   if shelter.count() and not shelter.is_checked():shelter.check()
   ff.locator('[data-episode-evaluate]').click(timeout=12000)
   for j in range(25):
    ff=page.locator('#hmk-time-episode-form')
    if page.locator('[data-episode-finalize]').is_enabled():break
    fld=ff.get_attribute('data-episode-problem-field') or '';problem=ff.get_attribute('data-episode-problem') or ''
    print('PONY REST',previous,'->',target,j,repr(fld),problem[:170],flush=True)
    if not fld and 'Encounter · rozhodnutí GM' in page.locator('[data-episode-checklist]').inner_text():
     ff.locator('[name="encounterResolution"]').select_option('no-consequence');continue
    if fld=='confirmed':ff.locator('[name="confirmed"]').check();continue
    if fld in ['temperatureD10','precipitationD10','precipitationD6']:
     ff.locator('[name="'+fld+'"]').fill({'temperatureD10':'5','precipitationD10':'10','precipitationD6':'6'}[fld]);continue
    if not fld and 'Potvrzení GM' in page.locator('[data-episode-checklist]').inner_text():ff.locator('[name="confirmed"]').check();continue
    raise AssertionError('PONY REST blocker '+repr((previous,target,fld,problem[:300])))
   assert page.locator('[data-episode-finalize]').is_enabled(),(previous,target)
   assert state()['clock']==previous
   page.locator('[data-episode-finalize]').click(timeout=12000)
   final=state();assert final['clock']==final['storedClock']==target,(previous,target,final['clock'])
   print('PASS pony calendar confirm',previous,'->',target,flush=True)
  def pony_course(kind,roll,period=None):
   page.evaluate('window.__auditAnimalHealth753()')
   el=page.locator('form[data-weather-trauma-course]')
   print('PONY COURSE FORM',kind, el.count(),page.locator('body').inner_text()[-700:],flush=True)
   assert el.count() and el.is_visible(),'Pony required due Course unavailable'
   assert el.locator('[name="kind"]').input_value()==kind, 'Wrong due Course'
   el.locator('[name="roll"]').fill(str(roll))
   if kind=='coma':
    el.locator('[name="restfulShelter"]').select_option('yes')
    if period is not None:el.locator('[name="periodD10"]').fill(str(period))
   prev=state();el.locator('[type="submit"]').click(timeout=12000);after=state()
   assert after['clock']==prev['clock'],'Pony medical Course advanced time'
   assert len(after['animalHealth']['events'])==len(prev['animalHealth']['events'])+1,'Pony course missing ledger event'
   print('PASS pony',kind,'Course at',after['clock'],flush=True)
  pony_rest_to(790)
  pony_course('extended-shock',5)
  assert state()['animalHealth']['extendedShock'] is None
  # The next original Coma deadline is exactly one printed d10 day. It
  # must never be advanced by a health roll; GM supplies food and water.
  print('PONY BEFORE DAY',str(page.evaluate('window.__auditAnimalAgenda753()'))[:1400],flush=True)
  page.evaluate('window.__auditAnimalProvision753()')
  intake=page.locator('form[data-provision-assisted-intake]')
  print('PONY ASSISTED INTAKE',intake.count(),intake.locator('[name="startMinute"]').input_value() if intake.count() else page.locator('body').inner_text()[-500:],flush=True)
  assert intake.count() and intake.is_visible(),'Pony true assisted intake acknowledgement absent'
  intake.locator('[name="foodAccepted"]').check()
  intake.locator('[name="waterAccepted"]').check()
  intake.locator('[name="caregiver"]').fill('Testovací ošetřovatel z družiny')
  intake.locator('[name="reason"]').fill('GM skutečně potvrdil asistované jídlo a vodu pro tuto konkrétní denní uzávěrku ze zajištěných zdrojů.')
  p=state();intake.locator('[type="submit"]').click(timeout=12000)
  assert state()['clock']==p['clock']==790,'Pony feeding proof moved time'
  print('PASS pony GM assisted real nutrition without time',flush=True)
  pony_rest_to(1990)
  pony_course('coma',5,period=1)
  assert state()['animalHealth']['coma'] is None and state()['animalHealth']['extendedShock'] is None
  print('PASS pony original coma cured by next-day Course',flush=True)
  page.evaluate('window.__auditAnimalHealth753()')
  morale=page.locator('form[data-weather-injury-morale]')
  print('PONY MORALE',morale.count(),page.locator('body').inner_text()[:750],flush=True)
  if morale.count():
   assert morale.is_visible() and morale.locator('[type="submit"]').is_enabled(),'Pony Morale must be possible without Combat'
   morale.locator('[name="aberrance"]').fill('0')
   morale.locator('[name="roll"]').fill('31')
   p=state();morale.locator('[type="submit"]').click(timeout=12000)
   assert state()['clock']==p['clock']==1990,'Pony Morale advanced clock'
   print('PASS pony required original Injury Morale, no Combat or time',flush=True)
  # A further GM-confirmed Travel interval is required to establish the
  # calendar no longer stays locked after the original pony Shock/Coma.
  pony_rest_to(2050)
  print('PASS pony next confirmed episode after Coma and Extended',flush=True)
  for later in (3430,4870,6310,7740):
   pony_rest_to(later)
  page.evaluate('window.__auditAnimalHealth753()')
  healing=page.locator('#hmk-healing-roll-form')
  assert healing.count() and healing.is_visible(),'Pony due Healing form not available'
  assert healing.locator('[name="daySinceInjury"]').input_value()=='5','Pony actual 5-day clock mismatch'
  assert healing.locator('[name="endurance"]').input_value()=='12' and healing.locator('[name="endurance"]').get_attribute('readonly') is not None,'Pony END must derive from Character State'
  assert healing.locator('[name="will"]').input_value()=='12' and healing.locator('[name="will"]').get_attribute('readonly') is not None,'Pony WIL must derive from Character State'
  healing.locator('[name="roll"]').fill('20')
  prior=state();healing.locator('[type="submit"]').click(timeout=12000);aft=state()
  assert aft['clock']==prior['clock']==7740,'Pony Healing roll shifted clock'
  assert len(aft['animalHealth']['events'])==len(prior['animalHealth']['events'])+1,'Pony Healing proof missing'
  print('PASS pony original 5-day Healing recorded once, without time',flush=True)
  pony_rest_to(7800)
  print('PASS pony full continuous scenario through Healing and subsequent GM travel 7740->7800',flush=True)
  assert not errs,errs
 except Exception as e:
  print('FAIL',type(e).__name__,str(e)[:1200],flush=True);traceback.print_exc()
  try:page.screenshot(path=str(root/'docs/AUDIT_v93.753_animal_shock_fail.png'),full_page=False)
  except:pass
  sys.exit(1)
 finally:
  (root/'docs/AUDIT_v93.753_animal_shock_trace.json').write_text(json.dumps({'steps':log,'errors':errs},ensure_ascii=False,indent=2),encoding='utf8')
  b.close()
