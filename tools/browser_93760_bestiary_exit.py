"""Real Chromium click flow on current production Bestiary UI with isolated GM fixture; no GitHub Pages."""
from pathlib import Path
import json, traceback
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';modules,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);mod=modules['app.js']
mod+='''
window.__audit760_init=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 data=clean();const pc={id:'gm-character-760',name:'GM postava',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[]}};
 data.characters=[pc];data.inventory=[];data.journal=[];
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Bestiary encounter after combat',eventId:'gm-init-760',gmConfirmed:true,campaignId:'audit760',characterIds:[pc.id]});
 selected=pc.id;view='encounter';combatBestiaryExpanded=true;storageReadOnly=false;cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);
 render();return {minute:data.campaignClock.minute,html:document.body.innerText.slice(0,800)};
};
window.__audit760_state=()=>({minute:data.campaignClock.minute,characters:data.characters.length,journal:data.journal.length,active:require('./src/integration/hmk-bestiary-563.js').encounterBeastHistory(data,data.campaignClock.campaignId).filter(x=>x.active).length,
 departures:data.journal.filter(j=>j.bestiaryDeparture93760).map(j=>({id:j.bestiaryDeparture93760.targetId,outcome:j.bestiaryDeparture93760.outcome,snapshot:j.bestiaryDeparture93760.medicalSnapshot})),
 calendarPanel:!!document.querySelector('.hmk-bestiary-calendar-due')});
window.__audit760_combat=()=>{view='encounter';combatBestiaryExpanded=true;render();};
window.__audit760_calendar=()=>{view='calendar';calendarLanding=false;activeCalendarSection='overview';render();};
window.__audit760_advance=()=>{const C=require('./src/integration/hmk-campaign-calendar.js');const clock=C.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:2000,eventId:'gm-advance-760',reason:'GM advances the independent campaign after encounter',gmConfirmed:true,characters:data.characters,journal:data.journal,inventory:data.inventory});data.campaignClock=clock;return clock.minute;};
'''
modules['app.js']=mod;bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1600,'height':1000});page.set_default_timeout(9000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 try:
  print('INIT',page.evaluate('window.__audit760_init()'),flush=True)
  print('ERRORS',errors[:2],flush=True)
  form=page.locator('form[data-hmk-beast-spawn]')
  print('SPAWN FORMS',form.count(), 'DISMISS',page.locator('[data-hmk-beast-dismiss]').count(),flush=True)
  assert form.count()==1,'Missing real Bestiary generator form'
  form.locator('[name=source]').select_option('new')
  form.locator('[name=templateId]').select_option('wolf')
  form.locator('[name=name]').fill('Vlk u brodu')
  form.locator('[name=count]').fill('1')
  before=page.evaluate('window.__audit760_state()')
  form.locator('[type=submit]').click()
  after=page.evaluate('window.__audit760_state()')
  print('SPAWN',before,after,'dialog',dialogs[-1] if dialogs else 'none',flush=True)
  assert after['active']==1 and after['journal']==before['journal']+1 and after['minute']==before['minute']
  page.evaluate('window.__audit760_combat()')
  ctl=page.locator('[data-hmk-beast-departure-outcome]');print('CHOICE',ctl.count(),flush=True);assert ctl.count()==1
  ctl.select_option('fled')
  page.screenshot(path=str(root/'docs/AUDIT_v93.760_bestiary_before_GM.png'),full_page=True)
  btn=page.locator('[data-hmk-beast-dismiss]');assert btn.is_visible();btn.click()
  after=page.evaluate('window.__audit760_state()')
  print('DEPARTURE',after,'dialog',dialogs[-1] if dialogs else 'none','ERRORS',errors[-3:],flush=True)
  assert after['active']==0 and after['journal']==before['journal']+2 and after['minute']==before['minute']
  assert len(after['departures'])==1 and after['departures'][0]['outcome']=='fled'
  page.evaluate('window.__audit760_combat()')
  assert page.locator('.hmk-bestiary-archive').count()==1
  assert page.locator('[data-hmk-beast-dismiss]').count()==0
  page.locator('.hmk-bestiary-archive summary').click()
  page.screenshot(path=str(root/'docs/AUDIT_v93.760_bestiary_archive.png'),full_page=True)
  page.evaluate('window.__audit760_calendar()')
  panel=page.locator('.hmk-bestiary-calendar-due');assert panel.count()==0
  page.screenshot(path=str(root/'docs/AUDIT_v93.760_calendar_no_bestiary.png'),full_page=True)
  print('CALENDAR PANEL',panel.count(),'calendar',page.evaluate('window.__audit760_state()'),flush=True)
  # Authoritative calendar final GM commit is tested by unit separately; here
  # a function-level call proves temporary Bestiary snapshots do not create a clock barrier.
  nextminute=page.evaluate('window.__audit760_advance()')
  print('ADVANCE',nextminute,flush=True)
  assert nextminute==after['minute']+2000
  assert not errors,'Uncaught browser errors: '+repr(errors)
  (root/'docs/AUDIT_v93.760_chromium_scene.json').write_text(json.dumps({'before':before,'after':after,'afterAdvance':nextminute,'dialogs':dialogs,'pageErrors':errors},ensure_ascii=False,indent=2),encoding='utf8')
  print('PASS Chromium 93.760 Bestiary create -> GM selects fled -> confirms dismiss -> immutable archive -> no calendar Bestiary panel -> time advance without NPC side effects',flush=True)
 except Exception:
  traceback.print_exc()
  print('PAGE ERRORS',errors,'DIALOGS',dialogs[-4:],flush=True)
  page.screenshot(path=str(root/'docs/AUDIT_v93.760_browser_failure.png'),full_page=True)
  raise
 finally: browser.close()
