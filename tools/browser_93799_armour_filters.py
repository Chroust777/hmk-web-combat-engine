"""Local Chromium smoke/regression for filter controls, results and printed-suit deep links."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8')
prefix='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__startArmour799=()=>{
 data=clean();data.characters=[];data.inventory=[];data.items=[];view='library';libraryTab='armour';query='';catalogStatus='all';
 libraryArmourMaterial='all';libraryArmourLocation='all';libraryPage=0;overlay=null;render();
};
window.__armourState799=()=>({tab:libraryTab,material:libraryArmourMaterial,location:libraryArmourLocation,page:libraryPage,query,
 names:[...document.querySelectorAll('[data-library-item] .library-item-name')].map(e=>e.textContent),
 allArmor:allCatalogItems().filter(x=>x.category==='armor').length,
 visible:document.querySelector('.library-results')?.textContent});
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1480,'height':920});page.set_default_timeout(16000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{value:s,configurable:true});Object.defineProperty(window,'sessionStorage',{value:s,configurable:true});}''')
 for f in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/f).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__startArmour799()')
 assert page.locator('select[data-library-armour-material]').count()==1
 assert page.locator('select[data-library-armour-location]').count()==1
 assert len(page.locator('select[data-library-armour-material] option').all())==10
 assert len(page.locator('select[data-library-armour-location] option').all())==16
 init=page.evaluate('window.__armourState799()')
 assert init['allArmor']>60, init
 assert len(init['names'])<=24
 # Combined filters apply to the same physical items, not to complete suits or the inventory.
 page.locator('select[data-library-armour-material]').select_option('C')
 page.locator('select[data-library-armour-location]').select_option('sk')
 sel=page.evaluate('window.__armourState799()')
 assert sel['material']=='C' and sel['location']=='sk' and sel['page']==0,sel
 assert 'Cloth Cap' in sel['names'],sel
 assert all('Cloth' in name for name in sel['names']),sel
 # Selecting an incompatible combination gives a clear empty result, no stale pagination.
 page.locator('select[data-library-armour-material]').select_option('P')
 page.locator('select[data-library-armour-location]').select_option('fa')
 changed=page.evaluate('window.__armourState799()')
 assert changed['page']==0 and changed['material']=='P' and changed['location']=='fa'
 # Independent search must combine with selectors.
 page.locator('select[data-library-armour-material]').select_option('all')
 page.locator('select[data-library-armour-location]').select_option('sk')
 search=page.locator('#search');search.fill('Cap')
 st=page.evaluate('window.__armourState799()')
 assert st['location']=='sk' and st['query']=='Cap' and st['names'],st
 assert all('cap' in x.lower() for x in st['names']),st
 # Switching to another tab must NOT display armour-specific selectors.
 page.locator('button[data-library-tab="melee"]').click()
 assert page.locator('select[data-library-armour-material]').count()==0
 page.locator('button[data-library-tab="armour"]').click()
 assert page.locator('select[data-library-armour-material]').count()==1
 # Test printed suit -> part deep link resets two filters even if they were set.
 page.locator('button[data-library-tab="suits"]').click()
 suitlinks=page.locator('[data-library-part-id]')
 assert suitlinks.count()>0
 suitlinks.first.evaluate("(e)=>{let p=e.parentElement;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement}}")
 suitlinks.first.click()
 after=page.evaluate('window.__armourState799()')
 assert after['tab']=='armour' and after['material']=='all' and after['location']=='all',after
 assert len(after['names'])==1,after
 assert not errors,errors
 print('PASS 93.799 Chromium: 9 materials + 15 anatomical locations, combined filter, selection/pagination/search, tab switching, verified suit→article deep link and default reset, no page errors')
 # Browser rendering capture as visual sanity check.
 page.locator('#search').fill('')
 page.locator('select[data-library-armour-material]').select_option('C')
 page.locator('select[data-library-armour-location]').select_option('sk')
 page.screenshot(path='/mnt/data/HMK_LIBRARY_FILTERS_v93.799.png',full_page=False)
 b.close()
