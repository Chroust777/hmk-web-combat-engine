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
 const actor={id:'pc-a',name:'Průvodce',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{id:'skill-sur',name:'Survival',ml:70},{id:'skill-end',name:'Endurance',ml:60},{id:'skill-shock',name:'Shock',ml:65},{id:'skill-physician',name:'Physician',ml:85}],healthState:health.initialCombatState()}};
 const horse={id:'animal-pony-750',name:'Poník',kind:'NPC',hmk:{verifiedMountedBreed:'pony',attributes:{agl:12,str:20,end:12,wil:12},skills:[{id:'skill-pony-initiative-753',name:'Initiative',ml:60}],healthState:health.initialCombatState()}};
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Accident 750 E2E',eventId:'seed',gmConfirmed:true,campaignId:'audit750',characterIds:[actor.id,horse.id]});
 data=clean();data.characters=[actor,horse];data.inventory=[];const band=item('hmk:gear:hmk-p120-004');data.inventory.push({id:'actual-bandages',characterId:'pc-a',sourceItemId:band.id,snapshot:structuredClone(band),quantity:32,slot:'carried'});data.campaignClock=clock;data.journal=[];
 const wd=require('./src/integration/hmk-trekking-routine.js').trekWeatherDay({season:'spring',climate:'cool',temperatureD10:5,precipitationD10:5,landscape:'flat'});
 const cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(clock);
 data.journal.push({id:'animal-global-weather',characterId:'pc-a',calendarCampaignId:cid,campaignMinute:clock.minute,createdAt:stamp(),title:'HMK · Denní počasí · Accident Valley',body:'Weather test',calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:Math.floor(clock.minute/1440),area:'Accident Valley',season:'spring',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay:wd,diceOrigins:['manual','manual'],uniquenessPolicy:'area-day-v93.620'}});
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
window.__auditEdgeFixture=()=>{const a=character('animal-pony-750');const w=a.hmk.healthState.wounds[0];if(!w)throw Error('Missing real original injury');w.aspect='e';storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);return {id:w.id,aspect:w.aspect,level:w.level};};
window.__auditProvisionEveryone=()=>{const C=require('./src/integration/hmk-calendar-multi-campaign.js'),N=require('./src/integration/hmk-nutrition-days.js');const cid=C.campaignKey(data.campaignClock);return mutate(()=>{for(const a of data.characters)data.journal.push({id:uuid(),characterId:a.id,calendarCampaignId:cid,campaignMinute:data.campaignClock.minute,createdAt:stamp(),title:'GM: zajištěná potrava a voda',body:'GM potvrdil mimo aplikaci skutečné dlouhodobé zásobování',calendarNutritionPolicy:N.createNutritionPolicy({campaignId:cid,minute:data.campaignClock.minute,actorId:a.id,autoNeeds:true,gmProvisioned:true})})});};
window.__auditAdvance=delta=>{try{const C=require('./src/integration/hmk-campaign-calendar.js');const n=C.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:delta,eventId:uuid(),reason:'GM potvrzený audit léčby zvířete',gmConfirmed:true,characters:data.characters,journal:data.journal,inventory:data.inventory});const ok=mutate(()=>{data.campaignClock=n;applyDeterministicCalendarOnsets();},{gmClockAdvance:true});return {ok:!!ok,minute:data.campaignClock.minute};}catch(e){return {error:e.message}}};
window.__auditProceduresHTML=()=>{document.getElementById('app').innerHTML=concurrentMedicalProceduresHTML({actorId:'animal-pony-750'});return document.getElementById('app').textContent.slice(0,400);};
window.__auditTreatmentStatus=()=>({clock:data.campaignClock.minute,concurrent:require('./src/integration/hmk-concurrent-procedures.js').openConcurrentProcedures(data.campaignClock),inventory:data.inventory.map(x=>[x.id,x.quantity,x.characterId]),journal:data.journal.filter(x=>x.hmkBandageUse).map(x=>x.hmkBandageUse),shock:persistentStateOf(character('animal-pony-750')).shock,healing:persistentStateOf(character('animal-pony-750')).wounds.map(w=>w.healing)});

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
  if n=='__old_hazardAtMinute':
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
  for recipient in ('pc-a',):
   page.evaluate("window.__auditAnimalProvision753",recipient)
   grant=page.locator('[data-provision-assure="yes"][data-actor-id="'+recipient+'"]')
   print('START PROVISION',recipient,grant.count(),grant.is_enabled() if grant.count() else 'missing',flush=True)
   assert grant.count() and grant.is_enabled(),'GM start source cannot be attested'
   grant.click(timeout=12000)
   assert state()['clock']==480,'GM food-source acknowledgement moved time'
  page.evaluate('window.__auditTravel753()')
  page.locator('[data-shared-window-minutes]').fill('60');page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click()
  row=page.locator('[data-shared-plan-card]').last;row.locator('[data-shared-row-actor]').select_option('pc-a')
  row=page.locator('[data-shared-plan-card]').last;row.locator('[data-shared-plan-kind]').select_option('travel')
  page.locator('[data-shared-row-run]').click()
  if f().locator('[name="animalIds"][value="animal-pony-750"]').count():f().locator('[name="animalIds"][value="animal-pony-750"]').check()
  print('NEW PLAN',page.evaluate('''()=>({formVisible:!!document.querySelector('#hmk-time-episode-form')?.getClientRects().length,animals:[...document.querySelectorAll('[name=animalIds]')].map(x=>[x.value,x.checked]),weather:[...document.querySelectorAll('[name=weatherSource] option')].map(x=>x.value)})'''),flush=True)
  enc=f().locator('[name="encounterD100"]')
  if enc.count() and enc.is_visible() and enc.is_enabled():enc.fill('100')  # deterministic genuine test-die value, no GM encounter
  # Keep the default Encounter rule active; use a genuine low d100 to test the no-Encounter branch.
  f().locator('[data-episode-evaluate]').click();before=state()
  for i in range(55):
   fi=field();problem=issue();fin=page.locator('[data-episode-window-stage]')
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
   elif fi=='__old_hazardAtMinute':val=60
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
  fin.click(timeout=3500);page.locator('[data-episode-window-commit]').click(timeout=3500);after=state()
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
  for name,value in [('impactDie',1),('zoneD10',2),('locationD10',2),('shockD100',10)]:medical.locator('[name="'+name+'"]').fill(str(value))
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

  print('SYNTHETIC EDGE TREATMENT FIXTURE',page.evaluate('window.__auditEdgeFixture()'),flush=True)
  page.evaluate('window.__auditAnimalHealth753()')
  care=page.locator('#hmk-treatment-form'); assert care.count() and care.is_visible(), 'No animal Treatment form'
  options=care.locator('[name="healerId"] option').evaluate_all('(nodes)=>nodes.map(x=>[x.value,x.textContent])')
  print('ANIMAL HEALERS',options,flush=True)
  print('ANIMAL CARE SELECT',care.locator('[name="wound"]').input_value(),flush=True)
  assert any(o[0]=='pc-a' for o in options),'Healthy skilled healer not available for real treatment'
  care.locator('[name="healerId"]').select_option('pc-a')
  print('AFTER HEALER CHOICE',care.inner_text()[-1300:],flush=True)
  # Healing needs an actual Treatment roll. The form shall start a timed
  # procedure; no inventory deduction should happen on merely opening it.
  care.locator('details.hmk-care-advanced summary').click()
  care.locator('[name="available"]').select_option(['water','needle-thread'])
  care.locator('[name="physicianRoll"]').fill('20')
  before=state()
  assert before['clock']==540
  care.locator('[type="submit"]').click(timeout=9000)
  after=state()
  print('AFTER TREATMENT CLICK',page.evaluate('window.__auditTreatmentStatus()'),page.locator('body').inner_text()[-750:],flush=True)
  band_start=page.evaluate('window.__auditTreatmentStatus()')
  print('BANDAGE AFTER START',band_start['inventory'],band_start['journal'],flush=True)
  page.evaluate('window.__auditAnimalHealth753()')
  repeat=page.locator('#hmk-treatment-form')
  if repeat.count():
   option_values=repeat.locator('[name=wound] option').evaluate_all('(xs)=>xs.map(x=>x.value)')
   active_wound=page.evaluate('window.__auditTreatmentStatus()')['journal'][0]['woundId']
   assert not any(active_wound in x for x in option_values), 'Active timed Treatment offered the same wound for a second simultaneous start'
  print('PASS active Treatment not reoffered while procedure is running',flush=True)
  assert len(band_start['concurrent'])==1,'Treatment did not start'
  assert band_start['inventory'][0][1]==30 and len(band_start['journal'])==1 and band_start['journal'][0]['quantity']==2,'2 obvazy nebyly odepsány při zahájení'
  page.evaluate('window.__auditAnimalHealth753()')
  morale=page.locator('form[data-weather-injury-morale]')
  print('ANIMAL INJURY MORALE',morale.count(),flush=True)
  if morale.count():
   morale.locator('[name=aberrance]').fill('0')
   if morale.locator('[name=gmConfirmedAberrance]').count():morale.locator('[name=gmConfirmedAberrance]').check()
   # A missing, mandatory real dice roll must guide the user to this exact field.
   morale.locator('[name=roll]').fill('')
   morale.locator('[type=submit]').click(timeout=8000)
   focus=page.evaluate('document.activeElement?.name||""')
   marked=morale.locator('[name=roll]').evaluate('(x)=>x.matches(":invalid")||x.getAttribute("aria-invalid")==="true"||x.classList.contains("hsk-required-invalid")||x.closest("label")?.classList.contains("hsk-required-invalid")')
   assert focus=='roll' and marked, ('Missing Injury Morale d100 failed validation focus/highlight',focus,marked)
   morale.locator('[name=roll]').fill('20')
   morale.locator('[type=submit]').click(timeout=8000)
  attempt=page.evaluate('window.__auditAdvance(10)');print('ANIMAL TREATMENT CLOCK',attempt,flush=True)
  assert attempt.get('minute')==550,attempt
  page.evaluate('window.__auditProceduresHTML()')
  btn=page.locator('[data-concurrent-medical-finish]');print('ANIMAL FINISH',btn.count(),flush=True)
  assert btn.count()==1 and btn.is_enabled(),'Due Treatment not completable'
  btn.click(timeout=8000)
  complete=page.evaluate('window.__auditTreatmentStatus()')
  print('ANIMAL COMPLETE',complete,flush=True)
  assert not complete['concurrent'] and complete['healing'][0].get('treated'),'Animal Treatment did not finish'
  assert complete['inventory'][0][1]==30 and len(complete['journal'])==1,'Double bandage debit at completion'
  page.evaluate('window.__auditProvisionEveryone()')
  future=page.evaluate('window.__auditAdvance(7190)')
  print('ANIMAL FIVE-DAY ADVANCE',future,flush=True)
  assert future.get('minute')==7740,future
  page.evaluate('window.__auditAnimalHealth753()')
  healing=page.locator('#hmk-healing-roll-form')
  print('ANIMAL HEALING',healing.count(),healing.inner_text()[-450:] if healing.count() else page.locator('body').inner_text()[-700:],flush=True)
  assert healing.count() and healing.is_visible(),'Animal due Healing unavailable'
  healing.locator('[name=roll]').fill('20')
  healing.locator('[type=submit]').click(timeout=8000)
  healed=page.evaluate('window.__auditTreatmentStatus()')
  print('ANIMAL HEALING SAVED',healed,flush=True)
  assert healed['clock']==7740 and healed['healing'][0]['healedDay']==5,'Animal Healing not recorded'
  assert not errs,errs
  print('PASS browser: synthetic edge fixture, 2 physical bandages debited exactly once, healing, no Combat',flush=True)
 except Exception as e:
  print('FAIL',type(e).__name__,str(e)[:1200],flush=True);traceback.print_exc()
  try:page.screenshot(path=str(root/'docs/AUDIT_v93.753_animal_shock_fail.png'),full_page=False)
  except:pass
  sys.exit(1)
 finally:
  (root/'docs/AUDIT_v93.753_animal_shock_trace.json').write_text(json.dumps({'steps':log,'errors':errs},ensure_ascii=False,indent=2),encoding='utf8')
  b.close()
