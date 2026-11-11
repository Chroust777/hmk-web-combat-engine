"""Click-only Stable filtering regression. Real production Chromium JS; fixture creates two owned animals through existing UI."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
original=(root/'tools/browser_93840_stable_catalog.py').read_text('utf8');seed=original.split("seed='''",1)[1].split("'''",1)[0];mods['app.js']+=seed
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
checks=[]
def ck(ok,msg):
 assert ok,msg
 checks.append(msg)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);pg=b.new_page(viewport={'width':1536,'height':1000});pg.set_default_timeout(15000)
 errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('dialog',lambda d:d.accept())
 pg.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 pg.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:pg.add_style_tag(content=(root/css).read_text())
 pg.add_script_tag(content=bundle);pg.evaluate('window.__testStart839()')
 for name,breed in [('Blesk','Bovine (Oxen)'),('Vitr','Palfrey, riding horse')]:
  f=pg.locator('[data-hmk-livestock-acquire]');opt=f.locator('select[name=beastId] option').filter(has_text=breed).first
  f.locator('select[name=beastId]').select_option(opt.get_attribute('value'))
  f.locator('input[name=beastName]').fill(name);f.locator('select[name=ownerId]').select_option('a');f.locator('button[value=free]').click()
 pg.evaluate('window.__testShowStable839()')
 guide=pg.locator('details.hmk-stable-equipment-ref').first;guide.locator('summary').click()
 ck(guide.locator('tbody tr[data-hmk-guide-beast]').count()==16,'Default displays all 16 species')
 box=guide.locator('[data-hmk-stable-filter-choice]');apply=guide.locator('[data-hmk-stable-filter-confirm]');options=box.locator('option')
 ck(options.count()==3,'Filter contains All plus exactly two actually owned animals')
 ck('Blesk' in options.nth(1).inner_text() and 'Vitr' in options.nth(2).inner_text(),'Owned animals are individually named')
 baseline=pg.evaluate('window.__testState839()')
 box.select_option(options.nth(1).get_attribute('value'))
 ck(guide.locator('tbody tr[data-hmk-guide-beast]').count()==16,'Changing select alone does NOT filter the table')
 ck(pg.evaluate('window.__testState839()')==baseline,'Dropdown does not mutate inventory, money, journal or time')
 box.focus();box.press('Enter')
 ck(guide.locator('tbody tr[data-hmk-guide-beast]').count()==16,'Enter on dropdown does not confirm')
 apply.click();guide=pg.locator('details.hmk-stable-equipment-ref').first
 ck(guide.locator('tbody tr[data-hmk-guide-beast]').count()==1,'Explicit button filters to one owned species')
 ck('Bovine (Oxen)' in guide.locator('tbody tr[data-hmk-guide-beast]').inner_text(),'Shows correct Blesk species')
 ck(pg.evaluate('window.__testState839()')==baseline,'Applying display filter does not change campaign data')
 box=guide.locator('[data-hmk-stable-filter-choice]');box.select_option(guide.locator('option').filter(has_text='Vitr').first.get_attribute('value'))
 ck('Bovine' in guide.locator('tbody tr[data-hmk-guide-beast]').inner_text(),'Second selection stays uncommitted')
 guide.locator('[data-hmk-stable-filter-confirm]').click();guide=pg.locator('details.hmk-stable-equipment-ref').first
 ck('Palfrey, riding horse' in guide.locator('tbody tr[data-hmk-guide-beast]').inner_text(),'Explicitly selects owned riding horse')
 guide.locator('[data-hmk-stable-filter-choice]').select_option('all');guide.locator('[data-hmk-stable-filter-confirm]').click()
 guide=pg.locator('details.hmk-stable-equipment-ref').first
 ck(guide.locator('tbody tr[data-hmk-guide-beast]').count()==16,'All restores 16 rows')
 right=pg.locator('section.hmk-stable-logistics-93840').first
 ck(right.locator('form input[name=type][value=tack-add]').count()==0,'No duplicated buy/equip gear form on right')
 ck(right.locator('form input[name=type][value=vehicle-add]').count()==0,'No duplicated buy vehicle form on right')
 ck(right.locator('form input[name=type][value=cargo-add]').count()==1,'Manual cargo row preserved')
 ck(guide.locator('form[data-hmk-stable-guide-buy]').count()==16,'Canonical Library acquisition forms preserved on left')
 out=root/'tools/evidence_93842';out.mkdir(exist_ok=True);guide.screenshot(path=str(out/'STABLE_FILTER_ALL_PARCHMENT.png'))
 ck(not errors,'No page errors')
 (out/'BROWSER_STABLE_FILTER.json').write_text(json.dumps({'status':'PASS','count':len(checks),'checks':checks,'errors':errors,'version':'93.842'},ensure_ascii=False,indent=2),'utf8')
 print('PASS',len(checks),'checks stable filter and cargo, no campaign writes')
 b.close()
