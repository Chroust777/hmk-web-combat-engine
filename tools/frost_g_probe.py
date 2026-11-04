from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path('/mnt/data/hmk93712_work')
raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);mods['app.js']+='''
window.__t=(i)=>{selected=data.characters[i].id;view='sheet';activeSheetSection='hazards';render()};window.__s=()=>({minute:data.campaignClock?.minute,shock:persistentStateOf(data.characters[0]).shock,wounds:persistentStateOf(data.characters[0]).wounds.map(w=>({id:w.id,location:w.location,severity:w.severity,level:w.level,treated:w.healing?.treated,healing:w.healing})),due:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal).due.map(x=>({kind:x.kind,sourceId:x.sourceId,characterId:x.characterId})),journal:data.journal.length});
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
records=json.loads(Path('/mnt/data/hmk93707_work/fixtures/pre_skin_multilocation.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']);page=b.new_page(viewport={'width':1440,'height':1200});page.set_default_timeout(5000)
 errors=[]; dialogs=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<html><head></head><body><div id="app"></div></body></html>');page.evaluate('''r=>{const m=new Map(Object.entries(r));const a={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''',records)
 for f in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(root/f).read_text())
 page.add_script_tag(content=bundle);page.evaluate('__t(0)')
 print('ERR',errors, 'state',page.evaluate('__s()'),flush=True)
 form=page.locator('form[data-skill-weather-skin]');print('form',form.count(),flush=True)
 if not form.count():raise SystemExit(1)
 form.evaluate('f=>{for(let p=f;p;p=p.parentElement)if(p.tagName==="DETAILS")p.open=true}')
 print('picks',page.evaluate('''()=>[...document.querySelectorAll('[data-weather-skin-select]')].filter(x=>x.checked).slice(0,12).map(x=>({loc:x.dataset.skinLocation,side:x.dataset.skinSide,state:x.dataset.skinAutoState,text:x.parentElement.innerText}))'''),flush=True)
 print('first row',page.evaluate('''()=>[...document.querySelectorAll('[data-weather-skin-row]')].slice(0,2).map(x=>x.outerHTML.slice(0,800))'''),flush=True)
 form.locator('[name=noneExposed]').check(force=True)
 form.locator('[data-skin-location=ft][data-skin-side=left]').evaluate('e=>e.click()')
 print('picked',page.locator('[data-weather-skin-row]').count(),flush=True)
 form.locator('[name=windD20]').fill('18');form.locator('[name=durationD20]').fill('13')
 print('preview',page.locator('[data-weather-skin-preview]').first.inner_text(), 'level', page.locator('[data-weather-skin-row]').first.get_attribute('data-skin-level'),flush=True)
 shock=form.locator('[data-weather-skin-shock]');print('shock attr',shock.get_attribute('disabled'),flush=True)
 if not shock.is_disabled():shock.fill('1')
 print('preview2',page.locator('[data-weather-skin-preview]').first.inner_text(),flush=True)
 form.locator('button[type=submit]').click()
 print('after skin',page.evaluate('__s()'), 'errs',errors, 'dialogs',dialogs[-3:],flush=True)
 Path('/mnt/data/hmk93712_tests/frost_g_fixture.json').write_text(json.dumps(page.evaluate('''()=>Object.fromEntries([...Array(localStorage.length)].map((_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)]}))''')));
 print('care cards',page.locator('[data-weather-care-card]').count(),'frost',page.locator('#hmk-frost-amputation-form').count(), 'visible',page.locator('.hmk-weather-care [data-weather-care-card]:not([hidden])').all_text_contents()[:1],flush=True)
 b.close()
