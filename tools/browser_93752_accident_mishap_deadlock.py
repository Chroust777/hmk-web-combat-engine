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
 const actor={id:'pc-a',name:'Průvodce',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{id:'skill-sur',name:'Survival',ml:70},{id:'skill-end',name:'Endurance',ml:60},{id:'skill-shock',name:'Shock',ml:65}],healthState:health.initialCombatState()}};
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
window.__auditRenderHealth752=()=>{selected='pc-a';view='sheet';activeSheetSection='hazards';document.getElementById('app').innerHTML=hskWeatherHealthConsequences('pc-a')+hskEnvironmentalWoundCarePanel(character('pc-a'));};
window.__auditFullHealth752=()=>({minute:data.campaignClock.minute,agenda:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory),state:structuredClone(persistentStateOf(character('pc-a')))});
'''
modules['app.js']=mod
bundle=marker+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
log=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1450,'height':940});errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:d.accept())
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
   if fi=='encounterD100':val=1
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
  for name,value in [('impactDie',6),('zoneD10',2),('locationD10',2),('shockD100',100)]:medical.locator('[name="'+name+'"]').fill(str(value))
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
  page.screenshot(path=str(root/'docs/AUDIT_v93.751_accident_shock_cf_confirmed.png'),full_page=False)
  # Exercise the original Travel Health component and its actual delegated submit handler.
  page.evaluate('window.__auditRenderHealth752()')
  mishap=page.locator('form[data-weather-injury-mishap]')
  assert mishap.count()==1 and mishap.is_visible(), 'Accident automatic Mishap not offered outside Combat'
  assert mishap.locator('[name="roll"]').count()==0, 'Automatic Fumble must not ask for a fictitious d100'
  pre=state();mishap.locator('[type="submit"]').click(timeout=8000)
  post=state()
  print('HEALTH MISHAP',post['health'].get('mishaps'),post['clock'],flush=True)
  assert post['clock']==pre['clock']==540,'Mishap changed time'
  assert post['health']['mishaps'] and all(x['resolved'] for x in post['health']['mishaps']),'Mishap did not resolve'
  assert len(post['journal'])==len(pre['journal'])+1,'Mishap must add exactly one receipt'
  page.evaluate('window.__auditRenderHealth752()')
  treatment=page.locator('form#hmk-treatment-form')
  print('HEALTH POST-MISHAP forms',page.locator('form').count(),[x.get_attribute('id') for x in page.locator('form').all()],flush=True)
  assert treatment.count()==1,'GM lacks Treatment/Untreated choice while UNC Shock pending: calendar deadlock'
  assert page.locator('form[data-weather-shock-followup]').count()==1, 'UNC shock follow-up lost after Mishap'
  assert not page.locator('form[data-weather-shock-followup] [name="roll"]').is_enabled(), 'Shock prematurely rollable before 10 minutes'
  print('PASS Chromium: mandatory Mishap and parallel Shock + Treatment, unchanged clock',flush=True)
  assert not errs,errs
 except Exception as e:
  print('FAIL',type(e).__name__,str(e)[:1200],flush=True);traceback.print_exc()
  try:page.screenshot(path=str(root/'docs/AUDIT_v93.751_accident_shock_cf_fail.png'),full_page=False)
  except:pass
  sys.exit(1)
 finally:
  (root/'docs/AUDIT_v93.751_accident_shock_cf_trace.json').write_text(json.dumps({'steps':log,'errors':errs},ensure_ascii=False,indent=2),encoding='utf8')
  b.close()
