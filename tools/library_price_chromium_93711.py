from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
root=Path(sys.argv[1])
raw=(root/'hmk-app.bundle.js').read_text();mark='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(mark):])
modules['app.js']+='''
window.__auditOpen=(cat,obj)=>{data=clean();view='library';libraryTab='other';libraryPage=0;category=cat;query='';editItem=null;overlay=equipmentEditor('Nový předmět',obj||{name:'',category:cat,properties:{}});render()};
window.__auditId=()=>data.items[data.items.length-1].id;
window.__auditOpenEdit=(id)=>{const x=data.items.find(x=>x.id===id);editItem=id;category=x.category;overlay=equipmentEditor('Upravit',x);render()};
window.__auditSnapshot=()=>({items:data.items.map(x=>({name:x.name,category:x.category,pricePence:x.properties.pricePence,value:x.properties.value})),rows:data.items.map(x=>({name:x.name,price:libraryBrief(x)[3],row:libraryDataRows([x]).replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').slice(0,700),offer:require("./src/integration/hmk-library-economy.js").libraryPurchaseOffer(x)}))});
'''
bundle=mark+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1400,'height':950});page.set_default_timeout(15000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map();const a={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 print('bootstrap errors',errors,flush=True)
 page.evaluate("__auditOpen('other')")
 form=page.locator('#hmk-item-form')
 print('form',form.count(),'price field',form.locator('[name=pricePence]').count(),flush=True)
 form.locator('[name=name]').fill('Testovací brašna')
 if form.locator('[name=pricePence]').count():form.locator('[name=pricePence]').fill('79')
 else:form.locator('[name=spec_value]').fill('79')
 form.locator('button[type=submit]').click()
 result=page.evaluate('__auditSnapshot()')
 print('first',result,flush=True)
 if root.name=='hmk93711_work':
  assert result['items'][-1]['pricePence']==79,result
  assert result['rows'][-1]['price']=='79 d',result
  assert result['rows'][-1]['offer']['pricePence']==79,result
  id=page.evaluate('__auditId()')
  page.evaluate('(id)=>__auditOpenEdit(id)',id)
  form=page.locator('#hmk-item-form')
  assert form.locator('[name=pricePence]').input_value()=='79'
  form.locator('[name=pricePence]').fill('124')
  form.locator('button[type=submit]').click()
  result=page.evaluate('__auditSnapshot()')
  assert result['items'][-1]['pricePence']==124 and result['rows'][-1]['price']=='124 d',result
  print('PASS custom other create/edit price 79 -> 124',flush=True)
  # old value text is recognized after edit for migration to pricePence
  page.evaluate("__auditOpen('other',{name:'Stará brašna',category:'other',properties:{value:'63'}})")
  assert page.locator('#hmk-item-form [name=pricePence]').input_value()=='63'
  page.locator('#hmk-item-form button[type=submit]').click()
  result=page.evaluate('__auditSnapshot()')
  assert result['items'][-1]['pricePence']==63 and result['rows'][-1]['price']=='63 d',result
  print('PASS editing old numeric text value',flush=True)
  for cat in ['weapon','shield','armor']:
   page.evaluate('(cat)=>__auditOpen(cat)',cat)
   form=page.locator('#hmk-item-form')
   assert form.locator('[name=pricePence]').count()==1,cat
   form.locator('[name=name]').fill('Speciální '+cat)
   form.locator('[name=pricePence]').fill('31')
   form.locator('button[type=submit]').click()
   result=page.evaluate('__auditSnapshot()')
   assert result['items'][-1]['pricePence']==31,result
   assert result['rows'][-1]['price']=='31 d',result
   print('PASS category price',cat,flush=True)
  # Blank price is genuinely unknown; zero price is a real explicit zero.
  page.evaluate("__auditOpen('other')")
  form=page.locator('#hmk-item-form')
  form.locator('[name=name]').fill('Neoceněná položka')
  form.locator('button[type=submit]').click()
  result=page.evaluate('__auditSnapshot()')
  assert result['rows'][-1]['price']=='—',result
  page.evaluate("__auditOpen('other')")
  form=page.locator('#hmk-item-form')
  form.locator('[name=name]').fill('Bezplatná položka')
  form.locator('[name=pricePence]').fill('0')
  form.locator('button[type=submit]').click()
  result=page.evaluate('__auditSnapshot()')
  assert result['items'][-1]['pricePence']==0 and result['rows'][-1]['price']=='0 d',result
  print('PASS price blank vs zero',flush=True)
 else:
  assert result['items'][-1]['pricePence'] is None and result['rows'][-1]['price']=='—',result
  print('PASS BASELINE REPRO: price entered as text, saved but not shown',flush=True)
 assert not errors,errors
 browser.close()
