from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text();html=re.sub(r'<script type="module" src="\./app\.js\?[^>]+></script>','',html);html=re.sub(r'<script defer src="\./hmk-app\.bundle\.js\?[^>]+></script>','',html)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-zygote'])
 p=b.new_page(viewport={'width':1300,'height':850});errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.on('dialog',lambda d:d.accept())
 p.set_content(html)
 p.evaluate("""() => {const store={};for(const k of ['localStorage','sessionStorage'])Object.defineProperty(window,k,{configurable:true,value:{getItem(n){return store[k+':'+n]||null},setItem(n,v){store[k+':'+n]=String(v)},removeItem(n){delete store[k+':'+n]}}});}""")
 for style in ('styles.css','book-templates.css','library.css','skill-workbench.css'):p.add_style_tag(content=(root/style).read_text())
 p.add_script_tag(content=(root/'hmk-app.bundle.js').read_text())
 p.locator('[data-action="auto-random-character"]').click();p.locator('.editor-dialog input[name="name"]').fill('Evidence test');p.get_by_text('⚄ Vygenerovat postavu',exact=True).click();p.locator('[data-chronicle-character-status]').wait_for(timeout=15000)
 assert p.locator('[data-chronicle-character-status]').count()==1
 p.locator('[data-sheet-section="notes"]').click()
 form=p.locator('#journal-form');print('FORM INPUTS',form.locator('input,textarea').evaluate_all('(xs)=>xs.map(x=>x.name)'))
 form.locator('[name="title"]').fill('Testovací poznámka');form.locator('[name="body"]').fill('Doklad zkoušky UI');form.locator('button[type="submit"]').click()
 assert p.locator('.journal-history-category[data-history-kind="notes"]').count()==1,'Notes category should exist'
 assert p.locator('.journal-history-category').get_by_text('Testovací poznámka').count()==1
 p.locator('[data-nav="gmhistory"]').first.click()
 print('GM categories',p.locator('.gm-history-category').evaluate_all('(a)=>a.map(x=>x.getAttribute("data-history-kind"))')); print('GM text',p.locator('#app').inner_text()[-1300:]); assert p.locator('.gm-history-category[data-history-kind="notes"]').count()==1,'GM notes category should exist'
 assert p.locator('.gm-history-category').get_by_text('Testovací poznámka').count()==1
 p.locator('[data-gm-history-open]').first.click()
 assert p.locator('[data-journal-entry]').count()>0, 'Original entry still available from GM history'
 p.set_viewport_size({'width':390,'height':844})
 p.locator('[data-sheet-section="overview"]').click()
 status=p.locator('[data-chronicle-character-status]')
 assert status.count()==1 and status.is_visible()
 dims=status.evaluate('(x)=>{const b=x.getBoundingClientRect(),p=x.parentElement.getBoundingClientRect();return {x:b.x,width:b.width,containerX:p.x,containerWidth:p.width}}')
 assert dims['width']<=dims['containerWidth']+2,dims
 assert not errs,errs
 print('PASS true browser: generated character, Chronicle status, personal category, GM category, original note preserved')
 b.close()
