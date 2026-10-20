from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
fixture=json.loads((root/'generated_foraging_browser_fixture.json').read_text())
fixture['journal']=[]  # isolate a new campaign from the sample's previous Foraging watch
actor=fixture['characters'][0]['id']
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,timeout=18000,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1450,'height':950});errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(300)
 def state():return json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(170)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(180)
 form=page.locator('[data-nutrition-policy-form]');assert form.count(),page.locator('#app').inner_text()[:400]
 form.locator('[name="nutritionActorIds"]').first.check()
 form.locator('[name="sourceMode"]').select_option('inventory')
 form.locator('[name="foragingOnly"]').check()
 form.locator('[name="freshRations"]').check()
 assert form.locator('[name="autoNeeds"]').is_checked()
 form.locator('[type="submit"]').click();page.wait_for_timeout(300)
 data=state();policies=[j for j in data['journal'] if j.get('calendarNutritionPolicy')]
 assert len(policies)==1 and policies[0]['calendarNutritionPolicy']['autoNeeds'] is True,(alerts,errors)
 assert data['campaignClock']['minute']==0
 # New full-day activity form, independent of GM time changes.
 planform=page.locator('[data-nutrition-day-conditions]');assert planform.count(),page.locator('#app').inner_text()[-600:]
 planform.locator('[name="kind"]').select_option('rest-inactive')
 planform.locator('[name="confirmed"]').check();planform.locator('button[type="submit"]').click();page.wait_for_timeout(350)
 data=state();plans=[j for j in data['journal'] if j.get('calendarNutritionConditions')]
 assert len(plans)==1 and plans[0]['calendarNutritionConditions']['kind']=='rest-inactive',(alerts,errors)
 assert data['campaignClock']['minute']==0
 # GM alone advances the clock and actually consumes HALF a physical ration.
 form=page.locator('#campaign-advance-form');assert form.count(),page.locator('#app').inner_text()[-450:]
 form.locator('[name="days"]').fill('1');form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(600)
 data=state();days=[j['calendarNutritionDay'] for j in data['journal'] if j.get('calendarNutritionDay')]
 assert data['campaignClock']['minute']==1440,(data['campaignClock']['minute'],alerts,errors)
 assert len(days)==1,(days,alerts,errors)
 assert days[0]['foodNeed']==0.5 and days[0]['waterNeed']==0.5,(days,alerts)
 assert days[0]['foodReceived']==0.5,(days,alerts,errors)
 assert days[0]['activityNeeds']['conditionsId']==plans[0]['id']
 assert len([j for j in data['journal'] if j.get('calendarInventoryRationUse')])==1
 assert [j['calendarMalnutritionMedical']['kind'] for j in data['journal'] if j.get('calendarMalnutritionMedical')]==['thirst'],(alerts,errors)
 assert not errors,(errors,alerts)
 page.screenshot(path=str(root/'browser_nutrition_activity_392.png'))
 print('PASS Chromium: automatic activity mode + prospective full 24h rest/inactivity + half-ration GM day + unchanged start clock + audit + no page errors')
 browser.close()
