from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf-8');mark='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(mark):])
mods['app.js']+='''
window.__selected509=()=>selected;
window.__seed509=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const state=require('./src/integration/persistent-combat-state.js');
 const roster=['guide','companion'].map((id,i)=>({id,name:i?'Cestovatel':'Průvodce',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{name:"Endurance",ml:60},{name:"Survival",ml:55}],combatState:state.initialCombatState(),expedition:{claims:{}}}}));
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Test',eventId:'init509',gmConfirmed:true,campaignId:'c509',characterIds:roster.map(c=>c.id)});
 const watch={id:'watch509',characterId:'guide',calendarCampaignId:'c509',campaignMinute:480,
 calendarTrekProof:{format:'hmk-trekking-watch-evidence-v1',campaignMinute:480,
 partyModes:{memberIds:['companion','guide']},weatherWatch:{requiresWeatherHazardRoll:true,hazard:'cold'},
 conveyance:'foot',hazards:{direction:null,survival:null},encounter:{encounter:false}}};
 data=clean();data.characters=roster;data.campaignClock=clock;data.journal=[watch];
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='overview';storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};
 const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
'''
bundle=mark+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1600,'height':1000});errors=[];dialogs=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for style in ['styles.css','book-templates.css','skill-workbench.css']:page.add_style_tag(content=(root/style).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed509()')
 html=page.locator('#app').inner_text()
 assert 'Cold/Heat' in html or 'Weather Hazard' in html,(html[-1800:],errors,dialogs)
 assert 'Průvodce' in html and 'Cestovatel' in html,(html[-1800:],errors)
 assert not errors,errors
 links=page.locator('[data-cal-kind="trek-weather-hazard"]')
 assert links.count()>=2,(links.count(),html[-1800:])
 chosen=page.locator('[data-cal-kind="trek-weather-hazard"][data-cal-link="companion"]')
 assert chosen.count()>=1,(chosen.count(),links.all_text_contents())
 chosen.first.click()
 # The clock's secondary roll must be routed into Skills, never leave the
 # original screen in Hazards with no primary selector.
 assert page.locator('#skill-secondary-form').count()==1,(page.locator('#app').inner_text()[-1400:],errors)
 assert page.evaluate('window.__selected509()')=='companion',('calendar routed to wrong actor',page.evaluate('window.__selected509()'))
 value=page.locator('#skill-secondary-form [name="primary"]').input_value()
 assert value in ('Endurance','Survival'),(value,errors)
 assert not errors,errors
 print('PASS Chromium: two weather hazards; companion link opens correctly preselected Skills form')
 b.close()
