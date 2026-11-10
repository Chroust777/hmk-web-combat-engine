"""Chromium UI: enforce and explain a 104-minute GM/Treatment deadline before shared-window creation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__deadline93814=()=>{
 const cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);
 const C=require('./src/integration/hmk-calendar-planner.js');
 data.campaignClock=C.addGMCalendarPlan(data.campaignClock,{
  id:'audit-treatment-start',eventId:'audit-treatment-registration',title:'Dokončení časovaného Treatment (bez nového hodu)',
  note:'Testovací termín pouze pro ověření Pochodu',characterId:'a',minute:584,endMinute:584,
  destination:'healing',requiresAction:true,trigger:'start',confirmed:true});
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();return {now:data.campaignClock.minute,deadline:584,confirmed:!!data.campaignClock.plans.length};
};
'''
mods['app.js']+=seed
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1460,'height':900});page.set_default_timeout(12000)
 errs=[]; dialogs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()')
 cap=page.locator('[data-shared-window-cap]');assert cap.is_visible()
 assert '960 minut' in cap.inner_text()
 state=page.evaluate('window.__deadline93814()');assert state['now']==480
 before=cap.inner_text();print('BEFORE START',before,flush=True)
 assert '104 minut' in before and 'Treatment' in before and '09:44' in before,before
 inp=page.locator('[data-shared-window-minutes]');assert inp.get_attribute('max')=='104'
 inp.fill('104');page.locator('[data-shared-window-create]').click()
 assert cap.is_hidden()
 assert page.locator('[data-shared-window-panel]').inner_text().count('Maximální délka nového intervalu')==0
 assert not errs,errs
 print('AFTER START: cap hidden, 104-minute window active, no duplicate warning',flush=True)
 print('PASS Chromium v93.814: 104-minute Treatment deadline and maximum shown before interval; cap hidden after active; no browser errors.',flush=True)
 b.close()
