from pathlib import Path
from playwright.sync_api import sync_playwright
import time
root=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1650,'height':1050})
 errors=[];dialogs=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{for(const key of ['localStorage','sessionStorage']){const m=new Map();Object.defineProperty(window,key,{configurable:true,value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}}});}}""")
 for file in ('styles.css','skill-workbench.css','library.css','book-templates.css'):page.add_style_tag(content=(root/file).read_text())
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text())
 page.locator('[data-action="auto-random-character"]').click()
 page.locator('#hmk-random-name-form [name="name"]').fill('UI483')
 page.locator('#hmk-random-name-form button[type="submit"]').click()
 start=time.monotonic()
 while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-start<35:page.wait_for_timeout(200)
 assert not page.locator('.hmk-auto-generation-overlay').count(),dialogs
 page.locator('[data-open]').first.click()
 nav=page.locator('.journal-book-subnav [data-sheet-section]')
 chapters=nav.evaluate_all('(xs)=>xs.map(x=>x.dataset.sheetSection)')
 assert 'hazards' in chapters,chapters
 assert chapters[-1]=='notes',chapters
 page.locator('[data-sheet-section="inventory"]').first.click()
 tooltips=page.locator('.inv-summary-stat[data-hmk-help]'); assert tooltips.count()>=8,tooltips.count()
 tooltips.filter(has_text='Gear ENC').first.hover()
 assert page.locator('.hmk-journal-floating-tooltip:not([hidden])').count()==1
 page.locator('[data-sheet-section="hazards"]').first.click()
 assert 'Nebezpečí / Trauma' in page.locator('main').inner_text()
 baseline=page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')")
 page.locator('[data-nav="skills"]').first.click()
 page.locator('.hsk-special-container summary').click()
 form=page.locator('#hsk-special-sr-form')
 inp=form.locator('[name="specialDice"]')
 form.locator('[data-hsk-special-dice]').click()
 assert len(inp.input_value().split(','))==1,inp.input_value()
 form.locator('[data-hsk-special-dice]').click()
 rolls=[int(x) for x in inp.input_value().split(',')]
 assert len(rolls)==2 and all(1<=x<=10 for x in rolls),rolls
 assert inp.get_attribute('data-hmk-auto-dice')==inp.input_value(), 'software source missing'
 inp.fill('8')
 assert inp.get_attribute('data-hmk-auto-dice') is None,'manual entry must clear software source'
 assert page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')")==baseline,'dice entry mutated saved campaign'
 assert not errors,errors
 print('PASS browser UI483: chapter order, hazards, tooltip, software/manual 2×d10 provenance, no game mutations')
 browser.close()
