"""Run index.html inline draft-restorer + production bundle, without HTTP."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json,time
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<script defer src="\./hmk-app.bundle.js[^>]*></script>','',html)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 page=browser.new_page(viewport={'width':1400,'height':900});errs=[];alerts=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const store=new Map();window.__testLedgerStore=store;const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});store.set('hmk-ledger-last-creation-character-v1','other-manual-character');store.set('hmk-ledger-creation-draft-v1::other-manual-character::1::-',JSON.stringify({folk:{type:'value',value:'This is stale manual input'},folkRoll:{type:'value',value:'999'}}));}''')
 page.set_content(html)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text())
 # Both generation modes on the same page, retaining the same campaign and manual draft.
 for mode in ['random','traits']:
  if mode=='random':
   page.locator('[data-action="auto-random-character"]').click();form=page.locator('#hmk-random-name-form')
  else:
   page.locator('[data-nav="characters"]').click()
   page.locator('[data-action="open-generator-config"]').click();form=page.locator('#hmk-generator-config')
  form.locator('[name="name"]').fill('AutoIsolation'+mode)
  form.locator('button[type="submit"]').click();began=time.monotonic()
  while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-began<24:page.wait_for_timeout(150)
  if page.locator('.hmk-auto-generation-overlay').count():
   page.locator('[data-auto-generation-stop]').click();raise AssertionError(mode+' generated longer than 24 sec')
  stored=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
  successes=[c for c in stored['characters'] if c.get('hmk',{}).get('creation',{}).get('status')=='auto-generated']
  assert len(successes)==(1 if mode=='random' else 2),(mode,len(successes),alerts)
  assert not page.evaluate("document.documentElement.hasAttribute('data-hmk-automatic-creation')"),'automatic draft guard not cleared'
  assert not errs,(mode,errs)
  print('PASS',mode,'completed',round(time.monotonic()-began,2),'sec',flush=True)
 keys=page.evaluate("[...window.__testLedgerStore.keys()].filter(k=>k.startsWith('hmk-ledger-creation-draft-v1::'))")
 assert keys==['hmk-ledger-creation-draft-v1::other-manual-character::1::-'],keys
 assert page.evaluate("sessionStorage.getItem('hmk-ledger-creation-draft-v1::other-manual-character::1::-')").find('stale manual input')>0
 assert not alerts,(alerts,errs)
 print('PASS stale manual draft untouched, no phantom automatic form drafts',flush=True)
 page.close();browser.close()
