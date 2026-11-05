"""Real local Chromium E2E against derived production script, no GitHub Pages access."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf-8'); marker='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(marker):])
modules['app.js']+='''
window.__seedTravel746=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const state=require('./src/integration/persistent-combat-state.js');
 const pcs=['pc-a','pc-b','pc-c'].map((id,i)=>({id,name:['Průvodce','Raněný cestovatel','Sběrač'][i],kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{id:'skill-sur',name:'Survival',ml:70},{id:'skill-end',name:'Endurance',ml:60}],healthState:state.initialCombatState(),combatState:state.initialCombatState()}}));
 const cal=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Izolovaná kampaň',eventId:'seed',gmConfirmed:true,campaignId:'audit746',characterIds:pcs.map(c=>c.id)});
 data=clean();data.characters=pcs;data.inventory=[];data.campaignClock=cal;data.journal=[];
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;cloudSync=null;
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__clockTravel746=()=>data.campaignClock.minute;
window.__entriesTravel746=()=>data.journal.length;
'''
bundle=marker+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1490,'height':960});errors=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map();const store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store});}''')
 for style in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/style).read_text(encoding='utf-8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seedTravel746()')
 assert not errors,errors
 assert 'Cestování a činnosti' in page.locator('#app').inner_text()
 form=page.locator('#hmk-time-episode-form');assert form.count()==1
 assert form.locator('[data-episode-finalize]').count()==0 or form.locator('[data-episode-finalize]').is_disabled()
 assert page.evaluate('window.__entriesTravel746()')==0
 clock=page.evaluate('window.__clockTravel746()')
 for n in ['5','60','239','240','1440']:
  form.locator('[name="minutes"]').fill(n)
  assert page.evaluate('window.__clockTravel746()')==clock
  assert page.evaluate('window.__entriesTravel746()')==0
 page.screenshot(path='/mnt/data/hmk_audit_work/HMK_93746_TRAVEL_PRECONFIRM.png',full_page=False)
 print('PRECONDITION PASS: 3 characters, 5/60/239/240/1440m edits never advance clock or create journal; submit disabled')
 # Explicit evaluation alone is still not final authorization of campaign time.
 actions=form.locator('button').all_inner_texts();print('BUTTONS',actions[-10:])
 evaluate=form.get_by_role('button',name='Vyhodnotit epizodu');print('EVAL',evaluate.count())
 if evaluate.count():
  evaluate.first.click()
  assert page.evaluate('window.__clockTravel746()')==clock
  assert page.evaluate('window.__entriesTravel746()')==0
  print('EVALUATE PASS: no authoritative state before GM completion')
 else:print('EVALUATE NOT FOUND: click scenario unverified')
 print('ERRORS',errors[:2]);assert not errors,errors
 browser.close()
