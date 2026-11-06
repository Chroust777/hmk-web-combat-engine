"""Local, isolated real-Chromium multi-episode commit smoke test, v93.747.
Manual dice are deterministic synthetic GM inputs. No live campaign or cloud.
"""
from pathlib import Path
import json,re,sys,traceback
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf-8'); marker='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(marker):])
modules['app.js']+='''
window.__auditSeed747=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const state=require('./src/integration/persistent-combat-state.js');
 const pcs=['pc-a','pc-b','pc-c'].map((id,i)=>({id,name:['Průvodce','Cestovatel','Sběrač'][i],kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{id:'skill-sur',name:'Survival',ml:70},{id:'skill-end',name:'Endurance',ml:60}],healthState:state.initialCombatState()}}));
 const cal=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'E2E několikadenní pochod',eventId:'seed',gmConfirmed:true,campaignId:'audit747',characterIds:pcs.map(c=>c.id)});
 data=clean();data.characters=pcs;data.inventory=[];data.campaignClock=cal;data.journal=[];
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__auditState747=()=>({clock:data.campaignClock.minute,persistedClock:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute,
 episodes:data.journal.filter(x=>x.calendarTimeEpisode).map(x=>({id:x.id,minute:x.campaignMinute,start:x.calendarTimeEpisode.startMinute,end:x.calendarTimeEpisode.endMinute,kind:x.calendarTimeEpisode.kind,
 participants:x.calendarTimeEpisode.memberIds,meters:x.calendarTimeEpisode.distanceMeters,
 actors:x.calendarTimeEpisode.actors.map(a=>({id:a.id,weariness:a.delta,before:a.before,after:a.after,roll:a.roll})),
 weatherSourceId:x.calendarTimeEpisode.weatherDailySourceId,
  outcome:x.calendarTimeEpisode.orientation?.level,modes:x.calendarTimeEpisode.orientation?.modes,
  hazard:x.calendarTimeEpisode.survivalHazard,watchfulness:x.calendarTimeEpisode.trekWatchfulness})),
 journalCount:data.journal.length,persistedJournalCount:JSON.parse(localStorage.getItem(STORAGE)).journal.length,
 actorFatigue:data.characters.map(c=>({id:c.id,fatigue:persistentStateOf(c).fatigue})),
 sidecarExists:!!localStorage.getItem(EPISODE_SIDECAR_KEY)});
'''
bundle=marker+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
log=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1490,'height':960});errors=[];dialogs=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.on('dialog',lambda d:(dialogs.append((d.type,d.message)),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map();const store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store});}''')
 for style in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/style).read_text(encoding='utf-8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__auditSeed747()')
 def state():return page.evaluate('window.__auditState747()')
 def current():return page.locator('#hmk-time-episode-form')
 def fill(name,value):
  jump=page.locator('[data-episode-jump="'+name+'"]')
  if jump.count():jump.first.click()
  x=current().locator('[name="'+name+'"]')
  x.fill(str(value),timeout=7000)
 def skill(roll=31):
  tasks=page.locator('[data-episode-skill-task]')
  assert tasks.count(),f'No skill button: {current().get_attribute("data-episode-problem")}'
  t=tasks.first;role=t.get_attribute('data-episode-skill-task');actor=t.get_attribute('data-episode-skill-actor')
  t.click();assert page.locator('#skill-value-form').count()==1,(role,actor)
  f=page.locator('#skill-value-form');assert f.locator('[name="primary"]').input_value()==role,(role,f.locator('[name="primary"]').input_value())
  f.locator('[name="rollA"]').fill(str(roll));before=state()
  f.locator('[type="submit"]').click();after=state()
  assert before['persistedClock']==after['persistedClock'] and before['persistedJournalCount']==after['persistedJournalCount'], 'Staged Skill Test was durably committed!'
  page.locator('[data-episode-return]').first.wait_for(timeout=8000)
  page.locator('[data-episode-return]').first.click()
  log.append({'skill':role,'actor':actor,'manualD100':roll})
 def run(kind,minutes,weather=(5,10),survivalRoll=31):
  before=state();assert before['clock']==before['persistedClock'], 'bad opening clock'
  f=current();assert f.count()==1
  f.locator('[name="kind"]').select_option(kind)
  f.locator('[name="minutes"]').fill(str(minutes))
  for pid in ['pc-a','pc-b','pc-c']:
   x=f.locator('[name="memberIds"][value="'+pid+'"]')
   if not x.is_checked():x.check()
  source=f.locator('[name="weatherSource"]')
  # Already confirmed daily area weather, if any, is reused; after midnight new rolls are mandatory.
  opts=source.locator('option').evaluate_all('(os)=>os.map(x=>({value:x.value,text:x.textContent}))')
  existing=[x for x in opts if x['value']!='local']
  if existing:source.select_option(existing[0]['value'])
  else:
   source.select_option('local')
   f.locator('[name="area"]').fill('Testovací oblast')
   f.locator('[name="climate"]').select_option('subtropical')
  if kind in ['rest','sleep']:
   if not f.locator('[name="weatherSafeShelter"]').is_checked():f.locator('[name="weatherSafeShelter"]').check()
  else:
   if f.locator('[name="weatherSafeShelter"]').is_checked():f.locator('[name="weatherSafeShelter"]').uncheck()
  assert state()['clock']==before['clock'] and state()['persistedJournalCount']==before['persistedJournalCount'], 'Draft modified campaign'
  f.locator('[data-episode-evaluate]').click()
  actions=[]
  for iteration in range(55):
   f=current();fin=page.locator('[data-episode-finalize]')
   if fin.is_enabled():break
   field=f.get_attribute('data-episode-problem-field') or ''
   issue=f.get_attribute('data-episode-problem') or ''
   if field in ['orientationProofId','trackingProofId','trackingAwarenessProofId'] or (field.startswith('whProof_')):
    skill(survivalRoll);actions.append('skill '+field);continue
   if field=='temperatureD10':val=weather[0]
   elif field=='precipitationD10':val=weather[1]
   elif field=='precipitationD6':val=6
   elif field=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',issue);n=int(m.group(1)) if m else 1
    val=','.join('1' for _ in range(n))
   elif field=='directionD10':val='1'
   elif field.startswith('end_'):val='5'
   elif field.startswith('whRoll_cold_'):val='1'
   elif field.startswith('whRoll_heat_'):
    val=10
    input_el=f.locator('[name="'+field+'"]');val=min(val,int(input_el.get_attribute('max') or '10'))
   elif field=='forageD10':val=10
   elif not field and 'Encounter · rozhodnutí GM' in page.locator('[data-episode-checklist]').inner_text():
    f.locator('.hc-episode-encounter > summary').click()
    f.locator('[name="encounterResolution"]').select_option('no-consequence')
    actions.append('GM encounter: no-further-action');continue
   elif field=='survivalD10':val=7
   elif field.startswith('hazard') or (not field and 'Hazard · complication' in page.locator('[data-episode-checklist]').inner_text()):
    print('HAZARD CHOICE',field,issue[:200],flush=True)
    jump=page.locator('[data-episode-jump="hazardComplicationSkill"]')
    if jump.count():jump.first.click()
    f.locator('[name="hazardComplicationDecision"]').select_option('reroute',timeout=7000)
    actions.append('GM CF reroutes');continue
   elif not field and 'Potvrzení GM' in page.locator('[data-episode-checklist]').inner_text():
    f.locator('[name="confirmed"]').check();actions.append('gm-confirm');continue
   else:
    raise AssertionError(f'Cannot resolve {kind}/{minutes} at {iteration}: field={field!r}; issue={issue!r}; checklist={page.locator("[data-episode-checklist]").inner_text()[:750]}')
   fill(field,val);actions.append(f'{field}={val}')
  else:raise AssertionError('Exceeded tasks')
  assert fin.is_enabled(),(kind,minutes,actions)
  at_preview=state();assert at_preview['clock']==before['clock'] and at_preview['persistedClock']==before['clock']
  assert at_preview['persistedJournalCount']==before['persistedJournalCount'], 'Dice leaked into durable storage before confirmation'
  fin.click();after=state()
  assert after['clock']==before['clock']+minutes,(kind,before,after,dialogs[-2:])
  assert after['clock']==after['persistedClock'] and after['journalCount']==after['persistedJournalCount'], 'Commit not stored atomically'
  assert len(after['episodes'])==len(before['episodes'])+1,(kind,len(before['episodes']),len(after['episodes']))
  assert len(after['episodes'][-1]['participants'])==3,(kind,after['episodes'][-1])
  assert after['episodes'][-1]['kind']==kind
  assert not after['sidecarExists'], 'Uncommitted sidecar survived successful GM commit'
  print(f'PASS {kind:7s} {minutes:4d}m clock {before["clock"]:5d}->{after["clock"]:5d}, receipts {before["persistedJournalCount"]}->{after["persistedJournalCount"]}, steps={len(actions)}',flush=True)
  log.append({'kind':kind,'minutes':minutes,'from':before['clock'],'to':after['clock'],'steps':actions,'state':after})
  return after
 try:
  seen={}
  for label,roll in [('S',31),('CS',10),('F',91),('CF',95)]:
   page.evaluate('window.__auditSeed747()')
   after=run('travel',60,survivalRoll=roll)
   e=after['episodes'][-1]
   assert e['outcome']==label,(label,e)
   assert len(e['participants'])==3
   seen[label]={'level':e['outcome'],'modes':e['modes'],'hazard':e['hazard'],'watchfulness':e['watchfulness'],
    'receipts':after['persistedJournalCount'],'manualD100':roll}
   print('PASS outcome',label,'roll',roll,'modes',e['modes'],'hazard',e['hazard'],flush=True)
  assert set(seen)=={'S','CS','F','CF'}
  log.append({'allLevels':seen})
  page.screenshot(path=str(root/'docs/AUDIT_CESTOVANI_v93.747_outcomes_confirm.png'),full_page=False)
  print('PASS all four Survival levels from actual UI to GM-confirmed commit',flush=True)
 except Exception as e:
  print('FAIL',type(e).__name__,str(e)[:1400],flush=True)
  traceback.print_exc()
  if current().count():
   print('FORM ERROR',current().get_attribute('data-episode-problem'),current().get_attribute('data-episode-problem-field'),flush=True)
   print('CHECKLIST',page.locator('[data-episode-checklist]').inner_text()[:1000],flush=True)
  try:page.screenshot(path=str(root/'docs/AUDIT_CESTOVANI_v93.747_failure.png'),full_page=False)
  except:pass
  sys.exit(1)
 finally:
  (root/'docs/AUDIT_CESTOVANI_v93.747_outcomes_trace.json').write_text(json.dumps({'log':log,'errors':errors,'dialogs':dialogs},ensure_ascii=False,indent=2),encoding='utf-8')
  print('BROWSER ERRORS',errors[:3],flush=True)
  browser.close()
