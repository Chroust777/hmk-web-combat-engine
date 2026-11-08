from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os
REST_KIND=os.environ.get("HMK_KIND","rest")
REST_MINUTES=os.environ.get("HMK_MINUTES","240")
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'tools/browser_93781_mixed_activity_animals.py').read_text()
ns={'__file__':str(ROOT/'tools/browser_93781_mixed_activity_animals.py')}
exec(source.split('with sync_playwright() as p:',1)[0],ns)
mods,raw,prefix,end=ns['mods'],ns['raw'],ns['prefix'],ns['end']
mods['app.js']+='''
window.__restSeed93791=()=>{window.__seedRows93772();data.characters.find(x=>x.id==='a').hmk.healthState.fatigue.weariness=41;storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);render();};
window.__restReport93791=()=>({minute:data.campaignClock.minute,weariness:data.characters.find(x=>x.id==='a').hmk.healthState.fatigue.weariness,stored:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute,plans:sharedTimeWindowPlans.map(p=>({actor:p.actorId,kind:p.kind,done:p.done})),queue:sharedTimeWindowQueue.length,episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({kind:j.calendarTimeEpisode.kind,minutes:j.calendarTimeEpisode.minutes})),lastRecs:data.journal.filter(j=>j.calendarTimeEpisode?.kind==='rest').length});
window.__travelValidation93791=()=>[...document.querySelectorAll('[data-hmk-travel-invalid=yes]')].map(n=>({tag:n.tagName,sel:n.outerHTML.slice(0,160),active:n===document.activeElement}));
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(12000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append((d.type,d.message[:160])),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (ROOT/css).exists():page.add_style_tag(content=(ROOT/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__restSeed93791()')
 print('INIT',page.evaluate('window.__restReport93791()'),flush=True)
 page.locator('[data-shared-window-minutes]').fill(REST_MINUTES);page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();r=page.locator('[data-shared-plan-card]').last
 r.locator('[data-shared-row-actor]').select_option('a');r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-plan-kind]').select_option(REST_KIND)
 print('PREPARED',page.evaluate('window.__restReport93791()'),flush=True)
 page.locator('[data-shared-row-run]').click();form=page.locator('#hmk-time-episode-form')
 print('FORM',form.count(),form.is_visible(),flush=True)
 # Confirm becomes visible only after first Evaluate, as in the guided UI.
 for i in range(12):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  form.locator('[data-episode-evaluate]').click()
  if form.locator('[name=confirmed]').is_visible() and not form.locator('[name=confirmed]').is_checked(): form.locator('[name=confirmed]').check()
  fld=form.get_attribute('data-episode-problem-field');msg=form.get_attribute('data-episode-problem')
  print('STEP',i,repr(fld),repr(msg),'STAGE',page.locator('[data-episode-window-stage]').is_enabled(),flush=True)
  if fld and fld.startswith('end_'):form.locator('[name="'+fld+'"]').fill('2')
  elif fld in ('temperatureD10','precipitationD10','precipitationD6','encounterD100'):
   form.locator('[name="'+fld+'"]').fill(str({'temperatureD10':5,'precipitationD10':5,'precipitationD6':6,'encounterD100':100}[fld]));
  elif fld=='confirmed':form.locator('[name=confirmed]').check()
  else:
   print('TASK',page.locator('[data-episode-checklist]').inner_text()[-700:],flush=True)
   break
 if page.locator('[data-episode-window-stage]').is_enabled():
  page.locator('[data-episode-window-stage]').click()
  print('STAGED',page.evaluate('window.__restReport93791()'),flush=True)
  page.locator('[data-episode-window-commit]').click()
  print('COMMITTED',page.evaluate('window.__restReport93791()'), 'DIALOGS',dialogs[-4:],flush=True)
 else:print('NOT STAGEABLE',flush=True)
 if REST_KIND=='rest' and REST_MINUTES=='240' and page.evaluate('window.__restReport93791().weariness')==36:
  page.locator('[data-shared-window-minutes]').fill('10')
  page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click()
  row=page.locator('[data-shared-plan-card]').last
  row.locator('[data-shared-row-actor]').select_option('a')
  page.locator('[data-shared-row-run]').click()
  travel=page.locator('#hmk-time-episode-form')
  travel.locator('[data-episode-evaluate]').click()
  print('AFTER_REST_TRAVEL_CHECK',repr(travel.get_attribute('data-episode-problem-field')),repr(travel.get_attribute('data-episode-problem')),flush=True)
 print('ERRORS',errors[:4],flush=True)
 b.close()
