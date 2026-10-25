from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1680,'height':1000},device_scale_factor=1)
 issues=[]
 page.on('pageerror',lambda e:issues.append(str(e)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 for css in ['styles.css','skill-workbench.css','library.css','book-templates.css']:
  page.add_style_tag(content=(root/css).read_text())
 page.evaluate('''() => { const mem={}; const store={getItem(k){return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null},setItem(k,v){mem[k]=String(v)},removeItem(k){delete mem[k]}};Object.defineProperty(window,'localStorage',{value:store,configurable:true});Object.defineProperty(window,'sessionStorage',{value:{...store},configurable:true});}''')
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text())
 print('PAGE',page.locator('body').inner_text()[:1000], 'ISSUES',issues,flush=True); page.wait_for_selector('nav [data-nav="backup"]',timeout=5000)
 def check(pageName,path):
  page.locator('nav [data-nav="'+path+'"]').first.click()
  page.wait_for_timeout(250)
  assert page.locator('.content-sheet .journal-book--chapter .folio-chapter-spread').count()==1, f'{pageName}: book missing'
  assert page.locator('.folio-chapter-page').count()==2, f'{pageName}: pages missing'
  assert page.locator('.content').get_attribute('class').find('content-sheet')>=0
  page.screenshot(path=str(root/'tools'/f'visual_479_{path}_{page.viewport_size["width"]}.png'),full_page=False)
  print('PASS',pageName,'folio',flush=True)
 check('Cloud and backup','backup')
 assert page.locator('#hmk-cloud-connect-form').count()==1
 assert page.locator('input[name="token"]').count()==1
 assert page.locator('[data-cloud-action="create"]').count()==1
 check('Archive','trash')
 check('Skills','skills')
 assert page.locator('h2').all_text_contents(), 'missing Skills render'
 assert not issues, 'JS errors '+str(issues)
 print('PASS no JS errors; cloud form/events remain',flush=True)
 # Narrow screens: preserve book and cloud fields usability.
 page.set_viewport_size({'width':740,'height':880});check('Cloud narrow','backup')
 assert page.locator('#hmk-cloud-connect-form').is_visible()
 browser.close()
