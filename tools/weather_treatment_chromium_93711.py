from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path('/mnt/data/hmk93711_work')
raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);mods['app.js']+='''
window.__testSelect=(i)=>{selected=data.characters[i].id;view='sheet';activeSheetSection='hazards';render()};
window.__testState=()=>({clock:data.campaignClock?.minute,who:data.characters.map(c=>({wounds:persistentStateOf(c).wounds.map(w=>({location:w.location,side:w.side,level:w.level})),shock:persistentStateOf(c).shock})),proofs:data.journal.filter(j=>j.skillTestProof?.type==='skill-weather-skin').map(j=>j.skillTestProof)});
window.__testRender=()=>render();window.__testInjectCare=()=>{document.getElementById('app').insertAdjacentHTML('beforeend',hmkLongtermHealingPanel([data.characters[0]],{origin:'travel-weather'}));refreshAllCalendarHealingFields();enhanceHMKDiceFields();syncWeatherCarePanel();};
''';bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
records=json.loads(Path('/mnt/data/hmk93707_work/fixtures/pre_skin_multilocation.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1420,'height':950});page.set_default_timeout(18000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''r=>{const m=new Map(Object.entries(r));const a={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''',records)
 for f in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(root/f).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('__testSelect(0)')
 form=page.locator('form[data-skill-weather-skin]');form.evaluate("e=>{for(let p=e;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true}")
 print('form',form.count(),'auto',form.get_attribute('data-skin-coverage-complete'),'errs',errors,flush=True)
 assert form.count()==1
 assert form.get_attribute('data-skin-coverage-complete')=='yes'
 total=form.locator('[data-weather-skin-select]').count()
 selected=form.locator('[data-weather-skin-select]:checked').count()
 rows=form.locator('[data-weather-skin-row]').count()
 visible=form.locator('[data-weather-skin-row]:visible').count()
 print('Total',total,'selected',selected,'rows',rows,'visible',visible,flush=True)
 assert total==24 and rows==selected and visible==1,(total,selected,rows,visible)
 assert not form.locator('[name="gmConfirmed"]').count()
 # GM decides only a situational difference, no forced confirmation checkbox.
 form.locator('.hc-weather-skin-exceptions').evaluate('(e)=>e.open=true')
 # Only face is really uncovered for this scenario; unchanged protected coverage is calculated.
 pick=form.locator('[data-weather-skin-select][data-skin-location="fa"]')
 assert pick.is_checked()
 form.evaluate('''f=>{for(const p of f.querySelectorAll('[data-weather-skin-select]')){if(p.dataset.skinLocation==='fa')continue;if(p.checked){p.checked=false;p.dispatchEvent(new Event('change',{bubbles:true}))}}}''')
 assert form.locator('[data-weather-skin-row]').count()==1
 assert form.locator('[data-weather-skin-none]').is_checked()==False
 form.locator('[name=windD20]').fill('4');form.locator('[name=durationD20]').fill('17')
 row=form.locator('[data-weather-skin-row]');print('Face',row.get_attribute('data-skin-av'),row.get_attribute('data-skin-level'),flush=True)
 assert row.get_attribute('data-skin-level')=='2'
 row.locator('[data-weather-skin-shock]').fill('21')
 print('Submit enabled',form.locator('button[type=submit]').is_enabled(),flush=True)
 assert form.locator('button[type=submit]').is_enabled()
 before=page.evaluate('__testState()');form.locator('button[type=submit]').click()
 after=page.evaluate('__testState()')
 print('WOUNDS',after['who'][0]['wounds'],'proofs',len(after['proofs']),'errors',errors,'dialogs',dialogs,flush=True)
 assert len(after['who'][0]['wounds'])==1
 assert after['who'][0]['wounds'][0]['location']=='fa'
 assert len(after['proofs'])==1
 assert after['clock']==before['clock']
 assert not errors,errors
 print('PASS Chromium Frostbite automatic inventory coverage -> GM actual exception -> one Shock d100 -> one wound persisted',flush=True)
 page.evaluate('__testInjectCare()')
 count=page.locator('.hmk-weather-care').count()
 print('care panel',count,'active',page.locator('.hmk-weather-care [data-weather-care-card]:not([hidden])').count(),flush=True)
 assert count==1
 assert page.locator('.hmk-weather-care [data-weather-care-card]:not([hidden])').count()==1
 print('calendar age',page.locator('#hmk-treatment-form [name=daySinceInjury]').input_value(),flush=True)
 print('procedure',page.locator('#hmk-treatment-form [name=procedureStartMinute]').input_value(),page.locator('#hmk-treatment-form [name=procedureEndMinute]').input_value(),flush=True)
 assert page.locator('#hmk-treatment-form [name=daySinceInjury]').input_value()!=''
 assert not errors,errors
 print('PASS Chromium: anchored days and exclusive health card; procedure start/end still require explicit review',flush=True)
 b.close()
