from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
base=(ROOT/'tools/browser_93790_bleeding_full_cycle_continued.py').read_text().replace("ROOT=Path('/mnt/data/hmk_93786_work/hmk-web-combat-engine-main')","ROOT=Path(__file__).resolve().parents[1]")
ns={'__file__':str(ROOT/'tools/browser_93787_accident_agility_matrix.py')}
exec(base.rsplit('with sync_playwright() as p:',1)[0],ns)
mods,raw,prefix,end=ns['mods'],ns['raw'],ns['prefix'],ns['end']
mods['app.js']+='''
window.__noncombatCare93793=(kind)=>{if(kind==='blood'){window.__seedBleeder93790();const c=data.characters.find(x=>x.id==='a');const q=c.hmk.healthState;q.wounds[0].bleeding=false;q.wounds[0].nextAdvanceRound=null;q.bloodLoss={bp:3,weaknessFatigue:15,healingNextDay:11};synchronizeCombatInjuries(c,q);}selected='a';view='sheet';activeSheetSection='hazards';weatherCareActiveSection=kind;render();};
window.__setHealthMode93793=(kind)=>{hazardComposer={actorId:'a',kind};render();};
window.__inspectHealth93793=()=>{window.__seedBleeder93790();selected='a';view='sheet';activeSheetSection='hazards';render();return [...document.querySelectorAll('form')].map(f=>({id:f.id,attrs:[...f.attributes].filter(x=>x.name.startsWith('data-')).map(x=>x.name),visible:!!f.getClientRects().length,fields:[...f.querySelectorAll('input,select')].filter(x=>x.required).map(x=>x.name)})).filter(x=>x.id||x.attrs.some(a=>/weather|poison|disease|medical|shock/.test(a)));};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(10000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(ROOT/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 fs=page.evaluate('window.__inspectHealth93793()');print('FORMS',json.dumps(fs,ensure_ascii=False),flush=True)
 page.evaluate('window.__setHealthMode93793("poison")')
 for selector in ['form[data-hmk-poison-start]','form[data-hmk-disease-exposure]','form[data-weather-blood-start]','form[data-weather-shock-followup]','form[id="hmk-infection-course-form"]','form[id="hmk-healing-roll-form"]']:
  f=page.locator(selector)
  if f.count():
   f.first.evaluate('(x)=>{let y=x.closest("details");if(y)y.open=true}')
  if f.count() and f.first.is_visible():
   node=f.first
   node.locator('[type=submit]').first.click()
   result=page.evaluate('''()=>{const el=document.activeElement,l=el.closest('label');return {active:el?.name, invalid:el?.getAttribute('aria-invalid'),mark:el?.getAttribute('data-hmk-medical-invalid'),outline:l&&getComputedStyle(l).outlineColor,border:el&&getComputedStyle(el).borderColor,tooltip:el.validationMessage}}''')
   print('INVALID_TEST',selector,result,flush=True)
  else:print('NOT_VISIBLE',selector, f.count(),flush=True)
 page.evaluate('window.__setHealthMode93793("disease")')
 disease=page.locator('form[data-hmk-disease-exposure]')
 print('DISEASE_COUNT',disease.count(),flush=True)
 if disease.count():
  disease.evaluate('(x)=>{const d=x.closest("details");if(d)d.open=true}')
  disease.locator('[type=submit]').first.click()
  print('DISEASE_INVALID',page.evaluate('''()=>{const el=document.activeElement,l=el.closest('label');return {active:el?.name,invalid:el?.getAttribute('aria-invalid'),mark:el?.getAttribute('data-hmk-medical-invalid'),border:getComputedStyle(el).borderColor,outline:l&&getComputedStyle(l).outlineColor}}'''),flush=True)
 disease.locator('[name=sourceId]').fill('disease-93793')
 disease.locator('[name=diseaseKey]').fill('fever-93793')
 disease.locator('[name=contagionD100]').fill('99')
 disease.locator('[name=diseaseVariant]').select_option('floor-2')
 disease.locator('[name=gmConfirmed]').check()
 disease.locator('[type=submit]').first.click()
 print('DISEASE_CONDITIONAL_ERROR',page.evaluate('''()=>({active:document.activeElement?.name,error:document.querySelector('form[data-hmk-disease-exposure] output')?.textContent,invalid:[...document.querySelectorAll('[data-hmk-medical-invalid]')].map(x=>x.name)})'''),flush=True)
 # Variant must route to the actual exact missing UI field, not just error output.
 disease.locator('[name=diseaseVariant]').select_option('zero-paralysis')
 disease.locator('[name=gmConfirmedZero]').check()
 disease.locator('[type=submit]').first.click()
 print('PARALYSIS_MISSING_LIMB',page.evaluate('''()=>({active:document.activeElement?.name,marked:document.activeElement?.getAttribute('data-hmk-medical-invalid'),text:document.querySelector('form[data-hmk-disease-exposure] output')?.textContent})'''),flush=True)
 disease.locator('[name=zeroParalysisLimb]').select_option('left-leg')
 disease.locator('[name=gmConfirmedZero]').uncheck()
 disease.locator('[type=submit]').first.click()
 print('PARALYSIS_MISSING_GM',page.evaluate('''()=>({active:document.activeElement?.name,marked:document.activeElement?.getAttribute('data-hmk-medical-invalid'),text:document.querySelector('form[data-hmk-disease-exposure] output')?.textContent})'''),flush=True)
 for kind in ['blood','grim']:
  page.evaluate('window.__noncombatCare93793("'+kind+'")')
  selector='#hmk-blood-regeneration-form' if kind=='blood' else '#hmk-grim-shock-form'
  ff=page.locator(selector)
  print('NONCOMBAT_FORM',kind,ff.count(),ff.is_visible() if ff.count() else None,flush=True)
  if not ff.count() or not ff.is_visible():continue
  ff.locator('[name=roll]').fill('')
  if kind=='grim':
   
   for field,value in [('locationShock','0'),('shockML','70')]:
    el=ff.locator('[name='+field+']');print('GRIM_FIELD',field,el.input_value(),el.get_attribute('readonly'),flush=True)
    if el.get_attribute('readonly') is None:el.fill(value)
  print('NONCOMBAT_REQUIRED',kind,ff.locator('[name=roll]').get_attribute('required'),flush=True)
  ff.locator('[type=submit]').click()
  state=page.evaluate("""()=>({focused:document.activeElement?.name,mark:document.activeElement?.getAttribute('data-hmk-medical-invalid'),outline:document.activeElement?.closest('label')?getComputedStyle(document.activeElement.closest('label')).outlineColor:null})""")
  print('NONCOMBAT_MISSING',kind,state,flush=True)
  assert state['focused']=='roll' and state['mark']=='yes' and state['outline']=='rgb(176, 34, 34)',state
 print('PAGEERRORS',errors,flush=True)
 browser.close()
