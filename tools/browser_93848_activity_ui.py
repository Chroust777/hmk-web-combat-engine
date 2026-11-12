"""Actual Chromium UI visibility/confirmation regression v93.848.
Creates fresh staged groups through click controls; no fabricated rule results.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):]);seed=(root/'tools/browser_93807_switch.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
mods['app.js']+=seed+'''
window.__activityProof93848=()=>({minute:data.campaignClock?.minute,journal:data.journal.length,
 version:APP_VERSION,kind:document.querySelector('[name=kind]')?.value,
 tracker:document.querySelector('[name=trackingUse]')?.value,req:episodePendingSkillRequest?.field||null});
'''
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]

def exercise(kind):
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=b.new_page(viewport={'width':1450,'height':1000});page.set_default_timeout(12000)
  errors=[];dialogs=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
  page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page.evaluate("""()=>{const map=new Map(),s={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}""")
  for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
   page.add_style_tag(content=(root/css).read_text('utf8'))
  page.add_script_tag(content=bundle);page.evaluate('window.__seed93807()')
  page.locator('[data-shared-window-minutes]').fill('45');page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click();row=page.locator('[data-shared-plan-card]').last
  row.locator('[data-shared-row-actor]').select_option('a')
  if kind!='travel':row.locator('[data-shared-plan-kind]').select_option(kind)
  page.locator('[data-shared-row-run]').click()
  f=page.locator('#hmk-time-episode-form');assert f.count()
  assert f.locator('[name=kind]').input_value()==kind
  f.locator('[data-episode-section=skills]').evaluate('(n)=>n.open=true')
  before=page.evaluate('window.__activityProof93848()')
  if kind=='forage':
   assert f.locator('[data-episode-travel-priority]').is_hidden(), 'Travel-only priority in stationary Foraging'
   assert f.locator('[data-episode-modes-heading]').is_visible()
   assert 'Foraging' in f.locator('[data-episode-modes-heading]').inner_text()
   assert f.locator('[data-episode-tracking]').is_hidden()
   assert f.locator('[data-episode-orientation-new]').is_visible()
  if kind=='tracking':
   assert f.locator('[data-episode-travel-priority]').is_hidden(), 'Travel mode priority in Tracking'
   assert f.locator('[data-episode-orientation-new]').is_hidden()
   assert f.locator('[name=trackingUse]').input_value()=='new'
   assert f.locator('[data-episode-trail-fields]').is_visible()
  if kind=='travel':
   assert f.locator('[data-episode-travel-priority]').is_visible()
   assert f.locator('[name=trackingUse]').input_value()=='none', 'Travel must not automatically create Tracking'
   f.locator('[name=orientationPriority]').select_option('stealth')
   assert f.locator('[data-episode-tracking]').is_visible()
   assert f.locator('[data-episode-trail-fields]').is_hidden(), 'Stalking alone must not ask for a trail'
   assert 'Stalking' in f.locator('[data-episode-tracking-choice-help]').inner_text()
   f.locator('[name=trackingUse]').select_option('new')
   assert f.locator('[data-episode-trail-fields]').is_visible()
   assert f.locator('[name=trackingActorId]').is_visible()
   f.locator('[name=trackingUse]').select_option('none')
   assert f.locator('[data-episode-trail-fields]').is_hidden()
  (root/'tools/evidence_93848').mkdir(exist_ok=True)
  f.locator('[data-episode-section=skills]').screenshot(path=str(root/'tools/evidence_93848'/('ACTIVITY_'+kind.upper()+'.png')))
  after=page.evaluate('window.__activityProof93848()')
  assert before['minute']==after['minute'] and before['journal']==after['journal'],(before,after)
  assert not errors,errors
  print('PASS',kind,before,after,'errors',errors)
  b.close()
for kind in ('forage','tracking','travel'):exercise(kind)
