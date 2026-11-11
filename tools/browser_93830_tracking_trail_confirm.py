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
 f.elements.namedItem('guideId').value='a';
 f.elements.namedItem('trackingTrail').value='';
 episodeEvaluationRequested=true;episodeEvaluatedIdentity=episodeIdentityOf(episodeFormSnapshot(f));
 updateEpisodePreview(f);
 return {version:APP_VERSION,evaluated:episodeEvaluationRequested,identity:episodeEvaluatedIdentity,task:episodeCurrentGuidedStep,lock:f.elements.namedItem('trackingTrail').disabled};
};
window.__trackingState93830=()=>{
 const f=document.querySelector('#hmk-time-episode-form');
 return {view,eval:episodeEvaluationRequested,identity:episodeEvaluatedIdentity,trail:timeEpisodeDraft.trackingTrail,formTrail:f?.elements.namedItem('trackingTrail')?.value,disabled:f?.elements.namedItem('trackingTrail')?.disabled,task:episodeCurrentGuidedStep,request:episodePendingSkillRequest,problem:f?.dataset.episodeProblem};
};
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
 row.locator('[data-shared-plan-kind]').select_option('tracking')
 row=page.locator('[data-shared-plan-card]').first
 row.locator('[data-shared-row-actor]').select_option('a')
 page.locator('[data-shared-row-run]').click()
 f=page.locator('#hmk-time-episode-form')
 assert f.count()==1,'No episode form'
 print('FORM',f.locator('[name=kind]').input_value(),'BUTTON',f.locator('[data-episode-confirm-trail]').count(),flush=True)
 state=page.evaluate('window.__forceTrackingEdit93830()');print('INIT',state,flush=True)
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
  skill.locator('[name=rollA]').fill('31')
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
 # actual skill request absent if any earlier evidence missing; still locked on explicit click
 assert not errs,errs
 print('PASS typing, explicit confirm, immutability, no browser JS error',flush=True)
 b.close()
