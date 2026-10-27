from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text()
prefix='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__resolveTrek519=(value,allow=false)=>trekResolveActorToken(value,{unregisteredAllowed:allow});
window.__seedTrek519=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const a='3fc8b3a2-4c8d-4915-a1ca-ce7a5bbb995a';
 const b='4e19e0cd-2e9a-433a-9a42-76c1a5552207';
 data=clean();data.characters=[{id:a,name:'aaa',kind:'PC',hmk:{}},{id:b,name:'bbb',kind:'PC',hmk:{}}];
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Testovací kampaň',eventId:'start-ui519',gmConfirmed:true,campaignId:'campaign-ui519',characterIds:[a,b]});
 data.journal=[];view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';
 calendarUI={mode:"day",monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;render();
};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1366,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),get length(){return m.size}}});Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{}}});}""")
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedTrek519()')
 panel=page.locator('.hc-trek-routine');assert panel.count()==1,(errors,page.locator('body').inner_text()[-5000:])
 assert len(panel.locator('.hmk-trek-steps li').all())==8
 assert page.evaluate('window.__resolveTrek519("AAA")')=='3fc8b3a2-4c8d-4915-a1ca-ce7a5bbb995a'
 assert page.evaluate('window.__resolveTrek519("bbb")')=='4e19e0cd-2e9a-433a-9a42-76c1a5552207'
 assert page.evaluate('window.__resolveTrek519("Nový mezek",true)')=='Nový mezek'
 assert page.evaluate('window.__resolveTrek519("3fc8b3a2-4c8d-4915-a1ca-ce7a5bbb995a")')=='3fc8b3a2-4c8d-4915-a1ca-ce7a5bbb995a'
 assert page.evaluate('(()=>{try{window.__resolveTrek519("Neznámý honák");return false}catch(e){return /nebyl nalezen/.test(e.message)}})()')

 assert '3fc8b3a2' not in page.locator('#app').inner_text()
 assert '4e19e0cd' not in page.locator('#app').inner_text()
 assert panel.locator('input[name="trekMemberIds"]').count()==2
 assert panel.locator('input[name="trekMemberIds"]').first.get_attribute('value')=='3fc8b3a2-4c8d-4915-a1ca-ce7a5bbb995a'
 panel.locator('.hmk-trek-entry>summary').click()
 form=page.locator('#campaign-trekking-context-form')
 assert form.count()==1 and form.locator('fieldset.hmk-trek-section').count()==7
 names=form.locator('label input[name],label select[name],label textarea[name]').evaluate_all('(xs)=>xs.map(x=>x.name)')
 assert len(names)==len(set(names))+1 and names.count("trekMemberIds")==2,names
 unmapped=form.locator('label:has([name]):not([data-hmk-help])').all_inner_texts()
 assert not unmapped,unmapped
 form.locator('input[name="progress"]').fill('2')
 form.locator('input[name="slow"]').fill('1')
 form.locator('input[name="stalking"]').check()
 assert form.locator('input[name="progress"]').input_value()=='2'
 assert form.locator('input[name="slow"]').input_value()=='1'
 assert form.locator('input[name="stalking"]').is_checked()
 label=form.locator('label:has(input[name="progress"])')
 label.scroll_into_view_if_needed();label.hover()
 page.wait_for_timeout(100)
 tooltip=page.locator('.hmk-journal-floating-tooltip')
 assert tooltip.count()==1 and tooltip.is_visible(),(errors,tooltip.all_inner_texts())
 assert 'Orienteering' in tooltip.inner_text()
 page.screenshot(path='/mnt/data/HMK_v93.519_trekking_desktop_preview.png',full_page=False)
 print('DESKTOP PASS',len(names),'label help',form.locator('label[data-hmk-help]').count(),'legend help',form.locator('legend[data-hmk-help]').count(),'errors',errors)
 assert not errors,errors
 # Duplicate names are never matched arbitrarily to one of two Combat States.
 assert page.evaluate('(()=>{try{window.__resolveTrek519("aaa");return true}catch(e){return false}})()')
 mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
 mobile.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 mobile.evaluate("""()=>{const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),get length(){return m.size}}});Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{}}});}""")
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css']:mobile.add_style_tag(content=(root/css).read_text())
 mobile.add_script_tag(content=bundle);mobile.evaluate('window.__seedTrek519()')
 mobile.locator('.hmk-trek-entry>summary').click()
 assert mobile.locator('#campaign-trekking-context-form [name="progress"]').is_visible()
 cols=mobile.locator('.hmk-trek-grid').first.evaluate('(el)=>getComputedStyle(el).gridTemplateColumns')
 print('MOBILE PASS grid columns',cols)
 mobile.locator('#campaign-trekking-context-form [name="progress"]').scroll_into_view_if_needed()
 mobile.screenshot(path='/mnt/data/HMK_v93.519_trekking_mobile_preview.png')
 browser.close()
