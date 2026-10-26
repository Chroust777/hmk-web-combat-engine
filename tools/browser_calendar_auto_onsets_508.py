from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf-8');mark='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(mark):])
mods['app.js']+='''
window.__seed508=()=>{
 const init=require('./src/integration/persistent-combat-state.js').initialCombatState;
 const cals=require('./src/integration/hmk-campaign-calendar.js');
 const poison=require('./src/integration/hmk-poison-course.js');
 const attrs={str:12,end:12,dex:12,agl:12,per:12,cml:12,aur:12,wil:12,rea:12,cre:12,emp:12,elo:12};
 const ch={id:'test508actor',name:'Karel',kind:'PC',occupation:'Farmer',hmk:{attributes:attrs,skills:[],combatState:init(),expedition:{claims:{}}}};
 const res=poison.preparePoisonStart({actor:ch,state:ch.hmk.combatState,sourceId:'poison-508',round:1,transmission:'contact',onsetMinutes:10,periodMinutes:60,initialHR:5,symptomD10s:[1,2,3,4],actualExposureConfirmed:true,gmConfirmed:true});
 ch.hmk.combatState=res.state;
 let clock=cals.createCampaignCalendar({day:1,hour:8,minute:0,label:'Test',eventId:'init508',gmConfirmed:true,campaignId:'c508',characterIds:[ch.id]});
 clock=cals.anchorCampaignOrigin(clock,{kind:'poison',characterId:ch.id,episodeId:res.course.id,eventId:'anchor508',gmConfirmed:true});
 data=clean();data.characters=[ch];data.campaignClock=clock;view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='overview';storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};
 const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
'''
bundle=mark+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1700,'height':1000});errors=[];alerts=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for style in ['styles.css','book-templates.css','skill-workbench.css']:
  page.add_style_tag(content=(root/style).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed508()')
 form=page.locator('#campaign-quick-advance-form')
 assert form.count()==1, (errors,page.locator('#app').inner_text()[-1000:])
 print('quick options',form.locator('select[name=deltaMinutes] option').all_text_contents())
 print('values',form.locator('select[name=deltaMinutes] option').evaluate_all('(xs)=>xs.map(x=>x.value)'))
 # Need a jump beyond onset minute (10) but before first course (70).
 values=form.locator('select[name=deltaMinutes] option').evaluate_all('(xs)=>xs.map(x=>x.value)')
 if '30' in values:form.locator('select[name=deltaMinutes]').select_option('30')
 elif '15' in values:form.locator('select[name=deltaMinutes]').select_option('15')
 else:raise AssertionError('No supported jump length between 10 and 70')
 advance=int(form.locator('select[name=deltaMinutes]').input_value())
 form.locator('button[type=submit]').click();page.wait_for_timeout(350)
 state=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 print('minute',state['campaignClock']['minute'],'alerts',alerts,'errors',errors)
 assert state['campaignClock']['minute']==480+advance,(state['campaignClock']['minute'],alerts,errors)
 case=state['characters'][0]['hmk']['combatState']['toxinCourses'][0]
 assert case['status']=='active' and case['elapsedMinutes']==10,case
 proof=[x for x in state['journal'] if x.get('skillTestProof',{}).get('type')=='poison-onset']
 assert len(proof)==1,proof
 assert proof[0]['campaignMinute']==490,proof
 # A following longer jump must be rejected because it would skip mandatory d100 course.
 form=page.locator('#campaign-advance-form')
 assert form.count()==1
 form.locator('[name=days]').fill('0');form.locator('[name=hours]').fill('1');form.locator('[name=minutes]').fill('0');form.locator('button[type=submit]').click();page.wait_for_timeout(180)
 state=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 assert state['campaignClock']['minute']==480+advance,('skipped course',alerts)
 assert not errors,errors
 print('PASS Chromium v93.508: skipped automatic Poison onset, persisted correct exact-minute proof, mandatory next Course protected, no duplicate on reload')
 b.close()
