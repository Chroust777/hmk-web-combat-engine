"""v93.791: incomplete Travel Skill Test can return and re-open, preserving GM campaign state."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
src=(ROOT/'tools/browser_93780_travel_hazards.py').read_text()
ns={'__file__':str(ROOT/'tools/browser_93780_travel_hazards.py')}
exec(src.split('with sync_playwright() as p:')[0],ns)
mods,raw,prefix,end=ns['mods'],ns['raw'],ns['prefix'],ns['end']
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1500,'height':1000});page.set_default_timeout(15000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(ROOT/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__auditHazardSeed("return-cancel")')
 page.locator('[data-shared-window-minutes]').fill('60');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 row=page.locator('[data-shared-plan-card]').last
 row.locator('[data-shared-row-actor]').select_option('a')
 page.locator('[data-shared-plan-card]').last.locator('[data-shared-plan-kind]').select_option('travel')
 page.locator('[data-shared-row-run]').click()
 f=page.locator('#hmk-time-episode-form');f.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
 f.locator('[data-episode-evaluate]').click()
 assert f.get_attribute('data-episode-problem-field')=='orientationProofId'
 before=page.evaluate('window.__auditHazardState()')
 page.locator('[data-episode-skill-task]').first.click()
 sf=page.locator('#skill-value-form:visible');assert sf.is_visible()
 back=page.locator('.hsk-test-card[data-skill-section="value"] .hc-episode-skill-return-inline button')
 assert back.is_visible() and page.locator('[data-episode-return]').count()==1
 assert not page.locator('.hc-episode-return-top').count()
 # Unfinished d100 never becomes a fictional proof when using Return.
 back.click()
 after=page.evaluate('window.__auditHazardState()')
 print('NO_ROLL_RETURN',{'minute':after['minute'],'before':before['skillRows'],'after':after['skillRows'],'hasForm':f.count()},flush=True)
 assert after['minute']==before['minute'] and after['skillRows']==before['skillRows']
 assert page.locator('#hmk-time-episode-form').is_visible()
 f=page.locator('#hmk-time-episode-form');f.locator('[data-episode-evaluate]').click()
 page.locator('[data-episode-skill-task]').first.click()
 sf=page.locator('#skill-value-form:visible');assert sf.is_visible()
 sf.locator('[name=rollA]').fill('21');sf.locator('[type=submit]').click()
 assert page.locator('[data-episode-return]').count()==1
 assert page.locator('.hsk-test-card[data-skill-section="value"] .hc-episode-skill-return-inline button').is_visible()
 page.locator('[data-episode-return]').first.click()
 final=page.evaluate('window.__auditHazardState()')
 assert len(final['skillRows'])==len(before['skillRows'])+1, final
 assert final['minute']==before['minute'],final
 assert not errors,errors
 print('PASS v93.791 cancel and resume Survival SV; no hidden early save or calendar time shift',flush=True)
 browser.close()
