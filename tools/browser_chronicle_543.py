from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf8')
html=re.sub(r'<script type="module" src="\./app\.js\?[^>]+></script>','',html)
html=re.sub(r'<script defer src="\./hmk-app\.bundle\.js\?[^>]+></script>','',html)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':900});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.evaluate('''() => {const store={};for(const t of ['localStorage','sessionStorage'])Object.defineProperty(window,t,{configurable:true,value:{getItem(k){return store[t+':'+k]||null},setItem(k,v){store[t+':'+k]=String(v)},removeItem(k){delete store[t+':'+k]},clear(){for(const k of Object.keys(store))if(k.startsWith(t+':'))delete store[k]}}});}''')
 for style in ('styles.css','book-templates.css','library.css','skill-workbench.css'):
  page.add_style_tag(content=(root/style).read_text(encoding='utf8'))
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text(encoding='utf8'))
 page.wait_for_timeout(800)
 print('PAGE ERRORS',errs[:5]);print('APP CONTENT',page.locator('#app').inner_text()[:500]);print('NAV',page.locator('[data-nav="characters"]').count())
 if page.locator('#app .shell').count():
  page.screenshot(path=str(root/'ui_regression_543.png'),full_page=False)
 browser.close()
