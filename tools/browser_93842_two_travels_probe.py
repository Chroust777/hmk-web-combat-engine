from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,traceback
root=Path(__file__).resolve().parents[1];raw=(root/'hmk-app.bundle.js').read_text();pre='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(pre):]);
prev=(root/'tools/browser_93840_hazard_e2e.py').read_text();seed=prev.split("mods['app.js']+='''",1)[1].split("'''",1)[0]
mods['app.js']+=seed+'''
window.__twoShowStable=()=>{view='library';libraryTab='stable';selected='a';activeSheetSection='stable';render();};
window.__twoBackTravel=()=>{view='calendar';calendarLanding=false;activeCalendarSection='travel';render();};
window.__identityDebug=()=>{const f=document.querySelector('#hmk-time-episode-form');const a=f&&episodeIdentityOf(episodeFormSnapshot(f)),b=episodeEvaluatedIdentity;
return {eval:episodeEvaluationRequested, locked:b, actual:a, diff:b&&a?Object.keys(a).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>[k,b[k],a[k]]):[], mismatch:f&&episodeIdentityMismatch(f),draft:timeEpisodeDraft, problem:f?.dataset.episodeProblemField, problemMessage:f?.dataset.episodeProblem, trackingHidden:f?.querySelector('[data-episode-tracking]')?.hidden,stageDisabled:document.querySelector('[data-episode-window-stage]')?.disabled};};
'''
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1440,'height':960});page.set_default_timeout(10000);msgs=[];errors=[]
 page.on('dialog',lambda d:(msgs.append(d.message),d.accept()))
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();for(const k of ['localStorage','sessionStorage'])Object.defineProperty(window,k,{configurable:true,value:{getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}}})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle);page.evaluate("window.__auditHazardSeed('two_travels')")
 page.evaluate('window.__twoShowStable()')
 for name,breed in [('Blesk','Bovine (Oxen)'),('Vitr','Palfrey, riding horse')]:
  f=page.locator('[data-hmk-livestock-acquire]');o=f.locator('select[name=beastId] option').filter(has_text=breed).first
  f.locator('select[name=beastId]').select_option(o.get_attribute('value'));f.locator('input[name=beastName]').fill(name)
  f.locator('select[name=ownerId]').select_option('a');f.locator('button[value=free]').click()
 page.evaluate('window.__twoBackTravel()');msgs.clear()
 def start():
  page.locator('[data-shared-window-minutes]').fill('60');page.locator('[data-shared-window-create]').click();page.locator('[data-shared-plan-add]').click();r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-row-actor]').select_option('a');page.locator('[data-shared-row-run]').click()
 def change(f,key,value):
  el=f.locator('[name='+key+']')
  if el.count()==0:raise Exception('missing '+key)
  if el.first.evaluate('e=>e.tagName')=='SELECT':el.first.select_option(str(value))
  elif el.first.get_attribute('type')=='checkbox':el.first.set_checked(bool(value))
  else:el.first.fill(str(value))
 def run(idx):
  start();f=page.locator('#hmk-time-episode-form')
  if idx==1:
   for a in f.locator('[name=stableAnimalIds]').all(): a.check()
  if idx==2:
   assert not f.locator('[name=orientationProofId]').input_value(),'no reuse of first Survival proof'
   assert not f.locator('[name=trackingProofId]').input_value(),'no reuse of first Tracking proof'
   for a in f.locator('[name=stableAnimalIds]').all():
    if a.is_checked(): a.uncheck()
  print('RUN',idx,'INIT',page.evaluate('window.__identityDebug()')['actual'],flush=True)
  for i in range(40):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   if f.locator('[data-episode-evaluate]').is_enabled():f.locator('[data-episode-evaluate]').click()
   d=page.evaluate('window.__identityDebug()');field=d['problem'] or '';message=d['problemMessage'] or ''
   print('STEP',idx,i,field,message[:90],'DIFF',d['diff'],'STAGE',d['stageDisabled'], 'MSGS',msgs[-1:] if msgs else [],flush=True)
   if d['diff']:raise RuntimeError(('IDENTITY MISMATCH',d['diff']))
   if page.locator('[data-episode-window-stage]').is_enabled():break
   if field=='orientationProofId':
    print('BEFORE_SKILL',page.evaluate('window.__identityDebug()')['diff'],flush=True)
    if idx==2:
     (root/'tools/evidence_93842').mkdir(exist_ok=True)
     page.screenshot(path=str(root/'tools/evidence_93842/SECOND_FOOT_SURVIVAL_READY.png'))
     # Reproduce phantom dormant Tracking values after evaluation; the ordinary
     # Pochod MUST ignore them, but must NOT create a Tracking test.
     f.locator('[name=trackingUse]').evaluate("n=>n.value='new'")
     f.locator('[name=trackingTrail]').evaluate("n=>n.value='stara stopa'")
     f.locator('[name=trackingRoad]').evaluate("n=>n.value='unpaved'")
     assert not page.evaluate('window.__identityDebug()')['diff'] or page.evaluate('window.__identityDebug()')['mismatch']=='', 'phantom tracking not normalized'
     animals=f.locator('[name=stableAnimalIds]')
     if animals.count():
      animals.first.evaluate('n=>n.checked=true')
      d=page.evaluate('window.__identityDebug()');assert 'zvířata' in d['mismatch'],('real changed animals should block',d)
      page.locator('[data-episode-skill-task]').first.click();assert any('zvířata' in msg for msg in msgs),('guard ignored real party mutation',msgs)
      animals.first.evaluate('n=>n.checked=false');msgs.clear()
    assert page.evaluate('window.__identityDebug()')['mismatch']=='','ordinary trip should not block dormant Tracking'
    page.locator('[data-episode-skill-task]').first.click()
    print('CLICKED',page.evaluate('window.__identityDebug()')['diff'],'msgs',msgs,flush=True)
    if msgs and 'GM: potvrdit' not in msgs[-1]:raise RuntimeError(msgs[-1])
    sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
    sf.locator('[name=rollA]').fill('21');sf.locator('[type=submit]').click();page.locator('[data-episode-return]').first.click();continue
   if field in ['survivalD10','directionD10']:change(f,field,'3');continue
   if field=='progressD10':
    n=re.search(r'vyžaduje (\d+) skutečných d10',message);change(f,field,','.join(['1']*(int(n.group(1)) if n else 1)));continue
   if field in ['temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub']:change(f,field,{'temperatureD10':5,'precipitationD10':10,'precipitationD6':6,'encounterD100':100,'encounterD100Sub':100}[field]);continue
   if field.startswith('end_'):change(f,field,5);continue
   if field=='':
    if page.locator('[data-hazard-choices-confirm]:visible:enabled').count():page.locator('[data-hazard-choices-confirm]').click();continue
    if page.locator('[data-episode-skill-task]').count():
     print('SKILL TASK OTHER',page.locator('[data-episode-skill-task]').first.inner_text()[:140]);break
   print('UNHANDLED',field,message[:180]);break
  else:raise RuntimeError('40 iterations')
  if not page.locator('[data-episode-window-stage]').is_enabled():raise RuntimeError(('not ready',page.evaluate('window.__identityDebug()')['problemMessage']))
  page.locator('[data-episode-window-stage]').click();page.locator('[data-episode-window-commit]').click();print('COMMITTED',idx,page.evaluate('window.__auditHazardState()')['minute'],flush=True)
 try:
  run(1);msgs.clear();run(2)
  state=page.evaluate('window.__auditHazardState()')
  assert state['minute']==600 and state['storedMinute']==600 and len(state['episodes'])==2
  assert len([x for x in state['skillRows'] if x.get('skill')==['Tracking']])==0,'Unexpected Tracking proof created'
  assert not errors,errors
  out=root/'tools/evidence_93842';out.mkdir(exist_ok=True)
  (out/'TWO_TRAVEL_ANIMALS_TO_FOOT.json').write_text(json.dumps({'status':'PASS','version':'93.842','minutesAfterSecond':state['minute'],'episodes':len(state['episodes']),'trackingSkillRows':0,'manualPartyGuard':'PASS','dormantTrackingGuard':'PASS','errors':errors,'dialogs':msgs},ensure_ascii=False,indent=2),'utf8')
  print('PASS two 60-minute intervals, animals then foot, no phantom Tracking or stale dice',flush=True)
 except Exception as e:print('ERROR',e,traceback.format_exc(),flush=True);raise
 print('DIALOGS',msgs,'PAGEERR',errors,flush=True)
 b.close()
