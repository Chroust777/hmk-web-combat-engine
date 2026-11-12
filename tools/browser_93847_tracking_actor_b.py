from pathlib import Path
from playwright.sync_api import sync_playwright
import json, sys, traceback
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
seed=(root/'tools/browser_93807_switch.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
mods['app.js']+=seed+'''
window.__forceTrackingEdit93830=()=>{
 const f=document.querySelector('#hmk-time-episode-form');
 f.elements.namedItem('kind').value='tracking';
 f.elements.namedItem('trackingUse').value='new';
 f.elements.namedItem('guideId').value='b';
 f.elements.namedItem('trackingTrail').value='';
 episodeEvaluationRequested=true;episodeEvaluatedIdentity=episodeIdentityOf(episodeFormSnapshot(f));
 updateEpisodePreview(f);
 return {version:APP_VERSION,evaluated:episodeEvaluationRequested,identity:episodeEvaluatedIdentity,task:episodeCurrentGuidedStep,lock:f.elements.namedItem('trackingTrail').disabled};
};
window.__trackingState93830=()=>{
 const f=document.querySelector('#hmk-time-episode-form');
 return {view,eval:episodeEvaluationRequested,identity:episodeEvaluatedIdentity,trail:timeEpisodeDraft.trackingTrail,formTrail:f?.elements.namedItem('trackingTrail')?.value,disabled:f?.elements.namedItem('trackingTrail')?.disabled,task:episodeCurrentGuidedStep,request:episodePendingSkillRequest,problem:f?.dataset.episodeProblem};
};
window.__trackingCommitSummary=()=>({forced:require('./src/integration/hmk-time-episodes.js').pendingTrackingCFBearing(data.journal,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),data.campaignClock.minute,['b']),minute:data.campaignClock?.minute,episodes:data.journal.filter(x=>x.calendarTimeEpisode).map(x=>({kind:x.calendarTimeEpisode.kind,memberIds:x.calendarTimeEpisode.memberIds,tracking:x.calendarTimeEpisode.trackingMemory})),journal:data.journal.length,skillLevels:data.journal.filter(x=>x.skillTestProof).map(x=>({skills:x.skillTestProof.skills,level:x.skillTestProof.a?.level}))});
window.__trackingGate=()=>{const f=document.querySelector('#hmk-time-episode-form');return {required:episodeHazardChoicesRequired93840(f),pending:episodeHazardPending93840(f),finish:document.querySelector('[data-episode-finalize]').disabled,stage:document.querySelector('[data-episode-window-stage]').disabled,hazardState:episodeHazardState93840(f),legend:f.querySelector('[data-episode-hazard-legend]')?.textContent,hidden:f.querySelector('[data-episode-hazard-details]')?.hidden};};
window.__backToTrail93830=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';render();return window.__trackingState93830()};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(10000)
 errs=[];dialogs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const map=new Map(),s={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if(root.joinpath(css).exists()):page.add_style_tag(content=root.joinpath(css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed93807()')
 page.locator('[data-shared-window-minutes]').fill('40')
 page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 row=page.locator('[data-shared-plan-card]').first
 row.locator('[data-shared-row-actor]').select_option('b')
 row=page.locator('[data-shared-plan-card]').first
 row.locator('[data-shared-plan-kind]').select_option('tracking')
 page.locator('[data-shared-row-run]').click()
 f=page.locator('#hmk-time-episode-form')
 assert f.count()==1,'No episode form'
 print('FORM',f.locator('[name=kind]').input_value(),'BUTTON',f.locator('[data-episode-confirm-trail]').count(),flush=True)
 f.locator('[data-episode-evaluate]').click()
 state=page.evaluate('window.__trackingState93830()');print('INIT',state,flush=True)
 f.locator('[name=trackingActorId]').select_option('b')
 field=f.locator('[name=trackingTrail]');button=f.locator('[data-episode-confirm-trail]')
 assert not field.is_disabled(),state
 name='Stopy zraněného šedého vlka ve sněhu'
 field.click()
 for i,c in enumerate(name):
  page.keyboard.insert_text(c)
  now=field.input_value()
  assert now==name[:i+1],(i,now,name[:i+1])
  assert not field.is_disabled(),('premature lock',i,now)
  assert page.locator('input[name=trackingTrail]').count()==1
 print('TYPING_PASS',field.input_value(),'button',button.is_enabled(),flush=True)
 # Click request before confirmation must not open skill tests
 status=page.evaluate("window.__trackingState93830()")
 if status.get('task',{}).get('field')=='trackingProofId':
  task=page.locator('[data-episode-skill-task][data-episode-skill-field="trackingProofId"]')
  if task.count():
   task.click()
   assert page.evaluate('window.__trackingState93830()')['view']=='calendar','Skill opened before confirmation'
 assert button.is_enabled()
 button.click()
 x=page.evaluate('window.__trackingState93830()')
 print('CONFIRM',x,'dialogs',dialogs[-3:],flush=True)
 assert x['identity']['trackingTrail']==name,x
 assert x['trail']==name,x
 assert x['view'] in ('calendar','skills'),x
 if x['view']=='skills':
  assert x['request']['field']=='trackingProofId',x
  skill=page.locator('#skill-value-form')
  assert skill.is_visible(),'Tracking skill form not visible after confirm'
  skill.locator('[name=rollA]').fill('100')
  skill.locator('[type=submit]').click()
  assert page.locator('[data-episode-return]').count(), 'Return to episode missing'
  page.locator('[data-episode-return]').first.click()
  z=page.evaluate('window.__trackingState93830()')
  print('RETURN',z,flush=True)
  assert z['formTrail']==name and z['disabled'],z
  assert page.locator('[name=trackingProofId]').input_value(), 'Tracking receipt not bound'
  assert z['identity']['trackingTrail']==name, 'Confirmed trail lost after skill test'
 else:
  assert x['disabled'],x
 print('AFTER_TRACKING_CF',{'stageEnabled':page.locator('[data-episode-window-stage]').is_enabled(),'evaluateEnabled':f.locator('[data-episode-evaluate]').is_enabled(),'problem':page.evaluate('window.__trackingState93830()').get('problem'),'taskText':page.locator('[data-episode-checklist]').inner_text()[-700:]},flush=True)
 page.locator('[data-episode-window-stage]').click()
 page.locator('[data-episode-window-commit]').click()
 print('TRACKING_COMMITTED',page.evaluate('window.__trackingCommitSummary()'),flush=True)
 assert page.evaluate('window.__trackingCommitSummary().forced')==1,'Tracking CF did not impose exactly 1 Bearing'
 # Start a NEW real travel time window using explicit UI confirmation.
 page.locator('[data-shared-window-minutes]').fill('40')
 page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 row=page.locator('[data-shared-plan-card]').last
 row.locator('[data-shared-row-actor]').select_option('b')
 page.locator('[data-shared-row-run]').click()
 f=page.locator('#hmk-time-episode-form')
 assert f.locator('[name=kind]').input_value()=='travel'
 assert f.locator('[name=orientationProofId]').input_value()==''
 for i in range(35):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  if f.locator('[data-episode-evaluate]').is_enabled():f.locator('[data-episode-evaluate]').click()
  field=f.get_attribute('data-episode-problem-field') or ''
  msg=f.get_attribute('data-episode-problem') or ''
  print('NEXT_TRAVEL',i,field,msg[:120],flush=True)
  if field=='orientationProofId':
   page.locator('[data-episode-skill-task]').first.click()
   sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
   assert sf.is_visible()
   sf.locator('[name=rollA]').fill('21');sf.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click()
   continue
  if field=='progressD10':
   import re
   match=re.search(r'vyžaduje (\d+) skutečných d10',msg)
   f.locator('[name=progressD10]').fill(','.join(['1']*(int(match.group(1)) if match else 1)));continue
  if field=='directionD10':f.locator('[name=directionD10]').fill('10');continue
  if field.startswith('end_'):f.locator('[name="'+field+'"]').fill('5');continue
  if field in ['temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub']:
   f.locator('[name="'+field+'"]').fill('100' if 'encounter' in field else '5');continue
  if field=='survivalD10':f.locator('[name=survivalD10]').fill('3');continue
  if not field:
   task=page.evaluate('window.__trackingState93830()').get('task') or {}
   if task.get('field')=='hazardDirectionD10':
    f.locator('[name=hazardDirectionD10]').fill('2')
    if f.locator('[data-hazard-choices-confirm]').is_enabled():f.locator('[data-hazard-choices-confirm]').click()
    continue
  if not field and f.locator('[data-hazard-choices-confirm]').is_enabled():f.locator('[data-hazard-choices-confirm]').click();continue
  if not field and i==4:
   print('REFRESH_BEFORE',page.evaluate('window.__trackingGate()'),flush=True)
   f.locator('[name=end_a]').fill('6');f.locator('[name=end_a]').fill('5');
   print('REFRESH_AFTER',page.evaluate('window.__trackingGate()'),flush=True)
   if page.locator('[data-episode-window-stage]').is_enabled():break
  print('TRAVEL_EXTRA',page.locator('[data-episode-checklist]').inner_text()[-700:],'hazardLegend',f.locator('[data-episode-hazard-legend]').inner_text() if f.locator('[data-episode-hazard-legend]').count() else '', 'FINAL',page.locator('[data-episode-finalize]').is_enabled(),'EVAL',page.evaluate('window.__trackingState93830()'),'DUE',page.locator('[data-episode-independent-due]').all_inner_texts(), 'PENDING',page.locator('[data-hazard-choice-status]').all_inner_texts(), 'VIS',f.locator('[data-episode-hazard-details]').is_visible(),flush=True)
  raise AssertionError(('Travel unhandled',field,msg[:240]))
 else:raise AssertionError('Travel unfinished after 35 steps')
 assert page.locator('[data-episode-window-stage]').is_enabled()
 page.locator('[data-episode-window-stage]').click()
 page.locator('[data-episode-window-commit]').click()
 result=page.evaluate('window.__trackingCommitSummary()')
 print('BEARING_TRAVEL_COMMITTED',result,flush=True)
 (root/'tools/evidence_93847').mkdir(exist_ok=True)
 page.screenshot(path=str(root/'tools/evidence_93847/tracking_cf_bearing_actor_b_committed.png'),full_page=True)
 (root/'tools/evidence_93847/tracking_cf_bearing_actor_b.json').write_text(json.dumps({'status':'PASS','workflow':'Tracking CF -> 1 forced Bearing -> next Travel','result':result,'browserErrors':errs},ensure_ascii=False,indent=2),encoding='utf8')
 assert result['minute']==560 and result['forced']==0
 assert len(result['episodes'])==2
 assert result['episodes'][-1]['kind']=='travel'
 assert len([x for x in result['skillLevels'] if x['skills']==['Survival']])==1
 # actual skill request absent if any earlier evidence missing; still locked on explicit click
 assert not errs,errs
 print('PASS typing, explicit confirm, immutability, no browser JS error',flush=True)
 b.close()
