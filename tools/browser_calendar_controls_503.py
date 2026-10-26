from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text()
mark='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(mark):])
mods['app.js']+='''
window.__seed503=()=>{
 const attrs={str:12,end:12,dex:12,agl:12,per:12,cml:12,aur:12,wil:12,rea:12,cre:12,emp:12,elo:12};
 const ch={id:'a503',name:'Karel',kind:'PC',occupation:'Farmer',hmk:{attributes:attrs,skills:[],combatState:require('./src/integration/persistent-combat-state.js').initialCombatState(),expedition:{claims:{}}}};
 data=clean();data.characters=[ch];
 const clock=require('./src/integration/hmk-campaign-calendar.js').createCampaignCalendar({day:1,hour:8,minute:0,label:'Testovací kampaň',eventId:'init503',gmConfirmed:true,campaignId:'c503',characterIds:[ch.id]});
 const policy=require('./src/integration/hmk-nutrition-days.js').createNutritionPolicy({campaignId:'c503',minute:clock.minute,actorId:ch.id,enabled:true,autoNeeds:true,inventoryRations:true,inventoryWater:true});
 const row={id:'policy503',characterId:ch.id,calendarCampaignId:'c503',campaignMinute:clock.minute,createdAt:stamp(),title:'HMK · sledování výživy',body:'Výživa',calendarNutritionPolicy:policy};
 data.journal.push(row);
 const heat=require('./src/integration/hmk-nutrition-activity.js').createNutritionDayConditions({journal:data.journal,policyRow:row,campaignId:'c503',actorId:ch.id,minute:clock.minute,kind:'hot'});
 data.journal.push({id:'heat503',characterId:ch.id,calendarCampaignId:'c503',campaignMinute:clock.minute,createdAt:stamp(),title:'HMK · Celodenní horko',body:'24 hodin',calendarNutritionConditions:heat});
 data.campaignClock=require('./src/integration/hmk-calendar-planner.js').addGMCalendarPlan(clock,{id:'shock503',eventId:'gm503',title:'Shock Roll',minute:720,endMinute:720,characterId:'a503',destination:'healing',requiresAction:true,confirmed:true});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='overview';provisionScope='person';provisionGuideActorId=ch.id;storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:12,prefillMinute:null};
 const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
'''
bundle=mark+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1700,'height':950});errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept('GM doložil změnu podmínek' if d.type=='prompt' else None)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for style in ['styles.css','book-templates.css']:
  page.add_style_tag(content=(root/style).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed503()')
 assert not errors,errors
 assert page.locator('#campaign-quick-advance-form [name="gmConfirmed"]').count()==0,'quick checkbox must be removed'
 assert page.locator('#campaign-advance-form [name="gmConfirmed"]').count()==0,'secondary checkbox removed'
 assert page.locator('.hc-active-actors [data-cal-event-check]').count()>=1,'ongoing heat needs controls'
 assert page.locator('.hc-active-actors [data-cal-event-remove]').count()>=1
 shock=page.locator('.hc-minute-events .hc-entry').filter(has_text='Shock Roll')
 assert shock.count()>=1, page.locator('body').inner_text()[-2000:]
 assert 'Časový překryv' in shock.first.inner_text(),shock.first.inner_text()
 assert shock.first.locator('[data-cal-resolve]').count()==1
 assert shock.first.locator('[data-cal-cancel]').count()==1
 # The original GM event remains cancellable through its own planner.
 shock.first.locator('[data-cal-cancel]').click();page.wait_for_timeout(250)
 state=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert any(x.get('planId')=='shock503' and x.get('kind')=='cancelled' for x in state['campaignClock'].get('planResolutions',[])),(state['campaignClock'].get('planResolutions'),alerts,errors)
 # Acknowledging heat never records Fatigue or silently ends the 24h interval.
 page.locator('.hc-active-actors [data-cal-event-check]').first.click();page.wait_for_timeout(160)
 state=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert any(x.get('calendarUIReceipt',{}).get('action')=='acknowledge' for x in state['journal']),(alerts,errors)
 assert not any(x.get('calendarNutritionConditionsCancel') for x in state['journal'])
 # X maps to authoritative, reversible before close, day-plan cancellation.
 page.locator('.hc-active-actors [data-cal-event-remove]').first.click();page.wait_for_timeout(160)
 state=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert any(x.get('calendarNutritionConditionsCancel',{}).get('planId')=='heat503' for x in state['journal']),(alerts,errors)
 assert any(x.get('calendarNutritionConditions') for x in state['journal']),'original record immutable'
 # Time progresses with only one confirmation dialog. No checkbox.
 advance=page.locator('#campaign-quick-advance-form');advance.locator('[name="deltaMinutes"]').select_option('1');advance.locator('button[type="submit"]').click();page.wait_for_timeout(180)
 state=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert state['campaignClock']['minute']==481,(state['campaignClock']['minute'],alerts,errors)
 assert not errors,errors
 page.screenshot(path='/mnt/data/HMK_v93.503_kalendar_test.png',full_page=True)
 print('PASS Chromium v93.503: overlap; ✓ and × for GM and heat; real day-plan cancellation; single confirmation of time; persisted receipts. Dialogs:',len(alerts))
 b.close()
