"""Click-only regression: one-person shared travel, real Survival CF -> Accident,
Direction deviation with explicit d10, and Tracking-road overrides. Test-only
campaign seeded from browser_93806_groups.py, no fabricated episode receipts."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys, json, re
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__auditOne93850=()=>({minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,
  episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({memberIds:j.calendarTimeEpisode.memberIds,hazards:j.calendarTimeEpisode.hazardDetails||[],from:j.calendarTimeEpisode.startMinute,to:j.calendarTimeEpisode.endMinute})),
  windows:data.journal.filter(j=>j.calendarTimeWindow).length});
window.__addTracker93850=()=>{const c=data.characters.find(c=>c.id==='a');c.hmk.skills.push({id:'tracking-a',name:'Tracking',ml:65});render();};
'''
seed+="""
window.__auditForcedBearing=()=>require('./src/integration/hmk-time-episodes.js').pendingTrackingCFBearing(data.journal,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),data.campaignClock.minute,['a']);
window.__auditLatestTrek=()=>data.journal.filter(x=>x.calendarTimeEpisode).map(x=>({kind:x.calendarTimeEpisode.kind,bearing:x.calendarTimeEpisode.bearing,required:x.calendarTimeEpisode.motion?.requiredBearing,stars:x.calendarTimeEpisode.orientation?.stars,adjustedSV:x.calendarTimeEpisode.orientation?.adjustment?.adjustedSV,terrain:x.calendarTimeEpisode.terrain,forced:x.calendarTimeEpisode.trackingForcedBearing??null}));
"""
mods['app.js']+=seed
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
scenario=sys.argv[1] if len(sys.argv)>1 else 'accident'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1450,'height':940});page.set_default_timeout(7000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()')
 if scenario=='tracking':page.evaluate('window.__addTracker93850()')
 page.locator('[data-shared-window-minutes]').fill('30')
 page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 row=page.locator('[data-shared-plan-card]').first
 row.locator('[data-shared-row-actor]').select_option('a')
 if scenario=='tracking':row.locator('[data-shared-plan-kind]').select_option('tracking')
 page.locator('[data-shared-row-run]').click()
 form=page.locator('#hmk-time-episode-form')
 assert form.is_visible()
 for section in ['environment','transport','skills','rolls']:
  el=form.locator('[data-episode-section-party="'+section+'"]')
  assert el.count()==1,('missing participant label',section)
  assert 'Aktér A' in el.inner_text(),(section,el.inner_text())
 print('HEADINGS_PASS',scenario,flush=True)
 if scenario=='tracking':
  opt=form.locator('[name=trackingRoad]')
  form.locator('[data-episode-section=skills]').evaluate('(e)=>e.open=true')
  opt.select_option('unpaved')
  assert opt.input_value()=='unpaved',('unpaved reverts',opt.input_value())
  form.locator('[name=trackingPartyTracked]').fill('5')
  assert opt.input_value()=='unpaved',('unpaved reverts after other input',opt.input_value())
  opt.select_option('paved')
  assert opt.input_value()=='paved'
  form.locator('[name=trackingPartyTracked]').fill('6')
  assert opt.input_value()=='paved',('paved reverts after input',opt.input_value())
  assert page.evaluate('window.__auditOne93850()')['minute']==480
  print('TRACKING ROAD PASS no premature commit',flush=True)
  # Track a genuine new trail, do not let an empty identity open Skill Tests.
  form.locator('[name=trackingActorId]').select_option('a')
  form.locator('[data-episode-evaluate]').click()
  assert not page.locator('[data-episode-window-stage]').is_enabled()
  assert 'trackingTrail' in (form.get_attribute('data-episode-problem-field') or ''),form.get_attribute('data-episode-problem')
  bad=form.locator('[name=trackingTrail]')
  assert bad.locator('xpath=ancestor::label[1]').get_attribute('class').find('hc-episode-needs-input')>=0,('no highlighted tracking field',bad.locator('xpath=ancestor::label[1]').get_attribute('class'))
  print('RED_HIGHLIGHT_PASS',flush=True)
  bad.fill('Jeleni stopy na mokre zemi')
  page.wait_for_timeout(350)
  form.locator('[data-episode-evaluate]').click(force=True)

 if scenario=='direction':form.locator('[name=terrain]').select_option('mixed-woodland')
 if scenario=='desert':
  form.locator('[name=terrain]').select_option('desert-flats')
  assert form.locator('[name=terrain]').input_value()=='desert-flats'
  print('DESERT FLATS SELECTED',form.locator('[data-episode-trek-table-ref]').inner_text()[:280],flush=True)
 if scenario=='dunes':
  form.locator('[name=terrain]').select_option('dunes')
  if form.locator('[data-episode-section=skills]').get_attribute('open') is None:form.locator('[data-episode-section=skills] > summary').click()
  slow=form.locator('[name=dunesSlow]')
  assert slow.is_visible(), 'Dunes Slow must be visible only in dunes on foot'
  slow.check()
  assert slow.is_checked()
 if scenario=='gmprogress':
  free=form.locator('[name=gmExtraProgress]')
  assert free.count()==1
  if form.locator('[data-episode-section=skills]').get_attribute('open') is None:form.locator('[data-episode-section=skills] > summary').click()
  form.locator('[data-episode-gm-move] > summary').click()
  free.fill('1')
  print('GM FREE PROGRESS SET',free.input_value(),flush=True)

 form.locator('[data-episode-evaluate]').click()
 for step in range(25):
  form=page.locator('#hmk-time-episode-form')
  if page.locator('[data-episode-window-stage]').is_enabled():break
  field=form.get_attribute('data-episode-problem-field') or ''
  msg=form.get_attribute('data-episode-problem') or ''
  text=page.locator('[data-episode-checklist]').inner_text()
  if page.locator('[data-episode-hazard-confirm-next]:visible').count():
   assert 'Směr odchýlení: d10' in text, text
   page.locator('[data-episode-hazard-confirm-next]').click()
   print('DIRECTION HAZARD CHOICES CONFIRMED',flush=True)
   continue
  if page.locator('[data-episode-direction-defer]:visible').count():
   page.locator('[data-episode-direction-defer]').click()
   print('AWARENESS EXPLICITLY DEFERRED',flush=True)
   continue
  if not field and page.locator('[data-episode-checklist] [data-episode-jump]:visible').count():
   field=page.locator('[data-episode-checklist] [data-episode-jump]:visible').first.get_attribute('data-episode-jump') or ''
  print('STEP',scenario,step,field,msg[:105], 'TASK',text[:120].replace('\n',' '),flush=True)
  if field=='trackingProofId':
   page.locator('[data-episode-skill-task]').first.click()
   sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
   sf.locator('[name=rollA]').fill('100')
   sf.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click()
   continue
  if field=='orientationProofId':
   page.locator('[data-episode-skill-task]').first.click()
   sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
   sf.locator('[name=rollA]').fill('100' if scenario=='accident' else '31')
   sf.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click()
   form=page.locator('#hmk-time-episode-form')
   if scenario=='direction':
    assert form.locator('[data-episode-allocation-choice]').is_visible()
    assert not page.locator('[data-episode-window-stage]').is_enabled()
    form.locator('[data-episode-allocation-set=manual]').click()
    budget=form.locator('[data-episode-manual-budget]').inner_text();n=int(re.search(r'→ (\d+) ★',budget).group(1))
    form.locator('[name=mode_progress]').fill(str(n))
    form.locator('[data-episode-allocation-confirm]').click()
   elif form.locator('[data-episode-allocation-choice]').is_visible():
    form.locator('[data-episode-allocation-set=auto]').click()
   continue
  if field in ('confirmed',):
   if not form.locator('[name=confirmed]').is_checked():form.locator('[name=confirmed]').check()
   continue
  if field.startswith('end_'):
   form.locator('[name="'+field+'"]').fill('10')
   form.locator('[data-episode-roll-confirm="'+field+'"]').click()
   continue
  if field in ('progressD10','directionD10'):
   m=re.search(r'(\d+) skutečných d10',msg)
   n=int(m.group(1)) if m else 1
   form.locator('[name="'+field+'"]').fill(','.join('6' for _ in range(n)))
   form.locator('[data-episode-roll-confirm="'+field+'"]').click()
   continue
  if field in ('survivalD10','hazardDirectionD10','precipitationD6','encounterD100','encounterD100Sub'):
   val={'survivalD10':'5','hazardDirectionD10':'7','precipitationD6':'6','encounterD100':'100','encounterD100Sub':'100'}[field]
   form.locator('[name="'+field+'"]').fill(val)
   form.locator('[data-episode-roll-confirm="'+field+'"]').click()
   if field=='hazardDirectionD10':
    print('AFTER DEVIATION',page.locator('[data-episode-checklist]').inner_text()[:300],flush=True)
   continue
  if field=='hazardDirectionProofId':
   # Explicit GM says no Awareness; never fabricate a success.
   form.locator('[data-episode-direction-defer]').click()
   continue
  if field=='hazardAtMinute':
   form.locator('[name=hazardAtMinute]').fill('30')
   continue
  if field in ('hazardItemId','hazardComplicationSkill'):
   raise AssertionError(('unexpected hazard',scenario,field,msg))
  if form.locator('[data-episode-allocation-choice]').is_visible() and form.locator('[data-episode-allocation-set=auto]:visible').count():
   form.locator('[data-episode-allocation-set=auto]').click();continue
  if form.locator('[data-hazard-choices-confirm]:visible:enabled').count():
   form.locator('[data-hazard-choices-confirm]').click();continue
  # Ensure next state is freshly re-evaluated by explicit user click.
  if form.locator('[data-episode-evaluate]').is_enabled():form.locator('[data-episode-evaluate]').click();continue
  raise AssertionError(('unexpected pending',scenario,field,msg,text[-400:]))
 else:raise AssertionError(('stage never enabled',scenario))
 assert page.locator('[data-episode-window-stage]').is_enabled(),('button still disabled',scenario,page.locator('[data-episode-checklist]').inner_text())
 assert 'Veškeré aktuálně požadované výsledky' in page.locator('[data-episode-checklist]').inner_text()
 page.locator('[data-episode-window-stage]').click()
 assert page.locator('[data-episode-window-commit]').is_enabled(),('commit disabled',scenario)
 page.locator('[data-episode-window-commit]').click()
 state=page.evaluate('window.__auditOne93850()')
 print('RECEIPT',state,'DIALOGS',dialogs,'ERRORS',errors,flush=True)
 assert state['minute']==state['stored']==510,state
 assert state['windows']==1 and len(state['episodes'])==1,state
 assert state['episodes'][0]['memberIds']==['a'],state
 if scenario=='accident':assert any(x['hazard']=='accident' for x in state['episodes'][0]['hazards'])
 if scenario=='direction':assert any(x['hazard']=='misdirection' for x in state['episodes'][0]['hazards'])
 assert not errors,errors
 if scenario=='tracking':
  assert page.evaluate('window.__auditForcedBearing()')==1,'Tracking CF must create one pending Bearing'
  print('TRACKING_CF_PENDING_ONE_BEARING_PASS',flush=True)
  page.locator('[data-shared-window-minutes]').fill('30')
  page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click()
  page.locator('[data-shared-plan-card]').first.locator('[data-shared-row-actor]').select_option('a')
  page.locator('[data-shared-row-run]').click()
  f=page.locator('#hmk-time-episode-form');assert f.is_visible()
  f.locator('[name=terrain]').select_option('dunes')
  f.locator('[data-episode-section=skills]').evaluate('(e)=>e.open=true')
  f.locator('[name=orientationFamiliar]').check()  # GM fixture: the guide knows this route; +1 SV
  f.locator('[data-episode-evaluate]').click()
  for t in range(24):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   field=f.get_attribute('data-episode-problem-field') or ''
   message=f.get_attribute('data-episode-problem') or ''
   if not field and page.locator('[data-episode-checklist] [data-episode-jump]:visible').count():field=page.locator('[data-episode-checklist] [data-episode-jump]:visible').first.get_attribute('data-episode-jump') or ''
   print('TRACKING_NEXT',t,field,message[:100],flush=True)
   if page.locator('[data-episode-hazard-confirm-next]:visible').count():page.locator('[data-episode-hazard-confirm-next]').click();continue
   if page.locator('[data-episode-direction-defer]:visible').count():page.locator('[data-episode-direction-defer]').click();continue
   if field=='orientationProofId':
    page.locator('[data-episode-skill-task]').first.click()
    skill=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
    skill.locator('[name=rollA]').fill('1');skill.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click();continue
   if f.locator('[data-episode-allocation-set=auto]').is_visible():f.locator('[data-episode-allocation-set=auto]').click();continue
   if field.startswith('end_'):
    f.locator('[name="'+field+'"]').fill('10');f.locator('[data-episode-roll-confirm="'+field+'"]').click();continue
   if field in ['progressD10','directionD10']:
    match=re.search(r'vyžaduje (\d+) skutečných d10',message)
    count=int(match.group(1)) if match else 1
    f.locator('[name="'+field+'"]').fill(','.join('5' for _ in range(count)))
    f.locator('[data-episode-roll-confirm="'+field+'"]').click();continue
   if field=='hazardDirectionD10':
    f.locator('[name=hazardDirectionD10]').fill('2');f.locator('[data-episode-roll-confirm=hazardDirectionD10]').click();continue
   if page.locator('[data-episode-hazard-confirm-next]:visible').count():page.locator('[data-episode-hazard-confirm-next]').click();continue
   if page.locator('[data-episode-direction-defer]:visible').count():page.locator('[data-episode-direction-defer]').click();continue
   if not field:
    print('EMPTY_NEXT',page.locator('[data-episode-checklist]').inner_text()[:500], 'STAGE',page.locator('[data-episode-window-stage]').is_enabled(), 'EVAL',f.locator('[data-episode-evaluate]').is_enabled(), 'PENDING',f.locator('[data-episode-roll-pending]').inner_text(),flush=True)
   if f.locator('[data-episode-evaluate]').is_enabled():f.locator('[data-episode-evaluate]').click();continue
   raise AssertionError(('unhandled next travel',field,message,page.locator('[data-episode-checklist]').inner_text()[:500]))
  else:raise AssertionError('next travel failed to stage')
  page.locator('[data-episode-window-stage]').click()
  assert page.locator('[data-episode-window-commit]').is_enabled()
  page.locator('[data-episode-window-commit]').click()
  final=page.evaluate('window.__auditOne93850()')
  assert final['minute']==final['stored']==540 and len(final['episodes'])==2,final
  assert page.evaluate('window.__auditForcedBearing()')==0,'Bearing must be consumed exactly once'
  print('AUDIT AFTER DUNES',page.evaluate('window.__auditLatestTrek()'),flush=True)
  assert page.evaluate('window.__auditLatestTrek()')[-1]['bearing']>=3,'Dunes 2 + Tracking CF 1 must demand 3 Bearing'
  print('PASS TRACKING_CF -> REQUIRED_BEARING -> SECOND_TRAVEL',page.evaluate('window.__auditLatestTrek()'),flush=True)
 (root/'tools/evidence_93854').mkdir(exist_ok=True)
 page.screenshot(path=str(root/'tools/evidence_93854'/('THREE_BEARING_'+scenario.upper()+'.png')))
 print('PASS AUDIT93854 3 BEARING ONE PERSON',scenario,flush=True)
 b.close()
