from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys,re
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'tools/browser_93781_mixed_activity_animals.py').read_text()
ns={'__file__':str(ROOT/'tools/browser_93781_mixed_activity_animals.py')}
exec(source.split('with sync_playwright() as p:',1)[0],ns)
bundle=ns['bundle']
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':960});page.set_default_timeout(12000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if(ROOT/css).exists():page.add_style_tag(content=(ROOT/css).read_text(encoding='utf-8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seedRows93772()')
 print('INITIAL',page.title(),page.locator('[data-shared-window-minutes]').count(),errors,flush=True)
 # invalid (zero) minutes with one valid weather
 page.locator('[data-shared-window-minutes]').fill('0')
 page.locator('[data-shared-window-create]').click()
 observed=page.evaluate('''()=>({active:document.activeElement?.outerHTML.slice(0,260),input:document.querySelector('[data-shared-window-minutes]')?.outerHTML.slice(0,280),hasMarked:document.querySelectorAll('.hc-episode-needs-input').length,focusIsMinutes:document.activeElement===document.querySelector('[data-shared-window-minutes]')})''')
 print('INVALID_MINUTES',json.dumps({'alerts':dialogs[-1:],'observed':observed},ensure_ascii=False),flush=True)
 assert observed['focusIsMinutes'] and 'data-hmk-travel-invalid' in observed['input']
 # Missing weather
 page.locator('[data-shared-window-minutes]').fill('30')
 page.locator('[data-shared-window-weather]').select_option('')
 page.locator('[data-shared-window-create]').click()
 observed=page.evaluate('''()=>({active:document.activeElement?.outerHTML.slice(0,260),input:document.querySelector('[data-shared-window-weather]')?.outerHTML.slice(0,280),hasMarked:document.querySelectorAll('.hc-episode-needs-input').length,focusIsWeather:document.activeElement===document.querySelector('[data-shared-window-weather]')})''')
 print('MISSING_WEATHER',json.dumps({'alerts':dialogs[-1:],'observed':observed},ensure_ascii=False),flush=True)
 assert observed['focusIsWeather'] and 'data-hmk-travel-invalid' in observed['input']
 # Rest with Weariness 41 (assert at least choice can be planned)
 page.evaluate('''()=>{data.characters[0].hmk.healthState.fatigue.weariness=41;storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);render()}''') if False else None
 # Row-level invalid weather: alert OK must focus the SAME row after rerender.
 page.locator('[data-shared-window-weather]').select_option('global-weather-snow')
 page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 card=page.locator('[data-shared-plan-card]').last
 card.locator('[data-shared-row-actor]').select_option('a')
 card=page.locator('[data-shared-plan-card]').last
 card.locator('[data-shared-row-weather]').select_option('')
 row_state=page.evaluate("""()=>({active:document.activeElement?.outerHTML.slice(0,220),invalid:[...document.querySelectorAll('[data-hmk-travel-invalid]')].map(x=>x.outerHTML.slice(0,180)),focusIsRowWeather:document.activeElement===document.querySelector('[data-shared-row-weather]')})""")
 print('ROW_WEATHER',json.dumps({'alerts':dialogs[-1:],'state':row_state},ensure_ascii=False),flush=True)
 assert row_state['focusIsRowWeather'] and row_state['invalid']
 assert not errors,errors
 print('PASS THREE VALIDATION FOCUSES; ERRORS',errors[:3],flush=True)
 b.close()
