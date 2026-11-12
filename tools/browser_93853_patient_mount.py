"""v93.853 patient carriage E2E: browser clicks current UI, deterministic isolated health-state fixture.
Does not claim a combat-created UNC wound. No direct simulated skill receipts.
"""
from pathlib import Path
import json,re,sys,traceback
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
base=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
base+='''
window.__patientFixture93853=()=>{
 for(const c of data.characters){c.hmk.weight=c.id==='a'?'150 lb':c.id==='b'?'120 lb':'170 lb';
 c.hmk.skills.push({id:'animalcraft-'+c.id,name:'Animalcraft',ml:75},{id:'riding-'+c.id,name:'Riding',ml:75});}
 data.characters.find(c=>c.id==='b').hmk.healthState.shock='UNC';
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__patientAudit93853=()=>({minute:data.campaignClock.minute,storedMinute:JSON.parse(storageBaseline).campaignClock.minute,
 patient:JSON.stringify(data.characters.find(x=>x.id==='b').hmk.healthState),
 episodes:data.journal.filter(x=>x.calendarTimeEpisode).map(x=>({id:x.id,actors:x.calendarTimeEpisode.memberIds,start:x.calendarTimeEpisode.startMinute,end:x.calendarTimeEpisode.endMinute,transport:x.calendarTimeEpisode.transportProof,health:x.calendarTimeEpisode.patientTransport,kind:x.calendarTimeEpisode.kind})),
 windowCount:data.journal.filter(x=>x.calendarTimeWindow).length,proofs:data.journal.filter(x=>x.skillTestProof).map(x=>({id:x.id,actor:x.characterId,skill:x.skillTestProof.skill||x.skillTestProof.a?.skill||x.title})),
 queue:sharedTimeWindowQueue.length,errors:sharedPlanState93771().errors});
'''
mods['app.js']+=base
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
art=root/'tools/evidence_93853';art.mkdir(exist_ok=True)
results=[]
def step(label,**details):
 results.append({'step':label,**details});print(label,details,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1500,'height':980});page.set_default_timeout(9000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()');page.evaluate('window.__patientFixture93853()')
 initial=page.evaluate('window.__patientAudit93853()');step('initial',minute=initial['minute'],patient=initial['patient'])
 page.locator('[data-shared-window-minutes]').fill('45');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();g=page.locator('[data-shared-plan-card]').first
 g.locator('[data-shared-row-actor]').select_option('a');g.locator('.hc-episode-group-members summary').click();g.locator('[data-shared-plan-member][value="b"]').check()
 page.locator('[data-shared-plan-add]').click();page.locator('[data-shared-plan-card]').nth(1).locator('[data-shared-row-actor]').select_option('c')
 page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form')
 assert f.is_visible();assert f.locator('[data-episode-patient-guide]').is_visible()
 f.locator('[data-episode-evaluate]').click()
 checklist=page.locator('[data-episode-checklist]').first.inner_text();step('missing-patient',checklist=checklist[:350])
 assert 'Nepohyblivá' in checklist
 page.locator('[data-episode-jump=transportedMemberIds]').click()
 assert f.locator('[data-episode-patient-guide]').evaluate('(e)=>e.classList.contains("hc-episode-needs-input")')
 assert f.locator('[data-episode-load-patients]').evaluate('(e)=>e===document.activeElement')
 f.locator('[data-episode-load-patients]').click();f=page.locator('#hmk-time-episode-form')
 assert f.locator('[name=transportedMemberIds][value="b"]').is_checked()
 assert f.locator('[name=conveyance]').input_value()=='cart'
 assert '270 lb' in f.locator('[data-episode-transport-mass-summary]').inner_text()
 step('patient-loaded-before-cart',mass=f.locator('[data-episode-transport-mass-summary]').inner_text()[:400])
 f.locator('[data-episode-open-stable-library]').click();acq=page.locator('[data-hmk-livestock-acquire]')
 option=acq.locator('[name=beastId] option').filter(has_text='Palfrey, cart horse').first.get_attribute('value')
 acq.locator('[name=beastId]').select_option(option);acq.locator('[name=beastName]').fill('První kůň');acq.locator('[name=ownerId]').select_option('a');acq.locator('button[value=free]').click()
 page.locator('[data-hmk-stable-go-travel]').click();f=page.locator('#hmk-time-episode-form');f.locator('[data-episode-stable-refresh]').click();f=page.locator('#hmk-time-episode-form')
 f.locator('[name=conveyance]').select_option('mount');f=page.locator('#hmk-time-episode-form')
 f.locator('[data-episode-load-patients]').click();f=page.locator('#hmk-time-episode-form')
 for i in range(6):
  gift=f.locator('[data-episode-equipment-action=gift]')
  if not gift.count():break
  step('horse-tack-needed',i=i,checklist=f.locator('[data-episode-equipment-checklist-body]').inner_text()[:450])
  gift.first.click();f=page.locator('#hmk-time-episode-form')
 f.locator('[data-episode-load-patients]').click();f=page.locator('#hmk-time-episode-form')
 capacity=f.locator('[data-episode-mount-capacity]').inner_text()
 step('mount-ready',capacity=capacity[:600],mass=f.locator('[data-episode-transport-mass-summary]').inner_text()[:200],patient=f.locator('[data-episode-patient-status]').inner_text()[:300])
 assert f.locator('[name=transportMountAnimalId]').input_value()
 assert f.locator('[name=transportMountHandlerId]').input_value()=='a'
 assert f.locator('[name=transportMountHandlerPosition]').input_value()=='leading'
 page.screenshot(path=str(art/'patient_mount_ready.png'),full_page=True)
 def current(): return page.locator('#hmk-time-episode-form')
 def clickRoll(field,value):
  f=current()
  f.locator('[name="'+field+'"]').fill(str(value))
  btn=f.locator('[data-episode-roll-confirm="'+field+'"]')
  assert btn.count(),('missing explicit confirmation',field)
  btn.click()
 def finish_group(label,orientation_roll='31'):
  f=current()
  if f.locator('[data-episode-evaluate]').is_enabled(): f.locator('[data-episode-evaluate]').click()
  for i in range(75):
   f=current()
   if page.locator('[data-episode-window-stage]').is_enabled():break
   alloc=f.locator('[data-episode-allocation-choice]')
   if alloc.is_visible():
    btn=alloc.locator('[data-episode-allocation-set=auto]')
    if btn.count() and btn.is_visible() and btn.is_enabled():
     step('allocation-choice',group=label,i=i);btn.click();continue
   manualConfirm=f.locator('[data-episode-allocation-confirm]')
   if manualConfirm.is_visible() and manualConfirm.is_enabled():
    step('allocation-confirm',group=label,i=i);manualConfirm.click();continue
   field=f.get_attribute('data-episode-problem-field') or ''
   msg=f.get_attribute('data-episode-problem') or ''
   step('next',group=label,i=i,field=field,msg=msg[:230],stage=page.locator('[data-episode-window-stage]').is_enabled(),eval=f.locator('[data-episode-evaluate]').is_enabled())
   if field in ('droverProofId','orientationProofId','trackingProofId'):
    task=page.locator('[data-episode-skill-task]').first
    assert task.count(),('skill action inaccessible',field,msg)
    task.click()
    sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
    assert sf.count(),('missing skill workbench',field)
    sf.locator('[name=rollA]').fill(orientation_roll if field=='orientationProofId' else '31')
    sf.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click()
    continue
   if field=='confirmed':
    if f.locator('[name=confirmed]').count() and not f.locator('[name=confirmed]').is_checked():f.locator('[name=confirmed]').check()
    else:raise AssertionError(('confirmed unresolved',msg))
    continue
   if field.startswith('end_'):
    clickRoll(field,'5');continue
   if field in ('directionD10','progressD10'):
    hint=f.locator('[data-episode-roll-hint="'+field+'"]')
    text=hint.inner_text() if hint.count() else msg
    mm=re.search(r'(?:Zadejte |vyžaduje )(\d+)',text,re.I)
    count=int(mm.group(1)) if mm else 1
    clickRoll(field,','.join('1' for _ in range(count)));continue
   if field in ('survivalD10','precipitationD6','forageD10','temperatureD10','precipitationD10','hazardDirectionD10'):
    clickRoll(field,{'survivalD10':'10','precipitationD6':'6','forageD10':'1','temperatureD10':'5','precipitationD10':'5','hazardDirectionD10':'2'}[field]);continue
   if field=='hazardDirectionChoice':
    btn=f.locator('[data-hazard-choices-confirm]');assert btn.count();btn.click();continue
   if not field and page.locator('[data-episode-window-stage]').is_enabled():break
   if f.locator('[data-episode-evaluate]').is_enabled():f.locator('[data-episode-evaluate]').click();continue
   raise AssertionError(('unresolved',label,i,field,msg, page.locator('[data-episode-checklist]').inner_text()[:400]))
  else:raise AssertionError(('never staged',label))
  step('ready',group=label,checklist=page.locator('[data-episode-checklist]').inner_text()[:220],stage=page.locator('[data-episode-window-stage]').is_enabled())
  page.locator('[data-episode-window-stage]').click()
  out=page.evaluate('window.__patientAudit93853()');step('staged',group=label,minute=out['minute'],queue=out['queue'])
  assert out['minute']==480
 try:
  finish_group('patient-mount',orientation_roll='31')
  finish_group('independent',orientation_roll='31')
  page.locator('[data-episode-window-commit]').click()
  final=page.evaluate('window.__patientAudit93853()');step('final',final=final,errors=errors,dialogs=dialogs)
  assert final['minute']==final['storedMinute']==525
  assert len(final['episodes'])==2 and final['windowCount']==1
  assert sorted([sorted(x['actors']) for x in final['episodes']])==[['a','b'],['c']]
  assert initial['patient']==final['patient'],('health modified',initial['patient'],final['patient'])
  assert not errors,errors
  page.screenshot(path=str(art/'patient_mount_final.png'),full_page=True)
  page.evaluate('window.__reloadRows93772()')
  after=page.evaluate('window.__patientAudit93853()');step('cold-load-state',minute=after['minute'],episodes=len(after['episodes']),patient=after['patient'])
  assert after['minute']==525 and len(after['episodes'])==2 and after['patient']==initial['patient']
  print('PASS complete isolated Chromium patient mount',flush=True)
 except Exception as err:
  step('FAIL',error=repr(err),checklist=page.locator('[data-episode-checklist]').inner_text()[:500] if page.locator('[data-episode-checklist]').count() else '',errors=errors,dialogs=dialogs)
  page.screenshot(path=str(art/'patient_mount_failure.png'),full_page=True)
  traceback.print_exc();sys.exit(1)
 finally:
  (art/'patient_mount_e2e.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
  browser.close()
