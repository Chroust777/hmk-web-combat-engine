from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1];raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
modules['app.js']+='''
window.__seedSkill504=()=>{
 const attrs={str:12,end:12,dex:12,agl:12,per:12,cml:12,aur:12,wil:12,rea:12,cre:12,emp:12,elo:12};
 data=clean();data.characters=[{id:'hero504',name:'Karel',kind:'PC',occupation:'Ranger',hmk:{attributes:attrs,skills:[{id:'awareness-skill-504',name:'Awareness',ml:45}],combatState:require('./src/integration/persistent-combat-state.js').initialCombatState(),expedition:{claims:{}}}}];
 data.campaignClock=require('./src/integration/hmk-campaign-calendar.js').createCampaignCalendar({day:1,hour:8,minute:0,label:'Test',eventId:'begin-skill',gmConfirmed:true,campaignId:'skill504',characterIds:['hero504']});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='overview';provisionScope='person';provisionGuideActorId='hero504';storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'month',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};
 const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
'''
bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--no-zygote']);page=b.new_page(viewport={'width':1800,'height':1000});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept('Skill audit' if d.type=='prompt' else None)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle);page.evaluate('window.__seedSkill504()')
 assert not errors,errors
 f=page.locator('#campaign-plan-form')
 assert f.locator('select[name="skill"] option[value="Awareness"]').count()==1, f.inner_text()
 f.locator('[name="title"]').fill('Hod Awareness')
 f.locator('[name="characterId"]').select_option('hero504')
 f.locator('[name="destination"]').select_option('skills')
 f.locator('[name="skill"]').select_option('Awareness')
 f.locator('[name="requiresAction"]').check()
 f.locator('[name="gmConfirmed"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(180)
 state=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 assert state['campaignClock']['plans'][0]['skill']=='Awareness',(state['campaignClock'].get('plans'),errors,dialogs)
 # Check before any actual roll must be rejected.
 check=page.locator('[data-cal-resolve]').first
 check.click();page.wait_for_timeout(100)
 state=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 assert len(state['campaignClock'].get('planResolutions',[]))==0, dialogs
 assert any('Nejprve proveďte' in x for x in dialogs),dialogs
 link=page.locator('[data-cal-skill="Awareness"]').first
 link.click();page.wait_for_timeout(120)
 assert page.locator('#skill-secondary-form [name="primary"]').input_value()=='Awareness'
 assert page.locator('#skill-secondary-form [name="rollA"]').input_value()==''
 assert not errors,errors
 print('PASS Chromium v93.504: explicitly required skill stored with GM appointment, checked before resolution, Skill Workbench opened with Awareness preselected and no invented dice')
 b.close()
