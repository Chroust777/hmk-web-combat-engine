from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
root=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1550,'height':920});errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map();for(const k of ['localStorage','sessionStorage']){const q=k==='localStorage'?m:new Map();Object.defineProperty(window,k,{configurable:true,value:{getItem:x=>q.get(x)??null,setItem:(x,v)=>q.set(x,String(v)),removeItem:x=>q.delete(x),key:i=>[...q.keys()][i]??null,get length(){return q.size}}});}}''')
 for css in ['styles.css','skill-workbench.css','library.css','book-templates.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text())
 page.locator('[data-action="auto-random-character"]').click()
 page.locator('#hmk-random-name-form [name="name"]').fill('VisualTest479')
 page.locator('#hmk-random-name-form button[type="submit"]').click()
 t=time.monotonic()
 while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-t<35:page.wait_for_timeout(150)
 assert not page.locator('.hmk-auto-generation-overlay').count(),'generation did not finish'
 snap=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert len(snap['characters'])==1 and snap['characters'][0]['hmk']['creation']['status']=='auto-generated',alerts
 print('PASS generated full character',flush=True)
 page.locator('[data-open]').first.click()
 page.locator('[data-sheet-section="inventory"]').first.click()
 assert page.locator('.folio-water-ledger').count()==1
 assert page.locator('.folio-water-ledger.panel').count()==0
 assert page.locator('.folio-water-help').count()==1
 assert page.locator('.folio-water-help').get_attribute('open') is None
 assert page.locator('.folio-water-ledger').evaluate('(x)=>getComputedStyle(x).borderTopStyle') == 'solid'
 page.screenshot(path=str(root/'tools'/'visual_479_arsenal.png'),full_page=False)
 print('PASS water subsection no double panel, inventory present',flush=True)
 page.locator('[data-nav="skills"]').first.click()
 assert page.locator('.folio-chapter-content--right .hsk-test-card').count()>=1
 assert page.locator('.folio-chapter-content--right .hsk-result-slot').count()>=1

 page.locator('#skill-secondary-form input[name="rollA"]').fill('51')
 page.locator('#skill-secondary-form button[type="submit"]').click()
 assert page.locator('#hsk-result-secondary .hsk-verdict').count()==1, 'rendered skill verdict not found'
 bg=page.locator('#hsk-result-secondary').evaluate('(x)=>getComputedStyle(x).color')
 assert bg in ('rgb(55, 39, 25)','rgb(52, 35, 22)'),bg
 page.screenshot(path=str(root/'tools'/'visual_479_skill_result.png'),full_page=False)
 print('PASS skills right panel and result slots in book',flush=True)

 page.locator('[data-nav="characters"]').first.click()
 page.locator('.character-card__more summary').first.click()
 page.locator('[data-archive]').first.click()
 page.locator('[data-nav="trash"]').first.click()
 assert page.locator('.folio-archive-row').count()==1
 assert page.locator('.folio-archive-metrics dd').first.text_content().strip()=='1'
 assert page.locator('.folio-chapter-content--right .folio-archive-info').count()==1
 page.locator('[data-restore]').first.click()
 assert page.locator('.folio-archive-row').count()==0
 state=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert len(state['characters'])==1 and len(state['trash'])==0
 print('PASS archive + restore from unified folio',flush=True)
 assert not errors,errors
 b.close()
