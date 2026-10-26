from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__seed504=()=>{
 const attrs={str:12,end:12,dex:12,agl:12,per:12,cml:12,aur:12,wil:12,rea:12,cre:12,emp:12,elo:12};
 data=clean();data.characters=['a504','b504'].map((id,i)=>({id,name:i?'Alena':'Karel',kind:'PC',occupation:'Farmer',hmk:{attributes:attrs,skills:[],combatState:require('./src/integration/persistent-combat-state.js').initialCombatState(),expedition:{claims:{}}}}));
 const clock=require('./src/integration/hmk-campaign-calendar.js').createCampaignCalendar({day:1,hour:8,minute:0,label:'Test',eventId:'init504',gmConfirmed:true,campaignId:'c504',characterIds:['a504','b504']});
 for(const ch of data.characters){const proof=require('./src/integration/hmk-nutrition-days.js').createNutritionPolicy({campaignId:'c504',minute:clock.minute,actorId:ch.id,enabled:true,autoNeeds:true,inventoryRations:true,inventoryWater:true});data.journal.push({id:'policy'+ch.id,characterId:ch.id,calendarCampaignId:'c504',campaignMinute:clock.minute,createdAt:stamp(),title:'Sledování',body:'Aktivní',calendarNutritionPolicy:proof});}
 data.campaignClock=clock;view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='provisions';provisionScope='party';provisionGuideActorId='a504';storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'month',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};
 const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1700,'height':1000});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css']:
  page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed504()')
 assert not errors,errors
 assert page.locator('.hc-clock-banner').count()==1
 assert '08:00' in page.locator('.hc-clock-banner').inner_text()
 form=page.locator('form[data-nutrition-party-conditions]')
 assert form.count()==1, page.locator('body').inner_text()[-2500:]
 form.locator('[name="actorIds"]').check() if form.locator('[name="actorIds"]').count()==1 else None
 for cb in form.locator('[name="actorIds"]').all():cb.check()
 form.locator('[name="kind"]').select_option('rest-hot')
 form.locator('button[type="submit"]').click()
 page.wait_for_timeout(230)
 state=json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 plans=[x for x in state['journal'] if x.get('calendarNutritionConditions')]
 rests=[x for x in state['journal'] if x.get('calendarActivityProof')]
 assert len(plans)==2,(plans,errors,dialogs)
 assert {x['characterId'] for x in plans}=={'a504','b504'}
 assert len(rests)==2,(rests,errors,dialogs)
 assert not page.locator('form[data-nutrition-party-conditions] [name="confirmed"]').count()
 assert not errors,errors
 page.screenshot(path='/mnt/data/HMK_v93.504_druzina.png',full_page=True)
 print('PASS Chromium v93.504: calendar date/time banner + batch day conditions for two actors + linked fatigue intervals; no redundant confirmation checkbox')
 browser.close()
