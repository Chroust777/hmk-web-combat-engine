from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text()
marker='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(marker):])
mods['app.js']+='''
window.__seed507=()=>{
 const attrs={str:12,end:12,dex:12,agl:12,per:12,cml:12,aur:12,wil:12,rea:12,cre:12,emp:12,elo:12};
 const ch={id:'a502',name:'Karel',kind:'PC',occupation:'Farmer',hmk:{attributes:attrs,skills:[],expedition:{}}};
 data=clean();data.characters=[ch];data.campaignClock={format:'hmk-campaign-calendar-v1',campaignId:'c502',label:'Test',minute:480,characterIds:[ch.id],anchors:[],events:[{id:'init502',type:'init',minute:480,reason:'GM zalozil kampan'}]};
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='overview';provisionScope='person';provisionGuideActorId=ch.id;provisionGuideRoute='have';storageReadOnly=false;cloudSync=null;
 const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
'''
bundle=marker+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1600,'height':1000});errs=[];alerts=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for style in ['styles.css','book-templates.css']:
  page.add_style_tag(content=(root/style).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed507()')
 assert page.locator('[data-calendar-section="provisions"]').count()==1,(errs,alerts)
 page.locator('[data-calendar-section="provisions"]').click()
 assert page.locator('.hc-person-provision-options').count()==1,(errs,alerts,page.locator('#app').inner_text()[-1800:])
 assert page.locator('.hc-person-provision-options').get_attribute('open') is not None
 assert page.locator('.hc-provision-personal-rules').get_attribute('open') is not None
 assert page.locator('[data-provision-assure="no"]').get_attribute('aria-pressed')=='true'
 assert page.locator('[data-provision-rest-planner]').count()==1
 state=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert any(x.get('calendarNutritionPolicy',{}).get('autoNeeds') for x in state['journal']),(alerts,errs)
 assert not any(x.get('calendarInventoryWaterFill') for x in state['journal']),'default policy cannot grant resources'
 rest=page.locator('[data-provision-rest-planner]');rest.locator('select[name="kind"]').select_option('rest')
 rest.locator('button').click();page.wait_for_timeout(180)
 state=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert len([j for j in state['journal'] if j.get('calendarActivityProof')])==1,(alerts,errs)
 assert 'combatState' not in state['characters'][0]['hmk'], 'planning must not create combat state'
 # UI acknowledgement is not a separate rule settlement and must not block time.
 page.locator('[data-calendar-section="overview"]').click()
 mark=page.locator('[data-cal-event-check^="activity:"]').first
 if mark.count(): mark.click();page.wait_for_timeout(70)
 state=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert 'combatState' not in state['characters'][0]['hmk'], 'checkmark must not claim recovery'
 page.screenshot(path='/mnt/data/hmk507_rest_provisions.png',full_page=True)
 # Return to calendar time controls and apply the elapsed rest in one transaction.
 page.locator('[data-calendar-section="overview"]').click()
 advance=page.locator('#campaign-quick-advance-form')
 assert advance.count()==1
 advance.locator('[name="deltaMinutes"]').select_option('240')
 
 advance.locator('button[type=submit]').click();page.wait_for_timeout(180)
 state=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert state['campaignClock']['minute']==720,(state['campaignClock']['minute'],alerts,errs)
 assert len([j for j in state['journal'] if j.get('calendarExpeditionProof')])==1,(alerts,errs)
 assert state['characters'][0]['hmk']['combatState']['fatigue']['weariness']==0, 'canonical state initiated' 
 # Next minute remains possible without any artificial 'confirm rest' action.
 advance=page.locator('#campaign-quick-advance-form');advance.locator('[name="deltaMinutes"]').select_option('1');advance.locator('button[type=submit]').click()
 state=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert state['campaignClock']['minute']==721,(state['campaignClock']['minute'],alerts,errs)
 assert not errs,errs
 print('PASS Chromium v93.507: rest via Provision WITHOUT existing combatState, automatically completed, next GM time advance succeeds; alerts:',alerts)
 b.close()
