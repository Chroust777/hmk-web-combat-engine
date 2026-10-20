from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
fixture=json.loads((root/'generated_foraging_browser_fixture.json').read_text())
actor=fixture['characters'][0]['id']
old_clock=fixture['campaignClock']
second=json.loads(json.dumps(old_clock));second['campaignId']='B';second['label']='Second campaign'
fixture['campaignClocks']=[second]
fixture['campaignActorBranches']={}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,timeout=15000,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1500,'height':950});errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(150)
 assert not errors,errors
 def storage():return json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))
 def buy_one():
  page.locator('[data-nav="library"]').first.click();page.wait_for_timeout(110)
  forms=page.locator('form[data-library-form]')
  chosen=None
  for index in range(forms.count()):
   btn=forms.nth(index).locator('button[name="acquisition"][value="buy"]')
   if btn.count() and btn.inner_text().strip()=='Koupit · 6d':
    chosen=index;break
  assert chosen is not None,'No 6d item in printed equipment catalog'
  forms.nth(chosen).locator('button[name="acquisition"][value="buy"]').click();page.wait_for_timeout(150)
  assert storage()['characters'][0]['hmk']['campaignCashAccounts'][storage()['campaignClock']['campaignId']]['purchases'][-1]['amountPence']==6,(alerts,errors)
 buy_one()
 stateA=storage();assert stateA['campaignClock']['campaignId']=='A'
 assert stateA['characters'][0]['hmk']['campaignCashAccounts']['A']['openingPence']==20
 assert len(stateA['characters'][0]['hmk'].get('cashLedger',[]))==0
 assert stateA['campaignClock']['minute']==0
 # Switch the calendar using the public UI and inspect the independent balance.
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(140)
 assert page.locator('[data-calendar-open="B"]').count(),page.locator('#app').inner_text()[:500]
 page.locator('[data-calendar-open="B"]').first.click();page.wait_for_timeout(180)
 stateB=storage();assert stateB['campaignClock']['campaignId']=='B',(alerts,errors)
 page.locator('[data-nav="library"]').first.click();page.wait_for_timeout(140)
 assert '20d' in page.locator('form[data-library-form] select[name="recipientId"] option').first.inner_text()
 buy_one();stateB=storage();accounts=stateB['characters'][0]['hmk']['campaignCashAccounts']
 assert len(accounts['A']['purchases'])==len(accounts['B']['purchases'])==1
 assert accounts['A']['purchases'][0]['campaignId']=='A'
 assert accounts['B']['purchases'][0]['campaignId']=='B'
 assert stateB['campaignClock']['minute']==0
 # Edit coins in the character sheet for campaign B, and confirm only B changes.
 page.locator(f'[data-open="{actor}"]').first.click();page.wait_for_timeout(120)
 page.locator('[data-sheet-edit]').first.click();page.wait_for_timeout(100)
 coin=page.locator('input[name="sheet_coin_current"]')
 assert coin.count(),page.locator('#app').inner_text()[:200]
 assert coin.input_value()=='14',coin.input_value()
 coin.fill('19')
 page.locator('input[name="sheet_coin_reason"]').fill('Nalezený poklad od GM')
 page.locator('[data-sheet-section="overview"]').count()
 page.locator('.journal-edit-save').first.click();page.wait_for_timeout(150)
 final=storage();ac=final['characters'][0]['hmk']['campaignCashAccounts']
 assert ac['B']['adjustments'][-1]['deltaPence']==5
 assert not ac['A']['adjustments']
 assert final['campaignClock']['minute']==0
 # Create a THIRD calendar via the public GM form. Its opening coins fork
 # from B's 19d, rather than reviving the legacy 20d balance.
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
 page.locator('[data-calendar-new]').first.click();page.wait_for_timeout(100)
 form=page.locator('#campaign-start-form')
 assert form.count(),page.locator('#app').inner_text()[:350]
 form.locator('[name="label"]').fill('Independent third calendar')
 form.locator('[name="gmConfirmed"]').check()
 form.locator('button[type="submit"]').click();page.wait_for_timeout(160)
 third=storage();third_key=third['campaignClock']['campaignId']
 assert third_key not in ['A','B'],(alerts,errors)
 assert third['characters'][0]['hmk']['campaignCashAccounts'][third_key]['openingPence']==19,(third_key,alerts,errors)
 assert third['characters'][0]['hmk']['campaignCashAccounts'][third_key]['forkedFromCampaignId']=='B'
 assert len(third['characters'][0]['hmk']['campaignCashAccounts']['A']['purchases'])==1
 assert len(third['characters'][0]['hmk']['campaignCashAccounts']['B']['purchases'])==1
 assert not errors,(errors,alerts)
 page.screenshot(path=str(root/'browser_campaign_cash_391.png'))
 print('PASS Chromium: purchase A 6d, switch B, purchase B 6d, GM +5d only B, create third calendar seeded 19d, legacy preserved, clock 0, 0 JS errors')
 browser.close()
