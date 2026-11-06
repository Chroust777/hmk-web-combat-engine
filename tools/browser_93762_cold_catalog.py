"""Isolated Chromium click-through of real library rows rendered by v93.762 production bundle."""
from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8')
prefix='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
modules['app.js']+='''
window.__audit762_show=()=>{
 const list=allCatalogItems().filter(i=>i.category==='armor');
 document.body.innerHTML='<main><h2>HMK knihovna — oděv a zbroj</h2><table class="catalog-spec"><tbody>'+libraryDataRows(list)+'</tbody></table></main>';
 return {count:list.length,names:list.map(i=>i.name),items:list.map(i=>({name:i.name,id:i.id,f:[...new Set(Object.values(i.properties?.locationProtection||{}).map(x=>x?.f??x?.F))]}))};
};
'''
bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  q=root/css
  if q.exists():page.add_style_tag(content=q.read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 result=page.evaluate('window.__audit762_show()')
 assert result['count']==92,result['count']
 rows=page.locator('[data-library-item]');assert rows.count()==92
 evidence=[]
 for i in range(rows.count()):
  row=rows.nth(i);detail=row.locator('details.catalog-parameters');detail.locator('> summary').click()
  assert detail.get_attribute('open') is not None,(i,'not expanded')
  text=row.locator('.catalog-cold-rule').inner_text();brief=row.locator('.library-mini').nth(3).inner_text()
  values=result['items'][i]['f'];assert len(values)>0 and all(isinstance(v,int) for v in values)
  expected=f'F AV +{min(values)}';assert expected in text,(i,brief,text);assert expected in brief,(i,brief,text)
  assert not ('se započte do Area AV' in text)
  if result['items'][i]['name'] in ('Cloth Cloak','Padded Cloak'):
   assert 'Cold Hazard +' in text and 'plášť +' in brief,(i,brief,text)
   evidence.append({'name':result['items'][i]['name'],'brief':brief,'detail':text})
  if result['items'][i]['name'] in ('Mail Hauberk','Plate Helm','Cloth Tunic'):
   evidence.append({'name':result['items'][i]['name'],'brief':brief,'detail':text})
  if i==0:page.screenshot(path=str(root/'docs/AUDIT_v93.762_cold_catalog.png'),full_page=False)
  detail.locator('> summary').click()
 assert not errors,errors
 data={'version':'93.762','allClothingAndArmourRows':rows.count(),'expandedByClick':rows.count(),'referenceValues':'HMK v1.2 p.117 F aspects, p.133 Area AV, p.149 separate Cold Hazard','samples':evidence,'pageErrors':errors}
 (root/'docs/AUDIT_v93.762_chromium_cold_catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
 print('PASS chromium v93.762: 92/92 armour and clothing rows expanded by click; F numeric visible in brief and details; cloaks show separately; no JS errors',flush=True)
 browser.close()
