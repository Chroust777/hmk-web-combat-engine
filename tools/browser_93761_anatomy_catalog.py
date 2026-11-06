"""Real Chromium clicking of the actual v93.761 Bestiary native HTML renderer.
No public GitHub Pages; no artificial wounds or calendar mutation.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8')
prefix='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
modules['app.js']+='''
window.__audit761_catalog=()=>{document.body.innerHTML=bestiaryCompleteCatalogView({includeGenerator:false});return {cards:document.querySelectorAll('.hmk-bestiary-species-card').length,groups:document.querySelectorAll('.hmk-bestiary-category').length}};
'''
bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);
 page=b.new_page(viewport={'width':1440,'height':900}); errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  q=root/css
  if q.exists():page.add_style_tag(content=q.read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 info=page.evaluate('window.__audit761_catalog()')
 assert info['cards']==94 and info['groups']==9,info
 snapshots={}
 for name,search in [('horse','Horse (Palfrey)'),('human','Rural Farmer'),('gargun','Gargú-Arák'),('ivashu','Áklash'),('dragon','Mature Dragon'),('ghost','Ghost'),('vhir','Ar’ V’hîr (2nd order)')]:
  card=page.locator('.hmk-bestiary-species-card').filter(has=page.locator('.hmk-beast-card-head strong',has_text=search)).first
  assert card.count()==1,(name,search)
  cat=card.locator('xpath=ancestor::details[contains(@class,"hmk-bestiary-category")]');cat.evaluate('(e)=>e.open=true')
  details=card.locator('details.hmk-bestiary-stats-details');assert details.count()==1
  details.locator('> summary').click();assert details.get_attribute('open') is not None
  zone=card.locator('.hmk-beast-anatomy');assert zone.is_visible(),name
  assert zone.locator('h5').inner_text().startswith('Anatomické zóny'),name
  rows=zone.locator('.hmk-native-data-table tbody tr').count()
  if name not in ['ghost']:assert rows>0 or name=='ghost', (name,rows)
  else:assert rows==0
  snapshots[name]={'displayedName':search,'rows':rows,'text':zone.inner_text()[:180]}
  if name=='dragon':page.screenshot(path=str(root/'docs/AUDIT_v93.761_bestiary_anatomy_dragon.png'),full_page=False)
  if name=='ghost':page.screenshot(path=str(root/'docs/AUDIT_v93.761_bestiary_anatomy_noncorporeal.png'),full_page=False)
  details.locator('> summary').click()
 clicked=0
 allcards=page.locator('.hmk-bestiary-species-card')
 for idx in range(allcards.count()):
  card=allcards.nth(idx)
  card.locator('xpath=ancestor::details[contains(@class,"hmk-bestiary-category")]').evaluate('(e)=>e.open=true')
  exp=card.locator('details.hmk-bestiary-stats-details')
  exp.locator('> summary').click()
  assert exp.get_attribute('open') is not None,idx
  block=card.locator('.hmk-beast-anatomy')
  assert block.is_visible() and 'HMK str.' in block.inner_text(),idx
  exp.locator('> summary').click()
  clicked+=1
 assert clicked==94,clicked
 assert not errors,errors
 (root/'docs/AUDIT_v93.761_chromium_anatomy.json').write_text(json.dumps({'info':info,'sampleCards':snapshots,'allClickableCards':clicked,'jsErrors':errors},ensure_ascii=False,indent=2),encoding='utf8')
 print('PASS Chromium bestiary 94 cards; ALL 94 clicked / visible anatomy, seven detailed samples; no console errors',snapshots)
 b.close()
