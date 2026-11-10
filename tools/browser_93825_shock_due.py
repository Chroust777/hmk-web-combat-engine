"""Chromium UI / mouse clicks, recorded prerequisite health/weight fixture; no synthetic PASS for complete campaign generation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import re
import sys
import os
root=Path(__file__).resolve().parents[1]
EVIDENCE=Path(os.environ.get('HMK_AUDIT_EVIDENCE_DIR',str(root/'docs'/'AUDIT_v93.819_evidence')))
EVIDENCE.mkdir(parents=True,exist_ok=True)
raw=(root/'hmk-app.bundle.js').read_text('utf8'); pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
rawFixture=json.loads(json.loads((root/'tools/frost_g_fixture.json').read_text('utf8'))['hmk-keepers-ledger-v1'])['characters'][0]
rawFixture.update(id='b',name='Aktér B',kind='PC')
mods['app.js'] += "\nwindow.__realPatientFixture93820=()=>{const b=" + json.dumps(rawFixture,ensure_ascii=False,separators=(',',':')) + ";b.hmk.healthState=require('./src/integration/persistent-combat-state.js').initialCombatState();b.hmk.injuries=[];b.hmk.expedition={};data.characters.splice(data.characters.findIndex(c=>c.id==='b'),1,b);localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};\n"

seed+='''
window.__setTransportFixture93816=()=>{
 for(const c of data.characters){c.hmk.weight=c.id==='a'?'150 lb':c.id==='b'?c.hmk.weight:'170 lb';if(c.id==='a')c.hmk.skills.push({id:'riding-a',name:'Riding',ml:65},{id:'animalcraft-a',name:'Animalcraft',ml:75});}
 // The patient is explicitly medically incapacitated; health data are shared,
 // but this UI fixture is NOT claiming a real combat-derived injury.
 data.characters.find(c=>c.id==='b').hmk.healthState.shock='INC';
 const T=require('./src/integration/hmk-trekking-routine.js');
 const hot=T.trekWeatherDay({season:'summer',climate:'wet-tropical',temperatureD10:10,precipitationD10:10,landscape:'flat'});
 const weather=data.journal.find(j=>j.calendarTrekDayWeather);
 weather.calendarTrekDayWeather.weatherDay=hot;
 weather.calendarTrekDayWeather.season='summer';weather.calendarTrekDayWeather.climate='wet-tropical';
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__mountRiderFixture93816=(horseId)=>{
 const cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);
 const w=stableRiderWeight584(character('a'));
 if(!w.ready)throw Error(w.reason);
 const proof={format:'hmk-stable-hub-574',animalId:horseId,ownerId:'a',type:'rider-mount',reason:'GM fixture: skutečné nasednutí doloženého jezdce',riderId:'a',
 riderWeightLb:w.totalLb,riderBodyLb:w.bodyLb,riderGearLb:w.gearLb,riderItems:w.items,riderWeightSource:'inventory-auto-584'};
 if(!mutate(()=>data.journal.push({id:uuid(),characterId:'a',calendarCampaignId:cid,campaignMinute:data.campaignClock.minute,
  createdAt:stamp(),title:'Stáj – nasednutí (fixture)',body:'Doložený jezdec připraven v testovacích datech',stableHub574:proof})))throw Error('rider fixture not committed');
 render();return proof;
};
window.__proofDebug93816=()=>({journal:data.journal.slice(-6).map(j=>({id:j.id,title:j.title,characterId:j.characterId,keys:Object.keys(j).filter(k=>/skill|roll|test/i.test(k))})),proofSelect:document.querySelector('[name=droverProofId]')?.value||'',options:[...document.querySelector('[name=droverProofId]')?.options||[]].slice(-4).map(x=>[x.value,x.textContent]),formGuide:document.querySelector('[name=guideId]')?.value,currentTask:document.querySelector('[data-episode-skill-task]')?.getAttribute('data-episode-skill-task')});
window.__finalMount93816=()=>({minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({members:j.calendarTimeEpisode.memberIds,from:j.calendarTimeEpisode.startMinute,to:j.calendarTimeEpisode.endMinute,mount:j.calendarTimeEpisode.transportProof?.mount||null,mass:j.calendarTimeEpisode.transportProof?.mass||null})),windows:data.journal.filter(j=>j.calendarTimeWindow).length,patientHealth:JSON.stringify(data.characters.find(c=>c.id==='b').hmk.healthState)});
window.__transportStatus93816=()=>({minute:data.campaignClock.minute,episodes:data.journal.filter(j=>j.calendarTimeEpisode).length,
 horse:require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)).map(a=>({id:a.id,name:a.name})),
 stable:(data.journal||[]).filter(j=>j.stableHub574).map(j=>j.stableHub574.type),
 health:JSON.stringify(data.characters.find(c=>c.id==='b').hmk.healthState),
 mass:document.querySelector('[data-episode-transport-mass-summary]')?.textContent||'',
 problem:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblem||''});
'''
seed += '''
window.__finalCart93818=()=>({minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,events:data.campaignClock.events.length,episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({members:j.calendarTimeEpisode.memberIds,conveyance:j.calendarTimeEpisode.conveyance,proof:j.calendarTimeEpisode.transportProof,distance:j.calendarTimeEpisode.distanceMeters})),windows:data.journal.filter(j=>j.calendarTimeWindow).length,health:JSON.stringify(data.characters.find(c=>c.id==='b').hmk.healthState)});
'''
if '--unc' in sys.argv:seed=seed.replace("healthState.shock='INC'","healthState.shock='UNC'")
if '--cold' in sys.argv:
 seed=seed.replace("season:'summer',climate:'wet-tropical',temperatureD10:10","season:'winter',climate:'cool',temperatureD10:1").replace("weather.calendarTrekDayWeather.season='summer'","weather.calendarTrekDayWeather.season='winter'").replace("weather.calendarTrekDayWeather.climate='wet-tropical'","weather.calendarTrekDayWeather.climate='cool'")
mods['app.js']+=seed+'''
window.__markReadyFixture93820=()=>{for(const c of data.characters)c.hmk.creation={version:1,step:14,skillStage:7,status:'complete',values:{},attributeProof:{},skillDP:{},auditEvents:[],completed:Object.fromEntries(Array.from({length:14},(_,i)=>[i+1,true]))};localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};
window.__medicalColdShock93820=()=>data.journal.filter(j=>j.characterId==='b'&&j.skillTestProof?.type==='skill-cold-water-shock');
window.__aftercareHealth93820=()=>({minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,health:character('b').hmk.healthState,receipts:data.journal.filter(j=>j.characterId==='b' && j.skillTestProof?.type==='skill-weather-onset').map(j=>({id:j.id,proof:j.skillTestProof})),skinReceipts:data.journal.filter(j=>j.characterId==='b' && j.skillTestProof?.type==='skill-weather-skin').map(j=>({id:j.id,proof:j.skillTestProof})),otherJobs:data.journal.filter(j=>j.calendarTimeEpisode).length});
window.__weatherResult93819=()=>({minute:data.campaignClock.minute,episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({weather:j.calendarTimeEpisode.weatherExposure||[],transported:j.calendarTimeEpisode.transportedMemberIds||[]})),patientShock:character('b')?.hmk?.healthState?.shock,patientWounds:character('b')?.hmk?.healthState?.wounds||[],patientSkillProofs:data.journal.filter(j=>j.characterId==='b'&&j.skillTestProof).length});
'''
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1500,'height':1050});page.set_default_timeout(12000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()');page.evaluate('window.__realPatientFixture93820()');page.evaluate('window.__setTransportFixture93816()')
 print('WEATHER FIXTURE: hot weather seeded',page.evaluate('window.__transportStatus93816()'),flush=True)
 page.locator('[data-shared-window-minutes]').fill('45');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();g=page.locator('[data-shared-plan-card]').first
 g.locator('[data-shared-row-actor]').select_option('a');g.locator('.hc-episode-group-members summary').click();g.locator('[data-shared-plan-member][value="b"]').check()
 page.locator('[data-shared-plan-add]').click();page.locator('[data-shared-plan-card]').nth(1).locator('[data-shared-row-actor]').select_option('c')
 page.locator('[data-shared-row-run]').click();form=page.locator('#hmk-time-episode-form')
 assert form.is_visible(),page.locator('body').inner_text()[-500:]
 form.locator('[name=conveyance]').select_option('cart')
 patient=form.locator('[name=transportedMemberIds][value=b]')
 assert patient.is_visible(),form.inner_text()[:700]
 patient.check()
 form.locator('[name=transportExtraLb]').fill('0')
 status=page.evaluate('window.__transportStatus93816()')
 assert '324 lb' in status['mass'],status
 assert form.locator('[name=transportOtherLb]').input_value()=='150',form.locator('[name=transportOtherLb]').input_value()
 assert form.locator('[name=transportPatientLb_b]').input_value()=='174'
 assert 'Doplnit skutečnou hmotnost' not in form.inner_text()
 print('PASS browser mass: body weights 150+174, one patient 174, guide 150, no duplicate, no typed body mass',flush=True)
 form.locator('[data-episode-open-stable-library]').click()
 acq=page.locator('[data-hmk-livestock-acquire]')
 opt=acq.locator('[name=beastId] option').filter(has_text='Bovine (Oxen)').first.get_attribute('value')
 acq.locator('[name=beastId]').select_option(opt);acq.locator('[name=beastName]').fill('Blesk')
 acq.locator('[name=ownerId]').select_option('a');acq.locator('button[value=free]').click()
 page.locator('[data-hmk-stable-go-travel]').click();form=page.locator('#hmk-time-episode-form');form.locator('[data-episode-stable-refresh]').click()
 horse=page.evaluate('window.__transportStatus93816()')['horse'][0]['id'];form=page.locator('#hmk-time-episode-form')
 form.locator('[name=stableAnimalIds][value="'+horse+'"]').check()
 form.locator('[name=transportTeamIds][value="'+horse+'"]').check()
 form.locator('[data-episode-equipment-action=gift]').click()
 form=page.locator('#hmk-time-episode-form')
 form.locator('[data-episode-equipment-action=vehicle-gift]').click()
 form=page.locator('#hmk-time-episode-form');form.locator('[name=transportVehicleKey]').select_option(index=1)
 form.locator('[name=transportCoLocated]').check()
 info=form.locator('[data-episode-vehicle-capacity]').inner_text()
 assert 'Doloženo' in info,info
 assert '324 /' in info,info
 assert form.locator('[data-episode-equipment-checklist-body]').inner_text().find('Doložit tělesnou hmotnost')<0
 assert not errors,errors
 print('PASS ox + cart + free ox harness + free vehicle + auto cargo 324 lb',flush=True)
 def finish_group(label):
  f=page.locator('#hmk-time-episode-form')
  assert f.is_visible(),('missing form',label)
  if f.locator('[name=confirmed]').is_visible() and not f.locator('[name=confirmed]').is_checked():
   print('CONF before',label,page.evaluate('''()=>({check:document.querySelector('#hmk-time-episode-form [name=confirmed]')?.checked,form:document.querySelector('#hmk-time-episode-form')?.getAttribute('data-episode-problem'),scroll:window.scrollY})'''),flush=True)
   f.locator('[name=confirmed]').click()
   print('CONF after',label,page.evaluate('''()=>({check:document.querySelector('#hmk-time-episode-form [name=confirmed]')?.checked,form:document.querySelector('#hmk-time-episode-form')?.getAttribute('data-episode-problem'),scroll:window.scrollY})'''),flush=True)
  for i in range(60):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   if not f.locator('[data-episode-evaluate]').is_enabled():
    if f.locator('[name=confirmed]').is_visible() and not f.locator('[name=confirmed]').is_checked():
     print('CHECK GM AGAIN before',label,page.evaluate("""()=>({value:document.querySelector('#hmk-time-episode-form [name=confirmed]')?.checked,scrollY:window.scrollY,documentElement:document.querySelector('#hmk-time-episode-form')?.outerHTML.slice(-900)})"""),flush=True)
     f.locator('[name=confirmed]').click()
     print('CHECK GM AGAIN after',label,page.evaluate("""()=>({value:document.querySelector('#hmk-time-episode-form [name=confirmed]')?.checked,scrollY:window.scrollY,documentElement:document.querySelector('#hmk-time-episode-form')?.outerHTML.slice(-900)})"""),flush=True)
     print('CHECK GM AGAIN',label,f.locator('[name=confirmed]').is_checked(),page.locator('[data-episode-window-stage]').is_enabled(),flush=True)
     continue
    raise AssertionError(('evaluate disabled and no confirm choice',label, f.locator('[name=confirmed]').is_checked()))
   f.locator('[data-episode-evaluate]').click()
   if page.locator('[data-episode-window-stage]').is_enabled():break
   field=f.get_attribute('data-episode-problem-field') or ''
   msg=f.get_attribute('data-episode-problem') or ''
   print('STEP',label,i,field,msg[:140],flush=True)
   if field in ('orientationProofId','droverProofId') or field.startswith('whProof_cold_'):
    task=page.locator('[data-episode-skill-task]:visible').first
    assert task.count(),('missing skill action',field,msg)
    task.click()
    sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
    assert sf.count(),('missing skill workbench',field)
    print('SKILL',field,sf.locator('[name=primary]').input_value() if sf.locator('[name=primary]').count() else sf.locator('[name=skills]').input_value() if sf.locator('[name=skills]').count() else '',flush=True)
    sf.locator('[name=rollA]').fill('31');sf.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click();f=page.locator('#hmk-time-episode-form');continue
   if not field and page.locator('[data-episode-checklist] [data-episode-jump^=whRoll_]').count():
    jump=page.locator('[data-episode-checklist] [data-episode-jump^=whRoll_]').first
    key=jump.get_attribute('data-episode-jump');jump.click()
    f.locator('[name="'+key+'"]').fill('1' if '--exposed' in sys.argv and key==('whRoll_cold_b' if '--cold' in sys.argv else 'whRoll_heat_b') else ('6' if '--cold' in sys.argv else '4'))
    if '--water' in sys.argv and key=='whRoll_cold_b':
     f.locator('[name=whCold_cold_b]').select_option('coldWater')
    continue
   if not field and page.locator('[data-episode-checklist] [data-episode-jump^=whPassiveD100_]').count():
    jump=page.locator('[data-episode-checklist] [data-episode-jump^=whPassiveD100_]').first
    field=jump.get_attribute('data-episode-jump');jump.click()
   if field.startswith('whPassiveD100_'):
    panel=f.locator('[data-episode-weather-kind='+('cold' if '--cold' in sys.argv else 'heat')+'] [data-episode-weather-actor="b"]')
    if not panel.evaluate('(el)=>el.open'):panel.locator('summary').click()
    print('PASSIVE_VISIBILITY',f.locator('[name="'+field+'"]').evaluate('el=>({ancestors:[...function*(x){while(x){yield [x.tagName,x.getAttribute("hidden"),x.getAttribute("style"),x.className];x=x.parentElement}}(el)],computed:getComputedStyle(el).display})'),flush=True)
    f.locator('[name="'+field+'"]').fill('95' if '--cf' in sys.argv else '91')
    f.locator('[name="'+field.replace('whPassiveD100_','whPassiveConfirmed_')+'"]').check()
    continue
   if field.startswith('whRoll_'):
    f.locator('[name="'+field+'"]').fill('1' if field==('whRoll_cold_b' if '--cold' in sys.argv else 'whRoll_heat_b') else ('6' if '--cold' in sys.argv else '4'))
    continue
   if field=='confirmed':f.locator('[name=confirmed]').check();continue
   if field.startswith('end_'):f.locator('[name="'+field+'"]').fill('5');continue
   if field=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',msg)
    f.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
   if field in ('encounterD100','encounterD100Sub','directionD10','survivalD10','precipitationD6','temperatureD10','precipitationD10'):
    f.locator('[name="'+field+'"]').fill({'encounterD100':'100','encounterD100Sub':'100','directionD10':'6','survivalD10':'10','precipitationD6':'6','temperatureD10':'5','precipitationD10':'10'}[field]);continue
   raise AssertionError(('UNHANDLED',label,field,msg, page.locator('[data-episode-checklist]').inner_text()[-2500:],f.locator('[data-episode-weather-details]').inner_text()[-1100:]))
  else:raise AssertionError(('not ready',label))
  page.locator('[data-episode-window-stage]').click()
  return page.evaluate('window.__transportStatus93816()')
 first=finish_group('ox-cart patient');print('FIRST STAGED',first,flush=True)
 assert first['minute']==480
 second=finish_group('independent foot');print('SECOND STAGED',second,flush=True)
 assert second['minute']==480
 page.locator('[data-episode-window-commit]').click()
 fin=page.evaluate('window.__finalCart93818()')
 print('FINAL',fin,'errors',errors,'dialogs',dialogs,flush=True)
 assert fin['minute']==fin['stored']==525 and fin['windows']==1 and len(fin['episodes'])==2,fin
 assert fin['episodes'][0]['conveyance']=='cart',fin
 assert fin['episodes'][0]['proof'] and fin['episodes'][0]['proof']['mass'],fin
 assert fin['episodes'][0]['proof']['mass']['totalPeopleLb']==324,fin
 assert [sorted(x['members']) for x in fin['episodes']]==[['a','b'],['c']],fin
 assert fin['health']==status['health']
 assert not errors,errors
 weatherResult=page.evaluate('window.__weatherResult93819()')
 print('EXPOSED FINISHED',weatherResult,flush=True)
 patient=weatherResult['episodes'][0]['weather']
 assert weatherResult['patientShock']==('UNC' if '--unc' in sys.argv else 'INC')
 assert weatherResult['patientSkillProofs']==0
 exposed=[x for x in patient if x['id']=='b' and x['kind']==('cold' if '--cold' in sys.argv else 'heat') and x['exposed']]
 assert len(exposed)==1 and exposed[0].get('passiveResistance'),patient
 variant=('unc' if '--unc' in sys.argv else 'inc')+('_cold_water' if '--water' in sys.argv else ('_cold' if '--cold' in sys.argv else '_heat'))+('_cf' if '--cf' in sys.argv else '_f')
 page.screenshot(path=str(EVIDENCE/(variant+'_exposure_before_health.png')),full_page=True)
 # Valid, genuinely generated and previously validated HMK creation fixture
 print('ONSET PRE-SCREEN',page.locator('body').inner_text()[-2400:],flush=True)
 # Open the calendar's genuine weather-onset route, with the patient selected.
 routes=page.locator('[data-episode-medical-route="weather-onset"]')
 print('ROUTES',routes.count(),page.locator('[data-skill-weather-onset]').count(),flush=True)
 if routes.count():routes.first.click()
 else:
  page.locator('[data-nav="characters"]').first.click()
  print('OPEN ROSTER',page.locator('[data-open="b"]').count(),page.locator('main').inner_text()[:2500],page.locator('[data-resume-creation]').count(),page.locator('[data-nav]').all_text_contents()[:15],flush=True)
  page.locator('[data-open="b"]').first.click()
  print('OPEN SHEET',page.locator('[data-sheet-section="hazards"]').count(),flush=True)
  page.locator('[data-sheet-section="hazards"]').click()
 if '--water' in sys.argv:
  shock=page.locator('form[data-skill-cold-shock]').first
  print('IMMERSION FORM',shock.count(),page.locator('body').inner_text()[-2300:],flush=True)
  assert shock.count(), 'Water exposure must first open the actual Cold Shock form'
  details=shock.locator('xpath=..')
  if not details.evaluate('x=>x.open'):details.locator('summary').click()
  for i in (1,2,3):shock.locator(f'[name=d6_{i}]').fill('1')
  shock.locator('[name=enduranceD100]').fill('95')
  shock.locator('[type=submit]').click()
  print('IMMERSION RESULT',page.evaluate('window.__aftercareHealth93820()'),page.locator('body').inner_text()[-700:],flush=True)
  assert page.evaluate('window.__medicalColdShock93820()'), 'Cold Shock receipt not persisted after clicking'
  print('STRENGTHENED_SHOCK_STATE',page.evaluate('window.__aftercareHealth93820()')['health']['shock'],flush=True)
  page.locator('[data-sheet-section="hazards"]').click()
 print('ONSET AFTER NAV',page.locator('[data-skill-weather-onset]').count(),page.locator('body').inner_text()[-2300:],flush=True)
 assert page.locator('[data-skill-weather-onset]').count(), 'Need to route via actual health UI'
 onset=page.locator('[data-skill-weather-onset]').first
 onset.locator('xpath=..').locator('summary').click()
 print('FORM DOM BEFORE',onset.evaluate("el=>({html:el.outerHTML.slice(0,1000),btnForm:el.querySelector('button')?.form?.getAttribute('data-skill-weather-onset'),labels:[...el.querySelectorAll('input')].map(x=>[x.name,x.value])})"),flush=True)
 onset.locator('[type=submit]').click()
 print('ERR JS',errors,'DIALOGS after onset',dialogs,flush=True)
 print('ONSET ERROR',onset.locator('output').inner_text() if onset.count() else 'form removed',flush=True)
 print('ONSET SAVED',page.evaluate('window.__aftercareHealth93820()'),'visibleError',page.locator('body').inner_text()[-1200:],flush=True)
 page.screenshot(path=str(EVIDENCE/(variant+'_onset_committed.png')),full_page=True)
 if '--cf' in sys.argv:
  skin=page.locator('form[data-skill-weather-skin]').first
  print('SKIN FORM',skin.count(),skin.get_attribute('data-weather-skin-kind') if skin.count() else '',flush=True)
  assert skin.count(), 'CF needs actual skin follow-up form'
  skin.locator('xpath=..').locator('summary').first.click()
  print('SKIN PRE',skin.locator('[data-weather-skin-row]').count(),skin.locator('[data-weather-skin-select]:checked').count(),(skin.locator('[name=complexion]').input_value() if '--cold' not in sys.argv else 'frostbite'),flush=True)
  if '--cold' in sys.argv:
   # HMK p185: physically witnessed wind/duration d20. In the certified
   # 45-minute interval even the slowest 120-minute wind period yields IL0.
   skin.locator('[name=windD20]').fill('1')
   skin.locator('[name=durationD20]').fill('20')
   skinRows=skin.locator('[data-weather-skin-row]')
   assert skinRows.count()==24
   skin.locator('[data-weather-skin-evaluate]').click()
   print('FROSTBITE EVALUATED',skin.evaluate("el=>({evaluated:el.dataset.skinEvaluated,rows:[...el.querySelectorAll('[data-weather-skin-row]')].map(x=>({loc:x.dataset.skinLocation,il:x.dataset.skinLevel})).filter(x=>x.il&&x.il!=='0')})"),flush=True)
  else:
   skin.locator('[name=complexion]').select_option('medium') # patient has documented Medium complexion
   skinRows=skin.locator('[data-weather-skin-row]')
   assert skinRows.count()==24
   for k in range(skinRows.count()):
    skinRows.nth(k).locator('[data-weather-skin-d10]').fill('1' if k==0 else '10')
   skin.locator('[data-weather-skin-evaluate]').click()
   print('SKIN EVALUATED',skin.evaluate("el=>({evaluated:el.dataset.skinEvaluated,rows:[...el.querySelectorAll('[data-weather-skin-row]')].map(x=>({loc:x.dataset.skinLocation,il:x.dataset.skinLevel,shockVisible:!x.querySelector('[data-weather-skin-shock-wrap]').hidden})).filter(x=>x.il&&x.il!=='0')})"),flush=True)
   for r in skinRows.all():
    shock=r.locator('[data-weather-skin-shock]')
    if shock.is_enabled():shock.fill('21')
  skin.locator('[type=submit]').click()
  print('SKIN RESULT',page.evaluate('window.__aftercareHealth93820()'),flush=True)


 state=page.evaluate('window.__aftercareHealth93820()')
 assert state['receipts'], 'No medical receipt after on-screen submit'
 assert state['health']['shock']=='UNC',state['health']
 assert state['health']['fatigue']['otherWeakness']==0,state['health'] # Cold Water HR3: no instantaneous weakness
 assert any(e.get('type')=='skill-trekking-weather-hazard' for e in state['health']['events']),state['health']
 assert state['health']['shockFollowup']['phase']=='after-ten-minutes',state['health']
 assert state['minute']==state['stored']==525,state
 if '--cf' in sys.argv:assert state['skinReceipts'], 'CF skin consequences not persisted'
 if '--water' in sys.argv:assert page.evaluate('window.__medicalColdShock93820()'), 'Immersion Cold Shock missing'
 assert not errors,errors
 print('PASS UI weather passive resistance and linked medical onset',flush=True)
 page.locator('[data-nav=calendar]').first.click()
 print('CALENDAR AFTER ONSET', page.locator('body').inner_text()[-1800:], flush=True)
 print('CALENDAR CONTROLS', page.locator('[data-calendar-open]').count(),page.locator('[data-calendar-section=travel]').count(),page.locator('[data-shared-window-minutes]').count(), flush=True)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click()
 if page.locator('[data-calendar-section=travel]').count():page.locator('[data-calendar-section=travel]').first.click()
 print('AFTER TRAVEL OPEN',page.locator('body').inner_text()[-1800:],flush=True)
 print('WINDOW INPUT',page.locator('[data-shared-window-minutes]').count(),flush=True)
 page.locator('[data-shared-window-minutes]').fill('10')
 print('CREATE ENABLED',page.locator('[data-shared-window-create]').is_enabled(),flush=True)
 page.locator('[data-shared-window-create]').click()
 print('AFTER WINDOW',page.locator('body').inner_text()[-2000:],flush=True)
 print('ADD PLAN',page.locator('[data-shared-plan-add]').count(),page.locator('[data-shared-plan-add]').is_enabled(),flush=True)
 page.locator('[data-shared-plan-add]').click()
 card=page.locator('[data-shared-plan-card]').first
 print('ROW HTML',card.inner_html()[:1600],flush=True)
 card.locator('[data-shared-row-actor]').select_option('c')
 card.locator('[data-shared-plan-kind]').select_option('rest')
 print('REST PLAN',card.inner_text(),flush=True)
 page.locator('[data-shared-row-run]').click()
 print('REST FORM',page.locator('body').inner_text()[-2800:],flush=True)
 print('REST KIND',page.locator('#hmk-time-episode-form [name=kind]').input_value(),flush=True)
 f=page.locator('#hmk-time-episode-form')
 if f.locator('[name=confirmed]').count(): f.locator('[name=confirmed]').evaluate('(x)=>{if(!x.checked)x.click()}')
 f.locator('[data-episode-evaluate]').click()
 for i in range(15):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  jump=page.locator('[data-episode-checklist] [data-episode-jump]').first
  field=jump.get_attribute('data-episode-jump') if jump.count() else ''
  note=page.locator('[data-episode-checklist]').inner_text() if page.locator('[data-episode-checklist]').count() else ''
  print('REST NEXT',i,field,note[:450],flush=True)
  if field.startswith('whRoll_'):
   jump.click();f.locator('[name='+field+']').fill('6');f.locator('[data-episode-evaluate]').click();continue
  if field.startswith('end_'):
   jump.click();f.locator('[name='+field+']').fill('21');f.locator('[data-episode-evaluate]').click();continue
  if field=='confirmed':f.locator('[name=confirmed]').check();f.locator('[data-episode-evaluate]').click();continue
  task=page.locator('[data-episode-skill-task]:visible')
  print('TASK CHOICES',[(i.get_attribute('data-episode-skill-task'),i.is_visible()) for i in page.locator('[data-episode-skill-task]').all()],flush=True)
  if task.count():
   task.first.click(timeout=15000)
   sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
   print('REST SKILL',sf.count(),sf.locator('[name=primary]').input_value() if sf.locator('[name=primary]').count() else 'secondary',flush=True)
   sf.locator('[name=rollA]').fill('21');sf.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click()
   f=page.locator('#hmk-time-episode-form');
   if f.locator('[data-episode-evaluate]').is_enabled():f.locator('[data-episode-evaluate]').click()
   continue
  break
 print('STAGE ENABLED',page.locator('[data-episode-window-stage]').is_enabled(),flush=True)
 if page.locator('[data-episode-window-stage]').is_enabled():
  page.locator('[data-episode-window-stage]').click()
  print('REST STAGED',page.locator('[data-episode-window-commit]').is_enabled(),flush=True)
  if page.locator('[data-episode-window-commit]').is_enabled():page.locator('[data-episode-window-commit]').click()

 minute=page.evaluate('window.__aftercareHealth93820()')['minute'];print('MINUTE NOW',minute,flush=True)
 assert minute==535,'The second interval must be confirmed to 08:55 before Shock Reroll'
 page.locator('[data-nav=characters]').first.click()
 page.locator('[data-open=b]').first.click()
 page.locator('[data-sheet-section=hazards]').click()
 reroll=page.locator('form[data-weather-shock-followup]')
 print('SHOCK REROLL FORM',reroll.count(),page.locator('body').inner_text()[-1900:],flush=True)
 assert reroll.count()==1,'Due Shock Reroll missing after 10 real minutes'
 assert reroll.locator('[name=roll]').is_enabled(),'Dated shock reroll disabled at due time'
 before=page.evaluate('window.__aftercareHealth93820()')
 print('BEFORE SHOCK',before['health']['shock'],before['health'].get('shockFollowup'),flush=True)
 reroll.locator('[name=roll]').fill('21')
 reroll.locator('[type=submit]').click()
 after=page.evaluate('window.__aftercareHealth93820()')
 print('AFTER SHOCK',after['health']['shock'],after['health'].get('shockFollowup'),after['minute'],flush=True)
 assert after['minute']==535==after['stored'],'Shock reroll cannot advance time'
 receipts=page.evaluate("() => JSON.parse(localStorage.getItem('hmk-keepers-ledger-v1')).journal.filter(j=>j.skillTestProof?.type==='weather-shock-recovery')")
 print('REROLL RECEIPTS',receipts[-1:] if receipts else [],flush=True)
 assert len(receipts)==1 and receipts[0]['skillTestProof']['roll']==21,'Saved Shock recovery proof missing'
 assert not errors,errors
 page.screenshot(path='/mnt/data/hmk_93825/shock_reroll_due_saved.png',full_page=True)
 print('PASS UI 08:45→08:55 via rest, due Shock Reroll d100=21, persisted receipt, no extra clock',flush=True)
 b.close()
